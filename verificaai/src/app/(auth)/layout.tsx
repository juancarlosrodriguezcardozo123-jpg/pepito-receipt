import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="Inicio">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-14">
        <div className="w-full max-w-sm animate-fade-in">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted">
        <Link href="/privacidad" className="hover:text-fg">
          Privacidad y retención de datos
        </Link>
      </footer>
    </div>
  );
}
