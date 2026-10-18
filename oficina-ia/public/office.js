// Motor de la oficina: mapa en pixel-art, personajes, pathfinding y animación.
// Expone window.Oficina para que app.js lo controle.
(function () {
  const T = 32;
  const COLS = 30;
  const ROWS = 18;
  const W = COLS * T;
  const H = ROWS * T;
  const VELOCIDAD = 75; // px por segundo

  // -------------------------------------------------------------------------
  // Mapa
  // -------------------------------------------------------------------------
  const solido = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  function bloquear(x, y, w = 1, h = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) solido[j][i] = true;
  }
  for (let x = 0; x < COLS; x++) { bloquear(x, 0); bloquear(x, 1); bloquear(x, ROWS - 1); }
  for (let y = 0; y < ROWS; y++) { bloquear(0, y); bloquear(COLS - 1, y); }

  // Sala de juntas (x 21-28, y 2-9) con mampara de vidrio y puerta en y 7-8
  for (let y = 2; y <= 9; y++) if (y !== 7 && y !== 8) bloquear(20, y);
  bloquear(20, 10, 9, 1);

  const muebles = []; // { tipo, x, y, w, h, orden }
  function mueble(tipo, x, y, w = 1, h = 1, opts = {}) {
    const m = { tipo, x, y, w, h, orden: (y + h) * T - 1, ...opts };
    muebles.push(m);
    if (opts.solido !== false) bloquear(x, y, w, h);
    return m;
  }

  mueble('estante', 1, 2, 3, 1);
  mueble('impresora', 19, 2);
  mueble('planta', 18, 4);
  mueble('planta', 1, 10);
  mueble('planta', 18, 12);
  mueble('planta', 19, 16);
  mueble('planta', 7, 16);
  mueble('planta', 1, 12);
  mueble('dispensador', 21, 11);
  mueble('mesonCocina', 22, 11, 6, 1);
  mueble('nevera', 28, 11, 1, 2);
  mueble('mesita', 23, 14);
  mueble('mesita', 26, 14);
  mueble('mesaJuntas', 22, 4, 6, 2);
  mueble('mesaCentro', 3, 14, 2, 1);
  mueble('sofaBase', 2, 16, 4, 1, { solido: false, orden: 16 * T });
  mueble('sofaRespaldo', 2, 16, 4, 1, { solido: false, orden: 17 * T });

  // Lugares a los que la gente va cuando está libre
  const LUGARES = [
    { tx: 23, ty: 12, dir: 'up', emoji: '☕', nombre: 'cafe' },
    { tx: 21, ty: 12, dir: 'up', emoji: '💧', nombre: 'agua' },
    { tx: 28, ty: 13, dir: 'up', emoji: '🥪', nombre: 'nevera' },
    { tx: 22, ty: 14, dir: 'right', emoji: '🍪', nombre: 'mesa1' },
    { tx: 27, ty: 14, dir: 'left', emoji: '🍵', nombre: 'mesa2' },
    { tx: 3, ty: 16, dir: 'up', emoji: '😌', nombre: 'sofa1', sentarse: true },
    { tx: 4, ty: 16, dir: 'up', emoji: '📱', nombre: 'sofa2', sentarse: true },
    { tx: 2, ty: 3, dir: 'up', emoji: '📚', nombre: 'libros' },
    { tx: 19, ty: 3, dir: 'up', emoji: '🖨️', nombre: 'impresora' },
    { tx: 5, ty: 2, dir: 'up', emoji: '🌤️', nombre: 'ventana1' },
    { tx: 14, ty: 2, dir: 'up', emoji: '🌤️', nombre: 'ventana2' },
    { tx: 24, ty: 3, dir: 'up', emoji: '📝', nombre: 'pizarra' },
  ];

  // Puestos en la sala de juntas (la directora va a la cabecera)
  const SILLAS_JUNTAS = [
    { tx: 21, ty: 4, dir: 'right' },
    { tx: 22, ty: 3, dir: 'down' }, { tx: 24, ty: 3, dir: 'down' }, { tx: 26, ty: 3, dir: 'down' },
    { tx: 23, ty: 6, dir: 'up' }, { tx: 25, ty: 6, dir: 'up' }, { tx: 27, ty: 6, dir: 'up' },
  ];
  for (const s of SILLAS_JUNTAS) {
    muebles.push({ tipo: 'sillaJuntas', x: s.tx, y: s.ty, dir: s.dir, orden: s.ty * T + T - 7 });
    // El respaldo de las sillas que miran hacia arriba tapa a quien está sentado
    if (s.dir === 'up') muebles.push({ tipo: 'sillaJuntasRespaldo', x: s.tx, y: s.ty, dir: s.dir, orden: s.ty * T + T - 5 });
  }

  const pies = (tx, ty) => ({ x: tx * T + T / 2, y: ty * T + T - 6 });
  const caminable = (tx, ty) => tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && !solido[ty][tx];

  function camino(desde, hasta) {
    const key = (x, y) => y * COLS + x;
    const previo = new Map([[key(desde.x, desde.y), null]]);
    const cola = [desde];
    while (cola.length) {
      const c = cola.shift();
      if (c.x === hasta.x && c.y === hasta.y) {
        const ruta = [];
        let k = key(c.x, c.y);
        while (k !== null) { ruta.unshift({ x: k % COLS, y: Math.floor(k / COLS) }); k = previo.get(k); }
        return ruta;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!caminable(nx, ny) || previo.has(key(nx, ny))) continue;
        previo.set(key(nx, ny), key(c.x, c.y));
        cola.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function cercaCaminable(tx, ty) {
    if (caminable(tx, ty)) return { x: tx, y: ty };
    for (let r = 1; r < 6; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (caminable(tx + dx, ty + dy)) return { x: tx + dx, y: ty + dy };
    return { x: 2, y: 4 };
  }

  // -------------------------------------------------------------------------
  // Utilidades de dibujo
  // -------------------------------------------------------------------------
  let ctx;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function oscurecer(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // -------------------------------------------------------------------------
  // Fondo (se pre-renderiza una vez)
  // -------------------------------------------------------------------------
  const enSala = (x, y) => x >= 21 && x <= 28 && y >= 2 && y <= 9;
  const enCocina = (x, y) => x >= 20 && x <= 28 && y >= 11 && y <= 16;

  function dibujarFondo(c) {
    const prev = ctx; ctx = c;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * T, py = y * T;
        if (enSala(x, y)) {
          R(px, py, T, T, '#56607a');
          if (hash(x, y) > 0.5) R(px + 6, py + 20, 2, 2, '#5f6a86');
          R(px + 22, py + 8, 2, 2, '#4f5870');
        } else if (enCocina(x, y)) {
          for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++)
            R(px + i * 16, py + j * 16, 16, 16, (i + j + x + y) % 2 ? '#e9ecef' : '#ced4da');
        } else {
          for (let k = 0; k < 4; k++) {
            const tono = 0.94 + hash(x + k, y * 3) * 0.1;
            R(px, py + k * 8, T, 8, oscurecer('#c79f74', tono));
            R(px, py + k * 8 + 7, T, 1, '#a17c57');
            R(px + ((k * 13 + x * 7) % T), py + k * 8, 1, 7, '#a17c57');
          }
        }
      }
    }
    // Alfombra del área de descanso
    R(1 * T + 4, 12 * T + 4, 7 * T - 8, 5 * T - 8, '#6d597a');
    R(1 * T + 10, 12 * T + 10, 7 * T - 20, 5 * T - 20, '#b5838d');
    for (let i = 0; i < 6; i++) R(1 * T + 18 + i * 32, 12 * T + 16, 10, 2, '#e5989b');

    // Pared superior con ventanas
    R(0, 0, W, 10, '#2b2d42');
    R(0, 10, W, 2 * T - 10, '#e8dccb');
    R(0, 2 * T - 6, W, 6, '#8d7b68');
    for (let x = 0; x < W; x += 16) R(x, 12, 1, 2 * T - 18, '#e0d2bf');
    // Logo
    ctx.fillStyle = '#ff8a3d'; rrect(9 * T + 4, 18, 3 * T - 8, 26, 6); ctx.fill();
    ctx.fillStyle = '#1b1d27'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OFICINA IA', 10.5 * T, 31);
    // Pizarra de la sala
    R(22.5 * T, 16, 4 * T, 36, '#adb5bd');
    R(22.5 * T + 3, 19, 4 * T - 6, 30, '#ffffff');
    const notas = ['#ffd43b', '#74c0fc', '#ff8787', '#8ce99a'];
    for (let i = 0; i < 8; i++) R(22.5 * T + 10 + i * 14, 24 + (i % 2) * 11, 10, 9, notas[i % 4]);

    // Paredes laterales e inferior
    R(0, 0, 10, H, '#2b2d42'); R(W - 10, 0, 10, H, '#2b2d42'); R(0, H - 12, W, 12, '#2b2d42');
    R(10, 2 * T, T - 10, H - 2 * T - 12, '#3d405b');
    R(W - T, 2 * T, T - 10, H - 2 * T - 12, '#3d405b');
    R(10, H - T, W - 20, T - 12, '#3d405b');

    // Mamparas de vidrio de la sala de juntas
    ctx.globalAlpha = 0.55;
    R(20 * T + 10, 2 * T, 12, 5 * T, '#a5d8ff');
    R(20 * T + 10, 9 * T, 12, T, '#a5d8ff');
    R(20 * T + 10, 10 * T + 8, 9 * T - 10, 14, '#a5d8ff');
    ctx.globalAlpha = 1;
    R(20 * T + 10, 2 * T, 2, 5 * T, '#74c0fc'); R(20 * T + 20, 2 * T, 2, 5 * T, '#74c0fc');
    R(20 * T + 10, 9 * T, 2, 2 * T, '#74c0fc'); R(20 * T + 20, 9 * T, 2, T + 8, '#74c0fc');
    R(20 * T + 10, 10 * T + 8, 9 * T - 10, 2, '#74c0fc'); R(20 * T + 10, 10 * T + 20, 9 * T - 10, 2, '#74c0fc');
    ctx.fillStyle = '#e9ecf5'; ctx.font = 'bold 10px system-ui';
    ctx.fillText('SALA DE JUNTAS', 24.5 * T, 9 * T + 16);
    ctx.fillStyle = '#1b1d27';
    ctx.fillText('☕ COCINA', 24.5 * T, 10 * T + 15);
    ctx = prev;
  }

  function dibujarVentanas(t) {
    const h = new Date().getHours();
    const noche = h < 6 || h >= 19;
    const cielo = noche ? '#1c2541' : h < 8 || h >= 17 ? '#f4a261' : '#8ecae6';
    for (const vx of [4, 13]) {
      const x = vx * T, y = 14;
      R(x - 3, y - 3, 3 * T + 6, 40, '#6c584c');
      R(x, y, 3 * T, 34, cielo);
      if (noche) {
        for (let i = 0; i < 6; i++) R(x + 8 + i * 15, y + 6 + (i % 3) * 8, 2, 2, '#fff');
        R(x + 70, y + 6, 8, 8, '#f1faee');
      } else {
        const nube = ((t / 120) + vx * 20) % (3 * T + 30) - 30;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, 3 * T, 34); ctx.clip();
        R(x + nube, y + 8, 22, 7, '#ffffff'); R(x + nube + 6, y + 4, 12, 6, '#ffffff');
        ctx.restore();
      }
      R(x + 1.5 * T - 1, y, 3, 34, '#6c584c');
      R(x, y + 15, 3 * T, 3, '#6c584c');
    }
    // Reloj de pared
    const cx = 17 * T + 16, cy = 34, ahora = new Date();
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8f9fa'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    const aguja = (ang, largo, ancho, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = ancho; ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(ang) * largo, cy - Math.cos(ang) * largo); ctx.stroke();
    };
    aguja(((ahora.getHours() % 12) + ahora.getMinutes() / 60) / 12 * Math.PI * 2, 6, 2, '#212529');
    aguja(ahora.getMinutes() / 60 * Math.PI * 2, 9, 1.5, '#212529');
    aguja(ahora.getSeconds() / 60 * Math.PI * 2, 9, 1, '#e03131');
  }

  // -------------------------------------------------------------------------
  // Muebles
  // -------------------------------------------------------------------------
  function dibujarMueble(m, t) {
    const px = m.x * T, py = m.y * T;
    switch (m.tipo) {
      case 'estante':
        R(px, py - 18, m.w * T, T + 14, '#6f4e37');
        for (let f = 0; f < 3; f++) {
          R(px + 3, py - 14 + f * 14, m.w * T - 6, 11, '#3e2a1e');
          for (let i = 0; i < 10; i++) {
            const c = ['#e03131', '#1971c2', '#2f9e44', '#f08c00', '#7048e8'][(i + f) % 5];
            R(px + 5 + i * 9, py - 13 + f * 14 + (i % 3), 6, 10 - (i % 3), c);
          }
        }
        break;
      case 'impresora':
        R(px + 2, py + 6, T - 4, T - 8, '#dee2e6'); R(px + 2, py + T - 6, T - 4, 4, '#adb5bd');
        R(px + 6, py, T - 12, 8, '#f8f9fa'); R(px + 20, py + 12, 4, 3, Math.sin(t / 300) > 0 ? '#51cf66' : '#2b8a3e');
        break;
      case 'planta':
        R(px + 9, py + 18, 14, 12, '#a0522d'); R(px + 8, py + 17, 16, 3, '#8b4513');
        ctx.fillStyle = '#2f9e44';
        for (const [ox, oy, r] of [[16, 10, 8], [10, 13, 6], [22, 13, 6], [16, 4, 6]]) { ctx.beginPath(); ctx.arc(px + ox, py + oy, r, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#51cf66'; ctx.beginPath(); ctx.arc(px + 13, py + 7, 3, 0, 7); ctx.fill();
        break;
      case 'dispensador':
        R(px + 8, py + 10, 16, 20, '#e9ecef'); R(px + 10, py - 4, 12, 16, '#74c0fc'); R(px + 12, py - 2, 3, 10, '#a5d8ff');
        R(px + 12, py + 16, 8, 3, '#495057');
        break;
      case 'mesonCocina':
        R(px, py - 4, m.w * T, T + 2, '#868e96'); R(px, py - 6, m.w * T, 6, '#ced4da');
        R(px, py + T - 6, m.w * T, 4, '#495057');
        // Cafetera
        R(px + T + 6, py - 18, 20, 20, '#212529'); R(px + T + 10, py - 14, 12, 6, '#495057');
        R(px + T + 12, py - 4, 8, 6, '#f8f9fa');
        for (let i = 0; i < 3; i++) {
          const fase = ((t / 900) + i / 3) % 1;
          ctx.globalAlpha = 1 - fase;
          R(px + T + 14 + Math.sin(fase * 6 + i) * 3, py - 22 - fase * 16, 3, 3, '#f1f3f5');
          ctx.globalAlpha = 1;
        }
        // Lavaplatos y microondas
        R(px + 3 * T + 4, py, 24, 12, '#adb5bd'); R(px + 3 * T + 14, py - 6, 3, 8, '#868e96');
        R(px + 5 * T - 2, py - 16, 30, 18, '#343a40'); R(px + 5 * T + 2, py - 12, 18, 10, '#495057');
        break;
      case 'nevera':
        R(px + 2, py - 12, T - 4, m.h * T + 8, '#f1f3f5'); R(px + 2, py + 14, T - 4, 2, '#adb5bd');
        R(px + T - 9, py - 4, 3, 12, '#868e96'); R(px + T - 9, py + 22, 3, 14, '#868e96');
        R(px + 6, py, 6, 6, '#ffd43b');
        break;
      case 'mesita':
        ctx.fillStyle = '#f8f9fa'; ctx.beginPath(); ctx.ellipse(px + 16, py + 14, 14, 10, 0, 0, 7); ctx.fill();
        R(px + 14, py + 22, 4, 8, '#868e96');
        R(px + 10, py + 9, 6, 6, '#e03131');
        break;
      case 'mesaJuntas':
        R(px, py + 2, m.w * T, m.h * T - 4, '#8d5524'); R(px + 4, py + 6, m.w * T - 8, m.h * T - 16, '#a0652d');
        R(px, py + m.h * T - 6, m.w * T, 4, '#5c3317');
        for (let i = 0; i < 3; i++) R(px + 20 + i * 64, py + 18, 14, 10, '#f8f9fa');
        R(px + 90, py + 26, 12, 8, '#343a40');
        break;
      case 'mesaCentro':
        R(px + 2, py + 6, m.w * T - 4, T - 12, '#6f4e37'); R(px + 2, py + T - 8, m.w * T - 4, 3, '#3e2a1e');
        R(px + 12, py + 9, 7, 6, '#f8f9fa'); R(px + 36, py + 10, 14, 8, '#74c0fc');
        break;
      case 'sofaBase':
        R(px - 4, py + 2, m.w * T + 8, 22, '#3b5bdb'); R(px, py + 4, m.w * T, 14, '#4c6ef5');
        break;
      case 'sofaRespaldo':
        R(px - 6, py + 16, m.w * T + 12, 14, '#364fc7'); R(px - 6, py + 2, 8, 26, '#364fc7'); R(px + m.w * T - 2, py + 2, 8, 26, '#364fc7');
        break;
      case 'sillaJuntas':
        dibujarSilla(px + 16, py + T - 6, m.dir, 'base');
        if (m.dir !== 'up' || !ocupada(m.x, m.y)) dibujarSilla(px + 16, py + T - 6, m.dir, 'respaldo');
        break;
      case 'sillaJuntasRespaldo':
        if (ocupada(m.x, m.y)) dibujarSilla(px + 16, py + T - 6, m.dir, 'respaldo');
        break;
      case 'escritorio':
        dibujarEscritorio(m, t);
        break;
      case 'sillaPuesto':
        dibujarSilla(m.sx, m.sy, 'up', 'base');
        if (!m.persona.sentadoEnPuesto()) dibujarSilla(m.sx, m.sy, 'up', 'respaldo');
        break;
      case 'sillaPuestoRespaldo':
        if (m.persona.sentadoEnPuesto()) dibujarSilla(m.sx, m.sy, 'up', 'respaldo');
        break;
    }
  }

  function dibujarSilla(x, y, dir, parte) {
    if (parte === 'base') {
      R(x - 8, y - 2, 16, 3, '#212529');
      R(x - 1, y - 8, 2, 7, '#495057');
      R(x - 9, y - 14, 18, 7, '#343a40');
    } else {
      if (dir === 'up') R(x - 9, y - 14, 18, 12, '#495057');
      else if (dir === 'down') R(x - 9, y - 26, 18, 12, '#495057');
      else if (dir === 'right') R(x - 12, y - 24, 5, 18, '#495057');
      else R(x + 7, y - 24, 5, 18, '#495057');
    }
  }

  function dibujarEscritorio(m, t) {
    const px = m.x * T, py = m.y * T, ancho = m.w * T;
    const p = m.persona;
    R(px, py + 2, ancho, T - 6, '#d8b48a');
    R(px, py + T - 8, ancho, 6, '#a47148');
    R(px + 2, py + T - 2, 4, 2, '#5c3d2e'); R(px + ancho - 6, py + T - 2, 4, 2, '#5c3d2e');
    const pantallas = m.w === 3 ? [px + 20, px + 52] : [px + ancho / 2 - 13];
    const trabajando = p.trabajando();
    for (const sx of pantallas) {
      R(sx + 11, py + 6, 4, 6, '#495057');
      R(sx, py - 14, 26, 20, '#212529');
      const ty = py - 12;
      if (trabajando) {
        R(sx + 2, ty, 22, 16, '#0b1021');
        const colores = ['#74c0fc', '#ffd43b', '#b2f2bb', '#ff8787', '#e599f7'];
        const desp = Math.floor(t / 250);
        for (let l = 0; l < 5; l++) {
          const largo = 4 + Math.floor(hash(l + desp, m.x) * 14);
          R(sx + 3 + (l % 2) * 3, ty + 1 + l * 3, largo, 2, colores[(l + desp) % 5]);
        }
      } else if (p.pensando()) {
        R(sx + 2, ty, 22, 16, '#1c2541');
        R(sx + 6 + Math.floor((t / 200) % 3) * 5, ty + 7, 3, 3, '#ffd43b');
      } else {
        R(sx + 2, ty, 22, 16, '#2b3a55');
        R(sx + 10, ty + 5, 6, 6, p.color);
      }
    }
    R(px + ancho / 2 - 9, py + 14, 18, 5, '#495057'); // teclado
    R(px + ancho / 2 + 13, py + 14, 4, 6, '#495057'); // mouse
    R(px + 4, py + 6, 6, 7, p.color); R(px + 10, py + 8, 2, 3, p.color); // taza
  }

  // -------------------------------------------------------------------------
  // Personajes
  // -------------------------------------------------------------------------
  class Persona {
    constructor(d) {
      Object.assign(this, { id: d.id, nombre: d.nombre, rol: d.rol, color: d.color, look: d.look, desk: d.desk });
      this.asiento = {
        x: (d.desk.x + d.desk.w / 2) * T,
        y: (d.desk.y + 1) * T + T - 6,
        tx: d.desk.x, ty: d.desk.y + 1,
      };
      this.x = this.asiento.x; this.y = this.asiento.y;
      this.dir = 'up';
      this.ruta = [];
      this.sentado = true;
      this.meta = { clave: 'puesto', dir: 'up', sentarse: true }; // { clave, tx, ty, px, py, dir, sentarse, emoji }
      this.proximaDecision = performance.now() + 3000 + Math.random() * 8000;
      this.actividad = { estado: 'libre' };
      this.tareasActivas = 0;
      this.burbuja = null;       // { texto, hasta }
      this.paso = 0;
    }
    tile() { return { x: Math.floor(this.x / T), y: Math.floor(this.y / T) }; }
    sentadoEnPuesto() { return this.sentado && Math.abs(this.x - this.asiento.x) < 2 && Math.abs(this.y - this.asiento.y) < 2; }
    trabajando() { return this.sentadoEnPuesto() && (this.actividad.estado === 'trabajando' || (this.actividad.estado === 'libre' && this.tareasActivas > 0)); }
    pensando() { return ['pensando', 'reunion', 'atendiendo'].includes(this.actividad.estado); }

    irA(meta) {
      if (this.meta && this.meta.clave === meta.clave) return;
      this.meta = meta;
      this.sentado = false;
      const ruta = camino(cercaCaminable(this.tile().x, this.tile().y), { x: meta.tx, y: meta.ty }) || [];
      this.ruta = ruta.slice(1).map(c => pies(c.x, c.y));
      this.ruta.push({ x: meta.px, y: meta.py });
    }
    irAlPuesto() {
      this.irA({ clave: 'puesto', tx: this.asiento.tx, ty: this.asiento.ty, px: this.asiento.x, py: this.asiento.y, dir: 'up', sentarse: true });
    }

    actualizar(dt, ahora) {
      if (this.ruta.length) {
        const obj = this.ruta[0];
        const dx = obj.x - this.x, dy = obj.y - this.y;
        const dist = Math.hypot(dx, dy);
        const avance = VELOCIDAD * dt;
        if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
        else if (dist > 0.5) this.dir = dy > 0 ? 'down' : 'up';
        if (dist <= avance) { this.x = obj.x; this.y = obj.y; this.ruta.shift(); }
        else { this.x += dx / dist * avance; this.y += dy / dist * avance; }
        this.paso += dt * 8;
        if (!this.ruta.length && this.meta) {
          this.dir = this.meta.dir;
          this.sentado = !!this.meta.sentarse;
          this.llegada = ahora;
        }
      }
      if (this.burbuja && ahora > this.burbuja.hasta) this.burbuja = null;
    }

    emoji(ahora) {
      const e = this.actividad.estado;
      if (e === 'pensando' || e === 'reunion') return ['💭', '💭.', '💭..'][Math.floor(ahora / 400) % 3];
      if (e === 'trabajando') return '⌨️';
      if (e === 'consultando' || e === 'atendiendo') return '💬';
      if (this.meta && !this.ruta.length && this.meta.emoji) return this.meta.emoji;
      if (this.trabajando()) return '⌨️';
      return '';
    }
  }

  function ocupada(tx, ty) {
    return personas.some(p => p.sentado && !p.ruta.length && p.tile().x === tx && p.tile().y === ty);
  }

  function dibujarPersona(p, ahora, seleccionada, hover) {
    const { piel, pelo, estiloPelo, camisa, pantalon } = p.look;
    const x = Math.round(p.x), y = Math.round(p.y);
    const camina = p.ruta.length > 0;
    const fase = Math.floor(p.paso) % 2;
    const sentado = p.sentado && !camina;
    const off = sentado ? 4 : 0;
    const d = p.dir;

    if (seleccionada || hover) {
      ctx.strokeStyle = seleccionada ? '#ffd43b' : '#ffffffaa';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 13, 5, 0, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#00000033'; ctx.beginPath(); ctx.ellipse(x, y, 9, 3, 0, 0, 7); ctx.fill();

    if (!sentado) {
      const l1 = camina && fase ? -2 : 0, l2 = camina && !fase ? -2 : 0;
      R(x - 5, y - 9 + l1, 4, 8, pantalon); R(x + 1, y - 9 + l2, 4, 8, pantalon);
      R(x - 5, y - 2 + l1, 4, 2, '#212529'); R(x + 1, y - 2 + l2, 4, 2, '#212529');
    }
    // Torso y brazos
    const ty = y - 19 + off;
    R(x - 7, ty, 14, 11, camisa);
    R(x - 7, ty + 9, 14, 2, oscurecer(camisa, 0.8));
    const tecleando = p.trabajando() && sentado;
    const b1 = tecleando ? (Math.floor(ahora / 140) % 2) * 2 : camina && fase ? 1 : 0;
    const b2 = tecleando ? (Math.floor(ahora / 140 + 1) % 2) * 2 : camina && !fase ? 1 : 0;
    if (d !== 'left') { R(x + 7, ty + 1 - b2, 3, 8, oscurecer(camisa, 0.85)); R(x + 7, ty + 9 - b2, 3, 2, piel); }
    if (d !== 'right') { R(x - 10, ty + 1 - b1, 3, 8, oscurecer(camisa, 0.85)); R(x - 10, ty + 9 - b1, 3, 2, piel); }

    // Cabeza
    const hy = y - 32 + off;
    if (estiloPelo === 'afro') { ctx.fillStyle = pelo; ctx.beginPath(); ctx.arc(x, hy + 5, 10, 0, 7); ctx.fill(); }
    if (estiloPelo === 'largo' && d !== 'down') R(x - 8, hy + 2, 16, 16, pelo);
    R(x - 7, hy, 14, 13, piel);
    if (d === 'up') {
      R(x - 7, hy - 1, 14, 12, pelo);
    } else {
      // pelo superior
      if (estiloPelo === 'gorra') {
        R(x - 8, hy - 2, 16, 5, oscurecer(camisa, 0.7));
        if (d === 'down') R(x - 8, hy + 3, 16, 2, oscurecer(camisa, 0.55));
        else R(d === 'right' ? x + 4 : x - 12, hy + 2, 8, 2, oscurecer(camisa, 0.55));
      } else if (estiloPelo !== 'afro') {
        R(x - 7, hy - 1, 14, 4, pelo);
        if (d === 'down') { R(x - 7, hy + 3, 2, 4, pelo); R(x + 5, hy + 3, 2, 4, pelo); }
        else R(d === 'right' ? x - 7 : x + 3, hy + 3, 4, 6, pelo);
      }
      if (estiloPelo === 'largo' && d === 'down') { R(x - 9, hy + 2, 3, 14, pelo); R(x + 6, hy + 2, 3, 14, pelo); }
      if (estiloPelo === 'bob') { R(x - 8, hy + 1, 3, 9, pelo); R(x + 5, hy + 1, 3, 9, pelo); }
      // ojos
      const parpadeo = (ahora + p.x * 37) % 4000 < 120;
      const oy = hy + 6;
      if (d === 'down') {
        R(x - 4, oy, 2, parpadeo ? 1 : 2, '#212529'); R(x + 2, oy, 2, parpadeo ? 1 : 2, '#212529');
        R(x - 1, oy + 4, 3, 1, oscurecer(piel, 0.75));
      } else {
        R(d === 'right' ? x + 3 : x - 5, oy, 2, parpadeo ? 1 : 2, '#212529');
      }
    }
    if (estiloPelo === 'cola' && d !== 'down') R(d === 'left' ? x + 5 : d === 'right' ? x - 9 : x - 2, hy + 4, 4, 9, pelo);
    if (estiloPelo === 'cola' && d === 'up') R(x - 2, hy + 8, 4, 8, pelo);
  }

  function dibujarEtiquetas(p, ahora, seleccionada) {
    const x = Math.round(p.x), y = Math.round(p.y) - 38 + (p.sentado && !p.ruta.length ? 4 : 0);
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ancho = ctx.measureText(p.nombre).width + 10;
    ctx.fillStyle = seleccionada ? '#ffd43b' : '#000000aa';
    rrect(x - ancho / 2, y - 6, ancho, 12, 6); ctx.fill();
    ctx.fillStyle = seleccionada ? '#1b1d27' : '#fff';
    ctx.fillText(p.nombre, x, y + 0.5);
    R(x - ancho / 2 + 3, y - 2, 3, 3, p.color);

    const e = p.emoji(ahora);
    if (p.burbuja) {
      ctx.font = '10px system-ui';
      const lineas = partir(p.burbuja.texto, 26).slice(0, 3);
      const w = Math.max(...lineas.map(l => ctx.measureText(l).width)) + 14;
      const h = lineas.length * 12 + 8;
      const bx = Math.min(Math.max(x - w / 2, 4), W - w - 4), by = y - 12 - h;
      ctx.fillStyle = '#ffffff'; rrect(bx, by, w, h, 6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 4, by + h); ctx.lineTo(x + 4, by + h); ctx.lineTo(x, by + h + 5); ctx.fill();
      ctx.fillStyle = '#1b1d27'; ctx.textAlign = 'left';
      lineas.forEach((l, i) => ctx.fillText(l, bx + 7, by + 10 + i * 12));
    } else if (e) {
      ctx.font = '13px system-ui';
      ctx.fillText(e, x, y - 14 + Math.sin(ahora / 300) * 1.5);
    }
  }

  function partir(texto, max) {
    const palabras = texto.replace(/\s+/g, ' ').trim().split(' ');
    const lineas = [];
    let l = '';
    for (const w of palabras) {
      if ((l + ' ' + w).trim().length > max) { if (l) lineas.push(l); l = w; } else l = (l + ' ' + w).trim();
    }
    if (l) lineas.push(l);
    if (lineas.length > 3) lineas[2] = lineas[2].slice(0, max - 1) + '…';
    return lineas;
  }

  // -------------------------------------------------------------------------
  // Comportamiento
  // -------------------------------------------------------------------------
  let personas = [];
  let reunionActiva = false;

  function puntoVisita(objetivo) {
    const d = objetivo.desk;
    const cand = [{ x: d.x + d.w, y: d.y + 1 }, { x: d.x - 1, y: d.y + 1 }, { x: d.x + d.w, y: d.y }, { x: d.x, y: d.y + 2 }];
    const c = cand.find(c => caminable(c.x, c.y)) || cercaCaminable(d.x, d.y + 2);
    return { ...c, dir: c.x >= d.x + d.w ? 'left' : c.x < d.x ? 'right' : 'up' };
  }

  function decidir(p, ahora) {
    const e = p.actividad.estado;
    if (reunionActiva) {
      const idx = p.id === 'sofia' ? 0 : 1 + personas.filter(q => q.id !== 'sofia').indexOf(p);
      const s = SILLAS_JUNTAS[idx % SILLAS_JUNTAS.length];
      const f = pies(s.tx, s.ty);
      return p.irA({ clave: 'junta' + idx, tx: s.tx, ty: s.ty, px: f.x, py: f.y, dir: s.dir, sentarse: true });
    }
    if (e === 'consultando' && p.actividad.objetivo) {
      const obj = personas.find(q => q.id === p.actividad.objetivo);
      if (obj) {
        const v = puntoVisita(obj);
        const f = pies(v.x, v.y);
        return p.irA({ clave: 'visita-' + obj.id, tx: v.x, ty: v.y, px: f.x, py: f.y, dir: v.dir, emoji: '💬' });
      }
    }
    if (e !== 'libre') return p.irAlPuesto();

    // Libre: alterna entre su puesto y la oficina
    if (ahora < p.proximaDecision) return;
    const enPuesto = p.meta && p.meta.clave === 'puesto';
    const quedarse = p.tareasActivas > 0 ? 0.85 : 0.55;
    if (!enPuesto) {
      p.irAlPuesto();
      p.proximaDecision = ahora + 8000 + Math.random() * 14000;
    } else if (Math.random() > quedarse) {
      const ocupados = new Set(personas.map(q => q.meta && q.meta.clave));
      const libres = LUGARES.filter(l => !ocupados.has('lugar-' + l.nombre));
      const visitarColega = Math.random() < 0.25;
      if (visitarColega) {
        const otro = personas.filter(q => q !== p)[Math.floor(Math.random() * (personas.length - 1))];
        const v = puntoVisita(otro);
        const f = pies(v.x, v.y);
        p.irA({ clave: 'charla-' + otro.id, tx: v.x, ty: v.y, px: f.x, py: f.y, dir: v.dir, emoji: '🗨️' });
      } else if (libres.length) {
        const l = libres[Math.floor(Math.random() * libres.length)];
        const f = pies(l.tx, l.ty);
        p.irA({ clave: 'lugar-' + l.nombre, tx: l.tx, ty: l.ty, px: f.x, py: f.y + (l.sentarse ? -4 : 0), dir: l.dir, sentarse: l.sentarse, emoji: l.emoji });
      }
      p.proximaDecision = ahora + 5000 + Math.random() * 6000;
    } else {
      p.proximaDecision = ahora + 6000 + Math.random() * 10000;
    }
  }

  // -------------------------------------------------------------------------
  // Bucle principal e interacción
  // -------------------------------------------------------------------------
  let canvas, fondo, escala = 1, seleccionado = null, hoverId = null, onSelect = () => {};
  let ultimo = performance.now();

  function ajustar() {
    const cont = canvas.parentElement;
    const disponibleW = cont.clientWidth - 24, disponibleH = cont.clientHeight - 24;
    escala = Math.max(0.3, Math.min(disponibleW / W, disponibleH / H));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.floor(W * escala) + 'px';
    canvas.style.height = Math.floor(H * escala) + 'px';
    canvas.width = Math.floor(W * escala * dpr);
    canvas.height = Math.floor(H * escala * dpr);
    ctx.setTransform(escala * dpr, 0, 0, escala * dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function frame(ahora) {
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    for (const p of personas) { decidir(p, ahora); p.actualizar(dt, ahora); }

    ctx.drawImage(fondo, 0, 0, W, H);
    dibujarVentanas(ahora);

    const items = muebles.map(m => ({ orden: m.orden, dibujar: () => dibujarMueble(m, ahora) }));
    for (const p of personas) items.push({ orden: p.y, dibujar: () => dibujarPersona(p, ahora, p.id === seleccionado, p.id === hoverId) });
    items.sort((a, b) => a.orden - b.orden);
    for (const it of items) it.dibujar();
    for (const p of [...personas].sort((a, b) => a.y - b.y)) dibujarEtiquetas(p, ahora, p.id === seleccionado);

    requestAnimationFrame(frame);
  }

  function personaEn(ev) {
    const r = canvas.getBoundingClientRect();
    const mx = (ev.clientX - r.left) / escala, my = (ev.clientY - r.top) / escala;
    let mejor = null;
    for (const p of personas) {
      if (mx > p.x - 12 && mx < p.x + 12 && my > p.y - 46 && my < p.y + 4) {
        if (!mejor || p.y > mejor.y) mejor = p;
      }
    }
    return mejor;
  }

  window.Oficina = {
    iniciar(canvasEl, agentes, opciones = {}) {
      canvas = canvasEl;
      ctx = canvas.getContext('2d');
      onSelect = opciones.onSelect || onSelect;
      personas = agentes.map(a => new Persona(a));
      for (const p of personas) {
        muebles.push({ tipo: 'escritorio', x: p.desk.x, y: p.desk.y, w: p.desk.w, persona: p, orden: (p.desk.y + 1) * T - 1 });
        muebles.push({ tipo: 'sillaPuesto', sx: p.asiento.x, sy: p.asiento.y, persona: p, orden: p.asiento.y - 1 });
        muebles.push({ tipo: 'sillaPuestoRespaldo', sx: p.asiento.x, sy: p.asiento.y, persona: p, orden: p.asiento.y + 1 });
        bloquear(p.desk.x, p.desk.y, p.desk.w, 1);
      }
      fondo = document.createElement('canvas');
      fondo.width = W; fondo.height = H;
      dibujarFondo(fondo.getContext('2d'));

      ajustar();
      new ResizeObserver(ajustar).observe(canvas.parentElement);
      canvas.addEventListener('click', ev => { const p = personaEn(ev); if (p) onSelect(p.id); });
      canvas.addEventListener('mousemove', ev => {
        const p = personaEn(ev);
        hoverId = p ? p.id : null;
        canvas.style.cursor = p ? 'pointer' : 'default';
      });
      requestAnimationFrame(frame);
    },
    actualizar(estado) {
      for (const a of estado.agentes) {
        const p = personas.find(q => q.id === a.id);
        if (!p) continue;
        p.actividad = a.actividad || { estado: 'libre' };
        p.tareasActivas = estado.tareas.filter(t => t.asignado === a.id && t.estado === 'en_progreso').length;
      }
    },
    seleccionar(id) { seleccionado = id; },
    decir(id, texto, ms = 6000) {
      const p = personas.find(q => q.id === id);
      if (p) p.burbuja = { texto, hasta: performance.now() + ms };
    },
    reunion(activa) {
      reunionActiva = activa;
      if (!activa) for (const p of personas) { p.meta = null; p.proximaDecision = 0; p.irAlPuesto(); }
    },
  };
})();
