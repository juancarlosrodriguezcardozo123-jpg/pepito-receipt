import { Badge, type Tone } from "@/components/ui/badge";
import { ANALYSIS_STATUS_LABEL, ANALYSIS_TYPE_LABEL } from "@/lib/labels";

export function StatusBadge({ status }: { status: keyof typeof ANALYSIS_STATUS_LABEL }) {
  const tone: Tone = status === "COMPLETED" ? "ok" : status === "FAILED" ? "danger" : "warn";
  return <Badge tone={tone}>{ANALYSIS_STATUS_LABEL[status]}</Badge>;
}

export function TypeBadge({ type }: { type: keyof typeof ANALYSIS_TYPE_LABEL }) {
  return <Badge tone={type === "SIMILARITY" ? "accent" : "info"}>{ANALYSIS_TYPE_LABEL[type]}</Badge>;
}

export function ExperimentalBadge() {
  return <Badge tone="warn">Experimental · no es prueba de autoría</Badge>;
}

export function DemoBadge() {
  return <Badge tone="neutral">Demostración</Badge>;
}

/** Texto corto para el resultado de un análisis en listas. */
export function resultLabel(a: { type: string; status: string; score: number | null }) {
  if (a.type === "SIMILARITY") return a.score !== null ? `${a.score.toFixed(1)} % similitud` : "—";
  return a.status === "COMPLETED" && a.score !== null ? `Indicador IA ${a.score.toFixed(0)}/100` : "Solo experimental";
}
