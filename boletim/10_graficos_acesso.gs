/**
 * ARQUIVO: 10_graficos_acesso.gs
 * Cria 2 slides de gráficos de linha de Controle de Acesso.
 * SLIDE 10A: Fluxo de Acessos + Tempo de Acesso
 * SLIDE 10B: % Uso de Celular + % Fila Evitada
 * DADOS: Mockados — substituir pelas células reais depois
 */

// =========================================================
// LEITURA REAL DOS DADOS — Aba 2026 GRÁFICOS
// =========================================================
function _getDadosAcesso() {
  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetGraficosId);
    const sheet = ss.getSheetByName('2026 GRÁFICOS');
    if (!sheet) throw new Error("Aba 2026 GRÁFICOS não encontrada.");

    const lastCol = sheet.getLastColumn();

    // Função para pegar linha inteira e filtrar colunas com dado
    const getRowData = (rowNum) => sheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];

    // Cabeçalho de datas — linha 3 (fluxo), pegar só colunas com dado
    const headerRow = getRowData(3);

    // Descobrir quais colunas têm dados (baseado no fluxo CWB linha 4)
    const fluxoCwbRow = getRowData(4);
    let colIndexes = [];
    for (let i = 2; i < fluxoCwbRow.length; i++) {
      if (fluxoCwbRow[i] !== "" && fluxoCwbRow[i] !== null && fluxoCwbRow[i] !== 0) {
        colIndexes.push(i);
      }
    }

    // Gerar rótulos de semana DD/MM a partir das datas do cabeçalho
    const semanas = colIndexes.map(i => {
      const raw = headerRow[i];
      if (!raw) return "-";
      const d = raw instanceof Date ? raw : new Date(raw);
      if (isNaN(d.getTime())) return raw.toString().substring(0, 5);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return dd + '/' + mm;
    });

    // Detectar quebras de mês para linhas verticais
    const mesesNomes = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    let mesBreaks = [];
    let meses = [];
    let lastMes = -1;
    colIndexes.forEach((ci, idx) => {
      const raw = headerRow[ci];
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (isNaN(d.getTime())) return;
      const mes = d.getMonth();
      if (mes !== lastMes) {
        mesBreaks.push(idx);
        meses.push(mesesNomes[mes]);
        lastMes = mes;
      }
    });

    // Função para extrair valores de uma linha
    const getVals = (rowNum) => colIndexes.map(i => {
      const v = sheet.getRange(rowNum, i + 1).getValue();
      return Number(v) || 0;
    });

    // Função para converter tempo HH:MM:SS → minutos decimais
    const tempoParaMin = (v) => {
      if (!v) return 0;
      if (v instanceof Date) {
        return v.getHours() * 60 + v.getMinutes() + v.getSeconds() / 60;
      }
      const s = v.toString().trim();
      const parts = s.split(":");
      if (parts.length === 3) return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
      if (parts.length === 2) return parseInt(parts[0]) + parseInt(parts[1]) / 60;
      return parseFloat(s) || 0;
    };

    const tempoRow = (rowNum) => colIndexes.map(i => {
      const v = sheet.getRange(rowNum, i + 1).getValue();
      return tempoParaMin(v);
    });

    // Formatar minutos decimais → "Xm Ys"
    const minToStr = (min) => {
      const m = Math.floor(min);
      const s = Math.round((min - m) * 60);
      return m + 'm' + String(s).padStart(2,'0') + 's';
    };

    // Pegar último valor de uma linha para o resumo
    const lastVal = (rowNum) => {
      const row = getRowData(rowNum);
      for (let i = row.length - 1; i >= 0; i--) {
        if (row[i] !== "" && row[i] !== null) return row[i];
      }
      return "-";
    };

    const lastTempo = (rowNum) => minToStr(tempoParaMin(lastVal(rowNum)));
    const lastPct   = (rowNum) => {
      const v = lastVal(rowNum);
      if (!v || v === "-") return "-";
      let num = parseFloat(v.toString().replace('%','').replace(',','.'));
      if (isNaN(num)) return v.toString();
      // Valores em formato decimal (ex: 0.89 = 89%) — converter para porcentagem
      if (num > 0 && num <= 1) num = num * 100;
      return num.toFixed(2).replace('.',',') + '%';
    };
    const lastNum = (rowNum) => {
      const v = lastVal(rowNum);
      return !v || v === "-" ? "-" : Number(v).toLocaleString('pt-BR');
    };

    return {
      semanas,
      meses,
      mesBreaks,

      fluxo: {
        cwb: getVals(4),
        itj: getVals(5),
        est: getVals(6),
      },
      fluxoResume: {
        cwb:   lastNum(4),
        itj:   lastNum(5),
        est:   lastNum(6),
        total: lastNum(7),
      },

      tempo: {
        cwb: tempoRow(16),
        itj: tempoRow(17),
        est: tempoRow(18),
      },
      tempoResume: {
        cwb:   lastTempo(16),
        itj:   lastTempo(17),
        est:   lastTempo(18),
        media: lastTempo(19),
      },

      celular: {
        cwb: getVals(22).map(v => v * 100),
        itj: getVals(23).map(v => v * 100),
        est: getVals(24).map(v => v * 100),
      },
      celularResume: {
        cwb:   lastPct(22),
        itj:   lastPct(23),
        est:   lastPct(24),
        media: lastPct(25),
      },

      fila: {
        cwb: getVals(28).map(v => v * 100),
        itj: getVals(29).map(v => v * 100),
        est: getVals(30).map(v => v * 100),
      },
      filaResume: {
        cwb:   lastPct(28),
        itj:   lastPct(29),
        est:   lastPct(30),
        media: lastPct(31),
      },
    };

  } catch(e) {
    Logger.log("Erro ao ler dados gráficos: " + e.message);
    // Fallback mockado
    return _getMockDadosAcesso();
  }
}

// =========================================================
// SLIDE 10A — Fluxo + Tempo
// =========================================================
function gerarSlide10A_GraficosAcesso() {
  const d = _getDadosAcesso();
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  _desenharSlideGrafico(slide, pageWidth, pageHeight,
    'FLUXO DE ACESSOS', 'VISITANTES E MOTORISTAS',
    d.semanas, d.meses, d.mesBreaks,
    d.fluxo,
    { label: 'Semana atual', cwb: d.fluxoResume.cwb, itj: d.fluxoResume.itj, est: d.fluxoResume.est, total: d.fluxoResume.total },
    false,
    'TEMPO DE ACESSO', 'VISITANTES E MOTORISTAS',
    d.tempo,
    { label: 'Semana atual', cwb: d.tempoResume.cwb, itj: d.tempoResume.itj, est: d.tempoResume.est, media: d.tempoResume.media },
    true,
    'Página 10'
  );
  Logger.log("✅ Slide 10A concluído!");
}

// =========================================================
// SLIDE 10B — Celular + Fila
// =========================================================
function gerarSlide10B_GraficosAcesso() {
  const d = _getDadosAcesso();
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth  = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();

  _desenharSlideGrafico(slide, pageWidth, pageHeight,
    '% USO DE CELULAR', 'VISITANTES E MOTORISTAS',
    d.semanas, d.meses, d.mesBreaks,
    d.celular,
    { label: 'Semana atual', cwb: d.celularResume.cwb, itj: d.celularResume.itj, est: d.celularResume.est, media: d.celularResume.media },
    true,
    '% FILA EVITADA', 'VISITANTES E MOTORISTAS',
    d.fila,
    { label: 'Semana atual', cwb: d.filaResume.cwb, itj: d.filaResume.itj, est: d.filaResume.est, media: d.filaResume.media },
    true,
    'Página 11'
  );
  Logger.log("✅ Slide 10B concluído!");
}

// =========================================================
// FUNÇÃO AUXILIAR — Desenha o slide com 2 gráficos
// =========================================================
function _desenharSlideGrafico(slide, pageWidth, pageHeight,
  titulo1, subtitulo1, semanas, meses, mesBreaks, dados1, resume1, isPct1,
  titulo2, subtitulo2, dados2, resume2, isPct2,
  pagina) {

  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  // Logo
  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  // Título da página
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40)
    .getText().setText('Gráficos de Controle de Acesso').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMain).setBold(true);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 25)
    .getText().setText('Evolução Semanal por Empreendimento').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // ✅ Legenda única no cabeçalho — válida para os 2 gráficos
  const colors = {
    cwb: CR_DESIGN_SYSTEM.colors.brandDark,
    itj: '#1E40AF',
    est: CR_DESIGN_SYSTEM.colors.brandSoft
  };
  const legItems = [
    { label: 'Mega Centro Logístico Itajaí',  color: colors.itj },
    { label: 'Mega Centro Logístico Esteio',   color: colors.est },
    { label: 'Mega Centro Logístico Curitiba', color: colors.cwb },
  ];
  let legX = marginX;
  const legY = marginY + 55;
  legItems.forEach(item => {
    const legLine = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, legX, legY + 5, legX + 16, legY + 5);
    legLine.getLineFill().setSolidFill(item.color);
    legLine.setWeight(2);
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legX + 20, legY, 155, 12);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7.5)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legX += 175;
  });

  const chartAreaY = marginY + 72;
  const chartH = (pageHeight - chartAreaY - 30) / 2 - 5;
  const resumeW = 120;
  const chartW = pageWidth - (marginX * 2) - resumeW - 12;

  // Desenhar os 2 gráficos
  [
    { titulo: titulo1, subtitulo: subtitulo1, dados: dados1, resume: resume1, isPct: isPct1, y: chartAreaY },
    { titulo: titulo2, subtitulo: subtitulo2, dados: dados2, resume: resume2, isPct: isPct2, y: chartAreaY + chartH + 10 }
  ].forEach(g => {
    _desenharGraficoLinha(slide, marginX, g.y, chartW, chartH,
      g.titulo, g.subtitulo, semanas, meses, mesBreaks,
      g.dados, g.resume, g.isPct, colors, resumeW);
  });

  // Rodapé
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText(pagina).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
}

// =========================================================
// FUNÇÃO AUXILIAR — Desenha um gráfico de linha
// =========================================================
function _desenharGraficoLinha(slide, x, y, w, h, titulo, subtitulo, semanas, meses, mesBreaks, dados, resume, isPct, colors, resumeW) {
  const marginX = CR_DESIGN_SYSTEM.layout.marginX;

  // Frame do gráfico
  const frame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  frame.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.cardBg);
  frame.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  // ✅ Título bold + subtítulo no MESMO textbox, com estilos por range.
  //    Evita o cálculo frágil de largura por nº de caracteres, que fazia o
  //    subtítulo colar no título (ex.: "FLUXO DE ACESSOSVISITANTES...").
  const headerTxt = titulo + '   ' + subtitulo;
  const titleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 7, w - 20, 14);
  titleBox.getText().setText(headerTxt);
  titleBox.getText().getRange(0, titulo.length).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(9).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandMed);
  titleBox.getText().getRange(titulo.length, headerTxt.length).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(9)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  // ✅ Legenda removida daqui — agora fica no cabeçalho do slide

  // Área do plot
  const pLeft = 45, pRight = 15, pTop = 25, pBottom = 22;
  const plotX = x + pLeft;
  const plotY = y + pTop;
  const plotW = w - pLeft - pRight;
  const plotH = h - pTop - pBottom;

  // Linha base
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill('#CBD5E1');

  // Linhas de grade horizontais e rótulos Y
  const allVals = [...dados.cwb, ...dados.itj, ...dados.est];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range  = maxVal - minVal || 1;
  const padding = range * 0.15;
  // ✅ yMin nunca negativo para dados não-percentuais
  const yMin = isPct ? Math.max(0, minVal - padding) : Math.max(0, minVal - padding);
  const yMax = maxVal + padding;

  [0, 0.25, 0.5, 0.75, 1.0].forEach(pct => {
    const val = yMin + (yMax - yMin) * pct;
    const gy = plotY + plotH - (plotH * pct);
    const gl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, gy, plotX + plotW, gy);
    gl.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    gl.setDashStyle(SlidesApp.DashStyle.DASH);
    const yLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, gy - 6, pLeft - 3, 12);
    const displayVal = isPct ? Math.round(val) + '%' : Math.round(val).toLocaleString('pt-BR');
    yLbl.getText().setText(displayVal).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(6)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    yLbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });

  // Linhas verticais dos meses e rótulos
  const stepX = plotW / (semanas.length - 1);
  mesBreaks.forEach((idx, mi) => {
    const mx = plotX + (idx * stepX);
    const ml = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, mx, plotY, mx, plotY + plotH);
    ml.getLineFill().setSolidFill('#CBD5E1');
    const mlbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mx - 25, plotY + plotH + 5, 50, 12);
    mlbl.getText().setText(meses[mi]).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    mlbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // Desenhar linhas de dados
  const seriesData = [
    { key: 'itj', vals: dados.itj, color: colors.itj },
    { key: 'est', vals: dados.est, color: colors.est },
    { key: 'cwb', vals: dados.cwb, color: colors.cwb },
  ];

  seriesData.forEach(series => {
    for (let i = 0; i < series.vals.length - 1; i++) {
      const x1 = plotX + (i * stepX);
      const y1 = plotY + plotH - ((series.vals[i] - yMin) / (yMax - yMin) * plotH);
      const x2 = plotX + ((i + 1) * stepX);
      const y2 = plotY + plotH - ((series.vals[i + 1] - yMin) / (yMax - yMin) * plotH);
      const line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x1, y1, x2, y2);
      line.getLineFill().setSolidFill(series.color);
      line.setWeight(2);
    }
  });

  // Card de resumo à direita
  const resumeX = x + w + 10;
  const resumeCard = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, resumeX, y, resumeW, h);
  resumeCard.getFill().setSolidFill('#F1F5F9');
  resumeCard.getBorder().getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, resumeX + 8, y + 8, resumeW - 16, 14)
    .getText().setText('Semana atual').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(8).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);

  const resumeLines = [
    { label: 'Mega Curitiba:', val: resume.cwb, color: colors.cwb },
    { label: 'Mega Itajaí:',   val: resume.itj, color: colors.itj },
    { label: 'Mega Esteio:',   val: resume.est, color: colors.est },
    { label: resume.total ? 'Total:' : 'Média geral:', val: resume.total || resume.media, color: CR_DESIGN_SYSTEM.colors.brandDark },
  ];

  resumeLines.forEach((line, i) => {
    const lineY = y + 24 + (i * 16);
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, resumeX + 8, lineY, resumeW - 16, 14);
    txt.getText().setText(line.label + ' ' + line.val);
    txt.getText().getRange(0, line.label.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7.5)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    txt.getText().getRange(line.label.length + 1, txt.getText().getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7.5).setBold(true)
      .setForegroundColor(line.color);
  });
}