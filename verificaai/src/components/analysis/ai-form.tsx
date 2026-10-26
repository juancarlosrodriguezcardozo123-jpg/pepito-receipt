"use client";

import { useActionState, useState } from "react";
import { aiDetectionAction } from "@/app/actions/analyses";
import { Checkbox, Field, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

type Doc = { id: string; title: string; wordCount: number };

export function AiForm(props: { documents: Doc[]; initialDocumentId?: string; detector: { configured: boolean; name: string; allowed: boolean } }) {
  const [state, action] = useActionState(aiDetectionAction, {});
  const [useExternal, setUseExternal] = useState(false);
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <Field label="Documento a analizar" htmlFor="documentId" hint="Se recomiendan al menos 300 palabras.">
        <Select id="documentId" name="documentId" defaultValue={props.initialDocumentId ?? props.documents[0]?.id} required>
          {props.documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.wordCount.toLocaleString("es")} palabras)
            </option>
          ))}
        </Select>
      </Field>
      {props.detector.configured && props.detector.allowed && (
        <div className="space-y-3">
          <Checkbox
            name="useExternal"
            checked={useExternal}
            onChange={(e) => setUseExternal(e.target.checked)}
            label={`Usar el detector especializado «${props.detector.name}»`}
            description="El texto completo del documento se enviará al proveedor externo."
          />
          {useExternal && (
            <div className="ml-7">
              <Checkbox name="externalConsent" required label="Autorizo el envío del documento a este proveedor" description="La autorización queda registrada." />
            </div>
          )}
        </div>
      )}
      <SubmitButton pendingText="Analizando…">Analizar</SubmitButton>
    </form>
  );
}
