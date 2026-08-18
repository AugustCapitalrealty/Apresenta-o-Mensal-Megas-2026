/**
 * Teste dos slides unificados (Corretiva e Preventiva, três escopos cada).
 *
 * Enquanto eram seis arquivos, "os três escopos desenham o mesmo slide" era
 * uma promessa que ninguém verificava — e não era verdade: a variante Hangar
 * tinha ficado sem a folga do rótulo de barra. Agora que o desenho é um só,
 * este teste trava as duas coisas que a unificação precisa garantir:
 *
 *   1. cada escopo lê a SUA aba, as SUAS linhas e as SUAS células;
 *   2. o desenho sai igual para todos (mesma folga, mesma régua de cartões).
 *
 * Padrão do CLAUDE.md: lê os .gs como texto, dubla SlidesApp/SpreadsheetApp e
 * registra cada shape inserida para conferir a geometria depois.
 *
 * Rode com:  node boletim/teste_slides.js
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

// ── Dublês ──────────────────────────────────────────────────────────────
let logs = [];
global.Logger = { log: m => logs.push(String(m)) };

// --- Planilha ---------------------------------------------------------
// Grade densa: as funções leem tanto por A1 ('BM12') quanto por (linha, col).
const NROWS = 200, NCOLS = 80;
let GRID = null;
let ABAS_PEDIDAS = [];      // que abas o código tentou abrir

function novaGrade() {
  return Array.from({ length: NROWS }, () => Array(NCOLS).fill(''));
}
function colToIdx(letras) {           // 'A'->0, 'BM'->64
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
function a1(ref) {                    // 'BM12' -> [linha0, col0]
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  return [Number(m[2]) - 1, colToIdx(m[1])];
}
function setCel(grid, ref, val) { const [r, c] = a1(ref); grid[r][c] = val; }
function setLinha(grid, linha, colInicio, vals) {
  vals.forEach((v, k) => { grid[linha - 1][colInicio - 1 + k] = v; });
}

function sheetStub(nome) {
  return {
    getName: () => nome,
    getLastColumn: () => NCOLS,
    getDataRange: () => ({ getDisplayValues: () => GRID.map(l => l.map(String)) }),
    getRange: (a, c, nr, nc) => {
      if (typeof a === 'string') {
        const [r0, c0] = a1(a);
        return {
          getValue: () => GRID[r0][c0],
          getDisplayValue: () => GRID[r0][c0] === '' ? '' : String(GRID[r0][c0])
        };
      }
      if (nr === undefined) {                       // getRange(linha, col)
        return { getValue: () => GRID[a - 1][c - 1] };
      }
      const bloco = GRID.slice(a - 1, a - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc));
      return {
        getValues: () => bloco,
        getDisplayValues: () => bloco.map(l => l.map(String))
      };
    }
  };
}

global.SpreadsheetApp = {
  openById: () => ({
    getName: () => 'planilha (dublê)',
    getSheets: () => [],
    getSheetByName: n => { ABAS_PEDIDAS.push(n); return sheetStub(n); }
  })
};

global.DriveApp = { getFileById: () => { throw new Error('sem logo no teste'); } };

// --- Slides -----------------------------------------------------------
let SHAPES = [];    // { tipo, x, y, w, h, texto, fonte }

const estiloTexto = () => {
  const s = {};
  s.setFontFamily = () => s; s.setFontSize = () => s; s.setBold = () => s;
  s.setForegroundColor = () => s; s.setItalic = () => s;
  return s;
};
const estiloParag = () => {
  const s = {};
  s.setParagraphAlignment = () => s;
  s.setLineSpacing = v => { if (v < 100) throw new Error('Invalid argument: spacing'); return s; };
  return s;
};

function textStub(registro) {
  const t = {};
  t.setText = v => { registro.texto = String(v); return t; };
  t.getTextStyle    = estiloTexto;
  t.getParagraphStyle = estiloParag;
  t.getRange = () => ({ getTextStyle: estiloTexto });
  t.getLength = () => (registro.texto || '').length;
  return t;
}

function shapeStub(registro) {
  const fill = { setSolidFill: () => fill, setTransparent: () => fill };
  const border = { setTransparent: () => border, getLineFill: () => fill };
  const sh = {};
  sh.getFill = () => fill;
  sh.getBorder = () => border;
  sh.getText = () => textStub(registro);
  sh.setContentAlignment = () => sh;
  sh.setDashStyle = () => sh;
  sh.getLineFill = () => fill;
  return sh;
}

function slideStub() {
  const sl = {};
  sl.getBackground = () => ({ setSolidFill: () => {} });
  sl.insertShape = (tipo, x, y, w, h) => {
    const reg = { tipo, x, y, w, h, texto: '' };
    SHAPES.push(reg);
    return shapeStub(reg);
  };
  sl.insertLine = () => shapeStub({});
  sl.insertImage = () => shapeStub({});
  return sl;
}

const enumProxy = new Proxy({}, { get: (_, k) => String(k) });
global.SlidesApp = {
  openById: () => ({
    appendSlide: () => slideStub(),
    getSlides: () => [],
    getPageWidth: () => 960,
    getPageHeight: () => 540
  }),
  ShapeType: enumProxy, LineCategory: enumProxy, DashStyle: enumProxy,
  ParagraphAlignment: enumProxy, ContentAlignment: enumProxy, PredefinedLayout: enumProxy
};

// ── Carrega o código de produção ─────────────────────────────────────────
let fonte = ['Config.gs', 'Dados.gs', '04_quadro_manutencao.gs', '06_preventivas.gs']
  .map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
// Gotcha do CLAUDE.md: em eval indireto, `function` vai pro globalThis mas
// `const`/`let` de topo ficam presos no escopo do próprio eval.
fonte = fonte.replace(/^(const|let) /gm, 'var ');
(0, eval)(fonte);

// ── Helpers do teste ────────────────────────────────────────────────────
let falhas = 0, testes = 0;
function ok(desc, cond, extra) {
  testes++;
  if (cond) console.log('  ✓ ' + desc);
  else { falhas++; console.log('  ✗ ' + desc + (extra ? '  → ' + extra : '')); }
}
function reset() { SHAPES = []; logs = []; ABAS_PEDIDAS = []; GRID = novaGrade(); }
const textos = () => SHAPES.map(s => s.texto).filter(Boolean);
const temTexto = re => textos().some(t => re.test(t));

// Sem base bruta por padrão: assim os testes exercitam a leitura das células,
// que é justamente o que diverge entre os escopos.
global.obterQuadroCorretivasBoletim_ = () => null;


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Corretiva: cada escopo lê a SUA fonte ==');

function fixtureCorretivaGeral() {
  setLinha(GRID, 180, 60, ['ABR/26', 'MAI/26', 'JUN/26', 'JUL/26']);
  setLinha(GRID, 182, 60, [10, 20, 30, 40]);       // Facilities
  setLinha(GRID, 183, 60, [5, 6, 7, 8]);           // Property
  setLinha(GRID, 185, 60, [1, 2, 3, 4]);           // Operação
  setCel(GRID, 'C37', 111); setCel(GRID, 'C38', 222);
  setCel(GRID, 'C39', 333); setCel(GRID, 'C40', 666);
  setCel(GRID, 'G40', 40); setCel(GRID, 'D40', 30);
  setCel(GRID, 'E40', 20); setCel(GRID, 'F40', 10);
}

reset(); fixtureCorretivaGeral();
gerarSlide05_QuadroManutencao();
ok('COMPLETO abre a aba padrão do design system',
   ABAS_PEDIDAS.includes(CR_DESIGN_SYSTEM.assets.sheetName), ABAS_PEDIDAS.join(','));
ok('5 cartões (Total, Fac, Prop, Locat, Oper)',
   BOL_CORRETIVAS.COMPLETO.cards.length === 5);
ok('backlog total vem de C40', temTexto(/^BACKLOG TOTAL\n666\n/));
ok('Facilities vem de C37',    temTexto(/^FACILITIES\n111\n/));
ok('Locatários vem de F40',    temTexto(/^LOCATÁRIOS\n10\n/));
ok('a seta compara com a soma do 3º ponto (30+7+3=40): 666-40',
   temTexto(/BACKLOG TOTAL\n666\n↑ \+626 vs per\. ant\./));
ok('rótulo do eixo veio como texto, não como data', temTexto(/^JUL\/26$/));

reset();
setLinha(GRID, 180, 60, ['ABR/26', 'MAI/26', 'JUN/26', 'JUL/26']);
setLinha(GRID, 182, 60, [10, 20, 30, 40]);
setLinha(GRID, 183, 60, [5, 6, 7, 8]);
setCel(GRID, 'C37', 111); setCel(GRID, 'C38', 222); setCel(GRID, 'C40', 999);
setCel(GRID, 'F40', 10);
gerarSlide05_QuadroManutencao_Facilities();
ok('FACILITIES tem 4 cartões', BOL_CORRETIVAS.FACILITIES.cards.length === 4);
ok('total do Facilities IGNORA C40 e soma Fac+Prop (111+222)',
   temTexto(/^BACKLOG TOTAL\n333\n/), textos().find(t => /BACKLOG TOTAL/.test(t)));
ok('não desenha cartão de Operação Hangar', !temTexto(/OPERAÇÃO HANGAR/));

reset();
setLinha(GRID, 40, 60, [new Date(2026, 6, 5), new Date(2026, 6, 12),
                        new Date(2026, 6, 19), new Date(2026, 6, 26)]);
setLinha(GRID, 41, 60, [1, 1, 1, 1]);
setLinha(GRID, 42, 60, [5, 6, 7, 8]);
setLinha(GRID, 43, 60, [2, 2, 3, 4]);
setCel(GRID, 'C11', 77); setCel(GRID, 'C12', 33); setCel(GRID, 'C13', 110);
setCel(GRID, 'C37', 111); setCel(GRID, 'C40', 666);   // células do escopo geral
setCel(GRID, 'F13', 60); setCel(GRID, 'D13', 30); setCel(GRID, 'E13', 20);
gerarSlide05_QuadroManutencao_Hangar();
ok('HANGAR abre a aba do hangar', ABAS_PEDIDAS.includes('hangar QUADRO COMPARATIVO'));
ok('HANGAR lê C13, não C40', temTexto(/^BACKLOG TOTAL\n110\n/));
ok('HANGAR não lê C37 (não desenha cartão Facilities)', !temTexto(/^FACILITIES\n/));
ok('HANGAR tem 3 cartões', BOL_CORRETIVAS.HANGAR.cards.length === 3);
ok('cabeçalho do Hangar vira DD/MM', temTexto(/^26\/07$/), textos().join(' | '));


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Corretiva: a folga do rótulo vale para os TRÊS ==');
// Era o bug que a duplicação escondia: o Hangar desenhava a caixa sem folga e
// quebrava valor de 3 dígitos. A caixa tem ~7pt de recuo interno de cada lado
// que a API não deixa desligar, então precisa sobrar largura de verdade.
function larguraMinimaRotulos(gerar, fixture) {
  reset(); fixture();
  gerar();
  const rotulos = SHAPES.filter(s => s.tipo === 'TEXT_BOX' && /^\d+$/.test(s.texto) && s.h <= 16);
  return { n: rotulos.length, min: Math.min(...rotulos.map(s => s.w)) };
}

const fxHangar = () => {
  setLinha(GRID, 40, 60, ['S1', 'S2', 'S3', 'S4']);
  setLinha(GRID, 42, 60, [100, 200, 300, 329]);
  setLinha(GRID, 43, 60, [111, 222, 333, 444]);
  setCel(GRID, 'C13', 110);
};
const fxFac = () => {
  setLinha(GRID, 180, 60, ['A', 'B', 'C', 'D']);
  setLinha(GRID, 182, 60, [100, 200, 300, 329]);
  setLinha(GRID, 183, 60, [111, 222, 333, 444]);
};

const rGeral = larguraMinimaRotulos(gerarSlide05_QuadroManutencao, fixtureCorretivaGeral);
const rFac   = larguraMinimaRotulos(gerarSlide05_QuadroManutencao_Facilities, fxFac);
const rHang  = larguraMinimaRotulos(gerarSlide05_QuadroManutencao_Hangar, fxHangar);

ok('COMPLETO: 12 rótulos de barra (3 séries x 4 pontos)', rGeral.n === 12, 'n=' + rGeral.n);
ok('FACILITIES: 8 rótulos (2 séries x 4)', rFac.n === 8, 'n=' + rFac.n);
ok('HANGAR: 8 rótulos (2 séries x 4)', rHang.n === 8, 'n=' + rHang.n);
ok('COMPLETO tem folga (caixa > 40pt)', rGeral.min > 40, 'min=' + rGeral.min);
ok('FACILITIES tem folga (caixa > 40pt)', rFac.min > 40, 'min=' + rFac.min);
ok('HANGAR TAMBÉM tem folga — era o que faltava', rHang.min > 40, 'min=' + rHang.min);
// Largura da caixa = barW + 20 + folga*2. Conferir o número exato (e não só
// "é maior que X") é o que trava a folga contra alguém removê-la sem querer.
ok('COMPLETO: barra 12 → caixa 64', rGeral.min === 12 + 20 + 32, 'min=' + rGeral.min);
ok('FACILITIES: barra 14 → caixa 66', rFac.min === 14 + 20 + 32, 'min=' + rFac.min);
ok('HANGAR: barra 14 → caixa 66', rHang.min === 14 + 20 + 32, 'min=' + rHang.min);


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Corretiva: base bruta manda no COMPLETO e só nele ==');
global.obterQuadroCorretivasBoletim_ = () => ({
  kpis: { facilities: 7, property: 8, operacao: 9, locatarios: 6, total: 30, totalAnterior: 25 },
  historico: [
    { FACILITIES: 1, PROPERTY: 2, OPERACAO: 3 },
    { FACILITIES: 2, PROPERTY: 3, OPERACAO: 4 },
    { FACILITIES: 3, PROPERTY: 4, OPERACAO: 5 },
    { FACILITIES: 7, PROPERTY: 8, OPERACAO: 9 }
  ],
  meses: ['ABR', 'MAI', 'JUN', 'JUL'],
  composicao: [
    { label: 'CORRETIVAS', val: 18, pct: 60 }, { label: 'MELHORIAS',  val: 6, pct: 20 },
    { label: 'PROJETOS',   val: 2,  pct: 7  }, { label: 'LOCATÁRIOS', val: 4, pct: 13 }
  ]
});

reset(); fixtureCorretivaGeral();
gerarSlide05_QuadroManutencao();
ok('COMPLETO usa o total da base (30), não a célula C40 (666)', temTexto(/^BACKLOG TOTAL\n30\n/));
ok('a seta usa totalAnterior da base: 30-25 = +5', temTexto(/BACKLOG TOTAL\n30\n↑ \+5 /));
ok('o painel continua sendo POR TIPO nos dois caminhos',
   temTexto(/^COMPOSIÇÃO POR TIPO$/));
ok('e mostra as fatias da base', temTexto(/^18 \(60%\)$/) && temTexto(/^6 \(20%\)$/));
// A barra é a fatia do backlog, o mesmo número do "%" escrito ao lado — se
// fosse escalada pela maior fatia, CORRETIVAS ficaria sempre cheia e a barra
// diria uma coisa diferente do texto.
const barras = SHAPES.filter(s => s.tipo === 'RECTANGLE' && s.x > 700 && s.h === 12);
ok('a barra de CORRETIVAS ocupa 60% da régua, não 100%',
   barras.length === 2 && Math.abs(barras[1].w / barras[0].w - 0.6) < 0.01,
   JSON.stringify(barras.map(b => b.w)));
ok('o log diz de onde veio o número', logs.some(l => /fonte = BD-CORRETIVAS/.test(l)));

reset(); fixtureCorretivaGeral();
setCel(GRID, 'C37', 111); setCel(GRID, 'C38', 222); setCel(GRID, 'C40', 999);
gerarSlide05_QuadroManutencao_Facilities();
ok('FACILITIES NÃO usa a base bruta (ainda não sabe recortar por Megas)',
   temTexto(/^BACKLOG TOTAL\n333\n/), textos().find(t => /BACKLOG TOTAL/.test(t)));
ok('e por isso lê a composição das células digitadas', temTexto(/^COMPOSIÇÃO POR TIPO$/));
ok('com MELHORIAS e PROJETOS em linhas separadas (o rótulo antigo juntava as duas)',
   temTexto(/^MELHORIAS$/) && temTexto(/^PROJETOS$/), textos().join(' | '));

reset(); fxHangar();
gerarSlide05_QuadroManutencao_Hangar();
ok('HANGAR também não usa a base bruta', temTexto(/^BACKLOG TOTAL\n110\n/));

global.obterQuadroCorretivasBoletim_ = () => null;


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Preventiva: cada escopo lê a SUA fonte ==');

function fixturePreventiva(linhas, celulas) {
  setLinha(GRID, linhas.agendadas,  60, [10, 20, 30, 40, 50, 60, 70, 80]);
  setLinha(GRID, linhas.realizadas, 60, [9, 19, 29, 39, 49, 59, 69, 79]);
  setLinha(GRID, linhas.datas,      60, [
    new Date(2026, 5, 1), new Date(2026, 5, 8), new Date(2026, 5, 15), new Date(2026, 5, 22),
    new Date(2026, 6, 1), new Date(2026, 6, 8), new Date(2026, 6, 15), new Date(2026, 7, 1)
  ]);
  Object.keys(celulas).forEach(c => setCel(GRID, c, celulas[c]));
}

reset();
fixturePreventiva({ datas: 33, agendadas: 37, realizadas: 43 },
                  { BM9: '91%', BM10: '96%', BM11: '88%', BM12: '93%' });
gerarSlide06_Preventivas();
ok('COMPLETO abre a aba padrão', ABAS_PEDIDAS.includes(CR_DESIGN_SYSTEM.assets.sheetName));
ok('4 cartões de SLA', BOL_PREVENTIVAS.COMPLETO.cards.length === 4);
ok('SLA GERAL vem de BM12', temTexto(/^SLA GERAL\n93%$/));
ok('OPERAÇÃO HANGAR vem de BM11', temTexto(/^OPERAÇÃO HANGAR\n88%$/));
ok('regra -1 dia: 01/08 vira 31/07', temTexto(/^31\/07$/), textos().join(' | '));
ok('e 01/07 vira 30/06', temTexto(/^30\/06$/));

reset();
fixturePreventiva({ datas: 23, agendadas: 39, realizadas: 45 },
                  { BP8: '91%', BP9: '96%', BP10: '93%' });
gerarSlide06_Preventivas_Facilities();
ok('FACILITIES abre "megas QUADRO COMPARATIVO"',
   ABAS_PEDIDAS.includes('megas QUADRO COMPARATIVO'));
ok('3 cartões', BOL_PREVENTIVAS.FACILITIES.cards.length === 3);
ok('SLA FACILITIES vem de BP8', temTexto(/^SLA FACILITIES\n91%$/));
ok('não desenha Operação Hangar', !temTexto(/OPERAÇÃO HANGAR|OP\. HANGAR/));

reset();
fixturePreventiva({ datas: 24, agendadas: 28, realizadas: 26 },
                  { BO9: '96%', BO10: '88%', BO11: '93%' });
gerarSlide06_Preventivas_Hangar();
ok('HANGAR abre "hangar QUADRO COMPARATIVO"',
   ABAS_PEDIDAS.includes('hangar QUADRO COMPARATIVO'));
ok('SLA OP. HANGAR VIP vem de BO10', temTexto(/^SLA OP\. HANGAR VIP\n88%$/));
ok('subtítulo identifica o Hangar', temTexto(/Hangar VIP$/));


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Preventiva: a régua dos cartões sai da quantidade ==');
// 4 cartões no completo, 3 nos outros — a largura tem que fechar a linha nos
// dois casos, sem sobra nem estouro. Antes o divisor era escrito na mão em
// cada cópia.
function larguraCartoes(gerar, fixture) {
  reset(); fixture();
  gerar();
  const cards = SHAPES.filter(s => s.tipo === 'RECTANGLE' && s.h === 65 && s.w > 50);
  const xs = cards.map(s => s.x);
  return { n: cards.length, w: cards[0].w, primeiro: Math.min(...xs), ultimo: Math.max(...xs) };
}
const mX = CR_DESIGN_SYSTEM.layout.marginX;

const c4 = larguraCartoes(gerarSlide06_Preventivas, () =>
  fixturePreventiva({ datas: 33, agendadas: 37, realizadas: 43 }, { BM12: '93%' }));
const c3 = larguraCartoes(gerarSlide06_Preventivas_Hangar, () =>
  fixturePreventiva({ datas: 24, agendadas: 28, realizadas: 26 }, { BO11: '93%' }));

ok('COMPLETO desenha 4 cartões', c4.n === 4, 'n=' + c4.n);
ok('HANGAR desenha 3 cartões',   c3.n === 3, 'n=' + c3.n);
ok('4 cartões fecham a linha à direita', Math.abs((c4.ultimo + c4.w) - (960 - mX)) < 0.01,
   'fim=' + (c4.ultimo + c4.w));
ok('3 cartões fecham a linha à direita', Math.abs((c3.ultimo + c3.w) - (960 - mX)) < 0.01,
   'fim=' + (c3.ultimo + c3.w));
ok('e os dois começam na margem', c4.primeiro === mX && c3.primeiro === mX);
ok('cartão de 3 é mais largo que o de 4', c3.w > c4.w);


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Escopo inexistente falha dizendo o que existe ==');
[['_bolCorretivas_', _bolCorretivas_], ['_bolPreventivas_', _bolPreventivas_]].forEach(([nome, fn]) => {
  let msg = '';
  try { fn('MEGAS'); } catch (e) { msg = e.message; }
  ok(nome + ' recusa escopo desconhecido', /não existe/.test(msg), msg);
  ok(nome + ' lista os escopos válidos', /COMPLETO/.test(msg) && /HANGAR/.test(msg), msg);
});


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Aba renomeada não derruba o slide ==');
reset();
global.SpreadsheetApp.openById = () => ({ getSheetByName: () => null });
gerarSlide06_Preventivas_Hangar();
ok('desenha assim mesmo (reserva com zeros)', temTexto(/^SLA GERAL\nN\/D$/));
ok('e o eixo cai em S1..S8', temTexto(/^S8$/));
ok('o erro aparece no log', logs.some(l => /Erro Preventivas HANGAR/.test(l)), logs.join(' | '));


console.log(falhas ? `\n✗ ${falhas} de ${testes} FALHARAM\n` : `\n✓ ${testes}/${testes} passaram\n`);
process.exit(falhas ? 1 : 0);
