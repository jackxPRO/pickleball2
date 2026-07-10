"use client";

import { useMemo, useState } from "react";
import { Download, DollarSign, CalendarCheck, RotateCcw, Clock } from "lucide-react";
import { cn, formatCurrency, todayISO } from "@/lib/utils";
import type { Booking, WalletTopup } from "@/types/database";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";

type Period = "day" | "week" | "month" | "year" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

function localISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** Inclusive [start, end] date range (YYYY-MM-DD) for a period, or null for all-time. */
function periodRange(period: Period, today: string): { start: string; end: string } | null {
  if (period === "all") return null;
  if (period === "day") return { start: today, end: today };
  const d = new Date(today + "T00:00:00");
  if (period === "week") {
    const diff = (d.getDay() + 6) % 7; // days since Monday
    const start = new Date(d);
    start.setDate(d.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: localISO(start), end: localISO(end) };
  }
  if (period === "month") {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: localISO(start), end: localISO(end) };
  }
  // year
  return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
}

function toCSV(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({
  bookings,
  topups,
  currency,
}: {
  bookings: Booking[];
  topups: WalletTopup[];
  currency: string;
}) {
  const today = todayISO();
  const [period, setPeriod] = useState<Period>("all");
  const [userId, setUserId] = useState<string>("all");

  // Unique users who have bookings, for the "user who book" filter.
  const users = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => {
      if (!b.user_id) return;
      const name = b.users?.full_name || b.users?.email || b.user_id;
      if (!map.has(b.user_id)) map.set(b.user_id, name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const range = useMemo(() => periodRange(period, today), [period, today]);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const matchUser = userId === "all" || b.user_id === userId;
        const matchPeriod =
          !range || (b.booking_date >= range.start && b.booking_date <= range.end);
        return matchUser && matchPeriod;
      }),
    [bookings, userId, range]
  );

  const filteredTopups = useMemo(
    () =>
      topups.filter((t) => {
        const matchUser = userId === "all" || t.user_id === userId;
        const day = t.created_at.slice(0, 10);
        const matchPeriod = !range || (day >= range.start && day <= range.end);
        return matchUser && matchPeriod;
      }),
    [topups, userId, range]
  );

  const stats = useMemo(() => {
    const revenue = filteredBookings
      .filter((b) => b.booking_status !== "REFUNDED" && b.booking_status !== "CANCELLED")
      .reduce((s, b) => s + Number(b.amount), 0);
    const refunds = filteredBookings
      .filter((b) => b.booking_status === "REFUNDED")
      .reduce((s, b) => s + Number(b.amount), 0);
    const approvedTopups = filteredTopups
      .filter((t) => t.status === "APPROVED")
      .reduce((s, t) => s + Number(t.amount), 0);

    // Peak hours
    const hourCount = new Map<number, number>();
    filteredBookings.forEach((b) => {
      const h = Number(b.start_time.slice(0, 2));
      hourCount.set(h, (hourCount.get(h) ?? 0) + 1);
    });
    const peak = Array.from(hourCount.entries()).sort((a, b) => b[1] - a[1])[0];

    // Court utilization
    const courtCount = new Map<string, number>();
    filteredBookings.forEach((b) => {
      const name = b.courts?.name ?? "Unknown";
      courtCount.set(name, (courtCount.get(name) ?? 0) + 1);
    });

    return { revenue, refunds, approvedTopups, peak, courtCount };
  }, [filteredBookings, filteredTopups]);

  function exportBookings() {
    const rows = filteredBookings.map((b) => ({
      code: b.booking_code,
      customer: b.users?.full_name ?? b.users?.email ?? "",
      court: b.courts?.name ?? "",
      date: b.booking_date,
      start: b.start_time,
      end: b.end_time,
      amount: b.amount,
      status: b.booking_status,
    }));
    download(`bookings-${today}.csv`, toCSV(rows));
  }

  function exportTopups() {
    const rows = filteredTopups.map((t) => ({
      customer: t.users?.full_name ?? t.users?.email ?? "",
      amount: t.amount,
      status: t.status,
      date: t.created_at,
    }));
    download(`topups-${today}.csv`, toCSV(rows));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                period === p.value
                  ? "bg-secondary text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="input w-full sm:w-64"
        >
          <option value="all">All customers</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(stats.revenue, currency)} icon={DollarSign} />
        <StatCard label="Total bookings" value={filteredBookings.length} icon={CalendarCheck} />
        <StatCard label="Refunds" value={formatCurrency(stats.refunds, currency)} icon={RotateCcw} />
        <StatCard
          label="Peak hour"
          value={stats.peak ? `${stats.peak[0]}:00` : "—"}
          hint={stats.peak ? `${stats.peak[1]} bookings` : undefined}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Court utilization" />
          <div className="space-y-3">
            {Array.from(stats.courtCount.entries()).map(([name, count]) => {
              const max = Math.max(...Array.from(stats.courtCount.values()), 1);
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{name}</span>
                    <span className="text-white">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-light to-secondary"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.courtCount.size === 0 && (
              <p className="text-sm text-white/50">No data yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Export data" subtitle="Download CSV (opens in Excel)." />
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-white">Bookings report</p>
                <p className="text-xs text-white/50">{filteredBookings.length} records</p>
              </div>
              <Button size="sm" variant="gold" onClick={exportBookings}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-white">Top-ups report</p>
                <p className="text-xs text-white/50">
                  {formatCurrency(stats.approvedTopups, currency)} approved
                </p>
              </div>
              <Button size="sm" variant="gold" onClick={exportTopups}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </div>
            <p className="text-xs text-white/40">
              PDF export can be added via a print stylesheet or a server-side PDF
              renderer — the data layer is already export-ready.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
