/**
 * ARQUIVO: Slide_IndicadoresGerais.gs
 * SLIDE — INDICADORES GERAIS DO PORTFÓLIO
 *
 * Cards de KPI mostrando os indicadores principais (SLA, Execução, etc.)
 * com o split "Megas" vs "Demais Imóveis".
 */

function gerarSlideIndicadoresGerais() {
  const deck = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  // Cabeçalho
  _headerPropriedades_(slide, 'INDICADORES GERAIS DO PORTFÓLIO',
    'Performance de SLA, execução e backlog por segmento');

  // Dados gerais
  const dados = obterIndicadoresPortfolio_();
  if (!dados) {
    Logger.log('✗ Indicadores Gerais: sem dados disponíveis');
    return;
  }

  const marginX = 28, topY = 74, cardH = 100, cardGap = 16;
  const contentW = W - marginX * 2;

  // Linha 1: SLA Recebimento e SLA Preventivas
  let row1Y = topY;
  _cardIndicador_(slide, marginX, row1Y, (contentW - cardGap) / 2, cardH,
    'SLA RECEBIMENTO DE OBRAS', dados.slaRecebimento, 'R$ ' + dados.valorRecebimento, DS.colors.accentGreen);
  _cardIndicador_(slide, marginX + (contentW + cardGap) / 2, row1Y, (contentW - cardGap) / 2, cardH,
    'SLA PREVENTIVAS', dados.slaPreventivas, dados.previntivasRealizado + '/' + dados.previntivasTotal, DS.colors.brandLight);

  // Linha 2: Execução Corretivas e Backlog
  let row2Y = row1Y + cardH + cardGap;
  _cardIndicador_(slide, marginX, row2Y, (contentW - cardGap) / 2, cardH,
    'EXECUÇÃO CORRETIVAS', dados.execucaoCorretivas, dados.corretvasRealizado + '/' + dados.corretvasTotal, DS.colors.accentOrange);
  _cardIndicador_(slide, marginX + (contentW + cardGap) / 2, row2Y, (contentW - cardGap) / 2, cardH,
    'BACKLOG ABERTO', dados.backlogTotal, '+' + dados.backlogMesAnterior + ' vs mês anterior', DS.colors.accentRed);

  Logger.log('✓ Indicadores Gerais gerado');
}

function _cardIndicador_(slide, x, y, w, h, titulo, valor, subtitulo, corAccento) {
  const DS = CR_DESIGN_SYSTEM;
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.line);
  bg.getBorder().setWeight(1);

  // Barra de cor no topo
  const topBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, 4);
  topBar.getFill().setSolidFill(corAccento);
  topBar.getBorder().setTransparent();

  // Título
  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 10, w - 24, 20);
  titleBox.getText().setText(titulo).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);

  // Valor principal
  const valueBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 32, w - 24, 30);
  valueBox.getText().setText(typeof valor === 'number' && valor < 200 ? valor.toFixed(1) + '%' : valor.toString()).getTextStyle()
    .setFontSize(28).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  // Subtítulo
  const subBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 64, w - 24, 20);
  subBox.getText().setText(subtitulo).getTextStyle()
    .setFontSize(8).setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
}

function _headerPropriedades_(slide, titulo, subtitulo) {
  const DS = CR_DESIGN_SYSTEM;
  const W = slide.getParentPresentation().getPageWidth();

  // Linha de separação
  const line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 50, W, 1);
  line.getFill().setSolidFill(DS.colors.line);
  line.getBorder().setTransparent();

  // Título da seção
  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 28, 16, W - 56, 24);
  titleBox.getText().setText(titulo).getTextStyle()
    .setFontSize(18).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  // Subtítulo
  const subBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 28, 42, W - 56, 16);
  subBox.getText().setText(subtitulo).getTextStyle()
    .setFontSize(10).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
}
