/**
 * ARQUIVO: Slide10_EnergiaSolar.gs
 * SLIDE 10 — ENERGIA SOLAR
 * DESCRIÇÃO: KPIs + variação vs mês anterior + gráfico barras duplo.
 *            Dados: obterDadosEnergiaSolar() em 02_Dados.gs (só gera para Curitiba).
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
  const COR_CON = '#94A3B8';  // cinza-ardósia — consumo (neutro; vermelho lia como alarme)

  const kpis = [
    { label: 'CO² neutralizado (t)',  val: atual.co2,     ant: anterior ? anterior.co2     : null, fmt: v => _solarFmtDec(v, 2) },
    { label: 'Carvão evitado (t)',    val: atual.carvao,  ant: anterior ? anterior.carvao  : null, fmt: v => _solarFmtDec(v, 2) },
    { label: 'Árvores plantadas',     val: atual.arvores, ant: anterior ? anterior.arvores : null, fmt: v => _solarFmtInt(v) },
    { label: 'KM neutro veículo',     val: atual.km,      ant: anterior ? anterior.km      : null, fmt: v => _solarFmtInt(v) }
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
  // Card KPI padrão do design system (01_Config.gs)
  const valStr = kpi.val != null ? kpi.fmt(kpi.val) : '—';
  const opts = {
    label: kpi.label, valor: valStr,
    cor: CORES.lightBlue, corValor: CORES.darkBlue, tamValor: 20
  };

  if (kpi.ant != null && kpi.val != null) {
    const diff   = kpi.val - kpi.ant;
    const pct    = kpi.ant !== 0 ? (diff / Math.abs(kpi.ant)) * 100 : null;
    const seta   = diff >= 0 ? '▲' : '▼';
    const pctStr = pct != null ? ' (' + (diff >= 0 ? '+' : '') + pct.toFixed(1) + '%)' : '';
    opts.sub    = seta + ' ' + kpi.fmt(Math.abs(diff)) + pctStr;
    opts.corSub = diff >= 0 ? CORES.cardGreen : CORES.cardRed;
    opts.nota   = 'vs mês anterior';
  } else if (kpi.val == null) {
    opts.sub    = 'sem dado';
    opts.corSub = '#94A3B8';
  }

  criarCardKPI(slide, x, y, w, h, opts);
}


// ── Gráfico de barras ───────────────────────────────────────────────────

function _solarGrafico(slide, x, y, w, h, meses, corGer, corCon) {
  // Moldura padrão do design system
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

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
      _sTxt(slide, gLabelX, bBase - gH - 14, slotW, 12,
        _solarFmtKwh(m.geracao), 6, true, corGer, 'center');
    }

    // Barra Consumo — label centralizada na barra, largura = slotW inteiro
    const cH = escMax > 0 ? (m.consumo / escMax) * plotH : 0;
    const cx  = sx + barW + barPad;
    if (cH > 1) {
      const cb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, bBase - cH, barW, cH);
      cb.getFill().setSolidFill(corCon); cb.getBorder().setTransparent();
      const cLabelX = cx + barW / 2 - slotW / 2;
      _sTxt(slide, cLabelX, bBase - cH - 14, slotW, 12,
        _solarFmtKwh(m.consumo), 6, true, '#64748B', 'center');
    }

    // Label X
    _sTxt(slide, plotX + i * slotW, bBase + 4, slotW, 12, m.mes, 6.5, false, CORES.textDark, 'center');
  });

  // Legenda no topo direito (não disputa espaço com os rótulos do eixo X)
  const legY = y + 6;
  const legX = x + w - 200;
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
