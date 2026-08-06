/**
 * ARQUIVO: Slide_ChamadosPrioridade.gs
 * SLIDE — CHAMADOS POR PRIORIDADE (Abertos x Fechados)
 * DESCRIÇÃO: Substitui o espaço reservado por duas pizzas (Abertos e
 * Fechados, fatiadas por Prioridade) mais a lista detalhada só dos
 * chamados Emergenciais de cada período — lido das abas "CHAMADOS ABERTOS
 * MES"/"CHAMADOS FECHADOS MES" da planilha de Histórico Validado
 * (obterDadosChamadosPrioridade_ em 02_Dados.gs), já filtrado pelo Centro
 * de Custos da cidade ativa.
 *
 * A pizza é desenhada via Charts.newPieChart() (serviço de gráficos nativo
 * do Apps Script, sem precisar de planilha auxiliar) — o SlidesApp não tem
 * nenhuma shape de "fatia" com ângulo ajustável, então o gráfico é gerado
 * como imagem PNG e inserido no slide com slide.insertImage().
 *
 * Sem as duas abas preenchidas (ou sem nenhuma linha da cidade ativa): cai
 * no slide manual de espaço reservado (gerarSlideReservaGraficos), sem
 * quebrar a geração.
 */

function gerarSlideChamadosPrioridade() {
  const dados = obterDadosChamadosPrioridade_();
  if (!dados) {
    gerarSlideReservaGraficos('CHAMADOS POR PRIORIDADE', 'Abertos x Fechados',
      [{ titulo: 'ABERTOS' }, { titulo: 'FECHADOS' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'CHAMADOS POR PRIORIDADE', 'Abertos x Fechados');

  // Mesma grade 2×2 do espaço reservado que este slide substitui: pizzas
  // em cima, listas de Emergenciais embaixo.
  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const colW = (W - 2 * marginX - gap) / 2;
  const rowH = (areaBottom - topY - gap) / 2;

  _prioridadePizzaCard_(slide, marginX,             topY, colW, rowH, 'ABERTOS',  dados.abertos,  CORES.lightBlue);
  _prioridadePizzaCard_(slide, marginX + colW + gap, topY, colW, rowH, 'FECHADOS', dados.fechados, CORES.darkBlue);

  const y2 = topY + rowH + gap;
  _prioridadeListaEmergencial_(slide, marginX,              y2, colW, rowH, 'CHAMADOS ABERTOS EMERGENCIAL',  dados.abertos.emergencial);
  _prioridadeListaEmergencial_(slide, marginX + colW + gap, y2, colW, rowH, 'CHAMADOS FECHADOS EMERGENCIAL', dados.fechados.emergencial);

  Logger.log('Slide Chamados por Prioridade gerado — abertos=' + dados.abertos.total +
             ' (emergencial=' + dados.abertos.emergencial.length + '), fechados=' + dados.fechados.total +
             ' (emergencial=' + dados.fechados.emergencial.length + ').');
}

// Mesma cor pra cada prioridade nas duas pizzas (Abertos/Fechados), pra dar
// pra comparar visualmente — "menor é melhor" não se aplica aqui, é só
// identidade visual por prioridade (Emergencial mais escuro/sério).
const _PRIORIDADE_CORES_ = {
  'Emergencial': '#1E3A8A',
  'Alta':        '#0EA5E9',
  'Normal':      '#CBD5E1',
  'Baixa':       '#94A3B8'
};

// ── Card com a pizza Abertos/Fechados fatiada por Prioridade ──────────────
function _prioridadePizzaCard_(slide, x, y, w, h, titulo, dadosPeriodo, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + dadosPeriodo.total + ')', corTema);
  const areaY = contentY + 2, areaH = y + h - areaY - 8;

  if (!dadosPeriodo.fatias.length) {
    _prioridadeSemDado_(slide, x, areaY, w, areaH, 'Nenhum chamado no período.', CORES.textGray);
    return;
  }

  const dataTable = Charts.newDataTable();
  dataTable.addColumn(Charts.ColumnType.STRING, 'Prioridade');
  dataTable.addColumn(Charts.ColumnType.NUMBER, 'Qtd');
  dadosPeriodo.fatias.forEach(f => dataTable.addRow([f.label, f.qtd]));

  const cores = dadosPeriodo.fatias.map(f => _PRIORIDADE_CORES_[f.label] || CORES.textGray);
  const chart = Charts.newPieChart()
    .setDataTable(dataTable)
    .setDimensions(Math.round(w * 1.6), Math.round(areaH * 1.6))
    .setColors(cores)
    .setLegendPosition(Charts.Position.RIGHT)
    .setOption('pieSliceText', 'value')
    .setOption('pieSliceTextStyle', { fontSize: 13, bold: true, color: '#FFFFFF' })
    .setOption('legend', { textStyle: { fontSize: 11 } })
    .setOption('chartArea', { left: 10, top: 10, width: '78%', height: '88%' })
    .setOption('backgroundColor', 'transparent')
    .build();

  slide.insertImage(chart.getAs('image/png'), x + 8, areaY, w - 16, areaH);
}

// ── Card com a lista de chamados Emergenciais (Abertos ou Fechados) ───────
function _prioridadeListaEmergencial_(slide, x, y, w, h, titulo, itens) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', CORES.cardRed);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado emergencial no período.', CORES.cardGreen);
    return;
  }

  // Descrições da planilha costumam ser um parágrafo inteiro — corta em ~65
  // caracteres (na última palavra completa) pra caber numa linha só por
  // chamado, como no gráfico colado à mão que este slide substitui.
  const MAX_ITENS = 6, MAX_DESC = 65;
  const truncar = txt => {
    const t = String(txt || '').replace(/\s+/g, ' ').trim();
    if (!t) return '(sem descrição)';
    if (t.length <= MAX_DESC) return t;
    const corte = t.slice(0, MAX_DESC);
    const ultimoEspaco = corte.lastIndexOf(' ');
    return (ultimoEspaco > MAX_DESC * 0.6 ? corte.slice(0, ultimoEspaco) : corte) + '…';
  };

  const visiveis = itens.slice(0, MAX_ITENS);
  const resto = itens.length - visiveis.length;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, listY, w - 30, listH);
  const tr = box.getText();
  tr.setText('');
  visiveis.forEach(it => {
    const bullet = tr.appendText('• ');
    bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(8).setBold(true);
    const idPart = tr.appendText(it.id + ' - ');
    idPart.getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.cardRed).setFontFamily('Montserrat');
    const descPart = tr.appendText(truncar(it.descricao) + '\n');
    descPart.getTextStyle().setFontSize(8).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  });
  if (resto > 0) {
    const maisPart = tr.appendText('+ ' + resto + ' outro(s) chamado(s) emergencial(is)');
    maisPart.getTextStyle().setFontSize(7.5).setItalic(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  }
  tr.getParagraphStyle().setLineSpacing(120);
  box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
}

function _prioridadeSemDado_(slide, x, y, w, h, texto, cor) {
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2 - 10, w, 20);
  txt.getText().setText(texto).getTextStyle()
    .setFontSize(9.5).setItalic(true).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}
