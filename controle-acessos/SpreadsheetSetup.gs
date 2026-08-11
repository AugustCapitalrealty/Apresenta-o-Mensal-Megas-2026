/**
 * SpreadsheetSetup.gs — funções de configuração da planilha (rode uma vez cada):
 *
 *   criarPlanilha()             cria uma planilha nova (Config + Dados).
 *   prepararColunasAcumulado()  ajusta a aba Dados existente: coluna M = Fluxo
 *                               Acum. e cria N = Tempo Acum. (p/ o comparativo).
 *   criarAbasComplementares()   cria as abas Tipo Acesso, Perfil, Ranking,
 *                               Participacao, Agendamento, Cards Clientes e
 *                               Horário de Pico, com exemplos para preencher.
 *
 * A geração da apresentação calcula tudo em JavaScript ao ler a planilha.
 */

/**
 * Cria uma planilha nova do zero com apenas Config e Dados.
 * Após rodar: copie o ID que aparece no Logger e cole em SPREADSHEET_ID no Main.gs.
 */
function criarPlanilha() {
  var ss = SpreadsheetApp.create('Controle de Acessos — Megas Capital Realty');

  // ── Config ──
  var cfg = ss.getActiveSheet().setName('Config');
  cfg.getRange('A1:C1').setValues([['Chave', 'Valor', 'Descrição']]);
  cfg.getRange('A1:C1').setBackground('#151E49').setFontColor('#FFFFFF').setFontWeight('bold');
  cfg.getRange('A2:C4').setValues([
    ['mesAno',      '05/2026', 'Mês do relatório — MM/AAAA (ex: 06/2026). Deve ser igual ao que digitou na aba Dados.'],
    ['mesAnterior', 'abril',   'Mês anterior por extenso (ex: maio). Usado nos textos do relatório.'],
    ['perfilTitulo','Informação acumulada: 2026', 'Subtítulo do slide Perfil de Solicitações.'],
  ]);
  cfg.getRange('B2:B4').setBackground('#FFFDE7').setFontWeight('bold');
  cfg.setColumnWidth(1, 160);
  cfg.setColumnWidth(2, 180);
  cfg.setColumnWidth(3, 480);

  // ── Dados ──
  var dados = ss.insertSheet('Dados');
  dados.getRange('A1').setValue(
    'Fonte: PAINEL INDICADORES — copie os valores aqui. Colunas N–U calculadas automaticamente.'
  ).setFontStyle('italic').setFontColor('#555555');

  var hdr = [
    'Mês','Empreendimento','Fluxo Total','Colaboradores\nFixos',
    'Tempo Médio\n(MM:SS)','Uso Celular\n(%)','Fila\nEvitada',
    'Acesso\n≤5min (%)','Acesso\n≤10min (%)','Cancela\n(%)','Agendado\n(%)','Pré-Aut.\n(%)',
    'Fluxo Acum.\n(ano)','Tempo Acum.\n(ano)',
  ];
  dados.getRange(2, 1, 1, hdr.length).setValues([hdr]);
  dados.getRange(2, 1, 1, hdr.length)
    .setBackground('#151E49').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(9).setWrap(true);
  dados.setRowHeight(2, 44);
  dados.getRange(2, 13, 1, 2).setBackground('#1565C0'); // colunas de acumulado

  dados.getRange('B:B').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'])
      .setAllowInvalid(false).build()
  );

  dados.getRange(2, 1).setNote(
    'TODO MÊS: adicione 3 linhas ao final (uma por Mega).\n\n' +
    '── COPIAR DO PAINEL INDICADORES ──\n' +
    'A  Mês           ex: 06/2026\n' +
    'B  Empreendimento (escolha da lista)\n' +
    'C  Fluxo Total\n' +
    'E  Tempo Médio   ex: 05:46\n' +
    'F  Uso Celular   ex: 89,86%\n' +
    'H  Acesso ≤5min\n' +
    'I  Acesso ≤10min\n' +
    'J  Cancela\n' +
    'K  Agendado\n' +
    'L  Pré-Aut.\n\n' +
    '── MANUAL ──\n' +
    'D  Colaboradores Fixos\n' +
    'G  Fila Evitada (ou deixe 0)\n' +
    'M  Fluxo Acum. (ano)  — fluxo acumulado do ano até o mês\n' +
    'N  Tempo Acum. (ano)  — tempo médio acumulado do ano (ex 05m46s)\n\n' +
    'O comparativo 2025×2026 usa M e N: mês atual vs. mesmo mês\n' +
    'do ano anterior (ex 05/2026 × 05/2025).'
  );

  dados.setFrozenRows(2);
  dados.setFrozenColumns(2);
  dados.getRange('A:A').setNumberFormat('@');
  dados.getRange('N:N').setNumberFormat('@'); // tempo acumulado como texto

  // Remove aba padrão vazia se existir
  ['Sheet1','Página1','Planilha1'].forEach(function(n) {
    var v = ss.getSheetByName(n); if (v) ss.deleteSheet(v);
  });

  var id = ss.getId();
  Logger.log('==============================================');
  Logger.log('PLANILHA CRIADA — cole este ID no Main.gs:');
  Logger.log('SPREADSHEET_ID = \'' + id + '\'');
  Logger.log(ss.getUrl());
  Logger.log('==============================================');
  return id;
}

/**
 * Ajusta a aba Dados existente para o Comparativo 2025×2026:
 *   • Renomeia a coluna M ("Var. Anual") para "Fluxo Acum. (ano)"
 *     — onde você já coloca o fluxo acumulado do ano até o mês.
 *   • Cria a coluna N "Tempo Acum. (ano)" para você preencher o
 *     tempo médio acumulado do ano (ex: 05m46s ou 05:46).
 *   • Limpa as colunas de fórmula antigas (N–U), que não são usadas.
 *
 * O comparativo passa a ser calculado: mês atual (ex 05/2026) contra
 * o mesmo mês do ano anterior (05/2025), lendo essas duas colunas.
 */
function prepararColunasAcumulado() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aba = ss.getSheetByName('Dados');
  if (!aba) throw new Error('Aba "Dados" não encontrada na planilha ' + SPREADSHEET_ID);

  var maxR = aba.getMaxRows();

  // Limpa o bloco de fórmulas antigo (colunas N–U, a partir da linha 3 de dados)
  aba.getRange(3, 14, maxR - 2, 8).clearContent();

  // Cabeçalhos (na aba Dados o header fica na LINHA 2)
  aba.getRange(2, 13).setValue('Fluxo Acum.\n(ano)');   // M
  aba.getRange(2, 14).setValue('Tempo Acum.\n(ano)');   // N
  aba.getRange(2, 13, 1, 2)
    .setBackground('#1565C0').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(9).setWrap(true);

  // Coluna N (tempo acumulado) como texto, para aceitar "05m46s"/"05:46"
  aba.getRange(3, 14, maxR - 2, 1).setNumberFormat('@');

  aba.getRange(2, 13).setNote(
    'COMPARATIVO 2025×2026 (calculado automaticamente)\n\n' +
    'M  Fluxo Acum. (ano): fluxo acumulado do ano até este mês.\n' +
    'N  Tempo Acum. (ano): tempo médio acumulado do ano (ex 05m46s).\n\n' +
    'O comparativo usa o mês atual vs. o MESMO mês do ano anterior\n' +
    '(ex: 05/2026 × 05/2025). Preencha as duas linhas para cada Mega.'
  );

  SpreadsheetApp.flush();
  Logger.log('✓ Colunas de acumulado prontas (M = Fluxo Acum., N = Tempo Acum.): ' + ss.getUrl());
}


// ── Helper compartilhado: cria uma aba formatada (pula se já existir) ──
function _criarAba(ss, nome, headers, rows, note) {
  if (ss.getSheetByName(nome)) {
    Logger.log('• "' + nome + '" já existe — apague-a antes se quiser recriar.');
    return null;
  }
  var aba = ss.insertSheet(nome);
  // Formatos de texto ANTES de escrever (evita "05/2026"→data, "04:12"→hora)
  aba.getRange(1, 1, 1, headers.length).setNumberFormat('@');
  aba.getRange(1, 1, 1, headers.length).setValues([headers]);
  aba.getRange(1, 1, 1, headers.length)
    .setBackground('#151E49').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(9).setWrap(true);
  aba.setRowHeight(1, 38);
  if (rows && rows.length) aba.getRange(2, 1, rows.length, headers.length).setValues(rows);
  aba.setFrozenRows(1);
  if (note) aba.getRange(1, 1).setNote(note);
  return aba;
}

/**
 * Aba ÚNICA de clientes — 1 linha por cliente / empreendimento / mês.
 * Alimenta 3 slides: Participação no fluxo, % Agendado por cliente e Cards.
 * O script calcula: participação (= acessos ÷ total), tempo do mês anterior,
 * rankings e totais. Você só digita Acessos, Tempo Médio e Agendado.
 */
function criarAbaClientes() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hdr = ['Mês', 'Empreendimento', 'Cliente', 'Acessos', 'Tempo Médio\n(MM:SS)', 'Pré-aprovado\n(%)', 'Agendado\n(%)'];

  var rows = [
    // Exemplo: abril e maio/2026 (2 meses → mostra variação de tempo/participação)
    // Colunas: Mês, Emp, Cliente, Acessos, Tempo, Pré-aprovado(%), Agendado(%)
    ['04/2026', 'Mega Curitiba', 'Assaí',         16980, '07:30', 58, 0],
    ['04/2026', 'Mega Curitiba', 'Atacadão',      13110, '09:15', 51, 0],
    ['04/2026', 'Mega Curitiba', 'Makro',         10240, '08:45', 44, 0],
    ['05/2026', 'Mega Curitiba', 'Assaí',         18420, '04:12', 62, 0],
    ['05/2026', 'Mega Curitiba', 'Atacadão',      14592, '05:08', 55, 0],
    ['05/2026', 'Mega Curitiba', 'Makro',         11840, '06:22', 48, 0],
    ['04/2026', 'Mega Itajaí',   'Leroy Merlin',   7480, '06:52', 64, 0],
    ['04/2026', 'Mega Itajaí',   'C&C',            5610, '07:40', 54, 0],
    ['05/2026', 'Mega Itajaí',   'Leroy Merlin',   8202, '04:38', 68, 0],
    ['05/2026', 'Mega Itajaí',   'C&C',            6151, '05:22', 58, 0],
    ['04/2026', 'Mega Esteio',   'Grupo Zaffari',  1580, '05:44', 67, 0],
    ['05/2026', 'Mega Esteio',   'Grupo Zaffari',  1759, '03:18', 71, 0],
  ];

  var aba = _criarAba(ss, 'Clientes', hdr, rows,
    'CLIENTES — uma linha por cliente, empreendimento e mês.\n\n' +
    'Você digita só:\n' +
    'D  Acessos          nº de acessos do cliente no mês\n' +
    'E  Tempo Médio      ex 04:12 (MM:SS)\n' +
    'F  Pré-aprovado (%) % de pré-aprovações do cliente\n' +
    'G  Agendado (%)     % de eventos agendados do cliente\n\n' +
    'O script calcula sozinho: participação no fluxo (acessos ÷ total do\n' +
    'Mega), tempo do mês anterior, ranking de clientes e totais.');
  if (!aba) return;

  aba.getRange('A:A').setNumberFormat('@');  // Mês como texto
  aba.getRange('E:E').setNumberFormat('@');  // Tempo como texto
  aba.getRange(2, 2, aba.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'])
      .setAllowInvalid(false).build()
  );
  aba.setColumnWidth(3, 160);

  SpreadsheetApp.flush();
  Logger.log('✓ Aba "Clientes" criada: ' + ss.getUrl());
}

/**
 * Aba Veículos — 1 linha por tipo de veículo / empreendimento / mês.
 * O script deriva: % por tipo (slide Tipo de acesso), ranking mensal
 * (top 3 do mês) e ranking anual (top 3 acumulado do ano até o mês).
 */
function criarAbaVeiculos() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hdr = ['Mês', 'Empreendimento', 'Tipo Veículo', 'Acessos'];

  var rows = [
    ['04/2026', 'Mega Curitiba', 'CARRO',             28400],
    ['04/2026', 'Mega Curitiba', 'CAMINHÃO COM BAÚ',   8920],
    ['04/2026', 'Mega Curitiba', 'MOTO',               5180],
    ['04/2026', 'Mega Curitiba', 'UTILITÁRIO',          4640],
    ['04/2026', 'Mega Curitiba', 'VAN',                 2760],
    ['04/2026', 'Mega Itajaí',   'CARRO',              12200],
    ['04/2026', 'Mega Itajaí',   'CAMINHÃO COM BAÚ',    4120],
    ['04/2026', 'Mega Itajaí',   'MOTO',                2440],
    ['04/2026', 'Mega Esteio',   'CARRO',               3840],
    ['04/2026', 'Mega Esteio',   'CAMINHÃO COM BAÚ',    1240],
    ['04/2026', 'Mega Esteio',   'MOTO',                 720],
    ['05/2026', 'Mega Curitiba', 'CARRO',              30120],
    ['05/2026', 'Mega Curitiba', 'CAMINHÃO COM BAÚ',    9240],
    ['05/2026', 'Mega Curitiba', 'MOTO',                5480],
    ['05/2026', 'Mega Curitiba', 'UTILITÁRIO',          4920],
    ['05/2026', 'Mega Curitiba', 'VAN',                 2940],
    ['05/2026', 'Mega Itajaí',   'CARRO',              13100],
    ['05/2026', 'Mega Itajaí',   'CAMINHÃO COM BAÚ',    4380],
    ['05/2026', 'Mega Itajaí',   'MOTO',                2620],
    ['05/2026', 'Mega Esteio',   'CARRO',               4080],
    ['05/2026', 'Mega Esteio',   'CAMINHÃO COM BAÚ',    1360],
    ['05/2026', 'Mega Esteio',   'MOTO',                 770],
  ];

  var aba = _criarAba(ss, 'Veículos', hdr, rows,
    'VEÍCULOS — 1 linha por tipo de veículo, empreendimento e mês.\n\n' +
    'Você digita só:\n' +
    'C  Tipo Veículo  ex: CARRO, MOTO, CAMINHÃO COM BAÚ, UTILITÁRIO, VAN\n' +
    'D  Acessos       nº de acessos desse tipo no mês\n\n' +
    'O script calcula: % por tipo (slide Tipo de acesso),\n' +
    'ranking do mês (top 3, com delta vs mês anterior) e\n' +
    'ranking anual (top 3, acumulado do ano até o mês).');
  if (!aba) return;

  aba.getRange('A:A').setNumberFormat('@');
  aba.getRange(2, 2, aba.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'])
      .setAllowInvalid(false).build()
  );
  aba.setColumnWidth(3, 200);

  SpreadsheetApp.flush();
  Logger.log('✓ Aba "Veículos" criada: ' + ss.getUrl());
}

/**
 * Aba Perfil — 1 linha por mês com os 3 percentuais de perfil de solicitações.
 * O script computa automaticamente: período anterior e média 12 meses.
 */
function criarAbaPerfil() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hdr = ['Mês', '% Motorista', '% Visitante', '% Ajudante'];

  var rows = [
    ['04/2026', 44.7, 23.6, 31.7],
    ['05/2026', 40.8, 24.5, 34.7],
  ];

  var aba = _criarAba(ss, 'Perfil', hdr, rows,
    'PERFIL DE SOLICITAÇÕES — 1 linha por mês (todos os Megas combinados).\n\n' +
    'Você digita só os 3 percentuais do mês:\n' +
    'B  % Motorista\n' +
    'C  % Visitante\n' +
    'D  % Ajudante\n\n' +
    'O script calcula automaticamente o período anterior e a média 12 meses.\n' +
    'Os valores devem somar 100%.');
  if (!aba) return;

  aba.getRange('A:A').setNumberFormat('@');

  SpreadsheetApp.flush();
  Logger.log('✓ Aba "Perfil" criada: ' + ss.getUrl());
}

/**
 * Aba Horário — 1 linha por empreendimento / mês, colunas 00–23 com
 * o nº de acessos em cada hora. Alimenta o slide Horário de pico.
 */
function criarAbaHorario() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hdr = ['Mês', 'Empreendimento',
    '00','01','02','03','04','05','06','07','08','09','10','11',
    '12','13','14','15','16','17','18','19','20','21','22','23'];

  var rows = [
    // Curitiba 05/2026 — pico às 10h e 14h
    ['05/2026', 'Mega Curitiba',
      0,0,0,0,0,0, 320,1240,2180,3440,4820,3960, 2740,1860,4120,3480,2640,1920, 1120,640,280,120,40,0],
    // Itajaí 05/2026
    ['05/2026', 'Mega Itajaí',
      0,0,0,0,0,0, 140,520,940,1480,2060,1720, 1180,800,1760,1500,1140,820, 480,280,120,60,20,0],
    // Esteio 05/2026
    ['05/2026', 'Mega Esteio',
      0,0,0,0,0,0, 40,160,280,440,620,520, 360,240,530,450,340,240, 140,80,36,18,6,0],
  ];

  var aba = _criarAba(ss, 'Horário', hdr, rows,
    'HORÁRIO DE PICO — 1 linha por empreendimento e mês.\n\n' +
    'Colunas 00–23: nº de acessos em cada hora do dia.\n' +
    'Preencha só as horas com movimento (normalmente 06–20).\n' +
    'O script identifica automaticamente o pico, 2º e 3º horários.');
  if (!aba) return;

  aba.getRange('A:A').setNumberFormat('@');
  aba.getRange(2, 2, aba.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'])
      .setAllowInvalid(false).build()
  );

  SpreadsheetApp.flush();
  Logger.log('✓ Aba "Horário" criada: ' + ss.getUrl());
}
