import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const settings = await settingsRepository
    .getWebsiteSettings(supabase)
    .catch(() => null);

  return (
    <AdminShell
      email={admin.email}
      logo={settings?.dashboard_logo || settings?.logo || null}
      businessName={settings?.business_name ?? "5 Point Pickleball"}
    >
      {children}
    </AdminShell>
  );
}
