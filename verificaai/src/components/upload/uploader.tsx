"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pasteTextAction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { Alert } from "@/components/ui/alert";
import { IconUpload } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Next = "documento" | "similitud" | "detector-ia";
const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function target(next: Next, id: string) {
  return next === "documento" ? `/documentos/${id}` : `/${next}?documento=${id}`;
}

export function Uploader({ next = "documento", maxMb }: { next?: Next; maxMb: number }) {
  const [tab, setTab] = useState<"file" | "text">("file");
  return (
    <div>
      <div role="tablist" aria-label="Origen del texto" className="mb-4 inline-flex rounded-lg bg-surface-2 p-1 text-sm">
        {(["file", "text"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("rounded-md px-3 py-1.5 transition-colors", tab === t ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-fg")}
          >
            {t === "file" ? "Subir archivo" : "Pegar texto"}
          </button>
        ))}
      </div>
      {tab === "file" ? <FileDrop next={next} maxMb={maxMb} /> : <PasteForm next={next} />}
    </div>
  );
}

function FileDrop({ next, maxMb }: { next: Next; maxMb: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  function upload(file: File) {
    setError(null);
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) return setError("Formato no admitido. Usa PDF, DOCX o TXT.");
    if (file.size > maxMb * 1024 * 1024) return setError(`El archivo supera el máximo de ${maxMb} MB.`);
    setName(file.name);
    setProgress(0);
    const body = new FormData();
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: { id?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status === 201 && data.id) {
        setProgress(100);
        router.push(target(next, data.id));
        router.refresh();
      } else {
        setProgress(null);
        setError(data.error ?? "No se pudo subir el archivo.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Error de red al subir el archivo.");
    };
    xhr.send(body);
  }

  const busy = progress !== null;
  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f && !busy) upload(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          drag ? "border-accent bg-accent-soft" : "border-border-strong bg-surface-2/40",
        )}
      >
        <div className="mb-3 grid size-11 place-items-center rounded-full bg-surface text-accent shadow-sm">
          <IconUpload />
        </div>
        {busy ? (
          <div className="w-full max-w-xs" aria-live="polite">
            <p className="truncate text-sm font-medium">{name}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{progress! < 100 ? `Subiendo… ${progress} %` : "Extrayendo texto…"}</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Arrastra un archivo aquí</p>
            <p className="mt-1 text-xs text-muted">PDF, DOCX o TXT · máximo {maxMb} MB</p>
            <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => input.current?.click()}>
              Seleccionar archivo
            </Button>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Seleccionar archivo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}

function PasteForm({ next }: { next: Next }) {
  const [state, action] = useActionState(pasteTextAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Título (opcional)" htmlFor="title">
        <Input id="title" name="title" maxLength={200} placeholder="Ensayo sobre…" />
      </Field>
      <Field label="Texto" htmlFor="text" error={state.fieldErrors?.text}>
        <Textarea id="text" name="text" rows={9} required placeholder="Pega aquí el texto que quieres analizar." />
      </Field>
      <SubmitButton pendingText="Guardando…">Guardar texto</SubmitButton>
    </form>
  );
}
