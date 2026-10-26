import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="font-serif text-5xl text-muted">404</p>
        <h1 className="mt-2 text-lg font-semibold">Página no encontrada</h1>
        <p className="mt-1 text-sm text-muted">El recurso no existe o no tienes permiso para verlo.</p>
        <ButtonLink href="/panel" className="mt-6" variant="secondary">
          Volver al panel
        </ButtonLink>
      </div>
    </div>
  );
}
