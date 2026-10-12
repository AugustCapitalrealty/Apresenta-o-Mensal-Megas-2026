// .xlsx já descompactado → matriz JSON como o getValues() da planilha convertida (primeira aba).
// Uso: node xlsx_matriz.js <pasta> <saida.json>
const fs = require('fs'), path = require('path');
const [, , pasta, saida] = process.argv;
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const ss = [];
const ssf = path.join(pasta, 'xl', 'sharedStrings.xml');
if (fs.existsSync(ssf)) (fs.readFileSync(ssf, 'utf8').match(/<si>[\s\S]*?<\/si>/g) || [])
  .forEach(si => ss.push(dec((si.match(/<t[^>]*>([^<]*)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))));
const col = ref => ref.replace(/\d+/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const abas = fs.readdirSync(path.join(pasta, 'xl', 'worksheets')).filter(f => /^sheet\d+\.xml$/.test(f)).sort();
const x = fs.readFileSync(path.join(pasta, 'xl', 'worksheets', abas[0]), 'utf8');
const m = (x.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).map(r => {
  const out = [];
  (r.match(/<c [^>]*?(\/>|>[\s\S]*?<\/c>)/g) || []).forEach(c => {
    const ref = (c.match(/r="([A-Z]+\d+)"/) || [])[1], t = (c.match(/t="(\w+)"/) || [])[1];
    const v = (c.match(/<v>([^<]*)<\/v>/) || [])[1], is = (c.match(/<is>[\s\S]*?<t[^>]*>([^<]*)<\/t>/) || [])[1];
    if (!ref) return;
    out[col(ref)] = t === 's' ? ss[+v] : t === 'inlineStr' ? dec(is || '') : t === 'str' ? dec(v || '') : v === undefined ? '' : (isNaN(+v) ? dec(v) : +v);
  });
  return out;
}).filter(r => r.some(v => v !== undefined && v !== ''));
const n = m[0].length;
m.forEach(r => { for (let i = 0; i < n; i++) if (r[i] === undefined) r[i] = ''; r.length = n; });
fs.writeFileSync(saida, JSON.stringify(m));
console.log(path.basename(saida) + ': ' + abas.length + ' aba(s), ' + (m.length - 1) + ' linhas × ' + n + ' colunas · ' + JSON.stringify(m[0]));
