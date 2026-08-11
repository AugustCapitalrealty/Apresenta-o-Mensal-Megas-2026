/**
 * Main.gs — Relatório Mensal de Controle de Acesso (Megas Capital Realty)
 *
 * Como usar todo mês:
 *   1. Na planilha: atualize a aba Config (mesAno) e adicione 3 linhas na aba Dados.
 *   2. Aqui no Apps Script: selecione gerarApresentacao() e clique ▶ Executar.
 */

var PRESENTATION_ID = '1fV8V6iRLIrIrvsbdlO8saY83wvz0jIx9QxJOCEtyuFE';
var SPREADSHEET_ID  = '1tl-7wR_vpIbybUh5Jvit0vO52Qg6ocoPv-K-pY_KI50';

// Arquivo de Slides SEPARADO (proporção retrato 4:5) usado só para o banner do
// e-mail. O layout se adapta ao tamanho real da página, então basta manter este
// arquivo na proporção desejada (ex: 1200x1500 px). Para trocar, ajuste em
// Arquivo → Configuração da página.
var BANNER_PRESENTATION_ID = '1a7KFVQuSS8AJjSFOovoFoYKaYeiMaLdMx457ZO_Uz5Y';

function gerarApresentacao() {
  MESES_LABEL = null; // será preenchido por lerPlanilha()
  var d = lerPlanilha();
  return _buildPresentation(d);
}

/** Gera a apresentação com dados mockados — use para demonstrar ao gestor. */
function gerarApresentacaoDemo() {
  MESES_LABEL = _MESES_DEMO;
  return _buildPresentation(MOCK);
}

/**
 * Gera o banner de chamada do e-mail (retrato 4:5) no arquivo
 * BANNER_PRESENTATION_ID. O banner se adapta ao tamanho da página desse arquivo.
 * Depois é só abrir, fazer o download como PNG (Arquivo → Fazer download →
 * Imagem PNG) e usar no corpo do e-mail.
 */
function gerarBannerEmail() {
  MESES_LABEL = null;
  var d = lerPlanilha();
  TERMOS_BOLD = [];
  if (!BANNER_PRESENTATION_ID) {
    throw new Error('Defina BANNER_PRESENTATION_ID no Main.gs com o ID de um ' +
      'Google Slides em proporção retrato 4:5 (Configuração da página → 1200x1500 px).');
  }
  var pres = SlidesApp.openById(BANNER_PRESENTATION_ID);
  var slides = pres.getSlides();
  for (var i = slides.length - 1; i >= 0; i--) slides[i].remove();
  buildEmailBanner(pres, d);
  Logger.log('Banner gerado. Abra o arquivo e exporte como PNG: ' + pres.getUrl());
  return pres.getUrl();
}

function _buildPresentation(d) {
  TERMOS_BOLD = construirTermosBold(d);   // nomes a destacar em negrito nos textos
  var pres   = SlidesApp.openById(PRESENTATION_ID);
  var slides = pres.getSlides();
  for (var i = slides.length - 1; i >= 0; i--) slides[i].remove();
  var placeholder = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  var pgCenario    = 4;
  var slidesCenario = 11;
  var slidesPorMega = 5;
  var pgMegas = d.empreendimentos.map(function(_, i) {
    return pgCenario + slidesCenario + i * slidesPorMega;
  });

  var page = 3;

  buildCapa(pres, d);
  buildIndice(pres, d, { cenario: pgCenario, megas: pgMegas });
  buildResumo(pres, d);

  buildDivisor(pres, 'Cenário geral', [
    '2025x2026', 'Fluxo de pessoas', 'Tempo médio',
    'Uso de celular', 'Tipo de acesso', 'Perfil de visitantes',
  ], ++page, '02');
  buildComparativo2025x2026(pres, d, ++page);
  buildFluxo(pres, d, ++page);
  buildColaboradores(pres, d, ++page);
  buildTempoMedio(pres, d, ++page);
  buildUsoCelular(pres, d, ++page);
  buildHorarioPico(pres, d, ++page);
  buildTipoAcesso(pres, d, ++page);
  buildPerfil(pres, d, ++page);
  buildRankingAcessos(pres, d, 'mes',   ++page);
  buildRankingAcessos(pres, d, 'anual', ++page);

  d.empreendimentos.forEach(function(e, idx) {
    buildDivisor(pres, e.nome, ['Destaques do mês', 'Clientes'], ++page, '0' + (idx + 3), e);
    buildDestaques(pres, d, e, ++page);
    buildParticipacao(pres, d, e, ++page);
    buildAgendamento(pres, d, e, ++page);
    // Paginação automática: 6 clientes por slide
    var totalCards = (e.cardsClientes || []).length;
    var totalPag   = Math.ceil(totalCards / 6) || 1;
    for (var p = 0; p < totalPag; p++) {
      buildCardsClientes(pres, d, e, ++page, p * 6);
    }
  });

  buildEncerramento(pres, d, ++page);

  placeholder.remove();
  Logger.log('Apresentação atualizada: ' + pres.getUrl());
  return pres.getUrl();
}
