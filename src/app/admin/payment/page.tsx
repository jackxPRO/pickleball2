import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { paymentMethodRepository } from "@/lib/repositories/payment-method.repository";
import { PaymentMethodsManager } from "@/components/admin/payment-methods-manager";

export default async function AdminPaymentPage() {
  await requireAdmin();
  const supabase = await createClient();
  const methods = await paymentMethodRepository.list(supabase).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Payment settings
        </h1>
        <p className="text-white/60">
          Configure the payment methods customers use to top up their wallet.
        </p>
      </div>
      {methods.length === 0 ? (
        <div className="card p-8 text-center text-white/70">
          No payment methods found. Run migration{" "}
          <code className="text-secondary">0007_payments_and_danger.sql</code> in
          the Supabase SQL Editor to create them.
        </div>
      ) : (
        <PaymentMethodsManager methods={methods} />
      )}
    </div>
  );
}
