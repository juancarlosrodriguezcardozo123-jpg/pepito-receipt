import "server-only";
import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { UserFacingError } from "@/server/security/errors";

export const USAGE = {
  similarity: "analysis.similarity",
  ai: "analysis.ai",
  upload: "document.upload",
  externalAi: "external.ai",
  externalSearch: "external.search",
} as const;

const FALLBACK_PLAN = { name: "Básico", monthlyAnalyses: 20, maxFileSizeMb: 10, maxDocuments: 50, allowExternal: false };

export type EffectivePlan = typeof FALLBACK_PLAN;

export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = user?.plan ?? (await db.plan.findFirst({ where: { isDefault: true } })) ?? FALLBACK_PLAN;
  return {
    name: plan.name,
    monthlyAnalyses: plan.monthlyAnalyses,
    maxFileSizeMb: Math.min(plan.maxFileSizeMb, env().MAX_UPLOAD_MB),
    maxDocuments: plan.maxDocuments,
    allowExternal: plan.allowExternal,
  };
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getUsageSummary(userId: string) {
  const plan = await getEffectivePlan(userId);
  const [analysesThisMonth, documents] = await Promise.all([
    db.usageRecord.count({ where: { userId, kind: { in: [USAGE.similarity, USAGE.ai] }, createdAt: { gte: monthStart() } } }),
    db.document.count({ where: { ownerId: userId } }),
  ]);
  return { plan, analysesThisMonth, documents };
}

export async function assertCanAnalyze(userId: string) {
  const { plan, analysesThisMonth } = await getUsageSummary(userId);
  if (analysesThisMonth >= plan.monthlyAnalyses) {
    throw new UserFacingError(`Has alcanzado el límite de ${plan.monthlyAnalyses} análisis de este mes en tu plan «${plan.name}».`, 403);
  }
  return plan;
}

export async function assertCanUpload(userId: string, sizeBytes: number) {
  const { plan, documents } = await getUsageSummary(userId);
  if (documents >= plan.maxDocuments) {
    throw new UserFacingError(`Tu plan permite almacenar hasta ${plan.maxDocuments} documentos. Elimina alguno para continuar.`, 403);
  }
  if (sizeBytes > plan.maxFileSizeMb * 1024 * 1024) {
    throw new UserFacingError(`El archivo supera el tamaño máximo de ${plan.maxFileSizeMb} MB.`, 413);
  }
}

export async function recordUsage(userId: string, kind: string, provider?: string) {
  await db.usageRecord.create({ data: { userId, kind, provider } });
}
