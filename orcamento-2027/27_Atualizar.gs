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
  // 23/10/2026: o slide dos projetos × custo recorrente (antes dos itens de cada grupo).
  'Projetos × recorrente': { titulos: ['Manutenção: projetos × custo recorrente'], secao: 5, depoisDe: null,
    slides: x => x.calc && x.calc.cls ? [{ nome: 'Projetos × recorrente', selo: true, chaves: [_orcChaveConta_('Manutenção de imóveis')],
      fn: s => gerarSlideInvestimento_(s, x.W, x.H, x.cid, x.rel, x.calc.cls) }] : [] },
  'Itens de cada grupo': { titulos: ['Manutenção: os itens de cada grupo'], secao: 5, depoisDe: 'Manutenção: projetos × custo recorrente',
    slides: x => {
      if (!x.calc || !x.calc.cls) return [];
      const pags = _orcPaginasGrupos_(x.calc.cls, x.H), ch = [_orcChaveConta_('Manutenção de imóveis')];
      return pags.map((pag, i) => ({ nome: 'Projetos × recorrente — itens (' + (i + 1) + '/' + pags.length + ')', selo: true, chaves: ch,
        fn: s => gerarSlideGruposManut_(s, x.W, x.H, x.cid, x.rel, x.calc.cls, pag, i, pags.length) }));
    } },
  // 23/10/2026: o de área comum (2º slide da seção 08, depois do "Custo por m²"), para trocar junto com o de IPTU.
  'M² área comum': { titulos: ['Custo por m² mês a mês — '], secao: 8, depoisDe: ['Custo por m²'],
    slides: x => [{ nome: 'Custo por m² mês a mês', selo: true, chaves: null,
      fn: s => gerarSlideM2Mensal_(s, x.W, x.H, x.cid, x.rel, x.visao.mensal, x.visao.realAnt) }] },
  // 22/10/2026: o m² mês a mês com IPTU e seguro logo depois do de área comum (seção 08, Análise de Custos).
  'M² com IPTU':{ titulos: ['Custo por m² mês a mês com IPTU e seguro'], secao: 8, depoisDe: ['Custo por m² mês a mês — '],
    slides: x => x.visao.mensal ? [{ nome: 'Custo por m² mês a mês com IPTU e seguro', selo: true, chaves: null,
      fn: s => gerarSlideM2Mensal_(s, x.W, x.H, x.cid, x.rel, x.visao.mensal, x.visao.realAnt, true) }] : [] },
  // 23/10/2026 (atualizarSlidesDeHoje): os slides da manutenção que mostram os itens um a um.
  'Resumo manutenção': { titulos: ['Manutenção de Imóveis — Orçamento'], secao: 5, depoisDe: null,
    slides: x => x.dados ? [{ nome: 'Resumo', fn: s => gerarSlideResumo_(s, x.W, x.H, x.cid, x.dados, _orcAreaImplicita_(x.rel, 'orc')) }] : [] },
  'Linha a linha manutenção': { titulos: ['Manutenção de imóveis'], secao: 5, depoisDe: null,
    slides: x => x.contas ? [{ nome: 'Linha a linha — ' + x.contas[0].nome, selo: true, chaves: [x.contas[0].chave],
      fn: s => gerarSlideLinhaALinha_(s, x.W, x.H, x.cid, x.rel, x.visao.mensal, x.visao.modelos, x.contas[0], 1, x.calc ? x.calc.cls : null) }] : [] },
  // Uma por categoria grande; o título do slide é o nome da categoria (titulos = função dos dados).
  'Categorias': { titulos: x => x.dados ? _orcDividirCategorias_(x.dados).proprias.map(c => c.nome) : [], secao: 5, depoisDe: null,
    slides: x => x.dados ? _orcDividirCategorias_(x.dados).proprias.map(c => ({ nome: 'Categoria ' + c.nome,
      fn: s => gerarSlideCategoria_(s, x.W, x.H, x.cid, x.dados, c) })) : [] },
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

// 23/10/2026 à tarde, só os slides que mudaram depois do atualizarSlidesDeHoje() (Guilherme):
//   ▸ Esteio: os dois m² mês a mês (área comum e com IPTU e seguro), com o Pátio Mercado Livre abatido nos dois — out–dez,
//     sem IPTU nem seguro, dá o mesmo R$/m² nos dois;
//   ▸ Itajaí: "demais variações", com a Arca Agro contra o 2026 dela na Limpeza (degrau "Veio da limpeza");
//   ▸ Esteio: "projetos × custo recorrente", para pegar a imagem do gráfico (13h40).
// Rodar de novo troca (não duplica). Funciona também com a apresentação em branco: aí ela fica só com esses 4 slides
// (Esteio e depois Itajaí, no fim), e uma geração completa do Mega depois os troca.
function atualizarSlidesDaTarde() {
  _orcAtualizarSlides_(['ESTEIO'], ['M² área comum', 'M² com IPTU', 'Projetos × recorrente'], { noFim: true });
  _orcAtualizarSlides_(['ITAJAI'], ['Demais variações'], { noFim: true });
}

// Só os slides que mudaram em 23/10/2026, sem gerar os Megas (Guilherme: "uma função para gerar somente os slides que
// mudamos"):
//   ▸ os três Megas: "Por que a manutenção sobe: as demais variações" (provisões de 2026 juntas contra a de 3%; no
//     Itajaí, as cancelas 2/2 de 2026 = a obra das cancelas de 2027);
//   ▸ Esteio: sem os itens "RETIRADO" e os marcadores de R$ 1 — impacto V1 → V2, o que saiu e entrou, resumo e linha a
//     linha da manutenção, itens de cada grupo, categorias e demais categorias;
//   ▸ Curitiba: os 6 slides de Segurança Eletrônica do gestor, melhorados (incluirSegurancaEletronica, 00_Gerar.gs).
// Cada parte mostra no log o tempo; se o Apps Script parar no meio, rodar de novo troca tudo outra vez (não duplica).
const ORC_GRUPOS_HOJE_ESTEIO = ['Impacto V1 → V2', 'Entrou e saiu', 'Resumo manutenção', 'Linha a linha manutenção',
                                'Demais variações', 'Itens de cada grupo', 'Categorias', 'Demais categorias'];
function atualizarSlidesDeHoje() {
  _orcAtualizarSlides_(['ITAJAI', 'CURITIBA'], ['Demais variações']);
  _orcAtualizarSlides_(['ESTEIO'], ORC_GRUPOS_HOJE_ESTEIO);
  try { incluirSegurancaEletronica(); }
  catch (e) { Logger.log('Segurança Eletrônica não atualizada: ' + e.message + ' — rode incluirSegurancaEletronica() (00_Gerar.gs).'); }
}

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
      // Os contratos só para o item a item (contrato que mudou de conta, 23/10/2026): ler o cadastro de 2026 leva tempo.
      let cmp = null;
      if (grupos.indexOf('Demais variações') >= 0) {
        let modelosAnt = null;
        try { modelosAnt = _orcModelosAnoAnterior_(); } catch (e) { Logger.log('Modelos do ano anterior: ' + e.message); }
        try { cmp = _orcCompararTodosContratos_(rel, _orcCadastroAnoAnterior_(), cid.nome, visao.modelos, modelosAnt); }
        catch (e) { Logger.log('Contratos (mudou de conta) indisponíveis: ' + e.message); }
      }
      try { vi = dados && contas ? _orcVariacoesItens_(cid, dados, contas[0], adi, cmp) : null; } catch (e) { Logger.log('Variações: ' + e.message); }
      const x = { chave: chave, cid: cid, W: W, H: H, visao: visao, rel: rel, dados: dados, contas: contas, calc: calc, adi: adi, vi: vi };

      // Os slides da parte, na ordem do deck, com o título.
      const idsDeck = () => deck.getSlides().map(s => s.getObjectId());
      // op.noFim: Mega fora do deck (ou a apresentação em branco) recebe os slides dos grupos no fim (Guilherme,
      // 23/10/2026); sem ele, fica de fora.
      const lista = _orcListaFacilities_(chave);
      const ordem = idsDeck();
      if (!op.noFim && !lista.some(id => ordem.indexOf(id) >= 0)) {
        Logger.log(cid.nome + ': a parte ainda não foi gerada — rode gerarMega' + chave.charAt(0) + chave.slice(1).toLowerCase() + '()');
        return;
      }
      const mapa = lista.filter(id => ordem.indexOf(id) >= 0).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
        .map(id => ({ id: id, titulo: _orcTituloSlide_(deck.getSlideById(id)) }));
      const comeca = (t, prefixos) => prefixos.some(p => t.indexOf(p) === 0);
      const relato = { incluidos: [], tirados: [] };
      const trocados = {};   // id do slide trocado → id do primeiro slide novo do grupo

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
        const g0 = ORC_GRUPOS_ATUALIZAVEIS[nomeGrupo];
        if (!g0) { Logger.log('Grupo desconhecido: ' + nomeGrupo + ' (ver ORC_GRUPOS_ATUALIZAVEIS)'); return; }
        const g = typeof g0.titulos === 'function' ? Object.assign({}, g0, { titulos: g0.titulos(x) }) : g0;
        // Título exato quando o grupo dá nomes (categorias: "PPCI" não pode pegar outro slide que comece igual).
        const velhos = mapa.filter(m => typeof g0.titulos === 'function' ? g.titulos.indexOf(m.titulo) >= 0 : comeca(m.titulo, g.titulos));
        if (!g.titulos.length) return;
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
          if (!novos.length) return;
          if (!ref && !op.noFim) {
            Logger.log(cid.nome + ' · ' + nomeGrupo + ': nenhum slide para trocar e sem lugar de referência — use a geração completa');
            return;
          }
          if (ref) {
            posMapa = mapa.indexOf(ref) + 1;
            posDeck = idsDeck().indexOf(ref.id) + 1;
          } else {
            // Sem o slide de referência: no fim da parte do Mega, ou no fim da apresentação se o Mega não está nela.
            posMapa = mapa.length;
            posDeck = mapa.length ? idsDeck().indexOf(mapa[mapa.length - 1].id) + 1 : idsDeck().length;
            Logger.log(cid.nome + ' · ' + nomeGrupo + ': sem o slide de referência no deck — entra no fim' +
                       (mapa.length ? ' do ' + cid.nome : ' da apresentação'));
          }
        }
        velhos.forEach(m => { const s = deck.getSlideById(m.id); if (s) s.remove(); mapa.splice(mapa.indexOf(m), 1); });
        _ORC_UNICO = { deckId: deckId, parte: chave, ids: [], indice: posDeck, alvo: null };
        _ORC_TRILHA = g.secao;
        novos.forEach(n => _orcPasso_(deck, W, H, n.nome, s => { n.fn(s); if (n.selo) _orcSeloRevisar_(s, W, rel, n.chaves); }));
        // Link do sumário que ia para um slide trocado (o impacto abre a seção Resumo Executivo) vai para o novo.
        if (_ORC_UNICO.ids.length) velhos.forEach(m => { trocados[m.id] = _ORC_UNICO.ids[0]; });
        mapa.splice.apply(mapa, [posMapa, 0].concat(_ORC_UNICO.ids.map(id => ({ id: id, titulo: g.titulos[0] }))));
        Logger.log(cid.nome + ' · ' + nomeGrupo + ': ' + velhos.length + ' slide(s) trocado(s) por ' + novos.length);
        if (!velhos.length) novos.forEach(n => relato.incluidos.push(n.nome));
        _ORC_UNICO = null;
      });
      _ORC_TRILHA = 0;

      // Links (sumário do Mega) que iam para um slide que saiu: para o slide que agora vem depois do anterior a ele; os
      // que iam para um slide trocado, para o novo.
      if (Object.keys(saiu).length || Object.keys(trocados).length) {
        const ids = idsDeck();
        let refeitos = 0;
        deck.getSlides().forEach(s => s.getShapes().forEach(sh => {
          let alvo = null;
          try { const l = sh.getLink(); alvo = l ? l.getSlideId() : null; } catch (e) { return; }
          if (!alvo || (!(alvo in saiu) && !(alvo in trocados))) return;
          let novo = null;
          if (alvo in trocados) novo = deck.getSlideById(trocados[alvo]);
          else { const ant = saiu[alvo], novoId = ant ? ids[ids.indexOf(ant) + 1] : null; novo = novoId ? deck.getSlideById(novoId) : null; }
          try { if (novo) { sh.setLinkSlide(novo); refeitos++; } else sh.removeLink(); }
          catch (e) { Logger.log('Link não refeito: ' + e.message); }
        }));
        if (refeitos) Logger.log(cid.nome + ': ' + refeitos + ' link(s) do sumário refeitos para os slides novos');
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
