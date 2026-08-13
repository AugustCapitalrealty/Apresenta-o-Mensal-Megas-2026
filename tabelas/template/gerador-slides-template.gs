/**
 * ============================================================
 * GERADOR DE SLIDES — TEMPLATE (clone configurável)
 * Capital Realty · base para novos relatórios
 * ============================================================
 *
 * Cópia INDEPENDENTE do gerador de pendências, pronta para um NOVO
 * relatório (outra planilha + outra apresentação). Todo o visual já
 * vem pronto; você só preenche o bloco CONFIG abaixo.
 *
 * COMO USAR:
 *   1. Abra a NOVA apresentação do Google Slides.
 *   2. Extensões → Apps Script → cole este código.
 *   3. Preencha o bloco ► CONFIG (IDs, aba, colunas).
 *   4. Salve, recarregue a apresentação (F5) e use o menu
 *      "⚙️ Relatório" → "🔄 Atualizar".
 * ============================================================
 */

// ╔════════════════════════════════════════════════════╗
// ║  ► CONFIG — é só isto que muda de um projeto p/ outro ║
// ╚════════════════════════════════════════════════════╝
const CONFIG = {
  // IDs (copie da URL de cada arquivo, entre /d/ e /edit)
  SHEET_ID:   'COLE_AQUI_O_ID_DA_PLANILHA',
  SLIDES_ID:  'COLE_AQUI_O_ID_DA_APRESENTACAO',

  SHEET_NAME: 'NOME DA ABA',           // aba de onde ler os dados
  TITULO:     'TÍTULO DO RELATÓRIO',   // usado só quando NÃO há banner fixo
  SUBTITULO:  'Capital Realty',

  TAG:        '【RELATORIO_AUTO】',      // etiqueta dos slides gerados (única por relatório)
  MAX_LINHAS: 9,                        // linhas por slide (menos = linhas mais altas)

  // O slide já tem um cabeçalho fixo (logo/faixa azul)?
  BANNER_EXISTENTE: true,
  ALTURA_BANNER:    0.255,              // fração da altura ocupada pelo banner fixo

  // Palavras que identificam a LINHA do cabeçalho dentro da planilha
  CABECALHO_CONTEM: ['DESCRIÇÃO', 'DESCRICAO'],

  // ── Colunas, NA ORDEM das colunas preenchidas da planilha ──
  //   tipo:    'numero' | 'texto' | 'textoCentro' | 'badge' | 'data' | 'status'
  //   largura: fração da largura da tabela (a soma deve dar ~1.0)
  COLUNAS: [
    { nome: 'Nº',        tipo: 'numero', largura: 0.07 },
    { nome: 'Descrição', tipo: 'texto',  largura: 0.55 },
    { nome: 'Setor',     tipo: 'badge',  largura: 0.18 },
    { nome: 'Previsão',  tipo: 'data',   largura: 0.20 },
  ],

  // ── KPIs do rodapé (opcional) — cada um conta as linhas que passam no teste.
  //    Deixe [] para mostrar só a data de atualização. (r = linha; use _v(r, índice))
  KPIS: [
    { label: 'TOTAL',     cor: '#151E49', teste: null },                                    // todas
    { label: 'COM DATA',  cor: '#10B981', teste: function(r) { return  _isData(_v(r, 3)); } },
    { label: 'A DEFINIR', cor: '#F97316', teste: function(r) { return !_isData(_v(r, 3)); } },
  ],
  PCT_TEXTO: 'com data',   // % no rodapé = 2º KPI / total. Deixe '' para não mostrar.

  // Cores opcionais por valor de badge (tipo 'badge'). Sem entrada → azul padrão.
  CORES_BADGE: {
    // 'TI': '065CA9', 'ARQUITETURA': '003D7B',
  },
};

// ─────────────────────────────────────────
// ► DESIGN SYSTEM · Capital Realty
// ─────────────────────────────────────────
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark:   '#151E49', brandMed:  '#003D7B', brandLight: '#065CA9', brandSoft: '#93C5FD',
    bgSlide:     '#F8FAFC',  cardBg:    '#FFFFFF', textMain:   '#151E49', textBody:  '#475569',
    lines:       '#E2E8F0',  accentGreen:'#10B981', accentOrange:'#F97316', accentRed:'#EF4444',
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
};
const C  = CR_DESIGN_SYSTEM.colors;
const TY = CR_DESIGN_SYSTEM.typography;

const CORES = {
  rowAlt1: 'FFFFFF',
  rowAlt2: 'EAF1FB',
  status: {
    ok: C.accentGreen.slice(1), pendente: C.accentRed.slice(1),
    aguardando: C.accentOrange.slice(1), na: '8A94A6', default: 'C9CFDB',
  },
};

const FONTE = { colHeader: 9, item: 9, descricao: 8.5, celula: 8.5, badge: 7.5 };

// ═════════════════════════════════════════
// ► MENU / "BOTÃO" DE ATUALIZAÇÃO
// ═════════════════════════════════════════
function onOpen() {
  try {
    SlidesApp.getUi()
      .createMenu('⚙️ Relatório')
      .addItem('🔄 Atualizar', 'gerarRelatorio')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen: ' + e.message);
  }
}

// ═════════════════════════════════════════
// ► PRINCIPAL
// ═════════════════════════════════════════
function gerarRelatorio() {
  try {
    var data = _lerDados();

    const prs = SlidesApp.openById(CONFIG.SLIDES_ID);
    _removerSlidesPorTag(prs, CONFIG.TAG);

    const SW = prs.getPageWidth();
    const SH = prs.getPageHeight();

    const pages = _paginar(data.rows, CONFIG.MAX_LINHAS);
    const dataAtualizacao = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

    // KPIs (contagem sobre TODAS as linhas, não só a página)
    var total = data.rows.length;
    var kpis = (CONFIG.KPIS || []).map(function(k) {
      var valor = k.teste ? data.rows.filter(k.teste).length : total;
      return { label: k.label, cor: k.cor, valor: valor };
    });
    var pctStr = '';
    if (CONFIG.PCT_TEXTO && kpis.length >= 2) {
      var pct = total > 0 ? Math.round((kpis[1].valor / total) * 100) : 0;
      pctStr = pct + '% ' + CONFIG.PCT_TEXTO;
    }

    pages.forEach(function(pageRows, pageIdx) {
      const slide = prs.appendSlide();
      slide.getBackground().setSolidFill(C.bgSlide);
      slide.getNotesPage().getSpeakerNotesShape().getText()
        .setText(CONFIG.TAG + '\nGerado em ' + new Date().toLocaleString('pt-BR'));

      if (!CONFIG.BANNER_EXISTENTE) _desenharBanner(slide, SW, SH);

      var bannerBottom = CONFIG.BANNER_EXISTENTE ? SH * CONFIG.ALTURA_BANNER : SH * 0.135;
      var footerH      = SH * 0.095;
      var footerY      = SH - SH * 0.025 - footerH;
      var tableTop     = bannerBottom + SH * 0.015;
      var tableBottom  = footerY - SH * 0.025;

      _desenharTabela(slide, SW, SH, pageRows, tableTop, tableBottom);
      _desenharRodape(slide, SW, SH, kpis, pctStr, footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
    });

    _alert('✅ ' + pages.length + ' slide(s) gerado(s) com sucesso!');

  } catch (error) {
    Logger.log('ERRO: ' + error.message);
    _alert('❌ ERRO: ' + error.message);
  }
}

// ─────────────────────────────────────────
// ► LEITURA DA PLANILHA
// ─────────────────────────────────────────
function _lerDados() {
  const ss    = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Aba "' + CONFIG.SHEET_NAME + '" não encontrada.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba "' + CONFIG.SHEET_NAME + '" está vazia.');

  const allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const chaves = (CONFIG.CABECALHO_CONTEM || []).map(function(s) { return String(s).toUpperCase(); });

  // Linha do cabeçalho = primeira que contém uma das palavras-chave
  var headerRowIdx = -1;
  for (var i = 0; i < allValues.length; i++) {
    if (allValues[i].some(function(c) {
      var u = String(c).toUpperCase();
      return chaves.some(function(k) { return u.indexOf(k) !== -1; });
    })) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) throw new Error('Cabeçalho não encontrado (ajuste CABECALHO_CONTEM).');

  // Mapeia as colunas preenchidas do cabeçalho (na ordem)
  const headerRow = allValues[headerRowIdx];
  const colMap = [];
  for (var j = 0; j < headerRow.length; j++) {
    if (String(headerRow[j]).trim() !== '') colMap.push(j);
  }

  const rows = [];
  for (var i = headerRowIdx + 1; i < allValues.length; i++) {
    const row = allValues[i];
    if (row.every(function(c) { return String(c).trim() === ''; })) continue;
    const rowData = colMap.map(function(idx) { return _fmt(row[idx]); });
    if (rowData.some(function(c) { return c !== ''; })) rows.push(rowData);
  }

  return { rows: rows };
}

// ─────────────────────────────────────────
// ► BANNER PRÓPRIO (só quando BANNER_EXISTENTE = false)
// ─────────────────────────────────────────
function _desenharBanner(slide, SW, SH) {
  const M = SW * 0.020;
  var Hh = SH * 0.135;
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, Hh);
  bg.getFill().setSolidFill(C.brandDark);
  bg.getBorder().setTransparent();

  var titleBox = slide.insertTextBox(CONFIG.TITULO, M, Hh * 0.10, SW * 0.70, Hh * 0.50);
  var ts1 = titleBox.getText().getTextStyle();
  ts1.setFontFamily(TY.titles); ts1.setFontSize(Math.round(SW * 0.026));
  ts1.setBold(true); ts1.setForegroundColor('#FFFFFF');
  titleBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(titleBox);

  var subBox = slide.insertTextBox(CONFIG.SUBTITULO, M, Hh * 0.60, SW * 0.70, Hh * 0.36);
  var ts2 = subBox.getText().getTextStyle();
  ts2.setFontFamily(TY.titles); ts2.setFontSize(Math.round(SW * 0.015));
  ts2.setForegroundColor(C.brandSoft);
  subBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(subBox);
}

// ─────────────────────────────────────────
// ► TABELA (genérica, dirigida por CONFIG.COLUNAS)
// ─────────────────────────────────────────
function _desenharTabela(slide, SW, SH, rows, tableTop, tableBottom) {
  var M = SW * 0.020;
  var tableH = tableBottom - tableTop;
  var tableW = SW - M * 2;

  var cols     = CONFIG.COLUNAS;
  var colWidths = cols.map(function(col) { return col.largura * tableW; });

  var rowH = tableH / (CONFIG.MAX_LINHAS + 1);
  var hdrH = rowH * 1.25;

  // Cabeçalho
  var xPos = M;
  cols.forEach(function(col, ci) {
    var cw = colWidths[ci];
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, tableTop, cw, hdrH);
    bg.getFill().setSolidFill(C.brandMed);
    bg.getBorder().setTransparent();

    var tb = slide.insertTextBox(col.nome, xPos + 3, tableTop, cw - 6, hdrH);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(FONTE.colHeader);
    ts.setBold(true); ts.setForegroundColor('#FFFFFF');
    tb.getText().getParagraphStyle().setParagraphAlignment(
      col.tipo === 'texto' ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tb);
    xPos += cw;
  });

  // Linhas
  rows.forEach(function(row, ri) {
    var yPos  = tableTop + hdrH + ri * rowH;
    var rowBg = (ri % 2 === 0) ? CORES.rowAlt1 : CORES.rowAlt2;

    xPos = M;
    cols.forEach(function(col, ci) {
      var cw = colWidths[ci];

      var cellBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yPos, cw, rowH);
      cellBg.getFill().setSolidFill('#' + rowBg);
      cellBg.getBorder().setWeight(0.75);
      cellBg.getBorder().getLineFill().setSolidFill(C.lines);

      var val = _v(row, ci);
      var display = (val === '-') ? '' : val;

      if (display !== '' || col.tipo === 'data') {
        _desenharCelula(slide, xPos, yPos, cw, rowH, display, col);
      }
      xPos += cw;
    });
  });
}

// Desenha o conteúdo de uma célula conforme o tipo da coluna
function _desenharCelula(slide, x, y, w, h, display, col) {
  switch (col.tipo) {
    case 'numero':
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, FONTE.item, SlidesApp.ParagraphAlignment.CENTER, true);
      break;

    case 'texto':
      // Justificado (alinha as duas margens) — colunas longas tipo Descrição.
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, FONTE.descricao, SlidesApp.ParagraphAlignment.JUSTIFIED, false);
      break;

    case 'textoCentro':
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false);
      break;

    case 'badge': {
      if (display === '') break;
      var corMap = CONFIG.CORES_BADGE || {};
      var cor = corMap[display.toUpperCase()] || C.brandLight.slice(1);
      _pill(slide, x, y, w, h, display.toUpperCase(), cor, 'FFFFFF');
      break;
    }

    case 'data':
      if (_isData(display)) {
        _celulaTexto(slide, x, y, w, h, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false);
      }
      break;

    case 'status':
      if (display !== '') _badgeStatus(slide, x, y, w, h, display);
      break;

    default:
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false);
  }
}

// ─────────────────────────────────────────
// ► RODAPÉ — data (esquerda) + KPIs (direita)
// ─────────────────────────────────────────
function _desenharRodape(slide, SW, SH, kpis, pctStr, y, h, dataAtualizacao, pageNum, totalPages) {
  const M = SW * 0.020;

  // Data + paginação (esquerda)
  var infoTxt = 'Atualizado em ' + dataAtualizacao;
  if (totalPages > 1) infoTxt += '   ·   Pág. ' + pageNum + '/' + totalPages;
  var infoBox = slide.insertTextBox(infoTxt, M, y, SW * 0.40, h);
  var tsi = infoBox.getText().getTextStyle();
  tsi.setFontFamily(TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(C.textBody);
  infoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  infoBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(infoBox);

  if (!kpis || kpis.length === 0) return;

  // KPIs (direita)
  var n      = kpis.length;
  var cardW  = SW * 0.168;
  var gap    = SW * 0.012;
  var pctW   = pctStr ? SW * 0.105 : 0;
  var groupW = cardW * n + gap * (n - 1) + (pctStr ? gap + pctW : 0);
  var x      = SW - M - groupW;

  kpis.forEach(function(k) {
    var cor = (String(k.cor).charAt(0) === '#') ? k.cor.slice(1) : k.cor;
    _kpiCard(slide, x, y, cardW, h, k.label, String(k.valor), cor);
    x += cardW + gap;
  });

  if (pctStr) {
    var pctBox = slide.insertTextBox(pctStr, x, y, pctW, h);
    var tsp = pctBox.getText().getTextStyle();
    tsp.setFontFamily(TY.titles); tsp.setFontSize(Math.round(SW * 0.014));
    tsp.setForegroundColor(C.textBody); tsp.setBold(true);
    pctBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    pctBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(pctBox);
  }
}

// Cartão KPI: número à esquerda, label à direita
function _kpiCard(slide, x, y, w, h, label, valor, bgHex) {
  var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill('#' + bgHex);
  card.getBorder().setTransparent();

  // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra): a TEXT_BOX tem
  // recuo interno (~7pt) que a API não desliga, então widget centralizado e
  // estreito quebra texto curto em 2 linhas. Alarga só a TEXT_BOX (invisível),
  // simétrica e centralizada — o card visível (ROUND_RECTANGLE) não muda.
  var numBox = slide.insertTextBox(valor, x + w * 0.02 - 8, y, w * 0.38 + 16, h);
  var tsN = numBox.getText().getTextStyle();
  tsN.setFontFamily(TY.titles); tsN.setFontSize(Math.max(14, Math.round(h * 0.46)));
  tsN.setBold(true); tsN.setForegroundColor('#FFFFFF');
  numBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  numBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(numBox);

  var labBox = slide.insertTextBox(label, x + w * 0.40, y, w * 0.58, h);
  var tsL = labBox.getText().getTextStyle();
  tsL.setFontFamily(TY.titles); tsL.setFontSize(Math.max(7, Math.round(h * 0.16)));
  tsL.setBold(true); tsL.setForegroundColor('#FFFFFF');
  labBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  labBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(labBox);
}

// ─────────────────────────────────────────
// ► HELPERS DE DESENHO
// ─────────────────────────────────────────

// Pílula colorida (badge) com texto centralizado
function _pill(slide, x, y, w, h, label, bgHex, txtHex) {
  var padX = w * 0.06, padY = h * 0.20;
  var bw = w - padX * 2, bh = h - padY * 2;

  var pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + padX, y + padY, bw, bh);
  pill.getFill().setSolidFill('#' + bgHex);
  pill.getBorder().setTransparent();

  var folga = 10;
  var tb = slide.insertTextBox(label, x + padX - folga, y + padY, bw + folga * 2, bh);
  var ts = tb.getText().getTextStyle();
  ts.setFontFamily(TY.body); ts.setFontSize(FONTE.badge); ts.setBold(true);
  ts.setForegroundColor('#' + txtHex);
  tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb);
}

// Badge de status (OK / PENDENTE / AGUARDANDO / N/A)
function _badgeStatus(slide, x, y, w, h, val) {
  _pill(slide, x, y, w, h, _statusLabel(val), _statusColor(val), 'FFFFFF');
}

// Célula de texto simples — centralizada verticalmente
function _celulaTexto(slide, x, y, w, h, text, fs, align, bold) {
  // "chip" = valor curto centralizado (data, nº...) que precisa da folga
  // "sem quebra". START e JUSTIFIED (Descrição) são parágrafos largos que
  // quebram em várias linhas — mesmo tratamento, sem folga.
  var chip = (align === SlidesApp.ParagraphAlignment.CENTER);
  var padX = chip ? 3 : 6;
  var padY = 4;
  var folga = chip ? 10 : 0;
  var tb = slide.insertTextBox(text, x + padX - folga, y + padY, w - padX * 2 + folga * 2, h - padY * 2);
  var ts = tb.getText().getTextStyle();
  ts.setFontFamily(bold ? TY.titles : TY.body);
  ts.setFontSize(fs); ts.setBold(!!bold);
  ts.setForegroundColor(C.textMain);
  var ps = tb.getText().getParagraphStyle();
  ps.setParagraphAlignment(align);
  if (!chip) ps.setLineSpacing(120);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb);
}

// ─────────────────────────────────────────
// ► HELPERS GERAIS
// ─────────────────────────────────────────
function _paginar(rows, maxPerPage) {
  var pages = [];
  for (var i = 0; i < rows.length; i += maxPerPage) pages.push(rows.slice(i, i + maxPerPage));
  if (pages.length === 0) pages.push([]);
  return pages;
}

function _removerSlidesPorTag(prs, tag) {
  prs.getSlides().forEach(function(s) {
    try {
      var notes = s.getNotesPage().getSpeakerNotesShape().getText().asString();
      if (notes.indexOf(tag) !== -1) s.remove();
    } catch (e) {}
  });
}

function _alert(msg) {
  try { SlidesApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
}

function _v(row, idx) {
  if (!row || row[idx] === undefined) return '';
  return String(row[idx]).trim();
}

function _fmt(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
  var s = String(v).trim();
  var d = new Date(s);
  if (s.length > 15 && !isNaN(d.getTime()) && /\d{4}/.test(s) && /GMT|:/.test(s)) {
    return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  return s;
}

function _isData(s) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(s).trim());
}

function _statusColor(val) {
  var v = val.toLowerCase();
  if (v === 'ok')                     return CORES.status.ok;
  if (v === 'n/a' || v === 'na')      return CORES.status.na;
  if (v.indexOf('pendente') !== -1)   return CORES.status.pendente;
  if (v.indexOf('aguardando') !== -1) return CORES.status.aguardando;
  return CORES.status.default;
}

function _statusLabel(val) {
  var v = val.toLowerCase();
  if (v === 'ok')                                                         return 'OK';
  if (v === 'n/a' || v === 'na')                                         return 'N/A';
  if (v.indexOf('pendente') !== -1)                                      return 'PENDENTE';
  if (v.indexOf('aguardando') !== -1 && v.indexOf('interno') !== -1)    return 'AG. INTERNO';
  if (v.indexOf('aguardando') !== -1 && v.indexOf('engenharia') !== -1) return 'AG. ENGENHARIA';
  if (v.indexOf('aguardando') !== -1)                                    return 'AGUARDANDO';
  return val.toUpperCase();
}

function _noFill(shape) {
  try { shape.getFill().setTransparent(); } catch (e) {}
}
