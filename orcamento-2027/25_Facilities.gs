/**
 * ARQUIVO: 25_Facilities.gs
 * DECK ÚNICO DE FACILITIES (v2) — pedido do gestor em 07/10/2026: "1 apresentação de Facilities e as seções são os
 * Megas", e no começo um resumo comparando o R$/m² entre os Megas nas principais linhas.
 *
 *   ▸ criarDeckFacilities()      → cria a apresentação "FACILITIES - APRESENTAÇÃO ORÇAMENTO 2027" (uma vez)
 *   ▸ gerarFacilitiesAbertura()  → capa de Facilities, sumário e o comparativo de R$/m² entre os Megas
 *   ▸ gerarFacilitiesCuritiba() / gerarFacilitiesItajai() / gerarFacilitiesEsteio() → a seção do Mega
 *
 * Cada parte é gerada numa execução (o limite de 6 min do Apps Script não cabe os três Megas juntos) e troca só os
 * slides dela: a lista de IDs de cada parte fica nas propriedades do script (ORC_FAC_<PARTE>), e a geração nova entra
 * na mesma posição. Ordem do deck: abertura, Esteio, Itajaí, Curitiba — qualquer parte pode ser gerada antes das
 * outras. Dentro de cada Mega: capa do Mega, revisão (interna), sumário do Mega e as seções, sem sub capas — a trilha
 * de progresso no topo marca a seção, e o link do sumário vai para o primeiro slide dela.
 * As três apresentações por Mega (gerarCuritiba…) continuam funcionando até a validação do deck único.
 */

const ORC_FACILITIES = {
  nome: 'FACILITIES - APRESENTAÇÃO ORÇAMENTO ' + ORC_ANO,
  deckId: '1w_diCsSIpuuryXliPRBcW4YWoMmM8RyuT7O7307DsqQ',   // criado em 07/10/2026 por criarDeckFacilities()
  // Ordem do sumário e das seções: Esteio, Itajaí, Curitiba (Guilherme, 08/10/2026).
  partes: ['ABERTURA', 'ESTEIO', 'ITAJAI', 'CURITIBA']
};

// Durante a geração no deck único: { deckId, parte, ids, indice, alvo } (00_Helpers.gs, _orcNovoSlide_).
let _ORC_UNICO = null;

function gerarFacilitiesAbertura() { _orcGerarFacilities_('ABERTURA'); }
function gerarFacilitiesCuritiba() { _orcGerarFacilities_('CURITIBA'); }
function gerarFacilitiesItajai()   { _orcGerarFacilities_('ITAJAI'); }
function gerarFacilitiesEsteio()   { _orcGerarFacilities_('ESTEIO'); }

function criarDeckFacilities() {
  const atual = _orcIdFacilities_();
  if (atual) { Logger.log('O deck de Facilities já existe: https://docs.google.com/presentation/d/' + atual + '/edit'); return; }
  const deck = SlidesApp.create(ORC_FACILITIES.nome);
  DriveApp.getFileById(deck.getId()).moveTo(DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID));
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ORC_FACILITIES_DECK_ID', deck.getId());
  // O slide em branco que o Slides cria: sai na primeira geração.
  props.setProperty('ORC_FAC_INICIAL', JSON.stringify(deck.getSlides().map(s => s.getObjectId())));
  Logger.log('Deck de Facilities criado: ' + deck.getUrl() + ' (ID ' + deck.getId() + '). Gere a abertura e os Megas.');
}

function _orcIdFacilities_() {
  if (ORC_FACILITIES.deckId) return ORC_FACILITIES.deckId;
  try { return PropertiesService.getScriptProperties().getProperty('ORC_FACILITIES_DECK_ID') || ''; }
  catch (e) { return ''; }
}

function _orcListaFacilities_(parte) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('ORC_FAC_' + parte) || '[]'); }
  catch (e) { return []; }
}

function _orcFacilitiesGuardarIds_() {
  if (_ORC_UNICO) PropertiesService.getScriptProperties().setProperty('ORC_FAC_' + _ORC_UNICO.parte, JSON.stringify(_ORC_UNICO.ids));
}

// Posição da parte no deck: logo depois da parte anterior (na ordem de ORC_FACILITIES.partes) que já existe; sem
// nenhuma antes, antes da primeira que vem depois; sem as outras, onde ela estava; sem nada, no fim. Seguir a ordem
// (e não o lugar antigo) faz a troca de ordem de 08/10/2026 se arrumar sozinha ao gerar as partes de novo.
function _orcPosicaoFacilities_(idsDeck, parte) {
  const ordem = ORC_FACILITIES.partes, i = ordem.indexOf(parte);
  const pos = p => _orcListaFacilities_(p).map(id => idsDeck.indexOf(id)).filter(x => x >= 0);
  for (let j = i - 1; j >= 0; j--) { const a = pos(ordem[j]); if (a.length) return Math.max.apply(null, a) + 1; }
  for (let j = i + 1; j < ordem.length; j++) { const d = pos(ordem[j]); if (d.length) return Math.min.apply(null, d); }
  const minha = pos(parte);
  if (minha.length) return Math.min.apply(null, minha);
  return idsDeck.length;
}

function _orcGerarFacilities_(parte) {
  const deckId = _orcIdFacilities_();
  if (!deckId) throw new Error('Falta o deck de Facilities: rode criarDeckFacilities() (25_Facilities.gs) uma vez.');
  _orcTextosReiniciar_();
  _ORC_BLOBS = {};
  _ORC_PASTA_IMG = undefined;
  _ORC_LINKS = { alvos: {}, origens: [] };
  const props = PropertiesService.getScriptProperties();
  let deck = SlidesApp.openById(deckId);
  const W = deck.getPageWidth(), H = deck.getPageHeight();

  // 1) Tira os slides antigos desta parte (e o slide inicial do Slides), guardando a posição. O deck não pode ficar
  //    vazio: se só sobrariam os desta parte, um slide provisório segura o lugar e sai no fim.
  const idsDeck = deck.getSlides().map(s => s.getObjectId());
  const indice = _orcPosicaoFacilities_(idsDeck, parte);
  const sair = _orcListaFacilities_(parte).concat(JSON.parse(props.getProperty('ORC_FAC_INICIAL') || '[]'))
    .filter(id => idsDeck.indexOf(id) >= 0);
  let provisorio = null;
  if (sair.length && sair.length === idsDeck.length) provisorio = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK).getObjectId();
  const antes = sair.filter(id => idsDeck.indexOf(id) < indice).length;     // os que saem antes da posição
  sair.forEach(id => { const s = deck.getSlideById(id); if (s) s.remove(); });
  props.deleteProperty('ORC_FAC_INICIAL');
  props.setProperty('ORC_FAC_' + parte, '[]');
  if (sair.length) {
    _orcSalvarDeck_(deck, 'a limpeza dos slides antigos de ' + parte);
    deck = SlidesApp.openById(deckId);
  }

  // 2) Gera a parte na posição dela.
  _ORC_UNICO = { deckId: deckId, parte: parte, ids: [], indice: indice - antes, alvo: null };
  try {
    if (parte === 'ABERTURA') {
      _orcAplicarMarca_(null);
      _orcGerarAbertura_(deck, W, H);
    } else {
      _orcAplicarMarca_(ORC_CIDADES[parte]);
      _orcGerarCidade_(deck, W, H, parte);
    }
    _orcFacilitiesGuardarIds_();
  } finally {
    _orcFacilitiesGuardarIds_();
    _ORC_UNICO = null;
    _orcAplicarMarca_(null);
  }

  // 3) Links (sumários → seções, sumário de Facilities → capa de cada Mega) e o provisório.
  const final = SlidesApp.openById(deckId);
  if (provisorio) { const p = final.getSlideById(provisorio); if (p) p.remove(); }
  _orcLigarSecoes_(final, parte === 'ABERTURA' ? { nome: 'Facilities' } : ORC_CIDADES[parte]);
  _orcLigarFacilities_(final);
  const n = final.getSlides().length, url = final.getUrl();
  _orcLogMolduras_(parte);
  _orcSalvarDeck_(final, 'os links do deck de Facilities');
  _orcSalvarTextos_();
  Logger.log('Pronto: ' + parte + ' no deck de Facilities (' + n + ' slides no total) — ' + url);
}

// Sumário de Facilities → capa de cada Mega: as áreas clicáveis ficam na propriedade ORC_FAC_LINKS (gravada pela
// abertura) e a capa é o primeiro slide da lista do Mega. Refeito a cada geração, de qualquer parte.
function _orcLigarFacilities_(deck) {
  let links = {};
  try { links = JSON.parse(PropertiesService.getScriptProperties().getProperty('ORC_FAC_LINKS') || '{}'); } catch (e) { /* sem links */ }
  let n = 0;
  Object.keys(links).forEach(parte => {
    const capa = _orcListaFacilities_(parte)[0];
    const alvo = capa ? deck.getSlideById(capa) : null;
    if (!alvo) return;
    links[parte].forEach(id => {
      try { const pe = deck.getPageElementById(id); if (pe) { pe.asShape().setLinkSlide(alvo); n++; } }
      catch (e) { Logger.log('Link do sumário de Facilities para ' + parte + ' não criado: ' + e.message); }
    });
  });
  if (n) Logger.log('Facilities: ' + n + ' links do sumário para as capas dos Megas');
}

// ==========================================
// ABERTURA: capa, sumário e comparativo
// ==========================================
const ORC_FAC_MEGAS = ['ESTEIO', 'ITAJAI', 'CURITIBA'];

function _orcGerarAbertura_(deck, W, H) {
  const rels = {};
  ORC_FAC_MEGAS.forEach(k => {
    try { rels[k] = obterRelatorioAnual_(k); }
    catch (e) { Logger.log('Facilities: METRAGEM de ' + ORC_CIDADES[k].nome + ' indisponível — ' + e.message); }
  });
  _ORC_TRILHA = 0;
  _orcPasso_(deck, W, H, 'Capa — Facilities', s => gerarSlideCapaFacilities_(s, W, H, rels));
  _orcPasso_(deck, W, H, 'Sumário — Facilities', s => gerarSlideSumarioFacilities_(s, W, H, rels));
  _ORC_UNICO.alvo = 'COMPARATIVO';   // o link do sumário vai para o gráfico; a tabela vem logo depois
  _orcPasso_(deck, W, H, 'Os Megas lado a lado — gráfico', s => gerarSlideMegasGrafico_(s, W, H, rels));
  _orcPasso_(deck, W, H, 'Comparativo de R$/m² entre os Megas', s => gerarSlideComparativoM2_(s, W, H, rels));
  _orcPasso_(deck, W, H, 'Ranking dos Megas', s => gerarSlideRankingM2_(s, W, H, rels));
}

// Totais de Facilities: soma das METRAGENS (dinheiro e área implícita de cada ano).
function _orcTotaisFacilities_(rels) {
  const t = { orc: 0, ritmo: 0, areaOrc: 0, areaRitmo: 0 };
  Object.keys(rels).forEach(k => {
    const r = rels[k];
    t.orc += r.total.orc; t.ritmo += r.total.ritmo;
    t.areaOrc += _orcAreaImplicita_(r, 'orc') || 0; t.areaRitmo += _orcAreaImplicita_(r, 'ritmo') || 0;
  });
  return t;
}

function gerarSlideCapaFacilities_(slide, W, H, rels) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, k = W / 720;
  slide.getBackground().setSolidFill('#FFFFFF');
  const fundo = _orcImagemDaPasta_('CAPA - FACILITIES.jpg');
  if (fundo) slide.insertImage(fundo).setWidth(W).setHeight(H).setLeft(0).setTop(0);
  else {
    _orcRet_(slide, 0, 0, W, 210 * k, C.brandDark);
    _orcRet_(slide, 0, 210 * k, W, 4 * k, C.brandLight);
    _orcUmaLinha_(slide, 48 * k, 226 * k, 300 * k, 16 * k, 'ORÇAMENTO ' + ORC_ANO,
      { align: 'L', fs: 10, bold: true, cor: C.brandLight, fonte: T.titles });
    _orcUmaLinha_(slide, 46 * k, 242 * k, 320 * k, 54 * k, 'Facilities', { align: 'L', fs: 40, bold: true, cor: C.brandDark, fonte: T.titles });
    _orcUmaLinha_(slide, 48 * k, 296 * k, 330 * k, 18 * k, 'Mega Esteio · Mega Itajaí · Mega Curitiba',
      { align: 'L', fs: 11, cor: C.textBody, fonte: T.body, fsMin: 8 });
  }
  // Os donos dos Megas, lado a lado sobre a foto: Capital Realty e Demercado (Curitiba) — Guilherme, 07/10/2026.
  let x = 48 * k;
  ['CAPITAL', 'DEMERCADO'].forEach((m, i) => {
    try {
      const id = ORC_MARCAS[m].logos.fullNegativo;
      const b = /^pasta:/.test(id) ? _orcImagemDaPasta_(id.slice(6)) : _orcBlobDrive_(id);
      if (!b) return;
      if (i) { _orcRet_(slide, x, 30 * k, 1 * k, 24 * k, '#FFFFFF', { alpha: 0.6 }); x += 14 * k; }
      const img = slide.insertImage(b);
      const h = (m === 'DEMERCADO' ? 22 : 24) * k, w = h * img.getWidth() / img.getHeight();
      img.setWidth(w).setHeight(h).setLeft(x).setTop((m === 'DEMERCADO' ? 31 : 30) * k);
      x += w + 14 * k;
    } catch (e) { Logger.log('Capa de Facilities: logo ' + m + ' indisponível. ' + e.message); }
  });
  if (!Object.keys(rels).length) return;
  // Só o total em R$. Sem R$/m² e sem Δ% contra o ritmo: somados, os três Megas têm áreas diferentes
  // (o Esteio dobra) e os dois números distorcem — comentário do Jonatas, 08/10/2026.
  const t = _orcTotaisFacilities_(rels);
  _orcUmaLinha_(slide, 384 * k, 246 * k, 156 * k, 36 * k, _orcCompacto_(t.orc),
    { align: 'L', fs: 26, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 16 });
  _orcUmaLinha_(slide, 384 * k, 282 * k, 156 * k, 14 * k, 'Orçamento ' + ORC_ANO + ', os três Megas',
    { align: 'L', fs: 8.5, cor: C.textBody, fonte: T.body });
}

function gerarSlideSumarioFacilities_(slide, W, H, rels) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, k = W / 720;
  slide.getBackground().setSolidFill('#FFFFFF');
  _orcUmaLinha_(slide, 48 * k, 30 * k, 400 * k, 44 * k, 'Sumário', { align: 'L', fs: 32, bold: true, cor: C.brandDark, fonte: T.titles });
  _orcUmaLinha_(slide, 48 * k, 74 * k, 500 * k, 20 * k, 'Facilities · Orçamento ' + ORC_ANO,
    { align: 'L', fs: 12.5, cor: C.textBody, fonte: T.body });
  _orcRet_(slide, 48 * k, 102 * k, 40 * k, 3 * k, C.brandLight);
  const linhaMega = chave => {
    const r = rels[chave], cid = ORC_CIDADES[chave], marca = (ORC_MARCAS[cid.marca || 'CAPITAL'].marca || {}).nome;
    if (!r) return marca;
    const area = _orcAreaImplicita_(r, 'orc');
    return marca + ' · ' + _orcCompacto_(r.total.orc) + (area ? ' · R$ ' + _orcM2_(r.total.orc / area / 12) + '/m² ao mês' : '');
  };
  const itens = [['COMPARATIVO', 'Os Megas lado a lado', 'Quanto custa cada m² em cada Mega, linha a linha']]
    .concat(ORC_FAC_MEGAS.map(k2 => [k2, ORC_CIDADES[k2].nome, linhaMega(k2)]));
  const links = {};
  itens.forEach((it, i) => {
    const x = 48 * k, y = (126 + i * 62) * k, colW = 624;
    _orcRet_(slide, x, y, colW * k, 1 * k, C.lines);
    const num = _orcUmaLinha_(slide, x, y + 8 * k, 44 * k, 26 * k, ('0' + (i + 1)).slice(-2),
      { align: 'L', fs: 20, bold: true, cor: C.brandAccent, fonte: T.titles });
    const nome = _orcUmaLinha_(slide, x + 48 * k, y + 8 * k, (colW - 48) * k, 20 * k, it[1],
      { align: 'L', fs: 14, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 9 });
    _orcUmaLinha_(slide, x + 48 * k, y + 30 * k, (colW - 48) * k, 14 * k, it[2], { align: 'L', fs: 9.5, cor: C.textBody, fonte: T.body, fsMin: 7 });
    if (it[0] === 'COMPARATIVO') [num, nome].forEach(b => { if (b) _ORC_LINKS.origens.push({ id: b.getObjectId(), titulo: 'COMPARATIVO' }); });
    else links[it[0]] = [num, nome].filter(Boolean).map(b => b.getObjectId());
  });
  PropertiesService.getScriptProperties().setProperty('ORC_FAC_LINKS', JSON.stringify(links));
  _orcRodapeClaro_(slide, k, { nome: 'Mega Esteio, Itajaí e Curitiba' });
}

/**
 * Os Megas lado a lado: R$/m² ao mês do Orç do ano por conta, com a variação contra o ritmo, para cada Mega e para
 * Facilities (a soma dos três). Contas na ordem e nos grupos da DRE; o Mega mais caro de cada linha em negrito.
 * Pedido do gestor (07/10/2026): "quanto a gente investe em segurança por m² em cada Mega".
 */
function _orcComparativoM2_(rels) {
  const megas = ORC_FAC_MEGAS.filter(k => rels[k]);
  const area = {}, areaRit = {};
  megas.forEach(k => { area[k] = _orcAreaImplicita_(rels[k], 'orc'); areaRit[k] = _orcAreaImplicita_(rels[k], 'ritmo'); });
  const tot = _orcTotaisFacilities_(rels);
  const contasDe = r => r.contas.concat([{ nome: 'IPTU', chave: _orcChaveConta_('IPTU'), grupo: ORC_DRE_GRUPOS[ORC_DRE_GRUPOS.length - 1].nome, v: r.iptu },
                                         { nome: 'Seguro', chave: _orcChaveConta_('Seguro'), grupo: ORC_DRE_GRUPOS[ORC_DRE_GRUPOS.length - 1].nome, v: r.seguro }]);
  const porChave = {};
  megas.forEach(k => contasDe(rels[k]).forEach(c => {
    const e = porChave[c.chave] || (porChave[c.chave] = { nome: c.nome, grupo: c.grupo, v: {} });
    e.v[k] = c.v;
  }));
  const m2 = (v, a) => a ? v / a / 12 : null;
  const celulas = vs => {
    const out = {};
    megas.forEach(k => { const v = vs[k] || { orc: 0, ritmo: 0 }; out[k] = { orc: m2(v.orc, area[k]), ritmo: m2(v.ritmo, areaRit[k]) }; });
    const soma = c => megas.reduce((t, k) => t + ((vs[k] || {})[c] || 0), 0);
    out.FACILITIES = { orc: m2(soma('orc'), tot.areaOrc), ritmo: m2(soma('ritmo'), tot.areaRitmo) };
    return out;
  };
  const linhas = [{ tipo: 'total', nome: 'DESPESAS OPERACIONAIS', m: celulas(megas.reduce((o, k) => { o[k] = rels[k].total; return o; }, {})) }];
  ORC_DRE_GRUPOS.map(g => g.nome).concat([ORC_DRE_OUTRAS]).forEach(nomeGrupo => {
    const g = ORC_DRE_GRUPOS.filter(x => x.nome === nomeGrupo)[0];
    const ordem = c => { const i = g ? g.contas.map(_orcChaveConta_).indexOf(c) : -1; return i < 0 ? 999 : i; };
    const chaves = Object.keys(porChave).filter(c => porChave[c].grupo === nomeGrupo)
      // conta que não chega a R$ 0,01/m² ao mês em nenhum Mega não aparece (só somaria zeros na tabela)
      .filter(c => megas.some(k => area[k] && Math.abs(((porChave[c].v[k] || {}).orc) || 0) / area[k] / 12 >= 0.005))
      .sort((a, b) => ordem(a) - ordem(b));
    if (!chaves.length) return;
    const vGrupo = {};
    megas.forEach(k => { vGrupo[k] = ['orc', 'ritmo'].reduce((o, c) => { o[c] = Object.keys(porChave).filter(ch => porChave[ch].grupo === nomeGrupo)
      .reduce((t, ch) => t + (((porChave[ch].v[k] || {})[c]) || 0), 0); return o; }, {}); });
    linhas.push({ tipo: 'grupo', nome: nomeGrupo.toUpperCase(), m: celulas(vGrupo) });
    chaves.forEach(c => linhas.push({ tipo: 'item', nome: porChave[c].nome, m: celulas(porChave[c].v) }));
  });
  return { megas: megas, area: area, areaRit: areaRit, tot: tot, linhas: linhas };
}

function gerarSlideComparativoM2_(slide, W, H, rels) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  const cmp = _orcComparativoM2_(rels);
  const cols = cmp.megas.concat(['FACILITIES']);
  _orcHeader_(slide, W, 'Os Megas lado a lado — conta a conta',
    'Orçamento ' + ORC_ANO + ' em R$/m² ao mês e a variação contra o Ritmo ' + (ORC_ANO - 1) + ' · em destaque, o Mega mais caro da linha');
  const linhas = cmp.linhas.map(l => {
    const vals = cmp.megas.map(k => l.m[k].orc || 0);
    const maior = l.tipo === 'item' ? Math.max.apply(null, vals) : null;
    const cel = [];
    cols.forEach(k => {
      const c = l.m[k], v = _orcVariacao_(c.ritmo, c.orc, 0.005);
      cel.push({ texto: c.orc === null ? '–' : _orcM2_(c.orc), bold: maior !== null && k !== 'FACILITIES' && c.orc > 0.004 && Math.abs(c.orc - maior) < 1e-9 });
      cel.push({ texto: v.texto, sentido: v.sentido });
    });
    return { tipo: l.tipo, nome: l.nome, celulas: cel };
  });
  const r1 = v => (Math.round(v / 100) / 10).toLocaleString('pt-BR');
  linhas.push({ tipo: 'grupo', nome: 'ÁREA (MIL M²) · ORÇ ' + ORC_ANO, celulas: cols.reduce((a, k) => {
    const ao = k === 'FACILITIES' ? cmp.tot.areaOrc : cmp.area[k], ar = k === 'FACILITIES' ? cmp.tot.areaRitmo : cmp.areaRit[k];
    const v = ar && ao && Math.abs(ao / ar - 1) < 0.005 ? { texto: '=' } : _orcVariacao_(ar, ao);
    return a.concat([{ texto: ao ? r1(ao) : '–' }, { texto: v.texto, sentido: 0 }]);
  }, []) });
  const tw = W - MX * 2, labW = 200,   // 200 (era 176): "DESPESAS COM PESSOAL E ADMINISTRATIVAS" saía cortado (erro 9 da analista 4)
        cw = (tw - labW) / (cols.length * 2);
  const colunas = [{ titulo: 'R$/M² AO MÊS', w: labW }];
  cols.forEach(() => { colunas.push({ titulo: 'ORÇ ' + String(ORC_ANO).slice(-2), w: cw * 1.1, destaque: true }); colunas.push({ titulo: 'Δ% × RIT.', w: cw * 0.9 }); });
  const grupos = cols.map((k, i) => ({ titulo: k === 'FACILITIES' ? 'FACILITIES' : ORC_CIDADES[k].nome.toUpperCase(), c0: 1 + i * 2, n: 2,
                                        cor: k === 'FACILITIES' ? '#475569' : undefined }));
  _orcTabelaNum_(slide, MX, 72, tw, H - 30 - 72, colunas, linhas, grupos);
  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND de cada Mega · R$/m² pela área implícita de cada ano' + _orcNotaAreaMegas_(cmp));
}

// Mega com a área mudando mais de 10% do ritmo para o Orç: o R$/m² cai mesmo com a despesa subindo.
function _orcNotaAreaMegas_(cmp) {
  const r1 = v => (Math.round(v / 100) / 10).toLocaleString('pt-BR');
  const nota = cmp.megas.filter(k => cmp.area[k] && cmp.areaRit[k] && Math.abs(cmp.area[k] / cmp.areaRit[k] - 1) > 0.1)
    .map(k => ORC_CIDADES[k].nome.replace('Mega ', '') + ' ' + r1(cmp.areaRit[k]) + ' → ' + r1(cmp.area[k]));
  return nota.length ? ' · área mudou (mil m², ritmo → orç.): ' + nota.join(', ') + ' — o R$/m² cai mesmo com a despesa subindo' : '';
}

// ==========================================
// OS MEGAS LADO A LADO — GRÁFICO (rascunho aprovado em 07/10/2026)
// ==========================================
// As linhas que o diretor compara entre os Megas: conta (nome) ou grupo da DRE.
const ORC_FAC_PAINEIS = [
  { nome: 'Segurança e vigilância' },
  { nome: 'Manutenção de imóveis' },
  { grupo: 'Utilities, Taxas e Consumo', titulo: 'Utilities, taxas e consumo' },
  { nome: 'Limpeza e conservação' },
  { grupo: 'Despesas com Pessoal e Administrativas', titulo: 'Pessoal e administrativo' }
];

/**
 * Antes da tabela conta a conta: um card por Mega (e Facilities) com o R$/m²
 * das despesas operacionais, e um painel por linha de ORC_FAC_PAINEIS com uma
 * barra por Mega (o mais caro no tom escuro), o traço do ritmo, o tracejado de
 * Facilities e, no pé, quem é o mais caro e quanto acima de Facilities.
 */
function gerarSlideMegasGrafico_(slide, W, H, rels) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const cmp = _orcComparativoM2_(rels);
  _orcHeader_(slide, W, 'Os Megas lado a lado — R$/m² ao mês',
    'Orçamento ' + ORC_ANO + ' por m² nas principais linhas · traço = Ritmo ' + (ORC_ANO - 1) + ' · tracejado = Facilities');
  const variacao = c => _orcVariacao_(c.ritmo, c.orc, 0.005);

  // ---- Cards: despesas operacionais por m² ----
  const cols = cmp.megas.concat(['FACILITIES']), tot = cmp.linhas[0].m;
  const gap = 10, cw = (W - MX * 2 - gap * (cols.length - 1)) / cols.length, ky = 80, kh = 50;
  cols.forEach((k, i) => {
    const x = MX + i * (cw + gap), fac = k === 'FACILITIES', c = tot[k], v = variacao(c);
    _orcRet_(slide, x, ky, cw, kh, fac ? C.brandDark : C.cardBg, { redondo: true, borda: fac ? null : C.lines });
    _orcUmaLinha_(slide, x + 12, ky + 5, cw - 24, 12, fac ? 'FACILITIES' : ORC_CIDADES[k].nome.toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: fac ? C.brandSoft : C.textBody, fonte: T.titles });
    _orcUmaLinha_(slide, x + 12, ky + 16, cw - 24, 20, c.orc === null ? '–' : 'R$ ' + _orcM2_(c.orc) + '/m²',
      { align: 'L', fs: 15, fsMin: 10, bold: true, cor: fac ? '#FFFFFF' : C.brandDark, fonte: T.titles });
    _orcUmaLinha_(slide, x + 12, ky + 36, cw - 24, 11, v.texto + ' × ritmo ' + (ORC_ANO - 1) + ' · despesas operacionais',
      { align: 'L', fs: 6.5, fsMin: 5.5, bold: true, fonte: T.body, cortar: true,
        cor: fac ? (v.sentido > 0 ? _ORC_COR_VAR.sobeClaro : (v.sentido < 0 ? _ORC_COR_VAR.desceClaro : '#FFFFFF')) : _orcCorSentido_(v.sentido) });
  });

  // ---- Painéis ----
  const achar = p => cmp.linhas.filter(l => p.grupo ? l.tipo === 'grupo' && l.nome === p.grupo.toUpperCase()
                                                    : l.tipo === 'item' && _orcChaveConta_(l.nome) === _orcChaveConta_(p.nome))[0];
  const paineis = ORC_FAC_PAINEIS.map(p => ({ p: p, l: achar(p) })).filter(x => x.l);
  const pg = 8, pw = (W - MX * 2 - pg * (paineis.length - 1)) / Math.max(1, paineis.length);
  const py = ky + kh + 10, ph = H - 26 - py;
  const rowH = (ph - 26 - 40) / Math.max(1, cmp.megas.length);
  paineis.forEach((pn, j) => {
    const x = MX + j * (pw + pg), l = pn.l, fac = l.m.FACILITIES.orc;
    _orcRet_(slide, x, py, pw, ph, C.cardBg, { redondo: true, borda: C.lines });
    _orcUmaLinha_(slide, x + 9, py + 6, pw - 18, 12, (pn.p.titulo || l.nome).toUpperCase(),
      { align: 'L', fs: 5.8, fsMin: 5, bold: true, cor: C.textBody, fonte: T.titles, cortar: true });
    const vals = cmp.megas.map(k => l.m[k].orc || 0), rits = cmp.megas.map(k => l.m[k].ritmo || 0);
    const mx = Math.max.apply(null, vals.concat(rits, [fac || 0])) * 1.12 || 1;
    const bx = x + 9, bw = pw - 18, X = v => bx + bw * Math.max(0, v) / mx;
    const iMax = vals.indexOf(Math.max.apply(null, vals));
    cmp.megas.forEach((k, i) => {
      const yy = py + 24 + i * rowH, c = l.m[k], v = variacao(c);
      _orcUmaLinha_(slide, bx, yy, bw, 11, ORC_CIDADES[k].nome.replace('Mega ', ''),
        { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: T.body, folga: 4 });
      _orcRet_(slide, bx, yy + 12, bw, 11, C.brandTint);
      if (vals[i] > 0) _orcRet_(slide, bx, yy + 12, Math.max(0.8, X(vals[i]) - bx), 11, i === iMax ? C.brandDark : C.brandLight);
      if (rits[i] > 0) _orcLinha_(slide, X(rits[i]), yy + 9.5, X(rits[i]), yy + 25.5, C.textMain, 1.3);
      const tv = c.orc === null ? '–' : 'R$ ' + _orcM2_(c.orc);
      const lv = _orcLarguraTexto_(tv, 7.5, T.titles, true);
      _orcUmaLinha_(slide, bx - _ORC_RECUO_TEXTBOX / 2, yy + 26, lv + _ORC_RECUO_TEXTBOX, 11, tv,
        { align: 'L', fs: 7.5, fsMin: 7.5, bold: true, cor: C.brandDark, fonte: T.titles, folga: 6 });
      _orcUmaLinha_(slide, bx + lv + 4, yy + 26, bw - lv - 4, 11, v.texto,
        { align: 'L', fs: 6.5, fsMin: 5.5, bold: true, cor: _orcCorSentido_(v.sentido), fonte: T.body, folga: 4 });
    });
    if (fac) {
      const yb = py + 24 + cmp.megas.length * rowH;
      _orcLinha_(slide, X(fac), py + 34, X(fac), yb - 2, C.textBody, 0.7).setDashStyle(SlidesApp.DashStyle.DASH);
      _orcUmaLinha_(slide, X(fac) - 30, yb - 1, 60, 10, 'Facilities ' + _orcM2_(fac),
        { align: 'C', fs: 6, fsMin: 5.5, cor: C.textBody, fonte: T.body, folga: 6 });
    }
    _orcLinha_(slide, x + 9, py + ph - 32, x + pw - 9, py + ph - 32, C.lines, 0.6);
    _orcUmaLinha_(slide, x + 9, py + ph - 29, pw - 18, 11, 'Mais caro: ' + ORC_CIDADES[cmp.megas[iMax]].nome.replace('Mega ', ''),
      { align: 'L', fs: 7, fsMin: 6, bold: true, cor: C.brandDark, fonte: T.body, folga: 4 });
    if (fac) {
      const acima = vals[iMax] / fac - 1;
      _orcUmaLinha_(slide, x + 9, py + ph - 18, pw - 18, 11, Math.round(Math.abs(acima) * 100) + '%' + (acima >= 0 ? ' acima' : ' abaixo') + ' de Facilities',
        { align: 'L', fs: 6.5, fsMin: 5.5, cor: C.textBody, fonte: T.body, folga: 4 });
    }
  });
  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND de cada Mega · R$/m² pela área implícita de cada ano · a tabela conta a conta vem a seguir' +
    _orcNotaAreaMegas_(cmp));
}

/**
 * Ranking dos Megas (V4 — gestor, 08/10/2026: "monta apenas um ranking lado a lado, das maiores para as menores
 * contas, ordenando pela média de facilities; não precisa colocar o delta"). Rascunho aprovado pelo Guilherme em
 * 08/10/2026 (ferramentas/rascunhos/ranking_megas_rascunho.py). Uma linha por conta, do maior para o menor R$/m² ao
 * mês de Facilities; quatro barras (os três Megas e Facilities) e os valores à direita, o Mega mais caro em destaque.
 */
const ORC_RANKING_CORES = { ESTEIO: '#1F3B73', ITAJAI: '#3E6DB5', CURITIBA: '#00594F', FACILITIES: '#9AA5B1' };
const ORC_RANKING_SIGLA = { ESTEIO: 'ESTEIO', ITAJAI: 'ITAJAÍ', CURITIBA: 'CURITIBA', FACILITIES: 'FACILITIES' };

function gerarSlideRankingM2_(slide, W, H, rels) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const cmp = _orcComparativoM2_(rels);
  const cols = cmp.megas.concat(['FACILITIES']);
  _orcHeader_(slide, W, 'Ranking dos Megas — R$/m² ao mês por conta',
    'Orçamento ' + ORC_ANO + ' · contas do maior para o menor custo por m² de Facilities · em destaque, o Mega mais caro da linha');
  const linhas = cmp.linhas.filter(l => l.tipo === 'item' && (l.m.FACILITIES.orc || 0) >= 0.005)
    .sort((a, b) => (b.m.FACILITIES.orc || 0) - (a.m.FACILITIES.orc || 0));
  if (!linhas.length) return;

  // Legenda no topo, à direita.
  let lx = W - MX;
  cols.slice().reverse().forEach(k => {
    const nome = k === 'FACILITIES' ? 'Facilities' : ORC_CIDADES[k].nome;
    const lw = _orcLarguraTexto_(nome, 7, T.body) + 22;
    lx -= lw;
    _orcRet_(slide, lx, 72, 7, 7, ORC_RANKING_CORES[k]);
    _orcUmaLinha_(slide, lx + 10, 68, lw - 10, 14, nome, { align: 'L', fs: 7, cor: C.textBody, fonte: T.body, folga: 12 });
  });

  const top = 98, base = H - 30, rowH = Math.min(18, (base - top) / linhas.length);
  const xNome = MX + 18, xBar = MX + 178, valW = 40, xVal = W - MX - valW * cols.length, xFim = xVal - 14;
  const vmax = Math.max.apply(null, linhas.map(l => Math.max.apply(null, cols.map(k => l.m[k].orc || 0)))) || 1;
  const barH = Math.max(1.5, (rowH - 4) / cols.length);
  cols.forEach((k, j) => {
    _orcUmaLinha_(slide, xVal + j * valW, top - 13, valW - 2, 11, ORC_RANKING_SIGLA[k],
      { align: 'R', fs: 5.8, bold: true, cor: C.textMuted, fonte: T.titles, folga: 10 });
  });
  linhas.forEach((l, i) => {
    const y = top + i * rowH;
    if (i % 2 === 0) _orcRet_(slide, MX, y, W - MX * 2, rowH, '#F8FAFC');
    _orcUmaLinha_(slide, MX + 2, y, 14, rowH, String(i + 1), { align: 'L', fs: 7, bold: true, cor: C.textMuted, fonte: T.titles, folga: 8 });
    _orcUmaLinha_(slide, xNome, y, xBar - xNome - 6, rowH, l.nome,
      { align: 'L', fs: 7.5, fsMin: 6, bold: true, cor: C.brandDark, fonte: T.titles, cortar: true });
    cols.forEach((k, j) => {
      const v = l.m[k].orc || 0, w = (xFim - xBar) * v / vmax;
      if (w > 0.3) _orcRet_(slide, xBar, y + 2 + j * barH, w, Math.max(1, barH - 0.6), ORC_RANKING_CORES[k]);
    });
    const caro = cmp.megas.reduce((m, k) => (l.m[k].orc || 0) > (l.m[m].orc || 0) ? k : m, cmp.megas[0]);
    cols.forEach((k, j) => {
      const fac = k === 'FACILITIES', dest = fac || k === caro;
      _orcUmaLinha_(slide, xVal + j * valW, y, valW - 2, rowH, _orcM2_(l.m[k].orc),
        { align: 'R', fs: 7, bold: dest, cor: fac ? C.brandDark : (k === caro ? ORC_RANKING_CORES[k] : C.textBody),
          fonte: T.body, folga: 10 });
    });
  });
  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND de cada Mega · R$/m² ao mês do Orç ' + ORC_ANO + ' pela área implícita de cada Mega');
}
