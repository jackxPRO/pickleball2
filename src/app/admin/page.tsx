import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  Wallet,
  DollarSign,
  Activity,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import type { Booking } from "@/types/database";

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: bookingsData }, { count: pendingTopups }, settings] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("*, courts(name), users(full_name, email)")
        .neq("booking_status", "CANCELLED")
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_topups")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING"),
      settingsRepository.getWebsiteSettings(supabase).catch(() => null),
    ]);

  const bookings = (bookingsData ?? []) as Booking[];
  const currency = settings?.currency ?? "PHP";
  const revenueFor = (rows: Booking[]) =>
    rows
      .filter((b) => b.booking_status !== "REFUNDED")
      .reduce((s, b) => s + Number(b.amount), 0);

  const todaysBookings = bookings.filter((b) => b.booking_date === today);
  const upcoming = bookings.filter(
    (b) => b.booking_date >= today && b.booking_status === "CONFIRMED"
  );
  const wk = startOfWeek();
  const mo = startOfMonth();

  const dailyRevenue = revenueFor(todaysBookings);
  const weeklyRevenue = revenueFor(bookings.filter((b) => b.booking_date >= wk));
  const monthlyRevenue = revenueFor(bookings.filter((b) => b.booking_date >= mo));
  const totalRevenue = revenueFor(bookings);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Admin overview
        </h1>
        <p className="text-white/60">Business performance at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's bookings" value={todaysBookings.length} icon={CalendarCheck} />
        <StatCard label="Upcoming" value={upcoming.length} icon={Clock} />
        <StatCard
          label="Pending top-ups"
          value={pendingTopups ?? 0}
          icon={Wallet}
          hint="Awaiting approval"
        />
        <StatCard label="Total bookings" value={bookings.length} icon={Activity} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Daily revenue" value={formatCurrency(dailyRevenue, currency)} icon={DollarSign} />
        <StatCard label="Weekly revenue" value={formatCurrency(weeklyRevenue, currency)} icon={TrendingUp} />
        <StatCard label="Monthly revenue" value={formatCurrency(monthlyRevenue, currency)} icon={TrendingUp} />
        <StatCard label="Total revenue" value={formatCurrency(totalRevenue, currency)} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader
          title="Recent bookings"
          action={
            <Link href="/admin/bookings" className="text-xs text-secondary hover:underline">
              View all
            </Link>
          }
        />
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/50">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50">
                  <th className="py-2 font-medium">Code</th>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium">Court</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 8).map((b) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="py-3 font-mono text-xs text-white/50">{b.booking_code}</td>
                    <td className="py-3 text-white">{b.users?.full_name || b.users?.email}</td>
                    <td className="py-3 text-white/70">{b.courts?.name}</td>
                    <td className="py-3 text-white/70">{formatDate(b.booking_date)}</td>
                    <td className="py-3 text-right text-white">{formatCurrency(b.amount, currency)}</td>
                    <td className="py-3 text-right">
                      <Badge className={BOOKING_STATUS_STYLES[b.booking_status]}>
                        {b.booking_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
