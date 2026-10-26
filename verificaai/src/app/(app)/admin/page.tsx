import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { integrationStatus } from "@/server/services/integrations";
import { USAGE } from "@/server/quotas";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysAgo, fmtNum } from "@/lib/format";

export const metadata = { title: "Administración" };

export default async function Page() {
  await requireAdmin();
  const since = daysAgo(30);
  const [users, newUsers, documents, analyses, sim30, ai30, ext30, errors7] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.document.count(),
    db.analysis.count(),
    db.usageRecord.count({ where: { kind: USAGE.similarity, createdAt: { gte: since } } }),
    db.usageRecord.count({ where: { kind: USAGE.ai, createdAt: { gte: since } } }),
    db.usageRecord.count({ where: { kind: { in: [USAGE.externalAi, USAGE.externalSearch] }, createdAt: { gte: since } } }),
    db.systemError.count({ where: { createdAt: { gte: daysAgo(7) } } }),
  ]);
  const s = integrationStatus();
  const stats = [
    ["Usuarios", fmtNum(users), `${newUsers} nuevos en 30 días`],
    ["Documentos almacenados", fmtNum(documents), "en todo el sistema"],
    ["Análisis totales", fmtNum(analyses), `${sim30} de similitud y ${ai30} de IA en 30 días`],
    ["Llamadas externas (30 d)", fmtNum(ext30), "detector de IA y búsqueda"],
  ];
  const integrations = [
    ["Detector de IA", s.ai.configured, s.ai.name],
    ["Búsqueda externa", s.search.configured, s.search.name],
    ["Correo SMTP", s.mail.configured, s.mail.configured ? "Configurado" : "Enlaces en la consola (desarrollo)"],
    ["Almacenamiento cifrado", s.storage.configured, s.storage.driver],
  ] as const;

  return (
    <>
      <PageHeader title="Administración" description="Estadísticas generales. Los administradores no tienen acceso al contenido de los documentos de los usuarios." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, hint]) => (
          <Card key={label} className="px-5 py-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs text-muted">{hint}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Integraciones" action={<Link href="/admin/integraciones" className="text-sm text-accent hover:underline">Detalles</Link>} />
          <ul className="divide-y divide-border">
            {integrations.map(([label, ok, detail]) => (
              <li key={label} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span><span className="font-medium">{label}</span> <span className="text-muted">· {detail}</span></span>
                <Badge tone={ok ? "ok" : "warn"}>{ok ? "Activo" : "No configurado"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Errores del sistema" action={<Link href="/admin/errores" className="text-sm text-accent hover:underline">Ver registro</Link>} />
          <CardBody>
            <p className="text-2xl font-semibold tabular-nums">{errors7}</p>
            <p className="text-sm text-muted">errores registrados en los últimos 7 días</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
