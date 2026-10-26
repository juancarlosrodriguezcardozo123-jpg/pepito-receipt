import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { USAGE } from "@/server/quotas";
import { updateUserAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Usuarios" };

export default async function Page(props: PageProps<"/admin/usuarios">) {
  const admin = await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [users, plans] = await Promise.all([
    db.user.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, name: true, email: true, role: true, disabled: true, planId: true, createdAt: true, lastLoginAt: true,
        _count: { select: { documents: true, usage: { where: { kind: { in: [USAGE.similarity, USAGE.ai] }, createdAt: { gte: monthStart } } } } },
      },
    }),
    db.plan.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Usuarios" description="Roles, planes y estado de las cuentas." />
      <form className="mb-4 flex gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" />
        <Button variant="secondary" type="submit">Buscar</Button>
      </form>
      <Card>
        {users.length === 0 ? (
          <EmptyState title="Sin resultados" />
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="px-5 py-4">
                <form action={updateUserAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={u.id} />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-medium">
                      {u.name} {u.id === admin.id && <Badge tone="accent">Tú</Badge>} {u.disabled && <Badge tone="danger">Desactivado</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {u.email} · alta {fmtDate(u.createdAt)} · {u._count.documents} doc. · {u._count.usage} análisis este mes
                      {u.lastLoginAt && ` · último acceso ${fmtDate(u.lastLoginAt)}`}
                    </p>
                  </div>
                  <Select name="role" defaultValue={u.role} className="w-auto" aria-label="Rol">
                    <option value="USER">Usuario</option>
                    <option value="ADMIN">Administrador</option>
                  </Select>
                  <Select name="planId" defaultValue={u.planId ?? ""} className="w-auto" aria-label="Plan">
                    <option value="">Plan por defecto</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="disabled" defaultChecked={u.disabled} className="size-4 accent-[var(--accent)]" /> Desactivar
                  </label>
                  <SubmitButton size="sm" variant="secondary">Guardar</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
