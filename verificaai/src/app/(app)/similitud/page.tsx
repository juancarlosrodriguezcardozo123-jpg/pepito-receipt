import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getEffectivePlan } from "@/server/quotas";
import { integrationStatus } from "@/server/services/integrations";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Uploader } from "@/components/upload/uploader";
import { SimilarityForm } from "@/components/analysis/similarity-form";

export const metadata = { title: "Similitud" };

export default async function Page(props: PageProps<"/similitud">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const [documents, collections, plan] = await Promise.all([
    db.document.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, wordCount: true }, take: 500 }),
    db.sourceCollection.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { _count: { select: { documents: true } } } }),
    getEffectivePlan(user.id),
  ]);
  const status = integrationStatus();
  const initial = typeof sp.documento === "string" && documents.some((d) => d.id === sp.documento) ? sp.documento : undefined;

  return (
    <>
      <PageHeader
        title="Verificador de similitud"
        description="Localiza fragmentos coincidentes con tus otros documentos y con colecciones autorizadas. La similitud no es, por sí sola, prueba de plagio."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Nuevo análisis" />
          <CardBody>
            {documents.length === 0 ? (
              <>
                <p className="mb-4 text-sm text-muted">Primero sube o pega el texto que quieres analizar.</p>
                <Uploader next="similitud" maxMb={plan.maxFileSizeMb} />
              </>
            ) : (
              <SimilarityForm
                documents={documents}
                collections={collections.map((c) => ({ id: c.id, name: c.name, count: c._count.documents, isDemo: c.isDemo }))}
                initialDocumentId={initial}
                external={{ configured: status.search.configured, name: status.search.name, allowed: plan.allowExternal }}
              />
            )}
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Cómo se calcula" />
          <CardBody className="space-y-3 text-sm text-muted">
            <p><strong className="text-fg">Coincidencias exactas:</strong> secuencias de al menos 8 palabras idénticas, sin distinguir mayúsculas, tildes ni puntuación.</p>
            <p><strong className="text-fg">Coincidencias aproximadas:</strong> oraciones que comparten la mayor parte de su vocabulario con una oración de la fuente (coeficiente de Dice ≥ 0,6).</p>
            <p><strong className="text-fg">Porcentaje:</strong> palabras del documento que forman parte de alguna coincidencia, divididas entre el total de palabras. Cada palabra se cuenta una sola vez.</p>
            <p><strong className="text-fg">Clasificación:</strong> los fragmentos entre comillas se marcan como <em>cita</em>, y los que están bajo un encabezado de bibliografía, como <em>referencia</em>. El resto queda <em>sin clasificar</em>.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
