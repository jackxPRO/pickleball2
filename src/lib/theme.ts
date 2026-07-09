import type { WebsiteSettings } from "@/types/database";

/** Convert "#0f4d2e" (or "15 77 46") to space-separated RGB channels. */
export function hexToRgbChannels(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  // Already channels?
  if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value)) return value;
  const hex = value.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return `${r} ${g} ${b}`;
}

/**
 * Build the CSS variable style object from CMS theme settings so branding
 * updates apply instantly without a redeploy.
 */
export function buildThemeStyle(
  settings: WebsiteSettings | null
): React.CSSProperties {
  const style: Record<string, string> = {};
  if (!settings) return style;

  const primary = hexToRgbChannels(settings.primary_color);
  const secondary = hexToRgbChannels(settings.secondary_color);
  const accent = hexToRgbChannels(settings.accent_color);

  if (primary) style["--color-primary"] = primary;
  if (secondary) style["--color-secondary"] = secondary;
  if (accent) style["--color-accent"] = accent;
  if (settings.glass_opacity != null)
    style["--glass-opacity"] = String(settings.glass_opacity);
  if (settings.overlay_opacity != null)
    style["--overlay-opacity"] = String(settings.overlay_opacity);

  return style as React.CSSProperties;
}
