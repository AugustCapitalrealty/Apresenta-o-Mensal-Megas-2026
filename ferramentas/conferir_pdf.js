// ÚLTIMO CHECK antes de enviar um deck: extrai o texto do PDF exportado,
// página por página, numa ordem de leitura (de cima para baixo, da esquerda
// para a direita), para conferir os números slide a slide.
//
// Uso (Node; o C: perde o node_modules a cada reinício por causa do Deep Freeze):
//   1. numa pasta temporária do C::  npm install pdfjs-dist@3.11.174
//   2. NODE_PATH=<pasta>/node_modules node conferir_pdf.js "<deck.pdf>" ["<saida.txt>"]
// Sem <saida.txt>, grava ao lado do PDF com extensão .txt. Os avisos
// "Cannot polyfill DOMMatrix/Path2D" são normais (só afetam desenho, não texto).
//
// O que conferir no texto (checklist completo no README da pasta 29, seção
// "Último check antes de enviar"): o mesmo número em slides diferentes
// (DRE × Resultado × Bridge × Custo m² × Dashboard × Metas), fonte de dados
// do mês certo (acessos, financeiro), valores fora do padrão e digitação dos
// textos manuais (Destaques).
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

(async () => {
  const entrada = process.argv[2];
  if (!entrada) { console.error('Uso: node conferir_pdf.js "<deck.pdf>" ["<saida.txt>"]'); process.exit(1); }
  const saida = process.argv[3] || entrada.replace(/\.pdf$/i, '') + '.txt';
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(entrada)), disableFontFace: true, verbosity: 0
  }).promise;

  let out = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const tc = await pg.getTextContent();
    const itens = tc.items
      .map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5] }))
      .filter(i => i.s.trim());
    itens.sort((a, b) => b.y - a.y || a.x - b.x);
    const linhas = []; let cur = [], ly = null;
    for (const it of itens) {
      if (ly !== null && Math.abs(it.y - ly) > 3) { linhas.push(cur.map(c => c.s).join(' ')); cur = []; }
      cur.push(it); ly = it.y;
    }
    if (cur.length) linhas.push(cur.map(c => c.s).join(' '));
    out += `\n===== PÁGINA ${p} =====\n` + linhas.join('\n');
  }
  fs.writeFileSync(saida, out);
  console.log(saida + ' (' + doc.numPages + ' páginas)');
})();
