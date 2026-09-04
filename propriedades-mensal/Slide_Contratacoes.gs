/**
 * ARQUIVO: Slide_Contratacoes.gs
 * SEÇÃO:   SLIDE — Gestão de Contratações (Propriedades)
 *
 * Tabela mais densa que a de Recebimento: 10 colunas, com cabeçalho de dois
 * níveis (as três últimas ficam sob uma faixa "QUANTIDADES"), então tem
 * desenho próprio em vez de usar _tabDesenharTabela_.
 *
 * ABERTAS x HISTÓRICO
 * A aba tem uma linha-marcador "Histórico" no meio: acima dela, contratações
 * em andamento; abaixo, as já fechadas. Viram dois blocos de slides, com
 * rodapés diferentes — em aberto interessa TOTAL/EM EDITAL/EM ATRASO, no
 * histórico interessa quantas foram contratadas.
 */






// ==========================================
// PONTO DE ENTRADA (pipeline de 00_Main.gs)
// ==========================================
function gerarSlideContratacoes() {
  const dados = _contLer_();
  if (!dados.rows.length && !dados.historico.length) {
    throw new Error('Nenhuma linha encontrada na aba "' + ABA_CONTRATACOES + '".');
  }

  const deck = getDeckMensal_();
  _tabRemoverPorTag_(deck, TAG_CONTRATACOES);
  _tabRemoverPorTag_(deck, TAG_CONTRATACOES_HIST);

  const SW = deck.getPageWidth();
  const SH = deck.getPageHeight();
  // Deck mensal: o rodapé diz o mês de referência, não o dia da geração.
  // Ver _tabRotuloReferencia_ em 03_Tabelas.gs.
  const referencia = _tabRotuloReferencia_();

  let n = _contSecao_(deck, SW, SH, referencia, dados.rows, {
    tag: TAG_CONTRATACOES, historico: false,
    kpis: { total: dados.rows.length, emEdital: dados.emEdital, emAtraso: dados.emAtraso }
  });

  if (dados.historico.length) {
    n += _contSecao_(deck, SW, SH, referencia, dados.historico, {
      tag: TAG_CONTRATACOES_HIST, historico: true,
      legenda: 'HISTÓRICO · CONTRATAÇÕES FECHADAS',
      kpis: { total: dados.historico.length }
    });
  }

  Logger.log('  Gestão de Contratações: ' + n + ' slide(s).');
  return n;
}


// ==========================================
// LEITURA
// ==========================================
function _contLer_() {
  const ss    = SpreadsheetApp.openById(PROPRIEDADES_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(ABA_CONTRATACOES);
  if (!sheet) throw new Error('Aba "' + ABA_CONTRATACOES + '" não encontrada.');

  const lastRow = sheet.getLastRow();
  if (lastRow === 0) throw new Error('A aba "' + ABA_CONTRATACOES + '" está vazia.');
  const valores = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();

  // Cabeçalho real = a linha que tem "IMÓVEL". A linha de cima só carrega o
  // rótulo mesclado "Quantidades" sobre as três últimas colunas.
  let hdrIdx = -1;
  for (let i = 0; i < valores.length; i++) {
    const bate = valores[i].some(c => {
      const u = String(c).toUpperCase();
      return u.indexOf('IMÓVEL') !== -1 || u.indexOf('IMOVEL') !== -1;
    });
    if (bate) { hdrIdx = i; break; }
  }
  if (hdrIdx === -1) throw new Error('Cabeçalho (coluna "Imóvel") não encontrado.');

  // Colunas mapeadas POR NOME, varrendo as duas linhas de cabeçalho: inserir
  // ou mover uma coluna na planilha não quebra a leitura.
  const hdrRows = [valores[hdrIdx], valores[hdrIdx + 1] || []];
  const idxDe = aliases => {
    for (let h = 0; h < hdrRows.length; h++) {
      for (let j = 0; j < hdrRows[h].length; j++) {
        const u = String(hdrRows[h][j]).toUpperCase().trim();
        for (let a = 0; a < aliases.length; a++) {
          if (u === aliases[a] || u.indexOf(aliases[a]) !== -1) return j;
        }
      }
    }
    return -1;
  };
  const col = {
    imovel: idxDe(['IMÓVEL', 'IMOVEL']),
    etapa:  idxDe(['ETAPA']),
    objeto: idxDe(['OBJETO']),
    area:   idxDe(['ÁREA', 'AREA']),
    resp:   idxDe(['RESPONSÁVEL', 'RESPONSAVEL']),
    prazo:  idxDe(['PRAZO', 'SLA']),
    inicio: idxDe(['DATA DE INÍCIO', 'DATA DE INICIO', 'DATA INÍCIO', 'DATA INICIO', 'INÍCIO', 'INICIO']),
    part:   idxDe(['PARTICIPANTES']),
    vis:    idxDe(['VISITAS']),
    prop:   idxDe(['PROPOSTAS'])
  };
  const cel = (linha, idx) => idx >= 0 ? _tabFmt_(linha[idx]) : '';

  const rows = [], historico = [];
  let emHistorico = false;
  for (let i = hdrIdx + 1; i < valores.length; i++) {
    const linha = valores[i];
    if (linha.every(c => String(c).trim() === '')) continue;

    const imovel = cel(linha, col.imovel);
    if (/^hist[oó]rico/i.test(imovel)) { emHistorico = true; continue; }
    if (imovel === '') continue;   // sub-linha de cabeçalho ou linha solta

    (emHistorico ? historico : rows).push([
      imovel, cel(linha, col.etapa), cel(linha, col.objeto), cel(linha, col.area),
      cel(linha, col.resp), cel(linha, col.prazo), cel(linha, col.part),
      cel(linha, col.vis), cel(linha, col.prop), cel(linha, col.inicio)
    ]);
  }

  let emEdital = 0, emAtraso = 0;
  rows.forEach(r => {
    if (/edital/i.test(_tabV_(r, 1))) emEdital++;
    const d = _tabData_(_tabV_(r, 5));
    if (d && d < _tabHoje_()) emAtraso++;
  });

  return { rows: rows, historico: historico, emEdital: emEdital, emAtraso: emAtraso };
}

// Situação do prazo em relação a hoje: "Xd atraso" ou "faltam Xd".
function _contSituacao_(prazoStr) {
  const d = _tabData_(prazoStr);
  if (!d) return { txt: '—', atraso: false };
  const dias = Math.round((d - _tabHoje_()) / 86400000);
  if (dias < 0)  return { txt: Math.abs(dias) + 'd atraso', atraso: true };
  if (dias === 0) return { txt: 'vence hoje', atraso: false };
  return { txt: 'faltam ' + dias + 'd', atraso: false };
}


// ==========================================
// GERAÇÃO
// ==========================================
function _contSecao_(deck, SW, SH, referencia, linhas, opts) {
  if (!linhas || !linhas.length) return 0;

  // Paginação balanceada: 25 linhas viram 13+12, não 12+12+1. Uma página final
  // com uma linha só fica visivelmente torta ao lado das cheias.
  const nPaginas = Math.max(1, Math.ceil(linhas.length / CONTRAT_MAX_LINHAS));
  const porPagina = Math.ceil(linhas.length / nPaginas);
  const pgs = _tabPaginar_(linhas, porPagina);

  pgs.forEach((pagina, idx) => {
    const slide = deck.appendSlide();
    slide.getBackground().setSolidFill(TAB_C.bgSlide);
    _tabMarcarSlide_(slide, opts.tag);

    // criarHeaderPadrao (01_Config.gs), não _tabDesenharBanner_ — ver a nota
    // em Slide_RecebimentoObras.gs: os dois desenhavam cabeçalhos diferentes
    // no mesmo deck. topo fixo em 74, mesma linha do resto do deck.
    criarHeaderPadrao(slide, 'GESTÃO DE CONTRATAÇÕES', 'EQUIPE DE PROPRIEDADES');

    const rodapeH = SH * 0.060;
    const rodapeY = SH - SH * 0.025 - rodapeH;
    let topo      = 74;

    if (opts.legenda) {
      const h = SH * 0.045;
      _tabDesenharLegenda_(slide, SW, topo, h, opts.legenda);
      topo += h + SH * 0.008;
    }

    // porPagina (e não pagina.length) para todas as páginas terem a MESMA
    // altura de linha — sem isso a última página "pula" ao virar o slide.
    _contDesenharTabela_(slide, SW, pagina, topo, rodapeY - SH * 0.020, porPagina, opts.historico);

    if (opts.historico) {
      _contRodapeHistorico_(slide, SW, opts.kpis.total, rodapeY, rodapeH, referencia, idx + 1, pgs.length);
    } else {
      _contRodape_(slide, SW, opts.kpis, rodapeY, rodapeH, referencia, idx + 1, pgs.length);
    }
  });

  return pgs.length;
}

function _contDesenharTabela_(slide, SW, linhas, topo, base, nLinhas, historico) {
  const M      = SW * 0.020;
  const alturaT = base - topo;
  const largT   = SW - M * 2;
  const largCols = CONTRAT_LARGURAS.map(r => r * largT);

  // No histórico as colunas de prazo mudam de sentido: não há mais SLA a
  // vencer, há a data em que foi contratado.
  const nomes = historico
    ? ['Imóvel', 'Etapa', 'Objeto', 'Área', 'Responsável', 'Contratado', 'Status', 'Participantes', 'Visitas', 'Propostas']
    : ['Imóvel', 'Etapa', 'Objeto', 'Área', 'Responsável', 'SLA', 'Situação', 'Participantes', 'Visitas', 'Propostas'];

  const hdr2H     = alturaT / (nLinhas + 2.5);
  const hdrGrpH   = hdr2H * 0.55;
  const hdrSubH   = hdr2H * 0.95;
  const hdrTotalH = hdrGrpH + hdrSubH;
  const rowH      = (alturaT - hdrTotalH) / nLinhas;

  // ── Faixa "QUANTIDADES" sobre as três últimas colunas ──
  const qtdIni = 7;
  let qtdX = M;
  for (let k = 0; k < qtdIni; k++) qtdX += largCols[k];
  const qtdW = largCols[7] + largCols[8] + largCols[9];

  const grpBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, qtdX, topo, qtdW, hdrGrpH);
  grpBg.getFill().setSolidFill(TAB_C.brandMed);
  grpBg.getBorder().setTransparent();
  const grpTb = slide.insertTextBox('QUANTIDADES', qtdX, topo, qtdW, hdrGrpH);
  const tsG = grpTb.getText().getTextStyle();
  tsG.setFontFamily(TAB_TY.titles); tsG.setFontSize(CONTRAT_FONTE.grupo);
  tsG.setBold(true); tsG.setForegroundColor('#FFFFFF');
  grpTb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  grpTb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(grpTb);

  // ── Nomes das colunas ──
  let x = M;
  nomes.forEach((nome, ci) => {
    const cw   = largCols[ci];
    const ehQtd = ci >= qtdIni;
    const y    = ehQtd ? (topo + hdrGrpH) : topo;
    const h    = ehQtd ? hdrSubH : hdrTotalH;

    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, cw, h);
    bg.getFill().setSolidFill(TAB_C.brandMed);
    bg.getBorder().setTransparent();

    // Folga "sem quebra" (skill slides-caixa-texto-sem-quebra): sem ela o
    // recuo interno da TEXT_BOX quebra "Propostas" nas colunas estreitas.
    const folga = 10;
    const tb = slide.insertTextBox(nome, x + 3 - folga, y, cw - 6 + folga * 2, h);
    const ts = tb.getText().getTextStyle();
    ts.setFontFamily(TAB_TY.titles); ts.setFontSize(CONTRAT_FONTE.colHeader);
    ts.setBold(true); ts.setForegroundColor('#FFFFFF');
    tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    _tabNoFill_(tb);
    x += cw;
  });

  // ── Linhas ──
  linhas.forEach((linha, ri) => {
    const y     = topo + hdrTotalH + ri * rowH;
    const etapa = _tabV_(linha, 1);
    const sla   = _tabV_(linha, 5);
    const sit   = historico ? { txt: '✓ Concluído', atraso: false } : _contSituacao_(sla);

    const fundo = historico ? 'DCFCE7'
                : (sit.atraso ? 'FEE2E2' : ((ri % 2 === 0) ? TAB_CORES.rowAlt1 : TAB_CORES.rowAlt2));

    const vals = [_tabV_(linha, 0), etapa, _tabV_(linha, 2), _tabV_(linha, 3), _tabV_(linha, 4),
                  sla, sit.txt, _tabV_(linha, 6), _tabV_(linha, 7), _tabV_(linha, 8)];

    x = M;
    vals.forEach((val, ci) => {
      const cw = largCols[ci];

      const cel = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, cw, rowH);
      cel.getFill().setSolidFill('#' + fundo);
      cel.getBorder().setWeight(0.75);
      cel.getBorder().getLineFill().setSolidFill(TAB_C.lines);

      const txt = (val === '-') ? '' : val;
      if (txt === '') { x += cw; return; }

      // Folga "sem quebra" — ver a nota no cabeçalho acima.
      const folgaC = 10;

      if (ci === 1) {
        // Etapa como texto colorido, não badge: o pill roubaria largura de uma
        // coluna que já é estreita, e a cor sozinha já comunica o estágio.
        const tb = slide.insertTextBox(txt, x + 3 - folgaC, y + 4, cw - 6 + folgaC * 2, rowH - 8);
        const ts = tb.getText().getTextStyle();
        ts.setFontFamily(TAB_TY.titles); ts.setFontSize(CONTRAT_FONTE.item); ts.setBold(true);
        ts.setForegroundColor('#' + _contEtapaCor_(txt));
        tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
        tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        _tabNoFill_(tb);
      } else {
        const vermelho = sit.atraso && (ci === 5 || ci === 6);
        const centrado = (ci !== 2);
        const fs    = (ci === 2) ? CONTRAT_FONTE.descricao : CONTRAT_FONTE.item;
        const align = (ci === 2) ? SlidesApp.ParagraphAlignment.JUSTIFIED
                                 : SlidesApp.ParagraphAlignment.CENTER;
        const padX  = (ci === 2) ? 6 : 3;
        const folga = centrado ? folgaC : 0;

        const tb = slide.insertTextBox(txt, x + padX - folga, y + 4, cw - padX * 2 + folga * 2, rowH - 8);
        const ts = tb.getText().getTextStyle();
        ts.setFontFamily(ci === 0 ? TAB_TY.titles : TAB_TY.body);
        ts.setFontSize(fs);
        ts.setBold(ci === 0 || vermelho || (historico && ci === 6));
        ts.setForegroundColor(vermelho ? TAB_C.accentRed
                            : (historico ? TAB_C.accentGreen : TAB_C.textMain));
        const ps = tb.getText().getParagraphStyle();
        ps.setParagraphAlignment(align);
        if (ci === 2) ps.setLineSpacing(120);
        tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        _tabNoFill_(tb);
      }
      x += cw;
    });
  });
}

// Cor da Etapa conforme o estágio, do escopo inicial ao fechamento.
function _contEtapaCor_(etapa) {
  const e = String(etapa).toLowerCase();
  if (e.indexOf('escopo') !== -1)   return '8A94A6';
  if (e.indexOf('negocia') !== -1)  return TAB_C.accentOrange.slice(1);
  if (e.indexOf('edital') !== -1)   return TAB_C.brandLight.slice(1);
  if (e.indexOf('contrata') !== -1) return TAB_C.accentGreen.slice(1);
  return TAB_C.brandMed.slice(1);
}

function _contRodape_(slide, SW, kpis, y, h, referencia, pagina, totalPaginas) {
  _contInfo_(slide, SW, y, h, referencia, pagina, totalPaginas, 0.34);

  const M = SW * 0.020;
  const cardW = SW * 0.150;
  const gap   = SW * 0.010;
  const x1 = SW - M - (cardW * 3 + gap * 2);

  _tabKpiCard_(slide, x1,                      y, cardW, h, 'TOTAL',     String(kpis.total),    TAB_C.brandDark.slice(1),   0.32);
  _tabKpiCard_(slide, x1 + cardW + gap,        y, cardW, h, 'EM EDITAL', String(kpis.emEdital), TAB_C.brandLight.slice(1),  0.32);
  _tabKpiCard_(slide, x1 + (cardW + gap) * 2,  y, cardW, h, 'EM ATRASO', String(kpis.emAtraso), TAB_C.accentRed.slice(1),   0.32);
}

function _contRodapeHistorico_(slide, SW, total, y, h, referencia, pagina, totalPaginas) {
  _contInfo_(slide, SW, y, h, referencia, pagina, totalPaginas, 0.50);

  const M = SW * 0.020;
  const cardW = SW * 0.190;
  _tabKpiCard_(slide, SW - M - cardW, y, cardW, h, 'CONTRATADAS', String(total),
               TAB_C.accentGreen.slice(1), 0.32);
}

function _contInfo_(slide, SW, y, h, referencia, pagina, totalPaginas, larg) {
  const M = SW * 0.020;
  let txt = referencia;
  if (totalPaginas > 1) txt += '   ·   Pág. ' + pagina + '/' + totalPaginas;

  const cx = slide.insertTextBox(txt, M, y, SW * larg, h);
  const ts = cx.getText().getTextStyle();
  ts.setFontFamily(TAB_TY.body); ts.setFontSize(Math.round(SW * 0.013));
  ts.setForegroundColor(TAB_C.textBody);
  cx.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  cx.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  _tabNoFill_(cx);
}
