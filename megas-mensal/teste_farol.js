// Dublê do SlidesApp com DECK PERSISTENTE (slides ficam, notas ficam,
// remove() tira mesmo) — é o que permite provar a idempotência: rodar duas
// vezes tem que dar o mesmo número de slides.
//
// Também confere geometria (nada fora da página, dimensão/cor válida) e
// autonomia (nenhum nome de outro arquivo é procurado).
const fs = require('fs');
const vm = require('vm');

const ARQ = require('path').join(__dirname, 'Farol_Guilherme.gs');
const W = 720, H = 405;

let falhas = [];
const externas = new Set();
function erro(m) { falhas.push(m); }

function checarCor(c, onde) {
  if (typeof c !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(c)) erro('cor inválida em ' + onde + ': ' + c);
}

function novoDeck(nome) {
  const slides = [];

  function novoSlide() {
    let notas = null;                     // null = slide sem anotações
    const shapes = [];
    const s = {
      shapes,
      _notas: () => notas,
      getBackground: () => ({ setSolidFill: c => checarCor(c, 'fundo') }),
      getNotesPage: () => ({
        getSpeakerNotesShape: () => {
          if (notas === null) notas = '';  // o Slides cria a shape na 1ª leitura
          return {
            getText: () => ({
              asString: () => notas,
              setText: t => { notas = String(t); }
            })
          };
        }
      }),
      remove: () => {
        const i = slides.indexOf(s);
        if (i < 0) erro('remove() num slide que já saiu do deck');
        slides.splice(i, 1);
      },
      insertShape: (tipo, x, y, w, h) => {
        [['x', x], ['y', y], ['w', w], ['h', h]].forEach(([n, v]) => {
          if (typeof v !== 'number' || isNaN(v)) erro(tipo + ': ' + n + ' = ' + v);
        });
        if (w <= 0 || h <= 0) erro(tipo + ': dimensão ' + w + '×' + h);
        const sh = { tipo, x, y, w, h, txt: '' };
        shapes.push(sh);
        const border = { setWeight() { return border; }, setTransparent() { return border; },
                         getLineFill: () => ({ setSolidFill: c => checarCor(c, tipo + ' borda') }) };
        const style = { setFontSize(v) { if (!(v > 0)) erro('fontSize ' + v); return style; },
                        setBold: () => style, setItalic: () => style,
                        setForegroundColor(c) { checarCor(c, 'texto "' + sh.txt + '"'); return style; },
                        setFontFamily: () => style };
        const par = { setParagraphAlignment: () => par,
                      setLineSpacing(v) { if (v < 100) erro('lineSpacing ' + v); return par; } };
        const text = { setText(t) { sh.txt = String(t); return text; },
                       getTextStyle() { if (sh.txt === '') erro('estilizou caixa vazia'); return style; },
                       getParagraphStyle: () => par };
        return { getFill: () => ({ setSolidFill: c => checarCor(c, tipo + ' fundo') }),
                 getBorder: () => border, getText: () => text,
                 setContentAlignment() { return this; } };
      },
      insertLine: (cat, x1, y1, x2, y2) => {
        [x1, y1, x2, y2].forEach(v => { if (typeof v !== 'number' || isNaN(v)) erro('insertLine ' + v); });
        shapes.push({ tipo: 'LINE', x: Math.min(x1, x2), y: Math.min(y1, y2),
                      w: Math.abs(x2 - x1) || 1, h: Math.abs(y2 - y1) || 1, txt: '' });
        return { getLineFill: () => ({ setSolidFill: c => checarCor(c, 'linha') }), setWeight() { return this; } };
      },
      insertImage: (blob, x, y, w, h) => { shapes.push({ tipo: 'IMAGE', x, y, w, h, txt: '' }); }
    };
    slides.push(s);
    return s;
  }

  return {
    getName: () => nome,
    getPageWidth: () => W, getPageHeight: () => H,
    getSlides: () => slides.slice(),        // cópia, como a API real
    appendSlide: () => novoSlide(),
    _slides: slides
  };
}

const deck = novoDeck('Farol de Metas');
const logs = [];

const base = {
  SlidesApp: {
    PredefinedLayout: { BLANK: 'BLANK' },
    ShapeType: new Proxy({}, { get: (_, k) => String(k) }),
    ParagraphAlignment: new Proxy({}, { get: (_, k) => String(k) }),
    ContentAlignment: new Proxy({}, { get: (_, k) => String(k) }),
    LineCategory: { STRAIGHT: 'STRAIGHT' },
    openById: () => deck
  },
  DriveApp: { getFileById: () => { throw new Error('sem Drive no teste'); } },
  Logger: { log: m => logs.push(String(m)) },
  console
};

const ctx = vm.createContext(new Proxy(base, {
  has: () => true,
  get(alvo, chave) {
    if (chave === Symbol.unscopables) return undefined;
    if (chave in alvo) return alvo[chave];
    if (typeof chave === 'string' && !(chave in globalThis)) externas.add(chave);
    return globalThis[chave];
  }
}));

const fonte = fs.readFileSync(ARQ, 'utf8');
vm.runInContext(fonte, ctx, { filename: 'Farol_Guilherme.gs' });

console.log('── 1ª execução ────────────────────────────────');
ctx.gerarFarolGuilherme();
const n1 = deck._slides.length;
console.log('   slides no deck: ' + n1);

console.log('── 2ª execução (idempotência) ─────────────────');
ctx.gerarFarolGuilherme();
const n2 = deck._slides.length;
console.log('   slides no deck: ' + n2);
if (n1 !== 6) erro('1ª execução devia deixar 6 slides, deixou ' + n1);
if (n2 !== n1) erro('2ª execução duplicou: ' + n1 + ' → ' + n2);

console.log('── só o slide de Projetos ─────────────────────');
ctx.gerarProjetosPlanejamentoGestao();
const n3 = deck._slides.length;
console.log('   slides no deck: ' + n3);
if (n3 !== n1) erro('regerar só Projetos mudou o total: ' + n1 + ' → ' + n3);

// A etiqueta tem que estar em TODOS os 6, e uma por slide.
const tags = deck._slides.map(s => (s._notas() || '').split('\n')[0]);
const unicas = new Set(tags);
if (unicas.size !== 6) erro('etiquetas repetidas ou faltando: ' + JSON.stringify(tags));
if (tags.some(t => t.indexOf('[FAROL-PEG]') !== 0)) erro('slide sem etiqueta: ' + JSON.stringify(tags));

// Slide alheio (sem anotações) não pode ser tocado.
const alheio = deck.appendSlide();
alheio.__marca = 'MEU SLIDE À MÃO';
ctx.gerarFarolGuilherme();
if (deck._slides.indexOf(alheio) < 0) erro('o script apagou um slide que não é dele');

console.log('── diagnóstico ────────────────────────────────');
logs.length = 0;
ctx.diagnosticarFarol();
console.log(logs.join('\n').split('\n').map(l => '   ' + l).join('\n'));

// --- Geometria de todas as páginas ---
deck._slides.forEach((s, i) => {
  s.shapes.forEach(sh => {
    if (sh.x < -1 || sh.y < -1 || sh.x + sh.w > W + 1 || sh.y + sh.h > H + 1) {
      erro('slide ' + (i + 1) + ': fora da página — ' + sh.tipo + ' "' + sh.txt + '"');
    }
  });
});

console.log('\n' + '─'.repeat(48));
if (externas.size) {
  erro('DEPENDÊNCIAS EXTERNAS: ' + [...externas].join(', '));
}
if (falhas.length) {
  console.log('✗ ' + falhas.length + ' problema(s):');
  falhas.forEach(f => console.log('   · ' + f));
  process.exit(1);
}
console.log('✓ autônomo · idempotente · geometria OK · não toca em slide alheio');
