const maintenanceMessage =
  "スタッフ招待の完了機能は現在メンテナンス中です。新しい招待方式への移行後に利用できます。";

export function GET() {
  return Response.json({ error: maintenanceMessage }, { status: 503 });
}

export function POST() {
  return Response.json({ error: maintenanceMessage }, { status: 503 });
}
