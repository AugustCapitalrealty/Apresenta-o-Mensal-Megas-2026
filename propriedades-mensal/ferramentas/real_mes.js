// Soma o realizado por mês × centro de custo das planilhas REAL (CSV vírgula).
// Uso: node real_mes.js <real_cr.csv> <real_dm.csv> [filtroConta]
const fs = require('fs');
const [cr, dm, filtro] = process.argv.slice(2);
const parse = txt => {
  const out = []; let row = [], c = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(c); c = ''; }
    else if (ch === '\n') { row.push(c.replace(/\r$/, '')); out.push(row); row = []; c = ''; }
    else c += ch;
  }
  if (c || row.length) { row.push(c); out.push(row); }
  return out;
};
const num = s => { s = String(s || '').trim(); if (!s) return 0; if (/,\d{1,2}$/.test(s) || s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return +s || 0; };
const MES = { 'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12 };
const mesDe = s => { s = String(s).trim().toLowerCase(); let m = s.match(/^(\d{2})\/\d{4}/); if (m) return +m[1]; m = s.match(/^([a-zç]{3})/); return m ? MES[m[1]] : 0; };

const linhas = [];
const ler = (arq, emp) => {
  const t = parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
  const h = t[0].map(x => x.trim());
  const ix = n => h.indexOf(n);
  t.slice(1).forEach(r => {
    if (r.length < 5) return;
    const g = k => (ix(k) >= 0 ? r[ix(k)] : '');
    const cc = (g('Código Centro de custo') ? g('Código Centro de custo') + ' - ' + g('Centro de custo') : g('Centro de custo')).replace(/\|/g, '');
    const conta = g('Código Conta') ? g('Código Conta') + ' - ' + g('Conta') : g('Conta');
    linhas.push({ emp, mes: mesDe(g('Competência')), v: num(g('Valor')), cc, conta, ger: g('Estrutura da conta gerencial'), doc: g('Documento'), hist: g('Histórico') });
  });
};
ler(cr, 'CR'); ler(dm, 'DM');
const f = filtro || 'MANUTENÇÃO PREDIAL';
const sel = linhas.filter(l => l.conta.toUpperCase().includes(f.toUpperCase()) || l.ger === '06.04.15.01');
const contas = {}; sel.forEach(l => contas[l.conta + ' [' + l.ger + ']'] = 1);
console.log('Contas consideradas:', Object.keys(contas));
const ag = {};
sel.forEach(l => { const k = l.emp + ' | ' + l.cc; ag[k] = ag[k] || Array(13).fill(0); ag[k][l.mes] += l.v; });
const fmt = v => (Math.round(v * 100) / 100).toFixed(2).padStart(12);
console.log('\nCentro de custo'.padEnd(52) + ['JUL', 'AGO', 'SET', 'OUT'].map(x => x.padStart(12)).join(''));
const tot = { CR: Array(13).fill(0), DM: Array(13).fill(0) };
Object.keys(ag).sort().forEach(k => { const a = ag[k]; if ([7, 8, 9, 10].every(m => Math.abs(a[m]) < 0.005)) return; console.log(k.slice(0, 50).padEnd(52) + [7, 8, 9, 10].map(m => fmt(a[m])).join('')); a.forEach((v, m) => tot[k.slice(0, 2)][m] += v); });
['CR', 'DM'].forEach(e => console.log(('TOTAL ' + e).padEnd(52) + [7, 8, 9, 10].map(m => fmt(tot[e][m])).join('')));
console.log('\nAcumulado por CC (JAN–AGO | JAN–SET):');
Object.keys(ag).sort().forEach(k => { const a = ag[k]; const s8 = a.slice(1, 9).reduce((x, y) => x + y, 0), s9 = s8 + a[9]; if (Math.abs(s9) > 0.005) console.log(k.slice(0, 50).padEnd(52) + fmt(s8) + fmt(s9)); });
['CR', 'DM'].forEach(e => { const s8 = sel.filter(l => l.emp === e && l.mes >= 1 && l.mes <= 8).reduce((x, l) => x + l.v, 0); const s9 = s8 + sel.filter(l => l.emp === e && l.mes === 9).reduce((x, l) => x + l.v, 0); console.log(('TOTAL ' + e).padEnd(52) + fmt(s8) + fmt(s9)); });
console.log('\nMeses presentes:', [...new Set(linhas.map(l => l.emp + ':' + l.mes))].sort().join(' '));
console.log('\nLançamentos de SET (manutenção):');
sel.filter(l => l.mes === 9).forEach(l => console.log(l.emp, fmt(l.v), l.cc.slice(0, 40).padEnd(40), String(l.doc).padEnd(14), l.hist.slice(0, 70)));
