import { redirect } from "next/navigation";
import { getCurrentAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admins are not customers — they have no wallet and should never see the
  // customer dashboard. Send them to the admin panel instead.
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

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
      dashboardBackground={settings?.dashboard_background || null}
      bookingBackground={settings?.booking_background || null}
      walletBackground={settings?.wallet_background || null}
      overlay={settings?.overlay_opacity ?? 0.6}
    >
      {children}
    </DashboardShell>
  );
}
