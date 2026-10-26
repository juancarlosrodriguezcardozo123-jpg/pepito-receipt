import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/** Prepara la base de datos de pruebas (nunca la de desarrollo): aplica migraciones y vacía las tablas. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://verificaai:verificaai@localhost:5432/verificaai_test";
  if (!/\/[\w-]+_test(\?|$)/.test(url)) throw new Error("TEST_DATABASE_URL debe apuntar a una base de datos *_test");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  const db = new PrismaClient({ datasourceUrl: url });
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await db.$disconnect();
}
