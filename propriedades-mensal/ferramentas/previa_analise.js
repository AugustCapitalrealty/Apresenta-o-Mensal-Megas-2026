// Prévia em PNG dos slides de Análise de Projetos (em andamento + concluídas do
// mês, e indicadores), SEM o Google Slides: roda o gerador de verdade
// (16_Slide_RecebimentoObras.gs) contra um dublê que grava cada forma, e passa o
// resultado para ../../ferramentas/previa_slides.js (fonte Montserrat real, recuo
// interno de 7,2 pt da caixa de texto imitado, Edge/Chrome headless).
//
// Uso (de dentro de propriedades-mensal/):
//   node ferramentas/previa_analise.js <pasta de saída> [mês 1-12 do deck]
// Dados: teste_analise_fixture.json (os 34 registros da planilha de 16/11/2026).
// Saída: slide_0.png … (os de tabela) e o último é o de indicadores.
//
// É uma aproximação: a quebra de linha do Slides pode diferir em uma ou outra
// palavra, mas caixa estreita demais (lição 1) aparece aqui do mesmo jeito.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const DIR = path.resolve(__dirname, '..');

const saida = process.argv[2];
const mesDeck = Number(process.argv[3] || 10);
if (!saida) { console.log('Uso: node ferramentas/previa_analise.js <pasta de saída> [mês 1-12]'); process.exit(1); }
fs.mkdirSync(saida, { recursive: true });

const LARG = 720, ALT = 405;
global.Logger = { log: () => {} };

// ── Dublê que GRAVA as formas ───────────────────────────────────────────
const slides = [];
function inserir(tipo, x, y, w, h, alvo) {
  const f = { tipo, x, y, w, h };
  alvo.push(f);
  const est = {
    setFontSize: n => { f.fs = n; return est; }, setBold: b => { f.negrito = !!b; return est; },
    setItalic: b => { f.italico = !!b; return est; }, setForegroundColor: c => { f.corTexto = c; return est; },
    setFontFamily: () => { f.fonte = 'Montserrat'; return est; }, setUnderline: () => est
  };
  const ps = { setLineSpacing: () => ps, setParagraphAlignment: a => { f.align = a; return ps; } };
  const txt = {
    setText: t => { f.texto = String(t); return txt; }, appendText: t => { f.texto = (f.texto || '') + t; return txt; },
    getTextStyle: () => est, getRange: () => ({ getTextStyle: () => est }),
    getParagraphStyle: () => ps, asString: () => f.texto || ''
  };
  const borda = {
    setTransparent: () => borda, setWeight: p => { f.peso = p; return borda; }, setDashStyle: () => borda,
    getLineFill: () => ({ setSolidFill: c => { f.borda = c; } })
  };
  const s = {
    getFill: () => ({ setSolidFill: (c, a) => { f.cor = c; if (a !== undefined) f.alpha = a; } }),
    getBorder: () => borda, getText: () => txt,
    setContentAlignment: a => { f.meio = a === 'MIDDLE'; return s; }, setRotation: () => s,
    getObjectId: () => 'f' + formas0.length
  };
  return s;
}
const formas0 = [];
const espelho = new Proxy({}, { get: (_, k) => k });
global.SlidesApp = { ShapeType: espelho, ContentAlignment: espelho, ParagraphAlignment: espelho,
                     PredefinedLayout: espelho, LineCategory: espelho, DashStyle: espelho };
const deck = {
  getPageWidth: () => LARG, getPageHeight: () => ALT, getSlides: () => slides.map(s => s._api),
  appendSlide: () => {
    const reg = { fundo: '#FFFFFF', formas: [] };
    const api = {
      insertShape: (t, x, y, w, h) => inserir(t, x, y, w, h, reg.formas),
      insertTextBox: (txt, x, y, w, h) => { const s = inserir('TEXT_BOX', x || 0, y || 0, w || 0, h || 0, reg.formas); s.getText().setText(txt); return s; },
      insertLine: (cat, x1, y1, x2, y2) => {
        const f = { tipo: 'LINE', x1, y1, x2, y2, peso: 1 }; reg.formas.push(f);
        const l = { getLineFill: () => ({ setSolidFill: c => { f.cor = c; } }), setWeight: p => { f.peso = p; return l; }, setDashStyle: () => l };
        return l;
      },
      insertImage: () => { const o = { setWidth() { return o; }, setHeight() { return o; }, setLeft() { return o; }, setTop() { return o; },
                                       getWidth: () => 100, getHeight: () => 50 }; return o; },
      getBackground: () => ({ setSolidFill: c => { reg.fundo = c; } }),
      getPageElements: () => [], remove() {}, move() {},
      getObjectId: () => 's' + slides.length,
      getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ setText: () => {}, asString: () => '' }) }) })
    };
    reg._api = api;
    slides.push(reg);
    return api;
  }
};

// ── Planilha dublada: cabeçalho + os 34 registros ───────────────────────
const CAB = ['Empr.', 'Locatário', 'Objetivo', 'Compl.', 'Mem.', 'Recebim.', 'Entrega', 'Avaliador', 'Status', 'Prazo'];
const VALORES = [CAB].concat(JSON.parse(fs.readFileSync(path.join(DIR, 'teste_analise_fixture.json'), 'utf8')));
const aba = { getName: () => 'Análise de Projetos', getLastRow: () => VALORES.length, getLastColumn: () => CAB.length,
              getRange: () => ({ getValues: () => VALORES, getDisplayValues: () => VALORES }) };
global.SpreadsheetApp = { openById: () => ({ getName: () => 'dublê', getSheets: () => [aba], getSheetByName: () => aba }) };
global.DriveApp = { getFileById: () => ({ getBlob: () => null }) };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
global.MimeType = { GOOGLE_SLIDES: 'slides' };

const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n').replace(/^(const|let) /gm, 'var '));

const NOMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
global.getDeckMensal_ = () => deck;
global.obterMesReferencia_ = () => ({ index: mesDeck - 1, nome: NOMES[mesDeck - 1], curto: CURTO[mesDeck - 1], ano: 2026,
                                      fonte: 'dublê', label: NOMES[mesDeck - 1] + ' / 2026' });

_analiseGerar_(deck);

const json = path.join(saida, 'formas_analise.json');
fs.writeFileSync(json, JSON.stringify({ W: LARG, H: ALT, slides: slides.map(s => ({ fundo: s.fundo, formas: s.formas })) }));
console.log(slides.length + ' slide(s) → ' + json);
execFileSync('node', [path.resolve(DIR, '..', 'ferramentas', 'previa_slides.js'), json, saida], { stdio: 'inherit' });
