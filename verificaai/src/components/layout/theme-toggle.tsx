"use client";

import { IconMoon, IconSun } from "@/components/ui/icons";

export function ThemeToggle() {
  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label="Cambiar entre modo claro y oscuro"
      title="Modo claro / oscuro"
    >
      <IconMoon className="dark:hidden" />
      <IconSun className="hidden dark:block" />
    </button>
  );
}

/** Script en línea que aplica el tema antes del primer pintado (evita el parpadeo). */
export const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;
