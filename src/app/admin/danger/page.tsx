import { requireAdmin, getCurrentAdmin } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DangerZone } from "@/components/admin/danger-zone";

export default async function AdminDangerPage() {
  await requireAdmin();
  const me = await getCurrentAdmin();

  if (!me || me.role !== "SUPER_ADMIN") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Super admin only"
        description="You need super admin privileges to access the danger zone."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-red-400">
          Danger Zone
        </h1>
        <p className="text-white/60">
          Irreversible, destructive actions. Proceed with extreme caution.
        </p>
      </div>
      <DangerZone />
    </div>
  );
}
