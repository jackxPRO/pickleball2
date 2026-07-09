import Link from "next/link";
import {
  Wallet,
  CalendarCheck,
  Clock,
  TrendingUp,
  CalendarPlus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { formatCurrency, formatDate, formatTime, todayISO } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BOOKING_STATUS_STYLES, TX_TYPE_STYLES } from "@/lib/constants";

export default async function DashboardHome() {
  const user = await requireUser();
  const supabase = await createClient();
  const [bookings, transactions, settings] = await Promise.all([
    bookingRepository.listForUser(supabase, user.id).catch(() => []),
    walletRepository.transactions(supabase, user.id, 5).catch(() => []),
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
  ]);

  const currency = settings?.currency ?? "PHP";
  const today = todayISO();
  const upcoming = bookings.filter(
    (b) => b.booking_date >= today && b.booking_status === "CONFIRMED"
  );
  const completed = bookings.filter((b) => b.booking_status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Welcome back, {user.full_name?.split(" ")[0] || "Player"} 👋
        </h1>
        <p className="text-white/60">Here&apos;s your activity at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet balance"
          value={formatCurrency(user.wallet_balance, currency)}
          icon={Wallet}
        />
        <StatCard label="Upcoming" value={upcoming.length} icon={Clock} />
        <StatCard
          label="Total bookings"
          value={bookings.length}
          icon={CalendarCheck}
        />
        <StatCard label="Completed" value={completed.length} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upcoming bookings"
            action={
              <Link href="/dashboard/book" className="btn-gold py-1.5 text-xs">
                <CalendarPlus className="h-4 w-4" /> Book
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="No upcoming bookings"
              description="Reserve a court to get started."
              action={
                <Link href="/dashboard/book" className="btn-gold">
                  Book a court
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <div>
                    <p className="font-medium text-white">{b.courts?.name}</p>
                    <p className="text-sm text-white/60">
                      {formatDate(b.booking_date)} · {formatTime(b.start_time)}–
                      {formatTime(b.end_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {formatCurrency(b.amount, currency)}
                    </p>
                    <Badge className={BOOKING_STATUS_STYLES[b.booking_status]}>
                      {b.booking_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <Link
                href="/dashboard/wallet"
                className="text-xs text-secondary hover:underline"
              >
                View all
              </Link>
            }
          />
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/50">
              No transactions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{t.type}</p>
                    <p className="text-xs text-white/50">
                      {formatDate(t.created_at, true)}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${TX_TYPE_STYLES[t.type]}`}>
                    {t.amount > 0 ? "+" : ""}
                    {formatCurrency(t.amount, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
