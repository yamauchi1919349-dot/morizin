"use client";

import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { isConfigured, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push("/dashboard");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    await refresh();
    router.push("/dashboard");
  }

  async function handleSignUp() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage("");
    setError("");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("登録を受け付けました。メール確認が必要な場合は、受信メールを確認してください。");
    setIsSubmitting(false);
  }

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
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">同じ施設に所属するユーザーは、全機能を同じ権限で利用できます。</p>
          </div>

          <div className="grid gap-4">
            <Input label="メールアドレス" onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" type="email" value={email} />
            <Input label="パスワード" onChange={(event) => setPassword(event.target.value)} placeholder="password" type="password" value={password} />
            {error ? <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
            {message ? <p className="rounded-xl bg-[var(--color-primary-soft)] p-3 text-xs font-bold text-[var(--color-primary-dark)]">{message}</p> : null}
            <Button disabled={isSubmitting || (isConfigured && (!email || !password))} leftIcon={<LogIn size={18} />} onClick={handleSignIn}>
              {isSubmitting ? "処理中..." : "ログイン"}
            </Button>
            {isConfigured ? (
              <Button disabled={isSubmitting || !email || !password} onClick={handleSignUp} variant="secondary">
                新規登録
              </Button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 text-center text-sm">
            {!isConfigured ? (
              <>
                <p className="text-xs text-[var(--color-text-muted)]">Supabase環境変数が未設定のため、既存のlocalStorage動作で確認できます。</p>
                <Link className="text-xs font-semibold text-[var(--color-primary)] underline underline-offset-4" href="/dashboard">
                  ダッシュボードへ進む
                </Link>
              </>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  );
}
