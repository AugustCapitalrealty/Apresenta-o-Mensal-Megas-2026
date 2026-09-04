/**
 * Teste de DESENHO dos slides — todos os pontos de entrada, com dublês.
 *
 * POR QUE ESTE TESTE EXISTE: os 11 arquivos de slide passaram a compartilhar
 * _slideNovo_/_slideLimpar_/_slideFalha_ (00_Helpers.gs) no lugar do bloco de
 * abertura copiado em cada um, e três pares de arquivos viraram um só. Uma
 * troca dessas quebra CALADA: o slide sai, só que vazio ou com shape fora da
 * página, e ninguém percebe até abrir o deck na reunião (lição 6 do
 * CLAUDE.md).
 *
 * O que cada slide precisa passar:
 *   · desenhar alguma coisa (shape > 0);
 *   · não escrever o aviso de falha ("NÃO FOI GERADO") — que é justamente o
 *     sintoma de helper faltando;
 *   · não colocar nada fora dos 720×405 da página;
 *   · geometria numérica e finita (o dublê já explode em NaN/negativo).
 *
 * Não abre Slides nem planilha. Rode com:
 *   node propriedades-mensal/teste_slides.js
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

let ok = 0, falhou = 0;
function checa(cond, msg) {
  if (cond) { ok++; console.log('  ✓ ' + msg); }
  else { falhou++; console.log('  ✗ ' + msg); }
}

// ── Dublê do Slides ─────────────────────────────────────────────────────
const LARG = 720, ALT = 405;
const shapes = [];
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };

function estilo() {
  const o = { setFontSize: () => o, setBold: () => o, setItalic: () => o,
              setForegroundColor: () => o, setFontFamily: () => o, setUnderline: () => o };
  return o;
}
function texto() {
  const o = {
    _t: '',
    setText(t) { o._t = String(t); return o; },
    appendText(t) { o._t += String(t); return { getTextStyle: () => {
      if (o._t === '') throw new Error('The object (MOCK_SHAPE) has no text.');
      return estilo();
    } }; },
    getTextStyle: () => {
      if (o._t === '') throw new Error('The object (MOCK_SHAPE) has no text.');
      return estilo();
    },
    getRange: () => ({ getTextStyle: () => {
      if (o._t === '') throw new Error('The object (MOCK_SHAPE) has no text.');
      return estilo();
    } }),
    asString: () => o._t,
    getParagraphStyle: () => ({ setLineSpacing: () => ({}), setParagraphAlignment: () => ({}) })
  };
  return o;
}
function inserir(tipo, x, y, w, h) {
  if ([x, y, w, h].some(v => typeof v !== 'number' || !isFinite(v)))
    throw new Error('geometria inválida em ' + tipo + ': ' + JSON.stringify([x, y, w, h]));
  if (w < 0 || h < 0)
    throw new Error('dimensão negativa em ' + tipo + ' w=' + w.toFixed(1) + ' h=' + h.toFixed(1));
  const t = texto();
  const s = {
    tipo, x, y, w, h,
    get txt() { return t._t; },
    getFill: () => ({ setSolidFill: c => { if (c === undefined) throw new Error('setSolidFill(undefined)'); } }),
    getBorder: () => { const b = { setTransparent: () => b, setWeight: () => b, setDashStyle: () => b,
                                   getLineFill: () => ({ setSolidFill: () => {} }) }; return b; },
    getText: () => t,
    setContentAlignment: () => s,
    setRotation: () => s,
    getObjectId: () => 'i' + shapes.length
  };
  shapes.push(s);
  return s;
}
const espelho = new Proxy({}, { get: (_, k) => k });
global.SlidesApp = { ShapeType: espelho, ContentAlignment: espelho,
                     ParagraphAlignment: espelho, PredefinedLayout: espelho,
                     LineCategory: espelho, DashStyle: espelho };

const slides = [];
const deck = {
  getPageWidth: () => LARG,
  getPageHeight: () => ALT,
  getSlides: () => slides,
  appendSlide: () => {
    const s = {
      insertShape: inserir,
      insertLine: (cat, x1, y1, x2, y2) => {
        const l = inserir('LINE', Math.min(x1, x2), Math.min(y1, y2),
                          Math.abs(x2 - x1), Math.abs(y2 - y1));
        l.getLineFill = () => ({ setSolidFill: () => {} });
        l.setWeight = () => l;
        l.setDashStyle = () => l;
        return l;
      },
      insertTextBox: (txt, x, y, w, h) => {
        const t = inserir('TEXT_BOX', x || 0, y || 0, w || 0, h || 0);
        t.getText().setText(txt);
        return t;
      },
      insertImage: () => ({ setWidth() { return this; }, setHeight() { return this; },
                            setLeft() { return this; }, setTop() { return this; },
                            getWidth: () => 100, getHeight: () => 50 }),
      getBackground: () => ({ setSolidFill: () => {} }),
      getPageElements: () => [],
      remove() {}, move() {},
      getObjectId: () => 's' + slides.length,
      getNotesPage: () => ({ getSpeakerNotesShape: () => ({ getText: () => ({ setText: () => {}, asString: () => '' }) }) })
    };
    slides.push(s);
    return s;
  }
};

// ── Dublê da planilha: as fixtures do DRE, e vazio para o resto ─────────
const FIX = JSON.parse(fs.readFileSync(path.join(DIR, 'teste_dre_fixtures.json'), 'utf8'));
function aba(nome) {
  const m = FIX[nome];
  return { getName: () => nome, getLastRow: () => m.length, getLastColumn: () => m[0].length,
           getRange: () => ({ getDisplayValues: () => m, getValues: () => m }) };
}
const VAZIA = { getName: () => '(vazia)', getLastRow: () => 0, getLastColumn: () => 0,
                getRange: () => ({ getDisplayValues: () => [], getValues: () => [] }) };
global.SpreadsheetApp = {
  // Aba sem fixture devolve VAZIA, não null: o que se testa aqui é o desenho,
  // e "aba não encontrada" já é caminho de erro coberto pelo próprio código.
  // Com aba vazia o slide segue pelo ramo "sem dados", que é o que precisa
  // desenhar sem estourar.
  openById: () => ({ getName: () => 'dublê', getSheets: () => Object.keys(FIX).map(aba),
                     getSheetByName: n => (FIX[n] ? aba(n) : VAZIA) })
};
global.DriveApp = { getFileById: () => ({ getBlob: () => null }) };

// ── Carrega o projeto ───────────────────────────────────────────────────
// `const`/`let` de topo não escapam do eval indireto; viram `var` para irem
// ao globalThis, como em gestao-tvs/teste_bases.js.
const ARQUIVOS = fs.readdirSync(DIR).filter(f => /\.gs$/.test(f)).sort();
(0, eval)(ARQUIVOS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8'))
                  .join('\n').replace(/^(const|let) /gm, 'var '));

global.getDeckMensal_ = () => deck;
global.obterMesReferencia_ = () => ({ index: 7, nome: 'AGOSTO', curto: 'Ago', ano: 2026,
                                      fonte: 'dublê', label: 'AGOSTO 2026' });

// ── 1. As duas tabelas de dependência batem com o código ────────────────
console.log('\n== Tabelas de dependência × código real ==');
{
  const declara = {};
  ARQUIVOS.forEach(f => {
    fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach(ln => {
      const m = ln.match(/^function ([A-Za-z_0-9]+)\s*\(([^)]*)\)/) ||
                ln.match(/^(?:const|let|var) ([A-Za-z_0-9]+)/);
      if (m && !declara[m[1]]) declara[m[1]] = { arquivo: f, args: m[2] === undefined ? null
                                : m[2].split(',').filter(a => a.trim()).length };
    });
  });

  let erradas = 0;
  _PROP_DEPENDENCIAS_.forEach(([arquivo, nomes]) => nomes.forEach(n => {
    const d = declara[n];
    if (!d || d.arquivo !== arquivo) { erradas++; console.log('    ' + n + ': a tabela diz ' +
      arquivo + ', o código diz ' + (d ? d.arquivo : 'NÃO EXISTE')); }
  }));
  checa(erradas === 0, '_PROP_DEPENDENCIAS_ aponta para o arquivo certo em todos os símbolos');

  let erradas2 = 0;
  _DEPS_BACKLOG_CLIENTES_.forEach(dep => {
    const d = declara[dep.nome];
    if (!d || d.arquivo !== dep.arquivo || (d.args !== null && d.args !== dep.args)) {
      erradas2++;
      console.log('    ' + dep.nome + ': diz ' + dep.arquivo + '/' + dep.args +
                  ', é ' + (d ? d.arquivo + '/' + d.args : 'INEXISTENTE'));
    }
  });
  checa(erradas2 === 0, '_DEPS_BACKLOG_CLIENTES_ bate nome, arquivo e nº de argumentos');

  checa(_propConferirProjeto_() === true, '_propConferirProjeto_ não acusa arquivo faltando');
}

// ── 2. Nenhum nome de topo declarado duas vezes ─────────────────────────
// No Apps Script tudo cai num namespace só: a segunda declaração sobrescreve
// a primeira em silêncio.
console.log('\n== Namespace único ==');
{
  const vistos = {}, colisoes = [];
  ARQUIVOS.forEach(f => fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach(ln => {
    const m = ln.match(/^(?:function|const|let|var) ([A-Za-z_0-9]+)/);
    if (!m) return;
    if (vistos[m[1]]) colisoes.push(m[1] + ' (' + vistos[m[1]] + ' e ' + f + ')');
    else vistos[m[1]] = f;
  }));
  if (colisoes.length) colisoes.forEach(c => console.log('    ' + c));
  checa(colisoes.length === 0, 'nenhum nome declarado em dois arquivos');
}

// ── 3. Cada slide desenha, sem falha e dentro da página ─────────────────
console.log('\n== Desenho de cada slide ==');
const PASSOS = [
  ['Capa',                   () => gerarSlideCapa()],
  ['Indicadores Gerais',     () => gerarSlideIndicadoresGerais()],
  ['Preventivas',            () => gerarSlidePreventivas()],
  ['Corretivas',             () => gerarSlideCorretivas()],
  ['Backlog',                () => gerarSlideBacklog()],
  ['Backlog Emergencial',    () => gerarSlideBacklogEmergencialDetalhe()],
  ['Chamados Pendentes',     () => gerarSlideChamadosPendentes()],
  ['Backlog de Clientes',    () => gerarSlideBacklogClientesProperties()],
  ['Recebimento de Obras',   () => gerarSlideRecebimentoObras()],
  ['Gestão de Contratações', () => gerarSlideContratacoes()],
  ['Torre de Manutenção',    () => gerarSlideTorreManutencao()],
  ['DRE de Propriedades',    () => gerarSlideDREPropriedades()],
  ['DRE de Manutenção',      () => gerarSlideDREManutencao()],
  ['Bridge (tabela)',        () => gerarSlideBridgeManutencao()],
  ['Bridge (gráfico)',       () => gerarSlideBridgeManutencaoGrafico()],
  ['Farol de Metas',         () => gerarSlidesMetas()]
];

// Os slides sem fixture leem planilha vazia e saem pelo "sem dados" — o que
// interessa neles é não EXPLODIR e não escrever o aviso de falha.
const COM_FIXTURE = ['DRE de Propriedades', 'DRE de Manutenção', 'Bridge (tabela)', 'Bridge (gráfico)', 'Farol de Metas'];

const porSlide = {};   // shapes de cada passo, para as conferências de layout
PASSOS.forEach(([nome, fn]) => {
  const antes = shapes.length;
  let erro = null;
  try { fn(); } catch (e) { erro = e; }
  const novos = shapes.slice(antes);
  porSlide[nome] = novos;
  const aviso = novos.filter(s => /NÃO FOI GERADO/.test(s.txt));
  // A ELLIPSE do header sangra para fora de propósito (é o grafismo de fundo
  // do design system), então fica de fora da conferência.
  const fora  = novos.filter(s => s.tipo !== 'ELLIPSE' &&
                                  (s.y < -0.5 || s.y + s.h > ALT + 0.5 ||
                                   s.x < -1 || s.x + s.w > LARG + 1));

  if (erro) { checa(false, nome + ' — estourou: ' + erro.message); return; }
  checa(aviso.length === 0, nome + ' — sem aviso de falha' +
        (aviso.length ? ': ' + aviso[0].txt.slice(0, 120) : ''));
  if (fora.length) fora.slice(0, 3).forEach(s =>
    console.log('      fora: ' + s.tipo + ' y=' + s.y.toFixed(1) + ' h=' + s.h.toFixed(1) +
                ' ' + JSON.stringify(s.txt).slice(0, 40)));
  checa(fora.length === 0, nome + ' — nada fora dos ' + LARG + '×' + ALT + 'pt');
  if (COM_FIXTURE.indexOf(nome) !== -1)
    checa(novos.length > 20, nome + ' — desenhou (' + novos.length + ' shapes)');
});

// ── 4. O DRE de Manutenção saiu no formato dos Megas ─────────────────────
console.log('\n== DRE no formato dos Megas ==');
{
  const dre = porSlide['DRE de Manutenção'] || [];
  const cab = dre.filter(s => /^(2025|Meta|Real|Δ% Meta|Δ% 2025)$/.test(s.txt)).map(s => s.txt);
  ['2025', 'Meta', 'Real', 'Δ% Meta', 'Δ% 2025'].forEach(c =>
    checa(cab.indexOf(c) !== -1, 'coluna "' + c + '" no cabeçalho'));
  const blocos = dre.filter(s => /MÊS —|ACUMULADO —|RITMO — ANO/.test(s.txt));
  checa(blocos.length >= 3, 'os três blocos (MÊS / ACUMULADO / ANO)');
}

// ── 4.1. O DRE de Propriedades (Despesas Operacionais) ───────────────────
console.log('\n== DRE de Propriedades (Despesas Operacionais) ==');
{
  const dreProp = porSlide['DRE de Propriedades'] || [];
  const textos = dreProp.map(s => s.txt);
  checa(textos.some(t => /^DESPESAS OPERACIONAIS$/i.test(t)), 'linha raiz DESPESAS OPERACIONAIS');
  checa(textos.some(t => /^DESPESA DE PESSOAL$/i.test(t)), 'grupo DESPESA DE PESSOAL');
  checa(textos.some(t => /^SERVIÇOS DE TERCEIROS$/i.test(t)), 'grupo SERVIÇOS DE TERCEIROS');
  checa(textos.some(t => /^DESPESAS FISCAIS$/i.test(t)), 'grupo DESPESAS FISCAIS');
  checa(textos.some(t => /^DESPESAS GERAIS$/i.test(t)), 'grupo DESPESAS GERAIS');

  // Subitens com valor aparecem, subitens zerados NÃO aparecem (somente nomes, sem código)
  checa(textos.some(t => /^SEGUROS$/i.test(t)), 'subitem com valor SEGUROS presente');
  checa(textos.some(t => /^MANUTENÇÃO IMÓVEIS$/i.test(t)), 'subitem com valor MANUTENÇÃO IMÓVEIS presente');
  checa(textos.some(t => t === '592'), 'MANUTENÇÃO IMÓVEIS traz o plano 592k vindo do DRE de Manutenção');
  checa(!textos.some(t => /^MATERIAL CONSUMO$/i.test(t)), 'subitem zerado MATERIAL CONSUMO ocultado');
  checa(!textos.some(t => /^TELEFONE$/i.test(t)), 'subitem zerado TELEFONE ocultado');
}

// ── 4.2. Bridge explícito de Manutenção e ponto de entrada geral ────────
console.log('\n== Bridge de Manutenção & Execução Geral ==');
{
  const brgTab = porSlide['Bridge (tabela)'] || [];
  const brgGra = porSlide['Bridge (gráfico)'] || [];
  checa(brgTab.some(s => /MANUTENÇÃO/i.test(s.txt)), 'Bridge (tabela) traz "MANUTENÇÃO" explicitamente');
  checa(brgGra.some(s => /MANUTENÇÃO/i.test(s.txt)), 'Bridge (gráfico) traz "MANUTENÇÃO" explicitamente');

  checa(typeof gerarTodosOsSlides === 'function', 'função gerarTodosOsSlides existe');
  checa(typeof rodarTodosOsSlides === 'function', 'função rodarTodosOsSlides existe');
}

// ── 5. O Farol de Metas saiu na grade de Facilities ─────────────────────
// A versão anterior tinha inventado um cabeçalho de DUAS alturas (faixas
// "MÊS"/"ANO" agrupando três colunas cada) e uma banda cinza "35 PONTOS" na
// coluna da esquerda, no lugar da barra de pontuação no rodapé. Estas
// asserções travam a grade do farol que o time usa.
console.log('\n== Farol de Metas na grade de Facilities ==');
{
  const meta = porSlide['Farol de Metas'] || [];
  const COLS = ['ANALISTA DE PROPRIEDADES', 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
                'Meta Mês', 'Real Mês', 'Status', 'Meta Ac.', 'Real Ac.'];
  const cab = COLS.map(c => meta.filter(s => s.txt === c)).filter(a => a.length);
  checa(cab.length === COLS.length, 'as 11 colunas de Facilities no cabeçalho');

  // Uma linha só: todos os rótulos do cabeçalho no mesmo y.
  const ys = [...new Set(cab.map(a => Math.round(a[0].y)))];
  checa(ys.length === 1, 'cabeçalho em UMA altura, não em duas (y=' + ys.join(',') + ')');

  checa(meta.some(s => /PONTUAÇÃO ACUMULADA/.test(s.txt)), 'barra de pontuação no rodapé');
  checa(meta.some(s => /ELEGÍVEL/.test(s.txt)), 'selo de elegibilidade');
  checa(!meta.some(s => /^\d+ PONTOS$/.test(s.txt)),
        'sem a banda "N PONTOS" na coluna da esquerda');
  checa(!meta.some(s => s.txt === 'MÊS' || s.txt === 'ANO'),
        'sem as faixas agrupadoras MÊS/ANO');
}

console.log('\n' + (falhou ? '✗ ' + falhou + ' falha(s), ' : '✓ ') + ok + '/' + (ok + falhou) + ' passaram');
process.exit(falhou ? 1 : 0);
