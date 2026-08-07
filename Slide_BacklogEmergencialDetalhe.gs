/**
 * ARQUIVO: Slide_BacklogEmergencialDetalhe.gs
 * SLIDE — BACKLOG EMERGENCIAL — DETALHE (chamados emergenciais em aberto)
 * DESCRIÇÃO: Abre o detalhe dos chamados de prioridade Emergencial que
 * estavam em aberto no Mega ativo durante o MÊS DE REFERÊNCIA da
 * apresentação (o mês anterior — obterMesReferencia_), lidos da aba
 * "BACKLOG - EMERGENCIAL - DETALHE" da planilha de Histórico Validado
 * (obterDadosBacklogEmergencialDetalhe_ em 02_Dados.gs), filtrados por
 * Centro de Custos = MEGA <EMPREENDIMENTO>. Um chamado que hoje já aparece
 * "Fechado" ainda entra se ele esteve aberto em algum momento do mês de
 * referência (comparação de datas, não do Estado atual — ver comentário em
 * 02_Dados.gs).
 *
 * Diferença em relação ao slide de Chamados por Prioridade/Clientes: aqui não
 * tem Abertos x Fechados (é só backlog aberto no mês) — o eixo é EQUIPE
 * responsável (FACILITIES ou PROPERTY), resumido em dois cards KPI compactos
 * (criarCardKPI, 01_Config.gs) em vez de barra+legenda — só 2 categorias não
 * precisam de gráfico, e o espaço economizado vai pra lista de detalhe, que
 * é o que importa no slide. Lista em formato de TABELA (EQUIPE | DESCRIÇÃO |
 * DATA ABERTURA | TEMPO ABERTO), mesmo padrão de _backlogClientesTabela_ em
 * Slide_BacklogClientesDetalhes.gs — mês cheio nunca corta chamado nem
 * espreme a fonte até ilegível: vira mais de uma PÁGINA/slide em vez disso
 * (_paginarItensBacklogEmerg_).
 *
 * Sem chamados emergenciais em aberto no mês de referência pro empreendimento
 * ativo: cai no slide manual de espaço reservado (gerarSlideReservaGraficos),
 * sem quebrar a geração.
 */

function gerarSlideBacklogEmergencialDetalhe() {
  const dados = obterDadosBacklogEmergencialDetalhe_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG EMERGENCIAL — DETALHE', 'Chamados emergenciais em aberto · Facilities x Property',
      [{ titulo: 'EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const kpiH = 72;
  const listaY = topY + kpiH + gap;
  const listaH = areaBottom - listaY;

  // Mês cheio: em vez de encolher a fonte até ficar ilegível, divide os
  // chamados em quantas PÁGINAS/slides forem necessárias pra caber com
  // fonte legível — mesma ideia de _paginarGruposBacklog_ em
  // Slide_BacklogClientesDetalhes.gs, mas mais simples aqui: cada chamado
  // já é a própria linha (não tem agrupamento por cliente pra preservar).
  const paginas = _paginarItensBacklogEmerg_(dados.lista, listaH);

  paginas.forEach((itensPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const subtitulo = 'Chamados emergenciais em aberto · Facilities x Property' +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE', subtitulo);

    _backlogEmergKPIs_(slide, marginX, topY, W - 2 * marginX, kpiH, dados);
    // Tema geral do slide (borda do card, cabeçalho da tabela) em vermelho —
    // "Emergencial" já é vermelho em todo o resto do deck (ver
    // _PRIORIDADE_CORES_ em Slide_ChamadosPrioridade.gs). O azul/âmbar de
    // Facilities/Property fica só nas células por equipe (_equipeCor_,
    // usado nos KPIs de cima e na coluna EQUIPE da tabela) — não muda aqui.
    _backlogEmergTabela_(slide, marginX, listaY, W - 2 * marginX, listaH, 'LISTA DE CHAMADOS EM ABERTO', dados.total, itensPagina, CORES.cardRed);
  });

  Logger.log('Slide Backlog Emergencial — Detalhe gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}

// Divide os chamados em páginas que cabem com fonte legível (piso
// FLOOR_FONT) — diferente de _paginarGruposBacklog_ (Backlog de Clientes),
// aqui não existe agrupamento por cliente pra preservar: cada chamado é
// sua própria linha, então a divisão é sempre "os primeiros N cabem
// nesta página" — sem risco de partir um grupo no meio.
function _paginarItensBacklogEmerg_(itens, listaH) {
  if (!itens.length) return [[]];

  const FLOOR_FONT = 8, LINE_PCT = 118, ROW_GAP = 4;
  const HEADER_H = 16, HEADER_GAP = 6;
  // Mesmas constantes de layout de _backlogEmergTabela_: criarCardPainel
  // devolve y+32 (título do card), listY = contentY+2, listH = h-listY-8.
  const CARD_HEADER = 32, LIST_TOP_PAD = 2, LIST_BOTTOM_PAD = 8;
  const pageBudgetPt = listaH - CARD_HEADER - LIST_TOP_PAD - LIST_BOTTOM_PAD - HEADER_H - HEADER_GAP;

  const lineHFloor = FLOOR_FONT * (LINE_PCT / 100) * 1.15;
  const porPagina = Math.max(1, Math.floor((pageBudgetPt + ROW_GAP) / (lineHFloor + ROW_GAP)));

  const paginas = [];
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina));
  return paginas;
}

// Cor por equipe responsável — função (não const top-level) pra não depender
// da ordem de carga dos arquivos .gs (CORES é definido em 01_Config.gs; um
// const de topo aqui poderia rodar antes e estourar TDZ).
function _equipeCor_(equipe) {
  return String(equipe || '').toUpperCase() === 'PROPERTY' ? CORES.themeCorr : CORES.lightBlue;
}

// ── Dois cards KPI compactos: FACILITIES x PROPERTY ────────────────────────
// Sempre mostra as duas equipes, mesmo quando uma tem zero chamados — o
// card não vira gráfico (só 2 categorias não precisam de barra/legenda) e
// sobra espaço pra lista de detalhe embaixo, que é o foco do slide.
function _backlogEmergKPIs_(slide, x, y, w, h, dados) {
  const porEquipe = { FACILITIES: 0, PROPERTY: 0 };
  dados.fatias.forEach(f => { porEquipe[f.label] = f.qtd; });
  const total = dados.total;

  const gap = 16, cardW = (w - gap) / 2;
  ['FACILITIES', 'PROPERTY'].forEach((equipe, i) => {
    const qtd = porEquipe[equipe] || 0;
    const pct = total > 0 ? (qtd / total * 100) : 0;
    criarCardKPI(slide, x + i * (cardW + gap), y, cardW, h, {
      label: equipe,
      valor: qtd,
      cor: _equipeCor_(equipe),
      tamValor: 26,
      sub: pct.toFixed(1).replace('.', ',') + '%'
    });
  });
}

// ── Card com a lista de chamados DE UMA PÁGINA, em formato de TABELA ─────
// Cabeçalho interno "EQUIPE | DESCRIÇÃO | DATA ABERTURA | TEMPO ABERTO" —
// mesmo padrão de _backlogClientesTabela_ (Slide_BacklogClientesDetalhes.gs),
// só que sem coluna de logo (aqui o agrupamento é por Equipe, não por
// Cliente, então cada chamado já É a própria linha, sem bloco pra
// centralizar). `itens` já vem pré-dividido em página por
// _paginarItensBacklogEmerg_; `totalCount` é o total do MÊS INTEIRO (todas
// as páginas), não só desta.
function _backlogEmergTabela_(slide, x, y, w, h, titulo, totalCount, itens, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + totalCount + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const LINE_PCT = 118, ROW_GAP = 4;
  const HEADER_H = 16, HEADER_GAP = 6;
  const linhasY = listY + HEADER_H + HEADER_GAP;
  const linhasH = listH - HEADER_H - HEADER_GAP;

  // Piso de 8 (não mais 6): _paginarItensBacklogEmerg_ já garante que cada
  // página cabe com fonte legível — se sobrar, vira página nova em vez de
  // espremer (ver comentário equivalente em Slide_BacklogClientesDetalhes.gs).
  let fontSize = Math.min(10, (linhasH - (itens.length - 1) * ROW_GAP) / (itens.length * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(8, Math.round(fontSize * 2) / 2);
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  const EQUIPE_W = 88, EQUIPE_GAP = 14;
  // Mesma folga de Slide_BacklogClientesDetalhes.gs — ver o comentário lá
  // pro porquê (uma data "dd/mm/aa" de 8 caracteres quebrava em 2 linhas
  // no teto de fonte).
  const DATA_W = 68, DIAS_W = 52, COL_GAP2 = 10, COL_GAP3 = 6;
  const descX = x + 15 + EQUIPE_W + EQUIPE_GAP;
  const descW = (w - 30) - EQUIPE_W - EQUIPE_GAP - DATA_W - COL_GAP2 - DIAS_W - COL_GAP3;
  const dataX = descX + descW + COL_GAP2;
  const diasX = dataX + DATA_W + COL_GAP3;

  const headerBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, listY, w - 30, HEADER_H);
  headerBg.getFill().setSolidFill(corTema, 0.10);
  headerBg.getBorder().setTransparent();
  _sTxt(slide, x + 15, listY, EQUIPE_W, HEADER_H, 'EQUIPE', 7, true, corTema, 'center');
  _sTxt(slide, descX, listY, descW, HEADER_H, 'DESCRIÇÃO', 7, true, corTema, 'left');
  _sTxt(slide, dataX, listY, DATA_W, HEADER_H, 'DATA ABERTURA', 6, true, corTema, 'center');
  _sTxt(slide, diasX, listY, DIAS_W, HEADER_H, 'TEMPO ABERTO', 6, true, corTema, 'center');
  _linhaTabela_(slide, x + 15, listY + HEADER_H, w - 30, corTema, 1);
  [descX - EQUIPE_GAP / 2, dataX - COL_GAP3 / 2].forEach(lx => {
    const l = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, HEADER_H);
    l.getFill().setSolidFill(_TABELA_LINHA_COR_); l.getBorder().setTransparent();
  });

  const capacidadeLinha = _charsQueCabem_(descW, fontSize);
  let cursorY = linhasY;
  itens.forEach(it => {
    const cor = _equipeCor_(it.equipe);
    _sTxt(slide, x + 15, cursorY, EQUIPE_W, lineH, (it.equipe || '—').toUpperCase(), Math.min(fontSize, 9), true, cor, 'center');

    const descBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, descX, cursorY, descW, lineH);
    const tr = descBox.getText();
    tr.setText('');
    // ID em cinza neutro — nunca na cor do tema/equipe, senão em chamados
    // PROPERTY (mesma cor âmbar do tema deste slide) ID e equipe ficam
    // indistinguíveis visualmente.
    const idPart = tr.appendText('• ' + it.id + ' - ');
    idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
    // Piso baixo (4, não 12) — ver comentário equivalente em
    // Slide_ChamadosClientes.gs.
    const maxDesc = Math.max(4, capacidadeLinha - 3 - it.id.length - 3);
    const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc));
    descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    descBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    _sTxt(slide, dataX, cursorY, DATA_W, lineH, it.dataReporte || '—', Math.max(6, fontSize - 0.5), false, CORES.textGray, 'center');
    const diasTxt = (it.diasAberto === null || it.diasAberto === undefined) ? '—' : it.diasAberto + 'd';
    _sTxt(slide, diasX, cursorY, DIAS_W, lineH, diasTxt, fontSize, true, cor, 'center');

    cursorY += lineH + ROW_GAP;
    _linhaTabela_(slide, x + 15, cursorY - ROW_GAP / 2, w - 30, _TABELA_LINHA_COR_, 0.75);
  });

  // Linhas verticais separando equipe | descrição | data | dias,
  // atravessando cabeçalho + todas as linhas.
  const alturaTabela = cursorY - ROW_GAP - listY;
  [x + 15 + EQUIPE_W + EQUIPE_GAP / 2, descX - COL_GAP2 / 2, dataX - COL_GAP3 / 2].forEach(lx => {
    const divisor = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, alturaTabela);
    divisor.getFill().setSolidFill(_TABELA_LINHA_COR_);
    divisor.getBorder().setTransparent();
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Chamados de prioridade Emergencial que estavam em aberto durante o mês de
// referência (mês anterior) no empreendimento ativo, com o detalhe por
// Equipe responsável (Facilities x Property), busca automática na aba
// "BACKLOG - EMERGENCIAL - DETALHE" da planilha de Histórico Validado. Sem
// a aba preenchida, cai no slide manual de espaço reservado.
function gerarSoBacklogEmergencialDetalheCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogEmergencialDetalhe(); }
