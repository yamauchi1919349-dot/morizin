import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return { url, anonKey };
}

export function createSupabaseBrowserClient() {
  if (browserClient !== undefined) return browserClient;

  const config = getSupabaseConfig();
  if (!config) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createClient(config.url, config.anonKey);
  return browserClient;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}
