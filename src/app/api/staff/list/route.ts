import { requireActiveProfile, staffErrorResponse } from "@/lib/supabase/server";

type ProfileRow = { id: string; user_id: string; name: string | null; email: string | null; role: "owner" | "staff"; status: "active" | "disabled"; created_at: string };
type InvitationRow = { id: string; display_name: string; email: string; role: "staff"; status: "pending"; created_at: string; expires_at: string };

export async function GET(request: Request) {
  try {
    const { admin, profile } = await requireActiveProfile(request, true);
    const [profilesResult, invitationsResult] = await Promise.all([
      admin.from("profiles").select("id,user_id,name,email,role,status,created_at").eq("facility_id", profile.facility_id).order("created_at", { ascending: true }),
      admin.from("staff_invitations_v2").select("id,display_name,email,role,status,created_at,expires_at").eq("facility_id", profile.facility_id).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    if (profilesResult.error || invitationsResult.error) throw profilesResult.error ?? invitationsResult.error;

    const now = Date.now();
    const staff = [
      ...((profilesResult.data ?? []) as ProfileRow[]).map((row) => ({
        id: row.id, kind: "profile" as const, userId: row.user_id,
        displayName: row.name ?? row.email ?? "名称未設定", email: row.email ?? "",
        role: row.role, status: row.status, createdAt: row.created_at, expiresAt: null,
        isSelf: row.user_id === profile.user_id,
      })),
      ...((invitationsResult.data ?? []) as InvitationRow[]).map((row) => ({
        id: row.id, kind: "invitation" as const, userId: null,
        displayName: row.display_name, email: row.email, role: row.role,
        status: new Date(row.expires_at).getTime() <= now ? ("expired" as const) : row.status,
        createdAt: row.created_at, expiresAt: row.expires_at, isSelf: false,
      })),
    ];
    return Response.json({ staff });
  } catch (error) {
    return staffErrorResponse(error);
  }
}

