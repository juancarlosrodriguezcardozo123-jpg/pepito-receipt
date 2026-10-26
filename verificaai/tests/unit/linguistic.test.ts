import { describe, expect, it } from "vitest";
import { analyzeLinguistic, mtld } from "@/server/ai-detection/linguistic";

describe("mtld", () => {
  it("es mayor para vocabulario variado que para repetitivo", () => {
    const varied = "el gato negro saltó sobre la valla mientras un perro pequeño ladraba desde el jardín vecino bajo la lluvia fría".split(" ");
    const repetitive = Array(4).fill("el gato come el pescado y el gato duerme").join(" ").split(" ");
    expect(mtld(varied)).toBeGreaterThan(mtld(repetitive));
  });
});

describe("analyzeLinguistic", () => {
  it("es experimental y no produce probabilidad", () => {
    const r = analyzeLinguistic("Texto breve de prueba.");
    expect(r.experimental).toBe(true);
    expect(r).not.toHaveProperty("probability");
    expect(r.summary).toMatch(/demasiado corto/);
  });

  it("marca como notable un ritmo de oraciones muy uniforme", () => {
    const sentence = "Este enfoque permite mejorar los resultados de forma significativa en el contexto actual.";
    const text = Array(12).fill(sentence).join(" ");
    const r = analyzeLinguistic(text);
    const burst = r.documentSignals.find((s) => s.id === "burstiness")!;
    expect(burst.level).toBe("notable");
    expect(r.documentSignals.find((s) => s.id === "repetition")!.level).toBe("notable");
  });

  it("un texto con ritmo variado no marca la variación como notable", () => {
    const text =
      "Llovía. Salimos igualmente al camino viejo que bordea el río, aunque mi abuela insistía en que esperáramos a que escampara del todo. ¿Para qué? Nadie supo responderle. El barro nos llegaba a los tobillos y, sin embargo, reíamos como si aquella tarde gris fuese la mejor del verano entero. Volvimos tarde.";
    const r = analyzeLinguistic(text);
    expect(r.documentSignals.find((s) => s.id === "burstiness")!.level).toBe("baja");
  });
});
