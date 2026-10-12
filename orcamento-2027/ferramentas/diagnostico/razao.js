// Razão do realizado (CAS_1): procura lançamentos pelo histórico.
// Uso: node razao.js <arquivo.json do download> <regex> [regex...]
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
const cab = L[0], ix = n => cab.indexOf(n);
const iComp = ix('Competência'), iVal = ix('Valor'), iConta = ix('Conta'), iHist = ix('Histórico'), iUni = ix('Unidade'),
      iCC = ix('Centro de custo'), iGer = ix('Nome da conta gerencial');
const num = v => +String(v).replace(/\./g, '').replace(',', '.') || 0;
const linhas = L.slice(1).filter(r => r.length > 5);
const comps = {}; linhas.forEach(r => { comps[r[iComp]] = (comps[r[iComp]] || 0) + 1; });
console.log('linhas: ' + linhas.length + ' · competências: ' + Object.keys(comps).join(' '));
const unis = {}; linhas.forEach(r => { const k = r[iUni] + ' | ' + r[iCC]; unis[k] = (unis[k] || 0) + 1; });
console.log('unidades/centros: ' + JSON.stringify(unis));
process.argv.slice(3).forEach(p => {
  const re = new RegExp(p, 'i');
  const a = linhas.filter(r => re.test(r[iHist]));
  console.log('\n== /' + p + '/ : ' + a.length + ' lançamentos · total ' + a.reduce((s, r) => s + num(r[iVal]), 0).toFixed(2));
  a.forEach(r => console.log('  ' + r[iComp].padEnd(10) + ' ' + String(r[iVal]).padStart(12) + '  ' + (r[iConta] || '').padEnd(28) + ' [' + r[iGer] + '] ' + r[iHist].slice(0, 150)));
});
