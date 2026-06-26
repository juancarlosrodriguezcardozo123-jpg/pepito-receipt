const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(express.json());

function generateReceiptHTML(data) {
  const {
    numeroPedido = '0001',
    fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
    hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    cliente = 'Cliente',
    telefono = '',
    tipoEntrega = 'Domicilio',
    direccion = '',
    productos = [],
    costodomicilio = 4000,
    tiempoEstimado = '30 - 40 min'
  } = data;

  const subtotal = productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  const total = subtotal + (tipoEntrega.toLowerCase() === 'domicilio' ? costodomicilio : 0);

  const formatCOP = (n) => `$${n.toLocaleString('es-CO')}`;

  const productosHTML = productos.map(p => `
    <tr>
      <td class="product-name">${p.nombre}</td>
      <td class="center">${p.cantidad}</td>
      <td class="center">${formatCOP(p.precio)}</td>
      <td class="center bold">${formatCOP(p.precio * p.cantidad)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Nunito', sans-serif;
    background: #1a1a1a;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }

  .receipt {
    width: 480px;
    background: #FDF6EE;
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }

  /* HEADER */
  .header {
    background: #FDF6EE;
    text-align: center;
    padding: 28px 20px 16px;
    position: relative;
  }

  .food-icons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;
    margin-bottom: 8px;
    opacity: 0.15;
    font-size: 22px;
  }

  .logo-circle {
    width: 90px;
    height: 90px;
    background: linear-gradient(135deg, #F4A23C, #E07B1A);
    border-radius: 50%;
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    box-shadow: 0 4px 16px rgba(224,123,26,0.35);
  }

  .brand-name {
    font-size: 26px;
    font-weight: 900;
    color: #2C1810;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .brand-sub {
    font-size: 11px;
    font-weight: 700;
    color: #8B5E3C;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .receipt-title {
    font-size: 20px;
    font-weight: 800;
    color: #2C1810;
    margin-top: 14px;
  }

  .confirmed-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #E8F7EE;
    color: #27AE60;
    font-size: 13px;
    font-weight: 700;
    padding: 5px 14px;
    border-radius: 20px;
    margin-top: 6px;
    border: 1.5px solid #A8E6C0;
  }

  .divider-dashed {
    border: none;
    border-top: 2px dashed #D4B896;
    margin: 14px 20px;
  }

  /* ORDER INFO */
  .order-info {
    background: #FFF8F0;
    margin: 0 16px;
    border-radius: 14px;
    padding: 14px 16px;
    border: 1.5px solid #EDD9C0;
  }

  .order-number-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .order-label {
    font-size: 13px;
    font-weight: 700;
    color: #8B5E3C;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .order-number {
    font-size: 22px;
    font-weight: 900;
    color: #E07B1A;
  }

  .date-time {
    text-align: right;
    font-size: 12px;
    color: #8B5E3C;
    font-weight: 600;
  }

  /* CLIENT INFO */
  .client-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 12px 16px;
  }

  .info-card {
    background: #FFF8F0;
    border-radius: 12px;
    padding: 12px 14px;
    border: 1.5px solid #EDD9C0;
  }

  .info-card-label {
    font-size: 10px;
    font-weight: 700;
    color: #8B5E3C;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .info-card-value {
    font-size: 13px;
    font-weight: 700;
    color: #2C1810;
    line-height: 1.3;
  }

  /* PRODUCTS TABLE */
  .products-section {
    margin: 0 16px 12px;
  }

  .products-table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 12px;
    overflow: hidden;
  }

  .products-table thead tr {
    background: #E07B1A;
  }

  .products-table thead th {
    color: white;
    font-size: 11px;
    font-weight: 800;
    padding: 10px 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .products-table thead th:first-child { text-align: left; }
  .products-table thead th:not(:first-child) { text-align: center; }

  .products-table tbody tr {
    background: #FFF8F0;
    border-bottom: 1px solid #EDD9C0;
  }

  .products-table tbody tr:last-child { border-bottom: none; }

  .product-name {
    font-size: 12px;
    font-weight: 700;
    color: #2C1810;
    padding: 10px 10px;
  }

  .center {
    text-align: center;
    font-size: 12px;
    color: #5C3D2E;
    padding: 10px 8px;
    font-weight: 600;
  }

  .bold { font-weight: 800; color: #2C1810; }

  /* TOTALS */
  .totals {
    background: #FFF8F0;
    margin: 0 16px;
    border-radius: 12px;
    border: 1.5px solid #EDD9C0;
    overflow: hidden;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: 13px;
    color: #5C3D2E;
    font-weight: 600;
    border-bottom: 1px solid #EDD9C0;
  }

  .total-row:last-child { border-bottom: none; }

  .total-final {
    background: #2C1810;
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 900;
    color: white;
  }

  .total-final .amount { color: #F4A23C; }

  /* STATUS */
  .status-section {
    margin: 12px 16px;
    background: #FFF8F0;
    border-radius: 12px;
    border: 1.5px solid #EDD9C0;
    padding: 14px;
  }

  .status-title {
    font-size: 11px;
    font-weight: 800;
    color: #8B5E3C;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
    margin-bottom: 12px;
  }

  .status-steps {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
  }

  .status-steps::before {
    content: '';
    position: absolute;
    top: 14px;
    left: 14px;
    right: 14px;
    height: 2px;
    background: #EDD9C0;
    z-index: 0;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    position: relative;
    z-index: 1;
  }

  .step-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    background: #EDD9C0;
    color: #8B5E3C;
  }

  .step.active .step-icon {
    background: #E07B1A;
    color: white;
    box-shadow: 0 2px 8px rgba(224,123,26,0.4);
  }

  .step-label {
    font-size: 9px;
    font-weight: 700;
    color: #8B5E3C;
    text-align: center;
    max-width: 52px;
  }

  .step.active .step-label { color: #E07B1A; }

  .tiempo-badge {
    background: #FFF0DC;
    border: 1.5px solid #F4A23C;
    border-radius: 20px;
    padding: 7px 14px;
    text-align: center;
    margin-top: 12px;
    font-size: 12px;
    color: #8B5E3C;
    font-weight: 600;
  }

  .tiempo-badge span {
    font-weight: 900;
    color: #E07B1A;
  }

  /* FOOTER */
  .footer-thanks {
    text-align: center;
    padding: 10px 20px 6px;
    font-size: 15px;
    font-weight: 800;
    color: #2C1810;
  }

  .heart { color: #E07B1A; }

  .footer-bar {
    background: #2C1810;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 12px 20px;
    margin-top: 10px;
  }

  .footer-bar span {
    font-size: 11px;
    color: #D4B896;
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="receipt">

  <!-- HEADER -->
  <div class="header">
    <div class="food-icons">
      <span>🍔</span><span>🍟</span><span>🍕</span><span>🥤</span><span>🌮</span>
    </div>
    <div class="logo-circle">👨‍🍳</div>
    <div class="brand-name">Pepito</div>
    <div class="brand-sub">Restaurante</div>
    <div class="receipt-title">Comprobante de Pedido</div>
    <div class="confirmed-badge">✅ ¡Pedido confirmado!</div>
  </div>

  <hr class="divider-dashed">

  <!-- ORDER NUMBER -->
  <div class="order-info">
    <div class="order-number-row">
      <div class="order-label">📋 Pedido</div>
      <div class="date-time">📅 ${fecha}<br>🕐 ${hora}</div>
    </div>
    <div class="order-number">#${numeroPedido.toString().padStart(4, '0')}</div>
  </div>

  <!-- CLIENT INFO -->
  <div class="client-grid">
    <div class="info-card">
      <div class="info-card-label">👤 Cliente</div>
      <div class="info-card-value">${cliente}</div>
    </div>
    <div class="info-card">
      <div class="info-card-label">📱 Teléfono</div>
      <div class="info-card-value">${telefono}</div>
    </div>
    <div class="info-card">
      <div class="info-card-label">🛵 Tipo entrega</div>
      <div class="info-card-value">${tipoEntrega}</div>
    </div>
    <div class="info-card">
      <div class="info-card-label">📍 Dirección</div>
      <div class="info-card-value">${direccion || '—'}</div>
    </div>
  </div>

  <!-- PRODUCTS -->
  <div class="products-section">
    <table class="products-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cant.</th>
          <th>Precio</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${productosHTML}
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <div class="totals">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${formatCOP(subtotal)}</span>
    </div>
    ${tipoEntrega.toLowerCase() === 'domicilio' ? `
    <div class="total-row">
      <span>Costo de domicilio</span>
      <span>${formatCOP(costodomicilio)}</span>
    </div>` : ''}
    <div class="total-final">
      <span>TOTAL</span>
      <span class="amount">${formatCOP(total)}</span>
    </div>
  </div>

  <!-- STATUS -->
  <div class="status-section">
    <div class="status-title">Estado del pedido</div>
    <div class="status-steps">
      <div class="step active">
        <div class="step-icon">✓</div>
        <div class="step-label">Confirmado</div>
      </div>
      <div class="step">
        <div class="step-icon">👨‍🍳</div>
        <div class="step-label">En preparación</div>
      </div>
      <div class="step">
        <div class="step-icon">🍽️</div>
        <div class="step-label">Listo</div>
      </div>
      <div class="step">
        <div class="step-icon">🛵</div>
        <div class="step-label">En camino</div>
      </div>
      <div class="step">
        <div class="step-icon">🏁</div>
        <div class="step-label">Entregado</div>
      </div>
    </div>
    <div class="tiempo-badge">
      🕐 Tiempo estimado de entrega: <span>${tiempoEstimado}</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-thanks">¡Gracias por elegir Pepito! <span class="heart">♥</span></div>

  <div class="footer-bar">
    <span>📱 300 123 4567</span>
    <span>📸 @pepito.restaurante</span>
    <span>😊 ¡Te esperamos pronto!</span>
  </div>

</div>
</body>
</html>`;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Pepito Receipt Generator' });
});

app.post('/generar-recibo', async (req, res) => {
  let browser;
  try {
    const data = req.body;

    const html = generateReceiptHTML(data);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 520, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Get the receipt element dimensions
    const element = await page.$('.receipt');
    const boundingBox = await element.boundingBox();

    const imageBuffer = await page.screenshot({
      type: 'png',
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    });

    await browser.close();

    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Pepito Receipt Generator corriendo en puerto ${PORT}`));
