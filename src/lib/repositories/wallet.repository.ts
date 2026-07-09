import type { SupabaseClient } from "@supabase/supabase-js";
import type { WalletTransaction, WalletTopup } from "@/types/database";

export const walletRepository = {
  async transactions(
    supabase: SupabaseClient,
    userId: string,
    limit = 100
  ): Promise<WalletTransaction[]> {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as WalletTransaction[];
  },

  async requestTopup(
    supabase: SupabaseClient,
    amount: number,
    receipt: string | null,
    method: string | null = null
  ): Promise<WalletTopup> {
    const { data, error } = await supabase.rpc("request_topup", {
      p_amount: amount,
      p_receipt: receipt,
      p_method: method,
    });
    if (error) throw error;
    return data as WalletTopup;
  },

  async myTopups(
    supabase: SupabaseClient,
    userId: string
  ): Promise<WalletTopup[]> {
    const { data, error } = await supabase
      .from("wallet_topups")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WalletTopup[];
  },

  async pendingTopups(supabase: SupabaseClient): Promise<WalletTopup[]> {
    const { data, error } = await supabase
      .from("wallet_topups")
      .select("*, users(full_name, email, phone)")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as WalletTopup[];
  },

  async allTopups(supabase: SupabaseClient): Promise<WalletTopup[]> {
    const { data, error } = await supabase
      .from("wallet_topups")
      .select("*, users(full_name, email, phone)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WalletTopup[];
  },

  async approveTopup(
    supabase: SupabaseClient,
    id: string,
    remarks?: string
  ): Promise<void> {
    const { error } = await supabase.rpc("approve_topup", {
      p_topup_id: id,
      p_remarks: remarks ?? null,
    });
    if (error) throw error;
  },

  async rejectTopup(
    supabase: SupabaseClient,
    id: string,
    remarks?: string
  ): Promise<void> {
    const { error } = await supabase.rpc("reject_topup", {
      p_topup_id: id,
      p_remarks: remarks ?? null,
    });
    if (error) throw error;
  },

  async adjust(
    supabase: SupabaseClient,
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const { error } = await supabase.rpc("adjust_wallet", {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
    });
    if (error) throw error;
  },
};
