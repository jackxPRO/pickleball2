import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { courtRepository } from "@/lib/repositories/court.repository";
import { CourtsManager } from "@/components/admin/courts-manager";

export default async function AdminCourtsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const courts = await courtRepository.list(supabase).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Courts</h1>
        <p className="text-white/60">Add and manage courts.</p>
      </div>
      <CourtsManager courts={courts} />
    </div>
  );
}
