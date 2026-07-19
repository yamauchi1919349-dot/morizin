import { createHash, randomBytes } from "node:crypto";
import { getInviteRedirectUrl, readJsonObject, requireActiveProfile, sendInvitationEmail, StaffApiError, staffErrorResponse, textValue } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invitationEmailError(error: { code?: string; message?: string; status?: number } | null) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  if (error?.status === 429 || code.includes("rate_limit")) {
    return new StaffApiError(429, "招待メールの送信回数上限に達しました。時間をおいて再度お試しください。");
  }
  if (code.includes("already") || code.includes("exists") || /already registered|already exists/.test(message)) {
    return new StaffApiError(409, "このメールアドレスはSupabase Authへ登録済みです。");
  }
  return new StaffApiError(502, "Supabase Authから招待メールを送信できませんでした。時間をおいて再度お試しください。");
}

export async function POST(request: Request) {
  try {
    const { admin, profile } = await requireActiveProfile(request, true);
    const body = await readJsonObject(request);
    const email = textValue(body.email).toLowerCase();
    const displayName = textValue(body.displayName);
    if (!emailPattern.test(email) || email.length > 254) throw new StaffApiError(400, "有効なメールアドレスを入力してください。");
    if (!displayName || displayName.length > 100) throw new StaffApiError(400, "表示名を1〜100文字で入力してください。");

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin.rpc("create_staff_invitation_v2", {
      p_actor_user_id: profile.user_id, p_email: email, p_display_name: displayName,
      p_token_hash: tokenHash, p_expires_at: expiresAt,
    });
    if (error || !data) {
      const duplicate = /already|duplicate|unique|pending/i.test(error?.message ?? "");
      throw new StaffApiError(duplicate ? 409 : 400, duplicate ? "このメールアドレスは登録済み、または招待中です。" : "招待を作成できませんでした。");
    }

    const invitationId = (data as { id: string }).id;
    const redirectTo = getInviteRedirectUrl(token);
    const { data: invitedUser, error: emailError } = await sendInvitationEmail(admin, email, displayName, redirectTo);
    if (emailError || !invitedUser.user) {
      const { data: cancelledInvitation, error: cancellationError } = await admin
        .from("staff_invitations_v2")
        .update({ status: "cancelled" })
        .eq("id", invitationId)
        .eq("facility_id", profile.facility_id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (cancellationError || !cancelledInvitation) {
        throw new StaffApiError(500, "招待メール送信に失敗し、招待レコードの取消を確認できませんでした。管理者へ連絡してください。");
      }
      throw invitationEmailError(emailError);
    }
    return Response.json({ message: "招待メールを送信しました。" }, { status: 201 });
  } catch (error) {
    return staffErrorResponse(error);
  }
}
