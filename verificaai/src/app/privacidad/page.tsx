import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { appConfig } from "@/lib/config";
import { env } from "@/server/env";

export const metadata = { title: "Privacidad y retención" };
export const dynamic = "force-dynamic";

export default function Page() {
  const days = env().RETENTION_DAYS;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <Link href="/" aria-label="Inicio"><Logo /></Link>
      <h1 className="mt-10 font-serif text-3xl">Privacidad y retención de datos</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-fg/90">
        <section>
          <h2 className="font-semibold">Qué guardamos</h2>
          <p className="text-muted">
            Tu nombre, tu correo, el hash de tu contraseña (Argon2id) y los documentos que subes: el archivo original cifrado con
            AES-256-GCM, el texto extraído y los resultados de los análisis.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Quién puede verlos</h2>
          <p className="text-muted">
            Solo tú. Los administradores gestionan cuentas y cuotas, pero la aplicación no les da acceso al contenido de tus
            documentos. Tus documentos se comparan únicamente con tus propios documentos y con las colecciones autorizadas que tú
            elijas, nunca con los de otros usuarios.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Proveedores externos</h2>
          <p className="text-muted">
            {appConfig.name} no envía documentos a terceros por defecto. Si un administrador configura un detector de IA o un
            buscador externo, solo se usará cuando lo autorices de forma explícita en cada análisis. Esa autorización queda
            registrada.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Retención y borrado</h2>
          <p className="text-muted">
            {days > 0
              ? `Los documentos se eliminan automáticamente ${days} días después de subirlos.`
              : "Los documentos se conservan hasta que los elimines."}{" "}
            Puedes eliminar un documento en cualquier momento. Se borran el archivo cifrado (sobrescrito antes de eliminarlo), el
            texto, sus análisis y sus informes, y los extractos que aparecían en otros análisis tuyos. Al eliminar tu cuenta se
            borran todos tus datos.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Interpretación de los resultados</h2>
          <p className="text-muted">
            Los resultados son indicadores automáticos que requieren interpretación humana. No constituyen prueba de plagio ni de
            autoría.
          </p>
        </section>
      </div>
    </div>
  );
}
