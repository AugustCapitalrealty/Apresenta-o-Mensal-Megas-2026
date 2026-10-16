// Recorta das REAL-* (CSV baixado do Drive) as linhas de AGO e SET/2026 da
// conta 3.30.01.15.01.031 + algumas de outras contas (para o filtro), e grava
// o fixture do teste da mensal. Uso: node gerar_fixture_real.js <real_cr.csv> <real_dm.csv> <saida.json>
const fs = require('fs');
const [cr, dm, saida] = process.argv.slice(2);
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
const recorte = arq => {
  const t = parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
  const h = t[0].map(x => x.trim().toLowerCase());
  const iComp = h.indexOf('competência'), iConta = h.indexOf('código conta') >= 0 ? h.indexOf('código conta') : h.indexOf('conta');
  const mes = s => /^(08|09)\/2026/.test(s) || /^(ago|set)\./i.test(s);
  const manut = t.slice(1).filter(r => mes(String(r[iComp]).trim()) && String(r[iConta]).indexOf('3.30.01.15.01.031') === 0);
  const outras = t.slice(1).filter(r => mes(String(r[iComp]).trim()) && String(r[iConta]).indexOf('3.30.01.15.01.031') !== 0).slice(0, 5);
  return [t[0]].concat(manut, outras);
};
fs.writeFileSync(saida, JSON.stringify({
  'REAL-CR-MANUTENCAO-PROPRIEDADES-2026': recorte(cr),
  'REAL-DM-MANUTENCAO-PROPRIEDADES-2026': recorte(dm)
}));
console.log('ok', saida);
