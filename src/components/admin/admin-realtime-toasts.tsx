"use client";

/**
 * Live admin toast notifications.
 *
 * Subscribes to Supabase Realtime changes on the `bookings` and `wallet_topups`
 * tables (admins can read both via RLS) and surfaces a toast for each relevant
 * event: new bookings, cancellations, refunds, top-up requests (payment
 * received) and top-up approvals / rejections.
 *
 * Requires realtime to be enabled for those tables — see
 * supabase/migrations/0016_admin_realtime.sql.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking, WalletTopup, Court } from "@/types/database";

export function AdminRealtimeToasts({
  courts,
  currency,
}: {
  courts: Pick<Court, "id" | "name">[];
  currency: string;
}) {
  const router = useRouter();
  const courtNames = useRef(new Map(courts.map((c) => [c.id, c.name])));
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookingCount = useRef(0);
  const bookingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBookingInfo = useRef<string>("");

  useEffect(() => {
    courtNames.current = new Map(courts.map((c) => [c.id, c.name]));
  }, [courts]);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 1500);
    };

    const money = (v: number) => formatCurrency(Number(v), currency);

    const channel = supabase
      .channel("admin-live-events")
      // New booking(s) — create_booking inserts one row per slot, so debounce.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const b = payload.new as Booking;
          bookingCount.current += 1;
          lastBookingInfo.current = `${
            courtNames.current.get(b.court_id) ?? "Court"
          } · ${formatDate(b.booking_date)}`;
          if (bookingTimer.current) clearTimeout(bookingTimer.current);
          bookingTimer.current = setTimeout(() => {
            const n = bookingCount.current;
            bookingCount.current = 0;
            toast(
              n > 1 ? `${n} new bookings received` : `New booking · ${lastBookingInfo.current}`,
              { icon: "📅", duration: 5000 }
            );
          }, 900);
          scheduleRefresh();
        }
      )
      // Booking status changes — cancellations & refunds.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        (payload) => {
          const b = payload.new as Booking;
          if (b.booking_status === "CANCELLED") {
            toast(`Booking cancelled · ${b.booking_code}`, { icon: "❌", duration: 5000 });
            scheduleRefresh();
          } else if (b.booking_status === "REFUNDED") {
            toast(`Refund issued · ${b.booking_code} · ${money(b.amount)}`, {
              icon: "↩️",
              duration: 5000,
            });
            scheduleRefresh();
          }
        }
      )
      // Top-up requested — customer paid & uploaded a receipt (payment received).
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_topups" },
        (payload) => {
          const t = payload.new as WalletTopup;
          toast(`Payment received · Top-up ${money(t.amount)} awaiting approval`, {
            icon: "💰",
            duration: 6000,
          });
          scheduleRefresh();
        }
      )
      // Top-up decisions — approved / rejected.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallet_topups" },
        (payload) => {
          const t = payload.new as WalletTopup;
          if (t.status === "APPROVED") {
            toast.success(`Top-up approved · ${money(t.amount)}`, { duration: 5000 });
            scheduleRefresh();
          } else if (t.status === "REJECTED") {
            toast.error(`Top-up rejected · ${money(t.amount)}`, { duration: 5000 });
            scheduleRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (bookingTimer.current) clearTimeout(bookingTimer.current);
    };
    // currency is stable per session; courts handled via ref effect above.
  }, [router, currency]);

  return null;
}
