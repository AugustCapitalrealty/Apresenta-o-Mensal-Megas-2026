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

  // ── Barras: Em resolução | direcionados... | Total Geral ────────────────
  const barras = [{ estado: 'Em resolução', qtd: d.emResolucao, cor: '#CBD5E1', corVal: CORES.textGray }]
    .concat(d.direcionados.map(it => ({ estado: it.estado, qtd: it.qtd, cor: '#BFDBFE', corVal: CORES.darkBlue })))
    .concat([{ estado: 'Total Geral', qtd: d.total, cor: CORES.lightBlue, corVal: CORES.darkBlue, destaque: true }]);

  const plotX  = marginX + 14;
  const plotW  = W - 2 * marginX - 28;
  const labelH = 26;                          // rótulos de estado (até 3 linhas em 5.5pt)
  const baseY  = topY + cardH - labelH - 10;  // linha de base das barras
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

    // Valor acima da barra
    const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.2, baseY - hBar - 15, slotW * 1.4, 13);
    vl.getText().setText(formatarNumeroBR(b.qtd)).getTextStyle()
      .setFontSize(b.destaque ? 8.5 : 7.5).setBold(true)
      .setForegroundColor(b.corVal).setFontFamily(DS.typography.titles);
    vl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo do estado abaixo da base
    const el = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.05, baseY + 3, slotW * 1.1, labelH);
    el.getText().setText(b.estado).getTextStyle()
      .setFontSize(5.5).setBold(true)
      .setForegroundColor(b.destaque ? CORES.darkBlue : CORES.textDark).setFontFamily(DS.typography.body);
    el.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    el.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  });

  Logger.log('Slide Backlog Pendentes gerado — ' + d.mesLabel + ' · ' +
             d.direcionados.length + ' estados direcionados · Em resolução=' + d.emResolucao +
             ' · Total=' + d.total + '.');
}
