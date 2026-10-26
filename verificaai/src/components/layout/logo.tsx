import { appConfig } from "@/lib/config";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M8 10h9M8 15h6M8 20h4" stroke="var(--accent-fg)" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
      <path d="m15.5 18.5 3.5 3.5 6-9" stroke="var(--accent-fg)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">{appConfig.name}</span>
    </span>
  );
}
