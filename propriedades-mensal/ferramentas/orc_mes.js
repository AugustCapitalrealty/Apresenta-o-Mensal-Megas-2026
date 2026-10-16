// Orçado 2026 original (exports "Valores do Modelo", ;) por centro de custo: SET, JAN–SET e ano.
// Uso: node orc_mes.js <pasta Orçamento-2026> [mes=9]
const fs = require('fs'), path = require('path');
const [dir, mesArg] = process.argv.slice(2);
const MES = +(mesArg || 9);
const parse = txt => {
  const out = []; let row = [], c = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ';') { row.push(c); c = ''; }
    else if (ch === '\n') { row.push(c.replace(/\r$/, '')); out.push(row); row = []; c = ''; }
    else c += ch;
  }
  if (c || row.length) { row.push(c); out.push(row); }
  return out;
};
const num = s => +String(s || '0').replace(',', '.') || 0;
const ag = {};
fs.readdirSync(dir).filter(f => /\.csv$/i.test(f)).forEach(f => {
  const t = parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
  const h = t[0]; const i1 = h.indexOf('Mês 1');
  t.slice(1).forEach(r => {
    if (!/^manuten/i.test(String(r[0]).trim())) return;
    const cc = (r[2] + ' | ' + r[3] + ' ' + r[4]).replace(/\|(?=\d)/, '');
    const m = []; for (let k = 0; k < 12; k++) m.push(num(r[i1 + k]));
    const a = ag[cc] = ag[cc] || { mes: 0, acum: 0, ano: 0, n: 0, itens: [] };
    a.mes += m[MES - 1]; a.acum += m.slice(0, MES).reduce((x, y) => x + y, 0); a.ano += m.reduce((x, y) => x + y, 0); a.n++;
    if (m[MES - 1]) a.itens.push(m[MES - 1].toFixed(2) + '  ' + String(r[5]).replace(/\s+/g, ' ').slice(0, 80));
  });
});
const fmt = v => v.toFixed(2).padStart(12);
console.log('Centro de custo'.padEnd(58) + 'MES'.padStart(12) + 'JAN-MES'.padStart(12) + 'ANO'.padStart(12));
const tot = {};
Object.keys(ag).sort().forEach(k => { const a = ag[k]; console.log(k.slice(0, 56).padEnd(58) + fmt(a.mes) + fmt(a.acum) + fmt(a.ano)); const e = k.split(' | ')[0]; tot[e] = tot[e] || [0, 0, 0]; tot[e][0] += a.mes; tot[e][1] += a.acum; tot[e][2] += a.ano; });
Object.entries(tot).forEach(([e, t]) => console.log(('TOTAL ' + e).padEnd(58) + t.map(fmt).join('')));
console.log('\nItens orçados no mês:');
Object.keys(ag).sort().forEach(k => ag[k].itens.forEach(i => console.log(k.split(' | ')[1].slice(0, 35).padEnd(36), i)));
