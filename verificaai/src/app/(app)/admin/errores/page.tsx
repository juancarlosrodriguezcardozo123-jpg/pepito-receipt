import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { clearErrorsAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Errores del sistema" };

export default async function Page() {
  await requireAdmin();
  const errors = await db.systemError.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader
        title="Errores del sistema"
        description="Errores internos registrados (los usuarios solo ven un mensaje genérico)."
        actions={
          <form action={clearErrorsAction}>
            <ConfirmButton size="sm" confirmText="¿Borrar los errores de más de 24 horas?">Borrar antiguos</ConfirmButton>
          </form>
        }
      />
      <Card>
        {errors.length === 0 ? (
          <EmptyState title="Sin errores registrados" />
        ) : (
          <ul className="divide-y divide-border">
            {errors.map((e) => (
              <li key={e.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="danger">{e.scope}</Badge>
                  <span className="text-xs text-muted">{fmtDate(e.createdAt)}{e.userId && ` · usuario ${e.userId}`}</span>
                </div>
                <p className="mt-1 break-words text-sm">{e.message}</p>
                {e.stack && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">Traza</summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">{e.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
