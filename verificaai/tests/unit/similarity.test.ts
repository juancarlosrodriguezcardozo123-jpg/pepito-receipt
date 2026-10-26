import { describe, expect, it } from "vitest";
import { compareText } from "@/server/similarity/engine";
import { classifyRange, quoteRanges, referencesStart } from "@/server/similarity/classify";
import { tokenize } from "@/server/similarity/text";

const SOURCE =
  "La economía circular propone un modelo de producción y consumo que reduce al mínimo los residuos mediante la reutilización, la reparación y el reciclaje de los materiales.";

describe("tokenize", () => {
  it("normaliza tildes y mayúsculas y conserva posiciones", () => {
    const t = tokenize("Économie CIRCULAR, ¡sí!");
    expect(t.map((x) => x.norm)).toEqual(["economie", "circular", "si"]);
    expect("Économie CIRCULAR, ¡sí!".slice(t[1].start, t[1].end)).toBe("CIRCULAR");
  });
});

describe("compareText", () => {
  it("sin fuentes coincidentes da 0 %", () => {
    const r = compareText("Un texto completamente distinto que habla de astronomía y de las estrellas lejanas.", [
      { key: "s", type: "COLLECTION", title: "S", text: SOURCE },
    ]);
    expect(r.score).toBe(0);
    expect(r.matches).toHaveLength(0);
  });

  it("detecta una coincidencia exacta aunque cambien mayúsculas, tildes y puntuación", () => {
    const target =
      "Mi ensayo empieza aquí. la ECONOMIA circular propone un modelo de produccion y consumo que reduce al minimo los residuos. Y termina con ideas propias sobre el tema elegido.";
    const r = compareText(target, [{ key: "s", type: "COLLECTION", title: "S", text: SOURCE }]);
    const exact = r.matches.filter((m) => m.kind === "EXACT");
    expect(exact).toHaveLength(1);
    expect(exact[0].wordCount).toBe(16);
    expect(target.slice(exact[0].start, exact[0].end)).toMatch(/^la ECONOMIA circular.*residuos$/);
    expect(r.score).toBeCloseTo((16 / tokenize(target).length) * 100, 0);
  });

  it("no cuenta secuencias de menos de 8 palabras como exactas", () => {
    const r = compareText("Hablamos de la economía circular propone algo distinto hoy mismo en clase.", [
      { key: "s", type: "COLLECTION", title: "S", text: SOURCE },
    ]);
    expect(r.matches.filter((m) => m.kind === "EXACT")).toHaveLength(0);
  });

  it("documento idéntico a la fuente: 100 %", () => {
    const r = compareText(SOURCE, [{ key: "s", type: "COLLECTION", title: "S", text: SOURCE }]);
    expect(r.score).toBe(100);
    expect(r.bySource[0]).toMatchObject({ sourceKey: "s", percent: 100 });
  });

  it("detecta similitud aproximada en una paráfrasis léxica", () => {
    const target =
      "Mediante reutilización, reparación y reciclaje de materiales, la economía circular plantea un modelo de consumo y producción que minimiza residuos.";
    const r = compareText(target, [{ key: "s", type: "COLLECTION", title: "S", text: SOURCE }]);
    expect(r.matches.some((m) => m.kind === "APPROXIMATE")).toBe(true);
    expect(r.score).toBeGreaterThan(50);
  });

  it("clasifica citas entre comillas y las excluye del porcentaje sin clasificar", () => {
    const target = `Como señala el autor, "${SOURCE}" Esta idea me parece interesante para mi trabajo final del curso.`;
    const r = compareText(target, [{ key: "s", type: "COLLECTION", title: "S", text: SOURCE }]);
    expect(r.matches[0].category).toBe("QUOTE");
    expect(r.scoreExcludingCitations).toBe(0);
    expect(r.score).toBeGreaterThan(0);
  });

  it("atribuye cada palabra una sola vez aunque coincida con varias fuentes", () => {
    const r = compareText(SOURCE, [
      { key: "a", type: "COLLECTION", title: "A", text: SOURCE },
      { key: "b", type: "COLLECTION", title: "B", text: SOURCE },
    ]);
    expect(r.matchedWords).toBe(r.totalWords);
    expect(r.score).toBe(100);
  });
});

describe("clasificación", () => {
  it("detecta la sección de referencias", () => {
    const text = "Cuerpo del trabajo ".repeat(30) + "\nReferencias\nPérez, J. (2020). Título. Editorial.";
    const start = referencesStart(text)!;
    expect(start).toBeGreaterThan(0);
    expect(classifyRange({ start: start + 15, end: start + 30 }, [], start)).toBe("REFERENCE");
  });

  it("reconoce comillas tipográficas y angulares", () => {
    const q = quoteRanges("Dijo «hola mundo» y luego “adiós”.");
    expect(q).toHaveLength(2);
  });
});
