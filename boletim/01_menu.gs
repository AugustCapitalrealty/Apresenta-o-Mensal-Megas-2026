/**
 * ARQUIVO: 01_menu.gs
 * Cria um menu personalizado na barra de menus do Google Slides
 * (Extensões > Boletim 2026) para rodar as apresentações sem
 * precisar abrir o editor de Apps Script.
 *
 * IMPORTANTE: o Slides não permite "botão clicável" dentro do slide
 * que execute uma função (isso só existe em desenhos do Google Sheets).
 * A forma equivalente no Slides é este menu, que aparece sempre que o
 * arquivo de apresentação (onde este projeto está vinculado) é aberto.
 */
function onOpen(e) {
  try {
    SlidesApp.getUi()
      .createMenu('📊 Boletim 2026')
      .addItem('▶ Gerar Boletim Completo', 'gerarApresentacaoCompleta')
      .addItem('▶ Gerar Boletim Facilities', 'gerarApresentacaoFacilities')
      .addItem('▶ Gerar Boletim Hangar VIP', 'gerarApresentacaoHangar')
      .addSeparator()
      .addItem('▶ Gerar TODAS as Apresentações', 'gerarTodasApresentacoes')
      .addToUi();
  } catch (err) {
    Logger.log('Menu não criado (script não está vinculado a uma apresentação Slides aberta): ' + err.message);
  }
}
