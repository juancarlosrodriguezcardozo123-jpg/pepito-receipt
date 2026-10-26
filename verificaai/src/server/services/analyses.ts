import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { compareText, type SourceRef } from "@/server/similarity/engine";
import { paragraphRanges } from "@/server/similarity/text";
import { analyzeLinguistic, LINGUISTIC_VERSION } from "@/server/ai-detection/linguistic";
import { getAiDetector } from "@/server/ai-detection/provider";
import { getSearchProvider, pickQueries } from "@/server/sources/provider";
import { assertCanAnalyze, recordUsage, USAGE } from "@/server/quotas";
import { audit, logSystemError, UserFacingError } from "@/server/security/errors";
import { rateLimit } from "@/server/security/rate-limit";
import { countWords } from "@/server/extraction/normalize";
import { getOwnedDocument } from "./documents";

export type SimilarityOptions = {
  documentId: string;
  compareWith: "all" | "selected" | "none";
  selectedIds: string[];
  collectionIds: string[];
  useExternal: boolean;
  externalConsent: boolean;
};

export async function runSimilarityAnalysis(userId: string, opts: SimilarityOptions) {
  await rateLimit(`analysis:${userId}`, 30, 3600);
  const doc = await getOwnedDocument(userId, opts.documentId);
  const plan = await assertCanAnalyze(userId);

  const sources: SourceRef[] = [];
  if (opts.compareWith !== "none") {
    const own = await db.document.findMany({
      where: {
        ownerId: userId, // autorización: solo documentos propios
        id: opts.compareWith === "selected" ? { in: opts.selectedIds.filter((i) => i !== doc.id) } : { not: doc.id },
        sha256: { not: doc.sha256 },
      },
      select: { id: true, title: true, text: true },
      take: 500,
    });
    for (const d of own) sources.push({ key: `u:${d.id}`, type: "USER_DOCUMENT", id: d.id, title: d.title, text: d.text });
  }
  if (opts.collectionIds.length) {
    const docs = await db.sourceDocument.findMany({
      where: { collectionId: { in: opts.collectionIds }, collection: { isActive: true } },
      select: { id: true, title: true, author: true, url: true, text: true, collection: { select: { name: true } } },
      take: 5000,
    });
    for (const d of docs) {
      sources.push({
        key: `c:${d.id}`,
        type: "COLLECTION",
        id: d.id,
        title: `${d.title}${d.author ? ` — ${d.author}` : ""} (${d.collection.name})`,
        url: d.url ?? undefined,
        text: d.text,
      });
    }
  }

  const search = getSearchProvider();
  let externalUsed = false;
  let externalError: string | undefined;
  if (opts.useExternal) {
    if (!search.status().configured) throw new UserFacingError("No hay ninguna fuente externa configurada.");
    if (!plan.allowExternal) throw new UserFacingError("Tu plan no incluye la comparación con fuentes externas.");
    if (!opts.externalConsent) throw new UserFacingError("Debes autorizar el envío de fragmentos al proveedor externo.");
    await db.consentRecord.create({
      data: { userId, provider: search.status().name, purpose: "Búsqueda de fuentes externas (fragmentos del documento)", documentId: doc.id },
    });
    try {
      const seen = new Set<string>();
      for (const q of pickQueries(doc.text)) {
        const results = await search.search(q);
        await recordUsage(userId, USAGE.externalSearch, search.status().name);
        for (const r of results) {
          if (seen.has(r.url)) continue;
          seen.add(r.url);
          sources.push({ key: `e:${r.url}`, type: "EXTERNAL", title: r.title, url: r.url, text: r.text });
        }
      }
      externalUsed = true;
    } catch (e) {
      await logSystemError("search.external", e, userId);
      externalError = "La fuente externa no respondió; el análisis se limitó a las fuentes internas.";
    }
  }

  if (sources.length === 0) {
    throw new UserFacingError("No hay fuentes con las que comparar. Sube otros documentos o selecciona una colección.");
  }

  const result = compareText(doc.text, sources);
  const byKey = new Map(sources.map((s) => [s.key, s]));
  const sourceSummary = result.bySource.map((b) => {
    const s = byKey.get(b.sourceKey)!;
    return { ...b, title: s.title, type: s.type, url: s.url ?? null };
  });
  const scopes = [
    opts.compareWith !== "none" && "documentos propios",
    opts.collectionIds.length > 0 && "colecciones autorizadas",
    externalUsed && `fuente externa (${search.status().name})`,
  ].filter(Boolean);

  const summary =
    result.matches.length === 0
      ? `No se encontraron coincidencias con ${sources.length} fuente(s) comparada(s).`
      : `El ${result.score} % de las palabras del documento coincide con alguna de las ${sources.length} fuente(s) comparada(s) ` +
        `(${result.scoreExcludingCitations} % sin contar citas entre comillas ni referencias bibliográficas). ` +
        `Se detectaron ${result.matches.filter((m) => m.kind === "EXACT").length} coincidencia(s) exacta(s) y ` +
        `${result.matches.filter((m) => m.kind === "APPROXIMATE").length} aproximada(s) en ${sourceSummary.length} fuente(s).`;

  const analysis = await db.analysis.create({
    data: {
      userId,
      documentId: doc.id,
      type: "SIMILARITY",
      status: "COMPLETED",
      method: `Comparación de secuencias exactas (≥ ${result.parameters.exactMinWords} palabras) y similitud léxica por oración (Dice ≥ ${result.parameters.approxThreshold}) contra: ${scopes.join(", ")}`,
      engineVersion: result.engineVersion,
      provider: externalUsed ? search.status().name : null,
      score: result.score,
      scoreExcludingCitations: result.scoreExcludingCitations,
      summary,
      errorMessage: externalError,
      details: {
        totalWords: result.totalWords,
        matchedWords: result.matchedWords,
        categoryWords: result.categoryWords,
        sourcesCompared: sources.length,
        bySource: sourceSummary,
        parameters: result.parameters,
      } satisfies Prisma.InputJsonValue,
      matches: {
        create: result.matches.map((m) => {
          const s = byKey.get(m.sourceKey)!;
          return {
            sourceType: s.type,
            sourceDocumentId: s.type === "USER_DOCUMENT" ? s.id : null,
            sourceCollectionDocId: s.type === "COLLECTION" ? s.id : null,
            sourceTitle: s.title.slice(0, 500),
            sourceUrl: s.url,
            start: m.start,
            end: m.end,
            matchedText: m.matchedText,
            sourceExcerpt: m.sourceExcerpt,
            kind: m.kind,
            category: m.category,
            similarity: m.similarity,
            wordCount: m.wordCount,
          };
        }),
      },
    },
  });
  await recordUsage(userId, USAGE.similarity);
  await audit("analysis.similarity", userId, analysis.id);
  return analysis;
}

export async function runAiAnalysis(userId: string, opts: { documentId: string; useExternal: boolean; externalConsent: boolean }) {
  await rateLimit(`analysis:${userId}`, 30, 3600);
  const doc = await getOwnedDocument(userId, opts.documentId);
  const plan = await assertCanAnalyze(userId);
  if (countWords(doc.text) < 50) throw new UserFacingError("El texto es demasiado corto para analizarlo (mínimo 50 palabras).");

  const linguistic = analyzeLinguistic(doc.text);
  const detector = getAiDetector();
  const st = detector.status();

  let status: "COMPLETED" | "FAILED" | "UNAVAILABLE" = "UNAVAILABLE";
  let score: number | null = null;
  let provider: string | null = null;
  let providerParagraphs: { index: number; score: number; start: number; end: number }[] = [];
  let modelVersion: string | undefined;
  let errorMessage: string | undefined;

  if (st.configured && opts.useExternal) {
    if (!plan.allowExternal) throw new UserFacingError("Tu plan no incluye el uso del detector externo.");
    if (!opts.externalConsent) throw new UserFacingError("Debes autorizar el envío del documento al proveedor externo.");
    await db.consentRecord.create({
      data: { userId, provider: st.name, purpose: "Detección de escritura asistida por IA (texto completo)", documentId: doc.id },
    });
    const ranges = paragraphRanges(doc.text);
    try {
      const r = await detector.analyze({ text: doc.text, paragraphs: ranges.map((p) => doc.text.slice(p.start, p.end)) });
      await recordUsage(userId, USAGE.externalAi, st.name);
      status = "COMPLETED";
      score = r.documentScore;
      provider = st.name;
      modelVersion = r.modelVersion;
      providerParagraphs = r.paragraphs.filter((p) => ranges[p.index]).map((p) => ({ ...p, ...ranges[p.index] }));
    } catch (e) {
      await logSystemError("ai.external", e, userId);
      status = "FAILED";
      errorMessage = "El detector externo no respondió correctamente. Se muestra solo el análisis experimental.";
    }
  } else if (st.configured) {
    errorMessage = "El detector externo está disponible, pero no se autorizó su uso en este análisis.";
  } else {
    errorMessage = "No hay un detector de IA especializado configurado.";
  }

  const analysis = await db.analysis.create({
    data: {
      userId,
      documentId: doc.id,
      type: "AI_DETECTION",
      status,
      method:
        status === "COMPLETED"
          ? `Detector especializado «${provider}»${modelVersion ? ` (${modelVersion})` : ""} + análisis lingüístico experimental`
          : "Solo análisis lingüístico experimental (estilometría); sin detector especializado",
      engineVersion: LINGUISTIC_VERSION,
      provider,
      score,
      summary: linguistic.summary,
      errorMessage,
      details: { linguistic, providerParagraphs, modelVersion: modelVersion ?? null } as unknown as Prisma.InputJsonValue,
    },
  });
  await recordUsage(userId, USAGE.ai, provider ?? undefined);
  await audit("analysis.ai", userId, analysis.id);
  return analysis;
}

export async function getOwnedAnalysis(userId: string, id: string) {
  const analysis = await db.analysis.findFirst({
    where: { id, userId },
    include: {
      document: { select: { id: true, title: true, originalName: true, text: true, wordCount: true, createdAt: true, isDemo: true } },
      matches: { orderBy: { start: "asc" } },
    },
  });
  if (!analysis) throw new UserFacingError("Análisis no encontrado.", 404);
  return analysis;
}

export async function listAnalyses(userId: string, f: { q?: string; type?: string; status?: string; take?: number } = {}) {
  const where: Prisma.AnalysisWhereInput = { userId };
  if (f.type === "SIMILARITY" || f.type === "AI_DETECTION") where.type = f.type;
  if (f.status === "COMPLETED" || f.status === "FAILED" || f.status === "UNAVAILABLE") where.status = f.status;
  if (f.q) where.document = { title: { contains: f.q, mode: "insensitive" } };
  return db.analysis.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: f.take ?? 200,
    select: {
      id: true, type: true, status: true, score: true, scoreExcludingCitations: true, createdAt: true, provider: true,
      document: { select: { id: true, title: true } },
    },
  });
}

export async function deleteAnalysis(userId: string, id: string) {
  const { count } = await db.analysis.deleteMany({ where: { id, userId } });
  if (!count) throw new UserFacingError("Análisis no encontrado.", 404);
  await audit("analysis.delete", userId, id);
}
