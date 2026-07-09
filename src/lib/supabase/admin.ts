import { createClient as createAdminSupabase } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER ONLY. Bypasses RLS.
 * Use sparingly — only for trusted admin operations (e.g. enabling/disabling
 * auth users) that cannot be expressed via SECURITY DEFINER functions.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
