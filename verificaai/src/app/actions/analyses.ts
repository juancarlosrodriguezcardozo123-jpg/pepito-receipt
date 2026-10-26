"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { deleteAnalysis, runAiAnalysis, runSimilarityAnalysis } from "@/server/services/analyses";
import { toPublicMessage } from "@/server/security/errors";
import type { FormState } from "@/lib/form";

const cuid = z.string().cuid();

export async function similarityAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      documentId: cuid,
      compareWith: z.enum(["all", "selected", "none"]),
      selectedIds: z.array(cuid).max(500),
      collectionIds: z.array(cuid).max(100),
      useExternal: z.boolean(),
      externalConsent: z.boolean(),
    })
    .safeParse({
      documentId: form.get("documentId"),
      compareWith: form.get("compareWith"),
      selectedIds: form.getAll("selectedIds"),
      collectionIds: form.getAll("collectionIds"),
      useExternal: form.get("useExternal") === "on",
      externalConsent: form.get("externalConsent") === "on",
    });
  if (!parsed.success) return { message: "Selecciona un documento y las fuentes de comparación." };
  let id: string;
  try {
    id = (await runSimilarityAnalysis(user.id, parsed.data)).id;
  } catch (e) {
    return { message: await toPublicMessage("analysis.similarity", e, user.id) };
  }
  redirect(`/analisis/${id}`);
}

export async function aiDetectionAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const documentId = cuid.safeParse(form.get("documentId"));
  if (!documentId.success) return { message: "Selecciona un documento." };
  let id: string;
  try {
    id = (
      await runAiAnalysis(user.id, {
        documentId: documentId.data,
        useExternal: form.get("useExternal") === "on",
        externalConsent: form.get("externalConsent") === "on",
      })
    ).id;
  } catch (e) {
    return { message: await toPublicMessage("analysis.ai", e, user.id) };
  }
  redirect(`/analisis/${id}`);
}

export async function deleteAnalysisAction(form: FormData) {
  const user = await requireUser();
  await deleteAnalysis(user.id, cuid.parse(form.get("id")));
  redirect("/analisis?eliminado=1");
}
