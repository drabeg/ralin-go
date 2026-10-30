'use strict';
// =============================================================
// Genera las ilustraciones vectoriales (SVG) de productos y categorías.
// Uso:  node scripts/ilustraciones.js
// Crea public/img/productos/<id>.svg y public/img/categorias/<id>.svg
// =============================================================
const fs = require('node:fs');
const path = require('node:path');

const SALIDA = path.join(__dirname, '..', 'public', 'img');
const FUENTE = "Arial, Helvetica, sans-serif";

// ---------- utilidades de color ----------
function mezclar(hex, otro, t) {
  const a = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  const b = otro.match(/\w\w/g).map((x) => parseInt(x, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const oscuro = (hex, t = 0.2) => mezclar(hex, '#000000', t);
const claro = (hex, t = 0.3) => mezclar(hex, '#ffffff', t);

function texto(x, y, contenido, ancho, color, { peso = 800, max = 11, min = 4.5, espaciado = 0.2 } = {}) {
  const tam = Math.max(min, Math.min(max, (ancho - 6) / (contenido.length * 0.62)));
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${FUENTE}" font-weight="${peso}" font-size="${tam.toFixed(1)}" letter-spacing="${espaciado}" fill="${color}">${contenido}</text>`;
}
const sombra = (rx = 30) => `<ellipse cx="60" cy="111" rx="${rx}" ry="4" fill="#10243F" opacity=".12"/>`;
const brillo = (x, y, alto) => `<rect x="${x}" y="${y}" width="3" height="${alto}" rx="1.5" fill="#fff" opacity=".35"/>`;
const envolver = (contenido) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${contenido}</svg>\n`;

// ---------- empaques ----------
function botella(o) {
  const cx = 60, w = o.ancho, top = o.tope, bot = 108, hw = w / 2, hom = top + 16;
  const cuerpo = `M${cx - 6} ${top + 4} L${cx - 6} ${top + 7} C${cx - 6} ${top + 11} ${cx - hw} ${top + 13} ${cx - hw} ${hom + 4} L${cx - hw} ${bot - 5} Q${cx - hw} ${bot} ${cx - hw + 5} ${bot} L${cx + hw - 5} ${bot} Q${cx + hw} ${bot} ${cx + hw} ${bot - 5} L${cx + hw} ${hom + 4} C${cx + hw} ${top + 13} ${cx + 6} ${top + 11} ${cx + 6} ${top + 7} L${cx + 6} ${top + 4} Z`;
  const yEtiqueta = Math.round((hom + bot) / 2) - 9;
  let s = sombra(hw + 4);
  s += `<defs><clipPath id="c"><path d="${cuerpo}"/></clipPath></defs>`;
  if (o.opaca) {
    s += `<path d="${cuerpo}" fill="${o.cuerpo}"/>`;
    s += `<rect x="${cx + hw - 8}" y="${top}" width="8" height="${bot - top}" fill="${oscuro(o.cuerpo, 0.12)}" clip-path="url(#c)"/>`;
  } else {
    s += `<path d="${cuerpo}" fill="${claro(o.liquido, 0.75)}"/>`;
    s += `<rect x="0" y="${hom + 2}" width="120" height="${bot}" fill="${o.liquido}" clip-path="url(#c)"/>`;
    s += `<rect x="${cx + hw - 7}" y="${top}" width="7" height="${bot - top}" fill="#000" opacity=".12" clip-path="url(#c)"/>`;
  }
  s += `<rect x="${cx - hw}" y="${yEtiqueta}" width="${w}" height="20" fill="${o.etiqueta}" clip-path="url(#c)"/>`;
  if (o.acento) s += `<rect x="${cx - hw}" y="${yEtiqueta + 17}" width="${w}" height="3" fill="${o.acento}" clip-path="url(#c)"/>`;
  s += texto(cx, yEtiqueta + 9, o.texto, w, o.textoColor || '#fff');
  s += brillo(cx - hw + 4, hom + 6, bot - hom - 16);
  s += `<rect x="${cx - 7}" y="${top - 4}" width="14" height="9" rx="2" fill="${o.tapa}"/><rect x="${cx - 7}" y="${top + 2}" width="14" height="2" fill="${oscuro(o.tapa, 0.25)}"/>`;
  return envolver(s);
}

function galon(o) {
  const cuerpo = 'M30 46 Q30 38 38 36 L52 32 L84 32 Q92 32 92 40 L92 102 Q92 108 86 108 L36 108 Q30 108 30 102 Z';
  const agujero = 'M70 39 h12 q4 0 4 4 v3 q0 4 -4 4 h-12 q-4 0 -4 -4 v-3 q0 -4 4 -4 Z';
  let s = sombra(34);
  s += `<defs><clipPath id="c"><path d="${cuerpo}"/></clipPath></defs>`;
  s += `<path d="${cuerpo} ${agujero}" fill-rule="evenodd" fill="${o.cuerpo}"/>`;
  s += `<rect x="84" y="30" width="8" height="80" fill="#000" opacity=".1" clip-path="url(#c)"/>`;
  s += `<rect x="38" y="58" width="46" height="36" rx="5" fill="${o.etiqueta}"/>`;
  s += texto(61, 71, o.texto, 46, o.textoColor || '#fff');
  if (o.sub) s += texto(61, 84, o.sub, 40, o.textoColor || '#fff', { peso: 700, max: 7.5 });
  s += brillo(35, 50, 48);
  s += `<rect x="38" y="20" width="16" height="13" rx="2" fill="${o.tapa}"/><rect x="38" y="27" width="16" height="2" fill="${oscuro(o.tapa, 0.25)}"/>`;
  return envolver(s);
}

function carton(o) {
  const blanco = '#F6F7F9';
  let s = sombra(28);
  s += `<polygon points="80,42 90,36 90,102 80,108" fill="${oscuro(blanco, 0.12)}"/>`;
  s += `<polygon points="74,28 84,22 90,36 80,42" fill="${oscuro(blanco, 0.18)}"/>`;
  s += `<rect x="44" y="20" width="32" height="8" fill="${oscuro(blanco, 0.06)}"/>`;
  s += `<polygon points="40,42 46,28 74,28 80,42" fill="${oscuro(blanco, 0.08)}"/>`;
  s += `<rect x="40" y="42" width="40" height="66" fill="${blanco}"/>`;
  s += `<rect x="40" y="66" width="40" height="28" fill="${o.color}"/>`;
  s += `<polygon points="80,66 90,60 90,88 80,94" fill="${oscuro(o.color, 0.2)}"/>`;
  s += texto(60, 75, o.texto, 40, '#fff');
  if (o.sub) s += texto(60, 87, o.sub, 40, '#fff', { peso: 700, max: 6.5 });
  s += adorno(o.adorno, 60, 54, o.color);
  return envolver(s);
}

function bolsa(o) {
  const cuerpo = 'M36 32 L84 32 Q89 70 86 102 Q86 108 80 108 L40 108 Q34 108 34 102 Q31 70 36 32 Z';
  let s = sombra(28);
  s += `<defs><clipPath id="c"><path d="${cuerpo}"/></clipPath></defs>`;
  s += `<path d="${cuerpo}" fill="${o.color}"/>`;
  if (o.brillante) s += `<path d="M44 34 Q40 70 44 104" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" clip-path="url(#c)"/>`;
  s += `<rect x="78" y="30" width="12" height="80" fill="#000" opacity=".1" clip-path="url(#c)"/>`;
  s += `<rect x="36" y="22" width="48" height="11" rx="1.5" fill="${oscuro(o.color, 0.18)}"/>`;
  for (let x = 39; x < 84; x += 4) s += `<line x1="${x}" y1="23" x2="${x}" y2="32" stroke="#000" stroke-opacity=".12" stroke-width="1"/>`;
  if (o.ventana) s += ventana(o.ventana);
  s += `<rect x="38" y="${o.ventana ? 44 : 58}" width="44" height="20" rx="4" fill="${o.etiqueta}"/>`;
  s += texto(60, (o.ventana ? 44 : 58) + 10, o.texto, 44, o.textoColor || '#fff');
  if (!o.ventana) s += adorno(o.adorno, 60, 86, o.color);
  if (o.valvula) s += `<circle cx="74" cy="40" r="3" fill="${oscuro(o.color, 0.3)}" stroke="#fff" stroke-opacity=".3"/>`;
  return envolver(s);
}

function ventana(tipo) {
  let s = '<rect x="44" y="70" width="32" height="30" rx="8" fill="#FBFAF5" stroke="#000" stroke-opacity=".08"/>';
  if (tipo === 'arroz') for (let i = 0; i < 26; i++) s += `<ellipse cx="${48 + (i * 7) % 26}" cy="${74 + Math.floor(i / 4) * 3.6}" rx="1.8" ry=".9" fill="#E7E1CE" transform="rotate(${(i * 37) % 180} ${48 + (i * 7) % 26} ${74 + Math.floor(i / 4) * 3.6})"/>`;
  if (tipo === 'azucar') for (let i = 0; i < 30; i++) s += `<rect x="${47 + (i * 5) % 26}" y="${73 + Math.floor(i / 5) * 4.2}" width="1.6" height="1.6" fill="#E9E5DA"/>`;
  if (tipo === 'pasta') for (let i = 0; i < 8; i++) s += `<line x1="${48 + i * 3.4}" y1="72" x2="${49 + i * 3.4}" y2="98" stroke="#E8C66B" stroke-width="1.6"/>`;
  return s;
}

function adorno(tipo, cx, cy, color) {
  switch (tipo) {
    case 'gota': return `<path d="M${cx} ${cy - 8} C${cx + 6} ${cy - 1} ${cx + 6} ${cy + 6} ${cx} ${cy + 6} C${cx - 6} ${cy + 6} ${cx - 6} ${cy - 1} ${cx} ${cy - 8} Z" fill="${color}"/>`;
    case 'fresa': return `<path d="M${cx} ${cy + 8} C${cx - 9} ${cy + 1} ${cx - 7} ${cy - 6} ${cx} ${cy - 5} C${cx + 7} ${cy - 6} ${cx + 9} ${cy + 1} ${cx} ${cy + 8} Z" fill="#D7263D"/><path d="M${cx - 5} ${cy - 6} L${cx} ${cy - 3} L${cx + 5} ${cy - 6} L${cx} ${cy - 9} Z" fill="#3E9B4F"/>`;
    case 'naranja': return `<circle cx="${cx}" cy="${cy}" r="7" fill="#F28C1E"/><path d="M${cx} ${cy - 7} q4 -4 7 -2 q-3 3 -7 2" fill="#3E9B4F"/>`;
    case 'mazorca': return `<ellipse cx="${cx}" cy="${cy}" rx="6" ry="11" fill="#F6D55C" stroke="${oscuro('#F6D55C', 0.25)}"/><path d="M${cx - 6} ${cy + 4} Q${cx - 12} ${cy - 4} ${cx - 8} ${cy - 12}" stroke="#4C8C3A" stroke-width="3" fill="none"/><path d="M${cx + 6} ${cy + 4} Q${cx + 12} ${cy - 4} ${cx + 8} ${cy - 12}" stroke="#4C8C3A" stroke-width="3" fill="none"/>`;
    case 'frijol': return [[-7, 0], [3, -4], [6, 6], [-3, 8]].map(([dx, dy]) => `<ellipse cx="${cx + dx}" cy="${cy + dy}" rx="5" ry="3.4" fill="#1A1220" stroke="#fff" stroke-opacity=".25" transform="rotate(${dx * 4} ${cx + dx} ${cy + dy})"/>`).join('');
    case 'grano': return `<ellipse cx="${cx}" cy="${cy}" rx="7" ry="9.5" fill="#C89B5A"/><path d="M${cx} ${cy - 9} Q${cx - 4} ${cy} ${cx} ${cy + 9}" stroke="${oscuro(color, 0.1)}" stroke-width="1.8" fill="none"/>`;
    case 'papa': return `<path d="M${cx - 10} ${cy + 2} Q${cx - 8} ${cy - 9} ${cx + 3} ${cy - 8} Q${cx + 12} ${cy - 5} ${cx + 9} ${cy + 4} Q${cx + 2} ${cy + 10} ${cx - 10} ${cy + 2} Z" fill="#F6D27A" stroke="#D9A93D"/>`;
    default: return '';
  }
}

function caja(o) {
  const { x0, y0, x1, y1 } = o; const d = o.fondo || 12;
  let s = sombra((x1 - x0) / 2 + 8);
  s += `<polygon points="${x0},${y0} ${x0 + d},${y0 - 8} ${x1 + d},${y0 - 8} ${x1},${y0}" fill="${claro(o.color, 0.18)}"/>`;
  s += `<polygon points="${x1},${y0} ${x1 + d},${y0 - 8} ${x1 + d},${y1 - 8} ${x1},${y1}" fill="${oscuro(o.color, 0.22)}"/>`;
  s += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${o.color}"/>`;
  if (o.franja) s += `<rect x="${x0}" y="${o.franja.y}" width="${x1 - x0}" height="${o.franja.alto}" fill="${o.franja.color}"/>`;
  const cx = (x0 + x1) / 2;
  s += cajaAdorno(o.adorno, cx, o, x0, x1, y0, y1);
  s += texto(cx, o.yTexto ?? y0 + 12, o.texto, x1 - x0, o.textoColor || '#fff');
  if (o.sub) s += texto(cx, (o.yTexto ?? y0 + 12) + 11, o.sub, x1 - x0, o.textoColor || '#fff', { peso: 700, max: 6.5 });
  return envolver(s);
}

function cajaAdorno(tipo, cx, o, x0, x1, y0, y1) {
  switch (tipo) {
    case 'estallido': return `<circle cx="${cx}" cy="${(y0 + y1) / 2 + 10}" r="14" fill="#fff" opacity=".9"/><path d="M${cx - 8} ${(y0 + y1) / 2 + 10} q8 -10 16 0 q-8 10 -16 0" fill="${o.color}" opacity=".7"/>`;
    case 'galletas': return [[-10, 12], [8, 16], [-2, 30]].map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${y0 + 20 + dy}" r="9" fill="#C68A4C"/><circle cx="${cx + dx - 3}" cy="${y0 + 18 + dy}" r="1.6" fill="#3B2014"/><circle cx="${cx + dx + 3}" cy="${y0 + 22 + dy}" r="1.6" fill="#3B2014"/><circle cx="${cx + dx + 1}" cy="${y0 + 16 + dy}" r="1.3" fill="#3B2014"/>`).join('');
    case 'jabones': return [-14, 0, 14].map((dx) => `<ellipse cx="${cx + dx}" cy="${y1 - 11}" rx="6" ry="4.5" fill="#fff" opacity=".85"/>`).join('');
    case 'ventana-pasta': return `<rect x="${x0 + 5}" y="${y0 + 28}" width="${x1 - x0 - 10}" height="${y1 - y0 - 36}" rx="5" fill="#FBF6E6"/>` +
      Array.from({ length: 5 }, (_, i) => `<line x1="${x0 + 9 + i * 4}" y1="${y0 + 31}" x2="${x0 + 9 + i * 4}" y2="${y1 - 11}" stroke="#E2BB55" stroke-width="1.8"/>`).join('');
    case 'diente': return `<rect x="${x0}" y="${y0 + (y1 - y0) / 2 - 3}" width="${x1 - x0}" height="6" fill="#1F6FB2" opacity=".25"/>`;
    default: return '';
  }
}

function cilindro(o) {
  let s = sombra(26);
  s += `<rect x="38" y="34" width="44" height="72" fill="${o.color}"/><ellipse cx="60" cy="106" rx="22" ry="5" fill="${o.color}"/>`;
  s += `<rect x="72" y="34" width="10" height="72" fill="#000" opacity=".08"/>`;
  s += `<rect x="38" y="58" width="44" height="30" fill="${o.etiqueta}"/>`;
  s += texto(60, 68, o.texto, 44, '#fff');
  s += texto(60, 80, o.sub, 44, '#fff', { peso: 700, max: 6.5 });
  s += `<ellipse cx="60" cy="34" rx="22" ry="5.5" fill="${o.tapa}"/><ellipse cx="60" cy="33" rx="18" ry="3.8" fill="${claro(o.tapa, 0.25)}"/>`;
  s += brillo(42, 40, 60);
  return envolver(s);
}

function queso(o) {
  let s = sombra(32);
  s += `<rect x="28" y="58" width="64" height="36" fill="#F7F2E4"/><ellipse cx="60" cy="94" rx="32" ry="10" fill="#EFE7D2"/>`;
  s += `<ellipse cx="60" cy="58" rx="32" ry="10" fill="#FFFBF0"/>`;
  s += `<rect x="28" y="70" width="64" height="16" fill="${o.color}"/>`;
  s += texto(60, 78, o.texto, 60, '#fff');
  s += `<path d="M28 58 Q28 48 60 48 Q92 48 92 58" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`;
  return envolver(s);
}

function huevos(o) {
  let s = sombra(36);
  s += `<polygon points="24,74 96,74 92,104 28,104" fill="#C9D2DB"/><polygon points="24,74 96,74 92,80 28,80" fill="#B6C1CC"/>`;
  for (let fila = 0; fila < 3; fila++) {
    for (let col = 0; col < 5; col++) {
      const x = 33 + col * 13.5 + fila * 1.5; const y = 50 + fila * 9;
      s += `<ellipse cx="${x}" cy="${y}" rx="6.2" ry="7.6" fill="${fila % 2 ? '#F0DDBF' : '#F6E6CC'}"/><ellipse cx="${x - 2}" cy="${y - 3}" rx="1.6" ry="2.4" fill="#fff" opacity=".6"/>`;
    }
  }
  s += `<rect x="44" y="84" width="32" height="14" rx="7" fill="${o.color}"/>`;
  s += texto(60, 91, o.texto, 32, '#4A3200', { max: 7.5 });
  return envolver(s);
}

function papel(o) {
  let s = sombra(36);
  const rollo = (x, y, sombraT) => `<rect x="${x}" y="${y}" width="22" height="56" rx="3" fill="${mezclar('#FFFFFF', '#C9CDD6', sombraT)}"/><ellipse cx="${x + 11}" cy="${y}" rx="11" ry="4" fill="#FFFFFF" stroke="#D8DCE3"/><ellipse cx="${x + 11}" cy="${y}" rx="3.2" ry="1.4" fill="#C9B79C"/>`;
  [32, 54, 76].forEach((x) => { s += rollo(x - 2, 38, 0.35); });
  [26, 48, 70].forEach((x) => { s += rollo(x, 48, 0.12); });
  s += `<rect x="26" y="74" width="66" height="18" fill="${o.color}" opacity=".95"/>`;
  s += texto(59, 83, o.texto, 66, '#fff');
  s += `<rect x="24" y="36" width="70" height="70" rx="6" fill="${o.color}" opacity=".08"/>`;
  return envolver(s);
}

function pan(o) {
  let s = sombra(36);
  s += `<path d="M26 70 Q26 44 46 44 Q60 36 74 44 Q94 44 94 70 L94 98 Q94 104 88 104 L32 104 Q26 104 26 98 Z" fill="${o.miga}"/>`;
  s += `<path d="M26 70 Q26 44 46 44 Q60 36 74 44 Q94 44 94 70 Q60 62 26 70 Z" fill="${oscuro(o.miga, 0.18)}"/>`;
  if (o.semillas) for (let i = 0; i < 9; i++) s += `<ellipse cx="${36 + i * 6}" cy="${52 + (i % 3) * 3}" rx="1.4" ry=".8" fill="#F3E2B3"/>`;
  s += `<path d="M22 66 Q22 40 46 40 Q60 32 74 40 Q98 40 98 66 L98 100 Q98 108 90 108 L30 108 Q22 108 22 100 Z" fill="#fff" opacity=".22" stroke="#fff" stroke-opacity=".6"/>`;
  s += `<rect x="40" y="76" width="40" height="18" rx="9" fill="${o.etiqueta}"/>`;
  s += texto(60, 85, o.texto, 40, '#fff');
  s += `<path d="M98 56 l8 -4 l-2 8 z" fill="${o.etiqueta}"/>`;
  return envolver(s);
}

// ---------- catálogo (id = id de producto en db/seed.js) ----------
const PRODUCTOS = {
  1: () => botella({ ancho: 38, tope: 14, liquido: '#4A2416', tapa: '#C8302F', etiqueta: '#C8302F', texto: 'Chispa' }),
  2: () => botella({ ancho: 38, tope: 14, liquido: '#F28C1E', tapa: '#F28C1E', etiqueta: '#C8302F', acento: '#F7B32B', texto: 'Chispa' }),
  3: () => botella({ ancho: 26, tope: 36, liquido: '#CFE7F6', tapa: '#1F5FA8', etiqueta: '#1F5FA8', texto: 'VOLCÁN' }),
  4: () => botella({ ancho: 38, tope: 14, liquido: '#CFE7F6', tapa: '#1F5FA8', etiqueta: '#1F5FA8', texto: 'Volcán Azul' }),
  5: () => carton({ color: '#F08A1C', texto: 'Huerto Real', sub: 'NARANJA', adorno: 'naranja' }),
  6: () => botella({ ancho: 26, tope: 34, liquido: '#56C7E0', tapa: '#1C8C6E', etiqueta: '#14324F', texto: 'RÁFAGA' }),
  7: () => carton({ color: '#1F5FA8', texto: 'Nevada', sub: 'ENTERA', adorno: 'gota' }),
  8: () => carton({ color: '#3A9BD9', texto: 'Nevada', sub: 'SIN LACTOSA', adorno: 'gota' }),
  9: () => carton({ color: '#D9476B', texto: 'Nevada', sub: 'YOGUR DE FRESA', adorno: 'fresa' }),
  10: () => queso({ color: '#2E8B57', texto: 'Las Nubes' }),
  11: () => caja({ x0: 34, y0: 72, x1: 82, y1: 104, color: '#E3B23C', texto: 'Nevada', sub: 'MANTEQUILLA', yTexto: 82, textoColor: '#4A3200' }),
  12: () => bolsa({ color: '#E9B949', etiqueta: '#8A5A00', texto: 'Grano de Oro', ventana: 'arroz' }),
  13: () => bolsa({ color: '#3B2A4A', etiqueta: '#F2C12E', textoColor: '#3B2A4A', texto: 'Maizal', adorno: 'frijol', brillante: true }),
  14: () => botella({ ancho: 34, tope: 18, liquido: '#E5B53A', tapa: '#2E7D32', etiqueta: '#2E7D32', texto: 'Doña Clara' }),
  15: () => bolsa({ color: '#F2C12E', etiqueta: '#2E7D32', texto: 'Maizal', adorno: 'mazorca' }),
  16: () => caja({ x0: 44, y0: 26, x1: 74, y1: 108, fondo: 8, color: '#1E6B3A', franja: { y: 26, alto: 22, color: '#C8302F' }, texto: 'Toscana', yTexto: 37, adorno: 'ventana-pasta' }),
  17: () => bolsa({ color: '#F1EEE6', etiqueta: '#3C8D2F', texto: 'Caña Dulce', ventana: 'azucar' }),
  18: () => galon({ cuerpo: '#14A3A3', tapa: '#0E5E73', etiqueta: '#FFFFFF', textoColor: '#0E5E73', texto: 'Brisa Clara', sub: 'LÍQUIDO 1.8 L' }),
  19: () => caja({ x0: 36, y0: 34, x1: 78, y1: 108, color: '#14A3A3', texto: 'Brisa Clara', sub: 'EN POLVO', adorno: 'estallido' }),
  20: () => papel({ color: '#8C6BC8', texto: 'Suave Nube' }),
  21: () => botella({ ancho: 28, tope: 26, opaca: true, cuerpo: '#7CC242', tapa: '#14A3A3', etiqueta: '#FFFFFF', textoColor: '#0E5E73', texto: 'Brisa Clara' }),
  22: () => galon({ cuerpo: '#EEF2F6', tapa: '#1F5FA8', etiqueta: '#1F5FA8', texto: 'Puro Blanco', sub: 'CLORO' }),
  23: () => pan({ miga: '#E8B877', etiqueta: '#F08A1C', texto: 'Aurora' }),
  24: () => pan({ miga: '#A86B36', etiqueta: '#7A4A1E', texto: 'Aurora', semillas: true }),
  25: () => caja({ x0: 30, y0: 46, x1: 82, y1: 108, color: '#5A3420', texto: 'Crocante', adorno: 'galletas' }),
  26: () => bolsa({ color: '#F2C12E', etiqueta: '#C8302F', texto: 'Crocante', adorno: 'papa', brillante: true }),
  27: () => bolsa({ color: '#3B2416', etiqueta: '#C89B5A', textoColor: '#3B2416', texto: 'Cafetal', adorno: 'grano', valvula: true }),
  28: () => cilindro({ color: '#F1E3C2', tapa: '#4C8C3A', etiqueta: '#4C8C3A', texto: 'Campo Verde', sub: 'AVENA' }),
  29: () => huevos({ color: '#F2B705', texto: 'Granja Sol' }),
  30: () => caja({ x0: 22, y0: 64, x1: 88, y1: 94, color: '#E4EEF9', franja: { y: 64, alto: 9, color: '#1F6FB2' }, texto: 'Sonrisa+', textoColor: '#1F6FB2', yTexto: 83 }),
  31: () => caja({ x0: 28, y0: 66, x1: 86, y1: 104, color: '#E58BB0', texto: 'Pureza', yTexto: 76, adorno: 'jabones' }),
  32: () => botella({ ancho: 30, tope: 24, opaca: true, cuerpo: '#6A4BB5', tapa: '#2F2257', etiqueta: '#FFFFFF', textoColor: '#6A4BB5', texto: 'Cascada' }),
};

// ---------- íconos de categorías (trazo) ----------
const T = 'fill="none" stroke="#10243F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const A = 'fill="#E9A23B" fill-opacity=".35"';
const icono = (contenido) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${contenido}</svg>\n`;
const CATEGORIAS = {
  1: icono(`<path ${A} d="M18 24h12v14H18z"/><path ${T} d="M21 6h6v5c0 2 4 4 4 9v20a2 2 0 0 1-2 2H19a2 2 0 0 1-2-2V20c0-5 4-7 4-9z"/><path ${T} d="M17 24h14M17 38h14"/>`),
  2: icono(`<path ${A} d="M15 26h18v10H15z"/><path ${T} d="M19 5h10v5l4 8v24H15V18l4-8z"/><path ${T} d="M15 18h18M19 10h10"/>`),
  3: icono(`<path ${A} d="M14 28c0 8 2 14 10 14s10-6 10-14z"/><path ${T} d="M17 12c-4 6-6 13-6 20 0 7 4 10 13 10s13-3 13-10c0-7-2-14-6-20"/><path ${T} d="M16 12h16M19 6l5 6 5-6"/>`),
  4: icono(`<path ${A} d="M17 26h14v14H17z"/><path ${T} d="M18 18h12l2 6v16a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V24z"/><path ${T} d="M20 18v-6h10l4 4M30 12h-8M37 9l3-2M37 14h3M37 19l3 2"/>`),
  5: icono(`<path ${A} d="M10 30h28v8H10z"/><path ${T} d="M10 38V24c-3 0-4-3-4-5 0-5 8-8 18-8s18 3 18 8c0 2-1 5-4 5v14a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z"/><path ${T} d="M20 22v12M28 22v12"/>`),
  6: icono(`<circle ${A} cx="24" cy="24" r="12"/><circle ${T} cx="24" cy="24" r="16"/><path ${T} d="M18 18h.01M28 16h.01M30 27h.01M19 30h.01M24 23h.01"/>`),
  7: icono(`<path ${A} d="M10 26h24v6a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z"/><path ${T} d="M8 22h28v10a10 10 0 0 1-10 10h-8A10 10 0 0 1 8 32z"/><path ${T} d="M36 25h2a5 5 0 0 1 0 10h-3M16 8c-2 3 2 5 0 8M23 6c-2 3 2 5 0 8M30 8c-2 3 2 5 0 8"/>`),
  8: icono(`<rect ${A} x="9" y="24" width="24" height="14" rx="7"/><rect ${T} x="7" y="22" width="28" height="18" rx="9"/><circle ${T} cx="34" cy="12" r="4"/><circle ${T} cx="24" cy="10" r="2.5"/><circle ${T} cx="41" cy="22" r="2"/>`),
};

fs.mkdirSync(path.join(SALIDA, 'productos'), { recursive: true });
fs.mkdirSync(path.join(SALIDA, 'categorias'), { recursive: true });
for (const [id, crear] of Object.entries(PRODUCTOS)) fs.writeFileSync(path.join(SALIDA, 'productos', `${id}.svg`), crear());
for (const [id, svg] of Object.entries(CATEGORIAS)) fs.writeFileSync(path.join(SALIDA, 'categorias', `${id}.svg`), svg);
console.log(`Listo: ${Object.keys(PRODUCTOS).length} productos y ${Object.keys(CATEGORIAS).length} categorías en public/img/`);
