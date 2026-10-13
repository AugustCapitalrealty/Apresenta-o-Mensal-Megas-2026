// Prévia dos slides do gestor revisados/redesenhados (29_GestorRevisado.gs + 33_GestorRedesenho.gs) sem o Slides:
// monta uma v3 de mentira com os textos e as imagens de "_fotos-gestor/fotos.json" (exportarFotosGestor), roda a
// revisão no dublê do teste e grava um HTML por slide (2 px por pt): o fundo é o PNG do slide na exportação da v3
// (_slides-versao-gestor), o que a revisão tirou fica em branco e o que ela desenhou vai por cima.
//   chrome --headless --screenshot=s.png --window-size=1440,810 slide_079.html
// Uso: node previa_gestor.js <pasta teste> <saída> <fotos.json> <pasta _slides-versao-gestor> [números da v3, ex. 33,79]
const fs = require('fs'), path = require('path');
const TESTE = path.resolve(process.argv[2]), SAIDA = path.resolve(process.argv[3]);
const FOTOS = JSON.parse(fs.readFileSync(process.argv[4], 'utf8')), V3PNG = path.resolve(process.argv[5]);
const SO = process.argv[6] ? process.argv[6].split(',').map(Number) : null;
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
// A v3 de mentira: antes de cada slide do gestor, um "gerado" com o Mega dele (é assim que a revisão acha o Mega).
const v3 = novoDeck(); v3._slides = [];
const nums = [];
FOTOS.slides.filter(f => !SO || SO.indexOf(f.v3) >= 0).forEach(f => {
  const g = v3.appendSlide(); g.shapes.push({ tipo: 'TEXT_BOX', x: 44, y: 36, w: 500, h: 18, texto: 'gerado · ' + f.mega });
  const s = v3.appendSlide();
  s.notas = '[REGISTRO FOTOGRÁFICO · ESTEIO]';
  s.shapes.push({ tipo: 'IMAGE', x: 0, y: 0, w: W, h: H, nome: 'moldura-v3', orig: true });
  f.imagens.forEach((im, k) => s.shapes.push({ tipo: 'IMAGE', x: im.x, y: im.y, w: im.w, h: im.h, nome: 'img' + k, orig: true }));
  f.textos.forEach(t => s.shapes.push({ tipo: 'TEXT_BOX', x: t.x, y: t.y, w: t.w, h: t.h, texto: t.texto, orig: true }));
  // A tabela do Slides não vem no fotos.json: a do CVISH fica onde está no PNG.
  if (/Comunicação Horizontal/.test(f.titulo))
    s.shapes.push({ tipo: 'TABLE', x: 44, y: 199, w: 390, h: 169, orig: true, celulas: [['LOCAL', 'TAMANHO (M2)', 'FREQUÊNCIA', 'TOTAL']] });
  nums.push(f.v3);
});
const deck = novoDeck();
const res = G._orcGerarGestorRevisados_(deck, v3);
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
  const n = nums[i], orig = v3._slides[i * 2 + 1];
  const ficou = {}; s.shapes.forEach(r => { if (r.orig && r.nome) ficou[r.nome] = true; });
  const tirados = orig.shapes.filter(r => (r.tipo === 'IMAGE' && r.nome !== 'moldura-v3' && !ficou[r.nome]) ||
                                          (r.tipo === 'TABLE' && !s.shapes.some(x => x.tipo === 'TABLE')));
  // Texto trocado pela revisão (VALOR, LOCAL…): em branco por baixo e o novo por cima.
  const trocados = s.shapes.filter(r => r.orig && r.tipo === 'TEXT_BOX' && orig.shapes.some(o => o.x === r.x && o.y === r.y && o.texto !== r.texto));
  const els = tirados.concat(trocados).map(r => '<div style="left:' + px(r.x) + ';top:' + px(r.y) + ';width:' + px(r.w) + ';height:' + px(r.h) + ';background:#fff"></div>');
  s.shapes.filter(r => !r.orig || trocados.indexOf(r) >= 0).forEach(r => {
    const pos = 'left:' + px(r.x) + ';top:' + px(r.y) + ';width:' + px(r.w) + ';height:' + px(r.h) + ';';
    if (r.tipo === 'IMAGE') { els.push('<img src="' + url(path.join(IMG, r.nome || '')) + '" style="' + pos + 'opacity:0">'); return; }
    if (r.tipo === 'LINE') {
      const p = r.peso || 0.75;
      els.push('<div style="left:' + px(r.x - (r.w ? 0 : p / 2)) + ';top:' + px(r.y - (r.h ? 0 : p / 2)) + ';width:' + px(Math.max(r.w, p)) +
               ';height:' + px(Math.max(r.h, p)) + ';background:' + r.cor + '"></div>');
      return;
    }
    if (r.tipo === 'TEXT_BOX') {
      const m = META[r.id] || { meio: !r.orig, espac: 100 };
      if (/…$/.test(r.texto || '')) cortados.push(n + ': ' + r.texto);
      const al = r.align === 'CENTER' ? 'center' : r.align === 'END' ? 'right' : 'left';
      els.push('<div style="' + pos + 'padding:' + px(3.6) + ' ' + px(7.2) + ';display:flex;flex-direction:column;justify-content:' +
               (m.meio ? 'center' : 'flex-start') + ';font-family:\\'' + (r.fonte || 'Montserrat') + '\\';font-size:' + px(r.fs || 9.5) +
               ';font-weight:' + (r.negrito || r.orig ? 700 : 400) + ';color:' + (r.corTexto || '#1B2A4A') + ';text-align:' + al +
               ';white-space:pre-wrap;line-height:' + ((lh[r.fonte] || 1.25) * m.espac / 100).toFixed(3) + '"><span>' +
               String(r.texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></div>');
      return;
    }
    const raio = r.tipo === 'ROUND_RECTANGLE' ? px(Math.min(r.w, r.h) / 6) : r.tipo === 'ELLIPSE' ? '50%' : '0';
    els.push('<div style="' + pos + 'border-radius:' + raio + ';background:' + (r.cor ? rgba(r.cor, r.alpha) : 'transparent') +
             (r.borda ? ';border:' + px(r.peso || 0.75) + ' solid ' + r.borda : '') + '"></div>');
  });
  const fundo = path.join(V3PNG, 'slide_' + String(n).padStart(3, '0') + '.png');
  fs.writeFileSync(path.join(SAIDA, 'slide_' + String(n).padStart(3, '0') + '.html'), '<!doctype html><meta charset="utf-8"><style>' + css +
    '</style><body style="width:' + px(W) + ';height:' + px(H) + ';background:url(\\'' + url(fundo) + '\\') 0 0 / 100% 100%;position:relative;overflow:hidden">' +
    els.join('\\n') + '</body>');
});
res.forEach(r => console.log(r.v3 + ' (' + r.mega + ') ' + r.titulo + ': ' + r.feito.join('; ') + (r.avisos.length ? ' · AVISOS: ' + r.avisos.join('; ') : '')));
console.log('cortados: ' + (cortados.length ? cortados.join(' | ') : 'nenhum'));
`;
eval(src + diag);
