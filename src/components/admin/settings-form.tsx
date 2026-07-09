"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { cn, getErrorMessage } from "@/lib/utils";
import type { WebsiteSettings, FaqItem } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUpload } from "@/components/admin/image-upload";

const TABS = [
  "General",
  "Branding",
  "Theme",
  "Backgrounds",
  "Hero",
  "Contact",
  "Content",
] as const;

export function SettingsForm({ settings }: { settings: WebsiteSettings }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<(typeof TABS)[number]>("General");
  const [form, setForm] = useState<WebsiteSettings>(settings);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    try {
      // Strip id/updated_at — repo handles updated_at.
      const { id, updated_at, ...patch } = form;
      void id;
      void updated_at;
      await settingsRepository.updateWebsiteSettings(supabase, settings.id, patch);
      toast.success("Settings saved");
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const faqs: FaqItem[] = form.faqs ?? [];
  const rules: string[] = form.facility_rules ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              tab === t
                ? "bg-secondary text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card className="space-y-4">
        {tab === "General" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business name" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} />
            <Input label="Website title" value={form.website_title ?? ""} onChange={(e) => set("website_title", e.target.value)} />
            <Input label="Currency" value={form.currency ?? "PHP"} onChange={(e) => set("currency", e.target.value)} />
            <Input label="Number of courts" type="number" value={form.number_of_courts ?? 3} onChange={(e) => set("number_of_courts", Number(e.target.value))} />
            <Input label="Operating hours" value={form.operating_hours ?? ""} onChange={(e) => set("operating_hours", e.target.value)} />
            <Input label="Rental rate (display)" value={form.rental_rate ?? ""} onChange={(e) => set("rental_rate", e.target.value)} />
            <Textarea label="Business description" className="sm:col-span-2" value={form.business_description ?? ""} onChange={(e) => set("business_description", e.target.value)} />
          </div>
        )}

        {tab === "Branding" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ImageUpload bucket="branding" label="Business logo" value={form.logo} onUploaded={(u) => set("logo", u)} />
            <ImageUpload bucket="branding" label="Website logo" value={form.website_logo} onUploaded={(u) => set("website_logo", u)} />
            <ImageUpload bucket="branding" label="Login logo" value={form.login_logo} onUploaded={(u) => set("login_logo", u)} />
            <ImageUpload bucket="branding" label="Dashboard logo" value={form.dashboard_logo} onUploaded={(u) => set("dashboard_logo", u)} />
            <ImageUpload bucket="branding" label="Favicon" value={form.favicon} onUploaded={(u) => set("favicon", u)} />
          </div>
        )}

        {tab === "Theme" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField label="Primary color" value={form.primary_color ?? "#0f4d2e"} onChange={(v) => set("primary_color", v)} />
            <ColorField label="Secondary color" value={form.secondary_color ?? "#d4af37"} onChange={(v) => set("secondary_color", v)} />
            <ColorField label="Accent color" value={form.accent_color ?? "#1f7a4d"} onChange={(v) => set("accent_color", v)} />
            <Input label="Glass opacity (0-1)" type="number" step="0.05" value={form.glass_opacity ?? 0.1} onChange={(e) => set("glass_opacity", Number(e.target.value))} />
            <Input label="Overlay opacity (0-1)" type="number" step="0.05" value={form.overlay_opacity ?? 0.55} onChange={(e) => set("overlay_opacity", Number(e.target.value))} />
          </div>
        )}

        {tab === "Backgrounds" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ImageUpload bucket="branding" label="Home hero" value={form.hero_background} onUploaded={(u) => set("hero_background", u)} />
            <ImageUpload bucket="branding" label="Login" value={form.login_background} onUploaded={(u) => set("login_background", u)} />
            <ImageUpload bucket="branding" label="Register" value={form.register_background} onUploaded={(u) => set("register_background", u)} />
            <ImageUpload bucket="branding" label="Dashboard" value={form.dashboard_background} onUploaded={(u) => set("dashboard_background", u)} />
            <ImageUpload bucket="branding" label="Booking" value={form.booking_background} onUploaded={(u) => set("booking_background", u)} />
            <ImageUpload bucket="branding" label="Wallet" value={form.wallet_background} onUploaded={(u) => set("wallet_background", u)} />
            <ImageUpload bucket="branding" label="Contact" value={form.contact_background} onUploaded={(u) => set("contact_background", u)} />
            <ImageUpload bucket="branding" label="About" value={form.about_background} onUploaded={(u) => set("about_background", u)} />
          </div>
        )}

        {tab === "Hero" && (
          <div className="grid gap-4">
            <Input label="Hero title" value={form.hero_title ?? ""} onChange={(e) => set("hero_title", e.target.value)} />
            <Textarea label="Hero subtitle" value={form.hero_subtitle ?? ""} onChange={(e) => set("hero_subtitle", e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="CTA button text" value={form.hero_cta_text ?? ""} onChange={(e) => set("hero_cta_text", e.target.value)} />
              <Input label="CTA button link" value={form.hero_cta_link ?? ""} onChange={(e) => set("hero_cta_link", e.target.value)} />
            </div>
          </div>
        )}

        {tab === "Contact" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Address" value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            <Input label="Phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            <Input label="Email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            <Input label="Facebook page" value={form.facebook ?? ""} onChange={(e) => set("facebook", e.target.value)} />
            <Input label="Messenger link" value={form.messenger ?? ""} onChange={(e) => set("messenger", e.target.value)} />
            <Input label="Instagram" value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} />
            <Input label="Google Maps link" value={form.maps_link ?? ""} onChange={(e) => set("maps_link", e.target.value)} />
            <Input label="Google Maps embed URL" value={form.maps_embed ?? ""} onChange={(e) => set("maps_embed", e.target.value)} />
          </div>
        )}

        {tab === "Content" && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <Textarea label="About us" value={form.about_us ?? ""} onChange={(e) => set("about_us", e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Textarea label="Vision" value={form.vision ?? ""} onChange={(e) => set("vision", e.target.value)} />
                <Textarea label="Mission" value={form.mission ?? ""} onChange={(e) => set("mission", e.target.value)} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0">FAQs</label>
                <Button size="sm" variant="outline" onClick={() => set("faqs", [...faqs, { question: "", answer: "" }])}>
                  Add FAQ
                </Button>
              </div>
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <div key={i} className="rounded-xl border border-white/10 p-3">
                    <Input
                      placeholder="Question"
                      value={f.question}
                      onChange={(e) => {
                        const next = [...faqs];
                        next[i] = { ...next[i], question: e.target.value };
                        set("faqs", next);
                      }}
                    />
                    <Textarea
                      className="mt-2"
                      placeholder="Answer"
                      value={f.answer}
                      onChange={(e) => {
                        const next = [...faqs];
                        next[i] = { ...next[i], answer: e.target.value };
                        set("faqs", next);
                      }}
                    />
                    <button
                      onClick={() => set("faqs", faqs.filter((_, idx) => idx !== i))}
                      className="mt-2 text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0">Facility rules</label>
                <Button size="sm" variant="outline" onClick={() => set("facility_rules", [...rules, ""])}>
                  Add rule
                </Button>
              </div>
              <div className="space-y-2">
                {rules.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={r}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = e.target.value;
                        set("facility_rules", next);
                      }}
                    />
                    <button
                      onClick={() => set("facility_rules", rules.filter((_, idx) => idx !== i))}
                      className="rounded-lg px-2 text-red-400 hover:bg-red-500/10"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button variant="gold" onClick={save} loading={busy} className="shadow-glow">
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
        />
      </div>
    </div>
  );
}
