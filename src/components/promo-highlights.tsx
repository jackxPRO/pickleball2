import { Tag } from "lucide-react";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { PricingRule } from "@/types/database";

/** Discounted (effective) hourly rate for a pricing rule. */
function effectiveRate(r: PricingRule) {
  const disc = Number(r.discount_pct ?? 0);
  return Number(r.rate) * (1 - disc / 100);
}

/**
 * Presentational list of active PROMO pricing rules, including their scheduled
 * dates and discounted price. Renders nothing when there are no promos.
 */
export function PromoHighlights({
  promos,
  currency,
  title = "Active promotions",
  className,
}: {
  promos: PricingRule[];
  currency: string;
  title?: string;
  className?: string;
}) {
  const active = promos.filter(
    (p) => p.rule_type === "PROMO" && p.active !== false
  );
  if (active.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-secondary/30 bg-secondary/10 p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 text-secondary">
        <Tag className="h-4 w-4" />
        <h3 className="font-display text-sm font-semibold">{title}</h3>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {active.map((p) => {
          const discounted =
            p.discount_pct != null && Number(p.discount_pct) > 0;
          return (
            <div
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{p.name}</p>
                {discounted ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-black">
                    -{Number(p.discount_pct)}%
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                <span>
                  {p.start_time && p.end_time
                    ? `${formatTime(p.start_time)} – ${formatTime(p.end_time)}`
                    : "All day"}
                </span>
                <span className="flex items-center gap-1.5">
                  {discounted && (
                    <span className="text-white/40 line-through">
                      {formatCurrency(Number(p.rate), currency)}
                    </span>
                  )}
                  <span className="font-semibold text-secondary">
                    {formatCurrency(effectiveRate(p), currency)}/hr
                  </span>
                </span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                {p.start_date
                  ? `${formatDate(p.start_date)}${
                      p.end_date && p.end_date !== p.start_date
                        ? ` – ${formatDate(p.end_date)}`
                        : ""
                    }`
                  : "Every day"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
