import type { getOwnedAnalysis } from "@/server/services/analyses";
import type { LinguisticResult, SignalLevel } from "@/server/ai-detection/linguistic";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "./highlighted-text";
import { BigNumber, ScoreBar } from "./score";
import { ExperimentalBadge } from "./badges";
import { LIMITATIONS } from "@/lib/labels";

type Analysis = Awaited<ReturnType<typeof getOwnedAnalysis>>;
type Details = { linguistic: LinguisticResult; providerParagraphs: { index: number; score: number; start: number; end: number }[] };

const levelTone = { baja: "neutral", moderada: "info", notable: "warn" } as const satisfies Record<SignalLevel, string>;

export function AiResult({ analysis: a }: { analysis: Analysis }) {
  const d = a.details as unknown as Details;
  const l = d.linguistic;
  const hasProvider = a.status === "COMPLETED" && a.score !== null;
  const highlights = hasProvider
    ? d.providerParagraphs.filter((p) => p.score >= 50).map((p) => ({ start: p.start, end: p.end, className: "hl-AI", title: `Indicador del proveedor: ${p.score}/100` }))
    : l.paragraphs.filter((p) => p.flagged).map((p) => ({
        start: p.start,
        end: p.end,
        className: "hl-AI",
        title: p.signals.filter((s) => s.level === "notable").map((s) => s.label).join(" · "),
      }));

  return (
    <div className="space-y-6">
      {hasProvider ? (
        <Card>
          <CardBody className="grid gap-6 py-6 sm:grid-cols-[auto,1fr] sm:items-center">
            <BigNumber value={a.score!.toFixed(0)} suffix="/100" caption={`Indicador de señales de IA · ${a.provider}`} />
            <div className="space-y-3">
              <ScoreBar value={a.score!} tone="warn" />
              <p className="text-sm text-muted">
                Es la estimación del detector especializado. <strong className="text-fg">No equivale al porcentaje del texto escrito por IA</strong> ni prueba
                la autoría. Los falsos positivos son posibles, sobre todo en textos formales, de autores no nativos o muy editados.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Alert tone={a.status === "FAILED" ? "danger" : "warn"} title={a.status === "FAILED" ? "El detector especializado falló" : "Análisis avanzado no disponible"}>
          {a.errorMessage} No se muestra ningún porcentaje de IA. Abajo tienes el análisis lingüístico experimental.
        </Alert>
      )}

      <Card>
        <CardHeader title="Análisis lingüístico" description={l.summary} action={<ExperimentalBadge />} />
        <ul className="divide-y divide-border">
          {l.documentSignals.map((s) => (
            <li key={s.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr,auto] sm:gap-4">
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted">{s.explanation}</p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-sm tabular-nums">{s.display}</span>
                <Badge tone={levelTone[s.level]}>Señal {s.level}</Badge>
              </div>
            </li>
          ))}
        </ul>
        <CardBody className="border-t border-border text-xs text-muted">
          {l.words.toLocaleString("es")} palabras · {l.sentences} oraciones · {l.analyzedParagraphs} párrafos con 40 palabras o más ·{" "}
          {l.flaggedParagraphs} con varias señales notables a la vez. Los umbrales son heurísticos y no están calibrados.
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Fragmentos relevantes"
          description={
            hasProvider
              ? "Párrafos con un indicador del proveedor de 50 o más."
              : "Párrafos con dos o más señales estilométricas notables a la vez (experimental)."
          }
        />
        <CardBody>
          {highlights.length === 0 && <p className="mb-4 text-sm text-muted">Ningún fragmento supera el criterio de resaltado.</p>}
          <HighlightedText text={a.document.text} highlights={highlights} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Limitaciones" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {LIMITATIONS.AI_DETECTION.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
