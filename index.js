const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Pepito Receipt Generator' });
});

app.post('/generar-recibo', async (req, res) => {
  try {
    const {
      numeroPedido = '0001',
      cliente = 'Cliente',
      telefono = '',
      tipoEntrega = 'Domicilio',
      direccion = '',
      detalle_pedido = '',
      total = '',
      tiempoEstimado = '30 - 40 min'
    } = req.body;

    const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const pedidoNum = String(numeroPedido).padStart(4, '0');

    const productos = detalle_pedido.split(',').map(p => p.trim()).filter(Boolean);

    const productosRows = productos.map((p, i) => `
      <tr style="background:${i % 2 === 0 ? '#FFF8F0' : '#FFF3E8'}">
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#2C1810;border-bottom:1px solid #EDD9C0">${p}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { margin: 0; padding: 20px; background: #1a1a1a; font-family: Arial, sans-serif; display: flex; justify-content: center; }
  .receipt { width: 480px; background: #FDF6EE; border-radius: 24px; overflow: hidden; }
  .top-bar { background: #E07B1A; height: 8px; }
  .header { text-align: center; padding: 24px 20px 16px; }
  .logo { width: 80px; height: 80px; background: linear-gradient(135deg, #F4A23C, #E07B1A); border-radius: 50%; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 36px; }
  .brand { font-size: 26px; font-weight: 900; color: #2C1810; letter-spacing: 1px; }
  .brand-sub { font-size: 11px; font-weight: 700; color: #8B5E3C; letter-spacing: 3px; margin-top: 2px; }
  .title { font-size: 19px; font-weight: 800; color: #2C1810; margin-top: 12px; }
  .badge { display: inline-block; background: #E8F7EE; color: #27AE60; font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 20px; margin-top: 6px; border: 1.5px solid #A8E6C0; }
  .divider { border: none; border-top: 2px dashed #D4B896; margin: 12px 20px; }
  .order-box { background: #FFF8F0; margin: 0 16px; border-radius: 12px; padding: 12px 16px; border: 1.5px solid #EDD9C0; display: flex; justify-content: space-between; align-items: flex-start; }
  .order-num { font-size: 22px; font-weight: 900; color: #E07B1A; }
  .order-label { font-size: 12px; font-weight: 700; color: #8B5E3C; margin-bottom: 4px; }
  .date-time { text-align: right; font-size: 11px; color: #8B5E3C; font-weight: 600; line-height: 1.6; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 16px; }
  .card { background: #FFF8F0; border-radius: 10px; padding: 10px 12px; border: 1.5px solid #EDD9C0; }
  .card-label { font-size: 10px; font-weight: 700; color: #8B5E3C; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 3px; }
  .card-value { font-size: 13px; font-weight: 700; color: #2C1810; word-break: break-word; }
  .table-wrap { margin: 0 16px 10px; border-radius: 10px; overflow: hidden; }
  .table-head { background: #E07B1A; color: white; font-size: 12px; font-weight: 800; padding: 10px 14px; text-transform: uppercase; }
  .total-bar { background: #2C1810; margin: 0 16px; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 16px; font-weight: 900; color: white; }
  .total-value { font-size: 18px; font-weight: 900; color: #F4A23C; }
  .status-box { background: #FFF8F0; margin: 10px 16px; border-radius: 12px; padding: 14px; border: 1.5px solid #EDD9C0; }
  .status-title { font-size: 11px; font-weight: 800; color: #8B5E3C; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-bottom: 14px; }
  .steps { display: flex; justify-content: space-between; align-items: flex-start; }
  .step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
  .step-dot.active { background: #E07B1A; color: white; }
  .step-dot.inactive { background: #EDD9C0; color: #8B5E3C; }
  .step-line { flex: 1; height: 2px; background: #EDD9C0; margin-top: 14px; }
  .step-label { font-size: 8px; font-weight: 700; color: #8B5E3C; text-align: center; max-width: 52px; }
  .step-label.active { color: #E07B1A; }
  .tiempo { background: #FFF0DC; border: 1.5px solid #F4A23C; border-radius: 20px; padding: 7px 14px; text-align: center; margin-top: 12px; font-size: 12px; color: #8B5E3C; font-weight: 600; }
  .tiempo span { font-weight: 900; color: #E07B1A; }
  .thanks { text-align: center; padding: 10px 20px 6px; font-size: 15px; font-weight: 800; color: #2C1810; }
  .footer { background: #2C1810; padding: 12px 20px; text-align: center; font-size: 11px; color: #D4B896; font-weight: 600; }
  .bottom-bar { background: #E07B1A; height: 6px; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
<div class="receipt">
  <div class="top-bar"></div>
  <div class="header">
    <div class="logo">&#128104;&#8205;&#127859;</div>
    <div class="brand">PEPITO</div>
    <div class="brand-sub">RESTAURANTE</div>
    <div class="title">Comprobante de Pedido</div>
    <div class="badge">&#10003; Pedido confirmado!</div>
  </div>
  <hr class="divider">
  <div class="order-box">
    <div>
      <div class="order-label">Pedido</div>
      <div class="order-num">#${pedidoNum}</div>
    </div>
    <div class="date-time">${fecha}<br>${hora}</div>
  </div>
  <div class="grid">
    <div class="card"><div class="card-label">Cliente</div><div class="card-value">${cliente}</div></div>
    <div class="card"><div class="card-label">Telefono</div><div class="card-value">${telefono}</div></div>
    <div class="card"><div class="card-label">Tipo entrega</div><div class="card-value">${tipoEntrega}</div></div>
    <div class="card"><div class="card-label">Direccion</div><div class="card-value">${direccion || '-'}</div></div>
  </div>
  <div class="table-wrap">
    <div class="table-head">Detalle del pedido</div>
    <table>${productosRows}</table>
  </div>
  <div class="total-bar">
    <span class="total-label">TOTAL</span>
    <span class="total-value">${total}</span>
  </div>
  <div class="status-box">
    <div class="status-title">Estado del pedido</div>
    <div class="steps">
      <div class="step"><div class="step-dot active">&#10003;</div><div class="step-label active">Confirmado</div></div>
      <div class="step-line"></div>
      <div class="step"><div class="step-dot inactive">2</div><div class="step-label">Preparando</div></div>
      <div class="step-line"></div>
      <div class="step"><div class="step-dot inactive">3</div><div class="step-label">Listo</div></div>
      <div class="step-line"></div>
      <div class="step"><div class="step-dot inactive">4</div><div class="step-label">En camino</div></div>
      <div class="step-line"></div>
      <div class="step"><div class="step-dot inactive">5</div><div class="step-label">Entregado</div></div>
    </div>
    <div class="tiempo">Tiempo estimado: <span>${tiempoEstimado}</span></div>
  </div>
  <div class="thanks">Gracias por elegir Pepito! &#9829;</div>
  <div class="footer">300 123 4567 | @pepito.restaurante | Te esperamos!</div>
  <div class="bottom-bar"></div>
</div>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Pepito Receipt Generator corriendo en puerto ' + PORT));
