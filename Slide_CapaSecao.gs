/**
 * ARQUIVO: Slide_CapaSecao.gs
 * COMPONENTE — CAPA DE SEÇÃO (divisória de assunto)
 * Replica as capas do relatório manual (MANUTENÇÃO PREVENTIVA, SERVIÇOS
 * CONTRATADOS, etc.): fundo escuro, título em duas linhas (branca + azul),
 * sublinha, subtítulo com a cidade e logo no rodapé.
 *
 * Foto de fundo opcional: defina `capaFotoId` (ID de imagem no Drive) no
 * projeto da cidade em 01_Config.gs — a foto entra com um véu azul-escuro
 * por cima. Sem foto, a capa usa o fundo escuro com grafismos.
 */

function gerarCapaSecao(linha1, linha2) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;

  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Foto de fundo opcional + véu escuro
  let temFoto = false;
  if (projeto.capaFotoId) {
    try {
      const blob = DriveApp.getFileById(projeto.capaFotoId).getBlob();
      slide.insertImage(blob, 0, 0, W, H);
      const veu = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
      veu.getFill().setSolidFill(DS.colors.brandDark, 0.78);
      veu.getBorder().setTransparent();
      temFoto = true;
    } catch (e) {
      Logger.log('Aviso (Capa Seção): foto não carregada. ' + e.message);
    }
  }

  // Grafismos suaves (apenas quando não há foto)
  if (!temFoto) {
    const e1 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 300, -140, 480, 480);
    e1.getFill().setSolidFill(DS.colors.brandLight, 0.07); e1.getBorder().setTransparent();
    const e2 = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -160, H - 200, 400, 400);
    e2.getFill().setSolidFill(DS.colors.brandMed, 0.18); e2.getBorder().setTransparent();
  }

  // Faixa lateral esquerda (elemento de marca das capas antigas)
  const faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, 8, H);
  faixa.getFill().setSolidFill(DS.colors.brandLight); faixa.getBorder().setTransparent();

  // Título em duas linhas: primeira branca, segunda azul clara
  const tY = H / 2 - 110;
  const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY, W - 120, 56);
  t1.getText().setText(linha1).getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY + 50, W - 120, 56);
  t2.getText().setText(linha2).getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Sublinha branca curta
  const sub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 62, tY + 112, 55, 3);
  sub.getFill().setSolidFill('#FFFFFF'); sub.getBorder().setTransparent();

  // Subtítulo
  const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY + 126, W - 120, 30);
  st.getText().setText(projeto.nome + ' | Relatório Operacional').getTextStyle()
    .setFontSize(16).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.body);

  // Logo (texto) no rodapé esquerdo
  const logo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, H - 56, 320, 22);
  logo.getText().setText('CAPITAL REALTY').getTextStyle()
    .setFontSize(13).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  const logoSub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, H - 36, 320, 14);
  logoSub.getText().setText('infraestrutura logística').getTextStyle()
    .setFontSize(7.5).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);

  Logger.log('Capa de seção gerada: ' + linha1 + ' ' + linha2);
}
