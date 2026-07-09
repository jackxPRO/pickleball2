"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import type { AdminRole } from "@/types/database";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Create (or promote) an administrator. Super admin only.
 * Creates the auth user with the service role, then records the admin row via
 * the SECURITY DEFINER grant_admin RPC (authorized by the caller's session).
 */
export async function createAdminAction(input: {
  email: string;
  password: string;
  role: AdminRole;
}): Promise<ActionResult> {
  const caller = await getCurrentAdmin();
  if (!caller || caller.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a super admin can add admins." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.length < 8) {
    return { ok: false, error: "Enter an email and a password (8+ chars)." };
  }

  try {
    const service = createServiceClient();

    // 1) Create the auth user (or find it if it already exists).
    let authId: string | null = null;
    const { data: created, error: createErr } =
      await service.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: "Administrator" },
      });

    if (createErr) {
      if (/already been registered|already exists/i.test(createErr.message)) {
        const { data: list } = await service.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        authId =
          list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
        if (authId) {
          await service.auth.admin.updateUserById(authId, {
            password: input.password,
            email_confirm: true,
          });
        }
      } else {
        return { ok: false, error: createErr.message };
      }
    } else {
      authId = created.user.id;
    }

    if (!authId) {
      return { ok: false, error: "Could not resolve the user account." };
    }

    // 2) Record the admin row (authorized as the calling super admin).
    const supabase = await createClient();
    const { error: rpcErr } = await supabase.rpc("grant_admin", {
      p_auth_id: authId,
      p_email: email,
      p_role: input.role,
    });
    if (rpcErr) return { ok: false, error: rpcErr.message };

    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

/** Remove an admin. Super admin only. */
export async function revokeAdminAction(adminId: string): Promise<ActionResult> {
  const caller = await getCurrentAdmin();
  if (!caller || caller.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a super admin can remove admins." };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_admin", {
      p_admin_id: adminId,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}
