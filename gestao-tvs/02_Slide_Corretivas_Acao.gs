/**
 * ARQUIVO: 02_Slide_Corretivas_Acao.gs
 * DESCRIÇÃO: Foco de Ação (Matriz de Corretivas).
 */

function gerarSlideCorretivasDetalhe(slide, dataGlobal, unit) {
  const d = obterBacklogCorretivoTV_(unit);
  if (!d) { Logger.log('⚠️ Backlog Corretivo (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardCorretivasDetalhe(slide, d.pEmergencial, d.pAlta, d.pNormal, d.pBaixa,
    d.topAreas, dataGlobal, unit, d.totalAnterior, d.diasComparacao);
}

function criarDashboardCorretivasDetalhe(slide, pEmergencial, pAlta, pNormal, pBaixa, topAreas, dataGlobal, unit, prevBacklog, diasComp) {
  const ds = CR_DESIGN_SYSTEM;
  const totalBacklog = pEmergencial + pAlta + pNormal + pBaixa;
  let topAreaName = topAreas.length > 0 ? topAreas[0].area.toUpperCase() : "N/D";

  if (topAreaName.includes("PREVENTIVO DE INCÊNDIO")) topAreaName = "SISTEMA DE INCÊNDIO";

  // prevBacklog vem CALCULADO da base (fila de N dias atrás), não de um
  // retrato guardado no ScriptProperties entre execuções.
  if (prevBacklog == null) prevBacklog = totalBacklog;
  const diff = totalBacklog - prevBacklog;
  const vs = diasComp ? ` vs ${diasComp}d atrás` : '';

  applyBrandHeaderAndBackground(slide, "Backlog Corretivo", "Matriz de Prioridade e Disciplinas", dataGlobal, unit);

  if (totalBacklog > 0 || prevBacklog > 0) {
    let msgAcao = `🎯 ESTÁVEL: Fila mantida (${totalBacklog})${vs}`;
    let badgeBgColor = ds.colors.bgSlide;
    let badgeBorderColor = ds.colors.lines;
    let badgeTxtColor = ds.colors.textBody;

    if (diff > 0) {
      msgAcao = `📈 ATENÇÃO: Fila subiu (+${diff})${vs}`;
      badgeBgColor = '#FFF5F5'; badgeBorderColor = ds.colors.accentRed; badgeTxtColor = ds.colors.accentRed;
    } else if (diff < 0) {
      msgAcao = `📉 REDUÇÃO: Fila diminuiu (${diff})${vs}`;
      badgeBgColor = '#ECFDF5'; badgeBorderColor = ds.colors.accentGreen; badgeTxtColor = ds.colors.accentGreen;
    }

    const bannerW = 720 - (ds.layout.marginX * 2);
    const badge = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, 95, bannerW, 20);
    badge.getFill().setSolidFill(badgeBgColor);
    badge.getBorder().setWeight(1).getLineFill().setSolidFill(badgeBorderColor);

    const badgeTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 95, bannerW, 20);
    badgeTxt.getText().setText(msgAcao)
      .getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(badgeTxtColor).setBold(true);
    badgeTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  const startY = ds.layout.contentY;

  const lblPrio = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, startY, 300, 20);
  lblPrio.getText().setText(`MATRIZ DE PRIORIDADE`).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const renderPrioCard = (y, lbl, val, corHex, isCritico) => {
    const perc = totalBacklog > 0 ? Math.round((val / totalBacklog) * 100) : 0;

    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, y, 290, 50);
    bg.getFill().setSolidFill(ds.colors.cardBg);
    bg.getBorder().setWeight(isCritico ? 2 : 1).getLineFill().setSolidFill(isCritico ? corHex : ds.colors.lines);

    const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, y, 6, 50);
    barra.getFill().setSolidFill(corHex); barra.getBorder().setTransparent();

    const tLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX + 15, y + 15, 150, 20);
    tLbl.getText().setText(`${lbl} | ${perc}%`).getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(isCritico ? corHex : ds.colors.textBody).setBold(true);

    const tVal = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 200, y + 5, 110, 40);
    tVal.getText().setText(val.toString()).getTextStyle().setFontSize(isCritico ? 26 : 22).setFontFamily(ds.typography.titles).setForegroundColor(corHex).setBold(true);
    tVal.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  };

  renderPrioCard(startY + 25, "EMERGENCIAL", pEmergencial, ds.colors.accentRed, true);
  renderPrioCard(startY + 85, "ALTA", pAlta, ds.colors.accentOrange, true);
  renderPrioCard(startY + 145, "NORMAL", pNormal, ds.colors.textBody, false);
  renderPrioCard(startY + 205, "BAIXA", pBaixa, ds.colors.lines, false);

  const rX = 390; const rW = 280;
  const lblArea = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, startY, rW, 20);
  lblArea.getText().setText("DISCIPLINAS").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  if (topAreas.length > 0) {
    const maxAreaVal = Math.max(...topAreas.map(a => a.count), 1);
    let currY = startY + 30;
    const barH = 16; const gap = 20;

    topAreas.forEach((item, index) => {
      const perc = totalBacklog > 0 ? Math.round((item.count / totalBacklog) * 100) : 0;
      let displayArea = item.area.toUpperCase();
      if (displayArea.includes("PREVENTIVO DE INCÊNDIO")) displayArea = "SISTEMA DE INCÊNDIO";

      let barColor = ds.colors.lines; let textColor = ds.colors.textBody; let isTop = false;

      if (index === 0) { barColor = ds.colors.accentRed; textColor = ds.colors.accentRed; isTop = true; }
      else if (index === 1) { barColor = ds.colors.accentOrange; textColor = ds.colors.accentOrange; isTop = true; }

      const tArea = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX, currY, rW - 60, 20);
      tArea.getText().setText(displayArea).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(textColor).setBold(true);

      const tVal = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, rX + rW - 60, currY, 60, 20);
      tVal.getText().setText(`${item.count} | ${perc}%`).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(textColor).setBold(true);
      tVal.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

      const bgBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rX, currY + 18, rW, barH);
      bgBar.getFill().setSolidFill(ds.colors.cardBg); bgBar.getBorder().setTransparent();

      const actW = Math.max((item.count / maxAreaVal) * rW, 2);
      const actBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, rX, currY + 18, actW, barH);
      actBar.getFill().setSolidFill(barColor); actBar.getBorder().setTransparent();

      currY += barH + gap;
    });
  }

  const txtFooter = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 380, 600, 20);
  txtFooter.getText().setText("Fonte: BD-CORRETIVAS (Infraspeak) • Fila em aberto na data da atualização.")
    .getTextStyle().setFontSize(8).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
}
