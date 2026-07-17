/**
 * ARQUIVO: Slide00_Capa.gs
 * SLIDE 00 — CAPA DE ABERTURA (versão premium)
 * Redesenhada no design system Capital Realty, com fundo escuro institucional,
 * profundidade em camadas, faixa de destaque em gradiente e o nome do Mega
 * como herói. Mês de referência vem dos DADOS (obterMesReferencia_).
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarSlideCapa() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  // Fundo premium + espinha lateral de gradiente
  _capaFundo_(slide, W, H);

  // Marca d'água tonal grande (ano) no canto inferior direito — sutil
  const wm = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, W - 320, H - 190, 300, 150);
  wm.getText().setText(String(ref.ano)).getTextStyle()
    .setFontSize(120).setBold(true).setForegroundColor('#1C2A5E').setFontFamily(DS.typography.titles);
  wm.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  // Wordmark Capital Realty (topo esquerdo)
  _capaWordmark_(slide, 42, 30);

  // Co-brand: nome do Mega no topo direito (chip discreto)
  const chipW = 150, chipH = 26, chipX = W - 42 - chipW, chipY = 30;
  const chip = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, chipX, chipY, chipW, chipH);
  chip.getFill().setSolidFill('#FFFFFF', 0.08);
  chip.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.18); chip.getBorder().setWeight(1);
  const chipT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, chipX, chipY, chipW, chipH);
  chipT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  chipT.getText().setText(projeto.nome.toUpperCase()).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
  chipT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Overline espaçado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 44, H * 0.30, W - 200, 20);
  over.getText().setText(_capaEspacado_('Relatório Operacional de Facilities')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Barra de destaque em gradiente acima do título
  _capaGradiente_(slide, 46, H * 0.30 + 26, 66, 4, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  // Título principal
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.30 + 36, W - 120, 130);
  titulo.getText().setText('RESULTADOS\nFACILITIES').getTextStyle()
    .setFontSize(44).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  titulo.getText().getParagraphStyle().setLineSpacing(96);

  // Cidade (herói do co-branding)
  const cidade = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H * 0.30 + 158, W - 120, 40);
  cidade.getText().setText(projeto.nome).getTextStyle()
    .setFontSize(24).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Pill de período em gradiente
  const pillY = H * 0.30 + 202, pillW = 250, pillH = 30;
  _capaGradiente_(slide, 42, pillY, pillW, pillH, DS.colors.brandMed, DS.colors.brandLight, { steps: 24 });
  // Cantos arredondados por cima (moldura translúcida)
  const pillBorda = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 42, pillY, pillW, pillH);
  pillBorda.getFill().setTransparent();
  pillBorda.getBorder().getLineFill().setSolidFill('#60A5FA', 0.35); pillBorda.getBorder().setWeight(1);
  const pillT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, pillY, pillW, pillH);
  pillT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  pillT.getText().setText('PERÍODO DE REFERÊNCIA · ' + ref.label).getTextStyle()
    .setFontSize(10).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  pillT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Rodapé
  _capaRodape_(slide, W, H, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');

  Logger.log('Slide 00 (Capa premium) gerado → ' + ref.label);
}
