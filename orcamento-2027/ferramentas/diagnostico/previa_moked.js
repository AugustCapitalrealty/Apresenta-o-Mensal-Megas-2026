// Prévia dos slides da Moked (28_Moked.gs) sem o Slides e sem Python: gera no dublê do teste, com as imagens da
// pasta "IMAGENS - SLIDES" do G: (moldura e trilha), e grava um HTML por slide (2 px por pt) para o Chrome fotografar:
//   chrome --headless --screenshot=slide_1.png --window-size=1440,810 slide_1.html
// Também grava molduras.json (assinatura → especificação das molduras usadas).
// Uso: node previa_moked.js <pasta teste> <pasta de saída>
const fs = require('fs'), path = require('path');
const TESTE = path.resolve(process.argv[2]), SAIDA = path.resolve(process.argv[3]);
const IMG = path.resolve(TESTE, '..', '..', '..', 'IMAGENS - SLIDES');
const FONTES = path.resolve(TESTE, '..', 'ferramentas', 'fontes');
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
const iter = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
const tamPng = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const pastaImg = { getFilesByName: nome => {
  const f = path.join(IMG, nome);
  return iter(fs.existsSync(f) ? [{ getBlob: () => Object.assign({ nome: nome }, /\\.png$/i.test(nome) ? tamPng(f) : {}) }] : []);
} };
G.DriveApp.getFolderById = () => ({ getFoldersByName: () => iter([pastaImg]) });
const META = {};
const oT = G._orcCaixaTexto_, oP = G._orcCaixaParagrafo_;
G._orcCaixaTexto_ = (s, q) => { const b = oT(s, q); META[b.getObjectId()] = { meio: true, espac: 100 }; return b; };
G._orcCaixaParagrafo_ = (s, q) => { const b = oP(s, q); META[b.getObjectId()] = { meio: !!q.meio, espac: q.espac }; return b; };
const deck = novoDeck();
const n = G._orcGerarMoked_(deck);
LOG.filter(m => /Moked|FALHA|moldura/i.test(m)).forEach(m => console.log('log: ' + m));
fs.mkdirSync(SAIDA, { recursive: true });
const K = 2;
const url = f => 'file:///' + f.replace(/\\\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/%3A/, ':');
const lh = { 'Montserrat': 1.219, 'Open Sans': 1.362 };
const css = "@font-face{font-family:'Montserrat';src:url('" + url(path.join(FONTES, 'Montserrat[wght].ttf')) + "');font-weight:100 900}" +
            "@font-face{font-family:'Open Sans';src:url('" + url(path.join(FONTES, 'OpenSans[wdth,wght].ttf')) + "');font-weight:300 800}" +
            'body{margin:0}div,img{position:absolute;box-sizing:border-box}';
const rgba = (c, a) => a === undefined ? c : 'rgba(' + [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16)).join(',') + ',' + a + ')';
const px = v => (v * K).toFixed(2) + 'px';
const cortados = [];
deck.getSlides().forEach((s, i) => {
  const els = s.shapes.map(r => {
    const pos = 'left:' + px(r.x) + ';top:' + px(r.y) + ';width:' + px(r.w) + ';height:' + px(r.h) + ';';
    if (r.tipo === 'IMAGE') return '<img src="' + url(path.join(IMG, r.nome || '')) + '" style="' + pos + '">';
    if (r.tipo === 'LINE') {
      const p = r.peso || 0.75;
      return '<div style="left:' + px(r.x - (r.w ? 0 : p / 2)) + ';top:' + px(r.y - (r.h ? 0 : p / 2)) + ';width:' + px(Math.max(r.w, p)) +
             ';height:' + px(Math.max(r.h, p)) + ';background:' + r.cor + '"></div>';
    }
    if (r.tipo === 'TEXT_BOX') {
      const m = META[r.id] || { meio: false, espac: 100 };
      if (/…$/.test(r.texto || '')) cortados.push(r.texto);
      const al = r.align === 'CENTER' ? 'center' : r.align === 'END' ? 'right' : 'left';
      return '<div style="' + pos + 'padding:' + px(3.6) + ' ' + px(7.2) + ';display:flex;flex-direction:column;justify-content:' +
             (m.meio ? 'center' : 'flex-start') + ';font-family:\\'' + r.fonte + '\\';font-size:' + px(r.fs) + ';font-weight:' +
             (r.negrito ? 700 : 400) + ';color:' + r.corTexto + ';text-align:' + al + ';white-space:pre-wrap;line-height:' +
             (lh[r.fonte] * m.espac / 100).toFixed(3) + '"><span>' + String(r.texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></div>';
    }
    const raio = r.tipo === 'ROUND_RECTANGLE' ? px(Math.min(r.w, r.h) / 6) : r.tipo === 'ELLIPSE' ? '50%' : '0';
    return '<div style="' + pos + 'border-radius:' + raio + ';background:' + (r.cor ? rgba(r.cor, r.alpha) : 'transparent') +
           (r.borda ? ';border:' + px(r.peso || 0.75) + ' solid ' + r.borda : '') + '"></div>';
  });
  fs.writeFileSync(path.join(SAIDA, 'slide_' + (i + 1) + '.html'), '<!doctype html><meta charset="utf-8"><style>' + css +
    '</style><body style="width:' + px(W) + ';height:' + px(H) + ';background:' + (s.shapes.fundo || '#fff') + ';position:relative;overflow:hidden">' +
    els.join('\\n') + '</body>');
});
const passos = G._ORC_MOLDURAS_PASSOS.filter(p => /^Moked/.test(p[1]));
const usadas = {}; passos.forEach(p => { usadas[p[2]] = G._ORC_MOLDURAS_USADAS[p[2]]; });
fs.writeFileSync(path.join(SAIDA, 'molduras.json'), JSON.stringify(usadas, null, 1));
console.log(n + ' slides · ' + deck.getSlides().length + ' no deck · molduras: ' + Object.keys(usadas).join(', ') +
            ' · cortados: ' + (cortados.length ? cortados.join(' | ') : 'nenhum'));
deck.getSlides().forEach((s, i) => console.log('slide ' + (i + 1) + ' · notas: ' + s.notas.split('\\n')[0] + ' · ' + s.shapes.length + ' formas'));
`;
eval(src + diag);
