import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Crear cuenta" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/panel");
  return (
    <>
      <h1 className="font-serif text-2xl">Crear cuenta</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Tus documentos solo son visibles para ti.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/iniciar-sesion" className="text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
