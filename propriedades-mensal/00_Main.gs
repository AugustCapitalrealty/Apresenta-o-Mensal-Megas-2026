/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Orquestrador da Apresentação Mensal de Propriedades
 *
 * Mesma estrutura de megas-mensal/00_Main.gs: um array `passos` com os
 * slides na ordem, e um laço que roda cada um isolado — slide que falha
 * registra o erro e não derruba os outros.
 *
 * ESTADO: as duas tabelas (Recebimento de Obras e Gestão de Contratações)
 * rodam. As seções de Preventivas, Corretivas e Backlog têm os dados prontos
 * em 02_Dados.gs e faltam só de desenho — entram no pipeline conforme forem
 * implementadas, e não antes: slide com dado inventado é pior que slide
 * nenhum.
 *
 * COMO ACRESCENTAR UM SLIDE
 *   1. Crie Slide_<Nome>.gs com uma função gerarSlide<Nome>().
 *   2. Acrescente { nome: '<Nome>', fn: gerarSlide<Nome> } em `passos`.
 *   3. Leia os dados por uma função de 02_Dados.gs, não direto da planilha
 *      dentro do slide — é o que permite testar sem abrir o Slides.
 */


// ==========================================
// MENU NA BARRA DO SLIDES / SHEETS
// ==========================================
function onOpen() {
  let ui = null;
  try { ui = SlidesApp.getUi(); } catch (e) {}
  if (!ui) {
    try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  }
  if (!ui) return;

  ui.createMenu('🏢 Propriedades 2026')
    .addItem('▶ Gerar Apresentação Completa', 'gerarApresentacaoPropriedades')
    .addItem('📊 Gerar / Atualizar Dashboard', 'gerarSoDashboard')
    .addItem('📋 Gerar Só Tabelas (Obras + Contratações)', 'gerarTabelasPropriedades')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚡ Slide Avulso')
      .addItem('Dashboard Operacional', 'gerarSoDashboard')
      .addItem('Preventivas', 'gerarSoPreventivas')
      .addItem('Corretivas', 'gerarSoCorretivas')
      .addItem('Backlog Geral', 'gerarSoBacklog')
      .addItem('Backlog Emergencial (Detalhe)', 'gerarSoBacklogEmergencial')
      .addItem('Chamados Pendentes (Motivos)', 'gerarSoChamadosPendentes')
      .addItem('Backlog de Clientes (Properties)', 'gerarSoBacklogClientes')
      .addItem('Recebimento de Obras', 'gerarSoRecebimentoObras')
      .addItem('Gestão de Contratações', 'gerarSoContratacoes')
      .addItem('Torre de Manutenção', 'gerarSoTorreManutencao')
      .addItem('DRE — Manutenção', 'gerarSoDREManutencao')
      .addItem('Bridge — Manutenção', 'gerarSoBridgeManutencao')
      .addItem('Bridge — Gráfico', 'gerarSoBridgeGrafico')
      .addItem('Farol de Metas', 'gerarSoMetas'))
    .addSeparator()
    .addItem('🔍 Diagnosticar Propriedades', 'diagnosticarPropriedades')
    .addItem('🔍 Conferir arquivos no editor', 'diagnosticarArquivos')
    .addItem('🔍 Diagnosticar Backlog de Clientes', 'diagnosticarBacklogClientes')
    .addItem('🧮 Conferir Backlog (estoque × fluxo)', 'conferirIdentidadeBacklog')
    .addToUi();
}

// ==========================================
// PONTOS DE ENTRADA
// ==========================================
// ==========================================
// CONFERÊNCIA DE PROJETO — roda antes de tudo
// ==========================================
/**
 * O código é colado à mão, arquivo por arquivo, então é normal o editor ficar
 * com metade de uma versão. Quando um arquivo inteiro não entra, TODAS as
 * funções dele somem e a geração devolve um `X is not defined` por slide —
 * oito erros diferentes para uma causa só.
 *
 * Esta função roda na primeira linha do pipeline e agrupa o que falta PELO
 * ARQUIVO que declara, que é a informação de que se precisa: qual recopiar.
 * Mesmo papel de _tvConferirProjeto_ em gestao-tvs/00_Main.gs (lição 6).
 *
 * Só `typeof` — nada aqui pode depender do que está faltando.
 */
const _PROP_DEPENDENCIAS_ = [
  ['00_Helpers.gs',             ['_num_', '_milhar_', '_norm_', '_sTxt', 'criarHeaderPadrao', 'criarCardPainel', '_abrirPlanilha_']],
  ['01_Config.gs',              ['CR_DESIGN_SYSTEM', 'getDeckMensal_', 'DRE_MANUTENCAO_ID', 'METAS_PROPRIEDADES', 'LOGO_LARG_PADRAO', 'LOGOS_CLIENTES']],
  ['02_Dados.gs',               ['obterMesReferencia_', 'obterIndicadoresPropriedades_', '_propLerCorretivas_', '_histNorm_', '_bdChamadoFechado_']],
  ['03_Tabelas.gs',             ['_tabRemoverPorTag_', '_tabMarcarSlide_', '_tabLerAba_', '_tabRotuloReferencia_']],
  ['04_Diagnosticos.gs',        ['diagnosticarPropriedades', 'conferirIdentidadeBacklog', 'diagnosticarBacklogClientes']],
  ['05_DadosSlides.gs',         ['obterDashboardPropriedades_', 'obterBacklogPorCC_', 'obterBacklogEmergencialDetalhe_', 'obterDadosChamadosPendentes_', 'obterDadosTorreManutencao_']],
  ['06_Logos.gs',               ['_getClienteLogoBlob_', '_insertLogoFitLegenda_']],
  ['Dados_DREManutencao.gs',    ['obterDREManutencao_']],
  ['Slide_DREManutencao.gs',    ['gerarSlideDREManutencao', '_dreFalha_', '_drePosicionarNaSecao_']],
  ['Slide_BridgeManutencao.gs', ['gerarSlideBridgeManutencao', 'gerarSlideBridgeManutencaoGrafico']],
  ['Dados_Metas.gs',            ['obterMetasCalculadas_']],
  ['Slide_Metas.gs',            ['gerarSlidesMetas', '_metaResolver_']],
  ['Slide_Corretivas.gs',       ['gerarSlideCorretivas']],
];

function _propConferirProjeto_() {
  const faltando = [];
  _PROP_DEPENDENCIAS_.forEach(par => {
    const arquivo = par[0], nomes = par[1];
    const ausentes = [];
    nomes.forEach(n => {
      let existe = false;
      try { existe = eval('typeof ' + n) !== 'undefined'; } catch (e) { existe = false; }
      if (!existe) ausentes.push(n);
    });
    if (ausentes.length) faltando.push({ arquivo: arquivo, nomes: ausentes });
  });

  if (!faltando.length) return true;

  Logger.log('======================================================');
  Logger.log('⚠ ARQUIVOS QUE FALTAM NO EDITOR — a geração vai falhar');
  Logger.log('======================================================');
  faltando.forEach(f => Logger.log('  · ' + f.arquivo + '  → ' + f.nomes.join(', ')));
  Logger.log('');
  Logger.log('Quando TODAS as funções de um arquivo somem de uma vez, ou ele não');
  Logger.log('foi colado, ou foi colado por cima de outro. Recopie e rode de novo.');
  return false;
}

// Ponto de entrada avulso, para conferir sem gerar nada.
function diagnosticarArquivos() {
  if (_propConferirProjeto_()) Logger.log('✓ Todos os arquivos esperados estão no editor.');
}

function gerarApresentacaoPropriedades() {
  // Antes de qualquer coisa: o editor tem todos os arquivos? (lição 6)
  if (!_propConferirProjeto_()) return;

  Logger.log('▶ Apresentação Mensal de Propriedades — portfólio');

  // Ordem oficial, conforme definido com o time:
  //
  //   1. Capa
  //   2. Indicadores gerais
  //   3. Preventivas
  //   4. Corretivas
  //   5. Backlog
  //   6. Backlog Emergencial — Detalhe
  //   7. Chamados Pendentes (Backlog) — por motivo
  //   8. Backlog de Clientes — Properties (com empreendimento)
  //   9. Recebimento de Obras (tabela)
  //  10. Gestão de Contratações (tabela)
  //  11. Torre de Manutenção (Capital Realty e Demercado)
  //
  const passos = [
    { nome: 'Capa',                          fn: gerarSlideCapa },
    { nome: 'Indicadores Gerais',            fn: gerarSlideIndicadoresGerais },
    { nome: 'Preventivas',                   fn: gerarSlidePreventivas },
    { nome: 'Corretivas',                    fn: gerarSlideCorretivas },
    { nome: 'Backlog',                       fn: gerarSlideBacklog },
    { nome: 'Backlog Emergencial - Detalhe', fn: gerarSlideBacklogEmergencialDetalhe },
    { nome: 'Chamados Pendentes (Backlog)',  fn: gerarSlideChamadosPendentes },
    { nome: 'Backlog de Clientes',           fn: gerarSlideBacklogClientesProperties },
    { nome: 'Recebimento de Obras',          fn: gerarSlideRecebimentoObras },
    { nome: 'Gestão de Contratações',        fn: gerarSlideContratacoes },
    { nome: 'Torre de Manutenção',           fn: gerarSlideTorreManutencao },
    { nome: 'DRE de Manutenção',             fn: gerarSlideDREManutencao },
    { nome: 'Bridge de Manutenção',          fn: gerarSlideBridgeManutencao },
    { nome: 'Bridge — Gráfico',              fn: gerarSlideBridgeManutencaoGrafico },
    { nome: 'Farol de Metas',                fn: gerarSlidesMetas }
    // { nome: 'Fotos de Serviços',       fn: gerarSlidesFotosServicos },
    // { nome: 'Encerramento',            fn: gerarSlideEncerramento }
  ];

  return _rodarPassos_(passos);
}


// Só as tabelas, para reprocessar sem mexer no resto do deck. Cada bloco
// substitui apenas os próprios slides (tag na nota), então rodar este ou o
// completo dá no mesmo para essas duas seções.
function gerarTabelasPropriedades() {
  Logger.log('▶ Tabelas de Propriedades (portfólio)');
  return _rodarPassos_([
    { nome: 'Recebimento de Obras', fn: gerarSlideRecebimentoObras },
    { nome: 'Gestão de Contratações', fn: gerarSlideContratacoes }
  ]);
}

// ==========================================
// PONTOS DE ENTRADA — SLIDES AVULSOS
// ==========================================
function gerarSoDashboard()           { return _rodarPassos_([{ nome: 'Dashboard Operacional',          fn: gerarSlideIndicadoresGerais }]); }
function gerarSoPreventivas()         { return _rodarPassos_([{ nome: 'Preventivas',                   fn: gerarSlidePreventivas }]); }
function gerarSoCorretivas()          { return _rodarPassos_([{ nome: 'Corretivas',                    fn: gerarSlideCorretivas }]); }
function gerarSoBacklog()             { return _rodarPassos_([{ nome: 'Backlog',                       fn: gerarSlideBacklog }]); }
function gerarSoBacklogEmergencial()  { return _rodarPassos_([{ nome: 'Backlog Emergencial - Detalhe', fn: gerarSlideBacklogEmergencialDetalhe }]); }
function gerarSoChamadosPendentes()   { return _rodarPassos_([{ nome: 'Chamados Pendentes (Backlog)',  fn: gerarSlideChamadosPendentes }]); }
function gerarSoBacklogClientes()     { return _rodarPassos_([{ nome: 'Backlog de Clientes',           fn: gerarSlideBacklogClientesProperties }]); }
function gerarSoRecebimentoObras()    { return _rodarPassos_([{ nome: 'Recebimento de Obras',          fn: gerarSlideRecebimentoObras }]); }
function gerarSoContratacoes()        { return _rodarPassos_([{ nome: 'Gestão de Contratações',        fn: gerarSlideContratacoes }]); }
function gerarSoTorreManutencao()     { return _rodarPassos_([{ nome: 'Torre de Manutenção',           fn: gerarSlideTorreManutencao }]); }
function gerarSoDREManutencao()       { return _rodarPassos_([{ nome: 'DRE de Manutenção',              fn: gerarSlideDREManutencao }]); }
function gerarSoBridgeManutencao()    { return _rodarPassos_([{ nome: 'Bridge de Manutenção',           fn: gerarSlideBridgeManutencao }]); }
function gerarSoBridgeGrafico()       { return _rodarPassos_([{ nome: 'Bridge — Gráfico',               fn: gerarSlideBridgeManutencaoGrafico }]); }
function gerarSoMetas()               { return _rodarPassos_([{ nome: 'Farol de Metas',                 fn: gerarSlidesMetas }]); }


// Roda cada passo isolado: slide que falha registra o erro e não derruba os
// outros — um deck parcial é mais útil que um deck que não abriu.
function _rodarPassos_(passos) {
  if (!passos.length) {
    Logger.log('  Nenhum slide no pipeline.');
    return [];
  }
  const erros = [];
  passos.forEach(p => {
    try {
      p.fn();
      Logger.log('  ✓ ' + p.nome);
    } catch (e) {
      erros.push(p.nome + ': ' + e.message);
      Logger.log('  ✗ ' + p.nome + ' — ' + e.message);
    }
  });
  if (erros.length) Logger.log('  ' + erros.length + ' slide(s) com erro.');
  return erros;
}


