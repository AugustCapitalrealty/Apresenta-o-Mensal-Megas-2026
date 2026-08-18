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
// Config.gs traz intervaloSemanaISO, que Dados.gs usa para a janela semanal.
let fonte = ['Config.gs', 'Dados.gs']
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
// "Tipo" (índice 3) é a coluna que separa Melhoria de Projeto — a mesma que as
// fórmulas da planilha leem como $C:$C. "Tipo de reporte" (índice 9) é outra
// coisa (OPERATOR/CONTACT) e não serve; ter as duas aqui é o que garante que a
// leitura não confunda uma com a outra.
const HDR = ['Id chamado', 'Centro de Custos', 'Estado', 'Tipo', 'Prioridade',
             'Responsáveis', 'SLA', 'Área', 'Equipamentos', 'Tipo de reporte',
             'Tempo para fechar (segundos)', 'Data de reporte', 'Fechado em'];
const L = (cc, est, resp, rep, fec, tipo) =>
  ['1', cc, est, tipo || 'Corretiva - Elétrica', 'Alta', resp, '', 'Elétrica', '',
   'OPERATOR', '', rep, fec || ''];

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
console.log('\n== Recorte por escopo (Centro de Custos) ==');
// É o que permite Facilities e Hangar saírem da MESMA base do completo —
// equivale ao CONT.SES(...;$AY:$AY;<empreendimento>;...) das fórmulas.
ok('sem filtro, tudo entra', _bolNoEscopo_('MEGA CURITIBA', null) === true);
ok('casa por trecho: "MEGA ITAJAÍ - GALPÃO 2" entra no filtro "MEGA ITAJAI"',
   _bolNoEscopo_('MEGA ITAJAÍ - GALPÃO 2', ['MEGA ITAJAI']) === true);
ok('acento e caixa não separam', _bolNoEscopo_('mega esteio', ['MEGA ESTEIO']) === true);
ok('e o que não é do escopo fica de fora',
   _bolNoEscopo_('POSTO CURITIBA', ['MEGA CURITIBA', 'MEGA ITAJAI']) === false);

Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
FAKE = { 'BD-CORRETIVAS': [HDR,
  L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck',     mesPassado),
  L('MEGA ITAJAÍ',   'Aberto', 'Ivan Fuscolin Neto', mesPassado),
  L('HANGAR VIP',    'Aberto', 'Gerente Hangar',     mesPassado),
  L('HANGAR VIP',    'Aberto', 'Guilherme Heck',     mesPassado)
] };
const qTudo = obterQuadroCorretivasBoletim_(4, null);
const qMega = obterQuadroCorretivasBoletim_(4, ['MEGA CURITIBA', 'MEGA ITAJAI', 'MEGA ESTEIO']);
const qHang = obterQuadroCorretivasBoletim_(4, ['HANGAR VIP']);
ok('sem filtro conta os 4', qTudo.kpis.total === 4, qTudo.kpis.total);
ok('filtro dos Megas conta 2', qMega.kpis.total === 2, qMega.kpis.total);
ok('filtro do Hangar conta 2', qHang.kpis.total === 2, qHang.kpis.total);
ok('e os dois recortes somam o total', qMega.kpis.total + qHang.kpis.total === qTudo.kpis.total);
ok('a composição também é recortada',
   qHang.composicao.reduce((a, c) => a + c.val, 0) === 2,
   JSON.stringify(qHang.composicao));
ok('o log diz quantos entraram no escopo',
   logs.some(l => /escopo \[HANGAR VIP\] = 2 de 4/.test(l)), logs.slice(-6).join(' | '));

// Ponto anterior POR EQUIPE: é o que deixa a seta de cada cartão sair da
// mesma contagem que o número do cartão.
ok('devolve o ponto anterior por equipe, não só o total',
   qTudo.anterior && typeof qTudo.anterior.facilities === 'number',
   JSON.stringify(qTudo.anterior));
ok('e o anterior bate com o penúltimo ponto do histórico',
   qTudo.anterior.total === qTudo.historico[qTudo.historico.length - 2].total);

// Filtro que não casa quase nunca é backlog zerado — é nome escrito diferente.
Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
logs.length = 0;
const qNada = obterQuadroCorretivasBoletim_(4, ['MEGA CANOAS']);
ok('escopo sem nenhum chamado devolve null, não um slide de zeros', qNada === null);
ok('e o log mostra os Centros de Custo que existem de verdade',
   logs.some(l => /nenhum chamado em \[MEGA CANOAS\]/.test(l) && /HANGAR VIP/.test(l)),
   logs.join(' | '));

console.log('\n== Composição por TIPO (painel do slide 05) ==');
// A regra é a das fórmulas da planilha: "*Melhoria*" e "*Consulta*" na coluna
// Tipo, Locatário pela coluna Responsáveis, o resto é corretiva.
const rot = l => q.composicao.filter(c => c.label === l)[0];
ok('vem junto no quadro, na ordem do painel',
   q.composicao.map(c => c.label).join(',') === 'CORRETIVAS,MELHORIAS,PROJETOS,LOCATÁRIOS',
   JSON.stringify(q.composicao.map(c => c.label)));
ok('CORRETIVAS = 4 (o que não é melhoria, projeto nem locatário)', rot('CORRETIVAS').val === 4,
   JSON.stringify(q.composicao));
ok('LOCATÁRIOS = 1, o mesmo do cartão de KPI',
   rot('LOCATÁRIOS').val === q.kpis.locatarios);
// É a razão de calcular em vez de ler célula: as quatro contagens da planilha
// eram independentes e não fechavam — 348+83+2+46 = 479 sob um backlog de 525.
ok('AS QUATRO FATIAS SOMAM O BACKLOG (fecha por construção)',
   q.composicao.reduce((a, c) => a + c.val, 0) === q.kpis.total,
   JSON.stringify(q.composicao) + ' vs ' + q.kpis.total);
ok('percentuais calculados', rot('CORRETIVAS').pct === 80, rot('CORRETIVAS').pct);

// --- As palavras que classificam ---
Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
FAKE = { 'BD-CORRETIVAS': [HDR,
  L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck', mesPassado, '', 'Melhoria - Elétrica'),
  L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck', mesPassado, '', 'MELHORIAS DIVERSAS'),
  L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck', mesPassado, '', 'Consulta técnica'),
  L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck', mesPassado, '', 'Corretiva - Hidráulica'),
  // Tipo VAZIO de verdade: L() usa o padrão quando recebe '', então a célula
  // precisa ser zerada na mão. É o caso que vira Corretiva por omissão.
  (r => { r[3] = ''; return r; })(L('MEGA CURITIBA', 'Aberto', 'Guilherme Heck', mesPassado)),
  L('POSTO CURITIBA', 'Aberto', 'Responsabilidade Locatario', mesPassado, '', 'Melhoria - Piso')
] };
const ct = obterComposicaoTipoBoletim_();
const rt = l => ct.filter(c => c.label === l)[0];
ok('"Melhoria" e "MELHORIAS" caem os dois em MELHORIAS (sem caixa, sem acento)',
   rt('MELHORIAS').val === 2, JSON.stringify(ct));
ok('"Consulta" vira PROJETOS — é o que a fórmula da planilha faz',
   rt('PROJETOS').val === 1);
ok('tipo vazio conta como CORRETIVA, e avisa no Logger',
   rt('CORRETIVAS').val === 2 &&
   logs.some(l => /1 chamado\(s\) em aberto sem tipo de servi/.test(l)),
   JSON.stringify(ct));
// A ordem é uma decisão: locatário PREVALECE sobre melhoria, para o 46 do
// cartão e o 46 do painel serem o mesmo número.
ok('locatário prevalece sobre melhoria', rt('LOCATÁRIOS').val === 1);
ok('e o Logger registra que houve sobreposição',
   logs.some(l => /1 chamado\(s\) são Melhoria\/Projeto E de responsabilidade/.test(l)),
   logs.slice(-4).join(' | '));
ok('continua fechando com o backlog', ct.reduce((a, c) => a + c.val, 0) === 6);

console.log('\n== Coluna de tipo: nem por cabeçalho, nem por posição ==');
// Sem cabeçalho reconhecível E sem "Melhoria"/"Consulta" na coluna C, a
// reserva por posição NÃO pode chutar: chutar faria o painel mostrar 100%
// Corretivas sem erro nenhum.
Object.keys(_bolBaseCache).forEach(k => delete _bolBaseCache[k]);
FAKE = { 'BD-CORRETIVAS': [
  ['Id', 'Centro de Custos', 'Estado', 'Prioridade', 'Responsáveis', 'Data de reporte'],
  ['1', 'MEGA CURITIBA', 'Aberto', 'Alta', 'Guilherme Heck', mesPassado]
] };
const semCol = obterComposicaoTipoBoletim_();
ok('devolve vazio para o slide cair nas células digitadas', semCol.length === 0,
   JSON.stringify(semCol));
ok('e diz por quê no Logger',
   logs.some(l => /nenhuma coluna de tipo de servi/.test(l)), logs.slice(-3).join(' | '));

console.log('\n== Composição por disciplina (diagnóstico) ==');
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
