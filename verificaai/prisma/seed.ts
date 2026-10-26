/**
 * Datos iniciales: planes y una colección de DEMOSTRACIÓN claramente etiquetada.
 * Los textos de la colección se redactaron para esta demo; no son obras reales.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_TEXTS = [
  {
    title: "El ciclo del agua en ecosistemas de montaña (texto de demostración)",
    author: "Autor ficticio A",
    text: `El ciclo del agua en los ecosistemas de montaña depende de la interacción entre la temperatura, la altitud y la cobertura vegetal. Durante el invierno, la nieve acumulada actúa como un reservorio natural que libera agua de forma gradual a lo largo de la primavera.

Los bosques de niebla capturan la humedad atmosférica mediante sus hojas y musgos, aportando un volumen de agua que en algunas regiones supera al de la lluvia directa. Esta captación horizontal es fundamental para mantener el caudal de los ríos durante la estación seca.

La deforestación de las laderas reduce la infiltración del agua en el suelo y aumenta la escorrentía superficial, lo que provoca erosión y un mayor riesgo de inundaciones en los valles situados aguas abajo.`,
  },
  {
    title: "Introducción a la economía circular (texto de demostración)",
    author: "Autor ficticio B",
    text: `La economía circular propone un modelo de producción y consumo que reduce al mínimo los residuos mediante la reutilización, la reparación y el reciclaje de los materiales. A diferencia del modelo lineal de extraer, producir y desechar, busca mantener los recursos en uso durante el mayor tiempo posible.

Entre sus principios destacan el diseño de productos duraderos y desmontables, la valorización de los subproductos industriales y la creación de mercados para materiales secundarios. Las administraciones públicas pueden impulsar esta transición mediante incentivos fiscales y compras públicas responsables.

Sin embargo, la adopción de la economía circular enfrenta obstáculos como el coste inicial de rediseñar los procesos, la falta de infraestructuras de recogida selectiva y la escasa información de los consumidores sobre el origen de los productos.`,
  },
  {
    title: "Breve historia de la imprenta (texto de demostración)",
    author: "Autor ficticio C",
    text: `La invención de la imprenta de tipos móviles a mediados del siglo XV transformó la circulación del conocimiento en Europa. La posibilidad de reproducir textos de forma rápida y relativamente económica favoreció la difusión de ideas científicas, religiosas y políticas.

Los primeros talleres se establecieron en ciudades comerciales donde existía demanda de libros y acceso a papel de calidad. En pocas décadas, la producción de libros impresos superó con creces a la de manuscritos copiados a mano en los monasterios.

La imprenta también contribuyó a la estandarización de las lenguas vernáculas, ya que los impresores necesitaban fijar una ortografía común para llegar a un público más amplio.`,
  },
];

async function main() {
  const plans = [
    { name: "Básico", description: "Plan gratuito para estudiantes", monthlyAnalyses: 20, maxFileSizeMb: 10, maxDocuments: 50, allowExternal: false, isDefault: true },
    { name: "Docente", description: "Para profesorado", monthlyAnalyses: 200, maxFileSizeMb: 20, maxDocuments: 1000, allowExternal: true, isDefault: false },
    { name: "Institucional", description: "Para instituciones", monthlyAnalyses: 5000, maxFileSizeMb: 50, maxDocuments: 20000, allowExternal: true, isDefault: false },
  ];
  for (const p of plans) await db.plan.upsert({ where: { name: p.name }, update: {}, create: p });

  const name = "Colección de demostración";
  const existing = await db.sourceCollection.findUnique({ where: { name } });
  if (!existing) {
    await db.sourceCollection.create({
      data: {
        name,
        description: "Textos ficticios redactados para probar la plataforma. No son fuentes reales.",
        isDemo: true,
        documents: {
          create: DEMO_TEXTS.map((d) => ({ ...d, wordCount: d.text.split(/\s+/).length })),
        },
      },
    });
  }
  console.log("Datos iniciales cargados: planes y colección de demostración.");
}

main().finally(() => db.$disconnect());
