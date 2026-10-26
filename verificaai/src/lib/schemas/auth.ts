import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Introduce un correo electrónico válido.").max(254);

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(200, "La contraseña es demasiado larga.")
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), "Incluye al menos una letra y un número.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe tu nombre.").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    acceptPrivacy: z.literal("on", { message: "Debes aceptar la política de privacidad." }),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña.").max(200),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ token: z.string().min(10).max(200), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] });

export const profileSchema = z.object({ name: z.string().trim().min(2, "Escribe tu nombre.").max(100) });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Escribe tu contraseña actual."), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] });
