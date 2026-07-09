import Link from "next/link";
import { Facebook, Instagram, MapPin, Clock } from "lucide-react";
import type { WebsiteSettings } from "@/types/database";
import { Brand } from "@/components/public/brand";

export function Footer({
  settings,
  tagline,
}: {
  settings: WebsiteSettings | null;
  tagline?: string;
}) {
  const name = settings?.business_name ?? "5 Point Pickleball";
  const courts = settings?.number_of_courts ?? 3;

  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4">
        <div>
          <Brand
            name={name}
            tagline={tagline}
            logo={settings?.website_logo || settings?.logo || null}
          />
          <p className="mt-4 max-w-xs text-sm text-white/60">
            {settings?.business_description ??
              "A modern pickleball facility offering premium courts, a welcoming community, and an easy online booking experience."}
          </p>
          <div className="mt-4 flex gap-3">
            {settings?.facebook && (
              <a
                href={settings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-secondary"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            )}
            {settings?.instagram && (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-secondary"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">
            Quick links
          </h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link href="/" className="hover:text-secondary">Home</Link></li>
            <li><Link href="/gallery" className="hover:text-secondary">Gallery</Link></li>
            <li><Link href="/book" className="hover:text-secondary">Book a Court</Link></li>
            <li><Link href="/#pricing" className="hover:text-secondary">Pricing</Link></li>
            <li><Link href="/#faqs" className="hover:text-secondary">FAQs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">
            Contact
          </h4>
          <ul className="space-y-3 text-sm text-white/60">
            {settings?.address && (
              <li className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-secondary" />
                {settings.address}
              </li>
            )}
            {settings?.operating_hours && (
              <li className="flex gap-2">
                <Clock className="h-4 w-4 shrink-0 text-secondary" />
                {settings.operating_hours}
              </li>
            )}
            {settings?.facebook && (
              <li className="flex gap-2">
                <Facebook className="h-4 w-4 shrink-0 text-secondary" />
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-secondary"
                >
                  Facebook Page
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">
            Ready to play?
          </h4>
          <p className="text-sm text-white/60">
            Reserve one of our {courts} premium courts online in minutes.
          </p>
          <Link href="/book" className="btn-gold mt-4 w-full">
            Book Now
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {name}. All rights reserved.
      </div>
    </footer>
  );
}
