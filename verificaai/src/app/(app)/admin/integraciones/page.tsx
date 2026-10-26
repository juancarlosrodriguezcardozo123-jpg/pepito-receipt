import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { integrationStatus } from "@/server/services/integrations";
import { USAGE } from "@/server/quotas";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysAgo } from "@/lib/format";

export const metadata = { title: "Integraciones" };

function Row({ label, ok, children }: { label: string; ok: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={label} action={<Badge tone={ok ? "ok" : "warn"}>{ok ? "Activo" : "No configurado"}</Badge>} />
      <CardBody className="space-y-2 text-sm text-muted">{children}</CardBody>
    </Card>
  );
}

export default async function Page() {
  await requireAdmin();
  const s = integrationStatus();
  const since = daysAgo(30);
  const [aiCalls, searchCalls, consents] = await Promise.all([
    db.usageRecord.count({ where: { kind: USAGE.externalAi, createdAt: { gte: since } } }),
    db.usageRecord.count({ where: { kind: USAGE.externalSearch, createdAt: { gte: since } } }),
    db.consentRecord.count({ where: { createdAt: { gte: since } } }),
  ]);
  return (
    <>
      <PageHeader title="Integraciones" description="Estado de los servicios. Las claves se configuran con variables de entorno del servidor y nunca se muestran aquí." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Row label="Detector de IA especializado" ok={s.ai.configured}>
          <p>{s.ai.configured ? `Proveedor: ${s.ai.name}` : s.ai.reason}</p>
          <p>Llamadas en 30 días: {aiCalls}</p>
          <p>Variables: <code>AI_DETECTOR_PROVIDER</code>, <code>AI_DETECTOR_API_URL</code>, <code>AI_DETECTOR_API_KEY</code>, <code>AI_DETECTOR_NAME</code>.</p>
        </Row>
        <Row label="Búsqueda de fuentes externas" ok={s.search.configured}>
          <p>{s.search.configured ? `Proveedor: ${s.search.name}` : s.search.reason}</p>
          <p>Consultas en 30 días: {searchCalls}</p>
          <p>Variables: <code>SEARCH_PROVIDER</code>, <code>SEARCH_API_URL</code>, <code>SEARCH_API_KEY</code>, <code>SEARCH_PROVIDER_NAME</code>.</p>
        </Row>
        <Row label="Correo (SMTP)" ok={s.mail.configured}>
          <p>{s.mail.configured ? "Los correos de recuperación se envían por SMTP." : "Sin SMTP: en desarrollo, los enlaces de recuperación se imprimen en la consola del servidor. En producción no se envían."}</p>
        </Row>
        <Row label="Almacenamiento privado" ok={s.storage.configured}>
          <p>Driver: {s.storage.driver}. {s.storage.configured ? "Archivos cifrados con AES-256-GCM." : "Sin STORAGE_ENCRYPTION_KEY: solo se guarda el texto extraído."}</p>
        </Row>
        <Row label="Retención automática" ok={s.retentionDays > 0 && s.cron.configured}>
          <p>{s.retentionDays > 0 ? `Los documentos caducan a los ${s.retentionDays} días.` : "Sin caducidad automática (RETENTION_DAYS=0)."}</p>
          <p>{s.cron.configured ? "Purga disponible en POST /api/cron/retention (requiere CRON_SECRET)." : "Configura CRON_SECRET y programa la llamada a /api/cron/retention."}</p>
        </Row>
        <Row label="Consentimientos registrados" ok>
          <p>{consents} autorizaciones de envío a proveedores externos en 30 días.</p>
        </Row>
      </div>
    </>
  );
}
