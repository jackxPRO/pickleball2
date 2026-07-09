"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, Loader2, Eye, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { TOPUP_PRESETS } from "@/lib/constants";
import { cn, formatCurrency, getErrorMessage } from "@/lib/utils";
import type { PaymentMethod } from "@/types/database";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function TopupClient({
  methods = [],
  currency,
}: {
  methods?: PaymentMethod[];
  currency: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [methodId, setMethodId] = useState<string>(methods[0]?.id ?? "");
  const [showPreview, setShowPreview] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;
  const method = methods.find((m) => m.id === methodId);

  // Local object URL so the user can preview the receipt they selected.
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleSubmit() {
    if (!finalAmount || finalAmount < 50) {
      toast.error("Minimum top-up is ₱50");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let receiptUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        receiptUrl = path;
      }

      await walletRepository.requestTopup(
        supabase,
        finalAmount,
        receiptUrl,
        method?.label ?? null
      );
      toast.success("Top-up submitted! Awaiting approval.");
      setFile(null);
      setCustom("");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Top up wallet"
        subtitle="Choose a payment method, pay, then upload your receipt."
      />

      <div className="grid grid-cols-2 gap-2">
        {TOPUP_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setAmount(p);
              setCustom("");
            }}
            className={cn(
              "rounded-xl border px-3 py-3 text-sm font-semibold transition",
              !custom && amount === p
                ? "border-secondary bg-secondary/15 text-secondary"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {formatCurrency(p, currency)}
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="Custom amount"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="input mt-3"
      />

      {methods.length > 0 && (
        <>
          <p className="label mt-4">Payment method</p>
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethodId(m.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  methodId === m.id
                    ? "border-secondary bg-secondary text-black"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}

      {method && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          {method.qr_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={method.qr_image}
              alt={`${method.label} QR`}
              className="mx-auto mb-3 h-40 w-40 rounded-lg object-contain"
            />
          )}
          {method.account_name && (
            <p className="text-white/60">
              Account name:{" "}
              <span className="font-medium text-white">
                {method.account_name}
              </span>
            </p>
          )}
          {method.account_number && (
            <p className="text-white/60">
              Account no.:{" "}
              <span className="font-medium text-white">
                {method.account_number}
              </span>
            </p>
          )}
          {method.instructions && (
            <p className="mt-2 text-xs text-white/50">{method.instructions}</p>
          )}
          {!method.account_number && !method.qr_image && (
            <p className="text-xs text-amber-300/80">
              This method isn&apos;t configured yet. Please choose another.
            </p>
          )}
        </div>
      )}

      <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-5 text-center text-sm text-white/60 hover:bg-white/10">
        <Upload className="h-6 w-6 text-secondary" />
        {file ? file.name : "Upload payment receipt"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {previewUrl && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs text-white/50">
            Preview — make sure your receipt is clear and readable.
          </p>
          <div className="relative w-fit">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="group relative block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="h-32 w-32 rounded-lg border border-white/10 object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-white/0 transition group-hover:bg-black/40 group-hover:text-white">
                <Eye className="h-5 w-5" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="absolute -right-2 -top-2 rounded-full bg-black/80 p-1 text-white/80 hover:text-white"
              aria-label="Remove receipt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <Button
        variant="gold"
        className="mt-4 w-full"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit {formatCurrency(finalAmount || 0, currency)}
      </Button>

      {/* Full-size receipt preview */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Receipt preview"
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Receipt preview"
            className="w-full rounded-xl object-contain"
          />
        )}
      </Modal>
    </Card>
  );
}
