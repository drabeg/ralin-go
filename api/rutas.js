'use strict';
// =============================================================
// API REST de RALIN Go. Todas las respuestas son JSON (salvo /api/qr.svg).
// =============================================================
const crypto = require('node:crypto');
const { normalizar } = require('../db/seed');
const { svgDeQR } = require('../lib/qr-svg');

class ErrorApi extends Error {
  constructor(estado, mensaje) { super(mensaje); this.estado = estado; }
}

const entero = (valor) => {
  const n = Number.parseInt(valor, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
};

function crearRutas(db, simulador) {
  const sql = {
    tiendas: db.prepare(`
      SELECT t.*,
             SUM(v.estado = 'hay')     AS productos_hay,
             SUM(v.estado = 'pocos')   AS productos_pocos,
             SUM(v.estado = 'agotado') AS productos_agotados
      FROM tiendas t JOIN v_disponibilidad v ON v.tienda_id = t.id
      GROUP BY t.id ORDER BY t.id`),
    tienda: db.prepare('SELECT * FROM tiendas WHERE id = ?'),
    categorias: db.prepare(`
      SELECT c.*, COUNT(p.id) AS productos FROM categorias c
      LEFT JOIN productos p ON p.categoria_id = c.id GROUP BY c.id ORDER BY c.id`),
    productos: db.prepare(`
      SELECT p.id, p.nombre, p.marca, p.presentacion, p.imagen, p.precio_ref,
             c.id AS categoria_id, c.nombre AS categoria,
             SUM(v.estado != 'agotado') AS tiendas_con_stock,
             COUNT(v.tienda_id)          AS tiendas_total,
             MIN(CASE WHEN v.estado != 'agotado' THEN v.precio END) AS precio_desde,
             MAX(CASE WHEN v.tienda_id = ? THEN v.estado END)        AS estado_en_mi_tienda,
             MAX(CASE WHEN v.tienda_id = ? THEN v.precio END)        AS precio_en_mi_tienda,
             (SELECT cu.id FROM cupones cu WHERE cu.producto_id = p.id AND cu.activo = 1) AS cupon_id
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      JOIN v_disponibilidad v ON v.producto_id = p.id
      WHERE (? = '' OR p.busqueda LIKE ?) AND (? = 0 OR p.categoria_id = ?)
      GROUP BY p.id
      ORDER BY p.nombre, p.presentacion
      LIMIT 60`),
    producto: db.prepare(`
      SELECT p.id, p.nombre, p.marca, p.presentacion, p.imagen, p.precio_ref,
             c.id AS categoria_id, c.nombre AS categoria
      FROM productos p JOIN categorias c ON c.id = p.categoria_id WHERE p.id = ?`),
    disponibilidadProducto: db.prepare(`
      SELECT t.id AS tienda_id, t.nombre AS tienda, t.zona, t.area,
             v.estado, v.pasillo, v.precio, v.actualizado_en
      FROM v_disponibilidad v JOIN tiendas t ON t.id = v.tienda_id
      WHERE v.producto_id = ?
      ORDER BY CASE v.estado WHEN 'hay' THEN 0 WHEN 'pocos' THEN 1 ELSE 2 END, v.precio`),
    cuponDeProducto: db.prepare('SELECT * FROM cupones WHERE producto_id = ? AND activo = 1'),
    cupones: db.prepare(`
      SELECT cu.id, cu.titulo, cu.descuento_q, cu.vence_en,
             p.id AS producto_id, p.nombre AS producto, p.marca, p.presentacion, p.imagen,
             ca.codigo, ca.creado_en AS canjeado_en, t.nombre AS canjeado_en_tienda
      FROM cupones cu
      JOIN productos p ON p.id = cu.producto_id
      LEFT JOIN canjes ca ON ca.cupon_id = cu.id AND ca.dispositivo_id = ?
      LEFT JOIN tiendas t ON t.id = ca.tienda_id
      WHERE cu.activo = 1
      ORDER BY cu.descuento_q DESC`),
    cupon: db.prepare('SELECT * FROM cupones WHERE id = ? AND activo = 1'),
    canjeExistente: db.prepare(`
      SELECT ca.codigo, ca.creado_en, t.nombre AS tienda FROM canjes ca
      JOIN tiendas t ON t.id = ca.tienda_id WHERE ca.cupon_id = ? AND ca.dispositivo_id = ?`),
    nuevoCanje: db.prepare('INSERT INTO canjes (cupon_id, dispositivo_id, tienda_id, codigo, creado_en) VALUES (?, ?, ?, ?, ?)'),
    canjeHoy: db.prepare(`INSERT INTO ventas_diarias (fecha, tienda_id, producto_id, canjes) VALUES (?, ?, ?, 1)
                          ON CONFLICT (fecha, tienda_id, producto_id) DO UPDATE SET canjes = canjes + 1`),
    dispositivo: db.prepare(`
      INSERT INTO dispositivos (id, primera_vez, ultima_vez) VALUES (?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET ultima_vez = excluded.ultima_vez`),
    metricas: db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM dispositivos WHERE ultima_vez >= ?)                AS usuarios_hoy,
        (SELECT COUNT(*) FROM dispositivos WHERE ultima_vez >= ?)                AS usuarios_ahora,
        (SELECT COUNT(*) FROM canjes)                                            AS cupones_canjeados,
        (SELECT COALESCE(SUM(cu.costo_canje_q), 0) FROM canjes ca JOIN cupones cu ON cu.id = ca.cupon_id) AS facturado_marcas_q,
        (SELECT COALESCE(SUM(cu.descuento_q), 0)   FROM canjes ca JOIN cupones cu ON cu.id = ca.cupon_id) AS ahorro_clientes_q,
        (SELECT COUNT(*) FROM alertas WHERE atendida_en IS NULL)                 AS alertas_abiertas,
        (SELECT COUNT(*) FROM alertas WHERE atendida_en IS NOT NULL)             AS alertas_atendidas,
        (SELECT COUNT(*) FROM lecturas WHERE creada_en >= ?)                     AS lecturas_ultima_hora,
        (SELECT COUNT(*) FROM inventario)                                        AS gondolas_monitoreadas`),
    ultimosCanjes: db.prepare(`
      SELECT ca.creado_en, cu.titulo, cu.costo_canje_q, t.nombre AS tienda, p.imagen
      FROM canjes ca JOIN cupones cu ON cu.id = ca.cupon_id
      JOIN tiendas t ON t.id = ca.tienda_id JOIN productos p ON p.id = cu.producto_id
      ORDER BY ca.id DESC LIMIT 6`),
    alertas: db.prepare(`
      SELECT a.id, a.nivel_pct, a.creada_en, a.atendida_en,
             p.nombre AS producto, p.marca, p.presentacion, p.imagen,
             t.nombre AS tienda, i.pasillo
      FROM alertas a JOIN productos p ON p.id = a.producto_id
      JOIN tiendas t ON t.id = a.tienda_id
      JOIN inventario i ON i.tienda_id = a.tienda_id AND i.producto_id = a.producto_id
      WHERE (? = 0 OR a.atendida_en IS NULL)
      ORDER BY COALESCE(a.atendida_en, a.creada_en) DESC, a.id DESC LIMIT ?`),
    gondolaAlAzar: db.prepare('SELECT producto_id FROM inventario WHERE tienda_id = ? AND unidades > 0 ORDER BY RANDOM() LIMIT 1'),
    productoExiste: db.prepare('SELECT nombre, presentacion FROM productos WHERE id = ?'),
  };

  const hace = (ms) => new Date(Date.now() - ms).toISOString();

  // ---------- handlers ----------
  const rutas = [
    ['GET', /^\/api\/?$/, () => ({
      nombre: 'API de RALIN Go',
      version: '1.0.0',
      nota: 'Demo académica con datos ficticios.',
      endpoints: [
        'GET  /api/salud',
        'GET  /api/tiendas',
        'GET  /api/categorias',
        'GET  /api/productos?q=texto&categoria=ID&tienda=ID',
        'GET  /api/productos/:id',
        'GET  /api/disponibilidad?productos=1,2,3',
        'GET  /api/cupones                 (cabecera X-Dispositivo)',
        'POST /api/cupones/:id/canjear     { "tienda_id": 1 }',
        'GET  /api/alertas?abiertas=1&limite=10',
        'GET  /api/metricas',
        'POST /api/simular/venta           { "tienda_id": 1, "producto_id": 18, "unidades": 3 }',
        'GET  /api/qr.svg?texto=https://...',
        'GET  /api/insights/marcas',
        'GET  /api/insights/resumen?marca=Brisa Clara&dias=30&tienda=ID',
        'GET  /api/insights/gondolas?marca=Brisa Clara',
      ],
    })],

    ['GET', /^\/api\/salud$/, () => ({ ok: true, hora: new Date().toISOString(), simulador: simulador.activo })],

    ['GET', /^\/api\/tiendas$/, () => sql.tiendas.all()],

    ['GET', /^\/api\/categorias$/, () => sql.categorias.all()],

    ['GET', /^\/api\/productos$/, ({ query }) => {
      const texto = normalizar((query.get('q') || '').trim()).slice(0, 60);
      const categoria = entero(query.get('categoria'));
      const tienda = entero(query.get('tienda'));
      const patron = `%${texto.replace(/[%_]/g, '')}%`;
      return sql.productos.all(tienda, tienda, texto, patron, categoria, categoria);
    }],

    ['GET', /^\/api\/productos\/(\d+)$/, ({ params }) => {
      const id = entero(params[0]);
      const producto = sql.producto.get(id);
      if (!producto) throw new ErrorApi(404, 'Producto no encontrado');
      return {
        ...producto,
        cupon: sql.cuponDeProducto.get(id) || null,
        disponibilidad: sql.disponibilidadProducto.all(id),
      };
    }],

    // Para la lista de compras: ¿en qué tienda encuentro más cosas?
    ['GET', /^\/api\/disponibilidad$/, ({ query }) => {
      const ids = [...new Set((query.get('productos') || '').split(',').map(entero).filter(Boolean))].slice(0, 50);
      if (ids.length === 0) return { tiendas: [], detalle: [] };
      const marcas = ids.map(() => '?').join(',');
      const tiendas = db.prepare(`
        SELECT t.id, t.nombre, t.zona,
               SUM(v.estado != 'agotado') AS disponibles,
               COUNT(*) AS total,
               ROUND(SUM(CASE WHEN v.estado != 'agotado' THEN v.precio ELSE 0 END), 2) AS total_q
        FROM v_disponibilidad v JOIN tiendas t ON t.id = v.tienda_id
        WHERE v.producto_id IN (${marcas})
        GROUP BY t.id ORDER BY disponibles DESC, total_q ASC`).all(...ids);
      const detalle = db.prepare(`
        SELECT producto_id, tienda_id, estado, precio FROM v_disponibilidad
        WHERE producto_id IN (${marcas})`).all(...ids);
      return { tiendas, detalle };
    }],

    ['GET', /^\/api\/cupones$/, ({ dispositivo }) => sql.cupones.all(dispositivo || '')],

    ['POST', /^\/api\/cupones\/(\d+)\/canjear$/, ({ params, cuerpo, dispositivo }) => {
      if (!dispositivo) throw new ErrorApi(400, 'Falta la cabecera X-Dispositivo');
      const cupon = sql.cupon.get(entero(params[0]));
      if (!cupon) throw new ErrorApi(404, 'Cupón no encontrado o vencido');
      const tienda = sql.tienda.get(entero(cuerpo.tienda_id));
      if (!tienda) throw new ErrorApi(400, 'Elegí una tienda válida');

      const previo = sql.canjeExistente.get(cupon.id, dispositivo);
      if (previo) return { estado: 200, datos: { ...previo, ya_canjeado: true, descuento_q: cupon.descuento_q } };

      const codigo = 'RG-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const ahora = new Date().toISOString();
      sql.nuevoCanje.run(cupon.id, dispositivo, tienda.id, codigo, ahora);
      sql.canjeHoy.run(ahora.slice(0, 10), tienda.id, cupon.producto_id);
      return {
        estado: 201,
        datos: { codigo, creado_en: ahora, tienda: tienda.nombre, descuento_q: cupon.descuento_q, cobro_a_la_marca_q: cupon.costo_canje_q },
      };
    }],

    ['GET', /^\/api\/alertas$/, ({ query }) => {
      const limite = Math.min(entero(query.get('limite')) || 10, 50);
      return sql.alertas.all(query.get('abiertas') === '1' ? 1 : 0, limite);
    }],

    ['GET', /^\/api\/metricas$/, () => ({
      ...sql.metricas.get(hace(24 * 3600e3), hace(5 * 60e3), hace(3600e3)),
      ultimos_canjes: sql.ultimosCanjes.all(),
      ultimas_alertas: sql.alertas.all(0, 6),
      hora: new Date().toISOString(),
    })],

    // Simula que un cliente saca producto de la góndola (para demostrar las alertas en vivo)
    ['POST', /^\/api\/simular\/venta$/, ({ cuerpo }) => {
      const tiendaId = entero(cuerpo.tienda_id) || 1;
      if (!sql.tienda.get(tiendaId)) throw new ErrorApi(400, 'Tienda no válida');
      const productoId = entero(cuerpo.producto_id) || (sql.gondolaAlAzar.get(tiendaId) || {}).producto_id;
      const producto = productoId && sql.productoExiste.get(productoId);
      if (!producto) throw new ErrorApi(400, 'No hay góndolas con producto en esa tienda');
      const unidades = Math.min(entero(cuerpo.unidades) || 5, 100);
      const resultado = simulador.registrarVenta(tiendaId, productoId, unidades, 'manual');
      return { producto: `${producto.nombre} ${producto.presentacion}`, ...resultado };
    }],

    ['GET', /^\/api\/qr\.svg$/, ({ query }) => {
      const texto = (query.get('texto') || '').slice(0, 300);
      if (!texto) throw new ErrorApi(400, 'Falta el parámetro texto');
      return { tipo: 'image/svg+xml', cuerpo: svgDeQR(texto) };
    }],
  ];

  function registrarDispositivo(id) {
    const ahora = new Date().toISOString();
    sql.dispositivo.run(id, ahora, ahora);
  }

  return { rutas, registrarDispositivo, ErrorApi };
}

module.exports = { crearRutas, ErrorApi };
