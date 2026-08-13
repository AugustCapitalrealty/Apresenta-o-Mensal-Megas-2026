/**
 * ============================================================
 * GERADOR DE SLIDES — PENDÊNCIAS DA OBRA · MEGA CURITIBA
 * Capital Realty · Facilities
 * ============================================================
 *
 * Adaptado do modelo de Mega Itajaí (mega-itajai/pendencias-obra.gs), com
 * as mesmas 2 abas: "PENDENCIAS OBRA" e "ACOMPANHAMENTO DE DEMANDAS".
 *
 * COMO USAR:
 *   1. Abra o Google Slides → Extensões → Apps Script.
 *   2. Cole este código, salve.
 *   3. Recarregue a apresentação (F5) e use o menu "🔄 Atualizar Apresentação"
 *      → painel lateral com os botões de cada relatório.
 * ============================================================
 */

// ─────────────────────────────────────────
// ► CONFIGURE AQUI
// ─────────────────────────────────────────
const SHEET_ID           = '1N05LzpdSZXrAtPItwgkwFL2nOuuMmC1s';
const SHEET_NAME         = 'PENDENCIAS OBRA';
const SLIDES_ID          = '1Kzf0be1GxaA2MUm-vSMQkjOlAevykzJxD9rdjI13B80';
const TITULO_OBRA        = 'MEGA CURITIBA · FACILITIES';
const SUBTITULO_OBRA     = 'PENDÊNCIAS DA OBRA';

// Aba de acompanhamento de demandas (segundo relatório)
const SHEET_NAME_DEMANDAS = 'ACOMPANHAMENTO DE DEMANDAS';

// Slide completo: máx. de linhas por slide (inclui banner + KPIs)
const MAX_ROWS_PER_SLIDE = 9;

// Demandas: máx. de linhas por slide
const MAX_ROWS_DEMANDAS  = 9;

const SLIDE_TAG          = '【PENDENCIAS_AUTO】';
const SLIDE_TAG_DEMANDAS = '【DEMANDAS_AUTO】';

// ► O slide JÁ tem um banner/cabeçalho fixo (logo + faixa azul)?
const BANNER_EXISTENTE   = true;
const ALTURA_BANNER      = 0.255;

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
  headerBg:      C.brandDark.slice(1),
  colHeaderBg:   C.brandMed.slice(1),
  rowAlt1:       C.cardBg.slice(1),
  rowAlt2:       'EAF1FB',
  status: {
    ok:        C.accentGreen.slice(1),
    pendente:  C.accentRed.slice(1),
    aguardando:C.accentOrange.slice(1),
    na:        '8A94A6',
    default:   'C9CFDB',
  },
  totalBg:      C.brandDark.slice(1),
  resolvidosBg: C.accentGreen.slice(1),
  pendentesBg:  C.accentRed.slice(1),
  gridLine:     C.lines.slice(1),
  textDark:     C.textMain.slice(1),
  textBody:     C.textBody.slice(1),
};

const FONTE = { colHeader: 9, item: 9, descricao: 8.5, celula: 8.5, badge: 7.5 };

// ═════════════════════════════════════════
// ► MENU ÚNICO + PAINEL (main de atualização)
// ═════════════════════════════════════════
function onOpen() {
  try {
    SlidesApp.getUi()
      .createMenu('🔄 Atualizar Apresentação')
      .addItem('📋 Abrir painel de atualização', 'abrirPainel')
      .addSeparator()
      .addItem('⚡ Atualizar TUDO (1 clique)',   'atualizarTudoGeral')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen: ' + e.message);
  }
}

function abrirPainel() {
  var html = HtmlService.createHtmlOutput(_htmlPainel())
    .setTitle('Atualizar Apresentação');
  SlidesApp.getUi().showSidebar(html);
}

// qual: 'pendencias' | 'demandas' | 'tudo'
function executarAtualizacao(qual) {
  var msgs = [];
  if (qual === 'pendencias' || qual === 'tudo')
    msgs.push('Pendências: ' + _gerarPendencias() + ' slide(s)');
  if (qual === 'demandas' || qual === 'tudo')
    msgs.push('Demandas: '   + _gerarDemandas()   + ' slide(s)');
  return '✅ ' + msgs.join('  ·  ');
}

function atualizarTudoGeral() {
  try {
    Logger.log(executarAtualizacao('tudo'));
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
    _alert('❌ ERRO: ' + e.message);
  }
}

// Atalhos individuais (mantidos para compatibilidade / execução manual)
function gerarSlidesPendencias() {
  try {
    var n = _gerarPendencias();
    Logger.log('✅ ' + n + ' slide(s) de pendências gerado(s)!'); // sem pop-up
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
    _alert('❌ ERRO: ' + e.message);
  }
}

function gerarSlidesDemandas() {
  try {
    var n = _gerarDemandas();
    Logger.log('✅ ' + n + ' slide(s) de demandas gerado(s)!'); // sem pop-up
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
    _alert('❌ ERRO: ' + e.message);
  }
}

function _htmlPainel() {
  return '' +
  '<base target="_top">' +
  '<style>' +
  '  body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:14px;color:#151E49;background:#F8FAFC;}' +
  '  h3{margin:0 0 4px;font-size:14px;color:#003D7B;}' +
  '  .sub{font-size:11px;color:#475569;margin:0 0 14px;}' +
  '  .sec{font-size:11px;font-weight:bold;color:#065CA9;text-transform:uppercase;letter-spacing:.4px;margin:16px 0 6px;}' +
  '  button{width:100%;padding:11px;margin:5px 0;font-size:13px;font-weight:bold;color:#fff;border:none;border-radius:8px;cursor:pointer;}' +
  '  button:hover{filter:brightness(1.08);}' +
  '  button:disabled{background:#93C5FD !important;cursor:default;filter:none;}' +
  '  .tudo{background:#151E49;font-size:14px;padding:14px;}' +
  '  .rec{background:#065CA9;}' +
  '  #msg{margin-top:14px;padding:10px;font-size:12px;border-radius:8px;background:#EAF1FB;color:#151E49;min-height:20px;white-space:pre-wrap;}' +
  '</style>' +
  '<h3>Atualizar Apresentação · Mega Curitiba</h3>' +
  '<p class="sub">Clique no relatório que deseja regenerar. Cada botão substitui apenas os próprios slides.</p>' +
  '<button class="tudo" onclick="run(this,\'tudo\')">⚡ Atualizar TUDO</button>' +
  '<div class="sec">Relatórios</div>' +
  '<button class="rec" onclick="run(this,\'pendencias\')">🔄 Pendências da Obra</button>' +
  '<button class="rec" onclick="run(this,\'demandas\')">📋 Acompanhamento de Demandas</button>' +
  '<div id="msg">Pronto.</div>' +
  '<script>' +
  '  function run(btn, qual){' +
  '    var all=document.querySelectorAll("button");' +
  '    all.forEach(function(b){b.disabled=true;});' +
  '    document.getElementById("msg").textContent="⏳ Atualizando "+btn.textContent.replace(/^[^A-Za-zÀ-ú]+/,"")+"...";' +
  '    google.script.run' +
  '      .withSuccessHandler(function(r){all.forEach(function(b){b.disabled=false;});document.getElementById("msg").textContent=r;})' +
  '      .withFailureHandler(function(e){all.forEach(function(b){b.disabled=false;});document.getElementById("msg").textContent="❌ "+e.message;})' +
  '      .executarAtualizacao(qual);' +
  '  }' +
  '</script>';
}

// ═════════════════════════════════════════
// ► SLIDE COMPLETO (banner + KPIs + tabela) — PENDÊNCIAS
// ═════════════════════════════════════════
function _gerarPendencias() {
  var data = _lerDados();

  const prs = SlidesApp.openById(SLIDES_ID);
  _removerSlidesPorTag(prs, SLIDE_TAG);

  const SW = prs.getPageWidth();
  const SH = prs.getPageHeight();

  const pages = _paginar(data.dataRows, MAX_ROWS_PER_SLIDE);
  const dataAtualizacao = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  pages.forEach(function(pageRows, pageIdx) {
    const slide = prs.appendSlide();
    slide.getBackground().setSolidFill(C.bgSlide);
    slide.getNotesPage().getSpeakerNotesShape().getText()
      .setText(SLIDE_TAG + '\nGerado em ' + new Date().toLocaleString('pt-BR'));

    if (!BANNER_EXISTENTE) _desenharBanner(slide, SW, SH);

    var bannerBottom = BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135;
    var footerH      = SH * 0.095;
    var footerY      = SH - SH * 0.025 - footerH;
    var tableTop     = bannerBottom + SH * 0.015;
    var tableBottom  = footerY - SH * 0.025;

    _desenharTabela(slide, SW, SH, pageRows, {
      maxRows: MAX_ROWS_PER_SLIDE,
      topY:    tableTop,
      bottomY: tableBottom,
    });

    _desenharRodape(slide, SW, SH, data.total, data.resolvidos, data.pendentes,
      footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
  });

  return pages.length;
}

// ═════════════════════════════════════════
// ► ACOMPANHAMENTO DE DEMANDAS (segundo relatório)
// ═════════════════════════════════════════
function _gerarDemandas() {
  var data = _lerDemandas();

  const prs = SlidesApp.openById(SLIDES_ID);
  _removerSlidesPorTag(prs, SLIDE_TAG_DEMANDAS);

  const SW = prs.getPageWidth();
  const SH = prs.getPageHeight();

  const pages = _paginar(data.rows, MAX_ROWS_DEMANDAS);
  const dataAtualizacao = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  pages.forEach(function(pageRows, pageIdx) {
    const slide = prs.appendSlide();
    slide.getBackground().setSolidFill(C.bgSlide);
    slide.getNotesPage().getSpeakerNotesShape().getText()
      .setText(SLIDE_TAG_DEMANDAS + '\nGerado em ' + new Date().toLocaleString('pt-BR'));

    if (!BANNER_EXISTENTE) _desenharBanner(slide, SW, SH);

    var bannerBottom = BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135;
    var footerH      = SH * 0.095;
    var footerY      = SH - SH * 0.025 - footerH;
    var tableTop     = bannerBottom + SH * 0.015;
    var tableBottom  = footerY - SH * 0.025;

    _desenharTabelaDemandas(slide, SW, SH, pageRows, {
      maxRows: MAX_ROWS_DEMANDAS,
      topY:    tableTop,
      bottomY: tableBottom,
    });

    _desenharRodapeDemandas(slide, SW, SH, data.total, data.comPrevisao, data.aDefinir,
      footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
  });

  return pages.length;
}

// Leitura da aba de demandas → linhas + contadores (com/sem data de previsão)
function _lerDemandas() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_DEMANDAS);
  if (!sheet) throw new Error('Aba "' + SHEET_NAME_DEMANDAS + '" não encontrada.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba "' + SHEET_NAME_DEMANDAS + '" está vazia.');

  const allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // Cabeçalho: linha que contém QUANTITATIVO ou DESCRIÇÃO
  var headerRowIdx = -1;
  for (var i = 0; i < allValues.length; i++) {
    if (allValues[i].some(function(c) {
      var u = String(c).toUpperCase();
      return u.indexOf('QUANTITATIVO') !== -1 || u.indexOf('DESCRIÇÃO') !== -1 || u.indexOf('DESCRICAO') !== -1;
    })) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) throw new Error('Cabeçalho da aba de demandas não encontrado.');

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
    // ignora linhas sem descrição (2ª coluna mapeada)
    if (rowData.length >= 2 && String(rowData[1]).trim() !== '') rows.push(rowData);
  }

  var total = rows.length;
  var comPrevisao = 0;
  rows.forEach(function(r) { if (_isData(_v(r, 3))) comPrevisao++; });

  return { rows: rows, total: total, comPrevisao: comPrevisao, aDefinir: total - comPrevisao };
}

// Tabela de demandas (7 colunas: Nº · Descrição · Setor · Solicitação · Tempo Decorrido · Previsão · Status)
function _desenharTabelaDemandas(slide, SW, SH, rows, opts) {
  opts = opts || {};
  var maxRows = opts.maxRows || MAX_ROWS_DEMANDAS;
  var M = SW * 0.020;

  var tableTop = (opts.topY !== undefined) ? opts.topY
               : ((BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135) + SH * 0.015);
  var tableBottom = (opts.bottomY !== undefined) ? opts.bottomY : (SH - SH * 0.030);
  var tableH = tableBottom - tableTop;
  var tableW = SW - M * 2;

  //               Nº     Descrição Setor  Solicitação  Tempo Decorrido  Previsão  Status
  var colRatios = [0.040, 0.280, 0.140, 0.105, 0.105, 0.110, 0.220];
  var colWidths = colRatios.map(function(r) { return r * tableW; });
  var colNames  = ['Nº', 'Descrição', 'Setor', 'Solicitação', 'Tempo Decorrido', 'Previsão de Entrega', 'Status'];

  // Altura da linha cresce quando há menos linhas que o máximo, preenchendo
  // o espaço disponível e dando folga para descrições de 2-3 linhas.
  var nRows = Math.min(rows.length, maxRows);
  var rowH = tableH / (nRows + 1.25);
  var hdrH = rowH * 1.25;

  // Cabeçalho
  var xPos = M;
  colNames.forEach(function(name, ci) {
    var cw = colWidths[ci];
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, tableTop, cw, hdrH);
    bg.getFill().setSolidFill(C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra" também no cabeçalho (evita "Concl." etc. quebrando).
    var centrado = (ci !== 1);
    var fHdr = centrado ? 10 : 0;
    var tb = slide.insertTextBox(name, xPos + 3 - fHdr, tableTop, cw - 6 + fHdr * 2, hdrH);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(FONTE.colHeader);
    ts.setBold(true); ts.setForegroundColor('#FFFFFF');
    tb.getText().getParagraphStyle().setParagraphAlignment(
      centrado ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tb);
    xPos += cw;
  });

  // Linhas
  rows.forEach(function(row, ri) {
    var yPos  = tableTop + hdrH + ri * rowH;
    var rowBg = (ri % 2 === 0) ? CORES.rowAlt1 : CORES.rowAlt2;
    var solicitacao = _v(row, 4);
    var vals  = [_v(row, 0), _v(row, 1), _v(row, 2), solicitacao, _tempoDecorrido(solicitacao), _v(row, 3), _v(row, 5)];

    xPos = M;
    vals.forEach(function(cellVal, ci) {
      var cw = colWidths[ci];

      var cellBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yPos, cw, rowH);
      cellBg.getFill().setSolidFill('#' + rowBg);
      cellBg.getBorder().setWeight(0.75);
      cellBg.getBorder().getLineFill().setSolidFill(C.lines);

      var display = (cellVal === '-') ? '' : cellVal;

      if (ci === 2 && display !== '') {
        // SETOR → badge azul
        _pill(slide, xPos, yPos, cw, rowH, display.toUpperCase(), C.brandLight.slice(1), 'FFFFFF');
      } else if (ci === 3 && display !== '') {
        // SOLICITAÇÃO DO PROJETO → data simples, sem badge
        _celulaTexto(slide, xPos, yPos, cw, rowH, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false);
      } else if (ci === 4 && display !== '' && display !== '-') {
        // TEMPO DECORRIDO → badge colorido por urgência
        _pill(slide, xPos, yPos, cw, rowH, display.toUpperCase(), _tempoDecorridoCor(solicitacao), 'FFFFFF');
      } else if (ci === 5) {
        // PREVISÃO DE ENTREGA → data em texto; sem data, deixa célula vazia
        if (_isData(display)) {
          _celulaTexto(slide, xPos, yPos, cw, rowH, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false);
        }
      } else if (ci === 6 && display !== '') {
        // STATUS → centralizado, como as demais colunas (só a Descrição é justificada)
        _celulaTexto(slide, xPos, yPos, cw, rowH, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false);
      } else if (display !== '') {
        var fs    = (ci === 1) ? FONTE.descricao : FONTE.item;
        // Descrição justificada (alinha as duas margens); as demais colunas, centralizadas.
        var align = (ci === 1) ? SlidesApp.ParagraphAlignment.JUSTIFIED : SlidesApp.ParagraphAlignment.CENTER;
        _celulaTexto(slide, xPos, yPos, cw, rowH, display, fs, align, ci === 0);
      }
      xPos += cw;
    });
  });
}

// Rodapé das demandas — data (esquerda) + KPIs TOTAL/COM DATA (direita)
function _desenharRodapeDemandas(slide, SW, SH, total, comPrevisao, aDefinir, y, h, dataAtualizacao, pageNum, totalPages) {
  const M = SW * 0.020;

  var infoTxt = 'Atualizado em ' + dataAtualizacao;
  if (totalPages > 1) infoTxt += '   ·   Pág. ' + pageNum + '/' + totalPages;
  var infoBox = slide.insertTextBox(infoTxt, M, y, SW * 0.40, h);
  var tsi = infoBox.getText().getTextStyle();
  tsi.setFontFamily(TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(C.textBody);
  infoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  infoBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(infoBox);

  var cardW  = SW * 0.168;
  var gap    = SW * 0.012;
  var pctW   = SW * 0.190;
  var groupW = cardW * 2 + gap * 2 + pctW;
  var x1     = SW - M - groupW;
  var x2     = x1 + cardW + gap;

  _kpiCard(slide, x1, y, cardW, h, 'TOTAL',    String(total),       CORES.totalBg);
  _kpiCard(slide, x2, y, cardW, h, 'COM DATA', String(comPrevisao), C.accentGreen.slice(1));

  var pct = total > 0 ? Math.round((comPrevisao / total) * 100) : 0;
  var pctBox = slide.insertTextBox(pct + '% com data', x2 + cardW + gap, y, pctW, h);
  var tsp = pctBox.getText().getTextStyle();
  tsp.setFontFamily(TY.titles); tsp.setFontSize(Math.round(SW * 0.014));
  tsp.setForegroundColor(C.textBody); tsp.setBold(true);
  pctBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  pctBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(pctBox);
}

// ─────────────────────────────────────────
// ► LEITURA DE DADOS (compartilhada) — PENDÊNCIAS
// ─────────────────────────────────────────
function _lerDados() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Aba "' + SHEET_NAME + '" não encontrada.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba está vazia.');

  const allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  var headerRowIdx = -1;
  for (var i = 0; i < allValues.length; i++) {
    if (allValues[i].some(function(c) {
      return String(c).indexOf('Item Relatório') !== -1 || String(c).indexOf('Descrição') !== -1;
    })) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) throw new Error('Cabeçalho não encontrado.');

  const headerRow = allValues[headerRowIdx];
  const colMap = [];
  for (var j = 0; j < headerRow.length; j++) {
    if (String(headerRow[j]).trim() !== '') colMap.push(j);
  }

  const dataRows = [];
  for (var i = headerRowIdx + 1; i < allValues.length; i++) {
    const row = allValues[i];
    if (row.every(function(c) { return String(c).trim() === ''; })) continue;
    const rowData = colMap.map(function(idx) { return _fmt(row[idx]); });
    if (rowData.some(function(c) { return c !== ''; })) dataRows.push(rowData);
  }

  var total = 0, resolvidos = 0, pendentes = 0;
  for (var i = 0; i < allValues.length; i++) {
    for (var j = 0; j < allValues[i].length; j++) {
      const cell = String(allValues[i][j]).toUpperCase().trim();
      if (cell === 'TOTAL')      total      = Number(allValues[i][j + 1]) || 0;
      if (cell === 'RESOLVIDOS') resolvidos = Number(allValues[i][j + 1]) || 0;
      if (cell === 'PENDENTES')  pendentes  = Number(allValues[i][j + 1]) || 0;
    }
  }
  if (total === 0) total = dataRows.length;

  return { dataRows: dataRows, total: total, resolvidos: resolvidos, pendentes: pendentes };
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

  var titleBox = slide.insertTextBox(SUBTITULO_OBRA, M, Hh * 0.10, SW * 0.55, Hh * 0.50);
  var ts1 = titleBox.getText().getTextStyle();
  ts1.setFontFamily(TY.titles); ts1.setFontSize(Math.round(SW * 0.028));
  ts1.setBold(true); ts1.setForegroundColor('#FFFFFF');
  titleBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(titleBox);

  var subBox = slide.insertTextBox(TITULO_OBRA, M, Hh * 0.60, SW * 0.55, Hh * 0.36);
  var ts2 = subBox.getText().getTextStyle();
  ts2.setFontFamily(TY.titles); ts2.setFontSize(Math.round(SW * 0.015));
  ts2.setForegroundColor(C.brandSoft);
  subBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(subBox);
}

// ─────────────────────────────────────────
// ► RODAPÉ — data de atualização (esquerda) + KPIs (direita)
// ─────────────────────────────────────────
function _desenharRodape(slide, SW, SH, total, resolvidos, pendentes, y, h, dataAtualizacao, pageNum, totalPages) {
  const M = SW * 0.020;

  var infoTxt = 'Atualizado em ' + dataAtualizacao;
  if (totalPages > 1) infoTxt += '   ·   Pág. ' + pageNum + '/' + totalPages;
  var infoBox = slide.insertTextBox(infoTxt, M, y, SW * 0.40, h);
  var tsi = infoBox.getText().getTextStyle();
  tsi.setFontFamily(TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(C.textBody);
  infoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  infoBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(infoBox);

  var cardW = SW * 0.168;
  var gap   = SW * 0.012;
  var pctW  = SW * 0.105;
  var groupW = cardW * 3 + gap * 3 + pctW;
  var x1     = SW - M - groupW;
  var x2     = x1 + cardW + gap;
  var x3     = x2 + cardW + gap;

  _kpiCard(slide, x1, y, cardW, h, 'TOTAL',      String(total),      CORES.totalBg);
  _kpiCard(slide, x2, y, cardW, h, 'RESOLVIDOS', String(resolvidos), CORES.resolvidosBg);
  _kpiCard(slide, x3, y, cardW, h, 'PENDENTES',  String(pendentes),  CORES.pendentesBg);

  var pct = total > 0 ? Math.round((resolvidos / total) * 100) : 0;
  var pctBox = slide.insertTextBox(pct + '% concluído', x3 + cardW + gap, y, pctW, h);
  var tsp = pctBox.getText().getTextStyle();
  tsp.setFontFamily(TY.titles); tsp.setFontSize(Math.round(SW * 0.014));
  tsp.setForegroundColor(C.textBody); tsp.setBold(true);
  pctBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  pctBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(pctBox);
}

// Cartão KPI: número à esquerda, label à direita
function _kpiCard(slide, x, y, w, h, label, valor, bgHex) {
  var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill('#' + bgHex);
  card.getBorder().setTransparent();

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
// ► TABELA — PENDÊNCIAS
//   opts.topY    → Y de início (padrão: abaixo dos KPIs)
//   opts.maxRows → linhas máximas usadas para calcular altura das linhas
// ─────────────────────────────────────────
function _desenharTabela(slide, SW, SH, rows, opts) {
  opts = opts || {};
  var maxRows = opts.maxRows || MAX_ROWS_PER_SLIDE;

  var M = SW * 0.020;

  var tableTop;
  if (opts.topY !== undefined) {
    tableTop = opts.topY;
  } else {
    var bandY = (BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135 + SH * 0.012);
    tableTop  = bandY + SH * 0.080 + SH * 0.022;
  }

  var tableBottom = (opts.bottomY !== undefined) ? opts.bottomY : (SH - SH * 0.030);
  var tableH = tableBottom - tableTop;
  var tableW = SW - M * 2;

  //               Nº     Descr  Garant Visita Atend  Concl  Empresa
  var colRatios = [0.050, 0.390, 0.130, 0.100, 0.095, 0.095, 0.140];
  var colWidths = colRatios.map(function(r) { return r * tableW; });
  var colNames  = ['Nº', 'Descrição', 'Garantia', 'Visita', 'Atend.', 'Concl.', 'Empresa'];

  var rowH = tableH / (maxRows + 1);
  var hdrH = rowH * 1.25;

  // Cabeçalho das colunas
  var xPos = M;
  colNames.forEach(function(name, ci) {
    var cw = colWidths[ci];
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, tableTop, cw, hdrH);
    bg.getFill().setSolidFill(C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra) — colunas
    // estreitas centralizadas ("Concl.", "Atend."...) não quebram o header.
    var centrado = (ci !== 1);
    var fHdr = centrado ? 10 : 0;
    var tb = slide.insertTextBox(name, xPos + 3 - fHdr, tableTop, cw - 6 + fHdr * 2, hdrH);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(FONTE.colHeader);
    ts.setBold(true); ts.setForegroundColor('#FFFFFF');
    tb.getText().getParagraphStyle().setParagraphAlignment(
      centrado ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tb);
    xPos += cw;
  });

  // Linhas de dados
  rows.forEach(function(row, ri) {
    var yPos  = tableTop + hdrH + ri * rowH;
    var rowBg = (ri % 2 === 0) ? CORES.rowAlt1 : CORES.rowAlt2;

    var vals = [_v(row,0), _v(row,1), _v(row,2), _v(row,3), _v(row,4), _v(row,5), _v(row,6)];

    xPos = M;
    vals.forEach(function(cellVal, ci) {
      var cw = colWidths[ci];

      var cellBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yPos, cw, rowH);
      cellBg.getFill().setSolidFill('#' + rowBg);
      cellBg.getBorder().setWeight(0.75);
      cellBg.getBorder().getLineFill().setSolidFill(C.lines);

      var display = (cellVal === '-') ? '' : cellVal;

      if ((ci === 2 || ci === 5) && display !== '') {
        _badge(slide, xPos, yPos, cw, rowH, display);
      } else if (display !== '') {
        var fs    = (ci === 1) ? FONTE.descricao : (ci === 0 ? FONTE.item : FONTE.celula);
        // Descrição justificada (alinha as duas margens); as demais colunas, centralizadas.
        var align = (ci === 1) ? SlidesApp.ParagraphAlignment.JUSTIFIED : SlidesApp.ParagraphAlignment.CENTER;
        var padX  = (ci === 1) ? 6 : 3;
        var padY  = 4;
        var tb = slide.insertTextBox(display, xPos + padX, yPos + padY, cw - padX * 2, rowH - padY * 2);
        var ts = tb.getText().getTextStyle();
        ts.setFontFamily(ci === 0 ? TY.titles : TY.body);
        ts.setFontSize(fs); ts.setBold(ci === 0);
        ts.setForegroundColor(C.textMain);
        var ps = tb.getText().getParagraphStyle();
        ps.setParagraphAlignment(align);
        if (ci === 1) ps.setLineSpacing(120);
        tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        _noFill(tb);
      }
      xPos += cw;
    });
  });
}

// ─────────────────────────────────────────
// ► BADGE DE STATUS
// ─────────────────────────────────────────
function _badge(slide, x, y, w, h, val) {
  var color = _statusColor(val);
  var label = _statusLabel(val);
  _pill(slide, x, y, w, h, label, color, 'FFFFFF');
}

// Pílula colorida genérica — folga "sem quebra" (skill slides-caixa-texto-sem-quebra)
function _pill(slide, x, y, w, h, label, bgHex, txtHex) {
  var padX = w * 0.06;
  var padY = h * 0.20;
  var bw   = w - padX * 2;
  var bh   = h - padY * 2;

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

// Célula de texto simples (número/descrição/data) — centralizada verticalmente
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
// ► HELPERS
// ─────────────────────────────────────────
function _paginar(rows, maxPerPage) {
  var pages = [];
  for (var i = 0; i < rows.length; i += maxPerPage) {
    pages.push(rows.slice(i, i + maxPerPage));
  }
  if (pages.length === 0) pages.push([]);
  return pages;
}

function _removerSlidesPorTag(prs, tag) {
  prs.getSlides().forEach(function(s) {
    try {
      var notes = s.getNotesPage().getSpeakerNotesShape().getText().asString();
      if (notes.indexOf(tag) !== -1) s.remove();
    } catch(e) {}
  });
}

function _alert(msg) {
  try { SlidesApp.getUi().alert(msg); } catch(e) { Logger.log(msg); }
}

function _v(row, idx) {
  if (!row || row[idx] === undefined) return '';
  return String(row[idx]).trim();
}

function _fmt(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  var s = String(v).trim();
  var d = new Date(s);
  if (s.length > 15 && !isNaN(d.getTime()) && /\d{4}/.test(s) && /GMT|:/.test(s)) {
    return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');
  }
  return s;
}

// true se a string for uma data no formato dd/MM/yyyy
function _isData(s) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(s).trim());
}

// Tempo decorrido desde uma data dd/MM/yyyy até hoje, em texto compacto
function _tempoDecorrido(dataStr) {
  if (!_isData(dataStr)) return '-';
  var p = dataStr.trim().split('/');
  var d = new Date(+p[2], +p[1] - 1, +p[0]);
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var dias = Math.floor((hoje - d) / 86400000);
  if (dias < 0) return '-';
  if (dias < 30) return dias + (dias === 1 ? ' dia' : ' dias');
  var meses = Math.floor(dias / 30);
  if (meses < 12) return meses + (meses === 1 ? ' mês' : ' meses');
  var anos = Math.floor(meses / 12);
  var restoMeses = meses % 12;
  return anos + (anos === 1 ? ' ano' : ' anos') + (restoMeses > 0 ? ' ' + restoMeses + 'm' : '');
}

// Cor do badge de tempo decorrido conforme urgência (dias desde a solicitação)
function _tempoDecorridoCor(dataStr) {
  if (!_isData(dataStr)) return CORES.status.default;
  var p = dataStr.trim().split('/');
  var d = new Date(+p[2], +p[1] - 1, +p[0]);
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var dias = Math.floor((hoje - d) / 86400000);
  if (dias <= 30)  return C.accentGreen.slice(1);
  if (dias <= 180) return C.accentOrange.slice(1);
  return C.accentRed.slice(1);
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
  try { shape.getFill().setTransparent(); } catch(e) {}
}
