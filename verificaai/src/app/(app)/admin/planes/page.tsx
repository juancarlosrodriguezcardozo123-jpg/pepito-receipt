import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { deletePlanAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PlanForm } from "@/components/admin/plan-form";

export const metadata = { title: "Planes y cuotas" };

export default async function Page() {
  await requireAdmin();
  const plans = await db.plan.findMany({ orderBy: { monthlyAnalyses: "asc" }, include: { _count: { select: { users: true } } } });
  return (
    <>
      <PageHeader title="Planes y cuotas" description="Límites de análisis, almacenamiento y uso de servicios externos. Los usuarios sin plan asignado usan el plan por defecto." />
      <div className="space-y-6">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader
              title={<span className="flex items-center gap-2">{p.name} {p.isDefault && <Badge tone="accent">Por defecto</Badge>}</span>}
              description={`${p._count.users} usuario(s) asignado(s)`}
              action={
                <form action={deletePlanAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton size="sm" confirmText={`¿Eliminar el plan «${p.name}»? Sus usuarios pasarán al plan por defecto.`}>Eliminar</ConfirmButton>
                </form>
              }
            />
            <CardBody><PlanForm plan={p} /></CardBody>
          </Card>
        ))}
        <Card>
          <CardHeader title="Nuevo plan" />
          <CardBody><PlanForm /></CardBody>
        </Card>
      </div>
    </>
  );
}
