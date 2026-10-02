/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Pontos de entrada
 * DESCRIÇÃO: Gera a apresentação do Orçamento 2027 em ORC_DECK_ID.
 *
 *   ▸ gerarCuritiba() / gerarItajai() / gerarEsteio()   → uma cidade
 *   ▸ gerarTodas()                                     → as três, em sequência
 *   ▸ gerarSugestoes()                                 → só a seção de sugestões (Curitiba)
 *   ▸ diagnosticarOrcamento()                          → só lê e mostra no log
 *
 * Toda geração SUBSTITUI o conteúdo da apresentação: os slides novos são
 * criados primeiro e os antigos só são apagados no fim.
 */

function gerarCuritiba() { _orcGerar_(['CURITIBA']); }
function gerarItajai()   { _orcGerar_(['ITAJAI']); }
function gerarEsteio()   { _orcGerar_(['ESTEIO']); }
function gerarTodas()    { _orcGerar_(['CURITIBA', 'ITAJAI', 'ESTEIO']); }

// Só a seção de sugestões de Curitiba (abertura + 7), sem o resto do deck:
// para revisar as sugestões rápido. gerarCuritiba() volta o deck completo.
function gerarSugestoes() { _orcGerar_(['CURITIBA'], _orcGerarSoSugestoes_); }

function _orcGerar_(chaves, gerarCidade) {
  const deck = SlidesApp.openById(ORC_DECK_ID);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const antigos = deck.getSlides();
  const fn = gerarCidade || _orcGerarCidade_;

  chaves.forEach(k => fn(deck, W, H, k));

  antigos.forEach(s => s.remove());
  Logger.log('Pronto: ' + deck.getSlides().length + ' slides — ' + deck.getUrl());
}

function _orcGerarCidade_(deck, W, H, chave) {
  const cid = ORC_CIDADES[chave];
  _orcPasso_(deck, W, H, 'Capa — ' + cid.nome, s => gerarSlideCapa_(s, W, H, cid));
  const visao = _orcGerarVisaoGeral_(deck, W, H, chave, cid);

  let dados;
  try {
    dados = obterManutencao_(chave);
  } catch (e) {
    _orcSlideFalha_(_orcNovoSlide_(deck), W, H, 'Leitura do orçamento — ' + cid.nome, e);
    return;
  }

  _orcPasso_(deck, W, H, 'Resumo', s => gerarSlideResumo_(s, W, H, cid, dados));
  _orcPasso_(deck, W, H, 'Distribuição mensal', s => gerarSlideMensal_(s, W, H, cid, dados));

  const div = _orcDividirCategorias_(dados);
  div.proprias.forEach(c =>
    _orcPasso_(deck, W, H, 'Categoria ' + c.nome, s => gerarSlideCategoria_(s, W, H, cid, dados, c)));

  const paginas = _orcPaginasDemais_(div.demais);
  paginas.forEach((pag, i) =>
    _orcPasso_(deck, W, H, 'Demais categorias', s => gerarSlideDemais_(s, W, H, cid, dados, div.demais, pag, i, paginas.length)));

  if (visao) _orcGerarSugestoes_(deck, W, H, cid, visao, dados);
}

// Seção "Sugestões para discussão" (16_Sugestoes.gs): só existe quando a
// visão geral leu os relatórios. Os cálculos compartilhados saem uma vez aqui.
function _orcGerarSugestoes_(deck, W, H, cid, visao, dados) {
  const rel = visao.rel, mensal = visao.mensal;
  const cls = _orcClassificarManutencao_(dados);
  const contratos = _orcContratosCidade_(cid, visao.modelos);
  const reaj = _orcReajustes_(contratos);

  _orcPasso_(deck, W, H, 'Sugestões — abertura', s => gerarSlideSugestoesAbertura_(s, W, H, cid));
  _orcPasso_(deck, W, H, 'Sugestão — resumo executivo', s => gerarSlideSugResumo_(s, W, H, cid, rel, cls, reaj));
  _orcPasso_(deck, W, H, 'Sugestão — ponte', s => gerarSlideSugPonte_(s, W, H, cid, rel, mensal));
  _orcPasso_(deck, W, H, 'Sugestão — investimento × recorrente', s => gerarSlideSugInvestimento_(s, W, H, cid, rel, cls));
  _orcPasso_(deck, W, H, 'Sugestão — cenários', s => gerarSlideSugCenarios_(s, W, H, cid, rel, cls));
  _orcPasso_(deck, W, H, 'Sugestão — contratos', s => gerarSlideSugContratos_(s, W, H, cid, rel, contratos, reaj));
  _orcPasso_(deck, W, H, 'Sugestão — contratos sem reajuste', s => gerarSlideSugSemReajuste_(s, W, H, cid, rel, reaj));
  if (mensal) _orcPasso_(deck, W, H, 'Sugestão — fluxo mensal', s => gerarSlideSugFluxo_(s, W, H, cid, rel, mensal));
  _orcPasso_(deck, W, H, 'Sugestão — R$/m²', s => gerarSlideSugM2_(s, W, H, cid, rel));
}

function _orcGerarSoSugestoes_(deck, W, H, chave) {
  const cid = ORC_CIDADES[chave];
  let visao, dados;
  try {
    visao = _orcLerVisaoGeral_(chave);
    dados = obterManutencao_(chave);
  } catch (e) {
    _orcSlideFalha_(_orcNovoSlide_(deck), W, H, 'Sugestões — ' + cid.nome, e);
    return;
  }
  _orcGerarSugestoes_(deck, W, H, cid, visao, dados);
}

// Relatórios da controladoria + linhas dos modelos: { rel, mensal, modelos }.
// Lança se o relatório anual não abre; sem o mensal segue com mensal = null.
function _orcLerVisaoGeral_(chave) {
  const rel = obterRelatorioAnual_(chave);
  let mensal = null;
  try { mensal = obterRelatorioMensal_(chave); }
  catch (e) { Logger.log('Relatório mensal indisponível — linha a linha sem o mês a mês: ' + e.message); }
  return { rel: rel, mensal: mensal, modelos: _orcLinhasModelosCidade_(chave) };
}

// DRE, ofensores e linha a linha: todas as contas do condomínio, a partir dos
// relatórios da controladoria. Falha aqui (relatório ausente ou fora do
// formato) vira aviso num slide e NÃO impede a seção de manutenção.
// Devolve o que leu ({ rel, mensal, modelos }) para a seção de sugestões, ou
// null se o relatório anual não abriu.
function _orcGerarVisaoGeral_(deck, W, H, chave, cid) {
  let visao;
  try {
    visao = _orcLerVisaoGeral_(chave);
  } catch (e) {
    _orcSlideFalha_(_orcNovoSlide_(deck), W, H, 'Relatórios da controladoria — ' + cid.nome, e);
    return null;
  }
  const rel = visao.rel, mensal = visao.mensal, modelos = visao.modelos;

  _orcPasso_(deck, W, H, 'DRE', s => gerarSlideDRE_(s, W, H, cid, rel));
  _orcPasso_(deck, W, H, 'Ofensores e Defensores', s => gerarSlideOfensores_(s, W, H, cid, rel, modelos));
  let contas;
  try { contas = _orcContasLinhaALinha_(rel); }
  catch (e) { _orcSlideFalha_(_orcNovoSlide_(deck), W, H, 'Linha a linha — ' + cid.nome, e); return visao; }
  contas.forEach(c =>
    _orcPasso_(deck, W, H, 'Linha a linha — ' + c.nome, s => gerarSlideLinhaALinha_(s, W, H, cid, rel, mensal, modelos, c)));
  return visao;
}

// Um slide por passo, com try/catch próprio: a falha fica escrita NO slide e
// não impede os seguintes.
function _orcPasso_(deck, W, H, nome, fn) {
  const slide = _orcNovoSlide_(deck);
  try {
    fn(slide);
  } catch (e) {
    _orcSlideFalha_(slide, W, H, nome, e);
  }
  return slide;
}

/**
 * Lê a planilha de Curitiba e mostra no log o que encontrou — contas, total
 * da manutenção por categoria e a conferência das somas —, sem mexer na
 * apresentação. Responde "por que o número não bate?" sem abrir a planilha.
 */
function diagnosticarOrcamento() {
  const chave = 'CURITIBA';
  const cid = ORC_CIDADES[chave];
  const linhas = _orcLerModelo_(cid.despesasGeraisId);
  Logger.log(cid.nome + ' — ' + linhas.length + ' linhas com conta em "' + ORC_ABA_MODELO + '"');

  const porConta = {};
  linhas.forEach(l => {
    const c = porConta[l.conta] || (porConta[l.conta] = { n: 0, t: 0 });
    c.n++; c.t += l.total;
  });
  Object.keys(porConta).forEach(k => Logger.log('  ' + k + ': ' + porConta[k].n + ' linhas, ' + _orcMoeda_(porConta[k].t)));

  const d = obterManutencao_(chave);
  Logger.log('Manutenção de imóveis: ' + _orcMoeda_(d.total) + ' em ' + d.nItens + ' itens (' +
             d.nZerados + ' linhas zeradas ignoradas)');
  d.categorias.forEach(c => Logger.log('  ' + c.nome + ': ' + _orcMoeda_(c.total) + ' (' +
                                       _orcPct_(c.pct) + ', ' + c.itens.length + ' itens)'));

  const somaCat = d.categorias.reduce((a, c) => a + c.total, 0);
  const somaMes = d.meses.reduce((a, v) => a + v, 0);
  Logger.log('Conferência: categorias ' + _orcMoeda_(somaCat) + ' | meses ' + _orcMoeda_(somaMes) +
             ' | total ' + _orcMoeda_(d.total));
}
