"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Wallet,
  Users,
  LayoutGrid,
  Tag,
  CreditCard,
  Settings,
  Image as ImageIcon,
  Megaphone,
  CalendarDays,
  BarChart3,
  UserCog,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/public/brand";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/topups", label: "Top-ups", icon: Wallet },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/courts", label: "Courts", icon: LayoutGrid },
  { href: "/admin/pricing", label: "Pricing", icon: Tag },
  { href: "/admin/payment", label: "Payment", icon: CreditCard },
  { href: "/admin/gallery", label: "Media", icon: ImageIcon },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/admins", label: "Administrators", icon: UserCog },
  { href: "/admin/settings", label: "Website CMS", icon: Settings },
  { href: "/admin/danger", label: "Danger Zone", icon: AlertTriangle },
];

export function AdminShell({
  children,
  email,
  logo,
  businessName,
}: {
  children: React.ReactNode;
  email: string;
  logo?: string | null;
  businessName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <>
      <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
        <Brand name={businessName} logo={logo} tagline="Admin" />
      </Link>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-2">
        <ShieldCheck className="h-4 w-4 text-secondary" />
        <span className="truncate text-xs text-white/70">{email}</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-secondary/15 text-secondary"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action="/auth/signout" method="post" className="mt-2">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </form>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-black/50 p-4 backdrop-blur-xl lg:flex">
        {content}
      </aside>

      <div className="glass-dark sticky top-0 z-30 flex items-center justify-between p-4 lg:hidden">
        <span className="font-display font-bold text-white">Admin</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6 text-white" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-zinc-950 p-4">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-white/60"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
            {content}
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
