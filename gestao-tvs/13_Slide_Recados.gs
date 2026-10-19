/**
 * ARQUIVO: 13_Slide_Recados.gs
 * DESCRIÇÃO: Recados — o último slide da TV, com o que estiver em Recados.gs
 *            (avisos, notícias, eventos da empresa). É o desenho; o conteúdo
 *            se edita em Recados.gs.
 *
 *   1 recado valendo  → página inteira: etiqueta, título grande, texto e, se
 *                       tiver, a foto à direita (ou o destaque num bloco na
 *                       cor da marca, sem foto);
 *   2 ou 3            → lado a lado, um cartão cada (sem foto);
 *   nenhum            → RECADO_PADRAO — o slide nunca fica vazio, porque a
 *                       TV abre uma lista fixa de links (Painel_<Mega>.txt):
 *                       não dá para o slide sumir e voltar sem mandar outro
 *                       arquivo para a TI.
 *
 * Posição: último do deck; na TV, o último também (gerarArquivosPainelTV).
 */


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
// Depois de editar Recados.gs: salve e rode esta.
function ATUALIZAR_RECADOS() {
  UNITS.forEach(unit => {
    try {
      const deck = SlidesApp.openById(unit.deckId);
      let slides = deck.getSlides();
      const idx = _recadosIndice_(unit);
      while (slides.length < idx + 1) { deck.appendSlide(SlidesApp.PredefinedLayout.BLANK); slides = deck.getSlides(); }
      atualizarSlideRecados(slides[idx], unit);
    } catch (e) {
      Logger.log('❌ Recados (' + unit.name + '): ' + e.message);
    }
  });
}

// Último do deck: depois da Chuva e, com portal, do Fluig.
function _recadosIndice_(unit) {
  return _chuvaIndice_(unit) + 1 + (unit.portalEmpreendimento ? 1 : 0);
}


// ==========================================
// QUAIS RECADOS VALEM HOJE
// ==========================================
function _recadosDaUnidade_(unit) {
  // Recados.gs faltando no editor não pode derrubar a atualização das TVs.
  const lista = typeof RECADOS !== 'undefined' && Array.isArray(RECADOS) ? RECADOS : [];
  if (typeof RECADOS === 'undefined') Logger.log('⚠️ Recados: Recados.gs não está no projeto — vai o recado padrão.');
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const nome = _histNorm_(unit.name);

  return lista.filter((r, i) => {
    if (!r || r.ativo !== true) return false;
    if (!String(r.titulo || '').trim() && !String(r.texto || '').trim()) return false;
    const megas = r.megas === undefined || r.megas === null || r.megas === '' ? 'TODOS' : r.megas;
    if (_histNorm_(String(megas)) !== 'todos' &&
        ![].concat(megas).some(t => nome.indexOf(_histNorm_(t)) >= 0)) return false;
    const de = _recData_(r.de, i, 'de'), ate = _recData_(r.ate, i, 'ate');
    if (de && hoje < de) return false;
    if (ate && hoje > ate) return false;
    return true;
  });
}

// 'dd/mm/aaaa' ou 'aaaa-mm-dd' → 'aaaa-mm-dd'. Vazio = sem limite. Data que
// não dá para ler é ignorada, com aviso no Logger (melhor mostrar o recado
// do que sumir com ele por um erro de digitação).
function _recData_(v, i, campo) {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, 'America/Sao_Paulo', 'yyyy-MM-dd');
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  Logger.log('⚠️ Recados: o recado nº ' + (i + 1) + ' tem "' + campo + ': ' + s + '" — use dd/mm/aaaa. Data ignorada.');
  return null;
}


// ==========================================
// DESENHO
// ==========================================
function atualizarSlideRecados(slide, unit) {
  const ativos = _recadosDaUnidade_(unit);
  if (ativos.length > 3) {
    Logger.log('⚠️ Recados (' + unit.name + '): ' + ativos.length + ' valendo — cabem 3; vão os 3 primeiros da lista.');
  }
  const padrao = typeof RECADO_PADRAO !== 'undefined' && RECADO_PADRAO ? RECADO_PADRAO
    : { etiqueta: 'Facilities', titulo: 'Bom trabalho, equipe!', texto: '' };
  const mostrar = ativos.length ? ativos.slice(0, 3) : [padrao];

  slide.getPageElements().forEach(el => el.remove());
  _tvAplicarMarca_(unit);
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;

  // A foto entra ANTES de tudo (o que sobra dela é coberto com a cor do fundo).
  const um = mostrar[0], comFoto = mostrar.length === 1 && !!um.fotoId &&
    _tvFotoEmBloco_(slide, String(um.fotoId).trim(), 410, 84, 280, 294, 0.5, c.bgSlide);

  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  applyBrandHeaderAndBackground(slide, 'Recados',
    mostrar.length > 1 ? mostrar.length + ' comunicados' : (ativos.length ? 'Comunicado' : 'Comunicados internos'),
    hoje, unit, { dataLabel: hoje });

  if (mostrar.length === 1) _recUm_(slide, um, comFoto);
  else {
    const gap = 12, w = (660 - gap * (mostrar.length - 1)) / mostrar.length;
    mostrar.forEach((r, i) => _recCartao_(slide, 30 + i * (w + gap), 84, w, 294, r));
  }

  _tvRodape_(slide, 'Comunicados internos · ' + _tvNomeUnidade_(unit) + ' · ' +
                    (unit.marca === 'DEMERCADO' ? 'Demercado Investimentos' : 'Capital Realty'));
  Logger.log('✅ Recados (' + unit.name + '): ' +
             (ativos.length ? mostrar.map(r => '"' + (r.titulo || r.etiqueta || '') + '"').join(', ') : 'recado padrão'));
}

// Etiqueta: pílula na cor de destaque, texto branco em caixa alta. Devolve a altura.
function _recEtiqueta_(slide, x, y, texto) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const t = String(texto || '').trim().toUpperCase();
  if (!t) return 0;
  const w = Math.min(260, _tvLargura_(t, 8.5, DS.typography.titles, true) + _TV_RECUO_ + 10);
  _tvRet_(slide, x, y, w, 18, c.brandLight, { redondo: true });
  _tvTexto_(slide, x, y, w, 18, t, { fs: 8.5, fsMin: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, align: 'C', cortar: true });
  return 18;
}

// Um recado só: cartão grande à esquerda; à direita, a foto ou o destaque.
function _recUm_(slide, r, comFoto) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const temDestaque = !!String(r.destaque || '').trim();
  const lado = comFoto || temDestaque;
  const x = 30, y = 84, w = lado ? 370 : 660, h = 294;
  _tvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _tvRet_(slide, x, y + 14, 5, h - 28, c.brandLight);

  const xi = x + 22, wi = w - 40;
  const temEtiqueta = !!String(r.etiqueta || '').trim();
  const destaqueEmbaixo = comFoto && temDestaque;   // com foto, o destaque vai no cartão

  // Mede antes de desenhar, para centralizar o bloco na altura do cartão: um
  // recado curto não fica grudado em cima com o cartão vazio embaixo.
  const opTit = { fs: lado ? 26 : 32, fsMin: 16, bold: true, cor: c.brandDark, fonte: DS.typography.heading };
  const opTxt = { fs: lado ? 14 : 16, fsMin: 9, cor: c.textBody, fonte: DS.typography.body };
  const util = h - 44, alturaEtq = temEtiqueta ? 30 : 0, alturaDest = destaqueEmbaixo ? 40 : 0;
  const mTit = _tvMedirParagrafo_(wi, lado ? 96 : 84, r.titulo || '', opTit);
  const altTit = mTit ? mTit.altura + 10 : 0;
  const mTxt = _tvMedirParagrafo_(wi, util - alturaEtq - altTit - alturaDest, r.texto || '', opTxt);
  const total = alturaEtq + altTit + (mTxt ? mTxt.altura : 0) + alturaDest;
  let cy = y + 22 + Math.max(0, (util - total) / 2);

  if (temEtiqueta) { _recEtiqueta_(slide, xi + 7, cy, r.etiqueta); cy += alturaEtq; }
  if (mTit) { _tvParagrafo_(slide, xi, cy, wi, mTit.altura + 1, r.titulo, opTit); cy += altTit; }
  if (mTxt) { _tvParagrafo_(slide, xi, cy, wi, mTxt.altura + 1, r.texto, opTxt); cy += mTxt.altura; }
  if (destaqueEmbaixo) {
    _tvTexto_(slide, xi, cy + 8, wi, 30, String(r.destaque),
      { fs: 20, fsMin: 12, bold: true, cor: c.brandLight, fonte: DS.typography.titles, cortar: true });
  }

  // Sem foto e com destaque: bloco na cor da marca com a data/número grande.
  if (!comFoto && temDestaque) {
    _tvRet_(slide, 410, y, 280, h, c.brandDark, { redondo: true });
    const mD = _tvMedirParagrafo_(248, 160, String(r.destaque),
      { fs: 34, fsMin: 16, bold: true, fonte: DS.typography.titles });
    if (mD) {
      _tvParagrafo_(slide, 426, y + (h - mD.altura) / 2, 248, mD.altura + 1, String(r.destaque),
        { fs: 34, fsMin: 16, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, align: 'C' });
    }
    _tvRet_(slide, 520, y + (h + (mD ? mD.altura : 0)) / 2 + 4, 60, 4, c.brandLight);
  }
}

// 2 ou 3 recados: um cartão por recado.
function _recCartao_(slide, x, y, w, h, r) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  _tvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _tvRet_(slide, x, y + 12, 4, h - 24, c.brandLight);
  const xi = x + 14, wi = w - 24;
  let cy = y + 18;
  cy += _recEtiqueta_(slide, xi + 7, cy, r.etiqueta) ? 28 : 0;
  const tit = _tvParagrafo_(slide, xi, cy, wi, 84, r.titulo || '',
    { fs: 20, fsMin: 13, bold: true, cor: c.brandDark, fonte: DS.typography.heading });
  cy += tit ? tit.altura + 6 : 0;
  if (String(r.destaque || '').trim()) {
    _tvTexto_(slide, xi, cy, wi, 26, String(r.destaque),
      { fs: 17, fsMin: 10, bold: true, cor: c.brandLight, fonte: DS.typography.titles, cortar: true });
    cy += 32;
  }
  _tvParagrafo_(slide, xi, cy, wi, y + h - 12 - cy, r.texto || '',
    { fs: 12, fsMin: 8.5, cor: c.textBody, fonte: DS.typography.body });
}
