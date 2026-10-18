# 🏢 Oficina IA

Una oficina virtual en pixel-art donde un equipo de agentes de IA (con Claude) crea software y gestiona tareas.
Cada persona tiene su puesto, camina por la oficina (café, sofá, ventana, visita a compañeros), y tú puedes
hacer clic en cualquiera para hablar con ella.

## El equipo

| Agente | Rol |
|---|---|
| Sofía | Directora de Proyecto: planea, divide y asigna tareas |
| Mateo | Arquitecto de Software |
| Valentina | Desarrolladora Frontend |
| Diego | Desarrollador Backend |
| Camila | Diseñadora UX/UI |
| Andrés | QA / Tester (revisa entregables) |
| Lucía | DevOps / Infraestructura |

Puedes cambiar nombres, roles, personalidad, colores y puestos en `agents.js`.

## Cómo se usa

- **Clic en una persona** (o en la pestaña *Equipo*) → abre el chat con ella.
- **🎯 Nuevo proyecto** → describes lo que quieres construir; todo el equipo va a la **sala de juntas**
  y Sofía arma el plan y crea las tareas en el tablero, asignadas a cada especialista.
- **▶️ Trabajar** (en el chat) → esa persona se sienta en su puesto, teclea y entrega su siguiente tarea
  (código, diseño, plan…). La tarea pasa a *En revisión* con el entregable adjunto 📎.
- **⚡ Jornada de trabajo** → todos los que tengan tareas trabajan a la vez.
- **📋 Tablero** → tareas en columnas *Pendiente / En progreso / En revisión / Hecho*. Abre una tarea para ver
  el entregable, reasignarla, aprobarla o pedirle a Andrés (QA) que la revise.

Los agentes usan herramientas reales sobre el tablero: listan, crean y actualizan tareas, y pueden
**caminar al puesto de un compañero para consultarle** (lo verás en la oficina).

## Ejecutar en local

```bash
cd oficina-ia
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
# abre http://localhost:3000
```

Sin `ANTHROPIC_API_KEY` arranca en **modo demo**: la oficina, el tablero y las animaciones funcionan,
pero los agentes responden con frases de ejemplo.

Variables opcionales:
- `MODELO` — modelo de Claude (por defecto `claude-opus-5-5`).
- `PORT` — puerto (por defecto 3000).

Las tareas se guardan en `data/tareas.json`. Las conversaciones viven en memoria (se pierden al reiniciar).

## Deploy en Railway

Crea un servicio nuevo desde este repo y en *Settings → Root Directory* pon `oficina-ia`.
Agrega la variable `ANTHROPIC_API_KEY`. Railway detecta Node y ejecuta `npm start`.

> Nota: la API no tiene autenticación. Si la publicas en internet, cualquiera con la URL podría usar
> tus créditos de Anthropic; protégela (por ejemplo con una contraseña básica) antes de compartirla.
