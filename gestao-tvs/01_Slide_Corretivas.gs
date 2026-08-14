/**
 * ARQUIVO: 01_Slide_Corretivas.gs
 * DESCRIÇÃO: Volume Histórico Corretivas.
 */

function gerarSlideCorretivas(slide, dataGlobal, unit) {
  const d = obterCorretivasTV_(unit);
  // Sem dado, NÃO limpa o slide: a TV continua mostrando a última versão boa
  // em vez de ficar em branco na parede.
  if (!d) { Logger.log('⚠️ Corretivas (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardCorretivas(slide, d.atual, d.anterior, d.historico, dataGlobal, unit);
}

function criarDashboardCorretivas(slide, atual, anterior, historico, dataGlobal, unit) {
  const ds = CR_DESIGN_SYSTEM;
  applyBrandHeaderAndBackground(slide, "Visão Geral Corretiva", "Volume de chamados gerados", dataGlobal, unit);
  const startY = ds.layout.contentY;

  const renderDelta = (x, y, w, valAt, valAn) => {
    const diff = valAt - valAn;
    if (valAn > 0 || diff !== 0) {
      const isUp = diff > 0;
      const arrow = isUp ? "▲" : (diff < 0 ? "▼" : "—");
      const dColor = isUp ? ds.colors.accentRed : (diff < 0 ? ds.colors.accentGreen : ds.colors.textBody);
      const pText = valAn > 0 ? ` (${diff>0?'+':''}${(diff/valAn*100).toFixed(1)}%)` : "";

      const txtD = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 25);
      txtD.getText().setText(`${arrow} ${diff>0?'+':''}${diff}${pText}`)
        .getTextStyle().setFontSize(12).setFontFamily(ds.typography.titles).setForegroundColor(dColor).setBold(true);
    }
  };

  const cX = ds.layout.marginX; const cW = 320;
  const bgTot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, cW, 130);
  bgTot.getFill().setSolidFill(ds.colors.cardBg); bgTot.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const accTot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, startY, 5, 130);
  accTot.getFill().setSolidFill(ds.colors.brandDark); accTot.getBorder().setTransparent();

  const lblTot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+10, cW-20, 25);
  lblTot.getText().setText("VOLUME TOTAL DE ABERTURAS").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const valTot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+15, startY+30, cW-20, 60);
  valTot.getText().setText(atual.total.toString()).getTextStyle().setFontSize(48).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandDark).setBold(true);
  renderDelta(cX+15, startY+90, cW-30, atual.total, anterior.total);

  const cSW = 155; const cSY = startY + 145; const cSH = 100;
  const bgFac = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cX, cSY, cSW, cSH);
  bgFac.getFill().setSolidFill(ds.colors.cardBg); bgFac.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const lblFac = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+10, cSY+8, cSW-15, 20);
  lblFac.getText().setText("FACILITIES").getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandLight).setBold(true);
  const valFac = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cX+10, cSY+25, cSW-15, 35);
  valFac.getText().setText(atual.facilities.toString()).getTextStyle().setFontSize(28).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  renderDelta(cX+10, cSY+65, cSW-20, atual.facilities, anterior.facilities);

  const cPX = cX + cSW + 10;
  const bgProp = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cPX, cSY, cSW, cSH);
  bgProp.getFill().setSolidFill(ds.colors.cardBg); bgProp.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const lblProp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cPX+10, cSY+8, cSW-15, 20);
  lblProp.getText().setText("PROPERTY").getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.brandMed).setBold(true);
  const valProp = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cPX+10, cSY+25, cSW-15, 35);
  valProp.getText().setText(atual.propriedades.toString()).getTextStyle().setFontSize(28).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
  renderDelta(cPX+10, cSY+65, cSW-20, atual.propriedades, anterior.propriedades);

  const rX = 390; const rW = 280;
  const lblDist = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, startY, rW, 25);
  lblDist.getText().setText("COMPOSIÇÃO POR ÁREA").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  if (atual.total > 0) {
    const pF = atual.facilities / atual.total;
    const txtF = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, startY+20, 130, 20);
    txtF.getText().setText(`${Math.round(pF*100)}% FACILITIES`).getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.brandLight).setBold(true);
    const txtP = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX+130, startY+20, 150, 20);
    txtP.getText().setText(`${Math.round((1-pF)*100)}% PROPRIEDADES`).getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.brandMed).setBold(true);
    txtP.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

    const bgBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rX, startY+40, rW, 15);
    bgBar.getFill().setSolidFill(ds.colors.brandMed); bgBar.getBorder().setTransparent();
    if (pF > 0) {
      const actBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rX, startY+40, Math.max(rW*pF, 1), 15);
      actBar.getFill().setSolidFill(ds.colors.brandLight); actBar.getBorder().setTransparent();
    }
  }

  const histY = startY + 85;
  const lblHist = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, histY, rW, 25);
  lblHist.getText().setText("EVOLUÇÃO (ÚLTIMOS 5)").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const maxVal = Math.max(...historico.map(h => h.total), 1);
  const hW = 35; const hGap = (rW - (historico.length*hW)) / Math.max(1, historico.length-1);
  historico.forEach((item, i) => {
    const bx = rX + (i * (hW + hGap));
    const bh = Math.max((item.total / maxVal) * 90, 1);
    const barY = 350 - bh;
    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, barY, hW, bh);
    bar.getFill().setSolidFill(i === historico.length-1 ? ds.colors.brandLight : ds.colors.lines);
    bar.getBorder().setTransparent();

    const bV = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx-5, barY-25, hW+10, 25);
    bV.getText().setText(item.total.toString()).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);
    bV.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const bD = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx-25, 355, hW+50, 20);
    bD.getText().setText(item.dataCurta).getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
    bD.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  const txtFooter = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 380, 600, 20);
  txtFooter.getText().setText("Fonte: BD-CORRETIVAS (Infraspeak) • Semana em curso vs. última semana fechada.")
    .getTextStyle().setFontSize(8).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
}
