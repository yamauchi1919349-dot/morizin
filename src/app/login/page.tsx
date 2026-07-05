import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-md place-items-center">
        <Card className="w-full">
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold text-[var(--color-primary)]">ジビエ個体管理アプリ</p>
            <div className="flex items-center gap-3">
              <Image alt="森zin" className="rounded-2xl" height={48} src="/images/brand/morizin-icon.png" width={48} />
              <h1 className="text-3xl font-bold">森zin</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">ログイン画面の器です。認証処理は次のStepで実装予定です。</p>
          </div>

          <div className="grid gap-4">
            <Input label="メールアドレス" placeholder="owner@example.com" type="email" />
            <Input label="パスワード" placeholder="password" type="password" />
            <Button leftIcon={<LogIn size={18} />}>ログイン</Button>
          </div>

          <div className="mt-6 grid gap-3 text-center text-sm">
            <span className="font-semibold text-[var(--color-primary)]">新規登録はこちら</span>
            <p className="text-xs text-[var(--color-text-muted)]">次のStepで認証実装予定</p>
            <Link className="text-xs font-semibold text-[var(--color-text-muted)] underline underline-offset-4" href="/dashboard">
              デモ用にホーム画面へ進む
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
