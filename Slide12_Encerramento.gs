// ==========================================
// ARQUIVO: Slide12_Encerramento.gs
// SLIDE 12 — ENCERRAMENTO (CAPA FINAL, versão premium)
// Mantém a frase institucional, o slogan, o "Obrigado" e os contatos por
// cidade — redesenhados na linguagem premium das capas.
// PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
// ==========================================

function gerarSlideEncerramento() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  // Fundo premium (sem espinha lateral — capa final é mais centrada/simétrica)
  _capaFundo_(slide, W, H, { espinha: false });

  // Overline centralizado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.18, W - 80, 18);
  over.getText().setText(_capaEspacado_('Obrigado')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);
  over.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Mensagem principal
  const msg = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.18 + 26, W - 80, 100);
  msg.getText().setText('INFRAESTRUTURA INSPIRA.\nLOGÍSTICA CONECTA.').getTextStyle()
    .setFontSize(34).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  msg.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(102);
  const tr = msg.getText();
  tr.getRange(15, 23).getTextStyle().setForegroundColor('#60A5FA');  // "INSPIRA."
  tr.getRange(34, 42).getTextStyle().setForegroundColor('#60A5FA');  // "CONECTA."

  // Slogan com linhas + faixa de gradiente central
  const sloganY = H * 0.18 + 132;
  const sloganBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, (W / 2) - 160, sloganY, 320, 22);
  sloganBox.getText().setText('EXPANDIR EFICIÊNCIA').getTextStyle()
    .setFontSize(12).setBold(true).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.titles);
  sloganBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  _capaGradiente_(slide, (W / 2) - 230, sloganY + 11, 55, 2, DS.colors.brandDark, '#60A5FA', { steps: 16 });
  _capaGradiente_(slide, (W / 2) + 175, sloganY + 11, 55, 2, '#60A5FA', DS.colors.brandDark, { steps: 16 });

  // ── Contatos (cards glass) ──────────────────────────────────────────────
  const contatos = getProjetoAtivo().contatos || [];
  const cardW = 250, cardH = 58, cardGap = 26;
  const contatoY = sloganY + 44;
  const totalW = (cardW * contatos.length) + (cardGap * Math.max(contatos.length - 1, 0));
  const startX = (W - totalW) / 2;
  contatos.forEach((c, i) => {
    _encCardContato(slide, startX + i * (cardW + cardGap), contatoY, cardW, cardH, c.nome, c.cargo);
  });

  // ── Logo oficial (negativo) no rodapé, centralizado ─────────────────────
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, W / 2 - 60, H - 62, W / 2 + 60, H - 62);
  sep.getLineFill().setSolidFill('#334155'); sep.setWeight(1);
  try {
    const img = _capaLogoImg_(slide, LOGOS_CR.fullNegativo, 34);
    img.setLeft((W - img.getWidth()) / 2).setTop(H - 52);
  } catch (e) {
    Logger.log('Encerramento: logo negativo indisponível, wordmark em texto. ' + e.message);
    const logoBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H - 52, W - 80, 24);
    logoBox.getText().setText('CAPITAL REALTY').getTextStyle()
      .setFontSize(16).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    logoBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    const logoSub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H - 30, W - 80, 14);
    logoSub.getText().setText('infraestrutura logística').getTextStyle()
      .setFontSize(7.5).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
    logoSub.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  Logger.log('Slide 12 (Encerramento premium) gerado.');
}

// Card de contato premium (glass): avatar com iniciais + nome + cargo.
function _encCardContato(slide, x, y, w, h, nome, cargo) {
  const DS = CR_DESIGN_SYSTEM;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill('#FFFFFF', 0.06);
  bg.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.18); bg.getBorder().setWeight(1);

  const d = 36, ay = y + (h - d) / 2;
  const av = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 14, ay, d, d);
  av.getFill().setSolidFill(DS.colors.brandLight); av.getBorder().setTransparent();
  const iniciais = String(nome || '').trim().split(/\s+/).slice(0, 2)
    .map(p => p.charAt(0).toUpperCase()).join('');
  const avT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14, ay, d, d);
  avT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  avT.getText().setText(iniciais).getTextStyle()
    .setFontSize(13).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  avT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  const tx = x + 62, tw = w - 74;
  const nb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y + 11, tw, 20);
  nb.getText().setText(nome).getTextStyle()
    .setFontSize(12).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  const rb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y + 31, tw, 16);
  rb.getText().setText(cargo).getTextStyle()
    .setFontSize(8.5).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
}
