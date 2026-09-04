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
    appendText(t) { o._t += String(t); return { getTextStyle: estilo }; },
    getTextStyle: estilo,
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
  ['DRE de Manutenção',      () => gerarSlideDREManutencao()],
  ['Bridge (tabela)',        () => gerarSlideBridgeManutencao()],
  ['Bridge (gráfico)',       () => gerarSlideBridgeManutencaoGrafico()],
  ['Farol de Metas',         () => gerarSlidesMetas()]
];

// Os slides sem fixture leem planilha vazia e saem pelo "sem dados" — o que
// interessa neles é não EXPLODIR e não escrever o aviso de falha.
const COM_FIXTURE = ['DRE de Manutenção', 'Bridge (tabela)', 'Bridge (gráfico)', 'Farol de Metas'];

PASSOS.forEach(([nome, fn]) => {
  const antes = shapes.length;
  let erro = null;
  try { fn(); } catch (e) { erro = e; }
  const novos = shapes.slice(antes);
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

// ── 4. O DRE saiu no formato dos Megas ──────────────────────────────────
console.log('\n== DRE no formato dos Megas ==');
{
  const cab = shapes.filter(s => /^(2025|Meta|Real|Δ% Meta|Δ% 2025)$/.test(s.txt)).map(s => s.txt);
  ['2025', 'Meta', 'Real', 'Δ% Meta', 'Δ% 2025'].forEach(c =>
    checa(cab.indexOf(c) !== -1, 'coluna "' + c + '" no cabeçalho'));
  const blocos = shapes.filter(s => /MÊS —|ACUMULADO —|RITMO — ANO/.test(s.txt));
  checa(blocos.length >= 3, 'os três blocos (MÊS / ACUMULADO / ANO)');
}

console.log('\n' + (falhou ? '✗ ' + falhou + ' falha(s), ' : '✓ ') + ok + '/' + (ok + falhou) + ' passaram');
process.exit(falhou ? 1 : 0);
