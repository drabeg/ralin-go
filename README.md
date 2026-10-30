# RALIN Go · demo de la app

App web instalable (PWA) que usa los datos de las estanterías inteligentes RALIN. Muestra **qué tienda tiene cada producto**, ofrece **cupones de las marcas** y tiene un **panel en vivo** para la presentación.
Es una demo académica: marcas, tiendas y datos son ficticios.

- **App móvil:** HTML, CSS y JavaScript sin frameworks. Se instala desde el navegador en Android y en iPhone.
- **API REST:** Node.js con el módulo `http`, sin dependencias externas.
- **Base de datos:** SQLite (módulo `node:sqlite`, incluido en Node.js 22).
- **Simulador de sensores:** cada 8 segundos "vende" productos al azar. Si una góndola baja del 15 % se crea una alerta, y 45 segundos después bodega la repone.

```
ralin-go/
├── server.js            servidor: API + archivos de la app
├── api/rutas.js         endpoints de la API
├── db/schema.sql        tablas y vista de disponibilidad
├── db/seed.js           datos iniciales (5 tiendas, 32 productos, 6 cupones)
├── lib/simulador.js     simulador de sensores de peso
├── lib/qr-svg.js        genera el código QR (lib/qr, licencia MIT)
├── public/              la app (index.html, app.js, styles.css, sw.js, manifest)
│   └── presentar.html   pantalla con el QR grande para proyectar
└── test/api.test.js     pruebas (npm test)
```

## 1. Probarla en tu computadora

Requiere **Node.js 22.13 o superior** (`node -v`). No hace falta instalar paquetes.

```bash
npm start
```

Abrí http://localhost:3000. Para reiniciar los datos: `npm run seed`. Para correr las pruebas: `npm test`.

## 2. Publicarla gratis para que la abran con QR (unos 10 minutos)

El celular de tus compañeros necesita una dirección pública con HTTPS. Render la da gratis.

1. **Subí el proyecto a GitHub.** Creá un repositorio nuevo (por ejemplo `ralin-go`) y subí esta carpeta tal cual. Desde la web sirve *Add file → Upload files*: arrastrá todo el contenido de la carpeta.
2. **Creá una cuenta en [render.com](https://render.com)** con tu GitHub.
3. **New → Web Service** y elegí el repositorio. Configurá:
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `npm start`
   - Plan: **Free**
   - En *Environment*, agregá `NODE_VERSION` = `22`

   (Otra opción: **New → Blueprint**, que lee `render.yaml` y llena todo solo.)
4. Esperá a que diga **Live**. Te da una dirección como `https://ralin-go.onrender.com`.
5. Abrí `https://TU-DIRECCION.onrender.com/presentar`. Esa pantalla muestra el **QR grande** y los contadores en vivo.

### Cómo se instala en el teléfono
- **Android (Chrome):** al abrirla aparece el botón *Instalar* en el inicio de la app, o desde el menú ⋮ → *Instalar app*.
- **iPhone (Safari):** botón *Compartir* → *Agregar a inicio*.

## 3. API

Base: `/api`. Todas las respuestas son JSON. La cabecera opcional `X-Dispositivo` identifica al teléfono de forma anónima.

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/api` | Lista de endpoints |
| GET | `/api/salud` | Estado del servidor |
| GET | `/api/tiendas` | Tiendas con conteo de productos con stock, con pocos y agotados |
| GET | `/api/categorias` | Categorías |
| GET | `/api/productos?q=&categoria=&tienda=` | Búsqueda (ignora tildes) con el estado en tu tienda |
| GET | `/api/productos/:id` | Detalle y disponibilidad en cada tienda |
| GET | `/api/disponibilidad?productos=1,2,3` | Qué tienda tiene más productos de tu lista |
| GET | `/api/cupones` | Cupones activos, marcados si ya los canjeaste |
| POST | `/api/cupones/:id/canjear` | `{ "tienda_id": 1 }` → genera el código (uno por teléfono) |
| GET | `/api/alertas?abiertas=1&limite=10` | Alertas de reposición |
| GET | `/api/metricas` | Números para el panel en vivo |
| POST | `/api/simular/venta` | `{ "tienda_id": 1, "producto_id": 18, "unidades": 5 }` |
| GET | `/api/qr.svg?texto=URL` | Código QR en SVG |

Ejemplo:

```bash
curl https://TU-DIRECCION.onrender.com/api/productos/18
```

## 4. Base de datos

| Tabla | Contenido |
| --- | --- |
| `tiendas` | 5 sucursales (2 urbanas, 3 suburbanas) |
| `categorias`, `productos` | 8 categorías, 32 productos con peso unitario |
| `inventario` | Lectura actual de cada góndola: capacidad, unidades, precio, pasillo |
| `lecturas` | Historial del sensor de peso (lo que vendería RALIN Insights) |
| `alertas` | Avisos a bodega cuando la góndola baja del 15 % |
| `cupones`, `canjes` | Cupones patrocinados y cada canje (Q2.50 para RALIN) |
| `dispositivos` | Teléfonos anónimos que abrieron la app |
| `v_disponibilidad` (vista) | Traduce unidades a *Hay / Quedan pocos / Agotado*: el consumidor nunca ve unidades exactas |
