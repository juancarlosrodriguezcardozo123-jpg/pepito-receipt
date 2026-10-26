import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getOwnedAnalysis } from "@/server/services/analyses";
import { orNotFound } from "@/server/services/not-found";
import { deleteAnalysisAction } from "@/app/actions/analyses";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { IconDownload, IconTrash } from "@/components/ui/icons";
import { DemoBadge, StatusBadge, TypeBadge } from "@/components/analysis/badges";
import { SimilarityResult } from "@/components/analysis/similarity-result";
import { AiResult } from "@/components/analysis/ai-result";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Resultado del análisis" };

export default async function Page(props: PageProps<"/analisis/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const a = await orNotFound(getOwnedAnalysis(user.id, id));

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/analisis" className="text-muted hover:text-fg">← Historial</Link></p>
      <PageHeader
        title={a.document.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={a.type} /> <StatusBadge status={a.status} /> {a.document.isDemo && <DemoBadge />}
            <span>Analizado el {fmtDate(a.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <a href={`/api/analyses/${a.id}/report`} className={buttonClasses("primary")}>
              <IconDownload /> Descargar informe PDF
            </a>
            <form action={deleteAnalysisAction}>
              <input type="hidden" name="id" value={a.id} />
              <ConfirmButton confirmText="¿Eliminar este análisis? El documento se conserva." aria-label="Eliminar análisis">
                <IconTrash />
              </ConfirmButton>
            </form>
          </>
        }
      />
      {a.type === "SIMILARITY" ? <SimilarityResult analysis={a} /> : <AiResult analysis={a} />}
      <p className="mt-8 border-t border-border pt-4 text-xs text-muted">
        Método: {a.method}. Versión del motor: {a.engineVersion}. Estos resultados son indicadores automáticos y requieren
        interpretación humana. No constituyen prueba de plagio ni de autoría.
      </p>
    </>
  );
}
