// Modelo exportado (JSON {content: base64} de um CSV "Valores do Modelo"): procura itens
// pelo regex e resume as unidades dos Megas. Uso: node modelo_busca.js <arquivo.json> <regex>
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
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
const num = v => -(+String(v).replace(/\./g, '').replace(',', '.') || 0);
console.log((j.title || '') + ': ' + (L.length - 1) + ' linhas · cabeçalho: ' + L[0].slice(0, 9).join(' | '));
const re = new RegExp(process.argv[3], 'i');
L.slice(1).filter(r => re.test(r[5] || '')).forEach(r => console.log('  ' + r[1] + ' ' + r[2] + ' | ' + r[0] + ' | ' + r[5] + ' → ' + r.slice(8, 20).map(num).map(v => Math.round(v)).join(' ')));
const tot = {};
L.slice(1).filter(r => /^(60|19|18)$/.test(r[1])).forEach(r => { tot[r[2]] = (tot[r[2]] || 0) + r.slice(8, 20).map(num).reduce((a, v) => a + v, 0); });
console.log('  totais dos Megas: ' + JSON.stringify(Object.keys(tot).reduce((o, k) => { o[k] = Math.round(tot[k]); return o; }, {})));
