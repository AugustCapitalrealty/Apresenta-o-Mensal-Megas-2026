// Lê um .pptx (via unzip) e grava, na ordem da apresentação, o texto de cada slide (por parágrafo), o número de
// imagens e o texto das anotações. Uso: node ler_pptx.js <arquivo.pptx> <saida.json>
const { execFileSync } = require('child_process');
const fs = require('fs');
const [arq, saida] = process.argv.slice(2);
const unz = p => { try { return execFileSync('unzip', ['-p', arq, p], { maxBuffer: 1 << 28 }).toString('utf8'); } catch (e) { return ''; } };
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
const rels = x => { const m = {}; for (const r of x.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) m[r[1]] = r[2]; return m; };
const textos = xml => [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)]
  .map(p => dec([...p[1].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(t => t[1]).join('')).trim()).filter(Boolean);

const pres = unz('ppt/presentation.xml'), prel = rels(unz('ppt/_rels/presentation.xml.rels'));
const ids = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map(m => m[1]);
const out = ids.map((rid, i) => {
  const alvo = prel[rid].replace(/^\/?ppt\//, '');
  const xml = unz('ppt/' + alvo);
  const srel = rels(unz('ppt/' + alvo.replace('slides/', 'slides/_rels/') + '.rels'));
  const notasAlvo = Object.values(srel).filter(t => /notesSlide/.test(t))[0];
  const notas = notasAlvo ? textos(unz('ppt/' + notasAlvo.replace(/^\.\.\//, ''))).filter(t => !/^\d+$/.test(t)) : [];
  return { n: i + 1, arquivo: alvo, textos: textos(xml), imagens: (xml.match(/<p:pic>/g) || []).length,
           tabelas: (xml.match(/<a:tbl>/g) || []).length, notas: notas };
});
fs.writeFileSync(saida, JSON.stringify(out, null, 1));
out.forEach(s => console.log(String(s.n).padStart(3) + ' [' + s.imagens + 'img' + (s.tabelas ? ' ' + s.tabelas + 'tab' : '') + '] ' +
  s.textos.slice(0, 3).join(' | ').slice(0, 150) + (s.notas.length ? '  {notas: ' + s.notas.join(' ').slice(0, 60) + '}' : '')));
