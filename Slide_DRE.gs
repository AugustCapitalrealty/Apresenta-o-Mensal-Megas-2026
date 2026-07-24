/**
 * ARQUIVO: Slide_DRE.gs
 * SLIDES — DRE (DEMONSTRATIVO DE RESULTADO), 2 PÁGINAS
 * DESCRIÇÃO: Tabela consolidada por rubrica contábil no estilo DRE da
 * controladoria (versão que a diretoria preferiu), com os dados que a
 * apresentação já tem — obterDadosDRE_ em 02_Dados.gs:
 *
 *   Bloco 1 — MÊS (mês de referência) : Meta | Realizado | % Meta | 2025
 *   Bloco 2 — ACUMULADO (Jan..mês ref): Meta | Realizado | % Meta | 2025
 *   Bloco 3 (varia por página)        : Meta | Realizado | % Meta | 2025
 *     ▸ gerarSlideDRE()         → REALIZADO + ORÇADO — ANO
 *       (meses futuros usam o Orçado original, não o ritmo atual)
 *     ▸ gerarSlideDREComRitmo() → REALIZADO + RITMO — ANO
 *       (meses futuros usam o Ritmo — a projeção run-rate)
 *
 * A coluna "2025" de CADA bloco mostra o Realizado do ANO ANTERIOR na MESMA
 * janela daquele bloco (mês de referência / Jan..mês ref. / ano inteiro) —
 * vem da aba "Financeiro 2025" (opcional; sem ela mostra "—", nunca quebra).
 *
 * Valores em R$ MIL. % Meta = Realizado ÷ Meta: até 100% verde (dentro do
 * orçamento), acima de 100% vermelho (estourou). Linha TOTAL (DESPESAS
 * OPERACIONAIS) sempre no topo, em destaque; as demais rubricas vêm
 * AGRUPADAS POR CATEGORIA (pedido do gestor, mais fácil de visualizar do
 * que lista solta) — categorias fixas em DRE_CATEGORIAS (02_Dados.gs),
 * cada uma como uma faixa, com as rubricas (sub-itens) indentadas embaixo
 * na ordem de materialidade (maior primeiro, obterDadosDRE_ já entrega
 * ordenado); dentro do grupo, a ordem original é preservada pelo filter.
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

  // ── Grade — 3 blocos × 4 colunas (Meta | Realizado | % Meta | AnoAnt) ─────
  const x0 = 10, tableW = W - 20;
  const rubricaW = 158;
  const colW = (tableW - rubricaW) / 12;
  const colX = i => x0 + rubricaW + i * colW;   // i = 0..11

  // ── Barra dos blocos ──────────────────────────────────────────────────────
  const blocoY = 66, blocoH = 14;
  const blocos = [
    { txt: 'MÊS — ' + d.mesLabel.toUpperCase(),          c0: 0, campo: 'aaMes'  },
    { txt: 'ACUMULADO — ' + d.mesesAcum + ' MESES',      c0: 4, campo: 'aaAcum' },
    { txt: tituloAnual,                                  c0: 8, campo: 'aaAno'  }
  ];

  const cabRub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, blocoY, rubricaW - 1, blocoH + 14);
  cabRub.getFill().setSolidFill(DS.colors.brandDark); cabRub.getBorder().setTransparent();
  const cabRubT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 4, blocoY, rubricaW - 8, blocoH + 14);
  cabRubT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  cabRubT.getText().setText('CONSOLIDADO  ·  R$ MIL').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  blocos.forEach(b => {
    const bx = colX(b.c0), bw = colW * 4 - 1;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, blocoY, bw, blocoH);
    bg.getFill().setSolidFill(DS.colors.brandMed); bg.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, blocoY, bw, blocoH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(b.txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Sub-cabeçalho Meta | Realizado | % Meta | <ano anterior>
    ['Meta', 'Realizado', '% Meta', String(d.ano - 1)].forEach((s, i) => {
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

  // ── Linhas: TOTAL primeiro (destaque), depois as rubricas AGRUPADAS POR
  // CATEGORIA — cada categoria vira uma faixa, com suas rubricas (sub-itens)
  // logo abaixo, na ordem de materialidade que obterDadosDRE_ já entrega.
  // Categoria sem nenhuma rubrica neste mês fica de fora (não gera faixa
  // vazia); rubrica sem categoria mapeada cai em "Outras Despesas" no fim.
  const linhas = [{ tipo: 'total', nome: 'DESPESAS OPERACIONAIS', b: d.total, destaque: true }];
  const ordemCategorias = DRE_CATEGORIAS.map(c => c.nome).concat(['Outras Despesas']);
  ordemCategorias.forEach(nomeCat => {
    const doCat = d.rubricas.filter(r => r.categoria === nomeCat);
    if (!doCat.length) return;
    linhas.push({ tipo: 'categoria', nome: nomeCat });
    doCat.forEach(r => linhas.push({ tipo: 'item', nome: r.nome, b: r }));
  });

  const tY = blocoY + blocoH + 14 + 2;
  const CAT_H = 12;   // altura fixa da faixa de categoria (não "rouba" espaço dos itens)
  const nCategorias = linhas.filter(l => l.tipo === 'categoria').length;
  const nDados       = linhas.length - nCategorias;
  // SEM piso mínimo nas linhas de dado: a tabela precisa caber inteira no
  // slide, senão as últimas linhas (as menores, já que vêm ordenadas da
  // maior p/ menor dentro de cada categoria) ficam empurradas pra fora.
  const rowH = Math.min(16, (H - tY - 8 - nCategorias * CAT_H) / nDados);
  const fs   = rowH >= 12 ? 7 : (rowH >= 9 ? 6.3 : (rowH >= 7 ? 5.5 : 4.8));
  const alturaLinha = l => l.tipo === 'categoria' ? CAT_H : rowH;
  const alturaTotal = linhas.reduce((s, l) => s + alturaLinha(l), 0);

  // Em R$ mil: abaixo de 10 mil mostra 1 decimal, senão inteiro
  const mil = v => {
    if (v == null || isNaN(v)) return '-';
    const n = v / 1000;
    return n !== 0 && Math.abs(n) < 10
      ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : Math.round(n).toLocaleString('pt-BR');
  };
  const pct = (orc, real) => (orc > 0 ? Math.round(real / orc * 100) : null);

  let ry = tY;      // Y acumulado (linhas têm alturas diferentes: CAT_H vs rowH)
  let di = 0;       // índice só das linhas de DADO (total/item), p/ zebra não contar as faixas de categoria
  linhas.forEach(l => {
    const hAtual = alturaLinha(l);

    // ── Faixa de categoria: banner de largura total, só o rótulo ───────────
    if (l.tipo === 'categoria') {
      const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, hAtual);
      bg.getFill().setSolidFill(DS.colors.brandMed); bg.getBorder().setTransparent();
      const lb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 6, ry, tableW - 12, hAtual);
      lb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      lb.getText().setText(l.nome.toUpperCase()).getTextStyle()
        .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
      ry += hAtual;
      return;
    }

    // Fundo: destaque no TOTAL, zebra nas demais (índice só de linhas de dado)
    if (l.destaque) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, hAtual);
      z.getFill().setSolidFill(DS.colors.brandDark); z.getBorder().setTransparent();
    } else if (di % 2 === 0) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, hAtual);
      z.getFill().setSolidFill('#FFFFFF'); z.getBorder().setTransparent();
    }
    di++;

    const corBase = l.destaque ? '#FFFFFF' : DS.colors.textMain;

    // Rubrica (1 linha; corta com … se não couber). Itens de categoria (sub)
    // ficam levemente indentados — mostra visualmente que pertencem à faixa
    // de cima, sem precisar de mais uma coluna.
    let nome = l.nome;
    const indent = l.tipo === 'item' ? 12 : 4;
    const maxChars = Math.floor((rubricaW - 6 - indent) / (fs * 0.62));
    if (nome.length > maxChars) nome = nome.substring(0, maxChars - 1) + '…';
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + indent, ry, rubricaW - 4 - indent, hAtual);
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lab.getText().setText(nome).getTextStyle()
      .setFontSize(fs).setBold(l.destaque).setForegroundColor(corBase).setFontFamily(DS.typography.body);

    // Blocos de valores (o 3º bloco muda com o modo: anualOrc ou anual)
    [{ bl: l.b.mes, aa: l.b.aaMes }, { bl: l.b.acum, aa: l.b.aaAcum }, { bl: l.b[campoAnual], aa: l.b.aaAno }]
      .forEach((blk, bi) => {
        const bl = blk.bl;
        const c0 = bi * 4;
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
          { txt: txtPct,       cor: corPct,                                   bold: true       },
          { txt: mil(blk.aa),  cor: l.destaque ? '#94A3B8' : '#64748B',       bold: false      }
        ];
        celulas.forEach((cel, i) => {
          const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX(c0 + i), ry, colW - 1, hAtual);
          t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
          t.getText().setText(cel.txt).getTextStyle()
            .setFontSize(fs).setBold(cel.bold).setForegroundColor(cel.cor).setFontFamily(DS.typography.body);
          t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
        });
      });

    ry += hAtual;
  });

  // Separadores verticais entre os blocos
  [0, 4, 8, 12].forEach(c => {
    const vx = c === 12 ? x0 + tableW : colX(c);
    const v = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, vx - 1, blocoY, 1, tY + alturaTotal - blocoY);
    v.getFill().setSolidFill(DS.colors.lines); v.getBorder().setTransparent();
  });

  Logger.log('Slide DRE (' + modo + ') gerado: ' + d.rubricas.length + ' rubrica(s), mês ' + d.mesLabel + '.');
}
