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
  const projeto = getProjetoAtivo();

  // Fundo (redesenho de 10/11/2026): a foto da capa sob véu escuro uniforme
  // fecha o deck com a mesma imagem que o abriu. Sem halos, anéis,
  // triângulo, letras espaçadas nem faixas de degradê.
  const comFoto = projeto.fotoFundoId &&
    _capaFotoFundo_(slide, W, H, projeto.fotoFundoId, { cor: DS.colors.brandDark, alpha: 0.86 });
  if (!comFoto) _capaFundoLimpo_(slide);

  // Logo do próprio Mega centralizada no topo, simétrica ao logo da Capital
  // Realty no rodapé.
  _capaMegaLogo_(slide, W, { cx: W / 2, y: 26, w: 116, h: 38 });

  const yT = H * 0.30;
  _capaTexto_(slide, 'Obrigado', 40, yT, W - 80, 60, 44, '#FFFFFF', { centro: true });

  const msg = _capaTexto_(slide, 'Infraestrutura inspira. Logística conecta.', 40, yT + 62, W - 80, 24, 15, '#CBD5E1', { centro: true });
  msg.getText().getRange(15, 23).getTextStyle().setForegroundColor('#60A5FA');   // "inspira."
  msg.getText().getRange(34, 42).getTextStyle().setForegroundColor('#60A5FA');   // "conecta."

  // ── Contatos (cards) ────────────────────────────────────────────────────
  const contatos = projeto.contatos || [];
  const cardW = 250, cardH = 58, cardGap = 26;
  const contatoY = yT + 112;
  const totalW = (cardW * contatos.length) + (cardGap * Math.max(contatos.length - 1, 0));
  const startX = (W - totalW) / 2;
  contatos.forEach((c, i) => {
    _encCardContato(slide, startX + i * (cardW + cardGap), contatoY, cardW, cardH, c.nome, c.cargo);
  });

  // ── Logo oficial (negativo) no rodapé, centralizado ─────────────────────
  try {
    const img = _capaLogoImg_(slide, LOGOS_CR.fullNegativo, 30);
    img.setLeft((W - img.getWidth()) / 2).setTop(H - 50);
  } catch (e) {
    Logger.log('Encerramento: logo negativo indisponível, wordmark em texto. ' + e.message);
    _capaTexto_(slide, 'CAPITAL REALTY', 40, H - 50, W - 80, 24, 16, '#FFFFFF', { centro: true });
  }

  Logger.log('Encerramento gerado.');
}

// Card de contato premium (glass): avatar com as duas iniciais + nome/cargo.
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
  // Caixa de texto mais larga que o círculo (folga simétrica, sem fundo/
  // borda própria — não altera nada visível): vence o recuo interno padrão
  // do Slides, que fazia "MC" quebrar em duas linhas (M / C).
  const folga = 10;
  const avT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14 - folga, ay, d + folga * 2, d);
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
    .setFontSize(8.5).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.body);
}