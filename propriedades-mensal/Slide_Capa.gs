/**
 * ARQUIVO: Slide_Capa.gs
 * SLIDE 00 — CAPA DA APRESENTAÇÃO MENSAL DE PROPRIEDADES
 *
 * Mesmo tom institucional das capas dos Megas (Slide00_Capa.gs): fundo
 * escuro brandDark, espinha lateral em brandLight, wordmark, overline
 * espaçado, barra de destaque, título grande e pill de período. Sem a foto
 * full-bleed das capas dos Megas — mais elaborada do que este deck precisa,
 * já que aqui não há uma foto por empreendimento (é um deck só do
 * portfólio inteiro, não um deck por Mega).
 *
 * "Propriedades", não "Portfólio": o título e o overline evitam a palavra
 * de propósito — pedido do usuário, ela não deve aparecer em nenhum texto
 * visível da apresentação (nomes internos de função, como
 * indicadoresPortfolio_ em 02_Dados.gs, não contam — não aparecem na tela).
 */

function gerarSlideCapa() {
  const deck  = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  // Fundo sólido institucional
  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Espinha lateral (assinatura visual)
  const espinha = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, 6, H);
  espinha.getFill().setSolidFill(DS.colors.brandLight);
  espinha.getBorder().setTransparent();

  // Wordmark Capital Realty (topo esquerdo)
  const wordmark = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 44, 30, 300, 32);
  wordmark.getText().setText('CAPITAL REALTY').getTextStyle()
    .setFontSize(13).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  wordmark.getText().getParagraphStyle().setLineSpacing(100);

  // Overline espaçado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 44, H * 0.30, W - 200, 20);
  over.getText().setText('APRESENTAÇÃO MENSAL').getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Barra de destaque acima do título
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 46, H * 0.30 + 26, 66, 4);
  barra.getFill().setSolidFill(DS.colors.brandLight);
  barra.getBorder().setTransparent();

  // Título principal — "Propriedades" é o herói, sem "Portfólio".
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.30 + 36, W - 120, 130);
  titulo.getText().setText('GESTÃO DE\nPROPRIEDADES').getTextStyle()
    .setFontSize(44).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  // O Slides não aceita lineSpacing abaixo de 100 ("espaçamento simples" é o
  // mínimo da própria interface) — <100 lança "Invalid argument: spacing".
  titulo.getText().getParagraphStyle().setLineSpacing(100);

  // Subtítulo
  const subtitulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H * 0.30 + 158, W - 120, 40);
  subtitulo.getText().setText('Gestão de Facilities e Projetos').getTextStyle()
    .setFontSize(24).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Período (pill)
  const pillY = H * 0.30 + 202, pillW = 250, pillH = 30;
  const pillBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 42, pillY, pillW, pillH);
  pillBg.getFill().setSolidFill(DS.colors.brandLight);
  pillBg.getBorder().setTransparent();

  const pillT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, pillY, pillW, pillH);
  pillT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  pillT.getText().setText(ref.nome + ' ' + ref.ano).getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  pillT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  Logger.log('✓ Capa gerada → ' + ref.label);
}
