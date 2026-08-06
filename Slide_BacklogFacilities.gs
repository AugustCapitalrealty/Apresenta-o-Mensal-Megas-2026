/**
 * ARQUIVO: Slide_BacklogFacilities.gs
 * SLIDE — BACKLOG FACILITIES (evolução mensal de chamados)
 * DESCRIÇÃO: Substitui o espaço reservado ("cole o gráfico aqui") pelo
 * gráfico automático de Chamados Geral, Facilities, Property e Responsabilidade
 * Locatário, lido da aba "BACKLOG" da planilha de HISTÓRICO VALIDADO
 * (obterDadosBacklogHistorico_ em 02_Dados.gs) — Facilities/Geral batem com
 * as linhas "Chamados de facilities"/"Chamados geral" da aba DADOS de cada
 * Mega; Property e Responsabilidade Locatário só existem na aba BACKLOG.
 *
 * Diferente dos gráficos de Utilities/Monitoramento (grade fixa de 12 meses
 * do ano, uma linha por ano), aqui é uma linha do tempo contínua — os
 * últimos 12 meses disponíveis, em ordem cronológica, sem repetir a grade
 * a cada ano. Quatro linhas, todo mês com rótulo de valor (o mês mais
 * recente em destaque, maior e em negrito); se duas séries ficarem
 * próximas demais na vertical num mesmo mês, uma afasta a outra.
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
             ' (geral=' + atual.geral + ', facilities=' + atual.facilities +
             ', property=' + atual.property + ', locatario=' + atual.locatario + ').');
}

// ── Cards de KPI — chamados do mês, com delta vs mês anterior ─────────────
function _backlogCardsKPI_(slide, x, y, w, h, atual, anterior) {
  const gap   = 8;
  const cardW = (w - gap * 3) / 4;

  const cards = [
    { label: 'CHAMADOS GERAL',      val: atual.geral,      ant: anterior ? anterior.geral      : null, fmt: formatarNumeroBR, cor: CORES.darkBlue,   notaTxt: 'vs mês anterior' },
    { label: 'CHAMADOS FACILITIES', val: atual.facilities, ant: anterior ? anterior.facilities : null, fmt: formatarNumeroBR, cor: CORES.lightBlue,  notaTxt: 'vs mês anterior' },
    { label: 'CHAMADOS PROPERTY',   val: atual.property,   ant: anterior ? anterior.property   : null, fmt: formatarNumeroBR, cor: CORES.themeCorr,  notaTxt: 'vs mês anterior' },
    { label: 'RESPONSABILIDADE LOCATÁRIO', val: atual.locatario, ant: anterior ? anterior.locatario : null, fmt: formatarNumeroBR, cor: CORES.cardGreen, notaTxt: 'vs mês anterior' }
  ];

  cards.forEach((c, i) => {
    const cx = x + i * (cardW + gap);
    _utilCard_(slide, cx, y, cardW, h, c, c.cor);
  });
}

// ── Gráfico de linha — Geral, Facilities, Property e Responsabilidade Locatário, cronológico ──
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

  const SERIES = [
    { chave: 'geral',     rotulo: 'Geral',      cor: CORES.darkBlue,   destaque: true  },
    { chave: 'facilities', rotulo: 'Facilities', cor: CORES.lightBlue,  destaque: false },
    { chave: 'property',   rotulo: 'Property',   cor: CORES.themeCorr,  destaque: false },
    { chave: 'locatario',  rotulo: 'Responsabilidade Locatário', cor: CORES.cardGreen, destaque: false }
  ];

  // Realce do mês de referência (o mais recente) — mesma ideia da faixa
  // suave usada nos gráficos de Utilities/Monitoramento.
  const hl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + (n - 1) * slotW, plotY, slotW, plotH);
  hl.getFill().setSolidFill(CORES.darkBlue, 0.06);
  hl.getBorder().setTransparent();

  const todosValores = meses.flatMap(m => SERIES.map(s => m[s.chave])).filter(v => v != null);
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

  // Desenha Geral por último (por cima), mas mede/rotula todas.
  const desenhadas = SERIES.map(s => ({
    serie: s,
    pontos: _utilDesenharLinha_(slide, plotX, plotY, plotH, slotW, meses.map(m => m[s.chave]), s.cor, escMax, s.destaque)
  }));

  // Rótulo de valor em TODO mês de cada série (até 4 por coluna). Se duas
  // séries ficarem próximas demais na vertical no mesmo mês, afasta uma da
  // outra. O mês mais recente ganha corpo maior e negrito, igual ao rótulo
  // do eixo X — os demais ficam menores pra não pesar o gráfico.
  for (let i = 0; i < n; i++) {
    const destaque = i === n - 1;
    const coluna = desenhadas
      .map(d => { const p = d.pontos[i]; return p ? { x: p.x, y: p.y, val: p.val, cor: d.serie.cor } : null; })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y);
    const gapMin = destaque ? 11 : 9;
    for (let k = 1; k < coluna.length; k++) {
      if (coluna[k].y - coluna[k - 1].y < gapMin) coluna[k].y = coluna[k - 1].y + gapMin;
    }
    const lw = destaque ? 30 : 24, folga = destaque ? 10 : 6;
    coluna.forEach(r => {
      _sTxt(slide, r.x - lw / 2 - folga, r.y - (destaque ? 18 : 16), lw + folga * 2, 11,
        formatarNumeroBR(r.val), destaque ? 6.5 : 5.5, destaque, r.cor, 'center');
    });
  }

  // Rótulos do eixo X — cronológicos (ex.: "JUL/25"), não meses do ano.
  meses.forEach((m, i) => {
    const slotX = plotX + i * slotW;
    const destaque = i === n - 1;
    _sTxt(slide, slotX, plotY + plotH + 4, slotW, 12, m.rotulo, destaque ? 7.5 : 6.5,
      destaque, destaque ? CORES.darkBlue : CORES.textDark, 'center');
  });

  // Legenda — Geral, Facilities, Property, Responsabilidade Locatário (esquerda pra direita),
  // alinhada à direita no topo do painel.
  const legY = y + 10;
  let legX = x + w - 14;
  SERIES.slice().reverse().forEach(s => {
    const lw = 12 + s.rotulo.length * 5.5 + 16;
    legX -= lw;
    _solarRect(slide, legX, legY, 10, 8, s.cor);
    _sTxt(slide, legX + 13, legY - 1, lw - 13, 11, s.rotulo, 7.5, false, CORES.textDark, 'left');
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Backlog Facilities — evolução mensal de chamados, busca automática na aba
// BACKLOG da planilha de Histórico Validado. Sem linha para a cidade, cai
// no slide manual de espaço reservado.
function gerarSoBacklogFacilitiesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogFacilities(); }
function gerarSoBacklogFacilitiesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogFacilities(); }
function gerarSoBacklogFacilitiesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogFacilities(); }
