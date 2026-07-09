import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, BookingStatus } from "@/types/database";

export const bookingRepository = {
  async listForUser(
    supabase: SupabaseClient,
    userId: string
  ): Promise<Booking[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, courts(name)")
      .eq("user_id", userId)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Booking[];
  },

  async listAll(
    supabase: SupabaseClient,
    filters?: { status?: BookingStatus; date?: string; courtId?: string }
  ): Promise<Booking[]> {
    let query = supabase
      .from("bookings")
      .select("*, courts(name), users(full_name, email)")
      .order("booking_date", { ascending: false });
    if (filters?.status) query = query.eq("booking_status", filters.status);
    if (filters?.date) query = query.eq("booking_date", filters.date);
    if (filters?.courtId) query = query.eq("court_id", filters.courtId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Booking[];
  },

  async listInRange(
    supabase: SupabaseClient,
    from: string,
    to: string
  ): Promise<Booking[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, courts(name), users(full_name)")
      .gte("booking_date", from)
      .lte("booking_date", to)
      .neq("booking_status", "CANCELLED");
    if (error) throw error;
    return (data ?? []) as Booking[];
  },

  /** Create bookings atomically via the create_booking RPC. */
  async create(
    supabase: SupabaseClient,
    courtId: string,
    date: string,
    slots: string[]
  ): Promise<Booking[]> {
    const { data, error } = await supabase.rpc("create_booking", {
      p_court_id: courtId,
      p_date: date,
      p_slots: slots,
    });
    if (error) throw error;
    return (data ?? []) as Booking[];
  },

  async cancel(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: id,
    });
    if (error) throw error;
  },

  async refund(
    supabase: SupabaseClient,
    id: string,
    amount?: number
  ): Promise<void> {
    const { error } = await supabase.rpc("refund_booking", {
      p_booking_id: id,
      p_amount: amount ?? null,
    });
    if (error) throw error;
  },

  async setStatus(
    supabase: SupabaseClient,
    id: string,
    status: BookingStatus
  ): Promise<void> {
    const { error } = await supabase
      .from("bookings")
      .update({ booking_status: status })
      .eq("id", id);
    if (error) throw error;
  },
};
