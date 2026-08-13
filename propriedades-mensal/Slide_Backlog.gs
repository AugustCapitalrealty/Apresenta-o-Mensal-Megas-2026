/**
 * ARQUIVO: Slide_Backlog.gs
 * SLIDE — BACKLOG (Demandas em Aberto)
 *
 * Backlog (chamados em aberto) por Centro de Custos, em GRÁFICO de barras —
 * uma barra por imóvel, todos juntos num gráfico só (Megas e Demais
 * Imóveis misturados, maior primeiro — pedido do usuário, sem separar em
 * blocos). Antes era tabela (motor de 03_Tabelas.gs), depois virou gráfico
 * em dois blocos separados; agora é um gráfico único. _sTxt/
 * _utilEscalaTeto_ já estão em Slide_Corretivas.gs (mesmo namespace,
 * reaproveitados aqui).
 */

const PROP_BACKLOG_MAX_BARRAS = 14;

function gerarSlideBacklog() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG — DEMANDAS EM ABERTO',
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
      const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, plotY + plotH - hBar, barW, hBar);
      bar.getFill().setSolidFill(DS.colors.brandLight);
      bar.getBorder().setTransparent();
    }

    _sTxt(slide, plotX + i * slotW, plotY + plotH - hBar - 16, slotW, 14,
      formatarNumeroBR(b.total), 9, true, DS.colors.brandDark, 'center');

    _sTxt(slide, plotX + i * slotW - slotW * 0.1, plotY + plotH + 4, slotW * 1.2, 28,
      b.cc, 6.5, true, DS.colors.textMain, 'center');
  });
}
