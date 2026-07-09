import type { SupabaseClient } from "@supabase/supabase-js";
import type { Court, Booking } from "@/types/database";

export const courtRepository = {
  async list(supabase: SupabaseClient, activeOnly = false): Promise<Court[]> {
    let query = supabase
      .from("courts")
      .select("*")
      .order("display_order", { ascending: true });
    if (activeOnly) query = query.eq("status", "ACTIVE");
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Court[];
  },

  async create(
    supabase: SupabaseClient,
    payload: Pick<Court, "name" | "hourly_rate" | "display_order">
  ): Promise<Court> {
    const { data, error } = await supabase
      .from("courts")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Court;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    patch: Partial<Court>
  ): Promise<Court> {
    const { data, error } = await supabase
      .from("courts")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Court;
  },

  /** Bookings for a court on a given date (to compute availability).
   *  Uses the booked_slots SECURITY DEFINER function so a customer can see
   *  slots booked by ANY user (RLS would otherwise hide other users' rows). */
  async bookedSlots(
    supabase: SupabaseClient,
    courtId: string,
    date: string
  ): Promise<Pick<Booking, "start_time" | "end_time">[]> {
    const { data, error } = await supabase.rpc("booked_slots", {
      p_court_id: courtId,
      p_date: date,
    });
    if (error) throw error;
    return (data ?? []) as Pick<Booking, "start_time" | "end_time">[];
  },
};
