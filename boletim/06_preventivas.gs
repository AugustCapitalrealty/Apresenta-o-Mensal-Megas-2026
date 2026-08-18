/**
 * ARQUIVO: 06_preventivas.gs
 * Cria o slide de Manutenção Preventiva.
 * Dados: Planilha QUADRO COMPARATIVO
 *   - SLA: BM9 (Facilities), BM10 (Property), BM11 (Operação), BM12 (Geral)
 *   - Agendadas: Linha 37 — últimas 8 colunas com dados
 *   - Realizadas: Linha 43 — últimas 8 colunas com dados
 */

function gerarSlide06_Preventivas() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados para Manutenção Preventiva...");

  let slaFac = "N/D", slaProp = "N/D", slaOper = "N/D", slaGeral = "N/D";
  let agendadas = [], realizadas = [], timeline = [];
  let ultimaDataSemana = null; // última data com dados — base do detector de semana

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
    if (!sheet) throw new Error("Aba não encontrada.");

    // --- SLA por área ---
    const getVal = (cell) => {
      const v = sheet.getRange(cell).getDisplayValue();
      return v ? v.toString().trim() : "N/D";
    };
    slaFac   = getVal('BM9');
    slaProp  = getVal('BM10');
    slaOper  = getVal('BM11');
    slaGeral = getVal('BM12');

    // --- Agendadas x Realizadas: últimas 8 colunas com dados ---
    const lastCol    = sheet.getLastColumn();
    const rowAgend   = sheet.getRange(37, 1, 1, lastCol).getValues()[0];
    const rowReal    = sheet.getRange(43, 1, 1, lastCol).getValues()[0];

    // Cabeçalhos de semana na linha 33
    const rowHeader = sheet.getRange(33, 1, 1, lastCol).getValues()[0];

    // Pegar índices das últimas 8 colunas que têm dado em Agendadas
    let colIndexes = [];
    for (let i = lastCol - 1; i >= 1 && colIndexes.length < 8; i--) {
      if (rowAgend[i] !== "" && rowAgend[i] !== null && rowAgend[i] !== 0) {
        colIndexes.unshift(i);
      }
    }

    colIndexes.forEach(i => {
      agendadas.push(Number(rowAgend[i])  || 0);
      realizadas.push(Number(rowReal[i])  || 0);

      // Formata rótulo como DD/MM — suporta Date object e string de data
      let lbl = "S" + (colIndexes.indexOf(i) + 1);
      if (rowHeader[i]) {
        const raw = rowHeader[i];
        let dateObj = null;
        if (raw instanceof Date) {
          dateObj = new Date(raw.getTime());
        } else {
          const parsed = new Date(raw.toString());
          if (!isNaN(parsed.getTime())) dateObj = new Date(parsed.getTime());
        }
        if (dateObj) {
          // Regra de negócio: subtrai 1 dia
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
    Logger.log("Erro ao extrair dados Preventivas: " + e.message);
    // Fallback para não travar o slide
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
    .getText().setText('SLA por Área • Agendadas x Realizadas').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // =========================================================
  // --- 1b. SELO DETECTOR DE SEMANA (canto superior direito) ---
  // =========================================================
  const semInfo = getSemanaBoletim(ultimaDataSemana);
  if (semInfo) {
    const seloW = 175, seloH = 24;
    const seloX = pageWidth - marginX - seloW;
    const seloY = marginY + 48; // logo abaixo do logo, acima dos cards
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
  // --- 2. CARDS DE SLA (linha superior) ---
  // =========================================================
  const kpiY   = marginY + 75;
  const kpiH   = 65;
  const kpiGap = 12;
  const kpiW   = (pageWidth - (marginX * 2) - (kpiGap * 3)) / 4;

  const slaItems = [
    { title: 'SLA GERAL',     val: slaGeral, col: CR_DESIGN_SYSTEM.colors.brandDark,    main: true  },
    { title: 'FACILITIES',    val: slaFac,   col: CR_DESIGN_SYSTEM.colors.brandSoft,                            main: false },
    { title: 'PROPERTY',      val: slaProp,  col: CR_DESIGN_SYSTEM.colors.brandMed,     main: false },
    { title: 'OPERAÇÃO HANGAR',      val: slaOper,  col: CR_DESIGN_SYSTEM.colors.brandLight,   main: false },
  ];

  slaItems.forEach((item, i) => {
    const x = marginX + (i * (kpiW + kpiGap));

    // Card
    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, kpiW, kpiH);
    card.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
    card.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

    const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, 4, kpiH);
    side.getFill().setSolidFill(item.col);
    side.getBorder().setTransparent();

    // Textos
    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, kpiY + 8, kpiW - 15, kpiH - 10);
    box.getText().setText(item.title + '\n' + item.val);
    const txt = box.getText();
    txt.getParagraphStyle().setLineSpacing(110);
    txt.getRange(0, item.title.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

    // Cor do valor: verde se >= 95%, laranja se >= 90%, vermelho se < 90%
    const num = parseFloat((item.val || "0").replace('%','').replace(',','.'));
    let valColor = CR_DESIGN_SYSTEM.colors.accentGreen;
    if (!isNaN(num)) {
      if (num < 90)       valColor = CR_DESIGN_SYSTEM.colors.accentRed;
      else if (num < 95)  valColor = CR_DESIGN_SYSTEM.colors.accentOrange;
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

  // Frame do gráfico
  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, chartAreaY, pageWidth - (marginX * 2), chartAreaH);
  chartFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  chartFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  // Título do gráfico
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, chartAreaY + 12, 400, 20)
    .getText().setText('AGENDADAS X REALIZADAS — ÚLTIMAS 8 SEMANAS').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  // Legenda
  const legY = chartAreaY + 30;
  let legX = marginX + 20;
  const legItems = [
    { label: 'REALIZADAS', color: CR_DESIGN_SYSTEM.colors.brandDark },
    { label: 'AGENDADAS',  color: '#CBD5E1' }
  ];
  legItems.forEach(item => {
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

  // Área do plot
  const pMarginX = 55, pMarginY = 55;
  const plotX = marginX + pMarginX;
  const plotY = chartAreaY + pMarginY;
  const plotW = (pageWidth - (marginX * 2)) - (pMarginX * 2);
  const plotH = chartAreaH - pMarginY - 30;

  // Linha base
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  const maxVal    = Math.max(...agendadas, ...realizadas, 10);
  const scaleY    = plotH / (maxVal * 1.25);
  const stepX     = plotW / timeline.length; // divide em fatias iguais
  const barW      = 16;
  const barGap    = 4; // espaço entre as duas barras do grupo

  timeline.forEach((label, i) => {
    // Centro do grupo de barras
    const groupCX = plotX + (i * stepX) + (stepX / 2);

    // Linha de grade vertical no centro do grupo
    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, groupCX, plotY, groupCX, plotY + plotH);
    vl.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    vl.setDashStyle(SlidesApp.DashStyle.DASH);

    // Rótulo eixo X
    const xlbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, groupCX - 35, plotY + plotH + 5, 70, 16);
    xlbl.getText().setText(label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    xlbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Posições lado a lado: AGENDADAS à esquerda, REALIZADAS à direita
    const agX = groupCX - barW - (barGap / 2);
    const reX = groupCX + (barGap / 2);

    // Barra AGENDADAS (cinza)
    const hAgend = Math.max(agendadas[i] * scaleY, 1);
    const agRect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, agX, (plotY + plotH) - hAgend, barW, hAgend);
    agRect.getFill().setSolidFill('#CBD5E1');
    agRect.getBorder().setTransparent();

    // Rótulo agendadas
    const agLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, agX - 5, (plotY + plotH) - hAgend - 17, barW + 10, 14);
    agLbl.getText().setText(agendadas[i].toLocaleString('pt-BR')).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
      .setForegroundColor('#94A3B8');
    agLbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Barra REALIZADAS (azul escuro)
    const hReal = Math.max(realizadas[i] * scaleY, 1);
    const reRect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, reX, (plotY + plotH) - hReal, barW, hReal);
    reRect.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
    reRect.getBorder().setTransparent();

    // Rótulo realizadas
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

  Logger.log("✅ Slide 06 (Preventivas) concluído!");
}

// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só a Manutenção Preventiva, no escopo pedido. Serve para
// conferir um ajuste sem reprocessar o boletim inteiro. Sem parâmetro, para
// aparecer no menu "Selecionar função" do editor.
function verManutencaoPreventiva()            { return _bolVerSlide_('COMPLETO',   'Manutenção Preventiva'); }
function verManutencaoPreventivaFacilities()  { return _bolVerSlide_('FACILITIES', 'Manutenção Preventiva'); }
function verManutencaoPreventivaHangar()      { return _bolVerSlide_('HANGAR',     'Manutenção Preventiva'); }
