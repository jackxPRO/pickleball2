import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WebsiteSettings,
  PaymentSettings,
} from "@/types/database";

/**
 * Repository for CMS / settings tables. Both tables are singletons (one row).
 */
export const settingsRepository = {
  async getWebsiteSettings(
    supabase: SupabaseClient
  ): Promise<WebsiteSettings | null> {
    const { data } = await supabase
      .from("website_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    return data as WebsiteSettings | null;
  },

  async updateWebsiteSettings(
    supabase: SupabaseClient,
    id: string,
    patch: Partial<WebsiteSettings>
  ): Promise<WebsiteSettings> {
    const { data, error } = await supabase
      .from("website_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as WebsiteSettings;
  },

  async getPaymentSettings(
    supabase: SupabaseClient
  ): Promise<PaymentSettings | null> {
    const { data } = await supabase
      .from("payment_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    return data as PaymentSettings | null;
  },

  async updatePaymentSettings(
    supabase: SupabaseClient,
    id: string,
    patch: Partial<PaymentSettings>
  ): Promise<PaymentSettings> {
    const { data, error } = await supabase
      .from("payment_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as PaymentSettings;
  },
};
