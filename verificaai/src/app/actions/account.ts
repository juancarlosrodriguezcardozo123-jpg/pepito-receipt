"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { requireUser, destroySession } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { storage } from "@/server/storage";
import { audit, toPublicMessage } from "@/server/security/errors";
import { rateLimit } from "@/server/security/rate-limit";
import { fieldErrors, type FormState } from "@/lib/form";
import { changePasswordSchema, profileSchema } from "@/lib/schemas/auth";

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil actualizado." };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await rateLimit(`chpw:${user.id}`, 10, 900);
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(record.passwordHash, parsed.data.current))) {
      return { fieldErrors: { current: "La contraseña actual no es correcta." } };
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
    await audit("user.password_change", user.id);
    return { ok: true, message: "Contraseña actualizada." };
  } catch (e) {
    return { message: await toPublicMessage("account.password", e, user.id) };
  }
}

export async function logoutEverywhereAction() {
  const user = await requireUser();
  await db.session.deleteMany({ where: { userId: user.id } });
  await destroySession();
  redirect("/iniciar-sesion");
}

/** Elimina la cuenta y todos sus datos (documentos cifrados incluidos). */
export async function deleteAccountAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(record.passwordHash, String(form.get("password") ?? "")))) {
    return { fieldErrors: { password: "La contraseña no es correcta." } };
  }
  if (record.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN" } })) === 1) {
    return { message: "Eres el único administrador. Asigna otro administrador antes de eliminar tu cuenta." };
  }
  const docs = await db.document.findMany({ where: { ownerId: user.id, storageKey: { not: null } }, select: { storageKey: true } });
  for (const d of docs) await storage()?.remove(d.storageKey!);
  await db.user.delete({ where: { id: user.id } });
  await audit("user.delete_account", undefined, user.id);
  await destroySession();
  redirect("/?cuenta-eliminada=1");
}
