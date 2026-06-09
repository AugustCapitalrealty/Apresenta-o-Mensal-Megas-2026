// ==========================================
// SLIDE: DOCUMENTAÇÃO LEGAL (DOCUMENTOS INQUILINOS)
// ==========================================
// obterDadosDocumentos() está em Dados.gs
//
// Gera:
//   1) Painel de resumo (contadores: Vencidos / Críticos / Em dia / Pendentes)
//      + lista dos documentos críticos no primeiro slide
//   2) Tabela completa paginada (várias páginas conforme o volume)
// ==========================================

// Parâmetros de layout da tabela — usados na paginação e no desenho
const DOC_ROW_H   = 20;   // altura de cada linha de documento (pt)
const DOC_CARD_GAP = 5;   // espaço vertical entre cards de empresa
const DOC_HEAD_H  = 22;   // altura do cabeçalho azul
const DOC_TOP_Y   = 85;   // Y onde a tabela começa (abaixo do header do slide)
const DOC_MARGIN_X = 30;  // margem lateral
const DOC_PAD_X   = 14;   // padding interno esquerdo/direito da tabela

const DOC_CORES_CATEGORIA = {
  VENCIDO  : '#EF4444',  // vermelho
  CRITICO  : '#F59E0B',  // âmbar
  EM_DIA   : '#10B981',  // verde
  PENDENTE : '#94A3B8'   // cinza
};

const DOC_LABEL_CATEGORIA = {
  VENCIDO  : 'VENCIDO',
  CRITICO  : 'VENCE EM BREVE',
  EM_DIA   : 'EM DIA',
  PENDENTE : 'PENDENTE'
};


function gerarSlideDocumentos() {
  const dados = obterDadosDocumentos();
  if (!dados || !dados.itens.length) {
    Logger.log('Sem dados para o Slide de Documentação Legal.');
    return;
  }

  // ── Página 1: resumo + críticos ──────────────────────────────────────────
  desenharPaginaResumoDocumentos_(dados);

  // ── Páginas seguintes: tabela paginada por grupos completos ─────────────
  // Agrupa itens por empresa
  const grupos = [];
  dados.itens.forEach(it => {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.empresa === it.empresa) ult.itens.push(it);
    else grupos.push({ empresa: it.empresa, itens: [it] });
  });

  // Calcula altura útil por página e monta fatias de grupos que cabem inteiros
  const deck   = getDeckAtivo();
  const pageH  = deck.getPageHeight();
  const startY = DOC_TOP_Y + DOC_HEAD_H + 6;       // Y de onde começam os cards
  const limitY = pageH - 20;                        // limite inferior seguro
  const maxH   = limitY - startY;                   // espaço disponível para cards

  const paginas = [];   // array de arrays de itens (cada elemento = 1 página)
  let paginaAtual = [];
  let alturaAtual = 0;

  grupos.forEach(g => {
    const altGrupo = g.itens.length * DOC_ROW_H + (paginaAtual.length > 0 ? DOC_CARD_GAP : 0);
    if (alturaAtual + altGrupo > maxH && paginaAtual.length > 0) {
      // Não cabe: fecha página atual e abre nova
      paginas.push(paginaAtual);
      paginaAtual = [];
      alturaAtual = 0;
    }
    paginaAtual = paginaAtual.concat(g.itens);
    alturaAtual += g.itens.length * DOC_ROW_H + (alturaAtual > 0 ? DOC_CARD_GAP : 0);
  });
  if (paginaAtual.length) paginas.push(paginaAtual);

  const totalPaginas = paginas.length;
  paginas.forEach((fatia, p) => desenharPaginaTabelaDocumentos_(fatia, p + 1, totalPaginas));

  Logger.log('Slide Documentação Legal gerado (' + dados.itens.length + ' documentos, ' + (totalPaginas + 1) + ' páginas).');
}


// ==========================================
// PÁGINA 1: RESUMO + CRÍTICOS
// ==========================================
function desenharPaginaResumoDocumentos_(dados) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  criarHeaderPadrao(slide, 'DOCUMENTAÇÃO LEGAL', 'Alvarás, Licenças e Regularidades');

  const marginX = 30;
  const topY    = 85;

  // ── Cards de resumo ────────────────────────────────────────────────────
  const r = dados.resumo;
  const cards = [
    { label: 'VENCIDOS',     valor: r.vencido,  cor: DOC_CORES_CATEGORIA.VENCIDO  },
    { label: 'VENCE EM 60D', valor: r.critico,  cor: DOC_CORES_CATEGORIA.CRITICO  },
    { label: 'EM DIA',       valor: r.emDia,    cor: DOC_CORES_CATEGORIA.EM_DIA   },
    { label: 'PENDENTES',    valor: r.pendente, cor: DOC_CORES_CATEGORIA.PENDENTE }
  ];

  const gap   = 15;
  const cardW = (pageW - (2 * marginX) - (3 * gap)) / 4;
  const cardH = 70;

  cards.forEach((c, i) => {
    const cx = marginX + i * (cardW + gap);

    const sombra = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx + 3, topY + 3, cardW, cardH);
    sombra.getFill().setSolidFill(CORES.shadow); sombra.getBorder().setTransparent(); sombra.sendToBack();

    const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, topY, cardW, cardH);
    bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

    const strip = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, topY + 8, 4, cardH - 16);
    strip.getFill().setSolidFill(c.cor); strip.getBorder().setTransparent();

    const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 14, topY + 8, cardW - 24, 35);
    val.getText().setText(String(c.valor))
      .getTextStyle().setFontSize(26).setBold(true).setForegroundColor(c.cor).setFontFamily('Montserrat');
    val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 14, topY + 44, cardW - 24, 18);
    lbl.getText().setText(c.label)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  });

  // ── Lista de críticos (vencidos + vence em breve) ────────────────────────
  const criticos = dados.itens
    .filter(it => it.categoria === 'VENCIDO' || it.categoria === 'CRITICO')
    .sort((a, b) => (a.dias === null ? 1 : a.dias) - (b.dias === null ? 1 : b.dias));

  const listaY = topY + cardH + 20;
  const listaH = pageH - listaY - 20;
  const listaW = pageW - (2 * marginX);

  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, listaY, listaW, listaH);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 18, listaY + 8, listaW - 36, 20);
  titulo.getText().setText('⚠ ATENÇÃO PRIORITÁRIA — VENCIDOS E A VENCER EM ' + LIMITE_CRITICO_DIAS + ' DIAS')
    .getTextStyle().setFontSize(11).setBold(true).setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');

  if (!criticos.length) {
    const ok = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 18, listaY + 40, listaW - 36, 30);
    ok.getText().setText('✓ Nenhum documento vencido ou vencendo nos próximos ' + LIMITE_CRITICO_DIAS + ' dias.')
      .getTextStyle().setFontSize(11).setForegroundColor(DOC_CORES_CATEGORIA.EM_DIA).setFontFamily('Montserrat');
    return;
  }

  // Cabeçalho da mini-tabela de críticos
  const colX = {
    empresa : marginX + 18,
    doc     : marginX + 18 + listaW * 0.22,
    venc    : marginX + 18 + listaW * 0.55,
    dias    : marginX + 18 + listaW * 0.72,
    status  : marginX + 18 + listaW * 0.84
  };
  const headY = listaY + 32;
  const colHeaders = [
    { x: colX.empresa, t: 'EMPRESA' },
    { x: colX.doc,     t: 'DOCUMENTO' },
    { x: colX.venc,    t: 'VENC.' },
    { x: colX.dias,    t: 'DIAS' },
    { x: colX.status,  t: 'STATUS' }
  ];
  colHeaders.forEach(c => {
    const h = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, c.x, headY, listaW * 0.18, 16);
    h.getText().setText(c.t)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  });

  const maxLinhas = Math.floor((listaH - 60) / 22);
  const visiveis  = criticos.slice(0, maxLinhas);
  const rowH = 22;

  visiveis.forEach((it, i) => {
    const ry  = headY + 20 + i * rowH;
    const cor = DOC_CORES_CATEGORIA[it.categoria];

    if (i % 2 === 0) {
      const zebra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX + 8, ry - 1, listaW - 16, rowH);
      zebra.getFill().setSolidFill('#F8FAFC'); zebra.getBorder().setTransparent();
    }

    desenharCelulaDoc_(slide, colX.empresa, ry, listaW * 0.30, rowH, it.empresa, 8, true,  CORES.textDark);
    desenharCelulaDoc_(slide, colX.doc,     ry, listaW * 0.32, rowH, it.documento, 8, false, CORES.textDark);
    desenharCelulaDoc_(slide, colX.venc,    ry, listaW * 0.16, rowH, it.venc, 8, false, CORES.textDark);
    desenharCelulaDoc_(slide, colX.dias,    ry, listaW * 0.10, rowH, it.diasTexto, 8, true, cor);

    // Pílula de status
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, colX.status, ry + 2, listaW * 0.14, rowH - 4);
    pill.getFill().setSolidFill(cor); pill.getBorder().setTransparent();
    const pillTxt = pill.getText();
    pillTxt.setText(DOC_LABEL_CATEGORIA[it.categoria])
      .getTextStyle().setFontSize(6.5).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    pillTxt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    pill.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  if (criticos.length > visiveis.length) {
    const resto = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 18, listaY + listaH - 22, listaW - 36, 18);
    resto.getText().setText('+ ' + (criticos.length - visiveis.length) + ' outros críticos — ver tabela completa nas próximas páginas.')
      .getTextStyle().setFontSize(8).setItalic(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  }
}


// ==========================================
// PÁGINAS 2+: TABELA COMPLETA PAGINADA
// ==========================================
function desenharPaginaTabelaDocumentos_(itens, pagina, totalPaginas) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const tableW = pageW - (2 * DOC_MARGIN_X);

  criarHeaderPadrao(slide, 'DOCUMENTAÇÃO LEGAL', 'Mapa Completo de Documentos — página ' + pagina + '/' + totalPaginas);

  // ── Colunas — largura útil com padding simétrico ────────────────────────
  // EMPRESA 17 | DOCUMENTO 27 | VENC 12 | OBS 22 | DIAS 8 | STATUS 14 = 100%
  const x0      = DOC_MARGIN_X + DOC_PAD_X;
  const usableW = tableW - (2 * DOC_PAD_X);
  const acc = (() => { let a = 0; return f => { const x = x0 + a * usableW; a += f; return x; }; })();
  const cols = [
    { t: 'EMPRESA',     x: acc(0.17), w: usableW * 0.17, align: 'L' },
    { t: 'DOCUMENTO',   x: acc(0.27), w: usableW * 0.27, align: 'L' },
    { t: 'VENC.',       x: acc(0.12), w: usableW * 0.12, align: 'C' },
    { t: 'OBSERVAÇÕES', x: acc(0.22), w: usableW * 0.22, align: 'L' },
    { t: 'DIAS',        x: acc(0.08), w: usableW * 0.08, align: 'C' },
    { t: 'STATUS',      x: acc(0.14), w: usableW * 0.14, align: 'C' }
  ];

  // ── Cabeçalho azul ───────────────────────────────────────────────────────
  const headY   = DOC_TOP_Y + 10;
  const headBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, DOC_MARGIN_X + 8, headY, tableW - 16, DOC_HEAD_H);
  headBar.getFill().setSolidFill(CORES.darkBlue); headBar.getBorder().setTransparent();
  cols.forEach(c => desenharCelulaDoc_(slide, c.x, headY + 2, c.w, DOC_HEAD_H - 4, c.t, 7.5, true, CORES.white, c.align));

  const startY = headY + DOC_HEAD_H + 4;

  // ── Agrupa itens por empresa ─────────────────────────────────────────────
  const grupos = [];
  itens.forEach((it, i) => {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.empresa === it.empresa) ult.itens.push({ it, i });
    else grupos.push({ empresa: it.empresa, itens: [{ it, i }] });
  });

  // ── Desenha os cards (SEM fundo branco geral — só os cards individuais) ──
  const itemY = {};
  let cursorY = startY;

  grupos.forEach(g => {
    const cardY = cursorY;
    const cardH = g.itens.length * DOC_ROW_H;

    // Sombra
    const sombra = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, DOC_MARGIN_X + 10, cardY + 2, tableW - 20, cardH);
    sombra.getFill().setSolidFill(CORES.shadow); sombra.getBorder().setTransparent(); sombra.sendToBack();

    // Card branco
    const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, DOC_MARGIN_X + 8, cardY, tableW - 16, cardH);
    card.getFill().setSolidFill(CORES.white); card.getBorder().setTransparent();

    // Barra colorida à esquerda
    const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, DOC_MARGIN_X + 8, cardY + 3, 4, cardH - 6);
    barra.getFill().setSolidFill(CORES.lightBlue); barra.getBorder().setTransparent();

    // Nome da empresa verticalmente centralizado no card
    desenharCelulaDoc_(slide, cols[0].x, cardY, cols[0].w, cardH, g.empresa, 9, true, CORES.darkBlue, 'L');

    g.itens.forEach(({ i }, li) => { itemY[i] = cardY + li * DOC_ROW_H; });
    cursorY += cardH + DOC_CARD_GAP;
  });

  // ── Conteúdo de cada documento (por cima dos cards) ─────────────────────
  itens.forEach((it, i) => {
    const ry  = itemY[i];
    const cor = DOC_CORES_CATEGORIA[it.categoria];

    desenharCelulaDoc_(slide, cols[1].x, ry, cols[1].w, DOC_ROW_H, it.documento, 7,   false, CORES.textDark, 'L');
    desenharCelulaDoc_(slide, cols[2].x, ry, cols[2].w, DOC_ROW_H, it.venc,      7,   false, CORES.textDark, 'C');
    desenharCelulaDoc_(slide, cols[3].x, ry, cols[3].w, DOC_ROW_H, it.obs,       6.5, false, CORES.textGray, 'L');
    desenharCelulaDoc_(slide, cols[4].x, ry, cols[4].w, DOC_ROW_H, it.diasTexto, 7.5, true,  cor,            'C');

    // Pílula de status centrada na coluna
    const pillH = 14;
    const pillW = cols[5].w * 0.92;
    const pillX = cols[5].x + (cols[5].w - pillW) / 2;
    const pillY = ry + (DOC_ROW_H - pillH) / 2;
    const pill  = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, pillX, pillY, pillW, pillH);
    pill.getFill().setSolidFill(cor); pill.getBorder().setTransparent();
    const pt = pill.getText();
    pt.setText(DOC_LABEL_CATEGORIA[it.categoria])
      .getTextStyle().setFontSize(6).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    pt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    pill.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
}


// ==========================================
// HELPER: célula de texto
// ==========================================
function desenharCelulaDoc_(slide, x, y, w, h, texto, fontSize, bold, cor, align) {
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  let t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return;  // texto vazio: não estiliza (evita "object has no text")
  // Trunca para caber em uma única linha (evita quebra para a 2ª linha)
  t = truncarParaLargura_(t, w, fontSize);
  const txt = box.getText();
  txt.setText(t)
    .getTextStyle().setFontSize(fontSize).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
  // Alinhamento horizontal: 'C' centro, 'R' direita, qualquer outro = esquerda
  const pAlign = align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
               : align === 'R' ? SlidesApp.ParagraphAlignment.END
               : SlidesApp.ParagraphAlignment.START;
  txt.getParagraphStyle().setParagraphAlignment(pAlign);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}

// Estima quantos caracteres cabem na largura (pt) e corta com reticências.
function truncarParaLargura_(texto, larguraPt, fontSize) {
  // Largura média aproximada de um caractere ≈ 0.60 * fontSize (Montserrat, conservador)
  const larguraUtil = larguraPt - 6;  // padding interno
  const maxChars = Math.max(3, Math.floor(larguraUtil / (fontSize * 0.60)));
  if (texto.length <= maxChars) return texto;
  return texto.substring(0, maxChars - 1).trim() + '…';
}
