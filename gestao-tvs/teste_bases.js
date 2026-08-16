/**
 * Teste das contas de Dados.gs (parte 1 — bases brutas).
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
let fonte = ['Config.gs', '00_Main.gs', 'Dados.gs']
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
const fotos = _tvDatasBacklog_(TV_HISTORICO_PONTOS);
const hojeU = _tvHojeUTC_();
// Uma data alguns dias ANTES do fim da janela, para o item já existir ali.
// Aceita tanto uma foto ({instante}) quanto uma janela ({ini, fim}).
const noMeio = j => iso(new Date((j.instante || j.fim).getTime() - 3 * 864e5));
const corrente = { ini: new Date(fotos[4].instante.getTime() - 7 * 864e5), fim: fotos[4].instante };
const semanas = fotos.map(f => ({ ini: new Date(f.instante.getTime() - 7 * 864e5), fim: f.instante }));

console.log('\n== Fotos da fila a cada 7 dias ==');
ok('5 pontos', fotos.length === 5, fotos.length);
ok('espaçados de 7 dias exatos',
   fotos.every((f, i) => i === 0 || (f.instante - fotos[i - 1].instante) === 7 * 864e5));
ok('o ÚLTIMO ponto é HOJE (não o fim da última semana fechada)',
   +fotos[4].instante === hojeU.getTime() + 864e5,
   fotos[4].label + ' vs hoje ' + _tvLabelDia_(hojeU));
ok('o rótulo do último ponto é a data de hoje',
   fotos[4].label === _tvLabelDia_(hojeU), fotos[4].label);
ok('o penúltimo é exatamente 7 dias atrás',
   +fotos[3].instante === hojeU.getTime() + 864e5 - 7 * 864e5, fotos[3].label);

// ── BD-CORRETIVAS de mentira ────────────────────────────────────────────
// Guilherme Heck = FACILITIES, Ivan Fuscolin Neto = PROPERTY (mapa real).
// Cabeçalhos REAIS da BD-CORRETIVAS. A coluna de disciplina chama "Área" —
// usar o nome de verdade faz o teste quebrar se alguém tirar 'area' da busca.
const HDR_C = ['Id chamado', 'Centro de Custos', 'Estado', 'Descrição', 'Prioridade',
               'Responsáveis', 'SLA', 'Área', 'Data de reporte', 'Fechado em'];
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

console.log('\n== Slide 1 — Visão Geral Corretiva (ESTOQUE: fila em aberto) ==');
const corr = obterCorretivasTV_(unitCwb);
// Abertos de Curitiba: os 3 da semana corrente + o "Fechado sem data" = 4.
// O de semana[4] fechou de verdade, então saiu da fila.
ok('fila hoje = 4 (não os 3 criados na semana)', corr.atual.total === 4, JSON.stringify(corr.atual));
ok('  3 Facilities', corr.atual.facilities === 3, corr.atual.facilities);
ok('  1 Property',   corr.atual.propriedades === 1, corr.atual.propriedades);
ok('Facilities + Property = total', corr.atual.facilities + corr.atual.propriedades === corr.atual.total);
ok('histórico com 5 pontos', corr.historico.length === 5);
// O cartão grande, a seta e a última barra têm que ser o MESMO número — era
// o que não acontecia com semanas de calendário (cartão 203, barra 205).
ok('a última barra É o cartão grande',
   corr.historico[4].total === corr.atual.total,
   'barra=' + corr.historico[4].total + ' cartão=' + corr.atual.total);
ok('a penúltima barra É o comparativo da seta',
   corr.historico[3].total === corr.anterior.total,
   'barra=' + corr.historico[3].total + ' seta=' + corr.anterior.total);
ok('o rótulo da última barra é hoje',
   corr.historico[4].dataCurta === _tvLabelDia_(hojeU), corr.historico[4].dataCurta);
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
ok('total = soma das prioridades', bl.total === 4, bl.total);
// O chamado da semana[4] foi aberto E fechado há mais de 7 dias, então não
// estava na fila naquele instante; os 3 da semana corrente também não existiam.
ok('backlog de 7 dias atrás é CALCULADO, não lembrado',
   typeof bl.totalAnterior === 'number' && bl.totalAnterior < bl.total,
   'hoje=' + bl.total + ' antes=' + bl.totalAnterior);

// A RECONCILIAÇÃO: slides 1 e 2 são o MESMO backlog, um por equipe e outro
// por prioridade. Foi exatamente isso que quebrou na TV — o slide 1 mostrava
// 2 (chamados criados na semana) enquanto a fila real era outra ordem de
// grandeza. Se estes dois desencontrarem de novo, o teste acusa.
ok('slide 1 e slide 2 mostram o MESMO total de fila',
   corr.atual.total === bl.total, 'slide1=' + corr.atual.total + ' slide2=' + bl.total);
ok('e o mesmo comparativo de 7 dias atrás',
   corr.anterior.total === bl.totalAnterior,
   'slide1=' + corr.anterior.total + ' slide2=' + bl.totalAnterior);

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

console.log('\n== Janelas mensais (slide 3) ==');
const mesesHist = _tvMesesHistorico_(TV_MESES_HISTORICO);
const periodoAnt = _tvMesAnteriorMesmoPeriodo_();
const hojeUTC = _tvHojeUTC_();
ok('5 meses no histórico', mesesHist.length === 5, mesesHist.length);
ok('todos começam no dia 1', mesesHist.every(m => m.ini.getUTCDate() === 1));
ok('meses são contíguos', mesesHist.every((m, i) => i === 0 || +m.ini === +mesesHist[i - 1].fim),
   mesesHist.map(m => m.label).join(','));
ok('o último é o mês corrente e para hoje',
   mesesHist[4].ini.getUTCMonth() === hojeUTC.getUTCMonth() &&
   +mesesHist[4].fim === hojeUTC.getTime() + 864e5);
ok('rótulos são nomes de mês por extenso',
   mesesHist.every(m => MESES_POR_EXTENSO.indexOf(m.label) >= 0), mesesHist.map(m => m.label).join(','));
ok('mês anterior começa no dia 1', periodoAnt.ini.getUTCDate() === 1);
ok('mês anterior é o mês de trás', periodoAnt.ini.getUTCMonth() === (hojeUTC.getUTCMonth() + 11) % 12);
ok('período anterior cobre os mesmos dias já decorridos',
   periodoAnt.dias === hojeUTC.getUTCDate(), periodoAnt.dias + ' vs dia ' + hojeUTC.getUTCDate());
ok('período anterior nunca invade o mês corrente',
   periodoAnt.fim <= _tvInicioDoMes_(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth()));

console.log('\n== Slide 3 — Visão Geral Preventiva (mensal + mesmo período) ==');
// Monta a base ancorada nas janelas reais, para o teste não depender do dia.
const noMesMeio = j => iso(new Date(j.ini.getTime() + 0 * 864e5));  // dia 1 de cada janela
FAKE = {
  'BD - PREVENTIVAS': [HDR_P,
    // MÊS CORRENTE: 3 cumpridas + 1 não cumprida → SLA 75%
    linhaP('Mega Curitiba', 'Fechada', 'Bomba de incêndio 01', 'Cumprido',     'FACILITIES', noMesMeio(mesesHist[4]), noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Fechada', 'Bomba de incêndio 02', 'Cumprido',     'FACILITIES', noMesMeio(mesesHist[4]), noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Fechada', 'Gerador',              'Cumprido',     'FACILITIES', noMesMeio(mesesHist[4]), noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Fechada', 'Elevador',             'Não cumprido', 'FACILITIES', noMesMeio(mesesHist[4]), noMesMeio(mesesHist[4])),
    // "Sem SLA" fica FORA da fração, em cima e embaixo
    linhaP('Mega Curitiba', 'Fechada', 'Ar condicionado',      'Sem SLA',      'FACILITIES', noMesMeio(mesesHist[4]), noMesMeio(mesesHist[4])),
    // MÊS ANTERIOR, dia 1 → cai DENTRO do mesmo período: 1 cumprida + 1 não → 50%
    linhaP('Mega Curitiba', 'Fechada', 'Extintores',           'Cumprido',     'FACILITIES', noMesMeio(periodoAnt), noMesMeio(periodoAnt)),
    linhaP('Mega Curitiba', 'Fechada', 'Hidrantes',            'Não cumprido', 'FACILITIES', noMesMeio(periodoAnt), noMesMeio(periodoAnt)),
    // MÊS ANTERIOR, último dia → FORA do mesmo período (a não ser que hoje
    // seja o fim do mês); entra só no mês anterior COMPLETO.
    linhaP('Mega Curitiba', 'Fechada', 'Para-raios',           'Não cumprido', 'FACILITIES',
           iso(new Date(_tvInicioDoMes_(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth()).getTime() - 864e5)),
           iso(new Date(_tvInicioDoMes_(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth()).getTime() - 864e5))),
    // abertas → não entram em SLA nenhum
    linhaP('Mega Curitiba', 'Atrasada', 'Bomba de drenagem 01', '',            'FACILITIES', noMesMeio(mesesHist[0])),
    linhaP('Mega Curitiba', 'Atrasada', 'Bomba de drenagem 02', '',            'FACILITIES', noMesMeio(mesesHist[0])),
    linhaP('Mega Curitiba', 'Em curso', 'Painel elétrico',      '',            'PROPERTY',   noMesMeio(mesesHist[3]))
  ]
};

const prev = obterPreventivasMensalTV_(unitCwb);
ok('mês corrente: conforme=3',     prev.atual.conforme === 3, prev.atual.conforme);
ok('mês corrente: não conforme=1', prev.atual.naoConforme === 1, prev.atual.naoConforme);
ok('mês corrente: total=4 ("Sem SLA" fora da conta)', prev.atual.total === 4, prev.atual.total);
ok('mês corrente: SLA = 75%',      prev.atual.slaPerc === '75%', prev.atual.slaPerc);
ok('histórico com 5 meses',        prev.historico.length === 5);
ok('último ponto do histórico é o mês corrente',
   prev.historico[4].total === prev.atual.total && prev.historico[4].dataCurta === prev.atual.dataCurta);
ok('comparativo: mesmo período tem 1 cumprida',     prev.comparativo.cumpridoAnterior === 1, prev.comparativo.cumpridoAnterior);
ok('comparativo: mesmo período tem 1 não cumprida', prev.comparativo.naoCumpridoAnterior === 1, prev.comparativo.naoCumpridoAnterior);
ok('comparativo: SLA anterior = 50%',               prev.comparativo.slaMesAnterior === '50%', prev.comparativo.slaMesAnterior);
ok('comparativo: rótulo é o mês CORRENTE (o desenho deriva o anterior)',
   prev.comparativo.mesLabel === mesesHist[4].label, prev.comparativo.mesLabel);
ok('a rotina do fim do mês anterior NÃO entra no mesmo período',
   prev.comparativo.cumpridoAnterior + prev.comparativo.naoCumpridoAnterior === 2,
   'entraram ' + (prev.comparativo.cumpridoAnterior + prev.comparativo.naoCumpridoAnterior));
ok('mas ENTRA no mês anterior completo', prev.anterior.total === 3, prev.anterior.total);

console.log('\n== Slide 4 — Backlog Preventivo ==');
const blp = obterBacklogPreventivoTV_(unitCwb);
ok('em aberto=2 (as duas atrasadas)', blp.countEmAberto === 2, blp.countEmAberto);
ok('em curso=1',                      blp.countEmCurso === 1, blp.countEmCurso);
ok('agrupou as bombas irmãs em 1 linha 2x',
   blp.lista.some(l => l.desc === 'Bomba de drenagem' && l.qtd === 2),
   JSON.stringify(blp.lista.map(l => l.desc + '=' + l.qtd)));
ok('atrasadas vêm antes das em curso', blp.lista[0].isEmAberto === true);
// A BD-PREVENTIVAS real NÃO tem coluna de equipe; a fixture tem, então este
// caso cobre o caminho "coluna existe". O caso de baixo cobre o real.
ok('equipe do painel = PROPERTY',
   blp.lista.some(l => l.desc === 'Painel elétrico' && l.equipe === 'PROPERTY'),
   JSON.stringify(blp.lista.map(l => l.desc + ':' + l.equipe)));
ok('equipe líder = FACILITIES', blp.equipeLider === 'FACILITIES', blp.equipeLider);
ok('dias em aberto calculados', blp.lista.every(l => l.dataLabel !== '-'),
   JSON.stringify(blp.lista.map(l => l.dataLabel)));

console.log('\n== Só os estados da fila entram (não "tudo que não fechou") ==');
delete _tvBaseCache[BD_ABA_PREVENTIVAS];
FAKE = {
  'BD - PREVENTIVAS': [HDR_P,
    linhaP('Mega Curitiba', 'Atrasada',  'Bomba', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Em aberto', 'Filtro', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Em curso',  'Painel', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    // estes NÃO são fila — antes entravam todos e inflavam o número
    linhaP('Mega Curitiba', 'Cancelada', 'Ruído 1', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Planeada',  'Ruído 2', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', '',          'Ruído 3', '', 'FACILITIES', noMesMeio(mesesHist[4]))
  ]
};
const est = obterBacklogPreventivoTV_(unitCwb);
ok('em aberto = 2 (Atrasada + Em aberto)', est.countEmAberto === 2, est.countEmAberto);
ok('em curso = 1', est.countEmCurso === 1, est.countEmCurso);
ok('Cancelada/Planeada/vazio ficam FORA', est.lista.length === 3,
   JSON.stringify(est.lista.map(l => l.desc)));
ok('e o Logger lista os estados excluídos com a contagem',
   logs.some(l => l.indexOf('estados FORA da fila') >= 0 && l.indexOf('Cancelada') >= 0));

console.log('\n== Nome do serviço na coluna DESCRIÇÃO ==');
const uCwb = { name: 'MEGA CURITIBA' };
ok('tira o prefixo do checklist E o sufixo com o nome da unidade',
   _tvDescricaoRotina_(_limparDescricaoChecklist_('CHECKLIST - Zelador | Leitura Diária | MEGA Curitiba'), uCwb) === 'Leitura Diária');
ok('texto livre depois da barra é preservado',
   _tvDescricaoRotina_('COLETA - Especializada | CDF e MTR', uCwb) === 'COLETA - Especializada | CDF e MTR');
ok('rotinas irmãs agrupam ("Bomba de incêndio 03" → "Bomba de incêndio")',
   _tvDescricaoRotina_('Bomba de incêndio 03', uCwb) === 'Bomba de incêndio');

console.log('\n== Mesmo serviço não vira duas linhas por causa da equipe ==');
delete _tvBaseCache[BD_ABA_PREVENTIVAS];
FAKE = {
  'BD - PREVENTIVAS': [HDR_P,
    // mesma descrição, uma com equipe reconhecida e outra sem — na TV isso
    // aparecia como "Análise de Cloro" 17x e "Análise de Cloro" 15x.
    linhaP('Mega Curitiba', 'Atrasada', 'Análise de Cloro', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Atrasada', 'Análise de Cloro', '', '',           noMesMeio(mesesHist[4]))
  ]
};
const dup = obterBacklogPreventivoTV_(unitCwb);
ok('uma linha só, 2x', dup.lista.length === 1 && dup.lista[0].qtd === 2,
   JSON.stringify(dup.lista.map(l => l.desc + '=' + l.qtd)));
ok('e a equipe conhecida do lote vale para o grupo',
   dup.lista[0].equipe === 'FACILITIES', dup.lista[0].equipe);

console.log('\n== Corte de idade do backlog preventivo ==');
delete _tvBaseCache[BD_ABA_PREVENTIVAS];
const velha = iso(new Date(hojeUTC.getTime() - 1337 * 864e5));   // como a de 1337 dias da TV
FAKE = {
  'BD - PREVENTIVAS': [HDR_P,
    linhaP('Mega Curitiba', 'Atrasada', 'Rotina recente', '', 'FACILITIES', noMesMeio(mesesHist[4])),
    linhaP('Mega Curitiba', 'Atrasada', 'Rotina de 2022',  '', 'FACILITIES', velha)
  ]
};
const corte = obterBacklogPreventivoTV_(unitCwb);
ok('rotina de 1337 dias fica FORA da fila', corte.countEmAberto === 1, corte.countEmAberto);
ok('e o Logger diz quantas ficaram de fora por idade',
   logs.some(l => l.indexOf('ficaram de fora por idade') >= 0));
ok('a recente continua na lista',
   corte.lista.length === 1 && corte.lista[0].desc === 'Rotina recente',
   JSON.stringify(corte.lista.map(l => l.desc)));

console.log('\n== Limpeza da descrição (formato das preventivas) ==');
ok('"CHECKLIST - Zelador | Caixa de Gordura" → "Caixa de Gordura"',
   _limparDescricaoChecklist_('CHECKLIST - Zelador  | Caixa de Gordura') === 'Caixa de Gordura',
   _limparDescricaoChecklist_('CHECKLIST - Zelador  | Caixa de Gordura'));
ok('formato das corretivas (com ID na frente) continua funcionando',
   _limparDescricaoChecklist_('PMP.9040 CHECKLIST - FACILITIES | Bombas | Posto SIM: C02. Água voltando') === 'Água voltando');
ok('texto livre fica intacto',
   _limparDescricaoChecklist_('Água voltando pelos tubos') === 'Água voltando pelos tubos');

console.log('\n== Sem coluna de equipe (a base REAL é assim) ==');
// Só a chave de PREVENTIVAS: o bloco seguinte confere que o cache de
// CORRETIVAS continua quente.
delete _tvBaseCache[BD_ABA_PREVENTIVAS];
// Mesmas colunas da BD-PREVENTIVAS de verdade: sem Responsáveis, sem Equipe.
const HDR_P_REAL = ['Centro de Custos', 'Estado', 'Descrição', 'SLA',
                    'Fechado por', 'Data agendamento', 'Fechada em'];
FAKE = {
  'BD - PREVENTIVAS': [HDR_P_REAL,
    ['Mega Curitiba', 'Atrasada', 'Bomba de drenagem', '', '', noMesMeio(mesesHist[0]), ''],
    ['Mega Curitiba', 'Atrasada', 'Extintores',        '', '', noMesMeio(mesesHist[0]), '']
  ]
};
const semEq = obterBacklogPreventivoTV_(unitCwb);
ok('equipe vira "—", não FACILITIES por omissão',
   semEq.lista.every(l => l.equipe === '—'), JSON.stringify(semEq.lista.map(l => l.equipe)));
ok('MAIOR VOLUME vira "—" em vez de afirmar FACILITIES',
   semEq.equipeLider === '—', semEq.equipeLider);
ok('e o Logger registra o porquê',
   logs.some(l => l.indexOf('equipe identificável') >= 0));

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
