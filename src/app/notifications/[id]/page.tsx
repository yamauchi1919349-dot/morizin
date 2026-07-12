"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, ConfirmDialog, Loading } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import {
  announcementCategoryLabel,
  announcementPriorityLabel,
  announcementPriorityTone,
  formatAnnouncementDate,
  getVisibleAnnouncementById,
  hideAnnouncementFromList,
  markAnnouncementRead,
  type Announcement,
} from "@/lib/supabase/announcements";

export default function NotificationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const announcementId = params.id;
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAnnouncement = useCallback(async function loadAnnouncement() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextAnnouncement = await getVisibleAnnouncementById(announcementId);
      setAnnouncement(nextAnnouncement);

      if (nextAnnouncement) {
        await markAnnouncementRead(nextAnnouncement.id);
        setAnnouncement({ ...nextAnnouncement, isRead: true, userState: nextAnnouncement.userState ? { ...nextAnnouncement.userState, readAt: new Date().toISOString() } : nextAnnouncement.userState });
      }
    } catch (error) {
      console.error("Announcement detail load failed.", error);
      setErrorMessage("お知らせを読み込めませんでした");
    } finally {
      setIsLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnnouncement();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAnnouncement]);

  async function handleHideAnnouncement() {
    if (!announcement || isDeleting) return;

    setIsDeleting(true);

    try {
      await hideAnnouncementFromList(announcement.id);
      setIsDeleteDialogOpen(false);
      router.push("/notifications");
    } catch (error) {
      console.error("Announcement hide failed.", error);
      setErrorMessage("お知らせを一覧から削除できませんでした");
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("dashboard")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/notifications">
          <ArrowLeft size={18} />
          一覧へ
        </Link>
        <h1 className="text-base font-bold">お知らせ</h1>
        <span className="w-11" />
      </header>

      {isLoading ? <Loading label="お知らせを読み込んでいます" /> : null}

      {!isLoading && errorMessage ? (
        <Card className="grid gap-3 rounded-2xl border-red-200 bg-red-50 p-4 text-center shadow-sm">
          <p className="text-sm font-bold text-red-700">{errorMessage}</p>
          <Button leftIcon={<RotateCw size={18} />} onClick={() => void loadAnnouncement()} variant="secondary">
            再読み込み
          </Button>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && !announcement ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-base font-bold">お知らせが見つかりません</p>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">公開が終了したか、一覧から削除済みのお知らせです。</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white" href="/notifications">
            一覧へ戻る
          </Link>
        </Card>
      ) : null}

      {!isLoading && announcement ? (
        <>
          <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={announcementPriorityTone[announcement.priority]}>{announcementPriorityLabel[announcement.priority]}</Badge>
              <Badge variant="muted">{announcementCategoryLabel[announcement.category]}</Badge>
              {announcement.publisher.isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={14} />
                  公式
                </span>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)]">{announcement.publisher.displayName}</p>
              <h2 className="mt-2 break-words text-2xl font-bold leading-9 text-[var(--color-text)]">{announcement.title}</h2>
              <p className="mt-2 text-xs font-bold text-[var(--color-text-muted)]">{formatAnnouncementDate(announcement.publishedAt)}</p>
            </div>
            <div className="whitespace-pre-wrap break-words border-t border-[var(--color-border)] pt-4 text-sm font-semibold leading-7 text-[var(--color-text)]">{announcement.body}</div>
          </Card>

          <Button leftIcon={<Trash2 size={18} />} onClick={() => setIsDeleteDialogOpen(true)} variant="secondary">
            一覧から削除
          </Button>

          <ConfirmDialog
            cancelLabel="キャンセル"
            confirmLabel={isDeleting ? "削除中..." : "削除する"}
            description="このお知らせを一覧から削除しますか？この操作は、この端末ではなくあなたのアカウントに反映されます。"
            onCancel={() => setIsDeleteDialogOpen(false)}
            onConfirm={() => void handleHideAnnouncement()}
            open={isDeleteDialogOpen}
            title="一覧から削除"
            tone="danger"
          />
        </>
      ) : null}
    </AppLayout>
  );
}
