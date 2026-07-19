"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type StaffRole = "owner" | "staff";
export type StaffStatus = "active" | "disabled" | "pending" | "expired" | "cancelled";

export type StaffListItem = {
  id: string;
  kind: "profile" | "invitation";
  userId: string | null;
  displayName: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  createdAt: string;
  expiresAt: string | null;
  isSelf: boolean;
};

async function staffRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("クラウド連携が設定されていません。");

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("ログインが必要です。");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(result.error || "スタッフ管理処理に失敗しました。");
  return result;
}

export async function listStaff(signal?: AbortSignal) {
  const result = await staffRequest<{ staff: StaffListItem[] }>("/api/staff/list", { signal });
  return result.staff;
}

export function inviteStaff(input: { email: string; displayName: string }) {
  return staffRequest<{ message: string }>("/api/staff/invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStaff(input: { id: string; displayName: string }) {
  return staffRequest<{ message: string }>("/api/staff/update", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function disableStaff(id: string) {
  return staffRequest<{ message: string }>("/api/staff/delete", {
    method: "DELETE",
    body: JSON.stringify({ id, kind: "profile" }),
  });
}

export function cancelInvitation(id: string) {
  return staffRequest<{ message: string }>("/api/staff/delete", {
    method: "DELETE",
    body: JSON.stringify({ id, kind: "invitation" }),
  });
}
