import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listDocuments } from "@/server/services/documents";
import { getEffectivePlan } from "@/server/quotas";
import { deleteDocumentAction } from "@/app/actions/documents";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Uploader } from "@/components/upload/uploader";
import { IconFile, IconSearch, IconTrash, IconUpload } from "@/components/ui/icons";
import { DemoBadge } from "@/components/analysis/badges";
import { fmtBytes, fmtDate, fmtDay, fmtNum } from "@/lib/format";
import { MIME_LABEL } from "@/lib/labels";

export const metadata = { title: "Documentos" };

export default async function Page(props: PageProps<"/documentos">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const type = typeof sp.tipo === "string" ? sp.tipo : "";
  const sort = typeof sp.orden === "string" ? sp.orden : "";
  const [docs, plan] = await Promise.all([listDocuments(user.id, { q, type, sort }), getEffectivePlan(user.id)]);
  const filtered = Boolean(q || type);

  return (
    <>
      <PageHeader title="Documentos" description="Tus documentos solo son accesibles para ti. Eliminar un documento borra también sus análisis e informes." />
      {sp.eliminado && <Alert tone="ok" className="mb-4">Documento eliminado de forma segura.</Alert>}

      <details className="group mb-6 rounded-xl border border-border bg-surface" open={docs.length === 0 && !filtered}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium">
          <IconUpload className="text-accent" /> Subir documento o pegar texto
        </summary>
        <div className="border-t border-border px-5 py-4">
          <Uploader maxMb={plan.maxFileSizeMb} />
        </div>
      </details>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-48 flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={q} placeholder="Buscar por título" className="pl-9" aria-label="Buscar documentos" />
        </div>
        <Select name="tipo" defaultValue={type} className="w-auto" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="txt">TXT / texto pegado</option>
        </Select>
        <Select name="orden" defaultValue={sort} className="w-auto" aria-label="Ordenar">
          <option value="">Más recientes</option>
          <option value="antiguos">Más antiguos</option>
          <option value="titulo">Título (A-Z)</option>
        </Select>
        <Button variant="secondary" type="submit">Aplicar</Button>
      </form>

      <Card>
        {docs.length === 0 ? (
          <EmptyState
            icon={<IconFile />}
            title={filtered ? "No hay resultados" : "Todavía no hay documentos"}
            description={filtered ? "Prueba con otra búsqueda o quita los filtros." : "Sube un PDF, DOCX o TXT, o pega un texto."}
            action={filtered ? <Link href="/documentos" className="text-sm text-accent hover:underline">Quitar filtros</Link> : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <Link href={`/documentos/${d.id}`} className="min-w-0 flex-1 basis-60">
                  <p className="truncate font-medium hover:text-accent">{d.title}</p>
                  <p className="text-xs text-muted">
                    {MIME_LABEL[d.mimeType]} · {fmtBytes(d.sizeBytes)} · {fmtNum(d.wordCount)} palabras · {fmtDate(d.createdAt)}
                    {d.retentionUntil && ` · se elimina el ${fmtDay(d.retentionUntil)}`}
                  </p>
                </Link>
                {d.isDemo && <DemoBadge />}
                <span className="text-xs text-muted">{d._count.analyses} análisis</span>
                <form action={deleteDocumentAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <ConfirmButton size="sm" variant="ghost" confirmText={`¿Eliminar «${d.title}» y todos sus análisis? Esta acción no se puede deshacer.`} aria-label={`Eliminar ${d.title}`}>
                    <IconTrash />
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {docs.length > 0 && <CardBody className="px-1 text-xs text-muted">{docs.length} documento(s)</CardBody>}
    </>
  );
}
