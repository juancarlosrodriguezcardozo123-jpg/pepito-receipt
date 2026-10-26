import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconAlert, IconCheck, IconInfo } from "./icons";

type Tone = "info" | "warn" | "danger" | "ok";
const styles: Record<Tone, string> = {
  info: "bg-info-soft text-info",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  ok: "bg-ok-soft text-ok",
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const Icon = tone === "ok" ? IconCheck : tone === "info" ? IconInfo : IconAlert;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg px-4 py-3 text-sm", styles[tone], className)}>
      <Icon className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-fg/85 dark:text-fg/80">{children}</div>}
      </div>
    </div>
  );
}
