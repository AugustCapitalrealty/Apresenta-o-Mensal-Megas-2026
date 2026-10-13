/**
 * ARQUIVO: 00_Gerar.gs — O QUE RODAR PARA A APRESENTAÇÃO DE FACILITIES (13/10/2026)
 *
 * Uma função por parte, cada uma numa execução, nesta ordem (Guilherme, 13/10/2026: "uma função para cada um —
 * começo, Esteio, Itajaí, Curitiba; os slides da Moked e os outros já têm que estar dentro"):
 *
 *   ▸ gerarComeco()       → capa de Facilities, sumário e os Megas lado a lado
 *   ▸ gerarMegaEsteio()   → o Mega Esteio completo: os slides gerados na ordem do gestor (ORC_SECOES), sumário e
 *                           sub capas, e os slides do gestor copiados da v3 — Moked, substituição da segurança, obras
 *                           com foto e valor — cada um logo depois do slide em que ele pôs, revisados como em
 *                           29_GestorRevisado.gs (português, subtítulo, Mega, trilha, tabelas de 33_GestorRedesenho.gs)
 *   ▸ gerarMegaItajai()   → idem, Mega Itajaí
 *   ▸ gerarMegaCuritiba() → idem, Mega Curitiba
 *
 * Tudo no deck "FACILITIES - APRESENTAÇÃO ORÇAMENTO 2027" (25_Facilities.gs). Cada parte pode ser gerada de novo
 * sozinha: troca só os slides dela, inclusive os do gestor (copiados de novo da v3). Sem o slide interno "Revisar
 * antes da versão final" e sem os moldes de fotos vazios. A v3 do gestor só é lida.
 *
 *   ▸ completarSlidesDoGestor() → só se o log de um Mega pedir: o tempo acabou antes de todos os slides do gestor
 *                                 entrarem; segue de onde parou (também roda sozinho por gatilho em 1 minuto).
 */

function gerarComeco()       { _orcGerarFacilities_('ABERTURA'); }
function gerarMegaEsteio()   { _orcGerarFacilities_('ESTEIO', true); }
function gerarMegaItajai()   { _orcGerarFacilities_('ITAJAI', true); }
function gerarMegaCuritiba() { _orcGerarFacilities_('CURITIBA', true); }

function completarSlidesDoGestor() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'completarSlidesDoGestor')
    .forEach(t => ScriptApp.deleteTrigger(t));
  const parte = PropertiesService.getScriptProperties().getProperty('ORC_FAC_GESTOR_PENDENTE');
  if (!parte) { Logger.log('Nenhum Mega com slides do gestor pendentes.'); return; }
  _orcGestorNaParte_(_orcIdFacilities_(), parte, Date.now());
}
