import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUser } from "@/types/database";

export const userRepository = {
  async getByAuthId(
    supabase: SupabaseClient,
    authId: string
  ): Promise<AppUser | null> {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .maybeSingle();
    return data as AppUser | null;
  },

  async getById(
    supabase: SupabaseClient,
    id: string
  ): Promise<AppUser | null> {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data as AppUser | null;
  },

  async list(supabase: SupabaseClient, search?: string): Promise<AppUser[]> {
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AppUser[];
  },

  async updateProfile(
    supabase: SupabaseClient,
    authId: string,
    patch: Partial<Pick<AppUser, "full_name" | "phone" | "avatar">>
  ): Promise<AppUser> {
    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("auth_id", authId)
      .select("*")
      .single();
    if (error) throw error;
    return data as AppUser;
  },

  async setDisabled(
    supabase: SupabaseClient,
    id: string,
    disabled: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ is_disabled: disabled })
      .eq("id", id);
    if (error) throw error;
  },
};
