import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui";

const rows = [
  ["サービス名", "森zin"],
  ["販売事業者", "ArcNest"],
  ["運営責任者", "山内 亮介"],
  ["所在地", "請求があった場合、遅滞なく開示します。"],
  ["問い合わせ先", "support@arcnest.jp"],
  ["販売価格", "各サービスページに表示された金額"],
  ["商品代金以外の必要料金", "インターネット通信料等は利用者負担となります。"],
  ["支払方法", "クレジットカード決済等"],
  ["サービス提供時期", "決済完了後、利用可能になります。"],
  ["解約について", "契約期間中いつでも解約できます。解約後、次回更新日以降の請求は停止されます。"],
  ["返品・キャンセル", "サービスの性質上、利用開始後の返金には対応していません。"],
  ["動作環境", "最新版の主要Webブラウザを推奨します。"],
] as const;

export default function LegalPage() {
  return (
    <AppLayout className="mx-auto grid max-w-2xl gap-3 py-4">
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-white px-3 text-sm font-bold text-[var(--color-primary)] shadow-sm" href="/login">
        <ArrowLeft size={18} />
        戻る
      </Link>
      <Card className="grid gap-5 rounded-2xl p-5 shadow-sm">
        <header>
          <p className="text-xs font-bold text-[var(--color-primary)]">Morizin</p>
          <h1 className="mt-1 text-2xl font-bold">特定商取引法に基づく表記</h1>
        </header>
        <div className="grid gap-3">
          {rows.map(([label, value]) => (
            <div className="grid gap-1 border-b border-[var(--color-border)] pb-3 last:border-b-0" key={label}>
              <p className="text-xs font-bold text-[var(--color-text-muted)]">{label}</p>
              <p className="text-sm font-semibold leading-7">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
