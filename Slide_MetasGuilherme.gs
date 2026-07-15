/**
 * ARQUIVO: Slide_MetasGuilherme.gs
 * SLIDES — METAS GUILHERME
 * DESCRIÇÃO: Conjunto avulso de 4 slides com atualização das metas do
 * Guilherme para o Mega Curitiba, seguindo o design system Capital Realty.
 */

function gerarSlidesMetasGuilherme() {
  _mgGarantirProjetoCuritiba_();
  _gerarSlideUtilitiesMegaCuritiba_();
  _gerarSlideProgramaExcelencia2026_();
  _gerarSlideIntegracaoAreas_();
  _gerarSlideControleReembolsos_();
}

function _mgGarantirProjetoCuritiba_() {
  try {
    getProjetoAtivo();
  } catch (e) {
    setProjetoAtivo('CURITIBA');
  }
}

function _mgCriarSlide_(titulo, subtitulo) {
  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  criarHeaderPadrao(slide, titulo, subtitulo || 'Metas Guilherme · Mega Curitiba');
  return { deck: deck, slide: slide, W: deck.getPageWidth(), H: deck.getPageHeight(), DS: CR_DESIGN_SYSTEM };
}

function _mgText_(slide, txt, x, y, w, h, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  box.getText().setText(String(txt || '')).getTextStyle()
    .setFontSize(opts.size || 10)
    .setBold(!!opts.bold)
    .setForegroundColor(opts.color || DS.colors.textBody)
    .setFontFamily(opts.family || DS.typography.body);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(opts.align || SlidesApp.ParagraphAlignment.START)
    .setLineSpacing(opts.lineSpacing || 118);
  if (opts.valign) box.setContentAlignment(opts.valign);
  return box;
}

function _mgPill_(slide, label, x, y, w, h, color) {
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  pill.getFill().setSolidFill(color);
  pill.getBorder().setTransparent();
  _mgText_(slide, label, x, y + 1, w, h - 2, {
    size: 7.5, bold: true, color: '#FFFFFF', family: CR_DESIGN_SYSTEM.typography.titles,
    align: SlidesApp.ParagraphAlignment.CENTER, valign: SlidesApp.ContentAlignment.MIDDLE
  });
}

function _mgCardTexto_(slide, x, y, w, h, titulo, corpo, cor) {
  const bodyY = criarCardPainel(slide, x, y, w, h, titulo, cor || CR_DESIGN_SYSTEM.colors.brandLight);
  _mgText_(slide, corpo, x + 18, bodyY, w - 34, h - (bodyY - y) - 10, {
    size: 9.2, color: CR_DESIGN_SYSTEM.colors.textBody, lineSpacing: 125
  });
}

function _mgChecklist_(slide, itens, x, y, w, gap, cor) {
  itens.forEach((item, i) => {
    const cy = y + i * gap;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, cy + 1, 10, 10);
    dot.getFill().setSolidFill(cor || CR_DESIGN_SYSTEM.colors.brandLight);
    dot.getBorder().setTransparent();
    _mgText_(slide, item, x + 16, cy - 1, w - 16, 18, { size: 8.8, color: CR_DESIGN_SYSTEM.colors.textMain });
  });
}

function _mgTimeline_(slide, etapas, x, y, w, ativoAte) {
  const DS = CR_DESIGN_SYSTEM;
  const n = etapas.length;
  const step = w / (n - 1);
  const line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, y + 16, x + w, y + 16);
  line.getLineFill().setSolidFill(DS.colors.lines);
  line.setWeight(3);

  etapas.forEach((etapa, i) => {
    const cx = x + step * i;
    const done = i <= ativoAte;
    const color = done ? DS.colors.accentGreen : (i === ativoAte + 1 ? DS.colors.brandLight : DS.colors.lines);
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 13, y + 3, 26, 26);
    dot.getFill().setSolidFill(color);
    dot.getBorder().setTransparent();
    _mgText_(slide, done ? '✓' : String(i + 1), cx - 13, y + 5, 26, 18, {
      size: 9, bold: true, color: done || i === ativoAte + 1 ? '#FFFFFF' : DS.colors.textBody,
      family: DS.typography.titles, align: SlidesApp.ParagraphAlignment.CENTER,
      valign: SlidesApp.ContentAlignment.MIDDLE
    });
    _mgText_(slide, etapa, cx - 45, y + 38, 90, 28, {
      size: 7.4, bold: i <= ativoAte + 1, color: DS.colors.textMain,
      family: DS.typography.body, align: SlidesApp.ParagraphAlignment.CENTER
    });
  });
}

function _gerarSlideUtilitiesMegaCuritiba_() {
  const ctx = _mgCriarSlide_('PLATAFORMA DE UTILITIES MEGA CURITIBA', 'Monitoramento de bombas, energia, geração e consumo');
  const slide = ctx.slide, DS = ctx.DS;

  criarCardKPI(slide, 30, 86, 165, 72, { label: 'STATUS', valor: 'Em trânsito', cor: DS.colors.brandLight, tamValor: 18, sub: 'Equipamentos a caminho', corSub: DS.colors.textBody });
  criarCardKPI(slide, 211, 86, 140, 72, { label: 'DOCUMENTAÇÃO', valor: 'NF emitida', cor: DS.colors.accentGreen, tamValor: 18 });
  _mgCardTexto_(slide, 367, 86, 323, 108, 'PRÓXIMOS PASSOS', '• Orçamento com João Lenon para instalação\n• Assinatura do contrato\n• Proposta para monitoramento dos pontos de energia, geração e consumo', DS.colors.brandMed);

  _mgCardTexto_(slide, 30, 214, 660, 94, 'LINHA DO TEMPO DO PROJETO', '', DS.colors.brandLight);
  _mgTimeline_(slide, ['NF emitida', 'Equipamentos a caminho', 'Orçamento instalação', 'Contrato', 'Monitoramento energia'], 82, 250, 556, 1);
}

function _gerarSlideProgramaExcelencia2026_() {
  const ctx = _mgCriarSlide_('PROGRAMA DE EXCELÊNCIA 2026', 'Book, divulgação, inspeção in loco e pontuação');
  const slide = ctx.slide, DS = ctx.DS;

  _mgCardTexto_(slide, 30, 86, 210, 105, 'STATUS GERAL', 'Vencedor de 2025 já divulgado.\n\nBook 2026 em finalização para envio aos Megas até o início do próximo mês.', DS.colors.accentGreen);
  _mgCardTexto_(slide, 255, 86, 205, 105, 'PRÓXIMA FASE', 'Inspeção in loco.\n\nAtenção para contabilizar os pontos do in loco até setembro.', DS.colors.accentOrange);

  const calX = 482, calY = 86, calW = 208, calH = 105;
  const contentY = criarCardPainel(slide, calX, calY, calW, calH, 'CALENDÁRIO ATÉ MÊS 09', DS.colors.brandLight);
  for (let i = 1; i <= 9; i++) {
    const col = (i - 1) % 3, row = Math.floor((i - 1) / 3);
    const x = calX + 22 + col * 54, y = contentY + 3 + row * 19;
    const active = i === 9;
    _mgPill_(slide, String(i).padStart(2, '0'), x, y, 34, 14, active ? DS.colors.accentOrange : DS.colors.brandLight);
  }

  _mgCardTexto_(slide, 30, 213, 660, 96, 'FLUXO 2026', '', DS.colors.brandMed);
  _mgTimeline_(slide, ['Book', 'Divulgação', 'Inspeção', 'Pontuação'], 120, 249, 480, 1);
}

function _gerarSlideIntegracaoAreas_() {
  const ctx = _mgCriarSlide_('INTEGRAÇÃO DAS ÁREAS: FACILITIES, FINANCEIRO E JURÍDICO', 'Dados integrados para criação de visualização gerencial');
  const slide = ctx.slide, DS = ctx.DS;

  const areas = [
    { nome: 'Facilities', status: 'Área integradora', cor: DS.colors.brandLight, x: 270, y: 105 },
    { nome: 'Financeiro', status: 'Concluído via plataforma financeira dos Megas', cor: DS.colors.accentGreen, x: 55, y: 210 },
    { nome: 'Jurídico', status: 'Pendente: liberação de dados sem definição clara', cor: DS.colors.accentOrange, x: 485, y: 210 }
  ];

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 230, 237, 270, 153).getLineFill().setSolidFill(DS.colors.lines);
  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 485, 237, 450, 153).getLineFill().setSolidFill(DS.colors.lines);

  areas.forEach(a => {
    const cardY = criarCardPainel(slide, a.x, a.y, 180, 74, a.nome.toUpperCase(), a.cor);
    _mgText_(slide, a.status, a.x + 18, cardY + 2, 144, 34, { size: 8.4, color: DS.colors.textBody, align: SlidesApp.ParagraphAlignment.CENTER });
  });

  _mgCardTexto_(slide, 30, 323, 660, 70, 'PRÓXIMO PASSO', 'Alinhar o formato dos dados necessários para criar uma visualização integrada entre Facilities, Financeiro e Jurídico.', DS.colors.brandMed);
}

function _gerarSlideControleReembolsos_() {
  const ctx = _mgCriarSlide_('MELHORIA NA SOLICITAÇÃO E CONTROLE DOS REEMBOLSOS', 'Entrevistas, pendências e apoio para mapear o fluxo financeiro');
  const slide = ctx.slide, DS = ctx.DS;

  _mgCardTexto_(slide, 30, 86, 205, 220, 'CONCLUÍDO', '', DS.colors.accentGreen);
  _mgChecklist_(slide, ['Wilson entrevistado', 'Cadu entrevistado', 'Jonatas entrevistado'], 55, 132, 150, 31, DS.colors.accentGreen);

  _mgCardTexto_(slide, 258, 86, 205, 220, 'PENDENTE', '', DS.colors.accentOrange);
  _mgChecklist_(slide, ['Ernani', 'Ricardo'], 283, 132, 150, 34, DS.colors.accentOrange);

  _mgCardTexto_(slide, 485, 86, 205, 220, 'APOIO RH', '', DS.colors.brandLight);
  _mgChecklist_(slide, ['Envolver RH', 'Apoiar entrevistas com o time financeiro', 'Consolidar aprendizados para o novo fluxo'], 510, 132, 150, 31, DS.colors.brandLight);

  _mgCardTexto_(slide, 30, 325, 660, 64, 'OBJETIVO DO FUNIL', 'Separar entrevistas concluídas, pendentes e apoios necessários para redesenhar a solicitação e o controle dos reembolsos.', DS.colors.brandMed);
}
