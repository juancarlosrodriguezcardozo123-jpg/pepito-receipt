import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { deleteCollectionAction, toggleCollectionAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateCollectionForm } from "@/components/admin/collection-forms";

export const metadata = { title: "Colecciones autorizadas" };

export default async function Page() {
  await requireAdmin();
  const collections = await db.sourceCollection.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { documents: true } } } });
  return (
    <>
      <PageHeader title="Colecciones autorizadas" description="Corpus documentales con los que los usuarios pueden comparar sus trabajos (p. ej. repositorio institucional, trabajos de cursos anteriores con permiso)." />
      <Card className="mb-6">
        <CardHeader title="Nueva colección" />
        <CardBody><CreateCollectionForm /></CardBody>
      </Card>
      <Card>
        {collections.length === 0 ? (
          <EmptyState title="No hay colecciones" />
        ) : (
          <ul className="divide-y divide-border">
            {collections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Link href={`/admin/colecciones/${c.id}`} className="min-w-0 flex-1 basis-56">
                  <p className="font-medium hover:text-accent">{c.name}</p>
                  <p className="text-xs text-muted">{c._count.documents} documento(s){c.description && ` · ${c.description}`}</p>
                </Link>
                {c.isDemo && <Badge>Demostración</Badge>}
                <Badge tone={c.isActive ? "ok" : "neutral"}>{c.isActive ? "Activa" : "Inactiva"}</Badge>
                <form action={toggleCollectionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button size="sm" variant="secondary" type="submit">{c.isActive ? "Desactivar" : "Activar"}</Button>
                </form>
                <form action={deleteCollectionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton size="sm" confirmText={`¿Eliminar la colección «${c.name}» y sus documentos?`}>Eliminar</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
