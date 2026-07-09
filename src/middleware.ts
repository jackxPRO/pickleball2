import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Only run auth session refresh + guards on routes that need it.
    // Public pages (home, gallery, #anchor links) skip the Supabase call
    // entirely, so navigation there is instant.
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
