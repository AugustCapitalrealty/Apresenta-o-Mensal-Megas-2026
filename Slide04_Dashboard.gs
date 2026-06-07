// ==========================================
// SLIDE 4: DASHBOARD
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

  const structure = [
    { 
      title: 'GESTÃO DE ATIVOS CRÍTICOS', 
      color: CORES.themeAtivos, 
      icon: '⚙️', 
      rows: [
        // REMOVIDO: Tempo médio entre chamados
        { label: 'Tempo médio de reparo (Dias)', lookup: 'Tempo médio de reparo' }, 
        { label: 'Disponibilidade (%)', lookup: 'Disponibilidade' }
      ] 
    },
    { title: 'MANUTENÇÃO PREVENTIVA', color: CORES.themePrev, icon: '🛡️', rows: [{ label: 'Em dia (%)', lookup: 'Em dia' }, { label: 'SLA atendido (%)', lookup: 'SLA atendido' }] },
    { title: 'MANUTENÇÃO CORRETIVA: BACKLOG', color: CORES.themeCorr, icon: '🔧', rows: [{ label: 'Chamados facilities (Qtd)', lookup: 'Chamados de facilities' }, { label: 'Chamados geral (Qtd)', lookup: 'Chamados geral' }, { label: '% Conclusão histórico', lookup: 'Percentual de conclusão histórico' }, { label: 'Tempo médio aprovação (h)', lookup: 'Tempo médio para aprovação' }] },
    { title: 'CONTROLE DE ACESSO', color: CORES.themeAcesso, icon: '👥', rows: [{ label: 'Fluxo de VISITANTES', lookup: 'Fluxo de VISITANTES' }, { label: 'Tempo médio', lookup: 'Tempo médio' }] }
  ];

  const headerH = 60, marginX = 30, marginY = headerH + 20, gap = 20, footerMargin = 15;
  const cardW = (PageWidth - (2 * marginX) - gap) / 2, cardH = (PageHeight - marginY - footerMargin - gap) / 2;

  structure.forEach((cat, i) => {
    const row = Math.floor(i / 2), col = i % 2;
    const x = marginX + (col * (cardW + gap)), y = marginY + (row * (cardH + gap));
    const cSh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x+3, y+3, cardW, cardH);
    cSh.getFill().setSolidFill(CORES.shadow); cSh.getBorder().setTransparent(); cSh.sendToBack();
    const cBg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, cardW, cardH);
    cBg.getFill().setSolidFill(CORES.white); cBg.getBorder().setTransparent();

    const stripH = 35;
    const headerRound = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, cardW, stripH + 10);
    headerRound.getFill().setSolidFill(cat.color); headerRound.getBorder().setTransparent();
    const mask = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + stripH, cardW, 10);
    mask.getFill().setSolidFill(CORES.white); mask.getBorder().setTransparent();
    const titleTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 2, cardW - 20, 30);
    let tRun = titleTxt.getText(); tRun.setText(`${cat.icon}  ${cat.title}`);
    tRun.getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    titleTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const tableY = y + stripH + 10;
    const colNameW = cardW * 0.45, colDataW = (cardW - colNameW - 20) / 3;
    dynamicHeaders.forEach((h, idx) => {
      let t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10 + colNameW + (idx * colDataW), tableY, colDataW, 20);
      t.getText().setText(h).getTextStyle().setFontSize(8).setBold(true).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
      t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    });

    const startDataY = tableY + 20;
    const rowH = (cardH - stripH - 40) / cat.rows.length;

    cat.rows.forEach((r, rIdx) => {
      let ry = startDataY + (rIdx * rowH);
      if (rIdx < cat.rows.length - 1) {
        let line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 10, ry + rowH, cardW - 20, 1);
        line.getFill().setSolidFill('#F1F5F9'); line.getBorder().setTransparent();
      }
      let nBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, ry, colNameW, rowH);
      nBox.getText().setText(r.label).getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      nBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      // CORREÇÃO: Removido o caractere "a" solto que causava o erro de sintaxe
      let vals = { atual: '-', mesAnt: '-', anoAnt: '-' };
      if (valoresMap.has(r.lookup)) vals = valoresMap.get(r.lookup);
      [vals.atual, vals.mesAnt, vals.anoAnt].forEach((val, vIdx) => {
        let vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10 + colNameW + (vIdx * colDataW), ry, colDataW, rowH);
        let vText = vBox.getText(); vText.setText(val ? String(val) : "-");
        let vStyle = vText.getTextStyle(); vStyle.setFontSize(9).setBold(true).setFontFamily('Montserrat');
        if (vIdx === 0) vStyle.setForegroundColor(cat.color); else vStyle.setForegroundColor(CORES.textGray);
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      });
    });
  });
  
  Logger.log("Slide 4 (Dashboard) gerado com sucesso.");
}
