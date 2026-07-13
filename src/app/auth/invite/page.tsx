import Image from "next/image";
import Link from "next/link";
import { AppFooter } from "@/components/layout/AppFooter";
import { Card } from "@/components/ui";

export default function InviteCompletionPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-8 text-[var(--color-text)]">
      <section className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-md place-items-center">
        <Card className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <Image alt="森zin" className="rounded-2xl" height={48} src="/images/brand/morizin-icon.png" width={48} />
            <div>
              <p className="text-xs font-bold text-[var(--color-primary)]">スタッフ招待</p>
              <h1 className="mt-1 text-xl font-bold">メンテナンス中</h1>
            </div>
          </div>

          <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
            スタッフ招待機能は現在メンテナンス中です。新しい招待方式への移行後に利用できます。
          </p>
          <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
            現在の招待リンクではアカウント設定を完了できません。施設のOwnerから移行完了の案内をお待ちください。
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 text-sm font-bold"
            href="/login"
          >
            ログイン画面へ戻る
          </Link>
        </Card>
      </section>
      <AppFooter className="pb-6" />
    </main>
  );
}
