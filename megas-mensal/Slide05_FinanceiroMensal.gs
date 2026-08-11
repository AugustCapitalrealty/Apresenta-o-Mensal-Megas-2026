// ==========================================
// ARQUIVO: Slide05_FinanceiroMensal.gs
// SLIDE 05 — RESULTADO OPERACIONAL (FINANCEIRO MENSAL)
// ==========================================

// ==========================================
// CONFIGURAÇÃO DA FONTE DE DADOS
// ==========================================

const NOME_ABA_FINANCEIRO    = 'FINANCEIRO';

// ==========================================
// PONTO DE ENTRADA
// ==========================================
function gerarSlideFinanceiro() {
  const dados = obterDadosFinanceiroMensal_();

  if (!dados) {
    Logger.log('Sem dados para o Slide 05 (Financeiro Mensal).');
    return;
  }

  const deck      = getDeckAtivo();
  const slide     = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageWidth  = deck.getPageWidth();
  const pageHeight = deck.getPageHeight();

  criarHeaderPadrao(
    slide,
    'RESULTADO OPERACIONAL',
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

  desenharCardResumo(slide, marginX, topY, leftColW, summaryH, CORES, dados);
  desenharCardDrivers(slide, marginX, topY + summaryH + gap, leftColW, driversH, CORES, dados);
  desenharGraficoBarrasReais(slide, rightColX, topY, rightColW, chartH, CORES, dados.dadosGrafico);
  desenharAreaJustificativa(slide, rightColX, topY + chartH + gap, rightColW, justifH, CORES);

  Logger.log('Slide 05 (Financeiro Mensal) gerado com sucesso.');
}


// ==========================================
// LEITURA DA PLANILHA
// ==========================================
// O mês sai da aba FINANCEIRO BRIDGE (fonte única — ver _financeiroDoBridge_
// em 02_Dados.gs). A aba FINANCEIRO continua sendo lida, mas só entra em
// `planilha`, para o slide de CHECK comparar as duas e apontar divergência.
//
// O retorno traz `linhasDados` com TODAS as rubricas do mês
// ({natureza, orcado, realizado, diff}): o slide só usa os recortes (top 3 /
// top 8), mas o CHECK precisa da lista inteira pra isolar se uma divergência
// está nas linhas ou só no total.
function obterDadosFinanceiroMensal_() {
  const base = _financeiroDoBridge_('mes');
  if (!base) {
    throw new Error('Não foi possível montar o financeiro do mês a partir da aba ' +
                    NOME_ABA_BRIDGE + '. Confira se ela existe e tem as colunas Orç/Real por mês.');
  }
  const ref = obterMesReferencia_();
  base.nomeEmpreendimento = getProjetoAtivo().nome;
  base.periodo            = ref.curto + ' ' + ref.ano;
  base.planilha           = _financeiroDaAba_(NOME_ABA_FINANCEIRO);
  return base;
}


// ==========================================
// CARD RESUMO
// ==========================================
function desenharCardResumo(slide, x, y, w, h, CORES, dados) {
  // Painel padrão do design system (01_Config.gs)
  criarCardPainel(slide, x, y, w, h, null, CORES.darkBlue);

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 5, w - 15, 20);
  title.getText().setText('RESUMO DO MÊS')
    .getTextStyle().setFontSize(8).setBold(true)
    .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');

  const orcado    = dados.totalOrcado;
  const realizado = dados.totalRealizado;
  const diff      = orcado - realizado;
  const diffP     = orcado !== 0 ? (Math.abs(diff) / orcado) * 100 : 0;
  const labelY    = y + 25;
  const areaM2    = obterAreaM2_();   // R$/m² por rubrica (diretoria gosta)

  const l1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, labelY, 70, 15);
  l1.getText().setText('ORÇADO')
    .getTextStyle().setFontSize(6).setBold(true)
    .setForegroundColor('#94A3B8').setFontFamily('Montserrat');

  _resumoValorComM2(slide, x + 80, labelY - 5, 140, formatarMoeda(orcado), formatarReaisM2_(orcado, areaM2), CORES);

  const l2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, labelY + 22, 70, 15);
  l2.getText().setText('REALIZADO')
    .getTextStyle().setFontSize(6).setBold(true)
    .setForegroundColor('#94A3B8').setFontFamily('Montserrat');

  _resumoValorComM2(slide, x + 80, labelY + 17, 140, formatarMoeda(realizado), formatarReaisM2_(realizado, areaM2), CORES);

  const isAbaixo  = diff >= 0;
  const colorBg   = isAbaixo ? '#F0FDF4' : '#FEF2F2';
  const colorTxt  = isAbaixo ? '#166534' : '#DC2626';
  const labelText = isAbaixo ? 'ABAIXO DO ORÇADO' : 'ACIMA DO ORÇADO';
  const varBoxH   = 44;
  const varBoxY   = y + h - varBoxH - 10;

  const varBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 10, varBoxY, w - 20, varBoxH);
  varBox.getFill().setSolidFill(colorBg);
  varBox.getBorder().setTransparent();

  const varM2Str = formatarReaisM2_(Math.abs(diff), areaM2);   // variação também em R$/m²
  const varTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, varBoxY + 3, w - 20, varBoxH - 6);
  varTxt.getText()
    .setText(labelText + '\n' + formatarMoeda(Math.abs(diff)) + ' | ' + diffP.toFixed(1) + '%' +
             (varM2Str ? ' | ' + varM2Str : ''))
    .getTextStyle().setFontSize(11).setBold(true)
    .setForegroundColor(colorTxt).setFontFamily('Montserrat');
  varTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  varTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}

// Valor grande (R$) com o R$/m² logo depois, menor e cinza, na mesma linha.
// Usado nos cards de resumo (mensal e acumulado). Se m2Str vazio, só o valor.
function _resumoValorComM2(slide, x, y, w, valorStr, m2Str, CORES) {
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, 25);
  const txt = m2Str ? valorStr + '   ' + m2Str : valorStr;
  const tr  = box.getText();
  tr.setText(txt);
  tr.getTextStyle().setFontSize(11).setBold(true)
    .setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  if (m2Str) {
    tr.getRange(valorStr.length, txt.length).getTextStyle()
      .setFontSize(6.5).setBold(false).setForegroundColor('#94A3B8');
  }
  tr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
}


// ==========================================
// CARD DRIVERS
// ==========================================
function desenharCardDrivers(slide, x, y, w, h, CORES, dados) {
  // Painel padrão do design system (01_Config.gs)
  criarCardPainel(slide, x, y, w, h, null, CORES.mediumBlue);

  const sectionH = (h - 50) / 2;

  const yAcima = y + 8;
  const dotA = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 12, yAcima + 5, 8, 8);
  dotA.getFill().setSolidFill('#DC2626'); dotA.getBorder().setTransparent();
  const tAcima = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 24, yAcima, w - 34, 20);
  tAcima.getText().setText('ACIMA DO ORÇADO')
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
  tAbaixo.getText().setText('ABAIXO DO ORÇADO')
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
function desenharGraficoBarrasReais(slide, x, y, w, h, CORES, dadosGrafico) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 5, w - 260, 20);
  title.getText().setText('ORÇADO vs REALIZADO')
    .getTextStyle().setFontSize(10).setBold(true)
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

    // ✅ Label sempre após a barra REALIZADA, com cor igual à barra
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
// LEGENDA E JUSTIFICATIVA
// ==========================================
function desenharItemLegenda(slide, x, y, w, boxSize, cor, texto, CORES) {
  const boxX = x + (w - boxSize) / 2;
  const box  = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, boxX, y, boxSize, boxSize);
  box.getFill().setSolidFill(cor);
  box.getBorder().setTransparent();

  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 9, w, 12);
  txt.getText().setText(texto)
    .getTextStyle().setFontSize(5).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

function desenharItemLegendaPosicionado(slide, textXcm, textYcm, iconXcm, iconYcm, cor, texto, CORES) {
  const boxSize = 8;
  const iconX   = cmParaPt(iconXcm);
  const iconY   = cmParaPt(iconYcm);
  const textX   = cmParaPt(textXcm);
  const textY   = cmParaPt(textYcm);

  const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, iconX, iconY, boxSize, boxSize);
  box.getFill().setSolidFill(cor);
  box.getBorder().setTransparent();

  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, textX, textY, 70, 12);
  txt.getText().setText(texto)
    .getTextStyle().setFontSize(5).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
}

function cmParaPt(valorCm) {
  return Number(valorCm || 0) * 28.3464567;
}

function desenharAreaJustificativa(slide, x, y, w, h, CORES) {
  // Painel padrão do design system (01_Config.gs) — tema âmbar (notas)
  criarCardPainel(slide, x, y, w, h, null, CORES.textOrange);

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 3, w - 20, 15);
  title.getText().setText('NOTAS EXPLICATIVAS / JUSTIFICATIVAS')
    .getTextStyle().setFontSize(8).setBold(true)
    .setForegroundColor(CORES.textOrange).setFontFamily('Montserrat');

  const textBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, y + 25, w - 20, h - 30);
  textBox.getText()
    .setText('• Utilize este espaço para justificar as principais linhas acima e abaixo do orçado.\n• (Texto editável)')
    .getTextStyle().setFontSize(8).setItalic(true)
    .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  textBox.getText().getParagraphStyle().setLineSpacing(110);
}


// ==========================================
// UTILITÁRIOS
// ==========================================
function formatarMoeda(valor) {
  return 'R$ ' + Math.round(Number(valor || 0)).toLocaleString('pt-BR');
}

function formatarMoedaCompacta(valor) {
  valor = Number(valor || 0);
  // Separador de milhar também no formato compacto: "R$ 6.084 mil"
  if (Math.abs(valor) >= 1000) return 'R$ ' + Math.round(valor / 1000).toLocaleString('pt-BR') + ' mil';
  return 'R$ ' + Math.round(valor).toLocaleString('pt-BR');
}

function converterNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (valor === null || valor === undefined || valor === '') return 0;
  const texto = String(valor)
    .replace(/\u00A0/g, ' ').replace(/\s/g, '')
    .replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.');
  const numero = Number(texto);
  return isNaN(numero) ? 0 : numero;
}

function limparTexto(valor) {
  return String(valor || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizarTexto(valor) {
  return limparTexto(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function testarAcessoPlanilhaFinanceiro() {
  const ss  = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  const aba = ss.getSheetByName(NOME_ABA_FINANCEIRO);
  if (!aba) throw new Error('A aba ' + NOME_ABA_FINANCEIRO + ' não foi encontrada.');
  Logger.log('Planilha: ' + ss.getName());
  Logger.log('Aba: '      + aba.getName());
  Logger.log('Última linha: '   + aba.getLastRow());
  Logger.log('Última coluna: '  + aba.getLastColumn());
}
