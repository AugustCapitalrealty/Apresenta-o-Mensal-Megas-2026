/**
 * ARQUIVO: Slide_BacklogClientesOperacao.gs
 * SLIDE — BACKLOG DE CLIENTES — OPERAÇÃO (chamados de responsabilidade da operação)
 * DESCRIÇÃO: Complementar ao Backlog de Clientes — Detalhe
 * (Slide_BacklogClientesDetalhes.gs, que é só responsabilidade do
 * LOCATÁRIO): aqui é o backlog de chamados de CLIENTE que são
 * responsabilidade DA OPERAÇÃO (Capital Realty) — lido direto da aba
 * "BD-CORRETIVAS" da planilha BASE DE DADOS — QUADRO REM (BD_CORRETIVAS_ID,
 * histórico bruto desde 2021, multi-empreendimento), filtrado por Centro de
 * Custos = MEGA <EMPREENDIMENTO>, sem as linhas do próprio condomínio, e
 * excluindo os chamados marcados como responsabilidade do locatário (ver
 * _resolverEquipeResponsaveis_/_chamadoResponsabilidadeLocatario_ em
 * 02_Dados.gs — o marcador "Responsabilidade Locatario" vem embutido na
 * própria coluna de Responsáveis, não numa aba separada). Mesma regra de
 * janela de mês de referência dos outros slides de backlog
 * (_histAbertoNoMes_).
 *
 * Reaproveita 100% o desenho de tabela + paginação de
 * Slide_BacklogClientesDetalhes.gs (_backlogClientesTabela_,
 * _paginarGruposBacklog_, _backlogClientesCoresMapa_, _backlogClientesBadge_)
 * — a única diferença é a origem dos dados e o tema/texto do badge.
 *
 * Sem chamados de operação em aberto no mês de referência pro
 * empreendimento ativo: cai no slide manual de espaço reservado
 * (gerarSlideReservaGraficos), sem quebrar a geração.
 */

function gerarSlideBacklogClientesOperacao() {
  const dados = obterDadosBacklogClientesOperacao_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — OPERAÇÃO', 'Chamados de clientes pendentes de responsabilidade da operação',
      [{ titulo: 'PENDÊNCIAS EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const marginX = 30, topY = 76;
  const listaH = (H - 16) - topY;

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
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const subtitulo = 'Chamados de clientes pendentes de responsabilidade da operação' +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — OPERAÇÃO', subtitulo);

    _backlogClientesTabela_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.total, grupoDaPagina, CORES.lightBlue, coresMapa);
    _backlogClientesBadge_(slide, marginX, topY, W - 2 * marginX, 'RESPONSABILIDADE DA OPERAÇÃO', CORES.lightBlue);
  });

  Logger.log('Slide Backlog de Clientes — Operação gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Chamados de cliente em aberto no mês de referência que NÃO são
// responsabilidade do locatário, agrupados por Cliente, lidos direto da
// aba BD-CORRETIVAS (histórico bruto, BD_CORRETIVAS_ID). Sem a aba
// preenchida/acessível, cai no slide manual de espaço reservado.
function gerarSoBacklogClientesOperacaoCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesOperacao(); }
function gerarSoBacklogClientesOperacaoItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesOperacao(); }
function gerarSoBacklogClientesOperacaoEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesOperacao(); }
