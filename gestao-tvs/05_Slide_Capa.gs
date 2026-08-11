/**
 * ARQUIVO: 05_Slide_Capa.gs
 * DESCRIÇÃO: Slide de Abertura da TV (Light Mode Corporativo).
 */

function gerarSlideCapa(slide, dataGlobal, unit) {
  const ds = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(ds.colors.bgSlide);

  const circle1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 400, -200, 600, 600);
  circle1.getFill().setSolidFill('#F1F5F9');
  circle1.getBorder().setTransparent();

  const circle2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -150, 200, 400, 400);
  circle2.getFill().setSolidFill('#F1F5F9');
  circle2.getBorder().setTransparent();

  try {
    const unitBlob = DriveApp.getFileById(unit.unitLogoId).getBlob();
    insertLogoProportional(slide, unitBlob, 200, 100, 150, 60);
  } catch(e) {}

  try {
    const brandBlob = DriveApp.getFileById(unit.brandLogoId).getBlob();
    insertLogoProportional(slide, brandBlob, 370, 100, 150, 60);
  } catch(e) {}

  const txtTit = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 60, 190, 600, 60);
  txtTit.getText().setText(unit.name)
    .getTextStyle().setFontSize(36).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  txtTit.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const txtSub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 60, 240, 600, 30);
  // 🟢 CORRIGIDO: Facility para Facilities
  txtSub.getText().setText("Gestão de Facilities e Property • Corretivas e Preventivas")
    .getTextStyle().setFontSize(14).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody).setBold(true);
  txtSub.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const statusBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 260, 300, 200, 30);
  statusBg.getFill().setSolidFill(ds.colors.cardBg);
  statusBg.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);

  const txtData = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 260, 300, 200, 30);
  txtData.getText().setText(`🟢 Sincronizado: ${dataGlobal}`)
    .getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  txtData.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}
