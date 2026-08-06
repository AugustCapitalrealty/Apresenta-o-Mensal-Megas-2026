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
 * responsável (FACILITIES ou PROPERTY), resumido em dois cards KPI compactos
 * (criarCardKPI, 01_Config.gs) em vez de barra+legenda — só 2 categorias não
 * precisam de gráfico, e o espaço economizado vai pra lista de detalhe, que
 * é o que importa no slide. Mesma regra de nunca cortar a lista (colunas +
 * fonte adaptativa), igual ao slide de Chamados de Clientes.
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

  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const kpiH = 72;
  const listaY = topY + kpiH + gap;
  const listaH = areaBottom - listaY;

  _backlogEmergKPIs_(slide, marginX, topY, W - 2 * marginX, kpiH, dados);
  _backlogEmergLista_(slide, marginX, listaY, W - 2 * marginX, listaH, 'LISTA DE CHAMADOS EM ABERTO', dados.lista, CORES.themeCorr);

  Logger.log('Slide Backlog Emergencial — Detalhe gerado — total=' + dados.total + '.');
}

// Cor por equipe responsável — função (não const top-level) pra não depender
// da ordem de carga dos arquivos .gs (CORES é definido em 01_Config.gs; um
// const de topo aqui poderia rodar antes e estourar TDZ).
function _equipeCor_(equipe) {
  return String(equipe || '').toUpperCase() === 'PROPERTY' ? CORES.themeCorr : CORES.lightBlue;
}

// Texto compacto "dd/mm/aa · Nd" (data do chamado + dias em aberto até o
// fim do mês de referência) — usado nas listas dos dois slides de backlog
// detalhado (Emergencial e Clientes, este em Slide_BacklogClientesDetalhes.gs).
function _backlogMetaTexto_(it) {
  if (!it.dataReporte) return '';
  const dias = (it.diasAberto === null || it.diasAberto === undefined) ? '' : it.diasAberto + 'd';
  return dias ? (it.dataReporte + ' · ' + dias) : it.dataReporte;
}

// ── Dois cards KPI compactos: FACILITIES x PROPERTY ────────────────────────
// Sempre mostra as duas equipes, mesmo quando uma tem zero chamados — o
// card não vira gráfico (só 2 categorias não precisam de barra/legenda) e
// sobra espaço pra lista de detalhe embaixo, que é o foco do slide.
function _backlogEmergKPIs_(slide, x, y, w, h, dados) {
  const porEquipe = { FACILITIES: 0, PROPERTY: 0 };
  dados.fatias.forEach(f => { porEquipe[f.label] = f.qtd; });
  const total = dados.total;

  const gap = 16, cardW = (w - gap) / 2;
  ['FACILITIES', 'PROPERTY'].forEach((equipe, i) => {
    const qtd = porEquipe[equipe] || 0;
    const pct = total > 0 ? (qtd / total * 100) : 0;
    criarCardKPI(slide, x + i * (cardW + gap), y, cardW, h, {
      label: equipe,
      valor: qtd,
      cor: _equipeCor_(equipe),
      tamValor: 26,
      sub: pct.toFixed(1).replace('.', ',') + '%'
    });
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

  const maxDesc = cols === 1 ? 78 : (cols === 2 ? 38 : 24);

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
      // ID em cinza neutro — nunca na cor do tema/equipe, senão em chamados
      // PROPERTY (mesma cor âmbar do tema deste slide) ID e equipe ficam
      // indistinguíveis visualmente.
      const idPart = tr.appendText(it.id + ' ');
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      const meta = _backlogMetaTexto_(it);
      if (meta) {
        const metaPart = tr.appendText('(' + meta + ') ');
        metaPart.getTextStyle().setFontSize(Math.max(6, fontSize - 0.5)).setItalic(true).setBold(false).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
      }
      const eqPart = tr.appendText('- ' + (it.equipe || '—') + ' - ');
      eqPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(_equipeCor_(it.equipe)).setFontFamily('Montserrat');
      const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc) + '\n');
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    });
    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  }
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Chamados de prioridade Emergencial que estavam em aberto durante o mês de
// referência (mês anterior) no empreendimento ativo, com o detalhe por
// Equipe responsável (Facilities x Property), busca automática na aba
// "BACKLOG - EMERGENCIAL - DETALHE" da planilha de Histórico Validado. Sem
// a aba preenchida, cai no slide manual de espaço reservado.
function gerarSoBacklogEmergencialDetalheCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogEmergencialDetalhe(); }
