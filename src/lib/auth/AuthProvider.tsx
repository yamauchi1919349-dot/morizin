"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { clearCurrentAccessScope, getLocalAccessScope, saveCurrentAccessScope, type AccessScope } from "./accessScope";

type AuthState = {
  isLoading: boolean;
  isConfigured: boolean;
  user: User | null;
  scope: AccessScope;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadAccessScopeForUser(user: User): Promise<AccessScope> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return getLocalAccessScope();

  const { data } = await supabase
    .from("profiles")
    .select("facility_id,email,name,role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    facilityId: data?.facility_id ?? `unassigned-${user.id}`,
    userId: user.id,
    name: data?.name ?? user.user_metadata?.name ?? user.user_metadata?.full_name ?? undefined,
    email: data?.email ?? user.email ?? undefined,
    role: data?.role === "owner" || data?.role === "staff" ? data.role : undefined,
    status: data?.status === "active" || data?.status === "disabled" ? data.status : undefined,
    isAuthenticated: true,
    isSupabaseConfigured: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [scope, setScope] = useState<AccessScope>(getLocalAccessScope());
  const isConfigured = isSupabaseConfigured();

  const refresh = useCallback(async function refresh() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      const localScope = getLocalAccessScope();
      saveCurrentAccessScope(localScope);
      setUser(null);
      setScope(localScope);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data } = await supabase.auth.getUser();
    const nextUser = data.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      clearCurrentAccessScope();
      setScope({ ...getLocalAccessScope(), isSupabaseConfigured: true });
      setIsLoading(false);
      return;
    }

    const nextScope = await loadAccessScopeForUser(nextUser);
    saveCurrentAccessScope(nextScope);
    setScope(nextScope);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearCurrentAccessScope();
    setUser(null);
    setScope({ ...getLocalAccessScope(), isSupabaseConfigured: isConfigured });
  }, [isConfigured]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    if (!supabase) {
      return () => window.clearTimeout(timeoutId);
    }

    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      window.clearTimeout(timeoutId);
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isConfigured,
      user,
      scope,
      signOut,
      refresh,
    }),
    [isConfigured, isLoading, refresh, scope, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
