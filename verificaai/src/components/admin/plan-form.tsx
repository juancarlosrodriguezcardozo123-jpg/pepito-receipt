"use client";

import { useActionState } from "react";
import { savePlanAction } from "@/app/actions/admin";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

type Plan = { id: string; name: string; description: string | null; monthlyAnalyses: number; maxFileSizeMb: number; maxDocuments: number; allowExternal: boolean; isDefault: boolean };

export function PlanForm({ plan }: { plan?: Plan }) {
  const [state, action] = useActionState(savePlanAction, {});
  const p = plan?.id ?? "new";
  return (
    <form action={action} className="space-y-4">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`${p}-name`}><Input id={`${p}-name`} name="name" defaultValue={plan?.name} required /></Field>
        <Field label="Descripción" htmlFor={`${p}-description`}><Input id={`${p}-description`} name="description" defaultValue={plan?.description ?? ""} /></Field>
        <Field label="Análisis al mes" htmlFor={`${p}-ma`}><Input id={`${p}-ma`} name="monthlyAnalyses" type="number" min={0} defaultValue={plan?.monthlyAnalyses ?? 20} required /></Field>
        <Field label="Máx. documentos almacenados" htmlFor={`${p}-md`}><Input id={`${p}-md`} name="maxDocuments" type="number" min={1} defaultValue={plan?.maxDocuments ?? 50} required /></Field>
        <Field label="Tamaño máximo de archivo (MB)" htmlFor={`${p}-mf`} hint="Nunca supera MAX_UPLOAD_MB del servidor."><Input id={`${p}-mf`} name="maxFileSizeMb" type="number" min={1} max={100} defaultValue={plan?.maxFileSizeMb ?? 10} required /></Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox name="allowExternal" defaultChecked={plan?.allowExternal} label="Permite proveedores externos" />
        <Checkbox name="isDefault" defaultChecked={plan?.isDefault} label="Plan por defecto" />
      </div>
      <SubmitButton size="sm">{plan ? "Guardar cambios" : "Crear plan"}</SubmitButton>
    </form>
  );
}
