"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { contentRepository } from "@/lib/repositories/content.repository";
import { formatDate, getErrorMessage } from "@/lib/utils";
import type { Announcement } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUpload } from "@/components/admin/image-upload";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export function AnnouncementsManager({ items }: { items: Announcement[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
    start_date: "",
    end_date: "",
  });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!form.title) {
      toast.error("Enter a title");
      return;
    }
    setBusy(true);
    try {
      await contentRepository.saveAnnouncement(supabase, {
        title: form.title,
        description: form.description || null,
        image: form.image || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        active: true,
      });
      toast.success("Announcement posted");
      setForm({ title: "", description: "", image: "", start_date: "", end_date: "" });
      router.refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(a: Announcement) {
    await contentRepository.saveAnnouncement(supabase, {
      ...a,
      active: !a.active,
    });
    router.refresh();
  }

  async function remove(id: string) {
    await contentRepository.deleteAnnouncement(supabase, id);
    toast.success("Deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 font-display font-semibold text-white">
          New announcement
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
              <Input
                label="End date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <ImageUpload
            bucket="branding"
            label="Banner image"
            value={form.image}
            onUploaded={(url) => setForm({ ...form, image: url })}
          />
        </div>
        <Button variant="gold" className="mt-4" onClick={add} loading={busy}>
          <Plus className="h-4 w-4" /> Post
        </Button>
      </Card>

      {items.length === 0 ? (
        <EmptyState title="No announcements" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="overflow-hidden p-0">
              {a.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.image} alt={a.title} className="h-36 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold text-white">
                    {a.title}
                  </h3>
                  <Badge
                    className={
                      a.active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                    }
                  >
                    {a.active ? "Active" : "Off"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-white/60">{a.description}</p>
                {(a.start_date || a.end_date) && (
                  <p className="mt-2 text-xs text-white/40">
                    {a.start_date && formatDate(a.start_date)}
                    {a.end_date && ` – ${formatDate(a.end_date)}`}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(a)}>
                    {a.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => remove(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
