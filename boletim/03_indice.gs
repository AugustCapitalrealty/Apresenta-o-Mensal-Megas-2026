/**
 * ARQUIVO: 03_indice.gs
 * Cria o slide de Sumário/Índice.
 * ATUALIZAÇÃO: 3 tópicos principais — Manutenções, Controle de Acesso, Sustentabilidade
 */
function gerarSlide02_Indice() {
  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth = presentation.getPageWidth();
  const pageHeight = presentation.getPageHeight();
  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);

  // Grafismo sutil de fundo
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -100, -100, 300, 300);
  ellipse.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  // Logo
  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY, CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch(e) {}

  // Título
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, 500, 45)
    .getText().setText('Conteúdo').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(22).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);

  const topics = [
    {
      n: "01",
      t: "Manutenções",
      d: "Overview executivo, estratificação por ativo, corretivas e preventivas por empreendimento.",
      pag: "Pág. 03 — 08",
      color: CR_DESIGN_SYSTEM.colors.brandLight
    },
    {
      n: "02",
      t: "Controle de Acesso",
      d: "KPIs 2026 por empreendimento, evolução semanal de fluxo, tempo, celular e fila evitada.",
      pag: "Pág. 09 — 11",
      color: CR_DESIGN_SYSTEM.colors.brandMed
    },
    {
      n: "03",
      t: "Sustentabilidade",
      d: "Energia solar Mega Curitiba — geração e consumo diário.",
      pag: "Pág. 12",
      color: CR_DESIGN_SYSTEM.colors.accentGreen
    }
  ];

  const startY = 130;
  const itemH  = 70;
  const gap    = 15;

  topics.forEach((item, i) => {
    const y = startY + (i * (itemH + gap));

    // Número
    const num = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, y, 55, itemH);
    num.getText().setText(item.n).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(28).setBold(true)
      .setForegroundColor(item.color);
    num.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Barra divisória colorida
    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX + 52, y + 8, 3, itemH - 16);
    bar.getFill().setSolidFill(item.color);
    bar.getBorder().setTransparent();

    // Título + descrição
    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 65, y, pageWidth - marginX - 65 - 200, itemH);
    box.getText().setText(item.t + "\n" + item.d);
    box.getText().getRange(0, item.t.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(16).setBold(true)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.brandDark);
    box.getText().getRange(item.t.length + 1, box.getText().getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(10)
      .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
    box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Página — alinhada à direita
    const pagBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 120, y, 120, itemH);
    pagBox.getText().setText(item.pag).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
      .setForegroundColor(item.color);
    pagBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    pagBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Linha separadora entre itens (exceto o último)
    if (i < topics.length - 1) {
      const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
        marginX, y + itemH + (gap / 2),
        pageWidth - marginX, y + itemH + (gap / 2));
      sep.getLineFill().setSolidFill(CR_DESIGN_SYSTEM.colors.lines);
    }
  });

  // --- RODAPÉ ---
  const footerY = pageHeight - 25;
  const footerLeft = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20);
  footerLeft.getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 02').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textBody);
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log("✅ Slide 02 (Índice) concluído!");
}