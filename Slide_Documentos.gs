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

const DOC_LINHAS_POR_PAGINA = 14;

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

  // ── Páginas seguintes: tabela completa paginada ──────────────────────────
  const total = dados.itens.length;
  const totalPaginas = Math.ceil(total / DOC_LINHAS_POR_PAGINA);

  for (let p = 0; p < totalPaginas; p++) {
    const fatia = dados.itens.slice(p * DOC_LINHAS_POR_PAGINA, (p + 1) * DOC_LINHAS_POR_PAGINA);
    desenharPaginaTabelaDocumentos_(fatia, p + 1, totalPaginas);
  }

  Logger.log('Slide Documentação Legal gerado (' + total + ' documentos, ' + (totalPaginas + 1) + ' páginas).');
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
  const pageH = deck.getPageHeight();

  criarHeaderPadrao(slide, 'DOCUMENTAÇÃO LEGAL', 'Mapa Completo de Documentos — página ' + pagina + '/' + totalPaginas);

  const marginX = 30;
  const topY    = 85;
  const tableW  = pageW - (2 * marginX);
  const tableH  = pageH - topY - 20;

  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, topY, tableW, tableH);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  // Colunas: EMPRESA | DOCUMENTO | VENC. | OBSERVAÇÕES | DIAS | STATUS
  // Proporções: 16 + 25 + 12 + 20 + 11 + 16 = 100%
  const x0 = marginX + 14;
  const cols = [
    { t: 'EMPRESA',       x: x0,                   w: tableW * 0.16 },
    { t: 'DOCUMENTO',     x: x0 + tableW * 0.16,   w: tableW * 0.25 },
    { t: 'VENC.',         x: x0 + tableW * 0.41,   w: tableW * 0.12 },
    { t: 'OBSERVAÇÕES',   x: x0 + tableW * 0.53,   w: tableW * 0.20 },
    { t: 'DIAS',          x: x0 + tableW * 0.73,   w: tableW * 0.11 },
    { t: 'STATUS',        x: x0 + tableW * 0.84,   w: tableW * 0.16 }
  ];

  // Cabeçalho
  const headY = topY + 10;
  const headBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX + 8, headY, tableW - 16, 22);
  headBar.getFill().setSolidFill(CORES.darkBlue); headBar.getBorder().setTransparent();
  cols.forEach(c => {
    const h = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, c.x, headY + 2, c.w, 18);
    h.getText().setText(c.t)
      .getTextStyle().setFontSize(7.5).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    h.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  const startY  = headY + 24;
  const CARD_GAP = 6;  // respiro vertical entre os cards de cliente

  // ── Agrupa as linhas por empresa (cada grupo vira um card) ──────────────
  const grupos = [];
  itens.forEach((it, i) => {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.empresa === it.empresa) ult.itens.push({ it, i });
    else grupos.push({ empresa: it.empresa, itens: [{ it, i }] });
  });

  // Altura de linha fixa — garante que tudo fique em uma linha sem quebra
  const rowH = 22;

  // Layout: posiciona cada card e guarda o Y de cada linha (com os gaps)
  const itemY = {};
  let cursorY = startY;

  grupos.forEach(g => {
    const cardY = cursorY;
    const cardH = g.itens.length * rowH;

    // Sombra
    const sombra = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX + 10, cardY + 2, tableW - 20, cardH);
    sombra.getFill().setSolidFill(CORES.shadow); sombra.getBorder().setTransparent(); sombra.sendToBack();

    // Card branco
    const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX + 8, cardY, tableW - 16, cardH);
    card.getFill().setSolidFill(CORES.white); card.getBorder().setTransparent();

    // Barra de destaque à esquerda
    const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX + 8, cardY + 3, 4, cardH - 6);
    barra.getFill().setSolidFill(CORES.lightBlue); barra.getBorder().setTransparent();

    // Nome da empresa centralizado no card
    desenharCelulaDoc_(slide, cols[0].x, cardY, cols[0].w, cardH, g.empresa, 9, true, CORES.darkBlue);

    // Guarda o Y de cada documento e avança o cursor
    g.itens.forEach(({ i }, li) => { itemY[i] = cardY + li * rowH; });
    cursorY += cardH + CARD_GAP;
  });

  // ── Conteúdo dos documentos (por cima dos cards) ────────────────────────
  itens.forEach((it, i) => {
    const ry  = itemY[i];
    const cor = DOC_CORES_CATEGORIA[it.categoria];

    desenharCelulaDoc_(slide, cols[1].x, ry, cols[1].w, rowH, it.documento, 7,   false, CORES.textDark);
    desenharCelulaDoc_(slide, cols[2].x, ry, cols[2].w, rowH, it.venc,      7,   false, CORES.textDark);
    desenharCelulaDoc_(slide, cols[3].x, ry, cols[3].w, rowH, it.obs,       6.5, false, CORES.textGray);
    desenharCelulaDoc_(slide, cols[4].x, ry, cols[4].w, rowH, it.diasTexto, 7.5, true,  cor);

    // Pílula de status
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cols[5].x, ry + 3, cols[5].w - 4, rowH - 6);
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
function desenharCelulaDoc_(slide, x, y, w, h, texto, fontSize, bold, cor) {
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return;  // texto vazio: não estiliza (evita "object has no text")
  // Desabilita redimensionamento automático para evitar quebra de linha
  box.setAutoFit(SlidesApp.AutoFitType.NONE);
  box.getText().setText(t)
    .getTextStyle().setFontSize(fontSize).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}
