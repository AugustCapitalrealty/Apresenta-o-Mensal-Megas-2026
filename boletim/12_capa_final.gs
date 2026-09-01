/**
 * ARQUIVO: 12_capa_final.gs
 * Cria o slide final — mesmo tom visual da apresentação.
 */
function gerarCapaFinal() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // Fundo consistente com o restante da apresentação
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  // Grafismos decorativos — mesma linguagem da capa de abertura
  const e1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -220, -220, 600, 600);
  e1.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.06);
  e1.getBorder().setTransparent();

  const e2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 350, pageHeight - 280, 600, 600);
  e2.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandMed, 0.05);
  e2.getBorder().setTransparent();

  const e3 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth / 2 - 180, pageHeight / 2 - 180, 360, 360);
  e3.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.03);
  e3.getBorder().setTransparent();

  // Barra lateral esquerda — igual aos slides internos
  const sideBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, 6, pageHeight);
  sideBar.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
  sideBar.getBorder().setTransparent();

  // Logo centralizado
  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    const logoW = CR_DESIGN_SYSTEM.assets.logoW * 1.25;
    const logoH = CR_DESIGN_SYSTEM.assets.logoH * 1.25;
    slide.insertImage(logoBlob, (pageWidth - logoW) / 2, (pageHeight / 2) - logoH - 30, logoW, logoH);
  } catch(e) {}

  // Linha decorativa verde
  const lineW = 80;
  const lineY  = (pageHeight / 2) + 5;
  const lineX  = (pageWidth - lineW) / 2;
  const line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, lineX, lineY, lineX + lineW, lineY);
  line.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.accentGreen);
  line.setWeight(4);

  // Mensagem de encerramento
  const msgBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
    (pageWidth / 2) - 200, lineY + 18, 400, 24);
  msgBox.getText().setText('Boletim Propriedades & Facilities').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(13).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);
  msgBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Período — detector de semana (QUADRO COMPARATIVO, linha 33, regra -1 dia)
  // Mesmo formato da capa de abertura (00_capa.gs) para as datas condizerem.
  let textoPeriodo = 'Semana ' + getISOWeek(new Date()); // fallback: semana ISO de hoje
  try {
    const ssCapaF    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheetCapaF = ssCapaF.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
    if (sheetCapaF) {
      const lastColCapaF = sheetCapaF.getLastColumn();
      const rowSemanaF   = sheetCapaF.getRange(33, 1, 1, lastColCapaF).getValues()[0];
      let dataSemanaRefF = null;
      for (let i = rowSemanaF.length - 1; i >= 0; i--) {
        const raw = rowSemanaF[i];
        if (raw === "" || raw === null) continue;
        const d = (raw instanceof Date) ? new Date(raw.getTime()) : new Date(raw.toString());
        if (!isNaN(d.getTime())) { d.setDate(d.getDate() - 1); dataSemanaRefF = d; break; }
      }
      const semInfoF = getSemanaBoletim(dataSemanaRefF);
      if (semInfoF) {
        textoPeriodo = 'Semana ' + semInfoF.numero + ' • ' + semInfoF.intervalo + ' de ' + semInfoF.fim.getFullYear();
      }
    }
  } catch(e) {
    Logger.log("Aviso (Capa Final): não foi possível detectar a semana. " + e.message);
  }

  const periodoBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
    (pageWidth / 2) - 200, lineY + 44, 400, 18);
  periodoBox.getText().setText(textoPeriodo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(10)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  periodoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Endereço
  const addrBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
    (pageWidth / 2) - 200, lineY + 72, 400, 50);
  addrBox.getText().setText(
    'AR 3000 Cabral Corporate & Offices\n' +
    'Praça São Paulo da Cruz, 50 — 24º andar\n' +
    'Curitiba, Paraná  |  capitalrealty.com.br'
  ).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  addrBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  addrBox.setContentAlignment(SlidesApp.ContentAlignment.TOP);

  Logger.log("✅ Capa Final concluída!");
}