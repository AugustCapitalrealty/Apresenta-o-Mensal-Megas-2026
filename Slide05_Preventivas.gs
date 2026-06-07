// ==========================================
// SLIDE 5: PREVENTIVAS (PADRONIZADO)
// ==========================================

function gerarSlidePreventivas() {
  const dados = obterDadosPreventivas();
  
  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const PageWidth = deck.getPageWidth(), PageHeight = deck.getPageHeight();

  criarHeaderPadrao(slide, 'MANUTENÇÃO PREVENTIVA', 'Aderência ao Cronograma e Desvios - 2025');

  const marginX = 50;
  // AJUSTE: Alterado para 80px (antes era 90) para alinhar com os outros slides
  const topY = 80; 
  const gap = 30; 
  const cardH = 140; 
  const cardW = (PageWidth - (2 * marginX) - gap) / 2;

  _desenharCardMetrica(slide, marginX, topY, cardW, cardH, dados.mensal, CORES.cardBlue);
  _desenharCardMetrica(slide, marginX + cardW + gap, topY, cardW, cardH, dados.anual, CORES.cardGreen);

  const slaY = topY + cardH + 25, slaH = PageHeight - slaY - 20, slaW = PageWidth - (2 * marginX);
  _desenharListaServicos(slide, marginX, slaY, slaW, slaH, dados);
  
  Logger.log("Slide 5 (Preventivas) gerado com sucesso.");
}

function _desenharCardMetrica(slide, x, y, w, h, dados, corTema) {
  const cSh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x+3, y+3, w, h); cSh.getFill().setSolidFill(CORES.shadow); cSh.getBorder().setTransparent(); cSh.sendToBack();
  const cBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h); cBg.getFill().setSolidFill(CORES.white); cBg.getBorder().setTransparent();
  const sideStrip = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 6, h); sideStrip.getFill().setSolidFill(corTema); sideStrip.getBorder().setTransparent();
  
  const titleTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 5, w - 20, 25);
  titleTxt.getText().setText(dados.titulo).getTextStyle().setFontSize(11).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
  
  const divLine = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, y + 30, w - 30, 1); divLine.getFill().setSolidFill('#E2E8F0'); divLine.getBorder().setTransparent();
  
  const contentY = y + 40, colW = (w - 20) / 3; 
  _itemSimples(slide, x + 10, contentY, colW, 'PREVISTAS', dados.previstas, CORES.textGray, CORES.textDark);
  _itemSimples(slide, x + 10 + colW, contentY, colW, 'REALIZADAS', dados.realizadas, CORES.textGray, CORES.textDark);
  _itemSimples(slide, x + 10 + (colW*2), contentY, colW, 'SLA', dados.sla, CORES.textGray, corTema);
}

function _itemSimples(slide, x, y, w, label, valor, colorLabel, colorVal) {
  const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 20);
  lbl.getText().setText(label).getTextStyle().setFontSize(8).setBold(true).setForegroundColor(colorLabel).setFontFamily('Montserrat');
  lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 20, w, 40);
  val.getText().setText(valor).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(colorVal).setFontFamily('Montserrat');
  val.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

function _desenharListaServicos(slide, x, y, w, h, dadosGerais) {
  const counts = dadosGerais.counts;
  const cSh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x+3, y+3, w, h); cSh.getFill().setSolidFill(CORES.shadow); cSh.getBorder().setTransparent(); cSh.sendToBack();
  const cBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h); cBg.getFill().setSolidFill(CORES.white); cBg.getBorder().setTransparent();
  
  const headerH = 30;
  const headerBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, headerH + 10); headerBg.getFill().setSolidFill('#FEF2F2'); headerBg.getBorder().setTransparent();
  
  // AJUSTE: Máscara melhorada (altura 25, recuo -2) para remover linha indesejada
  const mask = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + headerH - 2, w, 25); mask.getFill().setSolidFill(CORES.white); mask.getBorder().setTransparent();

  const titleTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 5, w - 30, 25);
  const titleString = '⚠️ RELAÇÃO DE SERVIÇOS QUE NÃO CUMPRIRAM O SLA';
  const facString = `   Facilities: ${counts.facilities}`;
  const tercString = `   |   Terceiros: ${counts.terceiros}`;
  
  const textRange = titleTxt.getText();
  textRange.setText(titleString + facString + tercString);
  textRange.getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.cardRed).setFontFamily('Montserrat');
  textRange.getRange(titleString.length, titleString.length + facString.length).getTextStyle().setForegroundColor(CORES.textPurple);
  textRange.getRange(titleString.length + facString.length, titleString.length + facString.length + tercString.length).getTextStyle().setForegroundColor(CORES.textOrange);

  const listY = y + headerH + 15, listH = h - headerH - 25;
  const servicos = dadosGerais.servicosForaSla;

  if (servicos.length > 0) {
    if (servicos.length > 4) {
      const splitIndex = Math.ceil(servicos.length / 2);
      _colunaTexto(slide, x + 20, listY, (w/2) - 30, listH, servicos.slice(0, splitIndex));
      _colunaTexto(slide, x + (w/2) + 10, listY, (w/2) - 30, listH, servicos.slice(splitIndex));
      const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + (w/2), listY, 1, listH - 20); div.getFill().setSolidFill('#F1F5F9'); div.getBorder().setTransparent();
    } else {
      _colunaTexto(slide, x + 20, listY, w - 40, listH, servicos);
    }
  } else {
    const okBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, listY + 20, w, 30);
    okBox.getText().setText("Nenhum desvio registrado.").getTextStyle().setFontSize(11).setItalic(true).setBold(true).setForegroundColor(CORES.cardGreen).setFontFamily('Montserrat');
    okBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }
}

function _colunaTexto(slide, x, y, w, h, items) {
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  const textRange = box.getText(); textRange.setText('');
  items.forEach(item => {
    const bullet = textRange.appendText('• ');
    bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(9).setBold(true);
    const textPart = textRange.appendText(item.text + '\n');
    const style = textPart.getTextStyle();
    style.setFontSize(9).setFontFamily('Montserrat').setBold(true); 
    if (item.type === 'FACILITIES') style.setForegroundColor(CORES.textPurple);
    else style.setForegroundColor(CORES.textOrange);
  });
  box.getText().getParagraphStyle().setLineSpacing(130);
  box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
}
