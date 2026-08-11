/**
 * ARQUIVO: config_hangar.gs
 * DESIGN SYSTEM — HANGAR VIP
 * Construído a partir do Manual de Identidade Visual Hangar Vip (dOma Ag.).
 *
 * ─────────────────────────────────────────────────────────────
 *  PALETA (brandbook, pág. Paleta de Cores)
 *    Azul     PANTONE 2736    CMYK 100 91 0 0    RGB 35 62 153    #233E98  ← cor principal
 *    Amarelo  PANTONE 1235    CMYK 0 29 91 0     RGB 253 187 48   #FDBA30  ← accent
 *    Branco                                       RGB 255 255 255  #FFFFFF
 *
 *  TIPOGRAFIA (brandbook, pág. Tipografia)
 *    Gilroy — Extra Bold (títulos) e Light (corpo).
 *    OBS: Gilroy não está disponível no Google Slides. Adotada "Montserrat"
 *         como substituta geométrica aprovada (mesma personalidade visual).
 *
 *  ELEMENTOS (brandbook, págs. Aplicação Preferencial / Versão Horizontal)
 *    Ícone circular amarelo (carro + chave) como elemento de marca.
 *    Fundos preferenciais: branco, azul (#233E98) ou amarelo (#FDBA30).
 *    NÃO aplicar logo sobre fundos com cores da marca (regra do brandbook).
 * ─────────────────────────────────────────────────────────────
 *
 * Como usar: gerarApresentacaoHangar() chama aplicarTemaHangar() no início
 * e restaurarTemaCapital() no finally. Reescreve CR_DESIGN_SYSTEM em tempo
 * de execução sem duplicar código de slide.
 */
const HANGAR_DESIGN_SYSTEM = {
  colors: {
    brandDark:    '#233E98',  // Azul PANTONE 2736 — cabeçalhos, barras, texto principal
    brandMed:     '#1B306E',  // Azul profundo — variações e grupos
    brandLight:   '#FDBA30',  // Amarelo PANTONE 1235 — accent principal
    brandSoft:    '#FEE08B',  // Amarelo claro — série secundária, cards
    bgSlide:      '#F8FAFC',  // Fundo claro neutro (brandbook: não aplicar logo em fundo amarelo/azul)
    cardBg:       '#FFFFFF',
    textMain:     '#233E98',
    textBody:     '#475569',
    lines:        '#E2E8F0',
    accentGreen:  '#10B981',
    accentOrange: '#FDBA30',  // Amarelo da marca como "orange" funcional
    accentRed:    '#EF4444'
  },
  typography: {
    titles: 'Montserrat',  // substituto de Gilroy Extra Bold
    body:   'Montserrat'   // substituto de Gilroy Light
  },
  assets: {
    logoId: '1dl7Wxh4XKNDuI37GxczpI4_6cCplVP3u',  // logo Hangar VIP (versão horizontal)
    logoW: 160,
    logoH: 55
  }
};

/**
 * Aplica o tema HANGAR VIP sobre o CR_DESIGN_SYSTEM (cores, tipografia, logo).
 */
function aplicarTemaHangar() {
  if (!_temaCapitalBackup) {
    _temaCapitalBackup = {
      colors:     Object.assign({}, CR_DESIGN_SYSTEM.colors),
      typography: Object.assign({}, CR_DESIGN_SYSTEM.typography),
      logoId:     CR_DESIGN_SYSTEM.assets.logoId,
      logoW:      CR_DESIGN_SYSTEM.assets.logoW,
      logoH:      CR_DESIGN_SYSTEM.assets.logoH
    };
  }
  Object.assign(CR_DESIGN_SYSTEM.colors,     HANGAR_DESIGN_SYSTEM.colors);
  Object.assign(CR_DESIGN_SYSTEM.typography, HANGAR_DESIGN_SYSTEM.typography);
  CR_DESIGN_SYSTEM.assets.logoId = HANGAR_DESIGN_SYSTEM.assets.logoId;
  CR_DESIGN_SYSTEM.assets.logoW  = HANGAR_DESIGN_SYSTEM.assets.logoW;
  CR_DESIGN_SYSTEM.assets.logoH  = HANGAR_DESIGN_SYSTEM.assets.logoH;
  Logger.log("🎨 Tema Hangar VIP aplicado.");
}

/**
 * PRÉVIA — desenha um quadro de referência do Design System Hangar VIP num slide
 * (paleta + tipografia). Útil para validar o brandbook.
 */
function testarDesignSystemHangar() {
  limparApresentacao();
  const pres = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pw = pres.getPageWidth();
  slide.getBackground().setSolidFill(HANGAR_DESIGN_SYSTEM.colors.bgSlide);

  // Faixa azul de título
  const band = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, pw, 60);
  band.getFill().setSolidFill(HANGAR_DESIGN_SYSTEM.colors.brandDark);
  band.getBorder().setTransparent();
  const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 12, 400, 36);
  t.getText().setText('DESIGN SYSTEM • HANGAR VIP').getTextStyle()
    .setFontFamily('Montserrat').setFontSize(20).setBold(true).setForegroundColor('#FFFFFF');

  // Elemento circular amarelo (referência ao ícone da marca)
  const circle = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pw - 100, 10, 40, 40);
  circle.getFill().setSolidFill(HANGAR_DESIGN_SYSTEM.colors.brandLight);
  circle.getBorder().setTransparent();

  // Amostras de cor
  const swatches = [
    { hex: '#233E98', name: 'Azul 2736' },
    { hex: '#1B306E', name: 'Azul Escuro' },
    { hex: '#FDBA30', name: 'Amarelo 1235' },
    { hex: '#FEE08B', name: 'Amarelo Claro' },
    { hex: '#FFFFFF', name: 'Branco' }
  ];
  let x = 50;
  swatches.forEach(s => {
    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, 100, 110, 80);
    r.getFill().setSolidFill(s.hex);
    r.getBorder().getLineFill().setSolidFill('#E0E0E0');
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, 184, 110, 28);
    lbl.getText().setText(s.name + '\n' + s.hex).getTextStyle()
      .setFontFamily('Montserrat').setFontSize(8).setForegroundColor('#233E98');
    x += 122;
  });
  Logger.log("✅ Prévia Design System Hangar VIP gerada.");
}
