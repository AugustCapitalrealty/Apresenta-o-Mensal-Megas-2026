/**
 * ARQUIVO: Slide_Corretivas.gs
 * SLIDE — INDICADORES DE CORRETIVAS
 *
 * Mesmo desenho do slide de Corretivas dos Megas
 * (megas-mensal/Slide03_Corretivas.gs): dois cards — VISÃO MENSAL e VISÃO
 * ACUMULADA — com Chamados criados / Chamados fechados / Tempo médio entre
 * criado e fechado; embaixo, o gráfico de barras BACKLOG DE CHAMADOS
 * EMERGÊNCIAS dos últimos 13 meses. Dado 100% da equipe PROPRIEDADES
 * (obterFluxoCorretivasPropriedades_/obterBacklogEmergencialPorMes_,
 * 02_Dados.gs).
 *
 * "Índice de disponibilidade" (a 4ª linha do card dos Megas) NÃO entra: lá
 * vem de uma aba digitada à mão por Mega, sem fórmula na base bruta — não
 * existe fonte equivalente pro portfólio de Propriedades, e inventar a
 * conta violaria a mesma regra que já tirou Recebimento de Obras do
 * Dashboard (nada de dado reconstruído/inventado). Decisão do usuário.
 *
 * O gráfico de Backlog Emergencial também difere do dos Megas num ponto:
 * lá conta emergencial de QUALQUER equipe (decisão explícita daquele
 * projeto); aqui só entra Propriedades, pelo mesmo corte do resto desta
 * apresentação.
 */

function gerarSlideCorretivas() {
  const deck = getDeckMensal_();
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'INDICADORES DE CORRETIVAS',
    'Backlog e Performance · ▲/▼ vs mês anterior');

  const ref  = obterMesReferencia_();
  const flux = obterFluxoCorretivasPropriedades_(ref.ano, ref.index);

  // Em dias, não horas — o valor bruto (tempoMedioH) já vem em horas de
  // obterFluxoCorretivasPropriedades_; só converte na exibição.
  const fmtTempo = h => h == null ? '—' : formatarNumeroBR(h / 24) + 'd';
  const dadosMensal = {
    titulo: 'VISÃO MENSAL',
    kpis: [
      { l: 'Chamados criados',                   v: flux.mensal.criados },
      { l: 'Chamados fechados',                  v: flux.mensal.fechados },
      { l: 'Tempo médio entre criado e fechado', v: fmtTempo(flux.mensal.tempoMedioH) }
    ]
  };
  const dadosAcumulado = {
    titulo: 'VISÃO ACUMULADA (' + ref.ano + ')',
    kpis: [
      { l: 'Chamados criados',                   v: flux.acumulado.criados },
      { l: 'Chamados fechados',                  v: flux.acumulado.fechados },
      { l: 'Tempo médio entre criado e fechado', v: fmtTempo(flux.acumulado.tempoMedioH) }
    ]
  };

  const marginX = 40, topY = 80, gap = 30, cardH = 130;
  const cardW = (W - marginX * 2 - gap) / 2;

  _corrCardKPIs_(slide, marginX,               topY, cardW, cardH, dadosMensal,    DS.colors.brandLight);
  _corrCardKPIs_(slide, marginX + cardW + gap, topY, cardW, cardH, dadosAcumulado, DS.colors.accentGreen);

  const chartY = topY + cardH + 20;
  const chartW = W - marginX * 2;
  const chartH = H - chartY - 20;
  const historico = obterBacklogEmergencialPorMes_(13);

  _corrGraficoEmergencial_(slide, marginX, chartY, chartW, chartH, historico);

  Logger.log('✓ Corretivas gerado — mês ' + flux.mensal.criados + ' criados/' + flux.mensal.fechados +
             ' fechados, ' + historico[historico.length - 1].qtd + ' emergencial(is) em aberto no mês de referência');
}

// Card com lista de KPIs (rótulo à esquerda, valor à direita) — mesmo
// componente de megas-mensal/Slide03_Corretivas.gs (desenharCardListaKPIs),
// só sem a seta de tendência ▲/▼ (que lá vem do histórico validado —
// mês-a-mês digitado —, que não existe pra Propriedades).
function _corrCardKPIs_(slide, x, y, w, h, dados, corTema) {
  const DS = CR_DESIGN_SYSTEM;
  const startY = criarCardPainel(slide, x, y, w, h, dados.titulo, corTema);
  const usableH = h - (startY - y) - 8;
  const rowH = usableH / dados.kpis.length;

  dados.kpis.forEach((kpi, i) => {
    const ry = startY + i * rowH;

    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, ry, w * 0.55, rowH);
    lblBox.getText().setText(kpi.l).getTextStyle()
      .setFontSize(8.5).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w * 0.55, ry, w * 0.40, rowH);
    valBox.getText().setText(String(kpi.v)).getTextStyle()
      .setFontSize(13).setBold(true).setForegroundColor(corTema).setFontFamily(DS.typography.titles);
    valBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
}

// Gráfico de barras — chamados emergenciais em aberto, mês a mês
// (cronológico, mais recente por último). Mesmo desenho de
// megas-mensal/Slide03_Corretivas.gs (_corretivasGraficoEmergencial_).
const PROP_MESES_MIN = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function _corrGraficoEmergencial_(slide, x, y, w, h, meses) {
  const DS = CR_DESIGN_SYSTEM;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const chartTitle = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 10, w - 30, 25);
  chartTitle.getText().setText('BACKLOG DE CHAMADOS EMERGÊNCIAS').getTextStyle()
    .setFontSize(10).setBold(true).setForegroundColor(DS.colors.brandLight).setFontFamily(DS.typography.titles);

  const n = meses.length;
  const mL = 14, mR = 14, mT = 42, mB = 26;
  const plotW = w - mL - mR, plotH = h - mT - mB;
  const plotX = x + mL, plotY = y + mT;
  const slotW = plotW / n;
  const barW  = Math.min(slotW * 0.5, 40);

  const vMax   = Math.max(0, ...meses.map(m => m.qtd));
  const escMax = _utilEscalaTeto_(vMax);

  meses.forEach((m, i) => {
    const slotX = plotX + i * slotW;
    const cx = slotX + (slotW - barW) / 2;
    const bh = (m.qtd > 0 && escMax > 0) ? Math.max((m.qtd / escMax) * plotH, 3) : 0;

    if (bh > 0) {
      const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, plotY + plotH - bh, barW, bh);
      bar.getFill().setSolidFill(DS.colors.brandLight);
      bar.getBorder().setTransparent();
    }
    _sTxt(slide, slotX, plotY + plotH - bh - 18, slotW, 13,
      String(m.qtd), 8.5, true, DS.colors.textMain, 'center');

    const rotuloEixo = PROP_MESES_MIN[m.index] + '.' + m.ano;
    _sTxt(slide, slotX, plotY + plotH + 6, slotW, 12, rotuloEixo, 6.5, false, DS.colors.textMuted, 'center');
  });
}

// Texto simples numa caixa, com alinhamento — cópia de
// megas-mensal/Slide10_EnergiaSolar.gs (_sTxt), usado pelos rótulos do
// gráfico acima.
function _sTxt(slide, x, y, w, h, txt, size, bold, cor, align) {
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const ts = tb.getText();
  ts.setText(String(txt));
  const st = ts.getTextStyle();
  st.setFontSize(size).setBold(!!bold).setForegroundColor(cor).setFontFamily(CR_DESIGN_SYSTEM.typography.body);
  const ps = ts.getParagraphStyle();
  if (align === 'center')     ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  else if (align === 'right') ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  else                        ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  tb.getBorder().setTransparent();
}

// Escala "redonda" pro topo do eixo Y — cópia de
// megas-mensal/Slide_Utilities.gs (_utilEscalaTeto_).
function _utilEscalaTeto_(vMax) {
  if (vMax <= 0) return 10;
  const mag   = Math.pow(10, Math.floor(Math.log10(vMax)));
  const passo = mag / 4;
  return Math.ceil((vMax * 1.15) / passo) * passo;
}
