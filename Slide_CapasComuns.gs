/**
 * ARQUIVO: Slide_CapasComuns.gs
 * COMPONENTES COMPARTILHADOS DAS CAPAS (Abertura, Contra Capa e Encerramento)
 *
 * Linguagem visual premium sobre fundo escuro institucional, 100% dentro do
 * design system Capital Realty (CR_DESIGN_SYSTEM em 01_Config.gs): mesmas
 * cores de marca, mesma tipografia (Montserrat/Open Sans). Sem gradientes
 * nativos (a API do Slides não suporta) — a sensação de profundidade e o
 * "brilho" vêm de camadas translúcidas + faixas de gradiente simuladas por
 * segmentos interpolados.
 *
 * IMPORTANTE: este arquivo é PRÉ-REQUISITO das três capas. Cole-o junto com
 * Slide00_Capa.gs, Slide_ContraCapa.gs e Slide12_Encerramento.gs.
 *
 * Sobre logos: nas capas o fundo é escuro. O logo da Capital Realty em imagem
 * é usado nos cabeçalhos sobre fundo CLARO — sobre o escuro ele pode não ler.
 * Por isso as capas usam o WORDMARK em texto branco (sempre visível) e um
 * pequeno mark geométrico da marca. O nome do Mega é o herói do co-branding.
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
// gradiente de COR (c1→c2) e/ou de OPACIDADE (alphaFrom→alphaTo) — este
// último permite véus que "desaparecem" (scrim de legibilidade sobre foto).
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

// Logo do PRÓPRIO MEGA (unitLogoId, 01_Config.gs — mesmo ID usado no
// Controle de Acessos Megas, LOGOS_MEGA) fixa no canto superior direito das
// capas, dentro de um chip branco (garante contraste sobre fundo escuro ou
// foto — mesmo recurso do addMegaLogo(dark=true) daquele repo). Contain-fit:
// nunca distorce, encaixa dentro da caixa boxW×boxH. Graceful: sem
// unitLogoId ou imagem indisponível, simplesmente não desenha nada.
function _capaMegaLogo_(slide, W, opts) {
  opts = opts || {};
  const proj = getProjetoAtivo();
  const id = proj.unitLogoId;
  if (!id) return false;
  const boxW = opts.w || 108, boxH = opts.h || 36;
  const x = W - 42 - boxW, y = opts.y != null ? opts.y : 26;
  try {
    const chip = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x - 12, y - 7, boxW + 24, boxH + 14);
    chip.getFill().setSolidFill('#FFFFFF', 0.95); chip.getBorder().setTransparent();

    const blob = DriveApp.getFileById(id).getBlob();
    const img = slide.insertImage(blob);
    const ar = img.getWidth() / img.getHeight();
    let w = boxW, h = boxW / ar;
    if (h > boxH) { h = boxH; w = boxH * ar; }
    img.setWidth(w).setHeight(h).setLeft(x + (boxW - w) / 2).setTop(y + (boxH - h) / 2);
    return true;
  } catch (e) {
    Logger.log('Capa: logo do Mega indisponível (' + id + '). ' + e.message);
    return false;
  }
}

// Foto de fundo full-bleed (cover-fill, sem distorção — sobra é clipada pela
// borda do slide) + véu de cor por cima. Retorna true se colocou a foto.
function _capaFotoFundo_(slide, W, H, fotoId, opts) {
  opts = opts || {};
  try {
    const blob = DriveApp.getFileById(fotoId).getBlob();
    const img = slide.insertImage(blob);
    const ar = img.getWidth() / img.getHeight();
    const pageAR = W / H;
    let w, h;
    if (ar > pageAR) { h = H; w = H * ar; } else { w = W; h = W / ar; }
    img.setWidth(w).setHeight(h).setLeft((W - w) / 2).setTop((H - h) / 2);

    const veu = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
    veu.getFill().setSolidFill(opts.cor || CR_DESIGN_SYSTEM.colors.brandDark,
                               opts.alpha != null ? opts.alpha : 0.5);
    veu.getBorder().setTransparent();
    return true;
  } catch (e) {
    Logger.log('Capa: foto de fundo indisponível (' + fotoId + '). ' + e.message);
    return false;
  }
}

// Anel decorativo (elipse só com contorno, sem preenchimento) — elemento do
// brandbook reaproveitado do repo Controle de Acessos Megas. Complementa as
// manchas preenchidas (_capaFundo_) com uma camada mais fina e gráfica.
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

  // Anéis finos + triângulo (elementos do brandbook, mesma linguagem do
  // repo Controle de Acessos) — camada gráfica adicional sobre as manchas.
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
// um wordmark em texto branco (nunca quebra a geração). Retorna o X do fim
// do logo (para posicionar co-brand à direita, se preciso).
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
    nucleo.getFill().setSolidFill('#60A5FA'); nucleo.getBorder().setTransparent();
    const tx = x + d + 12;
    const nome = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y - 3, 340, 24);
    nome.getText().setText('CAPITAL REALTY').getTextStyle()
      .setFontSize(15).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    const sub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y + 15, 340, 16);
    sub.getText().setText('infraestrutura logística').getTextStyle()
      .setFontSize(8).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
    return tx + 200;
  }
}

// Rodapé padrão das capas: hairline + texto à esquerda e slogan à direita.
function _capaRodape_(slide, W, H, esquerda, direita) {
  const DS = CR_DESIGN_SYSTEM;
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 42, H - 40, W - 42, H - 40);
  sep.getLineFill().setSolidFill('#334155'); sep.setWeight(1);

  const fL = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H - 34, W - 260, 18);
  fL.getText().setText(esquerda).getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);

  if (direita) {
    // Pequeno ponto de destaque antes do slogan
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 205, H - 30, 6, 6);
    dot.getFill().setSolidFill('#60A5FA'); dot.getBorder().setTransparent();
    const fR = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, W - 192, H - 34, 150, 18);
    fR.getText().setText(direita).getTextStyle()
      .setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  }
}

// Texto "espaçado" (fake letter-spacing) para overlines premium.
function _capaEspacado_(txt) {
  return String(txt).toUpperCase().split('').join(' ');
}
