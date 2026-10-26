import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { db } from "@/server/db/client";
import { createDocumentFromFile, createDocumentFromText, deleteDocument, getOwnedDocument, listDocuments } from "@/server/services/documents";
import { getOwnedAnalysis, listAnalyses, runAiAnalysis, runSimilarityAnalysis } from "@/server/services/analyses";
import { renderReport } from "@/server/reports/pdf";
import { UserFacingError } from "@/server/security/errors";
import { rateLimit } from "@/server/security/rate-limit";

const TEXT_A =
  "La economía circular propone un modelo de producción y consumo que reduce al mínimo los residuos mediante la reutilización, la reparación y el reciclaje de los materiales. A diferencia del modelo lineal, busca mantener los recursos en uso durante el mayor tiempo posible.";
const TEXT_B =
  "En mi trabajo sostengo que la economía circular propone un modelo de producción y consumo que reduce al mínimo los residuos, algo que ya se aplica en varias ciudades europeas con resultados desiguales según el sector.";

let alice: string;
let bob: string;

beforeAll(async () => {
  alice = (await db.user.create({ data: { email: "alice@test.local", name: "Alice", passwordHash: "x" } })).id;
  bob = (await db.user.create({ data: { email: "bob@test.local", name: "Bob", passwordHash: "x" } })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("aislamiento entre usuarios", () => {
  it("un usuario no puede leer, listar, analizar ni borrar documentos ajenos", async () => {
    const doc = await createDocumentFromText(alice, "Privado de Alice", TEXT_A);
    await expect(getOwnedDocument(bob, doc.id)).rejects.toMatchObject({ status: 404 });
    expect(await listDocuments(bob)).toHaveLength(0);
    await expect(deleteDocument(bob, doc.id)).rejects.toBeInstanceOf(UserFacingError);
    await expect(
      runSimilarityAnalysis(bob, { documentId: doc.id, compareWith: "all", selectedIds: [], collectionIds: [], useExternal: false, externalConsent: false }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(runAiAnalysis(bob, { documentId: doc.id, useExternal: false, externalConsent: false })).rejects.toMatchObject({ status: 404 });
  });

  it("los documentos de otro usuario nunca se usan como fuente de comparación", async () => {
    await createDocumentFromText(alice, "Fuente de Alice", TEXT_A);
    const bobDoc = await createDocumentFromText(bob, "Trabajo de Bob", TEXT_B);
    await expect(
      runSimilarityAnalysis(bob, { documentId: bobDoc.id, compareWith: "all", selectedIds: [], collectionIds: [], useExternal: false, externalConsent: false }),
    ).rejects.toThrow(/No hay fuentes/);
  });
});

describe("análisis de similitud", () => {
  it("encuentra coincidencias con los documentos propios y genera el informe PDF", async () => {
    const src = await createDocumentFromText(alice, "Fuente", TEXT_A);
    const target = await createDocumentFromText(alice, "Trabajo", TEXT_B);
    const a = await runSimilarityAnalysis(alice, {
      documentId: target.id, compareWith: "selected", selectedIds: [src.id], collectionIds: [], useExternal: false, externalConsent: false,
    });
    expect(a.status).toBe("COMPLETED");
    expect(a.score).toBeGreaterThan(20);
    const full = await getOwnedAnalysis(alice, a.id);
    expect(full.matches[0]).toMatchObject({ sourceType: "USER_DOCUMENT", sourceDocumentId: src.id, kind: "EXACT" });
    await expect(getOwnedAnalysis(bob, a.id)).rejects.toMatchObject({ status: 404 });
    const pdf = await renderReport(full);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rechaza fuentes externas si no hay proveedor configurado", async () => {
    const d = await createDocumentFromText(alice, "X", TEXT_B);
    await expect(
      runSimilarityAnalysis(alice, { documentId: d.id, compareWith: "all", selectedIds: [], collectionIds: [], useExternal: true, externalConsent: true }),
    ).rejects.toThrow(/fuente externa/);
  });

  it("al borrar un documento fuente se eliminan sus extractos de otros análisis", async () => {
    const src = await createDocumentFromText(alice, "Fuente a borrar", TEXT_A);
    const t = await createDocumentFromText(alice, "Trabajo 2", TEXT_B);
    const a = await runSimilarityAnalysis(alice, {
      documentId: t.id, compareWith: "selected", selectedIds: [src.id], collectionIds: [], useExternal: false, externalConsent: false,
    });
    await deleteDocument(alice, src.id);
    const after = await getOwnedAnalysis(alice, a.id);
    expect(after.matches.every((m) => m.sourceExcerpt.startsWith("[Contenido eliminado"))).toBe(true);
  });
});

describe("detector de IA", () => {
  it("sin detector configurado marca el análisis como no disponible y no da porcentaje", async () => {
    const d = await createDocumentFromText(alice, "Ensayo", Array(8).fill(TEXT_A).join("\n\n"));
    const a = await runAiAnalysis(alice, { documentId: d.id, useExternal: false, externalConsent: false });
    expect(a.status).toBe("UNAVAILABLE");
    expect(a.score).toBeNull();
    expect((a.details as { linguistic: { experimental: boolean } }).linguistic.experimental).toBe(true);
    expect((await listAnalyses(alice, { type: "AI_DETECTION" })).length).toBeGreaterThan(0);
  });
});

describe("carga de archivos", () => {
  it("acepta TXT, lo guarda cifrado y lo borra de forma segura", async () => {
    const file = new File([TEXT_A], "ensayo.txt", { type: "text/plain" });
    const doc = await createDocumentFromFile(alice, file);
    expect(doc.storageKey).toBeTruthy();
    const p = path.resolve(".test-storage", doc.storageKey!);
    expect(existsSync(p)).toBe(true);
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(p).includes(Buffer.from("economía"))).toBe(false); // cifrado
    await deleteDocument(alice, doc.id);
    expect(existsSync(p)).toBe(false);
  });

  it("rechaza un archivo cuya extensión no coincide con su contenido", async () => {
    const fake = new File([Buffer.from("%PDF-1.4 falso")], "trabajo.txt");
    await expect(createDocumentFromFile(alice, fake)).rejects.toThrow(/Formato no admitido/);
    const exe = new File([Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03])], "virus.pdf");
    await expect(createDocumentFromFile(alice, exe)).rejects.toThrow(/Formato no admitido/);
  });
});

describe("límites", () => {
  it("rate limit bloquea al superar el máximo", async () => {
    for (let i = 0; i < 3; i++) await rateLimit("test:key", 3, 60);
    await expect(rateLimit("test:key", 3, 60)).rejects.toMatchObject({ status: 429 });
  });

  it("aplica la cuota mensual del plan", async () => {
    const plan = await db.plan.create({ data: { name: "Mini", monthlyAnalyses: 1, maxFileSizeMb: 1, maxDocuments: 10 } });
    const carol = (await db.user.create({ data: { email: "carol@test.local", name: "Carol", passwordHash: "x", planId: plan.id } })).id;
    const d = await createDocumentFromText(carol, "Doc", Array(4).fill(TEXT_A).join("\n\n"));
    await runAiAnalysis(carol, { documentId: d.id, useExternal: false, externalConsent: false });
    await expect(runAiAnalysis(carol, { documentId: d.id, useExternal: false, externalConsent: false })).rejects.toThrow(/límite/);
  });
});
