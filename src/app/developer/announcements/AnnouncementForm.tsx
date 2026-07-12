"use client";

import { Eye, Save, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Input, Modal, Select, Textarea } from "@/components/ui";
import {
  announcementCategoryLabel,
  announcementPriorityLabel,
  announcementPriorityTone,
  defaultAnnouncementFormValues,
  formatAnnouncementDate,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementFormValues,
  type AnnouncementPriority,
} from "@/lib/supabase/announcements";

type AnnouncementFormProps = {
  initialValues?: AnnouncementFormValues;
  announcement?: Announcement | null;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
};

const categoryOptions: AnnouncementCategory[] = ["update", "maintenance", "certification", "important", "other"];
const priorityOptions: AnnouncementPriority[] = ["normal", "important", "urgent"];

export function AnnouncementForm({
  initialValues = defaultAnnouncementFormValues,
  announcement,
  isSaving,
  submitLabel,
  onSubmit,
}: AnnouncementFormProps) {
  const [values, setValues] = useState<AnnouncementFormValues>(initialValues);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const normalizedPreview = useMemo(
    () => ({
      title: values.title.trim() || "タイトル未入力",
      body: values.body.trim() || "本文未入力",
      publishedAt: values.publishMode === "draft" ? null : values.publishedAt || new Date().toISOString(),
    }),
    [values],
  );

  function updateValue<Key extends keyof AnnouncementFormValues>(key: Key, value: AnnouncementFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrorMessage("");
  }

  async function handleSubmit() {
    setErrorMessage("");

    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Developer announcement save failed.", error);
      setErrorMessage(error instanceof Error ? error.message : "お知らせを保存できませんでした。");
    }
  }

  return (
    <>
      {announcement?.status === "published" ? (
        <Card className="rounded-2xl border-orange-200 bg-orange-50 p-4 shadow-sm">
          <p className="text-sm font-bold leading-6 text-orange-800">公開中のお知らせを編集すると、受信者側にも変更が反映されます。</p>
        </Card>
      ) : null}

      <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-muted)]">発信元</p>
            <p className="mt-1 text-sm font-bold">森zin運営</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--color-text-muted)]">対象</p>
            <p className="mt-1 text-sm font-bold">全ユーザー</p>
          </div>
        </div>

        <Input
          label="タイトル"
          maxLength={100}
          onChange={(event) => updateValue("title", event.target.value)}
          required
          value={values.title}
        />

        <Textarea
          className="min-h-56"
          label="本文"
          maxLength={5000}
          onChange={(event) => updateValue("body", event.target.value)}
          required
          value={values.body}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="カテゴリー"
            onChange={(event) => updateValue("category", event.target.value as AnnouncementCategory)}
            value={values.category}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {announcementCategoryLabel[category]}
              </option>
            ))}
          </Select>

          <Select
            label="重要度"
            onChange={(event) => updateValue("priority", event.target.value as AnnouncementPriority)}
            value={values.priority}
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {announcementPriorityLabel[priority]}
              </option>
            ))}
          </Select>
        </div>

        <Select label="公開方法" onChange={(event) => updateValue("publishMode", event.target.value as AnnouncementFormValues["publishMode"])} value={values.publishMode}>
          <option value="draft">下書き</option>
          <option value="immediate">すぐに公開</option>
          <option value="scheduled">日時を指定して公開</option>
        </Select>

        {values.publishMode !== "draft" ? (
          <Input
            helperText={values.publishMode === "immediate" ? "未入力の場合、保存時刻で公開します。" : undefined}
            label={values.publishMode === "scheduled" ? "予約公開日時" : "公開日時"}
            onChange={(event) => updateValue("publishedAt", event.target.value)}
            required={values.publishMode === "scheduled"}
            type="datetime-local"
            value={values.publishedAt}
          />
        ) : null}

        <Input
          helperText="未入力の場合、公開終了日は設定されません。"
          label="公開終了日時"
          onChange={(event) => updateValue("publishEndAt", event.target.value)}
          type="datetime-local"
          value={values.publishEndAt}
        />

        {errorMessage ? <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{errorMessage}</p> : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text)]" href="/developer/announcements">
            <X size={18} />
            キャンセル
          </Link>
          <Button leftIcon={<Eye size={18} />} onClick={() => setIsPreviewOpen(true)} variant="secondary">
            プレビュー
          </Button>
          <Button disabled={isSaving} leftIcon={<Save size={18} />} onClick={() => void handleSubmit()}>
            {isSaving ? "保存中..." : submitLabel}
          </Button>
        </div>
      </Card>

      <Modal onClose={() => setIsPreviewOpen(false)} open={isPreviewOpen} title="プレビュー">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={announcementPriorityTone[values.priority]}>{announcementPriorityLabel[values.priority]}</Badge>
            <Badge variant="muted">{announcementCategoryLabel[values.category]}</Badge>
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">公式</span>
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--color-text-muted)]">森zin運営</p>
            <h2 className="mt-2 break-words text-2xl font-bold leading-9 text-[var(--color-text)]">{normalizedPreview.title}</h2>
            <p className="mt-2 text-xs font-bold text-[var(--color-text-muted)]">
              {values.publishMode === "draft" ? "下書き" : formatAnnouncementDate(normalizedPreview.publishedAt)}
            </p>
          </div>
          <div className="whitespace-pre-wrap break-words border-t border-[var(--color-border)] pt-4 text-sm font-semibold leading-7 text-[var(--color-text)]">
            {normalizedPreview.body}
          </div>
        </div>
      </Modal>
    </>
  );
}
