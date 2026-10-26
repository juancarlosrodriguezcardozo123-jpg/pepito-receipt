import { paragraphRanges, sentenceRanges, tokenize } from "@/server/similarity/text";

export const LINGUISTIC_VERSION = "ling-exp-1.0";

export type SignalLevel = "baja" | "moderada" | "notable";

export type Signal = {
  id: string;
  label: string;
  value: number;
  display: string;
  level: SignalLevel;
  explanation: string;
};

export type ParagraphResult = {
  index: number;
  start: number;
  end: number;
  words: number;
  signals: Signal[];
  notableCount: number;
  flagged: boolean;
};

export type LinguisticResult = {
  version: string;
  experimental: true;
  words: number;
  sentences: number;
  documentSignals: Signal[];
  paragraphs: ParagraphResult[];
  flaggedParagraphs: number;
  analyzedParagraphs: number;
  summary: string;
};

const FORMULAIC = [
  "ademas", "por otro lado", "en conclusion", "cabe destacar", "es importante destacar", "es importante senalar",
  "en resumen", "en definitiva", "sin embargo", "no obstante", "en este sentido", "asimismo", "por lo tanto",
  "en ultima instancia", "en el contexto de", "desempena un papel", "juega un papel crucial",
  "furthermore", "moreover", "in conclusion", "it is important to note", "additionally", "overall",
  "in summary", "plays a crucial role", "delve", "in today's",
];

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const stdev = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};

/** MTLD (McCarthy & Jarvis, 2010): diversidad léxica robusta a la longitud del texto. */
export function mtld(words: string[], threshold = 0.72): number {
  if (words.length < 10) return 0;
  const pass = (seq: string[]) => {
    let factors = 0;
    let types = new Set<string>();
    let count = 0;
    for (const w of seq) {
      types.add(w);
      count++;
      if (types.size / count <= threshold) {
        factors++;
        types = new Set();
        count = 0;
      }
    }
    if (count > 0) factors += (1 - types.size / count) / (1 - threshold);
    return factors > 0 ? seq.length / factors : seq.length;
  };
  return (pass(words) + pass([...words].reverse())) / 2;
}

function level(value: number, notableBelow: number, moderateBelow: number): SignalLevel {
  return value < notableBelow ? "notable" : value < moderateBelow ? "moderada" : "baja";
}
function levelAbove(value: number, notableAbove: number, moderateAbove: number): SignalLevel {
  return value > notableAbove ? "notable" : value > moderateAbove ? "moderada" : "baja";
}

function signalsFor(text: string): { signals: Signal[]; words: number; sentences: number } {
  const tokens = tokenize(text);
  const words = tokens.map((t) => t.norm);
  const sentLens = sentenceRanges(text)
    .map((r) => tokens.filter((t) => t.start >= r.start && t.end <= r.end).length)
    .filter((n) => n > 0);

  const cv = sentLens.length >= 3 ? stdev(sentLens) / (mean(sentLens) || 1) : NaN;
  const diversity = mtld(words);
  const trigrams = new Map<string, number>();
  for (let i = 0; i + 3 <= words.length; i++) {
    const g = words.slice(i, i + 3).join(" ");
    trigrams.set(g, (trigrams.get(g) ?? 0) + 1);
  }
  const totalTri = Math.max(1, words.length - 2);
  const repeated = [...trigrams.values()].filter((c) => c > 1).reduce((s, c) => s + c, 0) / totalTri;
  const joined = " " + words.join(" ") + " ";
  const formulaic = FORMULAIC.reduce((s, f) => s + (joined.split(" " + f + " ").length - 1), 0);
  const formulaicPer100 = (formulaic / Math.max(1, words.length)) * 100;

  const signals: Signal[] = [];
  if (!Number.isNaN(cv)) {
    signals.push({
      id: "burstiness",
      label: "Variación en la longitud de las oraciones",
      value: cv,
      display: `CV ${cv.toFixed(2)}`,
      level: level(cv, 0.3, 0.45),
      explanation:
        "Coeficiente de variación de la longitud de las oraciones. La escritura humana suele alternar oraciones cortas y largas; valores bajos indican un ritmo muy uniforme.",
    });
  }
  if (words.length >= 50) {
    signals.push({
      id: "lexical-diversity",
      label: "Diversidad léxica (MTLD)",
      value: diversity,
      display: diversity.toFixed(0),
      level: level(diversity, 45, 65),
      explanation:
        "Medida de variedad del vocabulario independiente de la longitud. Valores bajos indican vocabulario repetitivo o genérico.",
    });
  }
  signals.push({
    id: "repetition",
    label: "Repetición de secuencias de tres palabras",
    value: repeated,
    display: `${(repeated * 100).toFixed(1)} %`,
    level: levelAbove(repeated, 0.12, 0.06),
    explanation: "Proporción de trigramas que aparecen más de una vez. Valores altos indican estructuras reiteradas.",
  });
  signals.push({
    id: "formulaic",
    label: "Marcadores discursivos formulaicos",
    value: formulaicPer100,
    display: `${formulaicPer100.toFixed(2)} / 100 palabras`,
    level: levelAbove(formulaicPer100, 1.2, 0.6),
    explanation:
      "Frecuencia de conectores y expresiones de transición muy habituales en textos generados (p. ej. «cabe destacar», «en conclusión»). También son normales en escritura académica humana.",
  });
  return { signals, words: words.length, sentences: sentLens.length };
}

/**
 * Análisis lingüístico EXPERIMENTAL. Calcula métricas estilométricas medibles y explicables.
 * No es un clasificador entrenado ni produce una probabilidad: no debe usarse como prueba de autoría.
 */
export function analyzeLinguistic(text: string): LinguisticResult {
  const doc = signalsFor(text);
  const paragraphs: ParagraphResult[] = [];
  const paraLens: number[] = [];
  paragraphRanges(text).forEach((r, index) => {
    const slice = text.slice(r.start, r.end);
    const p = signalsFor(slice);
    paraLens.push(p.words);
    if (p.words < 40) return;
    const notableCount = p.signals.filter((s) => s.level === "notable").length;
    paragraphs.push({ index, start: r.start, end: r.end, words: p.words, signals: p.signals, notableCount, flagged: notableCount >= 2 });
  });

  const substantial = paraLens.filter((n) => n >= 20);
  if (substantial.length >= 4) {
    const cv = stdev(substantial) / (mean(substantial) || 1);
    doc.signals.push({
      id: "paragraph-uniformity",
      label: "Uniformidad en la extensión de los párrafos",
      value: cv,
      display: `CV ${cv.toFixed(2)}`,
      level: level(cv, 0.2, 0.35),
      explanation: "Variación de la longitud entre párrafos. Párrafos de extensión casi idéntica indican una estructura muy regular.",
    });
  }

  const flagged = paragraphs.filter((p) => p.flagged).length;
  const notable = doc.signals.filter((s) => s.level === "notable");
  const summary =
    doc.words < 80
      ? "El texto es demasiado corto para que las métricas estilométricas sean informativas."
      : notable.length === 0
        ? "No se observan señales estilométricas notables. Esto no garantiza que el texto sea de autoría humana."
        : `Se observan ${notable.length} señal(es) estilométrica(s) notable(s) (${notable.map((s) => s.label.toLowerCase()).join("; ")}) y ${flagged} de ${paragraphs.length} párrafo(s) analizados presentan varias señales simultáneas. Estas características son compatibles tanto con escritura asistida por IA como con estilos humanos formales o plantillas; requieren interpretación humana.`;

  return {
    version: LINGUISTIC_VERSION,
    experimental: true,
    words: doc.words,
    sentences: doc.sentences,
    documentSignals: doc.signals,
    paragraphs,
    flaggedParagraphs: flagged,
    analyzedParagraphs: paragraphs.length,
    summary,
  };
}
