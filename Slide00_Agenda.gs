/**
 * ARQUIVO: Slide00_Agenda.gs
 * SLIDE — AGENDA
 * Sumário executivo da apresentação: lista numerada das seções em duas
 * colunas, na linguagem do design system. Entra logo após a capa.
 */

function gerarSlideAgenda() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  criarHeaderPadrao(slide, 'AGENDA', getProjetoAtivo().nome + ' — Resultados de ' + ref.curto + ' de ' + ref.ano);

  const secoes = [
    'Destaques do Período',
    'Dashboard Operacional',
    'Manutenção Preventiva',
    'Manutenção Corretiva',
    'Serviços Contratados e Internos',
    'Segurança Patrimonial',
    'Resultado Operacional',
    'Custo do m² e Energia Solar',
    'Documentação Legal',
    'Encerramento'
  ];

  const marginX = 60, topY = 88;
  const colGap  = 40;
  const colW    = (W - 2 * marginX - colGap) / 2;
  const porCol  = Math.ceil(secoes.length / 2);
  const rowH    = (H - topY - 26) / porCol;

  secoes.forEach((titulo, i) => {
    const col = Math.floor(i / porCol);
    const row = i % porCol;
    const x = marginX + col * (colW + colGap);
    const y = topY + row * rowH;

    // Número grande na cor de destaque
    const num = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 4, 44, rowH - 12);
    num.getText().setText(String(i + 1).padStart(2, '0')).getTextStyle()
      .setFontSize(20).setBold(true).setForegroundColor(DS.colors.brandLight).setFontFamily(DS.typography.titles);
    num.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Título da seção
    const tt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 50, y + 4, colW - 50, rowH - 12);
    tt.getText().setText(titulo).getTextStyle()
      .setFontSize(12).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);
    tt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Linha separadora sutil
    if (row < porCol - 1) {
      const ln = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + rowH - 1, colW, 0.75);
      ln.getFill().setSolidFill(DS.colors.lines); ln.getBorder().setTransparent();
    }
  });

  Logger.log('Slide Agenda gerado.');
}
