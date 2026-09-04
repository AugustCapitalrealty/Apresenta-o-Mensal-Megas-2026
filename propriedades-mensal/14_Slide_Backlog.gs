/**
 * ARQUIVO: 14_Slide_Backlog.gs
 * SLIDES — O QUE ESTÁ EM ABERTO (três recortes do mesmo estoque)
 *
 *   gerarSlideBacklog()                    gráfico por Centro de Custos
 *   gerarSlideBacklogEmergencialDetalhe()  tabela dos emergenciais, um por linha
 *   gerarSlideChamadosPendentes()          barras por motivo de pausa
 *
 * POR QUE OS TRÊS NO MESMO ARQUIVO: são o MESMO estoque visto de três
 * ângulos — por onde (imóvel), quem (o detalhe dos emergenciais) e por que
 * (motivo de pausa). Mexer na definição de "em aberto" mexe nos três ao
 * mesmo tempo, e eram três arquivos de 80–130 linhas que só se abriam
 * juntos. Cada um continua com a própria tag, então rodar um não apaga os
 * outros.
 *
 * Fonte única: BD-CORRETIVAS, via 02_Dados.gs / 05_DadosSlides.gs.
 */



function gerarSlideBacklog() {
  const deck = getDeckMensal_();

  _slideLimpar_(deck, TAG_BACKLOG);

  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = _slideNovo_(deck, TAG_BACKLOG, 'BACKLOG — DEMANDAS EM ABERTO',
    'Chamados aguardando atendimento, agrupados por Centro de Custos');

  const backlog = obterBacklogPorCC_();
  if (!backlog || backlog.length === 0) {
    Logger.log('✗ Backlog: sem dados disponíveis');
    return;
  }

  const topY = 74, marginBottom = 16;
  _propGraficoBacklogCC_(slide, SW, SH, topY, SH - topY - marginBottom, backlog);

  Logger.log('✓ Backlog gerado (gráfico único)');
}

// Gráfico de barras por Centro de Custos, maior primeiro — sem separar
// Megas de Demais Imóveis.
function _propGraficoBacklogCC_(slide, SW, SH, y, h, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const M = SW * 0.020;
  const chartX = M, chartW = SW - M * 2;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, chartX, y, chartW, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  if (!dados.length) {
    _sTxt(slide, chartX, y, chartW, h, 'Nenhum chamado em aberto.', 10, false, DS.colors.textMuted, 'center');
    return;
  }

  const ordenado = dados.slice().sort((a, b) => b.total - a.total);
  const cabe   = ordenado.length > PROP_BACKLOG_MAX_BARRAS;
  const exibir = cabe ? ordenado.slice(0, PROP_BACKLOG_MAX_BARRAS - 1) : ordenado;
  const resto  = ordenado.slice(exibir.length).reduce((s, d) => s + d.total, 0);
  const barras = exibir.map(d => ({ cc: d.cc, total: d.total }));
  if (resto > 0) barras.push({ cc: '+ ' + (ordenado.length - exibir.length) + ' outro(s)', total: resto });

  const mL = 10, mR = 10, mT = 20, mB = 34;
  const plotX = chartX + mL, plotW = chartW - mL - mR;
  const plotY = y + mT, plotH = h - mT - mB;

  const n = barras.length;
  const slotW = plotW / n;
  const barW  = Math.min(slotW * 0.55, 46);

  const vMax   = Math.max(...barras.map(b => b.total));
  const escMax = _utilEscalaTeto_(vMax);

  barras.forEach((b, i) => {
    const cx   = plotX + i * slotW + (slotW - barW) / 2;
    const hBar = b.total > 0 && escMax > 0 ? Math.max((b.total / escMax) * plotH, 3) : 0;

    if (hBar > 0) {
      _sRet_(slide, cx, plotY + plotH - hBar, barW, hBar, DS.colors.brandLight);
    }

    _sTxt(slide, plotX + i * slotW, plotY + plotH - hBar - 16, slotW, 14,
      formatarNumeroBR(b.total), 9, true, DS.colors.brandDark, 'center');

    _sTxt(slide, plotX + i * slotW - slotW * 0.1, plotY + plotH + 4, slotW * 1.2, 28,
      b.cc, 6.5, true, DS.colors.textMain, 'center');
  });
}




function gerarSlideBacklogEmergencialDetalhe() {
  const deck = getDeckMensal_();

  _slideLimpar_(deck, TAG_BACKLOG_EMERG_DETALHE);

  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  const itens = obterBacklogEmergencialDetalhe_();

  if (!itens.length) {
    const slide = _slideNovo_(deck, TAG_BACKLOG_EMERG_DETALHE);

    criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE',
      'Chamados emergenciais em aberto no mês de referência · Equipe Propriedades');

    const msg = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, SH / 2 - 20, SW - 80, 40);
    msg.getText().setText('Nenhum chamado emergencial em aberto no mês de referência.').getTextStyle()
      .setFontSize(14).setItalic(true).setBold(true)
      .setForegroundColor(DS.colors.accentGreen).setFontFamily(DS.typography.titles);
    msg.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    msg.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    Logger.log('✓ Backlog Emergencial — Detalhe: nenhum chamado no mês.');
    return;
  }

  const linhas = itens.map(it => [it.cc, it.descricao, it.dataAbertura, it.dias]);
  const pgs = _tabPaginar_(linhas, BACKLOG_EMERG_MAX_LINHAS);

  pgs.forEach((pagina, idx) => {
    const slide = _slideNovo_(deck, TAG_BACKLOG_EMERG_DETALHE);

    const subtitulo = 'Chamados emergenciais em aberto · Equipe Propriedades' +
      (pgs.length > 1 ? ' — página ' + (idx + 1) + ' de ' + pgs.length : '');
    criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE', subtitulo);

    const topY = 74, marginBottom = 20;
    const legH = SH * 0.045;
    _tabDesenharLegenda_(slide, SW, topY, legH, 'EM ABERTO (' + itens.length + ')');
    const topoTab = topY + legH + SH * 0.008;

    _tabDesenharTabela_(slide, SW, SH, pagina, topoTab, SH - marginBottom,
      { colunas: BACKLOG_EMERG_COLUNAS, maxLinhas: BACKLOG_EMERG_MAX_LINHAS });
  });

  Logger.log('✓ Backlog Emergencial — Detalhe: ' + itens.length + ' chamado(s) em ' + pgs.length + ' página(s).');
}



function gerarSlideChamadosPendentes() {
  const d = obterDadosChamadosPendentes_();
  const deck = getDeckMensal_();

  _slideLimpar_(deck, TAG_CHAMADOS_PENDENTES);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = _slideNovo_(deck, TAG_CHAMADOS_PENDENTES, 'CHAMADOS PENDENTES (BACKLOG)',
    'Chamados por motivo — ' + d.mesLabel + ' · ▲/▼ vs mês anterior · Equipe Propriedades');

  if (!d.total) {
    const msg = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H / 2 - 20, W - 80, 40);
    msg.getText().setText('Nenhum chamado pendente da equipe de Propriedades no mês de referência.')
      .getTextStyle().setFontSize(13).setItalic(true).setBold(true)
      .setForegroundColor(DS.colors.accentGreen).setFontFamily(DS.typography.titles);
    msg.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    msg.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    Logger.log('✓ Chamados Pendentes: nenhum chamado no mês.');
    return;
  }

  // ── Moldura padrão ──
  const marginX = 30, topY = 76;
  const cardH = H - topY - 16;
  const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, topY, W - 2 * marginX, cardH);
  card.getFill().setSolidFill(DS.colors.cardBg);
  card.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  card.getBorder().setWeight(1);

  // ── Barras: Em resolução | direcionados... | Total Geral ──
  const barras = [{ estado: 'Em resolução', qtd: d.emResolucao, anterior: d.emResolucaoAnterior, cor: '#CBD5E1', corVal: DS.colors.textMuted }]
    .concat(d.direcionados.map(it => ({ estado: it.estado, qtd: it.qtd, anterior: it.anterior, cor: '#BFDBFE', corVal: DS.colors.brandDark })))
    .concat([{ estado: 'Total Geral', qtd: d.total, anterior: d.totalAnterior, cor: DS.colors.brandLight, corVal: DS.colors.brandDark, destaque: true }]);

  const plotX  = marginX + 14;
  const plotW  = W - 2 * marginX - 28;
  const labelH = 46;
  const baseY  = topY + cardH - labelH - 8;
  const plotTop = topY + 40;
  const plotH  = baseY - plotTop;

  const maxVal = Math.max(d.total, 1);
  const n      = barras.length;
  const slotW  = plotW / n;
  const barW   = Math.min(slotW * 0.55, 42);

  // ── Moldura pontilhada "DIRECIONADOS" (envolve barras + rótulos) ──
  if (d.direcionados.length) {
    const fx = plotX + slotW * 0.96;
    const fw = slotW * d.direcionados.length + slotW * 0.08;
    const fy = plotTop - 14;
    const fh = baseY + labelH - fy + 6;
    const frame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, fx, fy, fw, fh);
    frame.getFill().setTransparent();
    frame.getBorder().setDashStyle(SlidesApp.DashStyle.DOT).setWeight(1.5)
      .getLineFill().setSolidFill('#94A3B8');

    const ft = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx + 8, fy + 3, 160, 18);
    ft.getText().setText('DIRECIONADOS').getTextStyle()
      .setFontSize(11).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.titles);
  }

  // ── Desenho das barras ──
  barras.forEach((b, i) => {
    const cx   = plotX + i * slotW + (slotW - barW) / 2;
    const hBar = b.qtd > 0 ? Math.max((b.qtd / maxVal) * plotH, 3) : 0;

    if (hBar > 0) {
      const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, baseY - hBar, barW, hBar);
      bar.getFill().setSolidFill(b.cor); bar.getBorder().setTransparent();
    }

    const temDelta = b.anterior != null && !isNaN(b.anterior);
    const delta    = temDelta ? b.qtd - b.anterior : 0;
    const boxH  = temDelta ? 26 : 13;
    const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.25, baseY - hBar - boxH - 8, slotW * 1.5, boxH);
    const vt = vl.getText();
    const valStr = formatarNumeroBR(b.qtd);
    let txt = valStr;
    if (temDelta) {
      const seta = delta > 0 ? '▲' : (delta < 0 ? '▼' : '▬');
      const dnum = delta === 0 ? '0' : (delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(delta));
      txt += '\n' + seta + ' ' + dnum;
    }
    vt.setText(txt).getTextStyle()
      .setFontSize(b.destaque ? 8.5 : 7.5).setBold(true)
      .setForegroundColor(b.corVal).setFontFamily(DS.typography.titles);
    if (temDelta) {
      const corDelta = delta === 0 ? DS.colors.textMuted : (delta > 0 ? DS.colors.accentRed : DS.colors.accentGreen);
      vt.getRange(valStr.length + 1, txt.length).getTextStyle()
        .setFontSize(b.destaque ? 8.5 : 7.5).setBold(true).setForegroundColor(corDelta);
    }
    vt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const el = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - 6, baseY + 3, slotW + 12, labelH);
    el.getText().setText(b.estado).getTextStyle()
      .setFontSize(6.5).setBold(true)
      .setForegroundColor(b.destaque ? DS.colors.brandDark : DS.colors.textMain).setFontFamily(DS.typography.body);
    el.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(100);
    el.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  });

  Logger.log('Slide Chamados Pendentes gerado — ' + d.mesLabel + ' · ' +
             d.direcionados.length + ' motivo(s) direcionado(s) · Em resolução=' + d.emResolucao +
             ' · Total=' + d.total + '.');
}
