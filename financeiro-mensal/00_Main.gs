/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Orquestrador da Apresentação Mensal do Financeiro
 *
 * Mesma estrutura de propriedades-mensal/00_Main.gs e megas-mensal/00_Main.gs:
 * um array `passos` com os slides na ordem, e um laço que roda cada um
 * isolado — slide que falha registra o erro e não derruba os outros.
 *
 * ESTADO: só a Capa está implementada. Os demais slides entram no pipeline
 * conforme a Ester for especificando — slide com dado inventado é pior que
 * slide nenhum.
 *
 * COMO ACRESCENTAR UM SLIDE
 *   1. Crie Slide<N>_<Nome>.gs com uma função gerarSlide<Nome>().
 *   2. Acrescente { nome: '<Nome>', fn: gerarSlide<Nome> } em `passos`.
 *   3. Leia os dados por uma função de 02_Dados.gs, não direto da planilha
 *      dentro do slide.
 */

function gerarApresentacaoFinanceiro() {
  Logger.log('▶ Apresentação Mensal do Financeiro');

  const passos = [
    { nome: 'Capa', fn: gerarSlideCapa },
    { nome: 'Resumo do Resultado', fn: gerarSlideResumoResultado },
    { nome: 'DRE — Demercado', fn: gerarSlideDREDemercado }
    // Próximos slides entram aqui, na ordem que a Ester definir. Para outra
    // empresa do DRE, acrescente { nome: 'DRE — X', fn: () =>
    // gerarSlideDREEmpresa_('X') } — a chave precisa existir em DRE_EMPRESAS
    // (Slide02_DREEmpresa.gs).
  ];

  return _rodarPassos_(passos);
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
  const erros = gerarApresentacaoFinanceiro();

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

  Logger.log('✔ Financeiro — ' + (erros.length ? erros.length + ' erro(s).' : 'sem erros.'));
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
    } catch (e) {
      Logger.log('  ✗ ' + nome + ' — não abriu: ' + e.message);
      pend.push(nome + ' inacessível');
    }
  });

  Logger.log('\n' + (pend.length
    ? 'PENDÊNCIAS (' + pend.length + '):\n    ' + pend.join('\n    ')
    : 'Configuração completa. Rode gerarApresentacaoFinanceiro().'));
}
