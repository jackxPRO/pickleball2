import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courtRepository } from "@/lib/repositories/court.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { BookingClient } from "@/components/dashboard/booking-client";
import type { PricingRule } from "@/types/database";

export default async function BookPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [courts, settings, pricingRes] = await Promise.all([
    courtRepository.list(supabase, true).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
    supabase.from("pricing_rules").select("*").eq("active", true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Book a court</h1>
        <p className="text-white/60">
          Pick a date, court, and time slots. Payment is deducted from your wallet.
        </p>
      </div>
      <BookingClient
        courts={courts}
        pricing={(pricingRes.data ?? []) as PricingRule[]}
        walletBalance={user.wallet_balance}
        currency={settings?.currency ?? "PHP"}
        openHour={7}
        closeHour={24}
      />
    </div>
  );
}
