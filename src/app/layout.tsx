import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { createClient } from "@/lib/supabase/server";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { buildThemeStyle } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createClient();
    const settings = await settingsRepository.getWebsiteSettings(supabase);
    const name = settings?.business_name ?? "5 Point Pickleball Kiblawan";
    return {
      title: {
        default: settings?.website_title ?? name,
        template: `%s | ${name}`,
      },
      description:
        settings?.business_description ??
        "Book premium pickleball courts at 5 Point Pickleball Kiblawan. Wallet-based, real-time court reservations.",
      icons: settings?.favicon ? { icon: settings.favicon } : undefined,
      openGraph: {
        title: name,
        description: settings?.business_description ?? undefined,
        type: "website",
      },
      metadataBase: process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
        : undefined,
    };
  } catch {
    return { title: "5 Point Pickleball Kiblawan" };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let themeStyle = {};
  try {
    const supabase = await createClient();
    const settings = await settingsRepository.getWebsiteSettings(supabase);
    themeStyle = buildThemeStyle(settings);
  } catch {
    // Fall back to default theme if DB is unavailable during setup.
  }

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body style={themeStyle}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
