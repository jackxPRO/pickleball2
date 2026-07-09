"use client";

import { useMemo } from "react";
import { Download, DollarSign, CalendarCheck, RotateCcw, Clock } from "lucide-react";
import { formatCurrency, todayISO } from "@/lib/utils";
import type { Booking, WalletTopup } from "@/types/database";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";

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

  const stats = useMemo(() => {
    const revenue = bookings
      .filter((b) => b.booking_status !== "REFUNDED" && b.booking_status !== "CANCELLED")
      .reduce((s, b) => s + Number(b.amount), 0);
    const refunds = bookings
      .filter((b) => b.booking_status === "REFUNDED")
      .reduce((s, b) => s + Number(b.amount), 0);
    const approvedTopups = topups
      .filter((t) => t.status === "APPROVED")
      .reduce((s, t) => s + Number(t.amount), 0);

    // Peak hours
    const hourCount = new Map<number, number>();
    bookings.forEach((b) => {
      const h = Number(b.start_time.slice(0, 2));
      hourCount.set(h, (hourCount.get(h) ?? 0) + 1);
    });
    const peak = Array.from(hourCount.entries()).sort((a, b) => b[1] - a[1])[0];

    // Court utilization
    const courtCount = new Map<string, number>();
    bookings.forEach((b) => {
      const name = b.courts?.name ?? "Unknown";
      courtCount.set(name, (courtCount.get(name) ?? 0) + 1);
    });

    return { revenue, refunds, approvedTopups, peak, courtCount };
  }, [bookings, topups]);

  function exportBookings() {
    const rows = bookings.map((b) => ({
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
    const rows = topups.map((t) => ({
      customer: t.users?.full_name ?? t.users?.email ?? "",
      amount: t.amount,
      status: t.status,
      date: t.created_at,
    }));
    download(`topups-${today}.csv`, toCSV(rows));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(stats.revenue, currency)} icon={DollarSign} />
        <StatCard label="Total bookings" value={bookings.length} icon={CalendarCheck} />
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
                <p className="text-xs text-white/50">{bookings.length} records</p>
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
