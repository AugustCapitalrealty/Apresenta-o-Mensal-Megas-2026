/**
 * Teste das contas de 10_Dados_BasesBrutas.gs.
 * Padrão do CLAUDE.md: lê os .gs como texto, dubla SpreadsheetApp/Logger e
 * roda asserções. Não abre planilha nem Slides.
 *
 * Rode com:  node gestao-tvs/teste_bases.js
 */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

// ── Dublês ──────────────────────────────────────────────────────────────
const logs = [];
global.Logger = { log: m => logs.push(String(m)) };

let FAKE = {};   // { nomeAba: matriz }
global.SpreadsheetApp = {
  openById: () => ({
    getName: () => 'BASE DE DADOS — QUADRO REM (dublê)',
    getSheets: () => Object.keys(FAKE).map(n => sheet(n)),
    getSheetByName: n => (FAKE[n] ? sheet(n) : null)
  })
};
function sheet(nome) {
  return {
    getName: () => nome,
    getLastColumn: () => FAKE[nome][0].length,
    getDataRange: () => ({ getDisplayValues: () => FAKE[nome] }),
    getRange: (r, c, nr, nc) => ({
      getDisplayValues: () => FAKE[nome].slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc))
    })
  };
}

// ── Carrega o código de produção ─────────────────────────────────────────
let fonte = ['Config.gs', '10_Dados_BasesBrutas.gs']
  .map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
// Gotcha do CLAUDE.md: em eval indireto, `function` vai pro globalThis mas
// `const`/`let` de topo ficam presos no escopo do próprio eval. Vira `var`
// só nas declarações da coluna 0 (as de dentro de função são indentadas).
fonte = fonte.replace(/^(const|let) /gm, 'var ');
(0, eval)(fonte);

// ── Helpers do teste ────────────────────────────────────────────────────
let falhas = 0, testes = 0;
function ok(desc, cond, extra) {
  testes++;
  if (cond) { console.log('  ✓ ' + desc); }
  else { falhas++; console.log('  ✗ ' + desc + (extra ? '  → ' + extra : '')); }
}
const iso = d => d.toISOString().slice(0, 19).replace('T', ' ');

// Datas ancoradas nas MESMAS janelas que o código calcula, para o teste não
// depender do dia em que roda.
const semanas = _tvSemanasCompletas_(TV_SEMANAS_HISTORICO);
const corrente = _tvSemanaCorrente_();
const noMeio = j => iso(new Date(j.ini.getTime() + 3 * 864e5));

console.log('\n== Janelas semanais ==');
ok('5 semanas fechadas', semanas.length === 5, semanas.length);
ok('cada semana tem 7 dias', semanas.every(s => (s.fim - s.ini) === 7 * 864e5));
ok('semanas são contíguas', semanas.every((s, i) => i === 0 || +s.ini === +semanas[i - 1].fim));
ok('última fechada encosta na corrente', +semanas[4].fim === +corrente.ini);
ok('todas começam numa segunda', semanas.concat([corrente]).every(s => s.ini.getUTCDay() === 1),
   semanas.map(s => s.ini.getUTCDay()).join(','));
ok('semana corrente contém hoje', _tvDentro_(new Date(), corrente));

// ── BD-CORRETIVAS de mentira ────────────────────────────────────────────
// Guilherme Heck = FACILITIES, Ivan Fuscolin Neto = PROPERTY (mapa real).
const HDR_C = ['Id chamado', 'Centro de Custos', 'Estado', 'Descrição', 'Prioridade',
               'Responsáveis', 'SLA', 'Disciplina', 'Data de reporte', 'Fechado em'];
const linhaC = (cc, estado, pri, resp, disc, dtRep, dtFec) =>
  ['1', cc, estado, 'x', pri, resp, '', disc, dtRep, dtFec || ''];

FAKE = {
  'BD-CORRETIVAS': [HDR_C,
    // semana corrente: 2 Facilities + 1 Property = 3
    linhaC('Mega Curitiba', 'Aberto',  'Emergencial', 'Guilherme Heck',    'Elétrica',  noMeio(corrente)),
    linhaC('Mega Curitiba', 'Aberto',  'Alta',        'Guilherme Heck',    'Elétrica',  noMeio(corrente)),
    linhaC('Mega Curitiba', 'Aberto',  'Normal',      'Ivan Fuscolin Neto','Hidráulica',noMeio(corrente)),
    // última semana fechada: 1
    linhaC('Mega Curitiba', 'Fechado', 'Baixa',       'Guilherme Heck',    'Elétrica',  noMeio(semanas[4]), noMeio(semanas[4])),
    // outra cidade — não pode entrar na conta de Curitiba
    linhaC('Mega Itajaí',   'Aberto',  'Emergencial', 'Dionatan Rek',      'Elétrica',  noMeio(corrente)),
    // fechado SEM data: pela regra continua ABERTO (lição do CLAUDE.md)
    linhaC('Mega Curitiba', 'Fechado', 'Alta',        'Guilherme Heck',    'Civil',     noMeio(semanas[0]))
  ]
};

const unitCwb = UNITS.find(u => u.name === 'MEGA CURITIBA');
const unitItj = UNITS.find(u => u.name === 'MEGA ITAJAÍ');

console.log('\n== Slide 1 — Visão Geral Corretiva (fluxo) ==');
const corr = obterCorretivasTV_(unitCwb);
ok('semana corrente = 3 criados', corr.atual.total === 3, JSON.stringify(corr.atual));
ok('  2 Facilities', corr.atual.facilities === 2, corr.atual.facilities);
ok('  1 Property',   corr.atual.propriedades === 1, corr.atual.propriedades);
ok('última fechada = 1', corr.anterior.total === 1, corr.anterior.total);
ok('histórico com 5 pontos', corr.historico.length === 5);
ok('não vaza Itajaí', corr.historico.reduce((s, h) => s + h.total, 0) + corr.atual.total === 5,
   'soma=' + (corr.historico.reduce((s, h) => s + h.total, 0) + corr.atual.total));
ok('Itajaí conta só o seu', obterCorretivasTV_(unitItj).atual.total === 1);

console.log('\n== Slide 2 — Backlog Corretivo (estoque) ==');
const bl = obterBacklogCorretivoTV_(unitCwb);
// Abertos de Curitiba: 3 da corrente + o "Fechado sem data" = 4
ok('Emergencial=1', bl.pEmergencial === 1, bl.pEmergencial);
ok('Alta=2 (inclui "Fechado" sem data de fechamento)', bl.pAlta === 2, bl.pAlta);
ok('Normal=1', bl.pNormal === 1, bl.pNormal);
ok('Baixa=0 (o único Baixa está fechado de verdade)', bl.pBaixa === 0, bl.pBaixa);
ok('disciplina líder = Elétrica (2)', bl.topAreas[0].area === 'Elétrica' && bl.topAreas[0].count === 2,
   JSON.stringify(bl.topAreas));

// ── BD-PREVENTIVAS de mentira ───────────────────────────────────────────
const HDR_P = ['Centro de Custos', 'Estado', 'Descrição', 'SLA', 'Equipe',
               'Fechado por', 'Data agendamento', 'Fechada em'];
const linhaP = (cc, estado, desc, sla, eq, dtAge, dtFec) =>
  [cc, estado, desc, sla, eq, '', dtAge, dtFec || ''];

FAKE = {
  'BD - PREVENTIVAS': [HDR_P,
    // semana corrente: 3 cumpridas + 1 não cumprida → SLA 75%
    linhaP('Mega Curitiba', 'Fechada', 'Bomba de incêndio 01', 'Cumprido',     'FACILITIES', noMeio(corrente), noMeio(corrente)),
    linhaP('Mega Curitiba', 'Fechada', 'Bomba de incêndio 02', 'Cumprido',     'FACILITIES', noMeio(corrente), noMeio(corrente)),
    linhaP('Mega Curitiba', 'Fechada', 'Gerador',              'Cumprido',     'FACILITIES', noMeio(corrente), noMeio(corrente)),
    linhaP('Mega Curitiba', 'Fechada', 'Elevador',             'Não cumprido', 'FACILITIES', noMeio(corrente), noMeio(corrente)),
    // "Sem SLA" fica FORA da fração, em cima e embaixo
    linhaP('Mega Curitiba', 'Fechada', 'Ar condicionado',      'Sem SLA',      'FACILITIES', noMeio(corrente), noMeio(corrente)),
    // abertas → backlog. Duas irmãs agrupam em "Bomba de drenagem 2x"
    linhaP('Mega Curitiba', 'Atrasada', 'Bomba de drenagem 01', '',            'FACILITIES', noMeio(semanas[0])),
    linhaP('Mega Curitiba', 'Atrasada', 'Bomba de drenagem 02', '',            'FACILITIES', noMeio(semanas[0])),
    linhaP('Mega Curitiba', 'Em curso', 'Painel elétrico',      '',            'PROPERTY',   noMeio(semanas[3]))
  ]
};

console.log('\n== obterPreventivasTV_ (ainda não ligado a slide — ver 03_Slide_Preventivas.gs) ==');
const prev = obterPreventivasTV_(unitCwb);
ok('conforme=3',      prev.atual.conforme === 3, prev.atual.conforme);
ok('não conforme=1',  prev.atual.naoConforme === 1, prev.atual.naoConforme);
ok('total=4 ("Sem SLA" fora da conta)', prev.atual.total === 4, prev.atual.total);
ok('SLA = 75%',       prev.atual.slaPerc === '75%', prev.atual.slaPerc);

console.log('\n== Slide 4 — Backlog Preventivo ==');
const blp = obterBacklogPreventivoTV_(unitCwb);
ok('em aberto=2 (as duas atrasadas)', blp.countEmAberto === 2, blp.countEmAberto);
ok('em curso=1',                      blp.countEmCurso === 1, blp.countEmCurso);
ok('agrupou as bombas irmãs em 1 linha 2x',
   blp.lista.some(l => l.desc === 'Bomba de drenagem' && l.qtd === 2),
   JSON.stringify(blp.lista.map(l => l.desc + '=' + l.qtd)));
ok('atrasadas vêm antes das em curso', blp.lista[0].isEmAberto === true);
ok('equipe do painel = PROPERTY',
   blp.lista.some(l => l.desc === 'Painel elétrico' && l.equipe === 'PROPERTY'),
   JSON.stringify(blp.lista.map(l => l.desc + ':' + l.equipe)));
ok('equipe líder = FACILITIES', blp.equipeLider === 'FACILITIES', blp.equipeLider);
ok('dias em aberto calculados', blp.lista.every(l => l.dataLabel !== '-'),
   JSON.stringify(blp.lista.map(l => l.dataLabel)));

console.log('\n== Cache e base vazia ==');
// O cache é por aba e compartilhado pelas 3 unidades — uma leitura da
// planilha por rodada, não uma por cidade. Trocar o dublê sem limpá-lo não
// tem efeito, e é justamente isso que este primeiro caso confirma.
FAKE = { 'BD-CORRETIVAS': [HDR_C] };
ok('cache quente ignora o dublê novo', obterCorretivasTV_(unitCwb) !== null);

Object.keys(_tvBaseCache).forEach(k => delete _tvBaseCache[k]);
ok('sem linhas → null (slide preservado, não zerado)', obterCorretivasTV_(unitCwb) === null);

// Linhas existem, mas a coluna de data sumiu do cabeçalho: tem que devolver
// null em vez de contar 0 em silêncio (a "armadilha do zero falso" do CLAUDE.md).
Object.keys(_tvBaseCache).forEach(k => delete _tvBaseCache[k]);
FAKE = { 'BD-CORRETIVAS': [
  ['Id chamado', 'Centro de Custos', 'Estado', 'Prioridade', 'Responsáveis'],
  ['1', 'Mega Curitiba', 'Aberto', 'Alta', 'Guilherme Heck']
] };
ok('data ausente → null, não zero falso', obterCorretivasTV_(unitCwb) === null);
ok('e avisa no Logger', logs.some(l => l.indexOf('nenhuma com data legível') >= 0));

console.log('\n' + (falhas ? `✗ ${falhas} de ${testes} falharam` : `✓ ${testes}/${testes} passaram`));
process.exit(falhas ? 1 : 0);
