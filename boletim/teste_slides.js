/**
 * Teste dos slides de Manutenção Corretiva e Preventiva, nos três escopos.
 *
 * DUAS COISAS QUE ESTE TESTE EXISTE PARA IMPEDIR:
 *
 * 1. ENDEREÇO DE CÉLULA QUE MUDA EM SILÊNCIO. A tabela EQUIPE do QUADRO
 *    COMPARATIVO ganhou a linha "Resp. Locatário", e com isso o TOTAL foi de
 *    C40 para C41 e a composição de D40:G40 para D41:G41. Quem continuasse
 *    lendo C40 mostraria o número dos locatários no cartão de Backlog Total,
 *    sem erro nenhum. Cada endereço está travado aqui.
 *
 * 2. RÓTULO DE BARRA CORTADO. A TEXT_BOX tem ~7pt de recuo interno de cada
 *    lado que a API não deixa desligar; caixa estreita corta o número ("331"
 *    aparecia "33"). Os três escopos precisam de caixa larga o bastante.
 *
 * Preventiva está num arquivo só (BOL_PREVENTIVAS) porque os três escopos
 * desenham literalmente o mesmo slide. Corretiva NÃO está: a variante
 * Facilities lê de outra aba, com gráfico mensal somando os 3 Megas e setas
 * semanais por cartão — modelo de dados diferente, não só células diferentes.
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
console.log('\n== Corretiva: a planilha como RESERVA, cada escopo na sua ==');
// Sem base bruta, cada escopo cai nas suas células. Estes endereços JÁ
// mudaram uma vez: a tabela EQUIPE ganhou a linha "Resp. Locatário" e
// empurrou o TOTAL de C40 para C41. Ler C40 achando que é o total mostra o
// número dos locatários no cartão grande, sem erro nenhum.

function fxCompleto() {
  setLinha(GRID, 180, 60, ['ABR/26', 'MAI/26', 'JUN/26', 'JUL/26']);
  setLinha(GRID, 182, 60, [10, 20, 30, 40]);       // Facilities
  setLinha(GRID, 183, 60, [5, 6, 7, 8]);           // Property
  setLinha(GRID, 185, 60, [1, 2, 3, 4]);           // Operação
  setCel(GRID, 'C37', 111); setCel(GRID, 'C38', 222); setCel(GRID, 'C39', 333);
  setCel(GRID, 'C40', 44);                          // Resp. Locatário
  setCel(GRID, 'C41', 710);                         // TOTAL
  setCel(GRID, 'G41', 400); setCel(GRID, 'D41', 200);
  setCel(GRID, 'E41', 100); setCel(GRID, 'F41', 10);
}
function fxFacilities() {
  setCel(GRID, 'C26', 111); setCel(GRID, 'C27', 222);
  setCel(GRID, 'C28', 33);  setCel(GRID, 'C29', 366);
  setCel(GRID, 'D29', 60);  setCel(GRID, 'E29', 6); setCel(GRID, 'F29', 300);
  setLinha(GRID, 111, 3, ['ABRIL', 'MAIO', 'JUNHO']);
  [117,118,119].forEach(r => setLinha(GRID, r, 3, [10, 20, 30]));  // Facilities, 3 Megas
  [121,122,123].forEach(r => setLinha(GRID, r, 3, [5, 6, 7]));     // Property, 3 Megas
  [66,67,68].forEach(r => setLinha(GRID, r, 3, [10, 20]));         // semanal Facilities
  [70,71,72].forEach(r => setLinha(GRID, r, 3, [5, 9]));           // semanal Property
  [62,63,64].forEach(r => setLinha(GRID, r, 3, [1, 1]));           // semanal Locatário
  setCel(GRID, 'C37', 999); setCel(GRID, 'C41', 999);              // células do escopo geral
}
function fxHangar() {
  setLinha(GRID, 40, 60, [new Date(2026, 6, 5), new Date(2026, 6, 12),
                          new Date(2026, 6, 19), new Date(2026, 6, 26)]);
  setLinha(GRID, 42, 60, [5, 6, 7, 8]);
  setLinha(GRID, 43, 60, [2, 2, 3, 4]);
  setCel(GRID, 'C11', 77); setCel(GRID, 'C12', 33); setCel(GRID, 'C13', 110);
  setCel(GRID, 'C41', 999);                                        // célula do escopo geral
  setCel(GRID, 'F13', 60); setCel(GRID, 'D13', 30); setCel(GRID, 'E13', 20);
}

reset(); fxCompleto();
gerarSlide05_QuadroManutencao();
ok('COMPLETO abre a aba padrão do design system',
   ABAS_PEDIDAS.includes(CR_DESIGN_SYSTEM.assets.sheetName), ABAS_PEDIDAS.join(','));
ok('backlog total vem de C41, não de C40', temTexto(/^BACKLOG TOTAL\n710\n/),
   textos().find(t => /BACKLOG TOTAL/.test(t)));
ok('Locatários vem de C40 (tabela EQUIPE)', temTexto(/^LOCATÁRIOS\n44\n/));
ok('Facilities vem de C37', temTexto(/^FACILITIES\n111\n/));
ok('composição vem da linha 41: CORRETIVAS = G41', temTexto(/^400 \(56%\)$/), textos().join(' | '));
ok('MELHORIAS e PROJETOS em linhas separadas',
   temTexto(/^MELHORIAS$/) && temTexto(/^PROJETOS$/));
ok('rótulo do eixo é o texto do mês', temTexto(/^JUL\/26$/));

reset(); fxFacilities();
gerarSlide05_QuadroManutencao_Facilities();
ok('FACILITIES abre "megas QUADRO COMPARATIVO", não a aba padrão',
   ABAS_PEDIDAS.includes('megas QUADRO COMPARATIVO'), ABAS_PEDIDAS.join(','));
ok('total vem de C29, ignorando as células do escopo geral', temTexto(/^BACKLOG TOTAL\n366\n/),
   textos().find(t => /BACKLOG TOTAL/.test(t)));
ok('não desenha cartão de Operação Hangar', !temTexto(/OPERAÇÃO HANGAR/));
// A leitora SOMA_LINHAS: 3 linhas (3 Megas) viram 1 barra por mês.
ok('gráfico mensal soma os 3 Megas (10+10+10 = 30)', temTexto(/^30$/), textos().join(' | '));
ok('e tem um ponto por mês com dado, não 4 fixos',
   temTexto(/^JUN$/) && !temTexto(/^JUL$/));
// Sem base, a seta sai da seção semanal: (20*3) - (10*3) = +30.
ok('seta semanal de Facilities: +30', temTexto(/FACILITIES\n\d+\n▲ \+30 vs sem\. ant\./),
   textos().find(t => /^FACILITIES/.test(t)));
ok('seta do total soma as três categorias (30+12+0)',
   temTexto(/▲ \+42 vs sem\. ant\./), textos().find(t => /BACKLOG TOTAL/.test(t)));

reset(); fxHangar();
gerarSlide05_QuadroManutencao_Hangar();
ok('HANGAR abre a aba do hangar', ABAS_PEDIDAS.includes('hangar QUADRO COMPARATIVO'));
ok('HANGAR lê C13, não C41', temTexto(/^BACKLOG TOTAL\n110\n/));
ok('HANGAR não desenha cartão Facilities', !temTexto(/^FACILITIES\n/));
ok('cabeçalho do Hangar vira DD/MM', temTexto(/^26\/07$/), textos().join(' | '));


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Corretiva: o rótulo da barra cabe em 3 dígitos ==');
// O bug "331 aparecia 33": a TEXT_BOX tem ~7pt de recuo interno de cada lado
// que a API não deixa desligar, então caixa estreita corta o número. 26pt é o
// piso, e a caixa é centrada na barra nos três escopos.
function caixas(gerar, fixture) {
  reset(); fixture();
  gerar();
  const r = SHAPES.filter(s => s.tipo === 'TEXT_BOX' && /^\d+$/.test(s.texto) && s.h <= 16);
  return { n: r.length, min: Math.min(...r.map(s => s.w)) };
}
const rG = caixas(gerarSlide05_QuadroManutencao, fxCompleto);
const rF = caixas(gerarSlide05_QuadroManutencao_Facilities, fxFacilities);
const rH = caixas(gerarSlide05_QuadroManutencao_Hangar, fxHangar);
ok('COMPLETO: 12 rótulos (3 séries x 4 pontos)', rG.n === 12, 'n=' + rG.n);
ok('FACILITIES: 6 rótulos (2 séries x 3 meses)', rF.n === 6, 'n=' + rF.n);
ok('HANGAR: 8 rótulos (2 séries x 4 pontos)', rH.n === 8, 'n=' + rH.n);
ok('COMPLETO: caixa >= 26pt', rG.min >= 26, 'min=' + rG.min);
ok('FACILITIES: caixa >= 26pt', rF.min >= 26, 'min=' + rF.min);
ok('HANGAR: caixa >= 26pt', rH.min >= 26, 'min=' + rH.min);
// A caixa fica centrada na barra — se não ficasse, o número sairia de cima
// dela conforme a largura mudasse entre escopos.
reset(); fxCompleto();
gerarSlide05_QuadroManutencao();
const barras12 = SHAPES.filter(s => s.tipo === 'RECTANGLE' && s.w === 12);
const rot12 = SHAPES.filter(s => s.tipo === 'TEXT_BOX' && /^\d+$/.test(s.texto) && s.h === 14);
ok('centro da caixa = centro da barra',
   Math.abs((rot12[0].x + rot12[0].w / 2) - (barras12[0].x + 6)) < 0.01,
   'caixa=' + (rot12[0].x + rot12[0].w / 2) + ' barra=' + (barras12[0].x + 6));


// ════════════════════════════════════════════════════════════════════════
console.log('\n== Corretiva: os TRÊS escopos leem da BD-CORRETIVAS ==');
// Cada escopo pede o SEU recorte de Centro de Custos. É o que equivale ao
// CONT.SES(...;$AY:$AY;<empreendimento>;...) das fórmulas da planilha.
let filtrosPedidos = [];
global.obterQuadroCorretivasBoletim_ = (n, filtro) => {
  filtrosPedidos.push(filtro);
  return {
    kpis: { facilities: 7, property: 8, operacao: 9, locatarios: 6, total: 30, totalAnterior: 25 },
    anterior: { total: 25, facilities: 5, property: 7, locatarios: 4, operacao: 9 },
    historico: [
      { FACILITIES: 1, PROPERTY: 2, OPERACAO: 3 }, { FACILITIES: 2, PROPERTY: 3, OPERACAO: 4 },
      { FACILITIES: 5, PROPERTY: 7, OPERACAO: 9 }, { FACILITIES: 7, PROPERTY: 8, OPERACAO: 9 }
    ],
    meses: ['ABR', 'MAI', 'JUN', 'JUL'],
    composicao: [
      { label: 'CORRETIVAS', val: 18, pct: 60 }, { label: 'MELHORIAS',  val: 6, pct: 20 },
      { label: 'PROJETOS',   val: 2,  pct: 7  }, { label: 'LOCATÁRIOS', val: 4, pct: 13 }
    ]
  };
};

reset(); filtrosPedidos = []; fxCompleto();
gerarSlide05_QuadroManutencao();
ok('COMPLETO pede a carteira inteira (sem filtro)', filtrosPedidos[0] === null,
   JSON.stringify(filtrosPedidos));
ok('e usa o total da base (30), não a célula C41 (710)', temTexto(/^BACKLOG TOTAL\n30\n/));
ok('a seta usa o ponto anterior da base: 30-25 = +5', temTexto(/BACKLOG TOTAL\n30\n▲ \+5 vs per\. ant\./),
   textos().find(t => /BACKLOG TOTAL/.test(t)));
// A seta de CADA cartão sai da mesma contagem que o número do cartão.
ok('cartão de equipe também ganha seta: Facilities 7-5 = +2',
   temTexto(/^FACILITIES\n7\n▲ \+2 vs per\. ant\.$/), textos().find(t => /^FACILITIES/.test(t)));
ok('e Operação não mudou: 9-9', temTexto(/^OPERAÇÃO HANGAR\n9\n= vs per\. ant\.$/),
   textos().find(t => /^OPERAÇÃO/.test(t)));

reset(); filtrosPedidos = []; fxFacilities();
gerarSlide05_QuadroManutencao_Facilities();
ok('FACILITIES pede os 3 Megas',
   JSON.stringify(filtrosPedidos[0]) === '["MEGA CURITIBA","MEGA ITAJAI","MEGA ESTEIO"]',
   JSON.stringify(filtrosPedidos));
ok('e passa a usar a base (30), não mais C29 (366)', temTexto(/^BACKLOG TOTAL\n30\n/),
   textos().find(t => /BACKLOG TOTAL/.test(t)));
// Com a base, a seta vem do histórico da base — não da seção semanal, senão
// o cartão diria um número e a seta compararia outro.
ok('a seta deixa de ser semanal e passa a ser do período da base',
   temTexto(/▲ \+5 vs per\. ant\./) && !temTexto(/vs sem\. ant\./),
   textos().find(t => /BACKLOG TOTAL/.test(t)));

reset(); filtrosPedidos = []; fxHangar();
gerarSlide05_QuadroManutencao_Hangar();
ok('HANGAR pede o Hangar VIP', JSON.stringify(filtrosPedidos[0]) === '["HANGAR VIP"]',
   JSON.stringify(filtrosPedidos));
ok('e usa a base (30), não C13 (110)', temTexto(/^BACKLOG TOTAL\n30\n/));

// Composição da base: as 4 fatias, com a barra proporcional ao backlog.
reset(); fxCompleto();
gerarSlide05_QuadroManutencao();
ok('painel mostra as 4 fatias da base', temTexto(/^18 \(60%\)$/) && temTexto(/^6 \(20%\)$/));
const barrasComp = SHAPES.filter(s => s.tipo === 'RECTANGLE' && s.x > 700 && s.h === 12);
ok('a barra de CORRETIVAS ocupa 60% da régua, não 100%',
   barrasComp.length === 2 && Math.abs(barrasComp[1].w / barrasComp[0].w - 0.6) < 0.01,
   JSON.stringify(barrasComp.map(b => b.w)));

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
console.log('\n== Preventiva: os três escopos leem da BD - PREVENTIVAS ==');
let filtrosPrev = [];
global.obterPreventivasBoletim_ = (filtro) => {
  filtrosPrev.push(filtro);
  return {
    sla: {
      GERAL:      { pct: 87.37, base: 100, cumpridos: 87, nao: 13, sem: 4, desconhecido: 0 },
      FACILITIES: { pct: 97.1,  base: 70,  cumpridos: 68, nao: 2,  sem: 1, desconhecido: 0 },
      PROPERTY:   { pct: 78.0,  base: 20,  cumpridos: 16, nao: 4,  sem: 0, desconhecido: 0 },
      OPERACAO:   { pct: null,  base: 0,   cumpridos: 0,  nao: 0,  sem: 3, desconhecido: 0 }
    },
    semanas: ['28/06','05/07','12/07','19/07','26/07','02/08','09/08','16/08']
      .map((l, i) => ({ label: l, agendadas: 130 + i, realizadas: 140 + i }))
  };
};

reset(); filtrosPrev = [];
fixturePreventiva({ datas: 33, agendadas: 37, realizadas: 43 },
                  { BM9: '1%', BM10: '2%', BM11: '3%', BM12: '4%' });
gerarSlide06_Preventivas();
ok('COMPLETO pede a carteira inteira', filtrosPrev[0] === null, JSON.stringify(filtrosPrev));
ok('SLA GERAL vem da base (87,4%), não de BM12 (4%)', temTexto(/^SLA GERAL\n87,4%$/),
   textos().find(t => /SLA GERAL/.test(t)));
ok('FACILITIES vem da base', temTexto(/^FACILITIES\n97,1%$/));
// Equipe sem nada fechado na janela não vira 0% — 0% diria "não cumpriu
// nada", quando o certo é "não houve o que cumprir".
ok('equipe sem base de SLA mostra N/D, não 0%', temTexto(/^OPERAÇÃO HANGAR\nN\/D$/),
   textos().find(t => /OPERAÇÃO/.test(t)));
ok('o eixo passa a ser o das semanas da base', temTexto(/^16\/08$/) && temTexto(/^28\/06$/));
ok('e as barras também', temTexto(/^137$/) && temTexto(/^147$/), textos().join(' | '));

reset(); filtrosPrev = [];
fixturePreventiva({ datas: 23, agendadas: 39, realizadas: 45 }, { BP8: '1%' });
gerarSlide06_Preventivas_Facilities();
ok('FACILITIES pede os 3 Megas',
   JSON.stringify(filtrosPrev[0]) === '["MEGA CURITIBA","MEGA ITAJAI","MEGA ESTEIO"]',
   JSON.stringify(filtrosPrev));

reset(); filtrosPrev = [];
fixturePreventiva({ datas: 24, agendadas: 28, realizadas: 26 }, { BO9: '1%' });
gerarSlide06_Preventivas_Hangar();
ok('HANGAR pede o Hangar VIP', JSON.stringify(filtrosPrev[0]) === '["HANGAR VIP"]',
   JSON.stringify(filtrosPrev));

global.obterPreventivasBoletim_ = () => null;

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
