// Teste do Farol.gs num deck vazio (dublê do Slides): 8 slides, nada fora da página, rodar 2x não duplica
// e não toca slide que não é do script. Rode com:  node farol-guilherme/teste_farol.js
const fs = require('fs');
if (!process.argv[2]) process.argv[2] = require('path').join(__dirname, 'Farol.gs');
const logs = []; global.Logger = { log: m => logs.push(String(m)) };
const P = new Proxy({}, { get: (_, k) => k });
function forma(tipo, x, y, w, h) {
  if ([x, y, w, h].some(v => typeof v !== 'number' || !isFinite(v))) throw new Error('geometria inválida ' + tipo);
  const o = { tipo, x, y, w, h, txt: '', fs: 0 };
  const est = () => { const e = {}; e.setFontSize = v => { o.fs = v; return e; }; ['setBold', 'setForegroundColor', 'setFontFamily'].forEach(k => e[k] = () => e); return e; };
  o.getText = () => ({ setText: t => { o.txt = String(t); return { getTextStyle: est }; }, getTextStyle: est, asString: () => o.txt + '\n',
    getParagraphStyle: () => ({ setParagraphAlignment: () => {} }), replaceAllText: (a, b) => { o.txt = o.txt.split(a).join(b); } });
  o.getFill = () => ({ setSolidFill: () => {} });
  o.getBorder = () => { const b = { setTransparent: () => b, setWeight: () => b, getLineFill: () => ({ setSolidFill: () => {} }) }; return b; };
  o.setContentAlignment = () => o; o.getPageElementType = () => 'SHAPE'; o.asShape = () => o;
  return o;
}
function slide() {
  const s = { formas: [], tabela: null };
  s.insertShape = (t, x, y, w, h) => { const f = forma(t, x, y, w, h); s.formas.push(f); return f; };
  s.insertImage = () => { const im = { setWidth() { return im; }, setHeight() { return im; }, setLeft() { return im; }, setTop() { return im; }, getWidth: () => 200, getHeight: () => 40 }; return im; };
  s.getBackground = () => ({ setSolidFill: () => {} });
  s.getPageElements = () => s.formas.concat(s.tabela ? [s.tabela] : []);
  s.nota = '';
  s.getNotesPage = () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ setText: v => { s.nota = v; }, asString: () => s.nota }) }) });
  s.remove = () => { const k = deck.indexOf(s); if (k >= 0) deck.splice(k, 1); };
  return s;
}
function tabelaWilson() {
  const linhas = [['METAS WILSON FRANCISCO LEFFER JUNIOR - PROPERTY 2026'], ['ANALISTA DE PROPRIEDADES', 'Pontos'], ['0 PONTOS']];
  for (let i = 0; i < 5; i++) linhas.push(['META ' + i + '\n(DEZEMBRO)', '20', 'Projetos', 'SIM/NÃO', '=', 'SIM', 'NÃO', '', 'SIM', 'NÃO', '']);
  const rows = linhas.map(l => { const r = []; for (let c = 0; c < 11; c++) r.push({ t: l[c] || '', cor: null }); return r; });
  const cel = (r, c) => { const x = rows[r][c]; const est = { getFontFamily: () => 'Arial', getFontSize: () => 9, isBold: () => true, getForegroundColor: () => null,
      setFontFamily: () => est, setFontSize: () => est, setBold: () => est, setForegroundColor: () => est };
    return { getText: () => ({ asString: () => x.t + '\n', setText: v => { x.t = v; }, getRange: () => ({ getTextStyle: () => est }), getTextStyle: () => est,
      getParagraphs: () => [{ getRange: () => ({ getParagraphStyle: () => ({ getParagraphAlignment: () => 'CENTER' }) }) }], getParagraphStyle: () => ({ setParagraphAlignment: () => {} }) }),
      getFill: () => ({ setSolidFill: c => { x.cor = c; } }) }; };
  const tb = { rows, getNumRows: () => rows.length, getNumColumns: () => 11, getCell: cel, getRow: i => ({ remove: () => rows.splice(i, 1) }) };
  return { getPageElementType: () => 'TABLE', asTable: () => tb, tb };
}
const modelo = slide(); modelo.tabela = tabelaWilson(); modelo.insertShape('TEXT_BOX', 21, 20, 419, 63).getText().setText('FAROL DE METAS - JULHO\nPROPERTY');
const deck = [];
global.SlidesApp = {
  ShapeType: P, ContentAlignment: P, ParagraphAlignment: P, PredefinedLayout: P,
  PageElementType: { SHAPE: 'SHAPE', GROUP: 'GROUP', TABLE: 'TABLE' },
  openById: id => id.indexOf('1FmA') === 0 ? { getSlides: () => [modelo] } : {
    getSlides: () => deck.slice(),
    insertSlide: (i, x) => {
      let s;
      if (x === modelo) { s = slide(); s.tabela = tabelaWilson(); s.tabela.tb.rows.splice(0, 99, ...JSON.parse(JSON.stringify(modelo.tabela.tb.rows)));
        s.insertShape('TEXT_BOX', 21, 20, 419, 63).getText().setText('FAROL DE METAS - JULHO\nPROPERTY'); }
      else s = slide();
      deck.splice(i, 0, s); return s;
    } }
};
global.DriveApp = { getFileById: () => ({ getBlob: () => 'logo' }) };
(0, eval)(fs.readFileSync(process.argv[2], 'utf8').replace(/^const /gm, 'var '));
atualizarFarolSetembro();
console.log(logs.join('\n'));
let fora = 0;
deck.forEach((s, i) => {
  const ruins = s.formas.filter(f => f.tipo !== 'ELLIPSE' && (f.x < -1 || f.y < -1 || f.x + f.w > 721 || f.y + f.h > 406));
  fora += ruins.length;
  const tit = s.formas.find(f => f.fs === 19);
  const sub = s.formas.find(f => f.fs === 9.5);
  console.log((i + 1) + '. ' + (tit ? tit.txt : '?') + ' — ' + (sub ? sub.txt : '') + ' (' + s.formas.length + ' formas' +
    (ruins.length ? ' · FORA: ' + ruins.map(r => r.tipo + ' ' + JSON.stringify(r.txt)).join(', ') : '') + ')' + (s.nota ? ' [marcado]' : ''));
});
console.log('\nSlide de metas:');
deck[0].formas.filter(f => f.txt && f.fs !== 19 && f.fs !== 9.5).forEach(f => console.log('  ' + f.fs + 'pt ' + JSON.stringify(f.txt)));
console.log(fora ? '\n✗ ' + fora + ' formas fora da página' : '\n✓ nada fora da página');
const outro = slide(); outro.insertShape('TEXT_BOX', 10, 10, 100, 20).getText().setText('FAROL DE METAS · AGOSTO'); deck.push(outro);
atualizarFarolSetembro();
console.log('2ª execução:', logs.slice(-2).join(' | '), '· slides:', deck.length, '· o de agosto ficou:', deck.indexOf(outro) >= 0);
