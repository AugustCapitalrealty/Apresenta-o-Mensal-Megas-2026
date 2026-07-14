// ==========================================
// ARQUIVO: Slide01_Dashboard.gs
// SLIDE 01 — DASHBOARD
// Dados: obterDadosDashboard() em 02_Dados.gs
// ==========================================

function gerarSlideDashboard() {
  const dados = obterDadosDashboard();
  const valoresMap = dados.map;
  const dynamicHeaders = dados.headers;

  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  
  const PageWidth = deck.getPageWidth();
  const PageHeight = deck.getPageHeight();

  criarHeaderPadrao(slide, 'DASHBOARD OPERACIONAL', 'Comparativo de Performance: ' + dynamicHeaders[0]);

  // sentido: 'maior' = quanto maior melhor / 'menor' = quanto menor melhor
  // (usado para colorir a seta de tendência vs mês anterior)
  // sla: aplica cor por limiar (≥95 verde, ≥90 âmbar, <90 vermelho) no valor atual
  const structure = [
    {
      title: 'GESTÃO DE ATIVOS CRÍTICOS',
      color: CORES.themeAtivos,
      rows: [
        { label: 'Tempo médio de reparo (Dias)', lookup: 'Tempo médio de reparo', sentido: 'menor' },
        { label: 'Disponibilidade (%)', lookup: 'Disponibilidade', sentido: 'maior', sla: true }
      ]
    },
    { title: 'MANUTENÇÃO PREVENTIVA', color: CORES.themePrev, rows: [
      { label: 'Em dia (%)', lookup: 'Em dia', sentido: 'maior', sla: true },
      { label: 'SLA atendido (%)', lookup: 'SLA atendido', sentido: 'maior', sla: true }
    ] },
    { title: 'MANUTENÇÃO CORRETIVA: BACKLOG', color: CORES.themeCorr, rows: [
      { label: 'Chamados facilities (Qtd)', lookup: 'Chamados de facilities', sentido: 'menor' },
      { label: 'Chamados geral (Qtd)', lookup: 'Chamados geral', sentido: 'menor' },
      { label: '% Conclusão histórico', lookup: 'Percentual de conclusão histórico', sentido: 'maior', sla: true },
      { label: 'Tempo médio aprovação (h)', lookup: 'Tempo médio para aprovação', sentido: 'menor' }
    ] },
    { title: 'CONTROLE DE ACESSO', color: CORES.themeAcesso, rows: [
      { label: 'Fluxo de VISITANTES', lookup: 'Fluxo de VISITANTES', sentido: 'maior' },
      { label: 'Tempo médio', lookup: 'Tempo médio', sentido: 'menor' }
    ] }
  ];

  // Converte texto da planilha em número (aceita "27.91", "27,91", "66336")
  const paraNumero = s => {
    const t = String(s == null ? '' : s).trim();
    if (!/^-?\d+([.,]\d+)?$/.test(t)) return NaN;
    return Number(t.replace(',', '.'));
  };

  const headerH = 60, marginX = 30, marginY = headerH + 20, gap = 20, footerMargin = 15;
  const cardW = (PageWidth - (2 * marginX) - gap) / 2, cardH = (PageHeight - marginY - footerMargin - gap) / 2;

  structure.forEach((cat, i) => {
    const row = Math.floor(i / 2), col = i % 2;
    const x = marginX + (col * (cardW + gap)), y = marginY + (row * (cardH + gap));

    // Painel padrão do design system (01_Config.gs) — título na cor do tema
    const tableY = criarCardPainel(slide, x, y, cardW, cardH, cat.title, cat.color) + 2;
    // Faixa do comparativo entre o rótulo e a coluna JUN (sem cabeçalho):
    // SÓ a seta ▲/▼, grande, à esquerda do valor atual — o quanto variou
    // já está estratificado nos slides de cada assunto. Faixa estreita
    // (24pt) devolve largura às colunas de dados (sem quebras de valor).
    const colNameW = cardW * 0.42, seloW = 24;
    const dataX0   = x + 10 + colNameW + seloW;
    const colDataW = (cardW - 20 - colNameW - seloW) / 3;
    dynamicHeaders.forEach((h, idx) => {
      let t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (idx * colDataW), tableY, colDataW, 20);
      t.getText().setText(h).getTextStyle().setFontSize(8).setBold(true).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
      t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    });

    const startDataY = tableY + 20;
    const rowH = (y + cardH - startDataY - 10) / cat.rows.length;

    cat.rows.forEach((r, rIdx) => {
      let ry = startDataY + (rIdx * rowH);
      if (rIdx < cat.rows.length - 1) {
        let line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 10, ry + rowH, cardW - 20, 1);
        line.getFill().setSolidFill('#F1F5F9'); line.getBorder().setTransparent();
      }
      let nBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, ry, colNameW, rowH);
      nBox.getText().setText(r.label).getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      nBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      let vals = { atual: '-', mesAnt: '-', anoAnt: '-' };
      if (valoresMap.has(r.lookup)) vals = valoresMap.get(r.lookup);

      // Comparativo vs mês anterior: SÓ a seta ▲/▼ (subiu/desceu), grande,
      // à esquerda do valor atual — verde melhorou / vermelho piorou.
      const nAtual = paraNumero(vals.atual), nAnt = paraNumero(vals.mesAnt);
      if (!isNaN(nAtual) && !isNaN(nAnt) && nAtual !== nAnt) {
        const subiu    = nAtual > nAnt;
        const melhorou = (r.sentido === 'menor') ? !subiu : subiu;
        const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
          x + 10 + colNameW, ry, seloW - 2, rowH);
        selo.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        selo.getText().setText(subiu ? '▲' : '▼')
          .getTextStyle().setFontSize(12).setBold(true)
          .setForegroundColor(melhorou ? CORES.cardGreen : CORES.cardRed).setFontFamily('Montserrat');
        selo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      }

      [vals.atual, vals.mesAnt, vals.anoAnt].forEach((val, vIdx) => {
        let vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (vIdx * colDataW), ry, colDataW, rowH);
        const valStr = formatarNumeroBR(val);
        let vText = vBox.getText();
        vText.setText(valStr);
        let vStyle = vText.getTextStyle(); vStyle.setFontSize(9).setBold(true).setFontFamily('Montserrat');
        if (vIdx === 0) {
          const corAtual = r.sla ? corPorSLA(valStr, cat.color) : cat.color;
          vStyle.setForegroundColor(corAtual);
        } else {
          vStyle.setForegroundColor(CORES.textGray);
        }
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      });
    });
  });
  
  Logger.log("Slide 01 (Dashboard) gerado com sucesso.");
}
