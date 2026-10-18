// Interfaz: chat con cada agente, tablero de tareas y vista del equipo.
const $ = sel => document.querySelector(sel);
const ESTADOS = [
  ['pendiente', '📥 Pendiente'],
  ['en_progreso', '🔨 En progreso'],
  ['revision', '🔍 En revisión'],
  ['hecho', '✅ Hecho'],
];
const TEXTO_ACTIVIDAD = {
  libre: 'Disponible',
  pensando: 'Pensando…',
  trabajando: 'Trabajando en una tarea',
  consultando: 'Consultando a un compañero',
  atendiendo: 'Atendiendo a un compañero',
  reunion: 'En reunión',
};

let estado = { agentes: [], tareas: [] };
let agenteActual = null;
let mensajesVistos = 0;
const esperando = new Set(); // agentes con una petición en curso desde este navegador

async function api(url, opciones = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
}

function toast(texto, ms = 3500) {
  const el = $('#toast');
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('visible'), ms);
}

const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Markdown mínimo: bloques de código, código en línea, negrita, cursiva.
function markdown(texto) {
  const partes = String(texto).split(/```[\w-]*\n?/);
  return partes.map((p, i) => {
    if (i % 2) return `<pre><code>${escapar(p.replace(/\n$/, ''))}</code></pre>`;
    return escapar(p)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,!?])/g, '$1<i>$2</i>');
  }).join('');
}

const agente = id => estado.agentes.find(a => a.id === id);
const inicial = a => a.nombre[0];

// ---------------------------------------------------------------------------
// Pestañas
// ---------------------------------------------------------------------------
function mostrarTab(nombre) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('activo', b.dataset.tab === nombre));
  document.querySelectorAll('.tab-cuerpo').forEach(c => c.classList.toggle('activo', c.id === 'tab-' + nombre));
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => mostrarTab(b.dataset.tab)));

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
async function abrirChat(id) {
  const a = agente(id);
  if (!a) return;
  agenteActual = id;
  Oficina.seleccionar(id);
  mostrarTab('chat');
  $('#chatVacio').classList.add('oculto');
  $('#chatActivo').classList.remove('oculto');
  $('#chatAvatar').textContent = inicial(a);
  $('#chatAvatar').style.background = a.color;
  $('#chatNombre').textContent = a.nombre;
  $('#chatRol').textContent = a.rol;
  await cargarChat();
  $('#inputChat').focus();
}

async function cargarChat() {
  if (!agenteActual) return;
  const id = agenteActual;
  const log = await api(`/api/agentes/${id}/chat`);
  if (id !== agenteActual) return;
  mensajesVistos = log.length;
  const cont = $('#mensajes');
  cont.innerHTML = log.length ? '' : `<div class="msg sistema">Empieza la conversación con ${escapar(agente(id).nombre)} 👋</div>`;
  for (const m of log) agregarMensaje(m.de, m.texto);
  if (esperando.has(id)) mostrarEscribiendo();
  actualizarBotonesChat();
}

function agregarMensaje(de, texto) {
  const div = document.createElement('div');
  div.className = 'msg ' + de;
  div.innerHTML = markdown(texto);
  $('#mensajes').appendChild(div);
  $('#mensajes').scrollTop = $('#mensajes').scrollHeight;
}

function mostrarEscribiendo() {
  const div = document.createElement('div');
  div.className = 'msg agente escribiendo';
  div.id = 'escribiendo';
  div.innerHTML = '<span></span><span></span><span></span>';
  $('#mensajes').appendChild(div);
  $('#mensajes').scrollTop = $('#mensajes').scrollHeight;
}

function actualizarBotonesChat() {
  const ocupado = esperando.has(agenteActual);
  $('#formChat button').disabled = ocupado;
  $('#btnTrabajar').disabled = ocupado;
}

async function enviar(id, mensaje) {
  esperando.add(id);
  if (id === agenteActual) { agregarMensaje('usuario', mensaje); mostrarEscribiendo(); actualizarBotonesChat(); }
  try {
    const { respuesta } = await api(`/api/agentes/${id}/chat`, { method: 'POST', body: { mensaje } });
    Oficina.decir(id, respuesta);
  } catch (err) {
    toast('⚠️ ' + err.message, 6000);
  } finally {
    esperando.delete(id);
    if (id === agenteActual) await cargarChat();
    refrescar();
  }
}

$('#formChat').addEventListener('submit', ev => {
  ev.preventDefault();
  const texto = $('#inputChat').value.trim();
  if (!texto || !agenteActual || esperando.has(agenteActual)) return;
  $('#inputChat').value = '';
  enviar(agenteActual, texto);
});
$('#inputChat').addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('#formChat').requestSubmit(); }
});

async function trabajar(id) {
  esperando.add(id);
  if (id === agenteActual) { actualizarBotonesChat(); }
  try {
    const { respuesta, tarea } = await api(`/api/agentes/${id}/trabajar`, { method: 'POST' });
    Oficina.decir(id, respuesta);
    toast(`${agente(id).nombre}: ${respuesta}`);
    return tarea;
  } catch (err) {
    toast('⚠️ ' + err.message, 6000);
  } finally {
    esperando.delete(id);
    if (id === agenteActual) await cargarChat();
    refrescar();
  }
}

$('#btnTrabajar').addEventListener('click', () => agenteActual && trabajar(agenteActual));
$('#btnReiniciar').addEventListener('click', async () => {
  if (!agenteActual || !confirm(`¿Borrar la conversación con ${agente(agenteActual).nombre}?`)) return;
  await api(`/api/agentes/${agenteActual}/reiniciar`, { method: 'POST' });
  cargarChat();
});

// ---------------------------------------------------------------------------
// Reunión estratégica y jornada de trabajo
// ---------------------------------------------------------------------------
$('#btnReunion').addEventListener('click', () => { $('#reunionObjetivo').value = ''; $('#dlgReunion').showModal(); });
$('#formReunion').addEventListener('submit', async ev => {
  if (ev.submitter && ev.submitter.value !== 'ok') return;
  const objetivo = $('#reunionObjetivo').value.trim();
  if (!objetivo) { ev.preventDefault(); return; }
  Oficina.reunion(true);
  $('#btnReunion').disabled = true;
  esperando.add('sofia');
  toast('🎯 El equipo va a la sala de juntas…');
  await abrirChat('sofia');
  agregarMensaje('usuario', `🎯 Nuevo proyecto: ${objetivo}`);
  mostrarEscribiendo();
  try {
    const { respuesta } = await api('/api/reunion', { method: 'POST', body: { objetivo } });
    Oficina.decir('sofia', respuesta, 9000);
    toast('📋 ¡Plan listo! Revisa el tablero.');
  } catch (err) {
    toast('⚠️ ' + err.message, 6000);
  } finally {
    esperando.delete('sofia');
    $('#btnReunion').disabled = false;
    setTimeout(() => Oficina.reunion(false), 2500);
    if (agenteActual === 'sofia') cargarChat();
    refrescar();
  }
});

$('#btnJornada').addEventListener('click', async () => {
  const conTrabajo = estado.agentes.filter(a =>
    !esperando.has(a.id) && estado.tareas.some(t => t.asignado === a.id && (t.estado === 'pendiente' || t.estado === 'en_progreso')));
  if (!conTrabajo.length) return toast('Nadie tiene tareas pendientes. ¡Convoca un proyecto nuevo!');
  if (!confirm(`${conTrabajo.map(a => a.nombre).join(', ')} trabajarán en su siguiente tarea. ¿Empezamos?`)) return;
  $('#btnJornada').disabled = true;
  toast('⚡ ¡A trabajar, equipo!');
  await Promise.all(conTrabajo.map(a => trabajar(a.id)));
  $('#btnJornada').disabled = false;
  toast('🏁 Jornada terminada: revisa las tareas en revisión.');
});

// ---------------------------------------------------------------------------
// Tablero
// ---------------------------------------------------------------------------
function renderTablero() {
  const cont = $('#tablero');
  cont.innerHTML = '';
  for (const [clave, titulo] of ESTADOS) {
    const tareas = estado.tareas.filter(t => t.estado === clave);
    const col = document.createElement('div');
    col.className = 'columna';
    col.innerHTML = `<h4><span>${titulo}</span><span>${tareas.length}</span></h4><div class="tarjetas"></div>`;
    const lista = col.querySelector('.tarjetas');
    if (!tareas.length) lista.innerHTML = '<div class="columna-vacia">Sin tareas</div>';
    for (const t of tareas) {
      const a = agente(t.asignado) || { nombre: t.asignado, color: '#888' };
      const idx = ESTADOS.findIndex(e => e[0] === t.estado);
      const card = document.createElement('div');
      card.className = 'tarjeta';
      card.style.setProperty('--c', a.color);
      card.innerHTML = `
        <div class="t-titulo">#${t.id} ${escapar(t.titulo)}</div>
        <div class="t-meta">
          <span>${escapar(a.nombre)}</span>
          <span class="prio ${t.prioridad}">${t.prioridad}</span>
          ${t.entregable ? '<span>📎</span>' : ''}
          <span class="t-acciones">
            ${idx > 0 ? '<button data-mover="-1" title="Mover atrás">◀</button>' : ''}
            ${idx < ESTADOS.length - 1 ? '<button data-mover="1" title="Mover adelante">▶</button>' : ''}
          </span>
        </div>`;
      card.addEventListener('click', ev => {
        const mover = ev.target.dataset.mover;
        if (mover) {
          ev.stopPropagation();
          moverTarea(t.id, ESTADOS[idx + Number(mover)][0]);
        } else detalleTarea(t.id);
      });
      lista.appendChild(card);
    }
    cont.appendChild(col);
  }
}

async function moverTarea(id, nuevoEstado) {
  try { await api(`/api/tareas/${id}`, { method: 'PATCH', body: { estado: nuevoEstado } }); } catch (err) { toast('⚠️ ' + err.message); }
  refrescar();
}

function detalleTarea(id) {
  const t = estado.tareas.find(x => x.id === id);
  if (!t) return;
  const opciones = estado.agentes.map(a => `<option value="${a.id}" ${a.id === t.asignado ? 'selected' : ''}>${escapar(a.nombre)} — ${escapar(a.rol)}</option>`).join('');
  const creador = agente(t.creadoPor);
  $('#detalleTarea').innerHTML = `
    <h3>#${t.id} ${escapar(t.titulo)}</h3>
    <p class="notas">Creada por ${escapar(creador ? creador.nombre : t.creadoPor)} · prioridad <span class="prio ${t.prioridad}">${t.prioridad}</span></p>
    <p>${markdown(t.descripcion || '_Sin descripción_')}</p>
    <p><label>Asignada a: <select id="detAsignado">${opciones}</select></label></p>
    ${t.notas.length ? `<h4>Notas</h4><div class="notas">${t.notas.map(n => `<div><b>${escapar((agente(n.autor) || { nombre: n.autor }).nombre)}:</b> ${escapar(n.texto)}</div>`).join('')}</div>` : ''}
    ${t.entregable ? `<h4>📎 Entregable</h4><div class="entregable">${markdown(t.entregable)}</div>` : ''}
    <div class="dlg-botones">
      <button class="btn fantasma" id="detBorrar">🗑️ Borrar</button>
      <button class="btn" id="detHablar">💬 Hablar con ${escapar((agente(t.asignado) || {}).nombre || '')}</button>
      ${t.estado === 'revision' ? '<button class="btn" id="detQA">🔍 Pedir revisión a QA</button><button class="btn primario" id="detAprobar">✅ Aprobar</button>' : ''}
    </div>`;
  $('#detAsignado').addEventListener('change', async ev => {
    await api(`/api/tareas/${id}`, { method: 'PATCH', body: { asignado: ev.target.value } });
    refrescar();
  });
  $('#detBorrar').addEventListener('click', async () => {
    if (!confirm('¿Borrar esta tarea?')) return;
    await api(`/api/tareas/${id}`, { method: 'DELETE' });
    $('#dlgTarea').close();
    refrescar();
  });
  $('#detHablar').addEventListener('click', () => { $('#dlgTarea').close(); abrirChat(t.asignado); });
  if (t.estado === 'revision') {
    $('#detAprobar').addEventListener('click', async () => { await moverTarea(id, 'hecho'); $('#dlgTarea').close(); });
    $('#detQA').addEventListener('click', () => {
      $('#dlgTarea').close();
      abrirChat('andres');
      enviar('andres', `Por favor revisa la tarea #${t.id} "${t.titulo}" que está en revisión. Si está bien márcala como hecha; si no, devuélvela a en_progreso con notas.\n\nEntregable:\n${t.entregable}`);
    });
  }
  $('#dlgTarea').showModal();
}

$('#formTarea').addEventListener('submit', async ev => {
  ev.preventDefault();
  try {
    await api('/api/tareas', {
      method: 'POST',
      body: { titulo: $('#tareaTitulo').value, asignado: $('#tareaAsignado').value, prioridad: $('#tareaPrioridad').value },
    });
    $('#tareaTitulo').value = '';
    refrescar();
  } catch (err) { toast('⚠️ ' + err.message); }
});

// ---------------------------------------------------------------------------
// Equipo
// ---------------------------------------------------------------------------
function renderEquipo() {
  const cont = $('#equipo');
  cont.innerHTML = '';
  for (const a of estado.agentes) {
    const mias = estado.tareas.filter(t => t.asignado === a.id);
    const abiertas = mias.filter(t => t.estado !== 'hecho').length;
    let act = TEXTO_ACTIVIDAD[a.actividad.estado] || a.actividad.estado;
    if (a.actividad.objetivo) act += ` (${(agente(a.actividad.objetivo) || {}).nombre})`;
    const div = document.createElement('div');
    div.className = 'miembro';
    div.innerHTML = `
      <div class="avatar" style="background:${a.color}">${inicial(a)}</div>
      <div><div class="nombre">${escapar(a.nombre)}</div><div class="rol">${escapar(a.rol)}</div><div class="estado">● ${escapar(act)}</div></div>
      <div class="carga">${abiertas} abiertas<br>${mias.length - abiertas} hechas</div>`;
    div.addEventListener('click', () => abrirChat(a.id));
    cont.appendChild(div);
  }
}

// ---------------------------------------------------------------------------
// Sincronización
// ---------------------------------------------------------------------------
async function refrescar() {
  try {
    estado = await api('/api/estado');
  } catch (_) { return; }
  Oficina.actualizar(estado);
  renderTablero();
  renderEquipo();
  const actual = agente(agenteActual);
  if (actual && actual.mensajes !== mensajesVistos && !esperando.has(agenteActual)) cargarChat();
}

(async function inicio() {
  estado = await api('/api/estado');
  const modo = $('#modo');
  modo.textContent = estado.demo ? 'Modo demo' : estado.modelo;
  modo.className = 'pill ' + (estado.demo ? 'demo' : 'real');
  if (estado.demo) modo.title = 'Define ANTHROPIC_API_KEY en el servidor para que los agentes piensen de verdad';
  $('#tareaAsignado').innerHTML = estado.agentes.map(a => `<option value="${a.id}">${escapar(a.nombre)}</option>`).join('');
  Oficina.iniciar($('#oficina'), estado.agentes, { onSelect: abrirChat });
  Oficina.actualizar(estado);
  renderTablero();
  renderEquipo();
  setInterval(refrescar, 2000);
})();
