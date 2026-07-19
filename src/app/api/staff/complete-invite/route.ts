import { createHash } from "node:crypto";
import { createSupabaseServiceClient, readJsonObject, requireAuthenticatedUser, StaffApiError, staffErrorResponse, textValue } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await readJsonObject(request);
    const token = textValue(body.token);
    if (token.length < 32 || token.length > 200) throw new StaffApiError(400, "招待tokenが正しくありません。");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const { error } = await createSupabaseServiceClient().rpc("accept_staff_invitation_v2", { p_user_id: user.id, p_token_hash: tokenHash });
    if (error) throw new StaffApiError(400, "招待が無効、期限切れ、または使用済みです。");
    return Response.json({ message: "スタッフ登録が完了しました。" });
  } catch (error) {
    return staffErrorResponse(error);
  }
}
