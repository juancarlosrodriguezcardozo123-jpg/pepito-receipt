import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DIR: z.string().default("./storage"),
  STORAGE_ENCRYPTION_KEY: optional,
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(100).default(10),
  MAX_EXTRACTED_CHARS: z.coerce.number().int().positive().default(300_000),
  MAX_PDF_PAGES: z.coerce.number().int().positive().default(300),
  RETENTION_DAYS: z.coerce.number().int().min(0).default(180),
  CRON_SECRET: optional,
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  SMTP_FROM: z.string().default("VerificaAI <no-reply@example.com>"),
  AI_DETECTOR_PROVIDER: z.enum(["none", "http"]).default("none"),
  AI_DETECTOR_NAME: optional,
  AI_DETECTOR_API_URL: optional,
  AI_DETECTOR_API_KEY: optional,
  SEARCH_PROVIDER: z.enum(["none", "http"]).default("none"),
  SEARCH_PROVIDER_NAME: optional,
  SEARCH_API_URL: optional,
  SEARCH_API_KEY: optional,
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

/** Variables de entorno del servidor validadas. Nunca se envían al navegador. */
export function env(): ServerEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
