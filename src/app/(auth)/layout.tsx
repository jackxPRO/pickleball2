import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const settings = await settingsRepository
    .getWebsiteSettings(supabase)
    .catch(() => null);

  const bg = settings?.login_background || null;
  const logo = settings?.login_logo || settings?.logo || null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {bg && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${settings?.overlay_opacity ?? 0.6})` }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={settings?.business_name ?? "5 Point Pickleball"}
                className="h-16 w-auto"
              />
            ) : (
              <span className="font-display text-2xl font-extrabold gold-text">
                {settings?.business_name ?? "5 Point Pickleball"}
              </span>
            )}
          </Link>
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );
}
