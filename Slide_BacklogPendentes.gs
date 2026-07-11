/**
 * ARQUIVO: Slide_BacklogPendentes.gs
 * SLIDE — CHAMADOS PENDENTES (BACKLOG) POR ESTADO
 * Versão nativa do gráfico que era colado à mão todo mês:
 *   ▸ barra cinza 'Em resolução' (diferença conciliada com a aba DADOS)
 *   ▸ moldura pontilhada 'DIRECIONADOS' com os estados da aba
 *     CHAMADOS PENDENTES (BACKLOG)
 *   ▸ barra azul forte 'Total Geral' (= 'Chamados geral' da aba DADOS)
 * Dados: obterDadosBacklogPendentes_() em 02_Dados.gs.
 * Sem a aba preenchida, gera o espaço reservado (não quebra o deck).
 */

function gerarSlideBacklogPendentes() {
  const d = obterDadosBacklogPendentes_();
  if (!d || !d.direcionados.length) {
    gerarSlideReservaGraficos('CHAMADOS PENDENTES (BACKLOG)',
      'Chamados por estado — alimente a aba CHAMADOS PENDENTES (BACKLOG) da planilha',
      [{ titulo: 'DIRECIONADOS' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, 'CHAMADOS PENDENTES (BACKLOG)',
    'Chamados por estado — ' + d.mesLabel + ' · Total Geral conciliado com a aba DADOS');

  // ── Moldura padrão ────────────────────────────────────────────────────────
  const marginX = 30, topY = 76;
  const cardH = H - topY - 16;
  const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, topY, W - 2 * marginX, cardH);
  card.getFill().setSolidFill(DS.colors.cardBg);
  card.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  card.getBorder().setWeight(1);

  // Tendência do total vs mês anterior (backlog subindo = atenção)
  const deltaTot = (d.totalAnterior != null && !isNaN(d.totalAnterior)) ? d.total - d.totalAnterior : null;

  // ── Barras: Em resolução | direcionados... | Total Geral ────────────────
  const barras = [{ estado: 'Em resolução', qtd: d.emResolucao, cor: '#CBD5E1', corVal: CORES.textGray }]
    .concat(d.direcionados.map(it => ({ estado: it.estado, qtd: it.qtd, cor: '#BFDBFE', corVal: CORES.darkBlue })))
    .concat([{ estado: 'Total Geral', qtd: d.total, cor: CORES.lightBlue, corVal: CORES.darkBlue, destaque: true, delta: deltaTot }]);

  const plotX  = marginX + 14;
  const plotW  = W - 2 * marginX - 28;
  const labelH = 46;                          // rótulos de estado — bastante altura p/ quebrar por palavra
  const baseY  = topY + cardH - labelH - 8;   // linha de base das barras
  const plotTop = topY + 40;
  const plotH  = baseY - plotTop;

  const maxVal = Math.max(d.total, 1);
  const n      = barras.length;
  const slotW  = plotW / n;
  const barW   = Math.min(slotW * 0.55, 42);

  // ── Moldura pontilhada 'DIRECIONADOS' (envolve barras + rótulos) ─────────
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
    .setFontSize(11).setBold(true).setForegroundColor(CORES.textGray).setFontFamily(DS.typography.titles);

  // ── Desenho das barras ────────────────────────────────────────────────────
  barras.forEach((b, i) => {
    const cx   = plotX + i * slotW + (slotW - barW) / 2;
    const hBar = Math.max((b.qtd / maxVal) * plotH, b.qtd > 0 ? 3 : 1.5);

    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, baseY - hBar, barW, hBar);
    bar.getFill().setSolidFill(b.cor); bar.getBorder().setTransparent();

    // Valor acima da barra (com respiro). No Total Geral, 2ª linha com a
    // tendência vs mês anterior (▲ subiu = atenção · ▼ caiu = melhora).
    const temDelta = b.destaque && b.delta != null && b.delta !== 0;
    const boxH  = temDelta ? 24 : 13;
    const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.2, baseY - hBar - boxH - 8, slotW * 1.4, boxH);
    const vt = vl.getText();
    let txt = formatarNumeroBR(b.qtd);
    if (temDelta) {
      const seta = b.delta > 0 ? '▲' : '▼';
      txt += '\n' + seta + ' ' + (b.delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(b.delta)) + ' vs mês ant.';
    }
    vt.setText(txt).getTextStyle()
      .setFontSize(b.destaque ? 8.5 : 7.5).setBold(true)
      .setForegroundColor(b.corVal).setFontFamily(DS.typography.titles);
    if (temDelta) {
      const corDelta = b.delta > 0 ? CORES.cardRed : CORES.cardGreen;  // backlog: subir é ruim
      vt.getRange(formatarNumeroBR(b.qtd).length + 1, txt.length).getTextStyle()
        .setFontSize(6).setBold(true).setForegroundColor(corDelta);
    }
    vt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo do estado abaixo da base — caixa bem larga (1.5×) e fonte 5pt
    // para quebrar por palavra, não no meio (ex.: "Responsabilidade").
    const el = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.25, baseY + 3, slotW * 1.5, labelH);
    el.getText().setText(b.estado).getTextStyle()
      .setFontSize(5).setBold(true)
      .setForegroundColor(b.destaque ? CORES.darkBlue : CORES.textDark).setFontFamily(DS.typography.body);
    el.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(100);
    el.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  });

  Logger.log('Slide Backlog Pendentes gerado — ' + d.mesLabel + ' · ' +
             d.direcionados.length + ' estados direcionados · Em resolução=' + d.emResolucao +
             ' · Total=' + d.total + '.');
}
