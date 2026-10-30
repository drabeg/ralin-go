'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite'); // SQLite incluido en Node.js 22+, sin dependencias

function abrirBaseDeDatos(ruta, { sembrarSiVacia = true } = {}) {
  if (ruta !== ':memory:') fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA journal_mode = WAL;');

  // Si la base es de una versión anterior del esquema, se recrea desde cero
  const VERSION_ESQUEMA = 2;
  if (db.prepare('PRAGMA user_version').get().user_version < VERSION_ESQUEMA) {
    db.exec('DROP VIEW IF EXISTS v_disponibilidad');
    for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()) {
      db.exec(`DROP TABLE IF EXISTS "${name}"`);
    }
    db.exec(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
  }
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

  if (sembrarSiVacia) {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM tiendas').get();
    if (n === 0) {
      require('./seed').sembrar(db);
      console.log('Base de datos nueva: datos de demostración cargados.');
    }
  }
  return db;
}

module.exports = { abrirBaseDeDatos };
