import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { listAnalyses } from "@/server/services/analyses";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { IconDownload, IconHistory, IconSearch } from "@/components/ui/icons";
import { resultLabel, StatusBadge, TypeBadge } from "@/components/analysis/badges";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Historial" };

export default async function Page(props: PageProps<"/analisis">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const type = typeof sp.tipo === "string" ? sp.tipo : "";
  const status = typeof sp.estado === "string" ? sp.estado : "";
  const analyses = await listAnalyses(user.id, { q, type, status });
  const filtered = Boolean(q || type || status);

  return (
    <>
      <PageHeader title="Historial de análisis" description="Todos tus análisis, con fecha y hora. Puedes volver a abrirlos o descargar su informe." />
      {sp.eliminado && <Alert tone="ok" className="mb-4">Análisis eliminado.</Alert>}
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-48 flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={q} placeholder="Buscar por documento" className="pl-9" aria-label="Buscar análisis" />
        </div>
        <Select name="tipo" defaultValue={type} className="w-auto" aria-label="Tipo">
          <option value="">Todos los tipos</option>
          <option value="SIMILARITY">Similitud</option>
          <option value="AI_DETECTION">Detector de IA</option>
        </Select>
        <Select name="estado" defaultValue={status} className="w-auto" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="COMPLETED">Completado</option>
          <option value="UNAVAILABLE">Avanzado no disponible</option>
          <option value="FAILED">Con errores</option>
        </Select>
        <Button variant="secondary" type="submit">Aplicar</Button>
      </form>
      <Card>
        {analyses.length === 0 ? (
          <EmptyState
            icon={<IconHistory />}
            title={filtered ? "No hay resultados" : "Aún no hay análisis"}
            action={filtered ? <Link href="/analisis" className="text-sm text-accent hover:underline">Quitar filtros</Link> : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {analyses.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <Link href={`/analisis/${a.id}`} className="min-w-0 flex-1 basis-56">
                  <p className="truncate font-medium hover:text-accent">{a.document.title}</p>
                  <p className="text-xs text-muted">{fmtDate(a.createdAt)}</p>
                </Link>
                <div className="flex gap-1.5"><TypeBadge type={a.type} /><StatusBadge status={a.status} /></div>
                <span className="w-36 text-right text-sm tabular-nums">{resultLabel(a)}</span>
                <a href={`/api/analyses/${a.id}/report`} className={buttonClasses("ghost", "sm")} aria-label="Descargar informe PDF" title="Descargar informe PDF">
                  <IconDownload />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
