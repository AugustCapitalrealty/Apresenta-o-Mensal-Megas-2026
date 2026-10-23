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
// secao: número da seção (trilha do topo, ORC_SECOES: 05 = Manutenção desde 13/10/2026); slides(x): o que desenhar.
const ORC_GRUPOS_ATUALIZAVEIS = {
  'Revisar': { titulos: ['Revisar antes da versão final'], secao: 0, depoisDe: null,
    slides: x => x.rel.avisos.length || x.rel.pendencias.length
      ? [{ nome: 'Revisar antes da versão final', fn: s => gerarSlideRevisar_(s, x.W, x.H, x.cid, x.rel) }] : [] },
  // V2 (22/10/2026): o impacto abre a seção Resumo Executivo (o slide do resumo saiu); deck antigo: depois do resumo.
  'Impacto V1 → V2': { titulos: ['Impacto das revisões'], secao: 2, depoisDe: ['Resumo executivo', 'Premissas'],
    slides: x => _orcTemImpactoV2Mega_(x.chave, x.rel)
      ? [{ nome: 'Impacto das revisões', selo: true, chaves: null,
           fn: s => gerarSlideImpactoMega_(s, x.W, x.H, x.cid, x.rel, x.visao.modelos) }] : [] },
  // V2 (22/10/2026): depois do impacto V1 → V2; deck gerado antes dele, depois do resumo executivo.
  'Entrou e saiu': { titulos: ['O que saiu e o que entrou'], secao: 2, depoisDe: ['Impacto das revisões', 'Resumo executivo'],
    slides: x => _orcTemImpactoV2Mega_(x.chave, x.rel)
      ? [{ nome: 'O que saiu e o que entrou', selo: true, chaves: null,
           fn: s => gerarSlideEntrouSaiu_(s, x.W, x.H, x.cid, x.rel, x.visao.modelos) }] : [] },
  // Sem o resumo executivo (saiu em 22/10/2026): depois do "o que saiu e o que entrou", do impacto ou das premissas.
  'Ponte': { titulos: ['Ponte Ritmo '], secao: 2,
    depoisDe: ['O que saiu e o que entrou', 'Impacto das revisões', 'Resumo executivo', 'Premissas'],
    slides: x => [{ nome: 'Ponte', selo: true, chaves: null, fn: s => gerarSlidePonte_(s, x.W, x.H, x.cid, x.rel, x.visao.mensal) }] },
  'Por que sobe': { titulos: ['Por que a manutenção sobe — '], secao: 5, depoisDe: 'Manutenção de imóveis',
    slides: x => x.contas && x.dados ? [{ nome: 'Por que a manutenção sobe', selo: true, chaves: [x.contas[0].chave],
      fn: s => gerarSlidePorQueSobe_(s, x.W, x.H, x.cid, x.rel, x.contas[0], x.adi) }] : [] },
  'Demais variações': { titulos: ['Por que a manutenção sobe:'], secao: 5, depoisDe: 'Por que a manutenção sobe — ',
    slides: x => x.vi ? [{ nome: 'Por que a manutenção sobe — item a item', selo: true, chaves: [x.contas[0].chave],
      fn: s => gerarSlideDemaisVariacoes_(s, x.W, x.H, x.cid, x.rel, x.contas[0], x.vi) }] : [] },
  'Itens de cada grupo': { titulos: ['Manutenção: os itens de cada grupo'], secao: 5, depoisDe: 'Manutenção: projetos × custo recorrente',
    slides: x => {
      if (!x.calc || !x.calc.cls) return [];
      const pags = _orcPaginasGrupos_(x.calc.cls, x.H), ch = [_orcChaveConta_('Manutenção de imóveis')];
      return pags.map((pag, i) => ({ nome: 'Projetos × recorrente — itens (' + (i + 1) + '/' + pags.length + ')', selo: true, chaves: ch,
        fn: s => gerarSlideGruposManut_(s, x.W, x.H, x.cid, x.rel, x.calc.cls, pag, i, pags.length) }));
    } },
  // 22/10/2026: o m² mês a mês com IPTU e seguro logo depois do de área comum (seção 08, Análise de Custos).
  'M² com IPTU': { titulos: ['Custo por m² mês a mês com IPTU e seguro'], secao: 8, depoisDe: ['Custo por m² mês a mês — '],
    slides: x => x.visao.mensal ? [{ nome: 'Custo por m² mês a mês com IPTU e seguro', selo: true, chaves: null,
      fn: s => gerarSlideM2Mensal_(s, x.W, x.H, x.cid, x.rel, x.visao.mensal, x.visao.realAnt, true) }] : [] },
  'Demais categorias': { titulos: ['Demais categorias'], secao: 5, depoisDe: null,
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

// Só o slide "O que saiu e o que entrou" (V1 → V2) nos três Megas do deck já gerado — Guilherme, 22/10/2026.
// Rodar de novo troca o slide (não duplica).
function incluirSlideEntrouSaiu() { _orcAtualizarSlides_(ORC_FAC_MEGAS, ['Entrou e saiu']); }

// ==========================================
// COMPLETAR O DECK: só o que falta (Guilherme, 22/10/2026)
// ==========================================
// completarSlidesFaltando() → em cada Mega já gerado no deck de Facilities, compara pelo título com a geração de hoje:
//   ▸ inclui os slides dos grupos de ORC_GRUPOS_COMPLETAR que a geração tem e o deck não, no lugar certo;
//   ▸ tira os que saíram da geração (ORC_SLIDES_QUE_SAIRAM); os links do sumário que iam para eles passam para o slide
//     que ficou no lugar.
// O que já está no deck não é refeito (nem os slides do gestor). Não confere conteúdo: slide desatualizado continua
// precisando de atualizarSlides… ou da geração completa. O log diz, por Mega, o que entrou e o que saiu.
// Slide novo na geração: ponha o grupo em ORC_GRUPOS_ATUALIZAVEIS e o nome dele aqui.
const ORC_GRUPOS_COMPLETAR = ['Impacto V1 → V2', 'Entrou e saiu', 'Ponte', 'M² com IPTU'];
const ORC_SLIDES_QUE_SAIRAM = ['Resumo executivo — Orçamento'];   // saiu dos Megas em 22/10/2026
function completarSlidesFaltando() {
  _orcAtualizarSlides_(ORC_FAC_MEGAS, ORC_GRUPOS_COMPLETAR, { soFaltando: true, tirar: ORC_SLIDES_QUE_SAIRAM });
}

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

// op.soFaltando: grupo que já tem slide no deck fica como está (completarSlidesFaltando); op.tirar: começos de título
// dos slides que saem, com os links para eles refeitos.
function _orcAtualizarSlides_(chaves, grupos, op) {
  op = op || {};
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
      const x = { chave: chave, cid: cid, W: W, H: H, visao: visao, rel: rel, dados: dados, contas: contas, calc: calc, adi: adi, vi: vi };

      // Os slides da parte, na ordem do deck, com o título.
      const idsDeck = () => deck.getSlides().map(s => s.getObjectId());
      const lista = _orcListaFacilities_(chave);
      if (!lista.length) { Logger.log(cid.nome + ': a parte ainda não foi gerada — rode gerarFacilities' + chave.charAt(0) + chave.slice(1).toLowerCase() + '()'); return; }
      const ordem = idsDeck();
      const mapa = lista.filter(id => ordem.indexOf(id) >= 0).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
        .map(id => ({ id: id, titulo: _orcTituloSlide_(deck.getSlideById(id)) }));
      const comeca = (t, prefixos) => prefixos.some(p => t.indexOf(p) === 0);
      const relato = { incluidos: [], tirados: [] };

      // Os que saíram da geração: saem do deck; guarda o slide de antes de cada um para refazer os links no fim.
      const saiu = {};
      mapa.filter(m => comeca(m.titulo, op.tirar || [])).forEach(m => {
        const ids = idsDeck(), i = ids.indexOf(m.id);
        saiu[m.id] = i > 0 ? ids[i - 1] : null;
        const s = deck.getSlideById(m.id);
        if (s) s.remove();
        mapa.splice(mapa.indexOf(m), 1);
        relato.tirados.push(m.titulo);
      });

      grupos.forEach(nomeGrupo => {
        const g = ORC_GRUPOS_ATUALIZAVEIS[nomeGrupo];
        if (!g) { Logger.log('Grupo desconhecido: ' + nomeGrupo + ' (ver ORC_GRUPOS_ATUALIZAVEIS)'); return; }
        const velhos = mapa.filter(m => comeca(m.titulo, g.titulos));
        if (op.soFaltando && velhos.length) return;              // já está no deck: fica como está
        const novos = g.slides(x);
        let posMapa, posDeck;
        if (velhos.length) {
          posMapa = mapa.indexOf(velhos[0]);
          posDeck = idsDeck().indexOf(velhos[0].id);
        } else {
          // depoisDe: um título ou uma lista (vale o primeiro que existir no deck).
          const ref = [].concat(g.depoisDe || []).map(t => mapa.filter(m => m.titulo.indexOf(t) === 0).pop())
            .filter(Boolean)[0] || null;
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
        if (!velhos.length) novos.forEach(n => relato.incluidos.push(n.nome));
        _ORC_UNICO = null;
      });
      _ORC_TRILHA = 0;

      // Links (sumário do Mega) que iam para um slide que saiu: para o slide que agora vem depois do anterior a ele.
      if (Object.keys(saiu).length) {
        const ids = idsDeck();
        let refeitos = 0;
        deck.getSlides().forEach(s => s.getShapes().forEach(sh => {
          let alvo = null;
          try { const l = sh.getLink(); alvo = l ? l.getSlideId() : null; } catch (e) { return; }
          if (!alvo || !(alvo in saiu)) return;
          const ant = saiu[alvo], novoId = ant ? ids[ids.indexOf(ant) + 1] : null, novo = novoId ? deck.getSlideById(novoId) : null;
          try { if (novo) { sh.setLinkSlide(novo); refeitos++; } else sh.removeLink(); }
          catch (e) { Logger.log('Link não refeito: ' + e.message); }
        }));
        Logger.log(cid.nome + ': ' + refeitos + ' link(s) que iam para slides tirados agora vão para o slide que ficou no lugar');
      }
      if (op.soFaltando) {
        Logger.log(cid.nome + ' — ' + (relato.incluidos.length || relato.tirados.length
          ? (relato.incluidos.length ? 'incluídos: ' + relato.incluidos.join(', ') : 'nada faltando') +
            (relato.tirados.length ? ' · tirados: ' + relato.tirados.join(', ') : '')
          : 'nada faltando nem sobrando'));
      }
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
