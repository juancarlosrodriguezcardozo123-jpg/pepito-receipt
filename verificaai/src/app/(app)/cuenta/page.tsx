import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getUsageSummary } from "@/server/quotas";
import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { logoutEverywhereAction } from "@/app/actions/account";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBar } from "@/components/analysis/score";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/account/forms";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Cuenta" };

export default async function Page() {
  const user = await requireUser();
  const [usage, sessions, consents] = await Promise.all([
    getUsageSummary(user.id),
    db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
    db.consentRecord.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const retention = env().RETENTION_DAYS;

  return (
    <>
      <PageHeader title="Cuenta y configuración" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Perfil" />
          <CardBody><ProfileForm name={user.name} email={user.email} /></CardBody>
        </Card>
        <Card>
          <CardHeader title={`Plan: ${usage.plan.name}`} description="Las cuotas las gestiona el administrador." />
          <CardBody className="space-y-4">
            <ScoreBar value={(usage.analysesThisMonth / Math.max(1, usage.plan.monthlyAnalyses)) * 100} label={`Análisis este mes: ${usage.analysesThisMonth} de ${usage.plan.monthlyAnalyses}`} tone="accent" />
            <ScoreBar value={(usage.documents / Math.max(1, usage.plan.maxDocuments)) * 100} label={`Documentos almacenados: ${usage.documents} de ${usage.plan.maxDocuments}`} tone="accent" />
            <p className="text-sm text-muted">
              Tamaño máximo por archivo: {usage.plan.maxFileSizeMb} MB · Proveedores externos: {usage.plan.allowExternal ? "permitidos con tu autorización" : "no incluidos"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Contraseña" />
          <CardBody><PasswordForm /></CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Sesiones" description={`Tienes ${sessions} sesión(es) activa(s).`} />
            <CardBody>
              <form action={logoutEverywhereAction}>
                <Button type="submit" variant="secondary">Cerrar sesión en todos los dispositivos</Button>
              </form>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Privacidad" />
            <CardBody className="space-y-3 text-sm text-muted">
              <p>
                {retention > 0 ? `Tus documentos se eliminan automáticamente ${retention} días después de subirlos.` : "Tus documentos se conservan hasta que los elimines."}{" "}
                <Link href="/privacidad" className="text-accent hover:underline">Ver política</Link>
              </p>
              <p className="font-medium text-fg">Autorizaciones de envío a proveedores externos</p>
              {consents.length === 0 ? (
                <p>No has autorizado ningún envío.</p>
              ) : (
                <ul className="space-y-1">
                  {consents.map((c) => <li key={c.id}>{fmtDate(c.createdAt)} · {c.provider} · {c.purpose}</li>)}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <Card className="mt-6 border-danger/30">
        <CardHeader title="Eliminar cuenta" description="Se borran todos tus documentos (también los archivos cifrados), análisis e informes. No se puede deshacer." />
        <CardBody className="max-w-md"><DeleteAccountForm /></CardBody>
      </Card>
    </>
  );
}
