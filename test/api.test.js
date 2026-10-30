'use strict';
// Pruebas de la API con la base en memoria:  npm test
const test = require('node:test');
const assert = require('node:assert');
const { abrirBaseDeDatos } = require('../db/database');
const { crearSimulador } = require('../lib/simulador');
const { crearRutas } = require('../api/rutas');

const db = abrirBaseDeDatos(':memory:');
const simulador = crearSimulador(db);
const { rutas, registrarDispositivo } = crearRutas(db, simulador);

function llamar(metodo, ruta, { cuerpo = {}, dispositivo = null } = {}) {
  const url = new URL(ruta, 'http://local');
  const [, patron, manejador] = rutas.find(([m, p]) => m === metodo && p.test(url.pathname));
  return manejador({ params: url.pathname.match(patron).slice(1), query: url.searchParams, cuerpo, dispositivo });
}

test('lista las 5 tiendas', () => {
  assert.strictEqual(llamar('GET', '/api/tiendas').length, 5);
});

test('la búsqueda ignora tildes', () => {
  const r = llamar('GET', '/api/productos?q=cafe');
  assert.ok(r.some((p) => p.nombre === 'Café molido'));
});

test('el detergente está agotado en Zona 14 y disponible en Cayalá', () => {
  const p = llamar('GET', '/api/productos/18');
  const estado = (id) => p.disponibilidad.find((d) => d.tienda_id === id).estado;
  assert.strictEqual(estado(1), 'agotado');
  assert.strictEqual(estado(2), 'hay');
});

test('un cupón se canjea una sola vez por teléfono y factura Q2.50', () => {
  registrarDispositivo('telefono-prueba-1');
  const primero = llamar('POST', '/api/cupones/1/canjear', { cuerpo: { tienda_id: 2 }, dispositivo: 'telefono-prueba-1' });
  const segundo = llamar('POST', '/api/cupones/1/canjear', { cuerpo: { tienda_id: 2 }, dispositivo: 'telefono-prueba-1' });
  assert.strictEqual(primero.estado, 201);
  assert.strictEqual(segundo.datos.codigo, primero.datos.codigo);
  assert.strictEqual(llamar('GET', '/api/metricas').facturado_marcas_q, 2.5);
});

test('una venta grande crea una alerta de reposición', () => {
  const r = llamar('POST', '/api/simular/venta', { cuerpo: { tienda_id: 3, producto_id: 12, unidades: 100 } });
  assert.strictEqual(r.unidades, 0);
  assert.ok(llamar('GET', '/api/alertas?abiertas=1&limite=50').some((a) => a.producto === 'Arroz blanco' && a.tienda.includes('El Salvador')));
});

test('Insights: la marca solo ve sus productos y la disponibilidad mejora frente al período anterior', () => {
  const { crearRutasInsights } = require('../api/insights');
  const [, [, patron, resumen]] = crearRutasInsights(db);
  const r = resumen({ query: new URLSearchParams('marca=Brisa Clara&dias=30') });
  assert.strictEqual(r.productos.length, 3);
  assert.strictEqual(r.serie.length, 30);
  assert.ok(r.actual.disponibilidad_pct > r.previo.disponibilidad_pct);
  assert.ok(patron.test('/api/insights/resumen'));
});
