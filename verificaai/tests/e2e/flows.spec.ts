import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const PASSWORD = "contrasena-segura-123";
const fixture = (f: string) => path.join(__dirname, "fixtures", f);
const shots = process.env.SCREENSHOT_DIR;

async function register(page: Page, name: string, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Repite la contraseña").fill(PASSWORD);
  await page.getByLabel(/Acepto la/).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test.describe.serial("flujos principales", () => {
  let docUrl = "";
  let analysisUrl = "";

  test("registro, carga DOCX y análisis de similitud con informe PDF", async ({ page }) => {
    await register(page, "Ana Admin", "ana@e2e.local");
    await expect(page.getByRole("heading", { name: "Hola, Ana" })).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/panel-desktop.png`, fullPage: true });

    await page.locator('input[type="file"]').setInputFiles(fixture("trabajo.docx"));
    await expect(page).toHaveURL(/\/documentos\/\w+$/);
    await expect(page.getByText("En este trabajo analizo cómo varias ciudades")).toBeVisible();
    docUrl = page.url();

    await page.getByRole("link", { name: "Analizar similitud" }).click();
    await expect(page.getByLabel("Colección de demostración (demostración)")).toBeChecked();
    await page.getByRole("button", { name: "Analizar similitud" }).click();
    await expect(page).toHaveURL(/\/analisis\/\w+$/);
    analysisUrl = page.url();
    await expect(page.getByText("Similitud textual con las fuentes comparadas")).toBeVisible();
    await expect(page.getByText(/Introducción a la economía circular/).first()).toBeVisible();
    await expect(page.locator("mark.hl-UNCLASSIFIED").first()).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/similitud-desktop.png`, fullPage: true });

    const res = await page.request.get(`/api/analyses/${analysisUrl.split("/").pop()}/report`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("carga PDF y detector de IA sin proveedor configurado", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill("ana@e2e.local");
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/panel$/);

    await page.goto("/detector-ia");
    await expect(page.getByText("Análisis avanzado todavía no disponible")).toBeVisible();
    await page.goto("/documentos");
    await page.getByText("Subir documento o pegar texto").click();
    await page.getByRole("tab", { name: "Pegar texto" }).click();
    await page.getByLabel("Título (opcional)").fill("Texto pegado de prueba");
    const para = "La tecnología educativa ha cambiado la forma en que los estudiantes acceden a la información y colaboran entre sí. ";
    await page.getByLabel("Texto", { exact: true }).fill(Array(6).fill(para.repeat(3)).join("\n\n"));
    await page.getByRole("button", { name: "Guardar texto" }).click();
    await expect(page).toHaveURL(/\/documentos\/\w+$/);
    await page.getByRole("link", { name: "Detector de IA" }).last().click();
    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(page).toHaveURL(/\/analisis\/\w+$/);
    await expect(page.getByText("Análisis avanzado no disponible")).toBeVisible();
    await expect(page.getByText("Experimental · no es prueba de autoría").first()).toBeVisible();
    await expect(page.getByText(/\d+ ?%.*IA/)).toHaveCount(0);

    await page.goto("/documentos");
    await page.getByText("Subir documento o pegar texto").click();
    await page.locator('input[type="file"]').setInputFiles(fixture("ensayo.pdf"));
    await expect(page).toHaveURL(/\/documentos\/\w+$/);
    await expect(page.getByText(/imprenta de tipos móviles/)).toBeVisible();

    await page.goto("/analisis?tipo=AI_DETECTION");
    await expect(page.getByText("Texto pegado de prueba")).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible();
    await page.goto("/admin/integraciones");
    await expect(page.getByText("AI_DETECTOR_PROVIDER no está configurado.")).toBeVisible();
  });

  test("otro usuario no puede acceder a documentos, análisis ni administración ajenos", async ({ page }) => {
    await register(page, "Beto", "beto@e2e.local");
    await page.goto(docUrl);
    await expect(page.getByText("Página no encontrada")).toBeVisible();
    await page.goto(analysisUrl);
    await expect(page.getByText("Página no encontrada")).toBeVisible();
    expect((await page.request.get(`/api/analyses/${analysisUrl.split("/").pop()}/report`)).status()).toBe(404);
    expect((await page.request.get(`/api/documents/${docUrl.split("/").pop()}/original`)).status()).toBe(404);
    await page.goto("/admin/usuarios");
    await expect(page.getByText("Página no encontrada")).toBeVisible();
    await page.goto("/documentos");
    await expect(page.getByText("Todavía no hay documentos")).toBeVisible();
  });

  test("subida sin sesión o desde otro origen es rechazada", async ({ request }) => {
    const r1 = await request.post("/api/documents", { headers: { origin: "http://localhost:3100" }, multipart: { file: { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("hola") } } });
    expect(r1.status()).toBe(401);
    const r2 = await request.post("/api/documents", { headers: { origin: "https://malicioso.example" }, multipart: { file: { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("hola") } } });
    expect(r2.status()).toBe(403);
  });

  test("recuperación de contraseña responde de forma genérica", async ({ page }) => {
    await page.goto("/recuperar");
    await page.getByLabel("Correo electrónico").fill("noexiste@e2e.local");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText(/Si existe una cuenta con ese correo/)).toBeVisible();
  });

  test("vista móvil con menú lateral y modo oscuro", async ({ browser }) => {
    const ctx = await browser.newContext({ ...{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill("ana@e2e.local");
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.locator("html")).toHaveClass(/dark/);
    if (shots) await page.screenshot({ path: `${shots}/panel-movil-oscuro.png`, fullPage: true });
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Historial" }).click();
    await expect(page).toHaveURL(/\/analisis$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    if (shots) await page.screenshot({ path: `${shots}/historial-movil-oscuro.png`, fullPage: true });
    await ctx.close();
  });
});
