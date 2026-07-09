import Link from "next/link";
import {
  Trophy,
  Clock,
  MapPin,
  Wallet,
  CalendarCheck,
  ShieldCheck,
  Star,
  Facebook,
  Phone,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { courtRepository } from "@/lib/repositories/court.repository";
import { contentRepository } from "@/lib/repositories/content.repository";
import { formatCurrency } from "@/lib/utils";
import { Hero } from "@/components/public/home/hero";
import { Reveal } from "@/components/public/home/reveal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [settings, courts, gallery, announcements, pricing] = await Promise.all([
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
    courtRepository.list(supabase, true).catch(() => []),
    contentRepository.gallery(supabase).catch(() => []),
    contentRepository.announcements(supabase, true).catch(() => []),
    supabase
      .from("pricing_rules")
      .select("*")
      .eq("active", true)
      .then((r) => r.data ?? []),
  ]);

  const currency = settings?.currency ?? "PHP";
  const faqs = settings?.faqs ?? [];

  const features = [
    { icon: Wallet, title: "Wallet-based booking", desc: "Top up once, book instantly. No cash needed on-site." },
    { icon: CalendarCheck, title: "Real-time availability", desc: "See open slots live and never double-book." },
    { icon: ShieldCheck, title: "Secure & fair", desc: "Row-level security keeps your data and balance safe." },
    { icon: Trophy, title: "Premium courts", desc: `${settings?.number_of_courts ?? 3} well-maintained pro courts.` },
  ];

  return (
    <>
      <Hero
        title={settings?.hero_title ?? "Play. Compete. Connect."}
        subtitle={
          settings?.hero_subtitle ??
          "Premier pickleball courts in Kiblawan — book your game today."
        }
        ctaText={settings?.hero_cta_text ?? "Book Now"}
        ctaLink={settings?.hero_cta_link ?? "/book"}
        background={settings?.hero_background}
        overlay={settings?.overlay_opacity ?? 0.55}
        mapsLink={settings?.maps_link}
        locationLabel={settings?.address ?? "Kiblawan, Davao del Sur"}
      />

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {announcements.slice(0, 3).map((a) => (
              <Reveal key={a.id} className="card overflow-hidden p-0">
                {a.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image} alt={a.title} className="h-40 w-full object-cover" />
                )}
                <div className="p-5">
                  <span className="badge border-secondary/30 bg-secondary/10 text-secondary">
                    Announcement
                  </span>
                  <h3 className="mt-2 font-display font-semibold text-white">{a.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{a.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section id="facilities" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            World-class facilities
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/60">
            A modern, hassle-free way to reserve your court.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} className="card p-6">
              <div className="w-fit rounded-xl bg-secondary/10 p-3">
                <f.icon className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm text-white/60">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* About */}
      {/* About */}
      <section id="about" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {settings?.about_background && (
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-3xl"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${settings.about_background})` }}
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: settings?.overlay_opacity ?? 0.6 }}
            />
          </div>
        )}
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <span className="badge border-secondary/30 bg-secondary/10 text-secondary">
              About Us
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-white">
              {settings?.business_name ?? "5 Point Pickleball"}
            </h2>
            <p className="mt-4 text-white/70">
              {settings?.about_us ??
                "A modern pickleball facility offering premium courts, a welcoming community, and an easy online booking experience."}
            </p>
          </Reveal>
          <div className="grid gap-4">
            <Reveal className="card p-6">
              <h3 className="font-display font-semibold text-secondary">Vision</h3>
              <p className="mt-2 text-sm text-white/70">
                {settings?.vision ??
                  "To be the home of pickleball in Kiblawan — where players of all levels come to play, compete, and connect."}
              </p>
            </Reveal>
            <Reveal delay={0.1} className="card p-6">
              <h3 className="font-display font-semibold text-secondary">Mission</h3>
              <p className="mt-2 text-sm text-white/70">
                {settings?.mission ??
                  "To deliver a premium, accessible, and community-driven pickleball experience for everyone."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-white">Gallery</h2>
              <p className="mt-2 text-white/60">A look at our courts and facilities.</p>
            </div>
            <Link href="/gallery" className="btn-outline hidden sm:inline-flex">
              View all
            </Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.slice(0, 8).map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={g.id}
                src={g.thumbnail_url ?? g.image_url}
                alt={g.title ?? "Court"}
                loading="lazy"
                className="aspect-square w-full rounded-xl object-cover transition hover:scale-[1.03]"
              />
            ))}
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Simple, fair pricing
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/60">
            {settings?.rental_rate ?? "₱150 (7AM-4PM) / ₱200 (4PM-12MN) per hour"}
          </p>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          {(pricing.length
            ? pricing
            : [
                { id: "1", name: "Day Rate (7AM–4PM)", rate: 150 },
                { id: "2", name: "Night Rate (4PM–12MN)", rate: 200 },
              ]
          ).map((p) => (
            <Reveal key={p.id} className="card p-8 text-center">
              <Star className="mx-auto h-8 w-8 text-secondary" />
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                {p.name}
              </h3>
              <p className="mt-3 font-display text-4xl font-extrabold gold-text">
                {formatCurrency(p.rate, currency)}
              </p>
              <p className="mt-1 text-sm text-white/50">per court, per hour</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Get In Touch */}
      <section id="contact" className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {settings?.contact_background && (
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-3xl"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${settings.contact_background})` }}
            />
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: settings?.overlay_opacity ?? 0.6 }}
            />
          </div>
        )}
        <Reveal className="relative z-10 mb-10 text-center">
          <h2 className="font-display text-4xl font-bold text-white">
            Get In Touch
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/60">
            We&apos;d love to see you on the court. Find us or reach out anytime.
          </p>
        </Reveal>

        <div className="relative z-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Reveal className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <span className="rounded-xl bg-secondary/15 p-3">
                <MapPin className="h-5 w-5 text-secondary" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Address
                </p>
                <p className="mt-1 font-medium text-white">
                  {settings?.address ?? "Kiblawan, Davao del Sur"}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.05} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <span className="rounded-xl bg-secondary/15 p-3">
                <Clock className="h-5 w-5 text-secondary" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Operating hours
                </p>
                <p className="mt-1 font-medium text-white">
                  {settings?.operating_hours ?? "Daily, 7:00 AM – 12:00 MN"}
                </p>
              </div>
            </Reveal>

            {settings?.phone && (
              <Reveal delay={0.1} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="rounded-xl bg-secondary/15 p-3">
                  <Phone className="h-5 w-5 text-secondary" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Phone
                  </p>
                  <p className="mt-1 font-medium text-white">{settings.phone}</p>
                </div>
              </Reveal>
            )}

            {settings?.email && (
              <Reveal delay={0.12} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="rounded-xl bg-secondary/15 p-3">
                  <Mail className="h-5 w-5 text-secondary" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Email
                  </p>
                  <p className="mt-1 font-medium text-white">{settings.email}</p>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.15} className="flex flex-wrap gap-3 pt-1">
              {settings?.maps_link && (
                <a
                  href={settings.maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold"
                >
                  <MapPin className="h-5 w-5" />
                  Get Directions
                </a>
              )}
              {settings?.facebook && (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  <Facebook className="h-5 w-5" />
                  Facebook
                </a>
              )}
            </Reveal>
          </div>

          <Reveal delay={0.1} className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title="Location map"
              src={
                settings?.maps_embed ??
                "https://www.google.com/maps?q=Kiblawan,Davao+del+Sur&output=embed"
              }
              className="h-full min-h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Reveal>
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <section id="faqs" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold text-white">FAQs</h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <details className="card group p-5">
                  <summary className="cursor-pointer list-none font-medium text-white">
                    {f.question}
                  </summary>
                  <p className="mt-2 text-sm text-white/60">{f.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <Reveal className="card flex flex-col items-center gap-4 bg-gradient-to-br from-primary/40 to-black p-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Ready to play?
          </h2>
          <p className="max-w-xl text-white/70">
            Create your account, top up your wallet, and reserve a court in
            under a minute.
          </p>
          <Link href="/register" className="btn-gold text-base">
            Get started
          </Link>
        </Reveal>
      </section>
    </>
  );
}
