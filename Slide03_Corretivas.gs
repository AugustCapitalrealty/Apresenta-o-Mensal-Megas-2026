// ==========================================
// ARQUIVO: Slide03_Corretivas.gs
// SLIDE 03 — INDICADORES DE CORRETIVAS
// Dados: obterDadosCorretivasV6() em 02_Dados.gs
// ==========================================

function gerarSlideCorretivas() {
  const dados = obterDadosCorretivasV6();
  
  if (!dados) {
    Logger.log("Sem dados para o Slide 03 (Corretivas).");
    return;
  }

  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const PageWidth = deck.getPageWidth();
  const PageHeight = deck.getPageHeight();

  // Usa o cabeçalho padrão do 01_Config.gs
  criarHeaderPadrao(slide, 'INDICADORES DE CORRETIVAS', 'Backlog e Performance');

  const marginX = 40;
  // AJUSTE PADRONIZAÇÃO: Alterado de 90 para 80 (Alinhado com Slides 3 e 4)
  const topY = 80;
  const gap = 30;

  const cardW = (PageWidth - (2 * marginX) - gap) / 2;
  // Mantivemos a altura aumentada
  const cardH = 145;

  desenharCardListaKPIs(slide, marginX, topY, cardW, cardH, CORES, dados.mensal, CORES.lightBlue);
  desenharCardListaKPIs(slide, marginX + cardW + gap, topY, cardW, cardH, CORES, dados.anual, CORES.cardGreen);

  // Espaço para Gráfico
  const chartY = topY + cardH + 20;
  const chartW = PageWidth - (2 * marginX);
  const footerH = PageHeight - chartY - 20;

  const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, chartY, chartW, footerH);
  ph.getFill().setSolidFill(CORES.white);
  ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill('#CBD5E1');

  const chartTitle = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 15, chartY + 10, chartW - 30, 25);
  chartTitle.getText().setText("BACKLOG DE CHAMADOS EMERGÊNCIAS")
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.lightBlue).setFontFamily('Montserrat');

  const phTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, chartY + (footerH/2), chartW, 30);
  phTxt.getText().setText("[ ESPAÇO RESERVADO PARA COLAR O GRÁFICO ]")
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor('#CBD5E1').setFontFamily('Montserrat');
  phTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  
  Logger.log("Slide 03 (Corretivas) gerado com sucesso.");
}

// Função Auxiliar Local
function desenharCardListaKPIs(slide, x, y, w, h, CORES, dados, corTema) {
  const cSh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x+2, y+2, w, h);
  cSh.getFill().setSolidFill(CORES.shadow); cSh.getBorder().setTransparent(); cSh.sendToBack();

  const cBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  cBg.getFill().setSolidFill(CORES.white); cBg.getBorder().setTransparent();

  const headerH = 35;
  const headerRound = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, headerH + 10);
  headerRound.getFill().setSolidFill(corTema); headerRound.getBorder().setTransparent();

  // AJUSTE: Aumentei a altura para 25 e subi o ponto de início (-2) para "puxar o branco para baixo" visualmente
  const mask = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + headerH - 2, w, 25);
  mask.getFill().setSolidFill(CORES.white); mask.getBorder().setTransparent();

  const titleTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 2, w - 30, headerH);
  titleTxt.getText().setText(dados.titulo)
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
  titleTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  const startContentY = y + headerH + 5;
  const usableH = h - headerH - 15;
  const rowH = usableH / 4;

  dados.kpis.forEach((kpi, i) => {
    const ry = startContentY + (i * rowH);

    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, ry, w * 0.75, rowH);
    lblBox.getText().setText(kpi.l)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w * 0.75, ry, w * 0.20, rowH);
    valBox.getText().setText(String(kpi.v))
      .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    valBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });
}
