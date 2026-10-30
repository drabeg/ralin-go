'use strict';
// =============================================================
// RALIN Go · app web (sin frameworks). Consume la API en /api.
// =============================================================
(() => {
  const $ = (selector, raiz = document) => raiz.querySelector(selector);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const q = (n) => 'Q' + Number(n).toFixed(2);
  const qCorto = (n) => 'Q' + (Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2));
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const ESTADOS = { hay: 'Hay', pocos: 'Quedan pocos', agotado: 'Agotado' };

  // ---------- almacenamiento local (puede fallar en modo privado) ----------
  const almacen = {
    leer(clave, porDefecto) {
      try { const v = localStorage.getItem(clave); return v === null ? porDefecto : JSON.parse(v); } catch { return porDefecto; }
    },
    guardar(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ } },
  };
  const nuevoId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID()
    : 'd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12));

  const estado = {
    dispositivo: almacen.leer('ralin.dispositivo', null) || nuevoId(),
    tiendaId: almacen.leer('ralin.tienda', null),
    lista: almacen.leer('ralin.lista', []),
    tiendas: [],
    categorias: null,
    cupones: [],
    temporizador: null,
    promptInstalar: null,
  };
  almacen.guardar('ralin.dispositivo', estado.dispositivo);

  // ---------- API ----------
  let servidorDespierto = false;
  async function api(ruta, opciones = {}) {
    const espera = setTimeout(() => { if (!servidorDespierto) mostrarAviso('Despertando el servidor… la primera vez puede tardar hasta un minuto.', 0); }, 2500);
    try {
      const respuesta = await fetch(ruta, {
        ...opciones,
        headers: { 'Content-Type': 'application/json', 'X-Dispositivo': estado.dispositivo, ...(opciones.headers || {}) },
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || `Error ${respuesta.status}`);
      if (!servidorDespierto) { servidorDespierto = true; ocultarAviso(); }
      return datos;
    } finally {
      clearTimeout(espera);
    }
  }

  // ---------- utilidades de interfaz ----------
  let turno = 0;
  const crearPintor = (vista) => {
    const mio = ++turno;
    return (html) => { if (mio !== turno) return false; vista.innerHTML = html; return true; };
  };
  const vigente = (() => { let actual = 0; return { nuevo: () => ++actual, es: (n) => n === actual }; })();

  const pill = (e) => e ? `<span class="estado ${e}">${ESTADOS[e]}</span>` : '';
  const fecha = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}`; };
  function haceCuanto(iso) {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return 'hace unos segundos';
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    return `hace ${Math.floor(s / 3600)} h`;
  }
  const tiendaActual = () => estado.tiendas.find((t) => t.id === estado.tiendaId) || estado.tiendas[0];
  const esquemas = (n) => Array.from({ length: n }, () => '<div class="esqueleto"></div>').join('<div style="height:10px"></div>');

  let temporizadorAviso;
  function mostrarAviso(texto, ms = 2800) {
    const el = $('#aviso');
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    if (ms) temporizadorAviso = setTimeout(() => { el.hidden = true; }, ms);
  }
  function ocultarAviso() { $('#aviso').hidden = true; }

  function abrirHoja(html) {
    const hoja = $('#hoja');
    ocultarAviso();
    hoja.innerHTML = html;
    hoja.hidden = false;
    $('#velo').hidden = false;
    const foco = hoja.querySelector('button, a');
    if (foco) foco.focus();
  }
  function cerrarHoja() { $('#hoja').hidden = true; $('#velo').hidden = true; }

  function actualizarCabecera() {
    const t = tiendaActual();
    $('#nombre-tienda').textContent = t ? t.nombre.replace(/^Súper /, '') : 'Elegí tu tienda';
    const c = $('#contador-lista');
    c.textContent = estado.lista.length;
    c.hidden = estado.lista.length === 0;
  }

  // Ilustraciones vectoriales (public/img) e íconos de línea propios
  const foto = (src) => `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">`;
  const TRAZO = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICONOS = {
    buscar: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle ${TRAZO} cx="21" cy="21" r="12"/><path ${TRAZO} d="M30 30l10 10M16 21h10"/></svg>`,
    lista: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect ${TRAZO} x="10" y="6" width="28" height="36" rx="4"/><path ${TRAZO} d="M17 17h14M17 24h14M17 31h8"/></svg>`,
    senal: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${TRAZO} d="M8 18a24 24 0 0 1 32 0M14 25a15 15 0 0 1 20 0M20 32a6 6 0 0 1 8 0M8 8l32 32"/></svg>`,
    luz: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect ${TRAZO} x="10" y="22" width="28" height="16" rx="3"/><path ${TRAZO} d="M16 30h10M24 6v5M12 10l3 4M36 10l-3 4M8 18h4M36 18h4"/><circle cx="33" cy="30" r="2.5" fill="currentColor"/></svg>`,
    etiqueta: `<svg viewBox="0 0 48 48" aria-hidden="true"><path ${TRAZO} d="M6 24V8h16l20 20-14 14z"/><circle ${TRAZO} cx="15" cy="17" r="3"/><path ${TRAZO} d="M22 30l8-8"/></svg>`,
  };

  const lupa = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>';

  // ---------- componentes ----------
  function filaProducto(p) {
    const precio = p.precio_en_mi_tienda || p.precio_desde || p.precio_ref;
    return `<a class="producto" href="#/producto/${p.id}">
      <span class="miniatura" aria-hidden="true">${foto(p.imagen)}</span>
      <div class="producto-info">
        <h3>${esc(p.nombre)} ${esc(p.presentacion)}</h3>
        <p>${esc(p.marca)} · hay en ${p.tiendas_con_stock} de ${p.tiendas_total} tiendas${p.cupon_id ? ' · con cupón' : ''}</p>
      </div>
      <div class="producto-lado">${pill(p.estado_en_mi_tienda)}<span class="precio">${q(precio)}</span></div>
    </a>`;
  }

  function tarjetaCupon(c) {
    const usado = Boolean(c.codigo);
    return `<article class="cupon ${usado ? 'usado' : ''}">
      <div class="valor">${qCorto(c.descuento_q)} <small>de descuento</small></div>
      <div class="que"><span class="emoji" aria-hidden="true">${foto(c.imagen)}</span><span>${esc(c.producto)} ${esc(c.marca)} · ${esc(c.presentacion)}</span></div>
      <div class="pie">
        <span class="vence">${usado ? `Canjeado · <span class="codigo-mini">${esc(c.codigo)}</span>` : `Vence el ${fecha(c.vence_en)}`}</span>
        <button class="boton chico ${usado ? 'claro' : 'ambar'}" type="button" data-cupon="${c.id}">${usado ? 'Ver código' : 'Usar'}</button>
      </div>
    </article>`;
  }

  function filaTienda(d, mia) {
    return `<div class="fila-tienda ${mia ? 'mia' : ''}">
      <div>${mia ? '<span class="etiqueta-mia">Tu tienda</span>' : ''}<h3>${esc(d.tienda)}</h3><p class="meta">${esc(d.zona)} · ${esc(d.pasillo)}</p></div>
      <div class="derecha">${pill(d.estado)}<p class="precio">${q(d.precio)}</p></div>
      <p class="meta lectura">Lectura del sensor ${haceCuanto(d.actualizado_en)}</p>
    </div>`;
  }

  function bloqueInstalar() {
    const instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (instalada) return '';
    if (estado.promptInstalar) {
      return `<div class="instalar"><p><b>Instalá RALIN Go</b>Tenela en tu pantalla de inicio como cualquier app.</p>
        <button class="boton chico" type="button" id="btn-instalar">Instalar</button></div>`;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      return `<div class="instalar"><p><b>Instalala en tu iPhone</b>Tocá <b style="display:inline">Compartir</b> y luego <b style="display:inline">“Agregar a inicio”</b>.</p></div>`;
    }
    return '';
  }

  // Código de barras decorativo a partir del código del cupón
  function codigoDeBarras(codigo) {
    let x = 4; let barras = '';
    for (const ch of codigo + codigo.split('').reverse().join('')) {
      const bits = ch.charCodeAt(0).toString(2).padStart(8, '0');
      for (const b of bits) {
        const ancho = b === '1' ? 3 : 1.5;
        barras += `<rect x="${x}" y="0" width="${ancho}" height="70" fill="#10243F"/>`;
        x += ancho + 1.6;
      }
    }
    return `<svg viewBox="0 0 ${x + 4} 70" preserveAspectRatio="none" aria-hidden="true">${barras}</svg>`;
  }

  // ---------- vistas ----------
  async function vistaInicio(vista) {
    const pintar = crearPintor(vista);
    pintar(esquemas(4));
    const [categorias, cupones, tiendas] = await Promise.all([api('/api/categorias'), api('/api/cupones'), api('/api/tiendas')]);
    estado.categorias = categorias; estado.cupones = cupones; estado.tiendas = tiendas;
    actualizarCabecera();
    const t = tiendaActual();
    pintar(`
      <div class="saludo"><h1>¿Qué buscás hoy?</h1><p>Mirá en qué tienda hay, antes de salir de casa.</p></div>
      <form class="buscador" id="form-buscar" role="search">${lupa}
        <input type="search" name="q" placeholder="Leche, detergente, café…" aria-label="Buscar un producto" autocomplete="off" enterkeyhint="search">
      </form>
      <div id="zona-instalar">${bloqueInstalar()}</div>
      <section class="seccion">
        <div class="mi-tienda">
          <h3>${esc(t.nombre)}</h3>
          <p class="sub">${esc(t.zona)} · ${t.productos_hay + t.productos_pocos + t.productos_agotados} góndolas con sensores RALIN</p>
          <div class="dato"><b>${t.productos_hay}</b><span>con producto</span></div>
          <div class="dato"><b>${t.productos_pocos}</b><span>quedan pocos</span></div>
          <div class="dato"><b>${t.productos_agotados}</b><span>agotados</span></div>
        </div>
      </section>
      <section class="seccion">
        <div class="seccion-titulo"><h2>Cupones para vos</h2><a href="#/cupones">Ver todos</a></div>
        <div class="carrusel">${cupones.slice(0, 4).map(tarjetaCupon).join('')}</div>
      </section>
      <section class="seccion">
        <div class="seccion-titulo"><h2>Categorías</h2></div>
        <div class="categorias">${categorias.map((c) => `<a class="categoria" href="#/buscar?categoria=${c.id}"><span class="emoji" aria-hidden="true">${foto(c.imagen)}</span>${esc(c.nombre)}</a>`).join('')}</div>
      </section>
      <a class="enlace-panel" href="#/panel">Panel en vivo de RALIN →</a>`);
    $('#form-buscar').addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = new FormData(e.target).get('q').trim();
      location.hash = `#/buscar?q=${encodeURIComponent(texto)}`;
    });
  }

  async function vistaBuscar(vista, consulta = '') {
    const pintar = crearPintor(vista);
    const params = new URLSearchParams(consulta);
    let texto = params.get('q') || '';
    const categoria = params.get('categoria') || '';
    if (!estado.categorias) estado.categorias = await api('/api/categorias');
    const filtros = [{ id: '', nombre: 'Todas' }, ...estado.categorias].map((c) =>
      `<a class="filtro ${String(c.id) === categoria ? 'activo' : ''}" href="#/buscar${c.id ? `?categoria=${c.id}` : ''}">${esc(c.nombre)}</a>`).join('');
    if (!pintar(`
      <form class="buscador" id="form-buscar" role="search" style="margin-top:0">${lupa}
        <input type="search" name="q" value="${esc(texto)}" placeholder="Buscá un producto o marca" aria-label="Buscar un producto" autocomplete="off" enterkeyhint="search">
      </form>
      <div class="filtros">${filtros}</div>
      <div id="resultados">${esquemas(5)}</div>`)) return;

    const resultados = $('#resultados');
    const cargar = async () => {
      const id = vigente.nuevo();
      const url = `/api/productos?q=${encodeURIComponent(texto)}&categoria=${categoria}&tienda=${estado.tiendaId || ''}`;
      const productos = await api(url);
      if (!vigente.es(id) || !resultados.isConnected) return;
      resultados.innerHTML = productos.length
        ? `<div class="lista-productos">${productos.map(filaProducto).join('')}</div>`
        : `<div class="vacio"><div class="emoji">${ICONOS.buscar}</div><h2>No encontramos “${esc(texto)}”</h2><p>Probá con otra palabra, por ejemplo “leche” o “café”.</p></div>`;
    };
    const entrada = $('#form-buscar input');
    let demora;
    entrada.addEventListener('input', () => {
      clearTimeout(demora);
      demora = setTimeout(() => {
        texto = entrada.value.trim();
        const nuevo = new URLSearchParams();
        if (texto) nuevo.set('q', texto);
        if (categoria) nuevo.set('categoria', categoria);
        history.replaceState(null, '', `#/buscar${nuevo.toString() ? '?' + nuevo : ''}`);
        cargar();
      }, 250);
    });
    $('#form-buscar').addEventListener('submit', (e) => { e.preventDefault(); entrada.blur(); });
    if (!categoria && !texto && matchMedia('(hover: hover)').matches) entrada.focus();
    await cargar();
  }

  async function vistaProducto(vista, id) {
    const pintar = crearPintor(vista);
    pintar(esquemas(4));
    const p = await api(`/api/productos/${id}`);
    const enLista = () => estado.lista.includes(p.id);
    const bloqueTiendas = (disp) => {
      const mia = disp.filter((d) => d.tienda_id === estado.tiendaId);
      const resto = disp.filter((d) => d.tienda_id !== estado.tiendaId);
      return [...mia.map((d) => filaTienda(d, true)), ...resto.map((d) => filaTienda(d, false))].join('');
    };
    const conStock = p.disponibilidad.filter((d) => d.estado !== 'agotado').length;
    const enMiTienda = p.disponibilidad.find((d) => d.tienda_id === estado.tiendaId);
    const otraConStock = p.disponibilidad.find((d) => d.tienda_id !== estado.tiendaId && d.estado !== 'agotado');
    let bloqueGuia = '';
    if (enMiTienda && enMiTienda.estado !== 'agotado') {
      bloqueGuia = `<div class="guia-cta"><span class="guia-icono">${ICONOS.luz}</span>
        <p><b>¿Ya estás en ${esc(enMiTienda.tienda)}?</b><br>Hacé parpadear su etiqueta para encontrarlo en ${esc(enMiTienda.pasillo)}.</p>
        <button class="boton chico" type="button" data-guiar="${p.id}" data-tienda="${enMiTienda.tienda_id}">Guiarme</button></div>`;
    } else if (otraConStock) {
      bloqueGuia = `<div class="guia-cta"><span class="guia-icono">${ICONOS.luz}</span>
        <p><b>Agotado en tu tienda</b><br>Hay en ${esc(otraConStock.tienda)}. Si estás allá, te guiamos al producto.</p>
        <button class="boton chico claro" type="button" data-guiar="${p.id}" data-tienda="${otraConStock.tienda_id}">Guiarme allá</button></div>`;
    }
    if (!pintar(`
      <a class="volver" href="#/buscar" data-volver>‹ Volver</a>
      <div class="detalle-cabecera">
        <span class="miniatura" aria-hidden="true">${foto(p.imagen)}</span>
        <div><h1>${esc(p.nombre)} ${esc(p.presentacion)}</h1><p>${esc(p.marca)} · ${esc(p.categoria)}</p></div>
      </div>
      ${p.cupon ? `<div class="cupon-destacado"><span class="icono-cupon">${ICONOS.etiqueta}</span>
        <p><b>${qCorto(p.cupon.descuento_q)} de descuento</b><br>Cupón de la marca, vence el ${fecha(p.cupon.vence_en)}</p>
        <button class="boton chico ambar" type="button" data-cupon="${p.cupon.id}">Usar</button></div>` : ''}
      ${bloqueGuia}
      <section class="seccion">
        <div class="seccion-titulo"><h2>Disponibilidad por tienda</h2><span class="en-vivo">En vivo</span></div>
        <p class="meta" style="color:var(--gris);font-size:14px;margin:-4px 0 12px">Hay producto en ${conStock} de ${p.disponibilidad.length} tiendas, según los sensores de las góndolas.</p>
        <div class="tiendas" id="tiendas-producto">${bloqueTiendas(p.disponibilidad)}</div>
      </section>
      <div class="acciones">
        <button class="boton ${enLista() ? 'claro' : ''}" type="button" id="btn-lista">${enLista() ? '✓ En tu lista' : 'Agregar a mi lista'}</button>
      </div>`)) return;

    $('#btn-lista').addEventListener('click', (e) => {
      estado.lista = enLista() ? estado.lista.filter((x) => x !== p.id) : [...estado.lista, p.id];
      almacen.guardar('ralin.lista', estado.lista);
      actualizarCabecera();
      e.currentTarget.textContent = enLista() ? '✓ En tu lista' : 'Agregar a mi lista';
      e.currentTarget.classList.toggle('claro', enLista());
      mostrarAviso(enLista() ? 'Agregado a tu lista' : 'Quitado de tu lista');
    });

    // Tiempo real: se vuelve a consultar la API cada 8 segundos
    estado.temporizador = setInterval(async () => {
      const contenedor = $('#tiendas-producto');
      if (!contenedor) return clearInterval(estado.temporizador);
      try { contenedor.innerHTML = bloqueTiendas((await api(`/api/productos/${id}`)).disponibilidad); } catch { /* reintenta luego */ }
    }, 8000);
  }

  async function vistaCupones(vista) {
    const pintar = crearPintor(vista);
    pintar(esquemas(4));
    estado.cupones = await api('/api/cupones');
    pintar(`
      <div class="saludo"><h1>Cupones</h1><p>Descuentos que pagan las marcas. Elegí la tienda y mostrá el código en caja.</p></div>
      <div class="lista-cupones seccion">${estado.cupones.map(tarjetaCupon).join('')}</div>`);
  }

  async function vistaLista(vista) {
    const pintar = crearPintor(vista);
    if (estado.lista.length === 0) {
      pintar(`<div class="vacio"><div class="emoji">${ICONOS.lista}</div><h2>Tu lista está vacía</h2>
        <p>Agregá productos y te decimos en qué tienda encontrás todo.</p>
        <a class="boton ambar" href="#/buscar" style="margin-top:16px">Buscar productos</a></div>`);
      return;
    }
    pintar(esquemas(3));
    const [productos, disp] = await Promise.all([
      api(`/api/productos?tienda=${estado.tiendaId || ''}`),
      api(`/api/disponibilidad?productos=${estado.lista.join(',')}`),
    ]);
    const mios = productos.filter((p) => estado.lista.includes(p.id));
    const mejor = disp.tiendas[0];
    const mia = disp.tiendas.find((t) => t.id === estado.tiendaId);
    const total = mios.length;
    const consejo = !mejor ? '' : (mia && mia.disponibles === mejor.disponibles)
      ? `<h3>Tu tienda tiene ${mia.disponibles} de ${total}</h3><p>${esc(mia.nombre)} es tan buena opción como cualquiera. Total aproximado: ${q(mia.total_q)}.</p>`
      : `<h3>${esc(mejor.nombre)}</h3><p>Tiene ${mejor.disponibles} de ${total} productos de tu lista. Total aproximado: ${q(mejor.total_q)}.</p>`;
    pintar(`
      <div class="saludo"><h1>Mi lista</h1><p>${total} producto${total === 1 ? '' : 's'} · estado en ${esc(tiendaActual().nombre)}</p></div>
      <div class="lista-productos seccion">${mios.map((p) => `
        <div class="item-lista">
          <span class="miniatura" aria-hidden="true">${foto(p.imagen)}</span>
          <a class="producto-info" href="#/producto/${p.id}" style="text-decoration:none"><h3>${esc(p.nombre)} ${esc(p.presentacion)}</h3><p>${esc(p.marca)}</p></a>
          ${pill(p.estado_en_mi_tienda)}
          <button class="quitar" type="button" data-quitar="${p.id}" aria-label="Quitar ${esc(p.nombre)}">×</button>
        </div>`).join('')}</div>
      <div class="recomendacion"><span class="sobre">¿Dónde compro todo?</span>${consejo}</div>
      <div class="otras">${disp.tiendas.slice(0, 5).map((t) => `<div><span>${esc(t.nombre)}</span><b>${t.disponibles} de ${t.total}</b></div>`).join('')}</div>`);
  }

  async function vistaPanel(vista) {
    const pintar = crearPintor(vista);
    pintar(`<div class="panel"><h1>RALIN · Panel en vivo</h1><p class="sub">Cargando…</p></div>`);
    const dibujar = (m) => `
      <div class="panel">
        <h1>RALIN · Panel en vivo</h1>
        <p class="sub">${m.gondolas_monitoreadas} góndolas con sensores en 5 tiendas · se actualiza cada 4 s</p>
        <div class="kpis">
          <div class="kpi"><b>${m.usuarios_hoy}</b><span>personas usaron la app hoy</span></div>
          <div class="kpi"><b>${m.cupones_canjeados}</b><span>cupones canjeados</span></div>
          <div class="kpi destacado"><b>${q(m.facturado_marcas_q)}</b><span>facturado a marcas (Q2.50 por canje)</span></div>
          <div class="kpi"><b>${m.alertas_abiertas}</b><span>alertas de reposición abiertas</span></div>
          <div class="kpi"><b>${m.guias_hoy}</b><span>guías al pasillo (etiqueta ESL)</span></div>
          <div class="kpi"><b>${m.latencia_guia_p95_ms === null ? '–' : (m.latencia_guia_p95_ms / 1000).toFixed(2) + ' s'}</b><span>latencia p95 del buscador · meta &lt; 2 s</span></div>
        </div>
        <button class="boton ambar ancho" type="button" id="btn-simular">Simular venta en ${esc((tiendaActual() || {}).nombre || 'la tienda')}</button>
        <div class="feed"><h2>Alertas de góndola</h2>${m.ultimas_alertas.map((a) => `
          <div class="feed-item"><span class="emoji" aria-hidden="true">${foto(a.imagen)}</span>
            <div>${esc(a.producto)} ${esc(a.presentacion)} · ${a.nivel_pct}%<small>${esc(a.tienda)} · ${esc(a.pasillo)} · ${haceCuanto(a.atendida_en || a.creada_en)}</small></div>
            <span class="tag ${a.atendida_en ? 'atendida' : 'abierta'}">${a.atendida_en ? 'Repuesta' : 'Abierta'}</span></div>`).join('')}</div>
        <div class="feed"><h2>Últimos cupones canjeados</h2>${m.ultimos_canjes.length ? m.ultimos_canjes.map((c) => `
          <div class="feed-item"><span class="emoji" aria-hidden="true">${foto(c.imagen)}</span>
            <div>${esc(c.titulo)}<small>${esc(c.tienda)} · ${haceCuanto(c.creado_en)}</small></div><b>+${q(c.costo_canje_q)}</b></div>`).join('')
          : '<p class="sub">Todavía no hay canjes. ¡Escaneá el QR y usá un cupón!</p>'}</div>
        <a class="boton claro ancho" href="/presentar">Mostrar QR para la clase</a>
        <a class="boton claro ancho" href="/insights">Abrir RALIN Insights (reportes para marcas)</a>
      </div>`;
    const refrescar = async () => {
      if (!$('#vista .panel')) return clearInterval(estado.temporizador);
      try { pintarPanel(dibujar(await api('/api/metricas'))); } catch { /* reintenta */ }
    };
    const pintarPanel = (html) => { const v = $('#vista'); if (v.firstElementChild && v.firstElementChild.classList.contains('panel')) v.innerHTML = html; };
    if (!pintar(dibujar(await api('/api/metricas')))) return;
    estado.temporizador = setInterval(refrescar, 4000);
  }

  // ---------- guía en el pasillo ("Shop to Light") ----------
  // Dibujo de la góndola: 3 estantes × 6 secciones, cada uno con su etiqueta ESL
  function dibujoGondola(g) {
    const niveles = ['superior', 'medio', 'inferior'];
    const fila = niveles.indexOf(g.nivel);
    let s = '<svg class="gondola" viewBox="0 0 320 190" aria-hidden="true"><rect x="4" y="4" width="312" height="182" rx="10" fill="#E9E4D8"/>';
    for (let f = 0; f < 3; f++) {
      const y = 16 + f * 58;
      s += `<rect x="12" y="${y + 40}" width="296" height="6" rx="2" fill="#C9C1AE"/>`;
      for (let c = 0; c < 6; c++) {
        const x = 16 + c * 49;
        const objetivo = f === fila && c === g.seccion - 1;
        if (!objetivo) s += `<rect x="${x + 6}" y="${y + 8 + ((c + f) % 3) * 3}" width="30" height="${30 - ((c + f) % 3) * 3}" rx="4" fill="#CFC6B2"/>`;
        else s += `<image href="${esc(g.imagen)}" x="${x - 2}" y="${y - 6}" width="46" height="46"/>`;
        s += `<rect class="${objetivo ? 'led-objetivo' : ''}" x="${x + 9}" y="${y + 47}" width="24" height="9" rx="2" fill="${objetivo ? g.color.hex : '#F7F5F0'}" stroke="${objetivo ? g.color.hex : '#B5AC97'}"/>`;
      }
    }
    return s + '</svg>';
  }

  let temporizadorGuia = null;
  async function guiarEnPasillo(productoId, tiendaId, imagen) {
    clearInterval(temporizadorGuia);
    abrirHoja(`<h2 id="hoja-titulo">Conectando con la etiqueta…</h2>
      <div class="ruta-guia"><span>App</span><i></i><span>Nube</span><i></i><span>Gateway</span><i></i><span>Etiqueta</span></div>
      <div class="esqueleto" style="height:190px;margin-top:12px"></div>`);
    const t0 = performance.now();
    let g;
    try {
      g = await api('/api/guia', { method: 'POST', body: JSON.stringify({ tienda_id: Number(tiendaId), producto_id: Number(productoId) }) });
    } catch (error) {
      abrirHoja(`<h2 id="hoja-titulo">No pudimos guiarte</h2><p>${esc(error.message)}</p><button class="boton ancho" type="button" data-cerrar>Cerrar</button>`);
      return;
    }
    const totalMs = Math.round(performance.now() - t0);
    api(`/api/guia/${g.id}/latencia`, { method: 'POST', body: JSON.stringify({ ms: totalMs }) }).catch(() => {});
    g.imagen = imagen;
    const internetMs = Math.max(0, totalMs - g.latencia_ms.total_servidor);
    const ok = totalMs < g.meta_ms;
    const seg = (ms) => (ms / 1000).toFixed(2).replace(/\.?0+$/, '') + ' s';
    const pct = (ms) => Math.min(100, (ms / 3000) * 100).toFixed(1);
    abrirHoja(`
      <h2 id="hoja-titulo">Buscá la luz <span class="color-guia" style="--c:${g.color.hex}">${esc(g.color.nombre)}</span></h2>
      <p>${esc(g.producto)} · ${esc(g.tienda)}</p>
      <div class="ubicacion-guia"><b>${esc(g.pasillo)}</b><span>Sección ${g.seccion}</span><span>Estante ${esc(g.nivel)}</span></div>
      ${dibujoGondola(g)}
      <p class="cuenta-guia" id="cuenta-guia">La etiqueta parpadea durante ${g.parpadeo_seg} s</p>
      <div class="latencia ${ok ? 'ok' : 'lenta'}">
        <div class="latencia-cabeza"><b>Respuesta en ${seg(totalMs)}</b><span>${ok ? '✓ Dentro de la meta (menos de 2 s)' : 'Arriba de la meta de 2 s'}</span></div>
        <div class="latencia-barra" role="img" aria-label="Tiempo de respuesta ${seg(totalMs)} de una meta de 2 segundos">
          <i style="width:${pct(internetMs)}%;background:#8FA6C4"></i><i style="width:${pct(g.latencia_ms.nube_gateway)}%;background:#1F6FB2"></i><i style="width:${pct(g.latencia_ms.gateway_esl)}%;background:${g.color.hex}"></i>
          <span class="meta-linea" style="left:${pct(g.meta_ms)}%"></span>
        </div>
        <div class="latencia-detalle"><span><i style="background:#8FA6C4"></i>Internet ${seg(internetMs)}</span><span><i style="background:#1F6FB2"></i>Nube → gateway ${seg(g.latencia_ms.nube_gateway)}</span><span><i style="background:${g.color.hex}"></i>Gateway → etiqueta ${seg(g.latencia_ms.gateway_esl)}</span></div>
      </div>
      <p class="nota-guia">Etiqueta ${esc(g.etiqueta)} · otros clientes ven otro color al mismo tiempo.</p>
      <div class="acciones">
        <button class="boton claro" type="button" data-guiar="${productoId}" data-tienda="${tiendaId}">Volver a encender</button>
        <button class="boton ambar" type="button" data-encontrado="${g.id}">¡Lo encontré!</button>
      </div>`);
    let quedan = g.parpadeo_seg;
    temporizadorGuia = setInterval(() => {
      const el = $('#cuenta-guia');
      if (!el) return clearInterval(temporizadorGuia);
      quedan -= 1;
      if (quedan <= 0) {
        clearInterval(temporizadorGuia);
        el.textContent = 'La etiqueta dejó de parpadear. Tocá "Volver a encender" si aún no lo ves.';
        document.querySelectorAll('.led-objetivo').forEach((x) => x.classList.remove('led-objetivo'));
      } else el.textContent = `La etiqueta parpadea ${quedan} s más`;
    }, 1000);
  }

  // ---------- cupones: canje ----------
  function mostrarTicket(c) {
    abrirHoja(`
      <h2 id="hoja-titulo">¡Listo! Tu cupón</h2>
      <p>Mostralo en caja en ${esc(c.tienda)}.</p>
      <div class="ticket">
        <div class="ahorro">Ahorrás ${qCorto(c.descuento_q)}</div>
        ${codigoDeBarras(c.codigo)}
        <div class="codigo">${esc(c.codigo)}</div>
        <p>La marca le paga Q2.50 a RALIN por cada canje.<br>Demo académica: este cupón no tiene validez real.</p>
      </div>
      <button class="boton ancho" type="button" data-cerrar style="margin-top:16px">Listo</button>`);
  }

  async function abrirCupon(id) {
    if (!estado.cupones.length) estado.cupones = await api('/api/cupones');
    const c = estado.cupones.find((x) => x.id === Number(id));
    if (!c) return;
    if (c.codigo) return mostrarTicket({ codigo: c.codigo, tienda: c.canjeado_en_tienda, descuento_q: c.descuento_q });
    if (!estado.tiendas.length) estado.tiendas = await api('/api/tiendas');
    const ordenadas = [...estado.tiendas].sort((a, b) => (b.id === estado.tiendaId) - (a.id === estado.tiendaId));
    abrirHoja(`
      <h2 id="hoja-titulo">${qCorto(c.descuento_q)} en ${esc(c.producto)}</h2>
      <p>¿En qué tienda lo vas a usar?</p>
      ${ordenadas.map((t) => `<button class="opcion ${t.id === estado.tiendaId ? 'activa' : ''}" type="button" data-canjear="${c.id}" data-tienda="${t.id}">
        <span><b>${esc(t.nombre)}</b><span>${esc(t.zona)}</span></span><span>${t.id === estado.tiendaId ? 'Tu tienda' : ''}</span></button>`).join('')}`);
  }

  async function canjear(cuponId, tiendaId, boton) {
    boton.disabled = true;
    try {
      const r = await api(`/api/cupones/${cuponId}/canjear`, { method: 'POST', body: JSON.stringify({ tienda_id: Number(tiendaId) }) });
      mostrarTicket(r);
      estado.cupones = await api('/api/cupones');
      // Refresca la vista de fondo sin cerrar el cupón: lo cierra el usuario con "Listo"
      if (/^#\/cupones|^#?\/?$/.test(location.hash || '#/')) navegar({ mantenerHoja: true });
    } catch (error) {
      boton.disabled = false;
      mostrarAviso(error.message);
    }
  }

  function elegirTienda() {
    abrirHoja(`
      <h2 id="hoja-titulo">Elegí tu tienda</h2>
      <p>Te mostramos primero lo que hay en esta tienda.</p>
      ${estado.tiendas.map((t) => `<button class="opcion ${t.id === estado.tiendaId ? 'activa' : ''}" type="button" data-elegir-tienda="${t.id}">
        <span><b>${esc(t.nombre)}</b><span>${esc(t.zona)} · ${t.area === 'urbana' ? 'Urbana' : 'Suburbana'}</span></span>
        <span>${t.id === estado.tiendaId ? '✓' : ''}</span></button>`).join('')}`);
  }

  // ---------- enrutador ----------
  const RUTAS = [
    [/^#\/buscar(?:\?(.*))?$/, vistaBuscar, 'buscar'],
    [/^#\/producto\/(\d+)$/, vistaProducto, 'buscar'],
    [/^#\/cupones$/, vistaCupones, 'cupones'],
    [/^#\/lista$/, vistaLista, 'lista'],
    [/^#\/panel$/, vistaPanel, null],
    [/^.*$/, vistaInicio, 'inicio'],
  ];

  async function navegar(opciones = {}) {
    clearInterval(estado.temporizador);
    if (!opciones.mantenerHoja) cerrarHoja();
    const hash = location.hash || '#/';
    const [patron, vista, pestaña] = RUTAS.find(([re]) => re.test(hash));
    const params = hash.match(patron).slice(1);
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('activo', a.dataset.ruta === pestaña));
    const contenedor = $('#vista');
    if (!opciones.mantenerHoja) window.scrollTo(0, 0);
    try {
      await vista(contenedor, ...params);
    } catch (error) {
      contenedor.innerHTML = `<div class="vacio"><div class="emoji">${ICONOS.senal}</div><h2>No pudimos conectar</h2>
        <p>${esc(error.message)}</p><button class="boton" type="button" style="margin-top:16px" onclick="location.reload()">Reintentar</button></div>`;
    }
  }

  // ---------- eventos ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-guiar], [data-encontrado], [data-cupon], [data-canjear], [data-elegir-tienda], [data-quitar], [data-cerrar], [data-volver], #btn-instalar, #btn-simular');
    if (!el) return;
    if ('volver' in el.dataset) {
      if (history.length > 1) { e.preventDefault(); history.back(); }
      return;
    }
    if (el.dataset.guiar) {
      const img = document.querySelector('.detalle-cabecera .miniatura img');
      return guiarEnPasillo(el.dataset.guiar, el.dataset.tienda, img ? img.getAttribute('src') : `/img/productos/${el.dataset.guiar}.svg`);
    }
    if (el.dataset.encontrado) {
      clearInterval(temporizadorGuia);
      api(`/api/guia/${el.dataset.encontrado}/encontrada`, { method: 'POST' }).catch(() => {});
      cerrarHoja();
      return mostrarAviso('¡Listo! La etiqueta vuelve a mostrar solo el precio');
    }
    if (el.dataset.cupon) return abrirCupon(el.dataset.cupon).catch((err) => mostrarAviso(err.message));
    if (el.dataset.canjear) return canjear(el.dataset.canjear, el.dataset.tienda, el);
    if (el.dataset.elegirTienda) {
      estado.tiendaId = Number(el.dataset.elegirTienda);
      almacen.guardar('ralin.tienda', estado.tiendaId);
      actualizarCabecera();
      return navegar();
    }
    if (el.dataset.quitar) {
      estado.lista = estado.lista.filter((x) => x !== Number(el.dataset.quitar));
      almacen.guardar('ralin.lista', estado.lista);
      actualizarCabecera();
      return navegar();
    }
    if ('cerrar' in el.dataset) return cerrarHoja();
    if (el.id === 'btn-instalar' && estado.promptInstalar) {
      estado.promptInstalar.prompt();
      estado.promptInstalar = null;
      $('#zona-instalar') && ($('#zona-instalar').innerHTML = '');
      return;
    }
    if (el.id === 'btn-simular') {
      el.disabled = true;
      api('/api/simular/venta', { method: 'POST', body: JSON.stringify({ tienda_id: estado.tiendaId || 1, unidades: 8 }) })
        .then((r) => mostrarAviso(r.alerta_creada
          ? `Se vendieron 8 de ${r.producto}: quedó al ${r.nivel_pct}% y se avisó a bodega`
          : `Se vendieron 8 de ${r.producto}: la góndola quedó al ${r.nivel_pct}%`, 4000))
        .catch((err) => mostrarAviso(err.message))
        .finally(() => { el.disabled = false; });
    }
  });
  $('#velo').addEventListener('click', cerrarHoja);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarHoja(); });
  $('#btn-tienda').addEventListener('click', async () => {
    if (!estado.tiendas.length) estado.tiendas = await api('/api/tiendas');
    elegirTienda();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    estado.promptInstalar = e;
    const zona = $('#zona-instalar');
    if (zona) zona.innerHTML = bloqueInstalar();
  });
  window.addEventListener('hashchange', navegar);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  // ---------- arranque ----------
  (async () => {
    try {
      estado.tiendas = await api('/api/tiendas');
      if (!estado.tiendas.some((t) => t.id === estado.tiendaId)) {
        estado.tiendaId = estado.tiendas[0].id;
        almacen.guardar('ralin.tienda', estado.tiendaId);
      }
    } catch { /* la vista mostrará el error */ }
    actualizarCabecera();
    navegar();
  })();
})();
