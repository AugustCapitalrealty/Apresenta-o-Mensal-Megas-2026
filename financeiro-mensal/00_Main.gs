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
    { nome: 'Resumo do Resultado', fn: gerarSlideResumoResultado }
    // Próximos slides entram aqui, na ordem que a Ester definir.
  ];

  return _rodarPassos_(passos);
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
