import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PricingManager } from "@/components/admin/pricing-manager";
import type { PricingRule } from "@/types/database";

export default async function AdminPricingPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select("*")
    .order("start_time", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Pricing</h1>
        <p className="text-white/60">
          Configure time-based rates and promotional discounts.
        </p>
      </div>
      <PricingManager rules={(data ?? []) as PricingRule[]} />
    </div>
  );
}
