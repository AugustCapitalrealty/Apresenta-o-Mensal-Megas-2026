/**
 * ARQUIVO: 10_Capa.gs
 * SLIDES:  Capa da cidade, sub capa de cada seção e o slide de Premissas.
 *          São a estrutura do deck: só a capa mostra números (total e
 *          R$/m² do orçamento, do relatório que o gerador já leu).
 */

// ==========================================
// COMPONENTES DA CAPA (mesma linguagem da capa dos Megas — megas-mensal/
// 10_Slide_Capas.gs: foto full-bleed com véu, scrim que some para a direita,
// anéis e triângulo do brandbook, espinha em gradiente)
// ==========================================
// O Slides não tem gradiente nativo: faixa de N retângulos com a cor e/ou a
// opacidade interpoladas.
function _orcHexLerp_(a, b, t) {
  const pa = [1, 3, 5].map(k => parseInt(a.substr(k, 2), 16)), pb = [1, 3, 5].map(k => parseInt(b.substr(k, 2), 16));
  return '#' + pa.map((v, k) => Math.max(0, Math.min(255, Math.round(v + (pb[k] - v) * t))).toString(16).padStart(2, '0')).join('');
}
function _orcGradiente_(slide, x, y, w, h, c1, c2, op) {
  const o = op || {}, n = o.passos || 24, vert = !!o.vertical;
  const aF = o.alphaDe != null ? o.alphaDe : 1, aT = o.alphaAte != null ? o.alphaAte : aF;
  if (c1 === c2 && aF !== aT) return _orcGradienteAlpha_(slide, x, y, w, h, c1, aF, aT, n, vert);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    // A sobreposição de 0,8pt não deixa fresta entre as faixas, mas a última
    // não passa da borda.
    const sx = vert ? x : x + i * w / n, sy = vert ? y + i * h / n : y;
    const sw = vert ? w : Math.min(w / n + 0.8, x + w - sx), sh = vert ? Math.min(h / n + 0.8, y + h - sy) : h;
    _orcRet_(slide, sx, sy, sw, sh, _orcHexLerp_(c1, c2, t), { alpha: Math.max(0, Math.min(1, aF + (aT - aF) * t)) });
  }
}

// Véu que some (mesma cor, transparência variando): faixas lado a lado deixam
// LISTRAS onde duas semitransparentes se encostam (visto na sub capa em
// 07/10/2026). Aqui são camadas empilhadas a partir do lado mais opaco, cada
// uma mais curta que a anterior: a opacidade soma sem emenda nenhuma. A
// camada j cobre do lado opaco até o fim da faixa j, e a sua transparência
// faz o acumulado da faixa j bater com a reta de aF a aT:
//   (1 − alpha_j) = (1 − alvo_j) / (1 − alvo_j+1).
function _orcGradienteAlpha_(slide, x, y, w, h, cor, aF, aT, n, vert) {
  const fim = aF < aT;   // o lado opaco é o fim (direita/baixo)
  const alvo = j => {
    const t = n === 1 ? 0 : j / (n - 1), de = fim ? aT : aF, ate = fim ? aF : aT;
    return Math.max(0, Math.min(1, de + (ate - de) * t));
  };
  const L = vert ? h : w;
  let transDepois = 1;   // transparência acumulada das faixas além da j
  for (let j = n - 1; j >= 0; j--) {
    const trans = 1 - alvo(j);
    const a = transDepois > 0 ? 1 - trans / transDepois : 0;
    transDepois = trans;
    if (a < 0.004) continue;
    const len = L * (j + 1) / n;
    const ini = fim ? (vert ? y + h : x + w) - len : (vert ? y : x);
    if (vert) _orcRet_(slide, x, ini, w, len, cor, { alpha: a });
    else _orcRet_(slide, ini, y, len, h, cor, { alpha: a });
  }
}

// Foto cobrindo a página (sem distorcer; a sobra fica fora da borda) + véu.
function _orcFotoFundo_(slide, W, H, fotoId, cor, alpha) {
  if (!fotoId) return false;
  try {
    const img = slide.insertImage(_orcBlobDrive_(fotoId, true));
    const ar = img.getWidth() / img.getHeight();
    const w = ar > W / H ? H * ar : W, h = ar > W / H ? H : W / ar;
    img.setWidth(w).setHeight(h).setLeft((W - w) / 2).setTop((H - h) / 2);
    _orcRet_(slide, 0, 0, W, H, cor, { alpha: alpha });
    return true;
  } catch (e) {
    Logger.log('Foto de fundo indisponível (' + fotoId + '). ' + e.message);
    return false;
  }
}

// Logo do Mega num chip branco no canto superior direito (contraste sobre a
// foto). Sem logo, não desenha nada.
function _orcLogoMega_(slide, W, id) {
  if (!id) return;
  const bw = 104, bh = 34, x = W - 42 - bw, y = 28;
  try {
    const img = slide.insertImage(_orcBlobDrive_(id));
    _orcRet_(slide, x - 12, y - 7, bw + 24, bh + 14, '#FFFFFF', { redondo: true, alpha: 0.95 });
    const ar = img.getWidth() / img.getHeight();
    let w = bw, h = bw / ar;
    if (h > bh) { h = bh; w = bh * ar; }
    img.setWidth(w).setHeight(h).setLeft(x + (bw - w) / 2).setTop(y + (bh - h) / 2);
    img.bringToFront();
  } catch (e) {
    Logger.log('Capa: logo do Mega indisponível (' + id + '). ' + e.message);
  }
}

/**
 * Capa da cidade: foto do Mega (a mesma da capa da apresentação mensal),
 * véu azul, o nome do Mega como herói e dois números do orçamento — em
 * dinheiro e em m², como o diretor lê (06/10/2026). Sem foto, fundo escuro
 * com o grafismo; sem relatório (rel null), sem os números.
 */
function gerarSlideCapa_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  slide.getBackground().setSolidFill(C.brandDark);
  const AZUL = '#60A5FA';

  if (_orcFotoFundo_(slide, W, H, cid.fotoFundoId, C.brandDark, 0.45)) {
    // Scrim: escurece a esquerda para o texto ler e some rumo à direita.
    _orcGradiente_(slide, 0, 0, W * 0.66, H, C.brandDark, C.brandDark, { alphaDe: 0.7, alphaAte: 0, passos: 24 });
    _orcGradiente_(slide, 0, H - 90, W, 90, C.brandDark, C.brandDark, { vertical: true, alphaDe: 0, alphaAte: 0.6, passos: 12 });
  } else {
    const halo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 300, -220, 560, 560);
    halo.getFill().setSolidFill(C.brandLight, 0.12); halo.getBorder().setTransparent();
    const massa = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -220, H - 240, 500, 500);
    massa.getFill().setSolidFill(C.brandMed, 0.22); massa.getBorder().setTransparent();
  }
  // Anéis e triângulo do brandbook, translúcidos, à direita.
  [[W - 270, 40, 430, 1.25, 0.14], [W - 225, 85, 330, 1, 0.08]].forEach(r => {
    const anel = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, r[0], r[1], r[2], r[2]);
    anel.getFill().setTransparent();
    anel.getBorder().getLineFill().setSolidFill('#FFFFFF', r[4]); anel.getBorder().setWeight(r[3]);
  });
  const tri = slide.insertShape(SlidesApp.ShapeType.TRIANGLE, W - 175, 160, 92, 83);
  tri.getFill().setSolidFill('#FFFFFF', 0.08); tri.getBorder().setTransparent();
  _orcGradiente_(slide, 0, 0, 6, H, C.brandLight, C.brandSoft, { vertical: true, passos: 24 });   // espinha

  // Logo Capital Realty branco; sem a imagem, o nome em texto.
  try {
    const img = slide.insertImage(_orcBlobDrive_(LOGOS_CR.fullNegativo));
    const h = 30, w = h * img.getWidth() / img.getHeight();
    img.setWidth(w).setHeight(h).setLeft(44).setTop(32);
  } catch (e) {
    Logger.log('Capa: logo indisponível, usando texto. ' + e.message);
    _orcUmaLinha_(slide, 44, 32, 260, 26, 'CAPITAL REALTY',
      { align: 'L', fs: 15, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles });
  }
  _orcLogoMega_(slide, W, cid.unitLogoId);

  // Título: o Mega é o herói (pedido do gestor, 29/09/2026 — o deck cobre o
  // orçamento do Mega, não só a manutenção).
  const y0 = Math.round(H * 0.27);
  _orcUmaLinha_(slide, 46, y0, W - 160, 18, ('Orçamento ' + ORC_ANO).toUpperCase().split('').join(' '),
    { align: 'L', fs: 10, bold: true, cor: AZUL, fonte: DS.typography.titles });
  _orcGradiente_(slide, 48, y0 + 24, 66, 4, C.brandLight, AZUL, { passos: 12 });
  _orcUmaLinha_(slide, 44, y0 + 32, W - 160, 52, cid.nome,
    { align: 'L', fs: 40, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 22 });
  _orcUmaLinha_(slide, 46, y0 + 84, W - 160, 20, 'Despesas do condomínio · Ritmo ' + (ORC_ANO - 1) + ' → Orçamento ' + ORC_ANO,
    { align: 'L', fs: 12, cor: '#CBD5E1', fonte: DS.typography.body, fsMin: 9 });

  // Os dois números do orçamento, em vidro (dinheiro e m²).
  if (rel) {
    const area = _orcAreaImplicita_(rel, 'orc');
    const vT = _orcVariacao_(rel.total.ritmo, rel.total.orc);
    const chips = [
      ['ORÇAMENTO ' + ORC_ANO, _orcCompacto_(rel.total.orc), vT.texto !== '–' ? vT.texto + ' × ritmo' : ''],
      ['CUSTO POR M² AO MÊS', area ? 'R$ ' + _orcM2_(rel.total.orc / area / 12) : '–',
       area && _orcAreaImplicita_(rel, 'ritmo') ? _orcM2_(rel.total.ritmo / _orcAreaImplicita_(rel, 'ritmo') / 12) + ' no ritmo' : '']
    ];
    const cyChip = y0 + 118, ch = 50, cw = 168;
    chips.forEach((c, k) => {
      const x = 46 + k * (cw + 12);
      _orcRet_(slide, x, cyChip, cw, ch, '#FFFFFF', { redondo: true, alpha: 0.1, borda: AZUL, peso: 0.75 });
      _orcRet_(slide, x, cyChip + 10, 3, ch - 20, AZUL);
      _orcUmaLinha_(slide, x + 12, cyChip + 5, cw - 20, 13, c[0],
        { align: 'L', fs: 6.5, bold: true, cor: AZUL, fonte: DS.typography.titles, fsMin: 5.5 });
      _orcUmaLinha_(slide, x + 12, cyChip + 17, cw - 20, 22, c[1],
        { align: 'L', fs: 16, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 10 });
      if (c[2]) {
        _orcUmaLinha_(slide, x + 12, cyChip + 36, cw - 20, 12, c[2],
          { align: 'L', fs: 6.5, cor: '#CBD5E1', fonte: DS.typography.body, fsMin: 5.5 });
      }
    });
  }

  _orcLinha_(slide, 42, H - 40, W - 42, H - 40, '#475569', 0.75);
  _orcUmaLinha_(slide, 42, H - 34, W - 280, 18, 'CAPITAL REALTY · FACILITIES · PLANEJAMENTO ' + ORC_ANO,
    { align: 'L', fs: 7, bold: true, cor: '#94A3B8', fonte: DS.typography.body });
  _orcRet_(slide, W - 192, H - 29, 6, 6, AZUL, { redondo: true });
  _orcUmaLinha_(slide, W - 180, H - 34, 140, 18, 'Expandir Eficiência',
    { align: 'L', fs: 9, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles });
}

// ==========================================
// SUB CAPA DE SEÇÃO
// ==========================================
// Abre cada seção do deck (Premissas, Resumo Executivo, DRE, Manutenção,
// Segurança, Limpeza), como o gestor montou à mão na revisão de 30/09/2026.
// Desde 07/10/2026 no padrão das capas de seção da apresentação mensal
// (megas-mensal/10_Slide_Capas.gs, gerarCapaSecao): foto do tema com véu
// azul, scrim que some para a direita, espinha em gradiente e o desenho da
// seção à direita, no azul de destaque. A foto e o desenho de cada seção
// estão em ORC_SUBCAPAS (01_Config.gs). Sem foto, fundo azul-escuro.
// O número vem primeiro e o título logo depois (o teste procura assim).
// Com a foto tratada na pasta das imagens, sai a sub capa "recorte"
// (_orcSubcapaRecorte_); sem ela, a do padrão da mensal, abaixo.
function gerarSlideSubcapa_(slide, W, H, cid, numero, titulo, destaque) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, AZUL = '#60A5FA';
  const cfg = ORC_SUBCAPAS[titulo] || {};
  const peca = cfg.foto ? _orcImagemSubcapa_('SUBCAPA - ' + (cfg.foto === 'MEGA' ? cid.nome.toUpperCase() : cfg.foto) + '.png') : null;
  if (peca) return _orcSubcapaRecorte_(slide, W, H, cid, numero, titulo, cfg, peca, destaque);
  const fotoId = cfg.foto === 'MEGA' ? cid.fotoFundoId : ORC_FOTOS_SECAO[cfg.foto];
  slide.getBackground().setSolidFill(C.brandDark);

  if (_orcFotoFundo_(slide, W, H, fotoId, C.brandDark, 0.5)) {
    _orcGradiente_(slide, 0, 0, W * 0.62, H, C.brandDark, C.brandDark, { alphaDe: 0.55, alphaAte: 0, passos: 22 });
  } else {
    // Grafismo de fundo: a elipse SANGRA para fora da página de propósito.
    const halo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 260, H - 250, 460, 460);
    halo.getFill().setSolidFill(C.brandLight, 0.12); halo.getBorder().setTransparent();
  }
  _orcGradiente_(slide, 0, 0, 6, H, C.brandLight, C.brandSoft, { vertical: true, passos: 24 });   // espinha

  const y0 = Math.round(H * 0.28);
  _orcUmaLinha_(slide, 48, y0, 160, 56, ('0' + numero).slice(-2),
    { align: 'L', fs: 40, bold: true, cor: AZUL, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, 48, y0 + 58, W * 0.62, 44, titulo,
    { align: 'L', fs: 30, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 18 });
  _orcRet_(slide, 55, y0 + 108, 56, 3, AZUL);
  _orcUmaLinha_(slide, 48, y0 + 118, W * 0.62, 18, cid.nome + ' · Orçamento ' + ORC_ANO,
    { align: 'L', fs: 10, cor: '#CBD5E1', fonte: DS.typography.body });

  _orcLinha_(slide, 42, H - 40, W - 42, H - 40, '#475569', 0.75);
  _orcUmaLinha_(slide, 42, H - 34, W - 84, 18, 'Capital Realty · Facilities · Planejamento ' + ORC_ANO,
    { align: 'L', fs: 7.5, bold: true, cor: '#94A3B8', fonte: DS.typography.body });

  _orcMotivoSecao_(slide, cfg.motivo, W * 0.80, H * 0.42, AZUL);
}

// ==========================================
// SUB CAPA "RECORTE" (jeito das capas de vídeo, 07/10/2026)
// ==========================================
// Receita das thumbs/cartazes (orcamento-2027/IDEIAS-DESIGN.md): fundo
// escuro com UMA forma de cor (o painel azul à direita), a foto da seção como
// um recorte de papel em retícula colado por cima (meio no painel, meio fora,
// levemente girado), título grande, uma frase em serifa itálica com o traço
// de caneta embaixo e o número da seção como protagonista.
function _orcSubcapaRecorte_(slide, W, H, cid, numero, titulo, cfg, peca, destaque) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, AZUL = '#60A5FA';
  slide.getBackground().setSolidFill(C.brandDark);
  _orcRet_(slide, W * 0.64, 0, W * 0.36, H, C.brandLight);   // a forma de cor

  // O recorte: já vem com papel, borda rasgada e sombra (PNG transparente).
  const img = slide.insertImage(peca);
  const ar = img.getWidth() / img.getHeight();
  let h = H * 0.86, w = h * ar;
  if (w > W * 0.44) { w = W * 0.44; h = w / ar; }
  img.setWidth(w).setHeight(h).setLeft(W * 0.745 - w / 2).setTop(H * 0.47 - h / 2);
  img.setRotation(-2.5);

  const x = 48, tw = W * 0.5, y0 = Math.round(H * 0.2);
  _orcUmaLinha_(slide, x, y0, 160, 40, ('0' + numero).slice(-2),
    { align: 'L', fs: 28, bold: true, cor: AZUL, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, x, y0 + 36, tw, 48, titulo,
    { align: 'L', fs: 34, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 20 });
  if (cfg.frase) {
    _orcUmaLinha_(slide, x, y0 + 84, tw, 26, cfg.frase,
      { align: 'L', fs: 15, italic: true, cor: AZUL, fonte: 'Playfair Display', fsMin: 10 });
    const caneta = _orcImagemSubcapa_('CANETA - SUBLINHADO.png');
    if (caneta) {
      const c = slide.insertImage(caneta);
      const cw = 150, ch = cw * c.getHeight() / c.getWidth();
      c.setWidth(cw).setHeight(ch).setLeft(x + 2).setTop(y0 + 101);
    }
  }

  // O número da seção (R$ e R$/m² ao mês, como o diretor lê).
  if (destaque) {
    _orcUmaLinha_(slide, x, H * 0.6, tw, 42, destaque.valor,
      { align: 'L', fs: 30, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, fsMin: 18 });
    _orcUmaLinha_(slide, x, H * 0.6 + 40, tw, 16, destaque.linha,
      { align: 'L', fs: 9, cor: '#CBD5E1', fonte: DS.typography.body, fsMin: 7 });
  }
  _orcUmaLinha_(slide, x, H - 62, tw, 16, cid.nome + ' · Orçamento ' + ORC_ANO,
    { align: 'L', fs: 9, cor: '#94A3B8', fonte: DS.typography.body });

  _orcLinha_(slide, 42, H - 40, W * 0.64 - 12, H - 40, '#475569', 0.75);
  _orcUmaLinha_(slide, 42, H - 34, W * 0.6 - 42, 18, 'Capital Realty · Facilities · Planejamento ' + ORC_ANO,
    { align: 'L', fs: 7.5, bold: true, cor: '#94A3B8', fonte: DS.typography.body });
}

// O número que abre a seção: { valor, linha } ou null (seção sem número).
// Contas em foco: orçamento da conta; Resumo: o total; Custo por m²: o R$/m²
// ao mês. A linha leva o R$/m² e a variação contra o ritmo do ano anterior.
function _orcDestaqueSecao_(titulo, rel, contas) {
  const area = _orcAreaImplicita_(rel, 'orc'), aRit = _orcAreaImplicita_(rel, 'ritmo');
  const contra = vr => vr.texto !== '–' ? vr.texto + ' × ritmo ' + (ORC_ANO - 1) : null;
  if (titulo === 'Custo por m²') {
    if (!area) return null;
    const m2 = rel.total.orc / area / 12;
    const vr = aRit ? contra(_orcVariacao_(rel.total.ritmo / aRit / 12, m2, 0.005)) : null;
    return { valor: 'R$ ' + _orcM2_(m2) + '/m²', linha: ['ao mês, todas as contas', vr].filter(Boolean).join(' · ') };
  }
  const iConta = { 'Manutenção': 0, 'Segurança': 1, 'Limpeza e Conservação': 2 }[titulo];
  let v, rotulo;
  if (iConta !== undefined && contas) { v = contas[iConta].v; rotulo = 'orçamento ' + ORC_ANO + ' da conta'; }
  else if (titulo === 'Resumo Executivo') { v = rel.total; rotulo = 'orçamento ' + ORC_ANO + ', todas as contas'; }
  else return null;
  const m2 = area ? 'R$ ' + _orcM2_(v.orc / area / 12) + '/m² ao mês' : null;
  return { valor: _orcCompacto_(v.orc), linha: [rotulo, m2, contra(_orcVariacao_(v.ritmo, v.orc))].filter(Boolean).join(' · ') };
}

// Arquivo da pasta das imagens das sub capas (blob) ou null. A pasta é
// procurada uma vez por geração (_orcGerar_ zera _ORC_PASTA_IMG).
let _ORC_PASTA_IMG;
function _orcImagemSubcapa_(nome) {
  if (_ORC_PASTA_IMG === undefined) {
    _ORC_PASTA_IMG = null;
    try {
      const it = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID).getFoldersByName(ORC_PASTA_IMAGENS_SUBCAPAS);
      if (it.hasNext()) _ORC_PASTA_IMG = it.next();
    } catch (e) {
      Logger.log('Imagens das sub capas indisponíveis: ' + e.message);
    }
  }
  if (!_ORC_PASTA_IMG) return null;
  const k = 'pasta:' + nome;   // no mesmo cache das imagens (a caneta vai em 8 sub capas)
  if (!(k in _ORC_BLOBS)) {
    try {
      const f = _ORC_PASTA_IMG.getFilesByName(nome);
      _ORC_BLOBS[k] = { blob: f.hasNext() ? f.next().getBlob() : null };
    } catch (e) {
      Logger.log('Imagem ' + nome + ' indisponível: ' + e.message);
      _ORC_BLOBS[k] = { blob: null };
    }
  }
  return _ORC_BLOBS[k].blob;
}

// ==========================================
// DESENHO DA SEÇÃO (sub capa)
// ==========================================
// Os mesmos motivos das capas de seção da mensal (megas-mensal/
// 10_Slide_Capas.gs, _secMot*_), em formas nativas: branco translúcido (lê
// sobre a foto) e UM realce na cor de destaque, centrados em (cx, cy).
function _orcMotivoSecao_(s, chave, cx, cy, cor) {
  switch (chave) {
    case 'PREVENTIVA':   return _orcMotPreventiva_(s, cx, cy, cor);
    case 'CONTRATADOS':  return _orcMotContratados_(s, cx, cy, cor);
    case 'INTERNOS':     return _orcMotInternos_(s, cx, cy, cor);
    case 'PATRIMONIAL':  return _orcMotPatrimonial_(s, cx, cy, cor);
    case 'OPERACIONAL':  return _orcMotOperacional_(s, cx, cy, cor);
    case 'DOCUMENTACAO': return _orcMotDocumentacao_(s, cx, cy, cor);
    case 'M2':           return _orcMotM2_(s, cx, cy, cor);
    default:   // ANEIS e qualquer chave sem desenho: os anéis da capa
      _orcAnel_(s, cx - 75, cy - 75, 150, '#FFFFFF', 1.25, 0.14);
      _orcAnel_(s, cx - 55, cy - 55, 110, cor, 1, 0.5);
  }
}

function _orcAnel_(s, x, y, tam, cor, peso, alpha) {
  const c = s.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, tam, tam);
  c.getFill().setTransparent();
  c.getBorder().getLineFill().setSolidFill(cor, alpha == null ? 1 : alpha);
  c.getBorder().setWeight(peso || 1);
  return c;
}

// Forma só com contorno translúcido.
function _orcContorno_(s, tipo, x, y, w, h, cor, alpha, peso) {
  const f = s.insertShape(tipo, x, y, w, h);
  f.getFill().setTransparent();
  f.getBorder().getLineFill().setSolidFill(cor, alpha);
  f.getBorder().setWeight(peso);
  return f;
}

// MANUTENÇÃO — grade 3×3 (plano/calendário), célula central em destaque.
function _orcMotPreventiva_(s, cx, cy, cor) {
  const cell = 22, gap = 9, n = 3, span = n * cell + (n - 1) * gap;
  const x0 = cx - span / 2, y0 = cy - span / 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = x0 + c * (cell + gap), y = y0 + r * (cell + gap);
    if (r === 1 && c === 1) _orcRet_(s, x, y, cell, cell, cor, { redondo: true, alpha: 0.9 });
    else _orcContorno_(s, SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, cell, cell, '#FFFFFF', 0.5, 1.5);
  }
}

// LIMPEZA (serviço contratado) — dois anéis entrelaçados, um em destaque.
function _orcMotContratados_(s, cx, cy, cor) {
  _orcAnel_(s, cx - 56, cy - 36, 72, '#FFFFFF', 2.5, 0.5);
  _orcAnel_(s, cx - 16, cy - 36, 72, cor, 2.5, 0.85);
}

// PROJETOS — skyline de barras (predial), uma barra em destaque.
function _orcMotInternos_(s, cx, cy, cor) {
  const alt = [38, 64, 50, 78, 44], bw = 14, gap = 8;
  const span = alt.length * bw + (alt.length - 1) * gap, x0 = cx - span / 2, base = cy + 42;
  alt.forEach((hh, i) => _orcRet_(s, x0 + i * (bw + gap), base - hh, bw, hh, i === 3 ? cor : '#FFFFFF',
    { redondo: true, alpha: i === 3 ? 0.85 : 0.28 }));
  _orcRet_(s, x0 - 6, base, span + 12, 2, '#FFFFFF', { alpha: 0.5 });
}

// SEGURANÇA — cadeado, a fechadura em destaque.
function _orcMotPatrimonial_(s, cx, cy, cor) {
  _orcAnel_(s, cx - 20, cy - 42, 40, '#FFFFFF', 3, 0.5);   // arco
  const corpo = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx - 28, cy - 14, 56, 48);
  corpo.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark, 0.55);   // cobre a base do arco
  corpo.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.6); corpo.getBorder().setWeight(2.5);
  const fech = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 6, cy + 2, 12, 12);
  fech.getFill().setSolidFill(cor, 0.95); fech.getBorder().setTransparent();
  _orcRet_(s, cx - 2, cy + 11, 4, 12, cor, { alpha: 0.95 });
}

// DRE — barras crescentes + seta (resultado), a última em destaque.
function _orcMotOperacional_(s, cx, cy, cor) {
  const alt = [30, 48, 66, 86], bw = 16, gap = 10;
  const span = alt.length * bw + (alt.length - 1) * gap, x0 = cx - span / 2, base = cy + 44;
  alt.forEach((hh, i) => {
    const ult = i === alt.length - 1;
    _orcRet_(s, x0 + i * (bw + gap), base - hh, bw, hh, ult ? cor : '#FFFFFF', { redondo: true, alpha: ult ? 0.85 : 0.3 });
  });
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE, x0 + span - bw - 4, base - alt[3] - 26, 24, 22);
  tri.getFill().setSolidFill(cor, 0.9); tri.getBorder().setTransparent();
  _orcRet_(s, x0 - 6, base, span + 12, 2, '#FFFFFF', { alpha: 0.5 });
}

// PREMISSAS — pilha de papéis, a faixa de cima em destaque.
function _orcMotDocumentacao_(s, cx, cy, cor) {
  _orcRet_(s, cx - 16, cy - 26, 56, 74, '#FFFFFF', { redondo: true, alpha: 0.25 });
  _orcRet_(s, cx - 23, cy - 33, 56, 74, '#FFFFFF', { redondo: true, alpha: 0.4 });
  _orcRet_(s, cx - 30, cy - 40, 56, 74, '#FFFFFF', { redondo: true, alpha: 0.92 });
  _orcRet_(s, cx - 30, cy - 40, 56, 9, cor, { alpha: 0.9 });
  for (let i = 0; i < 4; i++) _orcRet_(s, cx - 22, cy - 18 + i * 12, i === 3 ? 24 : 40, 3, '#94A3B8', { alpha: 0.9 });
}

// CUSTO POR M² — planta de galpão vista de cima (só do orçamento): contorno,
// dois módulos com um em destaque, e a régua de cota embaixo.
function _orcMotM2_(s, cx, cy, cor) {
  const w = 104, h = 70, x0 = cx - w / 2, y0 = cy - h / 2 - 6;
  _orcContorno_(s, SlidesApp.ShapeType.RECTANGLE, x0, y0, w, h, '#FFFFFF', 0.55, 2);
  _orcRet_(s, x0 + w / 2 - 1, y0, 2, h, '#FFFFFF', { alpha: 0.4 });              // parede entre os módulos
  _orcRet_(s, x0 + w / 2 + 6, y0 + 6, w / 2 - 12, h - 12, cor, { alpha: 0.85 });   // módulo em destaque
  const yr = y0 + h + 12;                                                         // régua
  _orcRet_(s, x0, yr, w, 1.5, '#FFFFFF', { alpha: 0.6 });
  [x0, x0 + w / 2 - 0.75, x0 + w - 1.5].forEach(x => _orcRet_(s, x, yr - 4, 1.5, 9, '#FFFFFF', { alpha: 0.6 }));
}

// ==========================================
// PREMISSAS
// ==========================================
// [chave em cid.premissas, título do bloco, o que vai nele]
const ORC_PREMISSAS_BLOCOS = [
  ['premissas', 'Premissas',            'as bases adotadas no orçamento'],
  ['analisado', 'O que foi analisado',  'fontes, contas e períodos considerados'],
  ['comoLer',   'Como ler o relatório', 'o que cada seção mostra e como interpretar']
];
const ORC_PREMISSAS_VAZIO = 'Escreva aqui.';

// Três blocos que o gestor preenche. Sem texto em cid.premissas, cada bloco
// leva uma caixa com "Escreva aqui." para ele digitar por cima no Slides — a
// caixa já tem fonte e cor do corpo, então o que ele digitar sai no padrão.
function gerarSlidePremissas_(slide, W, H, cid) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const textos = cid.premissas || {};
  _orcHeader_(slide, W, 'Premissas — Orçamento ' + ORC_ANO,
    cid.nome + ' · como o orçamento foi construído e como ler esta apresentação');

  const ty = 74, gap = 10, cw = (W - MX * 2 - gap * 2) / 3, ch = H - 28 - ty;
  ORC_PREMISSAS_BLOCOS.forEach((b, i) => {
    const x = MX + i * (cw + gap);
    _orcRet_(slide, x, ty, cw, ch, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, x, ty, cw, 4, C.brandLight);
    _orcUmaLinha_(slide, x + 12, ty + 12, cw - 24, 20, b[1],
      { align: 'L', fs: 12, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    _orcUmaLinha_(slide, x + 12, ty + 32, cw - 24, 14, b[2],
      { align: 'L', fs: 7.5, italic: true, cor: C.textMuted, fonte: DS.typography.body, cortar: true });
    _orcLinha_(slide, x + 12, ty + 52, x + cw - 12, ty + 52, C.lines, 0.75);
    const texto = String(textos[b[0]] || '').trim();
    _orcParagrafo_(slide, x + 8, ty + 58, cw - 16, ch - 66, texto || ORC_PREMISSAS_VAZIO,
      { fs: 9, fsMin: 6.5, cor: C.textBody });
  });
}
