import { getCurrentUser } from "@/server/auth/session";
import { getOwnedAnalysis } from "@/server/services/analyses";
import { renderReport } from "@/server/reports/pdf";
import { toPublicMessage, UserFacingError } from "@/server/security/errors";

export async function GET(_: Request, ctx: RouteContext<"/api/analyses/[id]/report">) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  try {
    const analysis = await getOwnedAnalysis(user.id, (await ctx.params).id);
    const pdf = await renderReport(analysis);
    const name = `informe-${analysis.type === "SIMILARITY" ? "similitud" : "ia"}-${analysis.document.title}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^\w-]+/g, "-")
      .slice(0, 80);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    const status = e instanceof UserFacingError ? e.status : 500;
    return new Response(await toPublicMessage("api.report", e, user.id), { status });
  }
}
