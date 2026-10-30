'use strict';
// Genera un código QR como SVG usando el codificador MIT de Kazuhiko Arase (lib/qr).
const QRCode = require('./qr');
const QRErrorCorrectLevel = require('./qr/QRErrorCorrectLevel');

function svgDeQR(texto, { margen = 4, color = '#10243F', fondo = '#FFFFFF' } = {}) {
  const qr = new QRCode(-1, QRErrorCorrectLevel.M);
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  const total = n + margen * 2;
  let d = '';
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(fila, col)) d += `M${col + margen} ${fila + margen}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${fondo}"/><path d="${d}" fill="${color}"/></svg>`;
}

module.exports = { svgDeQR };
