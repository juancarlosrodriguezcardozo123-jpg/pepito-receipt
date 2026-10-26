"use client";

import { useActionState } from "react";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/app/actions/account";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form";

const init: FormState = {};

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, init);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Nombre" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" hint="Para cambiar el correo, contacta con un administrador.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <SubmitButton variant="secondary" pendingText="Guardando…">Guardar</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, init);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Contraseña actual" htmlFor="current" error={state.fieldErrors?.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Nueva contraseña" htmlFor="password" error={state.fieldErrors?.password} hint="Mínimo 10 caracteres, con letras y números.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Repite la nueva contraseña" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton variant="secondary" pendingText="Actualizando…">Cambiar contraseña</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, init);
  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        if (!confirm("Se eliminarán tu cuenta, tus documentos, análisis e informes de forma permanente. ¿Continuar?")) e.preventDefault();
      }}
    >
      <FormMessage state={state} />
      <Field label="Confirma con tu contraseña" htmlFor="del-password" error={state.fieldErrors?.password}>
        <Input id="del-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" variant="danger">Eliminar mi cuenta y mis datos</Button>
    </form>
  );
}
