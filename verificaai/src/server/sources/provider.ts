import "server-only";
import { z } from "zod";
import { env } from "@/server/env";

export type SearchStatus = { configured: boolean; name: string; reason?: string };
export type SearchResult = { title: string; url: string; text: string };

export interface SearchProvider {
  status(): SearchStatus;
  search(query: string): Promise<SearchResult[]>;
}

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().max(500),
        url: z.string().url(),
        text: z.string().max(200_000).optional(),
        snippet: z.string().max(5000).optional(),
      }),
    )
    .max(20),
});

/**
 * Adaptador HTTP genérico para buscadores o bases documentales autorizadas. Contrato (ver README):
 *   POST SEARCH_API_URL  Authorization: Bearer SEARCH_API_KEY   { "query": string }
 *   → { "results": [{ "title", "url", "text"? , "snippet"? }] }
 */
class HttpSearchProvider implements SearchProvider {
  constructor(private url: string, private key: string, private name: string) {}
  status(): SearchStatus {
    return { configured: true, name: this.name };
  }
  async search(query: string): Promise<SearchResult[]> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Proveedor de búsqueda respondió ${res.status}`);
    const { results } = responseSchema.parse(await res.json());
    return results
      .map((r) => ({ title: r.title, url: r.url, text: r.text ?? r.snippet ?? "" }))
      .filter((r) => r.text.length > 0);
  }
}

class NoSearch implements SearchProvider {
  constructor(private reason: string) {}
  status(): SearchStatus {
    return { configured: false, name: "Sin fuente externa", reason: this.reason };
  }
  async search(): Promise<SearchResult[]> {
    return [];
  }
}

export function getSearchProvider(): SearchProvider {
  const e = env();
  if (e.SEARCH_PROVIDER === "http") {
    if (!e.SEARCH_API_URL || !e.SEARCH_API_KEY) return new NoSearch("SEARCH_PROVIDER=http requiere SEARCH_API_URL y SEARCH_API_KEY.");
    return new HttpSearchProvider(e.SEARCH_API_URL, e.SEARCH_API_KEY, e.SEARCH_PROVIDER_NAME ?? "Búsqueda externa (HTTP)");
  }
  return new NoSearch("SEARCH_PROVIDER no está configurado.");
}

/** Selecciona oraciones distintivas (largas y con muchas palabras de contenido) para consultar al buscador. */
export function pickQueries(text: string, max = 5): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 12 && s.length <= 300);
  return sentences.sort((a, b) => b.length - a.length).slice(0, max);
}
