import "server-only";
import { db } from "@/server/db/client";
import { UserFacingError } from "./errors";

/**
 * Límite de solicitudes de ventana fija almacenado en PostgreSQL.
 * Funciona con varias instancias de la app sin infraestructura adicional.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${windowStart})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" = ${windowStart} THEN "RateLimitBucket"."count" + 1 ELSE 1 END,
      "windowStart" = ${windowStart}
    RETURNING "count"`;
  if ((rows[0]?.count ?? 0) > limit) {
    throw new UserFacingError("Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.", 429);
  }
}
