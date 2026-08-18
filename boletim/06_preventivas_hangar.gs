/**
 * ARQUIVO: 06_preventivas_hangar.gs
 * Slide de Manutenção Preventiva — versão HANGAR VIP.
 *
 * Aba: "hangar QUADRO COMPARATIVO"
 *   - Linha 24 = datas (ajuste -1 dia)
 *   - Linha 26 = realizadas
 *   - Linha 28 = agendadas
 *   - BO9  = SLA Property
 *   - BO10 = SLA Operação Hangar VIP
 *   - BO11 = SLA Geral (Total)
 */

function gerarSlide06_Preventivas_Hangar() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados Preventivas Hangar VIP...");

  const SHEET_NAME = 'hangar QUADRO COMPARATIVO';
  const ROW_DATE   = 24;
  const ROW_REAL   = 26;
  const ROW_AGEND  = 28;

  let slaProp = "N/D", slaOper = "N/D", slaGeral = "N/D";
  let agendadas = [], realizadas = [], timeline = [];
  let ultimaDataSemana = null; // última data com dados — base do detector de semana

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Aba '" + SHEET_NAME + "' não encontrada.");

    const getVal = (cell) => {
      const v = sheet.getRange(cell).getDisplayValue();
      return v ? v.toString().trim() : "N/D";
    };
    slaProp  = getVal('BO9');
    slaOper  = getVal('BO10');
    slaGeral = getVal('BO11');

    // --- Agendadas x Realizadas: últimas 8 colunas com dados ---
    const lastCol  = sheet.getLastColumn();
    const rowAgend = sheet.getRange(ROW_AGEND, 1, 1, lastCol).getValues()[0];
    const rowReal  = sheet.getRange(ROW_REAL,  1, 1, lastCol).getValues()[0];
    const rowDate  = sheet.getRange(ROW_DATE,  1, 1, lastCol).getValues()[0];

    let colIndexes = [];
    for (let i = lastCol - 1; i >= 1 && colIndexes.length < 8; i--) {
      if (rowAgend[i] !== "" && rowAgend[i] !== null && rowAgend[i] !== 0) {
        colIndexes.unshift(i);
      }
    }

    colIndexes.forEach(i => {
      agendadas.push(Number(rowAgend[i]) || 0);
      realizadas.push(Number(rowReal[i]) || 0);

      let lbl = "S" + (colIndexes.indexOf(i) + 1);
      if (rowDate[i]) {
        const raw = rowDate[i];
        let dateObj = null;
        if (raw instanceof Date) {
          dateObj = new Date(raw.getTime());
        } else {
          const parsed = new Date(raw.toString());
          if (!isNaN(parsed.getTime())) dateObj = new Date(parsed.getTime());
        }
        if (dateObj) {
          dateObj.setDate(dateObj.getDate() - 1);
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          lbl = dd + '/' + mm;
          ultimaDataSemana = new Date(dateObj.getTime()); // guarda a data mais recente
        } else {
          lbl = raw.toString().trim();
        }
      }
      timeline.push(lbl);
    });

  } catch(e) {
    Logger.log("Erro Preventivas Hangar: " + e.message);
    agendadas  = [0,0,0,0,0,0,0,0];
    realizadas = [0,0,0,0,0,0,0,0];
    timeline   = ['S1','S2','S3','S4','S5','S6','S7','S8'];
  }

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO ---
  // =========================================================
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 350, -80, 450, 450);
  ellipse.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40)
    .getText().setText('Manutenção Preventiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30)
    .getText().setText('SLA por Área • Agendadas x Realizadas — Hangar VIP').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // =========================================================
  // --- 1b. SELO DETECTOR DE SEMANA (canto superior direito) ---
  // =========================================================
  const semInfo = getSemanaBoletim(ultimaDataSemana);
  if (semInfo) {
    const seloW = 175, seloH = 24;
    const seloX = pageWidth - marginX - seloW;
    const seloY = marginY + 48;
    const selo = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, seloX, seloY, seloW, seloH);
    selo.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
    selo.getBorder().setTransparent();
    const seloTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, seloX, seloY, seloW, seloH);
    seloTxt.getText().setText('SEMANA ' + semInfo.numero + '  •  ' + semInfo.intervalo).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(9).setBold(true)
      .setForegroundColor('#FFFFFF');
    seloTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    seloTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  }

  // =========================================================
  // --- 2. CARDS DE SLA — Geral, Property, Operação Hangar ---
  // =========================================================
  const kpiY   = marginY + 75;
  const kpiH   = 65;
  const kpiGap = 12;
  const kpiW   = (pageWidth - (marginX * 2) - (kpiGap * 2)) / 3;

  const slaItems = [
    { title: 'SLA GERAL',          val: slaGeral, col: CR_DESIGN_SYSTEM.colors.brandDark,  main: true  },
    { title: 'SLA PROPERTY',       val: slaProp,  col: CR_DESIGN_SYSTEM.colors.brandMed,   main: false },
    { title: 'SLA OP. HANGAR VIP', val: slaOper,  col: CR_DESIGN_SYSTEM.colors.brandLight, main: false },
  ];

  slaItems.forEach((item, i) => {
    const x = marginX + (i * (kpiW + kpiGap));

    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, kpiW, kpiH);
    card.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
    card.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

    const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, 4, kpiH);
    side.getFill().setSolidFill(item.col);
    side.getBorder().setTransparent();

    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, kpiY + 8, kpiW - 15, kpiH - 10);
    box.getText().setText(item.title + '\n' + item.val);
    const txt = box.getText();
    txt.getParagraphStyle().setLineSpacing(110);
    txt.getRange(0, item.title.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

    const num = parseFloat((item.val || "0").replace('%','').replace(',','.'));
    let valColor = CR_DESIGN_SYSTEM.colors.accentGreen;
    if (!isNaN(num)) {
      if (num < 90)      valColor = CR_DESIGN_SYSTEM.colors.accentRed;
      else if (num < 95) valColor = CR_DESIGN_SYSTEM.colors.accentOrange;
    }
    txt.getRange(item.title.length + 1, txt.getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(22).setBold(true)
      .setForegroundColor(item.main ? item.col : valColor);
  });

  // =========================================================
  // --- 3. GRÁFICO AGENDADAS x REALIZADAS ---
  // =========================================================
  const chartAreaY = kpiY + kpiH + 15;
  const chartAreaH = pageHeight - chartAreaY - marginY - 20;

  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, chartAreaY, pageWidth - (marginX * 2), chartAreaH);
  chartFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  chartFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, chartAreaY + 12, 400, 20)
    .getText().setText('AGENDADAS X REALIZADAS — ÚLTIMAS 8 SEMANAS').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  const legY = chartAreaY + 30;
  let legX = marginX + 20;
  [
    { label: 'REALIZADAS', color: CR_DESIGN_SYSTEM.colors.brandDark },
    { label: 'AGENDADAS',  color: '#CBD5E1' }
  ].forEach(item => {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legX, legY + 3, 7, 7);
    sq.getFill().setSolidFill(item.color);
    sq.getBorder().setTransparent();
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legX + 10, legY, 75, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legX += 90;
  });

  const pMarginX = 55, pMarginY = 55;
  const plotX = marginX + pMarginX;
  const plotY = chartAreaY + pMarginY;
  const plotW = (pageWidth - (marginX * 2)) - (pMarginX * 2);
  const plotH = chartAreaH - pMarginY - 30;

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  const maxVal = Math.max(...agendadas, ...realizadas, 10);
  const scaleY = plotH / (maxVal * 1.25);
  const stepX  = plotW / timeline.length;
  const barW   = 16;
  const barGap = 4;

  timeline.forEach((label, i) => {
    const groupCX = plotX + (i * stepX) + (stepX / 2);

    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, groupCX, plotY, groupCX, plotY + plotH);
    vl.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    vl.setDashStyle(SlidesApp.DashStyle.DASH);

    const xlbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, groupCX - 35, plotY + plotH + 5, 70, 16);
    xlbl.getText().setText(label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    xlbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const agX = groupCX - barW - (barGap / 2);
    const reX = groupCX + (barGap / 2);

    const hAgend = Math.max(agendadas[i] * scaleY, 1);
    const agRect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, agX, (plotY + plotH) - hAgend, barW, hAgend);
    agRect.getFill().setSolidFill('#CBD5E1');
    agRect.getBorder().setTransparent();

    const agLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, agX - 5, (plotY + plotH) - hAgend - 17, barW + 10, 14);
    agLbl.getText().setText(agendadas[i].toLocaleString('pt-BR')).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
      .setForegroundColor('#94A3B8');
    agLbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const hReal = Math.max(realizadas[i] * scaleY, 1);
    const reRect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, reX, (plotY + plotH) - hReal, barW, hReal);
    reRect.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
    reRect.getBorder().setTransparent();

    const reLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, reX - 5, (plotY + plotH) - hReal - 17, barW + 10, 14);
    reLbl.getText().setText(realizadas[i].toLocaleString('pt-BR')).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);
    reLbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // =========================================================
  // --- 4. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 06').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 06 HANGAR VIP (Preventivas) concluído!");
}

// Para ver só este slide, use `verManutencaoPreventivaHangar()` em
// 06_preventivas.gs — ela passa pelo motor do 00_Main.gs, que aplica o tema
// Hangar e restaura o da Capital no fim. A antiga
// `testarSlide06_Preventivas_Hangar` desenhava com a paleta errada.
