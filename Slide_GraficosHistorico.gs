/**
 * ARQUIVO: Slide_GraficosHistorico.gs
 * COMPONENTE — GRÁFICO DE EVOLUÇÃO (série mensal)
 * Desenha um gráfico de barras verticais a partir de uma série vinda do
 * histórico validado (lerHistoricoValidado em 02_Dados.gs). Reutilizável:
 * hoje alimenta a Evolução dos Acessos; depois Backlog e Emergências.
 *
 * serie = [{ mes:'04/2026', valor:31572 }, ...] (ordenada por mês)
 * opts  = { titulo, cor, formatar(v)→string, destacarUltimo:true }
 *
 * Sem série suficiente (< 2 meses) desenha o espaço reservado tracejado —
 * assim o slide nunca fica quebrado enquanto a planilha não tem histórico.
 */
function desenharGraficoHistorico(slide, x, y, w, h, serie, opts) {
  opts = opts || {};
  const DS  = CR_DESIGN_SYSTEM;
  const cor = opts.cor || DS.colors.brandLight;
  const fmt = opts.formatar || (v => formatarNumeroBR(Math.round(v)));

  // Moldura padrão do design system
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  // Título
  if (opts.titulo) {
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 10, w - 30, 20);
    t.getText().setText(opts.titulo).getTextStyle()
      .setFontSize(10).setBold(true).setForegroundColor(cor).setFontFamily(DS.typography.titles);
  }

  // Sem histórico suficiente → placeholder tracejado
  if (!serie || serie.length < 2) {
    const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 15, y + 38, w - 30, h - 52);
    ph.getFill().setSolidFill(DS.colors.bgSlide);
    ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill('#CBD5E1');
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2, w, 20);
    txt.getText().setText(serie && serie.length === 1
        ? 'Alimente mais meses no histórico validado para ver a evolução'
        : 'Sem histórico validado para este indicador ainda')
      .getTextStyle().setFontSize(9).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    return;
  }

  // ── Área de plotagem ─────────────────────────────────────────────────────
  const mL = 44, mR = 16, mT = 40, mB = 22;
  const px = x + mL, py = y + mT, pw = w - mL - mR, ph = h - mT - mB;

  const vMax = Math.max(...serie.map(s => s.valor), 1);
  const esc  = vMax * 1.18;
  const vToY = v => py + ph - (v / esc) * ph;

  // Grade horizontal + rótulos do eixo Y
  for (let g = 0; g <= 3; g++) {
    const val = (esc * g) / 3;
    const gy  = vToY(val);
    const gl  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, px, gy, pw, g === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(g === 0 ? '#CBD5E1' : '#EEF2F7'); gl.getBorder().setTransparent();
    const yl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 2, gy - 7, mL - 6, 14);
    yl.getText().setText(fmt(val)).getTextStyle()
      .setFontSize(6).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
    yl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  }

  const n     = serie.length;
  const slotW = pw / n;
  const barW  = Math.min(slotW * 0.56, 46);
  const baseY = py + ph;

  serie.forEach((s, i) => {
    const bh    = Math.max((s.valor / esc) * ph, 2);
    const bx    = px + i * slotW + (slotW - barW) / 2;
    const ultimo = opts.destacarUltimo !== false && i === n - 1;
    const barCor = ultimo ? DS.colors.brandDark : cor;

    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, baseY - bh, barW, bh);
    bar.getFill().setSolidFill(barCor); bar.getBorder().setTransparent();

    // Valor no topo da barra (com respiro). Na última barra (mês atual),
    // 2ª linha com a tendência vs o mês anterior (▲ subiu · ▼ caiu).
    const temDelta = ultimo && i >= 1 && opts.deltaMesAnterior !== false;
    const boxH = temDelta ? 28 : 12;
    const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, px + i * slotW - slotW * 0.15, baseY - bh - boxH - 6, slotW * 1.3, boxH);
    const vt = vl.getText();
    let txt = fmt(s.valor);
    if (temDelta) {
      const delta = s.valor - serie[i - 1].valor;
      const seta  = delta > 0 ? '▲' : (delta < 0 ? '▼' : '■');
      txt += '\n' + seta + ' ' + (delta > 0 ? '+' : delta < 0 ? '−' : '') + fmt(Math.abs(delta));
    }
    vt.setText(txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor(barCor).setFontFamily(DS.typography.titles);
    if (temDelta) {
      const delta = s.valor - serie[i - 1].valor;
      // maior = melhor por padrão (mais fluxo); inverte se opts.deltaMenorMelhor
      const bom = opts.deltaMenorMelhor ? delta < 0 : delta > 0;
      const corDelta = delta === 0 ? CORES.textGray : (bom ? CORES.cardGreen : CORES.cardRed);
      vt.getRange(fmt(s.valor).length + 1, txt.length).getTextStyle()
        .setFontSize(8).setBold(true).setForegroundColor(corDelta);
    }
    vt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo do mês
    const ml = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, px + i * slotW - slotW * 0.15, baseY + 3, slotW * 1.3, 12);
    ml.getText().setText(s.mes).getTextStyle()
      .setFontSize(6).setBold(ultimo).setForegroundColor(ultimo ? DS.colors.textMain : CORES.textGray).setFontFamily(DS.typography.body);
    ml.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });
}
