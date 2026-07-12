"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AnnouncementCategory = "update" | "maintenance" | "certification" | "important" | "other";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementTargetScope = "all" | "prefecture" | "facility";
export type AnnouncementPublishMode = "draft" | "immediate" | "scheduled";

export type AnnouncementPublisher = {
  id: string;
  name: string;
  displayName: string;
  publisherType: string;
  isVerified: boolean;
  isActive: boolean;
};

export type AnnouncementUserState = {
  id?: string;
  announcementId: string;
  userId: string;
  readAt: string | null;
  hiddenAt: string | null;
};

export type Announcement = {
  id: string;
  publisherId: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetScope: AnnouncementTargetScope;
  publishedAt: string | null;
  publishEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  publisher: AnnouncementPublisher;
  userState: AnnouncementUserState | null;
  isRead: boolean;
  isHidden: boolean;
};

export type AnnouncementFormValues = {
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  publishMode: AnnouncementPublishMode;
  publishedAt: string;
  publishEndAt: string;
};

export type DeveloperAnnouncementListItem = Announcement & {
  statusLabel: string;
};

type AnnouncementPublisherRow = {
  id: string;
  name: string;
  display_name: string;
  publisher_type: string;
  is_verified: boolean;
  is_active: boolean;
};

type AnnouncementRow = {
  id: string;
  publisher_id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  target_scope: AnnouncementTargetScope;
  published_at: string | null;
  publish_end_at: string | null;
  created_at: string;
  updated_at: string;
  announcement_publishers: AnnouncementPublisherRow | AnnouncementPublisherRow[] | null;
};

type AnnouncementUserStateRow = {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string | null;
  hidden_at: string | null;
};

type AnnouncementContext = {
  supabase: SupabaseClient;
  user: User;
};

const announcementSelect = [
  "id",
  "publisher_id",
  "title",
  "body",
  "category",
  "priority",
  "status",
  "target_scope",
  "published_at",
  "publish_end_at",
  "created_at",
  "updated_at",
  "announcement_publishers!inner(id,name,display_name,publisher_type,is_verified,is_active)",
].join(",");

export const announcementCategoryLabel: Record<AnnouncementCategory, string> = {
  update: "アップデート",
  maintenance: "メンテナンス",
  certification: "ジビエ認証",
  important: "重要なお知らせ",
  other: "その他",
};

export const announcementPriorityLabel: Record<AnnouncementPriority, string> = {
  normal: "通常",
  important: "重要",
  urgent: "緊急",
};

export const announcementPriorityTone: Record<AnnouncementPriority, "muted" | "warning" | "danger"> = {
  normal: "muted",
  important: "warning",
  urgent: "danger",
};

export const defaultAnnouncementFormValues: AnnouncementFormValues = {
  title: "",
  body: "",
  category: "update",
  priority: "normal",
  publishMode: "draft",
  publishedAt: "",
  publishEndAt: "",
};

function toPublisher(row: AnnouncementPublisherRow | AnnouncementPublisherRow[] | null): AnnouncementPublisher {
  const publisher = Array.isArray(row) ? row[0] : row;

  return {
    id: publisher?.id ?? "",
    name: publisher?.name ?? "",
    displayName: publisher?.display_name ?? "森zin運営",
    publisherType: publisher?.publisher_type ?? "developer",
    isVerified: Boolean(publisher?.is_verified),
    isActive: Boolean(publisher?.is_active),
  };
}

function toUserState(row?: AnnouncementUserStateRow): AnnouncementUserState | null {
  if (!row) return null;

  return {
    id: row.id,
    announcementId: row.announcement_id,
    userId: row.user_id,
    readAt: row.read_at,
    hiddenAt: row.hidden_at,
  };
}

function toAnnouncement(row: AnnouncementRow, userState?: AnnouncementUserStateRow): Announcement {
  const state = toUserState(userState);

  return {
    id: row.id,
    publisherId: row.publisher_id,
    title: row.title,
    body: row.body,
    category: row.category,
    priority: row.priority,
    status: row.status,
    targetScope: row.target_scope,
    publishedAt: row.published_at,
    publishEndAt: row.publish_end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publisher: toPublisher(row.announcement_publishers),
    userState: state,
    isRead: Boolean(state?.readAt),
    isHidden: Boolean(state?.hiddenAt),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getAnnouncementContext(): Promise<AnnouncementContext | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { supabase, user: data.user };
}

async function getDeveloperContext(): Promise<AnnouncementContext | null> {
  const context = await getAnnouncementContext();
  if (!context || !isMorizinDeveloperUser(context.user)) return null;
  return context;
}

async function listStatesForAnnouncements(context: AnnouncementContext, announcementIds: string[]) {
  if (announcementIds.length === 0) return new Map<string, AnnouncementUserStateRow>();

  const { data, error } = await context.supabase
    .from("announcement_user_states")
    .select("id,announcement_id,user_id,read_at,hidden_at")
    .eq("user_id", context.user.id)
    .in("announcement_id", announcementIds);

  if (error) throw error;

  return new Map(((data ?? []) as AnnouncementUserStateRow[]).map((state) => [state.announcement_id, state]));
}

async function getStateForAnnouncement(context: AnnouncementContext, announcementId: string) {
  const { data, error } = await context.supabase
    .from("announcement_user_states")
    .select("id,announcement_id,user_id,read_at,hidden_at")
    .eq("user_id", context.user.id)
    .eq("announcement_id", announcementId)
    .maybeSingle();

  if (error) throw error;

  return data as AnnouncementUserStateRow | null;
}

function parseTokyoDatetimeLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 9, Number(minute));
  const date = new Date(utcMs);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoFromTokyoDatetimeLocal(value: string) {
  if (!value) return null;
  const date = parseTokyoDatetimeLocal(value);
  return date ? date.toISOString() : null;
}

function buildAnnouncementPayload(values: AnnouncementFormValues, publisherId?: string) {
  const trimmedTitle = values.title.trim();
  const trimmedBody = values.body.trim();
  const nowIso = new Date().toISOString();
  const inputPublishedIso =
    values.publishMode === "draft" || !values.publishedAt ? null : toIsoFromTokyoDatetimeLocal(values.publishedAt);
  const publishedAt =
    values.publishMode === "draft" ? null : values.publishMode === "immediate" ? inputPublishedIso ?? nowIso : inputPublishedIso;
  const publishEndAt = values.publishEndAt ? toIsoFromTokyoDatetimeLocal(values.publishEndAt) : null;

  return {
    ...(publisherId ? { publisher_id: publisherId } : {}),
    title: trimmedTitle,
    body: trimmedBody,
    category: values.category,
    priority: values.priority,
    status: values.publishMode === "draft" ? "draft" : "published",
    target_scope: "all",
    published_at: publishedAt,
    publish_end_at: publishEndAt,
  };
}

export function isMorizinDeveloperUser(user: User | null) {
  const metadata = user?.app_metadata;
  if (!metadata || typeof metadata !== "object") return false;

  const isDeveloper = metadata.is_developer;
  const appRole = metadata.app_role;
  const roles = metadata.roles;

  return (
    isDeveloper === true ||
    appRole === "developer" ||
    (Array.isArray(roles) && roles.includes("developer"))
  );
}

export async function getCurrentDeveloperAccess() {
  const context = await getAnnouncementContext();

  return {
    isAuthenticated: Boolean(context?.user),
    isDeveloper: Boolean(context && isMorizinDeveloperUser(context.user)),
    user: context?.user ?? null,
  };
}

export function formatAnnouncementDate(value: string | null) {
  if (!value) return "公開日時未設定";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toTokyoDatetimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(" ", "T");
}

export function getAnnouncementExcerpt(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= 72) return normalized;
  return `${normalized.slice(0, 72)}...`;
}

export function getDeveloperAnnouncementStatusLabel(announcement: Pick<Announcement, "status" | "publishedAt" | "publishEndAt">) {
  if (announcement.status === "draft") return "下書き";
  if (announcement.status === "archived") return "アーカイブ";

  const now = Date.now();
  const publishedAt = announcement.publishedAt ? new Date(announcement.publishedAt).getTime() : Number.NaN;
  const publishEndAt = announcement.publishEndAt ? new Date(announcement.publishEndAt).getTime() : null;

  if (Number.isNaN(publishedAt)) return "公開日時未設定";
  if (publishedAt > now) return "公開予約";
  if (publishEndAt !== null && publishEndAt <= now) return "公開終了";
  return "公開中";
}

export function getAnnouncementFormValues(announcement: Announcement): AnnouncementFormValues {
  const isScheduled =
    announcement.status === "published" &&
    announcement.publishedAt !== null &&
    new Date(announcement.publishedAt).getTime() > Date.now();

  return {
    title: announcement.title,
    body: announcement.body,
    category: announcement.category,
    priority: announcement.priority,
    publishMode: announcement.status === "published" ? (isScheduled ? "scheduled" : "immediate") : "draft",
    publishedAt: toTokyoDatetimeLocalValue(announcement.publishedAt),
    publishEndAt: toTokyoDatetimeLocalValue(announcement.publishEndAt),
  };
}

export function validateAnnouncementForm(values: AnnouncementFormValues) {
  const errors: string[] = [];
  const trimmedTitle = values.title.trim();
  const trimmedBody = values.body.trim();
  const categories: AnnouncementCategory[] = ["update", "maintenance", "certification", "important", "other"];
  const priorities: AnnouncementPriority[] = ["normal", "important", "urgent"];

  if (!trimmedTitle) errors.push("タイトルを入力してください。");
  if (trimmedTitle.length > 100) errors.push("タイトルは100文字以内で入力してください。");
  if (!trimmedBody) errors.push("本文を入力してください。");
  if (trimmedBody.length > 5000) errors.push("本文は5000文字以内で入力してください。");
  if (!categories.includes(values.category)) errors.push("カテゴリーを選択してください。");
  if (!priorities.includes(values.priority)) errors.push("重要度を選択してください。");

  const publishedAt = values.publishMode === "draft" || !values.publishedAt ? null : parseTokyoDatetimeLocal(values.publishedAt);
  const publishEndAt = values.publishEndAt ? parseTokyoDatetimeLocal(values.publishEndAt) : null;

  if (values.publishMode === "scheduled" && !publishedAt) {
    errors.push("予約公開日時を入力してください。");
  }

  if (values.publishMode === "immediate" && values.publishedAt && !publishedAt) {
    errors.push("公開日時を正しく入力してください。");
  }

  if (values.publishEndAt && !publishEndAt) {
    errors.push("公開終了日時を正しく入力してください。");
  }

  const effectivePublishedAt =
    values.publishMode === "draft" ? null : values.publishMode === "immediate" ? publishedAt ?? new Date() : publishedAt;

  if (publishEndAt && effectivePublishedAt && publishEndAt.getTime() <= effectivePublishedAt.getTime()) {
    errors.push("公開終了日時は公開日時より後にしてください。");
  }

  return errors;
}

export async function listVisibleAnnouncements() {
  const context = await getAnnouncementContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("announcements")
    .select(announcementSelect)
    .eq("status", "published")
    .eq("target_scope", "all")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as AnnouncementRow[];
  const statesByAnnouncementId = await listStatesForAnnouncements(
    context,
    rows.map((row) => row.id),
  );

  return rows
    .map((row) => toAnnouncement(row, statesByAnnouncementId.get(row.id)))
    .filter((announcement) => !announcement.isHidden);
}

export async function listUnreadAnnouncementCount() {
  const announcements = await listVisibleAnnouncements();
  return announcements.filter((announcement) => !announcement.isRead).length;
}

export async function getVisibleAnnouncementById(id: string) {
  if (!isUuid(id)) return null;

  const context = await getAnnouncementContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("announcements")
    .select(announcementSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const statesByAnnouncementId = await listStatesForAnnouncements(context, [id]);
  const announcement = toAnnouncement(data as unknown as AnnouncementRow, statesByAnnouncementId.get(id));

  return announcement.isHidden ? null : announcement;
}

export async function markAnnouncementRead(id: string) {
  const context = await getAnnouncementContext();
  if (!context) return;

  const currentState = await getStateForAnnouncement(context, id);
  const readAt = new Date().toISOString();
  const { error } = currentState
    ? await context.supabase
        .from("announcement_user_states")
        .update({ read_at: readAt })
        .eq("announcement_id", id)
        .eq("user_id", context.user.id)
    : await context.supabase.from("announcement_user_states").insert({
        announcement_id: id,
        user_id: context.user.id,
        read_at: readAt,
      });

  if (error) throw error;
}

export async function hideAnnouncementFromList(id: string) {
  const context = await getAnnouncementContext();
  if (!context) return;

  const currentState = await getStateForAnnouncement(context, id);
  const hiddenAt = new Date().toISOString();
  const { error } = currentState
    ? await context.supabase
        .from("announcement_user_states")
        .update({ hidden_at: hiddenAt })
        .eq("announcement_id", id)
        .eq("user_id", context.user.id)
    : await context.supabase.from("announcement_user_states").insert({
        announcement_id: id,
        user_id: context.user.id,
        hidden_at: hiddenAt,
      });

  if (error) throw error;
}

export async function listDeveloperAnnouncements(): Promise<DeveloperAnnouncementListItem[]> {
  const context = await getDeveloperContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("announcements")
    .select(announcementSelect)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as AnnouncementRow[]).map((row) => {
    const announcement = toAnnouncement(row);
    return { ...announcement, statusLabel: getDeveloperAnnouncementStatusLabel(announcement) };
  });
}

export async function getDeveloperAnnouncementById(id: string) {
  if (!isUuid(id)) return null;

  const context = await getDeveloperContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("announcements")
    .select(announcementSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toAnnouncement(data as unknown as AnnouncementRow);
}

export async function getMorizinPublisher() {
  const context = await getDeveloperContext();
  if (!context) return null;

  const { data, error } = await context.supabase
    .from("announcement_publishers")
    .select("id,name,display_name,publisher_type,is_verified,is_active")
    .eq("name", "morizin")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toPublisher(data as AnnouncementPublisherRow);
}

export async function createDeveloperAnnouncement(values: AnnouncementFormValues) {
  const context = await getDeveloperContext();
  if (!context) throw new Error("このページを利用する権限がありません。");

  const errors = validateAnnouncementForm(values);
  if (errors.length > 0) throw new Error(errors[0]);

  const publisher = await getMorizinPublisher();
  if (!publisher || !publisher.id) throw new Error("森zin運営の発信元を取得できませんでした。");

  const { data, error } = await context.supabase
    .from("announcements")
    .insert(buildAnnouncementPayload(values, publisher.id))
    .select(announcementSelect)
    .single();

  if (error) throw error;

  return toAnnouncement(data as unknown as AnnouncementRow);
}

export async function updateDeveloperAnnouncement(id: string, values: AnnouncementFormValues) {
  const context = await getDeveloperContext();
  if (!context) throw new Error("このページを利用する権限がありません。");
  if (!isUuid(id)) throw new Error("お知らせIDが正しくありません。");

  const errors = validateAnnouncementForm(values);
  if (errors.length > 0) throw new Error(errors[0]);

  const { data, error } = await context.supabase
    .from("announcements")
    .update(buildAnnouncementPayload(values))
    .eq("id", id)
    .select(announcementSelect)
    .single();

  if (error) throw error;

  return toAnnouncement(data as unknown as AnnouncementRow);
}

export async function archiveDeveloperAnnouncement(id: string) {
  const context = await getDeveloperContext();
  if (!context) throw new Error("このページを利用する権限がありません。");
  if (!isUuid(id)) throw new Error("お知らせIDが正しくありません。");

  const { data, error } = await context.supabase
    .from("announcements")
    .update({ status: "archived" })
    .eq("id", id)
    .select(announcementSelect)
    .single();

  if (error) throw error;

  return toAnnouncement(data as unknown as AnnouncementRow);
}
