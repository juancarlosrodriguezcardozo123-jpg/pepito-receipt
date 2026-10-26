"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/form";

const initial: FormState = {};

function err(state: FormState, k: string) {
  return state.fieldErrors?.[k];
}

function inputProps(state: FormState, k: string) {
  const e = err(state, k);
  return { id: k, name: k, "aria-invalid": e ? true : undefined, "aria-describedby": e ? `${k}-error` : undefined };
}

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {notice && !state.message && <p className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">{notice}</p>}
      <FormMessage state={state} />
      <Field label="Correo electrónico" htmlFor="email" error={err(state, "email")}>
        <Input type="email" autoComplete="email" required {...inputProps(state, "email")} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={err(state, "password")}>
        <Input type="password" autoComplete="current-password" required {...inputProps(state, "password")} />
      </Field>
      <div className="flex justify-end text-sm">
        <Link href="/recuperar" className="text-accent hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Entrando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Nombre" htmlFor="name" error={err(state, "name")}>
        <Input autoComplete="name" required {...inputProps(state, "name")} />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" error={err(state, "email")}>
        <Input type="email" autoComplete="email" required {...inputProps(state, "email")} />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={err(state, "password")} hint="Mínimo 10 caracteres, con letras y números.">
        <Input type="password" autoComplete="new-password" required {...inputProps(state, "password")} />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={err(state, "confirm")}>
        <Input type="password" autoComplete="new-password" required {...inputProps(state, "confirm")} />
      </Field>
      <Checkbox
        name="acceptPrivacy"
        label={
          <>
            Acepto la{" "}
            <Link href="/privacidad" className="text-accent underline" target="_blank">
              política de privacidad y retención
            </Link>
          </>
        }
      />
      {err(state, "acceptPrivacy") && <p className="text-sm text-danger">{err(state, "acceptPrivacy")}</p>}
      <SubmitButton className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Correo electrónico" htmlFor="email" error={err(state, "email")}>
        <Input type="email" autoComplete="email" required {...inputProps(state, "email")} />
      </Field>
      <SubmitButton className="w-full" pendingText="Enviando…">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Field label="Nueva contraseña" htmlFor="password" error={err(state, "password")} hint="Mínimo 10 caracteres, con letras y números.">
        <Input type="password" autoComplete="new-password" required {...inputProps(state, "password")} />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={err(state, "confirm")}>
        <Input type="password" autoComplete="new-password" required {...inputProps(state, "confirm")} />
      </Field>
      <SubmitButton className="w-full" pendingText="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
