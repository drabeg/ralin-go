'use strict';
// =============================================================
// Simulador del gateway de tienda para la guía en el pasillo.
// En producción: la app consulta a la nube, la nube envía la orden al gateway
// de esa tienda (MQTT) y el gateway hace parpadear por radio el LED de la
// etiqueta electrónica (ESL) del producto. Requisito: respuesta < 2 segundos.
// =============================================================

const COLORES = [
  { nombre: 'verde', hex: '#1E9E5A' },
  { nombre: 'azul', hex: '#1F6FB2' },
  { nombre: 'morado', hex: '#7B4CC2' },
  { nombre: 'naranja', hex: '#E36A1C' },
  { nombre: 'rosado', hex: '#D9477F' },
  { nombre: 'turquesa', hex: '#0E9AA7' },
];
const NIVELES = ['superior', 'medio', 'inferior'];
const PARPADEO_SEG = 30;
const META_MS = 2000;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const entre = (a, b) => a + Math.random() * (b - a);

function crearGateway(db, { demora = true } = {}) {
  const sql = {
    gondola: db.prepare(`SELECT v.estado, v.pasillo, p.nombre, p.presentacion, p.marca, t.nombre AS tienda
                         FROM v_disponibilidad v JOIN productos p ON p.id = v.producto_id
                         JOIN tiendas t ON t.id = v.tienda_id
                         WHERE v.tienda_id = ? AND v.producto_id = ?`),
    coloresEnUso: db.prepare(`SELECT color FROM guias WHERE tienda_id = ? AND expira_en > ? AND dispositivo_id != ?`),
    nueva: db.prepare(`INSERT INTO guias (dispositivo_id, tienda_id, producto_id, etiqueta, color, latencia_gateway_ms, creada_en, expira_en)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    encontrada: db.prepare('UPDATE guias SET encontrada_en = ?, latencia_app_ms = COALESCE(latencia_app_ms, ?) WHERE id = ? AND dispositivo_id = ?'),
    latenciaApp: db.prepare('UPDATE guias SET latencia_app_ms = ? WHERE id = ? AND dispositivo_id = ?'),
  };

  // Posición física de la etiqueta en la góndola (determinística para la demo)
  const ubicar = (tiendaId, productoId, pasillo) => {
    const numero = (pasillo.match(/\d+/) || ['R'])[0];
    return {
      etiqueta: `ESL-${tiendaId}-${numero}-${String(productoId).padStart(3, '0')}`,
      seccion: 1 + (productoId % 6),
      nivel: NIVELES[productoId % 3],
    };
  };

  // Elige un color que no esté usando otro cliente en esa tienda, para que cada quien siga el suyo
  const elegirColor = (tiendaId, dispositivo, ahora) => {
    const usados = new Set(sql.coloresEnUso.all(tiendaId, ahora, dispositivo).map((f) => f.color));
    return COLORES.find((c) => !usados.has(c.nombre)) || COLORES[Math.floor(Math.random() * COLORES.length)];
  };

  async function guiar({ tiendaId, productoId, dispositivo }) {
    const g = sql.gondola.get(tiendaId, productoId);
    if (!g) return { error: 'Producto o tienda no encontrados' };
    if (g.estado === 'agotado') return { error: `${g.nombre} está agotado en ${g.tienda}` };

    // nube → gateway (MQTT) y gateway → ESL (radio de baja energía)
    const nubeGateway = Math.round(demora ? entre(110, 420) : 0);
    const gatewayEsl = Math.round(demora ? entre(70, 320) : 0);
    if (demora) await esperar(nubeGateway + gatewayEsl);

    const ahora = new Date();
    const expira = new Date(ahora.getTime() + PARPADEO_SEG * 1000).toISOString();
    const color = elegirColor(tiendaId, dispositivo, ahora.toISOString());
    const pos = ubicar(tiendaId, productoId, g.pasillo);
    const latencia = nubeGateway + gatewayEsl;
    const r = sql.nueva.run(dispositivo, tiendaId, productoId, pos.etiqueta, color.nombre, latencia, ahora.toISOString(), expira);

    return {
      id: Number(r.lastInsertRowid),
      producto: `${g.nombre} ${g.presentacion}`,
      marca: g.marca,
      tienda: g.tienda,
      pasillo: g.pasillo,
      seccion: pos.seccion,
      nivel: pos.nivel,
      etiqueta: pos.etiqueta,
      color,
      parpadeo_seg: PARPADEO_SEG,
      latencia_ms: { nube_gateway: nubeGateway, gateway_esl: gatewayEsl, total_servidor: latencia },
      meta_ms: META_MS,
    };
  }

  return {
    guiar,
    registrarLatenciaApp: (id, dispositivo, ms) => sql.latenciaApp.run(ms, id, dispositivo).changes > 0,
    marcarEncontrada: (id, dispositivo, ms = null) => sql.encontrada.run(new Date().toISOString(), ms, id, dispositivo).changes > 0,
  };
}

module.exports = { crearGateway, META_MS, PARPADEO_SEG, COLORES };
