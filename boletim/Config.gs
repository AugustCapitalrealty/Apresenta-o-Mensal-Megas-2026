/**
 * ARQUIVO: Config.gs
 * DESCRIÇÃO: Design system, IDs e os três ESCOPOS do boletim, num arquivo só.
 *
 * Junta o que eram config.gs, config_mega.gs e config_hangar.gs. Os três
 * traziam a mesma coisa — um design system e as funções para trocá-lo em
 * tempo de execução — separados só por marca.
 *
 * COMO O TEMA FUNCIONA: os slides leem sempre CR_DESIGN_SYSTEM. Antes de
 * gerar um boletim de marca, aplicarTemaMega()/aplicarTemaHangar()
 * SOBRESCREVEM as cores, a tipografia e o logo desse objeto; no fim,
 * restaurarTemaCapital() devolve os valores originais. É o que permite
 * recolorir a apresentação inteira sem duplicar código de slide — e é por
 * isso que o motor de 00_Main.gs restaura o tema num `finally`: um erro no
 * meio deixaria o próximo boletim saindo com a marca errada.
 */


const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark: '#151E49',
    brandMed: '#003D7B',
    brandLight: '#065CA9',
    brandSoft: '#93C5FD',
    bgSlide: '#F8FAFC',
    cardBg: '#FFFFFF',
    textMain: '#151E49',
    textBody: '#475569',
    lines: '#E2E8F0',
    accentGreen: '#10B981',
    accentOrange: '#F97316',
    accentRed: '#EF4444'
  },
  typography: {
    titles: 'Montserrat',
    body: 'Open Sans'
  },
  layout: {
    marginX: 50,
    marginY: 35
  },
  assets: {
    logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',
    logoW: 160,
    logoH: 45,
    presentationId: '1sujFf3QdfnoFHQQyJPeLEelIkn0JFp-cTv9EGyvmJY4',
    // ID da Planilha e Nome da Aba configurados conforme sua solicitação
    spreadsheetId: '1eRvNopH-6U87xyy9chERsROvyHf9ZpDs5veoB9H671I',
    sheetName: 'QUADRO COMPARATIVO',
    spreadsheetGraficosId: '1jj9_vA6sjUtXE3O5xBwOQ_0U-KxpCkHXMvdHlUx19j8'
  }
};

/**
 * ─────────────────────────────────────────────────────────────
 *  DETECTOR DE SEMANA DO BOLETIM (ISO 8601)
 *  Helpers globais — qualquer slide pode usar.
 *
 *  Regra: a semana ISO vai de SEGUNDA a DOMINGO. O número da semana
 *  é o padrão ISO 8601 (a semana 1 é a que contém a primeira quinta-feira
 *  do ano). Ex.: 14/06/2026 (domingo) => Semana 24, de 08/06 a 14/06.
 * ─────────────────────────────────────────────────────────────
 */

/** Converte um valor (Date, string ou serial) em Date; retorna null se inválido. */
function _paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  const d = new Date(valor.toString());
  return isNaN(d.getTime()) ? null : d;
}

/** Número da semana ISO 8601 (1 a 53) para a data informada. */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;        // domingo = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move p/ a quinta-feira da semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** Segunda e domingo da semana ISO que contém 'date'. */
function intervaloSemanaISO(date) {
  const d   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay() || 7;              // domingo = 7
  const seg = new Date(d); seg.setDate(d.getDate() - (dow - 1));
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  return { inicio: seg, fim: dom };
}

/**
 * Detector principal — recebe uma data de referência (normalmente a ÚLTIMA
 * data com dados no boletim) e devolve o pacote pronto para exibir.
 * Retorna null se a data for inválida.
 */
function getSemanaBoletim(dataRef) {
  const ref = _paraData(dataRef);
  if (!ref) return null;
  const numero = getISOWeek(ref);
  const { inicio, fim } = intervaloSemanaISO(ref);
  const fmt = (dt) => String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
  const intervalo = fmt(inicio) + ' a ' + fmt(fim);
  return {
    numero:    numero,                       // 24
    inicio:    inicio,                        // Date (segunda)
    fim:       fim,                           // Date (domingo)
    intervalo: intervalo,                     // "08/06 a 14/06"
    label:     'Semana ' + numero,           // "Semana 24"
    completo:  'Semana ' + numero + ' • ' + intervalo // "Semana 24 • 08/06 a 14/06"
  };
}


// ==========================================================================
// DESIGN SYSTEM — MEGA CENTRO LOGÍSTICO
// ==========================================================================


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


// ==========================================================================
// DESIGN SYSTEM — HANGAR VIP
// ==========================================================================


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
