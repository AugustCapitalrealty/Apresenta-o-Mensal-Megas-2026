/**
 * ARQUIVO: Slide_EnergiaSolar.gs
 * DESCRIÇÃO: Slide de Energia Solar — KPIs + variação vs mês anterior + gráfico barras duplo.
 */

function gerarSlideEnergiaSolar() {
  const dados = obterDadosEnergiaSolar();
  if (!dados) {
    Logger.log('Energia Solar: sem dados, slide ignorado.');
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();   // 720
  const H     = deck.getPageHeight();  // 405
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const { atual, anterior, meses } = dados;

  criarHeaderPadrao(slide, 'ENERGIA SOLAR',
    'Desempenho do mês de ' + atual.mes + (anterior ? ' · vs ' + anterior.mes : ''));

  // ── KPI Cards ────────────────────────────────────────────────────────
  const marginX = 28;
  const topY    = 74;
  const cardH   = 72;
  const gap     = 10;
  const cardW   = (W - marginX * 2 - gap * 3) / 4;

  const COR_GER = '#10B981';  // verde — geração
  const COR_CON = '#F87171';  // vermelho claro — consumo

  const kpis = [
    { label: 'CO² neutralizado (t)',  val: atual.co2,     ant: anterior ? anterior.co2     : null, fmt: v => _solarFmtDec(v, 2), icon: '🌿' },
    { label: 'Carvão evitado (t)',    val: atual.carvao,  ant: anterior ? anterior.carvao  : null, fmt: v => _solarFmtDec(v, 2), icon: '♻️' },
    { label: 'Árvores plantadas',     val: atual.arvores, ant: anterior ? anterior.arvores : null, fmt: v => _solarFmtInt(v),    icon: '🌳' },
    { label: 'KM neutro veículo',     val: atual.km,      ant: anterior ? anterior.km      : null, fmt: v => _solarFmtInt(v),    icon: '🚗' }
  ];

  kpis.forEach((k, i) => {
    const x = marginX + i * (cardW + gap);
    _solarCard(slide, x, topY, cardW, cardH, k);
  });

  // ── Gráfico ──────────────────────────────────────────────────────────
  const chartY = topY + cardH + gap;
  const chartH = H - chartY - 16;
  _solarGrafico(slide, marginX, chartY, W - marginX * 2, chartH, meses, COR_GER, COR_CON);

  Logger.log('Slide Energia Solar gerado → ' + atual.mes);
}


// ── Card KPI ────────────────────────────────────────────────────────────

function _solarCard(slide, x, y, w, h, kpi) {
  // Sombra
  const sh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 2, y + 2, w, h);
  sh.getFill().setSolidFill('#CBD5E1'); sh.getBorder().setTransparent(); sh.sendToBack();

  // Fundo
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  // Barra topo escura
  const strip = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, 22);
  strip.getFill().setSolidFill(CORES.darkBlue); strip.getBorder().setTransparent();
  const mask = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 16, w, 8);
  mask.getFill().setSolidFill(CORES.white); mask.getBorder().setTransparent();

  // Label
  _sTxt(slide, x + 4, y + 3, w - 8, 16, kpi.label, 7.5, true, CORES.white, 'center');

  // Valor principal
  const valStr = kpi.val != null ? kpi.fmt(kpi.val) : '—';
  _sTxt(slide, x + 4, y + 18, w - 8, 28, valStr, 22, true, CORES.darkBlue, 'center');

  // Delta
  if (kpi.ant != null && kpi.val != null) {
    const diff   = kpi.val - kpi.ant;
    const pct    = kpi.ant !== 0 ? (diff / Math.abs(kpi.ant)) * 100 : null;
    const seta   = diff >= 0 ? '▲' : '▼';
    const cor    = diff >= 0 ? '#10B981' : '#EF4444';
    const pctStr = pct != null ? ' (' + (diff >= 0 ? '+' : '') + pct.toFixed(1) + '%)' : '';
    _sTxt(slide, x + 4, y + 47, w - 8, 14, seta + ' ' + kpi.fmt(Math.abs(diff)) + pctStr, 8, true, cor, 'center');
    _sTxt(slide, x + 4, y + 59, w - 8, 12, 'vs mês anterior', 6.5, false, CORES.textGray, 'center');
  } else if (kpi.val == null) {
    _sTxt(slide, x + 4, y + 52, w - 8, 14, 'sem dado', 7, false, '#94A3B8', 'center');
  }
}


// ── Gráfico de barras ───────────────────────────────────────────────────

function _solarGrafico(slide, x, y, w, h, meses, corGer, corCon) {
  // Fundo branco arredondado
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  if (!meses || meses.length === 0) return;

  const mL = 46, mR = 10, mT = 12, mB = 32;
  const plotW = w - mL - mR;
  const plotH = h - mT - mB;
  const plotX = x + mL;
  const plotY = y + mT;

  const allVals = meses.flatMap(m => [m.geracao || 0, m.consumo || 0]);
  const vMax    = Math.max(...allVals);
  const escMax  = vMax > 0 ? Math.ceil(vMax / 2000) * 2000 * 1.12 : 10000;

  // Grid lines + labels Y
  const nGrid = 4;
  for (let gi = 0; gi <= nGrid; gi++) {
    const gy   = plotY + plotH - (gi / nGrid) * plotH;
    const gVal = (gi / nGrid) * escMax;
    const gl   = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, gi === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(gi === 0 ? '#94A3B8' : '#E2E8F0'); gl.getBorder().setTransparent();
    _sTxt(slide, x, gy - 7, mL - 4, 14, _solarFmtKwh(gVal), 7, false, CORES.textGray, 'right');
  }

  const n      = meses.length;
  const slotW  = plotW / n;
  const barPad = slotW * 0.10;
  const barW   = (slotW - barPad * 3) / 2;

  meses.forEach((m, i) => {
    const sx    = plotX + i * slotW + barPad;
    const bBase = plotY + plotH;

    // Barra Geração — label centralizada na barra, largura = slotW inteiro
    const gH = escMax > 0 ? (m.geracao / escMax) * plotH : 0;
    if (gH > 1) {
      const gb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, bBase - gH, barW, gH);
      gb.getFill().setSolidFill(corGer); gb.getBorder().setTransparent();
      const gLabelX = sx + barW / 2 - slotW / 2;
      _sTxt(slide, gLabelX, bBase - gH - 16, slotW, 14,
        _solarFmtKwh(m.geracao), 7, true, corGer, 'center');
    }

    // Barra Consumo — label centralizada na barra, largura = slotW inteiro
    const cH = escMax > 0 ? (m.consumo / escMax) * plotH : 0;
    const cx  = sx + barW + barPad;
    if (cH > 1) {
      const cb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, bBase - cH, barW, cH);
      cb.getFill().setSolidFill(corCon); cb.getBorder().setTransparent();
      const cLabelX = cx + barW / 2 - slotW / 2;
      _sTxt(slide, cLabelX, bBase - cH - 16, slotW, 14,
        _solarFmtKwh(m.consumo), 7, true, corCon, 'center');
    }

    // Label X
    _sTxt(slide, plotX + i * slotW, bBase + 4, slotW, 12, m.mes, 6.5, false, CORES.textDark, 'center');
  });

  // Legenda
  const legY = y + h - 10;
  const legX = x + mL;
  _solarRect(slide, legX,      legY, 10, 8, corGer);
  _sTxt(slide, legX + 12, legY - 1, 80, 11, 'Geração (kWh)',  7, false, CORES.textDark, 'left');
  _solarRect(slide, legX + 95, legY, 10, 8, corCon);
  _sTxt(slide, legX + 107, legY - 1, 80, 11, 'Consumo (kWh)', 7, false, CORES.textDark, 'left');
}


// ── Utilitários ─────────────────────────────────────────────────────────

function _sTxt(slide, x, y, w, h, txt, size, bold, cor, align) {
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const ts = tb.getText();
  ts.setText(String(txt));
  const st = ts.getTextStyle();
  st.setFontSize(size).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
  const ps = ts.getParagraphStyle();
  if (align === 'center')     ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  else if (align === 'right') ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  else                         ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  tb.getBorder().setTransparent();
}

function _solarRect(slide, x, y, w, h, cor) {
  const s = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  s.getFill().setSolidFill(cor); s.getBorder().setTransparent();
}

function _solarFmtDec(v, c) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
}

function _solarFmtInt(v) {
  if (v == null || isNaN(v)) return '—';
  return Math.round(v).toLocaleString('pt-BR');
}

function _solarFmtKwh(v) {
  if (!v && v !== 0) return '';
  if (v >= 1000) return (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k';
  return Math.round(v).toLocaleString('pt-BR');
}
