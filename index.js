const express = require('express');
const { createCanvas } = require('canvas');

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

    const W = 500;
    const productos = detalle_pedido.split(',').map(p => p.trim()).filter(Boolean);
    const H = 780 + (productos.length * 32);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FDF6EE';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#E07B1A';
    ctx.fillRect(0, 0, W, 8);

    ctx.fillStyle = '#E07B1A';
    ctx.beginPath();
    ctx.arc(250, 70, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2C1810';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PEPITO', 250, 135);

    ctx.fillStyle = '#8B5E3C';
    ctx.font = '12px Arial';
    ctx.fillText('RESTAURANTE', 250, 152);

    ctx.fillStyle = '#2C1810';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Comprobante de Pedido', 250, 185);

    ctx.fillStyle = '#27AE60';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Pedido confirmado!', 250, 212);

    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#D4B896';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 235);
    ctx.lineTo(480, 235);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FFF8F0';
    roundRect(ctx, 16, 245, 468, 65, 12);
    ctx.fill();
    ctx.strokeStyle = '#EDD9C0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 16, 245, 468, 65, 12);
    ctx.stroke();

    ctx.fillStyle = '#8B5E3C';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Pedido', 28, 265);

    ctx.fillStyle = '#E07B1A';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('#' + String(numeroPedido).padStart(4, '0'), 28, 295);

    ctx.fillStyle = '#8B5E3C';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(fecha, 484, 265);
    ctx.fillText(hora, 484, 282);

    let y = 325;
    const cards = [
      { label: 'Cliente', value: cliente },
      { label: 'Telefono', value: telefono },
      { label: 'Tipo entrega', value: tipoEntrega },
      { label: 'Direccion', value: direccion || '-' },
    ];

    for (let i = 0; i < cards.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? 16 : 256;
      const cy = y + row * 75;

      ctx.fillStyle = '#FFF8F0';
      roundRect(ctx, x, cy, 228, 60, 10);
      ctx.fill();
      ctx.strokeStyle = '#EDD9C0';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, cy, 228, 60, 10);
      ctx.stroke();

      ctx.fillStyle = '#8B5E3C';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(cards[i].label, x + 12, cy + 18);

      ctx.fillStyle = '#2C1810';
      ctx.font = 'bold 13px Arial';
      let val = cards[i].value;
      if (ctx.measureText(val).width > 200) val = val.substring(0, 22) + '...';
      ctx.fillText(val, x + 12, cy + 40);
    }

    y = y + 165;

    ctx.fillStyle = '#E07B1A';
    ctx.fillRect(16, y, 468, 36);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('DETALLE DEL PEDIDO', 28, y + 23);

    y += 36;

    productos.forEach((p, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#FFF8F0' : '#FFF3E8';
      ctx.fillRect(16, y, 468, 32);
      ctx.strokeStyle = '#EDD9C0';
      ctx.lineWidth = 1;
      ctx.strokeRect(16, y, 468, 32);

      ctx.fillStyle = '#2C1810';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(p, 28, y + 21);
      y += 32;
    });

    ctx.fillStyle = '#2C1810';
    ctx.fillRect(16, y, 468, 44);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL', 28, y + 28);

    ctx.fillStyle = '#F4A23C';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(total, 484, y + 28);

    y += 60;

    ctx.fillStyle = '#FFF8F0';
    roundRect(ctx, 16, y, 468, 90, 12);
    ctx.fill();
    ctx.strokeStyle = '#EDD9C0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 16, y, 468, 90, 12);
    ctx.stroke();

    ctx.fillStyle = '#8B5E3C';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ESTADO DEL PEDIDO', 250, y + 18);

    const steps = ['Confirmado', 'Preparando', 'Listo', 'En camino', 'Entregado'];
    const stepX = [60, 140, 220, 310, 420];

    ctx.strokeStyle = '#EDD9C0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, y + 45);
    ctx.lineTo(420, y + 45);
    ctx.stroke();

    steps.forEach((s, i) => {
      const sx = stepX[i];
      ctx.fillStyle = i === 0 ? '#E07B1A' : '#EDD9C0';
      ctx.beginPath();
      ctx.arc(sx, y + 45, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i === 0 ? 'white' : '#8B5E3C';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(s, sx, y + 72);
    });

    y += 105;

    ctx.fillStyle = '#8B5E3C';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tiempo estimado: ' + tiempoEstimado, 250, y + 20);

    y += 45;

    ctx.fillStyle = '#2C1810';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Gracias por elegir Pepito!', 250, y + 15);

    y += 30;

    ctx.fillStyle = '#2C1810';
    ctx.fillRect(0, y, W, 40);

    ctx.fillStyle = '#D4B896';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('300 123 4567  |  @pepito.restaurante', 250, y + 25);

    ctx.fillStyle = '#E07B1A';
    ctx.fillRect(0, y + 40, W, 6);

    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Pepito Receipt Generator corriendo en puerto ' + PORT));
