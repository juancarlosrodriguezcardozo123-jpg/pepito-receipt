import "server-only";
import { getAiDetector } from "@/server/ai-detection/provider";
import { getSearchProvider } from "@/server/sources/provider";
import { isMailerConfigured } from "@/server/auth/mailer";
import { storage } from "@/server/storage";
import { env } from "@/server/env";

/** Estado de las integraciones sin exponer claves ni URLs privadas. */
export function integrationStatus() {
  const ai = getAiDetector().status();
  const search = getSearchProvider().status();
  return {
    ai,
    search,
    mail: { configured: isMailerConfigured() },
    storage: { configured: storage() !== null, driver: storage()?.name ?? "ninguno" },
    retentionDays: env().RETENTION_DAYS,
    cron: { configured: Boolean(env().CRON_SECRET) },
  };
}
