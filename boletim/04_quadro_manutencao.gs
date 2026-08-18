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
  let kpiFac = 0, kpiProp = 0, kpiOper = 0, kpiTot = 0, kpiLocatario = 0;
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

      // Backlog atual — tabela EQUIPE (linhas 37-41):
      // C37=Facilities, C38=Property, C39=Operação, C40=Resp. Locatário, C41=TOTAL
      kpiFac       = Number(sheet1.getRange('C37').getValue()) || 0;
      kpiProp      = Number(sheet1.getRange('C38').getValue()) || 0;
      kpiOper      = Number(sheet1.getRange('C39').getValue()) || 0;
      kpiLocatario = Number(sheet1.getRange('C40').getValue()) || 0;
      kpiTot       = Number(sheet1.getRange('C41').getValue()) || 0;

      // Composição por Tipo — tabela ACUMULADO, linha TOTAL (41):
      // D41=Melhoria/Projetos, E41=Projetos, F41=Resp. Locatário, G41=Corretivas
      valCorretivas     = Number(sheet1.getRange('G41').getValue()) || 0;
      valMelhorias      = Number(sheet1.getRange('D41').getValue()) || 0;
      valProjetos       = Number(sheet1.getRange('E41').getValue()) || 0;
      valLocatariosComp = Number(sheet1.getRange('F41').getValue()) || 0;

    } else {
      Logger.log("Aviso: Aba QUADRO COMPARATIVO não encontrada.");
    }
  } catch (e) {
    Logger.log("Erro ao extrair dados para Manutenção: " + e.message);
  }

  // --- FONTE PREFERENCIAL: BASE BRUTA (Dados.gs) ---------------------------
  // Os cinco cartões, o gráfico e a composição passam a sair da BD-CORRETIVAS,
  // contados com a mesma regra de "aberto". Com isso a soma FECHA por
  // construção — cada chamado cai em exatamente uma equipe e em exatamente uma
  // fatia — em vez de depender de células digitadas em lugares diferentes
  // concordarem entre si. Falhando a leitura, tudo continua com os valores da
  // planilha lidos acima.
  //
  // SÓ ESTE ESCOPO por enquanto: obterQuadroCorretivasBoletim_ conta a carteira
  // inteira e ainda não sabe recortar por Megas (Facilities) nem por Hangar.
  const q = (typeof obterQuadroCorretivasBoletim_ === 'function')
    ? obterQuadroCorretivasBoletim_(4) : null;
  if (q) {
    kpiFac       = q.kpis.facilities;
    kpiProp      = q.kpis.property;
    kpiOper      = q.kpis.operacao;
    kpiLocatario = q.kpis.locatarios;
    kpiTot       = q.kpis.total;

    histFac  = q.historico.map(function (h) { return h.FACILITIES; });
    histProp = q.historico.map(function (h) { return h.PROPERTY;   });
    histOper = q.historico.map(function (h) { return h.OPERACAO;   });
    timeline = q.meses;

    Logger.log('Slide 05: fonte = BD-CORRETIVAS. Fila hoje ' + kpiTot +
               ' (Fac ' + kpiFac + ' / Prop ' + kpiProp + ' / Loc ' + kpiLocatario +
               ' / Oper ' + kpiOper + ').');

    const somaComp = (q.composicao || []).reduce(function (a, c) { return a + c.val; }, 0);
    if (somaComp && somaComp !== kpiTot) {
      Logger.log('⚠️ Slide 05: composição soma ' + somaComp + ' mas o backlog é ' + kpiTot + '.');
    }
  } else {
    Logger.log('Slide 05: base bruta indisponível — usando os valores digitados na planilha.');
  }

  // --- MATEMÁTICA DOS KPIs SUPERIORES — fonte: tabela C37-C41 (backlog atual) ---
  const facCur  = kpiFac;
  const propCur = kpiProp;
  const operCur = kpiOper;
  const locCur  = kpiLocatario; // C40 — Responsabilidade Locatário (tabela EQUIPE)
  const totCur  = kpiTot;       // C41 — total real da planilha (tabela EQUIPE)

  // Variação vs período anterior: último vs penúltimo valor do histórico.
  // Vindo da base, os dois lados saem da MESMA contagem em dois instantes —
  // antes era o cartão (tabela resumo) contra o histórico (linha 182), duas
  // fontes, então a seta podia mostrar movimento que não houve.
  const facPrev  = histFac[histFac.length - 2];
  const propPrev = histProp[histProp.length - 2];
  const operPrev = histOper[histOper.length - 2];
  const totPrev  = q ? q.kpis.totalAnterior : (facPrev + propPrev + operPrev);
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
    // Caixa do tamanho da palavra — itens ficam juntos, sem espaço esticando a legenda.
    const textW = item.label.length * 6.2 + 8; // fator folgado p/ Montserrat (tema Mega) nao quebrar
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + itemH + 4, legendY - 2, textW, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Avança só o necessário: quadrado + gap + largura do texto + espaço entre itens
    legendCursorX += itemH + 4 + textW + 18;
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
    { color: CR_DESIGN_SYSTEM.colors.brandSoft,                          values: histFac,  xOffset: -24 }, 
    { color: CR_DESIGN_SYSTEM.colors.brandDark,  values: histProp, xOffset: -6  }, 
    { color: CR_DESIGN_SYSTEM.colors.brandLight, values: histOper, xOffset:  12 } 
  ];

  const maxChartVal = Math.max(...histFac, ...histProp, ...histOper, 10);
  const scaleYLine = plotH / (maxChartVal * 1.62); 

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
      
      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bX - 7, bY - 16, barW + 14, 14);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true).setForegroundColor(series.color);
      txtBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
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

  // Da base quando ela responde, senão D41+E41+F41+G41 (tabela ACUMULADO,
  // linha TOTAL). Os dois caminhos mostram a MESMA coisa; a diferença é que
  // pela base as fatias FECHAM com o backlog, porque cada chamado em aberto
  // cai em exatamente uma. Nas células as quatro contagens são independentes.
  // A regra de classificação é a mesma dos CONT.SES da planilha — ver
  // obterComposicaoTipoBoletim_ em Dados.gs.
  const COR_COMP = {
    'CORRETIVAS': CR_DESIGN_SYSTEM.colors.brandDark,
    'MELHORIAS':  CR_DESIGN_SYSTEM.colors.accentOrange,
    'PROJETOS':   CR_DESIGN_SYSTEM.colors.brandMed,
    'LOCATÁRIOS': CR_DESIGN_SYSTEM.colors.brandLight
  };

  let rankData;
  if (q && q.composicao && q.composicao.length) {
    const totalComp = q.composicao.reduce((a, c) => a + c.val, 0);
    rankData = q.composicao.map(c => ({
      label : c.label.toUpperCase(),
      val   : c.val,
      pct   : c.pct + '%',
      color : COR_COMP[c.label.toUpperCase()] || CR_DESIGN_SYSTEM.colors.brandSoft,
      // A barra é a fatia do backlog — o mesmo número do "%" escrito ao lado.
      factor: totalComp > 0 ? c.val / totalComp : 0
    }));
  } else {
    const rankTot = valCorretivas + valMelhorias + valProjetos + valLocatariosComp;
    const getRankPct    = (val) => rankTot > 0 ? Math.round((val / rankTot) * 100) : 0;
    const getRankFactor = (val) => rankTot > 0 ? (val / rankTot) : 0;
    // D41 é Melhorias e E41 é Projetos — são as duas fórmulas CONT.SES da
    // planilha ("*Melhoria*" e "*Consulta*"). O rótulo do D41 dizia
    // "MELHORIAS / PROJETOS" ao lado de uma linha "PROJETOS", o que deixava
    // duas linhas do painel parecendo a mesma coisa.
    rankData = [
      { label: 'CORRETIVAS', val: valCorretivas,     pct: getRankPct(valCorretivas)     + '%', color: COR_COMP['CORRETIVAS'], factor: getRankFactor(valCorretivas)     },
      { label: 'MELHORIAS',  val: valMelhorias,      pct: getRankPct(valMelhorias)      + '%', color: COR_COMP['MELHORIAS'],  factor: getRankFactor(valMelhorias)      },
      { label: 'PROJETOS',   val: valProjetos,       pct: getRankPct(valProjetos)       + '%', color: COR_COMP['PROJETOS'],   factor: getRankFactor(valProjetos)       },
      { label: 'LOCATÁRIOS', val: valLocatariosComp, pct: getRankPct(valLocatariosComp) + '%', color: COR_COMP['LOCATÁRIOS'], factor: getRankFactor(valLocatariosComp) }
    ];
  }

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

  // FACILITIES lê da aba "megas QUADRO COMPARATIVO" (dados só dos 3 Megas).
  let histFac = [], histProp = [];
  let timeline = [];
  let kpiFac = 0, kpiProp = 0, kpiTot = 0, kpiLocatario = 0;
  let valCorretivas = 0, valMelhorias = 0, valProjetos = 0, valLocatariosComp = 0;
  // Variação do backlog vs. semana anterior, por categoria (para as setas ▲/▼)
  let deltaFac = 0, deltaProp = 0, deltaLoc = 0, deltaTot = 0;

  try {
    const ss1    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet1 = ss1.getSheetByName('megas QUADRO COMPARATIVO');

    if (sheet1) {
      const lastCol = sheet1.getLastColumn();

      // --- Tabela MANUTENÇÃO CORRETIVA (linhas 26-29) ---
      // C=Backlog, D=Melhoria, E=Projetos, F=Corretivas
      kpiFac       = Number(sheet1.getRange('C26').getValue()) || 0; // Facilities backlog
      kpiProp      = Number(sheet1.getRange('C27').getValue()) || 0; // Property backlog
      kpiLocatario = Number(sheet1.getRange('C28').getValue()) || 0; // Resp. Locatário backlog
      kpiTot       = Number(sheet1.getRange('C29').getValue()) || 0; // TOTAL backlog

      // Composição por Tipo — linha TOTAL (29)
      valMelhorias      = Number(sheet1.getRange('D29').getValue()) || 0;
      valProjetos       = Number(sheet1.getRange('E29').getValue()) || 0;
      valCorretivas     = Number(sheet1.getRange('F29').getValue()) || 0;
      valLocatariosComp = kpiLocatario; // 4º item = backlog Resp. Locatário (C28)

      const somaCol = (rows, idx) => rows.reduce((s, r) => s + (Number(r[idx]) || 0), 0);

      // --- SETAS: seção POR MEGA SEMANAL (linhas 62-72) ---
      // Facilities: 66-68 | Property: 70-72 | Resp. Locatário: 62-64 (3 Megas cada).
      const facSem  = sheet1.getRange(66, 1, 3, lastCol).getValues();
      const propSem = sheet1.getRange(70, 1, 3, lastCol).getValues();
      const locSem  = sheet1.getRange(62, 1, 3, lastCol).getValues();
      let semCols = [];
      for (let i = 2; i < lastCol; i++) {
        if (facSem.some(r => r[i] !== "" && r[i] !== null && !isNaN(Number(r[i])) && Number(r[i]) !== 0)) {
          semCols.push(i);
        }
      }
      if (semCols.length >= 2) {
        const u = semCols[semCols.length - 1], p = semCols[semCols.length - 2];
        deltaFac  = somaCol(facSem, u)  - somaCol(facSem, p);
        deltaProp = somaCol(propSem, u) - somaCol(propSem, p);
        deltaLoc  = somaCol(locSem, u)  - somaCol(locSem, p);
        deltaTot  = deltaFac + deltaProp + deltaLoc;
      }

      // --- GRÁFICO: seção MENSAL (linhas 111-123) ---
      // Facilities: 117-119 | Property: 121-123 (IGNORA Mega Canoas, linha 124).
      // Cada mês = soma dos 3 Megas. Rótulo = nome do mês (linha 111).
      const facMes   = sheet1.getRange(117, 1, 3, lastCol).getValues();
      const propMes  = sheet1.getRange(121, 1, 3, lastCol).getValues();
      const mesesRow = sheet1.getRange(111, 1, 1, lastCol).getValues()[0];
      for (let i = 2; i < lastCol; i++) {
        if (facMes.some(r => r[i] !== "" && r[i] !== null && !isNaN(Number(r[i])) && Number(r[i]) !== 0)) {
          histFac.push(somaCol(facMes, i));
          histProp.push(somaCol(propMes, i));
          const raw = mesesRow[i];
          timeline.push(raw ? raw.toString().trim().substring(0, 3).toUpperCase() : "");
        }
      }
    }
  } catch(e) {
    Logger.log("Erro Facilities Corretiva (aba megas): " + e.message);
  }

  // Fallback: evita gráfico vazio se a seção POR MEGA não retornar dados
  if (histFac.length === 0) { histFac = [0]; histProp = [0]; timeline = ['-']; }

  const facCur  = kpiFac;
  const propCur = kpiProp;
  const totCur  = kpiTot;

  // Seta de tendência do backlog vs. semana anterior (▲ subiu / ▼ caiu)
  const setaTrend = (d) => d > 0 ? '▲ +' + d + ' vs sem. ant.'
                         : d < 0 ? '▼ ' + d + ' vs sem. ant.'
                         : '= sem. ant.';

  // 4 cards — sem Hangar, cada um com sua seta semanal
  const metricsTop = [
    { title: 'Backlog Total', val: totCur,       sub: setaTrend(deltaTot),  col: CR_DESIGN_SYSTEM.colors.brandDark,    main: true  },
    { title: 'Facilities',   val: facCur,       sub: setaTrend(deltaFac),  col: CR_DESIGN_SYSTEM.colors.brandSoft,                            main: false },
    { title: 'Property',     val: propCur,      sub: setaTrend(deltaProp), col: CR_DESIGN_SYSTEM.colors.brandMed,     main: false },
    { title: 'Locatários',   val: kpiLocatario, sub: setaTrend(deltaLoc),  col: CR_DESIGN_SYSTEM.colors.accentOrange, main: false },
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
      .setForegroundColor(subText.includes('▲') ? CR_DESIGN_SYSTEM.colors.accentRed : subText.includes('▼') ? CR_DESIGN_SYSTEM.colors.accentGreen : CR_DESIGN_SYSTEM.colors.textBody);
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
    const textW = item.label.length * 6.2 + 8; // fator folgado p/ Montserrat (tema Mega) nao quebrar
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legendCursorX + 14, legendY - 2, textW, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legendCursorX += 14 + textW + 18;
  });

  const pMarginX = 50, pMarginY = 55;
  const plotX = marginX + pMarginX, plotY = mainAreaY + pMarginY;
  const plotW = chartWidth - (pMarginX * 2), plotH = mainAreaH - pMarginY - 35;

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  // Eixo X adaptativo: agora são N semanas (até 8), não 4 meses fixos.
  const nPts  = Math.max(timeline.length, 1);
  const stepX = plotW / (nPts > 1 ? nPts - 1 : 1);
  const xFont = nPts > 5 ? 6 : 8;
  timeline.forEach((m, i) => {
    const x = plotX + (i * stepX);
    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, plotY, x, plotY + plotH);
    vl.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    vl.setDashStyle(SlidesApp.DashStyle.DASH);
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - 28, plotY + plotH + 5, 56, 20);
    lbl.getText().setText(m).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(xFont).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // Barras proporcionais ao espaço por ponto (mais semanas => barras mais finas),
  // centradas em cada ponto (Facilities à esquerda, Property à direita).
  const barW = Math.max(5, Math.min(14, Math.floor(stepX * 0.30)));
  const barSeries = [
    { color: CR_DESIGN_SYSTEM.colors.brandSoft, values: histFac,  xOffset: -(barW + 1) },
    { color: CR_DESIGN_SYSTEM.colors.brandDark, values: histProp, xOffset: 1 },
  ];
  const maxChartVal = Math.max(...histFac, ...histProp, 10);
  const scaleYLine  = plotH / (maxChartVal * 1.62);
  const lblFont = nPts > 5 ? 5.5 : 6.5;
  const lblBoxW = Math.max(26, barW + 12); // largura minima p/ 3 digitos nao cortarem

  barSeries.forEach(series => {
    for (let i = 0; i < series.values.length; i++) {
      const val = series.values[i];
      const h   = Math.max(val * scaleYLine, 1);
      const bX  = plotX + (i * stepX) + series.xOffset;
      const bY  = (plotY + plotH) - h;
      const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bX, bY, barW, h);
      rect.getFill().setSolidFill(series.color); rect.getBorder().setTransparent();
      const txtBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bX + (barW / 2) - (lblBoxW / 2), bY - 15, lblBoxW, 14);
      txtBox.getText().setText(val.toString()).getTextStyle()
        .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(lblFont).setBold(true)
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

  const rankTot       = valCorretivas + valMelhorias + valProjetos; // sem Locatários
  const getRankPct    = (val) => rankTot > 0 ? Math.round((val / rankTot) * 100) : 0;
  const getRankFactor = (val) => rankTot > 0 ? val / rankTot : 0;

  const rankData = [
    { label: 'CORRETIVAS',            val: valCorretivas,     pct: getRankPct(valCorretivas)     + '%', color: CR_DESIGN_SYSTEM.colors.brandDark,    factor: getRankFactor(valCorretivas)     },
    // D29 é Melhorias e E29 é Projetos (as duas fórmulas CONT.SES da
    // planilha). O rótulo dizia "MELHORIAS / PROJETOS" ao lado de uma linha
    // "PROJETOS" — duas linhas do painel pareciam a mesma coisa.
    { label: 'MELHORIAS',             val: valMelhorias,      pct: getRankPct(valMelhorias)      + '%', color: CR_DESIGN_SYSTEM.colors.accentOrange, factor: getRankFactor(valMelhorias)      },
    { label: 'PROJETOS',              val: valProjetos,        pct: getRankPct(valProjetos)        + '%', color: CR_DESIGN_SYSTEM.colors.brandMed,     factor: getRankFactor(valProjetos)        },
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

// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só a Manutenção Corretiva, no escopo pedido.
// Passam pelo motor do 00_Main.gs, que aplica e restaura o tema. Sem
// parâmetro, para aparecer no menu "Selecionar função" do editor.
function verManutencaoCorretiva()            { return _bolVerSlide_('COMPLETO',   'Manutenção Corretiva'); }
function verManutencaoCorretivaFacilities()  { return _bolVerSlide_('FACILITIES', 'Manutenção Corretiva'); }
function verManutencaoCorretivaHangar()      { return _bolVerSlide_('HANGAR',     'Manutenção Corretiva'); }
