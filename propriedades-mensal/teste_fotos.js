// node teste_fotos.js — slides de fotos das seções 04, 05 e 06 (23_Slide_Fotos.gs).
// Dublês de Slides e do Drive: pastas e "fotos" em memória.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let falhas = 0, total = 0;
function checa(cond, nome) { total++; if (cond) console.log('  ✓ ' + nome); else { falhas++; console.log('  ✗ ' + nome); } }

const LARG = 720, ALT = 405;
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };
const espelho = new Proxy({}, { get: (_, k) => k });
global.SlidesApp = { ShapeType: espelho, ContentAlignment: espelho, ParagraphAlignment: espelho,
                     PredefinedLayout: espelho, DashStyle: espelho, LineCategory: espelho };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };

// ── Slides ──
const slides = [];
let seq = 0;
function estilo() { const o = {}; ['setFontSize', 'setBold', 'setItalic', 'setForegroundColor', 'setFontFamily']
  .forEach(k => { o[k] = () => o; }); return o; }
function novoSlide() {
  const s = { id: 'p' + (++seq), shapes: [], imgs: [], nota: '' };
  const ins = (tipo, x, y, w, h) => {
    if ([x, y, w, h].some(v => typeof v !== 'number' || !isFinite(v)) || w < 0 || h < 0)
      throw new Error('geometria inválida ' + tipo);
    let txt = '';
    const sh = { tipo, x, y, w, h, get txt() { return txt; },
      getText: () => ({ setText: t => { txt = String(t); return { getTextStyle: estilo }; }, getTextStyle: estilo,
                        getParagraphStyle: () => ({ setParagraphAlignment: () => ({}) }) }),
      getFill: () => ({ setSolidFill: () => {} }),
      getBorder: () => { const b = { setTransparent: () => b, setWeight: () => b, setDashStyle: () => b,
                                     getLineFill: () => ({ setSolidFill: () => {} }) }; return b; },
      setContentAlignment: () => sh };
    s.shapes.push(sh); return sh;
  };
  Object.assign(s, {
    insertShape: ins,
    insertLine: (c, x1, y1, x2, y2) => { const l = ins("LINE", Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      l.getLineFill = () => ({ setSolidFill: () => {} }); l.setWeight = () => l; l.setDashStyle = () => l; return l; },
    insertTextBox: (txt, x, y, w, h) => { const b = ins("TEXT_BOX", x, y, w, h); b.getText().setText(txt); return b; },
    insertImage: blob => {
      const im = { ar: blob.ar, x: 0, y: 0, w: 400 * blob.ar, h: 400,
        getWidth() { return this.w; }, getHeight() { return this.h; },
        setWidth(v) { this.w = v; return this; }, setHeight(v) { this.h = v; return this; },
        setLeft(v) { this.x = v; return this; }, setTop(v) { this.y = v; return this; },
        getBorder: () => ({ setWeight: () => ({ getLineFill: () => ({ setSolidFill: () => {} }) }) }),
        remove() {} };
      s.imgs.push(im); return im;
    },
    getImages: () => s.imgs.map(i => ({ getWidth: () => i.w, getHeight: () => i.h })),
    getShapes: () => [],
    getBackground: () => ({ setSolidFill: () => {} }),
    getObjectId: () => s.id,
    getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({
      setText: t => { s.nota = String(t); }, asString: () => s.nota, appendText: t => { s.nota += t; } }) }) }),
    remove: () => slides.splice(slides.indexOf(s), 1),
    move: i => { const de = slides.indexOf(s); slides.splice(de, 1); slides.splice(de < i ? i - 1 : i, 0, s); }
  });
  return s;
}
const deck = { getPageWidth: () => LARG, getPageHeight: () => ALT, getSlides: () => slides.slice(),
               appendSlide: () => { const s = novoSlide(); slides.push(s); return s; } };

// ── Drive ──
function pasta(nome, filhas, arquivos) {
  const p = { nome, filhas: filhas || [], arquivos: arquivos || [], getName: () => p.nome,
    getFolders: () => { let i = 0; return { hasNext: () => i < p.filhas.length, next: () => p.filhas[i++] }; },
    getFoldersByName: n => { const a = p.filhas.filter(f => f.nome === n); let i = 0;
      return { hasNext: () => i < a.length, next: () => a[i++] }; },
    getFiles: () => { let i = 0; return { hasNext: () => i < p.arquivos.length, next: () => p.arquivos[i++] }; },
    createFolder: n => { const f = pasta(n); p.filhas.push(f); return f; } };
  return p;
}
let t0 = 0;
const foto = (nome, ar) => ({ getName: () => nome, getMimeType: () => 'image/jpeg', getDateCreated: () => ++t0,
                              getBlob: () => ({ ar }) });
const pdf = { getName: () => 'orçamento.pdf', getMimeType: () => 'application/pdf', getDateCreated: () => 0, getBlob: () => ({}) };
const FOTOS = pasta('FOTOS', [
  pasta('04 - OBRAS E CONTRATAÇÕES', [pasta('10 - OUTUBRO', [
    pasta('02 - MEGA CURITIBA - Troca de zenitais (CONCLUÍDO)', [], [foto('a', 0.75), foto('b', 0.75)]),
    pasta('01 - MEGA ESTEIO - Reparo do muro B2 (EM ANDAMENTO)', [],
          [foto('1', 1.5), foto('2', 1.33), foto('3', 1.5), foto('4', 1.33), foto('5', 1.5), pdf]),
    pasta('03 - vazia', [], [pdf])
  ])]),
  pasta('VISTORIAS', [pasta('09 - AGOSTO')])
]);
global.DriveApp = { getFileById: () => ({ getBlob: () => ({ ar: 3.5 }), getParents: () => { let f = 0;
  return { hasNext: () => !f, next: () => { f = 1; return pasta('04 - PROPRIEDADES', [FOTOS]); } }; } }) };
global.SpreadsheetApp = { openById: () => { throw new Error('sem planilha'); } };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));
global.getDeckMensal_ = () => deck;
global.obterMesReferencia_ = () => ({ index: 9, nome: 'OUTUBRO', curto: 'Out', ano: 2026, label: 'OUTUBRO 2026' });

// Deck como o Guilherme montou (resumido): capas de seção com tag, encerramento no fim.
const comNota = (nota, nome) => { const s = novoSlide(); s.nota = nota; s.nome = nome; slides.push(s); return s; };
comNota(TAG_CAPA, 'CAPA');
[1, 2, 3, 4].forEach(n => comNota(_capaTagSecao_(n), 'SEÇÃO ' + n));
comNota('', 'RECEBIMENTO (à mão)');
comNota(_capaTagSecao_(5), 'SEÇÃO 5');
comNota('', 'MONITORAMENTO');
comNota(_capaTagSecao_(6), 'SEÇÃO 6');
comNota(TAG_ENCERRAMENTO, 'FIM');

console.log('\n== Nome da pasta → legenda e etiqueta ==');
const n = _fotosNome_('01 - MEGA ESTEIO - Reparo do muro B2 (EM ANDAMENTO)');
checa(n.nome === 'MEGA ESTEIO — REPARO DO MURO B2' && n.tag === 'EM ANDAMENTO', JSON.stringify(n));

console.log('\n== Geração ==');
gerarSlidesFotos();
const nomeDe = s => s.nome || (s.shapes.filter(x => x.txt).map(x => x.txt).find(t => /MEGA|IMÓVEL/.test(t)) || '?');
const ordem = slides.map(nomeDe);
console.log('    ' + ordem.join(' | '));
const i5 = ordem.indexOf('SEÇÃO 5'), i6 = ordem.indexOf('SEÇÃO 6');
checa(ordem[i5 - 2] === 'MEGA ESTEIO — REPARO DO MURO B2' && ordem[i5 - 1] === 'MEGA CURITIBA — TROCA DE ZENITAIS',
      'seção 04: um slide por serviço, na ordem "01, 02", no fim da seção (antes da capa 05)');
checa(ordem[i6 - 1] === '[ IMÓVEL — SERVIÇO ]', 'seção 05 sem fotos do mês: molduras vazias antes da capa 06');
checa(ordem[ordem.length - 2] === '[ IMÓVEL — SERVIÇO ]' && ordem[ordem.length - 1] === 'FIM', 'seção 06: antes do encerramento');
checa(!ordem.some(t => /VAZIA/i.test(t)), 'pasta sem imagem (só PDF) não vira slide');

const esteio = slides.find(s => nomeDe(s) === 'MEGA ESTEIO — REPARO DO MURO B2');
const fotosE = esteio.imgs.filter(i => i.ar !== 3.5);   // 3.5 = logo do cabeçalho no dublê
checa(fotosE.length === 4, 'no máximo 4 fotos (havia 5 e um PDF)');
const hs = fotosE.map(i => Math.round(i.h * 100));
checa(hs.every(h => h === hs[0]), 'fotos na mesma altura (fileira única)');
checa(fotosE.every(i => i.x >= 0 && i.y >= 0 && i.x + i.w <= LARG && i.y + i.h <= ALT), 'fotos dentro da página');
checa(esteio.shapes.some(x => x.txt === 'EM ANDAMENTO'), 'etiqueta "EM ANDAMENTO" no cabeçalho');

const pastaVist = FOTOS.filhas.find(f => f.nome === 'VISTORIAS');
checa(pastaVist.filhas.some(f => f.nome === '10 - OUTUBRO'), 'cria VISTORIAS/10 - OUTUBRO para pôr as fotos');
checa(FOTOS.filhas.some(f => f.nome === '06 - ADEQUAÇÕES DE CLIENTES' && f.filhas[0].nome === '10 - OUTUBRO'),
      'cria 06 - ADEQUAÇÕES DE CLIENTES/10 - OUTUBRO');

console.log('\n== Regerar não duplica ==');
const antes = slides.length;
gerarSlidesFotos();
checa(slides.length === antes, 'mesmo nº de slides (' + antes + ')');
checa(slides.map(nomeDe).join('|') === ordem.join('|'), 'mesma ordem');

console.log(falhas ? '\n✗ ' + falhas + ' de ' + total + ' falharam' : '\n✓ ' + total + '/' + total + ' passaram');
process.exitCode = falhas ? 1 : 0;
