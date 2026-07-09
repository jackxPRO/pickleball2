"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { getErrorMessage } from "@/lib/utils";
import type { PaymentSettings } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUpload } from "@/components/admin/image-upload";

export function PaymentSettingsForm({
  payment,
}: {
  payment: PaymentSettings | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    account_name: payment?.account_name ?? "",
    account_number: payment?.account_number ?? "",
    instructions: payment?.instructions ?? "",
    qr_image: payment?.qr_image ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!payment) {
      toast.error("Payment settings row missing. Run the seed migration.");
      return;
    }
    setBusy(true);
    try {
      await settingsRepository.updatePaymentSettings(supabase, payment.id, form);
      toast.success("Saved");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-xl space-y-4">
      <ImageUpload
        bucket="branding"
        label="InstaPay QR code"
        value={form.qr_image}
        onUploaded={(url) => setForm({ ...form, qr_image: url })}
      />
      <Input
        label="Account name"
        value={form.account_name}
        onChange={(e) => setForm({ ...form, account_name: e.target.value })}
      />
      <Input
        label="Account number"
        value={form.account_number}
        onChange={(e) => setForm({ ...form, account_number: e.target.value })}
      />
      <Textarea
        label="Instructions"
        value={form.instructions}
        onChange={(e) => setForm({ ...form, instructions: e.target.value })}
      />
      <Button variant="gold" onClick={save} loading={busy}>
        Save settings
      </Button>
    </Card>
  );
}
