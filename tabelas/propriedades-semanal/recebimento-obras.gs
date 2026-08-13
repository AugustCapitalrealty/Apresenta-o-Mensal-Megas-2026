/**
 * ============================================================
 * GERADOR DE SLIDES — VISTORIAS DE RECEBIMENTO DE OBRA
 * Capital Realty · vários relatórios na mesma apresentação
 * ============================================================
 *
 * Um script só, com VÁRIOS relatórios (um por aba da planilha).
 * Cada aba é uma "ficha" no registro RELATORIOS abaixo.
 *
 * COMO USAR:
 *   1. Abra a apresentação → Extensões → Apps Script.
 *   2. Cole este código (substitui o script anterior), salve.
 *   3. Recarregue (F5) e use o menu "⚙️ Recebimento de Obras":
 *        🔄 Atualizar Esteio · 🔄 Atualizar Ctba · 📊 Atualizar tudo
 *
 * PARA ADICIONAR UMA NOVA ABA (ex.: outra unidade):
 *   a) copie um bloco dentro de RELATORIOS e ajuste aba/tag/título;
 *   b) crie a função-atalho (ex.: function atualizarX(){ _run(RELATORIOS.x); });
 *   c) acrescente uma linha no menu em onOpen().
 * ============================================================
 */

// ─────────────────────────────────────────
// ► CONFIG GLOBAL (vale para todos os relatórios)
// ─────────────────────────────────────────
const SHEET_ID         = '1in5xwPsPBAQCRyuCZNdEmT_u4jOYADdGs0ABKeeovF4';
const SLIDES_ID        = '1Te_E9SuMVNG6mfLzLU8wybOEoa1q5CtuYICwHZxyMGg';
const MAX_LINHAS       = 9;

// A apresentação JÁ tem banner fixo (logo + faixa azul Capital Realty)
const BANNER_EXISTENTE = true;
const ALTURA_BANNER    = 0.255;   // ajuste fino se a tabela ficar alta/baixa demais

// Colunas padrão dos relatórios de recebimento (cabeçalho na linha 2)
const COLUNAS_RECEBIMENTO = [
  { nome: 'Empreendimento', tipo: 'textoCentro', largura: 0.18 },
  { nome: 'Obra',           tipo: 'texto',       largura: 0.40 },
  { nome: 'Pendência',      tipo: 'textoCentro', largura: 0.24 },
  { nome: 'Status',         tipo: 'status',      largura: 0.18 },
];

// KPIs padrão (contam por STATUS — coluna índice 3)
const KPIS_RECEBIMENTO = [
  { label: 'TOTAL',     cor: '#151E49', teste: null },
  { label: 'CONCLUÍDO', cor: '#10B981', teste: function(r) { return /conclu/i.test(_v(r, 3)); } },
  { label: 'PENDENTE',  cor: '#EF4444', teste: function(r) { return /pendente/i.test(_v(r, 3)); } },
];

// ╔════════════════════════════════════════════════════╗
// ║  ► RELATÓRIOS — uma ficha por aba da planilha         ║
// ╚════════════════════════════════════════════════════╝
const RELATORIOS = {
  esteio: {
    nome:            'Esteio',
    aba:             'Recebimento de Obras - Esteio',
    tag:             '【ESTEIO_AUTO】',
    titulo:          'RECEBIMENTO DE OBRAS · ESTEIO',
    subtitulo:       'Pendências da Obra · MEGA ESTEIO',
    cabecalhoContem: ['EMPREENDIMENTO', 'PENDÊNCIA', 'PENDENCIA'],
    colunas:         COLUNAS_RECEBIMENTO,
    kpis:            KPIS_RECEBIMENTO,
    pctTexto:        'concluído',
    coresBadge:      {},
    // Pendências no slide principal; concluídos vão para o histórico automático.
    separarConcluidos: true,
    testeConcluido:  function(r) { return /conclu/i.test(_v(r, 3)); },
  },
  ctba: {
    nome:            'Ctba',
    aba:             'Recebimento de Obras - Ctba',
    tag:             '【CTBA_AUTO】',
    titulo:          'RECEBIMENTO DE OBRAS · CURITIBA',
    subtitulo:       'Pendências da Obra · MEGA CURITIBA',
    cabecalhoContem: ['EMPREENDIMENTO', 'PENDÊNCIA', 'PENDENCIA'],
    colunas:         COLUNAS_RECEBIMENTO,
    kpis:            KPIS_RECEBIMENTO,
    pctTexto:        'concluído',
    coresBadge:      {},
    // Pendências no slide principal; concluídos vão para o histórico automático.
    separarConcluidos: true,
    testeConcluido:  function(r) { return /conclu/i.test(_v(r, 3)); },
  },

  analise: {
    nome:            'Análise de Projetos',
    aba:             'Análise de Projetos',
    tag:             '【ANALISE_AUTO】',
    titulo:          'ANÁLISE DE PROJETOS',
    subtitulo:       'Recebimento de Obras',
    cabecalhoContem: ['OBJETIVO', 'AVALIADOR', 'LOCAT'],
    // Tabela densa (10 colunas) → fonte menor para caber legível
    fonte:           7.5,
    fonteHeader:     7.5,
    // 7 linhas/slide: linhas compactas (não gigantes) e ainda com altura
    // suficiente para o Objetivo de 2 linhas caber sem transbordar.
    maxLinhas:       7,
    colunas: [
      { nome: 'Empr.',     tipo: 'textoCentro', largura: 0.085 },
      { nome: 'Locatário', tipo: 'textoCentro', largura: 0.085 },
      { nome: 'Objetivo',  tipo: 'texto',       largura: 0.175 },
      { nome: 'Compl.',    tipo: 'textoCentro', largura: 0.13, fonte: 6.5 },
      { nome: 'Mem.',      tipo: 'textoCentro', largura: 0.07, fonte: 6.5 },
      { nome: 'Recebim.',  tipo: 'data',        largura: 0.085, fonte: 6.5 },
      { nome: 'Entrega',   tipo: 'data',        largura: 0.085, fonte: 6.5 },
      { nome: 'Avaliador', tipo: 'textoCentro', largura: 0.11, maxPalavras: 2 },
      { nome: 'Status',    tipo: 'status',      largura: 0.11 },
      // Prazo (dias) calculado: concluído → Entrega − Recebimento;
      // em andamento (sem Entrega) → corre até hoje (Recebimento → hoje).
      { nome: 'Prazo',     tipo: 'textoCentro', largura: 0.065, calcular: function(r) {
        return _prazoDias(_v(r, 5), _v(r, 6), _v(r, 9)); // Recebim, Entrega, Prazo original
      } },
    ],
    kpis: [
      { label: 'TOTAL',     cor: '#151E49', teste: null },
      { label: 'CONCLUÍDO', cor: '#10B981', teste: function(r) { return /conclu/i.test(_v(r, 8)); } },
      { label: 'ANDAMENTO', cor: '#F97316', teste: function(r) { return /andamento/i.test(_v(r, 8)); } },
    ],
    pctTexto:        'concluído',
    coresBadge:      {},
    // Andamento no slide principal; concluídos vão para o histórico automático.
    separarConcluidos: true,
    testeConcluido:  function(r) { return /conclu/i.test(_v(r, 8)); },
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
// ► MENU ÚNICO + PAINEL (main de atualização)
//   Um só menu e um painel central com botões, para que as duas pessoas que
//   usam a apresentação não se confundam com menus separados.
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

// Painel lateral central — botões para cada relatório + "Atualizar TUDO".
function abrirPainel() {
  var html = HtmlService.createHtmlOutput(_htmlPainel())
    .setTitle('Atualizar Apresentação');
  SlidesApp.getUi().showSidebar(html);
}

// ── Dispatcher chamado pelos botões do painel (retorna texto de status) ──
//   qual: 'esteio' | 'ctba' | 'analise' | 'contratacoes' | 'recebimento' | 'tudo'
function executarAtualizacao(qual) {
  var prs  = SlidesApp.openById(SLIDES_ID);
  var msgs = [];
  if (qual === 'esteio'  || qual === 'recebimento' || qual === 'tudo')
    msgs.push('Esteio: '       + _gerarRelatorio(RELATORIOS.esteio,  prs) + ' slide(s)');
  if (qual === 'ctba'    || qual === 'recebimento' || qual === 'tudo')
    msgs.push('Ctba: '         + _gerarRelatorio(RELATORIOS.ctba,    prs) + ' slide(s)');
  if (qual === 'analise' || qual === 'recebimento' || qual === 'tudo')
    msgs.push('Análise: '      + _gerarRelatorio(RELATORIOS.analise, prs) + ' slide(s)');
  if (qual === 'contratacoes' || qual === 'tudo')
    msgs.push('Contratações: ' + _gerarContratacoes() + ' slide(s)');
  return '✅ ' + msgs.join('  ·  ');
}

// Atalho de menu: roda tudo sem pop-up de confirmação (só registra no log).
// Erros ainda avisam, para não falhar em silêncio.
function atualizarTudoGeral() {
  try {
    Logger.log(executarAtualizacao('tudo'));
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
    _alert('❌ ERRO: ' + e.message);
  }
}

// Atalhos individuais (mantidos para compatibilidade / execução manual)
function atualizarEsteio()  { _run(RELATORIOS.esteio); }
function atualizarCtba()    { _run(RELATORIOS.ctba); }
function atualizarAnalise() { _run(RELATORIOS.analise); }
function atualizarTudo()    { atualizarTudoGeral(); }

// HTML do painel central
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
  '  .contr{background:#003D7B;}' +
  '  .lote{background:#475569;}' +
  '  #msg{margin-top:14px;padding:10px;font-size:12px;border-radius:8px;background:#EAF1FB;color:#151E49;min-height:20px;white-space:pre-wrap;}' +
  '</style>' +
  '<h3>Atualizar Apresentação</h3>' +
  '<p class="sub">Clique no relatório que deseja regenerar. Cada botão substitui apenas os próprios slides.</p>' +
  '<button class="tudo" onclick="run(this,\'tudo\')">⚡ Atualizar TUDO</button>' +
  '<div class="sec">Recebimento de Obras</div>' +
  '<button class="rec" onclick="run(this,\'esteio\')">🔄 Esteio</button>' +
  '<button class="rec" onclick="run(this,\'ctba\')">🔄 Curitiba</button>' +
  '<button class="rec" onclick="run(this,\'analise\')">🔄 Análise de Projetos</button>' +
  '<button class="lote" onclick="run(this,\'recebimento\')">↻ Recebimento (os 3)</button>' +
  '<div class="sec">Gestão de Contratações</div>' +
  '<button class="contr" onclick="run(this,\'contratacoes\')">🔄 Contratações</button>' +
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

function _run(rel) {
  try {
    var n = _gerarRelatorio(rel);
    Logger.log('✅ ' + rel.nome + ': ' + n + ' slide(s) gerado(s)!'); // sem pop-up
  } catch (e) {
    Logger.log('ERRO: ' + e.message);
    _alert('❌ ERRO (' + rel.nome + '): ' + e.message);
  }
}

// ═════════════════════════════════════════
// ► GERAÇÃO DE UM RELATÓRIO
// ═════════════════════════════════════════
function _gerarRelatorio(rel, prs) {
  prs = prs || SlidesApp.openById(SLIDES_ID);

  var data = _lerDados(rel);
  var tagHist = rel.tag.replace('_AUTO】', '_HIST_AUTO】');
  _removerSlidesPorTag(prs, rel.tag);
  _removerSlidesPorTag(prs, tagHist);

  var SW = prs.getPageWidth();
  var SH = prs.getPageHeight();
  var dataAtualizacao = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  // Helper: monta os cards de KPI aplicando cada teste sobre um conjunto de linhas.
  function montarKpis(linhas) {
    return (rel.kpis || []).map(function(k) {
      return { label: k.label, cor: k.cor, valor: k.teste ? linhas.filter(k.teste).length : linhas.length };
    });
  }

  // Sem separação → comportamento antigo: todas as linhas + KPIs sobre o total.
  if (!rel.separarConcluidos || !rel.testeConcluido) {
    var kpis = montarKpis(data.rows);
    var pctStr = '';
    if (rel.pctTexto && kpis.length >= 2) {
      var pct = data.rows.length > 0 ? Math.round((kpis[1].valor / data.rows.length) * 100) : 0;
      pctStr = pct + '% ' + rel.pctTexto;
    }
    return _gerarPaginasRel(prs, SW, SH, rel, data.rows, rel.tag, kpis, pctStr, dataAtualizacao, null);
  }

  // Com separação: PENDÊNCIAS no slide principal, CONCLUÍDOS no histórico.
  var pendentes  = data.rows.filter(function(r) { return !rel.testeConcluido(r); });
  var concluidos = data.rows.filter(function(r) { return  rel.testeConcluido(r); });
  var grand = data.rows.length;

  // Rótulos/cores derivados da config: [0]=TOTAL, [1]=CONCLUÍDO, [2]=aberto (PENDENTE/ANDAMENTO)
  var kTotal = rel.kpis[0], kConcl = rel.kpis[1], kAberto = rel.kpis[2];

  // Slide principal (aberto): NÃO contabiliza concluídos. Mostra só o que
  // está em aberto (contagem de PENDENTE/ANDAMENTO). Sem % de concluído.
  var kpisMain = [{ label: kAberto.label, cor: kAberto.cor, valor: pendentes.length }];
  var n = _gerarPaginasRel(prs, SW, SH, rel, pendentes, rel.tag, kpisMain, '', dataAtualizacao, null);

  // Histórico (concluídos): total geral + concluídos + % concluído.
  if (concluidos.length > 0) {
    var kpisHist = [
      { label: kTotal.label,  cor: kTotal.cor,  valor: grand },
      { label: kConcl.label,  cor: kConcl.cor,  valor: concluidos.length },
    ];
    var pctHist = rel.pctTexto
      ? (grand > 0 ? Math.round((concluidos.length / grand) * 100) : 0) + '% ' + rel.pctTexto
      : '';
    n += _gerarPaginasRel(prs, SW, SH, rel, concluidos, tagHist, kpisHist, pctHist, dataAtualizacao,
      'HISTÓRICO · CONCLUÍDOS');
  }
  return n;
}

// Gera as páginas de um conjunto de linhas (principal ou histórico).
function _gerarPaginasRel(prs, SW, SH, rel, linhas, tag, kpis, pctStr, dataAtualizacao, caption) {
  var maxL  = rel.maxLinhas || MAX_LINHAS;
  var pages = _paginar(linhas, maxL);

  pages.forEach(function(pageRows, pageIdx) {
    var slide = prs.appendSlide();
    slide.getBackground().setSolidFill(C.bgSlide);
    slide.getNotesPage().getSpeakerNotesShape().getText()
      .setText(tag + '\nGerado em ' + new Date().toLocaleString('pt-BR'));

    if (!BANNER_EXISTENTE) _desenharBanner(slide, SW, SH, rel);

    var bannerBottom = BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135;
    var footerH      = SH * 0.095;
    var footerY      = SH - SH * 0.025 - footerH;
    var tableTop     = bannerBottom + SH * 0.015;

    // Legenda "HISTÓRICO ..." (quando aplicável), abaixo do banner
    if (caption) {
      var capH = SH * 0.045;
      _desenharCaptionRel(slide, SW, SH, tableTop, capH, caption);
      tableTop += capH + SH * 0.008;
    }
    var tableBottom = footerY - SH * 0.025;

    _desenharTabela(slide, SW, SH, pageRows, tableTop, tableBottom, rel);
    _desenharRodape(slide, SW, SH, kpis, pctStr, footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
  });

  return pages.length;
}

// Faixa fina de legenda de seção (para distinguir o histórico do banner fixo)
function _desenharCaptionRel(slide, SW, SH, y, h, texto) {
  var M = SW * 0.020;
  var bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, M, y, SW - M * 2, h);
  bar.getFill().setSolidFill(C.brandDark);
  bar.getBorder().setTransparent();
  var folga = 10;
  var tb = slide.insertTextBox(texto, M - folga, y, SW - M * 2 + folga * 2, h);
  var ts = tb.getText().getTextStyle();
  ts.setFontFamily(TY.titles); ts.setFontSize(9); ts.setBold(true);
  ts.setForegroundColor('#FFFFFF');
  tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb);
}

// ─────────────────────────────────────────
// ► LEITURA DA PLANILHA
// ─────────────────────────────────────────
function _lerDados(rel) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(rel.aba);
  if (!sheet) throw new Error('Aba "' + rel.aba + '" não encontrada.');

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba "' + rel.aba + '" está vazia.');

  var allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var chaves = (rel.cabecalhoContem || []).map(function(s) { return String(s).toUpperCase(); });

  // Linha do cabeçalho = primeira que contém uma das palavras-chave
  var headerRowIdx = -1;
  for (var i = 0; i < allValues.length; i++) {
    if (allValues[i].some(function(c) {
      var u = String(c).toUpperCase();
      return chaves.some(function(k) { return u.indexOf(k) !== -1; });
    })) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) throw new Error('Cabeçalho não encontrado na aba "' + rel.aba + '".');

  var headerRow = allValues[headerRowIdx];
  var colMap = [];
  for (var j = 0; j < headerRow.length; j++) {
    if (String(headerRow[j]).trim() !== '') colMap.push(j);
  }

  var rows = [];
  for (var i2 = headerRowIdx + 1; i2 < allValues.length; i2++) {
    var row = allValues[i2];
    if (row.every(function(c) { return String(c).trim() === ''; })) continue;
    var rowData = colMap.map(function(idx) { return _fmt(row[idx]); });
    if (rowData.some(function(c) { return c !== ''; })) rows.push(rowData);
  }

  return { rows: rows };
}

// ─────────────────────────────────────────
// ► BANNER PRÓPRIO (só quando BANNER_EXISTENTE = false)
// ─────────────────────────────────────────
function _desenharBanner(slide, SW, SH, rel) {
  var M = SW * 0.020;
  var Hh = SH * 0.135;
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, Hh);
  bg.getFill().setSolidFill(C.brandDark);
  bg.getBorder().setTransparent();

  var titleBox = slide.insertTextBox(rel.titulo, M, Hh * 0.10, SW * 0.70, Hh * 0.50);
  var ts1 = titleBox.getText().getTextStyle();
  ts1.setFontFamily(TY.titles); ts1.setFontSize(Math.round(SW * 0.026));
  ts1.setBold(true); ts1.setForegroundColor('#FFFFFF');
  titleBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(titleBox);

  var subBox = slide.insertTextBox(rel.subtitulo, M, Hh * 0.60, SW * 0.70, Hh * 0.36);
  var ts2 = subBox.getText().getTextStyle();
  ts2.setFontFamily(TY.titles); ts2.setFontSize(Math.round(SW * 0.015));
  ts2.setForegroundColor(C.brandSoft);
  subBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(subBox);
}

// ─────────────────────────────────────────
// ► TABELA (dirigida por rel.colunas)
// ─────────────────────────────────────────
function _desenharTabela(slide, SW, SH, rows, tableTop, tableBottom, rel) {
  var M = SW * 0.020;
  var tableH = tableBottom - tableTop;
  var tableW = SW - M * 2;

  var cols      = rel.colunas;
  var colWidths = cols.map(function(col) { return col.largura * tableW; });

  // Altura fixa por maxLinhas — linhas compactas, sem esticar para preencher.
  var maxL = rel.maxLinhas || MAX_LINHAS;
  var rowH = tableH / (maxL + 1);
  var hdrH = rowH * 1.25;

  // Cabeçalho
  var xPos = M;
  cols.forEach(function(col, ci) {
    var cw = colWidths[ci];
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, tableTop, cw, hdrH);
    bg.getFill().setSolidFill(C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra): nas colunas
    // estreitas e centralizadas ("Prazo", "Mem.", "Compl."...), o recuo
    // interno da TEXT_BOX faz o cabeçalho quebrar em 2 linhas. Alarga só a
    // caixa de texto (invisível), simétrica; o fundo (bg) não muda.
    var centrado = (col.tipo !== 'texto');
    var fHdr = centrado ? 10 : 0;
    var tb = slide.insertTextBox(col.nome, xPos + 3 - fHdr, tableTop, cw - 6 + fHdr * 2, hdrH);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(rel.fonteHeader || FONTE.colHeader);
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

    xPos = M;
    cols.forEach(function(col, ci) {
      var cw = colWidths[ci];

      var cellBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yPos, cw, rowH);
      cellBg.getFill().setSolidFill('#' + rowBg);
      cellBg.getBorder().setWeight(0.75);
      cellBg.getBorder().getLineFill().setSolidFill(C.lines);

      // col.calcular(row) permite valores derivados (ex.: Prazo em dias)
      var val = col.calcular ? col.calcular(row) : _v(row, ci);
      var display = (val === '-') ? '' : val;

      if (display !== '' || col.tipo === 'data') {
        _desenharCelula(slide, xPos, yPos, cw, rowH, display, col, rel);
      }
      xPos += cw;
    });
  });
}

// Conteúdo de uma célula conforme o tipo da coluna
function _desenharCelula(slide, x, y, w, h, display, col, rel) {
  var fCel = col.fonte || rel.fonte || FONTE.celula;      // textoCentro / data
  var fTxt = col.fonte || rel.fonte || FONTE.descricao;   // texto
  var fNum = col.fonte || rel.fonte || FONTE.item;        // numero

  if (col.maxPalavras && display) {
    var palavras = display.split(/\s+/);
    if (palavras.length > col.maxPalavras) display = palavras.slice(0, col.maxPalavras).join(' ');
  }

  switch (col.tipo) {
    case 'numero':
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, fNum, SlidesApp.ParagraphAlignment.CENTER, true);
      break;

    case 'texto':
      // Justificado (alinha as duas margens) — colunas longas tipo Descrição/Obra.
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, fTxt, SlidesApp.ParagraphAlignment.JUSTIFIED, false);
      break;

    case 'textoCentro':
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, fCel, SlidesApp.ParagraphAlignment.CENTER, false);
      break;

    case 'badge': {
      if (display === '') break;
      var corMap = rel.coresBadge || {};
      var cor = corMap[display.toUpperCase()] || C.brandLight.slice(1);
      _pill(slide, x, y, w, h, display.toUpperCase(), cor, 'FFFFFF');
      break;
    }

    case 'data':
      if (_isData(display)) {
        _celulaTexto(slide, x, y, w, h, display, fCel, SlidesApp.ParagraphAlignment.CENTER, false);
      }
      break;

    case 'status':
      if (display !== '') _badgeStatus(slide, x, y, w, h, display);
      break;

    default:
      if (display !== '') _celulaTexto(slide, x, y, w, h, display, fCel, SlidesApp.ParagraphAlignment.CENTER, false);
  }
}

// ─────────────────────────────────────────
// ► RODAPÉ — data (esquerda) + KPIs (direita)
// ─────────────────────────────────────────
function _desenharRodape(slide, SW, SH, kpis, pctStr, y, h, dataAtualizacao, pageNum, totalPages) {
  var M = SW * 0.020;

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

function _badgeStatus(slide, x, y, w, h, val) {
  _pill(slide, x, y, w, h, _statusLabel(val), _statusColor(val), 'FFFFFF');
}

function _celulaTexto(slide, x, y, w, h, text, fs, align, bold) {
  // "chip" = valor curto centralizado (data, nº...) que precisa da folga
  // "sem quebra". START e JUSTIFIED (Descrição/Obra) são parágrafos largos
  // que quebram em várias linhas — mesmo tratamento, sem folga.
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

// "dd/MM/yyyy" → Date (ou null)
function _dataBR(s) {
  if (!_isData(s)) return null;
  var p = String(s).trim().split('/');
  return new Date(+p[2], +p[1] - 1, +p[0]);
}

// Prazo em dias: se há Entrega → Entrega − Recebimento; se ainda está em
// andamento (sem Entrega) → corre até HOJE (Recebimento → hoje). Se as datas
// faltarem, cai no valor original da planilha.
function _prazoDias(recebStr, entregaStr, prazoOriginal) {
  var receb = _dataBR(recebStr);
  if (!receb) return prazoOriginal || '';
  var fim = _dataBR(entregaStr) || (function () { var h = new Date(); h.setHours(0, 0, 0, 0); return h; })();
  var dias = Math.round((fim - receb) / 86400000);
  if (dias < 0) dias = 0;
  return String(dias);
}

function _statusColor(val) {
  var v = val.toLowerCase();
  if (v === 'ok')                     return CORES.status.ok;
  if (v === 'n/a' || v === 'na')      return CORES.status.na;
  if (v.indexOf('conclu') !== -1)     return CORES.status.ok;
  if (v.indexOf('pendente') !== -1)   return CORES.status.pendente;
  if (v.indexOf('aguardando') !== -1) return CORES.status.aguardando;
  if (v.indexOf('andamento') !== -1)  return CORES.status.aguardando;
  return CORES.status.default;
}

function _statusLabel(val) {
  var v = val.toLowerCase();
  if (v === 'ok')                                                         return 'OK';
  if (v === 'n/a' || v === 'na')                                         return 'N/A';
  if (v.indexOf('conclu') !== -1)                                        return 'CONCLUÍDO';
  if (v.indexOf('andamento') !== -1)                                     return 'ANDAMENTO';
  if (v.indexOf('pendente') !== -1)                                      return 'PENDENTE';
  if (v.indexOf('aguardando') !== -1 && v.indexOf('interno') !== -1)    return 'AG. INTERNO';
  if (v.indexOf('aguardando') !== -1 && v.indexOf('engenharia') !== -1) return 'AG. ENGENHARIA';
  if (v.indexOf('aguardando') !== -1)                                    return 'AGUARDANDO';
  return val.toUpperCase();
}

function _noFill(shape) {
  try { shape.getFill().setTransparent(); } catch (e) {}
}
