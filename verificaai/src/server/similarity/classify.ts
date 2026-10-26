import type { Range } from "./text";

export type Category = "QUOTE" | "REFERENCE" | "UNCLASSIFIED";

const QUOTE_PAIRS: [string, string][] = [
  ["“", "”"],
  ["«", "»"],
  ['"', '"'],
  ["‘", "’"],
];

/** Rangos entre comillas tipográficas, angulares o rectas. */
export function quoteRanges(text: string): Range[] {
  const out: Range[] = [];
  for (const [open, close] of QUOTE_PAIRS) {
    let i = 0;
    while (i < text.length) {
      const a = text.indexOf(open, i);
      if (a < 0) break;
      const b = text.indexOf(close, a + 1);
      if (b < 0) break;
      // Evita emparejar comillas a través de párrafos enteros.
      if (b - a < 3000) out.push({ start: a, end: b + 1 });
      i = b + 1;
    }
  }
  return out;
}

const REF_HEADING =
  /^[ \t]*(?:\d+[.)]?\s*)?(referencias(?: bibliogr[aá]ficas)?|bibliograf[ií]a|obras citadas|fuentes consultadas|references|bibliography|works cited)[ \t]*:?[ \t]*$/gim;

/** Posición donde empieza la sección de referencias (la última encabezada como tal), o null. */
export function referencesStart(text: string): number | null {
  let last: number | null = null;
  for (const m of text.matchAll(REF_HEADING)) last = m.index!;
  // Solo se considera si está en la segunda mitad del documento.
  return last !== null && last > text.length * 0.3 ? last : null;
}

export function classifyRange(range: Range, quotes: Range[], refStart: number | null): Category {
  if (refStart !== null && range.start >= refStart) return "REFERENCE";
  const len = range.end - range.start;
  let inside = 0;
  for (const q of quotes) {
    inside += Math.max(0, Math.min(range.end, q.end) - Math.max(range.start, q.start));
  }
  return len > 0 && inside / len >= 0.5 ? "QUOTE" : "UNCLASSIFIED";
}
