import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 select-none",
    "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-accent text-accent-fg hover:bg-accent-hover",
    variant === "secondary" && "border border-border-strong bg-surface text-fg hover:bg-surface-2",
    variant === "ghost" && "text-muted hover:text-fg hover:bg-surface-2",
    variant === "danger" && "border border-danger/40 text-danger hover:bg-danger-soft",
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
