import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { IconCompare, IconShield, IconSpark } from "@/components/ui/icons";
import { getCurrentUser } from "@/server/auth/session";
import { appConfig } from "@/lib/config";

const features = [
  {
    icon: IconCompare,
    title: "Similitud textual verificable",
    text: "Compara tus documentos con tus otros trabajos y con colecciones autorizadas. Cada coincidencia muestra la fuente y el fragmento exacto.",
  },
  {
    icon: IconSpark,
    title: "Señales de escritura asistida por IA",
    text: "Integra un detector especializado cuando esté configurado. Mientras tanto, ofrece métricas estilométricas experimentales y explicadas.",
  },
  {
    icon: IconShield,
    title: "Privacidad por diseño",
    text: "Archivos cifrados, acceso exclusivo del propietario y borrado seguro. Nada sale del servidor sin tu autorización explícita.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <ButtonLink href="/panel" size="sm">Ir al panel</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/iniciar-sesion" variant="ghost" size="sm">Iniciar sesión</ButtonLink>
              <ButtonLink href="/registro" size="sm">Crear cuenta</ButtonLink>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="max-w-3xl py-16 animate-fade-in sm:py-24">
          <p className="mb-4 text-sm font-medium text-accent">Para estudiantes, docentes e instituciones</p>
          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            Revisa la originalidad de un texto con resultados que se pueden explicar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            {appConfig.name} localiza similitudes textuales y señala rasgos asociados a la escritura asistida por IA. Te muestra
            qué encontró, dónde y por qué, para que la decisión final sea siempre humana.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={user ? "/panel" : "/registro"}>{user ? "Ir al panel" : "Empezar ahora"}</ButtonLink>
            <ButtonLink href="/privacidad" variant="secondary">Cómo tratamos tus datos</ButtonLink>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-surface p-5">
              <Icon className="mb-3 text-accent" />
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted">{text}</p>
            </div>
          ))}
        </section>

        <section className="mb-20 rounded-xl border border-border bg-surface-2 p-6 text-sm text-muted">
          <p className="font-medium text-fg">Lo que {appConfig.name} no hace</p>
          <p className="mt-1">
            No accede a Internet completo ni a bases privadas de terceros. No presenta la similitud como prueba de plagio. No
            atribuye autoría: los indicadores de IA son orientativos y pueden equivocarse.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        <Link href="/privacidad" className="hover:text-fg">Privacidad y retención</Link>
      </footer>
    </div>
  );
}
