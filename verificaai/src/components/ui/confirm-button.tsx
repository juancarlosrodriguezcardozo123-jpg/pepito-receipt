"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./button";
import { Spinner } from "./spinner";

/** Botón de envío que pide confirmación antes de una acción destructiva. */
export function ConfirmButton({ confirmText, children, ...props }: ComponentProps<typeof Button> & { confirmText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="danger"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      {...props}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  );
}
