'use strict';
// =============================================================
// RALIN Go · servidor (API + app web) sin dependencias externas.
// Requiere Node.js 22.13 o superior (usa el módulo node:sqlite).
//   npm start            → http://localhost:3000
// =============================================================
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { abrirBaseDeDatos } = require('./db/database');
const { crearSimulador } = require('./lib/simulador');
const { crearRutas, ErrorApi } = require('./api/rutas');
const { crearRutasInsights } = require('./api/insights');

const PUERTO = Number(process.env.PORT) || 3000;
const CARPETA_PUBLICA = path.join(__dirname, 'public');
const db = abrirBaseDeDatos(process.env.DB_PATH || path.join(__dirname, 'data', 'ralin.db'));
const simulador = crearSimulador(db);
const { rutas: rutasApp, registrarDispositivo } = crearRutas(db, simulador);
const rutas = [...rutasApp, ...crearRutasInsights(db)];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const PAGINAS = { '/': 'index.html', '/presentar': 'presentar.html', '/insights': 'insights.html' };

function enviar(res, estado, cuerpo, tipo = 'application/json; charset=utf-8') {
  const datos = typeof cuerpo === 'string' || Buffer.isBuffer(cuerpo) ? cuerpo : JSON.stringify(cuerpo);
  res.writeHead(estado, {
    'Content-Type': tipo,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dispositivo',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(datos);
}

function leerCuerpo(req) {
  return new Promise((resolver, rechazar) => {
    let texto = '';
    req.on('data', (parte) => {
      texto += parte;
      if (texto.length > 10_000) { rechazar(new ErrorApi(413, 'Cuerpo demasiado grande')); req.destroy(); }
    });
    req.on('end', () => {
      if (!texto) return resolver({});
      try { resolver(JSON.parse(texto)); } catch { rechazar(new ErrorApi(400, 'JSON inválido')); }
    });
    req.on('error', rechazar);
  });
}

async function atenderApi(req, res, url) {
  if (req.method === 'OPTIONS') return enviar(res, 204, '');

  const encontrada = rutas.find(([metodo, patron]) => metodo === req.method && patron.test(url.pathname));
  if (!encontrada) throw new ErrorApi(404, 'Ruta no encontrada. Consultá GET /api para ver los endpoints.');

  const idDispositivo = String(req.headers['x-dispositivo'] || '');
  const dispositivo = /^[A-Za-z0-9-]{8,64}$/.test(idDispositivo) ? idDispositivo : null;
  if (dispositivo) registrarDispositivo(dispositivo);

  const [, patron, manejador] = encontrada;
  const cuerpo = req.method === 'POST' ? await leerCuerpo(req) : {};
  const resultado = await manejador({ params: url.pathname.match(patron).slice(1), query: url.searchParams, cuerpo, dispositivo });

  if (resultado && resultado.tipo) return enviar(res, 200, resultado.cuerpo, resultado.tipo);
  if (resultado && resultado.estado && 'datos' in resultado) return enviar(res, resultado.estado, resultado.datos);
  return enviar(res, 200, resultado);
}

function servirArchivo(req, res, url) {
  const relativo = PAGINAS[url.pathname] || decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const ruta = path.normalize(path.join(CARPETA_PUBLICA, relativo));
  if (!ruta.startsWith(CARPETA_PUBLICA + path.sep)) return enviar(res, 403, { error: 'Prohibido' });

  fs.readFile(ruta, (error, contenido) => {
    if (error) return enviar(res, 404, '<h1>404</h1><p><a href="/">Volver a RALIN Go</a></p>', TIPOS['.html']);
    const ext = path.extname(ruta);
    res.writeHead(200, {
      'Content-Type': TIPOS[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.png' ? 'public, max-age=86400' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : contenido);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return await atenderApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return enviar(res, 405, { error: 'Método no permitido' });
    return servirArchivo(req, res, url);
  } catch (error) {
    const estado = error instanceof ErrorApi ? error.estado : 500;
    if (estado === 500) console.error(error);
    return enviar(res, estado, { error: estado === 500 ? 'Error interno del servidor' : error.message });
  }
});

servidor.listen(PUERTO, () => {
  if (process.env.SIMULADOR !== 'apagado') simulador.iniciar();
  console.log(`RALIN Go escuchando en http://localhost:${PUERTO}  (simulador de sensores: ${simulador.activo ? 'encendido' : 'apagado'})`);
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => { simulador.detener(); servidor.close(() => { db.close(); process.exit(0); }); });
}
