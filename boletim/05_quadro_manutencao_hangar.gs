/**
 * ARQUIVO: 05_quadro_manutencao_hangar.gs
 * Slide "Manutenção Corretiva" para o Boletim HANGAR VIP.
 * Dados: aba "hangar QUADRO COMPARATIVO"
 *   - KPIs backlog atual: C10 (Facilities), C11 (Property), C12 (Operação), C13 (Total)
 *   - Composição: D13 (Melhorias), E13 (Projetos), F13 (Corretivas)
 *   - Comportamento da Fila: linha 40 = cabeçalhos, linhas 41-43 = Facilities/Property/Operação
 */

function gerarSlide05_QuadroManutencao_Hangar() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide        = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth    = presentation.getPageWidth();
  const pageHeight   = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados Hangar — Manutenção Corretiva...");

  let histFac  = [0,0,0,0], histProp = [0,0,0,0], histOper = [0,0,0,0];
  let timeline = ['-','-','-','-'];
  let kpiProp = 0, kpiOper = 0, kpiTot = 0;
  let valCorretivas = 0, valMelhorias = 0, valProjetos = 0;

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName('hangar QUADRO COMPARATIVO');
    if (!sheet) throw new Error("Aba 'hangar QUADRO COMPARATIVO' não encontrada.");

    // --- KPIs de backlog atual ---
    kpiProp = Number(sheet.getRange('C11').getValue()) || 0;
    kpiOper = Number(sheet.getRange('C12').getValue()) || 0;
    kpiTot  = Number(sheet.getRange('C13').getValue()) || 0;

    // --- Composição por tipo (TOTAL — linha 13) ---
    valMelhorias  = Number(sheet.getRange('D13').getValue()) || 0;
    valProjetos   = Number(sheet.getRange('E13').getValue()) || 0;
    valCorretivas = Number(sheet.getRange('F13').getValue()) || 0;

    // --- Comportamento da Fila: últimas 4 colunas com dados na linha de cabeçalho (40) ---
    const lastCol   = sheet.getLastColumn();
    const headerRow = sheet.getRange(40, 1, 1, lastCol).getValues()[0];

    let targetCols  = [], tempTimeline = [];
    for (let i = headerRow.length - 1; i >= 1 && targetCols.length < 4; i--) {
      if (headerRow[i] && headerRow[i].toString().trim() !== "") {
        targetCols.unshift(i + 1);
        const raw = headerRow[i];
        let lbl = "-";
        let dateObj = null;
        if (raw instanceof Date) {
          dateObj = raw;
        } else {
          const parsed = new Date(raw.toString());
          if (!isNaN(parsed.getTime())) dateObj = parsed;
        }
        if (dateObj) {
          lbl = String(dateObj.getDate()).padStart(2,'0') + '/' + String(dateObj.getMonth()+1).padStart(2,'0');
        } else {
          lbl = raw.toString().trim().toUpperCase();
        }
        tempTimeline.unshift(lbl);
      }
    }
    while (tempTimeline.length < 4) tempTimeline.unshift("-");
    timeline = tempTimeline;

    const getValsFromCols = (rowNum) => {
      let vals = [];
      for (let col of targetCols) {
        vals.push(Number(sheet.getRange(rowNum, col).getValue()) || 0);
      }
      while (vals.length < 4) vals.unshift(0);
      return vals;
    };

    histFac  = getValsFromCols(41);
    histProp = getValsFromCols(42);
    histOper = getValsFromCols(43);

  } catch(e) {
    Logger.log("Erro ao extrair dados Hangar Corretiva: " + e.message);
  }

  // --- Cálculo de tendência (sem Facilities no Hangar) ---
  const totPrev = histProp[2] + histOper[2];
  const diffTot = kpiTot - totPrev;

  const formatTrend = (diff) => diff > 0 ? '↑ +' + diff : diff < 0 ? '↓ ' + diff : '= 0';
  const getPct      = (val)  => kpiTot > 0 ? Math.round((val / kpiTot) * 100) + '% do total' : '0%';

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO ---
  // =========================================================
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 400, -100, 500, 500);
  ellipse.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40)
    .getText().setText('Manutenção Corretiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30)
    .getText().setText('Visão Executiva — Hangar VIP').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // =========================================================
  // --- 2. KPI CARDS (4 cards: Total, Facilities, Property, Operação) ---
  // =========================================================
  const kpiY = marginY + 75, kpiH = 65, kpiGap = 10;
  const kpiWidth = (pageWidth - (marginX * 2) - (kpiGap * 2)) / 3;

  const metricsTop = [
    { title: 'Backlog Total',   val: kpiTot,  sub: formatTrend(diffTot) + ' vs per. ant.', col: CR_DESIGN_SYSTEM.colors.brandDark,  main: true  },
    { title: 'Property',        val: kpiProp, sub: getPct(kpiProp),                         col: CR_DESIGN_SYSTEM.colors.brandMed,   main: false },
    { title: 'Operação Hangar', val: kpiOper, sub: getPct(kpiOper),                         col: CR_DESIGN_SYSTEM.colors.brandLight, main: false },
  ];

  function drawKpiCard(x, title, value, subText, color, isMain) {
    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, kpiWidth, kpiH);
    card.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
    card.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, 4, kpiH);
    side.getFill().setSolidFill(color);
    side.getBorder().setTransparent();
    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, kpiY + 8, kpiWidth - 15, kpiH - 10);
    box.getText().setText(title.toUpperCase() + '\n' + value + '\n' + subText);
    const txt = box.getText();
    txt.getParagraphStyle().setLineSpacing(105);
    txt.getRange(0, title.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    txt.getRange(title.length + 1, title.length + 1 + value.toString().length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(18).setBold(true)
      .setForegroundColor(isMain ? color : CR_DESIGN_SYSTEM.colors.textMain);
    txt.getRange(title.length + 1 + value.toString().length + 1, txt.getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(subText.includes('↑') ? CR_DESIGN_SYSTEM.colors.accentRed : CR_DESIGN_SYSTEM.colors.textBody);
  }

  metricsTop.forEach((m, i) => drawKpiCard(marginX + (i * (kpiWidth + kpiGap)), m.title, m.val, m.sub, m.col, m.main));

  // =========================================================
  // --- 3. GRÁFICO DE BARRAS — COMPORTAMENTO DA FILA ---
  // =========================================================
  const mainAreaY  = kpiY + kpiH + 15;
  const mainAreaH  = pageHeight - mainAreaY - marginY - 20;
  const sideWidth  = 290;
  const chartWidth = (pageWidth - (marginX * 2)) - sideWidth - 15;

  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, mainAreaY, chartWidth, mainAreaH);
  chartFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  chartFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, mainAreaY + 12, 300, 25).getText()
    .setText('COMPORTAMENTO DA FILA ACUMULADA').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  // Legenda — 2 séries (Hangar não tem Facilities)
  const legendItems = [
    { label: 'PROPERTY',   color: CR_DESIGN_SYSTEM.colors.brandDark  },
    { label: 'OP. HANGAR', color: CR_DESIGN_SYSTEM.colors.brandLight },
  ];
  const legendY = mainAreaY + 40;
  let legendCursorX = marginX + 20;
  legendItems.forEach(item => {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legendCursorX, legendY, 10, 10);
    sq.getFill().setSolidFill(item.color); sq.getBorder().setTransparent();
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + 14, legendY - 2, 75, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legendCursorX += 95;
  });

  const pMarginX = 50, pMarginY = 55;
  const plotX = marginX + pMarginX, plotY = mainAreaY + pMarginY;
  const plotW = chartWidth - (pMarginX * 2), plotH = mainAreaH - pMarginY - 35;

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  const stepX = plotW / (timeline.length - 1);
  timeline.forEach((m, i) => {
    const x = plotX + (i * stepX);
    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, plotY, x, plotY + plotH);
    vl.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    vl.setDashStyle(SlidesApp.DashStyle.DASH);
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - 50, plotY + plotH + 5, 100, 20);
    lbl.getText().setText(m).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  const barW      = 14;
  const barSeries = [
    { color: CR_DESIGN_SYSTEM.colors.brandDark,  values: histProp, xOffset: -10 },
    { color: CR_DESIGN_SYSTEM.colors.brandLight, values: histOper, xOffset:   4 },
  ];
  const maxChartVal = Math.max(...histProp, ...histOper, 10);
  const scaleYLine  = plotH / (maxChartVal * 1.4);

  barSeries.forEach(series => {
    for (let i = 0; i < series.values.length; i++) {
      const val = series.values[i];
      const h   = Math.max(val * scaleYLine, 1);
      const bX  = plotX + (i * stepX) + series.xOffset;
      const bY  = (plotY + plotH) - h;
      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bX, bY, barW, h);
      rect.getFill().setSolidFill(series.color); rect.getBorder().setTransparent();
      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bX - 10, bY - 14, barW + 20, 14);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
        .setForegroundColor(series.color);
      txtBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
  });

  // =========================================================
  // --- 4. COMPOSIÇÃO POR TIPO (painel direito) ---
  // =========================================================
  const rankCardX = marginX + chartWidth + 15;
  const rankFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rankCardX, mainAreaY, sideWidth, mainAreaH);
  rankFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  rankFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rankCardX + 15, mainAreaY + 12, sideWidth - 30, 25).getText()
    .setText('COMPOSIÇÃO POR TIPO').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  const rankTot       = valCorretivas + valMelhorias + valProjetos;
  const getRankPct    = (val) => rankTot > 0 ? Math.round((val / rankTot) * 100) : 0;
  const getRankFactor = (val) => rankTot > 0 ? val / rankTot : 0;

  const rankData = [
    { label: 'CORRETIVAS', val: valCorretivas, pct: getRankPct(valCorretivas) + '%', color: CR_DESIGN_SYSTEM.colors.brandDark,    factor: getRankFactor(valCorretivas) },
    { label: 'MELHORIAS',  val: valMelhorias,  pct: getRankPct(valMelhorias)  + '%', color: CR_DESIGN_SYSTEM.colors.accentOrange, factor: getRankFactor(valMelhorias)  },
    { label: 'PROJETOS',   val: valProjetos,   pct: getRankPct(valProjetos)   + '%', color: CR_DESIGN_SYSTEM.colors.brandMed,     factor: getRankFactor(valProjetos)   },
  ];

  const rankHeaderH = 45, rankGap = 8;
  const rowH = Math.floor((mainAreaH - rankHeaderH - (rankGap * (rankData.length - 1))) / rankData.length);
  let currentRankY  = mainAreaY + rankHeaderH;
  const labelX      = rankCardX + 10, dataX = rankCardX + 95, barX = rankCardX + 155;
  const maxBarWidth = sideWidth - (barX - rankCardX) - 15;

  rankData.forEach(d => {
    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, labelX, currentRankY, 80, rowH);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lblBox.getText().setText(d.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(6.5).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain);
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX, currentRankY, 55, rowH);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    valBox.getText().setText(d.val + " (" + d.pct + ")").getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7.5).setBold(true)
      .setForegroundColor(d.color);
    const barH2   = (d.label === 'CORRETIVAS') ? 12 : 8;
    const barYOff = (rowH / 2) - (barH2 / 2);
    const bgBar   = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOff, maxBarWidth, barH2);
    bgBar.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines, 0.4); bgBar.getBorder().setTransparent();
    const pw = maxBarWidth * d.factor;
    if (pw > 0.5) {
      const pb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOff, pw, barH2);
      pb.getFill().setSolidFill(d.color); pb.getBorder().setTransparent();
    }
    currentRankY += rowH + rankGap;
  });

  // =========================================================
  // --- 5. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 05').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 05 HANGAR VIP concluído!");
}

/**
 * PRÉVIA RÁPIDA — gera apenas o slide de Corretiva Hangar VIP.
 */
function testarSlide05_Hangar() {
  limparApresentacao();
  gerarSlide05_QuadroManutencao_Hangar();
  Logger.log("✅ Prévia Manutenção Corretiva Hangar VIP gerada.");
}
