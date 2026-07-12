"use client";

import Link from "next/link";
import { ArrowLeft, Bell, ChevronRight, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Loading } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import {
  announcementCategoryLabel,
  announcementPriorityLabel,
  announcementPriorityTone,
  formatAnnouncementDate,
  getAnnouncementExcerpt,
  listVisibleAnnouncements,
  type Announcement,
} from "@/lib/supabase/announcements";

export default function NotificationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnnouncements = useCallback(async function loadAnnouncements() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextAnnouncements = await listVisibleAnnouncements();
      setAnnouncements(nextAnnouncements);
    } catch (error) {
      console.error("Announcement list load failed.", error);
      setErrorMessage("お知らせを読み込めませんでした");
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
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("dashboard")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
          ホームへ
        </Link>
        <h1 className="text-base font-bold">お知らせ</h1>
        <Button aria-label="再読み込み" onClick={() => void loadAnnouncements()} variant="icon">
          <RotateCw size={18} />
        </Button>
      </header>

      {isLoading ? <Loading label="お知らせを読み込んでいます" /> : null}

      {!isLoading && errorMessage ? (
        <Card className="grid gap-3 rounded-2xl border-red-200 bg-red-50 p-4 text-center shadow-sm">
          <p className="text-sm font-bold text-red-700">{errorMessage}</p>
          <Button leftIcon={<RotateCw size={18} />} onClick={() => void loadAnnouncements()} variant="secondary">
            再読み込み
          </Button>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && announcements.length === 0 ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Bell size={22} />
          </span>
          <div>
            <p className="text-base font-bold">現在お知らせはありません</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">新しいお知らせが届くと、ここに表示されます。</p>
          </div>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && announcements.length > 0 ? (
        <section className="grid gap-3">
          {announcements.map((announcement) => (
            <Link className="block" href={`/notifications/${announcement.id}`} key={announcement.id}>
              <Card
                className={`grid gap-3 rounded-2xl p-4 shadow-sm ${announcement.isRead ? "bg-white/95" : "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/40"}`}
                variant="clickable"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {!announcement.isRead ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" aria-label="未読" /> : null}
                      <Badge variant={announcementPriorityTone[announcement.priority]}>{announcementPriorityLabel[announcement.priority]}</Badge>
                      <Badge variant="muted">{announcementCategoryLabel[announcement.category]}</Badge>
                    </div>
                    <h2 className="mt-2 break-words text-base font-bold leading-6 text-[var(--color-text)]">{announcement.title}</h2>
                  </div>
                  <ChevronRight className="mt-1 shrink-0 text-[var(--color-text-muted)]" size={18} />
                </div>
                <p className="break-words text-sm font-semibold leading-6 text-[var(--color-text-muted)]">{getAnnouncementExcerpt(announcement.body)}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
                  <span>{announcement.publisher.displayName}</span>
                  {announcement.publisher.isVerified ? <span className="text-[var(--color-primary)]">公式</span> : null}
                  <span>{formatAnnouncementDate(announcement.publishedAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </section>
      ) : null}
    </AppLayout>
  );
}
