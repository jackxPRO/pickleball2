"use client";

import { usePathname } from "next/navigation";
import { PageBackground } from "@/components/ui/page-background";

/**
 * Picks the correct auth background (login vs register) based on the current
 * route, since the login and register pages share one layout.
 */
export function AuthBackground({
  loginBackground,
  registerBackground,
  overlay = 0.6,
}: {
  loginBackground?: string | null;
  registerBackground?: string | null;
  overlay?: number;
}) {
  const pathname = usePathname();
  const image = pathname.startsWith("/register")
    ? registerBackground || loginBackground
    : loginBackground;
  return <PageBackground image={image} overlay={overlay} />;
}
