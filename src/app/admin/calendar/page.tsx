import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { courtRepository } from "@/lib/repositories/court.repository";
import { BookingCalendar } from "@/components/admin/booking-calendar";

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function AdminCalendarPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { from, to } = monthRange();
  const [bookings, courts] = await Promise.all([
    bookingRepository.listInRange(supabase, from, to).catch(() => []),
    courtRepository.list(supabase).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Calendar</h1>
        <p className="text-white/60">Bookings across all courts.</p>
      </div>
      <BookingCalendar bookings={bookings} courts={courts} />
    </div>
  );
}
