import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { randomToken, sha256 } from "@/server/security/crypto";

const COOKIE = "va_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
};

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300);
  await db.session.create({ data: { id: sha256(token), userId, expiresAt, userAgent } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  store.delete(COOKIE);
}

/** Usuario autenticado de la solicitud actual (memorizado por solicitud). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, disabled: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabled) return null;
  const { id, email, name, role } = session.user;
  return { id, email, name, role };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/iniciar-sesion");
  return user;
}

/** Para rutas de administración: un usuario sin rol ADMIN recibe 404 (no se revela la ruta). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}
