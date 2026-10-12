// CSV baixado do Drive (JSON {content: base64}) → matriz JSON de textos, como a planilha importada.
// Uso: node csv_json_texto.js <entrada.json> <saida.json>
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
const m = L.filter(r => r.length > 1);
fs.writeFileSync(process.argv[3], JSON.stringify(m));
console.log(process.argv[3].split(/[\\/]/).pop() + ': ' + (m.length - 1) + ' linhas × ' + m[0].length + ' colunas');
