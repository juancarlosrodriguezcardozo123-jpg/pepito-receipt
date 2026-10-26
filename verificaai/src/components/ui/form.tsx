import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10 pr-8", className)} {...props} />;
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, description, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" {...props} />
      <span>
        <span className="font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-muted">{description}</span>}
      </span>
    </label>
  );
}
