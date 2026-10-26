import Link from "next/link";
import { ForgotForm } from "@/components/auth/forms";

export const metadata = { title: "Recuperar contraseña" };

export default function Page() {
  return (
    <>
      <h1 className="font-serif text-2xl">Recuperar contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Te enviaremos un enlace para elegir una nueva contraseña.</p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/iniciar-sesion" className="text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
