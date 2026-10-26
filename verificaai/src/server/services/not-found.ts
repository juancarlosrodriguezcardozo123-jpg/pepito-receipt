import "server-only";
import { notFound } from "next/navigation";
import { UserFacingError } from "@/server/security/errors";

/** Convierte un "no encontrado" del servicio en una página 404 (sin revelar si el recurso existe). */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof UserFacingError && e.status === 404) notFound();
    throw e;
  }
}
