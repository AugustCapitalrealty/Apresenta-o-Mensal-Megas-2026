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
  //
  // GESTÃO DE ATIVOS junta o que eram dois quadrantes — "Gestão de Ativos
  // Críticos" e "Manutenção Corretiva: Backlog". Eram a mesma pergunta
  // partida em dois: a disponibilidade do ativo É consequência da fila de
  // corretivas, e olhar as duas em painéis separados escondia essa relação.
  // "BACKLOG" saiu do título porque o painel deixou de ser só de estoque.
  //
  // SAÍRAM daqui, por decisão do time (checklist do card DASHBOARD
  // OPERACIONAL): "Tempo médio de reparo" e "Tempo médio de aprovação".
  // Continuam sendo lidos por obterDadosDashboard() — voltar qualquer um é
  // acrescentar a linha de novo, sem mexer em mais nada.
  const structure = [
    { title: 'GESTÃO DE ATIVOS', color: CORES.themeAtivos, rows: [
      { label: 'Disponibilidade (%)', lookup: 'Disponibilidade', sentido: 'maior', sla: true },
      { label: 'Chamados facilities (Qtd)', lookup: 'Chamados de facilities', sentido: 'menor' },
      { label: 'Chamados geral (Qtd)', lookup: 'Chamados geral', sentido: 'menor' },
      { label: '% Conclusão histórico', lookup: 'Percentual de conclusão histórico', sentido: 'maior', sla: true }
    ] },
    { title: 'MANUTENÇÃO PREVENTIVA', color: CORES.themePrev, rows: [
      { label: 'Em dia (%)', lookup: 'Em dia', sentido: 'maior', sla: true },
      { label: 'SLA atendido (%)', lookup: 'SLA atendido', sentido: 'maior', sla: true }
    ] },
    { title: 'CONTROLE DE ACESSO', color: CORES.themeAcesso, rows: [
      { label: 'Fluxo de VISITANTES', lookup: 'Fluxo de VISITANTES', sentido: 'maior' },
      { label: 'Tempo médio', lookup: 'Tempo médio', sentido: 'menor' }
    ] },
    //
    // DESTAQUES — sem comparativo de propósito. A aba DOCUMENTOS INQUILINOS é
    // uma lista VIVA: traz o estado de hoje de cada documento, e a categoria
    // (vencido / a vencer / em dia) é recalculada a cada execução contra a
    // data de referência. Não existe "quantos estavam vencidos em junho", e
    // repetir o número nas três colunas fingiria uma série que não há.
    //
    // `semComparativo` faz o painel desenhar o valor UMA vez, ocupando a
    // largura das três colunas, sem cabeçalho de mês e sem seta.
    //
    // O % vencida usa `slaInverso`: aqui número ALTO é ruim, e a régua padrão
    // (≥95 verde) pintaria "97% vencida" de verde.
    { title: 'DESTAQUES — DOCUMENTAÇÃO', color: CORES.themeCorr, semComparativo: true, rows: [
      { label: 'Documentação vencida (%)', lookup: 'Documentação vencida (%)', slaInverso: true },
      { label: 'Documentos vencidos (Qtd)', lookup: 'Documentos vencidos' },
      { label: 'A vencer em 30 dias (Qtd)', lookup: 'Documentos a vencer' },
      { label: 'Documentação em dia (%)',  lookup: 'Documentação em dia (%)', sla: true }
    ] }
  ];

  // Converte texto da planilha em número (aceita "27.91", "27,91", "66336")
  const paraNumero = s => {
    const t = String(s == null ? '' : s).trim();
    if (!/^-?\d+([.,]\d+)?$/.test(t)) return NaN;
    return Number(t.replace(',', '.'));
  };

  const headerH = 60, marginX = 30, marginY = headerH + 20, gap = 20, footerMargin = 15;
  const areaW = PageWidth - (2 * marginX);
  const areaH = PageHeight - marginY - footerMargin;
  const caixas = _dashGrade_(structure.length, marginX, marginY, areaW, areaH, gap);

  structure.forEach((cat, i) => {
    const { x, y, w: cardW, h: cardH } = caixas[i];

    // Painel padrão do design system (01_Config.gs) — título na cor do tema
    const tableY = criarCardPainel(slide, x, y, cardW, cardH, cat.title, cat.color) + 2;
    // Faixa do comparativo entre o rótulo e a coluna JUN (sem cabeçalho):
    // SÓ a seta ▲/▼, grande, à esquerda do valor atual — o quanto variou
    // já está estratificado nos slides de cada assunto. Faixa bem estreita
    // (14pt); a seta é desenhada colada/sobreposta ao valor (ver abaixo).
    const colNameW = cardW * 0.42, seloW = 14;
    const dataX0   = x + 10 + colNameW + seloW;
    const colDataW = (cardW - 20 - colNameW - seloW) / 3;
    if (cat.semComparativo) {
      // No lugar dos três meses, uma legenda dizendo por que não há série.
      const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0, tableY, colDataW * 3, 20);
      t.getText().setText('POSIÇÃO ATUAL').getTextStyle()
        .setFontSize(8).setBold(true).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
      t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    } else {
      dynamicHeaders.forEach((h, idx) => {
        let t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (idx * colDataW), tableY, colDataW, 20);
        t.getText().setText(h).getTextStyle().setFontSize(8).setBold(true).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
        t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      });
    }

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
      // colada bem perto do valor atual (a caixa invade um pouco a coluna
      // de dados de propósito — sobreposição é aceitável aqui e aproxima
      // a seta do número, como pedido) — verde melhorou / vermelho piorou.
      const nAtual = paraNumero(vals.atual), nAnt = paraNumero(vals.mesAnt);
      if (!cat.semComparativo && !isNaN(nAtual) && !isNaN(nAnt) && nAtual !== nAnt) {
        const subiu    = nAtual > nAnt;
        const melhorou = (r.sentido === 'menor') ? !subiu : subiu;
        const selo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
          x + 10 + colNameW, ry, seloW + 8, rowH);
        selo.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        selo.getText().setText(subiu ? '▲' : '▼')
          .getTextStyle().setFontSize(12).setBold(true)
          .setForegroundColor(melhorou ? CORES.cardGreen : CORES.cardRed).setFontFamily('Montserrat');
        selo.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
      }

      // Cor do valor do mês: régua de SLA quando o indicador é "quanto maior
      // melhor"; régua INVERTIDA quando é "quanto maior pior" (% vencida).
      const corDoValor = valStr => {
        if (r.slaInverso) {
          const n = parseFloat(String(valStr).replace('%', '').replace(',', '.'));
          return isNaN(n) ? cat.color : corPorSLA(String(100 - n), cat.color);
        }
        return r.sla ? corPorSLA(valStr, cat.color) : cat.color;
      };

      if (cat.semComparativo) {
        // Um valor só, ocupando a largura das três colunas — sem colunas
        // vazias e sem repetir o mesmo número três vezes.
        const vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0, ry, colDataW * 3, rowH);
        const valStr = formatarNumeroBR(vals.atual);
        const vText = vBox.getText();
        vText.setText(valStr);
        vText.getTextStyle().setFontSize(11).setBold(true)
          .setForegroundColor(corDoValor(valStr)).setFontFamily('Montserrat');
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        return;
      }

      [vals.atual, vals.mesAnt, vals.anoAnt].forEach((val, vIdx) => {
        let vBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, dataX0 + (vIdx * colDataW), ry, colDataW, rowH);
        const valStr = formatarNumeroBR(val);
        let vText = vBox.getText();
        vText.setText(valStr);
        let vStyle = vText.getTextStyle(); vStyle.setFontSize(9).setBold(true).setFontFamily('Montserrat');
        vStyle.setForegroundColor(vIdx === 0 ? corDoValor(valStr) : CORES.textGray);
        vText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        vBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      });
    });
  });
  
  Logger.log("Slide 01 (Dashboard) gerado com sucesso.");
}


/**
 * Onde cada painel fica, dado QUANTOS painéis existem. Antes a grade era 2×2
 * escrita na mão (`row = i/2, col = i%2`), e tirar um quadrante deixava um
 * buraco no canto — que é exatamente o que aconteceria agora que os dois
 * primeiros viraram um.
 *
 *   1 painel   ocupa tudo
 *   2 painéis  lado a lado, altura inteira
 *   3 painéis  dois em cima, o terceiro atravessando embaixo
 *   4 painéis  o 2×2 de sempre — os tamanhos batem com os de antes
 *   5+         duas colunas, quantas linhas precisar
 *
 * O caso de 3 é o que está no ar hoje; o de 4 volta quando o quadrante de
 * DESTAQUES entrar. Nenhum dos dois exige mexer aqui de novo.
 */
function _dashGrade_(n, x0, y0, areaW, areaH, gap) {
  const caixa = (x, y, w, h) => ({ x: x, y: y, w: w, h: h });

  if (n <= 1) return [caixa(x0, y0, areaW, areaH)];

  if (n === 2) {
    const w = (areaW - gap) / 2;
    return [caixa(x0, y0, w, areaH), caixa(x0 + w + gap, y0, w, areaH)];
  }

  const linhas = Math.ceil(n / 2);
  const h = (areaH - gap * (linhas - 1)) / linhas;
  const w = (areaW - gap) / 2;

  const out = [];
  for (let i = 0; i < n; i++) {
    const linha = Math.floor(i / 2);
    const y = y0 + linha * (h + gap);
    // Último painel de uma contagem ÍMPAR: em vez de deixar meia linha vazia,
    // ele atravessa a largura toda. Fica lido como decisão, não como sobra.
    const sozinhoNaLinha = (i === n - 1) && (n % 2 === 1);
    out.push(sozinhoNaLinha ? caixa(x0, y, areaW, h)
                            : caixa(x0 + (i % 2) * (w + gap), y, w, h));
  }
  return out;
}
