'use strict';
// =============================================================
// Datos iniciales de la demo. Marcas, tiendas y precios son FICTICIOS.
// Uso directo para reiniciar la base:  npm run seed
// =============================================================

const TIENDAS = [
  [1, 'Súper Zona 14', 'Zona 14', 'urbana', 'Zona 14, Ciudad de Guatemala', '7:00 a 21:00'],
  [2, 'Súper Cayalá', 'Zona 16', 'urbana', 'Zona 16, Ciudad de Guatemala', '7:00 a 22:00'],
  [3, 'Súper Carretera a El Salvador', 'Santa Catarina Pinula', 'suburbana', 'Carretera a El Salvador, Santa Catarina Pinula', '7:00 a 21:00'],
  [4, 'Súper San Cristóbal', 'Mixco', 'suburbana', 'San Cristóbal, Mixco', '7:00 a 21:00'],
  [5, 'Súper Villa Nueva', 'Villa Nueva', 'suburbana', 'Centro de Villa Nueva', '7:00 a 21:00'],
];

const CATEGORIAS = [
  [1, 'Bebidas', '🥤'],
  [2, 'Lácteos', '🥛'],
  [3, 'Abarrotes', '🍚'],
  [4, 'Limpieza', '🧴'],
  [5, 'Panadería', '🍞'],
  [6, 'Snacks', '🍪'],
  [7, 'Desayuno', '☕'],
  [8, 'Cuidado personal', '🧼'],
];

// id, nombre, marca, presentación, categoría, precio_ref (Q), peso unitario (g), ícono
const PRODUCTOS = [
  [1, 'Gaseosa sabor cola', 'Chispa', '2.5 L', 1, 17.5, 2620, '🥤'],
  [2, 'Gaseosa sabor naranja', 'Chispa', '2.5 L', 1, 16.5, 2620, '🥤'],
  [3, 'Agua pura', 'Volcán Azul', '600 ml', 1, 4.25, 620, '💧'],
  [4, 'Agua pura', 'Volcán Azul', '2.5 L', 1, 9.75, 2560, '💧'],
  [5, 'Jugo de naranja', 'Huerto Real', '1 L', 1, 14.9, 1060, '🧃'],
  [6, 'Bebida hidratante', 'Ráfaga', '600 ml', 1, 9.5, 640, '🧃'],
  [7, 'Leche entera', 'Nevada', '1 L', 2, 12.25, 1040, '🥛'],
  [8, 'Leche deslactosada', 'Nevada', '1 L', 2, 13.9, 1040, '🥛'],
  [9, 'Yogur de fresa', 'Nevada', '1 L', 2, 19.5, 1060, '🍓'],
  [10, 'Queso fresco', 'Finca Las Nubes', '400 g', 2, 24.0, 410, '🧀'],
  [11, 'Mantequilla', 'Nevada', '225 g', 2, 18.75, 230, '🧈'],
  [12, 'Arroz blanco', 'Grano de Oro', '2 lb', 3, 11.5, 910, '🍚'],
  [13, 'Frijol negro volteado', 'Maizal', '400 g', 3, 8.9, 430, '🫘'],
  [14, 'Aceite vegetal', 'Doña Clara', '1.5 L', 3, 34.9, 1420, '🫗'],
  [15, 'Harina de maíz', 'Maizal', '2 lb', 3, 9.25, 910, '🌽'],
  [16, 'Pasta spaghetti', 'La Toscana', '400 g', 3, 7.5, 410, '🍝'],
  [17, 'Azúcar', 'Caña Dulce', '5 lb', 3, 21.0, 2270, '🍬'],
  [18, 'Detergente líquido', 'Brisa Clara', '1.8 L', 4, 42.5, 1950, '🧴'],
  [19, 'Detergente en polvo', 'Brisa Clara', '1 kg', 4, 28.9, 1010, '🧺'],
  [20, 'Papel higiénico', 'Suave Nube', '12 rollos', 4, 46.0, 1300, '🧻'],
  [21, 'Lavaplatos líquido', 'Brisa Clara', '750 ml', 4, 17.25, 800, '🧽'],
  [22, 'Cloro', 'Puro Blanco', '1 galón', 4, 19.9, 3900, '🧪'],
  [23, 'Pan de molde blanco', 'Aurora', '600 g', 5, 16.5, 600, '🍞'],
  [24, 'Pan integral', 'Aurora', '600 g', 5, 19.25, 600, '🍞'],
  [25, 'Galletas de chocolate', 'Crocante', '6 paquetes', 6, 14.75, 300, '🍪'],
  [26, 'Papalinas con sal', 'Crocante', '150 g', 6, 12.5, 160, '🍟'],
  [27, 'Café molido', 'Cafetal de Altura', '400 g', 7, 39.9, 410, '☕'],
  [28, 'Avena en hojuelas', 'Campo Verde', '400 g', 7, 11.75, 410, '🥣'],
  [29, 'Huevos', 'Granja Sol', '30 unidades', 7, 42.0, 1800, '🥚'],
  [30, 'Pasta dental', 'Sonrisa+', '100 ml', 8, 15.5, 140, '🪥'],
  [31, 'Jabón de tocador', 'Pureza', '3 unidades', 8, 18.9, 330, '🧼'],
  [32, 'Shampoo', 'Cascada', '400 ml', 8, 32.5, 430, '🧴'],
];

// id, producto, título, descuento (Q), vence
const CUPONES = [
  [1, 18, 'Q5 de descuento en Detergente líquido Brisa Clara', 5, '2026-11-30'],
  [2, 7, 'Q3 de descuento en Leche entera Nevada', 3, '2026-11-30'],
  [3, 27, 'Q4 de descuento en Café molido Cafetal de Altura', 4, '2026-11-15'],
  [4, 20, 'Q6 de descuento en Papel higiénico Suave Nube', 6, '2026-11-30'],
  [5, 25, 'Q2 de descuento en Galletas Crocante', 2, '2026-11-20'],
  [6, 1, 'Q3 de descuento en Gaseosa Chispa cola', 3, '2026-11-30'],
];

// Escenario fijo de la presentación (storyboard): [tienda, producto, unidades]
// Detergente agotado en Zona 14, disponible en Cayalá.
const ESCENARIO = [
  [1, 18, 0],
  [2, 18, 22],
  [5, 18, 4],
  [1, 1, 3],
];

const PASILLO_POR_CATEGORIA = { 1: 'Pasillo 2', 2: 'Refrigerados', 3: 'Pasillo 4', 4: 'Pasillo 7', 5: 'Panadería', 6: 'Pasillo 3', 7: 'Pasillo 5', 8: 'Pasillo 8' };

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Generador pseudoaleatorio con semilla: la demo siempre arranca igual
function crearAzar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sembrar(db) {
  const azar = crearAzar(2026);
  const ahora = new Date().toISOString();

  db.exec('BEGIN');
  try {
    for (const tabla of ['ventas_diarias', 'canjes', 'dispositivos', 'cupones', 'alertas', 'lecturas', 'inventario', 'productos', 'categorias', 'tiendas']) {
      db.exec(`DELETE FROM ${tabla}`);
    }
    db.exec("DELETE FROM sqlite_sequence");

    const insTienda = db.prepare('INSERT INTO tiendas (id, nombre, zona, area, direccion, horario) VALUES (?, ?, ?, ?, ?, ?)');
    for (const t of TIENDAS) insTienda.run(...t);

    const insCategoria = db.prepare('INSERT INTO categorias (id, nombre, icono) VALUES (?, ?, ?)');
    for (const c of CATEGORIAS) insCategoria.run(...c);

    const nombreCategoria = Object.fromEntries(CATEGORIAS.map(([id, nombre]) => [id, nombre]));
    const insProducto = db.prepare(`INSERT INTO productos
      (id, nombre, marca, presentacion, categoria_id, precio_ref, peso_unitario_g, icono, busqueda)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [id, nombre, marca, pres, cat, precio, peso, icono] of PRODUCTOS) {
      insProducto.run(id, nombre, marca, pres, cat, precio, peso, icono, normalizar(`${nombre} ${marca} ${nombreCategoria[cat]}`));
    }

    const escenario = new Map(ESCENARIO.map(([t, p, u]) => [`${t}-${p}`, u]));
    const insInv = db.prepare(`INSERT INTO inventario
      (tienda_id, producto_id, pasillo, capacidad, unidades, precio, fijo, actualizado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insLectura = db.prepare(`INSERT INTO lecturas (tienda_id, producto_id, unidades, peso_g, origen, creada_en)
      VALUES (?, ?, ?, ?, 'reposicion', ?)`);
    const insAlerta = db.prepare('INSERT INTO alertas (tienda_id, producto_id, nivel_pct, creada_en) VALUES (?, ?, ?, ?)');

    for (const [tiendaId] of TIENDAS) {
      for (const [prodId, , , , cat, precioRef, peso] of PRODUCTOS) {
        const capacidad = 20 + Math.floor(azar() * 9) * 5; // 20 a 60 unidades por frente
        const clave = `${tiendaId}-${prodId}`;
        let unidades;
        if (escenario.has(clave)) {
          unidades = escenario.get(clave);
        } else {
          const r = azar();
          if (r < 0.08) unidades = 0;                                                  // agotado
          else if (r < 0.26) unidades = Math.max(1, Math.round(capacidad * (0.05 + azar() * 0.2))); // quedan pocos
          else unidades = Math.round(capacidad * (0.4 + azar() * 0.6));                // hay
        }
        const precio = Math.round(precioRef * (0.96 + azar() * 0.09) * 4) / 4;     // múltiplos de Q0.25
        const fijo = escenario.has(clave) ? 1 : 0;
        insInv.run(tiendaId, prodId, PASILLO_POR_CATEGORIA[cat], capacidad, unidades, precio, fijo, ahora);
        insLectura.run(tiendaId, prodId, unidades, unidades * peso, ahora);
        if (unidades / capacidad <= 0.15) {
          insAlerta.run(tiendaId, prodId, Math.round((unidades * 1000) / capacidad) / 10, ahora);
        }
      }
    }

    const insCupon = db.prepare('INSERT INTO cupones (id, producto_id, titulo, descuento_q, vence_en) VALUES (?, ?, ?, ?, ?)');
    for (const c of CUPONES) insCupon.run(...c);

    sembrarHistorial(db, azar);

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}


// ---------- Historial de 60 días para RALIN Insights ----------
// Demanda diaria base por tienda, según categoría (unidades por día)
const DEMANDA_POR_CATEGORIA = { 1: 18, 2: 14, 3: 10, 4: 6, 5: 12, 6: 9, 7: 7, 8: 5 };
const FACTOR_TIENDA = { 1: 0.9, 2: 1.0, 3: 1.1, 4: 1.25, 5: 1.2 };
const FACTOR_DIA = [1.25, 0.9, 0.92, 0.95, 1.0, 1.1, 1.35]; // domingo a sábado
const MINUTOS_ABIERTO = 840; // 14 horas
const PRODUCTOS_CON_CUPON = new Set(CUPONES.map((c) => c[1]));

function sembrarHistorial(db, azar) {
  const ins = db.prepare(`INSERT INTO ventas_diarias
    (fecha, tienda_id, producto_id, unidades, unidades_perdidas, minutos_agotado, canjes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const hoy = new Date();
  const factorProducto = new Map(PRODUCTOS.map(([id]) => [id, 0.6 + azar() * 0.8]));
  const riesgo = new Map();
  for (const [t] of TIENDAS) for (const [p] of PRODUCTOS) riesgo.set(`${t}-${p}`, 0.02 + azar() * 0.1);
  riesgo.set('1-18', 0.3); // el detergente se agota seguido en Zona 14 (storyboard)

  for (let atras = 60; atras >= 1; atras--) {
    const dia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - atras));
    const fecha = dia.toISOString().slice(0, 10);
    const antesDeRalin = atras > 30; // los 30 días previos: sin alertas de reposición
    for (const [t] of TIENDAS) {
      for (const [p, , , , cat] of PRODUCTOS) {
        const demanda = DEMANDA_POR_CATEGORIA[cat] * factorProducto.get(p) * FACTOR_TIENDA[t] *
          FACTOR_DIA[dia.getUTCDay()] * (0.8 + azar() * 0.4);
        let minutos = 0;
        const prob = riesgo.get(`${t}-${p}`) * (antesDeRalin ? 1.8 : 1);
        if (azar() < prob) minutos = Math.round(antesDeRalin ? 120 + azar() * 480 : 30 + azar() * 240);
        const fraccion = minutos / MINUTOS_ABIERTO;
        const unidades = Math.round(demanda * (1 - fraccion));
        const perdidas = Math.round(demanda * fraccion * 10) / 10;
        const canjes = PRODUCTOS_CON_CUPON.has(p) && atras <= 21 ? Math.round(unidades * (0.03 + azar() * 0.05)) : 0;
        ins.run(fecha, t, p, unidades, perdidas, minutos, canjes);
      }
    }
  }
}

module.exports = { sembrar, normalizar, MINUTOS_ABIERTO };

// Ejecutado directamente: reinicia la base de datos
if (require.main === module) {
  const path = require('node:path');
  const { abrirBaseDeDatos } = require('./database');
  const ruta = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ralin.db');
  const db = abrirBaseDeDatos(ruta, { sembrarSiVacia: false });
  sembrar(db);
  const n = db.prepare('SELECT COUNT(*) AS n FROM inventario').get().n;
  console.log(`Base reiniciada en ${ruta}: ${n} góndolas cargadas.`);
}
