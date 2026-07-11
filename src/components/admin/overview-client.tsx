"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CalendarCheck,
  Clock,
  Wallet,
  Activity,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Eye,
  RotateCcw,
  Printer,
  GripVertical,
  Settings2,
  RefreshCw,
  LayoutGrid,
  FileText,
  Bell,
  Wrench,
  CircleDot,
  CalendarDays,
  Users as UsersIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  getErrorMessage,
  timeAgo,
  todayISO,
} from "@/lib/utils";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import type { Booking, Court, AppNotification } from "@/types/database";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LineChart, DoughnutChart, CHART_COLORS } from "@/components/admin/charts";

type Granularity = "daily" | "weekly" | "monthly" | "yearly";
type WidgetId =
  | "revenue"
  | "courts"
  | "status"
  | "schedule"
  | "actions"
  | "notifications"
  | "recent";

const LS_KEY = "admin-overview-layout-v1";

const DEFAULT_ORDER: WidgetId[] = [
  "revenue",
  "courts",
  "status",
  "schedule",
  "actions",
  "notifications",
  "recent",
];

const WIDGET_META: Record<WidgetId, { title: string; wide: boolean }> = {
  revenue: { title: "Revenue trend", wide: true },
  courts: { title: "Court status", wide: false },
  status: { title: "Booking status breakdown", wide: false },
  schedule: { title: "Today's schedule", wide: false },
  actions: { title: "Quick actions", wide: false },
  notifications: { title: "Notifications", wide: false },
  recent: { title: "Recent bookings", wide: true },
};

/* -------------------------------- helpers --------------------------------- */

function localISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
function mondayOf(d: Date): Date {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function endMinutes(t: string): number {
  const m = toMinutes(t);
  return m === 0 ? 24 * 60 : m;
}
function isRealized(b: Booking): boolean {
  return b.booking_status !== "CANCELLED" && b.booking_status !== "REFUNDED";
}
function moneyShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

/* --------------------------------- KPI card ------------------------------- */

function Trend({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev) return <span className="text-[11px] text-white/40">no prior data</span>;
  const pc = ((cur - prev) / prev) * 100;
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
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  cur?: number;
  prev?: number;
  invert?: boolean;
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
      {cur !== undefined && prev !== undefined && (
        <div className="mt-1.5">
          <Trend cur={cur} prev={prev} invert={invert} />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function AdminOverviewClient({
  bookings,
  courts,
  notifications,
  pendingTopups,
  businessName,
  currency,
}: {
  bookings: Booking[];
  courts: Court[];
  notifications: AppNotification[];
  pendingTopups: number;
  businessName: string;
  currency: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = todayISO();

  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<Set<WidgetId>>(new Set());
  const [customizing, setCustomizing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");
  const [viewing, setViewing] = useState<Booking | null>(null);
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const dragId = useRef<WidgetId | null>(null);

  useEffect(() => setUpdatedAt(new Date()), []);

  // Load saved layout.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { order?: WidgetId[]; hidden?: WidgetId[] };
        if (parsed.order) {
          const valid = parsed.order.filter((id) => DEFAULT_ORDER.includes(id));
          const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
          setOrder([...valid, ...missing]);
        }
        if (parsed.hidden) {
          setHidden(new Set(parsed.hidden.filter((id) => DEFAULT_ORDER.includes(id))));
        }
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Persist layout.
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(LS_KEY, JSON.stringify({ order, hidden: [...hidden] }));
  }, [order, hidden, loaded]);

  /* ------------------------------ derived data --------------------------- */

  const todaysBookings = useMemo(
    () => bookings.filter((b) => b.booking_date === today),
    [bookings, today]
  );
  const upcoming = useMemo(
    () => bookings.filter((b) => b.booking_date >= today && b.booking_status === "CONFIRMED"),
    [bookings, today]
  );

  const revenueBetween = useMemo(
    () => (start: string, end: string) =>
      bookings
        .filter((b) => isRealized(b) && b.booking_date >= start && b.booking_date <= end)
        .reduce((s, b) => s + Number(b.amount), 0),
    [bookings]
  );
  const countBetween = useMemo(
    () => (start: string, end: string) =>
      bookings.filter((b) => b.booking_date >= start && b.booking_date <= end).length,
    [bookings]
  );

  const kpis = useMemo(() => {
    const now = new Date();
    const yISO = localISO(new Date(now.getTime() - 86400000));
    const thisWeekStart = localISO(mondayOf(now));
    const lastWeekStart = localISO(new Date(mondayOf(now).getTime() - 7 * 86400000));
    const lastWeekEnd = localISO(new Date(mondayOf(now).getTime() - 86400000));
    const thisMonthStart = localISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthStart = localISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = localISO(new Date(now.getFullYear(), now.getMonth(), 0));

    return {
      todayCount: todaysBookings.length,
      yesterdayCount: countBetween(yISO, yISO),
      dailyRevenue: revenueBetween(today, today),
      yesterdayRevenue: revenueBetween(yISO, yISO),
      weeklyRevenue: revenueBetween(thisWeekStart, today),
      lastWeekRevenue: revenueBetween(lastWeekStart, lastWeekEnd),
      monthlyRevenue: revenueBetween(thisMonthStart, today),
      lastMonthRevenue: revenueBetween(lastMonthStart, lastMonthEnd),
    };
  }, [todaysBookings, countBetween, revenueBetween, today]);

  const trend = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string }[] = [];
    if (granularity === "daily") {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        buckets.push({ key: localISO(d), label: `${d.getMonth() + 1}/${d.getDate()}` });
      }
    } else if (granularity === "weekly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(mondayOf(now).getTime() - i * 7 * 86400000);
        buckets.push({ key: localISO(d), label: `${d.getMonth() + 1}/${d.getDate()}` });
      }
    } else if (granularity === "monthly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          label: d.toLocaleString("en-US", { month: "short" }),
        });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        buckets.push({ key: String(y), label: String(y) });
      }
    }

    const keyFor = (date: string): string => {
      if (granularity === "daily") return date;
      if (granularity === "weekly") return localISO(mondayOf(new Date(date + "T00:00:00")));
      if (granularity === "monthly") return date.slice(0, 7);
      return date.slice(0, 4);
    };

    const map = new Map<string, number>();
    for (const b of bookings) {
      if (!isRealized(b)) continue;
      const k = keyFor(b.booking_date);
      map.set(k, (map.get(k) ?? 0) + Number(b.amount));
    }
    const values = buckets.map((bk) => Math.round(map.get(bk.key) ?? 0));
    const cur = values[values.length - 1] ?? 0;
    const prev = values[values.length - 2] ?? 0;
    return { labels: buckets.map((b) => b.label), values, cur, prev };
  }, [bookings, granularity]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };
    bookings.forEach((b) => {
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
  }, [bookings]);

  const courtStatuses = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return courts.map((c) => {
      if (c.status === "MAINTENANCE" || c.status === "DISABLED") {
        return { court: c, state: "Maintenance" as const, current: null, next: null };
      }
      const list = todaysBookings
        .filter((b) => b.court_id === c.id && isRealized(b))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const current = list.find(
        (b) => toMinutes(b.start_time) <= nowMin && nowMin < endMinutes(b.end_time)
      );
      const next = list.find((b) => toMinutes(b.start_time) > nowMin);
      const state = current ? "Occupied" : next ? "Reserved" : "Available";
      return { court: c, state: state as "Occupied" | "Reserved" | "Available", current, next };
    });
  }, [courts, todaysBookings]);

  const todaySchedule = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return todaysBookings
      .filter((b) => isRealized(b) && endMinutes(b.end_time) >= nowMin)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, 8);
  }, [todaysBookings]);

  const recentFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.booking_status !== statusFilter) return false;
      if (courtFilter !== "all" && b.court_id !== courtFilter) return false;
      if (
        q &&
        !b.booking_code.toLowerCase().includes(q) &&
        !b.users?.full_name?.toLowerCase().includes(q) &&
        !b.users?.email?.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [bookings, search, statusFilter, courtFilter]);

  /* ------------------------------- actions ------------------------------- */

  function refresh() {
    router.refresh();
    setUpdatedAt(new Date());
    toast.success("Dashboard refreshed");
  }

  async function doRefund() {
    if (!refundTarget) return;
    setBusy(refundTarget.id);
    try {
      const amt = refundAmount ? Number(refundAmount) : undefined;
      await bookingRepository.refund(supabase, refundTarget.id, amt);
      toast.success("Refund processed");
      setRefundTarget(null);
      setRefundAmount("");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function printReceipt(b: Booking) {
    const w = window.open("", "_blank", "width=380,height=560");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${b.booking_code}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .muted{color:#666;font-size:12px}
        hr{border:none;border-top:1px dashed #ccc;margin:16px 0}
        .row{display:flex;justify-content:space-between;font-size:13px;margin:6px 0}
        .total{font-weight:700;font-size:16px}
        .code{font-family:monospace}
      </style></head><body>
      <h1>${businessName}</h1>
      <p class="muted">Booking receipt</p>
      <hr/>
      <div class="row"><span>Code</span><span class="code">${b.booking_code}</span></div>
      <div class="row"><span>Customer</span><span>${b.users?.full_name ?? b.users?.email ?? "—"}</span></div>
      <div class="row"><span>Court</span><span>${b.courts?.name ?? "—"}</span></div>
      <div class="row"><span>Date</span><span>${formatDate(b.booking_date)}</span></div>
      <div class="row"><span>Time</span><span>${formatTime(b.start_time)} – ${formatTime(b.end_time)}</span></div>
      <div class="row"><span>Status</span><span>${b.booking_status}</span></div>
      <hr/>
      <div class="row total"><span>Total</span><span>${formatCurrency(Number(b.amount), currency)}</span></div>
      <hr/>
      <p class="muted">Thank you for playing with us!</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  /* ---------------------------- drag and drop ---------------------------- */

  function onDragStart(id: WidgetId) {
    dragId.current = id;
  }
  function onDragEnter(id: WidgetId) {
    const from = dragId.current;
    if (!from || from === id) return;
    setOrder((prev) => {
      const arr = [...prev];
      const fi = arr.indexOf(from);
      const ti = arr.indexOf(id);
      if (fi < 0 || ti < 0) return prev;
      arr.splice(fi, 1);
      arr.splice(ti, 0, from);
      return arr;
    });
  }
  function onDragEnd() {
    dragId.current = null;
  }
  function toggleHidden(id: WidgetId) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function resetLayout() {
    setOrder(DEFAULT_ORDER);
    setHidden(new Set());
  }

  const statusStyles: Record<string, string> = {
    Available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    Reserved: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    Occupied: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    Maintenance: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  /* ------------------------------ widgets -------------------------------- */

  function renderWidget(id: WidgetId): React.ReactNode {
    switch (id) {
      case "revenue":
        return (
          <Card>
            <CardHeader
              title="Revenue trend"
              subtitle="Compared to the previous period."
              action={
                <div className="flex items-center gap-3">
                  <Trend cur={trend.cur} prev={trend.prev} />
                  <div className="flex gap-1 rounded-full bg-white/5 p-1">
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
                </div>
              }
            />
            <LineChart
              labels={trend.labels}
              series={[{ name: "Revenue", color: CHART_COLORS[0], points: trend.values }]}
              formatValue={moneyShort}
            />
          </Card>
        );

      case "courts":
        return (
          <Card>
            <CardHeader title="Court status" subtitle="Live availability." />
            <div className="space-y-2">
              {courtStatuses.length === 0 && (
                <p className="text-sm text-white/50">No courts configured.</p>
              )}
              {courtStatuses.map(({ court, state, current, next }) => (
                <div
                  key={court.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{court.name}</p>
                    <p className="truncate text-xs text-white/50">
                      {state === "Occupied" && current
                        ? `Now: ${formatTime(current.start_time)}–${formatTime(current.end_time)}`
                        : next
                        ? `Next: ${formatTime(next.start_time)}`
                        : state === "Maintenance"
                        ? "Temporarily unavailable"
                        : "No bookings today"}
                    </p>
                  </div>
                  <Badge className={statusStyles[state]}>{state}</Badge>
                </div>
              ))}
            </div>
          </Card>
        );

      case "status":
        return (
          <Card>
            <CardHeader title="Booking status" subtitle="All-time distribution." />
            {statusBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/50">No bookings yet.</p>
            ) : (
              <DoughnutChart data={statusBreakdown} centerLabel="Bookings" />
            )}
          </Card>
        );

      case "schedule":
        return (
          <Card>
            <CardHeader title="Today's schedule" subtitle={formatDate(today)} />
            {todaySchedule.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/50">
                No upcoming bookings today.
              </p>
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="rounded-lg bg-secondary/10 px-2 py-1 text-center">
                      <p className="text-xs font-semibold text-secondary">
                        {formatTime(b.start_time)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {b.users?.full_name || b.users?.email}
                      </p>
                      <p className="truncate text-xs text-white/50">{b.courts?.name}</p>
                    </div>
                    <Badge className={BOOKING_STATUS_STYLES[b.booking_status]}>
                      {b.booking_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );

      case "actions":
        return (
          <Card>
            <CardHeader title="Quick actions" subtitle="Jump to common tasks." />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/admin/bookings" icon={CalendarCheck} label="Manage bookings" />
              <QuickAction
                href="/admin/topups"
                icon={Wallet}
                label="Approve top-ups"
                badge={pendingTopups > 0 ? pendingTopups : undefined}
              />
              <QuickAction href="/admin/calendar" icon={CalendarDays} label="View calendar" />
              <QuickAction href="/admin/courts" icon={LayoutGrid} label="Manage courts" />
              <QuickAction href="/admin/users" icon={UsersIcon} label="Manage customers" />
              <QuickAction href="/admin/reports" icon={FileText} label="Generate report" />
            </div>
          </Card>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader
              title="Notifications"
              subtitle="Recent activity."
              action={
                pendingTopups > 0 ? (
                  <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                    {pendingTopups} pending
                  </Badge>
                ) : undefined
              }
            />
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/50">No notifications.</p>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </div>
            )}
          </Card>
        );

      case "recent":
        return (
          <Card>
            <CardHeader
              title="Recent bookings"
              action={
                <Link
                  href="/admin/bookings"
                  className="text-xs text-secondary hover:underline"
                >
                  View all
                </Link>
              }
            />
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code or customer..."
                  className="input pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input sm:w-40"
              >
                <option value="all">All statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
              <select
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                className="input sm:w-40"
              >
                <option value="all">All courts</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {recentFiltered.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/50">No bookings found.</p>
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
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFiltered.slice(0, 10).map((b) => (
                      <tr key={b.id} className="border-b border-white/5">
                        <td className="py-3 font-mono text-xs text-white/50">
                          {b.booking_code}
                        </td>
                        <td className="py-3 text-white">
                          {b.users?.full_name || b.users?.email}
                        </td>
                        <td className="py-3 text-white/70">{b.courts?.name}</td>
                        <td className="py-3 text-white/70">{formatDate(b.booking_date)}</td>
                        <td className="py-3 text-right text-white">
                          {formatCurrency(Number(b.amount), currency)}
                        </td>
                        <td className="py-3">
                          <Badge className={BOOKING_STATUS_STYLES[b.booking_status]}>
                            {b.booking_status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              title="Quick view"
                              onClick={() => setViewing(b)}
                              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Print receipt"
                              onClick={() => printReceipt(b)}
                              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {b.booking_status !== "REFUNDED" &&
                              b.booking_status !== "CANCELLED" && (
                                <button
                                  title="Quick refund"
                                  onClick={() => setRefundTarget(b)}
                                  className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
    }
  }

  const visibleOrder = order.filter((id) => !hidden.has(id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Admin overview</h1>
          <p className="text-white/60">
            Real-time operations
            {updatedAt && (
              <span className="ml-2 text-xs text-white/40">
                · Last updated {updatedAt.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            variant={customizing ? "gold" : "outline"}
            onClick={() => setCustomizing((v) => !v)}
          >
            <Settings2 className="h-4 w-4" /> {customizing ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      {/* Customize panel */}
      {customizing && (
        <Card className="border-dashed">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-white/70">Widgets:</span>
            {DEFAULT_ORDER.map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70"
              >
                <input
                  type="checkbox"
                  checked={!hidden.has(id)}
                  onChange={() => toggleHidden(id)}
                  className="accent-secondary"
                />
                {WIDGET_META[id].title}
              </label>
            ))}
            <button
              onClick={resetLayout}
              className="ml-auto text-xs text-secondary hover:underline"
            >
              Reset layout
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Drag widgets by their handle to rearrange. Your layout is saved automatically.
          </p>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Today's bookings"
          value={kpis.todayCount}
          icon={CalendarCheck}
          cur={kpis.todayCount}
          prev={kpis.yesterdayCount}
        />
        <KpiCard label="Upcoming" value={upcoming.length} icon={Clock} />
        <KpiCard
          label="Pending top-ups"
          value={pendingTopups}
          icon={Wallet}
          invert
        />
        <KpiCard label="Total bookings" value={bookings.length} icon={Activity} />
        <KpiCard
          label="Daily revenue"
          value={formatCurrency(kpis.dailyRevenue, currency)}
          icon={DollarSign}
          cur={kpis.dailyRevenue}
          prev={kpis.yesterdayRevenue}
        />
        <KpiCard
          label="Weekly revenue"
          value={formatCurrency(kpis.weeklyRevenue, currency)}
          icon={TrendingUp}
          cur={kpis.weeklyRevenue}
          prev={kpis.lastWeekRevenue}
        />
        <KpiCard
          label="Monthly revenue"
          value={formatCurrency(kpis.monthlyRevenue, currency)}
          icon={TrendingUp}
          cur={kpis.monthlyRevenue}
          prev={kpis.lastMonthRevenue}
        />
        <KpiCard
          label="Total revenue"
          value={formatCurrency(revenueBetween("0000-01-01", "9999-12-31"), currency)}
          icon={DollarSign}
        />
      </div>

      {/* Widgets */}
      {visibleOrder.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/50">
          All widgets are hidden. Enable them from the Customize panel.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {visibleOrder.map((id) => (
            <div
              key={id}
              draggable={customizing}
              onDragStart={() => onDragStart(id)}
              onDragEnter={() => onDragEnter(id)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => customizing && e.preventDefault()}
              className={cn(
                WIDGET_META[id].wide && "lg:col-span-2",
                customizing && "rounded-2xl ring-1 ring-dashed ring-white/20"
              )}
            >
              {customizing && (
                <div className="mb-2 flex cursor-move items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60">
                  <GripVertical className="h-4 w-4" />
                  {WIDGET_META[id].title}
                </div>
              )}
              {renderWidget(id)}
            </div>
          ))}
        </div>
      )}

      {/* Quick view modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Booking details">
        {viewing && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Code" value={viewing.booking_code} mono />
            <DetailRow
              label="Customer"
              value={viewing.users?.full_name || viewing.users?.email || "—"}
            />
            <DetailRow label="Court" value={viewing.courts?.name || "—"} />
            <DetailRow label="Date" value={formatDate(viewing.booking_date)} />
            <DetailRow
              label="Time"
              value={`${formatTime(viewing.start_time)} – ${formatTime(viewing.end_time)}`}
            />
            <DetailRow label="Amount" value={formatCurrency(Number(viewing.amount), currency)} />
            <div className="flex items-center justify-between">
              <span className="text-white/50">Status</span>
              <Badge className={BOOKING_STATUS_STYLES[viewing.booking_status]}>
                {viewing.booking_status}
              </Badge>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => printReceipt(viewing)}
              >
                <Printer className="h-4 w-4" /> Print receipt
              </Button>
              {viewing.booking_status !== "REFUNDED" &&
                viewing.booking_status !== "CANCELLED" && (
                  <Button
                    variant="gold"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setRefundTarget(viewing);
                      setViewing(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Refund
                  </Button>
                )}
            </div>
          </div>
        )}
      </Modal>

      {/* Refund modal */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Refund booking"
      >
        {refundTarget && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Refund{" "}
              <span className="font-semibold text-white">{refundTarget.booking_code}</span> —{" "}
              {refundTarget.users?.full_name || refundTarget.users?.email}. Full amount is{" "}
              <span className="font-semibold gold-text">
                {formatCurrency(Number(refundTarget.amount), currency)}
              </span>
              .
            </p>
            <input
              type="number"
              placeholder={`Leave blank for full refund (${refundTarget.amount})`}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="input"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRefundTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                loading={busy === refundTarget.id}
                onClick={doRefund}
              >
                Process refund
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* --------------------------- small presentationals ------------------------ */

function QuickAction({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs font-medium text-white/80 transition hover:border-secondary/40 hover:bg-secondary/10 hover:text-white"
    >
      {badge !== undefined && (
        <span className="absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-300">
          {badge}
        </span>
      )}
      <Icon className="h-5 w-5 text-secondary" />
      {label}
    </Link>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className={cn("text-white", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const map: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    BOOKING: { icon: CalendarCheck, color: "text-emerald-400" },
    TOPUP: { icon: Wallet, color: "text-amber-400" },
    REFUND: { icon: RotateCcw, color: "text-sky-400" },
    ANNOUNCEMENT: { icon: Bell, color: "text-violet-400" },
    MAINTENANCE: { icon: Wrench, color: "text-red-400" },
  };
  const meta = map[n.type] ?? { icon: CircleDot, color: "text-white/50" };
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          {n.title}
          {!n.is_read && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
          )}
        </p>
        {n.body && <p className="truncate text-xs text-white/50">{n.body}</p>}
      </div>
      <span className="shrink-0 text-[11px] text-white/40">{timeAgo(n.created_at)}</span>
    </div>
  );
}
