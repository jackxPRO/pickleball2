"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/public/brand";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#facilities", label: "Facilities" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faqs", label: "FAQs" },
  { href: "/#contact", label: "Contact" },
];

export function Navbar({
  businessName,
  tagline,
  logo,
  isAuthed,
}: {
  businessName: string;
  tagline?: string;
  logo?: string | null;
  isAuthed: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "glass-dark py-2 shadow-card"
          : "bg-gradient-to-b from-black/60 to-transparent py-4"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Brand name={businessName} tagline={tagline} logo={logo} />
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition hover:text-secondary",
                pathname === item.href ? "text-secondary" : "text-white/80"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthed ? (
            <Link href="/dashboard" className="btn-gold">
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-white/80 transition hover:text-secondary"
              >
                Login
              </Link>
              <Link href="/book" className="btn-gold">
                Book Now
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-white lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="glass-dark mx-4 mt-2 space-y-1 rounded-2xl p-4 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              {item.label}
            </Link>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {isAuthed ? (
              <Link href="/dashboard" className="btn-gold col-span-2">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-outline">
                  Login
                </Link>
                <Link href="/book" className="btn-gold">
                  Book Now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
