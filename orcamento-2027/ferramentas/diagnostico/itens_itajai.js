// Itens de Itajaí (unidade 19) que batem com o regex, na exportação antiga
// (fixture_090_itajai_2027.json) e na de 12/10/2026 (fixture_090_megas_2027.json).
// Uso: node itens_itajai.js <pasta teste> <regex>
const path = require('path');
const [, , TESTE, padrao] = process.argv;
const re = new RegExp(padrao, 'i');
const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
[['ANTES (fixture_090_itajai_2027)', 'fixture_090_itajai_2027.json'], ['HOJE (exportação 12/10)', 'fixture_090_megas_2027.json']].forEach(([rot, f]) => {
  const m = require(path.join(TESTE, f));
  console.log('== ' + rot);
  m.slice(1).filter(r => String(r[1]) === '19' && re.test(String(r[5]))).forEach(r => {
    const v = r.slice(8, 20).map(x => typeof x === 'number' ? x : 0);
    const com = v.map((x, i) => Math.abs(x) > 0.5 ? meses[i] + ' ' + Math.round(-x) : null).filter(Boolean).join(', ');
    console.log('  [' + r[0] + '] ' + r[5] + '  →  ' + (com || 'zerado'));
  });
});
