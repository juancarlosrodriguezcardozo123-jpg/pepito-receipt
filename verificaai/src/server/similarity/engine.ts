import { classifyRange, quoteRanges, referencesStart, type Category } from "./classify";
import { isContentWord, sentenceRanges, stem, tokenize, type Token } from "./text";

export const ENGINE_VERSION = "sim-1.0";

export type SourceRef = {
  key: string;
  type: "USER_DOCUMENT" | "COLLECTION" | "EXTERNAL";
  id?: string;
  title: string;
  url?: string;
  text: string;
};

export type EngineMatch = {
  sourceKey: string;
  start: number;
  end: number;
  matchedText: string;
  sourceExcerpt: string;
  kind: "EXACT" | "APPROXIMATE";
  category: Category;
  similarity: number;
  wordCount: number;
};

export type EngineResult = {
  engineVersion: string;
  totalWords: number;
  matchedWords: number;
  matchedWordsExcludingCitations: number;
  score: number;
  scoreExcludingCitations: number;
  categoryWords: Record<Category, number>;
  bySource: { sourceKey: string; words: number; percent: number }[];
  matches: EngineMatch[];
  parameters: { exactMinWords: number; approxThreshold: number };
};

export type EngineOptions = { exactMinWords?: number; approxThreshold?: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

type PreparedSource = { ref: SourceRef; tokens: Token[]; grams: Map<string, number[]> };

function prepare(ref: SourceRef, k: number): PreparedSource {
  const tokens = tokenize(ref.text);
  const grams = new Map<string, number[]>();
  for (let j = 0; j + k <= tokens.length; j++) {
    const key = gramKey(tokens, j, k);
    const list = grams.get(key);
    if (list) {
      if (list.length < 64) list.push(j);
    } else grams.set(key, [j]);
  }
  return { ref, tokens, grams };
}

function gramKey(tokens: Token[], i: number, k: number): string {
  let s = tokens[i].norm;
  for (let n = 1; n < k; n++) s += " " + tokens[i + n].norm;
  return s;
}

function excerpt(text: string, start: number, end: number, max = 600): string {
  const s = text.slice(start, end);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/**
 * Compara un texto con un conjunto de fuentes.
 * 1) Coincidencias exactas: secuencias de al menos `exactMinWords` palabras normalizadas idénticas,
 *    extendidas al máximo (alineación greedy sobre k-gramas).
 * 2) Coincidencias aproximadas: oraciones sin cobertura exacta cuya similitud léxica (coeficiente de
 *    Dice sobre raíces de palabras de contenido) con una oración de la fuente supera `approxThreshold`.
 * El porcentaje es: palabras del documento cubiertas por alguna coincidencia / total de palabras.
 */
export function compareText(target: string, sources: SourceRef[], options: EngineOptions = {}): EngineResult {
  const k = options.exactMinWords ?? 8;
  const threshold = options.approxThreshold ?? 0.6;
  const T = tokenize(target);
  const covered: (number | null)[] = new Array(T.length).fill(null); // índice de match
  const matches: EngineMatch[] = [];
  const prepared = sources.filter((s) => s.text.trim()).map((s) => prepare(s, k));

  // ── 1. Exactas ──────────────────────────────────────────
  let i = 0;
  while (i + k <= T.length) {
    const key = gramKey(T, i, k);
    let best: { src: PreparedSource; j: number; len: number } | null = null;
    for (const src of prepared) {
      for (const j of src.grams.get(key) ?? []) {
        let len = 0;
        while (i + len < T.length && j + len < src.tokens.length && T[i + len].norm === src.tokens[j + len].norm) len++;
        if (len >= k && (!best || len > best.len)) best = { src, j, len };
      }
    }
    if (best) {
      const start = T[i].start;
      const end = T[i + best.len - 1].end;
      const sTok = best.src.tokens;
      matches.push({
        sourceKey: best.src.ref.key,
        start,
        end,
        matchedText: excerpt(target, start, end, 4000),
        sourceExcerpt: excerpt(best.src.ref.text, sTok[best.j].start, sTok[best.j + best.len - 1].end),
        kind: "EXACT",
        category: "UNCLASSIFIED",
        similarity: 1,
        wordCount: best.len,
      });
      for (let n = 0; n < best.len; n++) covered[i + n] = matches.length - 1;
      i += best.len;
    } else i++;
  }

  // ── 2. Aproximadas (por oración) ────────────────────────
  type Sent = { srcIdx: number; start: number; end: number; stems: Set<string> };
  const index = new Map<string, number[]>();
  const srcSents: Sent[] = [];
  prepared.forEach((src, srcIdx) => {
    for (const r of sentenceRanges(src.ref.text)) {
      const stems = new Set(
        src.tokens.filter((t) => t.start >= r.start && t.end <= r.end && isContentWord(t.norm)).map((t) => stem(t.norm)),
      );
      if (stems.size < 5) continue;
      const id = srcSents.push({ srcIdx, start: r.start, end: r.end, stems }) - 1;
      for (const st of stems) {
        const l = index.get(st);
        if (l) l.push(id);
        else index.set(st, [id]);
      }
    }
  });

  let tp = 0;
  for (const r of sentenceRanges(target)) {
    while (tp < T.length && T[tp].start < r.start) tp++;
    const idx: number[] = [];
    for (let n = tp; n < T.length && T[n].end <= r.end; n++) idx.push(n);
    if (idx.length < 8) continue;
    const uncovered = idx.filter((n) => covered[n] === null).length;
    if (uncovered / idx.length < 0.5) continue;
    const stems = new Set(idx.map((n) => T[n].norm).filter(isContentWord).map(stem));
    if (stems.size < 5) continue;
    const counts = new Map<number, number>();
    for (const st of stems) for (const id of index.get(st) ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    let best: { id: number; dice: number } | null = null;
    for (const [id, shared] of counts) {
      if (shared < 4) continue;
      const dice = (2 * shared) / (stems.size + srcSents[id].stems.size);
      if (dice >= threshold && (!best || dice > best.dice)) best = { id, dice };
    }
    if (!best) continue;
    const s = srcSents[best.id];
    const src = prepared[s.srcIdx];
    const start = T[idx[0]].start;
    const end = T[idx[idx.length - 1]].end;
    matches.push({
      sourceKey: src.ref.key,
      start,
      end,
      matchedText: excerpt(target, start, end, 4000),
      sourceExcerpt: excerpt(src.ref.text, s.start, s.end),
      kind: "APPROXIMATE",
      category: "UNCLASSIFIED",
      similarity: round1(best.dice * 100) / 100,
      wordCount: uncovered,
    });
    for (const n of idx) if (covered[n] === null) covered[n] = matches.length - 1;
  }

  // ── 3. Clasificación y métricas ─────────────────────────
  const quotes = quoteRanges(target);
  const refStart = referencesStart(target);
  for (const m of matches) m.category = classifyRange(m, quotes, refStart);

  const categoryWords: Record<Category, number> = { QUOTE: 0, REFERENCE: 0, UNCLASSIFIED: 0 };
  const perSource = new Map<string, number>();
  for (const c of covered) {
    if (c === null) continue;
    const m = matches[c];
    categoryWords[m.category]++;
    perSource.set(m.sourceKey, (perSource.get(m.sourceKey) ?? 0) + 1);
  }
  const matchedWords = categoryWords.QUOTE + categoryWords.REFERENCE + categoryWords.UNCLASSIFIED;
  const total = T.length || 1;
  matches.sort((a, b) => a.start - b.start);

  return {
    engineVersion: ENGINE_VERSION,
    totalWords: T.length,
    matchedWords,
    matchedWordsExcludingCitations: categoryWords.UNCLASSIFIED,
    score: T.length ? round1((matchedWords / total) * 100) : 0,
    scoreExcludingCitations: T.length ? round1((categoryWords.UNCLASSIFIED / total) * 100) : 0,
    categoryWords,
    bySource: [...perSource.entries()]
      .map(([sourceKey, words]) => ({ sourceKey, words, percent: round1((words / total) * 100) }))
      .sort((a, b) => b.words - a.words),
    matches,
    parameters: { exactMinWords: k, approxThreshold: threshold },
  };
}
