/**
 * ARQUIVO: Slide_DRE.gs
 * SLIDES — DRE (DEMONSTRATIVO DE RESULTADO), 2 PÁGINAS
 * DESCRIÇÃO: Tabela consolidada por rubrica contábil no estilo DRE da
 * controladoria (versão que a diretoria preferiu), com os dados que a
 * apresentação já tem (aba FINANCEIRO BRIDGE — obterDadosDRE_ em 02_Dados.gs):
 *
 *   Bloco 1 — MÊS (mês de referência) : Meta | Realizado | % Meta
 *   Bloco 2 — ACUMULADO (Jan..mês ref): Meta | Realizado | % Meta
 *   Bloco 3 (varia por página):
 *     ▸ gerarSlideDRE()         → REALIZADO + ORÇADO — ANO
 *       (meses futuros usam o Orçado original, não o ritmo atual)
 *     ▸ gerarSlideDREComRitmo() → REALIZADO + RITMO — ANO
 *       (meses futuros usam o Ritmo — a projeção run-rate)
 *
 * Valores em R$ MIL. % Meta = Realizado ÷ Meta: até 100% verde (dentro do
 * orçamento), acima de 100% vermelho (estourou). Linha TOTAL (DESPESAS
 * OPERACIONAIS) sempre no topo, em destaque; as demais rubricas vêm
 * ordenadas da MAIOR para a MENOR (obterDadosDRE_ já entrega ordenado).
 */

function gerarSlideDRE()         { _gerarSlideDRE_('orcado'); }
function gerarSlideDREComRitmo() { _gerarSlideDRE_('ritmo');  }

function _gerarSlideDRE_(modo) {
  const d = obterDadosDRE_();
  if (!d) {
    Logger.log('Sem dados para o Slide DRE (aba FINANCEIRO BRIDGE).');
    return;
  }

  const campoAnual  = modo === 'ritmo' ? 'anual' : 'anualOrc';
  const tituloAnual = modo === 'ritmo' ? 'REALIZADO + RITMO — ANO' : 'REALIZADO + ORÇADO — ANO';
  const subHeader   = modo === 'ritmo'
    ? 'Meta vs Realizado (projeção pelo ritmo) · valores em R$ mil · '
    : 'Meta vs Realizado (projeção pelo orçado) · valores em R$ mil · ';

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W  = deck.getPageWidth();
  const H  = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, 'DRE — DESPESAS OPERACIONAIS', subHeader + d.cidade);

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
    { txt: tituloAnual,                                  c0: 6 }
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

  // ── Linhas: TOTAL primeiro (destaque), depois as rubricas — já vêm
  // ordenadas da maior para a menor (obterDadosDRE_) ─────────────────────
  const linhas = [{ nome: 'DESPESAS OPERACIONAIS', b: d.total, destaque: true }]
    .concat(d.rubricas.map(r => ({ nome: r.nome, b: r, destaque: false })));

  const tY   = blocoY + blocoH + 14 + 2;
  // SEM piso mínimo: a tabela precisa caber inteira no slide, senão as
  // últimas linhas (as menores, já que vêm ordenadas da maior p/ menor)
  // ficam empurradas para fora da área visível e "somem".
  const rowH = Math.min(16, (H - tY - 8) / linhas.length);
  const fs   = rowH >= 12 ? 7 : (rowH >= 9 ? 6.3 : (rowH >= 7 ? 5.5 : 4.8));

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

    // Blocos de valores (o 3º bloco muda com o modo: anualOrc ou anual)
    [l.b.mes, l.b.acum, l.b[campoAnual]].forEach((bl, bi) => {
      const c0 = bi * 3;
      const p  = pct(bl.orc, bl.real);
      // Sem meta (orçado 0) não dá pra calcular %. Se ainda assim houve gasto,
      // isso é um gasto 100% fora do previsto — mostra a variação em R$ (não
      // a %, que seria infinita) em vermelho, em vez do "-" sem informação.
      let txtPct, corPct;
      if (p != null) {
        txtPct = p + '%';
        corPct = l.destaque ? '#FFFFFF' : (p > 100 ? '#DC2626' : '#166534');
      } else if (bl.real > 0.005) {
        txtPct = '+' + mil(bl.real);
        corPct = l.destaque ? '#FFFFFF' : '#DC2626';
      } else {
        txtPct = '-';
        corPct = l.destaque ? '#FFFFFF' : CORES.textGray;
      }
      const celulas = [
        { txt: mil(bl.orc),  cor: l.destaque ? '#CBD5E1' : CORES.textGray, bold: l.destaque },
        { txt: mil(bl.real), cor: corBase,                                  bold: true       },
        { txt: txtPct,       cor: corPct,                                   bold: true       }
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

  Logger.log('Slide DRE (' + modo + ') gerado: ' + d.rubricas.length + ' rubrica(s), mês ' + d.mesLabel + '.');
}
