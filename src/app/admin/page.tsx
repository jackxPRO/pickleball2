import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { courtRepository } from "@/lib/repositories/court.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import type { Booking, Court, AppNotification } from "@/types/database";
import { AdminOverviewClient } from "@/components/admin/overview-client";

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = await createClient();
  await bookingRepository.completePast(supabase).catch(() => {});

  const [
    { data: bookingsData },
    courts,
    { count: pendingTopups },
    { data: notifData },
    settings,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, courts(name), users(full_name, email)")
      .order("created_at", { ascending: false }),
    courtRepository.list(supabase).catch(() => [] as Court[]),
    supabase
      .from("wallet_topups")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
    supabase
      .from("notifications")
      .select("*")
      .eq("is_admin", true)
      .order("created_at", { ascending: false })
      .limit(15),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);

  const bookings = (bookingsData ?? []) as Booking[];
  const notifications = (notifData ?? []) as AppNotification[];

  return (
    <AdminOverviewClient
      bookings={bookings}
      courts={courts}
      notifications={notifications}
      pendingTopups={pendingTopups ?? 0}
      businessName={settings?.business_name ?? "Pickleball"}
      currency={settings?.currency ?? "PHP"}
    />
  );
}
