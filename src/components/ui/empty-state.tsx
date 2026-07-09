import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-2xl bg-white/5 p-4">
          <Icon className="h-8 w-8 text-secondary" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-white/60">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
