/**
 * ARQUIVO: Slide_CapasComuns.gs
 * COMPONENTES COMPARTILHADOS DAS CAPAS
 *
 * Portado de megas-mensal/Slide_CapasComuns.gs (é cópia, não import — ver
 * CLAUDE.md da raiz). Linguagem visual premium sobre fundo escuro
 * institucional, dentro do design system Capital Realty (CR_DESIGN_SYSTEM em
 * 01_Config.gs). Sem gradientes nativos (a API do Slides não suporta) — a
 * sensação de profundidade vem de camadas translúcidas + faixas de gradiente
 * simuladas por segmentos interpolados.
 *
 * Ficaram de fora os helpers específicos de Mega (_capaMegaLogo_,
 * _capaFotoFundo_) — este projeto não tem foto de fundo nem logo de unidade
 * por enquanto; a capa usa o fundo escuro premium padrão (_capaFundo_).
 */

// Interpola dois hex (#RRGGBB) por t∈[0,1] → hex. Base do gradiente simulado.
function _capaHexLerp_(a, b, t) {
  const pa = [parseInt(a.substr(1, 2), 16), parseInt(a.substr(3, 2), 16), parseInt(a.substr(5, 2), 16)];
  const pb = [parseInt(b.substr(1, 2), 16), parseInt(b.substr(3, 2), 16), parseInt(b.substr(5, 2), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// Faixa de gradiente simulada por N segmentos justapostos (com leve
// sobreposição p/ não deixar fresta). horizontal=true por padrão. Suporta
// gradiente de COR (c1→c2) e/ou de OPACIDADE (alphaFrom→alphaTo).
function _capaGradiente_(slide, x, y, w, h, c1, c2, opts) {
  opts = opts || {};
  const steps = opts.steps || 26;
  const vertical = !!opts.vertical;
  const aF = opts.alphaFrom != null ? opts.alphaFrom : (opts.alpha != null ? opts.alpha : 1);
  const aT = opts.alphaTo   != null ? opts.alphaTo   : (opts.alpha != null ? opts.alpha : 1);
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const cor = _capaHexLerp_(c1, c2, t);
    const a = aF + (aT - aF) * t;
    let sx, sy, sw, sh;
    if (vertical) { sh = h / steps; sy = y + i * sh; sx = x; sw = w; sh += 0.8; }
    else          { sw = w / steps; sx = x + i * sw; sy = y; sh = h; sw += 0.8; }
    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, sy, sw, sh);
    r.getFill().setSolidFill(cor, Math.max(0, Math.min(1, a)));
    r.getBorder().setTransparent();
  }
}

// Insere uma imagem preservando a PROPORÇÃO (nunca distorce): escala para a
// altura alvo e devolve o objeto Image para o chamador posicionar/centralizar.
function _capaLogoImg_(slide, id, targetH) {
  const blob = DriveApp.getFileById(id).getBlob();
  const img = slide.insertImage(blob);
  const ar = img.getWidth() / img.getHeight();
  img.setHeight(targetH).setWidth(targetH * ar);
  return img;
}

// Anel decorativo (elipse só com contorno, sem preenchimento) — elemento do
// brandbook. Complementa as manchas preenchidas (_capaFundo_).
function _capaAnel_(slide, x, y, tamanho, cor, peso, alpha) {
  const c = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, tamanho, tamanho);
  c.getFill().setTransparent();
  c.getBorder().getLineFill().setSolidFill(cor, alpha == null ? 1 : alpha);
  c.getBorder().setWeight(peso || 1);
  return c;
}

// Triângulo decorativo (elemento do brandbook, idem _capaAnel_).
function _capaTriangulo_(slide, x, y, tamanho, cor, alpha) {
  const t = slide.insertShape(SlidesApp.ShapeType.TRIANGLE, x, y, tamanho, tamanho * 0.9);
  t.getFill().setSolidFill(cor, alpha == null ? 1 : alpha);
  t.getBorder().setTransparent();
  return t;
}

// Fundo escuro premium: base + elipses de profundidade + espinha lateral
// de gradiente (assinatura das capas). opts.espinha=false remove a espinha.
function _capaFundo_(slide, W, H, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Halo superior direito (luz suave)
  const halo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 300, -220, 560, 560);
  halo.getFill().setSolidFill(DS.colors.brandLight, 0.12); halo.getBorder().setTransparent();

  // Massa inferior esquerda (profundidade)
  const massa = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -220, H - 240, 500, 500);
  massa.getFill().setSolidFill(DS.colors.brandMed, 0.22); massa.getBorder().setTransparent();

  // Brilho pontual (pequeno) para dar "vida" ao canto
  const spark = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 150, -60, 150, 150);
  spark.getFill().setSolidFill(DS.colors.brandSoft, 0.10); spark.getBorder().setTransparent();

  // Anéis finos + triângulo (elementos do brandbook) — camada gráfica
  // adicional sobre as manchas.
  _capaAnel_(slide, W - 250, -130, 420, DS.colors.brandLight, 1.25, 0.16);
  _capaAnel_(slide, W - 210, -95,  330, DS.colors.brandSoft,  1,    0.10);
  _capaTriangulo_(slide, W - 130, H - 190, 90, DS.colors.brandLight, 0.08);

  // Espinha lateral esquerda — gradiente vertical brandLight → brandSoft
  if (opts.espinha !== false) {
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  }
}

// Logo oficial da Capital Realty (versão NEGATIVA/branca) sobre o fundo
// escuro das capas. Preserva a proporção. Se a imagem não carregar, cai para
// um wordmark em texto branco (nunca quebra a geração).
function _capaWordmark_(slide, x, y, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  const targetH = opts.h || 34;

  try {
    const img = _capaLogoImg_(slide, LOGOS_CR.fullNegativo, targetH);
    img.setLeft(x).setTop(y);
    return x + img.getWidth();
  } catch (e) {
    Logger.log('Capa: logo negativo indisponível, usando wordmark em texto. ' + e.message);
    const d = 26;
    const anel = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
    anel.getFill().setTransparent();
    anel.getBorder().getLineFill().setSolidFill(DS.colors.brandLight); anel.getBorder().setWeight(2.5);
    const nucleo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + d * 0.28, y + d * 0.28, d * 0.44, d * 0.44);
    nucleo.getFill().setSolidFill(DS.colors.highlight); nucleo.getBorder().setTransparent();
    const tx = x + d + 12;
    const nome = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y - 3, 340, 24);
    nome.getText().setText('CAPITAL REALTY').getTextStyle()
      .setFontSize(15).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    const sub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y + 15, 340, 16);
    sub.getText().setText('expandir eficiência').getTextStyle()
      .setFontSize(8).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);
    return tx + 200;
  }
}

// Rodapé padrão das capas: hairline + texto à esquerda e slogan à direita.
function _capaRodape_(slide, W, H, esquerda, direita) {
  const DS = CR_DESIGN_SYSTEM;
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 42, H - 40, W - 42, H - 40);
  sep.getLineFill().setSolidFill(DS.colors.darkLine); sep.setWeight(1);

  const fL = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H - 34, W - 260, 18);
  fL.getText().setText(esquerda).getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor(DS.colors.textMuted).setFontFamily(DS.typography.body);

  if (direita) {
    // Pequeno ponto de destaque antes do slogan
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 205, H - 30, 6, 6);
    dot.getFill().setSolidFill(DS.colors.highlight); dot.getBorder().setTransparent();
    const fR = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, W - 192, H - 34, 150, 18);
    fR.getText().setText(direita).getTextStyle()
      .setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  }
}

// Texto "espaçado" (fake letter-spacing) para overlines premium.
function _capaEspacado_(txt) {
  return String(txt).toUpperCase().split('').join(' ');
}


// ==========================================
// SHELL CANÔNICO — SLIDES FINANCEIROS
// ==========================================

// A marca d'água é única para todos os slides claros. Ela entra antes de
// qualquer conteúdo para nunca cobrir texto nem células da tabela.
function _dsMarcaDaguaClara_(slide, W, H) {
  const DS = CR_DESIGN_SYSTEM;
  const outer = slide.insertShape(SlidesApp.ShapeType.ELLIPSE,
    -W * .04, 0, W * .57, W * .57);
  outer.getFill().setSolidFill(DS.colors.watermark, .62);
  outer.getBorder().setTransparent();

  const inner = slide.insertShape(SlidesApp.ShapeType.ELLIPSE,
    W * .06, H * .178, W * .37, W * .37);
  inner.getFill().setSolidFill('#FFFFFF');
  inner.getBorder().setTransparent();

  const corte = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
    W * .22, H * .035, W * .17, H * .22);
  corte.getFill().setSolidFill('#FFFFFF');
  corte.getBorder().setTransparent();

  _capaTriangulo_(slide, W * .30, H * .045, W * .34, DS.colors.watermark, .58);
  _capaTriangulo_(slide, W * .37, H * .145, W * .20, '#FFFFFF', 1);
}

// Fallback determinístico: se o arquivo oficial estiver indisponível, mantém
// o wordmark na mesma caixa. Nunca troca silenciosamente a versão da marca.
function _dsWordmarkTexto_(slide, x, y, w, h, escuro) {
  const DS = CR_DESIGN_SYSTEM;
  const cor = escuro ? '#FFFFFF' : DS.colors.brandDark;
  const nomeH = h * .62;
  _rrUmaLinha_(slide, x, y, w, nomeH, 'CAPITAL REALTY',
    { fs: Math.max(8, h * .48), fsMin: Math.max(8, h * .48), bold: true,
      cor: cor, fonte: DS.typography.titles, align: 'R', folga: 0 });
  _rrUmaLinha_(slide, x, y + nomeH, w, h - nomeH, 'infraestrutura logística',
    { fs: Math.max(5, h * .22), fsMin: Math.max(5, h * .22),
      cor: cor, fonte: DS.typography.body, align: 'R', folga: 0 });
}

// Insere exclusivamente o asset apropriado ao fundo. O retorno expõe os
// limites para os testes de geometria e para evitar sobreposição de conteúdo.
function _dsLogoCanonico_(slide, W, H, escuro) {
  const DS = CR_DESIGN_SYSTEM;
  const cfg = escuro ? DS.layout.dark : DS.layout.light;
  const id = escuro ? DS.assets.logoDarkId : DS.assets.logoLightId;
  const targetH = H * cfg.logoH;
  let x, y, w;
  try {
    const img = _capaLogoImg_(slide, id, targetH);
    w = img.getWidth();
    x = escuro ? W * cfg.logoX : W - W * cfg.logoRight - w;
    y = escuro ? H * cfg.logoY : H - H * cfg.logoBottom - targetH;
    img.setLeft(x).setTop(y);
    return { elemento: img, x: x, y: y, w: w, h: targetH, fallback: false };
  } catch (e) {
    Logger.log('Design system: logo ' + (escuro ? 'negativo' : 'colorido') +
      ' indisponível; usando wordmark textual na mesma posição. ' + e.message);
    w = escuro ? W * .27 : W * .19;
    x = escuro ? W * cfg.logoX : W - W * cfg.logoRight - w;
    y = escuro ? H * cfg.logoY : H - H * cfg.logoBottom - targetH;
    _dsWordmarkTexto_(slide, x, y, w, targetH, escuro);
    return { elemento: null, x: x, y: y, w: w, h: targetH, fallback: true };
  }
}

// Estrutura de todos os slides claros. A hierarquia é sempre Entidade →
// Tema/Mês; fonte e divergência ficam no bloco compacto superior direito.
function _dsNovoSlideClaro_(op) {
  op = op || {};
  const deck = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM, cfg = DS.layout.light, escala = DS.typography.scale;
  const m = W * cfg.marginX;

  slide.getBackground().setSolidFill('#FFFFFF');
  _dsMarcaDaguaClara_(slide, W, H);

  _rrUmaLinha_(slide, m, H * cfg.entityY, W * .50, H * cfg.entityH,
    op.entidade || 'Resultados Financeiros',
    { fs: W * escala.entity, fsMin: W * escala.entityCompact, bold: true,
      cor: DS.colors.brandDark, fonte: DS.typography.titles, align: 'L', folga: 0 });
  _rrUmaLinha_(slide, m, H * cfg.topicY, W * .52, H * cfg.topicH,
    op.topico || '',
    { fs: W * escala.topic, fsMin: W * escala.topicCompact,
      cor: DS.colors.brandDark, fonte: DS.typography.titles, align: 'L', folga: 0 });

  const metaX = W * cfg.metadataX, metaY = H * cfg.metadataY;
  const metaW = W * cfg.metadataW, metaFs = W * escala.metadata;
  const metaLinhaH = H * cfg.metadataH * .48;
  if (op.fonte) {
    _rrBloco_(slide, metaX, metaY, metaW, metaLinhaH, op.fonte,
      { fs: metaFs, fsMin: metaFs, cor: DS.colors.textBody,
        fonte: DS.typography.body, align: 'R', folga: 0, preservarLinhas: false });
  }
  if (op.aviso) {
    _rrBloco_(slide, metaX, metaY + H * cfg.metadataH * .52,
      metaW, metaLinhaH, op.aviso,
      { fs: metaFs, fsMin: metaFs, bold: true, cor: DS.colors.warningText,
        fonte: DS.typography.body, align: 'R', folga: 0, preservarLinhas: false });
  }

  const logo = _dsLogoCanonico_(slide, W, H, false);
  return {
    deck: deck,
    slide: slide,
    W: W,
    H: H,
    DS: DS,
    m: m,
    conteudoY: H * (op.conteudoY == null ? cfg.contentTop : op.conteudoY),
    tableBottom: H * cfg.tableBottom,
    logo: logo
  };
}

// Todas as capas usam exatamente o mesmo wordmark e o mesmo rodapé; somente
// o conteúdo central varia entre capa principal, divisória e encerramento.
function _dsAplicarMarcaEscura_(slide, W, H, esquerdaRodape, direitaRodape) {
  _dsLogoCanonico_(slide, W, H, true);
  _capaRodape_(slide, W, H, esquerdaRodape || '', direitaRodape || 'Expandir Eficiência');
}
