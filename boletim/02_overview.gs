/**
 * ARQUIVO: 02_overview.gs (Dashboard Responsivo)
 * Cria o slide de KPIs em formato de Cartões (Cards).
 * ATUALIZAÇÃO: Layout reestruturado (Controle de Acesso unificado e Sustentabilidade Full-Width).
 * CORREÇÕES v2:
 *   - CO² exibido com unidade "kg"
 *   - Árvores Plantadas arredondado para baixo (sem decimal)
 *   - Semana calculada dinamicamente com base na data atual
 */

function gerarSlide03_OverviewExecutivo() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth = presentation.getPageWidth(); 
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. LÓGICA DE EXTRAÇÃO DE DADOS DAS PLANILHAS ---
  // =========================================================
  Logger.log("Extraindo dados para o Overview Executivo...");

  let vDisp = "N/D", vConf = "N/D";
  let vGeracao = "N/D", vConsumo = "N/D", vEconomia = "N/D", vArvores = "N/D", vCo2 = "N/D", vCarvao = "N/D";
  let vFila = "N/D", vCelular = "N/D", vFluxo = "N/D", vTempo = "N/D";
  let dataSemanaRef = null; // última data dos cabeçalhos semanais — base do detector de semana

  try {
    // ---- FONTE 1: PLANILHA QUADRO COMPARATIVO ----
    const ss1 = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet1 = ss1.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
    
    if (sheet1) {
      const getVal = (cell) => {
        const val = sheet1.getRange(cell).getDisplayValue();
        return val ? val.toString() : "N/D";
      };

      vDisp     = getVal('F19');
      vConf     = getVal('G19');
      
      const formatKwh = (val) => {
        if (val === "N/D") return val;
        let s = val.toString().trim();
        let num = parseFloat(s.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(num)) return num.toLocaleString('pt-BR') + " kWh";
        return s + " kWh";
      };

      vGeracao  = formatKwh(getVal('E100'));
      vConsumo  = formatKwh(getVal('E101'));

      // F103 = Árvores Plantadas | F104 = CO² Evitado (kg)
      // Árvores sem decimal (arredonda para baixo)
      const arvoresRaw = getVal('F103');
      if (arvoresRaw !== "N/D") {
        const arvoresNum = parseFloat(arvoresRaw.replace(',', '.'));
        vArvores = !isNaN(arvoresNum) ? Math.floor(arvoresNum).toString() : arvoresRaw;
      } else {
        vArvores = "N/D";
      }

      // CO² com unidade "kg"
      const co2Raw = getVal('F104');
      vCo2 = co2Raw !== "N/D" ? co2Raw + " kg" : "N/D";

      // Carvão Poupado (F106) com unidade "t"
      const carvaoRaw = getVal('F106');
      vCarvao = carvaoRaw !== "N/D" ? carvaoRaw + " t" : "N/D";
      
      vEconomia = getVal('F105');
      if (vEconomia !== "N/D" && !vEconomia.includes("R$")) {
        vEconomia = "R$ " + vEconomia.trim();
      }

      // Detector de semana: última data nos cabeçalhos semanais (linha 33), regra -1 dia
      const lastCol1  = sheet1.getLastColumn();
      const rowSemana = sheet1.getRange(33, 1, 1, lastCol1).getValues()[0];
      for (let i = rowSemana.length - 1; i >= 0; i--) {
        const raw = rowSemana[i];
        if (raw === "" || raw === null) continue;
        const d = (raw instanceof Date) ? new Date(raw.getTime()) : new Date(raw.toString());
        if (!isNaN(d.getTime())) { d.setDate(d.getDate() - 1); dataSemanaRef = d; break; }
      }
    }

    // ---- FONTE 2: PLANILHA 2026 GRÁFICOS ----
    const idSS2 = CR_DESIGN_SYSTEM.assets.spreadsheetGraficosId || '1jj9_vA6sjUtXE3O5xBwOQ_0U-KxpCkHXMvdHlUx19j8';
    const ss2 = SpreadsheetApp.openById(idSS2);
    const sheet2 = ss2.getSheetByName('2026 GRÁFICOS');

    if (sheet2) {
      const getLastValueInRow = (rowNum) => {
        const lastCol = sheet2.getLastColumn();
        if (lastCol === 0) return "N/D";
        const rowData = sheet2.getRange(rowNum, 1, 1, lastCol).getDisplayValues()[0];
        for (let i = rowData.length - 1; i >= 0; i--) {
          if (rowData[i] && rowData[i].toString().trim() !== "") return rowData[i].toString();
        }
        return "N/D";
      };

      vFluxo   = getLastValueInRow(7);
      vTempo   = getLastValueInRow(19);
      vCelular = getLastValueInRow(25);
      vFila    = getLastValueInRow(31);

      // Formatar fluxo com ponto de milhar
      const fluxoNum = parseFloat(vFluxo.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(fluxoNum)) vFluxo = Math.round(fluxoNum).toLocaleString('pt-BR');

      if (vTempo !== "N/D" && vTempo.includes(":")) {
        const parts = vTempo.split(":");
        if (parts.length === 3) vTempo = parts[1] + "m" + parts[2] + "s";
        else if (parts.length === 2) vTempo = parts[0] + "m" + parts[1] + "s";
      }
    }
  } catch(e) {
    Logger.log("Erro ao extrair dados: " + e.message);
  }

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO PADRONIZADO ---
  // =========================================================
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -100, -100, 300, 300);
  ellipse.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40);
  titleBox.getText().setText('Overview Executivo').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24).setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  // Semana do boletim: detector ISO baseado na última data da planilha (linha 33).
  // Fallback para a semana ISO da data atual, caso não haja data nos cabeçalhos.
  const semInfo = getSemanaBoletim(dataSemanaRef);
  const subtituloSemana = semInfo
    ? 'Visão: Principais Indicadores • ' + semInfo.completo
    : 'Visão: Principais Indicadores • Semana ' + getISOWeek(new Date());

  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30);
  subtitleBox.getText().setText(subtituloSemana).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // =========================================================
  // --- 2. MATEMÁTICA E LAYOUT DOS CARTÕES ---
  // =========================================================
  const gap = 15; 
  const usableWidth = pageWidth - (marginX * 2); 
  const colWidth = (usableWidth - (gap * 2)) / 3; 
  
  const X1 = marginX;
  const X2 = marginX + colWidth + gap;
  
  const topY = 100; 
  const cardH1 = 130; 
  const bottomY = topY + cardH1 + gap;
  const cardH2 = 125; 

  function drawCard(x, y, w, h, borderColor) {
    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
    card.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
    card.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    const border = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 6, h);
    border.getFill().setSolidFill(borderColor);
    border.getBorder().setTransparent();
  }

  function addMetric(x, y, w, h, label, value, valColor, valSize = 14) {
    const labelH = 14;
    const labelBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, labelH);
    labelBox.getText().setText(label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    labelBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + labelH, w, h - labelH);
    valBox.getText().setText(value).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(valSize).setBold(true)
      .setForegroundColor(valColor);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  }

  const pad = 12;

  // --- CARD 1: MANUTENÇÕES ---
  drawCard(X1, topY, colWidth, cardH1, CR_DESIGN_SYSTEM.colors.brandLight);
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, X1 + pad, topY + 5, colWidth - pad, 25).getText().setText('MANUTENÇÕES').getTextStyle().setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);
  const halfCol  = (colWidth / 2) - pad;
  const rightColX = X1 + pad + halfCol;
  const rightColW = (colWidth / 2) - 4; // estende até a borda direita do card
  addMetric(X1 + pad,  topY + 30, halfCol,   50, 'Disponibilidade', vDisp, CR_DESIGN_SYSTEM.colors.brandDark);
  addMetric(rightColX, topY + 30, rightColW, 50, 'Confiabilidade',  vConf, CR_DESIGN_SYSTEM.colors.brandDark);
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, X1 + pad, topY + 110, colWidth - pad, 20).getText().setText('*Acumulado 2026').getTextStyle().setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor('#999999');

  // --- CARD 2: CONTROLE DE ACESSO ---
  const card2Width = (colWidth * 2) + gap;
  drawCard(X2, topY, card2Width, cardH1, CR_DESIGN_SYSTEM.colors.brandMed);
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, X2 + pad, topY + 5, card2Width - pad, 25).getText().setText('CONTROLE DE ACESSO').getTextStyle().setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);
  
  const midCard2X = X2 + (card2Width / 2);
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, midCard2X, topY + 30, midCard2X, topY + cardH1 - 15).getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  const leftSideW = (card2Width / 2) - (pad * 2);
  addMetric(X2 + pad, topY + 35, leftSideW, 45, 'Fluxo Total (Último Registro)', vFluxo, CR_DESIGN_SYSTEM.colors.brandDark, 16);
  addMetric(X2 + pad, topY + 75, leftSideW, 45, 'Tempo Médio de Acesso', vTempo, CR_DESIGN_SYSTEM.colors.brandDark, 16);

  const rightSideX = midCard2X + pad;
  const rightSideW = (card2Width / 2) - (pad * 2);
  addMetric(rightSideX, topY + 25, rightSideW, 35, 'Uso de Celular', vCelular, CR_DESIGN_SYSTEM.colors.brandDark, 16);
  
  let pctCelular = parseFloat(vCelular.replace('%', '').replace(',', '.')) / 100;
  if (isNaN(pctCelular)) pctCelular = 0;
  
  const bgBar1 = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rightSideX, topY + 60, rightSideW - pad, 4); bgBar1.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines); bgBar1.getBorder().setTransparent();
  const fillBar1 = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rightSideX, topY + 60, (rightSideW - pad) * pctCelular, 4); fillBar1.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight); fillBar1.getBorder().setTransparent();
  
  addMetric(rightSideX, topY + 75, rightSideW, 35, 'Fila Evitada', vFila, CR_DESIGN_SYSTEM.colors.brandDark, 16);
  
  let pctFila = parseFloat(vFila.replace('%', '').replace(',', '.')) / 100;
  if (isNaN(pctFila)) pctFila = 0;
  
  const bgBar2 = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rightSideX, topY + 110, rightSideW - pad, 4); bgBar2.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines); bgBar2.getBorder().setTransparent();
  const fillBar2 = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rightSideX, topY + 110, (rightSideW - pad) * pctFila, 4); fillBar2.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.accentGreen); fillBar2.getBorder().setTransparent();

  // --- CARD 3: SUSTENTABILIDADE (Full Width) ---
  const fullWidth = usableWidth;
  drawCard(X1, bottomY, fullWidth, cardH2, CR_DESIGN_SYSTEM.colors.brandLight);
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, X1 + pad, bottomY + 5, fullWidth - pad, 25).getText().setText('SUSTENTABILIDADE (MEGA CURITIBA)').getTextStyle().setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);
  
  const midCard3X = X1 + (fullWidth / 2);
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, midCard3X, bottomY + 30, midCard3X, bottomY + cardH2 - 15).getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
  
  const halfFullCol = (fullWidth / 2) - pad;
  const quarterFullCol = halfFullCol / 2;

  // Esquerda (Resumo Semanal)
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, X1 + pad, bottomY + 30, halfFullCol, 20).getText().setText('RESUMO SEMANAL').getTextStyle().setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);
  addMetric(X1 + pad, bottomY + 50, quarterFullCol, 35, 'Geração', vGeracao, CR_DESIGN_SYSTEM.colors.accentGreen, 14);
  addMetric(X1 + pad + quarterFullCol, bottomY + 50, quarterFullCol, 35, 'Consumo', vConsumo, CR_DESIGN_SYSTEM.colors.accentRed, 14);
  addMetric(X1 + pad, bottomY + 85, halfFullCol, 40, 'Economia Direta', vEconomia, CR_DESIGN_SYSTEM.colors.brandDark, 18);
  
  // Direita (Impacto Ambiental)
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, midCard3X + pad, bottomY + 5, halfFullCol, 14)
    .getText().setText('IMPACTO AMBIENTAL ACUMULADO').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, midCard3X + pad, bottomY + 19, halfFullCol, 12)
    .getText().setText('Benefícios ambientais — acumulado desde 15/12/2022').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor('#999999');

  const thirdFullCol = halfFullCol / 3;
  addMetric(midCard3X + pad,                      bottomY + 35, thirdFullCol, 35, 'CO² Evitado',    vCo2,    CR_DESIGN_SYSTEM.colors.brandDark,  12);
  addMetric(midCard3X + pad + thirdFullCol,        bottomY + 35, thirdFullCol, 35, 'Carvão Poupado', vCarvao, '#64748B',                           12);
  addMetric(midCard3X + pad + (thirdFullCol * 2),  bottomY + 35, thirdFullCol, 35, 'Árvores',        vArvores, CR_DESIGN_SYSTEM.colors.accentGreen, 12);

  // =========================================================
  // --- 3. RODAPÉ E PAGINAÇÃO PADRONIZADOS ---
  // =========================================================
  const footerY = pageHeight - 25;
  const footerLeft = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20);
  footerLeft.getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 03').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 02 concluído! Semana dinâmica, CO² com unidade, Árvores sem decimal.");
}