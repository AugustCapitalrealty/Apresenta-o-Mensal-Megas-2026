/**
 * ARQUIVO: 05_Planilha.gs
 * CRIA A PLANILHA DE P&G (metas e projetos) — rodar UMA vez: criarPlanilhaPG().
 *
 * Carga inicial:
 *  - METAS: as 4 metas do Farol 2026 do Guilherme com a situação de SETEMBRO
 *    (textos de farol-guilherme/Farol.gs, 16/10/2026). Atualizar para o mês do deck.
 *  - PROJETOS: projetos da pasta 27 - Projetos (CLAUDE.md, 12/11/2026). Só o que
 *    é fato conhecido foi preenchido; início, prazo, avanço e status em branco
 *    ficam para a equipe preencher ("não inventar dado").
 * Se a planilha já existir na pasta, NÃO sobrescreve: só mostra o link.
 */

const PG_CAB_METAS = ['Nº', 'Meta', 'Direcionador', 'Prazo', 'Pontos', 'Real mês', 'Status mês', 'Real ano', 'Status ano',
  'Andamento', 'Próximo passo'];
const PG_CAB_PROJETOS = ['Projeto', 'Área cliente', 'Responsável', 'Início', 'Prazo', 'Avanço (%)', 'Status', 'Entregue em',
  'Próximo passo', 'Observação'];

function _pgCargaMetas_() {
  const d = (dia, mes) => new Date(2026, mes - 1, dia);
  return [
    [1, 'Plataforma de Utilities Mega Curitiba', 'Projetos', d(30, 11), 30, 'NÃO', 'Amarelo', 'NÃO', 'Amarelo',
      'Equipamentos para monitorar bombas e quadros elétricos entregues e contrato assinado. Orçamentos de instalação: ' +
      '2 visitas recebidas, falta a 3ª.',
      'Receber o 3º orçamento, equalizar as três propostas e subir a compra da instalação.'],
    [2, 'Programa de Excelência 2026', 'Projetos', d(30, 9), 25, 'SIM', 'Verde', 'SIM', 'Verde',
      'Vencedor de 2025 divulgado, book 2026 aprovado, kick off feito e inspeção in loco realizada em setembro. Meta atingida.',
      'Acompanhar o período de não aplicabilidade, aberto até 30/11/2026.'],
    [3, 'Integração das áreas: Facilities, Financeiro e Jurídico', 'Facilities · Financeiro · Jurídico', d(30, 11), 25,
      'NÃO', 'Amarelo', 'NÃO', 'Amarelo',
      'Financeiro: integração feita pela plataforma financeira dos Megas. Jurídico: integração feita; faltam os POPs ' +
      '(manuais e procedimentos).',
      'Elaborar os POPs e manuais da integração entre Facilities, Financeiro e Jurídico.'],
    [4, 'Melhoria na solicitação e controle dos reembolsos', 'Projetos', d(30, 11), 20, 'NÃO', 'Amarelo', 'NÃO', 'Amarelo',
      'Entrevistas com as áreas feitas (Wilson, Cadu, Jonatas e Ricardo) e entrevista com o Financeiro feita.',
      'Juntar a visão das áreas e a do Financeiro e montar a proposta de melhoria.']
  ];
}

function _pgCargaProjetos_() {
  const d = (dia, mes) => new Date(2026, mes - 1, dia);
  // [Projeto, Área cliente, Responsável, Início, Prazo, Avanço, Status, Entregue em, Próximo passo, Observação]
  return [
    ['Garantias Mega Curitiba F5B', 'Engenharia', '', '', d(13, 11), '', '', '',
      'Subir a base no Drive para a Engenharia, conferir o Infraspeak e pedir os termos', ''],
    ['Reembolsos: processo, manual e procedimento', 'Financeiro', '', '', d(30, 11), '', '', '',
      'Gerador do deck do diagnóstico, e-mail ao Financeiro e escopo com o Jonatas', 'Meta 2026 (meta 4)'],
    ['Garantias Mega Itajaí F4', 'Engenharia', '', '', '', 90, '', '',
      'Falta Metaro e os termos (Letícia)', '9 de 10 garantias no Infraspeak'],
    ['Revisão dos checklists do Infraspeak', 'Facilities', '', '', '', '', '', '',
      'Conversas com os gestores', 'Web App v17 no ar'],
    ['Gerador de Parecer Reputacional (Kronoos)', 'Jurídico', '', '', '', '', '', '',
      'Migrar para o Drive do Jurídico', 'v5 no ar; manual pronto'],
    ['Brigada de Cheias Mega Esteio', 'Facilities', '', '', '', '', '', '',
      'Aprovação do certificado (versão A ou B)', ''],
    ['Deck mensal de contratos de obra', 'Engenharia', '', '', '', '', '', '',
      'Rodar o gerador e conferir', ''],
    ['Agendamento: Inteligência de Mercado', 'Comercial / Marketing', '', '', '', '', '', '',
      '', 'No ar (versão 7)'],
    ['Papo com RH', 'RH', '', '', '', 100, 'Entregue', d(6, 11),
      'Sustentação', 'No ar no Drive do RH'],
    ['Pesquisa de Satisfação Interdepartamental', 'RH', '', '', '', 100, 'Entregue', '',
      '', 'Pesquisa encerrada em 28/08/2026']
  ];
}

function criarPlanilhaPG() {
  const atual = _pgPlanilha_();
  if (atual) {
    Logger.log('A planilha já existe — nada foi alterado: ' + atual.getUrl());
    PropertiesService.getScriptProperties().setProperty(PG_PROP_PLANILHA, atual.getId());
    return;
  }
  const ss = SpreadsheetApp.create(PG_PLANILHA_NOME);
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(PG_PASTA_ID));

  // CONFIG
  const cfg = ss.getSheets()[0].setName('CONFIG');
  cfg.getRange('A1:B1').setValues([['Situação de metas e projetos em', 'SETEMBRO 2026']]);
  cfg.getRange('A2:B2').setValues([['', 'Mês a que as abas METAS e PROJETOS se referem. Atualizar junto com elas; ' +
    'se for diferente do mês do export, o deck avisa no rodapé.']]);
  cfg.getRange('A1').setFontWeight('bold');
  cfg.setColumnWidth(1, 240); cfg.setColumnWidth(2, 420);

  const montar = (nome, cab, linhas, larguras) => {
    const sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold')
      .setBackground(CR_DESIGN_SYSTEM.brandDark).setFontColor('#FFFFFF');
    if (linhas.length) sh.getRange(2, 1, linhas.length, cab.length).setValues(linhas);
    sh.setFrozenRows(1);
    larguras.forEach((w, i) => sh.setColumnWidth(i + 1, w));
    sh.getRange(2, 1, Math.max(linhas.length, 1) + 40, cab.length).setVerticalAlignment('top').setWrap(true);
    return sh;
  };

  const metas = montar('METAS', PG_CAB_METAS, _pgCargaMetas_(), [40, 260, 160, 90, 60, 70, 90, 70, 90, 360, 300]);
  const regraStatusMeta = SpreadsheetApp.newDataValidation().requireValueInList(['Verde', 'Amarelo', 'Vermelho'], true).build();
  metas.getRange('G2:G60').setDataValidation(regraStatusMeta);
  metas.getRange('I2:I60').setDataValidation(regraStatusMeta);
  metas.getRange('D2:D60').setNumberFormat('dd/mm/yyyy');

  const proj = montar('PROJETOS', PG_CAB_PROJETOS, _pgCargaProjetos_(), [260, 140, 130, 90, 90, 80, 110, 90, 320, 260]);
  proj.getRange('G2:G200').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['No prazo', 'Atenção', 'Atrasado', 'Entregue', 'Pausado', 'Não iniciado'], true).build());
  proj.getRange('D2:E200').setNumberFormat('dd/mm/yyyy');
  proj.getRange('H2:H200').setNumberFormat('dd/mm/yyyy');

  PropertiesService.getScriptProperties().setProperty(PG_PROP_PLANILHA, ss.getId());
  Logger.log('✓ Planilha criada: ' + ss.getUrl());
  Logger.log('  Preencher em PROJETOS: início, prazo, avanço e status. Em METAS e CONFIG!B1: situação do mês do deck.');
}
