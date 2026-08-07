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
// Uma linha de largura cheia por cliente — logo à esquerda, chamados
// detalhados à direita — em vez de dividir em colunas estreitas: o card é
// largo (o slide inteiro) e a maioria dos meses tem só 1-3 clientes, então
// colunas estreitas desperdiçavam a largura toda (texto cabia numa fração
// do card, o resto ficava em branco). O nome do cliente aparece uma vez só
// quando ele tem mais de um chamado (evita repetir em cada linha), mas
// cada chamado continua com sua própria linha de detalhe — nunca corta
// nenhum item, nem esconde descrição atrás de "+N outros". Cada linha
// também mostra a data do chamado e há quantos dias está em aberto
// (_backlogMetaTexto_, em Slide_BacklogEmergencialDetalhe.gs).
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
  const ROW_GAP  = 8;     // respiro entre um cliente e o próximo (separa as "linhas da tabela")

  // Linhas de cada grupo: 1 por chamado + 1 de cabeçalho extra só quando o
  // grupo tem mais de 1 chamado (grupo de 1 chamado é uma linha só).
  const linhasGrupo = g => g.length === 1 ? 1 : g.length + 1;
  const totalLinhas = grupos.reduce((s, g) => s + linhasGrupo(g), 0);
  const totalGaps   = Math.max(0, grupos.length - 1) * ROW_GAP;

  let fontSize = Math.min(11, (listH - totalGaps) / (totalLinhas * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(6, Math.round(fontSize * 2) / 2);  // arredonda pra 0,5pt, piso de 6pt
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  const maxCliente = 26;
  const LOGO_W = 56, LOGO_GAP = 10;

  let cursorY = listY;
  grupos.forEach(grupo => {
    const cor = (coresMapa && coresMapa[grupo[0].cliente]) || corTema;
    const rowH = linhasGrupo(grupo) * lineH;

    let textX = x + 15, textW = w - 30;
    // Casa pelo apelido de exibição, não pelo nome cru — ver comentário
    // equivalente em Slide_ChamadosClientes.gs.
    const logoBlob = _getClienteLogoBlob_(_clienteDisplay_(grupo[0].cliente));
    if (logoBlob) {
      try {
        // Logo ocupa a altura da linha inteira do grupo — _insertLogoFit_
        // centraliza dentro da caixa, então mesmo num grupo de vários
        // chamados o logo fica centralizado no bloco, não colado no topo.
        // O deslocamento de TEXTBOX_INSET_PT compensa a margem interna da
        // caixa de texto ao lado (ver Slide_ChamadosClientes.gs).
        _insertLogoFit_(slide, logoBlob, x + 15, cursorY + TEXTBOX_INSET_PT, LOGO_W, rowH - TEXTBOX_INSET_PT);
        textX = x + 15 + LOGO_W + LOGO_GAP;
        textW = w - 30 - LOGO_W - LOGO_GAP;
      } catch (e) {
        Logger.log('Logo do cliente ' + grupo[0].cliente + ' não desenhou: ' + e.message);
      }
    }
    // Orçamento de caracteres por LINHA — cada chamado tem que caber numa
    // linha só, senão a quebra desalinha os logos seguintes (ver o
    // comentário de _charsQueCabem_ em Slide_ChamadosClientes.gs).
    const capacidadeLinha = _charsQueCabem_(textW, fontSize);
    const metaLen = 18;   // "(dd/mm/aa · NNNd) " — orçamento fixo pro trecho de data/dias

    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, cursorY, textW, rowH);
    const tr = box.getText();
    tr.setText('');

    if (grupo.length === 1) {
      const bullet = tr.appendText('• ');
      bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
      const nomeTxt = logoBlob ? '' : _truncarNome_(_clienteDisplay_(grupo[0].cliente), maxCliente) + ' - ';
      if (nomeTxt) {
        const cliPart = tr.appendText(nomeTxt);
        cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
      }
      // ID em cinza neutro — nunca na cor do cliente, senão ID e cliente
      // ficam indistinguíveis quando o cliente cai na mesma cor do tema.
      const idPart = tr.appendText(grupo[0].id + ' ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      const meta = _backlogMetaTexto_(grupo[0]);
      if (meta) {
        const metaPart = tr.appendText('(' + meta + ') ');
        metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      }
      const maxDesc = Math.max(12, capacidadeLinha - 2 - nomeTxt.length - grupo[0].id.length - 1 - (meta ? metaLen : 0) - 2);
      const descPart = tr.appendText('- ' + _truncarNome_(grupo[0].descricao, maxDesc));
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    } else {
      const bullet = tr.appendText('• ');
      bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
      const rotulo = (logoBlob ? '' : _truncarNome_(_clienteDisplay_(grupo[0].cliente), maxCliente) + ' ') + '(' + grupo.length + ')\n';
      const cliPart = tr.appendText(rotulo);
      cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
      grupo.forEach(it => {
        const idPart = tr.appendText('   ' + it.id + ' ');
        idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        const meta = _backlogMetaTexto_(it);
        if (meta) {
          const metaPart = tr.appendText('(' + meta + ') ');
          metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
        }
        const maxDesc = Math.max(12, capacidadeLinha - 3 - it.id.length - 1 - (meta ? metaLen : 0) - 2);
        const descPart = tr.appendText('- ' + _truncarNome_(it.descricao, maxDesc) + '\n');
        descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
      });
    }

    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
    cursorY += rowH + ROW_GAP;
  });
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
