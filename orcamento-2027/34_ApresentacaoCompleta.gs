/**
 * ARQUIVO: 34_ApresentacaoCompleta.gs
 * A APRESENTAÇÃO COMPLETA NUM COMANDO SÓ (13/10/2026 — Guilherme: "uma função que gere cada apresentação completa
 * com as melhorias nos slides do gestor").
 *
 *   ▸ gerarApresentacaoCompleta()     → roda, em sequência: a abertura de Facilities, o Mega Esteio, o Mega Itajaí,
 *                                       o Mega Curitiba (25_Facilities.gs), os slides da Moked (28_Moked.gs) e a
 *                                       versão final (31_VersaoFinal.gs: os slides do gestor da v3, com as revisões de
 *                                       29_GestorRevisado.gs e 33_GestorRedesenho.gs, no lugar em que ele pôs).
 *   ▸ gerarEsteioCompleto()           → só o Mega Esteio: a parte dele no deck de Facilities, os slides da Moked e a
 *                                       versão final do Esteio (gerarVersaoFinalEsteio, 31_VersaoFinal.gs).
 *   ▸ continuarApresentacaoCompleta() → segue do passo em que parou. O gatilho chama sozinho; rode à mão se o gatilho
 *                                       não disparou ou se um passo falhou (o log diz qual) e o problema já foi resolvido.
 *   ▸ pararApresentacaoCompleta()     → para a sequência: apaga o gatilho e o próximo passo não roda.
 *
 * Cada passo é uma execução (o Apps Script para em 6 min) e agenda o seguinte com um gatilho de 1 minuto. O log de
 * cada passo fica em Execuções; o do último traz o link da versão final. Não comece uma sequência com outra "Em
 * execução": as duas mexeriam no mesmo deck.
 */

const ORC_COMPLETA = {
  prop: 'ORC_COMPLETA_PASSO', propSeq: 'ORC_COMPLETA_SEQUENCIA', propParar: 'ORC_COMPLETA_PARAR',
  gatilho: 'continuarApresentacaoCompleta',
  sequencias: {
    TODOS: [['abertura de Facilities', () => gerarFacilitiesAbertura()],
            ['Mega Esteio', () => gerarFacilitiesEsteio()],
            ['Mega Itajaí', () => gerarFacilitiesItajai()],
            ['Mega Curitiba', () => gerarFacilitiesCuritiba()],
            ['slides da Moked', () => gerarSlidesMoked()],
            ['versão final', () => gerarVersaoFinal()]],
    ESTEIO: [['Mega Esteio', () => gerarFacilitiesEsteio()],
             ['slides da Moked', () => gerarSlidesMoked()],
             ['versão final do Mega Esteio', () => gerarVersaoFinalEsteio()]]
  }
};

function gerarApresentacaoCompleta() { _orcIniciarSequencia_('TODOS'); }
function gerarEsteioCompleto()       { _orcIniciarSequencia_('ESTEIO'); }

function _orcIniciarSequencia_(seq) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(ORC_COMPLETA.propSeq, seq);
  props.setProperty(ORC_COMPLETA.prop, '0');
  props.deleteProperty(ORC_COMPLETA.propParar);
  continuarApresentacaoCompleta();
}

function pararApresentacaoCompleta() {
  _orcApagarGatilhosCompleta_();
  // Um passo que ainda esteja rodando agenda o próximo ao terminar: o aviso faz esse próximo não rodar.
  PropertiesService.getScriptProperties().setProperty(ORC_COMPLETA.propParar, '1');
  Logger.log('Sequência parada: o próximo passo não roda. Para recomeçar, gerarApresentacaoCompleta() ou gerarEsteioCompleto().');
}

function _orcApagarGatilhosCompleta_() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === ORC_COMPLETA.gatilho)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

function continuarApresentacaoCompleta() {
  _orcApagarGatilhosCompleta_();   // o gatilho que chamou este passo (se foi um) não serve mais
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(ORC_COMPLETA.propParar)) { Logger.log('Sequência parada (pararApresentacaoCompleta): nada a fazer.'); return; }
  const seq = props.getProperty(ORC_COMPLETA.propSeq) || 'TODOS';
  const passos = ORC_COMPLETA.sequencias[seq] || ORC_COMPLETA.sequencias.TODOS;
  const i = Number(props.getProperty(ORC_COMPLETA.prop) || 0);
  if (i >= passos.length) {
    Logger.log('Sequência ' + seq + ': nenhum passo pendente — rode gerarApresentacaoCompleta() ou gerarEsteioCompleto() para começar de novo.');
    return;
  }
  Logger.log('Sequência ' + seq + ' · passo ' + (i + 1) + ' de ' + passos.length + ': ' + passos[i][0]);
  // Se o passo falhar, a execução para aqui com o erro: o passo fica guardado e continuarApresentacaoCompleta()
  // tenta de novo a partir dele.
  passos[i][1]();
  props.setProperty(ORC_COMPLETA.prop, String(i + 1));
  if (i + 1 < passos.length) {
    ScriptApp.newTrigger(ORC_COMPLETA.gatilho).timeBased().after(60 * 1000).create();
    Logger.log('Próximo passo (' + passos[i + 1][0] + ') em cerca de 1 minuto, sozinho — acompanhe em Execuções. Se não ' +
               'começar em 5 minutos, rode continuarApresentacaoCompleta().');
  } else {
    Logger.log('Sequência ' + seq + ': pronta — o link está na linha "Pronto: versão final…" acima.');
  }
}
