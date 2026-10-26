import { getCurrentUser } from "@/server/auth/session";
import { getOwnedDocument } from "@/server/services/documents";
import { storage } from "@/server/storage";
import { toPublicMessage, UserFacingError } from "@/server/security/errors";

export async function GET(_: Request, ctx: RouteContext<"/api/documents/[id]/original">) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  try {
    const doc = await getOwnedDocument(user.id, (await ctx.params).id);
    const store = storage();
    if (!doc.storageKey || !store) throw new UserFacingError("El archivo original no está almacenado.", 404);
    const data = await store.get(doc.storageKey);
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": doc.mimeType,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    const status = e instanceof UserFacingError ? e.status : 500;
    return new Response(await toPublicMessage("api.original", e, user.id), { status });
  }
}
