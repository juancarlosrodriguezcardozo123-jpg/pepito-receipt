/** Uso: npm run admin:promote -- correo@ejemplo.com */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: npm run admin:promote -- correo@ejemplo.com");
  process.exit(1);
}
const db = new PrismaClient();
db.user
  .update({ where: { email }, data: { role: "ADMIN" } })
  .then((u) => console.log(`${u.email} ahora es administrador.`))
  .catch(() => {
    console.error("No existe ningún usuario con ese correo.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
