"use client";

import { useActionState, useRef, useEffect } from "react";
import { addSourceDocumentAction, createCollectionAction } from "@/app/actions/admin";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function CreateCollectionForm() {
  const [state, action] = useActionState(createCollectionAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="c-name"><Input id="c-name" name="name" required /></Field>
        <Field label="Descripción" htmlFor="c-desc"><Input id="c-desc" name="description" /></Field>
      </div>
      <SubmitButton size="sm">Crear colección</SubmitButton>
    </form>
  );
}

export function AddSourceForm({ collectionId }: { collectionId: string }) {
  const [state, action] = useActionState(addSourceDocumentAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="collectionId" value={collectionId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Título" htmlFor="s-title"><Input id="s-title" name="title" required /></Field>
        <Field label="Autor (opcional)" htmlFor="s-author"><Input id="s-author" name="author" /></Field>
        <Field label="URL de la fuente (opcional)" htmlFor="s-url"><Input id="s-url" name="url" type="url" placeholder="https://" /></Field>
      </div>
      <Field label="Archivo (PDF, DOCX o TXT)" htmlFor="s-file" hint="O pega el texto abajo.">
        <Input id="s-file" name="file" type="file" accept=".pdf,.docx,.txt" className="py-1.5" />
      </Field>
      <Field label="Texto" htmlFor="s-text"><Textarea id="s-text" name="text" rows={6} /></Field>
      <p className="text-xs text-muted">Añade solo contenido sobre el que la institución tenga derechos o autorización de uso.</p>
      <SubmitButton size="sm" pendingText="Procesando…">Añadir a la colección</SubmitButton>
    </form>
  );
}
