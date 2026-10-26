import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Parámetros Argon2id recomendados por OWASP (m=19 MiB, t=2, p=1).
const options = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}
