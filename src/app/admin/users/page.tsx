import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { userRepository } from "@/lib/repositories/user.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { UsersManager } from "@/components/admin/users-manager";

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [users, settings, adminRes] = await Promise.all([
    userRepository.list(supabase).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
    supabase.from("admins").select("auth_id, email"),
  ]);

  const adminRows = adminRes.data ?? [];

  // Identify which customer accounts are also admins so they can't be disabled.
  const adminAuthIds = adminRows
    .map((a) => a.auth_id)
    .filter((id): id is string => Boolean(id));
  const adminEmails = adminRows
    .map((a) => a.email?.toLowerCase())
    .filter((e): e is string => Boolean(e));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Users</h1>
        <p className="text-white/60">Manage customers and wallets.</p>
      </div>
      <UsersManager
        users={users}
        currency={settings?.currency ?? "PHP"}
        adminAuthIds={adminAuthIds}
        adminEmails={adminEmails}
      />
    </div>
  );
}
