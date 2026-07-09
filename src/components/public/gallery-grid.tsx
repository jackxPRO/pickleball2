"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { GalleryItem } from "@/types/database";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<GalleryItem | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    items.forEach((i) => i.category && set.add(i.category));
    GALLERY_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const inCat = category === "All" || i.category === category;
      const q = search.toLowerCase();
      const inSearch =
        !q ||
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q);
      return inCat && inSearch;
    });
  }, [items, category, search]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                category === c
                  ? "border-secondary bg-secondary text-black"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gallery..."
            className="input pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No photos found" description="Try a different filter or search term." />
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {filtered.map((item) => (
            <motion.button
              key={item.id}
              layout
              onClick={() => setActive(item)}
              className="mb-3 block w-full overflow-hidden rounded-xl border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail_url ?? item.image_url}
                alt={item.title ?? "Gallery image"}
                loading="lazy"
                className="w-full object-cover transition hover:scale-105"
              />
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setActive(null)}
          >
            <button
              className="absolute right-6 top-6 rounded-lg bg-white/10 p-2 text-white"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.image_url}
                alt={active.title ?? "Gallery image"}
                className="max-h-[75vh] w-auto object-contain"
              />
              {(active.title || active.description) && (
                <div className="glass-dark p-4">
                  {active.title && (
                    <h3 className="font-semibold text-white">{active.title}</h3>
                  )}
                  {active.description && (
                    <p className="text-sm text-white/60">{active.description}</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
