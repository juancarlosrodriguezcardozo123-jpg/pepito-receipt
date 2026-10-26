/** Configuración pública de la marca. El nombre es configurable con NEXT_PUBLIC_APP_NAME. */
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "VerificaAI",
  tagline: "Similitud textual y señales de escritura asistida por IA",
} as const;
