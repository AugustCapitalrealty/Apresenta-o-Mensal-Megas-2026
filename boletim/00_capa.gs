/**
 * ARQUIVO: 00_capa.gs
 * Cria o slide de capa (Slide 01).
 */
function gerarSlide01_Capa(titulo = 'Boletim\nPropriedades & Facilities', subtitulo = 'Expansão & Eficiência Capital Realty', tema = 'capital') {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();
  const isMega   = (tema === 'mega');
  const isHangar = (tema === 'hangar');

  // Fundo
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  // Grafismos
  const ellipse1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -200, -200, 600, 600);
  ellipse1.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.05);
  ellipse1.getBorder().setTransparent();

  const ellipse2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 300, pageHeight - 250, 700, 700);
  ellipse2.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandMed, 0.04);
  ellipse2.getBorder().setTransparent();

  // Elemento de marca MEGA — faixa inclinada laranja (brandbook: 60°/75°)
  if (isMega) {
    const band = slide.insertShape(SlidesApp.ShapeType.PARALLELOGRAM,
      -40, pageHeight / 2 - 150, 240, 70);
    band.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.accentOrange);
    band.getBorder().setTransparent();
  }

  // Elemento de marca HANGAR VIP — círculo amarelo (referência ao ícone circular da marca)
  if (isHangar) {
    const bigCircle = slide.insertShape(SlidesApp.ShapeType.ELLIPSE,
      -120, pageHeight / 2 - 180, 320, 320);
    bigCircle.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.accentOrange, 0.15);
    bigCircle.getBorder().setTransparent();
    const accentCircle = slide.insertShape(SlidesApp.ShapeType.ELLIPSE,
      -60, pageHeight / 2 - 30, 80, 80);
    accentCircle.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.accentOrange);
    accentCircle.getBorder().setTransparent();
  }

  // Logotipo
  const logoWidth = CR_DESIGN_SYSTEM.assets.logoW;
  const logoHeight = CR_DESIGN_SYSTEM.assets.logoH;
  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob,
      pageWidth - CR_DESIGN_SYSTEM.layout.marginX - logoWidth,
      CR_DESIGN_SYSTEM.layout.marginY,
      logoWidth, logoHeight);
  } catch(e) {
    Logger.log("Aviso (Capa): Logo não carregado. Erro: " + e.message);
  }

  // Título principal — destaque máximo
  const titleBoxY = pageHeight / 2 - 120;
  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
    CR_DESIGN_SYSTEM.layout.marginX, titleBoxY,
    pageWidth - (CR_DESIGN_SYSTEM.layout.marginX * 2), 200);
  titleBox.getText().setText(titulo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(48)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark).setBold(true);

  // Linha decorativa
  const lineY = titleBoxY + 210;
  const line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    CR_DESIGN_SYSTEM.layout.marginX, lineY,
    CR_DESIGN_SYSTEM.layout.marginX + 120, lineY);
  const lineColor = (isMega || isHangar) ? CR_DESIGN_SYSTEM.colors.accentOrange : CR_DESIGN_SYSTEM.colors.accentGreen;
  line.getLineFill().setSolidFill(lineColor);
  line.setWeight(4);

  // Subtítulo — Expansão & Eficiência (secundário)
  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
    CR_DESIGN_SYSTEM.layout.marginX, lineY + 16,
    pageWidth - (CR_DESIGN_SYSTEM.layout.marginX * 2), 32);
  subtitleBox.getText().setText(subtitulo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(20)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed).setBold(false);

  // Data / período — detector de semana (QUADRO COMPARATIVO, linha 33, regra -1 dia)
  let textoData = 'Semana ' + getISOWeek(new Date()); // fallback: semana ISO de hoje
  try {
    const ssCapa    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheetCapa = ssCapa.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
    if (sheetCapa) {
      const lastColCapa = sheetCapa.getLastColumn();
      const rowSemana   = sheetCapa.getRange(33, 1, 1, lastColCapa).getValues()[0];
      let dataSemanaRef = null;
      for (let i = rowSemana.length - 1; i >= 0; i--) {
        const raw = rowSemana[i];
        if (raw === "" || raw === null) continue;
        const d = (raw instanceof Date) ? new Date(raw.getTime()) : new Date(raw.toString());
        if (!isNaN(d.getTime())) { d.setDate(d.getDate() - 1); dataSemanaRef = d; break; }
      }
      const semInfo = getSemanaBoletim(dataSemanaRef);
      if (semInfo) {
        textoData = 'Semana ' + semInfo.numero + ' • ' + semInfo.intervalo + ' de ' + semInfo.fim.getFullYear();
      }
    }
  } catch(e) {
    Logger.log("Aviso (Capa): não foi possível detectar a semana. " + e.message);
  }

  const dateBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
    CR_DESIGN_SYSTEM.layout.marginX, lineY + 52,
    pageWidth - (CR_DESIGN_SYSTEM.layout.marginX * 2), 28);
  dateBox.getText().setText(textoData).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(16)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  Logger.log("✅ Slide 01 (Capa) concluído!");
}