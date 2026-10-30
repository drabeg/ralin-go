'use strict';
// =============================================================
// Simulador de sensores de peso.
// En producción, estas lecturas llegarían de los gateways de cada tienda.
// Aquí, cada pocos segundos se "venden" productos al azar; cuando una góndola
// baja del 15 % se crea una alerta y, un rato después, bodega la repone.
// =============================================================

const UMBRAL_ALERTA = 0.15;

function crearSimulador(db, { intervaloMs = 8000, reposicionSeg = 45 } = {}) {
  const sql = {
    alAzar: db.prepare(`SELECT tienda_id, producto_id FROM inventario
                        WHERE fijo = 0 AND unidades > 0 ORDER BY RANDOM() LIMIT 3`),
    fila: db.prepare(`SELECT i.unidades, i.capacidad, p.peso_unitario_g
                      FROM inventario i JOIN productos p ON p.id = i.producto_id
                      WHERE i.tienda_id = ? AND i.producto_id = ?`),
    actualizar: db.prepare('UPDATE inventario SET unidades = ?, actualizado_en = ? WHERE tienda_id = ? AND producto_id = ?'),
    lectura: db.prepare(`INSERT INTO lecturas (tienda_id, producto_id, unidades, peso_g, origen, creada_en)
                         VALUES (?, ?, ?, ?, ?, ?)`),
    alertaAbierta: db.prepare('SELECT id FROM alertas WHERE tienda_id = ? AND producto_id = ? AND atendida_en IS NULL'),
    nuevaAlerta: db.prepare('INSERT INTO alertas (tienda_id, producto_id, nivel_pct, creada_en) VALUES (?, ?, ?, ?)'),
    pendientes: db.prepare(`SELECT a.id, a.tienda_id, a.producto_id FROM alertas a
                            JOIN inventario i ON i.tienda_id = a.tienda_id AND i.producto_id = a.producto_id
                            WHERE a.atendida_en IS NULL AND i.fijo = 0 AND a.creada_en <= ?`),
    atender: db.prepare('UPDATE alertas SET atendida_en = ? WHERE id = ?'),
    venderHoy: db.prepare(`INSERT INTO ventas_diarias (fecha, tienda_id, producto_id, unidades) VALUES (?, ?, ?, ?)
                           ON CONFLICT (fecha, tienda_id, producto_id) DO UPDATE SET unidades = unidades + excluded.unidades`),
    podar: db.prepare('DELETE FROM lecturas WHERE id <= (SELECT MAX(id) - 5000 FROM lecturas)'),
  };

  // Registra una venta (baja de peso en la góndola). Devuelve el nuevo estado.
  function registrarVenta(tiendaId, productoId, cantidad, origen = 'venta') {
    const f = sql.fila.get(tiendaId, productoId);
    if (!f) return null;
    const ahora = new Date().toISOString();
    const unidades = Math.max(0, f.unidades - cantidad);
    sql.actualizar.run(unidades, ahora, tiendaId, productoId);
    sql.lectura.run(tiendaId, productoId, unidades, unidades * f.peso_unitario_g, origen, ahora);
    if (f.unidades > unidades) sql.venderHoy.run(ahora.slice(0, 10), tiendaId, productoId, f.unidades - unidades);

    const nivel = unidades / f.capacidad;
    let alertaCreada = false;
    if (nivel <= UMBRAL_ALERTA && !sql.alertaAbierta.get(tiendaId, productoId)) {
      sql.nuevaAlerta.run(tiendaId, productoId, Math.round(nivel * 1000) / 10, ahora);
      alertaCreada = true;
    }
    return { unidades, capacidad: f.capacidad, nivel_pct: Math.round(nivel * 1000) / 10, alerta_creada: alertaCreada };
  }

  // Bodega llena la góndola y la alerta queda atendida
  function reponer(alerta) {
    const f = sql.fila.get(alerta.tienda_id, alerta.producto_id);
    const ahora = new Date().toISOString();
    sql.actualizar.run(f.capacidad, ahora, alerta.tienda_id, alerta.producto_id);
    sql.lectura.run(alerta.tienda_id, alerta.producto_id, f.capacidad, f.capacidad * f.peso_unitario_g, 'reposicion', ahora);
    sql.atender.run(ahora, alerta.id);
  }

  function tick() {
    try {
      db.exec('BEGIN');
      for (const g of sql.alAzar.all()) {
        registrarVenta(g.tienda_id, g.producto_id, 1 + Math.floor(Math.random() * 3));
      }
      const limite = new Date(Date.now() - reposicionSeg * 1000).toISOString();
      for (const alerta of sql.pendientes.all(limite)) reponer(alerta);
      sql.podar.run();
      db.exec('COMMIT');
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch { /* sin transacción abierta */ }
      console.error('Simulador:', error.message);
    }
  }

  let temporizador = null;
  return {
    registrarVenta,
    iniciar() { if (!temporizador) temporizador = setInterval(tick, intervaloMs); },
    detener() { clearInterval(temporizador); temporizador = null; },
    get activo() { return temporizador !== null; },
  };
}

module.exports = { crearSimulador, UMBRAL_ALERTA };
