/**
 * ARQUIVO: Slide00_Capa.gs
 * SLIDE 00 — CAPA
 *
 * Mesma linguagem visual das outras capas do repositório (fundo escuro
 * premium, wordmark, título herói, pill de período, rodapé) — ver
 * Slide_CapasComuns.gs. Sem foto de fundo por enquanto: este projeto não tem
 * um asset de foto associado (diferente dos Megas, que usam fotoFundoId por
 * cidade); se a Ester quiser uma foto no fundo da capa, é só adicionar aqui
 * seguindo o padrão de megas-mensal/Slide00_Capa.gs.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarSlideCapa() {
  const deck  = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  // Fundo escuro premium padrão (sem foto — ver comentário acima).
  _capaFundo_(slide, W, H);

  // Wordmark Capital Realty (topo esquerdo)
  _capaWordmark_(slide, 42, 30);

  // Overline espaçado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 44, H * 0.30, W - 200, 20);
  over.getText().setText(_capaEspacado_('Apresentação Mensal')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Barra de destaque em gradiente acima do título
  _capaGradiente_(slide, 46, H * 0.30 + 26, 66, 4, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  // Título principal
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.30 + 36, W - 120, 130);
  titulo.getText().setText('RESULTADOS\nFINANCEIROS').getTextStyle()
    .setFontSize(44).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  // O Slides não aceita lineSpacing abaixo de 100 (mínimo "espaçamento
  // simples" da própria interface) — usar <100 lança "Invalid argument:
  // spacing" na API.
  titulo.getText().getParagraphStyle().setLineSpacing(100);

  // "Grupo Capital Realty" — herói do co-branding, mesmo lugar que o nome do
  // Mega ocupa nas outras capas.
  const grupo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H * 0.30 + 158, W - 120, 40);
  grupo.getText().setText('Grupo Capital Realty').getTextStyle()
    .setFontSize(24).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Pill de período em gradiente
  const pillY = H * 0.30 + 202, pillW = 250, pillH = 30;
  _capaGradiente_(slide, 42, pillY, pillW, pillH, DS.colors.brandMed, DS.colors.brandLight, { steps: 24 });
  const pillBorda = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 42, pillY, pillW, pillH);
  pillBorda.getFill().setTransparent();
  pillBorda.getBorder().getLineFill().setSolidFill('#60A5FA', 0.35); pillBorda.getBorder().setWeight(1);
  const pillT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, pillY, pillW, pillH);
  pillT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  pillT.getText().setText(ref.nome + ' ' + ref.ano).getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  pillT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Rodapé
  _capaRodape_(slide, W, H, 'CAPITAL REALTY · FINANCEIRO', 'Expandir Eficiência');

  Logger.log('Slide 00 (Capa) gerado → ' + ref.label);
}
