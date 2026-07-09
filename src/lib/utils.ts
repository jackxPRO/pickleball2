import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Philippine Peso (or a configured currency). */
export function formatCurrency(value: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

/** Format an ISO date/time string for display. */
export function formatDate(value: string | Date, withTime = false) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(d);
}

/** Convert "HH:MM:SS" or "HH:MM" to a friendly "7:00 AM". */
export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Build hourly slot labels between two hours (24h ints). */
export function buildHourlySlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** Human-friendly relative time (e.g. "3h ago"). */
export function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Extract a readable message from unknown errors (incl. Supabase). */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}

/** Derive a short location tagline (e.g. "Kiblawan") from a full address. */
export function cityFromAddress(address?: string | null): string | undefined {
  if (!address) return undefined;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0];
}

/** Build a 1-2 letter monogram from a business name (e.g. "5 Point" -> "5P"). */
export function monogram(name?: string | null): string {
  if (!name) return "5P";
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("");
  return letters.slice(0, 2).toUpperCase() || "5P";
}
