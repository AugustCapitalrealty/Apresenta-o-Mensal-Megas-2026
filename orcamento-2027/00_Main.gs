/**
 * ARQUIVO: 00_Main.gs
 * SEÇÃO:   NÚCLEO — Pontos de entrada
 * DESCRIÇÃO: Gera a apresentação do Orçamento 2027 de cada cidade, na
 *            apresentação dela (`deckId` em ORC_CIDADES).
 *
 *   ▸ gerarCuritiba() / gerarItajai() / gerarEsteio()   → uma cidade
 *   ▸ gerarTodas()                                     → as três, em sequência
 *   ▸ aplicarPropostasTextos()                         → textos curtos na planilha de textos
 *   ▸ diagnosticarOrcamento()                          → só lê e mostra no log
 *
 * Toda geração SUBSTITUI o conteúdo da apresentação da cidade: os slides
 * novos são criados primeiro e os antigos só são apagados no fim. As três
 * juntas chegam perto do limite de 6 min do Apps Script: prefira uma por vez.
 */

function gerarCuritiba() { _orcGerar_(['CURITIBA']); }
function gerarItajai()   { _orcGerar_(['ITAJAI']); }
function gerarEsteio()   { _orcGerar_(['ESTEIO']); }
function gerarTodas()    { _orcGerar_(['CURITIBA', 'ITAJAI', 'ESTEIO']); }

function _orcGerar_(chaves) {
  _orcTextosReiniciar_();
  chaves.forEach(k => {
    const cid = ORC_CIDADES[k];
    if (!cid.deckId) throw new Error(cid.nome + ': falta a apresentação (deckId) em ORC_CIDADES (01_Config.gs).');
    const deck = SlidesApp.openById(cid.deckId);
    const W = deck.getPageWidth(), H = deck.getPageHeight();
    const antigos = deck.getSlides();
    _orcGerarCidade_(deck, W, H, k);
    antigos.forEach(s => s.remove());
    Logger.log('Pronto: ' + cid.nome + ', ' + deck.getSlides().length + ' slides — ' + deck.getUrl());
  });
  _orcSalvarTextos_();
}

/**
 * Ordem do deck, por seções (revisão do gestor em 30/09/2026):
 *   Capa → 01 Premissas → 02 Resumo Executivo (resumo + ponte) →
 *   03 DRE (DRE, ofensores, defensores) → 04 Manutenção (linha a linha,
 *   resumo, mensal, categorias) → 05 Segurança → 06 Limpeza →
 *   07 Projetos × Recorrente → 08 Custo por m².
 * Seção sem dado não ganha sub capa: o aviso de falha fica logo após as
 * Premissas, e a numeração das seções seguintes não pula.
 * Relatórios que divergem entre si abrem o deck com o slide "Revisar antes
 * da versão final" (antes da 01) e põem o selo ⚠ REVISAR nos slides cujos
 * números passam pela conta (19_Revisar.gs).
 */
function _orcGerarCidade_(deck, W, H, chave) {
  const cid = ORC_CIDADES[chave];
  let nSecao = 0;
  const secao = titulo => {
    const n = ++nSecao;
    _orcPasso_(deck, W, H, 'Sub capa — ' + titulo, s => gerarSlideSubcapa_(s, W, H, cid, n, titulo));
  };

  // Leituras antes do desenho: o slide de revisão vem logo depois da capa, e
  // o Resumo Executivo usa a manutenção e os contratos. As falhas são
  // desenhadas depois das Premissas.
  let visao = null, dados = null, contas = null;
  const falhas = [];
  try { visao = _orcLerVisaoGeral_(chave); }
  catch (e) { falhas.push(['Relatórios da controladoria — ' + cid.nome, e]); }
  try { dados = obterManutencao_(chave); }
  catch (e) { falhas.push(['Leitura do orçamento — ' + cid.nome, e]); }
  if (visao) {
    try { contas = _orcContasLinhaALinha_(visao.rel); }
    catch (e) { falhas.push(['Linha a linha — ' + cid.nome, e]); }
  }
  const calc = visao ? _orcCalculosCompartilhados_(cid, visao, dados) : null;

  _orcPasso_(deck, W, H, 'Capa — ' + cid.nome, s => gerarSlideCapa_(s, W, H, cid));
  if (visao && visao.rel.avisos.length) {
    _orcPasso_(deck, W, H, 'Revisar antes da versão final', s => gerarSlideRevisar_(s, W, H, cid, visao.rel));
  }
  secao('Premissas');
  _orcPasso_(deck, W, H, 'Premissas', s => gerarSlidePremissas_(s, W, H, cid));
  falhas.forEach(f => _orcSlideFalha_(_orcNovoSlide_(deck), W, H, f[0], f[1]));

  // Slide com números da METRAGEM: selo ⚠ REVISAR se alguma das contas
  // (todas, sem chaves — o total geral soma todas) diverge entre os relatórios.
  const comSelo = (nome, chaves, fn) =>
    _orcPasso_(deck, W, H, nome, s => { fn(s); _orcSeloRevisar_(s, W, visao.rel, chaves); });

  if (visao) {
    const rel = visao.rel;
    secao('Resumo Executivo');
    comSelo('Resumo executivo', null, s => gerarSlideResumoExecutivo_(s, W, H, cid, rel, calc.cls, calc.reaj));
    comSelo('Ponte', null, s => gerarSlidePonte_(s, W, H, cid, rel, visao.mensal));

    secao('DRE');
    comSelo('DRE', null, s => gerarSlideDRE_(s, W, H, cid, rel));
    comSelo('Ofensores', null, s => gerarSlideOfensores_(s, W, H, cid, rel, visao.modelos, 'ofensores'));
    comSelo('Defensores', null, s => gerarSlideOfensores_(s, W, H, cid, rel, visao.modelos, 'defensores'));
  }

  // Linha a linha da conta i de ORC_CONTAS_DETALHE (0 manutenção, 1 segurança,
  // 2 limpeza): o slide da conta e, se a composição não couber, as páginas
  // com os itens menores ("(1/2)", "(2/2)"…).
  const linhaALinha = i => {
    const c = contas[i];
    let fora = [];
    try { fora = _orcCorteComposicao_(c, visao.modelos, H).fora; }
    catch (e) { Logger.log('Itens menores de ' + c.nome + ' indisponíveis: ' + e.message); }
    const paginas = _orcPaginasItens_(fora), nPag = 1 + paginas.length;
    comSelo('Linha a linha — ' + c.nome, [c.chave],
      s => gerarSlideLinhaALinha_(s, W, H, cid, visao.rel, visao.mensal, visao.modelos, c, nPag));
    paginas.forEach((pag, k) => comSelo('Linha a linha — ' + c.nome + ' (' + (k + 2) + '/' + nPag + ')', [c.chave],
      s => gerarSlideItensMenores_(s, W, H, cid, visao.rel, c, pag, k, nPag, fora)));
  };

  if (contas || dados) {
    secao('Manutenção');
    if (contas) linhaALinha(0);
    if (dados) _orcGerarManutencao_(deck, W, H, cid, dados);
  }
  if (contas) {
    secao('Segurança');
    linhaALinha(1);
    secao('Limpeza e Conservação');
    linhaALinha(2);
  }

  // Aprovados entre as sugestões (05/10/2026). As demais estão pendentes em
  // 90_Pendentes.gs e não são geradas.
  if (visao && calc.cls) {
    secao('Projetos × Recorrente');
    comSelo('Projetos × recorrente', [_orcChaveConta_('Manutenção de imóveis')],
      s => gerarSlideInvestimento_(s, W, H, cid, visao.rel, calc.cls));
  }
  if (visao) {
    secao('Custo por m²');
    comSelo('Custo por m²', null, s => gerarSlideCustoM2_(s, W, H, cid, visao.rel));
    comSelo('Custo por m² mês a mês', null, s => gerarSlideM2Mensal_(s, W, H, cid, visao.rel, visao.mensal, visao.realAnt));
  }
}

// Manutenção por categoria: resumo, distribuição mensal, um slide por
// categoria grande e as páginas de Demais.
function _orcGerarManutencao_(deck, W, H, cid, dados) {
  _orcPasso_(deck, W, H, 'Resumo', s => gerarSlideResumo_(s, W, H, cid, dados));
  _orcPasso_(deck, W, H, 'Distribuição mensal', s => gerarSlideMensal_(s, W, H, cid, dados));

  const div = _orcDividirCategorias_(dados);
  div.proprias.forEach(c =>
    _orcPasso_(deck, W, H, 'Categoria ' + c.nome, s => gerarSlideCategoria_(s, W, H, cid, dados, c)));

  const paginas = _orcPaginasDemais_(div.demais);
  paginas.forEach((pag, i) =>
    _orcPasso_(deck, W, H, 'Demais categorias', s => gerarSlideDemais_(s, W, H, cid, dados, div.demais, pag, i, paginas.length)));
}

// Cálculos que o Resumo Executivo e o slide de investimento compartilham.
// Sem a manutenção (dados null) não há classificação: o resumo omite a
// mensagem de projetos e o slide de investimento não sai.
function _orcCalculosCompartilhados_(cid, visao, dados) {
  const contratos = _orcContratosCidade_(cid, visao.modelos);
  return { cls: dados ? _orcClassificarManutencao_(dados) : null, contratos: contratos,
           reaj: _orcReajustes_(contratos) };
}

// Relatórios da controladoria + linhas dos modelos: { rel, mensal, realAnt, modelos }.
// Lança se o relatório anual não abre; sem o mensal segue com mensal = null.
function _orcLerVisaoGeral_(chave) {
  const rel = obterRelatorioAnual_(chave);
  let mensal = null;
  try { mensal = obterRelatorioMensal_(chave); }
  catch (e) { Logger.log('Relatório mensal indisponível — linha a linha sem o mês a mês: ' + e.message); }
  if (mensal) _orcConferirMensal_(rel, mensal, ORC_CIDADES[chave].relatorios.valeMetragem);
  let realAnt = null;
  try { realAnt = obterRealMensalAnoRetrasado_(chave); }
  catch (e) { Logger.log('Real ' + (ORC_ANO - 2) + ' mês a mês indisponível — custo por m² sem ele: ' + e.message); }
  return { rel: rel, mensal: mensal, realAnt: realAnt, modelos: _orcLinhasModelosCidade_(chave) };
}

// Um slide por passo, com try/catch próprio: a falha fica escrita NO slide e
// não impede os seguintes.
function _orcPasso_(deck, W, H, nome, fn) {
  const slide = _orcNovoSlide_(deck);
  _ORC_SLIDE_ATUAL = nome;                     // coluna ONDE APARECE da planilha de textos
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
