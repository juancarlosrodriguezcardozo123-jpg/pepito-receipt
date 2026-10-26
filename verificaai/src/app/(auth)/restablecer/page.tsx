import Link from "next/link";
import { ResetForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Nueva contraseña" };

export default async function Page(props: PageProps<"/restablecer">) {
  const { token } = await props.searchParams;
  return (
    <>
      <h1 className="mb-6 font-serif text-2xl">Elige una nueva contraseña</h1>
      {typeof token === "string" && token ? (
        <ResetForm token={token} />
      ) : (
        <Alert tone="danger" title="Enlace incompleto">
          Abre el enlace completo del correo o{" "}
          <Link href="/recuperar" className="underline">
            solicita uno nuevo
          </Link>
          .
        </Alert>
      )}
    </>
  );
}
