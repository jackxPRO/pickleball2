"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, CalendarDays, Check, Loader2, Lock, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { courtRepository } from "@/lib/repositories/court.repository";
import {
  buildHourlySlots,
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  getErrorMessage,
  todayISO,
} from "@/lib/utils";
import type { Court, PricingRule } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Effective (discounted) hourly rate for a pricing rule. */
function ruleEffectiveRate(r: PricingRule) {
  const disc = Number(r.discount_pct ?? 0);
  return Number(r.rate) * (1 - disc / 100);
}

/** Whether a pricing rule's optional date window includes the given date. */
function ruleMatchesDate(r: PricingRule, date: string) {
  if (r.start_date && date < r.start_date) return false;
  if (r.end_date && date > r.end_date) return false;
  return true;
}

/** Client-side rate estimate mirroring the DB resolve_rate function. */
function estimateRate(
  pricing: PricingRule[],
  slot: string,
  base: number,
  date: string
) {
  const candidates = pricing.filter(
    (p) =>
      p.active !== false &&
      p.start_time &&
      p.end_time &&
      slot >= p.start_time &&
      slot < p.end_time &&
      ruleMatchesDate(p, date)
  );
  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const aDated = a.start_date || a.end_date ? 1 : 0;
      const bDated = b.start_date || b.end_date ? 1 : 0;
      if (aDated !== bDated) return bDated - aDated; // scheduled promos win
      return ruleEffectiveRate(a) - ruleEffectiveRate(b); // cheapest for user
    });
    return ruleEffectiveRate(candidates[0]);
  }
  const hour = Number(slot.split(":")[0]);
  return hour >= 16 ? 200 : base || 150;
}

export function BookingClient({
  courts,
  pricing,
  walletBalance,
  currency,
  openHour,
  closeHour,
}: {
  courts: Court[];
  pricing: PricingRule[];
  walletBalance: number;
  currency: string;
  openHour: number;
  closeHour: number;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [date, setDate] = useState(todayISO());
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allSlots = useMemo(
    () => buildHourlySlots(openHour, closeHour),
    [openHour, closeHour]
  );
  const court = courts.find((c) => c.id === courtId);

  // Active promotional pricing rules, surfaced to the customer.
  const promos = useMemo(
    () => pricing.filter((p) => p.rule_type === "PROMO" && p.active !== false),
    [pricing]
  );

  // Keep a ref of the current selection so background refreshes can prune
  // slots that were just booked by someone else without stale closures.
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const refreshBooked = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!courtId || !date) return;
      if (!opts?.silent) setLoadingSlots(true);
      try {
        const rows = await courtRepository.bookedSlots(supabase, courtId, date);
        const nextBooked = new Set(rows.map((r) => r.start_time.slice(0, 5)));
        setBooked(nextBooked);

        // Drop any selected slot that another customer just booked.
        const stolen = [...selectedRef.current].filter((s) =>
          nextBooked.has(s)
        );
        if (stolen.length > 0) {
          setSelected((prev) => {
            const next = new Set(prev);
            stolen.forEach((s) => next.delete(s));
            return next;
          });
          toast.error("A slot you selected was just booked by someone else.");
        }
      } catch {
        if (!opts?.silent) setBooked(new Set());
      } finally {
        if (!opts?.silent) setLoadingSlots(false);
      }
    },
    [courtId, date, supabase]
  );

  // Reset selection and reload when the court or date changes.
  useEffect(() => {
    setSelected(new Set());
    refreshBooked();
  }, [courtId, date, refreshBooked]);

  // Keep availability fresh: poll periodically and on window focus/visibility,
  // so slots booked by others become locked without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => refreshBooked({ silent: true }), 15_000);
    const onFocus = () => refreshBooked({ silent: true });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshBooked]);

  const total = useMemo(() => {
    let sum = 0;
    selected.forEach(
      (s) => (sum += estimateRate(pricing, `${s}:00`, court?.hourly_rate ?? 150, date))
    );
    return sum;
  }, [selected, pricing, court, date]);

  const remaining = walletBalance - total;
  const insufficient = total > walletBalance;

  function toggle(slot: string) {
    if (booked.has(slot)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slot) ? next.delete(slot) : next.add(slot);
      return next;
    });
  }

  async function handleBook() {
    if (selected.size === 0) {
      toast.error("Select at least one time slot");
      return;
    }
    setSubmitting(true);
    try {
      const slots = Array.from(selected)
        .sort()
        .map((s) => `${s}:00`);
      await bookingRepository.create(supabase, courtId, date, slots);
      toast.success("Booking confirmed!");
      router.push("/dashboard/bookings");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const isPastToday = (slot: string) => {
    if (date !== todayISO()) return false;
    const now = new Date();
    return Number(slot.split(":")[0]) <= now.getHours();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {promos.length > 0 && (
          <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4">
            <div className="flex items-center gap-2 text-secondary">
              <Tag className="h-4 w-4" />
              <h3 className="font-display text-sm font-semibold">
                Active promotions
              </h3>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {promos.map((p) => {
                const appliesToday = ruleMatchesDate(p, date);
                const effective = ruleEffectiveRate(p);
                const discounted =
                  p.discount_pct != null && Number(p.discount_pct) > 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-xl border p-3",
                      appliesToday
                        ? "border-secondary/50 bg-white/10"
                        : "border-white/10 bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      {discounted ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-black">
                          -{Number(p.discount_pct)}%
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                      <span>
                        {p.start_time && p.end_time
                          ? `${formatTime(p.start_time)} – ${formatTime(
                              p.end_time
                            )}`
                          : "All day"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {discounted && (
                          <span className="text-white/40 line-through">
                            {formatCurrency(Number(p.rate), currency)}
                          </span>
                        )}
                        <span className="font-semibold text-secondary">
                          {formatCurrency(effective, currency)}/hr
                        </span>
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/40">
                      {p.start_date
                        ? `${formatDate(p.start_date)}${
                            p.end_date && p.end_date !== p.start_date
                              ? ` – ${formatDate(p.end_date)}`
                              : ""
                          }`
                        : "Every day"}
                      {appliesToday && (
                        <span className="ml-1 font-semibold text-secondary">
                          · applies to selected date
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Card>
          <label className="label">Select date</label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input pl-10 [color-scheme:dark]"
            />
          </div>

          <label className="label mt-4">Select court</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {courts.map((c) => (
              <button
                key={c.id}
                onClick={() => setCourtId(c.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-medium transition",
                  courtId === c.id
                    ? "border-secondary bg-secondary/15 text-secondary"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white">Time slots</h3>
            <div className="flex gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-secondary" /> Selected
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-white/10" /> Available
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-500/30" /> Booked
              </span>
            </div>
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-10 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {allSlots.map((slot) => {
                const isTaken = booked.has(slot);
                const isPast = isPastToday(slot);
                const isBooked = isTaken || isPast;
                const isSelected = selected.has(slot);
                return (
                  <button
                    key={slot}
                    disabled={isBooked}
                    onClick={() => toggle(slot)}
                    title={
                      isTaken
                        ? "Already booked"
                        : isPast
                        ? "Time has passed"
                        : undefined
                    }
                    aria-label={`${formatTime(`${slot}:00`)}${
                      isTaken ? " — already booked" : ""
                    }`}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-sm font-medium transition",
                      isTaken &&
                        "cursor-not-allowed border-red-500/30 bg-red-500/10 text-red-300/60 line-through",
                      isPast &&
                        !isTaken &&
                        "cursor-not-allowed border-white/5 bg-white/5 text-white/25",
                      !isBooked &&
                        !isSelected &&
                        "border-white/10 bg-white/5 text-white/80 hover:border-secondary/50 hover:bg-white/10",
                      isSelected && "border-secondary bg-secondary text-black"
                    )}
                  >
                    {isTaken && (
                      <Lock className="absolute right-1 top-1 h-3 w-3 text-red-300/70" />
                    )}
                    {formatTime(`${slot}:00`)}
                    {isTaken && (
                      <span className="text-[10px] font-normal">Booked</span>
                    )}
                    {isSelected && (
                      <Check className="absolute right-1 top-1 h-3 w-3" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Summary */}
      <div>
        <Card className="lg:sticky lg:top-6">
          <h3 className="font-display font-semibold text-white">Summary</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/60">Court</dt>
              <dd className="text-white">{court?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">Slots</dt>
              <dd className="text-white">{selected.size}</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3">
              <dt className="text-white/60">Wallet balance</dt>
              <dd className="text-white">{formatCurrency(walletBalance, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">Booking cost</dt>
              <dd className="font-semibold text-white">
                {formatCurrency(total, currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">Remaining</dt>
              <dd
                className={cn(
                  "font-semibold",
                  insufficient ? "text-red-400" : "text-emerald-400"
                )}
              >
                {formatCurrency(remaining, currency)}
              </dd>
            </div>
          </dl>

          {insufficient ? (
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Insufficient wallet balance.
              </div>
              <Link href="/dashboard/wallet" className="btn-gold w-full">
                Top Up Wallet
              </Link>
              <button
                onClick={() => setSelected(new Set())}
                className="btn-outline w-full"
              >
                Cancel
              </button>
            </div>
          ) : (
            <Button
              variant="gold"
              className="mt-5 w-full"
              loading={submitting}
              disabled={selected.size === 0}
              onClick={handleBook}
            >
              Confirm booking · {formatCurrency(total, currency)}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
