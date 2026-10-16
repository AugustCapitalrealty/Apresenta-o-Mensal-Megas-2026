/**
 * Teste das CAPAS (21_Slide_Capas.gs + gerarSlideCapa): capa, capas de seção e encerramento.
 *
 * O que trava:
 *   · a capa de seção feita à mão é TROCADA NO MESMO LUGAR — a ordem do deck é do time;
 *   · da segunda vez a capa é achada pela tag (não duplica, não some);
 *   · seção sem capa no deck NÃO ganha uma (e o Logger diz como pedir);
 *   · a capa do deck volta para o 1º slide (appendSlide joga no fim);
 *   · o encerramento é sempre o último e não duplica;
 *   · com as imagens na pasta: fundo em imagem + mês; sem elas: formas, dentro da página;
 *   · o DRE continua achando a capa FINANCEIRO depois que ela vira imagem (tag).
 *
 * Rode com:  node propriedades-mensal/teste_capas.js
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let ok = 0, falhou = 0;
function checa(cond, msg) { if (cond) { ok++; console.log('  ✓ ' + msg); } else { falhou++; console.log('  ✗ ' + msg); } }

const LARG = 720, ALT = 405;
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
const espelho = new Proxy({}, { get: (_, k) => k });
global.SlidesApp = { ShapeType: espelho, ContentAlignment: espelho, ParagraphAlignment: espelho,
                     PredefinedLayout: espelho, LineCategory: espelho, DashStyle: espelho,
                     PageElementType: { SHAPE: 'SHAPE' } };

// ── Dublê do deck: slides com nota, texto e imagens; move/remove de verdade ──
let seq = 0;
const slides = [];
function estilo() { const o = {}; ['setFontSize', 'setBold', 'setForegroundColor', 'setFontFamily', 'setItalic'].forEach(k => o[k] = () => o); return o; }
function novoSlide(textos, nota) {
  const s = { id: 's' + (++seq), shapes: [], imagens: [], nota: nota || '' };
  const ps = () => { const p = { setLineSpacing: () => p, setParagraphAlignment: () => p }; return p; };
  s.insertShape = (tipo, x, y, w, h) => {
    if ([x, y, w, h].some(v => typeof v !== 'number' || !isFinite(v))) throw new Error('geometria inválida');
    const t = { _t: '' };
    const txt = { setText(v) { t._t = String(v); return txt; }, getTextStyle: estilo, getParagraphStyle: ps, asString: () => t._t };
    const sh = { tipo, x, y, w, h, get txt() { return t._t; }, getText: () => txt,
                 getFill: () => ({ setSolidFill: () => {} }), getBorder: () => ({ setTransparent: () => {} }),
                 setContentAlignment: () => sh, getPageElementType: () => 'SHAPE', asShape: () => sh };
    s.shapes.push(sh); return sh;
  };
  (textos || []).forEach(t => s.insertShape('TEXT_BOX', 10, 10, 100, 20).getText().setText(t));
  s.insertImage = blob => {
    const im = { blob, w: 0, h: 0, setWidth(v) { im.w = v; return im; }, setHeight(v) { im.h = v; return im; },
                 setLeft() { return im; }, setTop() { return im; }, getWidth: () => 200, getHeight: () => 100,
                 sendToBack() { im.atras = true; return im; }, setTitle() { return im; }, setDescription() { return im; } };
    s.imagens.push(im); return im;
  };
  s.getBackground = () => ({ setSolidFill: () => {} });
  s.getPageElements = () => s.shapes;
  s.getObjectId = () => s.id;
  s.getNotesPage = () => ({ getSpeakerNotesShape: () => ({ getText: () => ({
    setText: v => { s.nota = String(v); }, asString: () => s.nota }) }) });
  s.remove = () => { const i = slides.indexOf(s); if (i >= 0) slides.splice(i, 1); };
  // Slide.move(i): i conta na ordem ANTES de mover.
  s.move = i => { const de = slides.indexOf(s); slides.splice(de, 1); slides.splice(de < i ? i - 1 : i, 0, s); };
  return s;
}
const deck = {
  getPageWidth: () => LARG, getPageHeight: () => ALT, getSlides: () => slides.slice(),
  appendSlide: () => { const s = novoSlide(); slides.push(s); return s; }
};
const capaMao = nome => novoSlide(['CAPITAL REALTY', 'APRESENTAÇÃO MENSAL', nome, 'Obras, Contratações e Indicadores do Mês', 'AGOSTO 2026']);

// O deck de setembro/2026, resumido: capa, destaques, seções feitas à mão (sem VISTORIAS, para testar o "não cria").
function montarDeck() {
  slides.length = 0;
  slides.push(novoSlide(['CAPITAL REALTY', 'APRESENTAÇÃO MENSAL', 'GESTÃO DE\nPROPRIEDADES', 'Obras, Contratações e Indicadores do Mês'], '【PROP_CAPA_AUTO】'));
  slides.push(novoSlide(['DESTAQUES DO PERÍODO']));
  slides.push(capaMao('FINANCEIRO'));
  slides.push(novoSlide(['DRE — MANUTENÇÃO']));
  slides.push(capaMao('MANUTENÇÕES'));
  slides.push(novoSlide(['MANUTENÇÃO PREVENTIVA']));
  slides.push(capaMao('GESTÃO DE CONTRATAÇÕES'));
  slides.push(capaMao('OBRAS E CONTRATAÇÕES\nEM ANDAMENTO'));
  slides.push(novoSlide(['VISTORIAS DE ROTINA']));
  slides.push(capaMao('ADEQUAÇÕES DE CLIENTES'));
  slides.push(novoSlide(['STATUS PROJETOS APROVADOS']));
}
const textoDe = s => s.shapes.map(x => x.txt).join(' | ');
const ordem = () => slides.map(s => (s.nota.match(/【(PROP_[A-Z0-9_]+)】/) || [, textoDe(s).slice(0, 22)])[1]);

// ── Imagens: pasta IMAGENS - SLIDES com ou sem os arquivos ──
let comImagens = false;
global.DriveApp = {
  getFileById: id => ({ getBlob: () => 'blob:' + id }),
  getFolderById: () => ({ getFoldersByName: () => {
    let dado = false;
    return { hasNext: () => !dado, next: () => { dado = true; return { getFilesByName: nome => {
      const tem = comImagens || /^LOGO/.test(nome); let foi = false;
      return { hasNext: () => tem && !foi, next: () => { foi = true; return { getBlob: () => 'blob:' + nome }; } };
    } }; } };
  } })
};
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha no teste'); } };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));
global.getDeckMensal_ = () => deck;
global.obterMesReferencia_ = () => ({ index: 8, nome: 'SETEMBRO', curto: 'Set', ano: 2026, label: 'SETEMBRO 2026' });
const rodar = () => { _capasBlobs_ = {}; gerarSlideCapa(); gerarCapasSecoes(); gerarSlideEncerramento(); };
const dentro = s => s.shapes.every(x => x.x >= -1 && x.y >= -0.5 && x.x + x.w <= LARG + 1 && x.y + x.h <= ALT + 0.5);

// ─────────────────────────────────────────────────────────────────────────
console.log('\n== Sem as imagens (formas) ==');
montarDeck();
const n0 = slides.length;
rodar();
const o1 = ordem();
checa(o1[0] === 'PROP_CAPA_AUTO', 'a capa refeita volta para o 1º slide, não para o fim');
checa(o1[1].indexOf('DESTAQUES') === 0, 'os Destaques ficam logo depois da capa');
checa(o1[2] === 'PROP_SECAO_01_AUTO' && o1[3].indexOf('DRE') === 0, 'FINANCEIRO trocada no lugar, antes do DRE');
checa(o1[4] === 'PROP_SECAO_02_AUTO' && o1[5].indexOf('MANUTENÇÃO PREVENTIVA') === 0, 'MANUTENÇÕES no lugar');
checa(o1[6] === 'PROP_SECAO_03_AUTO' && o1[7] === 'PROP_SECAO_04_AUTO', 'CONTRATAÇÕES e OBRAS no lugar');
checa(o1[9] === 'PROP_SECAO_06_AUTO', 'ADEQUAÇÕES no lugar');
checa(o1.indexOf('PROP_SECAO_05_AUTO') < 0, 'VISTORIAS sem capa no deck → não criada');
checa(logs.some(l => /Seção 5 \(Vistorias\).*não criada/.test(l)), 'e o Logger diz qual faltou e como pedir');
checa(o1[o1.length - 1] === 'PROP_ENCERRAMENTO_AUTO', 'encerramento é o último');
checa(slides.length === n0 + 1, 'mesmo nº de slides + o encerramento (nenhuma capa duplicada)');
checa(!slides.some(s => /AGOSTO 2026/.test(textoDe(s))), 'nenhuma capa ficou com AGOSTO (mês antigo)');
checa(slides.filter(s => /PROP_SECAO|PROP_CAPA|PROP_ENCERR/.test(s.nota)).every(dentro), 'capas em formas dentro da página');
const sec4 = slides.find(s => /PROP_SECAO_04/.test(s.nota));
checa(/OBRAS E CONTRATAÇÕES EM ANDAMENTO/.test(textoDe(sec4)) && /SETEMBRO 2026/.test(textoDe(sec4)), 'em formas: título e mês no slide');

console.log('\n== Segunda geração: acha pela tag, não duplica ==');
rodar();
const o2 = ordem();
checa(JSON.stringify(o2) === JSON.stringify(o1), 'mesma ordem da primeira');
checa(slides.length === n0 + 1, 'mesmo nº de slides');

console.log('\n== Com as imagens na pasta ==');
comImagens = true;
rodar();
const capa = slides[0], s1 = slides.find(s => /PROP_SECAO_01/.test(s.nota)), enc = slides[slides.length - 1];
checa(capa.imagens.some(i => i.blob === 'blob:CAPA - PROPRIEDADES MENSAL.jpg' && i.atras && i.w === LARG && i.h === ALT), 'capa: imagem de slide inteiro atrás');
checa(/SETEMBRO 2026/.test(textoDe(capa)), 'capa: mês por cima, como texto');
checa(capa.imagens.filter(i => /LOGO|1Tx9/.test(i.blob)).length === 2, 'capa: logos CR e Demercado');
checa(s1.imagens.some(i => i.blob === 'blob:SECAO - PROPRIEDADES MENSAL - 01.jpg'), 'seção 01: imagem SECAO … 01');
checa(textoDe(s1) === 'SETEMBRO 2026', 'seção 01: só o mês como texto (o resto está na imagem)');
checa(enc.imagens.some(i => i.blob === 'blob:ENCERRAMENTO - PROPRIEDADES MENSAL.jpg'), 'encerramento em imagem');
checa(slides.length === n0 + 1 && JSON.stringify(ordem().filter(x => /^PROP_/.test(x))) ===
      JSON.stringify(o1.filter(x => /^PROP_/.test(x))), 'trocar formas por imagem não mexe na ordem');
checa([capa, s1, enc].every(dentro), 'texto por cima dentro da página');

console.log('\n== O DRE acha a capa FINANCEIRO pela tag ==');
const dre = novoSlide(['DRE — MANUTENÇÃO X']); slides.push(dre);
_drePosicionarNaSecao_(deck, dre, 'DRE', 1);
checa(slides.indexOf(dre) === slides.indexOf(s1) + 1, 'DRE posicionado logo depois da capa 01 em imagem');

console.log('\n' + (falhou ? '✗ ' + falhou + ' de ' + (ok + falhou) + ' falharam' : '✓ ' + ok + '/' + ok + ' passaram') + '\n');
process.exit(falhou ? 1 : 0);
