// Lê um .xlsx já descompactado (pasta com xl/sharedStrings.xml e xl/worksheets/sheetN.xml)
// e imprime cabeçalho + linhas cujo texto bate com o regex. Sem bibliotecas.
// Uso: node xlsx_linhas.js <pasta> <regex>
const fs = require('fs'), path = require('path');
const [, , pasta, padrao] = process.argv;
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const ss = [];
const ssx = fs.readFileSync(path.join(pasta, 'xl', 'sharedStrings.xml'), 'utf8');
(ssx.match(/<si>[\s\S]*?<\/si>/g) || []).forEach(si => ss.push(dec((si.match(/<t[^>]*>([^<]*)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))));
const col = ref => ref.replace(/\d+/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
fs.readdirSync(path.join(pasta, 'xl', 'worksheets')).filter(f => /^sheet\d+\.xml$/.test(f)).forEach(f => {
  const x = fs.readFileSync(path.join(pasta, 'xl', 'worksheets', f), 'utf8');
  const linhas = (x.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).map(r => {
    const out = [];
    (r.match(/<c [^>]*?(\/>|>[\s\S]*?<\/c>)/g) || []).forEach(c => {
      const ref = (c.match(/r="([A-Z]+\d+)"/) || [])[1], t = (c.match(/t="(\w+)"/) || [])[1];
      const v = (c.match(/<v>([^<]*)<\/v>/) || [])[1], is = (c.match(/<is>[\s\S]*?<t[^>]*>([^<]*)<\/t>/) || [])[1];
      if (!ref) return;
      out[col(ref)] = t === 's' ? ss[+v] : t === 'inlineStr' ? dec(is || '') : v === undefined ? '' : (isNaN(+v) ? dec(v) : +v);
    });
    return out;
  });
  const re = new RegExp(padrao, 'i');
  console.log('== ' + f + ': ' + linhas.length + ' linhas');
  console.log('cabeçalho: ' + JSON.stringify(linhas[0]));
  linhas.filter((r, i) => i && re.test(r.join(' | '))).forEach(r => console.log(JSON.stringify(r)));
});
