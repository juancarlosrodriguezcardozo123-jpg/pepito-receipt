import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getUsageSummary } from "@/server/quotas";
import { listDocuments } from "@/server/services/documents";
import { listAnalyses } from "@/server/services/analyses";
import { integrationStatus } from "@/server/services/integrations";
import { db } from "@/server/db/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Uploader } from "@/components/upload/uploader";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { IconFile, IconHistory } from "@/components/ui/icons";
import { DemoBadge, resultLabel, TypeBadge } from "@/components/analysis/badges";
import { fmtDate, fmtNum } from "@/lib/format";
import { MIME_LABEL } from "@/lib/labels";

export const metadata = { title: "Panel" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default async function Page() {
  const user = await requireUser();
  const [usage, docs, analyses, simAgg] = await Promise.all([
    getUsageSummary(user.id),
    listDocuments(user.id),
    listAnalyses(user.id, { take: 6 }),
    db.analysis.aggregate({ where: { userId: user.id, type: "SIMILARITY", status: "COMPLETED" }, _avg: { score: true }, _count: true }),
  ]);
  const status = integrationStatus();

  return (
    <>
      <PageHeader title={`Hola, ${user.name.split(" ")[0]}`} description="Sube un documento o pega un texto para empezar un análisis." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Documentos" value={fmtNum(usage.documents)} hint={`de ${fmtNum(usage.plan.maxDocuments)} en tu plan`} />
        <Stat label="Análisis este mes" value={fmtNum(usage.analysesThisMonth)} hint={`de ${fmtNum(usage.plan.monthlyAnalyses)} disponibles`} />
        <Stat label="Análisis de similitud" value={fmtNum(simAgg._count)} />
        <Stat
          label="Similitud media"
          value={simAgg._avg.score !== null ? `${simAgg._avg.score.toFixed(1)} %` : "—"}
          hint="en análisis completados"
        />
      </div>

      {!status.ai.configured && (
        <Alert tone="info" className="mb-6" title="Detector de IA especializado no configurado">
          Puedes hacer análisis de similitud y el análisis lingüístico experimental. El indicador de IA aparecerá cuando un
          administrador configure un proveedor.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Nuevo documento" description="El texto se extrae en el servidor y el archivo se guarda cifrado." />
          <CardBody>
            <Uploader maxMb={usage.plan.maxFileSizeMb} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Análisis recientes" action={<Link href="/analisis" className="text-sm text-accent hover:underline">Ver todos</Link>} />
          {analyses.length === 0 ? (
            <EmptyState icon={<IconHistory />} title="Aún no hay análisis" description="Cuando analices un documento aparecerá aquí." />
          ) : (
            <ul className="divide-y divide-border">
              {analyses.map((a) => (
                <li key={a.id}>
                  <Link href={`/analisis/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.document.title}</p>
                      <p className="text-xs text-muted">{fmtDate(a.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <TypeBadge type={a.type} />
                      <span className="text-xs tabular-nums text-muted">{resultLabel(a)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Documentos recientes" action={<Link href="/documentos" className="text-sm text-accent hover:underline">Ver todos</Link>} />
        {docs.length === 0 ? (
          <EmptyState icon={<IconFile />} title="No tienes documentos" description="Sube tu primer documento con el formulario de arriba." />
        ) : (
          <ul className="divide-y divide-border">
            {docs.slice(0, 5).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Link href={`/documentos/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium hover:text-accent">{d.title}</p>
                  <p className="text-xs text-muted">
                    {MIME_LABEL[d.mimeType]} · {fmtNum(d.wordCount)} palabras · {fmtDate(d.createdAt)}
                  </p>
                </Link>
                {d.isDemo && <DemoBadge />}
                <div className="flex gap-2">
                  <ButtonLink href={`/similitud?documento=${d.id}`} size="sm" variant="secondary">Similitud</ButtonLink>
                  <ButtonLink href={`/detector-ia?documento=${d.id}`} size="sm" variant="secondary">IA</ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
