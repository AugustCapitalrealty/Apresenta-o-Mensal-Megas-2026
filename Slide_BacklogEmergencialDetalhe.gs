/**
 * ARQUIVO: Slide_BacklogEmergencialDetalhe.gs
 * SLIDE — BACKLOG EMERGENCIAL — DETALHE (chamados emergenciais em aberto)
 * DESCRIÇÃO: Abre o detalhe dos chamados de prioridade Emergencial que
 * estavam em aberto no Mega ativo durante o MÊS DE REFERÊNCIA da
 * apresentação (o mês anterior — obterMesReferencia_), lidos da aba
 * "BACKLOG - EMERGENCIAL - DETALHE" da planilha de Histórico Validado
 * (obterDadosBacklogEmergencialDetalhe_ em 02_Dados.gs), filtrados por
 * Centro de Custos = MEGA <EMPREENDIMENTO>. Um chamado que hoje já aparece
 * "Fechado" ainda entra se ele esteve aberto em algum momento do mês de
 * referência (comparação de datas, não do Estado atual — ver comentário em
 * 02_Dados.gs).
 *
 * Diferença em relação ao slide de Chamados por Prioridade/Clientes: aqui não
 * tem Abertos x Fechados (é só backlog aberto no mês) — o eixo é EQUIPE
 * responsável (FACILITIES ou PROPERTY). Mesma técnica de barra 100% nativa
 * (RECTANGLE) e a mesma regra de nunca cortar a lista (colunas + fonte
 * adaptativa), igual ao slide de Chamados de Clientes.
 *
 * Sem chamados emergenciais em aberto no mês de referência pro empreendimento
 * ativo: cai no slide manual de espaço reservado (gerarSlideReservaGraficos),
 * sem quebrar a geração.
 */

function gerarSlideBacklogEmergencialDetalhe() {
  const dados = obterDadosBacklogEmergencialDetalhe_();
  if (!dados) {
    gerarSlideReservaGraficos('BACKLOG EMERGENCIAL — DETALHE', 'Chamados emergenciais em aberto · Facilities x Property',
      [{ titulo: 'EM ABERTO' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE', 'Chamados emergenciais em aberto · Facilities x Property');

  const marginX = 30, topY = 76;
  const areaBottom = H - 16;
  const barraH = 96;
  const listaY = topY + barraH + 16;
  const listaH = areaBottom - listaY;

  _backlogEmergBarraCard_(slide, marginX, topY, W - 2 * marginX, barraH, 'EM ABERTO', dados, CORES.themeCorr);
  _backlogEmergLista_(slide, marginX, listaY, W - 2 * marginX, listaH, 'LISTA DE CHAMADOS EM ABERTO', dados.lista, CORES.themeCorr);

  Logger.log('Slide Backlog Emergencial — Detalhe gerado — total=' + dados.total + '.');
}

// Cor por equipe responsável — função (não const top-level) pra não depender
// da ordem de carga dos arquivos .gs (CORES é definido em 01_Config.gs; um
// const de topo aqui poderia rodar antes e estourar TDZ).
function _equipeCor_(equipe) {
  return String(equipe || '').toUpperCase() === 'PROPERTY' ? CORES.themeCorr : CORES.lightBlue;
}

// ── Card com a barra 100% empilhada Facilities x Property ─────────────────
function _backlogEmergBarraCard_(slide, x, y, w, h, titulo, dados, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + dados.total + ')', corTema);
  const areaY = contentY + 2, areaH = y + h - areaY - 8;

  if (!dados.fatias.length) {
    _prioridadeSemDado_(slide, x, areaY, w, areaH, 'Nenhum chamado emergencial em aberto.', CORES.cardGreen);
    return;
  }

  const barX = x + 16, barW = w - 32, barY = areaY + 2, barH = 24;
  const total = dados.total;

  let cursorX = barX;
  dados.fatias.forEach((f, i) => {
    const ehUltima = i === dados.fatias.length - 1;
    const segW = ehUltima ? (barX + barW - cursorX) : Math.round((f.qtd / total) * barW);
    const cor = _equipeCor_(f.label);

    const seg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cursorX, barY, Math.max(segW, 1), barH);
    seg.getFill().setSolidFill(cor);
    seg.getBorder().setTransparent();

    if (segW >= 16) {
      _sTxt(slide, cursorX, barY + 4, segW, 16, String(f.qtd), 9.5, true, CORES.white, 'center');
    }
    cursorX += segW;
  });

  // Legenda em linha única (só 2 séries possíveis) abaixo da barra.
  const legendY = barY + barH + 8;
  const legendW = barW / dados.fatias.length;
  dados.fatias.forEach((f, i) => {
    const cor = _equipeCor_(f.label);
    const pct = total > 0 ? (f.qtd / total * 100) : 0;
    const pctTxt = pct.toFixed(1).replace('.', ',') + '%';
    const lx = barX + i * legendW;

    const dot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, legendY + 3, 8, 8);
    dot.getFill().setSolidFill(cor);
    dot.getBorder().setTransparent();

    _sTxt(slide, lx + 13, legendY, legendW - 13, 16, f.label + ' — ' + f.qtd + ' (' + pctTxt + ')', 9, true, CORES.textDark, 'left');
  });
}

// ── Card com a lista completa de chamados em aberto ────────────────────────
// Mesma técnica de _clientesLista_ (Slide_ChamadosClientes.gs): nunca corta
// item — a partir de 6 itens divide em colunas e a fonte encolhe até um
// piso legível.
function _backlogEmergLista_(slide, x, y, w, h, titulo, itens, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const cols     = itens.length > 6 ? (itens.length > 16 ? 3 : 2) : 1;
  const colGap   = 14;
  const colW     = (w - 30 - (cols - 1) * colGap) / cols;
  const porCol   = Math.ceil(itens.length / cols);
  const LINE_PCT = 118;

  let fontSize = Math.min(8, listH / (porCol * (LINE_PCT / 100) * 1.15));
  fontSize = Math.max(6, Math.round(fontSize * 2) / 2);  // arredonda pra 0,5pt, piso de 6pt

  const maxDesc = cols === 1 ? 90 : (cols === 2 ? 46 : 30);

  for (let c = 0; c < cols; c++) {
    const fatia = itens.slice(c * porCol, (c + 1) * porCol);
    if (!fatia.length) continue;

    const colX = x + 15 + c * (colW + colGap);
    const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, listY, colW, listH);
    const tr = box.getText();
    tr.setText('');
    fatia.forEach(it => {
      const bullet = tr.appendText('• ');
      bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(fontSize).setBold(true);
      const idPart = tr.appendText(it.id + ' - ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
      const eqPart = tr.appendText((it.equipe || '—') + ' - ');
      eqPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(_equipeCor_(it.equipe)).setFontFamily('Montserrat');
      const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc) + '\n');
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    });
    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  }
}
