import "server-only";
import PDFDocument from "pdfkit";
import { appConfig } from "@/lib/config";
import type { getOwnedAnalysis } from "@/server/services/analyses";
import type { LinguisticResult } from "@/server/ai-detection/linguistic";
import { CATEGORY_LABEL, KIND_LABEL, SOURCE_TYPE_LABEL, LIMITATIONS } from "@/lib/labels";

type Analysis = Awaited<ReturnType<typeof getOwnedAnalysis>>;

// Las fuentes estándar PDF usan WinAnsi: se sustituyen los caracteres que no admite.
function t(s: string): string {
  return s
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[—–]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ“”‘’…€]/g, "");
}

const C = { ink: "#1c1b19", muted: "#6b6860", line: "#dedbd3", accent: "#1f5f53", warn: "#9a5b13" };

export function renderReport(a: Analysis): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Informe ${a.document.title}`, Author: appConfig.name } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const h2 = (s: string) => {
    doc.moveDown(0.8).font("Helvetica-Bold").fontSize(12).fillColor(C.ink).text(t(s));
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(C.line).stroke();
    doc.moveDown(0.5);
  };
  const p = (s: string, color = C.ink, size = 10) => doc.font("Helvetica").fontSize(size).fillColor(color).text(t(s), { align: "left" });
  const kv = (k: string, v: string) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.muted).text(t(k) + ": ", { continued: true });
    doc.font("Helvetica").fillColor(C.ink).text(t(v));
  };

  doc.font("Helvetica-Bold").fontSize(18).fillColor(C.accent).text(appConfig.name);
  doc.font("Helvetica").fontSize(10).fillColor(C.muted).text(
    a.type === "SIMILARITY" ? "Informe de similitud textual" : "Informe de señales de escritura asistida por IA",
  );
  doc.moveDown();

  h2("Datos del análisis");
  kv("Documento", a.document.title);
  kv("Archivo", a.document.originalName);
  kv("Fecha del análisis", a.createdAt.toLocaleString("es", { dateStyle: "long", timeStyle: "short" }));
  kv("Identificador", a.id);
  kv("Método", a.method);
  kv("Versión del motor", a.engineVersion);
  if (a.document.isDemo) p("Documento de DEMOSTRACIÓN: los resultados no corresponden a un trabajo real.", C.warn);

  if (a.type === "SIMILARITY") similarity(a);
  else ai(a);

  h2("Limitaciones metodológicas");
  for (const l of LIMITATIONS[a.type]) p(`• ${l}`, C.ink, 9);
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.warn).text(
    t("Advertencia: estos resultados son indicadores automáticos y requieren interpretación humana. No constituyen prueba de plagio ni de autoría."),
  );
  doc.end();
  return done;

  function similarity(a: Analysis) {
    const d = (a.details ?? {}) as {
      totalWords?: number;
      sourcesCompared?: number;
      categoryWords?: Record<string, number>;
      bySource?: { title: string; percent: number; type: string; url: string | null }[];
    };
    h2("Resultado");
    kv("Similitud textual", `${a.score ?? 0} %`);
    kv("Sin citas ni referencias", `${a.scoreExcludingCitations ?? 0} %`);
    kv("Palabras del documento", String(d.totalWords ?? a.document.wordCount));
    kv("Fuentes comparadas", String(d.sourcesCompared ?? 0));
    if (d.categoryWords) {
      kv("Palabras en coincidencias", `${d.categoryWords.UNCLASSIFIED ?? 0} sin clasificar · ${d.categoryWords.QUOTE ?? 0} en citas · ${d.categoryWords.REFERENCE ?? 0} en referencias`);
    }
    doc.moveDown(0.4);
    p("Cálculo: palabras del documento que forman parte de al menos una coincidencia, divididas entre el total de palabras. Cada palabra se cuenta una sola vez.", C.muted, 9);
    if (a.summary) p(a.summary);
    if (a.errorMessage) p(a.errorMessage, C.warn);

    h2("Fuentes coincidentes");
    if (!d.bySource?.length) p("Sin fuentes coincidentes.", C.muted);
    for (const s of d.bySource ?? []) {
      p(`${s.percent} % · ${s.title} (${SOURCE_TYPE_LABEL[s.type as keyof typeof SOURCE_TYPE_LABEL] ?? s.type})${s.url ? ` · ${s.url}` : ""}`);
    }

    h2("Fragmentos coincidentes");
    if (!a.matches.length) p("No se encontraron fragmentos coincidentes.", C.muted);
    a.matches.slice(0, 150).forEach((m, i) => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.accent).text(
        t(`#${i + 1} · ${KIND_LABEL[m.kind]} · ${CATEGORY_LABEL[m.category]} · ${Math.round(m.similarity * 100)} % · ${m.wordCount} palabras`),
      );
      p(`Documento: «${m.matchedText.slice(0, 700)}»`, C.ink, 9);
      p(`Fuente (${m.sourceTitle}): «${m.sourceExcerpt.slice(0, 500)}»`, C.muted, 9);
      doc.moveDown(0.5);
    });
    if (a.matches.length > 150) p(`… y ${a.matches.length - 150} coincidencias más (ver la plataforma).`, C.muted, 9);
  }

  function ai(a: Analysis) {
    const d = (a.details ?? {}) as { linguistic?: LinguisticResult; providerParagraphs?: { index: number; score: number; start: number; end: number }[] };
    h2("Detector especializado");
    if (a.status === "COMPLETED" && a.score !== null) {
      kv("Proveedor", a.provider ?? "-");
      kv("Indicador de señales de IA", `${a.score} / 100`);
      p("El indicador es la estimación del proveedor; no equivale a la proporción del texto escrita por IA.", C.muted, 9);
      const top = (d.providerParagraphs ?? []).filter((x) => x.score >= 50).slice(0, 30);
      if (top.length) {
        doc.moveDown(0.4);
        p("Párrafos con indicador del proveedor ≥ 50:", C.ink, 10);
        for (const x of top) p(`[${x.score}] ${a.document.text.slice(x.start, Math.min(x.end, x.start + 400))}`, C.muted, 9);
      }
    } else {
      p(`${a.status === "FAILED" ? "El detector especializado falló" : "Análisis avanzado no disponible"}. ${a.errorMessage ?? ""}`, C.warn);
      p("No se muestra ningún indicador porcentual de IA porque no se utilizó un detector especializado.", C.muted, 9);
    }
    const l = d.linguistic;
    if (!l) return;
    h2("Análisis lingüístico (EXPERIMENTAL – no es prueba de autoría)");
    p(l.summary);
    doc.moveDown(0.4);
    for (const s of l.documentSignals) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.ink).text(t(`${s.label}: ${s.display} (${s.level})`));
      p(s.explanation, C.muted, 9);
    }
    const flagged = l.paragraphs.filter((x) => x.flagged);
    h2("Fragmentos con varias señales simultáneas");
    if (!flagged.length) p("Ningún párrafo presenta varias señales notables a la vez.", C.muted);
    for (const f of flagged.slice(0, 30)) {
      p(`Párrafo ${f.index + 1} (${f.signals.filter((s) => s.level === "notable").map((s) => s.label.toLowerCase()).join("; ")}):`, C.ink, 9);
      p(a.document.text.slice(f.start, Math.min(f.end, f.start + 500)), C.muted, 9);
      doc.moveDown(0.3);
    }
  }
}
