// Roda Housekeeping.gs num deck dublado: a 1ª execução cria a apresentação (sem HK_DECK_ID), a 2ª reabre a mesma
// com slides feitos à mão antes e depois dos dois gerados. Confere se algo sai da página, se algum slide escreveu o
// aviso de falha, se o slide vazio do deck novo saiu e se rodar 2x não duplica nem tira os dois do lugar.
// Uso: node housekeeping/teste_housekeeping.js
// Prévia em PNG: PREVIA=<pasta> node housekeeping/teste_housekeeping.js  e depois
//   node ferramentas/previa_slides.js <pasta>/formas_housekeeping.json <pasta>
const fs = require('fs');
const arq = process.argv[2] || require('path').join(__dirname, 'Housekeeping.gs');
const saida = process.env.PREVIA ? require('path').join(process.env.PREVIA, 'formas_housekeeping.json') : null;
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

// O deck novo do SlidesApp.create nasce com um slide de título vazio.
const deck = [slide('slide vazio do deck novo')];
const apresentacao = {
  getId: () => 'DECK_HK', getUrl: () => 'https://docs.google.com/presentation/d/DECK_HK/edit',
  getPageWidth: () => 720, getPageHeight: () => 405, getSlides: () => deck.slice(),
  insertSlide: i => { const s = slide(); deck.splice(i, 0, s); return s; },
  appendSlide: () => { const s = slide(); deck.push(s); return s; }
};
let criados = 0, abertos = [];
global.SlidesApp = {
  ShapeType: P, ContentAlignment: P, ParagraphAlignment: P, PredefinedLayout: P,
  create: () => { criados++; return apresentacao; },
  openById: id => { abertos.push(id); return apresentacao; }
};
const props = {};
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) };
global.DriveApp = { getFileById: () => ({ getBlob: () => 'logo' }) };
(0, eval)(fs.readFileSync(arq, 'utf8').replace(/^const /gm, 'var '));

gerarApresentacaoHousekeeping();
console.log(logs.join('\n'));
let fora = 0;
deck.forEach((s, i) => {
  const ruins = s.formas.filter(f => f.tipo !== 'ELLIPSE' && f.tipo !== 'TRIANGLE' && (f.x < -1 || f.y < -1 || f.x + f.w > 721 || f.y + f.h > 406));
  fora += ruins.length;
  const falha = s.formas.some(f => /Falha ao desenhar/.test(f.texto || ''));
  console.log((i + 1) + '. ' + (s.nome || (s.formas.find(f => f.fs === 18) || {}).texto) +
    ' (' + s.formas.length + ' formas' + (ruins.length ? ' · FORA: ' + ruins.map(r => r.tipo + ' ' + JSON.stringify(r.texto || '')).join(', ') : '') +
    ')' + (falha ? ' ✗ FALHA' : ''));
});
console.log(fora ? '✗ ' + fora + ' formas fora da página' : '✓ nada fora da página');
const primeira = { slides: deck.length, vazio: deck.some(s => s.nome === 'slide vazio do deck novo') };
if (saida) fs.writeFileSync(saida, JSON.stringify({ W: 720, H: 405, slides: deck.map(s => ({ fundo: s.fundo, formas: s.formas.map(f => {
  const o = Object.assign({}, f); delete o.getText; delete o.getFill; delete o.getBorder; delete o.setContentAlignment;
  if (o.tipo === 'TRIANGLE') o.tipo = 'ELLIPSE';
  return o; }) })) }));

// Os dois vão para o meio de outro deck (slide à mão antes e depois) e roda de novo: têm que voltar no mesmo lugar.
const antes = slide('ANTES (feito à mão)'), depois = slide('DEPOIS (feito à mão)');
deck.unshift(antes); deck.push(depois);
gerarApresentacaoHousekeeping();
const ordem = deck.map(s => s === antes ? 'A' : s === depois ? 'D' : s.nota === TAG_HOUSEKEEPING ? 'H' : '?').join('');
console.log('2ª execução:', logs.slice(-2).join(' · '), '· ordem:', ordem);

const falhas = deck.filter(s => s.formas.some(f => /Falha ao desenhar/.test(f.texto || ''))).length;
const erros = [];
if (fora) erros.push(fora + ' formas fora da página');
if (falhas) erros.push(falhas + ' slides com aviso de falha');
if (primeira.slides !== 2 || primeira.vazio) erros.push('1ª execução: ' + primeira.slides + ' slides, vazio ficou=' + primeira.vazio);
if (criados !== 1 || abertos.join() !== 'DECK_HK' || props.HK_DECK_ID !== 'DECK_HK') erros.push('criou ' + criados + ', abriu ' + abertos);
if (ordem !== 'AHHD') erros.push('2ª execução saiu na ordem ' + ordem + ' (esperado AHHD)');
if (deck.some(s => s.formas.some(f => /Garante/.test(f.texto || '')))) erros.push('"Garante" ainda aparece num slide (o papel saiu da Matriz)');
if (erros.length) { console.log('✗ reprovado: ' + erros.join('; ')); process.exitCode = 1; }
else console.log('✓ aprovado');
