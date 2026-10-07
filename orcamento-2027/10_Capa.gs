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
// SUB CAPA DE SEÇÃO — "relatório claro" (C1, escolhida em 07/10/2026)
// ==========================================
// Divisória no padrão de relatório de auditoria/consultoria (IDEIAS-DESIGN.md,
// "Decisão de 07/10/2026"): fundo branco, número da seção grande, título,
// frase, o número da seção em destaque (R$, R$/m² ao mês e variação contra o
// ritmo), a foto colorida num bloco à direita e, embaixo, a trilha com as
// seções do deck — a atual destacada, as outras são link para a sub capa
// delas. Medidas em pt de uma página 720×405, escaladas para a página real.
// O número vem primeiro e o título logo depois (o teste procura assim).
function gerarSlideSubcapa_(slide, W, H, cid, numero, titulo, destaque, secoes) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, k = W / 720;
  const cfg = ORC_SUBCAPAS[titulo] || {};
  slide.getBackground().setSolidFill('#FFFFFF');
  _ORC_LINKS.alvos[titulo] = slide.getObjectId();

  // A foto primeiro: o que passa do bloco é coberto, e o resto vem por cima.
  const chave = cfg.foto === 'MEGA' ? cid.nome.toUpperCase() : cfg.foto;
  const fotoId = cfg.foto === 'MEGA' ? cid.fotoFundoId : ORC_FOTOS_SECAO[cfg.foto];
  const bx = 410 * k, by = 30 * k, bw = 274 * k, bh = 262 * k;
  if (!_orcFotoEmBloco_(slide, W, H, fotoId, bx, by, bw, bh, ORC_FOTO_FOCO[chave])) {
    _orcRet_(slide, bx, by, bw, bh, C.zebra);
  }
  _orcRet_(slide, bx, by, 4 * k, bh, C.brandLight);

  _orcUmaLinha_(slide, 46 * k, 26 * k, 200 * k, 66 * k, ('0' + numero).slice(-2),
    { align: 'L', fs: 54, bold: true, cor: '#60A5FA', fonte: T.titles });
  _orcUmaLinha_(slide, 48 * k, 116 * k, 340 * k, 44 * k, titulo,
    { align: 'L', fs: 32, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 20 });
  if (cfg.frase) {
    _orcUmaLinha_(slide, 48 * k, 160 * k, 340 * k, 22 * k, cfg.frase,
      { align: 'L', fs: 12.5, cor: C.textBody, fonte: T.body, fsMin: 9 });
  }
  _orcRet_(slide, 48 * k, 190 * k, 40 * k, 3 * k, C.brandLight);

  // O número da seção: o valor grande e até dois números menores ao lado.
  if (destaque) {
    _orcUmaLinha_(slide, 48 * k, 200 * k, 170 * k, 40 * k, destaque.valor,
      { align: 'L', fs: 28, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 16 });
    _orcUmaLinha_(slide, 48 * k, 240 * k, 170 * k, 14 * k, destaque.rotulo,
      { align: 'L', fs: 9, cor: C.textBody, fonte: T.body, fsMin: 7 });
    (destaque.kpis || []).slice(0, 2).forEach((kp, i) => {
      const x = (222 + i * 90) * k;
      _orcUmaLinha_(slide, x, 208 * k, 80 * k, 22 * k, kp[0],
        { align: 'L', fs: 16, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 10 });
      _orcUmaLinha_(slide, x, 230 * k, 80 * k, 14 * k, kp[1],
        { align: 'L', fs: 9, cor: C.textBody, fonte: T.body, fsMin: 6.5 });
    });
  }

  _orcTrilhaSecoes_(slide, k, secoes || [titulo], titulo);
  _orcRodapeClaro_(slide, k, cid);
}

// Trilha das seções no pé da sub capa: uma coluna por seção, a atual com o
// filete grosso e o nome em negrito; as outras viram link (_orcLigarSecoes_).
function _orcTrilhaSecoes_(slide, k, secoes, atual) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, larg = 636 / secoes.length;
  secoes.forEach((t, i) => {
    const x = (48 + i * larg) * k, w = (larg - 6) * k, eh = t === atual;
    _orcRet_(slide, x, (eh ? 311 : 312) * k, w, (eh ? 3 : 1) * k, eh ? C.brandLight : C.lines);
    const num = _orcUmaLinha_(slide, x, 318 * k, w, 12 * k, ('0' + (i + 1)).slice(-2),
      { align: 'L', fs: 8, bold: true, cor: eh ? C.brandLight : C.textMuted, fonte: DS.typography.titles });
    const nome = _orcParagrafo_(slide, x, 329 * k, w, 26 * k, t,
      { fs: 7.5, fsMin: 6, bold: eh, cor: eh ? C.brandDark : C.textMuted, fonte: DS.typography.body });
    if (!eh) [num, nome].forEach(b => { if (b) _ORC_LINKS.origens.push({ id: b.getObjectId(), titulo: t }); });
  });
}

function _orcRodapeClaro_(slide, k, cid) {
  const DS = CR_DESIGN_SYSTEM;
  _orcLinha_(slide, 48 * k, 372 * k, 684 * k, 372 * k, DS.colors.lines, 0.75);
  _orcUmaLinha_(slide, 48 * k, 376 * k, 500 * k, 16 * k,
    cid.nome + ' · Orçamento ' + ORC_ANO + ' · Capital Realty · Facilities',
    { align: 'L', fs: 7.5, cor: DS.colors.textMuted, fonte: DS.typography.body });
}

// Foto colorida cobrindo o bloco (x, y, w, h) sem deformar, com o ponto de
// interesse (foco, fração da largura) no centro quando dá. O Apps Script não
// recorta imagem: o que passa do bloco é coberto de branco (o fundo da sub
// capa) — por isso a foto entra antes de todo o resto. O branco vai 2 pt além
// da borda da foto: borda com borda, o Slides suaviza e sobra um fio cinza
// contornando a foto (visto em 07/10/2026). false se não carregou.
function _orcFotoEmBloco_(slide, W, H, fotoId, x, y, w, h, foco) {
  if (!fotoId) return false;
  try {
    const img = slide.insertImage(_orcBlobDrive_(fotoId, true));
    const ar = img.getWidth() / img.getHeight();
    const iw = ar > w / h ? h * ar : w, ih = ar > w / h ? h : w / ar;
    const f = foco == null ? 0.5 : foco;
    const ix = Math.min(x, Math.max(x + w - iw, x + w / 2 - f * iw)), iy = y + (h - ih) / 2;
    img.setWidth(iw).setHeight(ih).setLeft(ix).setTop(iy);
    const f2 = 2 * W / 720, sobra = 0.01;   // folga além da borda da foto
    const mascaras = [];
    if (x - ix > sobra) mascaras.push([ix - f2, iy - f2, x - ix + f2, ih + 2 * f2]);                       // esquerda
    if (ix + iw - x - w > sobra) mascaras.push([x + w, iy - f2, ix + iw - x - w + f2, ih + 2 * f2]);       // direita
    if (y - iy > sobra) mascaras.push([x, iy - f2, w, y - iy + f2]);                                       // em cima
    if (iy + ih - y - h > sobra) mascaras.push([x, y + h, w, iy + ih - y - h + f2]);                       // embaixo
    mascaras.forEach(m => {
      const x0 = Math.max(0, m[0]), y0 = Math.max(0, m[1]);
      const x1 = Math.min(W, m[0] + m[2]), y1 = Math.min(H, m[1] + m[3]);
      if (x1 - x0 > 0.5 && y1 - y0 > 0.5) _orcRet_(slide, x0, y0, x1 - x0, y1 - y0, '#FFFFFF');
    });
    return true;
  } catch (e) {
    Logger.log('Foto da sub capa indisponível (' + fotoId + '). ' + e.message);
    return false;
  }
}

// O número que abre a seção: { valor, rotulo, kpis: [[número, rótulo], …] }
// ou null (seção sem número). Contas em foco: orçamento da conta; Resumo: o
// total; Custo por m²: o R$/m² ao mês. Ao lado, o R$/m² ao mês e a variação
// contra o ritmo do ano anterior.
function _orcDestaqueSecao_(titulo, rel, contas) {
  const area = _orcAreaImplicita_(rel, 'orc'), aRit = _orcAreaImplicita_(rel, 'ritmo');
  const contra = vr => vr.texto !== '–' ? [vr.texto, 'vs. ritmo ' + (ORC_ANO - 1)] : null;
  if (titulo === 'Custo por m²') {
    if (!area) return null;
    const m2 = rel.total.orc / area / 12;
    return { valor: 'R$ ' + _orcM2_(m2), rotulo: 'por m² ao mês, todas as contas',
             kpis: [aRit ? contra(_orcVariacao_(rel.total.ritmo / aRit / 12, m2, 0.005)) : null].filter(Boolean) };
  }
  const iConta = { 'Manutenção': 0, 'Segurança': 1, 'Limpeza e Conservação': 2 }[titulo];
  let v, rotulo;
  if (iConta !== undefined && contas) { v = contas[iConta].v; rotulo = 'Orçamento ' + ORC_ANO + ' da conta'; }
  else if (titulo === 'Resumo Executivo') { v = rel.total; rotulo = 'Orçamento ' + ORC_ANO + ', todas as contas'; }
  else return null;
  return { valor: _orcCompacto_(v.orc), rotulo: rotulo,
           kpis: [area ? ['R$ ' + _orcM2_(v.orc / area / 12), '/m² ao mês'] : null,
                  contra(_orcVariacao_(v.ritmo, v.orc))].filter(Boolean) };
}

// ==========================================
// SUMÁRIO (pedido do usuário em 07/10/2026)
// ==========================================
// Logo depois da capa (e do "Revisar", quando ele existe), no mesmo estilo da
// sub capa: as seções que este deck tem, em duas colunas, cada uma com o
// número, o nome e a frase dela. Número e nome são link para a sub capa.
function gerarSlideSumario_(slide, W, H, cid, secoes) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, k = W / 720;
  slide.getBackground().setSolidFill('#FFFFFF');
  _orcUmaLinha_(slide, 48 * k, 30 * k, 400 * k, 44 * k, 'Sumário',
    { align: 'L', fs: 32, bold: true, cor: C.brandDark, fonte: T.titles });
  _orcUmaLinha_(slide, 48 * k, 74 * k, 500 * k, 20 * k, cid.nome + ' · Orçamento ' + ORC_ANO,
    { align: 'L', fs: 12.5, cor: C.textBody, fonte: T.body });
  _orcRet_(slide, 48 * k, 102 * k, 40 * k, 3 * k, C.brandLight);

  const porColuna = Math.max(1, Math.ceil(secoes.length / 2)), colW = 312;
  secoes.forEach((t, i) => {
    const x = (48 + Math.floor(i / porColuna) * 324) * k, y = (126 + (i % porColuna) * 58) * k;
    _orcRet_(slide, x, y, colW * k, 1 * k, C.lines);
    const num = _orcUmaLinha_(slide, x, y + 8 * k, 44 * k, 26 * k, ('0' + (i + 1)).slice(-2),
      { align: 'L', fs: 20, bold: true, cor: '#60A5FA', fonte: T.titles });
    const nome = _orcUmaLinha_(slide, x + 48 * k, y + 8 * k, (colW - 48) * k, 20 * k, t,
      { align: 'L', fs: 13, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 9 });
    const frase = (ORC_SUBCAPAS[t] || {}).frase;
    if (frase) {
      _orcUmaLinha_(slide, x + 48 * k, y + 29 * k, (colW - 48) * k, 14 * k, frase,
        { align: 'L', fs: 9, cor: C.textBody, fonte: T.body, fsMin: 7 });
    }
    [num, nome].forEach(b => { if (b) _ORC_LINKS.origens.push({ id: b.getObjectId(), titulo: t }); });
  });
  _orcRodapeClaro_(slide, k, cid);
}

// Links do sumário e das trilhas: cada origem aponta para a sub capa da sua
// seção. Feito no fim, com a apresentação gravada e reaberta (as sub capas
// das seções seguintes ainda não existem quando o sumário é desenhado).
let _ORC_LINKS = { alvos: {}, origens: [] };
function _orcLigarSecoes_(deck, cid) {
  let n = 0;
  _ORC_LINKS.origens.forEach(o => {
    const alvoId = _ORC_LINKS.alvos[o.titulo];
    if (!alvoId) return;
    try {
      const alvo = deck.getSlideById(alvoId), pe = deck.getPageElementById(o.id);
      if (alvo && pe) { pe.asShape().setLinkSlide(alvo); n++; }
    } catch (e) {
      Logger.log('Link para ' + o.titulo + ' não criado: ' + e.message);
    }
  });
  Logger.log(cid.nome + ': ' + n + ' links do sumário e das trilhas para as sub capas');
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
