import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const settings = await settingsRepository
    .getWebsiteSettings(supabase)
    .catch(() => null);

  if (!settings) {
    return (
      <div className="card p-8 text-center text-white/70">
        Website settings row is missing. Run the seed migration (0004_seed.sql).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Website CMS</h1>
        <p className="text-white/60">
          Edit branding, theme, content, and contact info. Changes apply instantly.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
