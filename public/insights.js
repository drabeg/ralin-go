'use strict';
// =============================================================
// RALIN Insights · dashboard de reportes (sin librerías: gráficas en SVG)
// =============================================================
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n, dec = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const Q = (n, dec = 0) => 'Q' + num(n, dec);
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fechaCorta = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}`; };
  const ESTADOS = { hay: 'Hay', pocos: 'Quedan pocos', agotado: 'Agotado' };
  const SVG = 'http://www.w3.org/2000/svg';

  const estado = { marca: 'Brisa Clara', dias: 30, tienda: 0, datos: null, vivo: null };

  async function api(ruta) {
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r.json();
  }

  // ---------- tooltip ----------
  const tip = $('#tooltip');
  function mostrarTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const ancho = tip.offsetWidth; const alto = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - ancho - 8, x + 16) + 'px';
    tip.style.top = Math.max(8, y - alto - 12) + 'px';
  }
  const ocultarTip = () => { tip.hidden = true; };

  // ---------- indicadores ----------
  function cambio(actual, previo, { mejorSiBaja = false, puntos = false } = {}) {
    if (previo === null || previo === undefined || (!puntos && !previo)) return '<span class="cambio neutro">sin período previo</span>';
    const delta = puntos ? actual - previo : ((actual - previo) / previo) * 100;
    if (Math.abs(delta) < 0.05) return '<span class="cambio neutro">igual que antes</span>';
    const bueno = mejorSiBaja ? delta < 0 : delta > 0;
    const flecha = delta > 0 ? '▲' : '▼';
    const texto = puntos ? `${delta > 0 ? '+' : '−'}${num(Math.abs(delta), 1)} pts` : `${delta > 0 ? '+' : '−'}${num(Math.abs(delta), 1)} %`;
    return `<span class="cambio ${bueno ? 'bueno' : 'malo'}">${flecha} ${texto} vs. ${estado.dias} días anteriores</span>`;
  }

  function pintarKpis(d) {
    const a = d.actual; const p = d.previo;
    const tarjetas = [
      ['Ventas', Q(a.ventas_q), cambio(a.ventas_q, p.ventas_q)],
      ['Unidades vendidas', num(a.unidades), cambio(a.unidades, p.unidades)],
      ['Disponibilidad en góndola', `${num(a.disponibilidad_pct, 1)} %`, cambio(a.disponibilidad_pct, p.disponibilidad_pct, { puntos: true })],
      ['Ventas perdidas por agotados', Q(a.perdidas_q), cambio(a.perdidas_q, p.perdidas_q, { mejorSiBaja: true })],
      ['Cupones canjeados (RALIN Go)', num(a.canjes), `<span class="cambio neutro">hoy: ${num(d.hoy.canjes)} canjes · ${num(d.hoy.unidades)} unidades vendidas</span>`],
    ];
    $('#kpis').innerHTML = tarjetas.map(([etiqueta, valor, extra]) =>
      `<div class="kpi"><div class="etiqueta">${etiqueta}</div><div class="valor">${valor}</div>${extra}</div>`).join('');
  }

  function pintarEncabezado(d) {
    const tienda = estado.tienda ? ` · ${esc((d.tiendas.find((t) => t.id === estado.tienda) || {}).nombre || '')}` : '';
    $('#titulo').textContent = `${d.marca} · últimos ${d.dias} días (${fechaCorta(d.desde)} – ${fechaCorta(d.hasta)})`;
    $('#titulo').insertAdjacentHTML('beforeend', tienda);
    const a = d.actual; const p = d.previo;
    const peor = [...d.tiendas].sort((x, y) => x.disponibilidad_pct - y.disponibilidad_pct)[0];
    const partes = [`<b>${esc(d.marca)}</b> vendió <b>${Q(a.ventas_q)}</b> en góndolas RALIN.`];
    if (p.gondola_dias) {
      partes.push(`La disponibilidad pasó de <b>${num(p.disponibilidad_pct, 1)} %</b> a <b>${num(a.disponibilidad_pct, 1)} %</b>`);
      if (p.perdidas_q > 0) {
        const cambioPerdidas = ((a.perdidas_q - p.perdidas_q) / p.perdidas_q) * 100;
        partes[1] += ` y las ventas perdidas por agotados ${cambioPerdidas <= 0 ? 'bajaron' : 'subieron'} <b>${num(Math.abs(cambioPerdidas), 0)} %</b>.`;
      } else partes[1] += '.';
    }
    if (peor) partes.push(`La tienda con más quiebres es <b>${esc(peor.nombre)}</b> (${num(peor.disponibilidad_pct, 1)} % de disponibilidad).`);
    $('#hallazgo').innerHTML = partes.join(' ');
  }

  // ---------- gráfica de líneas: ventas y ventas perdidas por día ----------
  function escalaBonita(max) {
    const paso0 = max / 4;
    const mag = 10 ** Math.floor(Math.log10(paso0 || 1));
    const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= paso0);
    return { paso, tope: Math.max(paso, Math.ceil(max / paso) * paso) };
  }

  function pintarSerie(serie) {
    const W = 820, H = 300, m = { izq: 64, der: 150, arr: 14, aba: 34 };
    const ancho = W - m.izq - m.der, alto = H - m.arr - m.aba;
    const { paso, tope } = escalaBonita(Math.max(...serie.map((s) => s.ventas_q), 1));
    const X = (i) => m.izq + (serie.length === 1 ? ancho / 2 : (i / (serie.length - 1)) * ancho);
    const Y = (v) => m.arr + alto - (v / tope) * alto;
    const linea = (campo) => serie.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(s[campo]).toFixed(1)}`).join('');
    const cadaN = serie.length > 10 ? 5 : 1;

    let html = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas diarias y ventas perdidas por agotados">`;
    for (let v = 0; v <= tope; v += paso) {
      html += `<line x1="${m.izq}" x2="${m.izq + ancho}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v ? 'var(--grilla)' : '#C9C3B5'}"/>`;
      html += `<text x="${m.izq - 10}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--texto-3)">${Q(v)}</text>`;
    }
    serie.forEach((s, i) => {
      if (i % cadaN === 0 || i === serie.length - 1) {
        html += `<text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="var(--texto-3)">${fechaCorta(s.fecha)}</text>`;
      }
    });
    html += `<path d="${linea('perdidas_q')}" fill="none" stroke="var(--serie-2)" stroke-width="2" stroke-linejoin="round"/>`;
    html += `<path d="${linea('ventas_q')}" fill="none" stroke="var(--serie-1)" stroke-width="2" stroke-linejoin="round"/>`;
    const u = serie.length - 1; const ult = serie[u];
    // etiquetas directas al final de cada línea (texto en tinta, no en el color de la serie)
    let yV = Y(ult.ventas_q), yP = Y(ult.perdidas_q);
    if (yP - yV < 34) yP = yV + 34;
    html += `<circle cx="${X(u)}" cy="${Y(ult.ventas_q)}" r="4" fill="var(--serie-1)" stroke="#fff" stroke-width="2"/>`;
    html += `<circle cx="${X(u)}" cy="${Y(ult.perdidas_q)}" r="4" fill="var(--serie-2)" stroke="#fff" stroke-width="2"/>`;
    html += `<text x="${X(u) + 12}" y="${yV - 2}" font-size="12" fill="var(--texto-3)">Ventas</text><text x="${X(u) + 12}" y="${yV + 14}" font-size="14" font-weight="700" fill="var(--texto)">${Q(ult.ventas_q)}</text>`;
    html += `<text x="${X(u) + 12}" y="${yP - 2}" font-size="12" fill="var(--texto-3)">Perdidas</text><text x="${X(u) + 12}" y="${yP + 14}" font-size="14" font-weight="700" fill="var(--texto)">${Q(ult.perdidas_q)}</text>`;
    // capa de interacción
    html += `<line id="guia" y1="${m.arr}" y2="${m.arr + alto}" stroke="var(--texto-3)" stroke-dasharray="3 3" visibility="hidden"/>`;
    html += `<circle id="pv" r="5" fill="var(--serie-1)" stroke="#fff" stroke-width="2" visibility="hidden"/>`;
    html += `<circle id="pp" r="5" fill="var(--serie-2)" stroke="#fff" stroke-width="2" visibility="hidden"/>`;
    html += `<rect id="captura" x="${m.izq}" y="${m.arr}" width="${ancho}" height="${alto}" fill="transparent"/></svg>`;
    const cont = $('#g-serie');
    cont.innerHTML = html;

    const svg = cont.querySelector('svg');
    const captura = svg.querySelector('#captura');
    const mostrar = (evento) => {
      const caja = svg.getBoundingClientRect();
      const x = ((evento.clientX - caja.left) / caja.width) * W;
      const i = Math.max(0, Math.min(serie.length - 1, Math.round(((x - m.izq) / ancho) * (serie.length - 1))));
      const s = serie[i];
      svg.querySelector('#guia').setAttribute('x1', X(i)); svg.querySelector('#guia').setAttribute('x2', X(i));
      svg.querySelector('#pv').setAttribute('cx', X(i)); svg.querySelector('#pv').setAttribute('cy', Y(s.ventas_q));
      svg.querySelector('#pp').setAttribute('cx', X(i)); svg.querySelector('#pp').setAttribute('cy', Y(s.perdidas_q));
      ['#guia', '#pv', '#pp'].forEach((id) => svg.querySelector(id).setAttribute('visibility', 'visible'));
      mostrarTip(`<b>${fechaCorta(s.fecha)}</b>
        <div class="linea"><span><i style="background:var(--serie-1)"></i>Ventas</span><span>${Q(s.ventas_q, 2)}</span></div>
        <div class="linea"><span><i style="background:var(--serie-2)"></i>Perdidas</span><span>${Q(s.perdidas_q, 2)}</span></div>
        <div class="linea"><span>Disponibilidad</span><span>${num(s.disponibilidad_pct, 1)} %</span></div>`, evento.clientX, evento.clientY);
    };
    captura.addEventListener('mousemove', mostrar);
    captura.addEventListener('mouseleave', () => { ['#guia', '#pv', '#pp'].forEach((id) => svg.querySelector(id).setAttribute('visibility', 'hidden')); ocultarTip(); });
  }

  // ---------- gráfica de puntos: disponibilidad por tienda ----------
  function pintarTiendas(tiendas) {
    const META = 98;
    const W = 420, filaAlto = 52, m = { izq: 150, der: 56, arr: 30, aba: 30 };
    const H = m.arr + tiendas.length * filaAlto + m.aba;
    const minimo = Math.min(95, Math.floor(Math.min(...tiendas.map((t) => t.disponibilidad_pct)) - 1));
    const ancho = W - m.izq - m.der;
    const X = (v) => m.izq + ((v - minimo) / (100 - minimo)) * ancho;
    let html = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Disponibilidad en góndola por tienda">`;
    const pasos = 100 - minimo <= 6 ? 1 : 2;
    for (let v = minimo; v <= 100; v += pasos) {
      html += `<line x1="${X(v)}" x2="${X(v)}" y1="${m.arr - 6}" y2="${H - m.aba}" stroke="var(--grilla)"/>`;
      html += `<text x="${X(v)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="var(--texto-3)">${v} %</text>`;
    }
    html += `<line x1="${X(META)}" x2="${X(META)}" y1="${m.arr - 14}" y2="${H - m.aba}" stroke="var(--texto-2)" stroke-dasharray="4 3"/>`;
    html += `<text x="${X(META)}" y="${m.arr - 18}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--texto-2)">Meta ${META} %</text>`;
    tiendas.forEach((t, i) => {
      const y = m.arr + i * filaAlto + filaAlto / 2;
      const seleccionada = estado.tienda === t.id;
      html += `<text x="0" y="${y - 3}" font-size="13" font-weight="${seleccionada ? 800 : 600}" fill="var(--texto)">${esc(t.nombre.replace(/^Súper /, ''))}</text>`;
      html += `<text x="0" y="${y + 13}" font-size="12" fill="var(--texto-3)">${Q(t.perdidas_q)} perdidos</text>`;
      html += `<line x1="${X(minimo)}" x2="${X(t.disponibilidad_pct)}" y1="${y}" y2="${y}" stroke="var(--serie-1)" stroke-opacity=".35" stroke-width="2"/>`;
      html += `<circle data-i="${i}" cx="${X(t.disponibilidad_pct)}" cy="${y}" r="7" fill="var(--serie-1)" stroke="#fff" stroke-width="2"/>`;
      html += `<text x="${X(t.disponibilidad_pct) + 12}" y="${y + 4}" font-size="13" font-weight="700" fill="var(--texto)">${num(t.disponibilidad_pct, 1)} %</text>`;
      html += `<rect data-i="${i}" x="0" y="${y - filaAlto / 2}" width="${W}" height="${filaAlto}" fill="transparent"/>`;
    });
    html += '</svg>';
    const cont = $('#g-tiendas');
    cont.innerHTML = html;
    cont.querySelectorAll('rect[data-i]').forEach((r) => {
      r.addEventListener('mousemove', (e) => {
        const t = tiendas[Number(r.dataset.i)];
        mostrarTip(`<b>${esc(t.nombre)}</b>
          <div class="linea"><span>Disponibilidad</span><span>${num(t.disponibilidad_pct, 1)} %</span></div>
          <div class="linea"><span>Ventas</span><span>${Q(t.ventas_q)}</span></div>
          <div class="linea"><span>Ventas perdidas</span><span>${Q(t.perdidas_q)}</span></div>
          <div class="linea"><span>Días con quiebre</span><span>${num(t.quiebres)}</span></div>`, e.clientX, e.clientY);
      });
      r.addEventListener('mouseleave', ocultarTip);
    });
  }

  // ---------- tabla de productos ----------
  function pintarProductos(productos) {
    $('#nota-productos').textContent = `${productos.length} producto${productos.length === 1 ? '' : 's'} · ordenados por ventas`;
    const variacion = (v) => v === null ? '–' : `<span class="${v >= 0 ? 'sube' : 'baja'}">${v >= 0 ? '▲' : '▼'} ${num(Math.abs(v), 1)} %</span>`;
    $('#t-productos').innerHTML = `
      <thead><tr><th>Producto</th><th>Ventas</th><th>Unidades</th><th>vs. período anterior</th><th>Disponibilidad</th><th>Días con quiebre</th><th>Ventas perdidas</th><th>Cupones</th></tr></thead>
      <tbody>${productos.map((p) => `<tr>
        <td><span class="prod"><img class="emoji" src="${esc(p.imagen)}" alt="" loading="lazy">${esc(p.nombre)} ${esc(p.presentacion)}</span></td>
        <td>${Q(p.ventas_q)}</td><td>${num(p.unidades)}</td><td>${variacion(p.variacion_pct)}</td>
        <td>${num(p.disponibilidad_pct, 1)} %</td><td>${num(p.quiebres)}</td><td>${Q(p.perdidas_q)}</td><td>${num(p.canjes)}</td>
      </tr>`).join('')}</tbody>`;
  }

  // ---------- góndolas en vivo ----------
  async function pintarVivo() {
    try {
      const v = await api(`/api/insights/gondolas?marca=${encodeURIComponent(estado.marca)}`);
      estado.vivo = v;
      const celda = (pid, tid) => v.celdas.find((c) => c.producto_id === pid && c.tienda_id === tid);
      $('#t-vivo').innerHTML = `
        <thead><tr><th>Producto</th>${v.tiendas.map((t) => `<th>${esc(t.nombre.replace(/^Súper /, ''))}</th>`).join('')}</tr></thead>
        <tbody>${v.productos.map((p) => `<tr>
          <td><span class="prod"><img class="emoji" src="${esc(p.imagen)}" alt="" loading="lazy">${esc(p.nombre)} ${esc(p.presentacion)}</span></td>
          ${v.tiendas.map((t) => {
            const c = celda(p.id, t.id);
            if (!c) return '<td>–</td>';
            return `<td><span class="celda"><span class="estado ${c.estado}">${ESTADOS[c.estado]}</span>
              <span class="nivel" aria-hidden="true"><i style="width:${Math.min(100, c.nivel_pct)}%"></i></span><small>${num(c.nivel_pct, 0)} % del frente</small></span></td>`;
          }).join('')}
        </tr>`).join('')}</tbody>`;
      const hora = new Date(v.hora).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      $('#nota-vivo').textContent = `· actualizado ${hora} · ${v.alertas_abiertas} alerta${v.alertas_abiertas === 1 ? '' : 's'} de reposición abierta${v.alertas_abiertas === 1 ? '' : 's'}`;
    } catch { /* reintenta en el próximo ciclo */ }
  }

  // ---------- carga ----------
  async function cargar() {
    try {
      const d = await api(`/api/insights/resumen?marca=${encodeURIComponent(estado.marca)}&dias=${estado.dias}&tienda=${estado.tienda}`);
      estado.datos = d;
      pintarEncabezado(d);
      pintarKpis(d);
      pintarSerie(d.serie);
      pintarTiendas(d.tiendas);
      pintarProductos(d.productos);
    } catch (error) {
      $('#titulo').textContent = 'No se pudo cargar el reporte';
      $('#hallazgo').textContent = `${error.message}. ¿Está corriendo el servidor (npm start)?`;
    }
    pintarVivo();
  }

  function exportarCsv() {
    if (!estado.datos) return;
    const filas = [['producto', 'ventas_q', 'unidades', 'variacion_pct', 'disponibilidad_pct', 'dias_con_quiebre', 'ventas_perdidas_q', 'cupones']];
    for (const p of estado.datos.productos) {
      filas.push([`${p.nombre} ${p.presentacion}`, p.ventas_q, p.unidades, p.variacion_pct ?? '', p.disponibilidad_pct, p.quiebres, p.perdidas_q, p.canjes]);
    }
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    enlace.download = `ralin-insights-${estado.marca.replace(/\s+/g, '-').toLowerCase()}-${estado.dias}d.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  // ---------- arranque ----------
  (async () => {
    try {
      const [marcas, tiendas] = await Promise.all([api('/api/insights/marcas'), api('/api/tiendas')]);
      $('#f-marca').innerHTML = marcas.map((m) => `<option value="${esc(m.marca)}" ${m.marca === estado.marca ? 'selected' : ''}>${esc(m.marca)} (${esc(m.categoria)})</option>`).join('')
        + '<option value="">Todas las marcas (vista RALIN)</option>';
      $('#f-tienda').insertAdjacentHTML('beforeend', tiendas.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join(''));
    } catch { /* cargar() mostrará el error */ }
    $('#f-marca').addEventListener('change', (e) => { estado.marca = e.target.value; cargar(); });
    $('#f-tienda').addEventListener('change', (e) => { estado.tienda = Number(e.target.value); cargar(); });
    document.querySelectorAll('input[name="dias"]').forEach((r) => r.addEventListener('change', (e) => { estado.dias = Number(e.target.value); cargar(); }));
    $('#btn-csv').addEventListener('click', exportarCsv);
    await cargar();
    setInterval(pintarVivo, 5000);
  })();
})();
