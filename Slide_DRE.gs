/**
 * ARQUIVO: Slide_DRE.gs
 * SLIDE — DRE (DEMONSTRATIVO DE RESULTADO)
 * DESCRIÇÃO: Tabela consolidada por rubrica contábil no estilo DRE da
 * controladoria (inspiração enviada pelo usuário), com os dados que a
 * apresentação já tem (aba FINANCEIRO BRIDGE — obterDadosDRE_ em 02_Dados.gs):
 *
 *   Bloco 1 — MÊS (mês de referência) : Meta | Realizado | % Meta
 *   Bloco 2 — ACUMULADO (Jan..mês ref): Meta | Realizado | % Meta
 *   Bloco 3 — REALIZADO + ORÇADO (ANO): Meta | Real+Ritmo | % Meta
 *
 * Valores em R$ MIL. % Meta = Realizado ÷ Meta: até 100% verde (dentro do
 * orçamento), acima de 100% vermelho (estourou). Linha TOTAL (DESPESAS
 * OPERACIONAIS) no topo, em destaque, como na inspiração.
 */

function gerarSlideDRE() {
  const d = obterDadosDRE_();
  if (!d) {
    Logger.log('Sem dados para o Slide DRE (aba FINANCEIRO BRIDGE).');
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W  = deck.getPageWidth();
  const H  = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, 'DRE — DESPESAS OPERACIONAIS',
    'Meta vs Realizado · valores em R$ mil · ' + d.cidade);

  // ── Grade ─────────────────────────────────────────────────────────────────
  const x0 = 10, tableW = W - 20;
  const rubricaW = 168;
  const colW = (tableW - rubricaW) / 9;          // 3 blocos × (Meta|Real|%)
  const colX = i => x0 + rubricaW + i * colW;    // i = 0..8

  // ── Barra dos blocos ──────────────────────────────────────────────────────
  const blocoY = 66, blocoH = 14;
  const blocos = [
    { txt: 'MÊS — ' + d.mesLabel.toUpperCase(),          c0: 0 },
    { txt: 'ACUMULADO — ' + d.mesesAcum + ' MESES',      c0: 3 },
    { txt: 'REALIZADO + ORÇADO — ANO',                   c0: 6 }
  ];

  const cabRub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, blocoY, rubricaW - 1, blocoH + 14);
  cabRub.getFill().setSolidFill(DS.colors.brandDark); cabRub.getBorder().setTransparent();
  const cabRubT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 4, blocoY, rubricaW - 8, blocoH + 14);
  cabRubT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  cabRubT.getText().setText('CONSOLIDADO  ·  R$ MIL').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  blocos.forEach(b => {
    const bx = colX(b.c0), bw = colW * 3 - 1;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, blocoY, bw, blocoH);
    bg.getFill().setSolidFill(DS.colors.brandMed); bg.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, blocoY, bw, blocoH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(b.txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Sub-cabeçalho Meta | Realizado | % Meta
    ['Meta', 'Realizado', '% Meta'].forEach((s, i) => {
      const sx = colX(b.c0 + i);
      const sb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, blocoY + blocoH, colW - 1, 14);
      sb.getFill().setSolidFill(DS.colors.brandDark); sb.getBorder().setTransparent();
      const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, sx, blocoY + blocoH, colW - 1, 14);
      st.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      st.getText().setText(s).getTextStyle()
        .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
      st.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    });
  });

  // ── Linhas: TOTAL primeiro (como na inspiração), depois as rubricas ──────
  const linhas = [{ nome: 'DESPESAS OPERACIONAIS', b: d.total, destaque: true }]
    .concat(d.rubricas.map(r => ({ nome: r.nome, b: r, destaque: false })));

  const tY   = blocoY + blocoH + 14 + 2;
  const rowH = Math.max(9, Math.min(16, (H - tY - 8) / linhas.length));
  const fs   = rowH >= 12 ? 7 : 6.3;

  // Em R$ mil: abaixo de 10 mil mostra 1 decimal, senão inteiro
  const mil = v => {
    if (v == null || isNaN(v)) return '-';
    const n = v / 1000;
    return n !== 0 && Math.abs(n) < 10
      ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : Math.round(n).toLocaleString('pt-BR');
  };
  const pct = (orc, real) => (orc > 0 ? Math.round(real / orc * 100) : null);

  linhas.forEach((l, r) => {
    const ry = tY + r * rowH;

    // Fundo: destaque no TOTAL, zebra nas demais
    if (l.destaque) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, rowH);
      z.getFill().setSolidFill(DS.colors.brandDark); z.getBorder().setTransparent();
    } else if (r % 2 === 0) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, rowH);
      z.getFill().setSolidFill('#FFFFFF'); z.getBorder().setTransparent();
    }

    const corBase = l.destaque ? '#FFFFFF' : DS.colors.textMain;

    // Rubrica (1 linha; corta com … se não couber)
    let nome = l.nome;
    const maxChars = Math.floor((rubricaW - 10) / (fs * 0.62));
    if (nome.length > maxChars) nome = nome.substring(0, maxChars - 1) + '…';
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 4, ry, rubricaW - 8, rowH);
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lab.getText().setText(nome).getTextStyle()
      .setFontSize(fs).setBold(l.destaque).setForegroundColor(corBase).setFontFamily(DS.typography.body);

    // Blocos de valores
    [l.b.mes, l.b.acum, l.b.anual].forEach((bl, bi) => {
      const c0 = bi * 3;
      const p  = pct(bl.orc, bl.real);
      const celulas = [
        { txt: mil(bl.orc),               cor: l.destaque ? '#CBD5E1' : CORES.textGray, bold: l.destaque },
        { txt: mil(bl.real),              cor: corBase,                                  bold: true       },
        { txt: p == null ? '-' : p + '%', cor: l.destaque ? '#FFFFFF'
              : (p > 100 ? '#DC2626' : '#166534'),                                       bold: true       }
      ];
      celulas.forEach((cel, i) => {
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX(c0 + i), ry, colW - 1, rowH);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        t.getText().setText(cel.txt).getTextStyle()
          .setFontSize(fs).setBold(cel.bold).setForegroundColor(cel.cor).setFontFamily(DS.typography.body);
        t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
      });
    });
  });

  // Separadores verticais entre os blocos
  [0, 3, 6, 9].forEach(c => {
    const vx = c === 9 ? x0 + tableW : colX(c);
    const v = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, vx - 1, blocoY, 1, tY + linhas.length * rowH - blocoY);
    v.getFill().setSolidFill(DS.colors.lines); v.getBorder().setTransparent();
  });

  Logger.log('Slide DRE gerado: ' + d.rubricas.length + ' rubrica(s), mês ' + d.mesLabel + '.');
}
