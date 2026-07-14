// ==========================================
// ARQUIVO: Slide03_Corretivas.gs
// SLIDE 03 — INDICADORES DE CORRETIVAS
// Dados: obterDadosCorretivasV6() em 02_Dados.gs
// ==========================================

function gerarSlideCorretivas() {
  // A aba de indicadores de corretivas pode não existir na planilha da cidade.
  // Ainda assim o slide DEVE aparecer (com os cards em placeholder e o espaço
  // reservado para o gráfico) — no futuro os KPIs virão da planilha validada.
  let dados = obterDadosCorretivasV6();
  if (!dados) {
    const linhas = () => [
      { l: 'Chamados criados',                    v: '—' },
      { l: 'Chamados fechados',                    v: '—' },
      { l: 'Tempo médio entre criado e fechado',   v: '—' },
      { l: 'Índice de disponibilidade',            v: '—' }
    ];
    dados = {
      mensal: { titulo: 'VISÃO MENSAL',    kpis: linhas() },
      anual:  { titulo: 'VISÃO ACUMULADA', kpis: linhas() }
    };
    Logger.log('Corretivas: sem aba de indicadores — cards em placeholder.');
  }

  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const PageWidth = deck.getPageWidth();
  const PageHeight = deck.getPageHeight();

  // Usa o cabeçalho padrão do 01_Config.gs
  criarHeaderPadrao(slide, 'INDICADORES DE CORRETIVAS', 'Backlog e Performance · ▲/▼ vs mês anterior');

  const marginX = 40;
  // AJUSTE PADRONIZAÇÃO: Alterado de 90 para 80 (Alinhado com Slides 3 e 4)
  const topY = 80;
  const gap = 30;

  const cardW = (PageWidth - (2 * marginX) - gap) / 2;
  // Mantivemos a altura aumentada
  const cardH = 145;

  desenharCardListaKPIs(slide, marginX, topY, cardW, cardH, CORES, dados.mensal, CORES.lightBlue);
  desenharCardListaKPIs(slide, marginX + cardW + gap, topY, cardW, cardH, CORES, dados.anual, CORES.cardGreen);

  // Espaço para Gráfico
  const chartY = topY + cardH + 20;
  const chartW = PageWidth - (2 * marginX);
  const footerH = PageHeight - chartY - 20;

  const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, chartY, chartW, footerH);
  ph.getFill().setSolidFill(CORES.white);
  ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill('#CBD5E1');

  const chartTitle = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 15, chartY + 10, chartW - 30, 25);
  chartTitle.getText().setText("BACKLOG DE CHAMADOS EMERGÊNCIAS")
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.lightBlue).setFontFamily('Montserrat');

  const phTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, chartY + (footerH/2), chartW, 30);
  phTxt.getText().setText("[ ESPAÇO RESERVADO PARA COLAR O GRÁFICO ]")
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor('#CBD5E1').setFontFamily('Montserrat');
  phTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  
  Logger.log("Slide 03 (Corretivas) gerado com sucesso.");
}

// Função Auxiliar Local
function desenharCardListaKPIs(slide, x, y, w, h, CORES, dados, corTema) {
  // Painel padrão do design system (01_Config.gs)
  const startContentY = criarCardPainel(slide, x, y, w, h, dados.titulo, corTema);
  const DS = CR_DESIGN_SYSTEM;

  const usableH = h - (startContentY - y) - 8;
  const rowH = usableH / 4;

  dados.kpis.forEach((kpi, i) => {
    const ry = startContentY + (i * rowH);

    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, ry, w * 0.50, rowH);
    lblBox.getText().setText(kpi.l)
      .getTextStyle().setFontSize(7.5).setBold(true).setForegroundColor(CORES.textDark).setFontFamily(DS.typography.body);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Valor + tendência vs mês anterior (histórico validado)
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w * 0.52, ry, w * 0.43, rowH);
    const valStr = String(kpi.v);
    const trend  = tendenciaTexto_(kpi.delta, kpi.menor);
    const txt    = trend.txt ? valStr + '   ' + trend.txt : valStr;
    const vr = valBox.getText();
    vr.setText(txt).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(corTema).setFontFamily(DS.typography.titles);
    if (trend.txt) {
      vr.getRange(valStr.length, txt.length).getTextStyle().setFontSize(9.5).setBold(true).setForegroundColor(trend.cor);
    }
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    vr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });
}
