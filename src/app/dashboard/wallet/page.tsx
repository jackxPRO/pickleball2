import { Wallet, ArrowDownCircle, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { paymentMethodRepository } from "@/lib/repositories/payment-method.repository";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TopupClient } from "@/components/dashboard/topup-client";
import { TOPUP_STATUS_STYLES, TX_TYPE_STYLES } from "@/lib/constants";

export default async function WalletPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [transactions, topups, methods, settings] = await Promise.all([
    walletRepository.transactions(supabase, user.id).catch(() => []),
    walletRepository.myTopups(supabase, user.id).catch(() => []),
    paymentMethodRepository.list(supabase, true).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);
  const currency = settings?.currency ?? "PHP";
  const pending = topups.filter((t) => t.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Wallet</h1>
        <p className="text-white/60">Top up and track your transactions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="bg-gradient-to-br from-primary/40 to-black">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-secondary/15 p-3">
                <Wallet className="h-7 w-7 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-white/60">Current balance</p>
                <p className="font-display text-3xl font-extrabold gold-text">
                  {formatCurrency(user.wallet_balance, currency)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Transaction history" />
            {transactions.length === 0 ? (
              <EmptyState
                icon={ArrowDownCircle}
                title="No transactions yet"
                description="Top up your wallet to get started."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/50">
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Type</th>
                      <th className="py-2 font-medium">Description</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                      <th className="py-2 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="py-3 text-white/60">
                          {formatDate(t.created_at, true)}
                        </td>
                        <td className="py-3">
                          <span className={`font-medium ${TX_TYPE_STYLES[t.type]}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 text-white/70">{t.description}</td>
                        <td
                          className={`py-3 text-right font-semibold ${TX_TYPE_STYLES[t.type]}`}
                        >
                          {t.amount > 0 ? "+" : ""}
                          {formatCurrency(t.amount, currency)}
                        </td>
                        <td className="py-3 text-right text-white/80">
                          {formatCurrency(t.balance_after, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <TopupClient methods={methods} currency={currency} />

          <Card>
            <CardHeader title="Pending top-ups" />
            {pending.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/50">
                No pending top-ups.
              </p>
            ) : (
              <div className="space-y-3">
                {pending.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <div>
                        <p className="font-medium text-white">
                          {formatCurrency(t.amount, currency)}
                        </p>
                        <p className="text-xs text-white/50">
                          {formatDate(t.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge className={TOPUP_STATUS_STYLES[t.status]}>
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
