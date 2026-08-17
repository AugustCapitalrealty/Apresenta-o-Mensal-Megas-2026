/**
 * ARQUIVO: 04_quadro_manutencao.gs
 * Cria o slide "Manutenção Corretiva".
 * CORREÇÕES v2:
 *   - Locatários adicionado como KPI card superior (5 cards redistribuídos)
 *   - Legenda do gráfico refeita com shapes independentes (sem indexação frágil de caracteres)
 */

function gerarSlide05_QuadroManutencao() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth = presentation.getPageWidth(); 
  const pageHeight = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO E TRATAMENTO DE DADOS ---
  // =========================================================
  Logger.log("Extraindo dados para o Quadro de Manutenção...");

  let histFac = [0, 0, 0, 0], histProp = [0, 0, 0, 0], histOper = [0, 0, 0, 0];
  let timeline = ['-', '-', '-', '-'];
  let kpiFac = 0, kpiProp = 0, kpiOper = 0, kpiTot = 0;
  let valCorretivas = 0, valMelhorias = 0, valProjetos = 0, valLocatariosComp = 0;

  try {
    const ss1 = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet1 = ss1.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);

    if (sheet1) {
      const lastCol = sheet1.getLastColumn();
      const headerRow = sheet1.getRange(180, 1, 1, lastCol).getValues()[0];
      let targetCols = [];
      let tempTimeline = [];
      
      for (let i = headerRow.length - 1; i >= 1 && targetCols.length < 4; i--) {
        if (headerRow[i] && headerRow[i].toString().trim() !== "") {
          targetCols.unshift(i + 1);
          tempTimeline.unshift(headerRow[i].toString().trim().toUpperCase());
        }
      }
      
      while (tempTimeline.length < 4) tempTimeline.unshift("-");
      timeline = tempTimeline;

      const getValsFromCols = (rowNum) => {
        let vals = [];
        for (let col of targetCols) {
          let v = sheet1.getRange(rowNum, col).getValue();
          vals.push(Number(v) || 0);
        }
        while (vals.length < 4) vals.unshift(0);
        return vals;
      };

      // Histórico para o gráfico de barras (recortes mensais)
      histFac  = getValsFromCols(182);
      histProp = getValsFromCols(183);
      histOper = getValsFromCols(185);

      // Backlog atual — lido da tabela resumo (linha 37-40), não do histórico.
      // RESERVA: se a base bruta responder (bloco logo abaixo), estes valores
      // são substituídos. Ficam aqui para o slide não quebrar se a base
      // estiver fora do ar.
      kpiFac  = Number(sheet1.getRange('C37').getValue()) || 0;
      kpiProp = Number(sheet1.getRange('C38').getValue()) || 0;
      kpiOper = Number(sheet1.getRange('C39').getValue()) || 0;
      kpiTot  = Number(sheet1.getRange('C40').getValue()) || 0;

      // COMPOSIÇÃO POR TIPO continua vindo da planilha: a BD-CORRETIVAS não
      // tem coluna que separe Corretivas / Melhorias / Projetos (conferido no
      // cabeçalho real — "Tipo de reporte" é OPERATOR/CONTACT, "Tipo" é
      // área+sintoma). Só "Locatários" seria derivável. Ver o aviso de
      // reconciliação mais abaixo.
      valCorretivas     = Number(sheet1.getRange('G40').getValue()) || 0;
      valMelhorias      = Number(sheet1.getRange('D40').getValue()) || 0;
      valProjetos       = Number(sheet1.getRange('E40').getValue()) || 0;
      valLocatariosComp = Number(sheet1.getRange('F40').getValue()) || 0;

    } else {
      Logger.log("Aviso: Aba QUADRO COMPARATIVO não encontrada.");
    }
  } catch (e) {
    Logger.log("Erro ao extrair dados para Manutenção: " + e.message);
  }

  // --- FONTE PREFERENCIAL: BASE BRUTA (Dados.gs) ---------------------------
  // Os cinco cartões e o gráfico passam a sair da BD-CORRETIVAS, contados com
  // a mesma regra de "aberto". Com isso a soma FECHA por construção — cada
  // chamado cai em exatamente uma equipe — em vez de depender de quatro
  // células digitadas em lugares diferentes concordarem entre si.
  // Falhando a leitura, tudo continua com os valores da planilha lidos acima.
  let locFromBase = null;
  const q = (typeof obterQuadroCorretivasBoletim_ === 'function')
    ? obterQuadroCorretivasBoletim_(4) : null;
  if (q) {
    kpiFac  = q.kpis.facilities;
    kpiProp = q.kpis.property;
    kpiOper = q.kpis.operacao;
    kpiTot  = q.kpis.total;
    locFromBase = q.kpis.locatarios;

    histFac  = q.historico.map(function (h) { return h.FACILITIES; });
    histProp = q.historico.map(function (h) { return h.PROPERTY;   });
    histOper = q.historico.map(function (h) { return h.OPERACAO;   });
    timeline = q.meses;

    Logger.log('Slide 05: fonte = BD-CORRETIVAS. Fila hoje ' + kpiTot +
               ' (Fac ' + kpiFac + ' / Prop ' + kpiProp + ' / Loc ' + locFromBase +
               ' / Oper ' + kpiOper + ').');

    // A composição por tipo vem de OUTRA fonte (planilha) e por isso pode não
    // fechar com o total. Avisar é melhor que a divergência aparecer na
    // reunião: o slide já saiu com 465 na composição e 504 nos cartões.
    const somaTipo = valCorretivas + valMelhorias + valProjetos + valLocatariosComp;
    if (somaTipo && somaTipo !== kpiTot) {
      Logger.log('⚠️ Slide 05: "Composição por tipo" soma ' + somaTipo +
                 ' mas o backlog é ' + kpiTot + ' (diferença de ' + (kpiTot - somaTipo) +
                 '). São fontes diferentes: a composição é digitada em D40:G40 e a ' +
                 'BD-CORRETIVAS não tem coluna que separe Melhorias/Projetos.');
    }
  } else {
    Logger.log('Slide 05: base bruta indisponível — usando os valores digitados na planilha.');
  }

  // --- MATEMÁTICA DOS KPIs SUPERIORES ---
  const facCur  = kpiFac;
  const propCur = kpiProp;
  const operCur = kpiOper;
  // Locatários: da base quando ela responde (Responsabilidade Locatário na
  // coluna Responsáveis); senão a célula F40.
  const locCur  = (locFromBase !== null) ? locFromBase : valLocatariosComp;
  const totCur  = kpiTot;

  // Variação vs período anterior: mesma conta em dois instantes, na mesma
  // base. Antes era o cartão (tabela resumo) contra o histórico (linha 182) —
  // duas fontes, então a seta podia mostrar movimento que não houve.
  const totPrev  = q ? q.kpis.totalAnterior : (histFac[2] + histProp[2] + histOper[2]);
  const diffTot  = totCur - totPrev;

  const formatTrend = (diff) => {
    if (diff > 0) return '↑ +' + diff;
    if (diff < 0) return '↓ ' + diff;
    return '= 0';
  };

  const getPct = (val) => totCur > 0 ? Math.round((val / totCur) * 100) + '% do total' : '0% do total';

  // ✅ CORREÇÃO 1: 5 cards agora — inclui Locatários
  const metricsTop = [
    { title: 'Backlog Total', val: totCur,  sub: formatTrend(diffTot) + ' vs per. ant.', col: CR_DESIGN_SYSTEM.colors.brandDark,  main: true  },
    { title: 'Facilities',   val: facCur,  sub: getPct(facCur),                          col: CR_DESIGN_SYSTEM.colors.brandSoft,                          main: false },
    { title: 'Property',     val: propCur, sub: getPct(propCur),                         col: CR_DESIGN_SYSTEM.colors.brandMed,   main: false },
    { title: 'Locatários',   val: locCur,  sub: getPct(locCur),                          col: CR_DESIGN_SYSTEM.colors.accentOrange, main: false },
    { title: 'Operação Hangar', val: operCur, sub: getPct(operCur),                         col: CR_DESIGN_SYSTEM.colors.brandLight, main: false }
  ];

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO PADRONIZADO ---
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

  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40);
  titleBox.getText().setText('Manutenção Corretiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24).setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  const subtitleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30);
  subtitleBox.getText().setText('Visão Executiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // --- LINHA DE KPI CARDS SUPERIORES (5 cards) ---
  const kpiY = marginY + 75;
  const kpiH = 65;
  const kpiGap = 10;
  // ✅ Redistribui largura para 5 cards
  const kpiWidth = (pageWidth - (marginX * 2) - (kpiGap * 4)) / 5;

  function drawKpiCard(x, title, value, subText, color, isMain = false) {
    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, kpiWidth, kpiH);
    card.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
    card.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    
    const sideBorder = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, 4, kpiH);
    sideBorder.getFill().setSolidFill(color);
    sideBorder.getBorder().setTransparent();

    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, kpiY + 8, kpiWidth - 15, kpiH - 10);
    box.getText().setText(title.toUpperCase() + '\n' + value + '\n' + subText);
    const txt = box.getText();
    txt.getParagraphStyle().setLineSpacing(105);
    
    txt.getRange(0, title.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    txt.getRange(title.length + 1, title.length + 1 + value.toString().length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(18).setBold(true).setForegroundColor(isMain ? color : CR_DESIGN_SYSTEM.colors.textMain);
    txt.getRange(title.length + 1 + value.toString().length + 1, txt.getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(subText.includes('↑') ? CR_DESIGN_SYSTEM.colors.accentRed : CR_DESIGN_SYSTEM.colors.textBody);
  }

  metricsTop.forEach((m, i) => {
    drawKpiCard(marginX + (i * (kpiWidth + kpiGap)), m.title, m.val, m.sub, m.col, m.main);
  });

  // =========================================================
  // --- 2. ÁREA CENTRAL (GRÁFICO DE BARRAS + RANKING) ---
  // =========================================================
  const mainAreaY = kpiY + kpiH + 15;
  const mainAreaH = pageHeight - mainAreaY - marginY - 20; 
  
  const sideWidth = 290; 
  const chartWidth = (pageWidth - (marginX * 2)) - sideWidth - 15;

  // 2.1. MARCO DO GRÁFICO
  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, mainAreaY, chartWidth, mainAreaH);
  chartFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  chartFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, mainAreaY + 12, 300, 25).getText()
    .setText('COMPORTAMENTO DA FILA ACUMULADA').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  // ✅ LEGENDA CORRIGIDA — shapes independentes com espaçamento proporcional
  const legendItems = [
    { label: 'FACILITIES', color: CR_DESIGN_SYSTEM.colors.brandSoft },
    { label: 'PROPERTY',   color: CR_DESIGN_SYSTEM.colors.brandDark },
    { label: 'OPERAÇÃO HANGAR',   color: CR_DESIGN_SYSTEM.colors.brandLight }
  ];
  const legendY = mainAreaY + 40;
  let legendCursorX = marginX + 20;

  legendItems.forEach((item) => {
    const itemH = 10;

    // Quadradinho colorido — mesma linha Y do texto
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legendCursorX, legendY, itemH, itemH);
    sq.getFill().setSolidFill(item.color);
    sq.getBorder().setTransparent();

    // Texto imediatamente ao lado, alinhado verticalmente ao centro
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + itemH + 4, legendY - 2, 62, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Avança: quadrado(10) + gap(4) + texto(62) + espaço entre itens(14)
    legendCursorX += 90;
  });

  // --- DESENHO DO GRÁFICO DE BARRAS AGRUPADAS ---
  const pMarginX = 50, pMarginY = 55;
  const plotX = marginX + pMarginX;
  const plotY = mainAreaY + pMarginY;
  const plotW = chartWidth - (pMarginX * 2);
  const plotH = mainAreaH - (pMarginY + 35);
  
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
  
  const stepX = plotW / (timeline.length - 1);
  
  timeline.forEach((m, i) => {
    const x = plotX + (i * stepX);
    const vLine = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, plotY, x, plotY + plotH);
    vLine.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    vLine.setDashStyle(SlidesApp.DashStyle.DASH);
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - 50, plotY + plotH + 5, 100, 20);
    lbl.getText().setText(m).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(8).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  const barW = 12; 
  const barSeries = [
    { color: CR_DESIGN_SYSTEM.colors.brandSoft,                          values: histFac,  xOffset: -20 }, 
    { color: CR_DESIGN_SYSTEM.colors.brandDark,  values: histProp, xOffset: -6  }, 
    { color: CR_DESIGN_SYSTEM.colors.brandLight, values: histOper, xOffset:  8  } 
  ];

  const maxChartVal = Math.max(...histFac, ...histProp, ...histOper, 10);
  const scaleYLine = plotH / (maxChartVal * 1.4); 

  barSeries.forEach(series => {
    for (let i = 0; i < series.values.length; i++) {
      const val = series.values[i];
      const actualHeight = Math.max(val * scaleYLine, 1); 
      const xCenterGroup = plotX + (i * stepX);
      const bX = xCenterGroup + series.xOffset;
      const bY = (plotY + plotH) - actualHeight;
      
      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bX, bY, barW, actualHeight);
      rect.getFill().setSolidFill(series.color);
      rect.getBorder().setTransparent();
      
      // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra do CLAUDE.md):
      // a TEXT_BOX tem ~7pt de recuo interno de cada lado que a API não deixa
      // desligar. Numa caixa de 32pt isso deixa ~18pt úteis, e um valor de 3
      // dígitos quebrava a linha — a TV do boletim chegou a mostrar "29" em
      // cima de uma barra de 329, com o "3" empurrado para fora. A caixa
      // (invisível) é alargada simetricamente; a barra e o espaçamento não
      // mudam. setLineSpacing(100) impede que uma quebra residual empurre o
      // número para longe da barra.
      const folga = 16;
      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
        bX - 10 - folga, bY - 14, barW + 20 + folga * 2, 15);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true).setForegroundColor(series.color);
      txtBox.getText().getParagraphStyle()
        .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(100);
    }
  });

  // 2.2. RANKING DE COMPOSIÇÃO POR TIPO
  const rankCardX = marginX + chartWidth + 15;
  const rankFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rankCardX, mainAreaY, sideWidth, mainAreaH);
  rankFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  rankFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rankCardX + 15, mainAreaY + 12, sideWidth - 30, 25).getText()
    .setText('COMPOSIÇÃO POR TIPO').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  // Base = D40+E40+F40+G40 = 471 = C40 — fecha exato com a planilha
  const rankTot = valCorretivas + valMelhorias + valProjetos + valLocatariosComp;
  const getRankPct    = (val) => rankTot > 0 ? Math.round((val / rankTot) * 100) : 0;
  const getRankFactor = (val) => rankTot > 0 ? (val / rankTot) : 0;

  const rankData = [
    { label: 'CORRETIVAS',            val: valCorretivas,     pct: getRankPct(valCorretivas)     + '%', color: CR_DESIGN_SYSTEM.colors.brandDark,    factor: getRankFactor(valCorretivas)     },
    { label: 'MELHORIAS /\nPROJETOS', val: valMelhorias,      pct: getRankPct(valMelhorias)      + '%', color: CR_DESIGN_SYSTEM.colors.accentOrange, factor: getRankFactor(valMelhorias)      },
    { label: 'PROJETOS',              val: valProjetos,        pct: getRankPct(valProjetos)        + '%', color: CR_DESIGN_SYSTEM.colors.brandMed,     factor: getRankFactor(valProjetos)        },
    { label: 'LOCATÁRIOS',            val: valLocatariosComp, pct: getRankPct(valLocatariosComp) + '%', color: CR_DESIGN_SYSTEM.colors.brandLight,   factor: getRankFactor(valLocatariosComp) }
  ];

  // Calcula rowH dinamicamente para caber todos os itens dentro do painel
  const rankHeaderH = 45;
  const rankGap     = 6;
  const rowH = Math.floor((mainAreaH - rankHeaderH - (rankGap * (rankData.length - 1))) / rankData.length);
  let currentRankY = mainAreaY + rankHeaderH;
  
  const labelX   = rankCardX + 10;
  const dataX    = rankCardX + 95; 
  const barX     = rankCardX + 155;  
  const maxBarWidth = sideWidth - (barX - rankCardX) - 15; 

  rankData.forEach((d) => {
    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, labelX, currentRankY, 80, rowH);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lblBox.getText().setText(d.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(6.5).setBold(true).setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain);

    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX, currentRankY, 55, rowH);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    valBox.getText().setText(d.val + " (" + d.pct + ")").getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7.5).setBold(true).setForegroundColor(d.color);

    const barHeight = (d.label === 'CORRETIVAS') ? 12 : 8;
    const barYOffset = (rowH / 2) - (barHeight / 2);
    
    const bgBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOffset, maxBarWidth, barHeight);
    bgBar.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines, 0.4);
    bgBar.getBorder().setTransparent();
    
    const progressW = maxBarWidth * d.factor;
    if (progressW > 0.5) { 
      const progressBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOffset, progressW, barHeight);
      progressBar.getFill().setSolidFill(d.color);
      progressBar.getBorder().setTransparent();
    }

    currentRankY += rowH + rankGap;
  });

  // =========================================================
  // --- RODAPÉ E PAGINAÇÃO PADRONIZADOS ---
  // =========================================================
  const footerY = pageHeight - 25;
  const footerLeft = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20);
  footerLeft.getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 05').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 04 concluído! 5 KPI cards, legenda robusta com shapes independentes.");
}

// =========================================================
// VARIANTE FACILITIES — sem Operação Hangar
// =========================================================
function gerarSlide05_QuadroManutencao_Facilities() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  let histFac = [0,0,0,0], histProp = [0,0,0,0];
  let timeline = ['-','-','-','-'];
  let kpiFac = 0, kpiProp = 0, kpiTot = 0;
  let valCorretivas = 0, valMelhorias = 0, valProjetos = 0, valLocatariosComp = 0;

  try {
    const ss1    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet1 = ss1.getSheetByName(CR_DESIGN_SYSTEM.assets.sheetName);

    if (sheet1) {
      const lastCol   = sheet1.getLastColumn();
      const headerRow = sheet1.getRange(180, 1, 1, lastCol).getValues()[0];
      let targetCols = [], tempTimeline = [];
      for (let i = headerRow.length - 1; i >= 1 && targetCols.length < 4; i--) {
        if (headerRow[i] && headerRow[i].toString().trim() !== "") {
          targetCols.unshift(i + 1);
          tempTimeline.unshift(headerRow[i].toString().trim().toUpperCase());
        }
      }
      while (tempTimeline.length < 4) tempTimeline.unshift("-");
      timeline = tempTimeline;

      const getValsFromCols = (rowNum) => {
        let vals = [];
        for (let col of targetCols) {
          vals.push(Number(sheet1.getRange(rowNum, col).getValue()) || 0);
        }
        while (vals.length < 4) vals.unshift(0);
        return vals;
      };

      histFac  = getValsFromCols(182);
      histProp = getValsFromCols(183);

      kpiFac  = Number(sheet1.getRange('C37').getValue()) || 0;
      kpiProp = Number(sheet1.getRange('C38').getValue()) || 0;
      // Facilities: total sem Hangar
      kpiTot  = kpiFac + kpiProp;

      valCorretivas     = Number(sheet1.getRange('G40').getValue()) || 0;
      valMelhorias      = Number(sheet1.getRange('D40').getValue()) || 0;
      valProjetos       = Number(sheet1.getRange('E40').getValue()) || 0;
      valLocatariosComp = Number(sheet1.getRange('F40').getValue()) || 0;
    }
  } catch(e) {
    Logger.log("Erro Facilities Corretiva: " + e.message);
  }

  const facCur  = kpiFac;
  const propCur = kpiProp;
  const totCur  = kpiTot;
  const totPrev = histFac[2] + histProp[2];
  const diffTot = totCur - totPrev;

  const formatTrend = (diff) => diff > 0 ? '↑ +' + diff : diff < 0 ? '↓ ' + diff : '= 0';
  const getPct      = (val)  => totCur > 0 ? Math.round((val / totCur) * 100) + '% do total' : '0%';

  // 4 cards — sem Hangar
  const metricsTop = [
    { title: 'Backlog Total', val: totCur,  sub: formatTrend(diffTot) + ' vs per. ant.', col: CR_DESIGN_SYSTEM.colors.brandDark, main: true  },
    { title: 'Facilities',   val: facCur,  sub: getPct(facCur),                          col: CR_DESIGN_SYSTEM.colors.brandSoft,                         main: false },
    { title: 'Property',     val: propCur, sub: getPct(propCur),                         col: CR_DESIGN_SYSTEM.colors.brandMed,  main: false },
    { title: 'Locatários',   val: valLocatariosComp, sub: Math.round((valLocatariosComp/totCur||0)*100)+'% do total', col: CR_DESIGN_SYSTEM.colors.accentOrange, main: false },
  ];

  // Setup visual — idêntico ao original
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
    .getText().setText('Visão Executiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // KPI cards (4)
  const kpiY = marginY + 75, kpiH = 65, kpiGap = 10;
  const kpiWidth = (pageWidth - (marginX * 2) - (kpiGap * 3)) / 4;

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

  // Gráfico de barras — só Facilities e Property
  const mainAreaY = kpiY + kpiH + 15;
  const mainAreaH = pageHeight - mainAreaY - marginY - 20;
  const sideWidth = 290;
  const chartWidth = (pageWidth - (marginX * 2)) - sideWidth - 15;

  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, mainAreaY, chartWidth, mainAreaH);
  chartFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  chartFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, mainAreaY + 12, 300, 25).getText()
    .setText('COMPORTAMENTO DA FILA ACUMULADA').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  // Legenda — só 2 séries
  const legendItems = [
    { label: 'FACILITIES', color: CR_DESIGN_SYSTEM.colors.brandSoft },
    { label: 'PROPERTY',   color: CR_DESIGN_SYSTEM.colors.brandDark },
  ];
  const legendY = mainAreaY + 40;
  let legendCursorX = marginX + 20;
  legendItems.forEach(item => {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legendCursorX, legendY, 10, 10);
    sq.getFill().setSolidFill(item.color); sq.getBorder().setTransparent();
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + 14, legendY - 2, 70, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legendCursorX += 90;
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

  const barW = 14;
  const barSeries = [
    { color: CR_DESIGN_SYSTEM.colors.brandSoft,                         values: histFac,  xOffset: -10 },
    { color: CR_DESIGN_SYSTEM.colors.brandDark, values: histProp, xOffset:  4  },
  ];
  const maxChartVal = Math.max(...histFac, ...histProp, 10);
  const scaleYLine  = plotH / (maxChartVal * 1.4);

  barSeries.forEach(series => {
    for (let i = 0; i < series.values.length; i++) {
      const val = series.values[i];
      const h   = Math.max(val * scaleYLine, 1);
      const bX  = plotX + (i * stepX) + series.xOffset;
      const bY  = (plotY + plotH) - h;
      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bX, bY, barW, h);
      rect.getFill().setSolidFill(series.color); rect.getBorder().setTransparent();
      // Mesma folga do gráfico acima — caixa de 24pt não cabe 3 dígitos.
      const folgaF = 16;
      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bX - 5 - folgaF, bY - 14, barW + 10 + folgaF * 2, 14);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
        .setForegroundColor(series.color);
      txtBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
  });

  // Composição por Tipo (igual ao original)
  const rankCardX   = marginX + chartWidth + 15;
  const rankFrame   = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rankCardX, mainAreaY, sideWidth, mainAreaH);
  rankFrame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  rankFrame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rankCardX + 15, mainAreaY + 12, sideWidth - 30, 25).getText()
    .setText('COMPOSIÇÃO POR TIPO').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);

  const rankTot       = valCorretivas + valMelhorias + valProjetos + valLocatariosComp;
  const getRankPct    = (val) => rankTot > 0 ? Math.round((val / rankTot) * 100) : 0;
  const getRankFactor = (val) => rankTot > 0 ? val / rankTot : 0;

  const rankData = [
    { label: 'CORRETIVAS',            val: valCorretivas,     pct: getRankPct(valCorretivas)     + '%', color: CR_DESIGN_SYSTEM.colors.brandDark,    factor: getRankFactor(valCorretivas)     },
    { label: 'MELHORIAS /\nPROJETOS', val: valMelhorias,      pct: getRankPct(valMelhorias)      + '%', color: CR_DESIGN_SYSTEM.colors.accentOrange, factor: getRankFactor(valMelhorias)      },
    { label: 'PROJETOS',              val: valProjetos,        pct: getRankPct(valProjetos)        + '%', color: CR_DESIGN_SYSTEM.colors.brandMed,     factor: getRankFactor(valProjetos)        },
    { label: 'LOCATÁRIOS',            val: valLocatariosComp, pct: getRankPct(valLocatariosComp) + '%', color: CR_DESIGN_SYSTEM.colors.brandLight,   factor: getRankFactor(valLocatariosComp) },
  ];

  const rankHeaderH = 45, rankGap = 6;
  const rowH = Math.floor((mainAreaH - rankHeaderH - (rankGap * (rankData.length - 1))) / rankData.length);
  let currentRankY  = mainAreaY + rankHeaderH;
  const labelX = rankCardX + 10, dataX = rankCardX + 95, barX = rankCardX + 155;
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
    const barH2 = (d.label === 'CORRETIVAS') ? 12 : 8;
    const barYOff = (rowH / 2) - (barH2 / 2);
    const bgBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOff, maxBarWidth, barH2);
    bgBar.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines, 0.4); bgBar.getBorder().setTransparent();
    const pw = maxBarWidth * d.factor;
    if (pw > 0.5) {
      const pb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, currentRankY + barYOff, pw, barH2);
      pb.getFill().setSolidFill(d.color); pb.getBorder().setTransparent();
    }
    currentRankY += rowH + rankGap;
  });

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

  Logger.log("✅ Slide 05 Facilities (sem Hangar) concluído!");
}