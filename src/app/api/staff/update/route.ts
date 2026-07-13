const maintenanceMessage =
  "スタッフ情報の変更機能は現在メンテナンス中です。新しい管理方式への移行後に利用できます。";

export function PATCH() {
  return Response.json({ error: maintenanceMessage }, { status: 503 });
}
