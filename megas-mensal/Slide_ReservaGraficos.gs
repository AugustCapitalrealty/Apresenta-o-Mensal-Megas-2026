/**
 * ARQUIVO: Slide_ReservaGraficos.gs
 * COMPONENTE — SLIDE COM ESPAÇO(S) RESERVADO(S) PARA GRÁFICO
 * Gera um slide com uma ou mais áreas tracejadas para o apresentador colar
 * gráficos que hoje são atualizados na mão (ex.: Chamados por Prioridade,
 * Backlog Facilities). No futuro, esses espaços viram gráficos automáticos —
 * é só trocar a chamada por um desenharGraficoHistorico(...).
 *
 *   gerarSlideReservaGraficos('CHAMADOS POR PRIORIDADE', 'Abertos x Fechados',
 *     [{ titulo: 'ABERTOS' }, { titulo: 'FECHADOS' }]);
 *
 * areas: 1 → uma área grande; 2 → lado a lado; 3–4 → grade 2×2.
 */
function gerarSlideReservaGraficos(titulo, subtitulo, areas) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();

  criarHeaderPadrao(slide, titulo, subtitulo);

  areas = (areas && areas.length) ? areas : [{ titulo: '' }];
  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;

  let cols, linhas;
  if (areas.length === 1)      { cols = 1; linhas = 1; }
  else if (areas.length === 2) { cols = 2; linhas = 1; }
  else                          { cols = 2; linhas = Math.ceil(areas.length / 2); }

  const cellW = (W - 2 * marginX - gap * (cols - 1)) / cols;
  const cellH = (areaBottom - topY - gap * (linhas - 1)) / linhas;

  areas.forEach((a, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = marginX + col * (cellW + gap);
    const y = topY + row * (cellH + gap);
    _desenharAreaReservada(slide, x, y, cellW, cellH, a.titulo);
  });

  Logger.log('Slide reserva de gráficos gerado: ' + titulo + ' (' + areas.length + ' área[s]).');
}

// Uma área tracejada com título opcional e a marca de "espaço reservado".
function _desenharAreaReservada(slide, x, y, w, h, titulo) {
  const DS = CR_DESIGN_SYSTEM;

  const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  box.getFill().setSolidFill(DS.colors.cardBg);
  box.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1)
    .getLineFill().setSolidFill('#CBD5E1');

  if (titulo) {
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 10, w - 30, 20);
    t.getText().setText(titulo).getTextStyle()
      .setFontSize(10).setBold(true).setForegroundColor(DS.colors.brandLight).setFontFamily(DS.typography.titles);
  }

  const ph = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2 - 8, w, 20);
  ph.getText().setText('[ ESPAÇO RESERVADO PARA COLAR O GRÁFICO ]').getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
  ph.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}
