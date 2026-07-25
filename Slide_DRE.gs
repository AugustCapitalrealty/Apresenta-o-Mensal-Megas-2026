/**
 * ARQUIVO: Slide_DRE.gs
 * SLIDE — DRE (DEMONSTRATIVO DE RESULTADO)
 * DESCRIÇÃO: Tabela consolidada por rubrica contábil no estilo DRE da
 * controladoria, com os dados que a apresentação já tem (obterDadosDRE_ em
 * 02_Dados.gs). Três recortes, cada um com 5 colunas — os VALORES juntos e
 * as VARIAÇÕES juntas, para não misturar as duas leituras:
 *
 *   Meta | Real | 2025 | % Var | % 25
 *
 *   Bloco 1 — MÊS (mês de referência)
 *   Bloco 2 — ACUMULADO (Jan..mês ref)
 *   Bloco 3 — projeção do ANO (destacado em cor própria: é o FUTURO)
 *     ▸ gerarSlideDREComRitmo() → REALIZADO + RITMO (projeção run-rate)
 *     ▸ gerarSlideDRE()         → REALIZADO + ORÇADO (plano original)
 *
 * "% Var" é VARIAÇÃO, não atingimento: Real ÷ base − 1, sempre em módulo,
 * com seta indicando o sentido — ▲ vermelha gastou MAIS, ▼ verde gastou
 * MENOS. "% 25" é a mesma conta contra o Realizado de 2025 (aba "Financeiro
 * 2025"; sem ela a coluna mostra "-", nunca quebra).
 *
 * Valores em R$ MIL, sem casas decimais. Linha TOTAL (DESPESAS OPERACIONAIS)
 * no topo em azul escuro; cada CATEGORIA é uma linha de subtotal em cinza
 * (soma das suas rubricas), com as rubricas indentadas embaixo. A ordem das
 * linhas é FIXA (posição no mapa DRE_CATEGORIAS), igual todo mês, para dar
 * pra comparar dois meses lado a lado sem procurar a rubrica.
 */

function gerarSlideDRE()         { _gerarSlideDRE_('orcado'); }
function gerarSlideDREComRitmo() { _gerarSlideDRE_('ritmo');  }

// Soma Meta (orç) e Realizado das rubricas de uma categoria, nos 4 recortes
// que obterDadosDRE_ calcula por rubrica — vira a linha de SUBTOTAL. A parte
// de 2025 soma só as rubricas que tiverem o dado (rubrica sem "Financeiro
// 2025" não zera o subtotal do grupo inteiro); se nenhuma tiver, fica null.
function _dreSomarCategoria_(itens) {
  const blocos = {
    mes: { orc: 0, real: 0 }, acum: { orc: 0, real: 0 },
    anual: { orc: 0, real: 0 }, anualOrc: { orc: 0, real: 0 }
  };
  itens.forEach(r => {
    ['mes', 'acum', 'anual', 'anualOrc'].forEach(k => {
      blocos[k].orc += r[k].orc; blocos[k].real += r[k].real;
    });
  });
  const somaAA = campo => {
    const vals = itens.map(r => r[campo]).filter(v => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };
  blocos.aaMes  = somaAA('aaMes');
  blocos.aaAcum = somaAA('aaAcum');
  blocos.aaAno  = somaAA('aaAno');
  return blocos;
}

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

  // Cores das linhas de hierarquia
  const CINZA_CATEGORIA = '#475569';   // subtotal de categoria (destoa do azul)
  const COR_FUTURO      = DS.colors.brandLight;   // bloco da projeção anual
  // Vermelho/verde DESSATURADOS: a tabela tem ~90 variações coloridas e o tom
  // saturado (#DC2626/#166534) pesava demais na leitura. Estes mantêm o
  // significado com contraste suficiente (~5:1) sem gritar na tela.
  const VERM = '#A85450', VERDE = '#4E7B5F';               // sobre fundo claro
  const VERM_CLARO = '#E0A9A6', VERDE_CLARO = '#9FC4AF';   // sobre fundo escuro

  criarHeaderPadrao(slide, 'DRE — DESPESAS OPERACIONAIS', subHeader + d.cidade);

  // ── Grade — 3 blocos × 5 colunas ────────────────────────────────────────
  // Ordem: os VALORES juntos (Meta | Real | 2025), depois as VARIAÇÕES
  // juntas (% Var | % 25) — números de um lado, comparações do outro.
  const NCOL = 5;
  const x0 = 10, tableW = W - 20;
  const rubricaW = 158;
  // Colunas NÃO são todas iguais: as de variação carregam seta + número
  // ("▲ 2.088%") e precisam de mais espaço que as de valor ("2.088"), senão
  // a seta encosta no número. Os pesos somam 5,00 por bloco, então a largura
  // total da tabela não muda.
  const PESO_COL = [0.82, 0.82, 0.82, 1.30, 1.24];   // Meta, Real, 2025, %Var, %25
  const unidade  = (tableW - rubricaW) / (3 * NCOL);
  const colPos = [], colLarg = [];
  let _accX = x0 + rubricaW;
  for (let b = 0; b < 3; b++) {
    for (let i = 0; i < NCOL; i++) {
      const w = unidade * PESO_COL[i];
      colPos.push(_accX); colLarg.push(w); _accX += w;
    }
  }
  const colX = i => colPos[i];                       // i = 0..14
  const colW = i => colLarg[i];
  // Largura de um bloco inteiro (5 colunas), usada nas barras de cabeçalho
  const blocoW = c0 => colLarg.slice(c0, c0 + NCOL).reduce((s, w) => s + w, 0);

  // ── Barra dos blocos ──────────────────────────────────────────────────────
  const blocoY = 66, blocoH = 14;
  const blocos = [
    { txt: 'MÊS — ' + d.mesLabel.toUpperCase(),     c0: 0,  cor: DS.colors.brandMed },
    { txt: 'ACUMULADO — ' + d.mesesAcum + ' MESES', c0: 5,  cor: DS.colors.brandMed },
    // Projeção do ano: cor própria em TODO o cabeçalho do bloco (barra + a
    // régua Meta/Real/…) e um leve tingido atrás das células — sinaliza que
    // aquele trecho é FUTURO/projeção, não realizado.
    { txt: tituloAnual,                             c0: 10, cor: COR_FUTURO, futuro: true }
  ];

  // Faixa tingida atrás das 5 colunas da projeção (desenhada antes das
  // linhas para ficar por baixo; as linhas de dado cobrem só o que precisam).
  const futuroX = colX(10), futuroW = blocoW(10) - 1;

  const cabRub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, blocoY, rubricaW - 1, blocoH + 14);
  cabRub.getFill().setSolidFill(DS.colors.brandDark); cabRub.getBorder().setTransparent();
  const cabRubT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 4, blocoY, rubricaW - 8, blocoH + 14);
  cabRubT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  cabRubT.getText().setText('R$ MIL').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  blocos.forEach(b => {
    const bx = colX(b.c0), bw = blocoW(b.c0) - 1;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, blocoY, bw, blocoH);
    bg.getFill().setSolidFill(b.cor); bg.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, blocoY, bw, blocoH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(b.txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Sub-cabeçalho. As caixas de texto vão além da célula (folga simétrica,
    // sem fundo próprio → invisível) só para vencer o recuo interno padrão do
    // Slides, que quebrava "Realizado" em "Realizad/o".
    // "Δ%" deixa explícito que a coluna é a DIFERENÇA percentual, e contra o
    // quê: Δ% Meta = Real vs Meta; Δ% 2025 = Real vs o realizado do ano anterior.
    ['Meta', 'Real', String(d.ano - 1), 'Δ% Meta', 'Δ% ' + String(d.ano - 1)].forEach((s, i) => {
      const sx = colX(b.c0 + i), sw = colW(b.c0 + i) - 1;
      const sb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, blocoY + blocoH, sw, 14);
      // No bloco da projeção a régua também sai na cor do futuro (um pouco
      // escurecida), para o cabeçalho inteiro daquele trecho destoar.
      sb.getFill().setSolidFill(b.futuro ? '#0A4C86' : DS.colors.brandDark);
      sb.getBorder().setTransparent();
      const folga = 10;
      const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, sx - folga, blocoY + blocoH, sw + folga * 2, 14);
      st.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      st.getText().setText(s).getTextStyle()
        .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
      st.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    });
  });

  // ── Linhas: TOTAL, depois cada CATEGORIA (subtotal) com suas rubricas ─────
  // Ordem fixa: obterDadosDRE_ já entrega as rubricas na ordem do mapa.
  const linhas = [{ tipo: 'total', nome: 'DESPESAS OPERACIONAIS', b: d.total }];
  const ordemCategorias = DRE_CATEGORIAS.map(c => c.nome).concat(['Outras Despesas']);
  ordemCategorias.forEach(nomeCat => {
    const doCat = d.rubricas.filter(r => r.categoria === nomeCat);
    if (!doCat.length) return;
    linhas.push({ tipo: 'categoria', nome: nomeCat, b: _dreSomarCategoria_(doCat) });
    doCat.forEach(r => linhas.push({ tipo: 'item', nome: r.nome, b: r }));
  });

  const tY = blocoY + blocoH + 14 + 2;
  // SEM piso mínimo: a tabela precisa caber inteira no slide, senão as
  // últimas linhas ficam empurradas para fora da área visível.
  const rowH = Math.min(16, (H - tY - 8) / linhas.length);
  const fs   = rowH >= 12 ? 7 : (rowH >= 9 ? 6.3 : (rowH >= 7 ? 5.5 : 4.8));


  // R$ mil, sempre inteiro (a pedido: "0,1" vira "0").
  const mil = v => {
    if (v == null || isNaN(v)) return '-';
    return Math.round(v / 1000).toLocaleString('pt-BR');
  };

  // VARIAÇÃO: Real ÷ base − 1, sempre positiva, com o sentido na seta.
  // Base ZERADA com gasto = 100% (a pedido: "orçado 0 e gastei 1 real → 100%").
  // Base AUSENTE é caso diferente: quando não existe dado de 2025 para a
  // rubrica não dá para afirmar variação nenhuma — devolve null (mostra "-"),
  // senão a coluna "% 25" cravaria "▲ 100%" em cima de um dado inexistente.
  // `nulo` marca a igualdade EXATA (real === base). É diferente de uma
  // variação pequena que só arredonda para 0%: nesse caso ainda houve
  // desvio e a seta precisa aparecer indicando para que lado foi.
  const variacao = (base, real) => {
    if (real == null || isNaN(real)) return null;
    if (base == null || isNaN(base))  return null;
    if (base === 0) return real > 0.005 ? { pct: 100, maior: true, nulo: false } : null;
    const v = (real / base - 1) * 100;
    return { pct: Math.abs(v), maior: v > 0, nulo: v === 0 };
  };

  // Só o NÚMERO da variação (a seta vai numa caixa separada, ver desenharVar).
  // Variações de milhares de % são reais aqui (rubrica com orçado pequeno e
  // gasto alto), então o número é mantido — só acima de 9.999% vira ">9999",
  // porque aí não caberia na célula e a informação já é só "estourou muito".
  const numeroVar = va => {
    if (!va) return '-';
    const p = Math.round(va.pct);
    if (p === 0) return '0%';
    return (p > 9999 ? '>9999' : p.toLocaleString('pt-BR')) + '%';
  };
  const corVar = (va, escuro) => {
    if (!va || va.nulo) return escuro ? '#CBD5E1' : CORES.textGray;
    if (va.maior) return escuro ? VERM_CLARO : VERM;
    return escuro ? VERDE_CLARO : VERDE;
  };

  // Célula de variação: a SETA fica numa caixa própria ancorada sempre no
  // mesmo ponto da célula, então "▲ 1%" e "▲ 100%" têm a seta na mesma
  // vertical — dá pra varrer a coluna de relance sem a seta dançando conforme
  // o número de dígitos. O número continua alinhado à direita, para os
  // dígitos seguirem comparáveis entre as linhas.
  const SETA_W = 9;
  const desenharVar = (va, cx, ry, cw, escuro) => {
    const cor = corVar(va, escuro);

    // A seta aparece sempre que houve desvio — inclusive quando o número
    // arredonda para "0%" (ex.: 6.097 contra meta de 6.084). Aí o número
    // sozinho não diria para que lado foi; a seta resolve sem precisar abrir
    // casas decimais. Só na igualdade exata (nulo) não há direção a mostrar.
    if (va && !va.nulo) {
      // Alinhada à ESQUERDA numa caixa fixa → a folga vai só para a direita
      // (skill slides-caixa-texto-sem-quebra), senão o glifo se desloca.
      const sa = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx - 5, ry, SETA_W + 10, rowH);
      sa.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      sa.getText().setText(va.maior ? '▲' : '▼').getTextStyle()
        .setFontSize(fs).setBold(true).setForegroundColor(cor).setFontFamily(DS.typography.body);
      sa.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
    }

    const folga = 12;
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      cx + SETA_W - folga, ry, cw - SETA_W + folga, rowH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(numeroVar(va)).getTextStyle()
      .setFontSize(fs).setBold(true).setForegroundColor(cor).setFontFamily(DS.typography.body);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  };

  let zebra = 0;   // conta só os ITENS: a zebra reinicia a cada categoria e
                   // não é bagunçada pelas linhas de TOTAL/subtotal no meio.
  linhas.forEach((l, r) => {
    const ry = tY + r * rowH;
    const ehTotal     = l.tipo === 'total';
    const ehCategoria = l.tipo === 'categoria';
    const resumo      = ehTotal || ehCategoria;   // linhas de fundo escuro

    // Fundo: TOTAL azul escuro, categoria cinza, itens em zebra. Nos itens, a
    // faixa das 5 colunas da projeção sai levemente azulada — banda de cor
    // que percorre a tabela inteira marcando "isto é futuro".
    if (resumo) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, rowH);
      z.getFill().setSolidFill(ehTotal ? DS.colors.brandDark : CINZA_CATEGORIA);
      z.getBorder().setTransparent();
      if (ehCategoria) zebra = 0;
    } else {
      const par = zebra % 2 === 0;
      if (par) {
        const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, futuroX - x0, rowH);
        z.getFill().setSolidFill('#FFFFFF'); z.getBorder().setTransparent();
      }
      const zf = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, futuroX, ry, futuroW, rowH);
      zf.getFill().setSolidFill(par ? '#EFF5FC' : '#E7EEF8'); zf.getBorder().setTransparent();
      zebra++;
    }

    const corBase = resumo ? '#FFFFFF' : DS.colors.textMain;

    // Nome da linha. Categorias usam fonte um pouco menor + caixa alargada
    // para o nome completo caber em uma linha ("DESPESAS COM PESSOAL E
    // ADMINISTRATIVAS" não cabia e quebrava/cortava). Texto alinhado à
    // esquerda → a folga vai só para a DIREITA, senão o texto "anda".
    const fsLinha = ehCategoria ? Math.min(fs, 6.3) : fs;
    const indent  = l.tipo === 'item' ? 12 : 4;
    const larguraVisual = rubricaW - 4 - indent;
    let nome = ehCategoria ? l.nome.toUpperCase() : l.nome;
    // 0,62 em/char é a medida real do Montserrat/Open Sans em CAIXA ALTA
    // negrito (0,58 subestimava e deixava o texto passar da coluna, indo
    // parar embaixo do separador vertical).
    const maxChars = Math.floor(larguraVisual / (fsLinha * 0.62));
    if (nome.length > maxChars) nome = nome.substring(0, maxChars - 1) + '…';
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      x0 + indent, ry, larguraVisual + 10, rowH);
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lab.getText().setText(nome).getTextStyle()
      .setFontSize(fsLinha).setBold(resumo).setForegroundColor(corBase).setFontFamily(DS.typography.body);

    // Blocos de valores (o 3º bloco muda com o modo: anualOrc ou anual)
    [{ bl: l.b.mes, aa: l.b.aaMes }, { bl: l.b.acum, aa: l.b.aaAcum }, { bl: l.b[campoAnual], aa: l.b.aaAno }]
      .forEach((blk, bi) => {
        const bl = blk.bl;
        const c0 = bi * NCOL;
        const vsMeta = variacao(bl.orc, bl.real);
        const vs25   = variacao(blk.aa, bl.real);

        // Primeiro os VALORES (Meta | Real | 2025), depois as VARIAÇÕES.
        const valores = [
          { txt: mil(bl.orc),  cor: resumo ? '#CBD5E1' : CORES.textGray, bold: resumo },
          { txt: mil(bl.real), cor: corBase,                             bold: true   },
          { txt: mil(blk.aa),  cor: resumo ? '#CBD5E1' : '#64748B',      bold: false  }
        ];
        valores.forEach((cel, i) => {
          // Valores alinhados à direita: a folga da caixa vai só para a
          // ESQUERDA, mantendo a borda direita no lugar — o número não se
          // desloca e ainda assim ganha espaço para não quebrar linha.
          const folga = 12;
          const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
            colX(c0 + i) - folga, ry, colW(c0 + i) - 1 + folga, rowH);
          t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
          t.getText().setText(cel.txt).getTextStyle()
            .setFontSize(fs).setBold(cel.bold).setForegroundColor(cel.cor).setFontFamily(DS.typography.body);
          t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
        });

        // Variações (seta ancorada + número à direita)
        desenharVar(vsMeta, colX(c0 + 3), ry, colW(c0 + 3) - 1, resumo);
        desenharVar(vs25,   colX(c0 + 4), ry, colW(c0 + 4) - 1, resumo);
      });
  });

  // Separadores verticais entre os blocos
  [0, NCOL, NCOL * 2, NCOL * 3].forEach(c => {
    const vx = c === NCOL * 3 ? x0 + tableW : colX(c);
    const v = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, vx - 1, blocoY, 1, tY + linhas.length * rowH - blocoY);
    v.getFill().setSolidFill(DS.colors.lines); v.getBorder().setTransparent();
  });

  Logger.log('Slide DRE (' + modo + ') gerado: ' + d.rubricas.length + ' rubrica(s), mês ' + d.mesLabel + '.');
}
