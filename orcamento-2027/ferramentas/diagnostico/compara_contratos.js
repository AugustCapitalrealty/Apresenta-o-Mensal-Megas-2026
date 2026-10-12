// Compara dois cadastros de contratos 2027 (CSV exportado do Drive, JSON {content: base64}):
// total do ano por Mega × contrato × conta. Uso: node compara_contratos.js <antes.json> <depois.json>
const fs = require('fs');
function ler(f) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const t = Buffer.from(j.content, 'base64').toString('utf8');
  const L = []; let c = '', l = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"' && c === '') q = true;
    else if (ch === ',') { l.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; l.push(c); L.push(l); l = []; c = ''; }
    else c += ch;
  }
  if (c !== '' || l.length) { l.push(c); L.push(l); }
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const cab = L[0].map(norm);
  const iU = cab.indexOf('unidade'), iN = cab.indexOf('nome'), iC = cab.indexOf('codigo'), iV = cab.indexOf('valorizacao'), iIni = cab.indexOf('data inicio'), iFim = cab.indexOf('data fim');
  const meses = cab.map((h, k) => /^[a-z]{3}\.\/27$/.test(h) ? k : -1).filter(k => k >= 0);
  const num = v => Math.abs(+String(v).replace(/\./g, '').replace(',', '.') || 0);
  const out = {};
  L.slice(1).filter(r => /^mega (curitiba|itajai|esteio)$/.test(norm(r[iU]))).forEach(r => {
    const k = r[iU] + ' | ' + r[iV] + ' | ' + (r[iN] || '').trim() + ' [' + (r[iC] || '').trim() + ']';
    const e = out[k] || (out[k] = { total: 0, ini: r[iIni], fim: r[iFim], meses: Array(12).fill(0) });
    meses.forEach((col, m) => { const v = num(r[col]); e.total += v; e.meses[m] += v; });
  });
  return { linhas: L.length - 1, meses: meses.length, porK: out };
}
const A = ler(process.argv[2]), B = ler(process.argv[3]);
console.log('antes: ' + A.linhas + ' linhas, ' + A.meses + ' meses · depois: ' + B.linhas + ' linhas, ' + B.meses + ' meses');
const R = v => Math.round(v).toLocaleString('pt-BR');
const ks = Array.from(new Set(Object.keys(A.porK).concat(Object.keys(B.porK)))).sort();
let iguais = 0;
const porMega = {};
ks.forEach(k => {
  const a = A.porK[k], b = B.porK[k], ta = a ? a.total : 0, tb = b ? b.total : 0, mega = k.split(' | ')[0];
  porMega[mega] = porMega[mega] || [0, 0]; porMega[mega][0] += ta; porMega[mega][1] += tb;
  if (Math.abs(ta - tb) < 0.5) { iguais++; return; }
  console.log((a ? (b ? 'MUDOU ' : 'SAIU  ') : 'ENTROU') + ' ' + k + ' · ' + R(ta) + ' → ' + R(tb) + ' (' + (tb - ta >= 0 ? '+' : '') + R(tb - ta) + ')' +
    (b && a && b.ini !== a.ini ? ' · início ' + a.ini + ' → ' + b.ini : '') + (b && !a ? ' · início ' + b.ini : ''));
});
console.log('iguais: ' + iguais + ' de ' + ks.length);
Object.keys(porMega).forEach(m => console.log(m + ': ' + R(porMega[m][0]) + ' → ' + R(porMega[m][1]) + ' (' + (porMega[m][1] - porMega[m][0] >= 0 ? '+' : '') + R(porMega[m][1] - porMega[m][0]) + ')'));
