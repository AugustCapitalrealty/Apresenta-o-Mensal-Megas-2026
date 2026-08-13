/**
 * Gerador de slide — Gestão de Contratações (Propriedades & Facilities)
 * Lê a tabela "Imóvel · Etapa · Objeto · Área · Responsável · Prazo ·
 * Quantidades (Participantes/Visitas/Propostas)" da planilha e gera/atualiza
 * slides na apresentação de destino.
 *
 * ▸ Este arquivo faz parte do MESMO projeto Apps Script do
 *   gerador-recebimento-obras.gs. Por isso reutiliza os símbolos globais já
 *   declarados lá: SHEET_ID, SLIDES_ID, BANNER_EXISTENTE, ALTURA_BANNER,
 *   CR_DESIGN_SYSTEM, C, TY, CORES e os helpers _v, _fmt, _isData, _noFill,
 *   _alert, _paginar, _removerSlidesPorTag. NÃO os redeclare aqui.
 * ▸ O menu/painel único fica no onOpen() do gerador-recebimento-obras.gs;
 *   o botão "Contratações" do painel chama _gerarContratacoes() daqui.
 */

const SHEET_NAME_CONTRAT = 'GESTÃO DE CONTRATAÇÕES';

const TAG_CONTRATACOES      = '【CONTRATACOES_AUTO】';
const TAG_CONTRATACOES_HIST = '【CONTRATACOES_HIST_AUTO】';
const TITULO_SLIDE     = 'GESTÃO DE CONTRATAÇÕES';
const SUBTITULO_SLIDE  = 'PROPRIEDADES & FACILITIES';

const MAX_ROWS_CONTRAT = 12; // linhas por slide (paginação automática se houver mais)

// Fontes próprias desta tabela (mais densa que a do Recebimento).
const FONTE_C = { colHeader: 7, grupo: 8.5, item: 7, descricao: 7.5, celula: 7, badge: 7 };

// ═════════════════════════════════════════
// ► GERAÇÃO PRINCIPAL
// ═════════════════════════════════════════
function atualizarGestaoContratacoes() {
  try {
    var totalSlides = _gerarContratacoes();
    Logger.log('✅ ' + totalSlides + ' slide(s) de Gestão de Contratações gerado(s)!'); // sem pop-up
  } catch (error) {
    Logger.log('ERRO: ' + error.message);
    _alert('❌ ERRO: ' + error.message);
  }
}

// Núcleo da geração — usado tanto pelo item de menu (com alert) quanto pelo
// botão do painel lateral (que retorna texto). Retorna o nº de slides gerados.
function _gerarContratacoes() {
  const data = _lerContratacoes();
  if (data.rows.length === 0 && data.historico.length === 0)
    throw new Error('Nenhuma linha encontrada na aba "' + SHEET_NAME_CONTRAT + '".');

  const prs = SlidesApp.openById(SLIDES_ID);
  _removerSlidesPorTag(prs, TAG_CONTRATACOES);
  _removerSlidesPorTag(prs, TAG_CONTRATACOES_HIST);

  const SW = prs.getPageWidth();
  const SH = prs.getPageHeight();
  const dataAtualizacao = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  var totalSlides = 0;

  // ── Seção ABERTAS ──
  totalSlides += _gerarSecaoContratacoes(prs, SW, SH, dataAtualizacao, data.rows, {
    tag: TAG_CONTRATACOES,
    historico: false,
    kpis: { total: data.total, emEdital: data.emEdital, emAtraso: data.emAtraso },
  });

  // ── Seção HISTÓRICO (contratações fechadas) ──
  if (data.historico.length > 0) {
    totalSlides += _gerarSecaoContratacoes(prs, SW, SH, dataAtualizacao, data.historico, {
      tag: TAG_CONTRATACOES_HIST,
      historico: true,
      caption: 'HISTÓRICO · CONTRATAÇÕES FECHADAS',
      kpis: { total: data.totalHist },
    });
  }

  return totalSlides;
}

// Gera os slides de uma seção (abertas OU histórico) com paginação balanceada
// e altura de linha consistente. Retorna o nº de slides criados.
function _gerarSecaoContratacoes(prs, SW, SH, dataAtualizacao, linhas, opts) {
  if (!linhas || linhas.length === 0) return 0;

  var numPages    = Math.max(1, Math.ceil(linhas.length / MAX_ROWS_CONTRAT));
  var rowsPerPage = Math.ceil(linhas.length / numPages);
  var pages = _paginar(linhas, rowsPerPage);
  var temCaption = !!opts.caption;

  pages.forEach(function(pageRows, pageIdx) {
    var slide = prs.appendSlide();
    slide.getBackground().setSolidFill(C.bgSlide);
    slide.getNotesPage().getSpeakerNotesShape().getText()
      .setText(opts.tag + '\nGerado em ' + new Date().toLocaleString('pt-BR'));

    if (!BANNER_EXISTENTE) _desenharBannerC(slide, SW, SH);

    var bannerBottom = BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135;
    var footerH      = SH * 0.060;
    var footerY      = SH - SH * 0.025 - footerH;
    var tableTop     = bannerBottom + SH * 0.015;

    // Legenda da seção (ex.: "HISTÓRICO ...") logo abaixo do banner fixo
    if (temCaption) {
      var capH = SH * 0.045;
      _desenharCaptionSecao(slide, SW, SH, tableTop, capH, opts.caption);
      tableTop += capH + SH * 0.008;
    }
    var tableBottom = footerY - SH * 0.020;

    _desenharTabelaContratacoes(slide, SW, SH, pageRows, {
      maxRows:      MAX_ROWS_CONTRAT,
      linhasAltura: rowsPerPage,
      historico:    opts.historico,
      topY:    tableTop,
      bottomY: tableBottom,
    });

    if (opts.historico) {
      _desenharRodapeHistorico(slide, SW, SH, opts.kpis.total,
        footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
    } else {
      _desenharRodapeContratacoes(slide, SW, SH, opts.kpis.total, opts.kpis.emEdital, opts.kpis.emAtraso,
        footerY, footerH, dataAtualizacao, pageIdx + 1, pages.length);
    }
  });

  return pages.length;
}

// Faixa fina de legenda de seção (para distinguir o histórico do banner fixo)
function _desenharCaptionSecao(slide, SW, SH, y, h, texto) {
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
// ► LEITURA DE DADOS
// ─────────────────────────────────────────
function _lerContratacoes() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_CONTRAT);
  if (!sheet) throw new Error('Aba "' + SHEET_NAME_CONTRAT + '" não encontrada.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0) throw new Error('A aba "' + SHEET_NAME_CONTRAT + '" está vazia.');

  const allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // Cabeçalho real: linha que contém "IMÓVEL" (a linha de cima só tem o
  // rótulo mesclado "Quantidades" sobre as últimas 3 colunas).
  var headerRowIdx = -1;
  for (var i = 0; i < allValues.length; i++) {
    if (allValues[i].some(function(c) { return String(c).toUpperCase().indexOf('IMÓVEL') !== -1 || String(c).toUpperCase().indexOf('IMOVEL') !== -1; })) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) throw new Error('Cabeçalho (coluna "Imóvel") não encontrado.');

  // O cabeçalho ocupa 2 linhas (Imóvel..Prazo em cima; Participantes/Visitas/
  // Propostas embaixo, sob "Quantidades"). Mapeamos as colunas POR NOME —
  // assim, inserir/mover colunas na planilha (ex.: uma "Início") não quebra.
  var headerRows = [allValues[headerRowIdx], allValues[headerRowIdx + 1] || []];
  function _idxDe(aliases) {
    for (var h = 0; h < headerRows.length; h++) {
      var hr = headerRows[h];
      for (var j = 0; j < hr.length; j++) {
        var u = String(hr[j]).toUpperCase().trim();
        for (var a = 0; a < aliases.length; a++) {
          if (u === aliases[a] || u.indexOf(aliases[a]) !== -1) return j;
        }
      }
    }
    return -1;
  }
  var col = {
    imovel: _idxDe(['IMÓVEL', 'IMOVEL']),
    etapa:  _idxDe(['ETAPA']),
    objeto: _idxDe(['OBJETO']),
    area:   _idxDe(['ÁREA', 'AREA']),
    resp:   _idxDe(['RESPONSÁVEL', 'RESPONSAVEL']),
    prazo:  _idxDe(['PRAZO', 'SLA']),
    inicio: _idxDe(['DATA DE INÍCIO', 'DATA DE INICIO', 'DATA INÍCIO', 'DATA INICIO', 'INÍCIO', 'INICIO']),
    part:   _idxDe(['PARTICIPANTES']),
    vis:    _idxDe(['VISITAS']),
    prop:   _idxDe(['PROPOSTAS']),
  };
  function _cel(row, idx) { return idx >= 0 ? _fmt(row[idx]) : ''; }

  // Duas seções: ABERTAS (antes do marcador "Histórico") e HISTÓRICO
  // (abaixo dele, Etapa "Contratado"). Coletamos as duas.
  const rows = [];       // abertas
  const historico = [];  // fechadas / contratadas
  var emHistorico = false;
  for (var i = headerRowIdx + 1; i < allValues.length; i++) {
    const row = allValues[i];
    if (row.every(function(c) { return String(c).trim() === ''; })) continue;
    var imovel = _cel(row, col.imovel);
    // Marcador "Histórico": daqui pra baixo são contratações já fechadas.
    if (/^hist[oó]rico/i.test(imovel)) { emHistorico = true; continue; }
    if (imovel === '') continue; // pula sub-linha de cabeçalho e linhas vazias

    // Ordem canônica interna (independe do layout da planilha):
    // 0=Imóvel 1=Etapa 2=Objeto 3=Área 4=Responsável 5=Prazo/SLA
    // 6=Participantes 7=Visitas 8=Propostas 9=Início
    var reg = [
      imovel, _cel(row, col.etapa), _cel(row, col.objeto), _cel(row, col.area),
      _cel(row, col.resp), _cel(row, col.prazo), _cel(row, col.part),
      _cel(row, col.vis), _cel(row, col.prop), _cel(row, col.inicio),
    ];
    (emHistorico ? historico : rows).push(reg);
  }

  var total = rows.length;
  var temInicio = col.inicio >= 0;
  // KPIs do rodapé: em edital e em atraso (SLA/Prazo já vencido)
  var emEdital = 0, emAtraso = 0;
  rows.forEach(function(r) {
    if (/edital/i.test(_v(r, 1))) emEdital++;
    if (_estaAtrasado(_v(r, 5))) emAtraso++;
  });

  return {
    rows: rows, total: total, emEdital: emEdital, emAtraso: emAtraso,
    temInicio: temInicio, historico: historico, totalHist: historico.length,
  };
}

// true se a data-limite (SLA/Prazo, dd/MM/yyyy) já passou de hoje
function _estaAtrasado(prazoStr) {
  var d = _parseData(prazoStr);
  if (!d) return false;
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return d < hoje;
}

// Converte "dd/MM/yyyy" em Date (ou null)
function _parseData(s) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(String(s).trim())) return null;
  var p = String(s).trim().split('/');
  return new Date(+p[2], +p[1] - 1, +p[0]);
}

// Situação de prazo vs hoje a partir do SLA/Prazo: "Xd atraso" ou "faltam Xd"
function _situacaoPrazo(prazoStr) {
  var d = _parseData(prazoStr);
  if (!d) return { txt: '—', atraso: false };
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var dias = Math.round((d - hoje) / 86400000);
  if (dias < 0)  return { txt: Math.abs(dias) + 'd atraso', atraso: true };
  if (dias === 0) return { txt: 'vence hoje', atraso: false };
  return { txt: 'faltam ' + dias + 'd', atraso: false };
}

// ─────────────────────────────────────────
// ► TABELA (cabeçalho de 2 níveis: 6 colunas simples + "Quantidades" agrupando 3)
//   Linha: 0=Imóvel 1=Etapa 2=Objeto 3=Área 4=Responsável 5=Prazo
//          6=Participantes 7=Visitas 8=Propostas
// ─────────────────────────────────────────
function _desenharTabelaContratacoes(slide, SW, SH, rows, opts) {
  opts = opts || {};
  var maxRows = opts.maxRows || MAX_ROWS_CONTRAT;
  var historico = !!opts.historico;
  var M = SW * 0.020;

  var tableTop = (opts.topY !== undefined) ? opts.topY
               : ((BANNER_EXISTENTE ? SH * ALTURA_BANNER : SH * 0.135) + SH * 0.015);
  var tableBottom = (opts.bottomY !== undefined) ? opts.bottomY : (SH - SH * 0.030);
  var tableH = tableBottom - tableTop;
  var tableW = SW - M * 2;

  //               Imóvel Etapa  Objeto Área   Resp.  SLA    Situação Partic Visit  Propos
  var colRatios = [0.110, 0.115, 0.205, 0.085, 0.085, 0.085, 0.105, 0.080, 0.060, 0.070];
  var colWidths = colRatios.map(function(r) { return r * tableW; });
  // No histórico, as colunas de prazo viram "Contratado em" (data) + "Status".
  var colNames  = historico
    ? ['Imóvel', 'Etapa', 'Objeto', 'Área', 'Responsável', 'Contratado', 'Status', 'Participantes', 'Visitas', 'Propostas']
    : ['Imóvel', 'Etapa', 'Objeto', 'Área', 'Responsável', 'SLA', 'Situação', 'Participantes', 'Visitas', 'Propostas'];

  // Altura calculada por um nº fixo de linhas (linhasAltura) para que todas as
  // páginas tenham a MESMA altura de linha — troca de slide sem "pulo".
  var nRows = opts.linhasAltura || Math.min(rows.length, maxRows);
  var hdr2H = tableH / (nRows + 2.5);   // altura das linhas de cabeçalho com grupo (2 níveis)
  var hdrGrpH = hdr2H * 0.55;           // faixa "QUANTIDADES"
  var hdrSubH = hdr2H * 0.95;           // faixa com os nomes das colunas
  var hdrTotalH = hdrGrpH + hdrSubH;
  var rowH = (tableH - hdrTotalH) / nRows;

  // ── Cabeçalho ──
  var qtdStartIdx = 7; // índice da 1ª coluna do grupo "Quantidades" (Part./Vis./Prop.)
  var qtdX = M;
  for (var k = 0; k < qtdStartIdx; k++) qtdX += colWidths[k];
  var qtdW = colWidths[7] + colWidths[8] + colWidths[9];

  // Faixa do grupo "QUANTIDADES" — mesma cor dos demais cabeçalhos (brandMed)
  var grpBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, qtdX, tableTop, qtdW, hdrGrpH);
  grpBg.getFill().setSolidFill(C.brandMed);
  grpBg.getBorder().setTransparent();
  var grpTb = slide.insertTextBox('QUANTIDADES', qtdX, tableTop, qtdW, hdrGrpH);
  var tsGrp = grpTb.getText().getTextStyle();
  tsGrp.setFontFamily(TY.titles); tsGrp.setFontSize(FONTE_C.grupo);
  tsGrp.setBold(true); tsGrp.setForegroundColor('#FFFFFF');
  grpTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  grpTb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(grpTb);

  // Nomes das colunas
  var xPos = M;
  colNames.forEach(function(name, ci) {
    var cw = colWidths[ci];
    var isQtd = ci >= qtdStartIdx;
    var yHdr  = isQtd ? (tableTop + hdrGrpH) : tableTop;
    var hHdr  = isQtd ? hdrSubH : hdrTotalH;

    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yHdr, cw, hHdr);
    bg.getFill().setSolidFill(C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra" também no cabeçalho: sem ela, o recuo interno faz
    // "Prop." quebrar em "Prop" / "." nas colunas estreitas de Quantidades.
    var fHdr = 10;
    var tb = slide.insertTextBox(name, xPos + 3 - fHdr, yHdr, cw - 6 + fHdr * 2, hHdr);
    var ts = tb.getText().getTextStyle();
    ts.setFontFamily(TY.titles); ts.setFontSize(FONTE_C.colHeader);
    ts.setBold(true); ts.setForegroundColor('#FFFFFF');
    tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _noFill(tb);
    xPos += cw;
  });

  // ── Linhas ──
  // Canônico de row: 0=Imóvel 1=Etapa 2=Objeto 3=Área 4=Responsável 5=Prazo/SLA
  //                  6=Part 7=Vis 8=Prop 9=Início
  rows.forEach(function(row, ri) {
    var yPos = tableTop + hdrTotalH + ri * rowH;
    var etapa   = _v(row, 1);
    var slaStr  = _v(row, 5);
    // Histórico: sem "atraso" (já fechou); Situação vira "✓ Concluído".
    var sit     = historico ? { txt: '✓ Concluído', atraso: false } : _situacaoPrazo(slaStr);
    var atraso  = sit.atraso;
    // Histórico → linha toda verde uniforme (o "verde antigo" das concluídas);
    // atrasada → fundo avermelhado; senão zebra normal.
    var rowBg   = historico ? 'DCFCE7'
                : (atraso ? 'FEE2E2' : ((ri % 2 === 0) ? CORES.rowAlt1 : CORES.rowAlt2));

    // Ordem visível: Imóvel, Etapa, Objeto, Área, Resp, SLA, Situação, Part, Vis, Prop
    var vals = [_v(row,0), etapa, _v(row,2), _v(row,3), _v(row,4),
                slaStr, sit.txt, _v(row,6), _v(row,7), _v(row,8)];

    xPos = M;
    vals.forEach(function(cellVal, ci) {
      var cw = colWidths[ci];

      var cellBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xPos, yPos, cw, rowH);
      cellBg.getFill().setSolidFill('#' + rowBg);
      cellBg.getBorder().setWeight(0.75);
      cellBg.getBorder().getLineFill().setSolidFill(C.lines);

      var display = (cellVal === '-') ? '' : cellVal;
      if (display === '') { xPos += cw; return; }

      // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra): a TEXT_BOX
      // tem recuo interno (~7pt) que a API não desliga — em colunas estreitas
      // e centralizadas isso quebra texto curto ("EDITAL ABERTO" etc.) em 2
      // linhas mesmo sobrando espaço. Alarga só a TEXT_BOX (invisível),
      // simétrica; o fundo da célula (cellBg, desenhado acima) não muda.
      var folgaCentro = 10;

      if (ci === 1) {
        // ETAPA → texto colorido pelo estágio do pipeline (economiza largura)
        var tbE = slide.insertTextBox(display, xPos + 3 - folgaCentro, yPos + 4, cw - 6 + folgaCentro * 2, rowH - 8);
        var tsE = tbE.getText().getTextStyle();
        tsE.setFontFamily(TY.titles); tsE.setFontSize(FONTE_C.item); tsE.setBold(true);
        tsE.setForegroundColor('#' + _etapaCor(display));
        tbE.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        tbE.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        _noFill(tbE);
      } else {
        // SLA (ci 5) e Situação (ci 6) de linha atrasada → vermelho/negrito
        var vermelho = atraso && (ci === 5 || ci === 6);
        // Histórico: TODAS as colunas em verde uniforme (inclui Quantidades),
        // p/ nada destoar da linha verde das concluídas.
        var verde    = historico;
        var centrado = (ci !== 2);
        var fs    = (ci === 2) ? FONTE_C.descricao : FONTE_C.item;
        // Descrição justificada (alinha as duas margens); as demais colunas, centralizadas.
        var align = (ci === 2) ? SlidesApp.ParagraphAlignment.JUSTIFIED : SlidesApp.ParagraphAlignment.CENTER;
        var padX  = (ci === 2) ? 6 : 3;
        var padY  = 4;
        var folga = centrado ? folgaCentro : 0;
        var tb = slide.insertTextBox(display, xPos + padX - folga, yPos + padY, cw - padX * 2 + folga * 2, rowH - padY * 2);
        var ts = tb.getText().getTextStyle();
        ts.setFontFamily(ci === 0 ? TY.titles : TY.body);
        ts.setFontSize(fs); ts.setBold(ci === 0 || vermelho || (historico && ci === 6));
        ts.setForegroundColor(vermelho ? C.accentRed : (verde ? C.accentGreen : C.textMain));
        var ps = tb.getText().getParagraphStyle();
        ps.setParagraphAlignment(align);
        if (ci === 2) ps.setLineSpacing(120);
        tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        _noFill(tb);
      }
      xPos += cw;
    });
  });
}

// Cor do badge de Etapa conforme o estágio (do escopo inicial ao fechamento).
function _etapaCor(etapa) {
  var e = String(etapa).toLowerCase();
  if (e.indexOf('escopo') !== -1)     return '8A94A6';            // cinza — início
  if (e.indexOf('negocia') !== -1)    return C.accentOrange.slice(1); // laranja
  if (e.indexOf('edital') !== -1)     return C.brandLight.slice(1);   // azul — em edital
  if (e.indexOf('contrata') !== -1)   return C.accentGreen.slice(1);  // verde — fechando
  return C.brandMed.slice(1);
}

// Rodapé — data de atualização (esquerda) + KPIs TOTAL/EM EDITAL/EM ATRASO
function _desenharRodapeContratacoes(slide, SW, SH, total, emEdital, emAtraso, y, h, dataAtualizacao, pageNum, totalPages) {
  const M = SW * 0.020;

  var infoTxt = 'Atualizado em ' + dataAtualizacao;
  if (totalPages > 1) infoTxt += '   ·   Pág. ' + pageNum + '/' + totalPages;
  var infoBox = slide.insertTextBox(infoTxt, M, y, SW * 0.34, h);
  var tsi = infoBox.getText().getTextStyle();
  tsi.setFontFamily(TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(C.textBody);
  infoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  infoBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(infoBox);

  var cardW  = SW * 0.150;
  var gap    = SW * 0.010;
  var groupW = cardW * 3 + gap * 2;
  var x1     = SW - M - groupW;
  var x2     = x1 + cardW + gap;
  var x3     = x2 + cardW + gap;

  _kpiCardC(slide, x1, y, cardW, h, 'TOTAL',     String(total),    C.brandDark.slice(1));
  _kpiCardC(slide, x2, y, cardW, h, 'EM EDITAL', String(emEdital), C.brandLight.slice(1));
  _kpiCardC(slide, x3, y, cardW, h, 'EM ATRASO', String(emAtraso), C.accentRed.slice(1));
}

// Rodapé do HISTÓRICO — data (esquerda) + KPI de total contratado (direita)
function _desenharRodapeHistorico(slide, SW, SH, total, y, h, dataAtualizacao, pageNum, totalPages) {
  const M = SW * 0.020;

  var infoTxt = 'Atualizado em ' + dataAtualizacao;
  if (totalPages > 1) infoTxt += '   ·   Pág. ' + pageNum + '/' + totalPages;
  var infoBox = slide.insertTextBox(infoTxt, M, y, SW * 0.50, h);
  var tsi = infoBox.getText().getTextStyle();
  tsi.setFontFamily(TY.body); tsi.setFontSize(Math.round(SW * 0.013));
  tsi.setForegroundColor(C.textBody);
  infoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  infoBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(infoBox);

  var cardW = SW * 0.190;
  var x1    = SW - M - cardW;
  _kpiCardC(slide, x1, y, cardW, h, 'CONTRATADAS', String(total), C.accentGreen.slice(1));
}

// Cartão KPI: número à esquerda, label à direita
function _kpiCardC(slide, x, y, w, h, label, valor, bgHex) {
  var card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill('#' + bgHex);
  card.getBorder().setTransparent();

  // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra) — ver nota em _pill
  var numBox = slide.insertTextBox(valor, x + w * 0.02 - 8, y, w * 0.32 + 16, h);
  var tsN = numBox.getText().getTextStyle();
  tsN.setFontFamily(TY.titles); tsN.setFontSize(Math.max(14, Math.round(h * 0.46)));
  tsN.setBold(true); tsN.setForegroundColor('#FFFFFF');
  numBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  numBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(numBox);

  var labBox = slide.insertTextBox(label, x + w * 0.34, y, w * 0.64, h);
  var tsL = labBox.getText().getTextStyle();
  tsL.setFontFamily(TY.titles); tsL.setFontSize(Math.max(7, Math.round(h * 0.16)));
  tsL.setBold(true); tsL.setForegroundColor('#FFFFFF');
  labBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  labBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _noFill(labBox);
}

// ─────────────────────────────────────────
// ► BANNER PRÓPRIO (só quando BANNER_EXISTENTE = false)
// ─────────────────────────────────────────
function _desenharBannerC(slide, SW, SH) {
  const M = SW * 0.020;
  var Hh = SH * 0.135;
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, SW, Hh);
  bg.getFill().setSolidFill(C.brandDark);
  bg.getBorder().setTransparent();

  var titleBox = slide.insertTextBox(TITULO_SLIDE, M, Hh * 0.10, SW * 0.65, Hh * 0.50);
  var ts1 = titleBox.getText().getTextStyle();
  ts1.setFontFamily(TY.titles); ts1.setFontSize(Math.round(SW * 0.028));
  ts1.setBold(true); ts1.setForegroundColor('#FFFFFF');
  titleBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(titleBox);

  var subBox = slide.insertTextBox(SUBTITULO_SLIDE, M, Hh * 0.60, SW * 0.65, Hh * 0.36);
  var ts2 = subBox.getText().getTextStyle();
  ts2.setFontFamily(TY.titles); ts2.setFontSize(Math.round(SW * 0.015));
  ts2.setForegroundColor(C.brandSoft);
  subBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  _noFill(subBox);
}

// ─────────────────────────────────────────
// ► HELPERS
// Os utilitários _paginar, _removerSlidesPorTag, _alert, _v, _fmt, _isData e
// _noFill já são definidos em gerador-recebimento-obras.gs (mesmo projeto) e
// reutilizados aqui — não os redeclare.
// ─────────────────────────────────────────
