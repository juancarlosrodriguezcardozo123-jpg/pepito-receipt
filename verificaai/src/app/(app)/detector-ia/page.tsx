import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getEffectivePlan } from "@/server/quotas";
import { integrationStatus } from "@/server/services/integrations";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Uploader } from "@/components/upload/uploader";
import { AiForm } from "@/components/analysis/ai-form";
import { ExperimentalBadge } from "@/components/analysis/badges";

export const metadata = { title: "Detector de IA" };

export default async function Page(props: PageProps<"/detector-ia">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const [documents, plan] = await Promise.all([
    db.document.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, wordCount: true }, take: 500 }),
    getEffectivePlan(user.id),
  ]);
  const { ai } = integrationStatus();
  const initial = typeof sp.documento === "string" && documents.some((d) => d.id === sp.documento) ? sp.documento : undefined;

  return (
    <>
      <PageHeader
        title="Detector de escritura asistida por IA"
        description="Estima señales asociadas a texto generado o asistido por IA. Los resultados son orientativos y no prueban la autoría."
      />
      {ai.configured ? (
        <Alert tone="ok" className="mb-6" title={`Detector especializado disponible: ${ai.name}`}>
          {plan.allowExternal
            ? "Para usarlo tendrás que autorizar el envío del documento al proveedor."
            : "Tu plan actual no incluye el detector externo. Se realizará solo el análisis experimental."}
        </Alert>
      ) : (
        <Alert tone="warn" className="mb-6" title="Análisis avanzado todavía no disponible">
          No hay ningún detector de IA especializado configurado, así que no se mostrará ningún porcentaje de IA. Puedes
          ejecutar el <strong>análisis lingüístico experimental</strong>, que describe rasgos medibles del estilo sin
          atribuir autoría.
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Nuevo análisis" />
          <CardBody>
            {documents.length === 0 ? (
              <>
                <p className="mb-4 text-sm text-muted">Primero sube o pega el texto que quieres analizar.</p>
                <Uploader next="detector-ia" maxMb={plan.maxFileSizeMb} />
              </>
            ) : (
              <AiForm documents={documents} initialDocumentId={initial} detector={{ configured: ai.configured, name: ai.name, allowed: plan.allowExternal }} />
            )}
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Qué se analiza" action={<ExperimentalBadge />} />
          <CardBody className="space-y-3 text-sm text-muted">
            <p>El análisis experimental mide, por párrafo y para el documento completo:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>la variación en la longitud de las oraciones,</li>
              <li>la diversidad léxica (MTLD),</li>
              <li>la repetición de secuencias de palabras,</li>
              <li>la densidad de conectores formulaicos,</li>
              <li>la uniformidad en la extensión de los párrafos.</li>
            </ul>
            <p>No es un modelo entrenado y no da una probabilidad. Los estilos formales humanos pueden mostrar las mismas señales.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
