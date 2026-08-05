/**
 * ARQUIVO: Slide_BacklogFacilities.gs
 * SLIDE — BACKLOG FACILITIES (evolução mensal de chamados)
 * DESCRIÇÃO: Substitui o espaço reservado ("cole o gráfico aqui") pelo
 * gráfico automático de Chamados Facilities x Geral, lido da aba "BACKLOG"
 * da planilha de HISTÓRICO VALIDADO (obterDadosBacklogHistorico_ em
 * 02_Dados.gs) — os mesmos números já lançados na aba DADOS de cada Mega
 * ("Chamados de facilities"/"Chamados geral"), só que consolidados numa
 * série cronológica.
 *
 * Diferente dos gráficos de Utilities/Monitoramento (grade fixa de 12 meses
 * do ano, uma linha por ano), aqui é uma linha do tempo contínua — os
 * últimos 12 meses disponíveis, em ordem cronológica, sem repetir a grade
 * a cada ano. Duas linhas (Facilities e Geral); só o mês mais recente ganha
 * rótulo de valor em cada linha, para não lotar o gráfico.
 *
 * Sem a aba BACKLOG preenchida (ou sem linha para a cidade ativa): cai no
 * slide manual de espaço reservado (gerarSlideReservaGraficos), sem quebrar
 * a geração.
 */

function gerarSlideBacklogFacilities() {
  const historico = obterDadosBacklogHistorico_();
  if (!historico || historico.length === 0) {
    gerarSlideReservaGraficos('BACKLOG FACILITIES',
      'Evolução mensal do backlog — preencha a aba BACKLOG da planilha de Histórico Validado',
      [{ titulo: '' }]);
    return;
  }

  const meses = historico.slice(-12);   // últimos 12 meses, mais recente por último
  const n = meses.length;
  const atual    = meses[n - 1];
  const anterior = n >= 2 ? meses[n - 2] : null;

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG FACILITIES',
    'Evolução mensal de chamados · Mês de referência: ' + atual.rotulo);

  const marginX = 28, topY = 74, cardH = 72, cardGap = 10;
  _backlogCardsKPI_(slide, marginX, topY, W - marginX * 2, cardH, atual, anterior);

  const chartY = topY + cardH + cardGap;
  const chartH = H - chartY - 16;
  _backlogGrafico_(slide, marginX, chartY, W - marginX * 2, chartH, meses);

  Logger.log('Slide Backlog Facilities gerado — ' + n + ' mês(es), atual=' + atual.rotulo +
             ' (facilities=' + atual.facilities + ', geral=' + atual.geral + ').');
}

// ── Cards de KPI — chamados do mês, com delta vs mês anterior ─────────────
function _backlogCardsKPI_(slide, x, y, w, h, atual, anterior) {
  const gap   = 10;
  const cardW = (w - gap) / 2;

  const cards = [
    { label: 'CHAMADOS FACILITIES', val: atual.facilities, ant: anterior ? anterior.facilities : null, fmt: formatarNumeroBR, cor: CORES.lightBlue, notaTxt: 'vs mês anterior' },
    { label: 'CHAMADOS GERAL',      val: atual.geral,      ant: anterior ? anterior.geral      : null, fmt: formatarNumeroBR, cor: CORES.darkBlue, notaTxt: 'vs mês anterior' }
  ];

  cards.forEach((c, i) => {
    const cx = x + i * (cardW + gap);
    _utilCard_(slide, cx, y, cardW, h, c, c.cor);
  });
}

// ── Gráfico de linha — Facilities x Geral, cronológico (não agrupado por ano) ──
function _backlogGrafico_(slide, x, y, w, h, meses) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  const n = meses.length;
  const mL = 56, mR = 14, mT = 34, mB = 32;
  const plotW = w - mL - mR;
  const plotH = h - mT - mB;
  const plotX = x + mL;
  const plotY = y + mT;
  const slotW = plotW / n;

  const corFacilities = CORES.lightBlue;
  const corGeral      = CORES.darkBlue;

  // Realce do mês de referência (o mais recente) — mesma ideia da faixa
  // suave usada nos gráficos de Utilities/Monitoramento.
  const hl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + (n - 1) * slotW, plotY, slotW, plotH);
  hl.getFill().setSolidFill(corGeral, 0.06);
  hl.getBorder().setTransparent();

  const todosValores = meses.flatMap(m => [m.facilities, m.geral]).filter(v => v != null);
  const vMax   = todosValores.length ? Math.max(...todosValores) : 0;
  const escMax = _utilEscalaTeto_(vMax);

  // Grade + rótulos do eixo Y
  const nGrid = 4;
  for (let gi = 0; gi <= nGrid; gi++) {
    const gy   = plotY + plotH - (gi / nGrid) * plotH;
    const gVal = (gi / nGrid) * escMax;
    const gl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, gi === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(gi === 0 ? '#94A3B8' : '#E2E8F0'); gl.getBorder().setTransparent();
    _sTxt(slide, x, gy - 7, mL - 6, 14, formatarNumeroBR(Math.round(gVal)), 7, false, CORES.textGray, 'right');
  }

  const valoresFacilities = meses.map(m => m.facilities);
  const valoresGeral      = meses.map(m => m.geral);

  const pontosGeral      = _utilDesenharLinha_(slide, plotX, plotY, plotH, slotW, valoresGeral,      corGeral,      escMax, true);
  const pontosFacilities = _utilDesenharLinha_(slide, plotX, plotY, plotH, slotW, valoresFacilities, corFacilities, escMax, false);

  // Rótulo de valor só no mês mais recente de cada linha — evita lotar o
  // gráfico com até 24 números (2 séries × 12 meses).
  [{ pontos: pontosFacilities, cor: corFacilities }, { pontos: pontosGeral, cor: corGeral }].forEach(serie => {
    const p = serie.pontos[n - 1];
    if (!p) return;
    const lw = 30, folga = 10;
    _sTxt(slide, p.x - lw / 2 - folga, p.y - 13, lw + folga * 2, 11,
      formatarNumeroBR(p.val), 6.5, true, serie.cor, 'center');
  });

  // Rótulos do eixo X — cronológicos (ex.: "JUL/25"), não meses do ano.
  meses.forEach((m, i) => {
    const slotX = plotX + i * slotW;
    const destaque = i === n - 1;
    _sTxt(slide, slotX, plotY + plotH + 4, slotW, 12, m.rotulo, destaque ? 7.5 : 6.5,
      destaque, destaque ? corGeral : CORES.textDark, 'center');
  });

  // Legenda — Geral e Facilities, alinhada à direita no topo do painel
  const legY = y + 10;
  let legX = x + w - 14;
  [{ rotulo: 'Geral', cor: corGeral }, { rotulo: 'Facilities', cor: corFacilities }].forEach(it => {
    const lw = 12 + it.rotulo.length * 5.5 + 16;
    legX -= lw;
    _solarRect(slide, legX, legY, 10, 8, it.cor);
    _sTxt(slide, legX + 13, legY - 1, lw - 13, 11, it.rotulo, 7.5, false, CORES.textDark, 'left');
  });
}
