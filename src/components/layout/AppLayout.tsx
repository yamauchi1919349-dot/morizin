"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageContainer } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { AppFooter } from "./AppFooter";

type AppLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  bottomNavigation?: ReactNode;
  className?: string;
};

const publicPaths = ["/login", "/terms", "/privacy", "/legal"];

export function AppLayout({ children, header, bottomNavigation, className }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isConfigured, isLoading, scope, signOut, user } = useAuth();
  const shouldRequireLogin = isConfigured && !publicPaths.includes(pathname);

  useEffect(() => {
    if (!shouldRequireLogin || isLoading || user) return;
    router.replace("/login");
  }, [isLoading, router, shouldRequireLogin, user]);

  if (shouldRequireLogin && isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-background)] px-4 text-center text-sm font-bold text-[var(--color-text-muted)]">
        認証状態を確認しています...
      </div>
    );
  }

  if (shouldRequireLogin && !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-background)] px-4 text-center text-sm font-bold text-[var(--color-text-muted)]">
        ログイン画面へ移動しています...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {isConfigured && user ? (
        <div className="border-b border-[var(--color-border)] bg-white/90 text-[11px] font-bold text-[var(--color-text-muted)]">
          <PageContainer className="flex min-h-9 items-center justify-between gap-3">
            <span className="min-w-0 truncate">{scope.email ?? user.email ?? "ログイン中"}</span>
            <button className="shrink-0 text-[var(--color-primary)]" onClick={() => void signOut()} type="button">
              ログアウト
            </button>
          </PageContainer>
        </div>
      ) : null}
      {header ? (
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
          <PageContainer className="py-3">{header}</PageContainer>
        </header>
      ) : null}
      <PageContainer className={cn(bottomNavigation ? "pb-24" : undefined, className)}>{children}</PageContainer>
      <AppFooter className={bottomNavigation ? "pb-28 sm:pb-8" : "pb-8"} />
      {bottomNavigation}
    </div>
  );
}
