/**
 * ARQUIVO: config_mega.gs
 * DESIGN SYSTEM — MEGA CENTRO LOGÍSTICO
 * Construído a partir do Manual de Marca MEGA (brandbook oficial).
 *
 * ─────────────────────────────────────────────────────────────
 *  PALETA (brandbook, pág. 11)
 *    Laranja   PANTONE 158 C     CMYK 0 65 90 0    RGB 232 119 34   #E87722  ← cor principal
 *    Cinza     COOL GRAY 10 C    CMYK 0 0 0 70     RGB 100 102 106  #64666A
 *    Preto                       CMYK 0 0 0 100                     #000000
 *    Branco                                         RGB 255 255 255  #FFFFFF
 *
 *  TIPOGRAFIA (brandbook, pág. 12)
 *    Gotham — família única (títulos e corpo).
 *    OBS: Gotham não está disponível no Google Slides. Adotada "Montserrat"
 *         como substituta geométrica aprovada (mesma personalidade visual).
 *
 *  ELEMENTOS (brandbook, pág. 13)
 *    Faixas inclinadas a 60° ou 75° (paralelogramo laranja) para títulos de
 *    destaque e limitação de áreas. Iconografia em lineart com preenchimento laranja.
 * ─────────────────────────────────────────────────────────────
 *
 * Como usar: o boletim MEGAS CENTROS LOGÍSTICOS chama aplicarTemaMega() no início
 * e restaurarTemaCapital() no final (try/finally). Isso reescreve, em tempo de
 * execução, as cores/tipografia/logo do CR_DESIGN_SYSTEM — recolorindo todos os
 * slides sem duplicar código.
 */
const MEGA_DESIGN_SYSTEM = {
  // Cores da marca mapeadas sobre as mesmas chaves usadas pelos slides
  colors: {
    brandDark:    '#3A3A3C',  // charcoal — cabeçalhos de tabela, barras escuras, linha TOTAL
    brandMed:     '#64666A',  // Cool Gray 10 C — bandas de grupo
    brandLight:   '#E87722',  // Laranja PANTONE 158 C — accent principal
    brandSoft:    '#F4B183',  // tom claro do laranja — série secundária
    bgSlide:      '#F4F4F4',  // fundo claro (referência do brandbook)
    cardBg:       '#FFFFFF',
    textMain:     '#3A3A3C',
    textBody:     '#64666A',
    lines:        '#E0E0E0',
    accentGreen:  '#10B981',  // status (cor funcional de dado — mantida)
    accentOrange: '#E87722',  // Laranja da marca
    accentRed:    '#EF4444'   // status (cor funcional de dado — mantida)
  },
  typography: {
    titles: 'Montserrat',  // substituto de Gotham
    body:   'Montserrat'
  },
  assets: {
    logoId: '1HRJFR_qOE1Bf3aYk6LF4oY52CWzA9a36',  // logo MEGA Centro Logístico
    logoW: 150,
    logoH: 50
  }
};

// Guarda os valores Capital Realty para restauração segura
let _temaCapitalBackup = null;

/**
 * Aplica o tema MEGA sobre o CR_DESIGN_SYSTEM (cores, tipografia, logo).
 */
function aplicarTemaMega() {
  if (!_temaCapitalBackup) {
    _temaCapitalBackup = {
      colors:     Object.assign({}, CR_DESIGN_SYSTEM.colors),
      typography: Object.assign({}, CR_DESIGN_SYSTEM.typography),
      logoId:     CR_DESIGN_SYSTEM.assets.logoId,
      logoW:      CR_DESIGN_SYSTEM.assets.logoW,
      logoH:      CR_DESIGN_SYSTEM.assets.logoH
    };
  }
  Object.assign(CR_DESIGN_SYSTEM.colors,     MEGA_DESIGN_SYSTEM.colors);
  Object.assign(CR_DESIGN_SYSTEM.typography, MEGA_DESIGN_SYSTEM.typography);
  CR_DESIGN_SYSTEM.assets.logoId = MEGA_DESIGN_SYSTEM.assets.logoId;
  CR_DESIGN_SYSTEM.assets.logoW  = MEGA_DESIGN_SYSTEM.assets.logoW;
  CR_DESIGN_SYSTEM.assets.logoH  = MEGA_DESIGN_SYSTEM.assets.logoH;
  Logger.log("🎨 Tema MEGA Centro Logístico aplicado.");
}

/**
 * Restaura os valores originais Capital Realty.
 */
function restaurarTemaCapital() {
  if (!_temaCapitalBackup) return;
  Object.assign(CR_DESIGN_SYSTEM.colors,     _temaCapitalBackup.colors);
  Object.assign(CR_DESIGN_SYSTEM.typography, _temaCapitalBackup.typography);
  CR_DESIGN_SYSTEM.assets.logoId = _temaCapitalBackup.logoId;
  CR_DESIGN_SYSTEM.assets.logoW  = _temaCapitalBackup.logoW;
  CR_DESIGN_SYSTEM.assets.logoH  = _temaCapitalBackup.logoH;
  Logger.log("🎨 Tema Capital Realty restaurado.");
}

/**
 * PRÉVIA — desenha um quadro de referência do Design System MEGA num slide
 * (paleta + tipografia + faixa inclinada). Útil para validar o brandbook.
 */
function testarDesignSystemMega() {
  limparApresentacao();
  const pres = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pw = pres.getPageWidth();
  slide.getBackground().setSolidFill(MEGA_DESIGN_SYSTEM.colors.bgSlide);

  // Faixa inclinada laranja (elemento de marca) + título
  const band = slide.insertShape(SlidesApp.ShapeType.PARALLELOGRAM, 40, 40, 360, 46);
  band.getFill().setSolidFill(MEGA_DESIGN_SYSTEM.colors.accentOrange);
  band.getBorder().setTransparent();
  const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 55, 46, 360, 34);
  t.getText().setText('DESIGN SYSTEM • MEGA').getTextStyle()
    .setFontFamily('Montserrat').setFontSize(20).setBold(true).setForegroundColor('#FFFFFF');

  // Amostras de cor
  const swatches = [
    { hex: '#E87722', name: 'Laranja 158 C' },
    { hex: '#64666A', name: 'Cool Gray 10 C' },
    { hex: '#3A3A3C', name: 'Charcoal' },
    { hex: '#000000', name: 'Preto' },
    { hex: '#FFFFFF', name: 'Branco' }
  ];
  let x = 50;
  swatches.forEach(s => {
    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, 140, 110, 80);
    r.getFill().setSolidFill(s.hex);
    r.getBorder().getLineFill().setSolidFill('#E0E0E0');
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, 224, 110, 28);
    lbl.getText().setText(s.name + '\n' + s.hex).getTextStyle()
      .setFontFamily('Montserrat').setFontSize(8).setForegroundColor('#3A3A3C');
    x += 122;
  });
  Logger.log("✅ Prévia Design System MEGA gerada.");
}
