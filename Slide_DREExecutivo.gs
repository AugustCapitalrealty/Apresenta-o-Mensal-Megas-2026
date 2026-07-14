/**
 * ARQUIVO: Slide_DREExecutivo.gs
 * SLIDES — DRE EXECUTIVO (um do MÊS + um do ACUMULADO)
 * DESCRIÇÃO: Visão de diretoria das despesas operacionais, cruzando 3 abas
 * da planilha da cidade — obterDadosDreDetalhado_() em 02_Dados.gs:
 *   REALIZADO = FINANCEIRO BRIDGE (meses fechados; Ritmo não conta)
 *   PLANEJADO = aba DRE (plano de contas da controladoria)
 *   ANO ANTERIOR = aba "Financeiro 2025" (opcional — sem ela, vs AA = '—')
 *
 * FOCO NAS GRANDES LINHAS: as rubricas são ranqueadas pelo maior valor
 * (realizado ou planejado) do recorte; as TOP 7 aparecem individualmente e
 * o resto é agrupado em "Outras despesas".
 *
 * CADA LINHA mostra: Realizado | Planejado | barras comparativas (realizado
 * colorido vs planejado cinza, mesma escala em todas as linhas) | % do
 * planejado (pill verde ≤100% / vermelho >100%) | variação vs ano anterior.
 *
 * KPIs DO TOPO: Realizado, Planejado, Abaixo/Acima do planejado (R$ e %),
 * vs Ano Anterior (R$ e %).
 *
 * FALLBACK: cidades ainda sem a aba DRE (Itajaí/Esteio) caem na versão
 * consolidada antiga (gerarSlideDRE, baseada só no FINANCEIRO BRIDGE).
 */

function gerarSlideDREMes()       { _gerarSlideDREExec_('mes');  }
function gerarSlideDREAcumulado() { _gerarSlideDREExec_('acum'); }

function _gerarSlideDREExec_(qual) {
  const d = obterDadosDreDetalhado_();
  if (!d) {
    // Sem a aba DRE: gera a DRE consolidada antiga uma única vez (no 'mes')
    if (qual === 'mes' && typeof gerarSlideDRE === 'function') {
      Logger.log('DRE Executivo: aba DRE não encontrada — usando a versão consolidada (FINANCEIRO BRIDGE).');
      gerarSlideDRE();
    } else {
      Logger.log('DRE Executivo (' + qual + '): aba DRE não encontrada — pulado.');
    }
    return;
  }

  const mIdx = d.mesesRealizados - 1;           // último mês com realizado
  const soma = (arr, ate) => arr.slice(0, ate + 1).reduce((s, v) => s + v, 0);
  const rec  = it => qual === 'mes'
    ? { real: it.real[mIdx],        plan: it.plan[mIdx],        aa: it.aa[mIdx] }
    : { real: soma(it.real, mIdx),  plan: soma(it.plan, mIdx),  aa: soma(it.aa, mIdx) };

  const nomeMes = MESES_NOME_REF[mIdx];
  const anoRef  = d.ref.ano;
  const periodo = qual === 'mes' ? nomeMes + ' / ' + anoRef
                                 : 'JANEIRO A ' + nomeMes + ' / ' + anoRef;

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W  = deck.getPageWidth();
  const H  = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide,
    qual === 'mes' ? 'DRE — RESULTADO DO MÊS' : 'DRE — RESULTADO ACUMULADO',
    'Despesas operacionais · ' + periodo.charAt(0) + periodo.slice(1).toLowerCase() + ' · ' + d.cidade);

  // ── Dataset: TOP 7 rubricas + "Outras despesas" ───────────────────────────
  const tot = rec(d.total);
  let linhas = d.linhas
    .map(f => { const r = rec(f); return { nome: padronizarRubrica_(f.nome), real: r.real, plan: r.plan, aa: r.aa }; })
    .filter(l => l.real > 0.005 || l.plan > 0.005 || l.aa > 0.005);
  linhas.sort((a, b) => Math.max(b.real, b.plan) - Math.max(a.real, a.plan));

  const TOP = 7;
  const resto = linhas.slice(TOP);
  linhas = linhas.slice(0, TOP);
  if (resto.length) {
    linhas.push({
      nome  : 'Outras despesas (' + resto.length + ' linhas)',
      real  : resto.reduce((s, l) => s + l.real, 0),
      plan  : resto.reduce((s, l) => s + l.plan, 0),
      aa    : resto.reduce((s, l) => s + l.aa,   0),
      outras: true
    });
  }

  // ── KPIs do topo ──────────────────────────────────────────────────────────
  const kpiY = 70, kpiH = 52, kGap = 12, marginX = 30;
  const kW = (W - 2 * marginX - 3 * kGap) / 4;

  const difPlan = tot.real - tot.plan;                    // <0 = economia
  const pctPlan = tot.plan > 0 ? (difPlan / tot.plan) * 100 : null;
  const difAA   = tot.real - tot.aa;                      // <0 = gastou menos que ano passado
  const pctAA   = tot.aa   > 0 ? (difAA / tot.aa) * 100 : null;
  const fmtPct  = p => (p == null ? '' : (p > 0 ? '+' : '−') + Math.abs(p).toFixed(1).replace('.', ',') + '%');

  criarCardKPI(slide, marginX, kpiY, kW, kpiH, {
    label: 'REALIZADO', valor: formatarMoedaSlideSemCentavos_(tot.real),
    cor: CORES.lightBlue, corValor: CORES.darkBlue, tamValor: 14
  });
  criarCardKPI(slide, marginX + (kW + kGap), kpiY, kW, kpiH, {
    label: 'PLANEJADO', valor: formatarMoedaSlideSemCentavos_(tot.plan),
    cor: '#94A3B8', corValor: CORES.textGray, tamValor: 14
  });
  criarCardKPI(slide, marginX + 2 * (kW + kGap), kpiY, kW, kpiH, {
    label: difPlan <= 0 ? 'ABAIXO DO PLANEJADO' : 'ACIMA DO PLANEJADO',
    valor: formatarMoedaSlideSemCentavos_(Math.abs(difPlan)),
    sub  : fmtPct(pctPlan) + ' vs planejado',
    cor: difPlan <= 0 ? DS.colors.accentGreen : DS.colors.accentRed,
    corValor: difPlan <= 0 ? DS.colors.accentGreen : DS.colors.accentRed, tamValor: 14
  });
  criarCardKPI(slide, marginX + 3 * (kW + kGap), kpiY, kW, kpiH, {
    label: 'VS ANO ANTERIOR (' + (anoRef - 1) + ')',
    valor: (tot.aa > 0 ? (difAA > 0 ? '▲ ' : '▼ ') : '') + formatarMoedaSlideSemCentavos_(Math.abs(difAA)),
    sub  : tot.aa > 0 ? fmtPct(pctAA) + ' vs ' + (anoRef - 1) : 'sem base ' + (anoRef - 1),
    cor: difAA > 0 ? DS.colors.accentRed : DS.colors.accentGreen,
    corValor: difAA > 0 ? DS.colors.accentRed : DS.colors.accentGreen, tamValor: 14
  });

  // ── Tabela visual das grandes linhas ─────────────────────────────────────
  const tY = kpiY + kpiH + 12;
  const tH = H - tY - 10;
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, tY, W - 2 * marginX, tH);
  card.getFill().setSolidFill('#FFFFFF'); card.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  card.getBorder().setWeight(1);

  // Colunas: nome | Realizado | Planejado | barras | % plan | vs AA
  const aX = marginX + 12, aW = W - 2 * marginX - 24;
  const cNomeW = 148, cValW = 74, cPctW = 52, cAAW = 68;
  const cBarW  = aW - cNomeW - 2 * cValW - cPctW - cAAW - 20;
  const xReal  = aX + cNomeW;
  const xPlan  = xReal + cValW;
  const xBar   = xPlan + cValW + 10;
  const xPct   = xBar + cBarW + 10;
  const xAA    = xPct + cPctW;

  // Cabeçalho da tabela
  const headY = tY + 8, headH = 14;
  const _cab = (x, w, txt, alinh) => {
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, headY, w, headH);
    t.getText().setText(txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.titles);
    t.getText().getParagraphStyle().setParagraphAlignment(alinh || SlidesApp.ParagraphAlignment.END);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  };
  _cab(aX, cNomeW, 'RUBRICA', SlidesApp.ParagraphAlignment.START);
  _cab(xReal, cValW, 'REALIZADO');
  _cab(xPlan, cValW, 'PLANEJADO');
  _cab(xBar, cBarW, 'REALIZADO (COR) vs PLANEJADO (CINZA)', SlidesApp.ParagraphAlignment.CENTER);
  _cab(xPct, cPctW, '% PLAN.', SlidesApp.ParagraphAlignment.CENTER);
  _cab(xAA, cAAW, 'VS ' + (anoRef - 1), SlidesApp.ParagraphAlignment.CENTER);

  const rowsY = headY + headH + 4;
  const rowH  = Math.min(30, (tY + tH - 8 - rowsY) / linhas.length);
  const maxVal = Math.max(1, ...linhas.map(l => Math.max(l.real, l.plan)));

  linhas.forEach((l, r) => {
    const ry = rowsY + r * rowH;

    if (r % 2 === 0) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX + 4, ry, W - 2 * marginX - 8, rowH);
      z.getFill().setSolidFill('#F8FAFC'); z.getBorder().setTransparent();
    }

    // Nome
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, aX, ry, cNomeW, rowH);
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lab.getText().setText(l.nome).getTextStyle()
      .setFontSize(8).setBold(!l.outras).setItalic(!!l.outras)
      .setForegroundColor(l.outras ? CORES.textGray : DS.colors.textMain).setFontFamily(DS.typography.body);

    // Valores
    const _val = (x, v, cor, bold) => {
      const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, ry, cValW, rowH);
      t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      t.getText().setText(formatarMoedaSlideSemCentavos_(v)).getTextStyle()
        .setFontSize(8).setBold(!!bold).setForegroundColor(cor).setFontFamily(DS.typography.body);
      t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    };
    const estourou = l.plan > 0 ? l.real > l.plan : l.real > 0;
    _val(xReal, l.real, estourou ? DS.colors.accentRed : DS.colors.textMain, true);
    _val(xPlan, l.plan, CORES.textGray, false);

    // Barras comparativas (mesma escala em todas as linhas)
    const bH = Math.min(7, (rowH - 8) / 2);
    const wReal = Math.max((l.real / maxVal) * cBarW, l.real > 0 ? 2 : 0);
    const wPlan = Math.max((l.plan / maxVal) * cBarW, l.plan > 0 ? 2 : 0);
    const byReal = ry + rowH / 2 - bH - 1;
    const byPlan = ry + rowH / 2 + 1;
    if (wReal > 0) {
      const b = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xBar, byReal, wReal, bH);
      b.getFill().setSolidFill(estourou ? DS.colors.accentRed : DS.colors.accentGreen);
      b.getBorder().setTransparent();
    }
    if (wPlan > 0) {
      const b = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, xBar, byPlan, wPlan, bH);
      b.getFill().setSolidFill('#CBD5E1'); b.getBorder().setTransparent();
    }

    // Pill % do planejado
    const pct = l.plan > 0 ? Math.round(l.real / l.plan * 100) : null;
    const pillW = 40, pillH = 14;
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
      xPct + (cPctW - pillW) / 2, ry + (rowH - pillH) / 2, pillW, pillH);
    pill.getFill().setSolidFill(pct == null ? '#F1F5F9' : (pct > 100 ? '#FEE2E2' : '#DCFCE7'));
    pill.getBorder().setTransparent();
    const pt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      xPct + (cPctW - pillW) / 2, ry + (rowH - pillH) / 2, pillW, pillH);
    pt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    pt.getText().setText(pct == null ? '—' : pct + '%').getTextStyle()
      .setFontSize(7.5).setBold(true)
      .setForegroundColor(pct == null ? CORES.textGray : (pct > 100 ? '#B91C1C' : '#166534'))
      .setFontFamily(DS.typography.titles);
    pt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // vs Ano Anterior
    let txtAA = '—', corAA = CORES.textGray;
    if (l.aa > 0.005) {
      const dAA = (l.real - l.aa) / l.aa * 100;
      txtAA = (dAA > 0 ? '▲ +' : '▼ −') + Math.abs(dAA).toFixed(0) + '%';
      corAA = dAA > 0 ? DS.colors.accentRed : DS.colors.accentGreen;
      if (Math.abs(dAA) < 0.5) { txtAA = '▬ 0%'; corAA = CORES.textGray; }
    }
    const ta = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xAA, ry, cAAW, rowH);
    ta.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    ta.getText().setText(txtAA).getTextStyle()
      .setFontSize(8).setBold(true).setForegroundColor(corAA).setFontFamily(DS.typography.titles);
    ta.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  Logger.log('Slide DRE Executivo (' + qual + ') gerado: ' + linhas.length + ' linha(s), ' + periodo + '.');
}
