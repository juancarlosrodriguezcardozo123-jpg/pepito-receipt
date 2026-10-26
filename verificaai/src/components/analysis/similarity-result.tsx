import type { getOwnedAnalysis } from "@/server/services/analyses";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { HighlightedText } from "./highlighted-text";
import { BigNumber, ScoreBar } from "./score";
import { CATEGORY_LABEL, KIND_LABEL, LIMITATIONS, SOURCE_TYPE_LABEL } from "@/lib/labels";
import { fmtNum } from "@/lib/format";

type Analysis = Awaited<ReturnType<typeof getOwnedAnalysis>>;
type Details = {
  totalWords: number;
  matchedWords: number;
  sourcesCompared: number;
  categoryWords: { QUOTE: number; REFERENCE: number; UNCLASSIFIED: number };
  bySource: { sourceKey: string; title: string; type: keyof typeof SOURCE_TYPE_LABEL; url: string | null; percent: number; words: number }[];
};

const catTone = { UNCLASSIFIED: "warn", QUOTE: "info", REFERENCE: "neutral" } as const;

export function SimilarityResult({ analysis: a }: { analysis: Analysis }) {
  const d = a.details as unknown as Details;
  return (
    <div className="space-y-6">
      {a.errorMessage && <Alert tone="warn">{a.errorMessage}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardBody className="space-y-5 py-6">
            <BigNumber value={(a.score ?? 0).toFixed(1)} caption="Similitud textual con las fuentes comparadas" />
            <div className="space-y-3">
              <ScoreBar value={a.scoreExcludingCitations ?? 0} label="Sin clasificar (excluye citas y referencias)" tone="warn" />
              <ScoreBar value={(d.categoryWords.QUOTE / (d.totalWords || 1)) * 100} label="En citas entre comillas" tone="info" />
              <ScoreBar value={(d.categoryWords.REFERENCE / (d.totalWords || 1)) * 100} label="En referencias bibliográficas" tone="muted" />
            </div>
            <p className="text-xs text-muted">
              {fmtNum(d.matchedWords)} de {fmtNum(d.totalWords)} palabras forman parte de alguna coincidencia · {d.sourcesCompared} fuente(s) comparada(s).
            </p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Fuentes coincidentes" description="Porcentaje de palabras del documento atribuidas a cada fuente." />
          {d.bySource.length === 0 ? (
            <EmptyState title="Sin coincidencias" description={a.summary ?? undefined} />
          ) : (
            <ul className="divide-y divide-border">
              {d.bySource.map((s) => (
                <li key={s.sourceKey} className="px-5 py-3">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-accent">{s.title}</a> : s.title}
                    </span>
                    <Badge>{SOURCE_TYPE_LABEL[s.type]}</Badge>
                    <span className="w-14 text-right text-sm tabular-nums">{s.percent.toFixed(1)} %</span>
                  </div>
                  <ScoreBar value={s.percent} tone="accent" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {a.summary && <p className="text-sm text-muted">{a.summary}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Documento con coincidencias resaltadas"
            description={
              <span className="flex flex-wrap gap-3 pt-1">
                <span className="flex items-center gap-1.5"><mark className="hl hl-UNCLASSIFIED">Abc</mark> sin clasificar</span>
                <span className="flex items-center gap-1.5"><mark className="hl hl-QUOTE">Abc</mark> cita</span>
                <span className="flex items-center gap-1.5"><mark className="hl hl-REFERENCE">Abc</mark> referencia</span>
              </span>
            }
          />
          <CardBody>
            <HighlightedText
              text={a.document.text}
              highlights={a.matches.map((m, i) => ({
                start: m.start,
                end: m.end,
                className: `hl-${m.category}`,
                id: `t-${m.id}`,
                href: `#m-${m.id}`,
                title: `#${i + 1} · ${m.sourceTitle}`,
              }))}
            />
          </CardBody>
        </Card>
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-6">
            <CardHeader title={`Coincidencias (${a.matches.length})`} />
            {a.matches.length === 0 ? (
              <EmptyState title="No hay fragmentos coincidentes" />
            ) : (
              <ol className="max-h-[75vh] divide-y divide-border overflow-y-auto">
                {a.matches.map((m, i) => (
                  <li key={m.id} id={`m-${m.id}`} className="scroll-mt-24 px-5 py-4 target:bg-accent-soft">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <a href={`#t-${m.id}`} className="text-sm font-semibold text-accent">#{i + 1}</a>
                      <Badge tone={catTone[m.category]}>{CATEGORY_LABEL[m.category]}</Badge>
                      <Badge>{KIND_LABEL[m.kind]}{m.kind === "APPROXIMATE" ? ` · ${Math.round(m.similarity * 100)} %` : ""}</Badge>
                      <span className="text-xs text-muted">{m.wordCount} palabras</span>
                    </div>
                    <p className="text-xs font-medium text-muted">
                      Fuente: {m.sourceUrl ? <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{m.sourceTitle}</a> : m.sourceTitle}
                    </p>
                    <blockquote className="mt-1.5 border-l-2 border-border-strong pl-3 font-serif text-sm text-muted">{m.sourceExcerpt}</blockquote>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Limitaciones" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {LIMITATIONS.SIMILARITY.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
