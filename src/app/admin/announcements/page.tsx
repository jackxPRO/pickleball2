import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contentRepository } from "@/lib/repositories/content.repository";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const items = await contentRepository
    .announcements(supabase, false)
    .catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Announcements
        </h1>
        <p className="text-white/60">
          Post news, events, and promotional banners.
        </p>
      </div>
      <AnnouncementsManager items={items} />
    </div>
  );
}
