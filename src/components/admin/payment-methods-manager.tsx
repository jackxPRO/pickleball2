"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Wallet, Smartphone, Landmark, QrCode, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { paymentMethodRepository } from "@/lib/repositories/payment-method.repository";
import { cn, getErrorMessage } from "@/lib/utils";
import type { PaymentMethod, PaymentMethodType } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ImageUpload } from "@/components/admin/image-upload";

const METHOD_TYPES: PaymentMethodType[] = ["GCASH", "MAYA", "BANK", "INSTAPAY"];

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
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  async function remove() {
    setDeleting(true);
    try {
      await paymentMethodRepository.remove(supabase, method.id);
      toast.success(`${form.label} deleted`);
      setConfirmOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(false);
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
      <div className="flex gap-3">
        <Button
          variant="gold"
          onClick={save}
          loading={busy}
          className="flex-1"
        >
          Save {form.label}
        </Button>
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          loading={deleting}
          aria-label={`Delete ${form.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete payment method"
      >
        <div className="space-y-5">
          <p className="text-sm text-white/70">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">{form.label}</span>? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function PaymentMethodsManager({
  methods,
}: {
  methods: PaymentMethod[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    type: "GCASH" as PaymentMethodType,
    label: "",
    account_name: "",
    account_number: "",
    instructions: "",
    qr_image: null as string | null,
  });

  function reset() {
    setForm({
      type: "GCASH",
      label: "",
      account_name: "",
      account_number: "",
      instructions: "",
      qr_image: null,
    });
  }

  async function create() {
    if (!form.label.trim()) {
      toast.error("Display label is required");
      return;
    }
    if (!form.type.trim()) {
      toast.error("Type is required");
      return;
    }
    setBusy(true);
    try {
      await paymentMethodRepository.create(supabase, {
        type: form.type.trim(),
        label: form.label.trim(),
        account_name: form.account_name || null,
        account_number: form.account_number || null,
        instructions: form.instructions || null,
        qr_image: form.qr_image,
        active: true,
        display_order: methods.length,
      });
      toast.success(`${form.label} added`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="gold" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add payment method
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {methods.map((m) => (
          <MethodCard key={m.id} method={m} />
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add payment method"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Type</label>
            <input
              list="payment-method-types"
              value={form.type}
              placeholder="e.g. GCASH, PayPal, Coins.ph"
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-secondary/60"
            />
            <datalist id="payment-method-types">
              {METHOD_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="text-xs text-white/40">
              Pick a preset or type your own name.
            </p>
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
                value={form.account_name}
                onChange={(e) =>
                  setForm({ ...form, account_name: e.target.value })
                }
              />
              <Input
                label={
                  form.type === "BANK"
                    ? "Account number"
                    : "Mobile / account number"
                }
                value={form.account_number}
                onChange={(e) =>
                  setForm({ ...form, account_number: e.target.value })
                }
              />
            </div>
          </div>
          <Textarea
            label="Instructions (optional)"
            placeholder="e.g. Send to the number above, then upload your receipt."
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" onClick={create} loading={busy}>
              Add method
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
