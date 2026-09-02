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
      .addItem('Torre de Manutenção', 'gerarSoTorreManutencao'))
    .addSeparator()
    .addItem('🔍 Diagnosticar Propriedades', 'diagnosticarPropriedades')
    .addToUi();
}

// ==========================================
// PONTOS DE ENTRADA
// ==========================================
function gerarApresentacaoPropriedades() {
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
    { nome: 'Torre de Manutenção',           fn: gerarSlideTorreManutencao }
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


// ==========================================
// DIAGNÓSTICO — O QUE FALTA PARA O PROJETO RODAR
// ==========================================
// Mesmo espírito do diagnosticarBacklog() dos Megas: antes de qualquer
// conta, dizer se a configuração está de pé. Rode isto primeiro.
function diagnosticarPropriedades() {
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — Apresentação Mensal de Propriedades');
  Logger.log('======================================================');

  const pend = [];

  Logger.log('\nDeck de destino:');
  if (!DECK_PROPRIEDADES_ID) {
    Logger.log('  · sem DECK_PROPRIEDADES_ID em 01_Config.gs');
    pend.push('DECK_PROPRIEDADES_ID sem ID');
  } else {
    try {
      const d = SlidesApp.openById(DECK_PROPRIEDADES_ID);
      Logger.log('  ✓ "' + d.getName() + '" (' + d.getSlides().length + ' slides)');
    } catch (e) {
      Logger.log('  ✗ não abriu: ' + e.message);
      pend.push('deck inacessível');
    }
  }

  Logger.log('\nFontes de dados:');
  [['BD-CORRETIVAS', BD_CORRETIVAS_ID],
   ['Histórico Validado', HISTORICO_VALIDADO_ID],
   ['Planilha de Propriedades', PROPRIEDADES_SPREADSHEET_ID],
   ['Torre Manutenção (CR)', typeof TORRE_MANUTENCAO_CR_ID !== 'undefined' ? TORRE_MANUTENCAO_CR_ID : ''],
   ['Torre Manutenção (Demercado)', typeof TORRE_MANUTENCAO_DEMERCADO_ID !== 'undefined' ? TORRE_MANUTENCAO_DEMERCADO_ID : '']
  ].forEach(([nome, id]) => {
    if (!id) { Logger.log('  · ' + nome + ' — sem ID configurado'); pend.push(nome + ' sem ID'); return; }
    try {
      const ss = SpreadsheetApp.openById(id);
      Logger.log('  ✓ ' + nome + ' — "' + ss.getName() + '" (' + ss.getSheets().length + ' abas)');
    } catch (e) {
      Logger.log('  ✗ ' + nome + ' — não abriu: ' + e.message);
      pend.push(nome + ' inacessível');
    }
  });

  Logger.log('\n' + (pend.length
    ? 'PENDÊNCIAS (' + pend.length + '):\n    ' + pend.join('\n    ')
    : 'Configuração completa. Rode gerarApresentacaoPropriedades().'));
}
