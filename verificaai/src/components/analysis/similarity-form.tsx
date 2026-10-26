"use client";

import { useActionState, useState } from "react";
import { similarityAction } from "@/app/actions/analyses";
import { Checkbox, Field, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { Alert } from "@/components/ui/alert";

type Doc = { id: string; title: string; wordCount: number };
type Collection = { id: string; name: string; count: number; isDemo: boolean };

export function SimilarityForm(props: {
  documents: Doc[];
  collections: Collection[];
  initialDocumentId?: string;
  external: { configured: boolean; name: string; allowed: boolean };
}) {
  const [state, action] = useActionState(similarityAction, {});
  const [documentId, setDocumentId] = useState(props.initialDocumentId ?? props.documents[0]?.id ?? "");
  const [mode, setMode] = useState<"all" | "selected" | "none">("all");
  const [useExternal, setUseExternal] = useState(false);
  const others = props.documents.filter((d) => d.id !== documentId);

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <Field label="Documento a analizar" htmlFor="documentId">
        <Select id="documentId" name="documentId" value={documentId} onChange={(e) => setDocumentId(e.target.value)} required>
          {props.documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.wordCount.toLocaleString("es")} palabras)
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Comparar con mis documentos</legend>
        {(
          [
            ["all", `Todos mis otros documentos (${others.length})`],
            ["selected", "Solo los que seleccione"],
            ["none", "Ninguno"],
          ] as const
        ).map(([v, label]) => (
          <label key={v} className="flex items-center gap-3 text-sm">
            <input type="radio" name="compareWith" value={v} checked={mode === v} onChange={() => setMode(v)} className="size-4 accent-[var(--accent)]" />
            {label}
          </label>
        ))}
        {mode === "selected" && (
          <div className="ml-7 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {others.length === 0 && <p className="text-sm text-muted">No tienes otros documentos.</p>}
            {others.map((d) => (
              <Checkbox key={d.id} name="selectedIds" value={d.id} label={d.title} />
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Colecciones autorizadas</legend>
        {props.collections.length === 0 ? (
          <p className="text-sm text-muted">No hay colecciones activas. Un administrador puede crearlas.</p>
        ) : (
          props.collections.map((c) => (
            <Checkbox
              key={c.id}
              name="collectionIds"
              value={c.id}
              defaultChecked
              label={`${c.name}${c.isDemo ? " (demostración)" : ""}`}
              description={`${c.count} documento(s)`}
            />
          ))
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Fuentes externas</legend>
        {!props.external.configured ? (
          <Alert tone="info">
            No hay un proveedor de búsqueda ni una base documental externa configurada. El análisis se limita a los documentos
            disponibles en el sistema. No se compara con Internet.
          </Alert>
        ) : !props.external.allowed ? (
          <p className="text-sm text-muted">Tu plan no incluye la comparación con fuentes externas.</p>
        ) : (
          <>
            <Checkbox
              name="useExternal"
              checked={useExternal}
              onChange={(e) => setUseExternal(e.target.checked)}
              label={`Buscar también en ${props.external.name}`}
              description="Se enviarán hasta 5 frases del documento al proveedor externo para buscar fuentes."
            />
            {useExternal && (
              <div className="ml-7">
                <Checkbox
                  name="externalConsent"
                  required
                  label="Autorizo el envío de esos fragmentos al proveedor externo"
                  description="La autorización queda registrada en tu cuenta."
                />
              </div>
            )}
          </>
        )}
      </fieldset>

      <SubmitButton pendingText="Analizando… puede tardar unos segundos" disabled={!documentId}>
        Analizar similitud
      </SubmitButton>
    </form>
  );
}
