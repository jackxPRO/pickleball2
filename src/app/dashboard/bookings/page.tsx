import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { BookingsList } from "@/components/dashboard/bookings-list";

export default async function MyBookingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [bookings, settings] = await Promise.all([
    bookingRepository.listForUser(supabase, user.id).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">My bookings</h1>
        <p className="text-white/60">View and manage your reservations.</p>
      </div>
      <BookingsList bookings={bookings} currency={settings?.currency ?? "PHP"} />
    </div>
  );
}
