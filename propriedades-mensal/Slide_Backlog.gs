/**
 * ARQUIVO: Slide_Backlog.gs
 * SLIDE — BACKLOG (Demandas em Aberto)
 *
 * Resumo do backlog (chamados em aberto) por Centro de Custos,
 * com o split Megas vs Demais Imóveis.
 */

function gerarSlideBacklog() {
  const deck = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  // Cabeçalho
  _headerPropriedades_(slide, 'BACKLOG — DEMANDAS EM ABERTO',
    'Chamados aguardando atendimento, agrupados por Centro de Custos');

  const marginX = 28, topY = 74;
  const contentW = W - marginX * 2;

  // Dados
  const backlog = obterBacklogPorCC_();

  if (!backlog || backlog.length === 0) {
    Logger.log('✗ Backlog: sem dados disponíveis');
    return;
  }

  // Separar Megas de Demais
  const megas = backlog.filter(b => _propEhMega_(b.cc));
  const demais = backlog.filter(b => !_propEhMega_(b.cc));

  // Tabela de Megas
  let currentY = topY;
  _desenharTabelaBacklog_(slide, marginX, currentY, contentW, 'MEGAS', megas, DS);

  // Tabela de Demais
  currentY += 160;
  _desenharTabelaBacklog_(slide, marginX, currentY, contentW, 'DEMAIS IMÓVEIS', demais, DS);

  Logger.log('✓ Backlog gerado');
}

function _desenharTabelaBacklog_(slide, x, y, w, titulo, dados, DS) {
  const h = 30, gap = 2;

  // Título da seção
  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 20);
  titleBox.getText().setText(titulo).getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor(DS.colors.brandDark).setFontFamily(DS.typography.titles);

  y += 24;

  // Cabeçalho da tabela
  const headBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  headBg.getFill().setSolidFill(DS.colors.brandDark);
  headBg.getBorder().setTransparent();

  const cols = [
    { label: 'CENTRO DE CUSTOS', width: 0.6 },
    { label: 'EM ABERTO', width: 0.4 }
  ];

  let colX = x;
  cols.forEach(col => {
    const colW = w * col.width;
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, y + 8, colW, h - 16);
    txt.getText().setText(col.label).getTextStyle()
      .setFontSize(8).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.body);
    colX += colW;
  });

  y += h + gap;

  // Limitar a 4 linhas por seção (Megas tem 3 cidades, demais pode ter mais)
  const linhasExibir = dados.slice(0, 4);

  linhasExibir.forEach((linha, idx) => {
    const corFundo = idx % 2 === 0 ? DS.colors.white : '#F8FAFC';
    const rowBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
    rowBg.getFill().setSolidFill(corFundo);
    rowBg.getBorder().getLineFill().setSolidFill(DS.colors.line);
    rowBg.getBorder().setWeight(0.5);

    colX = x;
    const rowData = [linha.cc, linha.total];

    rowData.forEach((valor, colIdx) => {
      const colW = w * cols[colIdx].width;
      const cellTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX + 8, y + 8, colW - 16, h - 16);
      const align = colIdx === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER;
      cellTxt.getText().setText(valor.toString()).getTextStyle()
        .setFontSize(9).setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
      cellTxt.getText().getParagraphStyle().setParagraphAlignment(align);
      colX += colW;
    });

    y += h + gap;
  });

  // Se houver mais linhas que espaço, mostrar "..." no rodapé
  if (dados.length > linhasExibir.length) {
    const moreBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y, w - 24, 16);
    moreBox.getText().setText('+ ' + (dados.length - linhasExibir.length) + ' outro(s)').getTextStyle()
      .setFontSize(8).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
  }
}
