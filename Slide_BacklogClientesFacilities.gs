/**
 * ARQUIVO: Slide_BacklogClientesFacilities.gs
 * SLIDE — BACKLOG DE CLIENTES — FACILITIES (chamados de responsabilidade da equipe Facilities)
 * DESCRIÇÃO: Um dos dois slides que dividem o backlog de chamados de
 * cliente que são responsabilidade DA OPERAÇÃO (o par com
 * Slide_BacklogClientesProperties.gs) — juntos, complementares ao Backlog
 * de Clientes — Detalhe (Slide_BacklogClientesDetalhes.gs, que é só
 * responsabilidade do LOCATÁRIO).
 *
 * Fonte: aba "BD-CORRETIVAS" da planilha BASE DE DADOS — QUADRO REM
 * (BD_CORRETIVAS_ID, histórico bruto desde 2021, multi-empreendimento),
 * filtrada por Centro de Custos = MEGA <EMPREENDIMENTO>, sem as linhas do
 * próprio condomínio, sem os chamados marcados como responsabilidade do
 * locatário, e aqui só os cuja equipe resolvida
 * (_resolverEquipeResponsaveis_, 02_Dados.gs) é FACILITIES — chamado de
 * equipe OPERAÇÃO ou não reconhecida entra aqui também (ver
 * obterDadosBacklogClientesFacilities_). Mesma janela de mês de
 * referência dos outros slides de backlog (_histAbertoNoMes_).
 *
 * Reaproveita 100% o desenho de tabela + paginação de
 * Slide_BacklogClientesDetalhes.gs (_backlogClientesTabela_,
 * _paginarGruposBacklog_, _backlogClientesCoresMapa_, _backlogClientesBadge_).
 *
 * Sem chamados de Facilities em aberto no mês de referência pro
 * empreendimento ativo: cai no slide manual de espaço reservado
 * (gerarSlideReservaGraficos), sem quebrar a geração.
 */

function gerarSlideBacklogClientesFacilities() {
  const dados = obterDadosBacklogClientesFacilities_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG DE CLIENTES — FACILITIES', 'Chamados de clientes pendentes de responsabilidade da equipe Facilities',
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

    const subtitulo = 'Chamados de clientes pendentes de responsabilidade da equipe Facilities' +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG DE CLIENTES — FACILITIES', subtitulo);

    _backlogClientesTabela_(slide, marginX, topY, W - 2 * marginX, listaH, 'PENDÊNCIAS EM ABERTO', dados.total, grupoDaPagina, CORES.lightBlue, coresMapa);
    _backlogClientesBadge_(slide, marginX, topY, W - 2 * marginX, 'RESPONSABILIDADE FACILITIES', CORES.lightBlue);
  });

  Logger.log('Slide Backlog de Clientes — Facilities gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
function gerarSoBacklogClientesFacilitiesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogClientesFacilities(); }
function gerarSoBacklogClientesFacilitiesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogClientesFacilities(); }
function gerarSoBacklogClientesFacilitiesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogClientesFacilities(); }
