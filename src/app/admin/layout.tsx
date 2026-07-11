import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { courtRepository } from "@/lib/repositories/court.repository";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminRealtimeToasts } from "@/components/admin/admin-realtime-toasts";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [settings, courts] = await Promise.all([
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
    courtRepository.list(supabase).catch(() => []),
  ]);

  return (
    <AdminShell
      email={admin.email}
      logo={settings?.dashboard_logo || settings?.logo || null}
      businessName={settings?.business_name ?? "5 Point Pickleball"}
    >
      <AdminRealtimeToasts
        courts={courts.map((c) => ({ id: c.id, name: c.name }))}
        currency={settings?.currency ?? "PHP"}
      />
      {children}
    </AdminShell>
  );
}
