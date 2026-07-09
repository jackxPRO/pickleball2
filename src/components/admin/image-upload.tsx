"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Upload, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils";

/**
 * Uploads an image to a public Supabase Storage bucket and returns its public
 * URL via onUploaded. Used across the admin CMS / media manager.
 */
export function ImageUpload({
  bucket,
  value,
  onUploaded,
  label,
  className,
}: {
  bucket: "branding" | "gallery" | "avatars";
  value?: string | null;
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {value ? (
        <div className="group relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="preview"
            className="h-24 w-24 rounded-xl border border-white/10 object-cover"
          />
          <button
            type="button"
            onClick={() => onUploaded("")}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/5 text-xs text-white/50 hover:bg-white/10">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Upload
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}
