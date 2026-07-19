import { readJsonObject, requireActiveProfile, StaffApiError, staffErrorResponse, textValue } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request) {
  try {
    const { admin, profile } = await requireActiveProfile(request, true);
    const body = await readJsonObject(request);
    const id = textValue(body.id);
    const kind = body.kind === "invitation" ? "invitation" : "profile";
    if (!uuidPattern.test(id)) throw new StaffApiError(400, "対象IDが正しくありません。");

    if (kind === "invitation") {
      const { error } = await admin.rpc("cancel_staff_invitation_v2", { p_actor_user_id: profile.user_id, p_invitation_id: id });
      if (error) throw new StaffApiError(403, "この招待を取り消せませんでした。");
      return Response.json({ message: "招待を取り消しました。" });
    }

    const { error } = await admin.rpc("update_staff_profile_v2", {
      p_actor_user_id: profile.user_id, p_target_profile_id: id, p_display_name: "", p_disable: true,
    });
    if (error) throw new StaffApiError(403, "このスタッフを無効化できませんでした。");
    return Response.json({ message: "スタッフを無効化しました。" });
  } catch (error) {
    return staffErrorResponse(error);
  }
}

