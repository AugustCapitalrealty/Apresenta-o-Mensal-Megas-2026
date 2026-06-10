/**
 * ARQUIVO: Slide_EnergiaSolar.gs
 * DESCRIÇÃO: Slide de Energia Solar — KPIs + variação vs mês anterior + gráfico barras duplo.
 *
 * ABA esperada na planilha: "ENERGIA SOLAR"
 * Colunas (linha 1 = cabeçalho):
 *   A: Mês (ex: "Jan/25", "Fev/25" …)
 *   B: Geração (kWh)
 *   C: Consumo (kWh)
 *   D: CO² neutralizado (t)
 *   E: Carvão evitado (t)
 *   F: Árvores plantadas
 *   G: KM neutro de veículo
 */

function gerarSlideEnergiaSolar() {
  const dados = obterDadosEnergiaSolar();
  if (!dados) {
    Logger.log('Energia Solar: sem dados, slide ignorado.');
    return;
  }

  const deck      = getDeckAtivo();
  const W         = deck.getPageWidth();   // 720
  const H         = deck.getPageHeight();  // 405
  const slide     = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const { atual, anterior, meses } = dados;
  const mesLabel  = atual.mes;
  const mesAntLabel = anterior ? anterior.mes : null;

  criarHeaderPadrao(slide, 'ENERGIA SOLAR',
    'Desempenho do mês de ' + mesLabel + (mesAntLabel ? ' · vs ' + mesAntLabel : ''));

  // ── Logo Mega (canto superior direito) ──────────────────────────────
  _solarTexto(slide, W - 120, 8, 110, 44, 'Mega\nCentro Logístico',
    9, false, CORES.textGray, 'right');

  const topY    = 74;   // abaixo do header+barra
  const cardH   = 70;
  const gap     = 12;
  const cardW   = (W - 60 - gap * 3) / 4;
  const marginX = 30;

  // ── 4 KPI Cards ─────────────────────────────────────────────────────
  const kpis = [
    { label: 'CO² neutralizado (t)',           val: atual.co2,     ant: anterior ? anterior.co2     : null, fmt: v => _fmtDec(v, 2) },
    { label: 'Carvão evitado (t)',              val: atual.carvao,  ant: anterior ? anterior.carvao  : null, fmt: v => _fmtDec(v, 2) },
    { label: 'Árvores plantadas',               val: atual.arvores, ant: anterior ? anterior.arvores : null, fmt: v => _fmtInt(v)     },
    { label: 'KM neutro de veículo a combustão',val: atual.km,      ant: anterior ? anterior.km      : null, fmt: v => _fmtInt(v)     }
  ];

  kpis.forEach((k, i) => {
    const x = marginX + i * (cardW + gap);
    _solarCard(slide, x, topY, cardW, cardH, k);
  });

  // ── Gráfico de barras duplo ──────────────────────────────────────────
  const chartY  = topY + cardH + gap;
  const chartH  = H - chartY - 18;
  const chartX  = marginX;
  const chartW  = W - marginX * 2;

  _solarGrafico(slide, chartX, chartY, chartW, chartH, meses);

  Logger.log('Slide Energia Solar gerado → ' + mesLabel);
}


// ── Helpers de desenho ──────────────────────────────────────────────────

function _solarCard(slide, x, y, w, h, kpi) {
  // Sombra
  const sh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 2, y + 2, w, h);
  sh.getFill().setSolidFill(CORES.shadow); sh.getBorder().setTransparent(); sh.sendToBack();

  // Fundo branco
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  // Topo azul escuro
  const strip = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, 20);
  strip.getFill().setSolidFill(CORES.darkBlue); strip.getBorder().setTransparent();
  const mask = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 14, w, 8);
  mask.getFill().setSolidFill(CORES.white); mask.getBorder().setTransparent();

  // Label
  _solarTexto(slide, x + 6, y + 2, w - 12, 16, kpi.label, 7.5, false, CORES.white, 'center');

  // Valor principal
  const valStr = kpi.val != null ? kpi.fmt(kpi.val) : '—';
  _solarTexto(slide, x + 4, y + 18, w - 8, 28, valStr, 20, true, CORES.darkBlue, 'center');

  // Delta vs anterior
  if (kpi.ant != null && kpi.val != null) {
    const diff   = kpi.val - kpi.ant;
    const pct    = kpi.ant !== 0 ? (diff / Math.abs(kpi.ant)) * 100 : null;
    const seta   = diff >= 0 ? '▲' : '▼';
    const cor    = diff >= 0 ? '#10B981' : '#EF4444';
    const pctStr = pct != null ? ' (' + (diff >= 0 ? '+' : '') + pct.toFixed(1) + '%)' : '';
    const label  = seta + ' ' + kpi.fmt(Math.abs(diff)) + pctStr;
    _solarTexto(slide, x + 4, y + 47, w - 8, 16, label, 7.5, false, cor, 'center');
    _solarTexto(slide, x + 4, y + 56, w - 8, 12, 'vs ' + kpi.ant != null ? 'vs mês ant.' : '', 7, false, CORES.textGray, 'center');
  }
}

function _solarGrafico(slide, x, y, w, h, meses) {
  // Fundo do gráfico
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  if (!meses || meses.length === 0) return;

  const marginLeft  = 52;  // espaço para labels Y
  const marginRight = 10;
  const marginTop   = 14;
  const marginBot   = 30;  // espaço para labels X

  const plotW = w - marginLeft - marginRight;
  const plotH = h - marginTop - marginBot;
  const plotX = x + marginLeft;
  const plotY = y + marginTop;

  // Encontra máximo para escala
  const allVals = meses.flatMap(m => [m.geracao || 0, m.consumo || 0]);
  const vMax    = Math.max(...allVals);
  const escMax  = vMax > 0 ? Math.ceil(vMax / 1000) * 1000 * 1.1 : 1000;

  // Grid lines
  const nGrid = 4;
  for (let gi = 0; gi <= nGrid; gi++) {
    const gy   = plotY + plotH - (gi / nGrid) * plotH;
    const gVal = (gi / nGrid) * escMax;
    const gl   = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, 0.5);
    gl.getFill().setSolidFill(gi === 0 ? '#94A3B8' : '#E2E8F0'); gl.getBorder().setTransparent();
    // Label Y
    _solarTexto(slide, x, gy - 6, marginLeft - 4, 12, _fmtKwh(gVal), 7, false, CORES.textGray, 'right');
  }

  const n        = meses.length;
  const slotW    = plotW / n;
  const barGap   = slotW * 0.08;
  const barW     = (slotW - barGap * 3) / 2;
  const COR_GER  = '#EF4444';  // vermelho = geração (igual ao slide original)
  const COR_CON  = '#10B981';  // verde = consumo

  meses.forEach((m, i) => {
    const sx    = plotX + i * slotW + barGap;
    const bBase = plotY + plotH;

    // Barra Geração
    const gH = escMax > 0 ? (m.geracao / escMax) * plotH : 0;
    if (gH > 0) {
      const gb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, bBase - gH, barW, gH);
      gb.getFill().setSolidFill(COR_GER); gb.getBorder().setTransparent();
      // Label valor
      _solarTexto(slide, sx - 2, bBase - gH - 11, barW + 4, 10,
        _fmtInt(m.geracao), 6.5, false, COR_GER, 'center');
    }

    // Barra Consumo
    const cH = escMax > 0 ? (m.consumo / escMax) * plotH : 0;
    const cx = sx + barW + barGap;
    if (cH > 0) {
      const cb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, bBase - cH, barW, cH);
      cb.getFill().setSolidFill(COR_CON); cb.getBorder().setTransparent();
      _solarTexto(slide, cx - 2, bBase - cH - 11, barW + 4, 10,
        _fmtInt(m.consumo), 6.5, false, COR_CON, 'center');
    }

    // Label X (mês)
    const labelX = sx - barGap / 2;
    _solarTexto(slide, labelX, bBase + 3, slotW, 12, m.mes, 7, false, CORES.textDark, 'center');
  });

  // Legenda
  const legY = y + h - 11;
  const legX = x + marginLeft;
  _solarRetangulo(slide, legX,      legY, 10, 8, COR_GER);
  _solarTexto(slide, legX + 12, legY - 1, 70, 10, 'Geração (kWh)', 7, false, CORES.textDark, 'left');
  _solarRetangulo(slide, legX + 90, legY, 10, 8, COR_CON);
  _solarTexto(slide, legX + 104, legY - 1, 70, 10, 'Consumo (kWh)', 7, false, CORES.textDark, 'left');
}

function _solarTexto(slide, x, y, w, h, txt, size, bold, cor, align) {
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const ts = tb.getText();
  ts.setText(String(txt));
  const st = ts.getTextStyle();
  st.setFontSize(size).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
  const ps = ts.getParagraphStyle();
  if (align === 'center')      ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  else if (align === 'right')  ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  else                          ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  tb.getBorder().setTransparent();
}

function _solarRetangulo(slide, x, y, w, h, cor) {
  const s = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  s.getFill().setSolidFill(cor); s.getBorder().setTransparent();
}

function _fmtDec(v, casas) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function _fmtInt(v) {
  if (v == null || isNaN(v)) return '—';
  return Math.round(v).toLocaleString('pt-BR');
}

function _fmtKwh(v) {
  if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
  return String(Math.round(v));
}
