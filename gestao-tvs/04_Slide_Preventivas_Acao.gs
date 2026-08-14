/**
 * ARQUIVO: 04_Slide_Preventivas_Acao.gs
 * DESCRIÇÃO: Foco de Ação (Preventivas em Aberto/Atrasadas).
 *
 * FONTE: BD-PREVENTIVAS (base bruta) via obterBacklogPreventivoTV_ em
 * 09_Dados_BasesBrutas.gs. Antes lia a aba "PREVENTIVA - DETALHE - <CIDADE>",
 * uma cópia colada dentro da planilha da TV.
 *
 * O comparativo da fila continua vindo do ScriptProperties (a base não guarda
 * o histórico do próprio backlog, só o estado de agora — então a série é
 * montada a cada execução, como já era).
 */

function gerarSlidePreventivasDetalhe(slide, dataGlobal, unit) {
  const d = obterBacklogPreventivoTV_(unit);
  // Sem dado, NÃO limpa o slide: a TV segue com a última versão boa.
  if (!d) { Logger.log('⚠️ Backlog Preventivo (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  const countEmAberto = d.countEmAberto;

  const scriptProps = PropertiesService.getScriptProperties();
  const histStr = scriptProps.getProperty(unit.keys.prev);
  let histFila = histStr ? JSON.parse(histStr) : [];

  if (histFila.length === 0 || histFila[histFila.length - 1].count !== countEmAberto) {
    histFila.push({ date: dataGlobal, count: countEmAberto });
  }
  if (histFila.length > 10) histFila = histFila.slice(histFila.length - 10);
  scriptProps.setProperty(unit.keys.prev, JSON.stringify(histFila));

  let prevEmAberto = countEmAberto;
  if (histFila.length >= 2) prevEmAberto = histFila[histFila.length - 2].count;

  const diff = countEmAberto - prevEmAberto;
  const trend = diff < 0 ? 'DOWN' : (diff > 0 ? 'UP' : 'FLAT');

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardDetalhePreventivas(slide, countEmAberto, d.countEmCurso, d.lista,
    d.equipeLider, dataGlobal, prevEmAberto, trend, diff, unit);
}

function criarDashboardDetalhePreventivas(slide, countEmAberto, countEmCurso, lista, equipeLider, dataGlobal, prevEmAberto, trend, diff, unit) {
  const ds = CR_DESIGN_SYSTEM;

  applyBrandHeaderAndBackground(slide, "Backlog Preventivo", "Rotinas atrasadas ou em execução", dataGlobal, unit);

  if (countEmAberto > 0 || prevEmAberto > 0) {
    let msgAcao = `🎯 ESTÁVEL: Fila mantida (${countEmAberto})`;
    let badgeBgColor = ds.colors.bgSlide;
    let badgeBorderColor = ds.colors.lines;
    let badgeTxtColor = ds.colors.textBody;

    if (trend === 'DOWN') {
      msgAcao = `📉 REDUÇÃO: Fila diminuiu (${diff})`;
      badgeBgColor = '#ECFDF5'; badgeBorderColor = ds.colors.accentGreen; badgeTxtColor = ds.colors.accentGreen;
    } else if (trend === 'UP') {
      msgAcao = `📈 ATENÇÃO: Fila subiu (+${diff})`;
      badgeBgColor = '#FFF5F5'; badgeBorderColor = ds.colors.accentRed; badgeTxtColor = ds.colors.accentRed;
    }

    const bannerW = 720 - (ds.layout.marginX * 2);
    const badge = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, 95, bannerW, 20);
    badge.getFill().setSolidFill(badgeBgColor);
    badge.getBorder().setWeight(1).getLineFill().setSolidFill(badgeBorderColor);

    const badgeTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 95, bannerW, 20);
    badgeTxt.getText().setText(msgAcao).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(badgeTxtColor).setBold(true);
    badgeTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  const startY = ds.layout.contentY;

  const renderCard = (x, w, lbl, val, corHex, sizeVal, valAnt = null) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, startY, w, 60);
    bg.getFill().setSolidFill(ds.colors.cardBg); bg.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
    const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, startY, 4, 60);
    barra.getFill().setSolidFill(corHex); barra.getBorder().setTransparent();
    const tLbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, startY + 5, w - 15, 20);
    tLbl.getText().setText(lbl).getTextStyle().setFontSize(10).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
    const tVal = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, startY + 20, w - 15, 40);
    tVal.getText().setText(val.toString()).getTextStyle().setFontSize(sizeVal).setFontFamily(ds.typography.titles).setForegroundColor(corHex).setBold(true);

    if (valAnt !== null) {
      const diferenca = val - valAnt;
      if (diferenca !== 0) {
        const isUp = diferenca > 0;
        const arrow = isUp ? "▲" : "▼";
        const dColor = isUp ? ds.colors.accentRed : ds.colors.accentGreen;
        const sinal = isUp ? "+" : "";
        const tDelta = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w - 75, startY + 25, 65, 30);
        tDelta.getText().setText(`${arrow} ${sinal}${diferenca}`).getTextStyle().setFontSize(14).setFontFamily(ds.typography.titles).setForegroundColor(dColor).setBold(true);
        tDelta.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
      }
    }
  };

  renderCard(ds.layout.marginX, 180, "🔴 EM ABERTO", countEmAberto, ds.colors.accentRed, 30, prevEmAberto);
  renderCard(240, 150, "⚪ TOTAL NA FILA", countEmAberto + countEmCurso, ds.colors.brandDark, 26);
  renderCard(400, 150, "🟠 EM CURSO", countEmCurso, ds.colors.accentOrange, 26);

  const bgEq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 560, startY, 110, 60);
  bgEq.getFill().setSolidFill(ds.colors.bgSlide); bgEq.getBorder().setWeight(1).getLineFill().setSolidFill(ds.colors.lines);
  const tEqL = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 565, startY + 5, 100, 20);
  tEqL.getText().setText("MAIOR VOLUME").getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textBody).setBold(true);
  const tEqV = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 565, startY + 25, 100, 30);
  tEqV.getText().setText(equipeLider).getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const listYStart = startY + 75;
  const lblTop = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, listYStart, 300, 20);
  lblTop.getText().setText("TOP PRIORIDADES (POR VOLUME)").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.textMain).setBold(true);

  const addHeaderCol = (x, w, texto) => {
    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, listYStart + 22, w, 20);
    txt.getText().setText(texto).getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody).setBold(true);
  };
  addHeaderCol(55, 45, "QTD");
  addHeaderCol(100, 340, "DESCRIÇÃO DO SERVIÇO");
  addHeaderCol(450, 100, "RESPONSÁVEL");
  addHeaderCol(560, 110, "DIAS EM ABERTO");

  const hdrSep = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, listYStart + 42, 620, 2);
  hdrSep.getFill().setSolidFill(ds.colors.lines); hdrSep.getBorder().setTransparent();

  let currY = listYStart + 48;
  const rowH = 22;
  if (lista.length === 0) {
    const txtEmpty = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, currY + 10, 620, 50);
    txtEmpty.getText().setText("Nenhuma preventiva pendente ou atrasada na fila.")
      .getTextStyle().setFontSize(14).setFontFamily(ds.typography.titles).setForegroundColor(ds.colors.accentGreen).setBold(true);
    txtEmpty.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  } else {
    lista.forEach((item, idx) => {
      const isTopCritical = idx < 3 && item.isEmAberto;

      const bgRow = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, currY, 620, rowH);
      bgRow.getFill().setSolidFill(isTopCritical ? '#FFF5F5' : ds.colors.cardBg);
      bgRow.getBorder().setTransparent();

      if (isTopCritical) {
        const bordRow = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, currY, 3, rowH);
        bordRow.getFill().setSolidFill(ds.colors.accentRed); bordRow.getBorder().setTransparent();
      } else {
        const sep = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, ds.layout.marginX, currY + rowH - 1, 620, 1);
        sep.getFill().setSolidFill(ds.colors.lines); sep.getBorder().setTransparent();
      }

      const tQtd = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 55, currY + 1, 45, rowH);
      tQtd.getText().setText(item.qtd.toString() + "x").getTextStyle().setFontSize(11).setFontFamily(ds.typography.titles).setForegroundColor(item.isEmAberto ? ds.colors.accentRed : ds.colors.textMain).setBold(true);

      const tDesc = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 100, currY + 1, 340, rowH);
      tDesc.getText().setText(item.desc).getTextStyle().setFontSize(10).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textMain).setBold(isTopCritical);

      const tEq = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 450, currY + 2, 100, rowH);
      tEq.getText().setText(item.equipe).getTextStyle().setFontSize(9).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);

      const isAtraso = item.isEmAberto;
      const tDt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 560, currY + 2, 110, rowH);
      tDt.getText().setText(item.dataLabel).getTextStyle().setFontSize(9).setFontFamily(ds.typography.titles).setForegroundColor(isAtraso ? ds.colors.accentRed : ds.colors.textBody).setBold(isAtraso);
      currY += rowH + 2;
    });
  }

  const txtFooter = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, ds.layout.marginX, 380, 600, 20);
  txtFooter.getText().setText("Fonte: BD-PREVENTIVAS (Infraspeak) • Fila em aberto na data da atualização.")
    .getTextStyle().setFontSize(8).setFontFamily(ds.typography.body).setForegroundColor(ds.colors.textBody);
}
