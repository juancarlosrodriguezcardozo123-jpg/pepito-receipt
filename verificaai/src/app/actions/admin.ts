"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { detectKind, extractText } from "@/server/extraction";
import { countWords, normalizeExtractedText } from "@/server/extraction/normalize";
import { audit, toPublicMessage, UserFacingError } from "@/server/security/errors";
import { env } from "@/server/env";
import type { FormState } from "@/lib/form";

const cuid = z.string().cuid();

export async function updateUserAction(form: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({ id: cuid, role: z.enum(["USER", "ADMIN"]), planId: z.union([cuid, z.literal("")]), disabled: z.boolean() })
    .parse({ id: form.get("id"), role: form.get("role"), planId: form.get("planId") ?? "", disabled: form.get("disabled") === "on" });
  if (data.id === admin.id && (data.role !== "ADMIN" || data.disabled)) {
    throw new UserFacingError("No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.");
  }
  await db.user.update({ where: { id: data.id }, data: { role: data.role, planId: data.planId || null, disabled: data.disabled } });
  if (data.disabled) await db.session.deleteMany({ where: { userId: data.id } });
  await audit("admin.user_update", admin.id, data.id, { role: data.role, planId: data.planId, disabled: data.disabled });
  revalidatePath("/admin/usuarios");
}

const planSchema = z.object({
  id: z.union([cuid, z.literal("")]).optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  monthlyAnalyses: z.coerce.number().int().min(0).max(100_000),
  maxFileSizeMb: z.coerce.number().int().min(1).max(100),
  maxDocuments: z.coerce.number().int().min(1).max(100_000),
  allowExternal: z.boolean(),
  isDefault: z.boolean(),
});

export async function savePlanAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = planSchema.safeParse({
    ...Object.fromEntries(form),
    allowExternal: form.get("allowExternal") === "on",
    isDefault: form.get("isDefault") === "on",
  });
  if (!parsed.success) return { message: "Revisa los campos del plan: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const { id, ...data } = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.plan.updateMany({ data: { isDefault: false } });
      if (id) await tx.plan.update({ where: { id }, data });
      else await tx.plan.create({ data });
    });
  } catch (e) {
    return { message: await toPublicMessage("admin.plan", e, admin.id) };
  }
  await audit("admin.plan_save", admin.id, id || data.name);
  revalidatePath("/admin/planes");
  return { ok: true, message: "Plan guardado." };
}

export async function deletePlanAction(form: FormData) {
  const admin = await requireAdmin();
  const id = cuid.parse(form.get("id"));
  await db.plan.delete({ where: { id } });
  await audit("admin.plan_delete", admin.id, id);
  revalidatePath("/admin/planes");
}

export async function createCollectionAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Escribe un nombre de al menos 2 caracteres." };
  try {
    await db.sourceCollection.create({ data: parsed.data });
  } catch (e) {
    return { message: await toPublicMessage("admin.collection", e, admin.id) };
  }
  await audit("admin.collection_create", admin.id, parsed.data.name);
  revalidatePath("/admin/colecciones");
  return { ok: true, message: "Colección creada." };
}

export async function toggleCollectionAction(form: FormData) {
  const admin = await requireAdmin();
  const id = cuid.parse(form.get("id"));
  const c = await db.sourceCollection.findUniqueOrThrow({ where: { id } });
  await db.sourceCollection.update({ where: { id }, data: { isActive: !c.isActive } });
  await audit("admin.collection_toggle", admin.id, id);
  revalidatePath("/admin/colecciones");
}

export async function deleteCollectionAction(form: FormData) {
  const admin = await requireAdmin();
  const id = cuid.parse(form.get("id"));
  await db.sourceCollection.delete({ where: { id } });
  await audit("admin.collection_delete", admin.id, id);
  revalidatePath("/admin/colecciones");
}

export async function addSourceDocumentAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      collectionId: cuid,
      title: z.string().trim().min(1, "Escribe un título.").max(300),
      author: z.string().trim().max(200).optional(),
      url: z.union([z.string().trim().url("URL no válida."), z.literal("")]).optional(),
      text: z.string().max(400_000).optional(),
    })
    .safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    let text = normalizeExtractedText(parsed.data.text ?? "");
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > env().MAX_UPLOAD_MB * 1024 * 1024) throw new UserFacingError("Archivo demasiado grande.");
      const buf = Buffer.from(await file.arrayBuffer());
      text = await extractText(buf, await detectKind(buf, file.name));
    }
    if (text.length < 20) throw new UserFacingError("Pega el texto o adjunta un archivo PDF, DOCX o TXT.");
    await db.sourceDocument.create({
      data: {
        collectionId: parsed.data.collectionId,
        title: parsed.data.title,
        author: parsed.data.author || null,
        url: parsed.data.url || null,
        text,
        wordCount: countWords(text),
      },
    });
  } catch (e) {
    return { message: await toPublicMessage("admin.source_doc", e, admin.id) };
  }
  await audit("admin.source_add", admin.id, parsed.data.collectionId);
  revalidatePath(`/admin/colecciones/${parsed.data.collectionId}`);
  return { ok: true, message: "Documento añadido a la colección." };
}

export async function deleteSourceDocumentAction(form: FormData) {
  const admin = await requireAdmin();
  const id = cuid.parse(form.get("id"));
  const d = await db.sourceDocument.delete({ where: { id } });
  await audit("admin.source_delete", admin.id, id);
  revalidatePath(`/admin/colecciones/${d.collectionId}`);
}

export async function clearErrorsAction() {
  const admin = await requireAdmin();
  await db.systemError.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  await audit("admin.errors_clear", admin.id);
  revalidatePath("/admin/errores");
}
