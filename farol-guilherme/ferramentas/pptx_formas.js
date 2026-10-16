// Lista as formas de slides de um .pptx (zip + XML, sem biblioteca): posição/tamanho em pt, preenchimento, texto.
// Uso: node pptx_formas.js <arquivo.pptx> <n1,n2,...>
const fs = require('fs'), zlib = require('zlib');
const [arq, lista] = process.argv.slice(2);
const buf = fs.readFileSync(arq);
let eocd = buf.length - 22; while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
const files = {};
for (let i = 0; i < n; i++) {
  const met = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
  const ln = buf.readUInt16LE(p + 28), le = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32);
  const off = buf.readUInt32LE(p + 42), nome = buf.slice(p + 46, p + 46 + ln).toString();
  const lnl = buf.readUInt16LE(off + 26), lel = buf.readUInt16LE(off + 28);
  const dados = buf.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + csize);
  files[nome] = met === 8 ? zlib.inflateRawSync(dados) : dados;
  p += 46 + ln + le + lc;
}
const pt = v => (+v / 12700).toFixed(1);
(lista || '1').split(',').forEach(k => {
  const x = files['ppt/slides/slide' + k + '.xml']; if (!x) return console.log('sem slide', k);
  const s = x.toString('utf8');
  console.log('\n===== SLIDE ' + k);
  const re = /<p:(sp|pic|cxnSp|graphicFrame)>([\s\S]*?)<\/p:\1>/g; let m;
  while ((m = re.exec(s))) {
    const b = m[2];
    const off = b.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/), ext = b.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    const geom = (b.match(/prstGeom prst="(\w+)"/) || [])[1] || '';
    const fill = (b.match(/<p:spPr>[\s\S]*?<a:solidFill><a:srgbClr val="(\w+)"/) || [])[1] || '';
    const cor = (b.match(/<a:rPr[^>]*>[\s\S]*?<a:srgbClr val="(\w+)"/) || [])[1] || '';
    const sz = (b.match(/<a:rPr[^>]*sz="(\d+)"/) || [])[1];
    const txt = (b.match(/<a:t>([^<]*)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, '')).join('').slice(0, 70);
    console.log(m[1].padEnd(5), geom.padEnd(10), off ? pt(off[1]).padStart(6) + ',' + pt(off[2]).padStart(6) : '      ,      ',
      ext ? pt(ext[1]).padStart(6) + 'x' + pt(ext[2]).padEnd(6) : '', 'fill=' + fill.padEnd(6), 'txt=' + cor.padEnd(6), sz ? (sz / 100) + 'pt' : '', JSON.stringify(txt));
  }
});
