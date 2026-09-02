/**
 * ARQUIVO: Slide_TorreManutencao.gs
 * SLIDE — TORRE DE MANUTENÇÃO (CAPITAL REALTY & DEMERCADO)
 *
 * Apresentação executiva dos custos orçados vs. ritmo real de manutenção
 * por empreendimento, com base nos modelos de Torre de Manutenção da Capital Realty
 * e da Demercado.
 *
 * ESTRUTURA:
 *   - Slide 1: Torre de Manutenção — Capital Realty
 *   - Slide 2: Torre de Manutenção — Demercado
 *
 * RECURSOS:
 *   - Cards de síntese executiva no topo (Orç 2026, Ritmo 2025, Var R$, Var %).
 *   - Tabela comparativa com Real 2024, Orçado 2025, Ritmo 2025, Orçado 2026.
 *   - Coloração semântica: economia (verde) vs aumento de despesa (vermelho).
 *   - Anti-quebra de texto conforme padrão do repositório.
 *   - Gerenciamento por tag (TAG_TORRE_MANUTENCAO) para substituição idempotente.
 */

function gerarSlideTorreManutencao() {
  const deck = getDeckMensal_();

  // Limpeza prévia de slides anteriores desta seção
  if (typeof _tabRemoverPorTag_ === 'function' && typeof TAG_TORRE_MANUTENCAO !== 'undefined') {
    _tabRemoverPorTag_(deck, TAG_TORRE_MANUTENCAO);
  }

  const dados = obterDadosTorreManutencao_();

  let totalSlides = 0;

  if (dados.cr && dados.cr.rows.length) {
    _desenharSlideTorreUnidade_(deck, 'CAPITAL REALTY', dados.cr);
    totalSlides++;
  }

  if (dados.demercado && dados.demercado.rows.length) {
    _desenharSlideTorreUnidade_(deck, 'DEMERCADO', dados.demercado);
    totalSlides++;
  }

  Logger.log('✓ Torre de Manutenção gerada (' + totalSlides + ' slide(s)).');
  return totalSlides;
}

function _desenharSlideTorreUnidade_(deck, unidadeNome, dadosTorre) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_TORRE_MANUTENCAO !== 'undefined') {
    _tabMarcarSlide_(slide, TAG_TORRE_MANUTENCAO);
  }

  // Header do slide
  criarHeaderPadrao(
    slide,
    'TORRE DE MANUTENÇÃO · ' + unidadeNome,
    'Acompanhamento Orçamentário · Ritmo 2025 vs. Orçamento 2026'
  );

  const marginX = 24;
  const cardY = 72;
  const cardH = 46;
  const areaW = W - marginX * 2;

  // 4 Cards de KPI no topo
  const kpis = [
    { label: 'ORÇAMENTO 2026', valor: _fmtMoedaTorre_(dadosTorre.total.orc26), cor: DS.colors.brandDark },
    { label: 'RITMO 2025',     valor: _fmtMoedaTorre_(dadosTorre.total.ritmo25), cor: DS.colors.textMain },
    { 
      label: 'VARIAÇÃO NOMINAL', 
      valor: _fmtVarNomTorre_(dadosTorre.total.varNom), 
      cor: dadosTorre.total.varNom > 0 ? DS.colors.accentGreen : (dadosTorre.total.varNom < 0 ? DS.colors.accentRed : DS.colors.textMuted) 
    },
    { 
      label: 'VARIAÇÃO (%)', 
      valor: _fmtVarPctTorre_(dadosTorre.total.varPct), 
      cor: dadosTorre.total.varPct < 0 ? DS.colors.accentGreen : (dadosTorre.total.varPct > 0 ? DS.colors.accentRed : DS.colors.textMuted) 
    }
  ];

  const gapKpi = 12;
  const kpiW = (areaW - gapKpi * 3) / 4;

  kpis.forEach((kpi, ki) => {
    const kx = marginX + ki * (kpiW + gapKpi);
    const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, kx, cardY, kpiW, cardH);
    bg.getFill().setSolidFill(DS.colors.cardBg);
    bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
    bg.getBorder().setWeight(1);

    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, kx + 6, cardY + 4, kpiW - 12, 14);
    lbl.getText().setText(kpi.label).getTextStyle()
      .setFontSize(7).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, kx + 2, cardY + 16, kpiW - 4, 24);
    val.getText().setText(kpi.valor).getTextStyle()
      .setFontSize(11).setBold(true).setForegroundColor(kpi.cor).setFontFamily(DS.typography.titles);
    val.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Tabela Comparativa
  const tabY = cardY + cardH + 12;
  const tabH = H - tabY - 14;

  const colunas = [
    { label: 'EMPREENDIMENTO',        largura: 0.32, align: 'left' },
    { label: 'REAL 2024',             largura: 0.11, align: 'right' },
    { label: 'ORÇ. 2025',             largura: 0.11, align: 'right' },
    { label: 'RITMO 2025',            largura: 0.11, align: 'right' },
    { label: 'ORÇ. 2026',             largura: 0.11, align: 'right' },
    { label: 'VAR. % (26/25)',        largura: 0.12, align: 'center' },
    { label: 'VAR. R$ (ECONOMIA)',     largura: 0.12, align: 'right' }
  ];

  const totalLinhas = dadosTorre.rows.length + 1; // + 1 para o total
  const hdrH = 20;
  const rowH = Math.min((tabH - hdrH) / totalLinhas, 20);

  // Cabeçalho da tabela
  let curX = marginX;
  colunas.forEach(col => {
    const colW = areaW * col.largura;
    const bgHdr = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, curX, tabY, colW, hdrH);
    bgHdr.getFill().setSolidFill(DS.colors.brandLight);
    bgHdr.getBorder().setTransparent();

    const folga = 6;
    const tbHdr = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, curX - folga, tabY, colW + folga * 2, hdrH);
    const ts = tbHdr.getText();
    ts.setText(col.label);
    ts.getTextStyle().setFontSize(7.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    const pAlign = col.align === 'left' ? SlidesApp.ParagraphAlignment.START :
                  (col.align === 'right' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.CENTER);
    ts.getParagraphStyle().setParagraphAlignment(pAlign);
    tbHdr.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    curX += colW;
  });

  // Linhas de dados
  dadosTorre.rows.forEach((r, ri) => {
    const ry = tabY + hdrH + ri * rowH;
    const fundo = (ri % 2 === 0) ? '#FFFFFF' : '#F8FAFC';

    _desenharLinhaTorre_(slide, marginX, ry, areaW, rowH, colunas, r, fundo, false);
  });

  // Linha de Total
  const totalY = tabY + hdrH + dadosTorre.rows.length * rowH;
  _desenharLinhaTorre_(slide, marginX, totalY, areaW, rowH, colunas, dadosTorre.total, '#E2E8F0', true);
}

function _desenharLinhaTorre_(slide, startX, y, totalW, h, colunas, item, bgCor, isTotal) {
  const DS = CR_DESIGN_SYSTEM;

  let x = startX;
  colunas.forEach((col, ci) => {
    const colW = totalW * col.largura;

    const cel = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, colW, h);
    cel.getFill().setSolidFill(bgCor);
    cel.getBorder().setWeight(0.5);
    cel.getBorder().getLineFill().setSolidFill(DS.colors.lines);

    let texto = '';
    let corTexto = isTotal ? DS.colors.brandDark : DS.colors.textMain;

    if (ci === 0) {
      texto = item.imovel;
    } else if (ci === 1) {
      texto = _fmtMoedaTorre_(item.real24);
    } else if (ci === 2) {
      texto = _fmtMoedaTorre_(item.orc25);
    } else if (ci === 3) {
      texto = _fmtMoedaTorre_(item.ritmo25);
    } else if (ci === 4) {
      texto = _fmtMoedaTorre_(item.orc26);
      if (isTotal) corTexto = DS.colors.brandLight;
    } else if (ci === 5) {
      texto = _fmtVarPctTorre_(item.varPct);
      if (item.varPct < 0) corTexto = DS.colors.accentGreen;
      else if (item.varPct > 0) corTexto = DS.colors.accentRed;
      else corTexto = DS.colors.textMuted;
    } else if (ci === 6) {
      texto = _fmtVarNomTorre_(item.varNom);
      if (item.varNom > 0) corTexto = DS.colors.accentGreen;
      else if (item.varNom < 0) corTexto = DS.colors.accentRed;
      else corTexto = DS.colors.textMuted;
    }

    const folga = 6;
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + (col.align === 'left' ? 4 : -folga), y, colW + (col.align === 'left' ? -8 : folga * 2), h);
    const ts = tb.getText();
    ts.setText(texto);
    ts.getTextStyle()
      .setFontSize(isTotal ? 7.5 : 7)
      .setBold(isTotal || ci === 0 || ci >= 5)
      .setForegroundColor(corTexto)
      .setFontFamily(ci === 0 ? DS.typography.body : DS.typography.titles);

    const pAlign = col.align === 'left' ? SlidesApp.ParagraphAlignment.START :
                  (col.align === 'right' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.CENTER);
    ts.getParagraphStyle().setParagraphAlignment(pAlign);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    x += colW;
  });
}

function _fmtMoedaTorre_(val) {
  if (val == null || val === 0) return 'R$ 0';
  const pos = Math.abs(val);
  const str = Math.round(pos).toLocaleString('pt-BR');
  return (val < 0 ? '-' : '') + 'R$ ' + str;
}

function _fmtVarNomTorre_(val) {
  if (val == null || Math.abs(val) < 0.01) return 'R$ 0';
  const pos = Math.abs(val);
  const str = Math.round(pos).toLocaleString('pt-BR');
  return (val > 0 ? '+R$ ' : '-R$ ') + str;
}

function _fmtVarPctTorre_(val) {
  if (val == null || Math.abs(val) < 0.0001) return '0,0%';
  const pct = val * 100;
  return (pct > 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + '%';
}
