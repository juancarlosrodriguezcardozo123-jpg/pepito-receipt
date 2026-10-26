import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/server/env";
import { randomToken } from "@/server/security/crypto";

/** Contrato de almacenamiento privado. Se puede añadir un driver S3 implementando esta interfaz. */
export interface StorageDriver {
  readonly name: string;
  put(data: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  /** Borrado seguro: sobrescribe y elimina. */
  remove(key: string): Promise<void>;
}

const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;

/** Disco local con cifrado AES-256-GCM por archivo (formato: iv[12] | tag[16] | datos). */
class EncryptedLocalStorage implements StorageDriver {
  readonly name = "local-cifrado";
  constructor(private dir: string, private key: Buffer) {}

  private file(key: string) {
    if (!KEY_RE.test(key)) throw new Error("Clave de almacenamiento inválida");
    return path.join(this.dir, key);
  }

  async put(data: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const key = randomToken(24);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const enc = Buffer.concat([cipher.update(data), cipher.final()]);
    await writeFile(this.file(key), Buffer.concat([iv, cipher.getAuthTag(), enc]), { mode: 0o600 });
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const raw = await readFile(this.file(key));
    const decipher = createDecipheriv("aes-256-gcm", this.key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
  }

  async remove(key: string): Promise<void> {
    const file = this.file(key);
    try {
      const { size } = await stat(file);
      const fh = await open(file, "r+");
      try {
        await fh.write(randomBytes(size), 0, size, 0);
        await fh.sync();
      } finally {
        await fh.close();
      }
      await unlink(file);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
}

let driver: StorageDriver | null | undefined;

/** Devuelve el driver configurado o null si falta STORAGE_ENCRYPTION_KEY (entonces no se guarda el original). */
export function storage(): StorageDriver | null {
  if (driver !== undefined) return driver;
  const e = env();
  const key = e.STORAGE_ENCRYPTION_KEY ? Buffer.from(e.STORAGE_ENCRYPTION_KEY, "base64") : null;
  if (!key || key.length !== 32) {
    console.warn("[storage] STORAGE_ENCRYPTION_KEY ausente o inválida: los archivos originales no se almacenarán.");
    driver = null;
  } else {
    driver = new EncryptedLocalStorage(path.resolve(e.STORAGE_DIR), key);
  }
  return driver;
}
