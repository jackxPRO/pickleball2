"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import type { Booking } from "@/types/database";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Fetch all bookings for a given customer. Admin only.
 */
export async function getUserBookingsAction(
  userId: string
): Promise<{ ok: boolean; error?: string; bookings?: Booking[] }> {
  const caller = await getCurrentAdmin();
  if (!caller) {
    return { ok: false, error: "Admin privileges required." };
  }

  try {
    const supabase = await createClient();
    const bookings = await bookingRepository.listForUser(supabase, userId);
    return { ok: true, bookings };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}

/**
 * Permanently delete a customer account. Admin only.
 * Deletes the auth user via the service role; the public.users row and all
 * related records (bookings, wallet, etc.) are removed by ON DELETE CASCADE.
 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const caller = await getCurrentAdmin();
  if (!caller) {
    return { ok: false, error: "Admin privileges required." };
  }

  try {
    const supabase = await createClient();
    const { data: user, error: lookupErr } = await supabase
      .from("users")
      .select("auth_id")
      .eq("id", userId)
      .maybeSingle();

    if (lookupErr) return { ok: false, error: lookupErr.message };
    if (!user) return { ok: false, error: "User not found." };

    const service = createServiceClient();
    const { error: deleteErr } = await service.auth.admin.deleteUser(
      user.auth_id
    );
    if (deleteErr) return { ok: false, error: deleteErr.message };

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: getErrorMessage(e) };
  }
}
