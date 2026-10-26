import "server-only";
import { z } from "zod";
import { env } from "@/server/env";

export type AiDetectorStatus = {
  configured: boolean;
  id: string;
  name: string;
  external: boolean;
  reason?: string;
};

export type AiProviderResult = {
  /** Indicador del proveedor en el rango 0–100. */
  documentScore: number;
  paragraphs: { index: number; score: number }[];
  modelVersion?: string;
};

export interface AiDetector {
  status(): AiDetectorStatus;
  analyze(input: { text: string; paragraphs: string[] }): Promise<AiProviderResult>;
}

const responseSchema = z.object({
  documentScore: z.number().min(0).max(1),
  paragraphs: z.array(z.object({ index: z.number().int().min(0), score: z.number().min(0).max(1) })).default([]),
  modelVersion: z.string().max(100).optional(),
});

/**
 * Adaptador HTTP genérico. Contrato (ver README):
 *   POST AI_DETECTOR_API_URL  Authorization: Bearer AI_DETECTOR_API_KEY
 *   { "text": string, "paragraphs": string[], "language": "es" }
 *   → { "documentScore": 0..1, "paragraphs": [{ "index": n, "score": 0..1 }], "modelVersion"?: string }
 * Para un proveedor comercial con otra API, cree un adaptador que implemente `AiDetector`.
 */
class HttpAiDetector implements AiDetector {
  constructor(private url: string, private key: string, private name: string) {}

  status(): AiDetectorStatus {
    return { configured: true, id: "http", name: this.name, external: true };
  }

  async analyze(input: { text: string; paragraphs: string[] }): Promise<AiProviderResult> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ ...input, language: "es" }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Detector de IA respondió ${res.status}`);
    const parsed = responseSchema.parse(await res.json());
    return {
      documentScore: Math.round(parsed.documentScore * 1000) / 10,
      paragraphs: parsed.paragraphs.map((p) => ({ index: p.index, score: Math.round(p.score * 1000) / 10 })),
      modelVersion: parsed.modelVersion,
    };
  }
}

class NotConfiguredDetector implements AiDetector {
  constructor(private reason: string) {}
  status(): AiDetectorStatus {
    return { configured: false, id: "none", name: "Sin detector configurado", external: false, reason: this.reason };
  }
  async analyze(): Promise<AiProviderResult> {
    throw new Error("No hay detector de IA configurado");
  }
}

export function getAiDetector(): AiDetector {
  const e = env();
  if (e.AI_DETECTOR_PROVIDER === "http") {
    if (!e.AI_DETECTOR_API_URL || !e.AI_DETECTOR_API_KEY) {
      return new NotConfiguredDetector("AI_DETECTOR_PROVIDER=http requiere AI_DETECTOR_API_URL y AI_DETECTOR_API_KEY.");
    }
    return new HttpAiDetector(e.AI_DETECTOR_API_URL, e.AI_DETECTOR_API_KEY, e.AI_DETECTOR_NAME ?? "Detector externo (HTTP)");
  }
  return new NotConfiguredDetector("AI_DETECTOR_PROVIDER no está configurado.");
}
