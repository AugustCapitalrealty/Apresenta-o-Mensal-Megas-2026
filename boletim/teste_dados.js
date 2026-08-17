/**
 * Teste das contas de Dados.gs (etapa 1 do boletim).
 * Padrão do CLAUDE.md: lê os .gs como texto, dubla SpreadsheetApp/Logger e
 * roda asserções. Não abre planilha nem Slides.
 *
 * Rode com:  node boletim/teste_dados.js
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
// config.gs traz intervaloSemanaISO, que Dados.gs usa para a janela semanal.
let fonte = ['config.gs', 'Dados.gs']
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
const iso = d => d.toISOString().slice(0, 19).replace('T', ' ');

const hoje = _bolHojeUTC_();
const semana = _bolJanelaSemana_();

console.log('\n== Janela da semana ISO ==');
ok('começa numa segunda', semana.ini.getUTCDay() === 1, semana.ini.toISOString().slice(0, 10));
ok('tem 7 dias', (semana.fim - semana.ini) === 7 * 864e5);
ok('contém hoje', hoje >= semana.ini && hoje < semana.fim,
   iso(semana.ini) + ' .. ' + iso(semana.fim));

console.log('\n== Fotos do backlog ==');
ok('hoje = fim do dia de hoje', +_bolInstante_(0) === hoje.getTime() + 864e5);
ok('7 dias atrás', +_bolInstante_(7) === hoje.getTime() + 864e5 - 7 * 864e5);
ok('28 dias atrás', +_bolInstante_(28) === hoje.getTime() + 864e5 - 28 * 864e5);

console.log('\n== Um item estava aberto naquele instante? ==');
const d = n => new Date(hoje.getTime() - n * 864e5);
const item = (rep, fec, est) => ({ dtReporte: rep, dtFechado: fec, estado: est || (fec ? 'Fechado' : 'Aberto') });
// Aberto há 10 dias e nunca fechado: está nas fotos de hoje e de 7 dias
// atrás, mas NÃO na de 28 — naquele momento ele ainda não existia.
ok('aberto há 10 dias entra nas fotos de hoje e de 7d',
   _bolAbertoEm_(item(d(10), null), _bolInstante_(0)) === true &&
   _bolAbertoEm_(item(d(10), null), _bolInstante_(7)) === true);
ok('e NÃO na de 28d, porque ainda não existia',
   _bolAbertoEm_(item(d(10), null), _bolInstante_(28)) === false);
ok('fechado há 3 dias: fora de hoje, dentro de 7 dias atrás',
   _bolAbertoEm_(item(d(20), d(3)), _bolInstante_(0)) === false &&
   _bolAbertoEm_(item(d(20), d(3)), _bolInstante_(7)) === true);
ok('"Fechado" SEM data de fechamento continua aberto (lição do CLAUDE.md)',
   _bolAbertoEm_({ dtReporte: d(20), dtFechado: null, estado: 'Fechado' }, _bolInstante_(0)) === true);

console.log('\n== Nome do empreendimento: boletim x base ==');
ok('acento e caixa não separam', _bolChaveEmp_('MEGA ITAJAI') === _bolChaveEmp_('Mega Itajaí'));
ok('pontuação não separa', _bolChaveEmp_('ARMAZÉM MONOUSUÁRIO ESTEIO II') === _bolChaveEmp_('armazem monousuario esteio ii'));
ok('nomes diferentes seguem diferentes', _bolChaveEmp_('POSTO CURITIBA') !== _bolChaveEmp_('MEGA CURITIBA'));

console.log('\n== Contas por empreendimento ==');
const HDR = ['Id chamado', 'Centro de Custos', 'Estado', 'Descrição', 'Prioridade',
             'Responsáveis', 'SLA', 'Área', 'Equipamentos', 'Tipo de reporte',
             'Tempo para fechar (segundos)', 'Data de reporte', 'Fechado em'];
const L = (cc, est, resp, rep, fec) =>
  ['1', cc, est, 'x', 'Alta', resp, '', 'Elétrica', '', 'Corretiva', '', rep, fec || ''];

const naSemana = iso(new Date(semana.ini.getTime() + 864e5));   // 2º dia da semana corrente
FAKE = {
  'BD-CORRETIVAS': [HDR,
    // aberto nesta semana e ainda aberto
    L('MEGA CURITIBA', 'Aberto',  'Guilherme Heck',     naSemana),
    // aberto há 40 dias, ainda aberto → está nas três fotos
    L('MEGA CURITIBA', 'Aberto',  'Ivan Fuscolin Neto', iso(d(40))),
    // aberto há 40 dias e fechado nesta semana
    L('MEGA CURITIBA', 'Fechado', 'Guilherme Heck',     iso(d(40)), naSemana),
    // locatário, ainda aberto
    L('POSTO CURITIBA', 'Aberto', 'Responsabilidade Locatario', iso(d(15)))
  ]
};

const c = obterCorretivasBoletim_();
const cwb = c.porEmp[_bolChaveEmp_('MEGA CURITIBA')];
ok('abertos na semana = 1', cwb.abertosSemana === 1, cwb.abertosSemana);
ok('fechados na semana = 1', cwb.fechadosSemana === 1, cwb.fechadosSemana);
ok('backlog hoje = 2', cwb.backlog[0] === 2, cwb.backlog[0]);
ok('backlog 28 dias atrás = 2 (os dois antigos ainda abertos)', cwb.backlog[28] === 2, cwb.backlog[28]);
ok('separa empreendimentos', c.porEmp[_bolChaveEmp_('POSTO CURITIBA')].backlog[0] === 1);
ok('total soma os dois', c.total.backlog[0] === 3, c.total.backlog[0]);
ok('equipe do locatário vira LOCATARIO',
   c.porEmp[_bolChaveEmp_('POSTO CURITIBA')].equipes['LOCATARIO'] === 1,
   JSON.stringify(c.porEmp[_bolChaveEmp_('POSTO CURITIBA')].equipes));
ok('Property e Facilities separados no backlog de hoje',
   cwb.equipes['PROPERTY'] === 1 && cwb.equipes['FACILITIES'] === 1,
   JSON.stringify(cwb.equipes));

console.log('\n== Slide 05 — quadro de manutenção corretiva ==');
Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
const mesPassado = iso(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 5)));
FAKE = {
  'BD-CORRETIVAS': [HDR,
    L('MEGA CURITIBA',  'Aberto',  'Guilherme Heck',              mesPassado),   // FACILITIES
    L('MEGA CURITIBA',  'Aberto',  'Ivan Fuscolin Neto',          mesPassado),   // PROPERTY
    L('POSTO CURITIBA', 'Aberto',  'Responsabilidade Locatario',  mesPassado),   // LOCATARIO
    L('MEGA ESTEIO',    'Aberto',  'Gerente Hangar',              mesPassado),   // OPERACAO
    L('MEGA ESTEIO',    'Aberto',  'Fulano Desconhecido',         mesPassado),   // cai em FACILITIES
    L('MEGA ESTEIO',    'Fechado', 'Guilherme Heck', iso(d(60)), iso(d(50)))     // fechado, fora
  ]
};
const q = obterQuadroCorretivasBoletim_(4);
ok('total = 5 (o fechado fica fora)', q.kpis.total === 5, q.kpis.total);
ok('Facilities = 2 (inclui o responsável desconhecido)', q.kpis.facilities === 2, q.kpis.facilities);
ok('Property = 1', q.kpis.property === 1, q.kpis.property);
ok('Locatários = 1', q.kpis.locatarios === 1, q.kpis.locatarios);
ok('Operação = 1', q.kpis.operacao === 1, q.kpis.operacao);
// É a razão de existir desta troca: hoje são quatro células digitadas em
// lugares diferentes, e o slide saiu com composição 465 x cartões 504.
ok('AS QUATRO EQUIPES SOMAM O TOTAL (fecha por construção)',
   q.kpis.facilities + q.kpis.property + q.kpis.locatarios + q.kpis.operacao === q.kpis.total,
   JSON.stringify(q.kpis));
ok('histórico com 4 meses', q.historico.length === 4, q.historico.length);
ok('o último mês do histórico é o mês corrente',
   q.meses[3] === BOL_MESES_NOME[hoje.getUTCMonth()], q.meses.join(','));
ok('a última barra É o cartão grande',
   q.historico[3].total === q.kpis.total,
   'barra=' + q.historico[3].total + ' cartão=' + q.kpis.total);
ok('cada mês do histórico também fecha',
   q.historico.every(h => h.FACILITIES + h.PROPERTY + h.LOCATARIO + h.OPERACAO === h.total));
console.log('\n== Composição do backlog por disciplina ==');
ok('sai da coluna Área e vem junto no quadro',
   q.composicao[0].label === 'Elétrica' && q.composicao[0].val === 5,
   JSON.stringify(q.composicao));
// É a razão de trocar o recorte: o painel por TIPO vinha de células digitadas
// e apareceu na tela com quatro zeros. Por disciplina ele fecha sozinho.
ok('a composição FECHA com o backlog total',
   q.composicao.reduce((a, c) => a + c.val, 0) === q.kpis.total,
   JSON.stringify(q.composicao) + ' vs ' + q.kpis.total);
ok('percentuais calculados', q.composicao[0].pct === 100, q.composicao[0].pct);

// Com mais disciplinas que linhas, o excedente vira "OUTRAS" — o painel
// continua curto e ainda assim soma o backlog inteiro.
Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
const areas = ['Elétrica', 'Cobertura', 'Hidrossanitário', 'Piso', 'Civil', 'Outros'];
FAKE = { 'BD-CORRETIVAS': [HDR].concat(areas.map(a => {
  const l = L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck', mesPassado);
  l[7] = a;   // coluna Área
  return l;
})) };
const comp = obterComposicaoBacklogBoletim_(4);
ok('4 linhas + OUTRAS', comp.length === 5 && comp[4].label === 'OUTRAS',
   JSON.stringify(comp.map(c => c.label + '=' + c.val)));
ok('OUTRAS junta as 2 sobrando', comp[4].val === 2, comp[4].val);
ok('e a soma continua sendo o backlog inteiro',
   comp.reduce((a, c) => a + c.val, 0) === 6);

console.log('\n== Zero falso ==');
Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
FAKE = { 'BD-CORRETIVAS': [
  ['Id chamado', 'Centro de Custos', 'Estado'],
  ['1', 'MEGA CURITIBA', 'Aberto']
] };
ok('linhas sem coluna de data → null, não zero', obterCorretivasBoletim_() === null);
ok('e avisa no Logger', logs.some(l => l.indexOf('nenhuma com data legível') >= 0));

console.log('\n' + (falhas ? `✗ ${falhas} de ${testes} falharam` : `✓ ${testes}/${testes} passaram`));
process.exit(falhas ? 1 : 0);
