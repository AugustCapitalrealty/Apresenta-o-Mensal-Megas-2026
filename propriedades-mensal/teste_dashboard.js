/**
 * Teste das contas do DASHBOARD OPERACIONAL (02_Dados.gs).
 *
 * POR QUE ESTE TESTE EXISTE: "% Conclusão histórico" e "Tempo médio de
 * aprovação" são rótulos que admitem mais de uma leitura. Nos Megas os dois
 * são células DIGITADAS na aba DADOS — ninguém os calcula, então não há
 * fórmula de referência para copiar. Aqui eles são CALCULADOS, e a definição
 * escolhida precisa ficar travada: se alguém trocar "acumulado até o mês" por
 * "só o mês", o número muda e o slide continua parecendo certo.
 *
 * Padrão do CLAUDE.md: lê os .gs como texto, dubla SpreadsheetApp/Logger e
 * roda asserções. Não abre planilha nem Slides.
 *
 * Rode com:  node propriedades-mensal/teste_dashboard.js
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
global.SlidesApp = { openById: () => { throw new Error('sem Slides no teste'); } };
global.DriveApp  = { getFileById: () => { throw new Error('sem Drive no teste'); } };

// ── Carrega o código de produção ─────────────────────────────────────────
let fonte = ['00_Helpers.gs', '01_Config.gs', '02_Dados.gs', '05_DadosSlides.gs']
  .map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');
// Gotcha do CLAUDE.md: em eval indireto, `function` vai pro globalThis mas
// `const`/`let` de topo ficam presos no escopo do próprio eval.
fonte = fonte.replace(/^(const|let) /gm, 'var ');
(0, eval)(fonte);

// ── Helpers ─────────────────────────────────────────────────────────────
let falhas = 0, testes = 0;
function ok(desc, cond, extra) {
  testes++;
  if (cond) console.log('  ✓ ' + desc);
  else { falhas++; console.log('  ✗ ' + desc + (extra ? '  → ' + extra : '')); }
}
const iso = d => d.toISOString().slice(0, 19).replace('T', ' ');
const limpar = () => Object.keys(_propBaseCache).forEach(k => delete _propBaseCache[k]);

// Cabeçalho com as MESMAS armadilhas da base real: "Aprovado em" (a data)
// convive com "Tempo para aprovar (segundos)" (o valor) e com "Tempo para
// fechar (segundos)", e a busca por trecho precisa distinguir os três.
const HDR = ['Id chamado', 'Centro de Custos', 'Estado', 'Descrição', 'Prioridade',
             'Responsáveis', 'SLA', 'Data de reporte', 'Aprovado em', 'Fechado em',
             'Tempo para fechar (segundos)', 'Tempo para aprovar (segundos)'];
// Guilherme Heck é FACILITIES no mapa; Ivan Fuscolin Neto é PROPERTY — e o
// dashboard filtra só PROPERTY.
const H = 3600;   // segundos numa hora, para as esperas ficarem legíveis
const C = (est, reporte, aprovado, fechado, tAprovSeg, resp) =>
  ['1', 'MEGA CURITIBA', est, 'x', 'Alta', resp || 'Ivan Fuscolin Neto', '',
   reporte, aprovado || '', fechado || '', '', tAprovSeg == null ? '' : String(tAprovSeg)];

// Mês de referência do teste: junho/2026, já fechado.
const ANO = 2026, MES = 5;                       // 5 = junho
const emJun = d => iso(new Date(Date.UTC(ANO, MES, d, 9, 0, 0)));
const emMai = d => iso(new Date(Date.UTC(ANO, MES - 1, d, 9, 0, 0)));


console.log('\n== Tempo médio de aprovação ==');
// O valor sai da coluna "Tempo para aprovar (segundos)" — a base já calcula
// essa espera. A janela vem de "Aprovado em": o indicador fala do que
// ACONTECEU no mês, igual ao tempo de atendimento, que usa a do fechamento.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Fechado', emJun(1),  emJun(3),  emJun(10), 48 * H),
  C('Aberto',  emJun(5),  emJun(9),  '',        96 * H),
  C('Aberto',  emMai(20), emMai(22), '',        24 * H)   // aprovada em MAIO — fora
] };
const a = obterAprovacaoEConclusao_(ANO, MES);
ok('média só dos aprovados DENTRO do mês: (48+96)/2 = 72h',
   Math.abs(a.tempoAprovacaoH - 72) < 0.01, a.tempoAprovacaoH);
ok('e conta quantos foram', a.aprovadosNoMes === 2, a.aprovadosNoMes);

// A COLUNA MANDA, não a subtração. Aqui as datas dão 48h corridas mas a
// coluna diz 8h — é o caso de horário útil. O slide mostra 8h.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Aberto', emJun(1), emJun(3), '', 8 * H)   // datas dizem 48h, coluna diz 8h
] };
const aCol = obterAprovacaoEConclusao_(ANO, MES);
ok('usa a coluna (8h), não a subtração das datas (48h)',
   Math.abs(aCol.tempoAprovacaoH - 8) < 0.01, aCol.tempoAprovacaoH);
ok('e registra a divergência, em vez de escolher em silêncio',
   aCol.divergentes === 1, aCol.divergentes);

// Sem a coluna preenchida, cai na reserva (Aprovado em − Data de reporte).
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Aberto', emJun(1), emJun(3), '', null)    // 2 dias corridos = 48h
] };
const aSub = obterAprovacaoEConclusao_(ANO, MES);
ok('sem a coluna, calcula por subtração: 48h',
   Math.abs(aSub.tempoAprovacaoH - 48) < 0.01, aSub.tempoAprovacaoH);
ok('e diz quantos vieram da reserva', aSub.porSubtracao === 1, aSub.porSubtracao);

// Espera que atravessa a virada do mês conta inteira, no mês da aprovação.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR, C('Aberto', emMai(30), emJun(2), '', 72 * H)] };
ok('espera que atravessa o mês conta inteira, no mês da aprovação',
   Math.abs(obterAprovacaoEConclusao_(ANO, MES).tempoAprovacaoH - 72) < 0.01);
ok('e não aparece no mês da abertura',
   obterAprovacaoEConclusao_(ANO, MES - 1).tempoAprovacaoH === null);

// Célula vazia não é zero: somar 0 puxaria a média para baixo sem ninguém ver.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Aberto', emJun(1), emJun(2), '', 10 * H),
  C('Aberto', emJun(1), emJun(2), '', null)     // sem coluna → reserva, 24h
] };
const aVazio = obterAprovacaoEConclusao_(ANO, MES);
ok('célula vazia não entra como 0 na média',
   Math.abs(aVazio.tempoAprovacaoH - 17) < 0.01, aVazio.tempoAprovacaoH);

// Sem AG e com data de aprovação anterior ao reporte: fora da conta.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Aberto', emJun(10), emJun(2), '', null),   // invertida, sem coluna
  C('Aberto', emJun(1),  emJun(3), '', 48 * H)
] };
const aInv = obterAprovacaoEConclusao_(ANO, MES);
ok('data invertida e sem a coluna fica FORA da média',
   Math.abs(aInv.tempoAprovacaoH - 48) < 0.01, aInv.tempoAprovacaoH);
ok('e é contada à parte, não sumida', aInv.semDataAprovacao === 1, aInv.semDataAprovacao);

// Sem nenhuma aprovação no mês: null, não 0.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR, C('Aberto', emJun(1), '', '', null)] };
ok('nenhuma aprovação no mês → null, não 0',
   obterAprovacaoEConclusao_(ANO, MES).tempoAprovacaoH === null);

// Colunas de aprovação ausentes: o indicador some, o Logger avisa, e o resto
// do dashboard continua.
limpar();
logs.length = 0;
FAKE = { 'BD-CORRETIVAS': [
  ['Id chamado', 'Centro de Custos', 'Estado', 'Responsáveis', 'Data de reporte', 'Fechado em'],
  ['1', 'MEGA CURITIBA', 'Aberto', 'Ivan Fuscolin Neto', emJun(1), '']
] };
const aSemCol = obterAprovacaoEConclusao_(ANO, MES);
ok('sem coluna de aprovação, o tempo médio é null', aSemCol.tempoAprovacaoH === null);
ok('mas a conclusão histórica continua saindo', aSemCol.conclusaoHistoricoPct !== null);
ok('e o Logger diz que não achou, mostrando o cabeçalho real',
   logs.some(l => /nenhuma coluna de aprovação reconhecida/.test(l) && /Data de reporte/.test(l)),
   logs.join(' | '));

// "Tempo para aprovar" não pode ser confundido com "Tempo para fechar".
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  (() => { const l = C('Fechado', emJun(1), emJun(2), emJun(5), 5 * H);
           l[10] = String(999 * H); return l; })()   // "Tempo para fechar" = 999h
] };
ok('lê "Tempo para aprovar", não "Tempo para fechar"',
   Math.abs(obterAprovacaoEConclusao_(ANO, MES).tempoAprovacaoH - 5) < 0.01,
   obterAprovacaoEConclusao_(ANO, MES).tempoAprovacaoH);


console.log('\n== % Conclusão histórico ==');
// ACUMULADO desde o começo da base até o fim do mês — não é o desempenho do
// mês. É o que "histórico" quer dizer, e é o que faz a série ser comparável:
// um mês com poucos chamados não distorce o número.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Fechado', emMai(2),  '', emMai(5), null),     // aberto e fechado em MAIO
  C('Fechado', emMai(3),  '', emJun(4), null),     // aberto MAIO, fechado JUNHO
  C('Aberto',  emMai(4),  '', '',       null),     // aberto MAIO, ainda aberto
  C('Fechado', emJun(1),  '', emJun(2), null)      // aberto e fechado em JUNHO
] };
const cJun = obterAprovacaoEConclusao_(ANO, MES);
ok('até o fim de JUNHO: 4 abertos, 3 fechados = 75%',
   cJun.criadosAte === 4 && cJun.fechadosAte === 3 &&
   Math.abs(cJun.conclusaoHistoricoPct - 75) < 0.01,
   JSON.stringify(cJun));
const cMai = obterAprovacaoEConclusao_(ANO, MES - 1);
ok('até o fim de MAIO: 3 abertos, 1 fechado = 33,3% (o de junho ainda não existia)',
   cMai.criadosAte === 3 && cMai.fechadosAte === 1 &&
   Math.abs(cMai.conclusaoHistoricoPct - 100 / 3) < 0.01,
   JSON.stringify(cMai));
// O chamado aberto em maio e fechado em junho é o caso que separa as duas
// leituras: no acumulado de maio ele conta como ABERTO, não como fechado.
ok('fechamento posterior NÃO entra no acumulado do mês anterior',
   cMai.fechadosAte === 1);

// "Fechado" sem data de fechamento continua aberto — mesma regra do resto do
// repositório (_bdChamadoFechado_).
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR, C('Fechado', emJun(1), '', '', null)] };
ok('"Fechado" sem data não conta como concluído',
   obterAprovacaoEConclusao_(ANO, MES).conclusaoHistoricoPct === 0);

// Mês anterior ao primeiro chamado: sem denominador → null, não 0%.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR, C('Fechado', emJun(1), '', emJun(2), null)] };
ok('mês sem nenhum chamado aberto até ali → null, não 0%',
   obterAprovacaoEConclusao_(ANO, 0).conclusaoHistoricoPct === null);


console.log('\n== Só a equipe PROPRIEDADES entra ==');
// O deck de Propriedades não mostra Facilities nem Terceiros — se entrassem
// aqui, os números do dashboard não bateriam com os dos outros slides.
limpar();
FAKE = { 'BD-CORRETIVAS': [HDR,
  C('Fechado', emJun(1), emJun(2), emJun(3), 24 * H, 'Ivan Fuscolin Neto'),  // PROPERTY
  C('Fechado', emJun(1), emJun(2), emJun(3), 24 * H, 'Guilherme Heck')       // FACILITIES
] };
const soProp = obterAprovacaoEConclusao_(ANO, MES);
ok('conta só o chamado de Propriedades', soProp.criadosAte === 1, JSON.stringify(soProp));
ok('e a média de aprovação também', soProp.aprovadosNoMes === 1);


console.log('\n== Métricas do Dashboard Operacional (Manutenção + Financeiro) ==');
const dash = obterDashboardPropriedades_(ANO, MES).map;
ok('tem SLA Preventivas', dash.has('SLA Preventivas'));
ok('tem Execução Preventivas', dash.has('Execução Preventivas'));
ok('tem Backlog em aberto', dash.has('Backlog em aberto'));
ok('tem % Conclusão histórico', dash.has('Percentual de conclusão histórico'));
ok('tem Chamados abertos', dash.has('Chamados abertos'));
ok('tem Orçamento 2026 (Total)', dash.has('Orçamento 2026 (Total)'));
ok('orçamento total é R$ 604.543', dash.get('Orçamento 2026 (Total)').atual === 'R$ 604.543', dash.get('Orçamento 2026 (Total)').atual);
ok('tem Ritmo 2025 (Base)', dash.has('Ritmo 2025 (Base)'));
ok('ritmo total é R$ 617.369', dash.get('Ritmo 2025 (Base)').atual === 'R$ 617.369', dash.get('Ritmo 2025 (Base)').atual);
ok('tem Capital Realty (CR) R$ 421.028', dash.get('Orçamento Capital Realty').atual === 'R$ 421.028');
ok('tem Demercado R$ 183.515', dash.get('Orçamento Demercado').atual === 'R$ 183.515');
ok('tem Economia Projetada positiva (+R$ 12.826)', dash.get('Economia Projetada (26/25)').atual.includes('+R$ 12.826'), dash.get('Economia Projetada (26/25)').atual);
ok('tem CAPEX', dash.has('CAPEX'));
ok('tem Contratações conclusão (%)', dash.has('Contratações conclusão (%)'));
ok('tem Contratações prazo médio', dash.has('Contratações prazo médio'));
ok('tem Vistorias - Entrada/saída', dash.has('Vistorias - Entrada/saída'));
ok('tem Vistorias - Recebimento obras', dash.has('Vistorias - Recebimento obras'));
ok('tem Vistorias - Monitoramento', dash.has('Vistorias - Monitoramento'));
ok('tem Vistorias - Documentação', dash.has('Vistorias - Documentação'));
ok('tem Adequações - Quantidade', dash.has('Adequações - Quantidade'));
ok('tem Adequações - Prazo médio', dash.has('Adequações - Prazo médio'));
ok('tem Adequações - Conclusão (%)', dash.has('Adequações - Conclusão (%)'));


console.log(falhas ? `\n✗ ${falhas} de ${testes} FALHARAM\n` : `\n✓ ${testes}/${testes} passaram\n`);
process.exit(falhas ? 1 : 0);
