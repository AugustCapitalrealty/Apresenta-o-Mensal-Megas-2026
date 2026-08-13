/**
 * ============================================================
 * GERADOR DE SLIDES — PENDÊNCIAS DA OBRA  ·  v5 (Diretoria)
 * Capital Realty · Mega Itajaí · Facilities
 * ============================================================
 *
 * COMO USAR:
 *   1. Abra o Google Slides → Extensões → Apps Script.
 *   2. Cole este código, salve.
 *   3. Recarregue a apresentação (F5) e use o menu "⚙️ Relatórios da Obra",
 *      ou execute diretamente:
 *      • gerarSlidesPendencias()  → relatório de pendências (banner + KPIs + tabela)
 *      • gerarSlidesDemandas()    → relatório de acompanhamento de demandas
 *      • gerarSomenteTabela()     → só a tabela de pendências, para colar em outra apresentação
 *   4. Autorize as permissões.
 * ============================================================
 */

// ─────────────────────────────────────────
// ► CONFIGURE AQUI
// ─────────────────────────────────────────
const SHEET_ID           = '1wQCwfSCBdH8OZOBmh6BsMutPwA5W5fwbEIT9LWt8fiM';
const SHEET_NAME         = 'PENDENCIAS OBRA';
const SLIDES_ID          = '14SxB0k1WqZatfAn2kSjHgrm8Jyb-mTLCdH5s5gb0wkI';
const TITULO_OBRA        = 'MEGA ITAJAÍ · FACILITIES';
const SUBTITULO_OBRA     = 'PENDÊNCIAS DA OBRA';

// Aba de acompanhamento de demandas (segundo relatório)
const SHEET_NAME_DEMANDAS = 'ACOMPANHAMENTO DE DEMANDAS';

// Slide completo: máx. de linhas por slide (inclui banner + KPIs)
// Menos linhas = linhas mais altas = melhor acomodação de texto com quebra
const MAX_ROWS_PER_SLIDE = 9;

// Somente tabela: menos linhas → linhas mais altas → melhor quebra de texto
const MAX_ROWS_TABELA    = 8;

// Demandas: máx. de linhas por slide
const MAX_ROWS_DEMANDAS  = 9;

const SLIDE_TAG          = '【PENDENCIAS_AUTO】';
const SLIDE_TAG_HIST     = '【PENDENCIAS_HIST_AUTO】';
const SLIDE_TAG_TABELA   = '【TABELA_AUTO】';
const SLIDE_TAG_DEMANDAS = '【DEMANDAS_AUTO】';

// ► O slide JÁ tem um banner/cabeçalho fixo (logo + faixa azul)?
//   true  = o script NÃO redesenha o banner, só posiciona KPIs/tabela abaixo dele.
//   false = o script desenha o próprio banner navy.
const BANNER_EXISTENTE   = true;
// Altura ocupada pelo banner existente, como fração da altura do slide.
const ALTURA_BANNER      = 0.255;

// ─────────────────────────────────────────
// ► DESIGN SYSTEM · Capital Realty
// ─────────────────────────────────────────
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark:   '#151E49',   // navy principal
    brandMed:    '#003D7B',   // azul médio
    brandLight:  '#065CA9',   // azul claro
    brandSoft:   '#93C5FD',   // azul suave (subtítulos sobre navy)
    bgSlide:     '#F8FAFC',   // fundo do slide
    cardBg:      '#FFFFFF',   // fundo de cards/linhas par
    textMain:    '#151E49',   // texto principal
    textBody:    '#475569',   // texto secundário
    lines:       '#E2E8F0',   // bordas e separadores
    accentGreen: '#10B981',   // OK / Resolvidos
    accentOrange:'#F97316',   // Aguardando
    accentRed:   '#EF4444',   // Pendente / Crítico
  },
  typography: {
    titles: 'Montserrat',     // cabeçalhos, KPIs, nomes de colunas
    body:   'Open Sans',      // conteúdo da tabela, badges, paginação
  },
};

// Atalhos internos (sem '#' para compatibilidade com setSolidFill)
const C  = CR_DESIGN_SYSTEM.colors;
const TY = CR_DESIGN_SYSTEM.typography;

// Paleta mapeada do design system
const CORES = {
  headerBg:      C.brandDark.slice(1),
  colHeaderBg:   C.brandMed.slice(1),
  rowAlt1:       C.cardBg.slice(1),     // FFFFFF (linhas pares)
  rowAlt2:       'EAF1FB',              // faixa zebrada — tint suave de brandSoft p/ separar linhas
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

// ─────────────────────────────────────────
// ► TAMANHOS DE FONTE (fixos — todas as linhas uniformes)
// ─────────────────────────────────────────
const FONTE = {
  colHeader:  9,
  item:       9,
  descricao:  8.5,
  celula:     8.5,
  badge:      7.5,
};

// ═════════════════════════════════════════
// ► MENU / "BOTÃO" DE ATUALIZAÇÃO
//   Executa sozinho ao abrir a apresentação e cria o menu
//   "⚙️ Pendências da Obra" na barra superior do Google Slides.
//   (No Slides não é possível vincular um script ao clique de uma
//    forma dentro do slide — o menu é o equivalente nativo a um botão.)
// ═════════════════════════════════════════
function onOpen() {
  try {
    SlidesApp.getUi()
      .createMenu('🔄 Atualizar Apresentação')
      .addItem('📋 Abrir painel de atualização', 'abrirPainel')
      .addSeparator()
      .addItem('⚡ Atualizar TUDO (1 clique)', 'atualizarTudoGeral')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen: ' + e.message);
  }
}

// Painel lateral com um botão por relatório — fica aberto na tela enquanto
// você trabalha, sem precisar reabrir o menu a cada atualização.
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
    msgs.push('Demandas: ' + _gerarDemandas() + ' slide(s)');
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
  '<h3>Atualizar Apresentação</h3>' +
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
// ► SLIDE COMPLETO (banner + KPIs + tabela)
// ═════════════════════════════════════════
function gerarSlidesPendencias() {
  try {
    var n = _gerarPendencias();
    Logger.log('✅ ' + n + ' slide(s) de pendências gerado(s)!'); // sem pop-up
  } catch(error) {
    Logger.log('ERRO: ' + error.message);
    _alert('❌ ERRO: ' + error.message);
  }
}

// Uma seção é "histórico" quando representa itens já concluídos.
function _ehSecaoHistorico(rotulo) {
  return /realizad|conclu/i.test(String(rotulo));
}

// Núcleo da geração de Pendências. Retorna o nº de slides criados.
//
// A aba é dividida em seções rotuladas (PENDENTE, AGENDADO, REALIZADO...).
// As seções em aberto viram os slides principais (cada uma com sua faixa de
// legenda) e as de concluídos vão para o HISTÓRICO, no mesmo padrão adotado
// nos relatórios de Propriedades.
function _gerarPendencias() {
  var data = _lerDados();

  const prs = SlidesApp.openById(SLIDES_ID);
  _removerSlidesPorTag(prs, SLIDE_TAG);
  _removerSlidesPorTag(prs, SLIDE_TAG_HIST);

  const SW = prs.getPageWidth();
  const SH = prs.getPageHeight();
  const dataAtualizacao = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  var abertas = [], historicas = [];
  data.ordemSecoes.forEach(function(rot) {
    if (data.secoes[rot].length === 0) return;
    (_ehSecaoHistorico(rot) ? historicas : abertas).push(rot);
  });

  var total = 0;

  // Sem seções rotuladas → comportamento antigo (lista única, sem legenda).
  if (abertas.length === 0 && historicas.length === 0) {
    return _gerarPaginasPend(prs, SW, SH, data.dataRows, SLIDE_TAG, null, dataAtualizacao, [
      { label: 'TOTAL',      valor: data.total,      cor: CORES.totalBg },
      { label: 'RESOLVIDOS', valor: data.resolvidos, cor: CORES.resolvidosBg },
      { label: 'PENDENTES',  valor: data.pendentes,  cor: CORES.pendentesBg },
    ], data.total > 0 ? Math.round((data.resolvidos / data.total) * 100) + '% concluído' : '');
  }

  // ── Seções em aberto: um bloco de slides por seção, sem contar concluídos ──
  abertas.forEach(function(rot) {
    var linhas = data.secoes[rot];
    total += _gerarPaginasPend(prs, SW, SH, linhas, SLIDE_TAG, rot, dataAtualizacao,
      [{ label: rot, valor: linhas.length, cor: _corSecao(rot) }], '');
  });

  // ── Histórico: itens já realizados ──
  historicas.forEach(function(rot) {
    var linhas = data.secoes[rot];
    var pct = data.total > 0 ? Math.round((linhas.length / data.total) * 100) + '% concluído' : '';
    total += _gerarPaginasPend(prs, SW, SH, linhas, SLIDE_TAG_HIST, 'HISTÓRICO · ' + rot, dataAtualizacao, [
      { label: 'TOTAL', valor: data.total,   cor: CORES.totalBg },
      { label: rot,     valor: linhas.length, cor: CORES.resolvidosBg },
    ], pct, true);
  });

  return total;
}

// Gera as páginas de um conjunto de linhas (uma seção). Retorna nº de slides.
function _gerarPaginasPend(prs, SW, SH, linhas, tag, caption, dataAtualizacao, kpis, pctStr, historico) {
  if (!linhas || linhas.length === 0) return 0;
  var pages = _paginar(linhas, MAX_ROWS_PER_SLIDE);

  pages.forEach(function(pageRows, pageIdx) {
    const slide = prs.appendSlide();
    slide.getBackground().setSolidFill(C.bgSlide);
    slide.getNotesPage().getSpeakerNotesShape().getText()
      .setText(tag + '\nGerado em ' + new Date().toLocaleString('pt-BR'));

    // Banner próprio só quando NÃO há banner fixo no slide
    if (!BANNER_EXISTENTE) _desenharBanner(slide, SW, SH);

    // ── Layout: TABELA em cima, RODAPÉ (data + KPIs) embaixo ──
    var bannerBottom = BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135;
    var footerH      = SH * 0.095;
    var footerY      = SH - SH * 0.025 - footerH;
    var tableTop     = bannerBottom + SH * 0.015;

    if (caption) {
      var capH = SH * 0.045;
      _desenharCaptionSecao(slide, SW, SH, tableTop, capH, caption, historico);
      tableTop += capH + SH * 0.008;
    }
    var tableBottom = footerY - SH * 0.025;

    _desenharTabela(slide, SW, SH, pageRows, {
      maxRows:   MAX_ROWS_PER_SLIDE,
      topY:      tableTop,
      bottomY:   tableBottom,
      historico: historico,
    });

    _desenharRodapeKpis(slide, SW, SH, kpis, pctStr,
      footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
  });

  return pages.length;
}

// Cor do cartão de KPI conforme a seção
function _corSecao(rotulo) {
  var r = String(rotulo).toLowerCase();
  if (/pendente/.test(r))            return CORES.pendentesBg;
  if (/agendad|andamento/.test(r))   return C.accentOrange.slice(1);
  if (/realizad|conclu/.test(r))     return CORES.resolvidosBg;
  return CORES.totalBg;
}

// Faixa fina de legenda de seção, logo abaixo do banner fixo
function _desenharCaptionSecao(slide, SW, SH, y, h, texto, historico) {
  var M = SW * 0.020;
  var bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, M, y, SW - M * 2, h);
  bar.getFill().setSolidFill(historico ? C.accentGreen : C.brandDark);
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

// ═════════════════════════════════════════
// ► SOMENTE TABELA
//   Gera slides apenas com a tabela de dados, sem banner nem KPIs,
//   ocupando praticamente todo o slide — linhas mais altas e
//   texto da Descrição com melhor quebra.
//   Use esses slides para copiar manualmente para outra apresentação.
// ═════════════════════════════════════════
function gerarSomenteTabela() {
  try {
    var data = _lerDados();

    const prs = SlidesApp.openById(SLIDES_ID);
    _removerSlidesPorTag(prs, SLIDE_TAG_TABELA);

    const SW = prs.getPageWidth();
    const SH = prs.getPageHeight();

    const M          = SW * 0.020;
    const tabelaTop  = SH * 0.025;

    const pages = _paginar(data.dataRows, MAX_ROWS_TABELA);

    pages.forEach(function(pageRows, pageIdx) {
      const slide = prs.appendSlide();
      slide.getBackground().setSolidFill(C.bgSlide);
      slide.getNotesPage().getSpeakerNotesShape().getText()
        .setText(SLIDE_TAG_TABELA + '\nTabela gerada em ' + new Date().toLocaleString('pt-BR'));

      // Número da página discreto no canto superior direito
      if (pages.length > 1) {
        var pgBox = slide.insertTextBox(
          (pageIdx + 1) + ' / ' + pages.length,
          SW - M - SW * 0.10, tabelaTop, SW * 0.10, SH * 0.022
        );
        var tsPg = pgBox.getText().getTextStyle();
        tsPg.setFontFamily(TY.body); tsPg.setFontSize(8);
        tsPg.setForegroundColor(C.textBody);
        pgBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
        pgBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        _noFill(pgBox);
      }

      _desenharTabela(slide, SW, SH, pageRows, {
        maxRows: MAX_ROWS_TABELA,
        topY:    tabelaTop,
      });
    });

    _alert('✅ ' + pages.length + ' slide(s) de tabela gerado(s). Copie e cole na apresentação do time!');

  } catch(error) {
    Logger.log('ERRO: ' + error.message);
    _alert('❌ ERRO: ' + error.message);
  }
}

// ═════════════════════════════════════════
// ► ACOMPANHAMENTO DE DEMANDAS (segundo relatório)
//   Lê a aba "ACOMPANHAMENTO DE DEMANDAS" e gera slides com a tabela
//   (Nº · Descrição · Setor · Previsão de Entrega) no mesmo padrão visual.
// ═════════════════════════════════════════
function gerarSlidesDemandas() {
  try {
    var n = _gerarDemandas();
    Logger.log('✅ ' + n + ' slide(s) de demandas gerado(s)!'); // sem pop-up
  } catch(error) {
    Logger.log('ERRO: ' + error.message);
    _alert('❌ ERRO: ' + error.message);
  }
}

// Núcleo da geração de Demandas. Retorna o nº de slides criados.
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

// Tabela de demandas (6 colunas: Nº · Descrição · Setor · Previsão de Entrega · Solicitação · Status)
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

  // Altura de linha fixa por maxRows (mesmo padrão da tabela de Pendências) —
  // evita que uma página com poucas linhas fique com grade desproporcional
  // (linhas gigantes, bordas parecendo mais grossas) em relação às demais.
  var rowH = tableH / (maxRows + 1);
  var hdrH = rowH * 1.25;

  // Cabeçalho
  var xPos = M;
  colNames.forEach(function(name, ci) {
    var cw = colWidths[ci];
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, tableTop, cw, hdrH);
    bg.getFill().setSolidFill(C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra": nas colunas centralizadas e estreitas ("Nº" era o
    // pior caso — quebrava em "N"/"o"), alarga só a caixa de texto invisível.
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
    // Status "OK" → linha toda verde (mesmo padrão do histórico de Pendências),
    // pra saltar aos olhos o que já foi concluído; senão, zebra normal.
    var isOk  = String(_v(row, 5)).trim().toLowerCase() === 'ok';
    var rowBg = isOk ? 'DCFCE7' : ((ri % 2 === 0) ? CORES.rowAlt1 : CORES.rowAlt2);
    var corTexto = isOk ? C.accentGreen : C.textMain;
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
        _celulaTexto(slide, xPos, yPos, cw, rowH, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false, corTexto);
      } else if (ci === 4 && display !== '' && display !== '-') {
        // TEMPO DECORRIDO → badge colorido por urgência (cor própria, não muda com o status)
        _pill(slide, xPos, yPos, cw, rowH, display.toUpperCase(), _tempoDecorridoCor(solicitacao), 'FFFFFF');
      } else if (ci === 5) {
        // PREVISÃO DE ENTREGA → data em texto; sem data, deixa célula vazia
        if (_isData(display)) {
          _celulaTexto(slide, xPos, yPos, cw, rowH, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false, corTexto);
        }
      } else if (ci === 6 && display !== '') {
        // STATUS → centralizado, como as demais colunas (só a Descrição é justificada)
        _celulaTexto(slide, xPos, yPos, cw, rowH, display, FONTE.celula, SlidesApp.ParagraphAlignment.CENTER, false, corTexto);
      } else if (display !== '') {
        var fs    = (ci === 1) ? FONTE.descricao : FONTE.item;
        // Descrição justificada (alinha as duas margens); as demais colunas, centralizadas.
        var align = (ci === 1) ? SlidesApp.ParagraphAlignment.JUSTIFIED : SlidesApp.ParagraphAlignment.CENTER;
        _celulaTexto(slide, xPos, yPos, cw, rowH, display, fs, align, ci === 0, corTexto);
      }
      xPos += cw;
    });
  });
}

// Rodapé das demandas — data (esquerda) + KPIs TOTAL/COM DATA/A DEFINIR (direita)
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
// ► LEITURA DE DADOS (compartilhada)
// ─────────────────────────────────────────
function _lerDados() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Aba "' + SHEET_NAME + '" não encontrada.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba está vazia.');

  const allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  function _ehCabecalho(row) {
    return row.some(function(c) {
      return String(c).indexOf('Item Relatório') !== -1 || String(c).indexOf('Descrição') !== -1;
    });
  }

  var headerRowIdx = -1;
  for (var i = 0; i < allValues.length; i++) {
    if (_ehCabecalho(allValues[i])) { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) throw new Error('Cabeçalho não encontrado.');

  const headerRow = allValues[headerRowIdx];
  const colMap = [];
  for (var j = 0; j < headerRow.length; j++) {
    if (String(headerRow[j]).trim() !== '') colMap.push(j);
  }

  // A aba passou a ser dividida em SEÇÕES: um cabeçalho repetido seguido de
  // uma linha-rótulo com uma única célula preenchida (ex.: "REALIZADO",
  // "AGENDADO", "PENDENTE"). O bloco inicial (antes do 1º rótulo) é a lista
  // geral, que repete os itens das seções rotuladas — por isso ele fica de
  // fora quando existem seções, para não duplicar linhas nos slides.
  const dataRows = [];                 // todas as linhas (compatibilidade)
  const secoes   = {};                 // { RÓTULO: [linhas] }
  const ordemSecoes = [];
  var secaoAtual = null;

  for (var i = headerRowIdx + 1; i < allValues.length; i++) {
    const row = allValues[i];
    if (row.every(function(c) { return String(c).trim() === ''; })) continue;
    if (_ehCabecalho(row)) continue;   // cabeçalho repetido de outra seção

    const rowData = colMap.map(function(idx) { return _fmt(row[idx]); });
    const preenchidas = rowData.filter(function(c) { return c !== ''; });

    // Linha-rótulo de seção: uma única célula preenchida, sem descrição
    if (preenchidas.length === 1 && _v(rowData, 0) !== '' && _v(rowData, 1) === '') {
      secaoAtual = _v(rowData, 0).toUpperCase();
      if (!secoes[secaoAtual]) { secoes[secaoAtual] = []; ordemSecoes.push(secaoAtual); }
      continue;
    }

    if (preenchidas.length === 0) continue;
    if (_v(rowData, 1) === '') continue;   // sem descrição → linha de apoio/KPI

    dataRows.push(rowData);
    if (secaoAtual) secoes[secaoAtual].push(rowData);
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

  return {
    dataRows: dataRows, total: total, resolvidos: resolvidos, pendentes: pendentes,
    secoes: secoes, ordemSecoes: ordemSecoes,
  };
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

  // ── Data de atualização (lado esquerdo) ──
  var infoTxt = 'Atualizado em ' + dataAtualizacao;
  if (totalPages > 1) infoTxt += '   ·   Pág. ' + pageNum + '/' + totalPages;
  var infoBox = slide.insertTextBox(infoTxt, M, y, SW * 0.40, h);
  var tsi = infoBox.getText().getTextStyle();
  tsi.setFontFamily(TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(C.textBody);
  infoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  infoBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(infoBox);

  // ── KPIs (lado direito) ──
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

  // % concluído
  var pct = total > 0 ? Math.round((resolvidos / total) * 100) : 0;
  var pctBox = slide.insertTextBox(pct + '% concluído', x3 + cardW + gap, y, pctW, h);
  var tsp = pctBox.getText().getTextStyle();
  tsp.setFontFamily(TY.titles); tsp.setFontSize(Math.round(SW * 0.014));
  tsp.setForegroundColor(C.textBody); tsp.setBold(true);
  pctBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  pctBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(pctBox);
}

// Rodapé genérico — data (esquerda) + N cartões de KPI + % opcional (direita).
// Usado pelos slides por seção: cada seção mostra só o que lhe diz respeito.
function _desenharRodapeKpis(slide, SW, SH, kpis, pctStr, y, h, dataAtualizacao, pageNum, totalPages) {
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

  if (!kpis || kpis.length === 0) return;

  var n      = kpis.length;
  var cardW  = SW * 0.168;
  var gap    = SW * 0.012;
  var pctW   = pctStr ? SW * 0.190 : 0;
  var groupW = cardW * n + gap * (n - 1) + (pctStr ? gap + pctW : 0);
  var x      = SW - M - groupW;

  kpis.forEach(function(k) {
    var cor = (String(k.cor).charAt(0) === '#') ? String(k.cor).slice(1) : k.cor;
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

  // Número — caixa larga o suficiente para 2 dígitos não quebrarem
  // (+ folga "sem quebra": a caixa de texto é mais larga que a área lógica,
  // centralizada no mesmo eixo, sem mudar a aparência do card)
  var numBox = slide.insertTextBox(valor, x + w * 0.02 - 8, y, w * 0.38 + 16, h);
  var tsN = numBox.getText().getTextStyle();
  tsN.setFontFamily(TY.titles); tsN.setFontSize(Math.max(14, Math.round(h * 0.46)));
  tsN.setBold(true); tsN.setForegroundColor('#FFFFFF');
  numBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  numBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(numBox);

  // Label — caixa larga para "RESOLVIDOS"/"PENDENTES" caberem em uma linha
  var labBox = slide.insertTextBox(label, x + w * 0.40, y, w * 0.58, h);
  var tsL = labBox.getText().getTextStyle();
  tsL.setFontFamily(TY.titles); tsL.setFontSize(Math.max(7, Math.round(h * 0.16)));
  tsL.setBold(true); tsL.setForegroundColor('#FFFFFF');
  labBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  labBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(labBox);
}

// ─────────────────────────────────────────
// ► TABELA
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

    // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra): nas colunas
    // estreitas e centralizadas ("Concl.", "Atend."...), o recuo interno da
    // TEXT_BOX quebra o cabeçalho em 2 linhas. Alarga só a caixa de texto
    // (invisível), simétrica; o fundo (bg) não muda.
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
  var historico = !!opts.historico;
  rows.forEach(function(row, ri) {
    var yPos  = tableTop + hdrH + ri * rowH;
    // Histórico → linha toda verde uniforme (mesmo padrão das Contratações);
    // senão, zebra normal.
    var rowBg = historico ? 'DCFCE7'
              : ((ri % 2 === 0) ? CORES.rowAlt1 : CORES.rowAlt2);

    var vals = [_v(row,0), _v(row,1), _v(row,2), _v(row,3), _v(row,4), _v(row,5), _v(row,6)];

    xPos = M;
    vals.forEach(function(cellVal, ci) {
      var cw = colWidths[ci];

      var cellBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yPos, cw, rowH);
      cellBg.getFill().setSolidFill('#' + rowBg);
      cellBg.getBorder().setWeight(0.75);
      cellBg.getBorder().getLineFill().setSolidFill(C.lines);

      var display = (cellVal === '-') ? '' : cellVal;

      // Garantia (2) e Conclusão (5) são badges de status — mas a planilha
      // passou a trazer DATAS nessas colunas; nesse caso vira texto simples.
      if ((ci === 2 || ci === 5) && display !== '' && !_isData(display)) {
        _badge(slide, xPos, yPos, cw, rowH, display);
      } else if (display !== '') {
        var fs    = (ci === 1) ? FONTE.descricao : (ci === 0 ? FONTE.item : FONTE.celula);
        var cent  = (ci !== 1);
        // Descrição justificada (alinha as duas margens); as demais colunas, centralizadas.
        var align = cent ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.JUSTIFIED;
        var padX  = cent ? 3 : 6;
        var padY  = 4;
        // Folga "sem quebra" nas células centralizadas (datas, "OK"...)
        var folga = cent ? 10 : 0;
        var tb = slide.insertTextBox(display, xPos + padX - folga, yPos + padY,
          cw - padX * 2 + folga * 2, rowH - padY * 2);
        var ts = tb.getText().getTextStyle();
        // Número do item em Montserrat bold; demais células em Open Sans
        ts.setFontFamily(ci === 0 ? TY.titles : TY.body);
        ts.setFontSize(fs); ts.setBold(ci === 0);
        ts.setForegroundColor(historico ? C.accentGreen : C.textMain);
        var ps = tb.getText().getParagraphStyle();
        ps.setParagraphAlignment(align);
        // Espaçamento entre linhas maior na Descrição para textos que quebram
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
// Tamanho de fonte do badge conforme o comprimento do texto — o rótulo
// sempre aparece por extenso (nunca abreviado, para não gerar dúvida em
// quem lê); rótulos longos só reduzem a fonte o suficiente para caber
// numa linha só.
function _tamanhoBadge(label) {
  var n = String(label).length;
  if (n <= 14) return FONTE.badge;       // ex.: "PENDENTE"
  if (n <= 18) return FONTE.badge - 0.5; // ex.: "AGUARDANDO INTERNO"
  if (n <= 21) return FONTE.badge - 1;   // ex.: "AGENDAMENTO INTERNO"
  return FONTE.badge - 1.5;              // ex.: "AGENDAMENTO ENGENHARIA"
}

function _badge(slide, x, y, w, h, val) {
  var color = _statusColor(val);
  var label = _statusLabel(val);

  var padX = w * 0.03;
  var padY = h * 0.20;
  var bw   = w - padX * 2;
  var bh   = h - padY * 2;

  var pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + padX, y + padY, bw, bh);
  pill.getFill().setSolidFill('#' + color);
  pill.getBorder().setTransparent();

  // Folga "sem quebra": só a caixa de texto (invisível) fica mais larga que a
  // pílula, centrada no mesmo eixo — a aparência não muda e o rótulo curto
  // ("OK", "PENDENTE") para de quebrar em 2 linhas.
  var folga = 10;
  var tb = slide.insertTextBox(label, x + padX - folga, y + padY, bw + folga * 2, bh);
  var ts = tb.getText().getTextStyle();
  ts.setFontFamily(TY.body);
  ts.setFontSize(_tamanhoBadge(label));
  ts.setBold(true);
  ts.setForegroundColor('#FFFFFF');
  tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb);
}

// Pílula colorida genérica (usada no relatório de demandas)
//
// Técnica "sem quebra" (skill slides-caixa-texto-sem-quebra): toda TEXT_BOX
// do Slides tem um recuo interno (~7pt) que a API não desliga; em caixas
// estreitas isso quebra texto curto em 2 linhas mesmo sobrando espaço visual.
// A caixa VISÍVEL (o ROUND_RECTANGLE do pill) mantém o tamanho exato; só a
// TEXT_BOX transparente por cima ganha uma folga simétrica, centralizada no
// mesmo eixo — a aparência não muda, só o texto para de quebrar.
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
  ts.setFontFamily(TY.body); ts.setFontSize(_tamanhoBadge(label)); ts.setBold(true);
  ts.setForegroundColor('#' + txtHex);
  tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(tb);
}

// Célula de texto simples (número/descrição/data) — centralizada verticalmente
function _celulaTexto(slide, x, y, w, h, text, fs, align, bold, corTexto) {
  // "chip" = valor curto centralizado (data, nº...) que precisa da folga
  // "sem quebra". START (esquerda) e JUSTIFIED (Descrição) são parágrafos
  // largos que quebram em várias linhas — mesma folga do START, sem folga.
  var chip = (align === SlidesApp.ParagraphAlignment.CENTER);
  var padX = chip ? 3 : 6;
  var padY = 4;
  var folga = chip ? 10 : 0;
  var tb = slide.insertTextBox(text, x + padX - folga, y + padY, w - padX * 2 + folga * 2, h - padY * 2);
  var ts = tb.getText().getTextStyle();
  ts.setFontFamily(bold ? TY.titles : TY.body);
  ts.setFontSize(fs); ts.setBold(!!bold);
  ts.setForegroundColor(corTexto || C.textMain);
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
  if (v.indexOf('conclu') !== -1)     return CORES.status.ok;
  if (v.indexOf('realizad') !== -1)   return CORES.status.ok;
  if (v.indexOf('pendente') !== -1)   return CORES.status.pendente;
  if (v.indexOf('aguardando') !== -1) return CORES.status.aguardando;
  if (v.indexOf('orçando') !== -1 || v.indexOf('orcando') !== -1) return CORES.status.aguardando;
  if (v.indexOf('agendad') !== -1 || v.indexOf('agendam') !== -1) return CORES.status.aguardando;
  return CORES.status.default;
}

// O rótulo do badge é sempre o texto por extenso, como está na planilha —
// abreviar (ex.: "AG. INTERNO") gerava dúvida em quem lia o slide. Só "OK" e
// "N/A" são normalizados; o resto sai igual ao valor original, em maiúsculas.
// A fonte reduz sozinha para caber (_tamanhoBadge) em vez de cortar o texto.
function _statusLabel(val) {
  var v = val.toLowerCase().trim();
  if (v === 'ok')                return 'OK';
  if (v === 'n/a' || v === 'na') return 'N/A';
  return val.trim().toUpperCase();
}

function _noFill(shape) {
  try { shape.getFill().setTransparent(); } catch(e) {}
}
