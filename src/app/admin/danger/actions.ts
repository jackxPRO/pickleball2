"use server";

import { createClient as createRawClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

export type WipeResult = { ok: boolean; error?: string; deletedUsers?: number };

/**
 * DANGER: wipes all operational data. Super admin only.
 * Requires the admin's own password AND the literal confirmation word "DELETE".
 */
export async function wipeDatabaseAction(input: {
  password: string;
  confirm: string;
}): Promise<WipeResult> {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a super admin can perform this action." };
  }

  if (input.confirm !== "DELETE") {
    return { ok: false, error: 'You must type "DELETE" to confirm.' };
  }
  if (!input.password) {
    return { ok: false, error: "Enter your password to confirm." };
  }

  // Re-verify the admin's password with a throwaway client (no session change).
  const verifier = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: authErr } = await verifier.auth.signInWithPassword({
    email: admin.email,
    password: input.password,
  });
  if (authErr) {
    return { ok: false, error: "Incorrect password." };
  }

  try {
    // 1) Wipe operational tables (super-admin-guarded DB function).
    const supabase = await createClient();
    const { error: rpcErr } = await supabase.rpc("danger_wipe_data");
    if (rpcErr) return { ok: false, error: rpcErr.message };

    // 2) Delete non-admin auth accounts via the service role.
    let deletedUsers = 0;
    try {
      const service = createServiceClient();
      const { data: adminRows } = await service
        .from("admins")
        .select("auth_id");
      const adminIds = new Set(
        (adminRows ?? []).map((a: { auth_id: string | null }) => a.auth_id)
      );

      let page = 1;
      // Paginate through auth users and remove customers.
      for (;;) {
        const { data, error } = await service.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) break;
        for (const u of data.users) {
          if (!adminIds.has(u.id)) {
            await service.auth.admin.deleteUser(u.id);
            deletedUsers += 1;
          }
        }
        if (data.users.length < 200) break;
        page += 1;
      }
    } catch {
      // Auth cleanup is best-effort; DB data is already wiped.
    }

    return { ok: true, deletedUsers };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}
