"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { isLoading, refresh, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function completeInvitation() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !token) {
      setError("招待URLが正しくありません。");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      setError("招待メールのリンクから認証を完了してください。");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/staff/complete-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) {
      setError(result.error ?? "スタッフ登録を完了できませんでした。");
      setIsSubmitting(false);
      return;
    }

    setMessage(result.message ?? "スタッフ登録が完了しました。");
    await refresh();
    window.setTimeout(() => router.replace("/dashboard"), 800);
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-8 text-[var(--color-text)]">
      <section className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-md place-items-center">
        <Card className="w-full">
          <div className="mb-6 flex items-center gap-3">
            <Image alt="森zin" className="rounded-2xl" height={48} src="/images/brand/morizin-icon.png" width={48} />
            <div><p className="text-xs font-bold text-[var(--color-primary)]">スタッフ招待</p><h1 className="mt-1 text-xl font-bold">招待を承認</h1></div>
          </div>
          {isLoading ? <p className="text-sm font-bold text-[var(--color-text-muted)]">認証状態を確認しています...</p> : null}
          {!isLoading && !user ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">招待メール内のリンクを開いて認証を完了してください。</p> : null}
          {user ? <p className="mb-4 text-sm leading-6 text-[var(--color-text-muted)]">{user.email} を招待された施設のStaffとして登録します。</p> : null}
          {error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p> : null}
          {message ? <p className="mb-4 rounded-xl bg-[var(--color-primary-soft)] p-3 text-xs font-bold text-[var(--color-primary-dark)]">{message}</p> : null}
          <Button className="w-full" disabled={isLoading || !user || !token || isSubmitting || Boolean(message)} onClick={completeInvitation}>
            {isSubmitting ? "登録中..." : "招待を承認する"}
          </Button>
          <Link className="mt-4 inline-flex min-h-11 w-full items-center justify-center text-sm font-bold text-[var(--color-primary)]" href="/login">ログイン画面へ戻る</Link>
        </Card>
      </section>
      <AppFooter className="pb-6" />
    </main>
  );
}

export default function InvitePage() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center">読み込み中...</div>}><InviteContent /></Suspense>;
}
