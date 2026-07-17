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
// sobreposição p/ não deixar fresta). horizontal=true por padrão.
function _capaGradiente_(slide, x, y, w, h, c1, c2, opts) {
  opts = opts || {};
  const steps = opts.steps || 26;
  const vertical = !!opts.vertical;
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const cor = _capaHexLerp_(c1, c2, t);
    let sx, sy, sw, sh;
    if (vertical) { sh = h / steps; sy = y + i * sh; sx = x; sw = w; sh += 0.8; }
    else          { sw = w / steps; sx = x + i * sw; sy = y; sh = h; sw += 0.8; }
    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, sy, sw, sh);
    r.getFill().setSolidFill(cor, opts.alpha != null ? opts.alpha : 1);
    r.getBorder().setTransparent();
  }
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

  // Espinha lateral esquerda — gradiente vertical brandLight → brandSoft
  if (opts.espinha !== false) {
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  }
}

// Mark geométrico + wordmark da Capital Realty em texto branco (sempre lê no
// escuro). Retorna a largura aproximada ocupada para posicionar co-brand.
function _capaWordmark_(slide, x, y, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  const esc = opts.escala || 1;

  // Mark: dois discos concpenctricos (abstração da marca, sem imitar o logo)
  const d = 26 * esc;
  const anel = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
  anel.getFill().setTransparent();
  anel.getBorder().getLineFill().setSolidFill(DS.colors.brandLight); anel.getBorder().setWeight(2.5 * esc);
  const nucleo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + d * 0.28, y + d * 0.28, d * 0.44, d * 0.44);
  nucleo.getFill().setSolidFill('#60A5FA'); nucleo.getBorder().setTransparent();

  const tx = x + d + 12 * esc;
  const nome = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y - 3 * esc, 340 * esc, 24 * esc);
  nome.getText().setText('CAPITAL REALTY').getTextStyle()
    .setFontSize(15 * esc).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  const sub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y + 15 * esc, 340 * esc, 16 * esc);
  sub.getText().setText('infraestrutura logística').getTextStyle()
    .setFontSize(8 * esc).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);

  return tx + 200 * esc;
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
