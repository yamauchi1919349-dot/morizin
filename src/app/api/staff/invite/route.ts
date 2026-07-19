import { createHash, randomBytes } from "node:crypto";
import { getInviteRedirectUrl, readJsonObject, requireActiveProfile, sendInvitationEmail, StaffApiError, staffErrorResponse, textValue } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const redirectTo = getInviteRedirectUrl(request, token);
    const { error: emailError } = await sendInvitationEmail(email, displayName, redirectTo);
    if (emailError) {
      await admin.rpc("cancel_staff_invitation_v2", { p_actor_user_id: profile.user_id, p_invitation_id: (data as { id: string }).id });
      throw new StaffApiError(502, "招待メールを送信できませんでした。時間をおいて再度お試しください。");
    }
    return Response.json({ message: "招待メールを送信しました。" }, { status: 201 });
  } catch (error) {
    return staffErrorResponse(error);
  }
}

