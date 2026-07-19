import { readJsonObject, requireActiveProfile, StaffApiError, staffErrorResponse, textValue } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  try {
    const { admin, profile } = await requireActiveProfile(request, true);
    const body = await readJsonObject(request);
    const id = textValue(body.id);
    const displayName = textValue(body.displayName);
    if (!uuidPattern.test(id)) throw new StaffApiError(400, "スタッフIDが正しくありません。");
    if (!displayName || displayName.length > 100) throw new StaffApiError(400, "表示名を1〜100文字で入力してください。");
    const { error } = await admin.rpc("update_staff_profile_v2", {
      p_actor_user_id: profile.user_id, p_target_profile_id: id, p_display_name: displayName, p_disable: false,
    });
    if (error) throw new StaffApiError(403, "このスタッフを変更できませんでした。");
    return Response.json({ message: "スタッフの表示名を変更しました。" });
  } catch (error) {
    return staffErrorResponse(error);
  }
}

