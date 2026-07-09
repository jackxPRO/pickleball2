"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarPlus,
  Wallet,
  CalendarCheck,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Brand } from "@/components/public/brand";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/book", label: "Book Court", icon: CalendarPlus },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarCheck },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function DashboardShell({
  children,
  name,
  balance,
  currency,
  logo,
  businessName,
}: {
  children: React.ReactNode;
  name: string;
  balance: number;
  currency: string;
  logo?: string | null;
  businessName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const SidebarContent = (
    <>
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <Brand name={businessName} logo={logo} />
      </Link>

      <div className="mb-6 rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
        <p className="text-xs text-white/50">Wallet balance</p>
        <p className="mt-1 font-display text-2xl font-bold gold-text">
          {formatCurrency(balance, currency)}
        </p>
        <Link
          href="/dashboard/wallet"
          className="btn-gold mt-3 w-full py-1.5 text-xs"
        >
          Top up
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-secondary/15 text-secondary"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action="/auth/signout" method="post" className="mt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </form>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/10 bg-black/40 p-5 backdrop-blur-xl lg:flex">
        {SidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="glass-dark sticky top-0 z-30 flex items-center justify-between p-4 lg:hidden">
        <span className="font-display font-bold text-white">Hi, {name.split(" ")[0]}</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-zinc-950 p-5">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-white/60"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
