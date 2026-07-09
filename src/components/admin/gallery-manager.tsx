"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { contentRepository } from "@/lib/repositories/content.repository";
import { getErrorMessage } from "@/lib/utils";
import { GALLERY_CATEGORIES } from "@/lib/constants";
import type { GalleryItem } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/admin/image-upload";
import { EmptyState } from "@/components/ui/empty-state";

export function GalleryManager({ items }: { items: GalleryItem[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    image_url: "",
    title: "",
    category: "Courts",
  });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!form.image_url) {
      toast.error("Upload an image first");
      return;
    }
    setBusy(true);
    try {
      await contentRepository.addGalleryItem(supabase, {
        image_url: form.image_url,
        thumbnail_url: form.image_url,
        title: form.title,
        category: form.category,
        display_order: items.length + 1,
      });
      toast.success("Image added");
      setForm({ image_url: "", title: "", category: "Courts" });
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await contentRepository.deleteGalleryItem(supabase, id);
      toast.success("Removed");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 font-display font-semibold text-white">
          Add gallery image
        </h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <ImageUpload
            bucket="gallery"
            value={form.image_url}
            onUploaded={(url) => setForm({ ...form, image_url: url })}
          />
          <div className="flex-1 space-y-3">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {GALLERY_CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="gold" onClick={add} loading={busy}>
            Add
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="No images yet" description="Upload your first gallery image." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail_url ?? item.image_url}
                alt={item.title ?? ""}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="truncate text-xs text-white">{item.title}</p>
                <p className="text-[10px] text-secondary">{item.category}</p>
              </div>
              <button
                onClick={() => remove(item.id)}
                className="absolute right-2 top-2 rounded-lg bg-red-500/90 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
