"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { sendMail } from "@/server/auth/mailer";
import { randomToken, sha256 } from "@/server/security/crypto";
import { rateLimit } from "@/server/security/rate-limit";
import { clientIp } from "@/server/security/request";
import { audit, toPublicMessage } from "@/server/security/errors";
import { fieldErrors, type FormState } from "@/lib/form";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/schemas/auth";
import { appConfig } from "@/lib/config";

// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await rateLimit(`register:${await clientIp()}`, 5, 3600);
    const { name, email, password } = parsed.data;
    if (await db.user.findUnique({ where: { email } })) {
      return { fieldErrors: { email: "Ya existe una cuenta con este correo." } };
    }
    const isFirstUser = (await db.user.count()) === 0;
    const plan = await db.plan.findFirst({ where: { isDefault: true } });
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: isFirstUser ? "ADMIN" : "USER", planId: plan?.id },
    });
    await audit("user.register", user.id, undefined, { firstUserAdmin: isFirstUser });
    await createSession(user.id);
  } catch (e) {
    return { message: await toPublicMessage("auth.register", e) };
  }
  redirect("/panel");
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    const { email, password } = parsed.data;
    await rateLimit(`login:${await clientIp()}`, 20, 900);
    await rateLimit(`login-email:${email}`, 8, 900);
    const user = await db.user.findUnique({ where: { email } });
    const ok = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
    if (!user || !ok) return { message: "Correo o contraseña incorrectos." };
    if (user.disabled) return { message: "Esta cuenta está desactivada. Contacta con el administrador." };
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    await audit("user.login", user.id);
  } catch (e) {
    return { message: await toPublicMessage("auth.login", e) };
  }
  redirect("/panel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/iniciar-sesion");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const generic = { ok: true, message: "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña. Caduca en 1 hora." };
  try {
    await rateLimit(`forgot:${await clientIp()}`, 5, 900);
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.disabled) return generic;
    const token = randomToken();
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
    const link = `${env().APP_URL}/restablecer?token=${encodeURIComponent(token)}`;
    await sendMail(
      user.email,
      `${appConfig.name}: restablecer contraseña`,
      `Hola ${user.name}:\n\nPara elegir una nueva contraseña abre este enlace (válido 1 hora):\n${link}\n\nSi no lo solicitaste, ignora este correo.`,
    );
    await audit("user.password_reset_requested", user.id);
    return generic;
  } catch (e) {
    return { message: await toPublicMessage("auth.forgot", e) };
  }
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await rateLimit(`reset:${await clientIp()}`, 10, 900);
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return { message: "El enlace no es válido o ha caducado. Solicita uno nuevo." };
    }
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
      db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    await audit("user.password_reset", record.userId);
  } catch (e) {
    return { message: await toPublicMessage("auth.reset", e) };
  }
  redirect("/iniciar-sesion?restablecida=1");
}
