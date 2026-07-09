import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await settingsRepository
    .getWebsiteSettings(supabase)
    .catch(() => null);

  return (
    <DashboardShell
      name={user.full_name || "Player"}
      balance={user.wallet_balance}
      currency={settings?.currency ?? "PHP"}
      logo={settings?.dashboard_logo || settings?.logo || null}
      businessName={settings?.business_name ?? "5 Point Pickleball"}
    >
      {children}
    </DashboardShell>
  );
}
