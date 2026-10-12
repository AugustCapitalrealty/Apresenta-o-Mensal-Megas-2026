// Razão de Material de consumo do Itajaí (planilha "Teste_1"): Canaveral × resto, por mês.
// Uso: node canaveral_resumo.js <canaveral.json>
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
const iComp = ix('Competência'), iVal = ix('Valor'), iConta = ix('Conta'), iHist = ix('Histórico');
const num = v => -(+String(v).replace(/\./g, '').replace(',', '.') || 0);
const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const linhas = L.slice(1).filter(r => r.length > 5);
console.log('linhas: ' + linhas.length);
const forn = h => (String(h).match(/N[º°] ?\d+ - (.*?) - REFERENTE/) || [, '?'])[1];
const grupos = { canaveralContrato: Array(12).fill(0), canaveralFora: Array(12).fill(0), outros: Array(12).fill(0), expediente: Array(12).fill(0) };
linhas.forEach(r => {
  const m = meses.indexOf(String(r[iComp]).slice(0, 3)), v = num(r[iVal]), h = r[iHist];
  const g = /EXPEDIENTE/.test(r[iConta]) ? 'expediente' : /CANAVERAL/.test(h) ? (/FORA DE CONTRATO|FORA DO CONTRATO/.test(h) ? 'canaveralFora' : 'canaveralContrato') : 'outros';
  grupos[g][m] += v;
  console.log('  ' + String(r[iComp]).padEnd(9) + v.toFixed(2).padStart(10) + '  ' + g.padEnd(17) + ' ' + forn(h).slice(0, 45) + ' · ' + String(h).replace(/.*REFERENTE (A |À )?/, '').slice(0, 80));
});
Object.keys(grupos).forEach(g => console.log(g.padEnd(18) + ' total ' + grupos[g].reduce((a, v) => a + v, 0).toFixed(2) + '  ' + grupos[g].map((v, i) => v ? meses[i] + ' ' + v.toFixed(0) : '').filter(Boolean).join(', ')));
