/**
 * ARQUIVO: Slide00_Destaques.gs
 * SLIDE — DESTAQUES DO PERÍODO
 * Replica o slide manual "Destaques do Período" no novo design system:
 * 4 painéis (Positivo / Negativo / Atenção / Próximos passos) com texto
 * placeholder para o apresentador editar direto no Slides.
 */

function gerarSlideDestaques() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, 'DESTAQUES DO PERÍODO', 'Resumo executivo do mês — texto editável pelo apresentador');

  const categorias = [
    { titulo: 'POSITIVO',        cor: DS.colors.accentGreen, marca: '✓' },
    { titulo: 'NEGATIVO',        cor: DS.colors.accentRed,   marca: '✗' },
    { titulo: 'ATENÇÃO',         cor: '#F59E0B',             marca: '!' },
    { titulo: 'PRÓXIMOS PASSOS', cor: DS.colors.brandLight,  marca: '→' }
  ];

  const marginX = 30, topY = 76, gap = 14;
  const cardW = (W - 2 * marginX - gap) / 2;
  const cardH = (H - topY - 14 - gap) / 2;

  categorias.forEach((cat, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = marginX + col * (cardW + gap);
    const y = topY + row * (cardH + gap);

    const contentY = criarCardPainel(slide, x, y, cardW, cardH, cat.titulo, cat.cor);

    // Bullets placeholder — o apresentador substitui pelo conteúdo do mês
    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14, contentY, cardW - 26, y + cardH - contentY - 8);
    const t = box.getText();
    t.setText(
      cat.marca + '  Escreva aqui o primeiro destaque do mês\n' +
      cat.marca + '  Escreva aqui o segundo destaque\n' +
      cat.marca + '  (Adicione ou remova linhas conforme necessário)'
    );
    t.getTextStyle().setFontSize(9).setItalic(true)
      .setForegroundColor(CORES.textGray).setFontFamily(DS.typography.body);
    t.getParagraphStyle().setLineSpacing(140);

    // Marcas coloridas no início de cada linha
    const texto = t.asString();
    let pos = 0;
    texto.split('\n').forEach(linha => {
      if (linha.length) {
        t.getRange(pos, pos + 1).getTextStyle().setBold(true).setItalic(false).setForegroundColor(cat.cor);
      }
      pos += linha.length + 1;
    });
    box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  });

  Logger.log('Slide Destaques do Período gerado (texto editável).');
}
