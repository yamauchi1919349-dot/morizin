"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, FilePlus2, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Loading } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import {
  announcementCategoryLabel,
  announcementPriorityLabel,
  announcementPriorityTone,
  formatAnnouncementDate,
  getCurrentDeveloperAccess,
  listDeveloperAnnouncements,
  type DeveloperAnnouncementListItem,
} from "@/lib/supabase/announcements";

export default function DeveloperAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<DeveloperAnnouncementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnnouncements = useCallback(async function loadAnnouncements() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const access = await getCurrentDeveloperAccess();
      setIsAuthenticated(access.isAuthenticated);
      setIsAuthorized(access.isDeveloper);

      if (!access.isDeveloper) {
        setAnnouncements([]);
        return;
      }

      setAnnouncements(await listDeveloperAnnouncements());
    } catch (error) {
      console.error("Developer announcement list load failed.", error);
      setErrorMessage("お知らせ管理を読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnnouncements();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAnnouncements]);

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("settings")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="grid gap-3">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/settings">
          <ArrowLeft size={18} />
          設定へ戻る
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--color-primary)]">Developer</p>
            <h1 className="mt-1 text-xl font-bold">お知らせ管理</h1>
          </div>
          {isAuthorized ? (
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-semibold text-white" href="/developer/announcements/new">
              <FilePlus2 size={18} />
              新しいお知らせ
            </Link>
          ) : null}
        </div>
      </header>

      {isLoading ? <Loading label="お知らせ管理を読み込んでいます" /> : null}

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

      {!isLoading && isAuthorized && errorMessage ? (
        <Card className="grid gap-3 rounded-2xl border-red-200 bg-red-50 p-4 text-center shadow-sm">
          <p className="text-sm font-bold text-red-700">{errorMessage}</p>
          <Button leftIcon={<RotateCw size={18} />} onClick={() => void loadAnnouncements()} variant="secondary">
            再読み込み
          </Button>
        </Card>
      ) : null}

      {!isLoading && isAuthorized && !errorMessage && announcements.length === 0 ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-base font-bold">お知らせはまだ作成されていません</p>
        </Card>
      ) : null}

      {!isLoading && isAuthorized && !errorMessage && announcements.length > 0 ? (
        <section className="grid gap-3">
          {announcements.map((announcement) => (
            <Link className="block" href={`/developer/announcements/${announcement.id}`} key={announcement.id}>
              <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" variant="clickable">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{announcement.statusLabel}</Badge>
                      <Badge variant={announcementPriorityTone[announcement.priority]}>{announcementPriorityLabel[announcement.priority]}</Badge>
                      <Badge variant="muted">{announcementCategoryLabel[announcement.category]}</Badge>
                    </div>
                    <h2 className="mt-2 break-words text-base font-bold leading-6 text-[var(--color-text)]">{announcement.title}</h2>
                  </div>
                  <ChevronRight className="mt-1 shrink-0 text-[var(--color-text-muted)]" size={18} />
                </div>
                <div className="grid gap-1 text-xs font-bold text-[var(--color-text-muted)]">
                  <span>発信元: {announcement.publisher.displayName}</span>
                  <span>公開日時: {formatAnnouncementDate(announcement.publishedAt)}</span>
                  <span>更新日時: {formatAnnouncementDate(announcement.updatedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}
    </AppLayout>
  );
}
