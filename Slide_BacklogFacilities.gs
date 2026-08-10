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
 * a cada ano.
 *
 * Gráfico COMBINADO (pedido do gestor): o Geral — o total, que contém as
 * outras séries — é desenhado como COLUNA, e as três séries que o compõem
 * (Facilities, Property e Responsabilidade Locatário) como LINHAS por cima
 * dela. A coluna entrega o volume do mês batendo o olho; as linhas mostram
 * como esse volume se divide, sem competir visualmente com o total.
 *
 * Todo mês tem rótulo de valor em todas as séries (o mês mais recente em
 * destaque, maior e em negrito); se duas séries ficarem próximas demais na
 * vertical num mesmo mês, uma afasta a outra.
 *
 * Sem a aba BACKLOG preenchida (ou sem linha para a cidade ativa): cai no
 * slide manual de espaço reservado (gerarSlideReservaGraficos), sem quebrar
 * a geração.
 */

// Preenchimento das colunas do Geral: tom claro da família do azul
// institucional (#151E49). A barra é o pano de fundo do gráfico — as três
// linhas passam por dentro dela —, então precisa ser leve o bastante pra
// não competir com elas nem pesar o slide ("esse azul ficou muito forte").
//
// O tom é claro também por contraste: a linha de Property é âmbar
// (#F59E0B), de luminância média, e num azul só um pouco mais claro que o
// navy ela sumia dentro da coluna. Neste tom as três linhas se destacam do
// preenchimento (ver o teste de contraste em test-backlog-facilities-grafico.js).
const BACKLOG_COR_COLUNA = '#C6CFE6';

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

// Desenha uma série como COLUNAS (uma barra por mês, centralizada no slot) e
// devolve os mesmos pontos {x, y, val} que _utilDesenharLinha_ devolve — o x
// no centro da barra e o y no topo dela —, pra que o rotulador de valores e
// o desempate vertical funcionem igual pras duas formas, sem código
// duplicado.
//
// A barra é larga o bastante pra dar peso visual ao total, mas não tanto que
// encoste na do mês seguinte (as linhas passam por dentro dela).
function _backlogDesenharColuna_(slide, plotX, plotY, plotH, slotW, valoresPorMes, cor, escMax) {
  const barW = Math.min(slotW * 0.52, 34);
  return valoresPorMes.map((val, mes) => {
    const cx = plotX + mes * slotW + slotW / 2;
    if (val == null) return null;
    const alturaBarra = escMax > 0 ? (val / escMax) * plotH : 0;
    const topo = plotY + plotH - alturaBarra;
    if (alturaBarra > 0) {
      const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx - barW / 2, topo, barW, alturaBarra);
      barra.getFill().setSolidFill(cor);
      barra.getBorder().setTransparent();
    }
    return { x: cx, y: topo, val: val };
  });
}

// ── Gráfico combinado — Geral em COLUNA; Facilities, Property e
// Responsabilidade Locatário em LINHA, cronológico ──
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

  // Gráfico COMBINADO, a pedido do gestor: o Geral (o total, que contém as
  // outras séries) vira COLUNA e as três séries que o compõem — Facilities,
  // Property e Responsabilidade Locatário — seguem em LINHA por cima. A
  // coluna dá o volume do mês batendo o olho; as linhas mostram como esse
  // volume se divide, sem competir visualmente com o total.
  // `cor` é a cor do TRAÇO/rótulo da série; `corBarra` (só na série em
  // coluna) é o preenchimento da barra. Os dois são separados de propósito:
  // preencher a barra inteira com o azul institucional (#151E49) pesava
  // demais no slide e engolia as linhas que passam por dentro dela — a
  // barra usa um tom BEM mais claro da mesma família, e o rótulo de valor
  // continua no navy escuro pra seguir legível sobre o fundo branco.
  const SERIES = [
    { chave: 'geral',      rotulo: 'Geral',      cor: CORES.darkBlue,   corBarra: BACKLOG_COR_COLUNA, modo: 'coluna', destaque: true  },
    { chave: 'facilities', rotulo: 'Facilities', cor: CORES.lightBlue,  modo: 'linha',  destaque: false },
    { chave: 'property',   rotulo: 'Property',   cor: CORES.themeCorr,  modo: 'linha',  destaque: false },
    { chave: 'locatario',  rotulo: 'Responsabilidade Locatário', cor: CORES.cardGreen, modo: 'linha', destaque: false }
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

  // As COLUNAS vêm primeiro (ficam ao fundo) e as LINHAS por cima, senão a
  // barra do Geral cobriria as três linhas que passam dentro dela.
  const desenhadas = SERIES.map(s => ({
    serie: s,
    pontos: s.modo === 'coluna'
      ? _backlogDesenharColuna_(slide, plotX, plotY, plotH, slotW, meses.map(m => m[s.chave]), s.corBarra || s.cor, escMax)
      : null
  }));
  desenhadas.forEach(d => {
    if (d.serie.modo === 'coluna') return;
    d.pontos = _utilDesenharLinha_(slide, plotX, plotY, plotH, slotW,
      meses.map(m => m[d.serie.chave]), d.serie.cor, escMax, d.serie.destaque);
  });

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
  // Ícone condiz com a forma da série (quadrado = coluna, traço com bolinha
  // = linha), pra legenda não sugerir que tudo é do mesmo tipo.
  SERIES.slice().reverse().forEach(s => {
    const lw = 12 + s.rotulo.length * 5.5 + 16;
    legX -= lw;
    _utilLegendaIcone_(slide, legX, legY, 10, 8, s.corBarra || s.cor, s.modo === 'coluna' ? 'barra' : 'linha');
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
