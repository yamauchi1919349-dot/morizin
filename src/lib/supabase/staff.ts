import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type StaffRole = "owner" | "staff";
export type StaffStatus = "invited" | "active" | "disabled";

export type StaffMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

type StaffRow = {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  role: StaffRole;
  status: StaffStatus;
  invited_at: string | null;
  activated_at: string | null;
  disabled_at: string | null;
  created_at: string;
};

function mapStaff(row: StaffRow): StaffMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? "名前未登録",
    email: row.email ?? "",
    role: row.role,
    status: row.status,
    invitedAt: row.invited_at,
    activatedAt: row.activated_at,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
  };
}

export async function listStaffMembers() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabaseが設定されていません。");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,user_id,name,email,role,status,invited_at,activated_at,disabled_at,created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`スタッフ一覧を取得できませんでした: ${error.message}`);
  return (data as StaffRow[]).map(mapStaff);
}

async function staffRequest(path: string, method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabaseが設定されていません。");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("ログイン情報を確認できません。再ログインしてください。");

  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error ?? "スタッフ操作に失敗しました。");
}

export function inviteStaff(input: { name: string; email: string; role: StaffRole }) {
  return staffRequest("/api/staff/invite", "POST", input);
}

export function updateStaff(input: { id: string; name: string; role: StaffRole; status: StaffStatus }) {
  return staffRequest("/api/staff/update", "PATCH", input);
}

export function disableStaff(id: string) {
  return staffRequest("/api/staff/delete", "DELETE", { id });
}
