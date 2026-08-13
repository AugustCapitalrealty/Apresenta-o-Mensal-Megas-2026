/**
 * ARQUIVO: Slide_Corretivas.gs
 * SLIDE — MANUTENÇÃO CORRETIVA
 *
 * Tabela resumida de corretivas por equipe com SLA (cumpridos vs não cumpridos),
 * split entre Megas e Demais Imóveis.
 */

function gerarSlideCorretivas() {
  const deck = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  // Cabeçalho
  _headerPropriedades_(slide, W, 'MANUTENÇÃO CORRETIVA',
    'SLA de manutenção corretiva por segmento e equipe');

  const marginX = 28, topY = 74;
  const contentW = W - marginX * 2;

  // Dados
  const megas = obterIndicadoresAcumulado_().corretivas;
  const demais = obterIndicadoresAcumulado_().corretvasDemais;

  if (!megas || !demais) {
    Logger.log('✗ Corretivas: sem dados disponíveis');
    return;
  }

  // Tabela de Megas
  let currentY = topY;
  _desenharSecaoCorretivas_(slide, marginX, currentY, contentW, 'MEGAS', megas, DS);

  // Tabela de Demais
  currentY += 160;
  _desenharSecaoCorretivas_(slide, marginX, currentY, contentW, 'DEMAIS IMÓVEIS', demais, DS);

  Logger.log('✓ Corretivas gerado');
}

function _desenharSecaoCorretivas_(slide, x, y, w, titulo, dados, DS) {
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
    { label: 'EQUIPE', width: 0.35 },
    { label: 'CUMPRIDOS', width: 0.2 },
    { label: 'NÃO CUMPRIDOS', width: 0.2 },
    { label: 'SLA', width: 0.25 }
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

  // Linhas de dados
  const linhas = [
    { label: 'Propriedades', cumpridos: dados.properties_cumpridos, nao_cumpridos: dados.properties_nao_cumpridos },
    { label: 'Facilities', cumpridos: dados.facilities_cumpridos, nao_cumpridos: dados.facilities_nao_cumpridos },
    { label: 'Terceiros', cumpridos: dados.terceiros_cumpridos, nao_cumpridos: dados.terceiros_nao_cumpridos }
  ];

  linhas.forEach((linha, idx) => {
    const sla = linha.cumpridos + linha.nao_cumpridos > 0
      ? (linha.cumpridos / (linha.cumpridos + linha.nao_cumpridos) * 100).toFixed(1)
      : '-';

    const corFundo = idx % 2 === 0 ? DS.colors.white : '#F8FAFC';
    const rowBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
    rowBg.getFill().setSolidFill(corFundo);
    rowBg.getBorder().getLineFill().setSolidFill(DS.colors.line);
    rowBg.getBorder().setWeight(0.5);

    colX = x;
    const rowData = [linha.label, linha.cumpridos, linha.nao_cumpridos, sla + '%'];

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
}
