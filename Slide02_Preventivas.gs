// ==========================================
// ARQUIVO: Slide02_Preventivas.gs
// SLIDE 02 — PREVENTIVAS (PADRONIZADO)
// Dados: obterDadosPreventivas() em 02_Dados.gs
// ==========================================

function gerarSlidePreventivas() {
  const dados = obterDadosPreventivas();
  
  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const PageWidth = deck.getPageWidth(), PageHeight = deck.getPageHeight();

  criarHeaderPadrao(slide, 'MANUTENÇÃO PREVENTIVA', 'Aderência ao Cronograma e Desvios — ' + obterMesReferencia_().ano);

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
  
  Logger.log("Slide 02 (Preventivas) gerado com sucesso.");
}

function _desenharCardMetrica(slide, x, y, w, h, dados, corTema) {
  // Painel padrão do design system (01_Config.gs)
  const contentY = criarCardPainel(slide, x, y, w, h, dados.titulo, corTema) + 6;
  const colW = (w - 20) / 3;
  _itemSimples(slide, x + 10, contentY, colW, 'PREVISTAS', dados.previstas, CORES.textGray, CORES.textDark);
  _itemSimples(slide, x + 10 + colW, contentY, colW, 'REALIZADAS', dados.realizadas, CORES.textGray, CORES.textDark);
  // SLA maior = melhor → tendência vs mês anterior (histórico validado)
  const slaTrend = tendenciaTexto_(dados.slaDelta, false);
  _itemSimples(slide, x + 10 + (colW*2), contentY, colW, 'SLA', dados.sla, CORES.textGray, corPorSLA(dados.sla, corTema), slaTrend);

  // Barra de progresso Realizadas/Previstas (preenche o espaço inferior do card)
  const prev = parseInt(String(dados.previstas).replace(/\D/g, ''), 10);
  const real = parseInt(String(dados.realizadas).replace(/\D/g, ''), 10);
  if (prev > 0 && !isNaN(real)) {
    const pct = Math.max(0, Math.min(1, real / prev));
    const bx = x + 15, bw = w - 105, by = y + h - 24, bh = 8;

    const trilho = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, bx, by, bw, bh);
    trilho.getFill().setSolidFill('#EEF2F7'); trilho.getBorder().setTransparent();

    if (pct > 0.02) {
      const fill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, bx, by, Math.max(bw * pct, 10), bh);
      fill.getFill().setSolidFill(corTema); fill.getBorder().setTransparent();
    }

    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx + bw + 6, by - 4, 80, 16);
    lbl.getText().setText(Math.round(pct * 100) + '% realizado').getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
  }
}

function _itemSimples(slide, x, y, w, label, valor, colorLabel, colorVal, trend) {
  const DS = CR_DESIGN_SYSTEM;
  const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 20);
  lbl.getText().setText(label).getTextStyle().setFontSize(7.5).setBold(true).setForegroundColor(colorLabel).setFontFamily(DS.typography.body);
  lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 20, w, 40);
  val.getText().setText(valor).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(colorVal).setFontFamily(DS.typography.titles);
  val.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Tendência vs mês anterior (opcional), logo abaixo do valor
  if (trend && trend.txt) {
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 58, w, 14);
    t.getText().setText(trend.txt + ' vs mês ant.').getTextStyle()
      .setFontSize(7).setBold(true).setForegroundColor(trend.cor).setFontFamily(DS.typography.titles);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }
}

function _desenharListaServicos(slide, x, y, w, h, dadosGerais) {
  const counts = dadosGerais.counts;
  // Painel padrão do design system (01_Config.gs) — tema vermelho (desvios de SLA)
  criarCardPainel(slide, x, y, w, h, null, CORES.cardRed);

  const headerH = 30;
  const titleTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 5, w - 250, 25);
  titleTxt.getText().setText('RELAÇÃO DE SERVIÇOS QUE NÃO CUMPRIRAM O SLA').getTextStyle()
    .setFontSize(10).setBold(true).setForegroundColor(CORES.cardRed).setFontFamily('Montserrat');

  // Chips de legenda com bolinha colorida (Facilities / Terceiros)
  const chips = [
    { txt: 'Facilities: ' + counts.facilities, cor: CORES.lightBlue },
    { txt: 'Terceiros: ' + counts.terceiros,   cor: CORES.textOrange }
  ];
  let chipX = x + w - 220;
  chips.forEach(c => {
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, chipX, y + 11, 8, 8);
    dot.getFill().setSolidFill(c.cor); dot.getBorder().setTransparent();
    const ct = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, chipX + 12, y + 5, 90, 20);
    ct.getText().setText(c.txt).getTextStyle()
      .setFontSize(8.5).setBold(true).setForegroundColor(c.cor).setFontFamily('Montserrat');
    ct.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    chipX += 108;
  });

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
    if (item.type === 'FACILITIES') style.setForegroundColor(CORES.lightBlue);
    else style.setForegroundColor(CORES.textOrange);
  });
  box.getText().getParagraphStyle().setLineSpacing(130);
  box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
}
