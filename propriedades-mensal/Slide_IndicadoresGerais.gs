/**
 * ARQUIVO: Slide_IndicadoresGerais.gs
 * SLIDE — DASHBOARD OPERACIONAL
 *
 * Grid 2×2 de painéis (criarCardPainel) com tabela comparativa de 3 meses
 * (mês atual / mês anterior / mesmo mês ano anterior) dentro de cada um —
 * MESMO desenho de megas-mensal/Slide01_Dashboard.gs (o "Dashboard" que o
 * usuário já conhece e pediu pra replicar), com dado 100% de
 * obterDashboardPropriedades_() (02_Dados.gs): nada aqui é inventado, é
 * obterIndicadoresPropriedades_/obterBacklogPorCC_ chamados 3× com (ano,
 * mesIndex) diferentes — já filtrados pra equipe PROPRIEDADES (nada de
 * Facilities nem Terceiros aparece nesta apresentação).
 *
 * Por que não é mais criarCardKPI (o desenho anterior deste slide): aquilo
 * era um card de KPI avulso, sem comparação no tempo — o layout "de verdade"
 * que o usuário mandou de exemplo (print "DASHBOARD OPERACIONAL") é este
 * grid com tabela ▲/▼ dentro de cada painel, e é isso que este arquivo
 * desenha agora.
 *
 * OS 2 QUADRANTES (por pedido do usuário — trabalhando por partes: tirou
 * Manutenção Corretiva e SLA Megas x Demais Imóveis daqui, ficam só)
 *   1. Manutenção Preventiva — SLA e "Em dia" (execução), série mensal real.
 *   2. Backlog em aberto     — contagem no fim do mês, série mensal real.
 *   Recebimento de Obras NÃO entra: a planilha é uma lista viva de
 *   pendências, sem registro histórico por mês — não dá pra saber "quanto
 *   estava concluído em maio" sem inventar estado passado. Ver o comentário
 *   em obterDashboardPropriedades_ (02_Dados.gs). O número dele já aparece
 *   noutro lugar do deck (KPIs TOTAL/CONCLUÍDO/PENDENTE no rodapé de cada
 *   página de Slide_RecebimentoObras.gs) — não precisa de um card aqui só
 *   pra repetir o mesmo dado sem comparação. obterIndicadoresPortfolio_ e
 *   obterRecebimentoObrasResumo_ (02_Dados.gs) ficam disponíveis, sem uso
 *   no momento, caso um card avulso volte a fazer sentido neste slide.
 */

function gerarSlideIndicadoresGerais() {
  const dados = obterDashboardPropriedades_();
  const valoresMap = dados.map;
  const headers = dados.headers;

  const deck = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'DASHBOARD OPERACIONAL',
    'Comparativo de Performance: ' + headers[0] + (dados.parcial ? ' (mês em andamento)' : ''));

  // sentido: 'maior' = quanto maior melhor / 'menor' = quanto menor melhor
  // (colore a seta de tendência vs mês anterior). sla: aplica corPorSLA
  // (≥95 verde, ≥90 âmbar, <90 vermelho) no valor do mês atual.
  //
  // "Em dia (%)" é o mesmo rótulo que o Dashboard dos Megas usa pra
  // execução (megas-mensal/Slide01_Dashboard.gs, linha 34) — pedido do
  // usuário pra manter o vocabulário igual entre os dois decks.
  const structure = [
    { title: 'MANUTENÇÃO PREVENTIVA', color: DS.colors.themePrev, rows: [
      { label: 'SLA (%)',     lookup: 'SLA Preventivas',      sentido: 'maior', sla: true },
      { label: 'Em dia (%)',  lookup: 'Execução Preventivas', sentido: 'maior', sla: true }
    ] },
    { title: 'BACKLOG — CHAMADOS EM ABERTO', color: DS.colors.themeAtivos, rows: [
      { label: 'Total em aberto (Qtd)', lookup: 'Backlog em aberto', sentido: 'menor', sla: false }
    ] }
  ];

  // Só 2 quadrantes agora — lado a lado, ocupando a altura toda abaixo do
  // cabeçalho (em vez do grid 2×2 de quando eram 4).
  const marginX = 28, marginY = 74, gap = 16, footerMargin = 15;
  const cardW = (W - (2 * marginX) - gap) / 2;
  const cardH = H - marginY - footerMargin;

  structure.forEach((cat, i) => {
    const x = marginX + (i * (cardW + gap));
    const y = marginY;

    const tableY = criarCardPainel(slide, x, y, cardW, cardH, cat.title, cat.color) + 2;

    // Faixa do comparativo entre o rótulo e a coluna do mês atual (sem
    // cabeçalho de tabela): só a seta ▲/▼, grande, colada ao valor atual —
    // o quanto variou já está detalhado nos slides de cada assunto.
    const colNameW = cardW * 0.42, seloW = 14;
    const dataX0 = x + 10 + colNameW + seloW;
    const colDataW = (cardW - 20 - colNameW - seloW) / 3;
    headers.forEach((h, idx) => {
      const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (idx * colDataW), tableY, colDataW, 20);
      t.getText().setText(h).getTextStyle()
        .setFontSize(8).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.titles);
      t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    });

    const startDataY = tableY + 20;
    const rowH = (y + cardH - startDataY - 10) / cat.rows.length;

    cat.rows.forEach((r, rIdx) => {
      const ry = startDataY + (rIdx * rowH);
      if (rIdx < cat.rows.length - 1) {
        const line = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 10, ry + rowH, cardW - 20, 1);
        line.getFill().setSolidFill('#F1F5F9');
        line.getBorder().setTransparent();
      }

      const nBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, ry, colNameW, rowH);
      nBox.getText().setText(r.label).getTextStyle()
        .setFontSize(8).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);
      nBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      const vals = valoresMap.get(r.lookup) || { atual: null, mesAnt: null, anoAnt: null };
      const nAtual = _dashNum_(vals.atual), nAnt = _dashNum_(vals.mesAnt);

      // Comparativo vs mês anterior: só a seta ▲/▼, grande, colada bem
      // perto do valor atual — verde melhorou / vermelho piorou, conforme o
      // sentido da métrica (backlog menor é melhor; SLA/execução maior é
      // melhor).
      if (nAtual != null && nAnt != null && nAtual !== nAnt) {
        const subiu = nAtual > nAnt;
        const melhorou = (r.sentido === 'menor') ? !subiu : subiu;
        const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10 + colNameW, ry, seloW + 8, rowH);
        selo.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        selo.getText().setText(subiu ? '▲' : '▼').getTextStyle()
          .setFontSize(12).setBold(true)
          .setForegroundColor(melhorou ? DS.colors.accentGreen : DS.colors.accentRed)
          .setFontFamily(DS.typography.titles);
        selo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
      }

      [vals.atual, vals.mesAnt, vals.anoAnt].forEach((val, vIdx) => {
        const vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (vIdx * colDataW), ry, colDataW, rowH);
        const valStr = formatarNumeroBR(val);
        const vText = vBox.getText();
        vText.setText(valStr);
        const vStyle = vText.getTextStyle();
        vStyle.setFontSize(9).setBold(true).setFontFamily(DS.typography.titles);
        vStyle.setForegroundColor(vIdx === 0
          ? (r.sla ? corPorSLA(valStr, cat.color) : cat.color)
          : DS.colors.textBody);
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      });
    });
  });

  Logger.log('✓ Dashboard Operacional gerado');
}

// null/NaN-safe: os valores do mapa já chegam como number|null (pct pode ser
// null quando o denominador é zero — "sem base para informar", ver
// calcularSLA_/calcularExecucao_ em 02_Dados.gs), nunca como texto da
// planilha, então não precisa da conversão de string que o Dashboard dos
// Megas faz.
function _dashNum_(v) {
  return (v == null || isNaN(v)) ? null : v;
}
