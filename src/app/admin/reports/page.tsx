import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { ReportsClient } from "@/components/admin/reports-client";

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [bookings, topups, settings] = await Promise.all([
    bookingRepository.listAll(supabase).catch(() => []),
    walletRepository.allTopups(supabase).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Reports</h1>
        <p className="text-white/60">Revenue, bookings, and utilization insights.</p>
      </div>
      <ReportsClient
        bookings={bookings}
        topups={topups}
        currency={settings?.currency ?? "PHP"}
      />
    </div>
  );
}
