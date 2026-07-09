// Database types mirroring the Supabase schema. Keep in sync with
// supabase/migrations. Generated-style hand-written types for full control.

export type WalletTransactionType = "TOPUP" | "BOOKING" | "REFUND" | "ADJUSTMENT";
export type TopupStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "REFUNDED";
export type CourtStatus = "ACTIVE" | "DISABLED" | "MAINTENANCE";
export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export interface AppUser {
  id: string;
  auth_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  avatar: string | null;
  wallet_balance: number;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  auth_id: string | null;
  email: string;
  role: AdminRole;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference: string | null;
  created_at: string;
}

export interface WalletTopup {
  id: string;
  user_id: string;
  amount: number;
  receipt_image: string | null;
  status: TopupStatus;
  admin_id: string | null;
  remarks: string | null;
  created_at: string;
  approved_at: string | null;
  users?: Pick<AppUser, "full_name" | "email" | "phone"> | null;
}

export interface Court {
  id: string;
  name: string;
  status: CourtStatus;
  hourly_rate: number;
  display_order: number;
  created_at: string;
}

export interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  start_time: string | null;
  end_time: string | null;
  rate: number;
  discount_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  user_id: string;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  amount: number;
  booking_status: BookingStatus;
  created_at: string;
  updated_at: string;
  courts?: Pick<Court, "name"> | null;
  users?: Pick<AppUser, "full_name" | "email"> | null;
}

export interface PaymentSettings {
  id: string;
  qr_image: string | null;
  account_name: string | null;
  account_number: string | null;
  instructions: string | null;
  updated_at: string;
}

export type PaymentMethodType = "GCASH" | "MAYA" | "BANK" | "INSTAPAY";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  account_name: string | null;
  account_number: string | null;
  qr_image: string | null;
  instructions: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface WebsiteSettings {
  id: string;
  business_name: string;
  logo: string | null;
  website_logo: string | null;
  login_logo: string | null;
  dashboard_logo: string | null;
  favicon: string | null;
  website_title: string | null;
  business_description: string | null;
  about_us: string | null;
  vision: string | null;
  mission: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  facebook: string | null;
  messenger: string | null;
  instagram: string | null;
  maps_link: string | null;
  maps_embed: string | null;
  operating_hours: string | null;
  rental_rate: string | null;
  currency: string | null;
  number_of_courts: number | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  glass_opacity: number | null;
  overlay_opacity: number | null;
  theme_mode: string | null;
  hero_background: string | null;
  login_background: string | null;
  register_background: string | null;
  dashboard_background: string | null;
  booking_background: string | null;
  wallet_background: string | null;
  contact_background: string | null;
  about_background: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_cta_link: string | null;
  sections: Record<string, boolean> | null;
  faqs: FaqItem[] | null;
  facility_rules: string[] | null;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  category: string | null;
  title: string | null;
  description: string | null;
  is_cover: boolean;
  display_order: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string | null;
  is_admin: boolean;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
