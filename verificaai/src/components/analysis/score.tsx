import { cn } from "@/lib/cn";

export function ScoreBar({ value, tone = "warn", label }: { value: number; tone?: "warn" | "info" | "accent" | "muted"; label?: string }) {
  const bar = { warn: "bg-warn", info: "bg-info", accent: "bg-accent", muted: "bg-border-strong" }[tone];
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between gap-3 text-xs text-muted">
          <span>{label}</span>
          <span className="shrink-0 tabular-nums">{value.toFixed(1)} %</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn("h-full rounded-full transition-[width] duration-700", bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

export function BigNumber({ value, suffix = "%", caption, className }: { value: number | string; suffix?: string; caption: string; className?: string }) {
  return (
    <div className={className}>
      <p className="font-serif text-5xl tabular-nums tracking-tight">
        {value}
        <span className="ml-1 text-2xl text-muted">{suffix}</span>
      </p>
      <p className="mt-1 text-sm text-muted">{caption}</p>
    </div>
  );
}
