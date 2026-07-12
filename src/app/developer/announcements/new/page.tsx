"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { BottomNavigation, Card, Loading } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { AnnouncementForm } from "../AnnouncementForm";
import {
  createDeveloperAnnouncement,
  defaultAnnouncementFormValues,
  getCurrentDeveloperAccess,
  type AnnouncementFormValues,
} from "@/lib/supabase/announcements";

export default function NewDeveloperAnnouncementPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadAccess = useCallback(async function loadAccess() {
    setIsLoading(true);
    const access = await getCurrentDeveloperAccess();
    setIsAuthenticated(access.isAuthenticated);
    setIsAuthorized(access.isDeveloper);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAccess]);

  async function handleSubmit(values: AnnouncementFormValues) {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const created = await createDeveloperAnnouncement(values);
      router.push(`/developer/announcements/${created.id}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("settings")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="grid gap-3">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/developer/announcements">
          <ArrowLeft size={18} />
          お知らせ管理へ戻る
        </Link>
        <div>
          <p className="text-xs font-bold text-[var(--color-primary)]">Developer</p>
          <h1 className="mt-1 text-xl font-bold">新しいお知らせ</h1>
        </div>
      </header>

      {isLoading ? <Loading label="権限を確認しています" /> : null}

      {!isLoading && !isAuthenticated ? (
        <Card className="grid gap-3 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-base font-bold">ログインが必要です</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white" href="/login">
            ログインへ
          </Link>
        </Card>
      ) : null}

      {!isLoading && isAuthenticated && !isAuthorized ? (
        <Card className="grid gap-3 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-base font-bold">このページを利用する権限がありません</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text)]" href="/dashboard">
            ダッシュボードへ戻る
          </Link>
        </Card>
      ) : null}

      {!isLoading && isAuthorized ? (
        <AnnouncementForm initialValues={defaultAnnouncementFormValues} isSaving={isSaving} onSubmit={handleSubmit} submitLabel="保存" />
      ) : null}
    </AppLayout>
  );
}
