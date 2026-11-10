// Monta o bloco B27:AA43 da aba "RITMO 2026 - MANUTENÇÕES" (PLANILHA PROPRIEDADES) a partir
// do export da controladoria por conta × centro de custo (Propriedades-Certo.csv, todos os
// centros das empresas 11 e 61). Só a linha 06.04.15.01 e os centros de custo são lidos pelo
// DRE de Manutenção; subtotais (06.04.15, 06.04.15.01, 010, 070) e Totais são recalculados
// somando só os centros que a aba lista. Os centros com manutenção fora da aba são listados.
// Uso: baixe a PLANILHA PROPRIEDADES como planilha_prop.xlsx (npm i xlsx@0.18.5) e rode
//   node bloco_manut.js <Propriedades-Certo.csv> <saida.tsv>   → colar em B27.
// Bloco B27:AA43 da aba "RITMO 2026 - MANUTENÇÕES" a partir do export por conta × centro de custo.
const fs = require('fs'), X = require('xlsx');
const a = X.utils.sheet_to_json(X.readFile('planilha_prop.xlsx').Sheets['RITMO 2026 - MANUTENÇÕES'], { header: 1, raw: true });
const t = fs.readFileSync(process.argv[2], 'latin1').trim().split(/\r?\n/).slice(1).map(l => l.split(';'));
const n = s => parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0, cl = s => String(s).replace(/[="]/g, '');
const csv = {};
t.forEach(c => { if (!cl(c[0]).startsWith('06.04.15')) return; const k = cl(c[4]).replace('|', '');
  csv[k] = csv[k] || { nome: c[5].replace(/"/g, ''), v: Array(24).fill(0) }; for (let i = 0; i < 24; i++) csv[k].v[i] += n(c[8 + i]); });
const Z = () => Array(24).fill(0), add = (x, y) => x.map((v, i) => v + y[i]);
const linhas = [], usados = {};
let grupo = null; const grupos = {};
for (let i = 26; i <= 42; i++) {                       // linhas 27..43 da aba
  const rot = String(a[i][0] || '').trim(), cod = rot.split(' - ')[0];
  let v;
  if (/^\d{2}\.\d{2}\.\d{2}\.\d{3}$/.test(cod)) { v = csv[cod] ? csv[cod].v : Z(); usados[cod] = 1; grupos[grupo] = add(grupos[grupo], v); }
  else if (/^0[17]0$/.test(cod)) { grupo = cod; grupos[grupo] = Z(); v = null; }
  else v = null;                                       // 06.04.15 / 06.04.15.01: total
  linhas.push({ i, rot, cod, v });
}
const totalGeral = add(grupos['010'], grupos['070']);
linhas.forEach(l => { if (!l.v) l.v = /^0[17]0$/.test(l.cod) ? grupos[l.cod] : totalGeral; });
const r2 = x => Math.round(x * 100) / 100, M = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const out = [], dif = [];
linhas.forEach(l => {
  let tp = 0, tr = 0; for (let m = 0; m < 12; m++) { tp += l.v[2 * m]; tr += l.v[2 * m + 1]; }
  const row = [...l.v.map(r2), r2(tp), r2(tr)];
  for (let c = 0; c < 16; c++) { const old = a[l.i][1 + c] || 0; if (Math.abs(old - row[c]) > 0.01) dif.push('linha ' + (l.i + 1) + ' ' + l.cod + ' ' + M[c >> 1] + (c % 2 ? 'R' : 'P') + ': aba ' + old + ' → ' + row[c]); }
  out.push(row.map(x => x.toFixed(2).replace('.', ',')).join('\t'));
});
fs.writeFileSync(process.argv[3], out.join('\r\n') + '\r\n', 'utf8');
console.log('Diferenças JAN–AGO contra a aba atual:'); dif.forEach(d => console.log('  ' + d));
const s = (v, m) => Math.round(v[2 * m + 1]).toLocaleString('pt-BR');
console.log('\nRealizado 06.04.15 (centros da aba): Set', s(totalGeral, 8), '· Out', s(totalGeral, 9));
console.log('Ritmo restante: Nov', Math.round(totalGeral[20]).toLocaleString('pt-BR'), '· Dez', Math.round(totalGeral[22]).toLocaleString('pt-BR'));
console.log('\nCentros com manutenção no CSV que NÃO estão na aba (ficam fora do DRE):');
Object.keys(csv).filter(k => !usados[k]).forEach(k => { const v = csv[k].v; const tr = v.filter((_, i) => i % 2).reduce((x, y) => x + y, 0);
  console.log('  ' + k + ' ' + csv[k].nome.padEnd(32) + ' real no ano ' + Math.round(tr).toLocaleString('pt-BR') +
    ' (Set ' + Math.round(v[17]) + ', Out ' + Math.round(v[19]) + ')'); });
