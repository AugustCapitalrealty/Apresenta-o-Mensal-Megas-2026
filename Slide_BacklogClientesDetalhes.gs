/**
 * ARQUIVO: Slide_BacklogClientesDetalhes.gs
 * SLIDE — BACKLOG DE CLIENTES — DETALHE (chamados de responsabilidade do locatário)
 * DESCRIÇÃO: Lista as pendências do backlog que são de responsabilidade do
 * locatário (não da operação), agrupadas por Cliente, lidas da aba
 * "BACKLOG - CLIENTES - DETALHES" da planilha de Histórico Validado
 * (obterDadosBacklogClientesDetalhes_ em 02_Dados.gs), filtradas por Centro
 * de Custos = MEGA <EMPREENDIMENTO> e sem as linhas do próprio condomínio.
 * Mesma regra de janela de mês de referência do slide de Backlog
 * Emergencial — Detalhe: um chamado que hoje já aparece "Fechado" ainda
 * entra se esteve aberto em algum momento do mês de referência (ver
 * comentário em 02_Dados.gs, _histAbertoNoMes_).
 *
 * O foco do slide é a LISTA de pendências — sem gráfico de resumo (o card
 * de barra por cliente foi removido a pedido: o que importa aqui é o
 * detalhe de cada chamado, não a proporção entre clientes). Layout de
 * TABELA: uma linha de largura cheia por cliente (logo grande à esquerda,
 * chamados detalhados à direita) — nada de colunas estreitas, que
 * desperdiçavam a largura do card nos meses com poucos clientes. Cliente
 * com mais de um chamado agrupa o nome uma vez só, mas cada chamado
 * continua com sua própria linha (id + data + dias em aberto + descrição)
 * — nunca corta nenhum item.
 *
 * Sem chamados no mês de referência pro empreendimento ativo: cai no slide
 * manual de espaço reservado (gerarSlideReservaGraficos), sem quebrar a
 * geração.
 */

function gerarSlideBacklogClientesDetalhes() {
  const dados = obterDadosBacklogClientesDetalhes_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — DETALHE', 'Chamados pendentes de responsabilidade do locatário',
      [{ titulo: 'PENDÊNCIAS EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — DETALHE', 'Chamados pendentes de responsabilidade do locatário');

  const marginX = 30, topY = 76;
  const areaBottom = H - 16;
  const listaH = areaBottom - topY;

  const coresMapa = _backlogClientesCoresMapa_(dados);
  _backlogClientesLista_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.lista, CORES.lightBlue, coresMapa);
  _backlogClientesBadgeLocatario_(slide, marginX, topY, W - 2 * marginX);

  Logger.log('Slide Backlog de Clientes — Detalhe gerado — total=' + dados.total + '.');
}

// Chip "RESPONSABILIDADE DO LOCATÁRIO" no canto do card — o assunto do
// slide (backlog que depende do cliente agir, não da operação) precisa
// ficar óbvio batendo o olho, não só no subtítulo pequeno do cabeçalho.
function _backlogClientesBadgeLocatario_(slide, x, y, w) {
  const chipW = 220, chipH = 16, chipX = x + w - chipW - 14, chipY = y + 9;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, chipX, chipY, chipW, chipH);
  bg.getFill().setSolidFill(CORES.themeCorr, 0.15);
  bg.getBorder().setTransparent();
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, chipX, chipY, chipW, chipH);
  txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  txt.getText().setText('RESPONSABILIDADE DO LOCATÁRIO').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor(CORES.themeCorr).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

// Mapa de cor por cliente — mesma paleta cíclica de Slide_ChamadosClientes.gs
// (_CLIENTE_PALETA_/_CLIENTE_COR_OUTROS_), atribuída pela ordem das fatias
// (já vem rankeada por qtd decrescente de obterDadosBacklogClientesDetalhes_).
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

// ── Card com a lista completa de pendências, em formato de TABELA ────────
// Cabeçalho interno "CLIENTE | DESCRIÇÃO", coluna do logo com largura fixa
// separada por uma linha vertical, e uma linha horizontal fina fechando
// cada linha — mesmo padrão de _clientesLista_ em Slide_ChamadosClientes.gs
// (ver o comentário lá pro raciocínio completo). Cada chamado é uma linha
// simples "id (data · dias) - descrição"; o nome do cliente não repete no
// texto porque já tem sua própria coluna com o logo.
function _backlogClientesLista_(slide, x, y, w, h, titulo, itens, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', corTema);
  const listY = contentY + 4, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const porCliente = {};
  const ordemClientes = [];
  itens.forEach(it => {
    if (!porCliente[it.cliente]) { porCliente[it.cliente] = []; ordemClientes.push(it.cliente); }
    porCliente[it.cliente].push(it);
  });
  const grupos = ordemClientes.map(cli => porCliente[cli]);

  const LINE_PCT = 130;   // mais espaçado que as listas em coluna — preenche melhor a altura do card
  const ROW_GAP  = 6;     // respiro entre um cliente e o próximo, além da linha divisória

  const HEADER_H = 16, HEADER_GAP = 6;
  const linhasY = listY + HEADER_H + HEADER_GAP;
  const linhasH = listH - HEADER_H - HEADER_GAP;

  const linhasGrupo = g => g.length;
  const totalLinhas = grupos.reduce((s, g) => s + linhasGrupo(g), 0);
  const totalGaps   = Math.max(0, grupos.length - 1) * ROW_GAP;

  let fontSize = Math.min(11, (linhasH - totalGaps) / (totalLinhas * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(6, Math.round(fontSize * 2) / 2);  // arredonda pra 0,5pt, piso de 6pt
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  const maxCliente = 26;
  // Coluna do logo com largura e altura fixas — o "quadrado" da célula,
  // não mais um teto elástico. Card cheio de largura (slide inteiro), por
  // isso a célula pode ser bem maior que na lista de 2 colunas de
  // Slide_ChamadosClientes.gs.
  const LOGO_COL_W = 92, LOGO_GAP = 16, LOGO_CELL_H = 36, MIN_ROW_H = 40;

  const headerBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, listY, w - 30, HEADER_H);
  headerBg.getFill().setSolidFill(corTema, 0.10);
  headerBg.getBorder().setTransparent();
  _sTxt(slide, x + 15, listY, LOGO_COL_W, HEADER_H, 'CLIENTE', 7, true, corTema, 'center');
  _sTxt(slide, x + 15 + LOGO_COL_W + LOGO_GAP, listY, w - 30 - LOGO_COL_W - LOGO_GAP, HEADER_H, 'DESCRIÇÃO', 7, true, corTema, 'left');
  _linhaTabela_(slide, x + 15, listY + HEADER_H, w - 30, corTema, 1);

  let cursorY = linhasY;
  grupos.forEach(grupo => {
    const cor = (coresMapa && coresMapa[grupo[0].cliente]) || corTema;
    const rowH = Math.max(linhasGrupo(grupo) * lineH, MIN_ROW_H);

    // Casa pelo apelido de exibição, não pelo nome cru — ver comentário
    // equivalente em Slide_ChamadosClientes.gs.
    const nomeDisplay = _clienteDisplay_(grupo[0].cliente);
    const logoBlob = _getClienteLogoBlob_(nomeDisplay);
    const logoY = cursorY + (rowH - LOGO_CELL_H) / 2;
    let logoOk = false;
    if (logoBlob) {
      try { _insertLogoFit_(slide, logoBlob, x + 15, logoY, LOGO_COL_W, LOGO_CELL_H); logoOk = true; }
      catch (e) { Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message); }
    }
    if (!logoOk) {
      _sTxt(slide, x + 15, logoY, LOGO_COL_W, LOGO_CELL_H, _truncarNome_(nomeDisplay, maxCliente), 8.5, true, cor, 'center');
    }
    if (grupo.length > 1) {
      _sTxt(slide, x + 15, logoY + LOGO_CELL_H + 1, LOGO_COL_W, 10, '(' + grupo.length + ' chamados)', 7, false, CORES.textGray, 'center');
    }

    const textX = x + 15 + LOGO_COL_W + LOGO_GAP, textW = w - 30 - LOGO_COL_W - LOGO_GAP;
    // Orçamento de caracteres por LINHA — cada chamado tem que caber numa
    // linha só, senão a quebra desalinha os logos seguintes (ver o
    // comentário de _charsQueCabem_ em Slide_ChamadosClientes.gs).
    const capacidadeLinha = _charsQueCabem_(textW, fontSize);
    const metaLen = 18;   // "(dd/mm/aa · NNNd) " — orçamento fixo pro trecho de data/dias

    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, cursorY, textW, rowH);
    const tr = box.getText();
    tr.setText('');
    grupo.forEach((it, i) => {
      // ID em cinza neutro — nunca na cor do cliente, senão ID e cliente
      // ficam indistinguíveis quando o cliente cai na mesma cor do tema.
      const idPart = tr.appendText((i > 0 ? '\n' : '') + '• ' + it.id + ' ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      const meta = _backlogMetaTexto_(it);
      if (meta) {
        const metaPart = tr.appendText('(' + meta + ') ');
        metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      }
      // Piso baixo (4, não 12) — ver comentário equivalente em
      // Slide_ChamadosClientes.gs.
      const maxDesc = Math.max(4, capacidadeLinha - 3 - it.id.length - 1 - (meta ? metaLen : 0) - 2);
      const descPart = tr.appendText('- ' + _truncarNome_(it.descricao, maxDesc));
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    });

    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    cursorY += rowH + ROW_GAP;
    _linhaTabela_(slide, x + 15, cursorY - ROW_GAP / 2, w - 30, _TABELA_LINHA_COR_, 0.75);
  });

  // Linha vertical separando a coluna do logo da coluna dos chamados,
  // atravessando cabeçalho + todas as linhas.
  const dividerX = x + 15 + LOGO_COL_W + LOGO_GAP / 2;
  const divisor = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, dividerX, listY, 0.75, cursorY - ROW_GAP - listY);
  divisor.getFill().setSolidFill(_TABELA_LINHA_COR_);
  divisor.getBorder().setTransparent();
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Chamados do backlog de responsabilidade do locatário que estavam em
// aberto durante o mês de referência no empreendimento ativo, agrupados
// por Cliente (mesma regra de janela de mês do Backlog Emergencial —
// Detalhe), busca automática na aba "BACKLOG - CLIENTES - DETALHES" da
// planilha de Histórico Validado. Sem a aba preenchida, cai no slide
// manual de espaço reservado.
function gerarSoBacklogClientesDetalhesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesDetalhes(); }
function gerarSoBacklogClientesDetalhesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesDetalhes(); }
function gerarSoBacklogClientesDetalhesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesDetalhes(); }
