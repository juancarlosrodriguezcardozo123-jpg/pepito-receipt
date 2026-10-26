import { requireUser } from "@/server/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/app/actions/auth";
import { IconLogout } from "@/components/ui/icons";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const footer = (
    <div className="flex items-center gap-2">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
        {user.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <span className="hidden lg:block">
        <ThemeToggle />
      </span>
      <form action={logoutAction}>
        <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Cerrar sesión" title="Cerrar sesión">
          <IconLogout />
        </button>
      </form>
    </div>
  );
  return (
    <div className="min-h-screen">
      <Sidebar isAdmin={user.role === "ADMIN"} footer={footer} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 animate-fade-in sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
