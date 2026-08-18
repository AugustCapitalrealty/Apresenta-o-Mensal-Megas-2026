/**
 * ARQUIVO: 11_sustentabilidade.gs
 * Cria o slide "Sustentabilidade — Energia Solar".
 * Fonte: spreadsheetId — Aba QUADRO COMPARATIVO
 * DADOS: Mockados — substituir pelas células reais depois
 */

function gerarSlide11_Sustentabilidade() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. DADOS REAIS DA PLANILHA ---
  // =========================================================
  let dados = {
    dias:     [],
    consumoD: [],
    geracaoD: [],
  };

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
    if (!sheet) throw new Error("Aba não encontrada.");

    // BATCH: lê C154:K160 de uma vez (data em C=idx0, consumo em F=idx3, geração em K=idx8)
    const bloco = sheet.getRange(154, 3, 7, 9).getValues();
    bloco.forEach(linha => {
      const dataVal    = linha[0]; // C
      const consumoVal = linha[3]; // F
      const geracaoVal = linha[8]; // K

      if (!dataVal) return; // linha sem data: ignora

      // Formatar data DD/MM
      const d = dataVal instanceof Date ? dataVal : new Date(dataVal);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');

      // Célula vazia => null (dia sem dados); senão número
      const temConsumo = consumoVal !== "" && consumoVal !== null && consumoVal !== undefined;
      const temGeracao = geracaoVal !== "" && geracaoVal !== null && geracaoVal !== undefined;

      dados.dias.push(dd + '/' + mm);
      dados.consumoD.push(temConsumo ? (Number(consumoVal) || 0) : null);
      dados.geracaoD.push(temGeracao ? (Number(geracaoVal) || 0) : null);
    });
  } catch(e) {
    Logger.log("Erro ao ler dados sustentabilidade: " + e.message);
    // Fallback mockado
    dados = {
      dias:     ['30/03','31/03','01/04','02/04','03/04','04/04','05/04'],
      consumoD: [503, 503, 537, 548, 486, 462, 412],
      geracaoD: [436, 393, 487, 437, 529, 484, 467],
    };
  }

  // Cores alinhadas ao design system — suaves
  const corConsumo = '#FCA5A5'; // vermelho bem claro
  const corGeracao = '#6EE7B7'; // verde bem claro

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
    .getText().setText('Mega Curitiba: Energia Solar').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  // =========================================================
  // --- 4. GRÁFICO DE BARRAS DIÁRIO — ocupa toda a área ---
  // =========================================================
  const chartY = marginY + 55;
  const chartH2 = pageHeight - chartY - marginY - 20;
  const chartW2 = pageWidth - (marginX * 2);

  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, chartY, chartW2, chartH2);
  chartFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  chartFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  // Legenda
  const legY = chartY + 10;
  let legX = marginX + 15;
  [
    { label: 'Consumo Área Comum (kWh)', color: corConsumo },
    { label: 'Energia Gerada (kWh)',     color: corGeracao },
  ].forEach(item => {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legX, legY + 2, 10, 10);
    sq.getFill().setSolidFill(item.color);
    sq.getBorder().setTransparent();
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legX + 14, legY, 160, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7.5)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legX += 175;
  });

  // Área do plot
  const pLeft = 50, pRight = 20, pTop = 30, pBottom = 25;
  const plotX = marginX + pLeft;
  const plotY = chartY + pTop;
  const plotW = chartW2 - pLeft - pRight;
  const plotH = chartH2 - pTop - pBottom;

  // Linha base
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  // Escala Y (ignora dias sem dados / null)
  const valoresValidos = [...dados.consumoD, ...dados.geracaoD].filter(v => v != null);
  const maxVal = (valoresValidos.length ? Math.max(...valoresValidos) : 100) * 1.25;
  const scaleY = plotH / maxVal;
  const stepX  = plotW / dados.dias.length;
  const barW   = stepX * 0.35;

  // Linhas de grade horizontais
  [0.25, 0.5, 0.75, 1.0].forEach(pct => {
    const val = maxVal * pct;
    const gy  = (plotY + plotH) - (val * scaleY);
    const gl  = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, gy, plotX + plotW, gy);
    gl.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    gl.setDashStyle(SlidesApp.DashStyle.DASH);
    const yLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, gy - 6, pLeft - 3, 12);
    yLbl.getText().setText(Math.round(val).toString()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(6.5)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    yLbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });

  // Barras
  dados.dias.forEach((dia, i) => {
    const groupCX = plotX + (i * stepX) + (stepX / 2);
    const cVal = dados.consumoD[i];
    const gVal = dados.geracaoD[i];

    // Dia sem nenhum dado => "N/D" centralizado, sem barras
    if (cVal == null && gVal == null) {
      const nd = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
        groupCX - 25, (plotY + plotH) - 28, 50, 16);
      nd.getText().setText('N/D').getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(8).setBold(true)
        .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
      nd.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    } else {
      // Barra consumo (vermelho, esquerda) — só se houver valor
      if (cVal != null) {
        const hC  = cVal * scaleY;
        const bCx = groupCX - barW - 2;
        const bC  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
          bCx, (plotY + plotH) - hC, barW, hC);
        bC.getFill().setSolidFill(corConsumo);
        bC.getBorder().setTransparent();

        const tC = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
          bCx - 5, (plotY + plotH) - hC - 16, barW + 10, 14);
        tC.getText().setText(Math.round(cVal).toString()).getTextStyle()
          .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
          .setForegroundColor('#DC2626');
        tC.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      }

      // Barra geração (verde, direita) — só se houver valor
      if (gVal != null) {
        const hG  = gVal * scaleY;
        const bGx = groupCX + 2;
        const bG  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
          bGx, (plotY + plotH) - hG, barW, hG);
        bG.getFill().setSolidFill(corGeracao);
        bG.getBorder().setTransparent();

        const tG = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
          bGx - 5, (plotY + plotH) - hG - 16, barW + 10, 14);
        tG.getText().setText(Math.round(gVal).toString()).getTextStyle()
          .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
          .setForegroundColor('#059669');
        tG.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      }
    }

    // Rótulo eixo X (sempre)
    const xLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      groupCX - 20, plotY + plotH + 5, 40, 14);
    xLbl.getText().setText(dia).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7.5).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    xLbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
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
  footerRight.getText().setText('Página 12').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 11 (Sustentabilidade) concluído!");
}

// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só a Sustentabilidade, no escopo pedido. Serve para
// conferir um ajuste sem reprocessar o boletim inteiro. Sem parâmetro, para
// aparecer no menu "Selecionar função" do editor.
function verSustentabilidade() { return _bolVerSlide_('COMPLETO', 'Sustentabilidade'); }
