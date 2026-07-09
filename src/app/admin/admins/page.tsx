import { requireAdmin, getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";
import { AdminsManager } from "@/components/admin/admins-manager";
import type { Admin } from "@/types/database";

export default async function AdminAdminsPage() {
  await requireAdmin();
  const me = await getCurrentAdmin();

  if (!me || me.role !== "SUPER_ADMIN") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Super admin only"
        description="You need super admin privileges to manage administrators."
      />
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("list_admins");
  const admins = (data ?? []) as Admin[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Administrators
        </h1>
        <p className="text-white/60">
          Add or remove admins. Only super admins can manage this list.
        </p>
      </div>
      <AdminsManager admins={admins} currentAdminId={me.id} />
    </div>
  );
}
