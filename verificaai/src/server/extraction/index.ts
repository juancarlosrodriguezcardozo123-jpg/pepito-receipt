import "server-only";
import { fileTypeFromBuffer } from "file-type";
import { env } from "@/server/env";
import { UserFacingError } from "@/server/security/errors";
import { inspectZip } from "./zip-guard";
import { normalizeExtractedText } from "./normalize";

export type SupportedKind = "pdf" | "docx" | "txt";

export const MIME: Record<SupportedKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

const EXTRACTION_TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new UserFacingError("La extracción del texto tardó demasiado.")), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

/** Determina el tipo real por contenido (magic bytes), no por la extensión declarada. */
export async function detectKind(buf: Buffer, filename: string): Promise<SupportedKind> {
  const ext = filename.toLowerCase().split(".").pop();
  const ft = await fileTypeFromBuffer(buf);
  if (ft?.mime === MIME.pdf && ext === "pdf") return "pdf";
  if (ft?.mime === MIME.docx && ext === "docx") return "docx";
  if (!ft && ext === "txt") return "txt";
  throw new UserFacingError("Formato no admitido o el contenido no coincide con la extensión. Usa PDF, DOCX o TXT.");
}

function decodeTxt(buf: Buffer): string {
  if (buf.includes(0)) throw new UserFacingError("El archivo TXT contiene datos binarios.");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("latin1").decode(buf);
  }
}

async function extractPdf(buf: Buffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buf));
  } catch {
    throw new UserFacingError("No se pudo leer el PDF. Puede estar dañado o protegido con contraseña.");
  }
  if (pdf.numPages > env().MAX_PDF_PAGES) {
    throw new UserFacingError(`El PDF supera el máximo de ${env().MAX_PDF_PAGES} páginas.`);
  }
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).join("\n\n");
}

async function extractDocx(buf: Buffer): Promise<string> {
  let info;
  try {
    info = inspectZip(buf);
  } catch {
    throw new UserFacingError("El archivo DOCX está dañado.");
  }
  if (info.entries > 2000 || info.uncompressedBytes > 100 * 1024 * 1024) {
    throw new UserFacingError("El DOCX descomprimido es demasiado grande.");
  }
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value;
}

export async function extractText(buf: Buffer, kind: SupportedKind): Promise<string> {
  const raw =
    kind === "txt" ? decodeTxt(buf) : await withTimeout(kind === "pdf" ? extractPdf(buf) : extractDocx(buf), EXTRACTION_TIMEOUT_MS);
  const text = normalizeExtractedText(raw);
  if (text.length < 20) throw new UserFacingError("No se encontró texto suficiente en el documento (¿es un PDF escaneado?).");
  if (text.length > env().MAX_EXTRACTED_CHARS) {
    throw new UserFacingError(`El texto supera el máximo de ${env().MAX_EXTRACTED_CHARS.toLocaleString("es")} caracteres.`);
  }
  return text;
}
