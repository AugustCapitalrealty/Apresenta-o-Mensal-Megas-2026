/**
 * ARQUIVO: RegistroDados.gs
 * DESCRIÇÃO: Histórico CONSULTÁVEL dos números de cada geração.
 *
 *   A cada execução (chamado pelo Main após gerar a apresentação),
 *   os principais indicadores são gravados como linhas numa aba
 *   "HISTORICO" — uma por cidade, na respectiva planilha.
 *
 *   Colunas: Timestamp | Categoria | Indicador | Valor | Referência
 *
 *   Isso permite:
 *     ▸ Consultar a evolução de qualquer indicador ao longo do tempo
 *     ▸ Alimentar futuramente os selos de tendência (▲ ▼ —) comparando
 *       a execução atual com a anterior
 *
 *   Não armazena a apresentação em si — apenas os números que a geraram.
 */

const ABA_HISTORICO = 'HISTORICO';
const HISTORICO_CABECALHO = ['Timestamp', 'Categoria', 'Indicador', 'Valor', 'Referência'];


// ==========================================
// REGISTRA OS NÚMEROS DA GERAÇÃO ATUAL
// ==========================================
function registrarHistoricoDados_() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = obterOuCriarAbaHistorico_(ss);
    const ts    = new Date();

    const linhas = [];
    const add = (categoria, indicador, valor, referencia) => {
      if (valor === null || valor === undefined || valor === '' || valor === '-') return;
      linhas.push([ts, categoria, indicador, valor, referencia || '']);
    };

    coletarDashboard_(add);
    coletarPreventivas_(add);
    coletarCorretivas_(add);
    coletarTempo_(add);
    coletarFinanceiro_(add);
    coletarCustoM2_(add);
    coletarDocumentos_(add);

    if (!linhas.length) {
      Logger.log('  ⓘ Histórico de dados: nada para registrar.');
      return;
    }

    sheet.getRange(sheet.getLastRow() + 1, 1, linhas.length, HISTORICO_CABECALHO.length).setValues(linhas);
    Logger.log('  ▤ Histórico de dados: ' + linhas.length + ' indicador(es) registrados.');
  } catch (e) {
    Logger.log('  ⓘ Histórico de dados não registrado: ' + e.message);
  }
}

function obterOuCriarAbaHistorico_(ss) {
  let sheet = ss.getSheetByName(ABA_HISTORICO);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_HISTORICO);
    sheet.getRange(1, 1, 1, HISTORICO_CABECALHO.length).setValues([HISTORICO_CABECALHO]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}


// ==========================================
// COLETORES — extraem indicadores de cada obterDados*()
// ==========================================
function coletarDashboard_(add) {
  const d = obterDadosDashboard();
  if (!d || !d.map) return;
  d.map.forEach((val, chave) => add('Dashboard', chave, val.atual, d.headers[0]));
}

function coletarPreventivas_(add) {
  const d = obterDadosPreventivas();
  if (!d) return;
  add('Preventivas', 'Previstas (mensal)',  d.mensal.previstas,  d.mensal.titulo);
  add('Preventivas', 'Realizadas (mensal)', d.mensal.realizadas, d.mensal.titulo);
  add('Preventivas', 'SLA (mensal)',        d.mensal.sla,        d.mensal.titulo);
  add('Preventivas', 'Previstas (anual)',   d.anual.previstas,   d.anual.titulo);
  add('Preventivas', 'Realizadas (anual)',  d.anual.realizadas,  d.anual.titulo);
  add('Preventivas', 'SLA (anual)',         d.anual.sla,         d.anual.titulo);
}

function coletarCorretivas_(add) {
  const d = obterDadosCorretivasV6();
  if (!d) return;
  d.mensal.kpis.forEach(k => add('Corretivas', k.l + ' (mensal)', k.v, d.mensal.titulo));
  d.anual.kpis.forEach(k  => add('Corretivas', k.l + ' (anual)',  k.v, d.anual.titulo));
}

function coletarTempo_(add) {
  const d = obterDadosTempo();
  if (!d) return;
  d.mensal.kpis.forEach(k => add('Tempo/Segurança', k.l + ' (mensal)', k.v, d.mensal.titulo));
  d.anual.kpis.forEach(k  => add('Tempo/Segurança', k.l + ' (anual)',  k.v, d.anual.titulo));
}

function coletarFinanceiro_(add) {
  const d = obterDadosFinanceiro();
  if (!d) return;
  add('Financeiro', 'Total orçado',    d.totalOrcado,    'Mês atual');
  add('Financeiro', 'Total realizado', d.totalRealizado, 'Mês atual');
}

function coletarCustoM2_(add) {
  const d = obterDadosCustoM2();
  if (!d) return;
  const ref = d.referencia.mesExtenso + ' ' + d.referencia.ano;
  add('Custo M²', 'Custo (R$/m²)', d.kpis.custo, ref);
  add('Custo M²', 'Meta orçada',   d.kpis.meta,  ref);
}


function coletarDocumentos_(add) {
  const d = obterDadosDocumentos();
  if (!d || !d.resumo) return;
  add('Documentos', 'Vencidos',     d.resumo.vencido,  'Mês atual');
  add('Documentos', 'Vence em 60d', d.resumo.critico,  'Mês atual');
  add('Documentos', 'Em dia',       d.resumo.emDia,    'Mês atual');
  add('Documentos', 'Pendentes',    d.resumo.pendente, 'Mês atual');
}


// ==========================================
// CONSULTA — evolução de um indicador ao longo do tempo
// ==========================================
// Uso no editor: Logger.log(JSON.stringify(consultarHistoricoIndicador('SLA (mensal)')));
function consultarHistoricoIndicador(nomeIndicador) {
  const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  const sheet = ss.getSheetByName(ABA_HISTORICO);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const resultado = [];

  for (let i = 1; i < data.length; i++) {
    const [timestamp, categoria, indicador, valor, referencia] = data[i];
    if (String(indicador).trim() === nomeIndicador.trim()) {
      resultado.push({ timestamp, categoria, indicador, valor, referencia });
    }
  }
  return resultado;
}
