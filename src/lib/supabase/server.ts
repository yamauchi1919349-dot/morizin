import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type ServerProfile = {
  id: string;
  user_id: string;
  facility_id: string;
  name: string | null;
  email: string | null;
  role: "owner" | "staff";
  status: "active" | "disabled";
};

export class StaffApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function getServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new StaffApiError(503, "スタッフ管理のサーバー設定が完了していません。");
  }

  return { url, anonKey, serviceRoleKey };
}

export function createSupabaseServiceClient(): SupabaseClient {
  const config = getServerConfig();
  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new StaffApiError(401, "ログインが必要です。");
  }
  return token;
}

export async function requireAuthenticatedUser(request: Request): Promise<User> {
  const config = getServerConfig();
  const token = getBearerToken(request);
  const authClient = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new StaffApiError(401, "認証情報を確認できませんでした。");
  }

  return data.user;
}

export async function requireActiveProfile(request: Request, ownerOnly = false) {
  const user = await requireAuthenticatedUser(request);
  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,user_id,facility_id,name,email,role,status")
    .eq("user_id", user.id)
    .maybeSingle<ServerProfile>();

  if (error || !data || data.status !== "active") {
    throw new StaffApiError(403, "有効なプロフィールを確認できませんでした。");
  }

  if (ownerOnly && data.role !== "owner") {
    throw new StaffApiError(403, "Owner権限が必要です。");
  }

  return { admin, profile: data, user };
}

export function staffErrorResponse(error: unknown) {
  if (error instanceof StaffApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Staff API failed.", error);
  return Response.json({ error: "スタッフ管理処理に失敗しました。" }, { status: 500 });
}

export async function readJsonObject(request: Request) {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid body");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new StaffApiError(400, "リクエストの形式が正しくありません。");
  }
}

export function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const productionInviteOrigin = "https://morizin.vercel.app";

export function getInviteRedirectUrl(token: string) {
  const redirectUrl = new URL("/auth/invite", productionInviteOrigin);
  redirectUrl.searchParams.set("token", token);
  return redirectUrl.toString();
}

export function sendInvitationEmail(admin: SupabaseClient, email: string, displayName: string, redirectTo: string) {
  return admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { name: displayName },
  });
}
