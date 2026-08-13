/**
 * ARQUIVO: Slide_IndicadoresGerais.gs
 * SLIDE — INDICADORES GERAIS
 *
 * Cards de KPI mostrando os indicadores principais (SLA, Execução, Backlog)
 * do mês de referência. Cabeçalho e cards são os componentes REAIS dos
 * Megas (criarHeaderPadrao / criarCardKPI, copiados para 01_Config.gs) — não
 * mais um header/card inventados para este deck.
 */

function gerarSlideIndicadoresGerais() {
  const deck = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'INDICADORES GERAIS',
    'Performance de SLA, execução e backlog · Megas x Demais Imóveis');

  const dados = obterIndicadoresPortfolio_();
  if (!dados) {
    Logger.log('✗ Indicadores Gerais: sem dados disponíveis');
    return;
  }

  // Uma linha de 4 cards — mesma geometria da linha de KPI de Backlog
  // Facilities dos Megas (_backlogCardsKPI_ em Slide_BacklogFacilities.gs):
  // marginX 28, topY 74, cardH 72, gap 8.
  const marginX = 28, topY = 74, cardH = 72, gap = 8;
  const cardW = (W - marginX * 2 - gap * 3) / 4;

  const cards = [
    { label: 'SLA RECEBIMENTO DE OBRAS', valor: dados.slaRecebimento.toFixed(1) + '%',
      nota: 'R$ ' + dados.valorRecebimento, cor: DS.colors.accentGreen },
    { label: 'SLA PREVENTIVAS', valor: dados.slaPreventivas.toFixed(1) + '%',
      nota: dados.previntivasRealizado + '/' + dados.previntivasTotal + ' realizadas', cor: DS.colors.brandLight },
    { label: 'EXECUÇÃO CORRETIVAS', valor: dados.execucaoCorretivas.toFixed(1) + '%',
      nota: dados.corretvasRealizado + '/' + dados.corretvasTotal + ' realizadas', cor: DS.colors.accentOrange },
    { label: 'BACKLOG ABERTO', valor: String(dados.backlogTotal),
      sub: '+' + dados.backlogMesAnterior, corSub: DS.colors.accentRed, nota: 'vs mês anterior', cor: DS.colors.accentRed }
  ];

  cards.forEach((c, i) => {
    const x = marginX + i * (cardW + gap);
    criarCardKPI(slide, x, topY, cardW, cardH, c);
  });

  Logger.log('✓ Indicadores Gerais gerado');
}
