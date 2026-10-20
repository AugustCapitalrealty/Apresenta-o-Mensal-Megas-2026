// Roda RateioEnergia.gs num deck dublado (8 slides): confere se algo sai da página, se algum slide escreveu o aviso
// de falha e se rodar 2x não duplica nem tira do lugar o slide feito à mão.
// Uso: node rateio-energia/teste_rateio_energia.js
// Prévia em PNG: PREVIA=<pasta> node rateio-energia/teste_rateio_energia.js  e depois
//   node ferramentas/previa_slides.js <pasta>/formas_energia.json <pasta>
const fs = require('fs');
const arq = process.argv[2] || require('path').join(__dirname, 'RateioEnergia.gs');
const saida = process.env.PREVIA ? require('path').join(process.env.PREVIA, 'formas_energia.json') : null;
const logs = []; global.Logger = { log: m => logs.push(String(m)) };
const P = new Proxy({}, { get: (_, k) => k });

function slide(nome) {
  const s = { formas: [], fundo: '#FFFFFF', nota: '', nome };
  const add = f => { if ([f.x, f.y, f.w, f.h].some(v => typeof v !== 'number' || !isFinite(v))) throw new Error('geometria inválida ' + f.tipo); s.formas.push(f); return f; };
  s.insertShape = (tipo, x, y, w, h) => {
    const f = add({ tipo, x, y, w, h, cor: null });
    const est = { setFontSize: v => { f.fs = v; return est; }, setBold: v => { f.negrito = v; return est; },
      setForegroundColor: v => { f.corTexto = v; return est; }, setFontFamily: v => { f.fonte = v; return est; } };
    f.getText = () => ({ setText: t => { f.texto = String(t); return { getTextStyle: () => est }; }, getTextStyle: () => est,
      getParagraphStyle: () => ({ setParagraphAlignment: a => { f.align = a === 'START' ? 'START' : a; } }) });
    f.setContentAlignment = a => { f.meio = a === 'MIDDLE'; return f; };
    f.getFill = () => ({ setSolidFill: (c, a) => { f.cor = c; f.alpha = a; }, setTransparent: () => { f.cor = null; } });
    const b = { setTransparent: () => b, setWeight: v => { f.peso = v; return b; }, getLineFill: () => ({ setSolidFill: c => { f.borda = c; } }) };
    f.getBorder = () => b;
    return f;
  };
  s.insertImage = (blob, x, y, w, h) => {
    const f = add({ tipo: 'IMAGE', x: x || 0, y: y || 0, w: w || 170, h: h || 34, rotulo: 'logo' });
    const im = { getWidth: () => f.w, getHeight: () => f.h, setWidth: v => { f.w = v; return im; }, setHeight: v => { f.h = v; return im; },
      setLeft: v => { f.x = v; return im; }, setTop: v => { f.y = v; return im; } };
    return im;
  };
  s.getBackground = () => ({ setSolidFill: c => { s.fundo = c; } });
  s.getNotesPage = () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ setText: v => { s.nota = v; }, asString: () => s.nota }) }) });
  s.remove = () => { const k = deck.indexOf(s); if (k >= 0) deck.splice(k, 1); };
  return s;
}

const feitoAMao = slide('ANTES/DEPOIS (feito à mão)');
const deck = [feitoAMao];
global.SlidesApp = {
  ShapeType: P, ContentAlignment: P, ParagraphAlignment: P, PredefinedLayout: P,
  openById: () => ({
    getPageWidth: () => 720, getPageHeight: () => 405, getSlides: () => deck.slice(),
    insertSlide: i => { const s = slide(); deck.splice(i, 0, s); return s; },
    appendSlide: () => { const s = slide(); deck.push(s); return s; }
  })
};
global.DriveApp = { getFileById: () => ({ getBlob: () => 'logo' }) };
(0, eval)(fs.readFileSync(arq, 'utf8').replace(/^const /gm, 'var '));

gerarApresentacaoRateioEnergia();
console.log(logs.join('\n'));
let fora = 0;
deck.forEach((s, i) => {
  const ruins = s.formas.filter(f => f.tipo !== 'ELLIPSE' && f.tipo !== 'TRIANGLE' && (f.x < -1 || f.y < -1 || f.x + f.w > 721 || f.y + f.h > 406));
  fora += ruins.length;
  const falha = s.formas.some(f => /Falha ao desenhar/.test(f.texto || ''));
  console.log((i + 1) + '. ' + (s.nome || (s.formas.find(f => f.fs === 18 || f.fs === 44 || f.fs === 34) || {}).texto) +
    ' (' + s.formas.length + ' formas' + (ruins.length ? ' · FORA: ' + ruins.map(r => r.tipo + ' ' + JSON.stringify(r.texto || '')).join(', ') : '') +
    ')' + (falha ? ' ✗ FALHA' : ''));
});
console.log(fora ? '✗ ' + fora + ' formas fora da página' : '✓ nada fora da página');
if (saida) fs.writeFileSync(saida, JSON.stringify({ W: 720, H: 405, slides: deck.map(s => ({ fundo: s.fundo, formas: s.formas.map(f => {
  const o = Object.assign({}, f); delete o.getText; delete o.getFill; delete o.getBorder; delete o.setContentAlignment;
  if (o.tipo === 'TRIANGLE') o.tipo = 'ELLIPSE';
  if (o.tipo === 'TEXT_BOX' && o.meio === false) o.meio = false;
  return o; }) })) }));

gerarApresentacaoRateioEnergia();
console.log('2ª execução:', logs.slice(-1)[0], '· slides:', deck.length, '· feito à mão continua na posição', deck.indexOf(feitoAMao) + 1);
const falhas = deck.filter(s => s.formas.some(f => /Falha ao desenhar/.test(f.texto || ''))).length;
if (fora || falhas || deck.length !== 9 || deck.indexOf(feitoAMao) !== 3) {
  console.log('✗ reprovado'); process.exitCode = 1;
} else console.log('✓ aprovado');
