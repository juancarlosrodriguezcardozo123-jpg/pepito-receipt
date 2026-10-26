# VerificaAI

Plataforma web para analizar documentos académicos: **similitud textual** con fuentes autorizadas y **señales de escritura asistida por IA**. El nombre de la marca se configura con `NEXT_PUBLIC_APP_NAME`.

> Los resultados son indicadores automáticos que requieren interpretación humana. La similitud no es prueba de plagio y ningún indicador de IA prueba la autoría.

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| Documentos | Carga de PDF, DOCX y TXT o texto pegado. El texto se extrae en el servidor y el original se guarda cifrado (AES-256-GCM). Historial con búsqueda, filtros y borrado seguro. |
| Similitud | Coincidencias exactas (≥ 8 palabras normalizadas) y aproximadas (Dice ≥ 0,6 por oración) contra los documentos propios, las colecciones autorizadas y, si se configura, un proveedor externo. Resalta las coincidencias y clasifica citas, referencias y fragmentos sin clasificar. |
| Detector de IA | Capa de proveedor para un detector especializado (HTTP). Sin proveedor, muestra **«Análisis avanzado no disponible»** y ofrece un análisis lingüístico **experimental** (estilometría) sin porcentaje de IA. |
| Informes | PDF descargable con documento, fecha, método, resultados, fragmentos, fuentes, limitaciones y advertencia. |
| Cuenta | Registro, inicio de sesión, recuperación de contraseña, perfil, cambio de contraseña, cierre de sesión en todos los dispositivos, consentimientos y eliminación de la cuenta. |
| Administración | Usuarios (rol, plan, desactivación), planes y cuotas, colecciones autorizadas, estado de integraciones, errores del sistema y estadísticas. |

### Cómo se calcula la similitud
`porcentaje = palabras del documento que forman parte de alguna coincidencia / total de palabras`. Cada palabra se cuenta una sola vez aunque coincida con varias fuentes. También se muestra el porcentaje sin citas (texto entre comillas) ni referencias (texto bajo un encabezado como «Referencias» o «Bibliografía»).

### Qué mide el análisis experimental
Variación de la longitud de las oraciones, diversidad léxica (MTLD), repetición de trigramas, densidad de conectores formulaicos y uniformidad de los párrafos. Los umbrales son heurísticos y no están calibrados. No es un modelo entrenado.

## Arquitectura

```
src/
  app/                 Páginas (App Router), server actions (app/actions) y API (app/api)
    (auth)/            iniciar-sesion, registro, recuperar, restablecer
    (app)/             panel, documentos, similitud, detector-ia, analisis, cuenta, admin/*
  components/          ui/ (sistema de diseño), layout/, analysis/, upload/, admin/, account/, auth/
  lib/                 config de marca, esquemas Zod, etiquetas, utilidades
  server/              Solo servidor ("server-only")
    auth/              sesiones en BD (cookie httpOnly + hash SHA-256), Argon2id, correo
    db/                cliente Prisma
    storage/           interfaz StorageDriver + disco local cifrado
    extraction/        detección por magic bytes, unpdf, mammoth, protección zip bomb
    similarity/        motor de comparación (puro y probado)
    ai-detection/      análisis lingüístico experimental + proveedor HTTP
    sources/           proveedor de búsqueda externa HTTP
    reports/           informe PDF (pdfkit)
    quotas/            planes, cuotas y registro de uso
    security/          rate limit (PostgreSQL), errores, auditoría, CSRF
    services/          documentos, análisis, integraciones
prisma/                schema, migraciones y seed (datos de demostración etiquetados)
tests/                 unit/, integration/ (PostgreSQL real), e2e/ (Playwright)
```

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL 16, Prisma 6, Zod 4, Argon2id (`@node-rs/argon2`), unpdf, mammoth, pdfkit, nodemailer, Vitest y Playwright.

Los análisis se ejecutan de forma síncrona en el servidor, lo que basta para documentos de hasta unos 300 000 caracteres. El motor es un módulo puro (`src/server/similarity/engine.ts`), así que se puede mover a una cola o *worker* si crece el volumen.

## Requisitos
- Node.js 20.9 o superior (probado con 22)
- PostgreSQL 14 o superior (puedes usar `docker compose up -d`)

## Instalación

```bash
cd verificaai
npm install                     # también ejecuta prisma generate
cp .env.example .env            # y completa los valores (ver abajo)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # → STORAGE_ENCRYPTION_KEY
npm run db:migrate              # crea las tablas
npm run db:seed                 # planes + colección de demostración
npm run dev                     # http://localhost:3000
```

**El primer usuario que se registra pasa a ser administrador.** Para promover a otro: `npm run admin:promote -- correo@ejemplo.com`.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL |
| `APP_URL` | Sí | URL pública (para los enlaces de los correos) |
| `NEXT_PUBLIC_APP_NAME` | No | Nombre de la marca (por defecto «VerificaAI») |
| `STORAGE_DIR` | No | Carpeta privada de archivos (por defecto `./storage`) |
| `STORAGE_ENCRYPTION_KEY` | Recomendada | 32 bytes en base64. Sin ella no se guarda el archivo original, solo el texto |
| `MAX_UPLOAD_MB`, `MAX_EXTRACTED_CHARS`, `MAX_PDF_PAGES` | No | Límites de carga y extracción |
| `RETENTION_DAYS` | No | Días hasta la purga automática (0 = sin purga) |
| `CRON_SECRET` | No | Protege `POST /api/cron/retention` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | No | Correo de recuperación. Sin SMTP, en desarrollo el enlace se imprime en la consola |
| `AI_DETECTOR_PROVIDER` (`none`/`http`), `AI_DETECTOR_API_URL`, `AI_DETECTOR_API_KEY`, `AI_DETECTOR_NAME` | No | Detector de IA especializado |
| `SEARCH_PROVIDER` (`none`/`http`), `SEARCH_API_URL`, `SEARCH_API_KEY`, `SEARCH_PROVIDER_NAME` | No | Búsqueda de fuentes externas |

Todas las claves se leen solo en el servidor (`src/server/env.ts`). Ninguna lleva el prefijo `NEXT_PUBLIC_`, salvo el nombre de la marca.

### Contrato del detector de IA (`AI_DETECTOR_PROVIDER=http`)
```
POST {AI_DETECTOR_API_URL}
Authorization: Bearer {AI_DETECTOR_API_KEY}
{ "text": "...", "paragraphs": ["...", "..."], "language": "es" }

→ 200 { "documentScore": 0.0-1.0, "paragraphs": [{ "index": 0, "score": 0.0-1.0 }], "modelVersion": "opcional" }
```
Para un proveedor comercial con otra API, implementa la interfaz `AiDetector` en `src/server/ai-detection/provider.ts`. También puedes desplegar un pequeño adaptador que traduzca a este contrato. Usa solo un detector entrenado y evaluado.

### Contrato del proveedor de búsqueda (`SEARCH_PROVIDER=http`)
```
POST {SEARCH_API_URL}
Authorization: Bearer {SEARCH_API_KEY}
{ "query": "frase del documento" }

→ 200 { "results": [{ "title": "...", "url": "https://...", "text": "texto completo (opcional)", "snippet": "(opcional)" }] }
```
Se consultan hasta 5 frases distintivas por análisis. Debe ser un buscador o una base documental que tengas autorización para usar.

**Los proveedores externos solo se usan si el plan del usuario lo permite y el usuario lo autoriza en cada análisis.** Esa autorización se guarda en `ConsentRecord`.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm run typecheck` | Tipos (`next typegen` + `tsc`) |
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias e de integración. Necesitan la BD `verificaai_test` (o `TEST_DATABASE_URL`), que **se vacía** en cada ejecución |
| `npm run test:e2e` | Playwright. Necesita `npm run build` y la BD `verificaai_e2e` (o `E2E_DATABASE_URL`), que se vacía y se carga con el seed. Con un Chromium propio: `PLAYWRIGHT_CHROMIUM_PATH=/ruta/chromium` |
| `npm run db:migrate` / `db:deploy` / `db:seed` | Base de datos |
| `npm run admin:promote -- email` | Dar rol de administrador |

Para crear las bases de pruebas: `createdb -O verificaai verificaai_test && createdb -O verificaai verificaai_e2e`.

## Seguridad y privacidad
- **Autorización:** se comprueba en el servidor en cada consulta. Todas las lecturas filtran por `ownerId`/`userId`, y el acceso ajeno devuelve 404. Los administradores no ven el contenido de los documentos.
- **Archivos:**
  - Se valida el tipo real por *magic bytes* frente a la extensión.
  - Hay límites de tamaño, páginas y caracteres, inspección previa del ZIP del DOCX (protección contra *zip bombs*) y *timeout* de extracción.
  - Se guardan cifrados fuera de `public/` y se descargan solo a través de un endpoint autorizado.
- **Sesiones y contraseñas:**
  - Las contraseñas se guardan con Argon2id.
  - Las sesiones se guardan en la base de datos con el token hasheado, en cookie `httpOnly` y `SameSite=Lax`, marcada `Secure` en producción.
  - El restablecimiento de contraseña usa un token de un solo uso que caduca en 1 h e invalida todas las sesiones.
  - Las respuestas no revelan si un correo existe.
- **CSRF:** las server actions validan el origen (Next.js) y la API de carga comprueba `Origin` frente a `Host`.
- **Límites:** hay rate limiting por IP y por usuario, guardado en PostgreSQL, además de las cuotas por plan.
- **Cabeceras:** CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y HSTS en producción.
- **Errores:** el usuario ve mensajes genéricos y el detalle queda en `SystemError`, visible en el panel de administración. Las acciones sensibles se registran en `AuditLog`.
- **Borrado:**
  - El archivo se sobrescribe y se elimina, junto con el texto, los análisis y los informes, y se depuran los extractos que aparecían en otros análisis.
  - Al eliminar la cuenta se borra todo.
  - La purga de retención se programa llamando a `POST /api/cron/retention` con `Authorization: Bearer $CRON_SECRET`.
  - En SSD y sistemas *copy-on-write* la sobrescritura es la mejor opción disponible; el cifrado por archivo es la principal garantía.

## Datos de demostración
`npm run db:seed` crea tres planes y una **«Colección de demostración»** con textos ficticios redactados para este proyecto. La colección y sus resultados aparecen etiquetados como demostración en la interfaz y en los informes.

## Limitaciones conocidas
- No hay comparación con Internet ni con bases privadas de terceros sin un proveedor configurado.
- La similitud aproximada es léxica: no detecta paráfrasis profundas ni traducciones.
- Los PDF escaneados (solo imagen) no tienen texto extraíble; habría que añadir OCR.
- El almacenamiento es en disco local. Para S3, R2 o MinIO hay que implementar `StorageDriver`.
