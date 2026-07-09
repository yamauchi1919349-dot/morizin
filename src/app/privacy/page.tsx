import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Card } from "@/components/ui";

const sections = [
  {
    title: "1. 取得する情報",
    body: ["本サービスでは以下の情報を取得する場合があります。", "・氏名", "・メールアドレス", "・施設情報", "・スタッフ情報", "・入力された業務記録", "・利用状況情報"],
  },
  {
    title: "2. 利用目的",
    body: ["取得情報は以下目的で利用します。", "・サービス提供", "・本人確認", "・施設管理", "・問い合わせ対応", "・機能改善", "・障害対応"],
  },
  { title: "3. 第三者提供", body: ["法令に基づく場合を除き、本人の同意なく第三者へ個人情報を提供しません。"] },
  { title: "4. データ管理", body: ["取得した情報について、不正アクセス、紛失、漏洩防止のため適切な安全管理措置を行います。"] },
  { title: "5. 外部サービス利用", body: ["本サービスでは認証、データ保存、決済等で外部サービスを利用する場合があります。"] },
  { title: "6. 情報の削除", body: ["利用終了後、必要な保存期間経過後にデータ削除を行う場合があります。"] },
  { title: "7. 改定", body: ["本ポリシーは必要に応じ変更される場合があります。"] },
];

export default function PrivacyPage() {
  return (
    <AppLayout className="mx-auto grid max-w-2xl gap-3 py-4">
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-white px-3 text-sm font-bold text-[var(--color-primary)] shadow-sm" href="/login">
        <ArrowLeft size={18} />
        戻る
      </Link>
      <Card className="grid gap-5 rounded-2xl p-5 shadow-sm">
        <header>
          <p className="text-xs font-bold text-[var(--color-primary)]">Morizin</p>
          <h1 className="mt-1 text-2xl font-bold">プライバシーポリシー</h1>
        </header>
        <p className="text-sm leading-7">森zin（以下「本サービス」）では、利用者の個人情報および業務情報を適切に管理します。</p>
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
