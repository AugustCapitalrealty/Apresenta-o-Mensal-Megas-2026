// ==========================================
// ARQUIVO: Slide08_FinanceiroAnual.gs
// SLIDE 08 — RESULTADO OPERACIONAL ANUAL (ACUMULADO)
// ==========================================

// ==========================================
// CONFIGURAÇÃO DA FONTE DE DADOS - ANUAL
// ==========================================
const NOME_ABA_FINANCEIRO_ANUAL = 'FINANCEIRO ANUAL';

// ==========================================
// PONTO DE ENTRADA
// ==========================================
function gerarSlideFinanceiroAnual() {
  const dados = obterDadosFinanceiroAnual();

  if (!dados) {
    Logger.log('Sem dados para o Slide Financeiro Anual.');
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageWidth  = deck.getPageWidth();
  const pageHeight = deck.getPageHeight();

  criarHeaderPadrao(
    slide,
    'RESULTADO OPERACIONAL ACUMULADO',
    'Performance Financeira - ' + dados.nomeEmpreendimento + ' (' + dados.periodo + ')'
  );

  const marginX      = 20;
  const topY         = 85;
  const gap          = 15;
  const bottomMargin = 15;
  const contentHeight = pageHeight - topY - bottomMargin;

  const leftColW  = 240;
  const rightColW = pageWidth - (2 * marginX) - leftColW - gap;
  const rightColX = marginX + leftColW + gap;

  const summaryH = 120;
  const driversH = contentHeight - summaryH - gap;
  const justifH  = 90;
  const chartH   = contentHeight - justifH - gap;

  desenharCardResumoAnual(slide, marginX, topY, leftColW, summaryH, CORES, dados);
  desenharCardDriversAnual(slide, marginX, topY + summaryH + gap, leftColW, driversH, CORES, dados);
  desenharGraficoBarrasReaisAnual(slide, rightColX, topY, rightColW, chartH, CORES, dados.dadosGrafico);
  desenharAreaJustificativaAnual(slide, rightColX, topY + chartH + gap, rightColW, justifH, CORES);

  Logger.log('Slide Financeiro Anual gerado com sucesso.');
}


// ==========================================
// LEITURA DA PLANILHA - FINANCEIRO ANUAL
// ==========================================
// O acumulado é a soma de Jan até o mês de referência — exatamente o bloco
// `acum` que obterDadosDRE_ já monta a partir da aba FINANCEIRO BRIDGE
// (fonte única; ver _financeiroDoBridge_ em 02_Dados.gs). A aba FINANCEIRO
// ANUAL continua sendo lida, mas só entra em `planilha`, para o slide de
// CHECK comparar as duas e apontar divergência.
function obterDadosFinanceiroAnual() {
  const base = _financeiroDoBridge_('acum');
  if (!base) {
    throw new Error('Não foi possível montar o acumulado a partir da aba ' + NOME_ABA_BRIDGE +
                    '. Confira se ela existe e tem as colunas Orç/Real por mês.');
  }
  const planilha = _financeiroDaAba_(NOME_ABA_FINANCEIRO_ANUAL);
  const ref      = obterMesReferencia_();

  base.nomeEmpreendimento = getProjetoAtivo().nome;
  // Rótulo do período: preferimos o texto escrito no cabeçalho da aba (é o
  // que o time revisa à mão); sem ele, montamos "Jan a <Mês>/<ano>" a partir
  // do mês de referência — nunca mais um "Acumulado Anual" genérico que não
  // diz até quando o acumulado vai.
  base.periodo  = (planilha && detectarPeriodoAnual_(planilha.cabecalho))
               || ('Jan a ' + ref.curto + '/' + ref.ano);
  base.planilha = planilha;
  return base;
}

function detectarPeriodoAnual_(headerRow) {
  if (!headerRow) return null;
  for (let i = 0; i < headerRow.length; i++) {
    const txt = String(headerRow[i] || '').trim();
    if (/jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(txt) && txt.length > 5) return txt;
  }
  return null;
}


// ==========================================
// CARD RESUMO
// ==========================================
function desenharCardResumoAnual(slide, x, y, w, h, CORES, dados) {
  // Painel padrão do design system (01_Config.gs)
  criarCardPainel(slide, x, y, w, h, null, CORES.darkBlue);

  const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + w - 75, y + 6, 68, 14);
  badge.getFill().setSolidFill(CORES.darkBlue);
  badge.getBorder().setTransparent();

  const badgeTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w - 75, y + 6, 68, 14);
  badgeTxt.getText().setText('ACUMULADO')
    .getTextStyle().setFontSize(6).setBold(true)
    .setForegroundColor(CORES.white).setFontFamily('Montserrat');
  badgeTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  badgeTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 5, w - 90, 20);
  title.getText().setText('RESUMO DO PERÍODO')
    .getTextStyle().setFontSize(8).setBold(true)
    .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');

  const orcado    = dados.totalOrcado;
  const realizado = dados.totalRealizado;
  const diff      = orcado - realizado;
  const diffP     = orcado !== 0 ? (Math.abs(diff) / orcado) * 100 : 0;
  const labelY    = y + 25;
  // R$/m² ACUMULADO = média dos m² mensais até o mês de referência
  const cm2 = obterCustoM2Acumulado_();

  const l1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, labelY, 105, 15);
  l1.getText().setText('ORÇADO ACUM.')
    .getTextStyle().setFontSize(6).setBold(true)
    .setForegroundColor('#94A3B8').setFontFamily('Montserrat');

  _resumoValorComM2(slide, x + 80, labelY - 5, 140, formatarMoeda(orcado), cm2 ? formatarRsM2_(cm2.orcado) : '', CORES);

  const l2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, labelY + 22, 105, 15);
  l2.getText().setText('REALIZADO ACUM.')
    .getTextStyle().setFontSize(6).setBold(true)
    .setForegroundColor('#94A3B8').setFontFamily('Montserrat');

  _resumoValorComM2(slide, x + 80, labelY + 17, 140, formatarMoeda(realizado), cm2 ? formatarRsM2_(cm2.realizado) : '', CORES);

  const isAbaixo  = diff >= 0;
  const colorBg   = isAbaixo ? '#F0FDF4' : '#FEF2F2';
  const colorTxt  = isAbaixo ? '#166534' : '#DC2626';
  const labelText = isAbaixo ? 'ABAIXO DO ORÇADO' : 'ACIMA DO ORÇADO';
  const varBoxH   = 44;
  const varBoxY   = y + h - varBoxH - 10;

  const varBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 10, varBoxY, w - 20, varBoxH);
  varBox.getFill().setSolidFill(colorBg);
  varBox.getBorder().setTransparent();

  // Variação também em R$/m² (diferença das médias mensais acumuladas)
  const varM2Acum = (cm2 && cm2.orcado != null && cm2.realizado != null)
    ? formatarRsM2_(Math.abs(cm2.realizado - cm2.orcado)) : '';
  const varTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, varBoxY + 3, w - 20, varBoxH - 6);
  varTxt.getText()
    .setText(labelText + '\n' + formatarMoeda(Math.abs(diff)) + ' | ' + diffP.toFixed(1) + '%' +
             (varM2Acum ? ' | ' + varM2Acum : ''))
    .getTextStyle().setFontSize(11).setBold(true)
    .setForegroundColor(colorTxt).setFontFamily('Montserrat');
  varTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  varTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}


// ==========================================
// CARD DRIVERS
// ==========================================
function desenharCardDriversAnual(slide, x, y, w, h, CORES, dados) {
  // Painel padrão do design system (01_Config.gs)
  criarCardPainel(slide, x, y, w, h, null, CORES.mediumBlue);

  const sectionH = (h - 50) / 2;

  const yAcima = y + 8;
  const dotA = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 12, yAcima + 5, 8, 8);
  dotA.getFill().setSolidFill('#DC2626'); dotA.getBorder().setTransparent();
  const tAcima = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 24, yAcima, w - 34, 20);
  tAcima.getText().setText('ACIMA DO ORÇADO (ACUMULADO)')
    .getTextStyle().setFontSize(9).setBold(true)
    .setForegroundColor('#DC2626').setFontFamily('Montserrat');

  let txtAcima = '';
  dados.acimaDoOrcado.forEach(i => { txtAcima += '• ' + i.natureza + ': +' + formatarMoedaCompacta(i.absDiff) + '\n'; });
  if (!txtAcima) txtAcima = '• Sem linhas acima do orçado';

  const lAcima = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, yAcima + 20, w - 20, sectionH);
  lAcima.getText().setText(txtAcima)
    .getTextStyle().setFontSize(9).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  lAcima.getText().getParagraphStyle().setLineSpacing(120);

  const yAbaixo = y + (h / 2) + 5;
  const dotB = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 12, yAbaixo + 5, 8, 8);
  dotB.getFill().setSolidFill('#16A34A'); dotB.getBorder().setTransparent();
  const tAbaixo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 24, yAbaixo, w - 34, 20);
  tAbaixo.getText().setText('ABAIXO DO ORÇADO (ACUMULADO)')
    .getTextStyle().setFontSize(9).setBold(true)
    .setForegroundColor('#16A34A').setFontFamily('Montserrat');

  let txtAbaixo = '';
  dados.abaixoDoOrcado.forEach(i => { txtAbaixo += '• ' + i.natureza + ': -' + formatarMoedaCompacta(i.absDiff) + '\n'; });
  if (!txtAbaixo) txtAbaixo = '• Sem linhas abaixo do orçado';

  const lAbaixo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, yAbaixo + 20, w - 20, sectionH);
  lAbaixo.getText().setText(txtAbaixo)
    .getTextStyle().setFontSize(9).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  lAbaixo.getText().getParagraphStyle().setLineSpacing(120);
}


// ==========================================
// GRÁFICO DE BARRAS
// ==========================================
function desenharGraficoBarrasReaisAnual(slide, x, y, w, h, CORES, dadosGrafico) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  // Título em linha única (largura até a legenda) para não sobrepor as barras
  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 5, w - 200, 20);
  title.getText().setText('ORÇADO vs REALIZADO — ACUMULADO')
    .getTextStyle().setFontSize(9).setBold(true)
    .setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');

  desenharItemLegendaPosicionado(slide, 19.13, 3.56, 19.54, 3.25, '#E2E8F0', 'Orçado',           CORES);
  desenharItemLegendaPosicionado(slide, 20.32, 3.56, 21.17, 3.25, '#10B981', 'Abaixo do Orçado', CORES);
  desenharItemLegendaPosicionado(slide, 22.18, 3.56, 23.00, 3.25, '#EF4444', 'Acima do Orçado',  CORES);

  const plotX     = x + 15;
  const plotY     = y + 30;
  const plotW     = w - 30;
  const plotH     = h - 40;
  const count     = Math.max(dadosGrafico.length, 1);
  const rowH      = Math.min(plotH / count, 25);
  const labelW    = plotW * 0.22;
  const barMaxW   = plotW * 0.65;
  const barStartX = plotX + labelW + 5;

  let maxVal = 0;
  dadosGrafico.forEach(d => {
    if (d.orcado    > maxVal) maxVal = d.orcado;
    if (d.realizado > maxVal) maxVal = d.realizado;
  });
  if (maxVal === 0) maxVal = 1;

  dadosGrafico.forEach((item, i) => {
    const itemY     = plotY + (i * rowH);
    let   labelText = item.label;
    if (labelText.length > 20) labelText = labelText.substring(0, 18) + '...';

    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX, itemY, labelW, 15);
    lbl.getText().setText(labelText)
      .getTextStyle().setFontSize(6).setBold(true)
      .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
    lbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const barH       = 8;
    const orcadoW    = Math.max((item.orcado    / maxVal) * barMaxW, 1);
    const realizadoW = Math.max((item.realizado / maxVal) * barMaxW, 1);
    const abaixo     = item.realizado <= item.orcado;

    // Barra cinza (orçado) — sempre atrás
    const barOrc = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, barStartX, itemY + 3.5, orcadoW, barH);
    barOrc.getFill().setSolidFill('#E2E8F0');
    barOrc.getBorder().setTransparent();

    // Barra colorida (realizado) — na frente
    const barReal = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, barStartX, itemY + 5.5, realizadoW, barH - 4);
    barReal.getFill().setSolidFill(abaixo ? '#10B981' : '#EF4444');
    barReal.getBorder().setTransparent();

    // ✅ Label sempre após a barra REALIZADA (verde ou vermelha), não após a maior barra
    const valTxtX = barStartX + realizadoW + 5;
    if (valTxtX < (x + w - 40)) {
      const valTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, valTxtX, itemY, 80, 15);
      valTxt.getText().setText(formatarMoedaCompacta(item.realizado))
        .getTextStyle().setFontSize(6).setBold(true)
        .setForegroundColor(abaixo ? '#10B981' : '#EF4444')
        .setFontFamily('Montserrat');
      valTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    }
  });
}


// ==========================================
// ÁREA DE JUSTIFICATIVA
// ==========================================
function desenharAreaJustificativaAnual(slide, x, y, w, h, CORES) {
  // Painel padrão do design system (01_Config.gs) — tema âmbar (notas)
  criarCardPainel(slide, x, y, w, h, null, CORES.textOrange);

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 3, w - 20, 15);
  title.getText().setText('NOTAS EXPLICATIVAS / JUSTIFICATIVAS (ACUMULADO)')
    .getTextStyle().setFontSize(8).setBold(true)
    .setForegroundColor(CORES.textOrange).setFontFamily('Montserrat');

  const textBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 25, w - 20, h - 30);
  textBox.getText()
    .setText('• Utilize este espaço para justificar as principais linhas acima e abaixo do orçado no acumulado.\n• (Texto editável)')
    .getTextStyle().setFontSize(8).setItalic(true)
    .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  textBox.getText().getParagraphStyle().setLineSpacing(110);
}
