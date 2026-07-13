const maintenanceMessage =
  "スタッフの無効化機能は現在メンテナンス中です。新しい管理方式への移行後に利用できます。";

export function DELETE() {
  return Response.json({ error: maintenanceMessage }, { status: 503 });
}
