/**
 * ARQUIVO: Slide_ChamadosPendentes.gs
 * SLIDE — CHAMADOS PENDENTES (BACKLOG)
 *
 * Mesmo desenho do slide equivalente dos Megas
 * (megas-mensal/Slide_BacklogPendentes.gs):
 *   ▸ barra cinza "Em resolução"
 *   ▸ moldura pontilhada "DIRECIONADOS" com uma barra por motivo de pausa
 *   ▸ barra azul forte "Total Geral"
 * Cada barra mostra ▲/▼ vs mês anterior.
 *
 * DIFERENÇA em relação aos Megas: lá o dado vem de uma aba digitada à mão
 * (MÊS/ESTADO/QUANTIDADE, sem fonte na base bruta). Aqui é 100% derivado
 * da BD-CORRETIVAS — coluna "Motivo de pausa" (obterDadosChamadosPendentes_,
 * 02_Dados.gs), confirmada com diagnosticarMotivoPausa. Nenhum dado
 * digitado à mão, nenhuma categoria inventada.
 */

function gerarSlideChamadosPendentes() {
  const d = obterDadosChamadosPendentes_();
  const deck = getDeckMensal_();

  if (typeof _tabRemoverPorTag_ === 'function' && typeof TAG_CHAMADOS_PENDENTES !== 'undefined') {
    _tabRemoverPorTag_(deck, TAG_CHAMADOS_PENDENTES);
  }

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_CHAMADOS_PENDENTES !== 'undefined') {
    _tabMarcarSlide_(slide, TAG_CHAMADOS_PENDENTES);
  }

  criarHeaderPadrao(slide, 'CHAMADOS PENDENTES (BACKLOG)',
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
