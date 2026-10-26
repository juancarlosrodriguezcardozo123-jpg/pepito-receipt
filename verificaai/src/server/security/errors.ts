import "server-only";
import { db } from "@/server/db/client";

/** Error con mensaje seguro para mostrar al usuario. */
export class UserFacingError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** Registra un error interno sin exponer detalles al cliente. */
export async function logSystemError(scope: string, error: unknown, userId?: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[${scope}]`, err);
  try {
    await db.systemError.create({
      data: { scope, message: err.message.slice(0, 2000), stack: err.stack?.slice(0, 8000), userId },
    });
  } catch (e) {
    console.error("[logSystemError] no se pudo registrar el error", e);
  }
}

/** Convierte cualquier error en un mensaje apto para el usuario. */
export async function toPublicMessage(scope: string, error: unknown, userId?: string): Promise<string> {
  if (error instanceof UserFacingError) return error.message;
  await logSystemError(scope, error, userId);
  return "Ocurrió un error inesperado. Inténtalo de nuevo más tarde.";
}

export async function audit(action: string, userId?: string, target?: string, meta?: Record<string, unknown>) {
  try {
    await db.auditLog.create({ data: { action, userId, target, meta: meta as object | undefined } });
  } catch (e) {
    console.error("[audit]", e);
  }
}
