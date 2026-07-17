/**
 * ARQUIVO: Slide_ContraCapa.gs
 * SLIDE — CONTRA CAPA (identificação institucional do relatório)
 * Entra logo após a Capa de Abertura. Página elegante de "ficha técnica":
 * posicionamento da marca + bloco de identificação (empreendimento, período,
 * área responsável, elaboração). Mantém a linguagem premium das capas.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarSlideContraCapa() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  _capaFundo_(slide, W, H);
  _capaWordmark_(slide, 42, 30);

  // ── Coluna esquerda: posicionamento da marca ────────────────────────────
  const colX = 44, colW = W * 0.50 - colX;
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, H * 0.30, colW, 20);
  over.getText().setText(_capaEspacado_('Relatório Mensal')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  _capaGradiente_(slide, colX + 2, H * 0.30 + 26, 60, 4, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  const frase = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, H * 0.30 + 38, colW, 150);
  frase.getText().setText('INFRAESTRUTURA\nINSPIRA.\nLOGÍSTICA\nCONECTA.').getTextStyle()
    .setFontSize(30).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  frase.getText().getParagraphStyle().setLineSpacing(104);
  // Destaques em azul
  const fr = frase.getText();
  const s = 'INFRAESTRUTURA\nINSPIRA.\nLOGÍSTICA\nCONECTA.';
  const iInspira = s.indexOf('INSPIRA.');
  fr.getRange(iInspira, iInspira + 8).getTextStyle().setForegroundColor('#60A5FA');
  const iConecta = s.indexOf('CONECTA.');
  fr.getRange(iConecta, iConecta + 8).getTextStyle().setForegroundColor('#60A5FA');

  // ── Coluna direita: card de identificação (glass) ───────────────────────
  const cardW = W * 0.40, cardX = W - 44 - cardW;
  const cardH = 250, cardY = (H - cardH) / 2 + 6;
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cardX, cardY, cardW, cardH);
  card.getFill().setSolidFill('#FFFFFF', 0.06);
  card.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.16); card.getBorder().setWeight(1);

  // Faixa de topo do card em gradiente
  _capaGradiente_(slide, cardX, cardY, cardW, 5, DS.colors.brandLight, '#60A5FA', { steps: 20 });

  const tituloCard = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cardX + 22, cardY + 20, cardW - 44, 22);
  tituloCard.getText().setText('IDENTIFICAÇÃO DO RELATÓRIO').getTextStyle()
    .setFontSize(10).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  const linhas = [
    { rot: 'EMPREENDIMENTO',        val: projeto.nome },
    { rot: 'PERÍODO DE REFERÊNCIA', val: ref.label },
    { rot: 'ÁREA RESPONSÁVEL',      val: 'Facilities' },
    { rot: 'ELABORAÇÃO',            val: 'Capital Realty · Infraestrutura Logística' }
  ];
  const linY0 = cardY + 54, linH = (cardH - 70) / linhas.length;
  linhas.forEach((l, i) => {
    const ly = linY0 + i * linH;
    const rot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cardX + 22, ly, cardW - 44, 14);
    rot.getText().setText(l.rot).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.titles);
    const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cardX + 22, ly + 13, cardW - 44, 20);
    val.getText().setText(l.val).getTextStyle()
      .setFontSize(12).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.body);
    if (i < linhas.length - 1) {
      const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, cardX + 22, ly + linH - 6, cardX + cardW - 22, ly + linH - 6);
      sep.getLineFill().setSolidFill('#FFFFFF', 0.10); sep.setWeight(1);
    }
  });

  _capaRodape_(slide, W, H, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');

  Logger.log('Slide Contra Capa gerado → ' + projeto.nome + ' · ' + ref.label);
}
