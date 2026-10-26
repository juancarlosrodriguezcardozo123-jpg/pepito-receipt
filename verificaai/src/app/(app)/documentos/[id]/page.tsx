import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getOwnedDocument } from "@/server/services/documents";
import { listAnalyses } from "@/server/services/analyses";
import { orNotFound } from "@/server/services/not-found";
import { deleteDocumentAction } from "@/app/actions/documents";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconDownload, IconHistory, IconTrash } from "@/components/ui/icons";
import { DemoBadge, resultLabel, StatusBadge, TypeBadge } from "@/components/analysis/badges";
import { fmtBytes, fmtDate, fmtDay, fmtNum } from "@/lib/format";
import { MIME_LABEL } from "@/lib/labels";

export const metadata = { title: "Documento" };

export default async function Page(props: PageProps<"/documentos/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const doc = await orNotFound(getOwnedDocument(user.id, id));
  const analyses = (await listAnalyses(user.id)).filter((a) => a.document.id === doc.id);
  const preview = doc.text.length > 4000;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/documentos" className="text-muted hover:text-fg">← Documentos</Link></p>
      <PageHeader
        title={doc.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {MIME_LABEL[doc.mimeType]} · {fmtBytes(doc.sizeBytes)} · {fmtNum(doc.wordCount)} palabras · subido el {fmtDate(doc.createdAt)}
            {doc.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/similitud?documento=${doc.id}`}>Analizar similitud</ButtonLink>
            <ButtonLink href={`/detector-ia?documento=${doc.id}`} variant="secondary">Detector de IA</ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Texto extraído" description="Este es el texto que se usa en los análisis." />
          <CardBody>
            <div className="whitespace-pre-wrap break-words font-serif text-[15px] leading-7">
              {preview ? doc.text.slice(0, 4000) + "…" : doc.text}
            </div>
            {preview && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-accent">Mostrar el texto completo</summary>
                <div className="mt-3 whitespace-pre-wrap break-words font-serif text-[15px] leading-7">{doc.text.slice(4000)}</div>
              </details>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Análisis de este documento" />
            {analyses.length === 0 ? (
              <EmptyState icon={<IconHistory />} title="Sin análisis" description="Ejecuta un análisis con los botones superiores." />
            ) : (
              <ul className="divide-y divide-border">
                {analyses.map((a) => (
                  <li key={a.id}>
                    <Link href={`/analisis/${a.id}`} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-surface-2/50">
                      <span className="space-y-1">
                        <span className="flex gap-1.5"><TypeBadge type={a.type} /><StatusBadge status={a.status} /></span>
                        <span className="block text-xs text-muted">{fmtDate(a.createdAt)}</span>
                      </span>
                      <span className="text-sm tabular-nums">{resultLabel(a)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Archivo y privacidad" />
            <CardBody className="space-y-3 text-sm">
              <p className="text-muted">Archivo original: {doc.originalName}</p>
              {doc.retentionUntil && <p className="text-muted">Se eliminará automáticamente el {fmtDay(doc.retentionUntil)}.</p>}
              {doc.storageKey ? (
                <a href={`/api/documents/${doc.id}/original`} className={buttonClasses("secondary", "sm")}>
                  <IconDownload /> Descargar original
                </a>
              ) : (
                <p className="text-xs text-muted">No se almacenó el archivo original (texto pegado o almacenamiento cifrado no configurado).</p>
              )}
              <form action={deleteDocumentAction}>
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="redirect" value="1" />
                <ConfirmButton size="sm" confirmText="¿Eliminar este documento, sus análisis e informes? No se puede deshacer.">
                  <IconTrash /> Eliminar documento
                </ConfirmButton>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
