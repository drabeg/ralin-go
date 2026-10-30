-- =============================================================
-- RALIN Go · Esquema de la base de datos (SQLite)
-- Demo académica: datos ficticios.
-- =============================================================
PRAGMA foreign_keys = ON;

-- Sucursales con estanterías RALIN instaladas
CREATE TABLE IF NOT EXISTS tiendas (
  id          INTEGER PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  zona        TEXT    NOT NULL,
  area        TEXT    NOT NULL CHECK (area IN ('urbana', 'suburbana', 'rural')),
  direccion   TEXT    NOT NULL,
  horario     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS categorias (
  id      INTEGER PRIMARY KEY,
  nombre  TEXT NOT NULL UNIQUE,
  icono   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS productos (
  id               INTEGER PRIMARY KEY,
  nombre           TEXT    NOT NULL,
  marca            TEXT    NOT NULL,
  presentacion     TEXT    NOT NULL,
  categoria_id     INTEGER NOT NULL REFERENCES categorias(id),
  precio_ref       REAL    NOT NULL CHECK (precio_ref > 0),
  peso_unitario_g  INTEGER NOT NULL CHECK (peso_unitario_g > 0),
  icono            TEXT    NOT NULL,
  busqueda         TEXT    NOT NULL            -- nombre + marca + categoría, en minúsculas y sin tildes
);

-- Lectura ACTUAL de cada góndola (una fila por producto y tienda).
-- La escribe el sensor de peso a través del gateway de la tienda.
CREATE TABLE IF NOT EXISTS inventario (
  tienda_id       INTEGER NOT NULL REFERENCES tiendas(id),
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  pasillo         TEXT    NOT NULL,
  capacidad       INTEGER NOT NULL CHECK (capacidad > 0),
  unidades        INTEGER NOT NULL CHECK (unidades >= 0),
  precio          REAL    NOT NULL CHECK (precio > 0),
  fijo            INTEGER NOT NULL DEFAULT 0,  -- 1 = el simulador no la toca (escenario de la presentación)
  actualizado_en  TEXT    NOT NULL,
  PRIMARY KEY (tienda_id, producto_id)
);

-- Historial de lecturas del sensor (para Insights)
CREATE TABLE IF NOT EXISTS lecturas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tienda_id    INTEGER NOT NULL REFERENCES tiendas(id),
  producto_id  INTEGER NOT NULL REFERENCES productos(id),
  unidades     INTEGER NOT NULL,
  peso_g       INTEGER NOT NULL,
  origen       TEXT    NOT NULL CHECK (origen IN ('venta', 'reposicion', 'manual')),
  creada_en    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lecturas_fecha ON lecturas (creada_en);

-- Alertas de reabastecimiento (la góndola bajó del 15 %)
CREATE TABLE IF NOT EXISTS alertas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tienda_id    INTEGER NOT NULL REFERENCES tiendas(id),
  producto_id  INTEGER NOT NULL REFERENCES productos(id),
  nivel_pct    REAL    NOT NULL,
  creada_en    TEXT    NOT NULL,
  atendida_en  TEXT
);
CREATE INDEX IF NOT EXISTS idx_alertas_abiertas ON alertas (atendida_en);

-- Cupones patrocinados por las marcas
CREATE TABLE IF NOT EXISTS cupones (
  id             INTEGER PRIMARY KEY,
  producto_id    INTEGER NOT NULL REFERENCES productos(id),
  titulo         TEXT    NOT NULL,
  descuento_q    REAL    NOT NULL CHECK (descuento_q > 0),
  costo_canje_q  REAL    NOT NULL DEFAULT 2.50,  -- lo que RALIN le cobra a la marca por canje
  vence_en       TEXT    NOT NULL,
  activo         INTEGER NOT NULL DEFAULT 1
);

-- Teléfonos que abrieron la app (identificador anónimo, sin datos personales)
CREATE TABLE IF NOT EXISTS dispositivos (
  id           TEXT PRIMARY KEY,
  primera_vez  TEXT NOT NULL,
  ultima_vez   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canjes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cupon_id        INTEGER NOT NULL REFERENCES cupones(id),
  dispositivo_id  TEXT    NOT NULL REFERENCES dispositivos(id),
  tienda_id       INTEGER NOT NULL REFERENCES tiendas(id),
  codigo          TEXT    NOT NULL UNIQUE,
  creado_en       TEXT    NOT NULL,
  UNIQUE (cupon_id, dispositivo_id)                -- un canje por cupón y teléfono
);

-- Disponibilidad que ve el consumidor: nunca unidades exactas, solo el estado
CREATE VIEW IF NOT EXISTS v_disponibilidad AS
SELECT
  i.tienda_id,
  i.producto_id,
  i.pasillo,
  i.precio,
  i.unidades,
  i.capacidad,
  ROUND(i.unidades * 100.0 / i.capacidad, 1) AS nivel_pct,
  CASE
    WHEN i.unidades = 0                          THEN 'agotado'
    WHEN i.unidades * 1.0 / i.capacidad <= 0.25  THEN 'pocos'
    ELSE 'hay'
  END AS estado,
  i.actualizado_en
FROM inventario i;
