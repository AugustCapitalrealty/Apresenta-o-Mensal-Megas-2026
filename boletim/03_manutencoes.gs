/**
 * ARQUIVO: 03_manutencoes.gs
 * Estratifica os KPIs de manutenção por empreendimento em formato de Cartões Horizontais.
 * MELHORIAS v2:
 *   - Badge ⚠ vermelho em indicadores de disponibilidade abaixo da meta (90%)
 *   - Sombra sutil simulada nos cards (retângulo cinza deslocado atrás)
 */

function gerarSlide04_Manutencoes(apenasMegas = false) {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth = presentation.getPageWidth(); 
  const pageHeight = presentation.getPageHeight();

  // --- LER DADOS DA PLANILHA ---
  const unidades = {
    "CURITIBA": { nome: "MEGA CURITIBA",         tFalhas: "N/D", tReparo: "N/D", disp30: "N/D", dispAno: "N/D", conf: "N/D" },
    "ITAJAÍ":   { nome: "MEGA ITAJAÍ",           tFalhas: "N/D", tReparo: "N/D", disp30: "N/D", dispAno: "N/D", conf: "N/D" },
    "ESTEIO":   { nome: "MEGA ESTEIO",           tFalhas: "N/D", tReparo: "N/D", disp30: "N/D", dispAno: "N/D", conf: "N/D" },
    "OUTROS":   { nome: "OUTROS IMÓVEIS ESTEIO", tFalhas: "N/D", tReparo: "N/D", disp30: "N/D", dispAno: "N/D", conf: "N/D" }
  };

  try {
    const ss = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);
    if (!sheet) throw new Error("Aba não encontrada.");
    const data = sheet.getRange('B11:I25').getDisplayValues();
    
    for (let i = 0; i < data.length; i++) {
      const nomeLinha = (data[i][0] || "").toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!nomeLinha) continue;
      if (nomeLinha.includes("TOTAL GERAL")) break;

      let chaveEncontrada = null;
      if (nomeLinha.includes("MEGA CURITIBA"))   chaveEncontrada = "CURITIBA";
      else if (nomeLinha.includes("MEGA ITAJAI")) chaveEncontrada = "ITAJAÍ";
      else if (nomeLinha.includes("MEGA ESTEIO")) chaveEncontrada = "ESTEIO";
      else if (nomeLinha.includes("OUTROS IMOVEIS")) chaveEncontrada = "OUTROS";

      if (chaveEncontrada && unidades[chaveEncontrada].tFalhas === "N/D") {
        const val = (v) => (v && v.toString().trim() !== "" ? v : "N/D");
        unidades[chaveEncontrada].tFalhas = val(data[i][1]); 
        unidades[chaveEncontrada].tReparo = val(data[i][2]); 
        unidades[chaveEncontrada].disp30  = val(data[i][3]); 
        unidades[chaveEncontrada].dispAno = val(data[i][4]); 
        unidades[chaveEncontrada].conf    = val(data[i][5]); 
      }
    }
  } catch(e) {
    Logger.log("Erro ao ler planilha: " + e.message);
  }

  // --- SETUP VISUAL ---
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  // --- CABEÇALHO PADRONIZADO ---
  const logoWidth = CR_DESIGN_SYSTEM.assets.logoW, logoHeight = CR_DESIGN_SYSTEM.assets.logoH;
  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - logoWidth, marginY, logoWidth, logoHeight);
  } catch(e) {}

  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40);
  titleBox.getText().setText('Estratificação de Manutenções').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24).setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30);
  subtitleBox.getText().setText('Visão Detalhada por Ativo • Indicadores Críticos de Performance').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // --- LAYOUT DOS CARTÕES ---
  const cardW = pageWidth - (marginX * 2);
  const startY = 95; 
  const footerNoteSpace = 95; 
  const gap = 12; 
  const availableHeight = pageHeight - startY - footerNoteSpace;
  const cardH = (availableHeight - (gap * 3)) / 4; 

  const contentStartX = marginX + 160; 
  const contentEndX = pageWidth - marginX - 20;
  const contentW = contentEndX - contentStartX;
  const colW = contentW / 5;

  const ordemUnidades = apenasMegas
    ? [unidades["CURITIBA"], unidades["ITAJAÍ"], unidades["ESTEIO"]]
    : [unidades["CURITIBA"], unidades["ITAJAÍ"], unidades["ESTEIO"], unidades["OUTROS"]];

  // =========================================================
  // Helpers
  // =========================================================

  /**
   * Retorna true se o valor percentual estiver abaixo da meta (90%)
   */
  function isAbaixoDaMeta(value) {
    if (!value || value === "N/D" || value === "-") return false;
    const num = parseFloat(value.replace('%', '').replace(',', '.'));
    return !isNaN(num) && num < 90;
  }

  ordemUnidades.forEach((unidade, index) => {
    const y = startY + (index * (cardH + gap));

    // ✅ MELHORIA 2: Sombra simulada (retângulo cinza deslocado 3px para baixo e direita)
    const shadow = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX + 3, y + 3, cardW, cardH);
    shadow.getFill().setSolidFill('#D1D5DB', 0.5);
    shadow.getBorder().setTransparent();

    // Card principal
    const cardBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, y, cardW, cardH);
    cardBg.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
    cardBg.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    
    const sideBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, y, 4, cardH);
    sideBar.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandMed);
    sideBar.getBorder().setTransparent();

    // Nome da unidade
    slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 12, y + (cardH/2) - 12, 140, 24)
      .getText().setText(unidade.nome).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(8).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);

    // Divisores internos
    const bar1X = contentStartX + (colW * 2.1);
    slide.insertLine(SlidesApp.LineCategory.STRAIGHT, bar1X, y + 10, bar1X, y + cardH - 10).getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    
    const bar2X = contentStartX + (colW * 5.1);
    slide.insertLine(SlidesApp.LineCategory.STRAIGHT, bar2X, y + 10, bar2X, y + cardH - 10).getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

    /**
     * Desenha um KPI com label + valor, e badge ⚠ se abaixo da meta
     */
    function addKpiRelative(colIndex, label, value, metaCheck = false) {
      const boxWidth = 85; 
      const targetX = contentStartX + (colW * colIndex) + (colW / 2);
      const boxX = targetX - (boxWidth / 2);
      
      let finalLabel = label;
      if (!label.includes('\n')) finalLabel = '\n' + label;

      const abaixo = metaCheck && isAbaixoDaMeta(value);

      // ✅ MELHORIA 1: Adiciona ⚠ ao valor se estiver abaixo da meta
      const displayValue = abaixo ? value + ' ⚠' : value;

      const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, boxX, y + (cardH/2) - 22, boxWidth, 42);
      box.getText().setText(finalLabel + '\n' + displayValue);
      
      const text = box.getText();
      text.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      
      const labelAndSkipRange = text.getRange(0, finalLabel.length + 1);
      labelAndSkipRange.getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(5).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
      
      const valRange = text.getRange(finalLabel.length + 1, text.getLength());
      valRange.getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10.5).setBold(true);
      
      // Cor do valor
      let valColor = CR_DESIGN_SYSTEM.colors.brandDark;
      if (metaCheck && value !== "N/D" && value !== "-") {
        const valFloat = parseFloat(value.replace('%','').replace(',','.'));
        if (!isNaN(valFloat)) {
          valColor = valFloat < 90 ? CR_DESIGN_SYSTEM.colors.accentRed : CR_DESIGN_SYSTEM.colors.accentGreen;
        }
      }
      
      valRange.getTextStyle().setForegroundColor(valColor);
      box.getText().getParagraphStyle().setLineSpacing(100);
    }

    addKpiRelative(0, 'TEMPO ENTRE\nFALHAS (DIAS)', unidade.tFalhas);
    addKpiRelative(1, 'TEMPO DE\nREPARO (DIAS)', unidade.tReparo);
    addKpiRelative(2, 'DISPONIBILIDADE\n30 DIAS',  unidade.disp30,  true);
    addKpiRelative(3, 'DISPONIBILIDADE\nANO',       unidade.dispAno, true);
    addKpiRelative(4, 'CONFIABILIDADE',             unidade.conf);
  });

  // GLOSSÁRIO
  const glossaryText = 
    "TEMPO ENTRE FALHAS: indica a cada quantos dias um chamado é aberto em itens críticos (avarias).\n" +
    "TEMPO DE REPARO: indica o tempo médio de reparo dos chamados (avarias) nos itens críticos.\n" +
    "ÍNDICE DE DISPONIBILIDADE: indica percentual de tempo em que todos os itens críticos estiveram em condições de operar, sem interrupções.\n" +
    "ÍNDICE DE CONFIABILIDADE: indica a probabilidade dos itens críticos funcionarem sem chamados (avarias) nos próximos 30 dias.";

  const glossY = pageHeight - 95;
  const glossaryBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, glossY, pageWidth - (marginX * 2), 75);
  glossaryBox.getText().setText(glossaryText);
  glossaryBox.getText().getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(5.5).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  glossaryBox.getText().getParagraphStyle().setLineSpacing(115);

  // --- RODAPÉ E PAGINAÇÃO PADRONIZADOS ---
  const footerY = pageHeight - 25;
  const footerLeft = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20);
  footerLeft.getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 04').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 03 concluído! Badge ⚠ em indicadores abaixo da meta e sombra nos cards.");
}