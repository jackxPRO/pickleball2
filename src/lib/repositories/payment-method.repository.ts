import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@/types/database";

export const paymentMethodRepository = {
  async list(
    supabase: SupabaseClient,
    activeOnly = false
  ): Promise<PaymentMethod[]> {
    let query = supabase
      .from("payment_methods")
      .select("*")
      .order("display_order", { ascending: true });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as PaymentMethod[];
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    patch: Partial<PaymentMethod>
  ): Promise<PaymentMethod> {
    const { data, error } = await supabase
      .from("payment_methods")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as PaymentMethod;
  },
};
