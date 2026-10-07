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
 * na mesma posição. Ordem do deck: abertura, Curitiba, Itajaí, Esteio — qualquer parte pode ser gerada antes das
 * outras. Dentro de cada Mega: capa do Mega, revisão (interna), sumário do Mega e as seções, sem sub capas — a trilha
 * de progresso no topo marca a seção, e o link do sumário vai para o primeiro slide dela.
 * As três apresentações por Mega (gerarCuritiba…) continuam funcionando até a validação do deck único.
 */

const ORC_FACILITIES = {
  nome: 'FACILITIES - APRESENTAÇÃO ORÇAMENTO ' + ORC_ANO,
  deckId: '',                                   // vazio: vale a propriedade gravada por criarDeckFacilities()
  partes: ['ABERTURA', 'CURITIBA', 'ITAJAI', 'ESTEIO']
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

// Posição da parte no deck: onde estava (o primeiro slide dela) ou logo depois da parte anterior que já existe; sem
// nenhuma antes, antes da primeira que vem depois; sem nada, no fim.
function _orcPosicaoFacilities_(idsDeck, parte) {
  const ordem = ORC_FACILITIES.partes, i = ordem.indexOf(parte);
  const pos = p => _orcListaFacilities_(p).map(id => idsDeck.indexOf(id)).filter(x => x >= 0);
  const minha = pos(parte);
  if (minha.length) return Math.min.apply(null, minha);
  for (let j = i - 1; j >= 0; j--) { const a = pos(ordem[j]); if (a.length) return Math.max.apply(null, a) + 1; }
  for (let j = i + 1; j < ordem.length; j++) { const d = pos(ordem[j]); if (d.length) return Math.min.apply(null, d); }
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
const ORC_FAC_MEGAS = ['CURITIBA', 'ITAJAI', 'ESTEIO'];

function _orcGerarAbertura_(deck, W, H) {
  const rels = {};
  ORC_FAC_MEGAS.forEach(k => {
    try { rels[k] = obterRelatorioAnual_(k); }
    catch (e) { Logger.log('Facilities: METRAGEM de ' + ORC_CIDADES[k].nome + ' indisponível — ' + e.message); }
  });
  _ORC_TRILHA = 0;
  _orcPasso_(deck, W, H, 'Capa — Facilities', s => gerarSlideCapaFacilities_(s, W, H, rels));
  _orcPasso_(deck, W, H, 'Sumário — Facilities', s => gerarSlideSumarioFacilities_(s, W, H, rels));
  _ORC_UNICO.alvo = 'COMPARATIVO';
  _orcPasso_(deck, W, H, 'Comparativo de R$/m² entre os Megas', s => gerarSlideComparativoM2_(s, W, H, rels));
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
    _orcUmaLinha_(slide, 48 * k, 296 * k, 330 * k, 18 * k, 'Mega Curitiba · Mega Itajaí · Mega Esteio',
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
  const t = _orcTotaisFacilities_(rels);
  const v = _orcVariacao_(t.ritmo, t.orc);
  _orcUmaLinha_(slide, 384 * k, 246 * k, 156 * k, 36 * k, _orcCompacto_(t.orc),
    { align: 'L', fs: 26, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 16 });
  _orcUmaLinha_(slide, 384 * k, 282 * k, 156 * k, 14 * k, 'Orçamento ' + ORC_ANO + ', os três Megas',
    { align: 'L', fs: 8.5, cor: C.textBody, fonte: T.body });
  [[t.areaOrc ? 'R$ ' + _orcM2_(t.orc / t.areaOrc / 12) : '–', '/m² ao mês'], [v.texto, 'vs. ritmo ' + (ORC_ANO - 1)]].forEach((n, i) => {
    _orcUmaLinha_(slide, (546 + i * 80) * k, 252 * k, 76 * k, 22 * k, n[0],
      { align: 'L', fs: 16, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 10 });
    _orcUmaLinha_(slide, (546 + i * 80) * k, 274 * k, 76 * k, 14 * k, n[1],
      { align: 'L', fs: 8.5, cor: C.textBody, fonte: T.body });
  });
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
  _orcRodapeClaro_(slide, k, { nome: 'Mega Curitiba, Itajaí e Esteio' });
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
  _orcHeader_(slide, W, 'Os Megas lado a lado — R$/m² ao mês',
    'Orçamento ' + ORC_ANO + ' por m², conta a conta, e a variação contra o Ritmo ' + (ORC_ANO - 1) + ' · em negrito, o Mega mais caro da linha');
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
    const v = ar && ao && Math.abs(ao / ar - 1) < 0.005 ? { texto: '0%' } : _orcVariacao_(ar, ao);
    return a.concat([{ texto: ao ? r1(ao) : '–' }, { texto: v.texto, sentido: 0 }]);
  }, []) });
  const tw = W - MX * 2, labW = 176, cw = (tw - labW) / (cols.length * 2);
  const colunas = [{ titulo: 'R$/M² AO MÊS', w: labW }];
  cols.forEach(() => { colunas.push({ titulo: 'ORÇ ' + String(ORC_ANO).slice(-2), w: cw * 1.1, destaque: true }); colunas.push({ titulo: 'Δ% × RIT.', w: cw * 0.9 }); });
  const grupos = cols.map((k, i) => ({ titulo: k === 'FACILITIES' ? 'FACILITIES' : ORC_CIDADES[k].nome.toUpperCase(), c0: 1 + i * 2, n: 2,
                                        cor: k === 'FACILITIES' ? '#475569' : undefined }));
  _orcTabelaNum_(slide, MX, 72, tw, H - 30 - 72, colunas, linhas, grupos);
  const notaArea = cmp.megas.filter(k => cmp.area[k] && cmp.areaRit[k] && Math.abs(cmp.area[k] / cmp.areaRit[k] - 1) > 0.1)
    .map(k => ORC_CIDADES[k].nome.replace('Mega ', '') + ' ' + r1(cmp.areaRit[k]) + ' → ' + r1(cmp.area[k]));
  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND de cada Mega · R$/m² pela área implícita de cada ano' +
    (notaArea.length ? ' · área mudou (mil m², ritmo → orç.): ' + notaArea.join(', ') + ' — o R$/m² cai mesmo com a despesa subindo' : ''));
}
