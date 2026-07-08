/**
 * ARQUIVO: Slide_RegistroFotos.gs
 * COMPONENTE — REGISTRO FOTOGRÁFICO E DESCRIÇÃO DO SERVIÇO
 * Replica os slides manuais de Serviços Contratados / Internos / Segurança:
 * painel com 3 espaços tracejados para fotos e painel de descrição editável.
 * O apresentador cola as fotos e escreve o texto direto no Slides.
 * Para mais serviços, basta duplicar o slide gerado (Ctrl+D no Slides).
 */

function gerarSlideRegistroFotos(secao) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, secao, 'Registro fotográfico e descrição do serviço');

  const marginX = 30, topY = 76;

  // ── Painel FOTOS DO SERVIÇO ────────────────────────────────────────────
  const fotosH = 195;
  const contentY = criarCardPainel(slide, marginX, topY, W - 2 * marginX, fotosH, 'FOTOS DO SERVIÇO', DS.colors.brandLight);

  const innerX = marginX + 14, innerW = W - 2 * marginX - 28;
  const gap = 12;
  const fotoW = (innerW - 2 * gap) / 3;
  const fotoH = topY + fotosH - contentY - 10;

  for (let i = 0; i < 3; i++) {
    const fx = innerX + i * (fotoW + gap);
    const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, fx, contentY, fotoW, fotoH);
    ph.getFill().setSolidFill(CORES.bgSlide);
    ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1)
      .getLineFill().setSolidFill('#CBD5E1');

    const phTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx, contentY, fotoW, fotoH);
    phTxt.getText().setText('[ FOTO ' + (i + 1) + ' ]').getTextStyle()
      .setFontSize(9).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
    phTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    phTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  }

  // ── Painel DESCRIÇÃO ───────────────────────────────────────────────────
  const descY = topY + fotosH + 12;
  const descH = H - descY - 14;
  const descContentY = criarCardPainel(slide, marginX, descY, W - 2 * marginX, descH, 'DESCRIÇÃO', DS.colors.brandMed);

  const descBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, innerX, descContentY, innerW, descY + descH - descContentY - 10);
  descBox.getFill().setSolidFill(CORES.bgSlide);
  descBox.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1)
    .getLineFill().setSolidFill('#CBD5E1');

  const descTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, innerX, descContentY, innerW, descY + descH - descContentY - 10);
  descTxt.getText().setText('[ Descreva aqui o serviço realizado — texto editável ]').getTextStyle()
    .setFontSize(10).setBold(true).setItalic(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
  descTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  descTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  Logger.log('Slide Registro Fotográfico gerado: ' + secao);
}
