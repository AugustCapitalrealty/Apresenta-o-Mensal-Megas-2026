// ==========================================
// ARQUIVO: Slide12_Encerramento.gs
// SLIDE 12 — ENCERRAMENTO (CAPA FINAL)
// ==========================================

function gerarSlideEncerramento() {
  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill('#151E49'); // Brand Dark Blue

  const PageWidth = deck.getPageWidth();
  const PageHeight = deck.getPageHeight();

  // --- 1. ELEMENTOS DE FUNDO (Formas Geométricas) ---

  // Triângulo no canto superior direito
  const triangle = slide.insertShape(SlidesApp.ShapeType.RIGHT_TRIANGLE, PageWidth - 300, -100, 400, 400);
  triangle.getFill().setSolidFill('#065CA9'); // Light Blue
  triangle.getFill().setSolidFill(CORES.lightBlue, 0.1); // 10% Opacidade
  triangle.getBorder().setTransparent();
  triangle.setRotation(180); // Rotacionar para encaixar no canto

  // Círculo no canto inferior esquerdo
  const circle = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -100, PageHeight - 300, 500, 500);
  circle.getFill().setSolidFill('#003D7B'); // Medium Blue
  circle.getFill().setSolidFill(CORES.mediumBlue, 0.15); // 15% Opacidade
  circle.getBorder().setTransparent();

  // --- 2. TEXTO PRINCIPAL (REDUZIDO) ---
  const centerY = (PageHeight / 2) - 60; // Ajustado centro visual

  // Mensagem Principal
  const msgBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 50, centerY - 80, PageWidth - 100, 120);
  const msgText = msgBox.getText();
  msgText.setText("INFRAESTRUTURA INSPIRA.\nLOGÍSTICA CONECTA.");

  // Estilização Geral (Fonte Reduzida de 48 -> 36)
  const style = msgText.getTextStyle();
  style.setFontSize(36).setBold(true).setForegroundColor('#FFFFFF').setFontFamily('Montserrat');
  msgText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // CORREÇÃO: setContentAlignment em vez de getContentAlignment
  msgBox.setContentAlignment(SlidesApp.ContentAlignment.BOTTOM);

  const highlightColor = '#60A5FA';

  // Destacar palavras chave
  const textRange = msgBox.getText();
  const inspiraRange = textRange.getRange(15, 23); // "INSPIRA."
  inspiraRange.getTextStyle().setForegroundColor(highlightColor);

  const conectaRange = textRange.getRange(34, 42); // "CONECTA."
  conectaRange.getTextStyle().setForegroundColor(highlightColor);


  // --- 3. SLOGAN E AGRADECIMENTO (REDUZIDO) ---

  // Slogan com linhas
  const sloganY = centerY + 50;
  const sloganText = "EXPANDIR EFICIÊNCIA";

  const sloganBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, (PageWidth/2) - 150, sloganY, 300, 25);
  // Fonte Reduzida de 14 -> 12
  sloganBox.getText().setText(sloganText).getTextStyle().setFontSize(12).setForegroundColor('#CBD5E1').setFontFamily('Montserrat').setBold(true);
  sloganBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Linhas ao lado do slogan
  const lineW = 50; // Reduzido
  const lineLeft = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, (PageWidth/2) - 210, sloganY + 12, lineW, 1.5);
  lineLeft.getFill().setSolidFill('#065CA9'); lineLeft.getBorder().setTransparent();

  const lineRight = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, (PageWidth/2) + 160, sloganY + 12, lineW, 1.5);
  lineRight.getFill().setSolidFill('#065CA9'); lineRight.getBorder().setTransparent();

  // "Obrigado!"
  const thanksBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 50, sloganY + 40, PageWidth - 100, 30);
  // Fonte Reduzida de 24 -> 20
  thanksBox.getText().setText("Obrigado!").getTextStyle().setFontSize(20).setItalic(true).setForegroundColor('#FFFFFF').setFontFamily('Montserrat');
  thanksBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);


  // --- 4. SEÇÃO DE CONTATOS (por cidade, definidos em 01_Config.gs) ---
  const contactY = sloganY + 78;   // respiro entre os cards e o logo do rodapé
  const cardW = 260;
  const cardH = 60;
  const cardGap = 30;

  const contatos = getProjetoAtivo().contatos || [];
  const totalW = (cardW * contatos.length) + (cardGap * Math.max(contatos.length - 1, 0));
  const startX = (PageWidth - totalW) / 2;

  contatos.forEach((c, i) => {
    desenharCardContato(slide, startX + i * (cardW + cardGap), contactY, cardW, cardH, c.nome, c.cargo);
  });


  // --- 5. LOGO RODAPÉ ---
  const logoW = 180;
  const logoH = 40;
  const logoX = (PageWidth - logoW) / 2;
  const logoY = PageHeight - 60;

  const logoBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, logoX, logoY, logoW, logoH);
  logoBox.getText().setText("CAPITAL REALTY").getTextStyle().setFontSize(16).setBold(true).setForegroundColor('#FFFFFF').setFontFamily('Montserrat');
  logoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  Logger.log("Slide 12 (Encerramento) gerado com sucesso.");
}

// --- FUNÇÃO AUXILIAR: CARD DE CONTATO ---
function desenharCardContato(slide, x, y, w, h, nome, cargo) {
  // Fundo
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill('#FFFFFF', 0.1);
  bg.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.2);
  bg.getBorder().setWeight(1);

  // Círculo com as iniciais do nome (duas primeiras palavras)
  const iconSize = 35;
  const iconBg = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 15, y + (h - iconSize)/2, iconSize, iconSize);
  iconBg.getFill().setSolidFill('#065CA9');
  iconBg.getBorder().setTransparent();

  const iniciais = String(nome || '').trim().split(/\s+/).slice(0, 2)
    .map(p => p.charAt(0).toUpperCase()).join('');
  const iconTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + (h - iconSize)/2, iconSize, iconSize);
  iconTxt.getText().setText(iniciais).getTextStyle()
    .setFontSize(12).setBold(true).setForegroundColor('#FFFFFF').setFontFamily('Montserrat');
  iconTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  iconTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // Informações de Texto
  const textX = x + 60; // Recuo ajustado
  const textW = w - 70;

  // Nome (Fonte 14->11)
  const nameBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, y + 10, textW, 20);
  nameBox.getText().setText(nome).getTextStyle().setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily('Montserrat');

  // Cargo (Fonte 10->8)
  const roleBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, y + 30, textW, 15);
  roleBox.getText().setText(cargo).getTextStyle().setFontSize(8).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
}
