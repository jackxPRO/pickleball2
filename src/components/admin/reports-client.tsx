"use client";

import { useMemo, useState } from "react";
import {
  Download,
  DollarSign,
  CalendarCheck,
  RotateCcw,
  Clock,
  Users,
  TrendingUp,
  Percent,
  Timer,
  Wallet,
  FileSpreadsheet,
  Printer,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  CalendarDays,
  UserPlus,
  Activity,
} from "lucide-react";
import { cn, formatCurrency, formatTime, todayISO } from "@/lib/utils";
import {
  DEFAULT_OPEN_HOUR,
  DEFAULT_CLOSE_HOUR,
} from "@/lib/constants";
import type { Booking, WalletTopup, Court } from "@/types/database";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  BarChart,
  DoughnutChart,
  Heatmap,
  CHART_COLORS,
} from "@/components/admin/charts";

type Period = "day" | "week" | "month" | "year" | "all" | "custom";
type Granularity = "daily" | "weekly" | "monthly" | "yearly";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
  { value: "all", label: "All time" },
];

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const OPEN = DEFAULT_OPEN_HOUR;
const CLOSE = DEFAULT_CLOSE_HOUR;
const OPEN_HOURS = CLOSE - OPEN;

/* --------------------------------- helpers -------------------------------- */

function localISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** Inclusive [start, end] date range for a period, or null for all-time. */
function periodRange(
  period: Period,
  today: string
): { start: string; end: string } | null {
  if (period === "all" || period === "custom") return null;
  if (period === "day") return { start: today, end: today };
  const d = new Date(today + "T00:00:00");
  if (period === "week") {
    const diff = (d.getDay() + 6) % 7;
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
  return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` };
}

/** The equal-length period immediately before the given range (for comparisons). */
function previousRange(
  range: { start: string; end: string } | null
): { start: string; end: string } | null {
  if (!range) return null;
  const start = new Date(range.start + "T00:00:00");
  const end = new Date(range.end + "T00:00:00");
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - (days - 1));
  return { start: localISO(prevStart), end: localISO(prevEnd) };
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Booking duration in hours (handles midnight end = 24:00). */
function durationHours(b: Booking): number {
  const s = toMinutes(b.start_time);
  let e = toMinutes(b.end_time);
  if (e <= s) e += 24 * 60;
  return (e - s) / 60;
}

function dowIndex(date: string): number {
  // 0 = Monday … 6 = Sunday
  return (new Date(date + "T00:00:00").getDay() + 6) % 7;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function isRefunded(b: Booking): boolean {
  return b.booking_status === "CANCELLED" || b.booking_status === "REFUNDED";
}

type Metrics = {
  gross: number;
  net: number;
  refundAmount: number;
  totalBookings: number;
  activeCustomers: number;
  avgValue: number;
  avgDuration: number;
  occupancy: number;
  bookedHours: number;
  approvedTopups: number;
};

function computeMetrics(
  bookings: Booking[],
  topups: WalletTopup[],
  days: number,
  courtCount: number
): Metrics {
  let gross = 0;
  let net = 0;
  let refundAmount = 0;
  let realized = 0;
  let durSum = 0;
  let bookedHours = 0;
  const users = new Set<string>();

  for (const b of bookings) {
    const amt = Number(b.amount);
    const dur = durationHours(b);
    gross += amt;
    durSum += dur;
    if (isRefunded(b)) {
      refundAmount += amt;
    } else {
      net += amt;
      realized += 1;
      bookedHours += dur;
    }
    if (b.user_id) users.add(b.user_id);
  }

  const capacity = Math.max(1, courtCount) * OPEN_HOURS * Math.max(1, days);
  const approvedTopups = topups
    .filter((t) => t.status === "APPROVED")
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    gross,
    net,
    refundAmount,
    totalBookings: bookings.length,
    activeCustomers: users.size,
    avgValue: realized ? net / realized : 0,
    avgDuration: bookings.length ? durSum / bookings.length : 0,
    occupancy: capacity ? (bookedHours / capacity) * 100 : 0,
    bookedHours,
    approvedTopups,
  };
}

function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

function bucketFor(
  date: string,
  g: Granularity
): { key: string; label: string } {
  const d = new Date(date + "T00:00:00");
  if (g === "daily") return { key: date, label: `${d.getMonth() + 1}/${d.getDate()}` };
  if (g === "weekly") {
    const diff = (d.getDay() + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diff);
    return { key: localISO(mon), label: `${mon.getMonth() + 1}/${mon.getDate()}` };
  }
  if (g === "monthly") {
    const key = date.slice(0, 7);
    const mth = d.toLocaleString("en-US", { month: "short" });
    return { key, label: `${mth} ${date.slice(2, 4)}` };
  }
  return { key: date.slice(0, 4), label: date.slice(0, 4) };
}

/* ------------------------------ export helpers ---------------------------- */

function toCSV(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function toExcelHTML(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "<table></table>";
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`)
    .join("");
  return `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------- KPI card --------------------------------- */

function ComparisonBadge({
  cur,
  prev,
  invert = false,
}: {
  cur: number;
  prev: number;
  invert?: boolean;
}) {
  const pc = pctChange(cur, prev);
  if (pc === null)
    return <span className="text-[11px] text-white/40">no prior data</span>;
  const up = pc >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        good ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pc).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  cur,
  prev,
  invert,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  cur?: number;
  prev?: number;
  invert?: boolean;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/60">{label}</p>
        <div className="rounded-xl bg-secondary/10 p-2">
          <Icon className="h-5 w-5 text-secondary" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {cur !== undefined && prev !== undefined && (
          <ComparisonBadge cur={cur} prev={prev} invert={invert} />
        )}
        {hint && <span className="text-xs text-white/50">{hint}</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function ReportsClient({
  bookings,
  topups,
  courts,
  businessName,
  currency,
}: {
  bookings: Booking[];
  topups: WalletTopup[];
  courts: Court[];
  businessName: string;
  currency: string;
}) {
  const today = todayISO();
  const [period, setPeriod] = useState<Period>("all");
  const [userId, setUserId] = useState<string>("all");
  const [courtId, setCourtId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [customFrom, setCustomFrom] = useState<string>(today);
  const [customTo, setCustomTo] = useState<string>(today);

  const fmtMoney = (n: number) => formatCurrency(n, currency);
  const fmtMoneyShort = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return `${Math.round(n)}`;
  };

  const customers = useMemo(() => {
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

  const range = useMemo(() => {
    if (period === "custom") {
      const start = customFrom <= customTo ? customFrom : customTo;
      const end = customFrom <= customTo ? customTo : customFrom;
      return { start, end };
    }
    return periodRange(period, today);
  }, [period, today, customFrom, customTo]);

  const prevRange = useMemo(() => previousRange(range), [range]);

  const matchesFilters = useMemo(
    () => (b: Booking, r: { start: string; end: string } | null) => {
      if (userId !== "all" && b.user_id !== userId) return false;
      if (courtId !== "all" && b.court_id !== courtId) return false;
      if (statusFilter !== "all" && b.booking_status !== statusFilter) return false;
      if (r && (b.booking_date < r.start || b.booking_date > r.end)) return false;
      return true;
    },
    [userId, courtId, statusFilter]
  );

  const filteredBookings = useMemo(
    () => bookings.filter((b) => matchesFilters(b, range)),
    [bookings, matchesFilters, range]
  );

  const prevBookings = useMemo(
    () => (prevRange ? bookings.filter((b) => matchesFilters(b, prevRange)) : []),
    [bookings, matchesFilters, prevRange]
  );

  const filteredTopups = useMemo(
    () =>
      topups.filter((t) => {
        if (userId !== "all" && t.user_id !== userId) return false;
        const day = t.created_at.slice(0, 10);
        if (range && (day < range.start || day > range.end)) return false;
        return true;
      }),
    [topups, userId, range]
  );

  const prevTopups = useMemo(
    () =>
      prevRange
        ? topups.filter((t) => {
            if (userId !== "all" && t.user_id !== userId) return false;
            const day = t.created_at.slice(0, 10);
            return day >= prevRange.start && day <= prevRange.end;
          })
        : [],
    [topups, userId, prevRange]
  );

  const effectiveCourtCount = courtId === "all" ? Math.max(1, courts.length) : 1;

  const days = useMemo(() => {
    if (range) return daysBetween(range.start, range.end);
    const dates = filteredBookings.map((b) => b.booking_date).sort();
    if (dates.length === 0) return 1;
    return daysBetween(dates[0], dates[dates.length - 1]);
  }, [range, filteredBookings]);

  const prevDays = useMemo(
    () => (prevRange ? daysBetween(prevRange.start, prevRange.end) : days),
    [prevRange, days]
  );

  const metrics = useMemo(
    () => computeMetrics(filteredBookings, filteredTopups, days, effectiveCourtCount),
    [filteredBookings, filteredTopups, days, effectiveCourtCount]
  );
  const prevMetrics = useMemo(
    () => computeMetrics(prevBookings, prevTopups, prevDays, effectiveCourtCount),
    [prevBookings, prevTopups, prevDays, effectiveCourtCount]
  );

  /* ---------------------------- trend datasets ---------------------------- */

  const trend = useMemo(() => {
    const map = new Map<string, { label: string; revenue: number; count: number }>();
    for (const b of filteredBookings) {
      const { key, label } = bucketFor(b.booking_date, granularity);
      const e = map.get(key) ?? { label, revenue: 0, count: 0 };
      e.count += 1;
      if (!isRefunded(b)) e.revenue += Number(b.amount);
      map.set(key, e);
    }
    const sorted = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-60)
      .map(([, v]) => v);
    return {
      labels: sorted.map((v) => v.label),
      revenue: sorted.map((v) => Math.round(v.revenue)),
      counts: sorted.map((v) => v.count),
    };
  }, [filteredBookings, granularity]);

  /* --------------------------- revenue by court --------------------------- */

  const courtRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of filteredBookings) {
      if (isRefunded(b)) continue;
      const name = b.courts?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + Number(b.amount));
    }
    return Array.from(map.entries())
      .map(([label, value], i) => ({
        label,
        value,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBookings]);

  /* ------------------------- booking status mix --------------------------- */

  const statusMix = useMemo(() => {
    const counts: Record<string, number> = {
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };
    filteredBookings.forEach((b) => {
      counts[b.booking_status] = (counts[b.booking_status] ?? 0) + 1;
    });
    const colors: Record<string, string> = {
      CONFIRMED: "rgb(52 211 153)",
      COMPLETED: "rgb(56 189 248)",
      CANCELLED: "rgb(148 163 184)",
      REFUNDED: "rgb(251 191 36)",
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value, color: colors[label] }));
  }, [filteredBookings]);

  /* ---------------------------- court occupancy --------------------------- */

  const occupancyByCourt = useMemo(() => {
    const hours = new Map<string, number>();
    for (const b of filteredBookings) {
      if (isRefunded(b)) continue;
      const name = b.courts?.name ?? "Unknown";
      hours.set(name, (hours.get(name) ?? 0) + durationHours(b));
    }
    const capacity = OPEN_HOURS * days;
    const list = courts
      .filter((c) => courtId === "all" || c.id === courtId)
      .map((c) => ({
        name: c.name,
        pct: capacity ? ((hours.get(c.name) ?? 0) / capacity) * 100 : 0,
        booked: hours.get(c.name) ?? 0,
      }));
    for (const [name, h] of hours) {
      if (!list.some((l) => l.name === name)) {
        list.push({ name, pct: capacity ? (h / capacity) * 100 : 0, booked: h });
      }
    }
    return list.sort((a, b) => b.pct - a.pct);
  }, [filteredBookings, courts, courtId, days]);

  /* ------------------------------- heatmap -------------------------------- */

  const heatmap = useMemo(() => {
    const cols = Array.from({ length: OPEN_HOURS }, (_, i) => {
      const h = OPEN + i;
      const suffix = h >= 12 ? "p" : "a";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}${suffix}`;
    });
    const values = DOW.map(() => cols.map(() => 0));
    for (const b of filteredBookings) {
      const dw = dowIndex(b.booking_date);
      const h = Number(b.start_time.slice(0, 2));
      const ci = h - OPEN;
      if (ci >= 0 && ci < OPEN_HOURS) values[dw][ci] += 1;
    }
    return { cols, values };
  }, [filteredBookings]);

  /* ---------------------------- top customers ----------------------------- */

  const topCustomers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; hours: number; spend: number }
    >();
    for (const b of filteredBookings) {
      if (!b.user_id) continue;
      const name = b.users?.full_name || b.users?.email || "Unknown";
      const e = map.get(b.user_id) ?? { name, count: 0, hours: 0, spend: 0 };
      e.count += 1;
      e.hours += durationHours(b);
      if (!isRefunded(b)) e.spend += Number(b.amount);
      map.set(b.user_id, e);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.spend - a.spend)
      .slice(0, 8);
  }, [filteredBookings]);

  /* -------------------------- customer analytics -------------------------- */

  const customerAnalytics = useMemo(() => {
    const firstBooking = new Map<string, string>();
    for (const b of bookings) {
      if (!b.user_id) continue;
      if (userId !== "all" && b.user_id !== userId) continue;
      const cur = firstBooking.get(b.user_id);
      if (!cur || b.booking_date < cur) firstBooking.set(b.user_id, b.booking_date);
    }
    const activeSet = new Set(
      filteredBookings.map((b) => b.user_id).filter(Boolean) as string[]
    );
    let newC = 0;
    let returning = 0;
    for (const uid of activeSet) {
      const first = firstBooking.get(uid);
      if (!range) {
        const count = filteredBookings.filter((b) => b.user_id === uid).length;
        if (count > 1) returning += 1;
        else newC += 1;
      } else if (first && first >= range.start && first <= range.end) {
        newC += 1;
      } else {
        returning += 1;
      }
    }
    const active = activeSet.size;
    return {
      total: firstBooking.size,
      active,
      newCustomers: newC,
      returning,
      retention: active ? (returning / active) * 100 : 0,
    };
  }, [bookings, filteredBookings, userId, range]);

  /* --------------------- cancellation & refund analytics ------------------ */

  const cancelRefund = useMemo(() => {
    const cancelled = filteredBookings.filter((b) => b.booking_status === "CANCELLED");
    const refunded = filteredBookings.filter((b) => b.booking_status === "REFUNDED");
    const total = filteredBookings.length;
    const amount =
      cancelled.reduce((s, b) => s + Number(b.amount), 0) +
      refunded.reduce((s, b) => s + Number(b.amount), 0);
    return {
      cancelledCount: cancelled.length,
      refundedCount: refunded.length,
      amount,
      rate: total ? ((cancelled.length + refunded.length) / total) * 100 : 0,
    };
  }, [filteredBookings]);

  /* ---------------------------- topup analytics --------------------------- */

  const topupAnalytics = useMemo(() => {
    const approved = filteredTopups.filter((t) => t.status === "APPROVED");
    const pending = filteredTopups.filter((t) => t.status === "PENDING");
    const rejected = filteredTopups.filter((t) => t.status === "REJECTED");
    const sum = (arr: WalletTopup[]) => arr.reduce((s, t) => s + Number(t.amount), 0);
    const decided = approved.length + rejected.length;
    return {
      total: sum(approved),
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      successRate: decided ? (approved.length / decided) * 100 : 0,
      mix: [
        { label: "Approved", value: approved.length, color: "rgb(52 211 153)" },
        { label: "Pending", value: pending.length, color: "rgb(251 191 36)" },
        { label: "Rejected", value: rejected.length, color: "rgb(248 113 113)" },
      ].filter((d) => d.value > 0),
    };
  }, [filteredTopups]);

  /* ----------------------------- report summary --------------------------- */

  const summary = useMemo(() => {
    const dayCounts = DOW.map(() => 0);
    const hourCounts = new Map<number, number>();
    let playingHours = 0;
    for (const b of filteredBookings) {
      dayCounts[dowIndex(b.booking_date)] += 1;
      const h = Number(b.start_time.slice(0, 2));
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      if (!isRefunded(b)) playingHours += durationHours(b);
    }
    const busiestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const peak = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      topCourt: courtRevenue[0],
      busiestDay: filteredBookings.length ? DOW[busiestDayIdx] : "—",
      peakHour: peak ? formatTime(`${String(peak[0]).padStart(2, "0")}:00`) : "—",
      topCustomer: topCustomers[0],
      playingHours,
      avgPerDay: filteredBookings.length / days,
    };
  }, [filteredBookings, courtRevenue, topCustomers, days]);

  /* -------------------------------- exports ------------------------------- */

  const bookingRows = () =>
    filteredBookings.map((b) => ({
      code: b.booking_code,
      customer: b.users?.full_name ?? b.users?.email ?? "",
      court: b.courts?.name ?? "",
      date: b.booking_date,
      start: b.start_time,
      end: b.end_time,
      hours: durationHours(b).toFixed(1),
      amount: b.amount,
      status: b.booking_status,
    }));

  function exportCSV() {
    downloadBlob(`bookings-${today}.csv`, toCSV(bookingRows()), "text/csv;charset=utf-8;");
  }
  function exportExcel() {
    downloadBlob(
      `bookings-${today}.xls`,
      toExcelHTML(bookingRows()),
      "application/vnd.ms-excel"
    );
  }
  function exportTopupsCSV() {
    const rows = filteredTopups.map((t) => ({
      customer: t.users?.full_name ?? t.users?.email ?? "",
      amount: t.amount,
      status: t.status,
      date: t.created_at,
    }));
    downloadBlob(`topups-${today}.csv`, toCSV(rows), "text/csv;charset=utf-8;");
  }
  function printReport() {
    window.print();
  }

  const rangeLabel = range ? `${range.start} → ${range.end}` : "All time";

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={printReport}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" variant="gold" onClick={printReport}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input">
          <option value="all">All customers</option>
          {customers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input">
          <option value="all">All courts</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="all">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        {period === "custom" ? (
          <div className="flex gap-2">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="input"
            />
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              className="input"
            />
          </div>
        ) : (
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/50">
            {rangeLabel}
          </div>
        )}
      </div>

      {/* Printable report area */}
      <div className="print-area space-y-6">
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">{businessName} — Business Report</h1>
          <p className="text-sm">Period: {rangeLabel}</p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Total revenue"
            value={fmtMoney(metrics.net)}
            icon={DollarSign}
            cur={metrics.net}
            prev={prevMetrics.net}
          />
          <KpiCard
            label="Gross revenue"
            value={fmtMoney(metrics.gross)}
            icon={TrendingUp}
            cur={metrics.gross}
            prev={prevMetrics.gross}
          />
          <KpiCard
            label="Net revenue"
            value={fmtMoney(metrics.net)}
            icon={Wallet}
            cur={metrics.net}
            prev={prevMetrics.net}
            hint="after refunds"
          />
          <KpiCard
            label="Total bookings"
            value={String(metrics.totalBookings)}
            icon={CalendarCheck}
            cur={metrics.totalBookings}
            prev={prevMetrics.totalBookings}
          />
          <KpiCard
            label="Active customers"
            value={String(metrics.activeCustomers)}
            icon={Users}
            cur={metrics.activeCustomers}
            prev={prevMetrics.activeCustomers}
          />
          <KpiCard
            label="Avg. booking value"
            value={fmtMoney(metrics.avgValue)}
            icon={DollarSign}
            cur={metrics.avgValue}
            prev={prevMetrics.avgValue}
          />
          <KpiCard
            label="Avg. duration"
            value={`${metrics.avgDuration.toFixed(1)} h`}
            icon={Timer}
            cur={metrics.avgDuration}
            prev={prevMetrics.avgDuration}
          />
          <KpiCard
            label="Refund amount"
            value={fmtMoney(metrics.refundAmount)}
            icon={RotateCcw}
            cur={metrics.refundAmount}
            prev={prevMetrics.refundAmount}
            invert
          />
          <KpiCard
            label="Court occupancy"
            value={`${metrics.occupancy.toFixed(1)}%`}
            icon={Percent}
            cur={metrics.occupancy}
            prev={prevMetrics.occupancy}
          />
        </div>

        {/* Report summary */}
        <Card>
          <CardHeader
            title="Report summary"
            subtitle="Automatically generated insights for the selected period."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryItem
              icon={Trophy}
              label="Highest earning court"
              value={summary.topCourt ? summary.topCourt.label : "—"}
              hint={summary.topCourt ? fmtMoney(summary.topCourt.value) : undefined}
            />
            <SummaryItem
              icon={CalendarDays}
              label="Busiest day"
              value={summary.busiestDay}
            />
            <SummaryItem icon={Clock} label="Peak booking hour" value={summary.peakHour} />
            <SummaryItem
              icon={UserPlus}
              label="Most active customer"
              value={summary.topCustomer ? summary.topCustomer.name : "—"}
              hint={
                summary.topCustomer ? `${summary.topCustomer.count} bookings` : undefined
              }
            />
            <SummaryItem
              icon={Timer}
              label="Total playing hours"
              value={`${summary.playingHours.toFixed(1)} h`}
            />
            <SummaryItem
              icon={Activity}
              label="Avg. bookings / day"
              value={summary.avgPerDay.toFixed(1)}
            />
          </div>
        </Card>

        {/* Trends */}
        <Card>
          <CardHeader
            title="Revenue & booking trend"
            subtitle="Track performance over time."
            action={
              <div className="no-print flex gap-1 rounded-full bg-white/5 p-1">
                {(["daily", "weekly", "monthly", "yearly"] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition",
                      granularity === g
                        ? "bg-secondary text-black"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            }
          />
          {trend.labels.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/50">
              No data for this period.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-white/50">Revenue trend</p>
                <LineChart
                  labels={trend.labels}
                  series={[
                    { name: "Revenue", color: CHART_COLORS[0], points: trend.revenue },
                  ]}
                  formatValue={fmtMoneyShort}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-white/50">Booking trend</p>
                <LineChart
                  labels={trend.labels}
                  series={[
                    { name: "Bookings", color: CHART_COLORS[2], points: trend.counts },
                  ]}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Revenue by court + status mix */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Revenue by court" subtitle="Total earnings per court." />
            {courtRevenue.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/50">No revenue yet.</p>
            ) : (
              <BarChart data={courtRevenue} formatValue={fmtMoneyShort} />
            )}
          </Card>
          <Card>
            <CardHeader
              title="Booking status mix"
              subtitle="Distribution of bookings by status."
            />
            <DoughnutChart data={statusMix} centerLabel="Bookings" />
          </Card>
        </div>

        {/* Court occupancy + customer analytics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Court occupancy"
              subtitle={`Utilization vs. ${OPEN_HOURS}h/day capacity over ${days} day${
                days === 1 ? "" : "s"
              }.`}
            />
            <div className="space-y-3">
              {occupancyByCourt.length === 0 && (
                <p className="text-sm text-white/50">No data yet.</p>
              )}
              {occupancyByCourt.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{c.name}</span>
                    <span className="text-white">
                      {c.pct.toFixed(1)}%
                      <span className="ml-1 text-xs text-white/40">
                        {c.booked.toFixed(1)}h
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-light to-secondary"
                      style={{ width: `${Math.min(100, c.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Customer analytics"
              subtitle="Acquisition and retention overview."
            />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Total customers" value={customerAnalytics.total} />
              <MiniStat label="Active (period)" value={customerAnalytics.active} />
              <MiniStat label="New customers" value={customerAnalytics.newCustomers} />
              <MiniStat label="Returning" value={customerAnalytics.returning} />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Retention rate</span>
                <span className="font-semibold text-white">
                  {customerAnalytics.retention.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-secondary"
                  style={{ width: `${Math.min(100, customerAnalytics.retention)}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader
            title="Booking heatmap"
            subtitle="Busiest hours by day of week — darker means more bookings."
          />
          <Heatmap
            rows={DOW}
            cols={heatmap.cols}
            values={heatmap.values}
            formatCell={(r, c, v) => `${r} • ${c} — ${v} booking${v === 1 ? "" : "s"}`}
          />
        </Card>

        {/* Top customers */}
        <Card>
          <CardHeader title="Top customers" subtitle="Ranked by number of bookings." />
          {topCustomers.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/50">No customers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 text-right font-medium">Bookings</th>
                    <th className="p-3 text-right font-medium">Hours</th>
                    <th className="p-3 text-right font-medium">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={c.name + i} className="border-b border-white/5">
                      <td className="p-3 text-white/40">{i + 1}</td>
                      <td className="p-3 font-medium text-white">{c.name}</td>
                      <td className="p-3 text-right text-white/70">{c.count}</td>
                      <td className="p-3 text-right text-white/70">{c.hours.toFixed(1)}</td>
                      <td className="p-3 text-right font-semibold gold-text">
                        {fmtMoney(c.spend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Cancellation/refund + topup analytics */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Cancellation & refund analytics"
              subtitle="Lost and returned revenue."
            />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Cancelled" value={cancelRefund.cancelledCount} />
              <MiniStat label="Refunded" value={cancelRefund.refundedCount} />
              <MiniStat label="Refund amount" value={fmtMoney(cancelRefund.amount)} />
              <MiniStat label="Refund rate" value={`${cancelRefund.rate.toFixed(1)}%`} />
            </div>
            <p className="mt-4 text-xs text-white/40">
              Cancellation reasons are not currently captured. Add a reason field
              on cancellations to break this down further.
            </p>
          </Card>

          <Card>
            <CardHeader title="Top-up analytics" subtitle="Wallet funding activity." />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Total approved" value={fmtMoney(topupAnalytics.total)} />
              <MiniStat label="Pending" value={topupAnalytics.pendingCount} />
              <MiniStat label="Approved" value={topupAnalytics.approvedCount} />
              <MiniStat label="Rejected" value={topupAnalytics.rejectedCount} />
              <MiniStat
                label="Success rate"
                value={`${topupAnalytics.successRate.toFixed(1)}%`}
              />
              <MiniStat
                label="Pending amount"
                value={fmtMoney(topupAnalytics.pendingAmount)}
              />
            </div>
            {topupAnalytics.mix.length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <DoughnutChart data={topupAnalytics.mix} centerLabel="Top-ups" />
              </div>
            )}
            <div className="no-print mt-4 flex justify-end">
              <Button size="sm" variant="outline" onClick={exportTopupsCSV}>
                <Download className="h-4 w-4" /> Export top-ups
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- small presentationals ------------------------ */

function SummaryItem({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="rounded-lg bg-secondary/10 p-2">
        <Icon className="h-4 w-4 text-secondary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/50">{label}</p>
        <p className="truncate font-semibold text-white">{value}</p>
        {hint && <p className="text-xs text-white/40">{hint}</p>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
    </div>
  );
}
