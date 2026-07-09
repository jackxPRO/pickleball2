import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contentRepository } from "@/lib/repositories/content.repository";
import { GalleryManager } from "@/components/admin/gallery-manager";

export default async function AdminGalleryPage() {
  await requireAdmin();
  const supabase = await createClient();
  const items = await contentRepository.gallery(supabase).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Media manager
        </h1>
        <p className="text-white/60">
          Upload and organize gallery images stored in Supabase Storage.
        </p>
      </div>
      <GalleryManager items={items} />
    </div>
  );
}
