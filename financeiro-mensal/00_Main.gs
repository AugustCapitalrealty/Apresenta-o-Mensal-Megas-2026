/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Orquestrador da Apresentação Mensal do Financeiro
 *
 * Mesma estrutura de propriedades-mensal/00_Main.gs e megas-mensal/00_Main.gs:
 * um array `passos` com os slides na ordem, e um laço que roda cada um
 * isolado — slide que falha é removido e substituído por um placeholder.
 *
 * Os slides temáticos são gerados somente a partir dos contratos de
 * 02_Dados.gs — slide com dado inventado é pior que slide nenhum.
 *
 * COMO ACRESCENTAR UM SLIDE
 *   1. Crie Slide<N>_<Nome>.gs com uma função gerarSlide<Nome>().
 *   2. Acrescente { nome: '<Nome>', fn: gerarSlide<Nome> } em `passos`.
 *   3. Leia os dados por uma função de 02_Dados.gs, não direto da planilha
 *      dentro do slide.
 */

function gerarApresentacaoFinanceiro() {
  Logger.log('▶ Apresentação Mensal do Financeiro');
  return _rodarPassos_(_passosApresentacaoFinanceiro_());
}

function _passosApresentacaoFinanceiro_() {
  return [
    // Ordem do PDF "Resultado Junho 2026": 55 páginas. As closures são
    // usadas só nos geradores parametrizados; cada passo continua isolado,
    // portanto uma aba ausente não impede os demais slides de serem criados.
    { nome: '01 · Capa', fn: gerarSlideCapa },
    { nome: '02 · Agenda', fn: gerarSlideAgendaResultados },
    { nome: '03 · Meta Diretoria', fn: gerarSlideMetaDiretoria },
    { nome: '04 · Meta Gerência Financeira', fn: gerarSlideMetaGerenciaFinanceira },
    { nome: '05 · Resumo do Resultado', fn: gerarSlideResumoResultado },
    { nome: '06 · Capa Demercado', fn: gerarSlideCapaDemercado },
    { nome: '07 · DRE Demercado', fn: gerarSlideDREDemercado },
    { nome: '08 · Receitas Demercado', fn: gerarSlideReceitasDemercadoCompleto },
    { nome: '09 · Composição Demercado', fn: gerarSlideComposicaoDemercadoCompleto },
    { nome: '10 · Despesas Demercado', fn: gerarSlideDespesasDemercadoCompleto },
    { nome: '11 · Vacância Demercado', fn: gerarSlideVacanciaDemercadoCompleto },
    { nome: '12 · Contratos Demercado', fn: gerarSlideContratosDemercadoCompleto },
    { nome: '13 · Capa Capital Realty', fn: gerarSlideCapaCapitalRealty },
    { nome: '14 · DRE Capital Realty', fn: gerarSlideDRECapitalRealty },
    { nome: '15 · Receitas Capital Realty', fn: gerarSlideReceitasCapitalRealty },
    { nome: '16 · Composição Capital Realty', fn: gerarSlideComposicaoCapitalRealty },
    { nome: '17 · Despesas Capital Realty', fn: gerarSlideDespesasCapitalRealty },
    { nome: '18 · Vacância Capital Realty', fn: gerarSlideVacanciaCapitalRealty },
    { nome: '19 · Contratos Capital Realty', fn: gerarSlideContratosCapitalRealty },
    { nome: '20 · Capa Locação Consolidada', fn: gerarSlideCapaLocacaoConsolidada },
    { nome: '21 · Composição Locação Consolidada', fn: gerarSlideComposicaoLocacaoConsolidada },
    { nome: '22 · Vacância Locação Consolidada', fn: gerarSlideVacanciaLocacaoConsolidada },
    { nome: '23 · Capa Indicadores', fn: gerarSlideCapaIndicadoresFinanceiros },
    { nome: '24 · Endividamento', fn: gerarSlideEndividamento },
    { nome: '25 · Prazo de Pagamento', fn: gerarSlidePrazoPagamento },
    { nome: '26 · Prazo de Recebimento', fn: gerarSlidePrazoRecebimento },
    { nome: '27 · Liquidez Corrente', fn: gerarSlideLiquidezCorrente },
    { nome: '28 · Margem EBITDA', fn: gerarSlideMargemEbitdaIndicador },
    { nome: '29 · Capa Anexos', fn: gerarSlideCapaAnexos },
    { nome: '30 · Fluxo de Caixa Demercado', fn: gerarSlideFluxoCaixaDemercado },
    { nome: '31 · Fluxo de Caixa CR Infra', fn: gerarSlideFluxoCaixaCRInfra },
    { nome: '32 · Fluxo de Caixa CR Estacionamentos', fn: gerarSlideFluxoCaixaCREstacionamentos },
    { nome: '33 · DRE Hangar Vip', fn: gerarSlideDREHangarVip },
    { nome: '34 · Capa Ritmo Fluxo de Caixa', fn: gerarSlideCapaRitmoFluxoCaixa },
    { nome: '35 · Capa Demercado Ritmo', fn: gerarSlideCapaDemercado },
    { nome: '36 · Ritmo Entradas Demercado', fn: gerarSlideRitmoEntradasDemercado },
    { nome: '37 · Ritmo Saídas Demercado', fn: gerarSlideRitmoSaidasDemercado },
    { nome: '38 · Ritmo Saldo Demercado', fn: gerarSlideRitmoSaldoDemercado },
    { nome: '39 · Ritmo Fluxo Demercado', fn: gerarSlideRitmoFluxoDemercado },
    { nome: '40 · Capa Deminvest', fn: gerarSlideCapaDeminvest },
    { nome: '41 · Ritmo Entradas Deminvest', fn: gerarSlideRitmoEntradasDeminvest },
    { nome: '42 · Ritmo Saídas Deminvest', fn: gerarSlideRitmoSaidasDeminvest },
    { nome: '43 · Ritmo Saldo Deminvest', fn: gerarSlideRitmoSaldoDeminvest },
    { nome: '44 · Ritmo Fluxo Deminvest', fn: gerarSlideRitmoFluxoDeminvest },
    { nome: '45 · Capa CR Infra', fn: gerarSlideCapaCRInfra },
    { nome: '46 · Ritmo Entradas CR Infra', fn: gerarSlideRitmoEntradasCRInfra },
    { nome: '47 · Ritmo Saídas CR Infra', fn: gerarSlideRitmoSaidasCRInfra },
    { nome: '48 · Ritmo Saldo CR Infra', fn: gerarSlideRitmoSaldoCRInfra },
    { nome: '49 · Ritmo Fluxo CR Infra', fn: gerarSlideRitmoFluxoCRInfra },
    { nome: '50 · Capa CR Estacionamentos', fn: gerarSlideCapaCREstacionamentos },
    { nome: '51 · Ritmo Entradas CR Estacionamentos', fn: gerarSlideRitmoEntradasCREstacionamentos },
    { nome: '52 · Ritmo Saídas CR Estacionamentos', fn: gerarSlideRitmoSaidasCREstacionamentos },
    { nome: '53 · Ritmo Saldo CR Estacionamentos', fn: gerarSlideRitmoSaldoCREstacionamentos },
    { nome: '54 · Ritmo Fluxo CR Estacionamentos', fn: gerarSlideRitmoFluxoCREstacionamentos },
    { nome: '55 · Encerramento', fn: gerarSlideEncerramentoFinanceiro }
  ];
}


// ==========================================
// LIMPAR E GERAR
// ==========================================
// É esta que se usa no dia a dia. gerarApresentacaoFinanceiro() ACRESCENTA
// slides ao que já existe — rodar duas vezes deixa o deck com tudo repetido.
// regerar... apaga o conteúdo antigo antes, então o resultado é sempre o deck
// completo e limpo, quantas vezes for rodada.
function regerarApresentacaoFinanceiro() {
  limparApresentacaoFinanceiro_();
  const avisos = gerarApresentacaoFinanceiro();

  // O deck do Slides não pode ficar sem nenhum slide, então limpar... preserva
  // o primeiro e ele só é removido AGORA, depois que a capa gerada já ocupou
  // o lugar dele.
  //
  // Por que isto tem try/catch e um retry, sendo que nada mais aqui tem: os
  // passos de conteúdo já rodam cada um dentro do próprio try/catch, então um
  // erro lá vira uma linha de log e a geração segue. Este remove() é o único
  // ponto desprotegido — se a API do Slides der um soluço no fim de uma
  // execução longa, a apresentação já está pronta e correta, mas o erro subiria
  // como se a geração inteira tivesse falhado. Mesma lição de
  // megas-mensal/00_Main.gs.
  try {
    _removerSlideAntigo_();
  } catch (e) {
    try {
      Utilities.sleep(3000);
      _removerSlideAntigo_();
    } catch (e2) {
      Logger.log('  ⚠ Não deu para remover o slide antigo (instabilidade da API do Slides: ' +
                 e2.message + '). A apresentação foi gerada normalmente — só apague o ' +
                 'slide 1 à mão, se ele ainda estiver lá.');
    }
  }

  const total = getDeckMensal_().getSlides().length;
  Logger.log('✔ Financeiro — ' + total + ' páginas; ' + avisos.length + ' aviso(s)/placeholder(s).');
  return avisos;
}

// Decks com muitas tabelas podem exceder o tempo máximo de uma única
// execução do Apps Script. Estas três entradas geram exatamente a mesma
// sequência em lotes manuais. Rode PARTE 1, depois PARTE 2 e por fim PARTE 3.
// A primeira limpa o deck; somente a terceira remove o slide antigo que o
// Google Slides exige preservar enquanto ainda não existe uma capa nova.
function regerarApresentacaoFinanceiroParte1() {
  limparApresentacaoFinanceiro_();
  DC_CACHE_ABAS_ = null;
  const erros = _rodarPassos_(_passosApresentacaoFinanceiro_().slice(0, 22));
  Logger.log('Parte 1 concluída: páginas 1–22. Agora rode continuarApresentacaoFinanceiroParte2().');
  return erros;
}

function continuarApresentacaoFinanceiroParte2() {
  DC_CACHE_ABAS_ = null;
  const erros = _rodarPassos_(_passosApresentacaoFinanceiro_().slice(22, 34));
  Logger.log('Parte 2 concluída: páginas 23–34. Agora rode finalizarApresentacaoFinanceiroParte3().');
  return erros;
}

function finalizarApresentacaoFinanceiroParte3() {
  DC_CACHE_ABAS_ = null;
  const erros = _rodarPassos_(_passosApresentacaoFinanceiro_().slice(34));
  _removerSlideAntigo_();
  Logger.log('Parte 3 concluída: páginas 35–55. Deck completo.');
  return erros;
}

// Remove tudo menos o primeiro slide (o Slides recusa um deck vazio).
function limparApresentacaoFinanceiro_() {
  const slides = getDeckMensal_().getSlides();
  for (let i = slides.length - 1; i >= 1; i--) slides[i].remove();
  Logger.log('  Deck limpo (' + Math.max(0, slides.length - 1) + ' slide(s) removido(s)).');
}

function _removerSlideAntigo_() {
  const slides = getDeckMensal_().getSlides();
  if (slides.length > 1) {
    slides[0].remove();
    Logger.log('  Slide antigo removido — a capa gerada assumiu o lugar.');
  }
}


// Roda cada passo isolado. Se um gerador falhar depois de criar parte do
// slide, tudo que ele acrescentou é removido e um placeholder ocupa a mesma
// posição. Assim cada passo acrescenta exatamente uma página.
function _rodarPassos_(passos) {
  if (!passos.length) {
    Logger.log('  Nenhum slide no pipeline.');
    return [];
  }
  const avisos = [];
  const deck = getDeckMensal_();
  passos.forEach(p => {
    const antes = deck.getSlides().length;
    try {
      p.fn();
      const criados = deck.getSlides().length - antes;
      if (criados !== 1) throw new Error('gerador criou ' + criados + ' página(s); esperado: 1');
      if (DC_PAGINAS_PLACEHOLDER.indexOf(p.nome) >= 0) {
        avisos.push(p.nome + ': fonte de dados não disponível');
        Logger.log('  ◇ ' + p.nome + ' — placeholder sem fonte confirmada');
      } else {
        Logger.log('  ✓ ' + p.nome);
      }
    } catch (e) {
      _removerSlidesCriadosApos_(deck, antes);
      const mensagem = p.nome + ': ' + e.message;
      avisos.push(mensagem);
      try {
        gerarSlidePlaceholderFinanceiro_(p.nome, 'Resultados Financeiros',
          'Falha ao ler ou renderizar a fonte: ' + e.message);
        // Se a tentativa de placeholder também criou mais de uma página,
        // limpa novamente e cai no placeholder mínimo abaixo.
        if (deck.getSlides().length - antes !== 1) throw new Error('placeholder criou quantidade inesperada de páginas');
      } catch (placeholderErro) {
        _removerSlidesCriadosApos_(deck, antes);
        // Última barreira de contagem: mesmo em instabilidade dos shapes, um
        // slide em branco é melhor que deslocar todas as páginas seguintes.
        deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
        Logger.log('  ⚠ Placeholder visual indisponível: ' + placeholderErro.message);
      }
      Logger.log('  ⚠ ' + p.nome + ' — substituído por placeholder: ' + e.message);
    }
  });
  Logger.log('  Lote concluído: ' + passos.length + ' passo(s), ' + avisos.length + ' aviso(s).');
  return avisos;
}

function _removerSlidesCriadosApos_(deck, quantidadeAnterior) {
  const slides = deck.getSlides();
  for (let i = slides.length - 1; i >= quantidadeAnterior; i--) slides[i].remove();
}


// ==========================================
// DIAGNÓSTICO — O QUE FALTA PARA O PROJETO RODAR
// ==========================================
function diagnosticarFinanceiro() {
  Logger.log('======================================================');
  Logger.log('DIAGNÓSTICO — Apresentação Mensal do Financeiro');
  Logger.log('======================================================');

  const pend = [];

  Logger.log('\nDeck de destino:');
  if (!DECK_FINANCEIRO_ID) {
    Logger.log('  · sem DECK_FINANCEIRO_ID em 01_Config.gs');
    pend.push('DECK_FINANCEIRO_ID sem ID');
  } else {
    try {
      const d = SlidesApp.openById(DECK_FINANCEIRO_ID);
      Logger.log('  ✓ "' + d.getName() + '" (' + d.getSlides().length + ' slides)');
    } catch (e) {
      Logger.log('  ✗ não abriu: ' + e.message);
      pend.push('deck inacessível');
    }
  }

  Logger.log('\nFontes de dados:');
  [['Planilha do Financeiro', FINANCEIRO_SPREADSHEET_ID]].forEach(([nome, id]) => {
    if (!id) { Logger.log('  · ' + nome + ' — sem ID configurado'); pend.push(nome + ' sem ID'); return; }
    try {
      const ss = SpreadsheetApp.openById(id);
      Logger.log('  ✓ ' + nome + ' — "' + ss.getName() + '" (' + ss.getSheets().length + ' abas)');
      if (id === FINANCEIRO_SPREADSHEET_ID) _diagnosticarAbasFinanceiro_(ss, pend);
    } catch (e) {
      Logger.log('  ✗ ' + nome + ' — não abriu: ' + e.message);
      pend.push(nome + ' inacessível');
    }
  });

  Logger.log('\n' + (pend.length
    ? 'PENDÊNCIAS (' + pend.length + '):\n    ' + pend.join('\n    ')
    : 'Configuração completa. Rode gerarApresentacaoFinanceiro().'));
}


// Somente lê metadados: não abre o deck para edição, não chama gerador e não
// cria slide. Apenas as fontes registradas explicitamente são obrigatórias.
function _diagnosticarAbasFinanceiro_(ss, pend) {
  Logger.log('  Abas confirmadas necessárias:');
  [QUADRO_EBITDA_SHEET, QUADRO_DRE_SHEET].forEach(nome => {
    if (ss.getSheetByName(nome)) Logger.log('    ✓ aba "' + nome + '"');
    else { Logger.log('    ✗ aba "' + nome + '" ausente'); pend.push('aba "' + nome + '" ausente'); }
  });
  const abas = ss.getSheets();
  const nomes = abas.map(sheet => _dcNorm_(sheet.getName()));
  Object.keys(DC_FONTES_CONFIRMADAS).map(chave => DC_FONTES_CONFIRMADAS[chave])
    .filter(fonte => fonte.tipo === 'agenda' || fonte.tipo === 'comparativo')
    .forEach(fonte => {
      if (nomes.indexOf(_dcNorm_(fonte.aba)) >= 0) Logger.log('    ✓ aba "' + fonte.aba + '"');
      else { Logger.log('    ✗ aba "' + fonte.aba + '" ausente'); pend.push('aba "' + fonte.aba + '" ausente'); }
  });
  Logger.log('    ◇ 34 páginas usam placeholder por ausência de fonte confirmada.');
}
