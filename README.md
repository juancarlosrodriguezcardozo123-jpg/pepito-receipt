# 🍔 Pepito Receipt Generator

Microservicio que genera imágenes de comprobantes de pedido para WhatsApp.

## Deploy en Railway

1. Sube esta carpeta a un repositorio de GitHub
2. En Railway → New Project → Deploy from GitHub repo
3. Selecciona el repo y Railway lo detecta automáticamente
4. Copia la URL pública que te da Railway (ej: `https://pepito-receipt.up.railway.app`)

## Endpoints

### `GET /`
Health check. Retorna `{ status: "ok" }`

### `POST /generar-recibo`
Genera la imagen PNG del recibo.

**Body JSON:**
```json
{
  "numeroPedido": "0258",
  "fecha": "24 de junio de 2026",
  "hora": "07:45 p. m.",
  "cliente": "Juan Pérez",
  "telefono": "300 123 4567",
  "tipoEntrega": "Domicilio",
  "direccion": "Calle 45 #22-10, Barrio Centro",
  "productos": [
    { "nombre": "Hamburguesa Especial", "cantidad": 2, "precio": 18000 },
    { "nombre": "Papas a la Francesa", "cantidad": 1, "precio": 6000 },
    { "nombre": "Gaseosa 400ml", "cantidad": 2, "precio": 4000 }
  ],
  "costodomicilio": 4000,
  "tiempoEstimado": "30 - 40 min"
}
```

**Response:** imagen PNG binaria

---

## Uso en n8n

1. Nodo **HTTP Request**
   - Method: `POST`
   - URL: `https://TU-URL.up.railway.app/generar-recibo`
   - Body: JSON con los datos del pedido
   - Response Format: `File`

2. Nodo **SendZen** → enviar imagen al cliente por WhatsApp
   - Usa el binary output del nodo anterior como archivo adjunto

---

## Campos opcionales
- Si `tipoEntrega` no es "Domicilio", no se cobra costo de domicilio
- `fecha` y `hora` se generan automáticamente si no se envían
- `costodomicilio` por defecto es $4.000
