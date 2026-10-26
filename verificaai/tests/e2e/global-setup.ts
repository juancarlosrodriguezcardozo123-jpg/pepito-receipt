import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export default async function setup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://verificaai:verificaai@localhost:5432/verificaai_e2e";
  if (!/_e2e(\?|$)/.test(url)) throw new Error("E2E_DATABASE_URL debe apuntar a una base de datos *_e2e");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  const db = new PrismaClient({ datasourceUrl: url });
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await db.$disconnect();
  execSync("npx prisma db seed", { env, stdio: "ignore" });
}
