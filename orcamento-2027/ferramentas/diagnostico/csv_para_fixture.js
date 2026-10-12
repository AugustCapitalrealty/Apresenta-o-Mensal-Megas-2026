// CSV exportado do Drive ("Valores do Modelo") → matriz JSON como o getValues():
// código da unidade e meses viram número (pt-BR "-26.708,65" → -26708.65).
// Uso: node csv_para_fixture.js <entrada.csv> <saida.json>
const fs = require('fs');
const [, , ent, sai] = process.argv;
const t = fs.readFileSync(ent, 'utf8');
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
const br = v => { const n = +String(v).replace(/\./g, '').replace(',', '.'); if (!isFinite(n)) throw new Error('número inválido: ' + v); return n; };
const m = L.filter(r => r.length > 1).map((r, i) => i === 0 ? r : r.map((v, j) => (j === 1 && /^\d+$/.test(v)) ? +v : (j >= 8 && j <= 19) ? br(v) : v));
if (m.some((r, i) => i && r.length !== m[0].length)) throw new Error('linha com número de colunas diferente do cabeçalho');
fs.writeFileSync(sai, JSON.stringify(m));
console.log(sai.split(/[\\/]/).pop() + ': ' + (m.length - 1) + ' linhas × ' + m[0].length + ' colunas');
