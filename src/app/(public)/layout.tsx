import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { cityFromAddress } from "@/lib/utils";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { MessengerButton } from "@/components/public/messenger-button";

// CMS-driven pages must always reflect the latest settings — never cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [settings, { data: auth }] = await Promise.all([
    settingsRepository.getWebsiteSettings(supabase).catch(() => null),
    supabase.auth.getUser(),
  ]);

  const tagline = cityFromAddress(settings?.address) ?? "Kiblawan";

  return (
    <>
      <Navbar
        businessName={settings?.business_name ?? "5 Point Pickleball"}
        tagline={tagline}
        logo={settings?.website_logo || settings?.logo || null}
        isAuthed={!!auth.user}
      />
      <main className="min-h-screen">{children}</main>
      <Footer settings={settings} tagline={tagline} />
      <MessengerButton link={settings?.messenger ?? settings?.facebook} />
    </>
  );
}
