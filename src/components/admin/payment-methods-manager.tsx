"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Wallet, Smartphone, Landmark, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { paymentMethodRepository } from "@/lib/repositories/payment-method.repository";
import { cn, getErrorMessage } from "@/lib/utils";
import type { PaymentMethod, PaymentMethodType } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUpload } from "@/components/admin/image-upload";

const ICONS: Record<PaymentMethodType, React.ComponentType<{ className?: string }>> = {
  GCASH: Smartphone,
  MAYA: Smartphone,
  BANK: Landmark,
  INSTAPAY: QrCode,
};

function MethodCard({ method }: { method: PaymentMethod }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState(method);
  const [busy, setBusy] = useState(false);
  const Icon = ICONS[method.type] ?? Wallet;

  async function save() {
    setBusy(true);
    try {
      await paymentMethodRepository.update(supabase, method.id, {
        label: form.label,
        account_name: form.account_name,
        account_number: form.account_number,
        instructions: form.instructions,
        qr_image: form.qr_image,
        active: form.active,
      });
      toast.success(`${form.label} saved`);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-secondary/15 p-2.5">
            <Icon className="h-5 w-5 text-secondary" />
          </span>
          <div>
            <p className="font-display font-semibold text-white">{form.label}</p>
            <p className="text-xs text-white/40">{method.type}</p>
          </div>
        </div>
        <button
          onClick={() => setForm({ ...form, active: !form.active })}
          className={cn(
            "badge",
            form.active
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
          )}
        >
          {form.active ? "Active" : "Off"}
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <ImageUpload
          bucket="branding"
          label="QR code"
          value={form.qr_image}
          onUploaded={(url) => setForm({ ...form, qr_image: url })}
        />
        <div className="flex-1 space-y-3">
          <Input
            label="Display label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Input
            label="Account name"
            value={form.account_name ?? ""}
            onChange={(e) => setForm({ ...form, account_name: e.target.value })}
          />
          <Input
            label={form.type === "BANK" ? "Account number" : "Mobile / account number"}
            value={form.account_number ?? ""}
            onChange={(e) =>
              setForm({ ...form, account_number: e.target.value })
            }
          />
        </div>
      </div>
      <Textarea
        label="Instructions (optional)"
        placeholder="e.g. Send to the number above, then upload your receipt."
        value={form.instructions ?? ""}
        onChange={(e) => setForm({ ...form, instructions: e.target.value })}
      />
      <Button variant="gold" onClick={save} loading={busy}>
        Save {form.label}
      </Button>
    </Card>
  );
}

export function PaymentMethodsManager({
  methods,
}: {
  methods: PaymentMethod[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {methods.map((m) => (
        <MethodCard key={m.id} method={m} />
      ))}
    </div>
  );
}
