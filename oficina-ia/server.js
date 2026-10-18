const express = require('express');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { AGENTS, systemPrompt } = require('./agents');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODELO || 'claude-opus-5-5';
const DEMO = !process.env.ANTHROPIC_API_KEY;
const DATA_FILE = path.join(__dirname, 'data', 'tareas.json');

const client = DEMO ? null : new Anthropic();

// ---------------------------------------------------------------------------
// Estado: tareas (persistidas en disco), historial de la API y chat visible
// ---------------------------------------------------------------------------

const ESTADOS = ['pendiente', 'en_progreso', 'revision', 'hecho'];
const PRIORIDADES = ['alta', 'media', 'baja'];
const agentById = Object.fromEntries(AGENTS.map(a => [a.id, a]));

let db = { nextId: 1, tareas: [] };
try {
  db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (_) { /* primera ejecución */ }

function guardar() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const historial = Object.fromEntries(AGENTS.map(a => [a.id, []])); // MessageParam[] por agente
const chatLog = Object.fromEntries(AGENTS.map(a => [a.id, []]));   // lo que ve el usuario
const actividad = Object.fromEntries(AGENTS.map(a => [a.id, { estado: 'libre' }]));
const colas = Object.fromEntries(AGENTS.map(a => [a.id, Promise.resolve()]));

function log(agentId, de, texto) {
  chatLog[agentId].push({ de, texto, ts: Date.now() });
}

// Serializa las llamadas por agente para que su historial no se mezcle.
function enCola(agentId, fn) {
  const run = colas[agentId].then(fn, fn);
  colas[agentId] = run.catch(() => {});
  return run;
}

// ---------------------------------------------------------------------------
// Herramientas del tablero
// ---------------------------------------------------------------------------

const TOOLS_BASE = [
  {
    name: 'listar_tareas',
    description: 'Lista las tareas del tablero del equipo. Filtra opcionalmente por estado o por persona asignada.',
    input_schema: {
      type: 'object',
      properties: {
        estado: { type: 'string', enum: ESTADOS },
        asignado: { type: 'string', description: 'id del compañero, ej: diego' },
      },
    },
  },
  {
    name: 'crear_tarea',
    description: 'Crea una tarea nueva en el tablero y la asigna a un miembro del equipo.',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string' },
        descripcion: { type: 'string' },
        asignado: { type: 'string', enum: AGENTS.map(a => a.id) },
        prioridad: { type: 'string', enum: PRIORIDADES },
      },
      required: ['titulo', 'asignado'],
    },
  },
  {
    name: 'actualizar_tarea',
    description: 'Cambia el estado, la persona asignada o agrega una nota a una tarea existente.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        estado: { type: 'string', enum: ESTADOS },
        asignado: { type: 'string', enum: AGENTS.map(a => a.id) },
        nota: { type: 'string' },
      },
      required: ['id'],
    },
  },
];

const TOOL_CONSULTA = {
  name: 'consultar_companero',
  description: 'Camina hasta el puesto de un compañero y hazle una pregunta o pídele su opinión. Devuelve su respuesta.',
  input_schema: {
    type: 'object',
    properties: {
      companero: { type: 'string', enum: AGENTS.map(a => a.id) },
      mensaje: { type: 'string' },
    },
    required: ['companero', 'mensaje'],
  },
};

function resumenTarea(t) {
  return { id: t.id, titulo: t.titulo, estado: t.estado, asignado: t.asignado, prioridad: t.prioridad, descripcion: t.descripcion };
}

function crearTarea({ titulo, descripcion = '', asignado, prioridad = 'media' }, creadoPor) {
  if (!titulo || !agentById[asignado]) throw new Error('titulo y asignado (id válido) son obligatorios');
  const t = {
    id: db.nextId++,
    titulo: String(titulo).slice(0, 200),
    descripcion: String(descripcion).slice(0, 4000),
    asignado,
    prioridad: PRIORIDADES.includes(prioridad) ? prioridad : 'media',
    estado: 'pendiente',
    creadoPor,
    notas: [],
    entregable: '',
    creada: Date.now(),
    actualizada: Date.now(),
  };
  db.tareas.push(t);
  guardar();
  return t;
}

function actualizarTarea({ id, estado, asignado, nota }, autor) {
  const t = db.tareas.find(x => x.id === Number(id));
  if (!t) throw new Error(`No existe la tarea #${id}`);
  if (estado) {
    if (!ESTADOS.includes(estado)) throw new Error('estado inválido');
    t.estado = estado;
  }
  if (asignado) {
    if (!agentById[asignado]) throw new Error('asignado inválido');
    t.asignado = asignado;
  }
  if (nota) t.notas.push({ autor, texto: String(nota).slice(0, 2000), ts: Date.now() });
  t.actualizada = Date.now();
  guardar();
  return t;
}

async function ejecutarHerramienta(agentId, name, input) {
  switch (name) {
    case 'listar_tareas': {
      let ts = db.tareas;
      if (input.estado) ts = ts.filter(t => t.estado === input.estado);
      if (input.asignado) ts = ts.filter(t => t.asignado === input.asignado);
      return JSON.stringify(ts.map(resumenTarea));
    }
    case 'crear_tarea':
      return JSON.stringify(resumenTarea(crearTarea(input, agentId)));
    case 'actualizar_tarea':
      return JSON.stringify(resumenTarea(actualizarTarea(input, agentId)));
    case 'consultar_companero': {
      const otro = agentById[input.companero];
      if (!otro || otro.id === agentId) throw new Error('compañero inválido');
      actividad[agentId] = { estado: 'consultando', objetivo: otro.id, desde: Date.now() };
      const respuesta = await consulta(agentId, otro.id, String(input.mensaje));
      actividad[agentId] = { estado: 'pensando', desde: Date.now() };
      return respuesta;
    }
    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Llamadas a Claude
// ---------------------------------------------------------------------------

function crearMensaje({ agent, messages, tools, effort }) {
  return client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: systemPrompt(agent),
    tools,
    messages,
    output_config: { effort },
    // Si el modelo rechaza una petición, el servidor reintenta con otro modelo.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
}

function textoDe(content) {
  return content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

// Bucle de herramientas sobre el historial persistente del agente.
async function correrAgente(agentId, contenido, { effort = 'low', estado = 'pensando' } = {}) {
  const agent = agentById[agentId];
  const msgs = historial[agentId];
  const inicio = msgs.length;
  actividad[agentId] = { estado, desde: Date.now() };
  msgs.push({ role: 'user', content: contenido });
  try {
    let texto = '';
    for (let i = 0; i < 10; i++) {
      const resp = await crearMensaje({ agent, messages: msgs, tools: [...TOOLS_BASE, TOOL_CONSULTA], effort });
      msgs.push({ role: 'assistant', content: resp.content });
      const parcial = textoDe(resp.content);
      if (parcial) texto = parcial;

      if (resp.stop_reason === 'refusal') return texto || 'Prefiero no ayudar con eso.';
      if (resp.stop_reason === 'pause_turn') continue;
      if (resp.stop_reason !== 'tool_use') return texto;

      const resultados = [];
      for (const b of resp.content.filter(b => b.type === 'tool_use')) {
        try {
          resultados.push({ type: 'tool_result', tool_use_id: b.id, content: await ejecutarHerramienta(agentId, b.name, b.input || {}) });
        } catch (err) {
          resultados.push({ type: 'tool_result', tool_use_id: b.id, content: `Error: ${err.message}`, is_error: true });
        }
      }
      msgs.push({ role: 'user', content: resultados });
    }
    return texto || '(Me quedé dándole vueltas... ¿me lo repites?)';
  } catch (err) {
    msgs.length = inicio; // deja el historial como estaba antes de esta petición
    throw err;
  } finally {
    actividad[agentId] = { estado: 'libre' };
  }
}

// Pregunta puntual a un compañero: sin historial propio para evitar bloqueos
// entre agentes que se consultan mutuamente.
async function consulta(deId, aId, mensaje) {
  const de = agentById[deId];
  const a = agentById[aId];
  log(aId, 'sistema', `${de.nombre} vino a preguntar: ${mensaje}`);
  const prev = actividad[aId];
  actividad[aId] = { estado: 'atendiendo', objetivo: deId, desde: Date.now() };
  try {
    if (DEMO) {
      await esperar(2500);
      return `(${a.nombre}, modo demo) Buena pregunta, ${de.nombre}. Lo reviso y te aviso.`;
    }
    const msgs = [{ role: 'user', content: `[${de.nombre} (${de.rol}) se acerca a tu puesto y te dice]: ${mensaje}` }];
    for (let i = 0; i < 6; i++) {
      const resp = await crearMensaje({ agent: a, messages: msgs, tools: TOOLS_BASE, effort: 'low' });
      msgs.push({ role: 'assistant', content: resp.content });
      if (resp.stop_reason === 'pause_turn') continue;
      if (resp.stop_reason !== 'tool_use') {
        const texto = textoDe(resp.content) || '(sin respuesta)';
        log(aId, 'agente', `→ ${de.nombre}: ${texto}`);
        return texto;
      }
      const resultados = [];
      for (const b of resp.content.filter(b => b.type === 'tool_use')) {
        try {
          resultados.push({ type: 'tool_result', tool_use_id: b.id, content: await ejecutarHerramienta(aId, b.name, b.input || {}) });
        } catch (err) {
          resultados.push({ type: 'tool_result', tool_use_id: b.id, content: `Error: ${err.message}`, is_error: true });
        }
      }
      msgs.push({ role: 'user', content: resultados });
    }
    return '(No llegó a una respuesta clara)';
  } finally {
    actividad[aId] = prev && prev.estado !== 'atendiendo' ? prev : { estado: 'libre' };
  }
}

const esperar = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Modo demo (sin API key): respuestas de ejemplo para probar la oficina
// ---------------------------------------------------------------------------

const FRASES_DEMO = [
  '¡Hola jefe! Estoy en modo demo, pero ya me imagino resolviéndolo.',
  'Anotado. Cuando conectes la API key podré trabajar de verdad.',
  'Me parece buena idea. ¿Le creo una tarea en el tablero?',
  'Voy por un café y lo pienso ☕',
];

async function demoChat(agentId) {
  actividad[agentId] = { estado: 'pensando', desde: Date.now() };
  await esperar(1200);
  actividad[agentId] = { estado: 'libre' };
  return FRASES_DEMO[Math.floor(Math.random() * FRASES_DEMO.length)] +
    '\n\n(Modo demo: configura tu API key de Anthropic para respuestas reales)';
}

function demoKickoff(objetivo) {
  const plan = [
    ['Definir arquitectura y stack', 'mateo', 'alta'],
    ['Diseñar wireframes y guía visual', 'camila', 'alta'],
    ['Construir la API y base de datos', 'diego', 'media'],
    ['Maquetar la interfaz principal', 'valentina', 'media'],
    ['Plan de pruebas', 'andres', 'baja'],
    ['Configurar despliegue y CI/CD', 'lucia', 'baja'],
  ];
  for (const [titulo, asignado, prioridad] of plan) {
    crearTarea({ titulo, descripcion: `Proyecto: ${objetivo}`, asignado, prioridad }, 'sofia');
  }
  return `¡Listo! Dividí "${objetivo}" en ${plan.length} tareas y las repartí al equipo. Revisa el tablero 📋\n\n(Modo demo)`;
}

// ---------------------------------------------------------------------------
// API HTTP
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function errorHttp(res, err) {
  console.error(err);
  let msg = err.message;
  if (err instanceof Anthropic.AuthenticationError) msg = 'API key inválida. Revisa ANTHROPIC_API_KEY.';
  else if (err instanceof Anthropic.RateLimitError) msg = 'Límite de uso alcanzado, intenta en un momento.';
  else if (err instanceof Anthropic.APIError) msg = `Error de la API (${err.status}): ${err.message}`;
  res.status(500).json({ error: msg });
}

app.get('/api/estado', (req, res) => {
  res.json({
    demo: DEMO,
    modelo: MODEL,
    agentes: AGENTS.map(a => ({
      id: a.id, nombre: a.nombre, rol: a.rol, color: a.color, look: a.look, desk: a.desk,
      actividad: actividad[a.id],
      mensajes: chatLog[a.id].length,
    })),
    tareas: db.tareas,
  });
});

app.get('/api/agentes/:id/chat', (req, res) => {
  if (!agentById[req.params.id]) return res.status(404).json({ error: 'Agente no encontrado' });
  res.json(chatLog[req.params.id]);
});

app.post('/api/agentes/:id/chat', async (req, res) => {
  const id = req.params.id;
  const mensaje = String(req.body.mensaje || '').trim();
  if (!agentById[id]) return res.status(404).json({ error: 'Agente no encontrado' });
  if (!mensaje) return res.status(400).json({ error: 'Mensaje vacío' });
  log(id, 'usuario', mensaje);
  try {
    const respuesta = await enCola(id, () => (DEMO ? demoChat(id) : correrAgente(id, mensaje)));
    log(id, 'agente', respuesta);
    res.json({ respuesta });
  } catch (err) {
    log(id, 'sistema', 'No pude responder: ' + err.message);
    errorHttp(res, err);
  }
});

// Reunión de arranque: Sofía convierte un objetivo en tareas para el equipo.
app.post('/api/reunion', async (req, res) => {
  const objetivo = String(req.body.objetivo || '').trim();
  if (!objetivo) return res.status(400).json({ error: 'Describe el proyecto' });
  log('sofia', 'usuario', `🎯 Nuevo proyecto: ${objetivo}`);
  try {
    const respuesta = await enCola('sofia', async () => {
      if (DEMO) {
        actividad.sofia = { estado: 'reunion', desde: Date.now() };
        await esperar(8000);
        actividad.sofia = { estado: 'libre' };
        return demoKickoff(objetivo);
      }
      return correrAgente('sofia',
        `[Reunión estratégica con todo el equipo en la sala de juntas]\nEl cliente quiere este proyecto: ${objetivo}\n\n` +
        'Analiza el objetivo, define un plan por fases y crea en el tablero las tareas necesarias (concretas y pequeñas), ' +
        'asignadas a la persona adecuada con su prioridad. Luego resume el plan al cliente en pocas líneas.',
        { effort: 'medium', estado: 'reunion' });
    });
    log('sofia', 'agente', respuesta);
    res.json({ respuesta });
  } catch (err) {
    errorHttp(res, err);
  }
});

// El agente trabaja en su siguiente tarea y deja un entregable para revisión.
app.post('/api/agentes/:id/trabajar', async (req, res) => {
  const id = req.params.id;
  const agent = agentById[id];
  if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });
  const orden = { alta: 0, media: 1, baja: 2 };
  const tarea = db.tareas
    .filter(t => t.asignado === id && (t.estado === 'en_progreso' || t.estado === 'pendiente'))
    .sort((a, b) => (a.estado === 'en_progreso' ? -1 : 0) - (b.estado === 'en_progreso' ? -1 : 0) ||
      orden[a.prioridad] - orden[b.prioridad] || a.id - b.id)[0];
  if (!tarea) return res.json({ respuesta: 'No tengo tareas pendientes. ¡Asígname algo!', tarea: null });

  actualizarTarea({ id: tarea.id, estado: 'en_progreso' }, id);
  log(id, 'sistema', `Trabajando en la tarea #${tarea.id}: ${tarea.titulo}`);
  try {
    const entregable = await enCola(id, async () => {
      if (DEMO) {
        actividad[id] = { estado: 'trabajando', desde: Date.now() };
        await esperar(5000);
        actividad[id] = { estado: 'libre' };
        return `Entregable de ejemplo para "${tarea.titulo}".\n\n(Modo demo: con API key aquí vendría el trabajo real)`;
      }
      return correrAgente(id,
        `[Sistema] Es momento de trabajar en tu tarea #${tarea.id}: "${tarea.titulo}".\nDescripción: ${tarea.descripcion || '(sin descripción)'}\n` +
        `Notas: ${tarea.notas.map(n => `${n.autor}: ${n.texto}`).join(' | ') || 'ninguna'}\n\n` +
        'Haz el trabajo completo y responde SOLO con el entregable final en markdown (código, diseño, plan, configuración, etc.). ' +
        'Si necesitas info de un compañero, consúltale. No cambies el estado de esta tarea, el sistema la pasará a revisión.',
        { effort: 'medium', estado: 'trabajando' });
    });
    tarea.entregable = entregable;
    actualizarTarea({ id: tarea.id, estado: 'revision' }, id);
    log(id, 'agente', `✅ Terminé la tarea #${tarea.id} y la dejé en revisión.`);
    res.json({ respuesta: `Terminé "${tarea.titulo}". Está en revisión.`, tarea });
  } catch (err) {
    log(id, 'sistema', 'Error trabajando: ' + err.message);
    errorHttp(res, err);
  }
});

// Gestión manual del tablero desde la interfaz
app.post('/api/tareas', (req, res) => {
  try { res.json(crearTarea(req.body, 'usuario')); } catch (err) { res.status(400).json({ error: err.message }); }
});

app.patch('/api/tareas/:id', (req, res) => {
  try { res.json(actualizarTarea({ ...req.body, id: req.params.id }, 'usuario')); } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/tareas/:id', (req, res) => {
  db.tareas = db.tareas.filter(t => t.id !== Number(req.params.id));
  guardar();
  res.json({ ok: true });
});

app.post('/api/agentes/:id/reiniciar', (req, res) => {
  const id = req.params.id;
  if (!agentById[id]) return res.status(404).json({ error: 'Agente no encontrado' });
  historial[id] = [];
  chatLog[id] = [];
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🏢 Oficina IA en http://localhost:${PORT}` + (DEMO ? ' (modo demo, sin ANTHROPIC_API_KEY)' : ` — modelo ${MODEL}`));
});
