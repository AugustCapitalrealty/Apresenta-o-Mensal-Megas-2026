/** SLIDE 05 — DESPESAS. Única fonte: obterDespesas_(). */
function gerarSlideDespesas() {
  const dados = obterDespesas_();
  const modelo = _fmComparativo_(dados, 'Despesas');
  const c = _fmNovoSlide_('Despesas', _fmUnidade_(dados, 'Real 2025') + ' · redução favorável / aumento desfavorável');
  _fmTabelaComparativa_(c, modelo, true); _fmRodape_(c);
  Logger.log('Slide "Despesas" gerado — variação preservada como Real 2026 / comparador − 1.');
}
