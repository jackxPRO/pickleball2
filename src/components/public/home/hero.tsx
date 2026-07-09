"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";

export function Hero({
  title,
  subtitle,
  ctaText,
  ctaLink,
  background,
  overlay,
  mapsLink,
  locationLabel,
}: {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  background?: string | null;
  overlay: number;
  mapsLink?: string | null;
  locationLabel?: string | null;
}) {
  // Split the headline into words and accent the middle one (e.g. "Compete.").
  const words = title.split(" ").filter(Boolean);
  const accentIndex = words.length > 1 ? Math.floor((words.length - 1) / 2) : -1;

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      {background ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${background})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-black to-black" />
      )}
      {/* Green-tinted cinematic overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${overlay})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/50 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          {locationLabel && (
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-black/30 px-4 py-1.5 text-sm font-medium text-secondary backdrop-blur">
              <MapPin className="h-4 w-4" />
              {locationLabel}
            </span>
          )}
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] text-white sm:text-7xl">
            {accentIndex >= 0
              ? words.map((w, i) => (
                  <span
                    key={i}
                    className={i === accentIndex ? "text-secondary" : ""}
                  >
                    {w}
                    {i < words.length - 1 ? " " : ""}
                  </span>
                ))
              : title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={ctaLink} className="btn-gold text-base">
              {ctaText}
              <ArrowRight className="h-5 w-5" />
            </Link>
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-base"
              >
                <MapPin className="h-5 w-5" />
                Get Directions
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
