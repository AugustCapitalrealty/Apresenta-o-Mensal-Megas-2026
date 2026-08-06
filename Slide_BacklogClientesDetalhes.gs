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
 * Reaproveita a barra 100% empilhada e a lista completa (sem cortar nenhum
 * item) do slide de Chamados de Clientes (_clientesBarraCard_/_clientesLista_
 * em Slide_ChamadosClientes.gs) — aqui é um período único (o backlog atual),
 * sem Abertos x Fechados.
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
  const barraH = 150;
  const listaY = topY + barraH + gap;
  const listaH = areaBottom - listaY;

  const coresMapa = _backlogClientesCoresMapa_(dados);
  _clientesBarraCard_(slide, marginX, topY, W - 2 * marginX, barraH, 'EM ABERTO', dados, CORES.lightBlue, coresMapa);
  _clientesLista_(slide, marginX, listaY, W - 2 * marginX, listaH, 'LISTA DE CHAMADOS EM ABERTO', dados.lista, CORES.lightBlue);

  Logger.log('Slide Backlog de Clientes — Detalhe gerado — total=' + dados.total + '.');
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
