"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { CalendarX, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  getErrorMessage,
  todayISO,
} from "@/lib/utils";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import type { Booking } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

const TABS = ["Upcoming", "Past", "All"] as const;

export function BookingsList({
  bookings,
  currency,
}: {
  bookings: Booking[];
  currency: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const today = todayISO();

  // Cancellation policy: max 3 per day, none within 1 hour of start.
  const MAX_CANCELLATIONS = 3;
  const todayStr = new Date().toDateString();
  const cancelledCount = bookings.filter(
    (b) =>
      b.booking_status === "CANCELLED" &&
      new Date(b.updated_at).toDateString() === todayStr
  ).length;
  const remaining = Math.max(0, MAX_CANCELLATIONS - cancelledCount);

  const hoursUntil = (b: Booking) =>
    (new Date(`${b.booking_date}T${b.start_time}`).getTime() - Date.now()) /
    3_600_000;

  const filtered = bookings.filter((b) => {
    if (tab === "Upcoming")
      return b.booking_date >= today && b.booking_status === "CONFIRMED";
    if (tab === "Past")
      return b.booking_date < today || b.booking_status !== "CONFIRMED";
    return true;
  });

  async function confirmCancel() {
    if (!cancelId) return;
    setLoading(true);
    try {
      await bookingRepository.cancel(supabase, cancelId);
      toast.success("Booking cancelled and refunded.");
      setCancelId(null);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                tab === t
                  ? "bg-secondary text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/50">
          Cancellations left today:{" "}
          <span
            className={cn(
              "font-semibold",
              remaining === 0 ? "text-red-400" : "text-secondary"
            )}
          >
            {remaining}/{MAX_CANCELLATIONS}
          </span>
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No bookings here"
          description="Your reservations will appear here."
          action={
            <Link href="/dashboard/book" className="btn-gold">
              Book a court
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((b) => {
            const isConfirmedUpcoming =
              b.booking_status === "CONFIRMED" && b.booking_date >= today;
            const tooLate = hoursUntil(b) <= 1;
            const limitReached = remaining === 0;
            const canCancel = isConfirmedUpcoming && !tooLate && !limitReached;
            const blockedReason = !isConfirmedUpcoming
              ? null
              : tooLate
              ? "Can't cancel within 1 hour of start"
              : limitReached
              ? "Daily cancel limit reached (3/3)"
              : null;
            return (
              <Card key={b.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs text-white/40">
                      {b.booking_code}
                    </p>
                    <h3 className="mt-1 font-display font-semibold text-white">
                      {b.courts?.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      {formatDate(b.booking_date)}
                    </p>
                    <p className="text-sm text-white/60">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </p>
                  </div>
                  <Badge className={BOOKING_STATUS_STYLES[b.booking_status]}>
                    {b.booking_status}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-semibold text-white">
                    {formatCurrency(b.amount, currency)}
                  </span>
                  {canCancel ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCancelId(b.id)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    blockedReason && (
                      <span className="text-right text-xs text-white/40">
                        {blockedReason}
                      </span>
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel booking?"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-red-500/10 p-3">
            <CalendarX className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-sm text-white/70">
            This will cancel your booking and refund the full amount back to your
            wallet.
          </p>
          <div className="mt-3 flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCancelId(null)}
            >
              Keep it
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={loading}
              onClick={confirmCancel}
            >
              Cancel booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
