/**
 * ARQUIVO: Slide_BacklogClientesDetalhes.gs
 * SLIDE — BACKLOG DE CLIENTES — DETALHE (chamados de responsabilidade do locatário)
 * DESCRIÇÃO: Abre o detalhe dos chamados do backlog que são de
 * responsabilidade do locatário (não da operação), agrupados por Cliente,
 * lidos da aba "BACKLOG - CLIENTES - DETALHES" da planilha de Histórico
 * Validado (obterDadosBacklogClientesDetalhes_ em 02_Dados.gs), filtrados
 * por Centro de Custos = MEGA <EMPREENDIMENTO> e sem as linhas do próprio
 * condomínio. Mesma regra de janela de mês de referência do slide de
 * Backlog Emergencial — Detalhe: um chamado que hoje já aparece "Fechado"
 * ainda entra se esteve aberto em algum momento do mês de referência (ver
 * comentário em 02_Dados.gs, _histAbertoNoMes_).
 *
 * Reaproveita a barra 100% empilhada do slide de Chamados de Clientes
 * (_clientesBarraCard_ em Slide_ChamadosClientes.gs) — aqui é um período
 * único (o backlog atual), sem Abertos x Fechados. A lista de detalhe é uma
 * versão própria (_backlogClientesLista_) que também mostra a data do
 * chamado e há quantos dias está em aberto (contado até o fim do mês de
 * referência, não até hoje — ver _histDiasAberto_ em 02_Dados.gs), sem
 * cortar nenhum item.
 *
 * Sem chamados no mês de referência pro empreendimento ativo: cai no slide
 * manual de espaço reservado (gerarSlideReservaGraficos), sem quebrar a
 * geração.
 */

function gerarSlideBacklogClientesDetalhes() {
  const dados = obterDadosBacklogClientesDetalhes_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — DETALHE', 'Chamados pendentes de responsabilidade do locatário',
      [{ titulo: 'EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — DETALHE', 'Chamados pendentes de responsabilidade do locatário');

  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  // Altura da barra proporcional ao nº de clientes nomeados (1 a 5 fatias) —
  // com poucos clientes a legenda não precisa do espaço máximo; sobra fica
  // pra lista de detalhe embaixo em vez de ficar em branco no card de cima.
  const barraH = 92 + 20 * Math.max(1, dados.fatias.length);
  const listaY = topY + barraH + gap;
  const listaH = areaBottom - listaY;

  const coresMapa = _backlogClientesCoresMapa_(dados);
  _clientesBarraCard_(slide, marginX, topY, W - 2 * marginX, barraH, 'EM ABERTO', dados, CORES.lightBlue, coresMapa);
  _backlogClientesBadgeLocatario_(slide, marginX, topY, W - 2 * marginX);
  _backlogClientesLista_(slide, marginX, listaY, W - 2 * marginX, listaH, 'LISTA DE CHAMADOS EM ABERTO', dados.lista, CORES.lightBlue, coresMapa);

  Logger.log('Slide Backlog de Clientes — Detalhe gerado — total=' + dados.total + '.');
}

// Chip "RESPONSABILIDADE DO LOCATÁRIO" no canto do card de cima — o assunto
// do slide (backlog que depende do cliente agir, não da operação) precisa
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

// Mapa de cor por cliente pra este slide de período único — mesma paleta
// cíclica de Slide_ChamadosClientes.gs (_CLIENTE_PALETA_/_CLIENTE_COR_OUTROS_),
// mas atribuída direto pela ordem das fatias (já vem rankeada por qtd
// decrescente de obterDadosBacklogClientesDetalhes_), sem precisar combinar
// Abertos+Fechados como em _clienteCoresMapa_ (aqui só tem um período).
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

// ── Card com a lista completa de chamados em aberto ────────────────────────
// Mesma técnica de _clientesLista_ (Slide_ChamadosClientes.gs): nunca corta
// item, a partir de 6 itens divide em colunas e a fonte encolhe até um piso
// legível. Versão dedicada (não a compartilhada) porque aqui cada chamado
// também mostra a data de reporte e há quantos dias está em aberto
// (_backlogMetaTexto_, Slide_BacklogEmergencialDetalhe.gs) — informação que
// o slide de Chamados de Clientes não tem.
function _backlogClientesLista_(slide, x, y, w, h, titulo, itens, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const cols     = itens.length > 6 ? (itens.length > 16 ? 3 : 2) : 1;
  const colGap   = 14;
  const colW     = (w - 30 - (cols - 1) * colGap) / cols;
  const porCol   = Math.ceil(itens.length / cols);
  const LINE_PCT = 118;

  let fontSize = Math.min(8, listH / (porCol * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(6, Math.round(fontSize * 2) / 2);  // arredonda pra 0,5pt, piso de 6pt

  const maxCliente = cols === 1 ? 20 : (cols === 2 ? 14 : 10);
  const maxDesc    = cols === 1 ? 62 : (cols === 2 ? 30 : 18);

  for (let c = 0; c < cols; c++) {
    const fatia = itens.slice(c * porCol, (c + 1) * porCol);
    if (!fatia.length) continue;

    const colX = x + 15 + c * (colW + colGap);
    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, listY, colW, listH);
    const tr = box.getText();
    tr.setText('');
    fatia.forEach(it => {
      const bullet = tr.appendText('• ');
      bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
      const cliPart = tr.appendText(_truncarNome_(_clienteDisplay_(it.cliente), maxCliente) + ' - ');
      cliPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(coresMapa[it.cliente] || corTema).setFontFamily('Montserrat');
      // ID em cinza neutro — nunca na cor do cliente, senão ID e cliente
      // ficam indistinguíveis quando o cliente cai na mesma cor do tema.
      const idPart = tr.appendText(it.id + ' ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      const meta = _backlogMetaTexto_(it);
      if (meta) {
        const metaPart = tr.appendText('(' + meta + ') ');
        metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      }
      const descPart = tr.appendText('- ' + _truncarNome_(it.descricao, maxDesc) + '\n');
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    });
    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  }
}
