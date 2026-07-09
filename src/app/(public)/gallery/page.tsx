import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { contentRepository } from "@/lib/repositories/content.repository";
import { GalleryGrid } from "@/components/public/gallery-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const supabase = await createClient();
  const items = await contentRepository.gallery(supabase).catch(() => []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold text-white">Gallery</h1>
        <p className="mt-3 text-white/60">
          Explore our courts, facilities, and events.
        </p>
      </div>
      <GalleryGrid items={items} />
    </div>
  );
}
