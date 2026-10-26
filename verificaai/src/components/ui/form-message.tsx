import type { FormState } from "@/lib/form";
import { Alert } from "./alert";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "ok" : "danger"}>{state.message}</Alert>;
}
