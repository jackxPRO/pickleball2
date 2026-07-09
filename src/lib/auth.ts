import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userRepository } from "@/lib/repositories/user.repository";
import type { AppUser, Admin } from "@/types/database";

/** Returns the current auth user or null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the app user profile (public.users) for the current session. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return userRepository.getByAuthId(supabase, user.id);
}

/** Guard for customer routes — redirects to /login if unauthenticated. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.is_disabled) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=disabled");
  }
  return user;
}

/** Returns the admin record for the current session, or null. */
export async function getCurrentAdmin(): Promise<Admin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("admins")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();
  return data as Admin | null;
}

/** Guard for admin routes — redirects if not an admin. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?error=admin_required");
  return admin;
}
