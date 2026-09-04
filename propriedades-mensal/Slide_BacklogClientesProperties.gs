/**
 * ARQUIVO: Slide_BacklogClientesProperties.gs
 * SLIDE — BACKLOG DE CLIENTES (chamados de responsabilidade da equipe Property)
 *
 * Port de megas-mensal/Slide_BacklogClientesProperties.gs, com UMA diferença
 * de conteúdo: a coluna EMPREENDIMENTO.
 *
 * Lá o deck é por cidade — Curitiba, Itajaí, Esteio têm decks separados —, e
 * a leitura já filtra por Centro de Custos, então dizer o empreendimento em
 * cada linha seria repetir o título do arquivo. Aqui o deck é UM, do portfólio
 * inteiro: sem a coluna, "534d em aberto" não diz onde, e a lista deixa de
 * ser acionável.
 *
 * Fonte: aba BD-CORRETIVAS (base bruta, uma linha por chamado). Entram os
 * chamados que, no mês de referência, estavam ABERTOS (_histAbertoNoMes_),
 * têm cliente que não é o próprio condomínio, NÃO são responsabilidade do
 * locatário, e cuja equipe resolvida pelos Responsáveis é PROPERTY.
 *
 * Desenho e paginação: mesma mecânica dos Megas — grupo por cliente, logo na
 * primeira coluna, chamados em bullets, quebra em páginas quando não cabe.
 */

function gerarSlideBacklogClientesProperties() {
  const dados = obterDadosBacklogClientesProperties_();
  const deck  = getDeckMensal_();

  if (typeof _tabRemoverPorTag_ === 'function' && typeof TAG_BACKLOG_CLIENTES !== 'undefined') {
    _tabRemoverPorTag_(deck, TAG_BACKLOG_CLIENTES);
  }

  const DS    = CR_DESIGN_SYSTEM;
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const marginX = 30, topY = 76;
  const listaH = (H - 16) - topY;

  // Sem nenhum chamado de Property em aberto: um slide dizendo isso é melhor
  // que um slide ausente — quem abre o deck precisa saber que a pergunta foi
  // feita e a resposta foi zero, não que o slide falhou.
  if (!dados) {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DS.colors.bgSlide);

    if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_BACKLOG_CLIENTES !== 'undefined') {
      _tabMarcarSlide_(slide, TAG_BACKLOG_CLIENTES);
    }

    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — PROPERTIES',
      'Chamados de clientes pendentes de responsabilidade da equipe Property');
    const contentY = criarCardPainel(slide, marginX, topY, W - 2 * marginX, listaH,
      'PENDÊNCIAS EM ABERTO (0)', DS.colors.themeCorr);
    _prioridadeSemDado_(slide, marginX, contentY, W - 2 * marginX, listaH - 40,
      'Nenhum chamado de cliente em aberto no período.', DS.colors.accentGreen);
    Logger.log('Slide Backlog de Clientes — Properties: nenhum chamado em aberto.');
    return;
  }

  // Um grupo por cliente, na ordem em que a lista já vem ordenada.
  const porCliente = {};
  const ordemClientes = [];
  dados.lista.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const coresMapa = _backlogClientesCoresMapa_(dados);
  const paginas = _paginarGruposBacklog_(grupos, listaH);

  paginas.forEach((grupoDaPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DS.colors.bgSlide);

    if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_BACKLOG_CLIENTES !== 'undefined') {
      _tabMarcarSlide_(slide, TAG_BACKLOG_CLIENTES);
    }

    const subtitulo = 'Chamados de clientes pendentes de responsabilidade da equipe Property' +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — PROPERTIES', subtitulo);

    // POR QUE O try/catch: uma exceção aqui — tipicamente uma helper de outro
    // arquivo que não foi colada no editor (lição 6 do CLAUDE.md) — estoura
    // DEPOIS de criarCardPainel e ANTES da primeira célula. O resultado é um
    // card com o título e a contagem certos e nada dentro: um slide que parece
    // "sem dados" quando na verdade quebrou. Já aconteceu, e o erro só apareceu
    // ao abrir o deck. Escrever a falha NO slide troca um vazio silencioso por
    // um aviso que ninguém leva para a reunião sem ver.
    try {
      _backlogClientesTabela_(slide, marginX, topY, W - 2 * marginX, listaH,
        'PENDÊNCIAS EM ABERTO', dados.total, grupoDaPagina, DS.colors.themeCorr, coresMapa);
      _backlogClientesBadge_(slide, marginX, topY, W - 2 * marginX,
        'RESPONSABILIDADE PROPERTIES', DS.colors.themeCorr);
    } catch (e) {
      _backlogClientesFalha_(slide, marginX, topY, W - 2 * marginX, listaH, e);
      Logger.log('Backlog de Clientes — Properties: página ' + (i + 1) +
                 ' FALHOU ao desenhar: ' + e.message);
    }
  });

  Logger.log('Slide Backlog de Clientes — Properties: ' + dados.total +
             ' chamado(s) em ' + paginas.length + ' página(s), ' +
             ordemClientes.length + ' cliente(s).');
}


// ==========================================
// DADOS
// ==========================================

/**
 * Chamados de cliente em aberto no mês de referência, equipe PROPERTY, no
 * portfólio inteiro. Devolve { total, fatias, lista } ou null se não houver
 * nenhum.
 *
 * TRÊS FILTROS que não são detalhe:
 *   · sem cliente ou cliente = o próprio condomínio → não é chamado DE
 *     cliente, é da administração do imóvel;
 *   · responsabilidade do locatário → é dele, não da operação (esses são
 *     assunto de outro recorte);
 *   · equipe resolvida ≠ PROPERTY → este deck não mostra Facilities nem
 *     Terceiros.
 */
function obterDadosBacklogClientesProperties_() {
  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));   // exclusivo

  let semCliente = 0, doCondominio = 0, doLocatario = 0, outraEquipe = 0;

  const itens = _propLerCorretivas_().filter(it => {
    if (!_histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)) return false;
    if (!it.cliente)                        { semCliente++;   return false; }
    if (_ehCondominio_(it.cliente))         { doCondominio++; return false; }
    if (_chamadoResponsabilidadeLocatario_(it.responsaveis)) { doLocatario++; return false; }
    if (_propEquipeCorretiva_(it.responsaveis) !== 'PROPERTY') { outraEquipe++; return false; }
    return true;
  }).map(it => ({
    id:            it.id,
    cliente:       it.cliente,
    empreendimento: it.cc,
    descricao:     it.descricao,
    dataReporte:   _histFormatarDataCurta_(it.dtReporte),
    diasAberto:    _histDiasAberto_(it.dtReporte, refFim)
  }));

  // O que ficou de fora e por quê. Sem isto, um filtro errado só apareceria
  // como "a lista está curta demais" — e ninguém saberia qual dos quatro.
  Logger.log('Backlog de Clientes — Properties: ' + itens.length + ' em aberto. Fora: ' +
             semCliente + ' sem cliente, ' + doCondominio + ' do condomínio, ' +
             doLocatario + ' do locatário, ' + outraEquipe + ' de outra equipe.');

  return _agruparBacklogClientesPorCliente_(itens);
}

function _agruparBacklogClientesPorCliente_(itens) {
  if (!itens.length) return null;

  // As fatias servem só ao mapa de cores: os 5 clientes com mais chamados
  // ganham cor própria e o resto compartilha a cor de "Outros".
  const MAX_FATIAS = 5;
  const porCliente = {};
  itens.forEach(c => { porCliente[c.cliente] = (porCliente[c.cliente] || 0) + 1; });
  const ranked = Object.keys(porCliente)
    .map(cli => ({ label: cli, qtd: porCliente[cli] }))
    .sort((a, b) => b.qtd - a.qtd);

  let fatias = ranked;
  if (ranked.length > MAX_FATIAS) {
    const top = ranked.slice(0, MAX_FATIAS - 1);
    const restoQtd = ranked.slice(MAX_FATIAS - 1).reduce((s, f) => s + f.qtd, 0);
    fatias = top.concat([{ label: 'Outros', qtd: restoQtd }]);
  }

  // Ordena por cliente e, dentro dele, pelo mais ANTIGO primeiro: numa lista
  // de pendências o que interessa é o que está parado há mais tempo.
  const lista = itens.slice().sort((a, b) =>
    a.cliente.localeCompare(b.cliente, 'pt-BR') || (b.diasAberto || 0) - (a.diasAberto || 0));

  return { total: itens.length, fatias: fatias, lista: lista };
}


// ==========================================
// DESENHO DA TABELA
// ==========================================

/**
 * A tabela de pendências. Diferença para a dos Megas: a coluna
 * EMPREENDIMENTO, entre a descrição e a data.
 *
 * Ela é POR CHAMADO e não por grupo de propósito — um mesmo cliente pode ter
 * chamado em mais de um Mega, e colocá-la ao lado do logo daria a entender que
 * o grupo inteiro é de um lugar só.
 */
function _backlogClientesTabela_(slide, x, y, w, h, titulo, totalCount, grupos, corTema, coresMapa) {
  const DS = CR_DESIGN_SYSTEM;
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + totalCount + ')', corTema);
  const listY = contentY + 4, listH = y + h - listY - 8;

  if (!grupos.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', DS.colors.accentGreen);
    return;
  }

  const LINE_PCT = 130;   // mais espaçado que as listas em coluna
  const ROW_GAP  = 6;     // respiro entre um cliente e o próximo
  const HEADER_H = 16, HEADER_GAP = 6;
  const linhasY = listY + HEADER_H + HEADER_GAP;

  // Fonte FIXA em 7pt, como nos Megas: antes o tamanho mudava de página para
  // página conforme o volume, e páginas do mesmo relatório saíam com aparência
  // diferente. _paginarGruposBacklog_ já garante o encaixe com esta fonte.
  const fontSize = 7;
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  const MIN_ROW_H = 40, CAPTION_H = 12;
  const linhasPorChamado = _linhasPorChamadoQueCabem_(
    [grupos], listH - HEADER_H - HEADER_GAP, lineH, MIN_ROW_H, CAPTION_H, ROW_GAP);
  const alturaChamado = lineH * linhasPorChamado;

  const maxCliente = 26;
  const LOGO_COL_W = LOGO_LARG_PADRAO, LOGO_GAP = 16, LOGO_CELL_H = LOGO_ALT_PADRAO + 6;

  // EMP_W dimensionado pelo caso comum ("MEGA CURITIBA", 13 caracteres) com
  // folga; nome maior é truncado por _truncarNome_ em vez de quebrar linha e
  // desalinhar a tabela. DATA_W/DIAS_W vêm dos Megas, já com folga para
  // "dd/mm/aa" (8 chars) e para 4 dígitos de dias ("1050d").
  const EMP_W = 88, DATA_W = 68, DIAS_W = 52, COL_GAP = 8;

  const descX = x + 15 + LOGO_COL_W + LOGO_GAP;
  const descW = (w - 30) - LOGO_COL_W - LOGO_GAP - EMP_W - DATA_W - DIAS_W - (COL_GAP * 3);
  const empX  = descX + descW + COL_GAP;
  const dataX = empX + EMP_W + COL_GAP;
  const diasX = dataX + DATA_W + COL_GAP;

  const headerBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, listY, w - 30, HEADER_H);
  headerBg.getFill().setSolidFill(corTema, 0.10);
  headerBg.getBorder().setTransparent();
  _sTxt(slide, x + 15, listY, LOGO_COL_W, HEADER_H, 'CLIENTE',        7, true, corTema, 'center');
  _sTxt(slide, descX,   listY, descW,      HEADER_H, 'DESCRIÇÃO',     7, true, corTema, 'left');
  _sTxt(slide, empX,    listY, EMP_W,      HEADER_H, 'EMPREENDIMENTO', 6, true, corTema, 'center');
  _sTxt(slide, dataX,   listY, DATA_W,     HEADER_H, 'DATA ABERTURA',  6, true, corTema, 'center');
  _sTxt(slide, diasX,   listY, DIAS_W,     HEADER_H, 'TEMPO ABERTO',   6, true, corTema, 'center');
  _linhaTabela_(slide, x + 15, listY + HEADER_H, w - 30, corTema, 1);

  let cursorY = linhasY;
  grupos.forEach(grupo => {
    const cor = (coresMapa && coresMapa[grupo[0].cliente]) || corTema;
    const rowH = Math.max(grupo.length * alturaChamado, MIN_ROW_H + (grupo.length > 1 ? CAPTION_H : 0));

    // Casa pelo apelido de exibição, não pelo nome cru da planilha.
    const nomeDisplay = _clienteDisplay_(grupo[0].cliente);
    const logoBlob = _getClienteLogoBlob_(nomeDisplay);
    const logoY = cursorY + (rowH - LOGO_CELL_H - (grupo.length > 1 ? CAPTION_H : 0)) / 2;
    let logoOk = false;
    if (logoBlob) {
      try { logoOk = !!_insertLogoFitLegenda_(slide, logoBlob, nomeDisplay, x + 15, logoY, LOGO_COL_W, LOGO_CELL_H); }
      catch (e) { Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message); }
    }
    if (!logoOk) {
      _sTxt(slide, x + 15, logoY, LOGO_COL_W, LOGO_CELL_H,
            _truncarNome_(nomeDisplay, maxCliente), 8.5, true, cor, 'center');
    }
    if (grupo.length > 1) {
      _sTxt(slide, x + 15, logoY + LOGO_CELL_H + 1, LOGO_COL_W, CAPTION_H - 1,
            '(' + grupo.length + ' chamados)', 7, false, DS.colors.textMuted, 'center');
    }

    // Orçamento de caracteres da descrição: o que cabe numa linha vezes
    // quantas linhas este chamado pode ocupar nesta página. A altura já foi
    // reservada com o mesmo número, então a quebra é esperada e não desalinha
    // as colunas seguintes.
    const capacidadeLinha = _charsQueCabem_(descW, fontSize) * linhasPorChamado;

    let ticketY = cursorY + (rowH - grupo.length * alturaChamado) / 2;
    grupo.forEach(it => {
      const descBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, descX, ticketY, descW, alturaChamado);
      const tr = descBox.getText();
      tr.setText('');
      // ID em cinza neutro — nunca na cor do cliente, senão os dois ficam
      // indistinguíveis quando o cliente cai na cor do tema.
      const idPart = tr.appendText('• ' + it.id + ' - ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true)
        .setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
      const maxDesc = Math.max(4, capacidadeLinha - 3 - String(it.id).length - 3);
      const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc));
      descPart.getTextStyle().setFontSize(fontSize).setBold(false)
        .setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
      tr.getParagraphStyle().setLineSpacing(LINE_PCT);
      descBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      // Empreendimento, data e dias na MESMA altura da descrição — as quatro
      // são centralizadas verticalmente, então ficam alinhadas por construção
      // mesmo quando a descrição ocupa duas linhas.
      _sTxt(slide, empX, ticketY, EMP_W, alturaChamado,
            _truncarNome_(it.empreendimento || '—', _charsQueCabem_(EMP_W, fontSize - 0.5)),
            Math.max(6, fontSize - 0.5), false, DS.colors.textBody, 'center');
      _sTxt(slide, dataX, ticketY, DATA_W, alturaChamado, it.dataReporte || '—',
            Math.max(6, fontSize - 0.5), false, DS.colors.textMuted, 'center');
      const diasTxt = (it.diasAberto === null || it.diasAberto === undefined) ? '—' : it.diasAberto + 'd';
      _sTxt(slide, diasX, ticketY, DIAS_W, alturaChamado, diasTxt, fontSize, true, cor, 'center');

      ticketY += alturaChamado;
    });

    cursorY += rowH + ROW_GAP;
    _linhaTabela_(slide, x + 15, cursorY - ROW_GAP / 2, w - 30, _TABELA_LINHA_COR_, 0.75);
  });

  // Divisores verticais atravessando cabeçalho + linhas.
  const alturaTabela = cursorY - ROW_GAP - listY;
  [x + 15 + LOGO_COL_W + LOGO_GAP / 2, empX - COL_GAP / 2, dataX - COL_GAP / 2, diasX - COL_GAP / 2]
    .forEach(lx => {
      const divisor = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, alturaTabela);
      divisor.getFill().setSolidFill(_TABELA_LINHA_COR_);
      divisor.getBorder().setTransparent();
    });
}


// ==========================================
// PAGINAÇÃO E CORES
// ==========================================

/**
 * Quebra os grupos em páginas que cabem no card. Usa a fonte MÍNIMA (7pt) e
 * UMA linha por chamado — o piso que garante o encaixe. Se a página sobrar
 * altura, _linhasPorChamadoQueCabem_ dá duas linhas a cada chamado na hora de
 * desenhar, em vez de truncar a descrição no meio.
 */
function _paginarGruposBacklog_(grupos, listaH) {
  if (!grupos.length) return [[]];

  const FLOOR_FONT = 7, LINE_PCT = 130;
  const MIN_ROW_H = 40, CAPTION_H = 12, ROW_GAP = 6;
  const HEADER_H = 16, HEADER_GAP = 6;
  // Mesmas constantes de _backlogClientesTabela_: criarCardPainel devolve
  // y+32 (título do card), listY = contentY+4, listH = h-listY-8.
  const CARD_HEADER = 32, LIST_TOP_PAD = 4, LIST_BOTTOM_PAD = 8;
  const pageBudgetPt = listaH - CARD_HEADER - LIST_TOP_PAD - LIST_BOTTOM_PAD - HEADER_H - HEADER_GAP;

  const lineHFloor = FLOOR_FONT * (LINE_PCT / 100) * 1.15;
  const alturaGrupo = g =>
    Math.max(g.length * lineHFloor, MIN_ROW_H + (g.length > 1 ? CAPTION_H : 0)) + ROW_GAP;

  const paginas = [];
  let atual = [], alturaAtual = 0;
  grupos.forEach(g => {
    const alturaG = alturaGrupo(g);
    if (atual.length && alturaAtual + alturaG > pageBudgetPt) {
      paginas.push(atual);
      atual = []; alturaAtual = 0;
    }
    atual.push(g);
    alturaAtual += alturaG;
  });
  if (atual.length) paginas.push(atual);
  return paginas;
}

function _backlogClientesCoresMapa_(dados) {
  const mapa = { 'Outros': _CLIENTE_COR_OUTROS_ };
  let i = 0;
  dados.fatias.forEach(f => {
    if (f.label === 'Outros') return;
    mapa[f.label] = _CLIENTE_PALETA_[i % _CLIENTE_PALETA_.length];
    i++;
  });
  return mapa;
}

function _backlogClientesBadge_(slide, x, y, w, texto, cor) {
  const chipW = 220, chipH = 16, chipX = x + w - chipW - 14, chipY = y + 9;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, chipX, chipY, chipW, chipH);
  bg.getFill().setSolidFill(cor, 0.15);
  bg.getBorder().setTransparent();
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, chipX, chipY, chipW, chipH);
  txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  txt.getText().setText(texto).getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor(cor)
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body);
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}


/**
 * Escreve a falha no próprio slide.
 *
 * Usa SÓ insertShape e CR_DESIGN_SYSTEM — nada de _sTxt nem das helpers de
 * logo. A causa mais provável de cair aqui é justamente uma dessas faltando
 * no editor; se o aviso dependesse delas, ele quebraria junto e o slide
 * voltaria a ficar vazio.
 */
function _backlogClientesFalha_(slide, x, y, w, h, erro) {
  const DS = CR_DESIGN_SYSTEM;
  const boxY = y + 40, boxH = Math.min(96, h - 48);

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, boxY, w - 30, boxH);
  bg.getFill().setSolidFill(DS.colors.accentRed, 0.08);
  bg.getBorder().setTransparent();

  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 25, boxY + 8, w - 50, boxH - 16);
  txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const tr = txt.getText();
  tr.setText('');
  const t1 = tr.appendText('ESTE SLIDE NÃO FOI GERADO\n');
  t1.getTextStyle().setFontSize(11).setBold(true)
    .setForegroundColor(DS.colors.accentRed).setFontFamily(DS.typography.body);
  const t2 = tr.appendText(String((erro && erro.message) || erro) + '\n');
  t2.getTextStyle().setFontSize(8.5).setBold(false)
    .setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
  const t3 = tr.appendText('Rode diagnosticarBacklogClientes() no editor: ele diz qual arquivo recopiar.');
  t3.getTextStyle().setFontSize(8).setBold(false).setItalic(true)
    .setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
  tr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}


// ==========================================
// PRIMITIVOS — cópias de megas-mensal
// ==========================================
// Apps Script não tem import: estes vieram de Slide_ChamadosClientes.gs e
// Slide_ChamadosPrioridade.gs. Mesmos nomes de propósito, para copiar uma
// correção de lá para cá não exigir reescrever chamada.

const _TABELA_LINHA_COR_ = '#E2E8F0';
const _CLIENTE_PALETA_ = ['#1E3A8A', '#0EA5E9', '#F59E0B', '#10B981', '#9333EA', '#D97706'];
const _CLIENTE_COR_OUTROS_ = '#94A3B8';



/**
 * 2 linhas por chamado se a página inteira couber assim; 1 se não couber.
 * Nunca meio-termo: linhas de alturas diferentes na mesma página desalinham
 * os logos e as colunas da direita.
 */
function _linhasPorChamadoQueCabem_(paginaColunas, budget, lineH, minRowH, captionH, rowGap) {
  const alturaDaColunaMaisAlta = n => {
    let pior = 0;
    paginaColunas.forEach(col => {
      const soma = col.reduce((s, g) =>
        s + Math.max(g.length * lineH * n, minRowH + (g.length > 1 ? captionH : 0)) + (rowGap || 0), 0);
      if (soma > pior) pior = soma;
    });
    return pior;
  };
  return alturaDaColunaMaisAlta(2) <= budget ? 2 : 1;
}


function _linhaTabela_(slide, x, y, w, cor, altura) {
  const linha = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, altura);
  linha.getFill().setSolidFill(cor);
  linha.getBorder().setTransparent();
}

function _prioridadeSemDado_(slide, x, y, w, h, texto, cor) {
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2 - 10, w, 20);
  txt.getText().setText(texto).getTextStyle()
    .setFontSize(9.5).setItalic(true).setBold(true).setForegroundColor(cor)
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body);
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

// O nome do cliente na planilha é a razão social ou uma abreviação interna
// ("SHPX", "H P COMERCIO"). O logo e o rótulo do slide usam o nome comercial.
// Cópia de megas-mensal/Slide_ChamadosClientes.gs — ao acrescentar um cliente
// lá, acrescente aqui.
const _CLIENTE_APELIDOS_ = [
  { trecho: 'shpx',           apelido: 'Shopee' },
  { trecho: 'tornado',        apelido: 'TornadoLog' },
  { trecho: 'dhl',            apelido: 'DHL' },
  { trecho: 'suzano',         apelido: 'Suzano' },
  { trecho: 'bosch',          apelido: 'Bosch' },
  { trecho: 'sodexo',         apelido: 'Sodexo' },
  { trecho: 'veloz',          apelido: 'Veloz' },
  // 'magazine' (não 'magazine luiza'): a aba DOCUMENTOS INQUILINOS de Itajaí
  // grava a empresa só como "Magazine" (célula mesclada, sem o "Luiza") —
  // com o trecho completo isso não casava com nada e a logo não aparecia.
  { trecho: 'magazine',       apelido: 'Magazine Luiza' },
  { trecho: 'stella',         apelido: 'Stella' },
  { trecho: 'rio branco',     apelido: 'Rio Branco' },
  { trecho: 'domus',          apelido: 'Domus' },
  { trecho: 'mercadolivre',   apelido: 'Mercado Livre' },
  { trecho: 'calamo',         apelido: 'Cálamo' },
  { trecho: 'boticario',      apelido: 'Boticário' },
  { trecho: 'ntn rolamentos', apelido: 'NTN' },
  { trecho: 'h p comercio',   apelido: 'HP' },
  { trecho: 'bpb',            apelido: 'Boticário' }
];

function _clienteDisplay_(clienteCru) {
  const norm = _histNorm_(clienteCru);
  const achado = _CLIENTE_APELIDOS_.find(a => norm.indexOf(a.trecho) >= 0);
  return achado ? achado.apelido : clienteCru;
}


// ==========================================
// PONTO DE ENTRADA — SLIDE AVULSO
// ==========================================
// Sem parâmetro, para aparecer no menu "Selecionar função" do editor.
function gerarSoBacklogClientesProperties() {
  return gerarSlideBacklogClientesProperties();
}
