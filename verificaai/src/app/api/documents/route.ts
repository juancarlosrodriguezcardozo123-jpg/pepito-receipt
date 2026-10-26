import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { createDocumentFromFile } from "@/server/services/documents";
import { rateLimit } from "@/server/security/rate-limit";
import { isSameOrigin } from "@/server/security/request";
import { toPublicMessage, UserFacingError } from "@/server/security/errors";
import { env } from "@/server/env";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > (env().MAX_UPLOAD_MB + 1) * 1024 * 1024) {
    return NextResponse.json({ error: `El archivo supera el máximo de ${env().MAX_UPLOAD_MB} MB.` }, { status: 413 });
  }
  try {
    await rateLimit(`upload:${user.id}`, 60, 3600);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new UserFacingError("No se recibió ningún archivo.");
    const doc = await createDocumentFromFile(user.id, file);
    return NextResponse.json({ id: doc.id, title: doc.title, wordCount: doc.wordCount }, { status: 201 });
  } catch (e) {
    const status = e instanceof UserFacingError ? e.status : 500;
    return NextResponse.json({ error: await toPublicMessage("api.upload", e, user.id) }, { status });
  }
}
