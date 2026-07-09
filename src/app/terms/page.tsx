import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui";

const sections = [
  {
    title: "第1条（サービス内容）",
    body: [
      "本サービスは、ジビエ処理施設向けに以下の業務を支援する記録管理サービスです。",
      "・個体受入記録管理",
      "・衛生管理記録",
      "・健康管理記録",
      "・トレーサビリティ管理",
      "・PDF帳票作成",
      "・その他関連する業務補助",
      "本サービスは業務記録を補助するものであり、食品衛生法、HACCP、国産ジビエ認証等への適合や取得を保証するものではありません。",
    ],
  },
  {
    title: "第2条（利用者の責任）",
    body: [
      "利用者は、入力した情報、記録内容、出力された帳票内容について責任を負うものとします。",
      "行政機関、認証機関、取引先等へ提出する書類については、提出前に利用者自身で内容確認を行うものとします。",
    ],
  },
  {
    title: "第3条（アカウント管理）",
    body: ["利用者は自己の責任でアカウント情報を管理するものとします。", "管理不足による損害について、運営者は責任を負いません。"],
  },
  {
    title: "第4条（データ管理）",
    body: [
      "運営者はサービス安定提供に努めますが、データ消失、通信障害、システム障害が発生しないことを保証するものではありません。",
      "重要な記録については、利用者自身でも保管・バックアップを行うものとします。",
    ],
  },
  {
    title: "第5条（禁止事項）",
    body: ["以下を禁止します。", "・虚偽情報の登録", "・不正アクセス", "・サービス運営を妨害する行為", "・法令違反行為", "・第三者へ損害を与える行為"],
  },
  { title: "第6条（モニター利用）", body: ["Ver1.0.0および試験提供期間中は、機能変更、不具合修正、仕様変更が発生する場合があります。"] },
  {
    title: "第7条（免責事項）",
    body: ["本サービス利用により発生した直接的・間接的損害について、運営者の故意または重大な過失がある場合を除き、責任を負わないものとします。"],
  },
  { title: "第8条（規約変更）", body: ["運営者は必要に応じ、本規約を変更できるものとします。"] },
];

export default function TermsPage() {
  return (
    <AppLayout className="mx-auto grid max-w-2xl gap-3 py-4">
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-white px-3 text-sm font-bold text-[var(--color-primary)] shadow-sm" href="/login">
        <ArrowLeft size={18} />
        戻る
      </Link>
      <Card className="grid gap-5 rounded-2xl p-5 shadow-sm">
        <header>
          <p className="text-xs font-bold text-[var(--color-primary)]">Morizin</p>
          <h1 className="mt-1 text-2xl font-bold">利用規約</h1>
        </header>
        <div className="grid gap-3 text-sm leading-7">
          <p>この利用規約（以下「本規約」）は、森zin（以下「本サービス」）の利用条件を定めるものです。</p>
          <p>利用者は本サービスを利用することで、本規約に同意したものとします。</p>
        </div>
        {sections.map((section) => (
          <section className="grid gap-2" key={section.title}>
            <h2 className="text-base font-bold">{section.title}</h2>
            <div className="grid gap-2 text-sm leading-7 text-[var(--color-text-muted)]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </Card>
    </AppLayout>
  );
}
