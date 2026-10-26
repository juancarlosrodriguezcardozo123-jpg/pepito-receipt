"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createDocumentFromText, deleteDocument } from "@/server/services/documents";
import { rateLimit } from "@/server/security/rate-limit";
import { toPublicMessage } from "@/server/security/errors";
import type { FormState } from "@/lib/form";

const pasteSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  text: z.string().min(1, "Pega o escribe el texto que quieres analizar.").max(400_000, "El texto es demasiado largo."),
  next: z.enum(["documento", "similitud", "detector-ia"]).default("documento"),
});

export async function pasteTextAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = pasteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: { text: parsed.error.issues[0].message } };
  let id: string;
  try {
    await rateLimit(`upload:${user.id}`, 60, 3600);
    id = (await createDocumentFromText(user.id, parsed.data.title, parsed.data.text)).id;
  } catch (e) {
    return { message: await toPublicMessage("documents.paste", e, user.id) };
  }
  const next = parsed.data.next;
  redirect(next === "documento" ? `/documentos/${id}` : `/${next}?documento=${id}`);
}

export async function deleteDocumentAction(form: FormData) {
  const user = await requireUser();
  const id = z.string().cuid().parse(form.get("id"));
  await deleteDocument(user.id, id);
  revalidatePath("/documentos");
  if (form.get("redirect") === "1") redirect("/documentos?eliminado=1");
}
