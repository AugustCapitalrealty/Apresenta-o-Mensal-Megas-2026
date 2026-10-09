/**
 * ARQUIVO: 27_Atualizar.gs
 * O QUE FAZ: refaz SÓ alguns slides no deck de Facilities, sem gerar o Mega
 *            inteiro (Guilherme, 09/10/2026: "rodar só esses slides para ganhar
 *            tempo"). Lê os dados do Mega, acha os slides pelo título, apaga só
 *            esses e desenha os novos no mesmo lugar; slide que ainda não existe
 *            (ex.: o "por que sobe" do Esteio) entra depois do slide de
 *            referência. A lista da parte (ORC_FAC_<MEGA>) é atualizada, então a
 *            próxima geração completa continua trocando tudo certo.
 *
 * Rodar no editor: atualizarSlidesFacilities() — os três Megas, os grupos de
 * ORC_ATUALIZAR_AGORA. Para outros slides, troque a lista (nomes de
 * ORC_GRUPOS_ATUALIZAVEIS). Só grupos que não são o primeiro slide de uma seção
 * (o link do sumário aponta para esses) — por isso a DRE não está aqui: use a
 * geração completa.
 */
const ORC_ATUALIZAR_AGORA = ['Ponte', 'Por que sobe', 'Demais variações'];

// titulos: começo do título dos slides do grupo (como o gerador escreve);
// depoisDe: título do slide depois do qual o grupo entra quando ainda não existe;
// secao: número da seção (trilha do topo); slides(x): o que desenhar, com os dados do Mega.
const ORC_GRUPOS_ATUALIZAVEIS = {
  'Revisar': { titulos: ['Revisar antes da versão final'], secao: 0, depoisDe: null,
    slides: x => x.rel.avisos.length || x.rel.pendencias.length
      ? [{ nome: 'Revisar antes da versão final', fn: s => gerarSlideRevisar_(s, x.W, x.H, x.cid, x.rel) }] : [] },
  'Ponte': { titulos: ['Ponte Ritmo '], secao: 2, depoisDe: 'Resumo executivo',
    slides: x => [{ nome: 'Ponte', selo: true, chaves: null, fn: s => gerarSlidePonte_(s, x.W, x.H, x.cid, x.rel, x.visao.mensal) }] },
  'Por que sobe': { titulos: ['Por que a manutenção sobe — '], secao: 4, depoisDe: 'Manutenção de imóveis',
    slides: x => x.contas && x.dados ? [{ nome: 'Por que a manutenção sobe', selo: true, chaves: [x.contas[0].chave],
      fn: s => gerarSlidePorQueSobe_(s, x.W, x.H, x.cid, x.rel, x.contas[0], x.adi) }] : [] },
  'Demais variações': { titulos: ['Por que a manutenção sobe:'], secao: 4, depoisDe: 'Por que a manutenção sobe — ',
    slides: x => x.vi ? [{ nome: 'Por que a manutenção sobe — item a item', selo: true, chaves: [x.contas[0].chave],
      fn: s => gerarSlideDemaisVariacoes_(s, x.W, x.H, x.cid, x.rel, x.contas[0], x.vi) }] : [] },
  'Itens de cada grupo': { titulos: ['Manutenção: os itens de cada grupo'], secao: 4, depoisDe: 'Manutenção: projetos × custo recorrente',
    slides: x => {
      if (!x.calc || !x.calc.cls) return [];
      const pags = _orcPaginasGrupos_(x.calc.cls, x.H), ch = [_orcChaveConta_('Manutenção de imóveis')];
      return pags.map((pag, i) => ({ nome: 'Projetos × recorrente — itens (' + (i + 1) + '/' + pags.length + ')', selo: true, chaves: ch,
        fn: s => gerarSlideGruposManut_(s, x.W, x.H, x.cid, x.rel, x.calc.cls, pag, i, pags.length) }));
    } },
  'Demais categorias': { titulos: ['Demais categorias'], secao: 4, depoisDe: null,
    slides: x => {
      if (!x.dados) return [];
      const div = _orcDividirCategorias_(x.dados), pags = _orcPaginasDemais_(div.demais);
      return pags.map((pag, i) => ({ nome: 'Demais categorias',
        fn: s => gerarSlideDemais_(s, x.W, x.H, x.cid, x.dados, div.demais, pag, i, pags.length) }));
    } }
};

function atualizarSlidesFacilities() { _orcAtualizarSlides_(['ESTEIO', 'ITAJAI', 'CURITIBA'], ORC_ATUALIZAR_AGORA); }
function atualizarSlidesEsteio()     { _orcAtualizarSlides_(['ESTEIO'], ORC_ATUALIZAR_AGORA); }
function atualizarSlidesItajai()     { _orcAtualizarSlides_(['ITAJAI'], ORC_ATUALIZAR_AGORA); }
function atualizarSlidesCuritiba()   { _orcAtualizarSlides_(['CURITIBA'], ORC_ATUALIZAR_AGORA); }

// Título do slide: o primeiro texto não vazio (o cabeçalho escreve o título antes de tudo; moldura e gráfico são
// imagens). Sem a imagem do motor, as formas do gráfico vão para trás e ficam antes do título: percorre todas.
function _orcTituloSlide_(slide) {
  if (!slide) return '';
  const formas = slide.getShapes();
  for (let i = 0; i < formas.length; i++) {
    try { const t = formas[i].getText().asString().trim(); if (t) return t; } catch (e) { /* forma sem texto */ }
  }
  return '';
}

function _orcAtualizarSlides_(chaves, grupos) {
  const deckId = _orcIdFacilities_();
  if (!deckId) throw new Error('Falta o deck de Facilities: rode criarDeckFacilities() (25_Facilities.gs) uma vez.');
  _orcTextosReiniciar_();
  _ORC_BLOBS = {};
  _ORC_PASTA_IMG = undefined;
  const t0 = Date.now();
  try {
    chaves.forEach(chave => {
      const cid = ORC_CIDADES[chave];
      _orcAplicarMarca_(cid);
      _ORC_LINKS = { alvos: {}, origens: [] };
      let deck = SlidesApp.openById(deckId);
      const W = deck.getPageWidth(), H = deck.getPageHeight();
      // Os dados, como em _orcGerarCidade_.
      const visao = _orcLerVisaoGeral_(chave);
      const rel = visao.rel;
      let dados = null, contas = null;
      try { dados = obterManutencao_(chave); } catch (e) { Logger.log(cid.nome + ': manutenção indisponível — ' + e.message); }
      try { contas = _orcContasLinhaALinha_(rel); } catch (e) { Logger.log(cid.nome + ': linha a linha indisponível — ' + e.message); }
      try { rel.pendencias = _orcPendencias_(cid, rel, visao.mensal, visao.modelos); } catch (e) { rel.pendencias = []; }
      const calc = _orcCalculosCompartilhados_(cid, visao, dados);
      let adi = null, vi = null;
      try { adi = dados ? _orcAdiados2026_(cid, dados) : null; } catch (e) { Logger.log('Obras adiadas: ' + e.message); }
      try { vi = dados && contas ? _orcVariacoesItens_(cid, dados, contas[0], adi) : null; } catch (e) { Logger.log('Variações: ' + e.message); }
      const x = { cid: cid, W: W, H: H, visao: visao, rel: rel, dados: dados, contas: contas, calc: calc, adi: adi, vi: vi };

      // Os slides da parte, na ordem do deck, com o título.
      const idsDeck = () => deck.getSlides().map(s => s.getObjectId());
      const lista = _orcListaFacilities_(chave);
      if (!lista.length) { Logger.log(cid.nome + ': a parte ainda não foi gerada — rode gerarFacilities' + chave.charAt(0) + chave.slice(1).toLowerCase() + '()'); return; }
      const ordem = idsDeck();
      const mapa = lista.filter(id => ordem.indexOf(id) >= 0).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
        .map(id => ({ id: id, titulo: _orcTituloSlide_(deck.getSlideById(id)) }));
      const comeca = (t, prefixos) => prefixos.some(p => t.indexOf(p) === 0);

      grupos.forEach(nomeGrupo => {
        const g = ORC_GRUPOS_ATUALIZAVEIS[nomeGrupo];
        if (!g) { Logger.log('Grupo desconhecido: ' + nomeGrupo + ' (ver ORC_GRUPOS_ATUALIZAVEIS)'); return; }
        const novos = g.slides(x);
        const velhos = mapa.filter(m => comeca(m.titulo, g.titulos));
        let posMapa, posDeck;
        if (velhos.length) {
          posMapa = mapa.indexOf(velhos[0]);
          posDeck = idsDeck().indexOf(velhos[0].id);
        } else {
          const ref = g.depoisDe ? mapa.filter(m => m.titulo.indexOf(g.depoisDe) === 0).pop() : null;
          if (!ref || !novos.length) {
            if (novos.length) Logger.log(cid.nome + ' · ' + nomeGrupo + ': nenhum slide para trocar e sem lugar de referência — use a geração completa');
            return;
          }
          posMapa = mapa.indexOf(ref) + 1;
          posDeck = idsDeck().indexOf(ref.id) + 1;
        }
        velhos.forEach(m => { const s = deck.getSlideById(m.id); if (s) s.remove(); mapa.splice(mapa.indexOf(m), 1); });
        _ORC_UNICO = { deckId: deckId, parte: chave, ids: [], indice: posDeck, alvo: null };
        _ORC_TRILHA = g.secao;
        novos.forEach(n => _orcPasso_(deck, W, H, n.nome, s => { n.fn(s); if (n.selo) _orcSeloRevisar_(s, W, rel, n.chaves); }));
        mapa.splice.apply(mapa, [posMapa, 0].concat(_ORC_UNICO.ids.map(id => ({ id: id, titulo: g.titulos[0] }))));
        Logger.log(cid.nome + ' · ' + nomeGrupo + ': ' + velhos.length + ' slide(s) trocado(s) por ' + novos.length);
        _ORC_UNICO = null;
      });
      _ORC_TRILHA = 0;
      // A lista da parte com os novos no lugar dos antigos (os do gestor nunca estão nela).
      PropertiesService.getScriptProperties().setProperty('ORC_FAC_' + chave, JSON.stringify(mapa.map(m => m.id)));
      _orcSalvarDeck_(deck, 'os slides atualizados de ' + cid.nome);
      _orcLogMolduras_(cid.nome);
      Logger.log(cid.nome + ': pronto em ' + ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' s');
    });
  } finally {
    _ORC_UNICO = null;
    _ORC_TRILHA = 0;
    _orcAplicarMarca_(null);
  }
  _orcSalvarTextos_();
}
