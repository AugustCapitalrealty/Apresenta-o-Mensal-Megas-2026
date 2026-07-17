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

  // Logo do próprio Mega centralizada no topo (por pedido — antes ficava no
  // canto e não estava legal). Fica como assinatura da unidade, simétrica
  // com o logo da Capital Realty no rodapé.
  _capaMegaLogo_(slide, W, { cx: W / 2, y: 22, w: 116, h: 38 });

  // Overline centralizado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.20, W - 80, 18);
  over.getText().setText(_capaEspacado_('Obrigado')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);
  over.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Mensagem principal
  const msg = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.20 + 26, W - 80, 100);
  msg.getText().setText('INFRAESTRUTURA INSPIRA.\nLOGÍSTICA CONECTA.').getTextStyle()
    .setFontSize(34).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  msg.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(102);
  const tr = msg.getText();
  tr.getRange(15, 23).getTextStyle().setForegroundColor('#60A5FA');  // "INSPIRA."
  tr.getRange(34, 42).getTextStyle().setForegroundColor('#60A5FA');  // "CONECTA."

  // Slogan com linhas + faixa de gradiente central
  const sloganY = H * 0.20 + 132;
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

// Card de contato premium (glass): nome + cargo centralizados. Sem avatar de
// iniciais (removido — o "MC/FE" não ficava legal); um filete azul curto no
// topo dá o toque de marca sem poluir.
function _encCardContato(slide, x, y, w, h, nome, cargo) {
  const DS = CR_DESIGN_SYSTEM;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill('#FFFFFF', 0.06);
  bg.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.18); bg.getBorder().setWeight(1);

  // Filete de destaque no topo do card
  _capaGradiente_(slide, x + w / 2 - 22, y + 10, 44, 3, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  const nb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 16, w - 24, 22);
  nb.getText().setText(nome).getTextStyle()
    .setFontSize(13).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  nb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  const rb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 37, w - 24, 16);
  rb.getText().setText(cargo).getTextStyle()
    .setFontSize(8.5).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.body);
  rb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}
