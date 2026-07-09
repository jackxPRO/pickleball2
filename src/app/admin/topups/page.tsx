import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { TopupsManager } from "@/components/admin/topups-manager";
import type { WalletTopup } from "@/types/database";

export default async function AdminTopupsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [topups, settings] = await Promise.all([
    walletRepository.allTopups(supabase).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);

  // Generate short-lived signed URLs for private receipt images.
  const withReceipts: WalletTopup[] = await Promise.all(
    topups.map(async (t) => {
      if (!t.receipt_image) return t;
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(t.receipt_image, 60 * 30);
      return { ...t, receipt_image: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Wallet top-ups
        </h1>
        <p className="text-white/60">Review and approve customer top-ups.</p>
      </div>
      <TopupsManager
        topups={withReceipts}
        currency={settings?.currency ?? "PHP"}
      />
    </div>
  );
}
