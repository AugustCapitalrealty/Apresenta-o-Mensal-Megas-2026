/**
 * ARQUIVO: Slide_ChamadosClientes.gs
 * SLIDE — CHAMADOS DE CLIENTES (Abertos x Fechados)
 * DESCRIÇÃO: Substitui o slide manual por duas barras 100% empilhadas
 * (Abertos e Fechados, fatiadas por Cliente) mais a lista completa de
 * chamados de cada período — lido das mesmas abas "CHAMADOS ABERTOS
 * MES"/"CHAMADOS FECHADOS MES" da planilha de Histórico Validado usadas
 * pelo slide Chamados por Prioridade (obterDadosChamadosClientes_ em
 * 02_Dados.gs), filtrado pelo Centro de Custos da cidade ativa e sem as
 * linhas do próprio condomínio (só chamados de clientes de verdade).
 *
 * Mesma técnica de barra 100% nativa (só RECTANGLE) do slide de
 * Prioridade — ver o comentário lá pra explicação de por que não é uma
 * pizza de verdade.
 *
 * Sem as duas abas preenchidas (ou sem nenhuma linha da cidade ativa): cai
 * no slide manual de espaço reservado (gerarSlideReservaGraficos), sem
 * quebrar a geração.
 */

function gerarSlideChamadosClientes() {
  const dados = obterDadosChamadosClientes_();
  if (!dados) {
    gerarSlideReservaGraficos('CHAMADOS DE CLIENTES', 'Abertos x Fechados',
      [{ titulo: 'ABERTOS' }, { titulo: 'FECHADOS' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'CHAMADOS DE CLIENTES', 'Abertos x Fechados');

  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const colW = (W - 2 * marginX - gap) / 2;
  const rowH = (areaBottom - topY - gap) / 2;

  const coresMapa = _clienteCoresMapa_(dados);
  _clientesBarraCard_(slide, marginX,             topY, colW, rowH, 'ABERTOS',  dados.abertos,  CORES.lightBlue, coresMapa);
  _clientesBarraCard_(slide, marginX + colW + gap, topY, colW, rowH, 'FECHADOS', dados.fechados, CORES.darkBlue, coresMapa);

  const y2 = topY + rowH + gap;
  _clientesLista_(slide, marginX,             y2, colW, rowH, 'LISTA DE CHAMADOS ABERTOS',  dados.abertos.lista,  CORES.lightBlue);
  _clientesLista_(slide, marginX + colW + gap, y2, colW, rowH, 'LISTA DE CHAMADOS FECHADOS', dados.fechados.lista, CORES.darkBlue);

  Logger.log('Slide Chamados de Clientes gerado — abertos=' + dados.abertos.total +
             ', fechados=' + dados.fechados.total + '.');
}

// Paleta cíclica pros clientes nomeados (a ordem de atribuição segue o
// ranking combinado abertos+fechados, ver _clienteCoresMapa_, pra um
// mesmo cliente manter a mesma cor nos dois cards). "Outros" é sempre cinza.
const _CLIENTE_PALETA_ = ['#1E3A8A', '#0EA5E9', '#F59E0B', '#10B981', '#9333EA', '#D97706'];
const _CLIENTE_COR_OUTROS_ = '#94A3B8';

function _clienteCoresMapa_(dados) {
  const soma = {};
  ['abertos', 'fechados'].forEach(periodo => {
    dados[periodo].fatias.forEach(f => {
      if (f.label === 'Outros') return;
      soma[f.label] = (soma[f.label] || 0) + f.qtd;
    });
  });
  const ranked = Object.keys(soma).sort((a, b) => soma[b] - soma[a]);
  const mapa = { 'Outros': _CLIENTE_COR_OUTROS_ };
  ranked.forEach((cliente, i) => { mapa[cliente] = _CLIENTE_PALETA_[i % _CLIENTE_PALETA_.length]; });
  return mapa;
}

// Nome de cliente cru da planilha costuma ser a razão social inteira — corta
// pra caber na legenda/lista sem estourar a largura do card.
function _truncarNome_(txt, max) {
  const t = String(txt || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return (ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : corte) + '…';
}

// ── Card com a barra 100% empilhada Abertos/Fechados por Cliente ──────────
function _clientesBarraCard_(slide, x, y, w, h, titulo, dadosPeriodo, corTema, coresMapa) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + dadosPeriodo.total + ')', corTema);
  const areaY = contentY + 2, areaH = y + h - areaY - 8;

  if (!dadosPeriodo.fatias.length) {
    _prioridadeSemDado_(slide, x, areaY, w, areaH, 'Nenhum chamado de cliente no período.', CORES.textGray);
    return;
  }

  const barX = x + 16, barW = w - 32, barY = areaY + 8, barH = 28;
  const total = dadosPeriodo.total;

  let cursorX = barX;
  dadosPeriodo.fatias.forEach((f, i) => {
    const ehUltima = i === dadosPeriodo.fatias.length - 1;
    const segW = ehUltima ? (barX + barW - cursorX) : Math.round((f.qtd / total) * barW);
    const cor = coresMapa[f.label] || CORES.textGray;

    const seg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cursorX, barY, Math.max(segW, 1), barH);
    seg.getFill().setSolidFill(cor);
    seg.getBorder().setTransparent();

    if (segW >= 16) {
      _sTxt(slide, cursorX, barY + 6, segW, 16, String(f.qtd), 9.5, true, CORES.white, 'center');
    }
    cursorX += segW;
  });

  // Legenda: bolinha + cliente (truncado) + qtd (%) — altura de linha
  // adaptada à quantidade de fatias, igual ao slide de Prioridade.
  const legendTop = barY + barH + 10;
  const legendBottom = areaY + areaH - 4;
  const rowH = Math.min(20, (legendBottom - legendTop) / dadosPeriodo.fatias.length);
  let legendY = legendTop;
  dadosPeriodo.fatias.forEach(f => {
    const cor = coresMapa[f.label] || CORES.textGray;
    const pct = total > 0 ? (f.qtd / total * 100) : 0;
    const pctTxt = pct.toFixed(1).replace('.', ',') + '%';

    const dot = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, barX, legendY + rowH / 2 - 4, 8, 8);
    dot.getFill().setSolidFill(cor);
    dot.getBorder().setTransparent();

    _sTxt(slide, barX + 13, legendY, 160, rowH, _truncarNome_(f.label, 30), 8, true, CORES.textDark, 'left');
    _sTxt(slide, barX + 176, legendY, barW - 176, rowH, f.qtd + ' (' + pctTxt + ')', 8, false, CORES.textGray, 'left');
    legendY += rowH;
  });
}

// ── Card com a lista completa de chamados (Abertos ou Fechados) ───────────
function _clientesLista_(slide, x, y, w, h, titulo, itens, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const MAX_ITENS = 8, MAX_CLIENTE = 22, MAX_DESC = 42;
  const visiveis = itens.slice(0, MAX_ITENS);
  const resto = itens.length - visiveis.length;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, listY, w - 30, listH);
  const tr = box.getText();
  tr.setText('');
  visiveis.forEach(it => {
    const bullet = tr.appendText('• ');
    bullet.getTextStyle().setForegroundColor(CORES.textGray).setFontSize(8).setBold(true);
    const cliPart = tr.appendText(_truncarNome_(it.cliente, MAX_CLIENTE) + ' - ');
    cliPart.getTextStyle().setFontSize(8).setBold(true).setForegroundColor(corTema).setFontFamily('Montserrat');
    const idPart = tr.appendText(it.id + ' - ');
    idPart.getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
    const descPart = tr.appendText(_truncarNome_(it.descricao, MAX_DESC) + '\n');
    descPart.getTextStyle().setFontSize(8).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
  });
  if (resto > 0) {
    const maisPart = tr.appendText('+ ' + resto + ' outro(s) chamado(s)');
    maisPart.getTextStyle().setFontSize(7.5).setItalic(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
  }
  tr.getParagraphStyle().setLineSpacing(120);
  box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
}
