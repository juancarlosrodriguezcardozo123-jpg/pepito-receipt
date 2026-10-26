"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import {
  IconBug, IconChart, IconCompare, IconFile, IconHistory, IconHome, IconLayers, IconMenu, IconPlug, IconShield, IconSpark, IconUser, IconX,
} from "@/components/ui/icons";

const main = [
  { href: "/panel", label: "Panel", icon: IconHome },
  { href: "/documentos", label: "Documentos", icon: IconFile },
  { href: "/similitud", label: "Similitud", icon: IconCompare },
  { href: "/detector-ia", label: "Detector de IA", icon: IconSpark },
  { href: "/analisis", label: "Historial", icon: IconHistory },
  { href: "/cuenta", label: "Cuenta", icon: IconUser },
];

const admin = [
  { href: "/admin", label: "Resumen", icon: IconChart },
  { href: "/admin/usuarios", label: "Usuarios", icon: IconUser },
  { href: "/admin/planes", label: "Planes y cuotas", icon: IconLayers },
  { href: "/admin/colecciones", label: "Colecciones", icon: IconFile },
  { href: "/admin/integraciones", label: "Integraciones", icon: IconPlug },
  { href: "/admin/errores", label: "Errores", icon: IconBug },
];

function NavList({ items, pathname, onNavigate }: { items: typeof main; pathname: string; onNavigate: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
              )}
            >
              <Icon className={active ? "text-accent" : undefined} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ isAdmin, footer }: { isAdmin: boolean; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/panel" aria-label="Ir al panel">
          <Logo />
        </Link>
        <button className="rounded-lg p-2 text-muted lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <IconX />
        </button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
        <NavList items={main} pathname={pathname} onNavigate={close} />
        {isAdmin && (
          <div>
            <p className="mb-1.5 flex items-center gap-2 px-3 text-xs font-medium uppercase tracking-wider text-muted">
              <IconShield className="size-3.5" /> Administración
            </p>
            <NavList items={admin} pathname={pathname} onNavigate={close} />
          </div>
        )}
      </nav>
      <div className="border-t border-border p-3">{footer}</div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button className="-ml-2 rounded-lg p-2" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}>
          <IconMenu />
        </button>
        <Logo />
        <ThemeToggle />
      </header>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-surface lg:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-surface shadow-xl animate-fade-in">{content}</aside>
        </div>
      )}
    </>
  );
}
