"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  getErrorMessage,
} from "@/lib/utils";
import { BOOKING_STATUS_STYLES } from "@/lib/constants";
import type { Booking, BookingStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

const STATUSES: (BookingStatus | "ALL")[] = [
  "ALL",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export function BookingsManager({
  bookings,
  currency,
}: {
  bookings: Booking[];
  currency: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [refund, setRefund] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    const matchStatus = status === "ALL" || b.booking_status === status;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.booking_code.toLowerCase().includes(q) ||
      b.users?.full_name?.toLowerCase().includes(q) ||
      b.users?.email?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  async function complete(id: string) {
    setBusy(id);
    try {
      await bookingRepository.setStatus(supabase, id, "COMPLETED");
      toast.success("Marked as completed");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: string) {
    setBusy(id);
    try {
      await bookingRepository.cancel(supabase, id);
      toast.success("Booking cancelled & refunded");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function doRefund() {
    if (!refund) return;
    setBusy(refund.id);
    try {
      const amt = refundAmount ? Number(refundAmount) : undefined;
      await bookingRepository.refund(supabase, refund.id, amt);
      toast.success("Refund processed");
      setRefund(null);
      setRefundAmount("");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                status === s
                  ? "bg-secondary text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or customer..."
            className="input pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Court</th>
                <th className="p-4 font-medium">Schedule</th>
                <th className="p-4 text-right font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-white/5">
                  <td className="p-4 font-mono text-xs text-white/50">
                    {b.booking_code}
                  </td>
                  <td className="p-4 text-white">
                    {b.users?.full_name || b.users?.email}
                  </td>
                  <td className="p-4 text-white/70">{b.courts?.name}</td>
                  <td className="p-4 text-white/70">
                    {formatDate(b.booking_date)}
                    <span className="block text-xs text-white/40">
                      {formatTime(b.start_time)}–{formatTime(b.end_time)}
                    </span>
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatCurrency(b.amount, currency)}
                  </td>
                  <td className="p-4">
                    <Badge className={BOOKING_STATUS_STYLES[b.booking_status]}>
                      {b.booking_status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      {b.booking_status === "CONFIRMED" && (
                        <>
                          <button
                            title="Complete"
                            disabled={busy === b.id}
                            onClick={() => complete(b.id)}
                            className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            title="Cancel & refund"
                            disabled={busy === b.id}
                            onClick={() => cancel(b.id)}
                            className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {b.booking_status !== "REFUNDED" &&
                        b.booking_status !== "CANCELLED" && (
                          <button
                            title="Refund"
                            disabled={busy === b.id}
                            onClick={() => {
                              setRefund(b);
                              setRefundAmount("");
                            }}
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
        </Card>
      )}

      <Modal
        open={!!refund}
        onClose={() => setRefund(null)}
        title="Refund booking"
      >
        {refund && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Booking <span className="font-mono">{refund.booking_code}</span> —
              total {formatCurrency(refund.amount, currency)}. Leave blank for a
              full refund, or enter a partial amount.
            </p>
            <Input
              type="number"
              label="Refund amount"
              placeholder={`Full: ${refund.amount}`}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRefund(null)}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                loading={busy === refund.id}
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
