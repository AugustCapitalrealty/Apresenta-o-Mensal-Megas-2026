// Resumo por unidade + centro de custo de matrizes "Valores do Modelo".
// Uso: node unidades.js <arquivo.json|arquivo.csv> ...
const fs = require('fs');
function csv(t) {
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
  return L;
}
const num = v => typeof v === 'number' ? v : (+String(v).replace(/\./g, '').replace(',', '.') || 0);
process.argv.slice(2).forEach(f => {
  const m = f.endsWith('.csv') ? csv(fs.readFileSync(f, 'utf8')) : JSON.parse(fs.readFileSync(f, 'utf8'));
  const c = {};
  m.slice(1).forEach(r => {
    if (!r[0]) return;
    const k = r[1] + ' ' + r[2] + ' | ' + r[4];
    const t = r.slice(8, 20).reduce((a, v) => a + num(v), 0);
    c[k] = c[k] || { n: 0, t: 0 }; c[k].n++; c[k].t += t;
  });
  console.log('== ' + f.split(/[\\/]/).pop() + ' (' + (m.length - 1) + ' linhas)');
  Object.keys(c).sort().forEach(k => console.log('  ' + k + '  linhas ' + c[k].n + '  total ' + Math.round(-c[k].t).toLocaleString('pt-BR')));
});
