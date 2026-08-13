/**
 * ARQUIVO: Slide_Preventivas.gs
 * SLIDE — MANUTENÇÃO PREVENTIVA
 *
 * Mesmo desenho do slide de Preventivas dos Megas
 * (megas-mensal/Slide02_Preventivas.gs): dois cards lado a lado — MÊS DE
 * REFERÊNCIA e ACUMULADO DO ANO —, cada um com PREVISTAS / REALIZADAS / SLA
 * e uma barra de progresso (Realizadas ÷ Previstas); embaixo, a relação de
 * preventivas que não cumpriram o SLA no mês. Dado 100% da equipe
 * PROPRIEDADES (obterIndicadoresPropriedades_/obterAcumuladoPropriedades_/
 * obterPreventivasForaSla_, 02_Dados.gs) — nada de Facilities/Terceiros,
 * nada de Megas x Demais por enquanto (trabalhando por partes, a pedido do
 * usuário). Por isso a lista de baixo NÃO tem os chips "Facilities: N /
 * Terceiros: N" que a versão dos Megas tem — aqui só existe uma equipe pra
 * mostrar.
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
  const foraSla    = obterPreventivasForaSla_(ref.ano, ref.index);

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

  const marginX = 30, topY = 80, gap = 25, cardH = 140;
  const cardW = (W - marginX * 2 - gap) / 2;

  _prevCardMetrica_(slide, marginX,               topY, cardW, cardH, dadosMensal,    DS.colors.themePrev);
  _prevCardMetrica_(slide, marginX + cardW + gap, topY, cardW, cardH, dadosAcumulado, DS.colors.brandLight);

  const slaY = topY + cardH + gap, slaH = H - slaY - 20, slaW = W - marginX * 2;
  _prevListaForaSla_(slide, marginX, slaY, slaW, slaH, foraSla);

  Logger.log('✓ Preventivas gerado — mês ' + dadosMensal.previstas + '/' + dadosMensal.realizadas +
             ', acumulado ' + dadosAcumulado.previstas + '/' + dadosAcumulado.realizadas +
             ', ' + foraSla.length + ' serviço(s) fora do SLA no mês');
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

// Painel vermelho com a relação de preventivas fora do SLA no mês — mesmo
// componente de megas-mensal/Slide02_Preventivas.gs (_desenharListaServicos),
// sem os chips de equipe (Facilities/Terceiros): aqui só existe Propriedades.
function _prevListaForaSla_(slide, x, y, w, h, servicos) {
  const DS = CR_DESIGN_SYSTEM;
  criarCardPainel(slide, x, y, w, h, null, DS.colors.accentRed);

  const headerH = 30;
  const titleTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 5, w - 220, 25);
  titleTxt.getText().setText('RELAÇÃO DE PREVENTIVAS QUE NÃO CUMPRIRAM O SLA').getTextStyle()
    .setFontSize(10).setBold(true).setForegroundColor(DS.colors.accentRed).setFontFamily(DS.typography.titles);

  const totalTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w - 160, y + 5, 145, 20);
  totalTxt.getText().setText(servicos.length + ' serviço(s)').getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
  totalTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  totalTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  const listY = y + headerH + 15, listH = h - headerH - 25;

  if (servicos.length > 0) {
    if (servicos.length > 4) {
      const splitIndex = Math.ceil(servicos.length / 2);
      _prevColunaTexto_(slide, x + 20, listY, (w / 2) - 30, listH, servicos.slice(0, splitIndex));
      _prevColunaTexto_(slide, x + (w / 2) + 10, listY, (w / 2) - 30, listH, servicos.slice(splitIndex));
      const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + (w / 2), listY, 1, listH - 20);
      div.getFill().setSolidFill('#F1F5F9'); div.getBorder().setTransparent();
    } else {
      _prevColunaTexto_(slide, x + 20, listY, w - 40, listH, servicos);
    }
  } else {
    const okBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, listY + 20, w, 30);
    okBox.getText().setText('Nenhum desvio registrado.').getTextStyle()
      .setFontSize(11).setItalic(true).setBold(true)
      .setForegroundColor(DS.colors.accentGreen).setFontFamily(DS.typography.titles);
    okBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }
}

function _prevColunaTexto_(slide, x, y, w, h, servicos) {
  const DS = CR_DESIGN_SYSTEM;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  const textRange = box.getText();
  textRange.setText('');
  servicos.forEach(s => {
    const bullet = textRange.appendText('• ');
    bullet.getTextStyle().setForegroundColor(DS.colors.textMuted).setFontSize(9).setBold(true);
    const texto = s.nome + (s.qtd > 1 ? ' (' + s.qtd + 'x)' : '');
    const parte = textRange.appendText(texto + '\n');
    parte.getTextStyle().setFontSize(9).setFontFamily(DS.typography.body)
      .setBold(true).setForegroundColor(DS.colors.textMain);
  });
  box.getText().getParagraphStyle().setLineSpacing(130);
  box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
}
