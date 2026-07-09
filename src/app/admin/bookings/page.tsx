import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { BookingsManager } from "@/components/admin/bookings-manager";

export default async function AdminBookingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [bookings, settings] = await Promise.all([
    bookingRepository.listAll(supabase).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Bookings</h1>
        <p className="text-white/60">Manage all customer reservations.</p>
      </div>
      <BookingsManager
        bookings={bookings}
        currency={settings?.currency ?? "PHP"}
      />
    </div>
  );
}
