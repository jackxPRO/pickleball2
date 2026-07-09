"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X, Receipt, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { cn, formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { TOPUP_STATUS_STYLES } from "@/lib/constants";
import type { WalletTopup } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";

const TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

export function TopupsManager({
  topups,
  currency,
}: {
  topups: WalletTopup[];
  currency: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<(typeof TABS)[number]>("PENDING");
  const [active, setActive] = useState<WalletTopup | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const filtered = topups.filter((t) => tab === "ALL" || t.status === tab);

  async function handle(action: "approve" | "reject") {
    if (!active) return;
    setLoading(action);
    try {
      if (action === "approve")
        await walletRepository.approveTopup(supabase, active.id, remarks);
      else await walletRepository.rejectTopup(supabase, active.id, remarks);
      toast.success(`Top-up ${action === "approve" ? "approved" : "rejected"}`);
      setActive(null);
      setRemarks("");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition",
              tab === t
                ? "bg-secondary text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No top-ups" description="Nothing to review here." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xl font-bold gold-text">
                    {formatCurrency(t.amount, currency)}
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {t.users?.full_name || t.users?.email}
                  </p>
                  <p className="text-xs text-white/50">{t.users?.phone}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {formatDate(t.created_at, true)}
                  </p>
                </div>
                <Badge className={TOPUP_STATUS_STYLES[t.status]}>{t.status}</Badge>
              </div>

              <div className="mt-4 flex gap-2">
                {t.receipt_image && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreview(t.receipt_image)}
                  >
                    <Eye className="h-4 w-4" /> Receipt
                  </Button>
                )}
                {t.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="gold"
                    className="flex-1"
                    onClick={() => setActive(t)}
                  >
                    Review
                  </Button>
                )}
              </div>
              {t.remarks && (
                <p className="mt-3 rounded-lg bg-white/5 p-2 text-xs text-white/50">
                  {t.remarks}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Review modal */}
      <Modal
        open={!!active}
        onClose={() => {
          setActive(null);
          setRemarks("");
        }}
        title="Review top-up"
      >
        {active && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-display text-2xl font-bold gold-text">
                {formatCurrency(active.amount, currency)}
              </p>
              <p className="text-sm text-white">
                {active.users?.full_name || active.users?.email}
              </p>
            </div>
            {active.receipt_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.receipt_image}
                alt="Receipt"
                className="max-h-64 w-full rounded-xl object-contain"
              />
            )}
            <Textarea
              label="Remarks (optional)"
              placeholder="Add a note..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                variant="danger"
                className="flex-1"
                loading={loading === "reject"}
                onClick={() => handle("reject")}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                loading={loading === "approve"}
                onClick={() => handle("approve")}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Receipt">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Receipt" className="w-full rounded-xl object-contain" />
        )}
      </Modal>
    </div>
  );
}
