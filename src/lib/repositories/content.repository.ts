import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryItem, Announcement } from "@/types/database";

export const contentRepository = {
  async gallery(
    supabase: SupabaseClient,
    category?: string
  ): Promise<GalleryItem[]> {
    let query = supabase
      .from("gallery")
      .select("*")
      .order("display_order", { ascending: true });
    if (category && category !== "All") query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as GalleryItem[];
  },

  async addGalleryItem(
    supabase: SupabaseClient,
    payload: Partial<GalleryItem>
  ): Promise<GalleryItem> {
    const { data, error } = await supabase
      .from("gallery")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as GalleryItem;
  },

  async deleteGalleryItem(
    supabase: SupabaseClient,
    id: string
  ): Promise<void> {
    const { error } = await supabase.from("gallery").delete().eq("id", id);
    if (error) throw error;
  },

  async announcements(
    supabase: SupabaseClient,
    activeOnly = true
  ): Promise<Announcement[]> {
    let query = supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Announcement[];
  },

  async saveAnnouncement(
    supabase: SupabaseClient,
    payload: Partial<Announcement>
  ): Promise<Announcement> {
    const { data, error } = await supabase
      .from("announcements")
      .upsert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as Announcement;
  },

  async deleteAnnouncement(
    supabase: SupabaseClient,
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
