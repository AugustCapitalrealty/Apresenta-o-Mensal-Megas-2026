/**
 * ARQUIVO: capas_secao.gs
 * Cria os slides de capa para cada seção da apresentação.
 * Estilo: Fundo claro com destaque colorido (design system)
 */

// =========================================================
// CAPA — MANUTENÇÕES
// =========================================================
function gerarCapaManutencoes() {
  _desenharCapaSecao(
    'MANUTENÇÕES',
    'Gestão de Ativos • Corretivas & Preventivas',
    CR_DESIGN_SYSTEM.colors.brandDark,
    CR_DESIGN_SYSTEM.colors.brandLight
  );
  Logger.log("✅ Capa Manutenções concluída!");
}

// =========================================================
// CAPA — CONTROLE DE ACESSO
// =========================================================
function gerarCapaControleAcesso() {
  _desenharCapaSecao(
    'CONTROLE DE ACESSO',
    'Segurança Patrimonial • KPIs & Evolução Semanal',
    CR_DESIGN_SYSTEM.colors.brandMed,
    CR_DESIGN_SYSTEM.colors.brandLight
  );
  Logger.log("✅ Capa Controle de Acesso concluída!");
}

// =========================================================
// CAPA — SUSTENTABILIDADE
// =========================================================
function gerarCapaSustentabilidade() {
  _desenharCapaSecao(
    'SUSTENTABILIDADE',
    'Gestão Sustentável • Energia Solar Mega Curitiba',
    CR_DESIGN_SYSTEM.colors.accentGreen,
    CR_DESIGN_SYSTEM.colors.brandLight
  );
  Logger.log("✅ Capa Sustentabilidade concluída!");
}

// =========================================================
// FUNÇÃO AUXILIAR — Desenha uma capa de seção
// =========================================================
function _desenharCapaSecao(titulo, subtitulo, accentColor, ellipseColor) {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // Fundo claro
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  // Grafismos de fundo
  const e1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -150, -150, 500, 500);
  e1.getFill().setSolidFill(ellipseColor, 0.05);
  e1.getBorder().setTransparent();

  const e2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 300, pageHeight - 250, 600, 600);
  e2.getFill().setSolidFill(accentColor, 0.04);
  e2.getBorder().setTransparent();

  // Barra lateral colorida grossa
  const barW = 8;
  const barH = 120;
  const barX = CR_DESIGN_SYSTEM.layout.marginX;
  const barY = (pageHeight / 2) - (barH / 2);
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, barY, barW, barH);
  bar.getFill().setSolidFill(accentColor);
  bar.getBorder().setTransparent();

  // Linha horizontal decorativa
  const lineY = (pageHeight / 2) + 35;
  const line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    barX + barW + 15, lineY,
    barX + barW + 15 + 80, lineY);
  line.getLineFill().setSolidFill(accentColor);
  line.setWeight(3);

  // Título principal
  const titleX = barX + barW + 15;
  const titleY = (pageHeight / 2) - 70;
  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, titleX, titleY, pageWidth - titleX - 100, 80);
  titleBox.getText().setText(titulo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(42).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);

  // Subtítulo
  const subBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, titleX, lineY + 12, pageWidth - titleX - 100, 35);
  subBox.getText().setText(subtitulo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(16)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // Logo
  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    const marginX = CR_DESIGN_SYSTEM.layout.marginX;
    const marginY = CR_DESIGN_SYSTEM.layout.marginY;
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  // Rodapé
  const footerY = pageHeight - 25;
  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
}