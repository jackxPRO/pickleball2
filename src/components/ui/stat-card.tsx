import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/60">{label}</p>
        {Icon && (
          <div className="rounded-xl bg-secondary/10 p-2">
            <Icon className="h-5 w-5 text-secondary" />
          </div>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}
