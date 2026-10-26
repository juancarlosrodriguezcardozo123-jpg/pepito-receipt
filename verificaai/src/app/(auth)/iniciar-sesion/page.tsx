import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Iniciar sesión" };

export default async function Page(props: PageProps<"/iniciar-sesion">) {
  if (await getCurrentUser()) redirect("/panel");
  const sp = await props.searchParams;
  return (
    <>
      <h1 className="font-serif text-2xl">Iniciar sesión</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Accede a tus documentos y análisis.</p>
      <LoginForm notice={sp.restablecida ? "Contraseña actualizada. Ya puedes iniciar sesión." : undefined} />
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-accent hover:underline">
          Regístrate
        </Link>
      </p>
    </>
  );
}
