import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/server/env";

export function isMailerConfigured(): boolean {
  return Boolean(env().SMTP_HOST);
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const e = env();
  if (!e.SMTP_HOST) {
    if (e.NODE_ENV !== "production") {
      console.info(`\n[correo de desarrollo, SMTP no configurado]\nPara: ${to}\nAsunto: ${subject}\n\n${text}\n`);
    } else {
      console.warn("[mailer] SMTP no configurado; no se envió el correo.");
    }
    return;
  }
  const transport = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: e.SMTP_FROM, to, subject, text });
}
