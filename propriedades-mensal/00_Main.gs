/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Orquestrador da Apresentação Mensal de Propriedades
 *
 * Mesma estrutura de megas-mensal/00_Main.gs: um array `passos` com os
 * slides na ordem, e um laço que roda cada um isolado — slide que falha
 * registra o erro e não derruba os outros.
 *
 * ESTADO: pipeline VAZIO. Nenhum slide implementado ainda. Rodar agora só
 * diz o que falta configurar — de propósito: um deck com dado inventado é
 * pior que deck nenhum.
 *
 * COMO ACRESCENTAR UM SLIDE
 *   1. Crie Slide_<Nome>.gs com uma função gerarSlide<Nome>().
 *   2. Acrescente { nome: '<Nome>', fn: gerarSlide<Nome> } em `passos`.
 *   3. Leia os dados por uma função de 02_Dados.gs, não direto da planilha
 *      dentro do slide — é o que permite testar sem abrir o Slides.
 */


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
// O menu do editor do Apps Script só lista funções SEM parâmetro — por isso
// uma entrada por propriedade, sem argumento.
//
// A criar conforme PROPRIEDADES for preenchido em 01_Config.gs, no padrão:
//   function gerarPropriedadeCuritiba() {
//     setPropriedadeAtiva('CURITIBA');
//     gerarApresentacaoPropriedades_();
//   }

function gerarTodasAsPropriedades() {
  const chaves = Object.keys(PROPRIEDADES);
  if (!chaves.length) {
    Logger.log('Nenhuma propriedade cadastrada em PROPRIEDADES (01_Config.gs).');
    return;
  }
  chaves.forEach(c => {
    setPropriedadeAtiva(c);
    gerarApresentacaoPropriedades_();
  });
}


// ==========================================
// TABELAS — PONTO DE ENTRADA DO PORTFÓLIO
// ==========================================
// Separado do pipeline por imóvel de propósito: Recebimento de Obras e Gestão
// de Contratações são do PORTFÓLIO inteiro, não de um empreendimento. Chamá-los
// de dentro de gerarApresentacaoPropriedades_ faria os slides serem gerados de
// novo a cada imóvel do laço acima — três vezes a mesma tabela, e as duas
// últimas apagando a anterior pela tag.
//
// Escrevem em DECK_PROPRIEDADES_ID (01_Config.gs), que é o deck mensal único.
function gerarTabelasPropriedades() {
  Logger.log('▶ Tabelas de Propriedades (portfólio)');

  const passos = [
    { nome: 'Recebimento de Obras', fn: gerarSlideRecebimentoObras },
    { nome: 'Gestão de Contratações', fn: gerarSlideContratacoes }
  ];

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
// PIPELINE
// ==========================================
function gerarApresentacaoPropriedades_() {
  const prop = getPropriedadeAtiva();
  Logger.log('▶ Gerando apresentação de ' + prop.nome);

  // Ordem oficial da apresentação, conforme definido com o time:
  //
  //   1. Indicadores gerais
  //   2. Preventivas — previstas, realizadas e SLA, mês e acumulado do ano
  //   3. Corretivas — abertas e fechadas no mês
  //   4. Backlog — quantos chamados, com detalhe
  //   5. Fotos de serviços
  //
  // Cada seção tem o corte Megas x demais imóveis e, nas preventivas, também
  // o corte Propriedades x Facilities (_propEquipePreventiva_, 02_Dados.gs).
  //
  // Descomente conforme cada slide for implementado. Os dados de 2, 3 e 4 já
  // existem em 02_Dados.gs — falta só o desenho.
  const passos = [
    // { nome: 'Capa',                  fn: gerarSlideCapa },
    // { nome: 'Indicadores Gerais',    fn: gerarSlideIndicadoresGerais },
    // { nome: 'Preventivas',           fn: gerarSlidePreventivas },
    //     dados: indicadoresPortfolio_ / indicadoresAcumulado_ / indicadoresPorEquipe_
    // { nome: 'Corretivas',            fn: gerarSlideCorretivas },
    //     dados: fluxo do mês na BD-CORRETIVAS (abertas x fechadas)
    // { nome: 'Backlog',               fn: gerarSlideBacklog },
    //     dados: backlogPorCC_ (regra _histAbertoNoMes_, a mesma dos Megas)
    // { nome: 'Backlog — Detalhe',     fn: gerarSlideBacklogDetalhe },
    // { nome: 'Fotos de Serviços',     fn: gerarSlidesFotosServicos },
    // { nome: 'Encerramento',          fn: gerarSlideEncerramento }
  ];

  if (!passos.length) {
    Logger.log('  Pipeline vazio — nenhum slide implementado ainda. ' +
               'Ver o README da pasta para o que falta definir.');
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

  const chaves = Object.keys(PROPRIEDADES);
  Logger.log('\nPropriedades cadastradas: ' + (chaves.length || 'NENHUMA'));
  if (!chaves.length) {
    pend.push('preencher PROPRIEDADES em 01_Config.gs');
  } else {
    chaves.forEach(c => {
      const p = PROPRIEDADES[c];
      const falta = [];
      if (!p.ccBD) falta.push('ccBD');
      if (!p.presentationId) falta.push('presentationId');
      Logger.log('  ' + (falta.length ? '· ' : '✓ ') + c + ' — ' + p.nome +
                 (falta.length ? '  (falta: ' + falta.join(', ') + ')' : ''));
      if (falta.length) pend.push(c + ': ' + falta.join(', '));
    });
  }

  Logger.log('\nFontes de dados:');
  [['BD-CORRETIVAS', BD_CORRETIVAS_ID],
   ['Histórico Validado', HISTORICO_VALIDADO_ID],
   ['Planilha de Propriedades', PROPRIEDADES_SPREADSHEET_ID]
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
    : 'Configuração completa. Pode implementar o primeiro slide.'));
}
