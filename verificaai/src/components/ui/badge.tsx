import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "warn" | "danger" | "info" | "ok";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
