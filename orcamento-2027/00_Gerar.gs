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

// Só os 6 slides "Projeto Segurança Eletrônica" do Curitiba (da "Cópia de … v5" do gestor, ORC_GESTOR_FONTE), no lugar deles, sem gerar o Mega
// (Guilherme, 23/10/2026). Rodar de novo troca os 6 (não duplica).
function incluirSegurancaEletronica() {
  _orcGestorNaParte_(_orcIdFacilities_(), 'CURITIBA', Date.now(), /^projeto seguranca eletronica/);   // sem acento: casa compara os dois
}

function completarSlidesDoGestor() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'completarSlidesDoGestor')
    .forEach(t => ScriptApp.deleteTrigger(t));
  const parte = PropertiesService.getScriptProperties().getProperty('ORC_FAC_GESTOR_PENDENTE');
  if (!parte) { Logger.log('Nenhum Mega com slides do gestor pendentes.'); return; }
  _orcGestorNaParte_(_orcIdFacilities_(), parte, Date.now());
}

// ==========================================
// CUSTO POR M² MÊS A MÊS COM IPTU E SEGURO — os 3 slides numa apresentação à parte, para colar (13/10/2026)
// ==========================================
// gerarSlidesM2ComIptu() → "M² MÊS A MÊS COM IPTU E SEGURO (para colar)" na pasta do orçamento: um slide por Mega,
// igual ao "Custo por m² mês a mês", com as linhas, a tabela e a média pelo total com IPTU e seguro (o IPTU no mês
// previsto). Rodar de novo refaz a mesma apresentação. Gráfico sem imagem na pasta sai em formas (igual no slide).
const ORC_M2_IPTU = { nome: 'M² MÊS A MÊS COM IPTU E SEGURO (para colar)', prop: 'ORC_M2_IPTU_DECK_ID' };

function gerarSlidesM2ComIptu() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(ORC_M2_IPTU.prop), deck = null;
  if (id) { try { deck = SlidesApp.openById(id); } catch (e) { deck = null; } }
  if (!deck) {
    deck = SlidesApp.create(ORC_M2_IPTU.nome);
    DriveApp.getFileById(deck.getId()).moveTo(DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID));
    props.setProperty(ORC_M2_IPTU.prop, deck.getId());
  }
  _orcTextosReiniciar_();
  _ORC_BLOBS = {};
  _ORC_PASTA_IMG = undefined;
  _ORC_LINKS = { alvos: {}, origens: [] };
  const velhos = deck.getSlides(), W = deck.getPageWidth(), H = deck.getPageHeight();
  const trilha = _ORC_TRILHA;
  ORC_FAC_MEGAS.forEach(k => {
    const cid = ORC_CIDADES[k];
    _orcAplicarMarca_(cid);
    try {
      const v = _orcLerVisaoGeral_(k);
      _ORC_TRILHA = ORC_SECOES.indexOf('Análise de Custos') + 1;
      _orcPasso_(deck, W, H, 'Custo por m² mês a mês com IPTU — ' + cid.nome,
        s => gerarSlideM2Mensal_(s, W, H, cid, v.rel, v.mensal, v.realAnt, true));
    } finally { _ORC_TRILHA = trilha; _orcAplicarMarca_(null); }
  });
  velhos.forEach(s => s.remove());
  _orcLogMolduras_('M² com IPTU');
  _orcSalvarDeck_(deck, 'os slides de m² com IPTU');
  Logger.log('Pronto: 3 slides (Esteio, Itajaí, Curitiba) — ' + deck.getUrl());
}
