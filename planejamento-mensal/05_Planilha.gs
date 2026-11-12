/**
 * ARQUIVO: 05_Planilha.gs
 * CRIA A PLANILHA DE P&G (metas e projetos) — rodar UMA vez: criarPlanilhaPG().
 *
 * Carga inicial:
 *  - METAS: as 4 metas do Farol 2026 do Guilherme com a situação de SETEMBRO
 *    (textos de farol-guilherme/Farol.gs, 16/10/2026). Atualizar para o mês do deck.
 *  - PROJETOS: LISTA dos projetos feitos no ano (Guilherme, 12/11/2026: a seção
 *    03 é só essa lista). Carga com o que está registrado (ENTREGAS.md, CLAUDE.md
 *    da pasta 27, Farol); data de conclusão em branco quando não registrada.
 * gerarApresentacaoPG() chama esta função sozinho se a planilha não existir.
 * Se a planilha já existir na pasta, NÃO sobrescreve: só mostra o link.
 */

const PG_CAB_METAS = ['Nº', 'Meta', 'Direcionador', 'Prazo', 'Pontos', 'Real mês', 'Status mês', 'Real ano', 'Status ano',
  'Andamento', 'Próximo passo'];
const PG_CAB_PROJETOS = ['Projeto', 'Área cliente', 'Situação', 'Concluído em', 'O que foi feito'];

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
  // [Projeto, Área cliente, Situação, Concluído em, O que foi feito]
  // Só fatos registrados (ENTREGAS.md, CLAUDE.md da pasta 27, Farol). Data em branco = não registrada.
  return [
    ['Pesquisa de Satisfação Interdepartamental', 'RH', 'Concluído', d(28, 8),
      'Plataforma da pesquisa (formulário e painel do RH) criada e aplicada entre as áreas. Pesquisa encerrada em 28/08.'],
    ['Papo com RH', 'RH', 'Concluído', d(6, 11),
      'Site de inscrição com painel em planilha, lista de espera, convite com sala e Meet, e-mails do RH e relatório mensal em PDF. Manual POP entregue.'],
    ['Agendamento: Apresentação de Inteligência de Mercado', 'Comercial / Marketing', 'Concluído', '',
      'Web App de inscrições integrado a Planilhas e Google Agenda. No ar (versão 7).'],
    ['Reembolsos: processo, manual e procedimento', 'Financeiro', 'Em andamento', '',
      'Entrevistas com as áreas e com o Financeiro; análise e deck do diagnóstico. Meta 2026.'],
    ['Garantias Mega Itajaí F4', 'Engenharia', 'Em andamento', '',
      'Garantias dos contratos e do manual do locatário viram avisos no Infraspeak: 9 de 10 cadastradas.'],
    ['Garantias Mega Curitiba F5B', 'Engenharia', 'Em andamento', '',
      'Manual lido; base para a Engenharia e planilha para o Infraspeak prontas.'],
    ['Revisão dos checklists do Infraspeak', 'Facilities', 'Em andamento', '',
      'Diagnóstico de todos os checklists (sentido, frequência e lacunas) num Web App (v17).'],
    ['Gerador de Parecer Reputacional (Kronoos)', 'Jurídico', 'Em andamento', '',
      'Parecer gerado no Google Docs a partir do Kronoos (v5 no ar, manual pronto). Falta migrar para o Drive do Jurídico.'],
    ['Brigada de Cheias Mega Esteio', 'Facilities', 'Em andamento', '',
      'Certificado, procedimento, cartaz e vídeo da brigada. Certificado aguardando aprovação.'],
    ['Deck mensal de contratos de obra', 'Engenharia', 'Em andamento', '',
      'Gerador do deck mensal de contratos de obra (Mega Curitiba, Fase 7) no Google Slides.'],
    ['Apresentações gerenciais mensais', 'Diretoria', 'Em andamento', '',
      'Geração automática dos decks mensais dos Megas (Curitiba, Esteio, Itajaí), de Propriedades e de P&G.']
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

  const proj = montar('PROJETOS', PG_CAB_PROJETOS, _pgCargaProjetos_(), [300, 160, 120, 110, 520]);
  proj.getRange('C2:C200').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Concluído', 'Em andamento', 'Pausado'], true).build());
  proj.getRange('D2:D200').setNumberFormat('dd/mm/yyyy');

  PropertiesService.getScriptProperties().setProperty(PG_PROP_PLANILHA, ss.getId());
  Logger.log('✓ Planilha criada: ' + ss.getUrl());
  Logger.log('  Conferir PROJETOS (situação, data de conclusão, o que foi feito) e METAS + CONFIG!B1 (situação do mês do deck).');
}
