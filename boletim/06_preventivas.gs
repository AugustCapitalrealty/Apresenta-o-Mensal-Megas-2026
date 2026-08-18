/**
 * ARQUIVO: 06_preventivas.gs
 * Slide "Manutenção Preventiva" — os três escopos num arquivo só.
 *
 * Junta o que eram 06_preventivas.gs, 06_preventivas_facilities.gs e
 * 06_preventivas_hangar.gs. Os três desenhavam o MESMO slide (cartões de SLA,
 * gráfico agendadas x realizadas, rodapé) e divergiam só em:
 *
 *   · qual aba ler;
 *   · em que linha estão datas / agendadas / realizadas;
 *   · quais cartões de SLA aparecem e de que célula sai cada um.
 *
 * Isso agora é DADO (BOL_PREVENTIVAS) e o desenho é um só.
 *
 * A PROVA DE QUE VALIA JUNTAR: os últimos quatro ajustes destes slides —
 * tirar o selo de semana, subir o teto do gráfico para 1.42, abrir o vão
 * entre as barras para 10pt e descer o rótulo 1pt — tiveram que ser feitos
 * TRÊS VEZES, um em cada arquivo, exatamente iguais. Agora é uma vez.
 */

// ==========================================================================
// OS TRÊS ESCOPOS
// ==========================================================================
// `aba: null` = a aba padrão do design system. As cores vão como NOME, não
// como valor: este `const` pode ser avaliado antes do Config.gs, e ler
// `CR_DESIGN_SYSTEM.colors.x` aqui em cima estouraria ReferenceError. Mesmo
// motivo pelo qual o `tema` em 00_Main.gs é texto.
const BOL_PREVENTIVAS = {
  COMPLETO: {
    aba: null,
    subtitulo: 'SLA por Área • Agendadas x Realizadas',
    linhas: { datas: 33, agendadas: 37, realizadas: 43 },
    cards: [
      { titulo: 'SLA GERAL',       celula: 'BM12', cor: 'brandDark',  principal: true },
      { titulo: 'FACILITIES',      celula: 'BM9',  cor: 'brandSoft'  },
      { titulo: 'PROPERTY',        celula: 'BM10', cor: 'brandMed'   },
      { titulo: 'OPERAÇÃO HANGAR', celula: 'BM11', cor: 'brandLight' }
    ]
  },

  FACILITIES: {
    aba: 'megas QUADRO COMPARATIVO',
    subtitulo: 'SLA por Área • Agendadas x Realizadas',
    linhas: { datas: 23, agendadas: 39, realizadas: 45 },
    cards: [
      { titulo: 'SLA GERAL',        celula: 'BP10', cor: 'brandDark', principal: true },
      { titulo: 'SLA FACILITIES',   celula: 'BP8',  cor: 'brandSoft' },
      { titulo: 'SLA PROPRIEDADES', celula: 'BP9',  cor: 'brandMed'  }
    ]
  },

  HANGAR: {
    aba: 'hangar QUADRO COMPARATIVO',
    subtitulo: 'SLA por Área • Agendadas x Realizadas — Hangar VIP',
    linhas: { datas: 24, agendadas: 28, realizadas: 26 },
    cards: [
      { titulo: 'SLA GERAL',          celula: 'BO11', cor: 'brandDark',  principal: true },
      { titulo: 'SLA PROPERTY',       celula: 'BO9',  cor: 'brandMed'   },
      { titulo: 'SLA OP. HANGAR VIP', celula: 'BO10', cor: 'brandLight' }
    ]
  }
};


// ==========================================================================
// PONTOS DE ENTRADA
// ==========================================================================
// Sem parâmetro: o menu "Selecionar função" do editor não lista função que
// declara argumento. São estes nomes que o BOLETINS de 00_Main.gs chama.
function gerarSlide06_Preventivas()            { return _bolPreventivas_('COMPLETO');   }
function gerarSlide06_Preventivas_Facilities() { return _bolPreventivas_('FACILITIES'); }
function gerarSlide06_Preventivas_Hangar()     { return _bolPreventivas_('HANGAR');     }


// ==========================================================================
// DESENHO — um só, para os três
// ==========================================================================
function _bolPreventivas_(chave) {
  const cfg = BOL_PREVENTIVAS[chave];
  if (!cfg) {
    throw new Error('Escopo "' + chave + '" não existe em BOL_PREVENTIVAS. Tem: ' +
                    Object.keys(BOL_PREVENTIVAS).join(', ') + '.');
  }
  const cor = function (nome) { return CR_DESIGN_SYSTEM.colors[nome]; };

  const presentation = SlidesApp.openById(CR_DESIGN_SYSTEM.assets.presentationId);
  const slide        = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const pageWidth    = presentation.getPageWidth();
  const pageHeight   = presentation.getPageHeight();

  // =========================================================
  // --- 0. EXTRAÇÃO DE DADOS ---
  // =========================================================
  const nomeAba = cfg.aba || CR_DESIGN_SYSTEM.assets.sheetName;
  Logger.log('Extraindo Preventivas (' + chave + ') da aba "' + nomeAba + '"...');

  const slaVals = cfg.cards.map(function () { return 'N/D'; });
  let agendadas = [], realizadas = [], timeline = [];
  let ultimaDataSemana = null; // última data com dados — base do detector de semana

  try {
    const ss    = SpreadsheetApp.openById(CR_DESIGN_SYSTEM.assets.spreadsheetId);
    const sheet = ss.getSheetByName(nomeAba);
    if (!sheet) throw new Error('Aba "' + nomeAba + '" não encontrada.');

    // --- SLA por área: cada cartão sabe de que célula sai ---
    cfg.cards.forEach(function (c, i) {
      const v = sheet.getRange(c.celula).getDisplayValue();
      slaVals[i] = v ? v.toString().trim() : 'N/D';
    });

    // --- Agendadas x Realizadas: últimas 8 colunas com dados ---
    const lastCol  = sheet.getLastColumn();
    const rowAgend = sheet.getRange(cfg.linhas.agendadas,  1, 1, lastCol).getValues()[0];
    const rowReal  = sheet.getRange(cfg.linhas.realizadas, 1, 1, lastCol).getValues()[0];
    const rowDate  = sheet.getRange(cfg.linhas.datas,      1, 1, lastCol).getValues()[0];

    let colIndexes = [];
    for (let i = lastCol - 1; i >= 1 && colIndexes.length < 8; i--) {
      if (rowAgend[i] !== '' && rowAgend[i] !== null && rowAgend[i] !== 0) {
        colIndexes.unshift(i);
      }
    }

    colIndexes.forEach(function (i) {
      agendadas.push(Number(rowAgend[i]) || 0);
      realizadas.push(Number(rowReal[i]) || 0);

      let lbl = 'S' + (colIndexes.indexOf(i) + 1);
      if (rowDate[i]) {
        const raw = rowDate[i];
        let dateObj = null;
        if (raw instanceof Date) {
          dateObj = new Date(raw.getTime());
        } else {
          const parsed = new Date(raw.toString());
          if (!isNaN(parsed.getTime())) dateObj = new Date(parsed.getTime());
        }
        if (dateObj) {
          // Regra de negócio: subtrai 1 dia — a planilha marca a semana pelo
          // dia 01, e o que se quer mostrar é o último dia do mês anterior.
          dateObj.setDate(dateObj.getDate() - 1);
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          lbl = dd + '/' + mm;
          ultimaDataSemana = dateObj;
        } else {
          lbl = raw.toString().trim();
        }
      }
      timeline.push(lbl);
    });

  } catch (e) {
    Logger.log('Erro Preventivas ' + chave + ': ' + e.message);
    // Reserva para o slide não sumir do boletim por causa de uma aba renomeada.
    agendadas  = [0,0,0,0,0,0,0,0];
    realizadas = [0,0,0,0,0,0,0,0];
    timeline   = ['S1','S2','S3','S4','S5','S6','S7','S8'];
  }

  // =========================================================
  // --- 1. SETUP VISUAL E CABEÇALHO ---
  // =========================================================
  slide.getBackground().setSolidFill(cor('bgSlide'));

  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, pageWidth - 350, -80, 450, 450);
  ellipse.getFill().setSolidFill(cor('brandLight'), 0.03);
  ellipse.getBorder().setTransparent();

  const marginX = CR_DESIGN_SYSTEM.layout.marginX;
  const marginY = CR_DESIGN_SYSTEM.layout.marginY;

  try {
    const logoBlob = DriveApp.getFileById(CR_DESIGN_SYSTEM.assets.logoId).getBlob();
    slide.insertImage(logoBlob, pageWidth - marginX - CR_DESIGN_SYSTEM.assets.logoW, marginY,
                      CR_DESIGN_SYSTEM.assets.logoW, CR_DESIGN_SYSTEM.assets.logoH);
  } catch (e) {}

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY, pageWidth - 300, 40)
    .getText().setText('Manutenção Preventiva').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(24)
    .setForegroundColor(cor('textMain')).setBold(true);

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, marginY + 35, pageWidth - 300, 30)
    .getText().setText(cfg.subtitulo).getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(11)
    .setForegroundColor(cor('textBody'));

  // O SELO DE SEMANA foi removido do topo destes slides (decisão de layout do
  // boletim). `ultimaDataSemana` continua sendo calculado porque é ele que dá
  // o rótulo DD/MM do eixo — só não vira mais selo.

  // =========================================================
  // --- 2. CARDS DE SLA ---
  // =========================================================
  // A largura sai da QUANTIDADE de cartões do escopo: 4 no completo, 3 nos
  // outros. Antes cada cópia tinha o divisor escrito na mão, e acrescentar um
  // cartão exigia lembrar de mexer nos dois lugares.
  const nCards = cfg.cards.length;
  const kpiY   = marginY + 75;
  const kpiH   = 65;
  const kpiGap = 12;
  const kpiW   = (pageWidth - (marginX * 2) - (kpiGap * (nCards - 1))) / nCards;

  cfg.cards.forEach(function (item, i) {
    const x   = marginX + (i * (kpiW + kpiGap));
    const val = slaVals[i];
    const c   = cor(item.cor);

    const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, kpiW, kpiH);
    card.getFill().setSolidFill(cor('cardBg'));
    card.getBorder().getLineFill().setSolidFill(cor('lines'));

    const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, kpiY, 4, kpiH);
    side.getFill().setSolidFill(c);
    side.getBorder().setTransparent();

    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, kpiY + 8, kpiW - 15, kpiH - 10);
    box.getText().setText(item.titulo + '\n' + val);
    const txt = box.getText();
    txt.getParagraphStyle().setLineSpacing(110);
    txt.getRange(0, item.titulo.length).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7).setBold(true)
      .setForegroundColor(cor('textBody'));

    // Cor do valor: verde >= 95%, laranja >= 90%, vermelho < 90%.
    const num = parseFloat((val || '0').replace('%', '').replace(',', '.'));
    let valColor = cor('accentGreen');
    if (!isNaN(num)) {
      if (num < 90)      valColor = cor('accentRed');
      else if (num < 95) valColor = cor('accentOrange');
    }

    txt.getRange(item.titulo.length + 1, txt.getLength()).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(22).setBold(true)
      .setForegroundColor(item.principal ? c : valColor);
  });

  // =========================================================
  // --- 3. GRÁFICO AGENDADAS x REALIZADAS ---
  // =========================================================
  const chartAreaY = kpiY + kpiH + 15;
  const chartAreaH = pageHeight - chartAreaY - marginY - 20;

  const chartFrame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, chartAreaY,
                                       pageWidth - (marginX * 2), chartAreaH);
  chartFrame.getFill().setSolidFill(cor('cardBg'));
  chartFrame.getBorder().getLineFill().setSolidFill(cor('lines'));

  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, chartAreaY + 12, 400, 20)
    .getText().setText('AGENDADAS X REALIZADAS — ÚLTIMAS 8 SEMANAS').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(10).setBold(true)
    .setForegroundColor(cor('brandMed'));

  const legY = chartAreaY + 30;
  let legX = marginX + 20;
  const legItems = [
    { label: 'REALIZADAS', color: cor('brandDark') },
    { label: 'AGENDADAS',  color: '#CBD5E1' }
  ];
  legItems.forEach(function (item) {
    const sq = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, legX, legY + 3, 7, 7);
    sq.getFill().setSolidFill(item.color);
    sq.getBorder().setTransparent();
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, legX + 10, legY, 75, 14);
    lbl.getText().setText(item.label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(8).setBold(true)
      .setForegroundColor(cor('textBody'));
    lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    legX += 90;
  });

  const pMarginX = 55, pMarginY = 55;
  const plotX = marginX + pMarginX;
  const plotY = chartAreaY + pMarginY;
  const plotW = (pageWidth - (marginX * 2)) - (pMarginX * 2);
  const plotH = chartAreaH - pMarginY - 30;

  slide.insertLine(SlidesApp.LineCategory.STRAIGHT, plotX, plotY + plotH, plotX + plotW, plotY + plotH)
    .getLineFill().setSolidFill(cor('lines'));

  const maxVal = Math.max.apply(null, agendadas.concat(realizadas).concat([10]));
  // 1.42 de teto (era 1.25) e 10pt entre as barras (era 4): é a folga que os
  // rótulos precisam para não colidirem nem serem cortados pelo topo. Estes
  // números foram medidos no deck real — não mexa neles sem olhar o slide.
  const scaleY = plotH / (maxVal * 1.42);
  const stepX  = plotW / timeline.length; // divide em fatias iguais
  const barW   = 16;
  const barGap = 10;                      // espaço entre as duas barras do grupo

  const rotulo = function (x, y, texto, corTexto) {
    const cx = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      x - 5, y, barW + 10, 14);
    cx.getText().setText(texto).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(6.5).setBold(true)
      .setForegroundColor(corTexto);
    cx.getText().getParagraphStyle()
      .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(100);
  };

  timeline.forEach(function (label, i) {
    const groupCX = plotX + (i * stepX) + (stepX / 2);

    const vl = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, groupCX, plotY, groupCX, plotY + plotH);
    vl.getLineFill().setSolidFill(cor('lines'));
    vl.setDashStyle(SlidesApp.DashStyle.DASH);

    const xlbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, groupCX - 35, plotY + plotH + 5, 70, 16);
    xlbl.getText().setText(label).getTextStyle()
      .setFontFamily(CR_DESIGN_SYSTEM.typography.titles).setFontSize(7).setBold(true)
      .setForegroundColor(cor('textBody'));
    xlbl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // AGENDADAS à esquerda, REALIZADAS à direita
    const agX = groupCX - barW - (barGap / 2);
    const reX = groupCX + (barGap / 2);

    const hAgend = Math.max(agendadas[i] * scaleY, 1);
    const agRect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, agX, (plotY + plotH) - hAgend, barW, hAgend);
    agRect.getFill().setSolidFill('#CBD5E1');
    agRect.getBorder().setTransparent();
    rotulo(agX, (plotY + plotH) - hAgend - 18, agendadas[i].toLocaleString('pt-BR'), '#94A3B8');

    const hReal = Math.max(realizadas[i] * scaleY, 1);
    const reRect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, reX, (plotY + plotH) - hReal, barW, hReal);
    reRect.getFill().setSolidFill(cor('brandDark'));
    reRect.getBorder().setTransparent();
    rotulo(reX, (plotY + plotH) - hReal - 18, realizadas[i].toLocaleString('pt-BR'), cor('brandDark'));
  });

  // =========================================================
  // --- 4. RODAPÉ ---
  // =========================================================
  const footerY = pageHeight - 25;
  slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footerY, 400, 20)
    .getText().setText('Capital Realty • Gestão de Facilities & Property').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(cor('textBody'));

  const footerRight = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, pageWidth - marginX - 100, footerY, 100, 20);
  footerRight.getText().setText('Página 06').getTextStyle()
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body).setFontSize(7)
    .setForegroundColor(cor('textBody'));
  footerRight.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log('✅ Slide 06 (Preventivas — ' + chave + ') concluído!');
}


// ==========================================================================
// ATALHOS — VER SÓ ESTE SLIDE
// ==========================================================================
// Limpa a apresentação e desenha só a Manutenção Preventiva, no escopo pedido.
// Passam pelo motor do 00_Main.gs, que aplica e restaura o tema. Sem
// parâmetro, para aparecer no menu "Selecionar função" do editor.
function verManutencaoPreventiva()            { return _bolVerSlide_('COMPLETO',   'Manutenção Preventiva'); }
function verManutencaoPreventivaFacilities()  { return _bolVerSlide_('FACILITIES', 'Manutenção Preventiva'); }
function verManutencaoPreventivaHangar()      { return _bolVerSlide_('HANGAR',     'Manutenção Preventiva'); }
