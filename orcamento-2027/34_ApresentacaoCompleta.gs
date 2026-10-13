/**
 * ARQUIVO: 34_ApresentacaoCompleta.gs
 * A APRESENTAÇÃO COMPLETA NUM COMANDO SÓ (13/10/2026 — Guilherme: "uma função que gere cada apresentação completa
 * com as melhorias nos slides do gestor").
 *
 *   ▸ gerarApresentacaoCompleta()     → roda, em sequência: a abertura de Facilities, o Mega Esteio, o Mega Itajaí,
 *                                       o Mega Curitiba (25_Facilities.gs), os slides da Moked (28_Moked.gs) e a
 *                                       versão final (31_VersaoFinal.gs: os slides do gestor da v3, com as revisões de
 *                                       29_GestorRevisado.gs e 33_GestorRedesenho.gs, no lugar em que ele pôs).
 *   ▸ continuarApresentacaoCompleta() → segue do passo em que parou. O gatilho chama sozinho; rode à mão só se um
 *                                       passo falhou (o log diz qual) e o problema já foi resolvido.
 *
 * Cada passo é uma execução (o Apps Script para em 6 min) e agenda o seguinte com um gatilho de 1 minuto. O log de
 * cada passo fica em Execuções; o do último traz o link da versão final.
 */

const ORC_COMPLETA = {
  prop: 'ORC_COMPLETA_PASSO',
  gatilho: 'continuarApresentacaoCompleta',
  passos: [['abertura de Facilities', () => gerarFacilitiesAbertura()],
           ['Mega Esteio', () => gerarFacilitiesEsteio()],
           ['Mega Itajaí', () => gerarFacilitiesItajai()],
           ['Mega Curitiba', () => gerarFacilitiesCuritiba()],
           ['slides da Moked', () => gerarSlidesMoked()],
           ['versão final', () => gerarVersaoFinal()]]
};

function gerarApresentacaoCompleta() {
  PropertiesService.getScriptProperties().setProperty(ORC_COMPLETA.prop, '0');
  continuarApresentacaoCompleta();
}

function continuarApresentacaoCompleta() {
  // O gatilho que chamou este passo (se foi um) não serve mais.
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === ORC_COMPLETA.gatilho)
    .forEach(t => ScriptApp.deleteTrigger(t));
  const props = PropertiesService.getScriptProperties();
  const passos = ORC_COMPLETA.passos, i = Number(props.getProperty(ORC_COMPLETA.prop) || 0);
  if (i >= passos.length) {
    Logger.log('Apresentação completa: nenhum passo pendente — rode gerarApresentacaoCompleta() para começar de novo.');
    return;
  }
  Logger.log('Apresentação completa · passo ' + (i + 1) + ' de ' + passos.length + ': ' + passos[i][0]);
  // Se o passo falhar, a execução para aqui com o erro: o passo fica guardado e continuarApresentacaoCompleta()
  // tenta de novo a partir dele.
  passos[i][1]();
  props.setProperty(ORC_COMPLETA.prop, String(i + 1));
  if (i + 1 < passos.length) {
    ScriptApp.newTrigger(ORC_COMPLETA.gatilho).timeBased().after(60 * 1000).create();
    Logger.log('Próximo passo (' + passos[i + 1][0] + ') em cerca de 1 minuto, sozinho — acompanhe em Execuções.');
  } else {
    Logger.log('Apresentação completa: pronta — o link está na linha "Pronto: versão final…" acima.');
  }
}
