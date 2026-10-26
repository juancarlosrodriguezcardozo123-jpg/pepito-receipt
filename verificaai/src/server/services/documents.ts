import "server-only";
import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { storage } from "@/server/storage";
import { detectKind, extractText, MIME } from "@/server/extraction";
import { countWords, normalizeExtractedText } from "@/server/extraction/normalize";
import { assertCanUpload, recordUsage, USAGE } from "@/server/quotas";
import { audit, UserFacingError } from "@/server/security/errors";
import { sha256 } from "@/server/security/crypto";
import type { Prisma } from "@prisma/client";

function retentionDate(): Date | null {
  const days = env().RETENTION_DAYS;
  return days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
}

function safeTitle(name: string): string {
  return name.replace(/[\u0000-\u001F<>]/g, "").trim().slice(0, 200) || "Documento";
}

export async function createDocumentFromFile(userId: string, file: File) {
  if (file.size === 0) throw new UserFacingError("El archivo está vacío.");
  await assertCanUpload(userId, file.size);
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = await detectKind(buf, file.name);
  const text = await extractText(buf, kind);
  const store = storage();
  const storageKey = store ? await store.put(buf) : null;
  const doc = await db.document.create({
    data: {
      ownerId: userId,
      title: safeTitle(file.name.replace(/\.(pdf|docx|txt)$/i, "")),
      originalName: safeTitle(file.name),
      mimeType: MIME[kind],
      sizeBytes: buf.length,
      sha256: sha256(buf),
      storageKey,
      text,
      wordCount: countWords(text),
      retentionUntil: retentionDate(),
    },
  });
  await recordUsage(userId, USAGE.upload);
  await audit("document.upload", userId, doc.id);
  return doc;
}

export async function createDocumentFromText(userId: string, title: string, rawText: string) {
  const text = normalizeExtractedText(rawText);
  const bytes = Buffer.byteLength(text);
  await assertCanUpload(userId, bytes);
  if (text.length < 20) throw new UserFacingError("Escribe o pega al menos unas frases de texto.");
  if (text.length > env().MAX_EXTRACTED_CHARS) throw new UserFacingError("El texto es demasiado largo.");
  const doc = await db.document.create({
    data: {
      ownerId: userId,
      title: safeTitle(title || `Texto pegado ${new Date().toLocaleString("es")}`),
      originalName: "texto-pegado.txt",
      mimeType: MIME.txt,
      sizeBytes: bytes,
      sha256: sha256(text),
      text,
      wordCount: countWords(text),
      retentionUntil: retentionDate(),
    },
  });
  await recordUsage(userId, USAGE.upload);
  await audit("document.paste", userId, doc.id);
  return doc;
}

/** Acceso a un documento SOLO si pertenece al usuario. */
export async function getOwnedDocument(userId: string, id: string) {
  const doc = await db.document.findFirst({ where: { id, ownerId: userId } });
  if (!doc) throw new UserFacingError("Documento no encontrado.", 404);
  return doc;
}

export type DocumentFilters = { q?: string; type?: string; sort?: string };

export async function listDocuments(userId: string, f: DocumentFilters = {}) {
  const where: Prisma.DocumentWhereInput = { ownerId: userId };
  if (f.q) where.OR = [{ title: { contains: f.q, mode: "insensitive" } }, { originalName: { contains: f.q, mode: "insensitive" } }];
  if (f.type && f.type in MIME) where.mimeType = MIME[f.type as keyof typeof MIME];
  return db.document.findMany({
    where,
    orderBy: f.sort === "antiguos" ? { createdAt: "asc" } : f.sort === "titulo" ? { title: "asc" } : { createdAt: "desc" },
    select: {
      id: true, title: true, originalName: true, mimeType: true, sizeBytes: true, wordCount: true, createdAt: true, isDemo: true,
      retentionUntil: true,
      _count: { select: { analyses: true } },
    },
    take: 200,
  });
}

/** Borrado seguro: archivo cifrado sobrescrito, texto, análisis, informes y extractos en otros análisis. */
export async function deleteDocument(userId: string, id: string) {
  const doc = await getOwnedDocument(userId, id);
  if (doc.storageKey) await storage()?.remove(doc.storageKey);
  await db.$transaction([
    db.similarityMatch.updateMany({
      where: { sourceDocumentId: doc.id },
      data: { sourceExcerpt: "[Contenido eliminado por el usuario]", sourceDocumentId: null },
    }),
    db.document.delete({ where: { id: doc.id } }),
  ]);
  await audit("document.delete", userId, doc.id);
}

/** Purga de retención: elimina documentos vencidos. */
export async function purgeExpiredDocuments(): Promise<number> {
  const expired = await db.document.findMany({
    where: { retentionUntil: { lt: new Date() } },
    select: { id: true, ownerId: true },
    take: 500,
  });
  for (const d of expired) await deleteDocument(d.ownerId, d.id);
  return expired.length;
}
