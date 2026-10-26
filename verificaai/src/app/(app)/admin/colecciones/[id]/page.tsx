import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { deleteSourceDocumentAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { AddSourceForm } from "@/components/admin/collection-forms";
import { fmtDate, fmtNum } from "@/lib/format";

export const metadata = { title: "Colección" };

export default async function Page(props: PageProps<"/admin/colecciones/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const c = await db.sourceCollection.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, author: true, url: true, wordCount: true, createdAt: true } } },
  });
  if (!c) notFound();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/colecciones" className="text-muted hover:text-fg">← Colecciones</Link></p>
      <PageHeader title={c.name} description={c.description ?? undefined} />
      <Card className="mb-6">
        <CardHeader title="Añadir documento fuente" />
        <CardBody><AddSourceForm collectionId={c.id} /></CardBody>
      </Card>
      <Card>
        <CardHeader title={`Documentos (${c.documents.length})`} />
        {c.documents.length === 0 ? (
          <EmptyState title="La colección está vacía" />
        ) : (
          <ul className="divide-y divide-border">
            {c.documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="truncate text-xs text-muted">
                    {d.author && `${d.author} · `}{fmtNum(d.wordCount)} palabras · {fmtDate(d.createdAt)}{d.url && ` · ${d.url}`}
                  </p>
                </div>
                <form action={deleteSourceDocumentAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <ConfirmButton size="sm" confirmText={`¿Eliminar «${d.title}» de la colección?`}>Eliminar</ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
