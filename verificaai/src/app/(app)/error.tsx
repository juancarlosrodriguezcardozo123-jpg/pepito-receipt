"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <Alert tone="danger" title="No se pudo completar la operación">
        Ocurrió un error. Si el problema persiste, contacta con el administrador.
      </Alert>
      <Button variant="secondary" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
