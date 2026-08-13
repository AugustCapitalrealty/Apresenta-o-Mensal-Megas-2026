/**
 * ARQUIVO: Slide_Preventivas.gs
 * SLIDE — MANUTENÇÃO PREVENTIVA
 *
 * Mesmo desenho do slide de Preventivas dos Megas
 * (megas-mensal/Slide02_Preventivas.gs): dois cards lado a lado — MÊS DE
 * REFERÊNCIA e ACUMULADO DO ANO —, cada um com PREVISTAS / REALIZADAS / SLA
 * e uma barra de progresso (Realizadas ÷ Previstas). Dado 100% da equipe
 * PROPRIEDADES (obterIndicadoresPropriedades_/obterAcumuladoPropriedades_,
 * 02_Dados.gs) — nada de Facilities/Terceiros, nada de Megas x Demais por
 * enquanto (trabalhando por partes, a pedido do usuário).
 */

function gerarSlidePreventivas() {
  const deck  = getDeckMensal_();
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  const ref = obterMesReferencia_();
  criarHeaderPadrao(slide, 'MANUTENÇÃO PREVENTIVA',
    'Aderência ao cronograma — equipe de Propriedades · ' + ref.ano);

  const mensal     = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index).total;
  const acumulado  = obterAcumuladoPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);

  const dadosMensal = {
    titulo    : (ref.curto || ref.nome) + ' / ' + ref.ano,
    previstas : mensal.execucao.previstas,
    realizadas: mensal.execucao.realizadas,
    sla       : mensal.sla.pct
  };
  const dadosAcumulado = {
    titulo    : 'ACUMULADO ' + ref.ano + ' (JAN–' + String(ref.curto || ref.nome).toUpperCase() + ')',
    previstas : acumulado.execucao.previstas,
    realizadas: acumulado.execucao.realizadas,
    sla       : acumulado.sla.pct
  };

  const marginX = 30, topY = 80, gap = 30, cardH = 160;
  const cardW = (W - marginX * 2 - gap) / 2;

  _prevCardMetrica_(slide, marginX,               topY, cardW, cardH, dadosMensal,    DS.colors.themePrev);
  _prevCardMetrica_(slide, marginX + cardW + gap, topY, cardW, cardH, dadosAcumulado, DS.colors.brandLight);

  Logger.log('✓ Preventivas gerado — mês ' + dadosMensal.previstas + '/' + dadosMensal.realizadas +
             ', acumulado ' + dadosAcumulado.previstas + '/' + dadosAcumulado.realizadas);
}

// Card com PREVISTAS/REALIZADAS/SLA lado a lado + barra de progresso
// (Realizadas ÷ Previstas) — mesmo componente de
// megas-mensal/Slide02_Preventivas.gs (_desenharCardMetrica).
function _prevCardMetrica_(slide, x, y, w, h, dados, corTema) {
  const DS = CR_DESIGN_SYSTEM;
  const contentY = criarCardPainel(slide, x, y, w, h, dados.titulo, corTema) + 6;
  const colW = (w - 20) / 3;

  const slaTxt = dados.sla == null ? '—' : dados.sla.toFixed(1) + '%';
  _prevItemSimples_(slide, x + 10,            contentY, colW, 'PREVISTAS',  dados.previstas,  DS.colors.textMuted, DS.colors.textMain);
  _prevItemSimples_(slide, x + 10 + colW,     contentY, colW, 'REALIZADAS', dados.realizadas, DS.colors.textMuted, DS.colors.textMain);
  _prevItemSimples_(slide, x + 10 + colW * 2, contentY, colW, 'SLA',        slaTxt,           DS.colors.textMuted, corPorSLA(dados.sla, corTema));

  // Barra de progresso Realizadas/Previstas, no rodapé do card.
  if (dados.previstas > 0) {
    const pct = Math.max(0, Math.min(1, dados.realizadas / dados.previstas));
    const bx = x + 15, bw = w - 105, by = y + h - 24, bh = 8;

    const trilho = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, bx, by, bw, bh);
    trilho.getFill().setSolidFill('#EEF2F7'); trilho.getBorder().setTransparent();

    if (pct > 0.02) {
      const fill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, bx, by, Math.max(bw * pct, 10), bh);
      fill.getFill().setSolidFill(corTema); fill.getBorder().setTransparent();
    }

    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx + bw + 6, by - 4, 80, 16);
    lbl.getText().setText(Math.round(pct * 100) + '% realizado').getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor(corTema).setFontFamily(DS.typography.titles);
  }
}

function _prevItemSimples_(slide, x, y, w, label, valor, colorLabel, colorVal) {
  const DS = CR_DESIGN_SYSTEM;
  const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 20);
  lbl.getText().setText(label).getTextStyle()
    .setFontSize(7.5).setBold(true).setForegroundColor(colorLabel).setFontFamily(DS.typography.body);
  lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 20, w, 40);
  val.getText().setText(String(valor)).getTextStyle()
    .setFontSize(22).setBold(true).setForegroundColor(colorVal).setFontFamily(DS.typography.titles);
  val.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}
