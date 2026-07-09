/** App-wide constants. */

export const TOPUP_PRESETS = [300, 500, 1000, 2000] as const;

export const DEFAULT_OPEN_HOUR = 7; // 7:00 AM
export const DEFAULT_CLOSE_HOUR = 24; // 12:00 MN

export const GALLERY_CATEGORIES = [
  "All",
  "Courts",
  "Facilities",
  "Events",
  "Tournaments",
  "General",
] as const;

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  COMPLETED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  CANCELLED: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  REFUNDED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export const TOPUP_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/15 text-red-300 border-red-500/30",
};

export const TX_TYPE_STYLES: Record<string, string> = {
  TOPUP: "text-emerald-400",
  REFUND: "text-sky-400",
  BOOKING: "text-red-400",
  ADJUSTMENT: "text-amber-400",
};
