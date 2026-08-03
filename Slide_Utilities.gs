/**
 * ARQUIVO: Slide_Utilities.gs
 * COMPONENTE — GESTÃO DE UTILITIES (consumo e gasto de Energia e Água)
 * DESCRIÇÃO: Gera até 4 slides — Energia (R$), Energia (kWh), Água (R$),
 * Água (m³) — a partir da aba "UTILITIES" da planilha da cidade ativa (ver
 * obterDadosUtilities_ em 02_Dados.gs). Só Itajaí e Esteio por enquanto —
 * Curitiba tem o slide dedicado de Energia Solar (Slide10_EnergiaSolar.gs).
 *
 * Cada slide é um gráfico de barras agrupadas por mês, uma barra por ano
 * disponível na planilha: o ano mais recente entra na cor de destaque da
 * métrica (energia = âmbar, água = azul), os anos anteriores em tons de
 * cinza (mais antigo = mais escuro). O mês de referência da apresentação
 * (obterMesReferencia_) ganha uma faixa vertical suave e o rótulo em negrito
 * — mesma ideia do quadro vermelho manual, sem o alarme visual.
 *
 * Sem aba UTILITIES, ou aba sem nenhuma seção reconhecida: a função não gera
 * nada e não quebra o resto da apresentação.
 */

function gerarSlidesUtilities_() {
  const dados = obterDadosUtilities_();
  if (!dados) {
    Logger.log('Utilities: sem dados (aba "UTILITIES" ausente ou vazia) — nenhum slide gerado.');
    return;
  }

  const ref = obterMesReferencia_();

  const paineis = [
    { chave: 'energia', metrica: 'valor',   titulo: 'ENERGIA (R$)',  fmt: _utilFmtMoeda_, cor: '#F59E0B' },
    { chave: 'energia', metrica: 'consumo', titulo: 'ENERGIA (kWh)', fmt: _utilFmtNum_,   cor: '#F59E0B' },
    { chave: 'agua',    metrica: 'valor',   titulo: 'ÁGUA (R$)',     fmt: _utilFmtMoeda_, cor: CORES.lightBlue },
    { chave: 'agua',    metrica: 'consumo', titulo: 'ÁGUA (m³)',     fmt: _utilFmtNum_,   cor: CORES.lightBlue }
  ];

  let gerados = 0;
  paineis.forEach(p => {
    const bloco = dados[p.chave];
    if (!bloco) return;
    const serie = bloco[p.metrica];
    if (!serie || serie.anos.length === 0) return;
    _utilSlideGrafico_(p.titulo, serie, p.fmt, p.cor, ref);
    gerados++;
  });

  Logger.log('Utilities: ' + gerados + ' slide(s) gerado(s) a partir da aba UTILITIES.');
}

function _utilSlideGrafico_(titulo, serie, fmt, corDestaque, ref) {
  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'GESTÃO DE UTILITIES',
    titulo + ' · Comparativo mensal · Mês de referência: ' + ref.curto + '/' + ref.ano);

  const marginX = 28, topY = 74;
  const chartH  = H - topY - 16;
  _utilGrafico_(slide, marginX, topY, W - marginX * 2, chartH, serie, fmt, corDestaque, ref);

  Logger.log('Slide Utilities gerado → ' + titulo);
}

// ── Gráfico de barras agrupadas por ano ────────────────────────────────────
function _utilGrafico_(slide, x, y, w, h, serie, fmt, corDestaque, ref) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  const anos = serie.anos;   // ascendente: [2024, 2025, 2026...]
  const n    = anos.length;

  const mL = 56, mR = 14, mT = 34, mB = 32;
  const plotW = w - mL - mR;
  const plotH = h - mT - mB;
  const plotX = x + mL;
  const plotY = y + mT;
  const slotW = plotW / 12;

  // Realce do mês de referência — faixa vertical suave atrás do grupo de barras.
  if (ref.index >= 0 && ref.index <= 11) {
    const hl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + ref.index * slotW, plotY, slotW, plotH);
    hl.getFill().setSolidFill(corDestaque, 0.08);
    hl.getBorder().setTransparent();
  }

  const todosValores = anos.flatMap(a => serie.porAno[a].filter(v => v != null));
  const vMax   = todosValores.length ? Math.max(...todosValores) : 0;
  const escMax = _utilEscalaTeto_(vMax);

  // Grade + rótulos do eixo Y
  const nGrid = 4;
  for (let gi = 0; gi <= nGrid; gi++) {
    const gy   = plotY + plotH - (gi / nGrid) * plotH;
    const gVal = (gi / nGrid) * escMax;
    const gl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, gi === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(gi === 0 ? '#94A3B8' : '#E2E8F0'); gl.getBorder().setTransparent();
    _sTxt(slide, x, gy - 7, mL - 6, 14, fmt(gVal), 7, false, CORES.textGray, 'right');
  }

  // Barras — uma por ano, agrupadas dentro do slot do mês. Rótulo de valor
  // só no ano mais recente (senão os 12x3 números lotam o gráfico) — o
  // comparativo entre anos completo fica no cabeçalho do mês de referência
  // logo abaixo, sem risco de sobrepor barra ou rótulo vizinho.
  const barPad = slotW * 0.14;
  const barW   = (slotW - barPad * (n + 1)) / n;
  const bBase  = plotY + plotH;

  for (let mes = 0; mes < 12; mes++) {
    const slotX = plotX + mes * slotW;
    anos.forEach((ano, i) => {
      const val = serie.porAno[ano][mes];
      if (val == null) return;
      const bh = escMax > 0 ? (val / escMax) * plotH : 0;
      if (bh <= 0.5) return;
      const bx  = slotX + barPad + i * (barW + barPad);
      const cor = _utilCorSerie_(i, n, corDestaque);
      const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, bBase - bh, barW, bh);
      bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();

      if (i === n - 1) {   // ano mais recente — valor acima da própria barra
        const lw = 42;
        _sTxt(slide, bx + barW / 2 - lw / 2, bBase - bh - 13, lw, 11, fmt(val), 6.5, true, cor, 'center');
      }
    });

    const destaque = mes === ref.index;
    _sTxt(slide, slotX, bBase + 4, slotW, 12, MESES_3_REF[mes], destaque ? 7.5 : 6.5,
      destaque, destaque ? corDestaque : CORES.textDark, 'center');
  }

  // Legenda — um chip por ano, alinhada à direita no topo do painel
  const legY = y + 10;
  let legX = x + w - 14;
  for (let i = n - 1; i >= 0; i--) {
    const rotulo = String(anos[i]);
    const lw = 12 + rotulo.length * 5.5 + 16;
    legX -= lw;
    _solarRect(slide, legX, legY, 10, 8, _utilCorSerie_(i, n, corDestaque));
    _sTxt(slide, legX + 13, legY - 1, lw - 13, 11, rotulo, 7.5, false, CORES.textDark, 'left');
  }

  // Comparativo do mês de referência — os 3 anos lado a lado, no topo
  // esquerdo (a legenda fica à direita, então não colidem em nenhum cenário).
  if (ref.index >= 0 && ref.index <= 11) {
    _utilComparativoMes_(slide, plotX, y + 9, serie, fmt, ref, anos, corDestaque);
  }
}

function _utilComparativoMes_(slide, x, y, serie, fmt, ref, anos, corDestaque) {
  let cx = x;
  const rotuloMes = MESES_3_REF[ref.index] + '/' + ref.ano + ':';
  const wMes = 16 + rotuloMes.length * 5;
  _sTxt(slide, cx, y, wMes, 12, rotuloMes, 7.5, true, CORES.textDark, 'left');
  cx += wMes;
  anos.forEach((ano, i) => {
    const val = serie.porAno[ano][ref.index];
    const txt = val != null ? fmt(val) : '—';
    const cor = _utilCorSerie_(i, anos.length, corDestaque);
    _solarRect(slide, cx, y + 3, 7, 7, cor);
    const tw = 14 + txt.length * 5;
    _sTxt(slide, cx + 10, y - 1, tw, 12, txt, 7.5, i === anos.length - 1, cor, 'left');
    cx += 10 + tw + 6;
  });
}

// Ano mais recente = cor de destaque da métrica; anteriores em cinza,
// do mais antigo (mais escuro) ao mais novo (mais claro).
function _utilCorSerie_(i, n, corDestaque) {
  if (i === n - 1) return corDestaque;
  const grays = ['#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'];
  return grays[Math.min(i, grays.length - 1)];
}

// Teto "arredondado" do eixo Y com ~15% de folga acima do maior valor.
function _utilEscalaTeto_(vMax) {
  if (vMax <= 0) return 10;
  const mag   = Math.pow(10, Math.floor(Math.log10(vMax)));
  const passo = mag / 4;
  return Math.ceil((vMax * 1.15) / passo) * passo;
}

function _utilFmtMoeda_(v) {
  if (v == null || isNaN(v)) return '';
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

function _utilFmtNum_(v) {
  if (v == null || isNaN(v)) return '';
  return Math.round(v).toLocaleString('pt-BR');
}
