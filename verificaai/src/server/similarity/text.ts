import { STOPWORDS } from "./stopwords";

export type Token = { norm: string; start: number; end: number };

const WORD_RE = /[\p{L}\p{N}]+/gu;

export function normalizeWord(w: string): string {
  return w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Tokeniza conservando las posiciones de cada palabra en el texto original. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    out.push({ norm: normalizeWord(m[0]), start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

/** Raíz aproximada (prefijo) para la comparación léxica aproximada. */
export function stem(norm: string): string {
  return norm.length > 6 ? norm.slice(0, 6) : norm;
}

export function isContentWord(norm: string): boolean {
  return norm.length > 2 && !STOPWORDS.has(norm) && !/^\d+$/.test(norm);
}

export type Range = { start: number; end: number };

/** Oraciones como rangos de caracteres. */
export function sentenceRanges(text: string): Range[] {
  const out: Range[] = [];
  for (const m of text.matchAll(/[^.!?¡¿\n]+(?:[.!?]+|$)/gm)) {
    const s = m.index!;
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (trimmed) out.push({ start: s + lead, end: s + lead + trimmed.length });
  }
  return out;
}

/** Párrafos como rangos de caracteres (separados por línea en blanco o salto de línea). */
export function paragraphRanges(text: string): Range[] {
  const out: Range[] = [];
  for (const m of text.matchAll(/[^\n]+/g)) {
    const trimmed = m[0].trim();
    if (trimmed) out.push({ start: m.index! + (m[0].length - m[0].trimStart().length), end: m.index! + m[0].trimEnd().length });
  }
  return out;
}
