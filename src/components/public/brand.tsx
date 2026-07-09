import { cn, monogram } from "@/lib/utils";

/**
 * Brand mark: a gold "5P" monogram badge + two-line business name / tagline.
 * Falls back to a text mark when no logo image is configured.
 */
export function Brand({
  name,
  tagline,
  logo,
  className,
  badgeClassName,
  invertText = false,
}: {
  name: string;
  tagline?: string;
  logo?: string | null;
  className?: string;
  badgeClassName?: string;
  invertText?: boolean;
}) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logo}
        alt={name}
        className={cn("h-10 w-10 shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary-light to-secondary-dark font-display text-sm font-extrabold text-black shadow-glow",
          badgeClassName
        )}
      >
        {monogram(name)}
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-base font-extrabold",
            invertText ? "text-black" : "text-white"
          )}
        >
          {name}
        </span>
        {tagline && (
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
            {tagline}
          </span>
        )}
      </span>
    </div>
  );
}
