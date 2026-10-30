'use strict';
// =============================================================
// API de RALIN Insights: reportes para las marcas.
// Cada marca ve solo sus productos (aquí se elige con ?marca=).
// =============================================================
const { MINUTOS_ABIERTO } = require('../db/seed');

const entero = (v) => { const n = Number.parseInt(v, 10); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const dia = (offset) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const redondear = (n, dec = 1) => Math.round((Number(n) || 0) * 10 ** dec) / 10 ** dec;

function crearRutasInsights(db) {
  const BASE = `
    FROM ventas_diarias vd
    JOIN productos p ON p.id = vd.producto_id
    JOIN inventario i ON i.tienda_id = vd.tienda_id AND i.producto_id = vd.producto_id
    WHERE vd.fecha >= ? AND vd.fecha < ? AND (? = '' OR p.marca = ?)`;
  const METRICAS = `
    SUM(vd.unidades)                               AS unidades,
    ROUND(SUM(vd.unidades * i.precio), 2)          AS ventas_q,
    ROUND(SUM(vd.unidades_perdidas * i.precio), 2) AS perdidas_q,
    SUM(vd.minutos_agotado)                        AS minutos_agotado,
    SUM(vd.minutos_agotado > 0)                    AS quiebres,
    SUM(vd.canjes)                                 AS canjes,
    COUNT(*)                                       AS gondola_dias`;

  const sql = {
    marcas: db.prepare(`SELECT p.marca, COUNT(*) AS productos, MIN(c.nombre) AS categoria
                        FROM productos p JOIN categorias c ON c.id = p.categoria_id GROUP BY p.marca ORDER BY p.marca`),
    total: db.prepare(`SELECT ${METRICAS} ${BASE} AND (? = 0 OR vd.tienda_id = ?)`),
    serie: db.prepare(`SELECT vd.fecha, ${METRICAS} ${BASE} AND (? = 0 OR vd.tienda_id = ?) GROUP BY vd.fecha ORDER BY vd.fecha`),
    porTienda: db.prepare(`SELECT t.id, t.nombre, t.zona, ${METRICAS} ${BASE.replace('WHERE', 'JOIN tiendas t ON t.id = vd.tienda_id WHERE')}
                           GROUP BY t.id ORDER BY t.id`),
    porProducto: db.prepare(`SELECT p.id, p.nombre, p.presentacion, p.imagen, ${METRICAS} ${BASE} AND (? = 0 OR vd.tienda_id = ?)
                             GROUP BY p.id ORDER BY ventas_q DESC`),
    productosMarca: db.prepare(`SELECT id, nombre, presentacion, imagen FROM productos WHERE (? = '' OR marca = ?) ORDER BY nombre`),
    tiendas: db.prepare('SELECT id, nombre, zona FROM tiendas ORDER BY id'),
    gondolas: db.prepare(`SELECT v.producto_id, v.tienda_id, v.nivel_pct, v.estado, v.actualizado_en
                          FROM v_disponibilidad v JOIN productos p ON p.id = v.producto_id WHERE (? = '' OR p.marca = ?)`),
    alertas: db.prepare(`SELECT COUNT(*) AS n FROM alertas a JOIN productos p ON p.id = a.producto_id
                         WHERE a.atendida_en IS NULL AND (? = '' OR p.marca = ?)`),
  };

  const disponibilidad = (fila) => fila.gondola_dias
    ? redondear(100 * (1 - fila.minutos_agotado / (fila.gondola_dias * MINUTOS_ABIERTO)), 1) : null;
  const limpiar = (fila) => ({
    ...fila,
    unidades: fila.unidades || 0,
    ventas_q: fila.ventas_q || 0,
    perdidas_q: fila.perdidas_q || 0,
    quiebres: fila.quiebres || 0,
    canjes: fila.canjes || 0,
    disponibilidad_pct: disponibilidad(fila),
  });

  return [
    ['GET', /^\/api\/insights\/marcas$/, () => sql.marcas.all()],

    ['GET', /^\/api\/insights\/resumen$/, ({ query }) => {
      const marca = (query.get('marca') || '').slice(0, 60);
      const dias = [7, 30].includes(entero(query.get('dias'))) ? entero(query.get('dias')) : 30;
      const tienda = entero(query.get('tienda'));
      const hoy = dia(0); const desde = dia(-dias); const desdePrevio = dia(-2 * dias);
      const rango = (a, b) => [a, b, marca, marca];

      const actual = limpiar(sql.total.get(...rango(desde, hoy), tienda, tienda));
      const previo = limpiar(sql.total.get(...rango(desdePrevio, desde), tienda, tienda));
      const deHoy = limpiar(sql.total.get(...rango(hoy, dia(1)), tienda, tienda));
      const productosPrevio = new Map(sql.porProducto.all(...rango(desdePrevio, desde), tienda, tienda).map((p) => [p.id, p.ventas_q]));

      return {
        marca: marca || 'Todas las marcas',
        dias, desde, hasta: dia(-1),
        actual, previo,
        hoy: { unidades: deHoy.unidades, canjes: deHoy.canjes },
        serie: sql.serie.all(...rango(desde, hoy), tienda, tienda).map((f) => ({
          fecha: f.fecha, ventas_q: f.ventas_q || 0, perdidas_q: f.perdidas_q || 0, disponibilidad_pct: disponibilidad(f),
        })),
        tiendas: sql.porTienda.all(...rango(desde, hoy)).map(limpiar),
        productos: sql.porProducto.all(...rango(desde, hoy), tienda, tienda).map((p) => {
          const antes = productosPrevio.get(p.id);
          return { ...limpiar(p), variacion_pct: antes ? redondear(100 * (p.ventas_q - antes) / antes, 1) : null };
        }),
      };
    }],

    // Estado actual de cada góndola de la marca (tiempo real)
    ['GET', /^\/api\/insights\/gondolas$/, ({ query }) => {
      const marca = (query.get('marca') || '').slice(0, 60);
      return {
        productos: sql.productosMarca.all(marca, marca),
        tiendas: sql.tiendas.all(),
        celdas: sql.gondolas.all(marca, marca),
        alertas_abiertas: sql.alertas.get(marca, marca).n,
        hora: new Date().toISOString(),
      };
    }],
  ];
}

module.exports = { crearRutasInsights };
