/**
 * ARQUIVO: Slide00_Capa.gs
 * SLIDE 00 — CAPA DE ABERTURA
 * Baseada na capa do relatório manual ("RESULTADOS FACILITIES"),
 * redesenhada no design system Capital Realty.
 * O mês de referência vem dos DADOS (obterMesReferencia_ em 02_Dados.gs).
 */

function gerarSlideCapa() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Grafismos decorativos
  const e1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 260, -160, 520, 520);
  e1.getFill().setSolidFill(DS.colors.brandLight, 0.08); e1.getBorder().setTransparent();
  const e2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -180, H - 190, 430, 430);
  e2.getFill().setSolidFill(DS.colors.brandMed, 0.2); e2.getBorder().setTransparent();

  // Logo (texto) no topo esquerdo
  const logo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 24, 320, 26);
  logo.getText().setText('CAPITAL REALTY').getTextStyle()
    .setFontSize(15).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  const logoSub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 46, 320, 16);
  logoSub.getText().setText('infraestrutura logística').getTextStyle()
    .setFontSize(8).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);

  // Linha de destaque acima do título
  const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 42, 108, 60, 4);
  acc.getFill().setSolidFill(DS.colors.brandLight); acc.getBorder().setTransparent();

  // Título principal
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 118, W - 120, 110);
  titulo.getText().setText('RESULTADOS\nFACILITIES').getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  // Cidade
  const cidade = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 228, W - 120, 36);
  cidade.getText().setText(projeto.nome).getTextStyle()
    .setFontSize(22).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Pill "RELATÓRIO OPERACIONAL" + mês de referência (mês anterior = mês fechado)
  const pillY = 282;
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 42, pillY, 158, 26);
  pill.getFill().setSolidFill(DS.colors.brandLight); pill.getBorder().setTransparent();
  const pillTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, pillY, 158, 26);
  pillTxt.getText().setText('RELATÓRIO OPERACIONAL').getTextStyle()
    .setFontSize(8).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  pillTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  pillTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // Mês de referência = o mesmo mês dos DADOS (obterMesReferencia_ em 02_Dados.gs),
  // para a capa nunca divergir do conteúdo apresentado.
  const mesLabel = obterMesReferencia_().label;
  const data = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 212, pillY, 220, 26);
  data.getText().setText(mesLabel).getTextStyle()
    .setFontSize(12).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.body);
  data.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // Rodapé
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 42, H - 42, W - 42, H - 42);
  sep.getLineFill().setSolidFill('#334155'); sep.setWeight(1);

  const footL = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H - 36, 340, 18);
  footL.getText().setText('CAPITAL REALTY INFRAESTRUTURA LOGÍSTICA').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);

  const footR = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, W - 242, H - 36, 200, 18);
  footR.getText().setText('• Expandir Eficiência').getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  footR.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log('Slide 00 (Capa) gerado → ' + mesLabel);
}
