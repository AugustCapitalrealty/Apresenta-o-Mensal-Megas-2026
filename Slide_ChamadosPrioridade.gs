/**
 * ARQUIVO: Slide_ChamadosPrioridade.gs
 * SLIDE — CHAMADOS POR PRIORIDADE (Abertos x Fechados)
 * DESCRIÇÃO: Substitui o espaço reservado por duas barras 100% empilhadas
 * (Abertos e Fechados, fatiadas por Prioridade) mais a lista detalhada só
 * dos chamados Emergenciais de cada período — lido das abas "CHAMADOS
 * ABERTOS MES"/"CHAMADOS FECHADOS MES" da planilha de Histórico Validado
 * (obterDadosChamadosPrioridade_ em 02_Dados.gs), já filtrado pelo Centro
 * de Custos da cidade ativa.
 *
 * A barra é desenhada 100% nativa, só com RECTANGLE — o Slides não tem
 * nenhuma shape de "fatia de pizza" com ângulo ajustável (nem via API, nem
 * via SlidesApp), então uma pizza de verdade só sairia como imagem
 * (Charts.newPieChart() + insertImage), que fica borrada em zoom alto. A
 * barra empilhada carrega a mesma informação (proporção + valor + %) 100%
 * vetorial, nítida em qualquer zoom/impressão.
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

  _prioridadeBarraCard_(slide, marginX,             topY, colW, rowH, 'ABERTOS',  dados.abertos,  CORES.lightBlue);
  _prioridadeBarraCard_(slide, marginX + colW + gap, topY, colW, rowH, 'FECHADOS', dados.fechados, CORES.darkBlue);

  const y2 = topY + rowH + gap;
  _prioridadeListaEmergencial_(slide, marginX,              y2, colW, rowH, 'CHAMADOS ABERTOS EMERGENCIAL',  dados.abertos.emergencial);
  _prioridadeListaEmergencial_(slide, marginX + colW + gap, y2, colW, rowH, 'CHAMADOS FECHADOS EMERGENCIAL', dados.fechados.emergencial);

  Logger.log('Slide Chamados por Prioridade gerado — abertos=' + dados.abertos.total +
             ' (emergencial=' + dados.abertos.emergencial.length + '), fechados=' + dados.fechados.total +
             ' (emergencial=' + dados.fechados.emergencial.length + ').');
}

// Gradiente de urgência (não é mais tom de azul): Emergencial em vermelho
// de alerta — igual ao tema dos cards de lista Emergencial logo abaixo,
// pra "emergencial" significar a mesma cor em toda a página — Alta em
// âmbar de atenção, Normal/Baixa em cinza decrescente (menos saturado =
// menos urgente).
const _PRIORIDADE_CORES_ = {
  'Emergencial': '#EF4444',  // = CORES.cardRed — hardcoded pra não depender da ordem de carga dos arquivos (const de nível de arquivo)
  'Alta':        '#F59E0B',
  'Normal':      '#94A3B8',
  'Baixa':       '#E2E8F0'
};
// Texto claro nos tons escuros/saturados, escuro no cinza bem claro (Baixa)
// — senão o número dentro do segmento fica ilegível.
const _PRIORIDADE_TEXTO_CLARO_ = { 'Emergencial': true, 'Alta': true, 'Normal': true, 'Baixa': false };

// ── Card com a barra 100% empilhada Abertos/Fechados por Prioridade ───────
function _prioridadeBarraCard_(slide, x, y, w, h, titulo, dadosPeriodo, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + dadosPeriodo.total + ')', corTema);
  const areaY = contentY + 2, areaH = y + h - areaY - 8;

  if (!dadosPeriodo.fatias.length) {
    _prioridadeSemDado_(slide, x, areaY, w, areaH, 'Nenhum chamado no período.', CORES.textGray);
    return;
  }

  const barX = x + 16, barW = w - 32, barY = areaY + 8, barH = 28;
  const total = dadosPeriodo.total;

  let cursorX = barX;
  dadosPeriodo.fatias.forEach((f, i) => {
    const ehUltima = i === dadosPeriodo.fatias.length - 1;
    const segW = ehUltima ? (barX + barW - cursorX) : Math.round((f.qtd / total) * barW);
    const cor = _PRIORIDADE_CORES_[f.label] || CORES.textGray;

    const seg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cursorX, barY, Math.max(segW, 1), barH);
    seg.getFill().setSolidFill(cor);
    seg.getBorder().setTransparent();

    if (segW >= 16) {
      const corTxt = _PRIORIDADE_TEXTO_CLARO_[f.label] ? CORES.white : CORES.textDark;
      _sTxt(slide, cursorX, barY + 6, segW, 16, String(f.qtd), 9.5, true, corTxt, 'center');
    }
    cursorX += segW;
  });

  // Legenda: bolinha + prioridade + qtd (%), uma linha por fatia — a altura
  // de cada linha se adapta ao espaço sobrando no card (com só 2-3
  // prioridades, cada linha ganha mais respiro em vez de deixar vazio
  // embaixo; com as 4, aperta o suficiente pra caber todas).
  const legendTop = barY + barH + 10;
  const legendBottom = areaY + areaH - 4;
  const rowH = Math.min(20, (legendBottom - legendTop) / dadosPeriodo.fatias.length);
  let legendY = legendTop;
  dadosPeriodo.fatias.forEach(f => {
    const cor = _PRIORIDADE_CORES_[f.label] || CORES.textGray;
    const pct = total > 0 ? (f.qtd / total * 100) : 0;
    const pctTxt = pct.toFixed(1).replace('.', ',') + '%';

    const dot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, legendY + rowH / 2 - 4, 8, 8);
    dot.getFill().setSolidFill(cor);
    dot.getBorder().setTransparent();

    _sTxt(slide, barX + 13, legendY, 90, rowH, f.label, 8, true, CORES.textDark, 'left');
    _sTxt(slide, barX + 100, legendY, barW - 100, rowH, f.qtd + ' (' + pctTxt + ')', 8, false, CORES.textGray, 'left');
    legendY += rowH;
  });
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
