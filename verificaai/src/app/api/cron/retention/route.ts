import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { safeEqual } from "@/server/security/crypto";
import { purgeExpiredDocuments } from "@/server/services/documents";
import { db } from "@/server/db/client";
import { logSystemError } from "@/server/security/errors";

/** Purga de retención. Programar (p. ej. diariamente) con: Authorization: Bearer <CRON_SECRET>. */
export async function POST(request: Request) {
  const secret = env().CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const deleted = await purgeExpiredDocuments();
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86_400_000) } } });
    return NextResponse.json({ deleted });
  } catch (e) {
    await logSystemError("cron.retention", e);
    return NextResponse.json({ error: "Error en la purga" }, { status: 500 });
  }
}
