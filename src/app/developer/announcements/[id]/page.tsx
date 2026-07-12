"use client";

import Link from "next/link";
import { Archive, ArrowLeft, RotateCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { BottomNavigation, Button, Card, ConfirmDialog, Loading } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { AnnouncementForm } from "../AnnouncementForm";
import {
  archiveDeveloperAnnouncement,
  getAnnouncementFormValues,
  getCurrentDeveloperAccess,
  getDeveloperAnnouncementById,
  updateDeveloperAnnouncement,
  type Announcement,
  type AnnouncementFormValues,
} from "@/lib/supabase/announcements";

export default function EditDeveloperAnnouncementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const announcementId = params.id;
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnnouncement = useCallback(async function loadAnnouncement() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const access = await getCurrentDeveloperAccess();
      setIsAuthenticated(access.isAuthenticated);
      setIsAuthorized(access.isDeveloper);

      if (!access.isDeveloper) {
        setAnnouncement(null);
        return;
      }

      setAnnouncement(await getDeveloperAnnouncementById(announcementId));
    } catch (error) {
      console.error("Developer announcement detail load failed.", error);
      setErrorMessage("お知らせを読み込めませんでした。");
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

  async function handleSubmit(values: AnnouncementFormValues) {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const updated = await updateDeveloperAnnouncement(announcementId, values);
      setAnnouncement(updated);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (isArchiving) return;

    setIsArchiving(true);
    try {
      const archived = await archiveDeveloperAnnouncement(announcementId);
      setAnnouncement(archived);
      setIsArchiveDialogOpen(false);
    } catch (error) {
      console.error("Developer announcement archive failed.", error);
      setErrorMessage(error instanceof Error ? error.message : "公開停止できませんでした。");
      setIsArchiveDialogOpen(false);
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("settings")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="grid gap-3">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/developer/announcements">
          <ArrowLeft size={18} />
          お知らせ管理へ戻る
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--color-primary)]">Developer</p>
            <h1 className="mt-1 text-xl font-bold">お知らせ編集</h1>
          </div>
          {announcement && announcement.status !== "archived" ? (
            <Button leftIcon={<Archive size={18} />} onClick={() => setIsArchiveDialogOpen(true)} variant="secondary">
              公開停止
            </Button>
          ) : null}
        </div>
      </header>

      {isLoading ? <Loading label="お知らせを読み込んでいます" /> : null}

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
          <Button leftIcon={<RotateCw size={18} />} onClick={() => void loadAnnouncement()} variant="secondary">
            再読み込み
          </Button>
        </Card>
      ) : null}

      {!isLoading && isAuthorized && !errorMessage && !announcement ? (
        <Card className="grid gap-3 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-base font-bold">お知らせが見つかりません</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text)]" href="/developer/announcements">
            一覧へ戻る
          </Link>
        </Card>
      ) : null}

      {!isLoading && isAuthorized && announcement ? (
        <>
          <AnnouncementForm
            announcement={announcement}
            initialValues={getAnnouncementFormValues(announcement)}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            submitLabel="保存"
          />

          <ConfirmDialog
            cancelLabel="キャンセル"
            confirmLabel={isArchiving ? "停止中..." : "公開停止する"}
            description="このお知らせをアーカイブします。受信者側の一覧には表示されなくなります。"
            onCancel={() => setIsArchiveDialogOpen(false)}
            onConfirm={() => void handleArchive()}
            open={isArchiveDialogOpen}
            title="公開停止"
            tone="danger"
          />
        </>
      ) : null}
    </AppLayout>
  );
}
