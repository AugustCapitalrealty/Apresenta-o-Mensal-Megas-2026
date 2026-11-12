// Teste local do gerador de P&G, sem Google: dubla SlidesApp/DriveApp/
// SpreadsheetApp, roda gerarApresentacaoPG() com o export REAL e a carga
// inicial da planilha (05_Planilha.gs), e confere o deck desenhado.
//
// Uso: node teste_pg.js <export.csv> [PREVIA=<pasta>] [CHEIO=1]
//   PREVIA=<pasta>  grava formas.json para ../ferramentas/previa_slides.js
//   CHEIO=1         planilha com todos os campos preenchidos (exemplo de layout,
//                   NÃO são dados reais) para ver portfólio/cronograma cheios.
// Fica fora do clasp push (.claspignore só sobe *.gs).
const fs = require('fs'), path = require('path'), vm = require('vm');

const csv = process.argv[2];
if (!csv) { console.log('Uso: node teste_pg.js <export.csv>'); process.exit(1); }
const PREVIA = process.env.PREVIA, CHEIO = !!process.env.CHEIO;

let falhas = 0, oks = 0;
const ok = (c, msg) => { if (c) oks++; else { falhas++; console.log('  ✗ ' + msg); } };

// ---------------------------------------------------------------- dublês
const logs = [];
const Logger = { log: m => logs.push(String(m)) };

function parseCsv(t, d) {
  const rows = []; let row = [], cel = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(cel); cel = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cel); rows.push(row); row = []; cel = ''; }
    else cel += c;
  }
  if (cel || row.length) { row.push(cel); rows.push(row); }
  return rows;
}

let seq = 0;
function novoSlide(deck) {
  const s = { id: 'p' + (++seq), fundo: '#FFFFFF', formas: [], notas: '' };
  const reg = f => { s.formas.push(f); return f; };
  const texto = f => {
    const st = {}; ['setFontFamily', 'setFontSize', 'setBold', 'setItalic', 'setForegroundColor'].forEach(k => { st[k] = v => {
      ({ setFontFamily: () => f.fonte = v, setFontSize: () => f.fs = v, setBold: () => f.negrito = v,
         setItalic: () => f.italico = v, setForegroundColor: () => f.corTexto = v })[k](); return st; }; });
    const ps = { setParagraphAlignment: a => { f.align = a; return ps; }, setSpaceAbove: () => ps, setSpaceBelow: () => ps, setLineSpacing: () => ps };
    return { getTextStyle: () => st, getParagraphStyle: () => ps, asString: () => f.texto || '', setText: t => { f.texto = t; } };
  };
  const forma = f => {
    reg(f);
    return {
      getFill: () => ({ setSolidFill: (c, a) => { f.cor = c; f.alpha = a; }, setTransparent: () => { f.cor = null; } }),
      getBorder: () => ({ setTransparent: () => { f.borda = null; }, getLineFill: () => ({ setSolidFill: c => { f.borda = c; } }), setWeight: w => { f.peso = w; } }),
      getText: () => texto(f),
      setContentAlignment: a => { f.meio = a === 'MIDDLE'; }
    };
  };
  Object.assign(s, {
    getObjectId: () => s.id,
    getBackground: () => ({ setSolidFill: c => { s.fundo = c; } }),
    getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ setText: t => { s.notas = t; }, asString: () => s.notas }) }) }),
    insertShape: (tipo, x, y, w, h) => forma({ tipo, x, y, w, h }),
    insertTextBox: (t, x, y, w, h) => forma({ tipo: 'TEXT_BOX', x, y, w, h, texto: t }),
    insertLine: (c, x1, y1, x2, y2) => { const f = reg({ tipo: 'LINE', x1, y1, x2, y2, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
      return { getLineFill: () => ({ setSolidFill: c => { f.cor = c; } }), setWeight: w => { f.peso = w; } }; },
    insertImage: () => { const f = reg({ tipo: 'IMAGE', x: 0, y: 0, w: 350, h: 100, rotulo: 'logo' });
      const im = { getWidth: () => 350, getHeight: () => 100,
        setWidth: v => { f.w = v; return im; }, setHeight: v => { f.h = v; return im; }, setLeft: v => { f.x = v; return im; }, setTop: v => { f.y = v; return im; } };
      return im; },
    getShapes: () => s.formas.filter(f => f.texto != null).map(f => ({ getText: () => ({ asString: () => f.texto }) })),
    remove: () => { const i = deck.slides.indexOf(s); if (i >= 0) deck.slides.splice(i, 1); },
    move: i => { const j = deck.slides.indexOf(s); deck.slides.splice(j, 1); deck.slides.splice(i, 0, s); }
  });
  return s;
}

const arquivos = [];
function arquivo(o) { const f = Object.assign({ mime: 'text/csv' }, o);
  return Object.assign(f, { getName: () => f.nome, getId: () => f.id, getMimeType: () => f.mime, getUrl: () => 'https://exemplo/' + f.id,
    moveTo: () => {}, getBlob: () => ({ getDataAsString: cs => fs.readFileSync(f.caminho, /8859/.test(cs) ? 'latin1' : 'utf8') }) }); }
arquivos.push(arquivo({ id: 'CSV1', nome: path.basename(csv).replace(/^.*?(Planejamento)/i, 'Planejamento'), caminho: csv }));
arquivos.push(arquivo({ id: 'SS1', nome: 'PLANILHA PLANEJAMENTO & GESTÃO', mime: 'application/vnd.google-apps.spreadsheet' }));
const decks = {};
const DriveApp = {
  getFolderById: () => ({ getFiles: () => { let i = 0; return { hasNext: () => i < arquivos.length, next: () => arquivos[i++] }; } }),
  getFileById: id => arquivos.find(f => f.id === id) || { getBlob: () => ({}), moveTo: () => {}, getUrl: () => 'https://exemplo/' + id }
};
const SlidesApp = {
  ShapeType: { RECTANGLE: 'RECTANGLE', ROUND_RECTANGLE: 'ROUND_RECTANGLE', ELLIPSE: 'ELLIPSE', DIAMOND: 'DIAMOND' },
  ParagraphAlignment: { START: 'START', CENTER: 'CENTER', END: 'END' },
  ContentAlignment: { TOP: 'TOP', MIDDLE: 'MIDDLE' },
  LineCategory: { STRAIGHT: 'STRAIGHT' }, PredefinedLayout: { BLANK: 'BLANK' },
  create: nome => {
    const d = { id: 'DECK' + Object.keys(decks).length, slides: [] };
    Object.assign(d, { getId: () => d.id, getSlides: () => d.slides.slice(), saveAndClose: () => {},
      insertSlide: (i, l) => { const s = novoSlide(d); d.slides.splice(i, 0, s); return s; },
      appendSlide: l => { const s = novoSlide(d); d.slides.push(s); return s; } });
    d.slides.push(novoSlide(d));          // slide em branco inicial, como o Slides real
    decks[d.id] = d;
    arquivos.push(arquivo({ id: d.id, nome: nome, mime: 'application/vnd.google-apps.presentation' }));
    return d;
  },
  openById: id => decks[id]
};

function planilha(ctxG) {
  const metas = [ctxG.PG_CAB_METAS].concat(ctxG._pgCargaMetas_());
  let proj = [ctxG.PG_CAB_PROJETOS].concat(ctxG._pgCargaProjetos_());
  if (CHEIO) {   // EXEMPLO de layout (14 projetos → 2 páginas), não é dado real
    const d = (dd, mm) => new Date(2026, mm - 1, dd);
    for (let i = 0; i < 3; i++) proj.push(['Projeto de exemplo ' + (i + 1), 'Área X', i ? 'Pausado' : 'Concluído', i ? '' : d(15, 3),
      'Texto de exemplo para ver o layout com descrição longa ocupando duas linhas na coluna do que foi feito no projeto.']);
  }
  const abas = { METAS: metas, PROJETOS: proj };
  return { getUrl: () => 'https://exemplo/SS1', getId: () => 'SS1',
    getSheetByName: n => n === 'CONFIG' ? { getRange: () => ({ getDisplayValue: () => 'SETEMBRO 2026' }) }
      : abas[n] ? { getDataRange: () => ({ getValues: () => abas[n] }) } : null };
}

// ---------------------------------------------------------------- carga do código
const dir = __dirname;
const codigo = fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort()
  .map(f => fs.readFileSync(path.join(dir, f), 'utf8').replace(/^(const|let) /gm, 'var ')).join('\n');
const G = { Logger, SlidesApp, DriveApp, console, Date, Math,
  Utilities: { parseCsv },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'SS1', setProperty: () => {} }) } };
G.SpreadsheetApp = { openById: () => planilha(G) };
vm.createContext(G);
vm.runInContext(codigo, G);

// ---------------------------------------------------------------- execução
console.log('Rodando gerarApresentacaoPG()' + (CHEIO ? ' [planilha CHEIA de exemplo]' : '') + '…');
G.gerarApresentacaoPG();
const deck = Object.values(decks)[0];
// Slide da 1ª versão (portfólio) num deck já gerado: tem que sumir na regeração.
const velho = deck.insertSlide(5); velho.notas = '【PG_PORTFOLIO】\nslide-id: ' + velho.id;
G.gerarApresentacaoPG();   // 2ª vez: tem que trocar no lugar, sem duplicar
ok(!deck.slides.some(s => /PG_PORTFOLIO/.test(s.notas)), 'slide antigo de portfólio não foi removido');
logs.filter(l => /✗|⚠/.test(l)).forEach(l => console.log('  log: ' + l.split('\n')[0]));

// ---------------------------------------------------------------- conferências
const textos = s => s.formas.map(f => f.texto || '').join(' | ');
const nTags = deck.slides.map(s => (s.notas.match(/【PG_[A-Z_0-9]+】/) || [''])[0]);
console.log('Slides (' + deck.slides.length + '): ' + deck.slides.map((s, i) => i + ':' + (nTags[i].replace(/【PG_|】/g, '') || (/DESTAQUES/.test(textos(s)) ? 'DESTAQUES(manual)' : 'manual'))).join(' '));
ok(deck.slides.length === (CHEIO ? 17 : 16), 'quantidade de slides inesperada: ' + deck.slides.length);
ok(deck.slides.filter(s => /PG_PROJETOS_ANO/.test(s.notas)).length === (CHEIO ? 2 : 1), 'páginas da lista de projetos');
ok(deck.slides.filter(s => /PG_FAROL/.test(s.notas)).length === 1 && deck.slides.filter(s => /PG_META_DETALHE/.test(s.notas)).length === 4, 'metas faltando');
ok(nTags[0] === '【PG_CAPA】', 'capa não é o 1º slide');
ok(/DESTAQUES DO PER/.test(textos(deck.slides[1])), 'Destaques não está logo depois da capa');
ok(deck.slides.filter(s => /DESTAQUES DO PER/.test(textos(s))).length === 1, 'Destaques duplicado na 2ª execução');
ok(nTags[deck.slides.length - 1] === '【PG_ENCERRAMENTO】', 'encerramento não é o último');
ok(new Set(deck.slides.map(s => s.notas).filter(Boolean)).size === deck.slides.filter(s => s.notas).length, 'notas repetidas (slide duplicado?)');

deck.slides.forEach((s, i) => {
  const t = textos(s);
  ok(!/NÃO FOI GERADO/.test(t), 'slide ' + i + ' com falha: ' + t.slice(0, 200));
  ok(!/NaN|undefined|null|Infinity/.test(t), 'slide ' + i + ' com NaN/undefined/null no texto: ' + (t.match(/.{0,40}(NaN|undefined|null|Infinity).{0,40}/) || [''])[0]);
  s.formas.forEach(f => {
    const nums = ['x', 'y', 'w', 'h'].map(k => f[k]);
    ok(nums.every(n => typeof n === 'number' && isFinite(n)), 'slide ' + i + ' forma com número inválido: ' + JSON.stringify(f).slice(0, 120));
    if (f.tipo === 'ELLIPSE') return;    // grafismo do cabeçalho/capa sangra de propósito
    ok(f.x >= -1 && f.y >= -1 && f.x + f.w <= 721 && f.y + f.h <= 406, 'slide ' + i + ' forma fora da página: ' +
      f.tipo + ' ' + [f.x, f.y, f.w, f.h].map(Math.round).join(',') + ' ' + (f.texto || '').slice(0, 40));
  });
});

// Números: o total do DRE tem que bater com a soma do export (despesas 06).
const dre = deck.slides.find(s => /【PG_DRE】/.test(s.notas));
const linhaTot = dre && dre.formas.filter(f => f.texto && f.y > 0);
const iTot = linhaTot.findIndex(f => f.texto === 'TOTAL P&G');
const valsTot = linhaTot.filter(f => Math.abs(f.y - linhaTot[iTot].y) < 0.5).map(f => f.texto);
console.log('Linha TOTAL do DRE: ' + valsTot.join(' | '));
ok(valsTot.includes('9,9') && valsTot.includes('15,9') && valsTot.includes('220,8') && valsTot.includes('196,9') &&
   valsTot.includes('240,7') && valsTot.includes('216,8'), 'TOTAL do DRE não bate com o export (esperado 9,9/15,9 · 220,8/196,9 · 240,7/216,8)');

// Pessoal nunca abre (Guilherme, 12/11/2026); viagens abre no DRE, não no mês a mês.
const PESSOAL_DETALHE = /sal[aá]rio|encargo|provis[aã]o|provis[oõ]es|benef[ií]cio|b[oô]nus|inss|fgts|f[eé]rias|13º|assist[eê]ncia m[eé]dica|alimenta[cç][aã]o|vale transporte|seguro de vida|flex mobilidade/i;
deck.slides.forEach((s, i) => ok(!PESSOAL_DETALHE.test(textos(s)), 'slide ' + i + ' abre custo de pessoal: ' +
  (textos(s).match(new RegExp('.{0,40}' + PESSOAL_DETALHE.source + '.{0,40}', 'i')) || [''])[0]));
const txtTag = tag => textos(deck.slides.find(s => s.notas.indexOf(tag) >= 0));
ok(/PESSOAL/.test(txtTag('【PG_DRE】')) && /Hospedagem/.test(txtTag('【PG_DRE】')), 'DRE sem a linha Pessoal ou sem o detalhe de viagens');
ok(!/Hospedagem|Passagens/.test(txtTag('【PG_BRIDGE_TABELA】')) && /VIAGENS/.test(txtTag('【PG_BRIDGE_TABELA】')), 'mês a mês abrindo viagens');
ok(/Pessoal/.test(txtTag('【PG_BRIDGE_GRAFICO】')), 'cascata sem a barra Pessoal');

console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');

if (PREVIA) {
  fs.mkdirSync(PREVIA, { recursive: true });
  fs.writeFileSync(path.join(PREVIA, 'formas.json'), JSON.stringify({ W: 720, H: 405,
    slides: deck.slides.map(s => ({ fundo: s.fundo, formas: s.formas.map(f => Object.assign({}, f, {
      align: f.align, meio: f.meio })) })) }));
  console.log('formas.json gravado em ' + PREVIA);
}
process.exit(falhas ? 1 : 0);
