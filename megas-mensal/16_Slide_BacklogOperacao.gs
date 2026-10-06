/**
 * ARQUIVO: 16_Slide_BacklogOperacao.gs
 * SEÇÃO:   SLIDES — Backlog da Operação e Manutenção
 * DESCRIÇÃO: Chamados por prioridade, motivos de pendência, detalhe de
 *            chamados emergenciais e visão analítica de Facilities.
 */

// ==========================================
// CHAMADOS POR PRIORIDADE
// ==========================================
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
  const dados = obterDadosChamadosPrioridade_() || {
    abertos: { total: 0, fatias: [], emergencial: [] },
    fechados: { total: 0, fatias: [], emergencial: [] }
  };

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const ref = obterMesReferencia_();
  criarHeaderPadrao(slide, 'CHAMADOS POR PRIORIDADE', 'Abertos x Fechados · Mês de referência: ' + ref.siglaAno);

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
// Regra geral de todas as listas de chamados do deck: mostrar tudo que
// couber; quando não couber numa coluna só, divide em mais colunas e
// encolhe a fonte até um piso legível — nunca esconde chamado atrás de um
// "+N outros" (mesma técnica de _clientesLista_/_backlogEmergTabela_).
function _prioridadeListaEmergencial_(slide, x, y, w, h, titulo, itens) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + itens.length + ')', CORES.cardRed);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado emergencial no período.', CORES.cardGreen);
    return;
  }

  const cols     = itens.length > 6 ? (itens.length > 16 ? 3 : 2) : 1;
  const colGap   = 14;
  const colW     = (w - 30 - (cols - 1) * colGap) / cols;
  const porCol   = Math.ceil(itens.length / cols);
  const LINE_PCT = 120;

  // Fonte FIXA em 7pt, igual a todas as outras listas/tabelas do deck — a
  // pedido do usuário, nenhuma página muda de corpo conforme fica mais
  // cheia ou mais vazia. O número de COLUNAS (acima) é o que absorve o
  // volume; o corpo do texto não muda.
  const fontSize = 7;

  const maxDesc = cols === 1 ? 65 : (cols === 2 ? 36 : 22);
  const truncar = txt => {
    const t = String(txt || '').replace(/\s+/g, ' ').trim();
    return t ? _truncarNome_(t, maxDesc) : '(sem descrição)';
  };

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
      idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.cardRed).setFontFamily('Montserrat');
      const descPart = tr.appendText(truncar(it.descricao) + '\n');
      descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    });
    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  }
}

function _prioridadeSemDado_(slide, x, y, w, h, texto, cor) {
  const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + h / 2 - 10, w, 20);
  txt.getText().setText(texto).getTextStyle()
    .setFontSize(9.5).setItalic(true).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
  txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Barras Abertos/Fechados por Prioridade + lista dos Emergenciais, busca
// automática nas abas CHAMADOS ABERTOS MES/CHAMADOS FECHADOS MES da
// planilha de Histórico Validado, filtrado pelo Centro de Custos da cidade
// ativa. Sem as abas preenchidas, cai no slide manual de espaço reservado.
function gerarSoChamadosPrioridadeCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideChamadosPrioridade(); }
function gerarSoChamadosPrioridadeItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideChamadosPrioridade(); }
function gerarSoChamadosPrioridadeEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideChamadosPrioridade(); }

// ==========================================
// CHAMADOS PENDENTES (MOTIVOS DE PAUSA)
// ==========================================
/**
 * ARQUIVO: Slide_BacklogPendentes.gs
 * SLIDE — CHAMADOS PENDENTES (BACKLOG) POR ESTADO
 * Versão nativa do gráfico que era colado à mão todo mês:
 *   ▸ barra cinza 'Em resolução' (diferença conciliada com a aba DADOS)
 *   ▸ moldura pontilhada 'DIRECIONADOS' com os estados da aba
 *     CHAMADOS PENDENTES (BACKLOG)
 *   ▸ barra azul forte 'Total Geral' (= 'Chamados geral' da aba DADOS)
 * Dados: obterDadosBacklogPendentes_() em 02_Dados.gs.
 * Sem a aba preenchida, gera o espaço reservado (não quebra o deck).
 */

function gerarSlideBacklogPendentes() {
  const d = obterDadosBacklogPendentes_();
  if (!d || !d.direcionados.length) {
    gerarSlideReservaGraficos('CHAMADOS PENDENTES (BACKLOG)',
      'Chamados por estado — alimente a aba CHAMADOS PENDENTES (BACKLOG) da planilha',
      [{ titulo: 'DIRECIONADOS' }]);
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, 'CHAMADOS PENDENTES (BACKLOG)',
    'Chamados por estado — ' + d.mesLabel + ' · ▲/▼ vs mês anterior · Total conciliado com a aba DADOS');

  // ── Moldura padrão ────────────────────────────────────────────────────────
  const marginX = 30, topY = 76;
  const cardH = H - topY - 16;
  const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, topY, W - 2 * marginX, cardH);
  card.getFill().setSolidFill(DS.colors.cardBg);
  card.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  card.getBorder().setWeight(1);

  // ── Barras: Em resolução | direcionados... | Total Geral ────────────────
  // Cada barra carrega o valor do mês anterior (anterior) p/ a tendência ▲/▼.
  const barras = [{ estado: 'Em resolução', qtd: d.emResolucao, anterior: d.emResolucaoAnterior, cor: '#CBD5E1', corVal: CORES.textGray }]
    .concat(d.direcionados.map(it => ({ estado: it.estado, qtd: it.qtd, anterior: it.anterior, cor: '#BFDBFE', corVal: CORES.darkBlue })))
    .concat([{ estado: 'Total Geral', qtd: d.total, anterior: d.totalAnterior, cor: CORES.lightBlue, corVal: CORES.darkBlue, destaque: true }]);

  const plotX  = marginX + 14;
  const plotW  = W - 2 * marginX - 28;
  const labelH = 46;                          // rótulos de estado — bastante altura p/ quebrar por palavra
  const baseY  = topY + cardH - labelH - 8;   // linha de base das barras
  const plotTop = topY + 40;
  const plotH  = baseY - plotTop;

  const maxVal = Math.max(d.total, 1);
  const n      = barras.length;
  const slotW  = plotW / n;
  const barW   = Math.min(slotW * 0.55, 42);

  // ── Moldura pontilhada 'DIRECIONADOS' (envolve barras + rótulos) ─────────
  const fx = plotX + slotW * 0.96;
  const fw = slotW * d.direcionados.length + slotW * 0.08;
  const fy = plotTop - 14;
  const fh = baseY + labelH - fy + 6;
  const frame = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, fx, fy, fw, fh);
  frame.getFill().setTransparent();
  frame.getBorder().setDashStyle(SlidesApp.DashStyle.DOT).setWeight(1.5)
    .getLineFill().setSolidFill('#94A3B8');

  const ft = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx + 8, fy + 3, 160, 18);
  ft.getText().setText('DIRECIONADOS').getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor(CORES.textGray).setFontFamily(DS.typography.titles);

  // ── Desenho das barras ────────────────────────────────────────────────────
  barras.forEach((b, i) => {
    const cx   = plotX + i * slotW + (slotW - barW) / 2;
    const hBar = b.qtd > 0 ? Math.max((b.qtd / maxVal) * plotH, 3) : 0;

    // Estado com quantidade 0 não desenha barra — só o número 0
    if (hBar > 0) {
      const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, baseY - hBar, barW, hBar);
      bar.getFill().setSolidFill(b.cor); bar.getBorder().setTransparent();
    }

    // Valor acima da barra (com respiro) + 2ª linha com a tendência vs mês
    // anterior em TODAS as barras (▲ subiu = atenção · ▼ caiu = melhora).
    const temDelta = b.anterior != null && !isNaN(b.anterior);
    const delta    = temDelta ? b.qtd - b.anterior : 0;
    const boxH  = temDelta ? 26 : 13;
    const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.25, baseY - hBar - boxH - 8, slotW * 1.5, boxH);
    const vt = vl.getText();
    const valStr = formatarNumeroBR(b.qtd);
    let txt = valStr;
    if (temDelta) {
      const seta = delta > 0 ? '▲' : (delta < 0 ? '▼' : '▬');
      const dnum = delta === 0 ? '0' : (delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(delta));
      txt += '\n' + seta + ' ' + dnum;   // compacto em todas as barras (subtítulo explica)
    }
    vt.setText(txt).getTextStyle()
      .setFontSize(b.destaque ? 8.5 : 7.5).setBold(true)
      .setForegroundColor(b.corVal).setFontFamily(DS.typography.titles);
    if (temDelta) {
      const corDelta = delta === 0 ? CORES.textGray : (delta > 0 ? CORES.cardRed : CORES.cardGreen);
      vt.getRange(valStr.length + 1, txt.length).getTextStyle()
        .setFontSize(b.destaque ? 8.5 : 7.5).setBold(true).setForegroundColor(corDelta);
    }
    vt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo do estado abaixo da base — fonte 4.5pt e caixa ~1 slot (sem
    // invadir o vizinho), com bastante altura p/ quebrar por palavra
    // (ex.: "Responsabilidade" cabe numa linha).
    const el = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.075, baseY + 3, slotW * 1.15, labelH);
    el.getText().setText(b.estado).getTextStyle()
      .setFontSize(4.5).setBold(true)
      .setForegroundColor(b.destaque ? CORES.darkBlue : CORES.textDark).setFontFamily(DS.typography.body);
    el.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(100);
    el.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  });

  Logger.log('Slide Backlog Pendentes gerado — ' + d.mesLabel + ' · ' +
             d.direcionados.length + ' estados direcionados · Em resolução=' + d.emResolucao +
             ' · Total=' + d.total + '.');
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
/**
 * Abre diálogo interativo para escolher qual empreendimento gerar o slide de Chamados Pendentes.
 */
function escolherEmpreendimentoEGerarBacklogPendentes() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  if (!ui) {
    try { ui = SlidesApp.getUi(); } catch (e) {}
  }

  if (ui) {
    const resposta = ui.prompt(
      '📊 Gerar Slide — Chamados Pendentes (Backlog)',
      'Escolha o empreendimento que deseja gerar:\n\n' +
      '1 - Mega Curitiba\n' +
      '2 - Mega Itajaí\n' +
      '3 - Mega Esteio\n' +
      '4 - Todos os Megas\n\n' +
      'Digite o número (1, 2, 3 ou 4):',
      ui.ButtonSet.OK_CANCEL
    );

    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Operação cancelada.');
      return;
    }

    const escolha = resposta.getResponseText().trim();
    if (escolha === '1') {
      gerarSoBacklogPendentesCuritiba();
      ui.alert('✓ Slide de Chamados Pendentes (Mega Curitiba) gerado com sucesso!');
    } else if (escolha === '2') {
      gerarSoBacklogPendentesItajai();
      ui.alert('✓ Slide de Chamados Pendentes (Mega Itajaí) gerado com sucesso!');
    } else if (escolha === '3') {
      gerarSoBacklogPendentesEsteio();
      ui.alert('✓ Slide de Chamados Pendentes (Mega Esteio) gerado com sucesso!');
    } else if (escolha === '4') {
      gerarSoBacklogPendentesTodosOsMegas();
      ui.alert('✓ Slides de Chamados Pendentes de todos os Megas gerados com sucesso!');
    } else {
      ui.alert('Opção inválida: "' + escolha + '". Digite 1, 2, 3 ou 4.');
    }
  } else {
    Logger.log('Escolha uma das funções: gerarSoBacklogPendentesCuritiba(), gerarSoBacklogPendentesItajai(), gerarSoBacklogPendentesEsteio() ou gerarSoBacklogPendentesTodosOsMegas().');
    gerarSoBacklogPendentesCuritiba();
  }
}

function gerarSoBacklogPendentesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogPendentes(); }
function gerarSoBacklogPendentesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogPendentes(); }
function gerarSoBacklogPendentesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogPendentes(); }

function gerarSoChamadosPendentesCuritiba() { gerarSoBacklogPendentesCuritiba(); }
function gerarSoChamadosPendentesItajai()   { gerarSoBacklogPendentesItajai(); }
function gerarSoChamadosPendentesEsteio()   { gerarSoBacklogPendentesEsteio(); }

function gerarSoBacklogPendentesTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(cidade => {
    setProjetoAtivo(cidade);
    gerarSlideBacklogPendentes();
  });
}

function gerarSoChamadosPendentesTodosOsMegas() {
  gerarSoBacklogPendentesTodosOsMegas();
}

// ==========================================
// BACKLOG EMERGENCIAL — DETALHAMENTO
// ==========================================
/**
 * ARQUIVO: Slide_BacklogEmergencialDetalhe.gs
 * SLIDE — BACKLOG EMERGENCIAL — DETALHE (chamados emergenciais em aberto)
 * DESCRIÇÃO: Abre o detalhe dos chamados de prioridade Emergencial que
 * estavam em aberto no Mega ativo durante o MÊS DE REFERÊNCIA da
 * apresentação (o mês anterior — obterMesReferencia_), lidos da aba
 * "BD-CORRETIVAS" da planilha BASE DE DADOS — QUADRO REM (histórico bruto
 * desde 2021 — obterDadosBacklogEmergencialDetalhe_ em 02_Dados.gs),
 * filtrados por Centro de Custos = MEGA <EMPREENDIMENTO> e Prioridade =
 * Emergencial. Conta qualquer chamado emergencial, inclusive os de
 * responsabilidade do locatário (decisão do usuário — visão ampla de
 * emergências pendentes). Só entra o chamado que AINDA estava aberto no
 * fim do mês de referência — um chamado aberto e fechado dentro do mesmo
 * mês não é backlog daquele mês (comparação de datas, não do Estado atual
 * — ver comentário em 02_Dados.gs, _histAbertoNoMes_).
 *
 * Diferença em relação ao slide de Chamados por Prioridade/Clientes: aqui não
 * tem Abertos x Fechados (é só backlog aberto no mês) — o eixo é EQUIPE
 * responsável (FACILITIES, PROPERTY, OPERACAO, LOCATARIO ou OUTROS,
 * resolvida a partir da coluna Responsáveis — _resolverEquipeResponsaveis_),
 * resumido em cards KPI compactos
 * (criarCardKPI, 01_Config.gs) em vez de barra+legenda — só 2 categorias não
 * precisam de gráfico, e o espaço economizado vai pra lista de detalhe, que
 * é o que importa no slide. Lista em formato de TABELA (EQUIPE | DESCRIÇÃO |
 * DATA ABERTURA | TEMPO ABERTO), mesmo padrão de _backlogClientesTabela_ em
 * Slide_BacklogClientesDetalhes.gs — mês cheio nunca corta chamado nem
 * espreme a fonte até ilegível: vira mais de uma PÁGINA/slide em vez disso
 * (_paginarItensBacklogEmerg_).
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
  const marginX = 30, topY = 76, gap = 16;
  const areaBottom = H - 16;
  const kpiH = 72;
  const listaY = topY + kpiH + gap;
  const listaH = areaBottom - listaY;

  // Mês cheio: em vez de encolher a fonte até ficar ilegível, divide os
  // chamados em quantas PÁGINAS/slides forem necessárias pra caber com
  // fonte legível — mesma ideia de _paginarGruposBacklog_ em
  // Slide_BacklogClientesDetalhes.gs, mas mais simples aqui: cada chamado
  // já é a própria linha (não tem agrupamento por cliente pra preservar).
  const paginas = _paginarItensBacklogEmerg_(dados.lista, listaH);

  paginas.forEach((itensPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const ref = obterMesReferencia_();
    const subtitulo = 'Chamados emergenciais em aberto · Facilities x Property · Mês: ' + ref.siglaAno +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE', subtitulo);

    _backlogEmergKPIs_(slide, marginX, topY, W - 2 * marginX, kpiH, dados);
    // Tema geral do slide (borda do card, cabeçalho da tabela) em vermelho —
    // "Emergencial" já é vermelho em todo o resto do deck (ver
    // _PRIORIDADE_CORES_ em Slide_ChamadosPrioridade.gs). O azul/âmbar de
    // Facilities/Property fica só nas células por equipe (_equipeCor_,
    // usado nos KPIs de cima e na coluna EQUIPE da tabela) — não muda aqui.
    _backlogEmergTabela_(slide, marginX, listaY, W - 2 * marginX, listaH, 'LISTA DE CHAMADOS EM ABERTO', dados.total, itensPagina, CORES.cardRed);
  });

  Logger.log('Slide Backlog Emergencial — Detalhe gerado — total=' + dados.total + ' em ' + paginas.length + ' página(s).');
}

// Divide os chamados em páginas que cabem com fonte legível (piso
// FLOOR_FONT) — diferente de _paginarGruposBacklog_ (Backlog de Clientes),
// aqui não existe agrupamento por cliente pra preservar: cada chamado é
// sua própria linha, então a divisão é sempre "os primeiros N cabem
// nesta página" — sem risco de partir um grupo no meio.
function _paginarItensBacklogEmerg_(itens, listaH) {
  if (!itens.length) return [[]];

  const FLOOR_FONT = 7, LINE_PCT = 118, ROW_GAP = 4;
  const HEADER_H = 16, HEADER_GAP = 6;
  // Mesmas constantes de layout de _backlogEmergTabela_: criarCardPainel
  // devolve y+32 (título do card), listY = contentY+2, listH = h-listY-8.
  const CARD_HEADER = 32, LIST_TOP_PAD = 2, LIST_BOTTOM_PAD = 8;
  const pageBudgetPt = listaH - CARD_HEADER - LIST_TOP_PAD - LIST_BOTTOM_PAD - HEADER_H - HEADER_GAP;

  const lineHFloor = FLOOR_FONT * (LINE_PCT / 100) * 1.15;
  const porPagina = Math.max(1, Math.floor((pageBudgetPt + ROW_GAP) / (lineHFloor + ROW_GAP)));

  const paginas = [];
  for (let i = 0; i < itens.length; i += porPagina) paginas.push(itens.slice(i, i + porPagina));
  return paginas;
}

// Cor por equipe responsável — função (não const top-level) pra não depender
// da ordem de carga dos arquivos .gs (CORES é definido em 01_Config.gs; um
// const de topo aqui poderia rodar antes e estourar TDZ). FACILITIES e
// PROPERTY são as duas equipes de operação (a maioria dos chamados);
// qualquer outra (OPERACAO, LOCATARIO, OUTROS — só existem desde que a
// fonte virou BD-CORRETIVAS, que não exclui responsabilidade do locatário
// daqui) cai no cinza neutro.
function _equipeCor_(equipe) {
  const eq = String(equipe || '').toUpperCase();
  if (eq === 'PROPERTY')   return CORES.themeCorr;
  if (eq === 'FACILITIES') return CORES.lightBlue;
  return CORES.textGray;
}

// ── Cards KPI compactos: FACILITIES x PROPERTY, sempre exibidos (mesmo com
// zero chamados) + um 3º card "OUTRAS EQUIPES" só quando existir alguma
// qtd fora dessas duas (OPERACAO/LOCATARIO/OUTROS) — evita que o total do
// slide fique maior que a soma dos cards visíveis, que era o caso antes de
// a fonte virar BD-CORRETIVAS (só tinha FACILITIES/PROPERTY na aba antiga).
function _backlogEmergKPIs_(slide, x, y, w, h, dados) {
  const porEquipe = {};
  dados.fatias.forEach(f => { porEquipe[f.label] = f.qtd; });
  const total = dados.total;

  const outras = Object.keys(porEquipe)
    .filter(eq => eq !== 'FACILITIES' && eq !== 'PROPERTY')
    .reduce((s, eq) => s + porEquipe[eq], 0);

  const cards = [
    { label: 'FACILITIES', qtd: porEquipe.FACILITIES || 0 },
    { label: 'PROPERTY',   qtd: porEquipe.PROPERTY   || 0 }
  ];
  if (outras > 0) cards.push({ label: 'OUTRAS EQUIPES', qtd: outras });

  const gap = 16, cardW = (w - (cards.length - 1) * gap) / cards.length;
  cards.forEach((c, i) => {
    const pct = total > 0 ? (c.qtd / total * 100) : 0;
    criarCardKPI(slide, x + i * (cardW + gap), y, cardW, h, {
      label: c.label,
      valor: c.qtd,
      cor: _equipeCor_(c.label),
      tamValor: 26,
      sub: pct.toFixed(1).replace('.', ',') + '%'
    });
  });
}

// ── Card com a lista de chamados DE UMA PÁGINA, em formato de TABELA ─────
// Cabeçalho interno "EQUIPE | DESCRIÇÃO | DATA ABERTURA | TEMPO ABERTO" —
// mesmo padrão de _backlogClientesTabela_ (Slide_BacklogClientesDetalhes.gs),
// só que sem coluna de logo (aqui o agrupamento é por Equipe, não por
// Cliente, então cada chamado já É a própria linha, sem bloco pra
// centralizar). `itens` já vem pré-dividido em página por
// _paginarItensBacklogEmerg_; `totalCount` é o total do MÊS INTEIRO (todas
// as páginas), não só desta.
function _backlogEmergTabela_(slide, x, y, w, h, titulo, totalCount, itens, corTema) {
  const contentY = criarCardPainel(slide, x, y, w, h, titulo + ' (' + totalCount + ')', corTema);
  const listY = contentY + 2, listH = y + h - listY - 8;

  if (!itens.length) {
    _prioridadeSemDado_(slide, x, listY, w, listH, 'Nenhum chamado no período.', CORES.cardGreen);
    return;
  }

  const LINE_PCT = 118, ROW_GAP = 4;
  const HEADER_H = 16, HEADER_GAP = 6;
  const linhasY = listY + HEADER_H + HEADER_GAP;

  // Fonte FIXA em 7pt (não mais adaptativa entre 8 e 10) — padronizada com
  // _backlogClientesTabela_ (mesma família de tabela de backlog): antes o
  // tamanho mudava de página pra página conforme o volume de chamados,
  // deixando páginas do mesmo relatório com aparência inconsistente. Como
  // _paginarItensBacklogEmerg_ já garante que cada página cabe com essa
  // mesma fonte, não há risco de estourar o card.
  const fontSize = 7;
  const lineH = fontSize * (LINE_PCT / 100) * 1.15;

  // Quantas LINHAS de descrição cada chamado ganha nesta página (1 ou 2).
  // _paginarItensBacklogEmerg_ reserva 1 — o piso que garante o encaixe;
  // sobrando altura no card (o vazio no rodapé que o usuário apontou), cada
  // chamado passa a ter 2 linhas em vez de truncar a descrição no meio. A
  // FONTE segue fixa; só varia quanto texto cabe. Aqui não há agrupamento
  // por cliente, então cada item é seu próprio "grupo" de 1 linha.
  const linhasPorChamado = _linhasPorChamadoQueCabem_(
    [itens.map(it => [it])], listH - HEADER_H - HEADER_GAP, lineH, 0, 0, ROW_GAP);
  const alturaChamado = lineH * linhasPorChamado;

  const EQUIPE_W = 88, EQUIPE_GAP = 14;
  // Mesma folga de Slide_BacklogClientesDetalhes.gs — ver o comentário lá
  // pro porquê (uma data "dd/mm/aa" de 8 caracteres quebrava em 2 linhas
  // no teto de fonte).
  const DATA_W = 68, DIAS_W = 52, COL_GAP2 = 10, COL_GAP3 = 6;
  const descX = x + 15 + EQUIPE_W + EQUIPE_GAP;
  const descW = (w - 30) - EQUIPE_W - EQUIPE_GAP - DATA_W - COL_GAP2 - DIAS_W - COL_GAP3;
  const dataX = descX + descW + COL_GAP2;
  const diasX = dataX + DATA_W + COL_GAP3;

  const headerBg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, listY, w - 30, HEADER_H);
  headerBg.getFill().setSolidFill(corTema, 0.10);
  headerBg.getBorder().setTransparent();
  _sTxt(slide, x + 15, listY, EQUIPE_W, HEADER_H, 'EQUIPE', 7, true, corTema, 'center');
  _sTxt(slide, descX, listY, descW, HEADER_H, 'DESCRIÇÃO', 7, true, corTema, 'left');
  _sTxt(slide, dataX, listY, DATA_W, HEADER_H, 'DATA ABERTURA', 6, true, corTema, 'center');
  _sTxt(slide, diasX, listY, DIAS_W, HEADER_H, 'TEMPO ABERTO', 6, true, corTema, 'center');
  _linhaTabela_(slide, x + 15, listY + HEADER_H, w - 30, corTema, 1);
  [descX - EQUIPE_GAP / 2, dataX - COL_GAP3 / 2].forEach(lx => {
    const l = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, HEADER_H);
    l.getFill().setSolidFill(_TABELA_LINHA_COR_); l.getBorder().setTransparent();
  });

  const capacidadeLinha = _charsQueCabem_(descW, fontSize) * linhasPorChamado;
  let cursorY = linhasY;
  itens.forEach(it => {
    const cor = _equipeCor_(it.equipe);
    _sTxt(slide, x + 15, cursorY, EQUIPE_W, alturaChamado, (it.equipe || '—').toUpperCase(), Math.min(fontSize, 9), true, cor, 'center');

    const descBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, descX, cursorY, descW, alturaChamado);
    const tr = descBox.getText();
    tr.setText('');
    // ID em cinza neutro — nunca na cor do tema/equipe, senão em chamados
    // PROPERTY (mesma cor âmbar do tema deste slide) ID e equipe ficam
    // indistinguíveis visualmente.
    const idPart = tr.appendText('• ' + it.id + ' - ');
    idPart.getTextStyle().setFontSize(fontSize).setBold(true).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
    // Piso baixo (4, não 12) — ver comentário equivalente em
    // Slide_ChamadosClientes.gs.
    const maxDesc = Math.max(4, capacidadeLinha - 3 - it.id.length - 3);
    const descPart = tr.appendText(_truncarNome_(it.descricao, maxDesc));
    descPart.getTextStyle().setFontSize(fontSize).setBold(false).setForegroundColor(CORES.textDark).setFontFamily('Montserrat');
    tr.getParagraphStyle().setLineSpacing(LINE_PCT);
    descBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // EQUIPE/DATA/DIAS na MESMA altura da caixa de descrição — todas são
    // centralizadas verticalmente, então com 2 linhas de descrição elas
    // ficam no meio dela, alinhadas por construção.
    _sTxt(slide, dataX, cursorY, DATA_W, alturaChamado, it.dataReporte || '—', Math.max(6, fontSize - 0.5), false, CORES.textGray, 'center');
    const diasTxt = (it.diasAberto === null || it.diasAberto === undefined) ? '—' : it.diasAberto + 'd';
    _sTxt(slide, diasX, cursorY, DIAS_W, alturaChamado, diasTxt, fontSize, true, cor, 'center');

    cursorY += alturaChamado + ROW_GAP;
    _linhaTabela_(slide, x + 15, cursorY - ROW_GAP / 2, w - 30, _TABELA_LINHA_COR_, 0.75);
  });

  // Linhas verticais separando equipe | descrição | data | dias,
  // atravessando cabeçalho + todas as linhas.
  const alturaTabela = cursorY - ROW_GAP - listY;
  [x + 15 + EQUIPE_W + EQUIPE_GAP / 2, descX - COL_GAP2 / 2, dataX - COL_GAP3 / 2].forEach(lx => {
    const divisor = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, alturaTabela);
    divisor.getFill().setSolidFill(_TABELA_LINHA_COR_);
    divisor.getBorder().setTransparent();
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Chamados de prioridade Emergencial que estavam em aberto durante o mês de
// referência (mês anterior) no empreendimento ativo, com o detalhe por
// Equipe responsável, busca automática na aba "BD-CORRETIVAS" da planilha
// BASE DE DADOS — QUADRO REM. Sem chamado emergencial no período, cai no
// slide manual de espaço reservado.
function gerarSoBacklogEmergencialDetalheCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogEmergencialDetalhe(); }
function gerarSoBacklogEmergencialDetalheEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogEmergencialDetalhe(); }

// ==========================================
// BACKLOG FACILITIES
// ==========================================
/**
 * ARQUIVO: Slide_BacklogFacilities.gs
 * SLIDE — BACKLOG FACILITIES (evolução mensal de chamados)
 * DESCRIÇÃO: Substitui o espaço reservado ("cole o gráfico aqui") pelo
 * gráfico automático de Chamados Geral, Facilities, Property e Responsabilidade
 * Locatário, lido da aba "BACKLOG" da planilha de HISTÓRICO VALIDADO
 * (obterDadosBacklogHistorico_ em 02_Dados.gs) — Facilities/Geral batem com
 * as linhas "Chamados de facilities"/"Chamados geral" da aba DADOS de cada
 * Mega; Property e Responsabilidade Locatário só existem na aba BACKLOG.
 *
 * Diferente dos gráficos de Utilities/Monitoramento (grade fixa de 12 meses
 * do ano, uma linha por ano), aqui é uma linha do tempo contínua — os
 * últimos 12 meses disponíveis, em ordem cronológica, sem repetir a grade
 * a cada ano.
 *
 * Gráfico COMBINADO (pedido do gestor): o Geral — o total, que contém as
 * outras séries — é desenhado como COLUNA, e as três séries que o compõem
 * (Facilities, Property e Responsabilidade Locatário) como LINHAS por cima
 * dela. A coluna entrega o volume do mês batendo o olho; as linhas mostram
 * como esse volume se divide, sem competir visualmente com o total.
 *
 * Todo mês tem rótulo de valor em todas as séries (o mês mais recente em
 * destaque, maior e em negrito); se duas séries ficarem próximas demais na
 * vertical num mesmo mês, uma afasta a outra.
 *
 * Sem a aba BACKLOG preenchida (ou sem linha para a cidade ativa): cai no
 * slide manual de espaço reservado (gerarSlideReservaGraficos), sem quebrar
 * a geração.
 */

// Preenchimento das colunas do Geral: tom claro da família do azul
// institucional (#151E49). A barra é o pano de fundo do gráfico — as três
// linhas passam por dentro dela —, então precisa ser leve o bastante pra
// não competir com elas nem pesar o slide ("esse azul ficou muito forte").
//
// O tom é claro também por contraste: a linha de Property é âmbar
// (#F59E0B), de luminância média, e num azul só um pouco mais claro que o
// navy ela sumia dentro da coluna. Neste tom as três linhas se destacam do
// preenchimento (ver o teste de contraste em test-backlog-facilities-grafico.js).
const BACKLOG_COR_COLUNA = '#C6CFE6';

function gerarSlideBacklogFacilities() {
  // O recálculo da BD-CORRETIVAS acontece dentro de
  // obterDadosBacklogHistorico_ (02_Dados.gs), pra que TODOS os consumidores
  // da aba BACKLOG recebam os mesmos números — este slide, o Dashboard, o
  // Chamados Pendentes e os checks. Fazer aqui corrigiria só este slide e o
  // deck mostraria dois valores diferentes pro mesmo mês.
  const historico = obterDadosBacklogHistorico_() || [];
  if (!historico.length) {
    Logger.log('Backlog Facilities: sem chamados encontrados na BD-CORRETIVAS.');
  }

  const ref = obterMesReferencia_();
  const ordRef = ref.ord || (ref.ano * 100 + (ref.index + 1));
  const historicoAteRef = historico.filter(m => m.ord <= ordRef);
  const meses = (historicoAteRef.length ? historicoAteRef : historico).slice(-12);
  const n = meses.length;
  const atual    = meses[n - 1];
  const anterior = n >= 2 ? meses[n - 2] : null;

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG FACILITIES',
    'Evolução mensal de chamados · Mês de referência: ' + ref.siglaAno);

  const marginX = 28, topY = 74, cardH = 72, cardGap = 10;
  _backlogCardsKPI_(slide, marginX, topY, W - marginX * 2, cardH, atual, anterior);

  const chartY = topY + cardH + cardGap;
  const chartH = H - chartY - 16;
  _backlogGrafico_(slide, marginX, chartY, W - marginX * 2, chartH, meses);

  Logger.log('Slide Backlog Facilities gerado — ' + n + ' mês(es), atual=' + atual.rotulo +
             ' (geral=' + atual.geral + ', facilities=' + atual.facilities +
             ', property=' + atual.property + ', locatario=' + atual.locatario + ').');
}

// ── Cards de KPI — chamados do mês, com delta vs mês anterior ─────────────
function _backlogCardsKPI_(slide, x, y, w, h, atual, anterior) {
  const gap   = 8;
  const cardW = (w - gap * 3) / 4;

  const cards = [
    { label: 'CHAMADOS GERAL',      val: atual.geral,      ant: anterior ? anterior.geral      : null, fmt: formatarNumeroBR, cor: CORES.darkBlue,   notaTxt: 'vs mês anterior' },
    { label: 'CHAMADOS FACILITIES', val: atual.facilities, ant: anterior ? anterior.facilities : null, fmt: formatarNumeroBR, cor: CORES.lightBlue,  notaTxt: 'vs mês anterior' },
    { label: 'CHAMADOS PROPERTY',   val: atual.property,   ant: anterior ? anterior.property   : null, fmt: formatarNumeroBR, cor: CORES.themeCorr,  notaTxt: 'vs mês anterior' },
    { label: 'RESPONSABILIDADE LOCATÁRIO', val: atual.locatario, ant: anterior ? anterior.locatario : null, fmt: formatarNumeroBR, cor: CORES.cardGreen, notaTxt: 'vs mês anterior' }
  ];

  cards.forEach((c, i) => {
    const cx = x + i * (cardW + gap);
    _utilCard_(slide, cx, y, cardW, h, c, c.cor);
  });
}

// Desenha uma série como COLUNAS (uma barra por mês, centralizada no slot) e
// devolve os mesmos pontos {x, y, val} que _utilDesenharLinha_ devolve — o x
// no centro da barra e o y no topo dela —, pra que o rotulador de valores e
// o desempate vertical funcionem igual pras duas formas, sem código
// duplicado.
//
// A barra é larga o bastante pra dar peso visual ao total, mas não tanto que
// encoste na do mês seguinte (as linhas passam por dentro dela).
function _backlogDesenharColuna_(slide, plotX, plotY, plotH, slotW, valoresPorMes, cor, escMax) {
  const barW = Math.min(slotW * 0.52, 34);
  return valoresPorMes.map((val, mes) => {
    const cx = plotX + mes * slotW + slotW / 2;
    if (val == null) return null;
    const alturaBarra = escMax > 0 ? (val / escMax) * plotH : 0;
    const topo = plotY + plotH - alturaBarra;
    if (alturaBarra > 0) {
      const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx - barW / 2, topo, barW, alturaBarra);
      barra.getFill().setSolidFill(cor);
      barra.getBorder().setTransparent();
    }
    return { x: cx, y: topo, val: val };
  });
}

// ── Gráfico combinado — Geral em COLUNA; Facilities, Property e
// Responsabilidade Locatário em LINHA, cronológico ──
function _backlogGrafico_(slide, x, y, w, h, meses) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  bg.getBorder().setWeight(1);

  const n = meses.length;
  const mL = 56, mR = 14, mT = 34, mB = 32;
  const plotW = w - mL - mR;
  const plotH = h - mT - mB;
  const plotX = x + mL;
  const plotY = y + mT;
  const slotW = plotW / n;

  // Gráfico COMBINADO, a pedido do gestor: o Geral (o total, que contém as
  // outras séries) vira COLUNA e as três séries que o compõem — Facilities,
  // Property e Responsabilidade Locatário — seguem em LINHA por cima. A
  // coluna dá o volume do mês batendo o olho; as linhas mostram como esse
  // volume se divide, sem competir visualmente com o total.
  // `cor` é a cor do TRAÇO/rótulo da série; `corBarra` (só na série em
  // coluna) é o preenchimento da barra. Os dois são separados de propósito:
  // preencher a barra inteira com o azul institucional (#151E49) pesava
  // demais no slide e engolia as linhas que passam por dentro dela — a
  // barra usa um tom BEM mais claro da mesma família, e o rótulo de valor
  // continua no navy escuro pra seguir legível sobre o fundo branco.
  const SERIES = [
    { chave: 'geral',      rotulo: 'Geral',      cor: CORES.darkBlue,   corBarra: BACKLOG_COR_COLUNA, modo: 'coluna', destaque: true  },
    { chave: 'facilities', rotulo: 'Facilities', cor: CORES.lightBlue,  modo: 'linha',  destaque: false },
    { chave: 'property',   rotulo: 'Property',   cor: CORES.themeCorr,  modo: 'linha',  destaque: false },
    { chave: 'locatario',  rotulo: 'Responsabilidade Locatário', cor: CORES.cardGreen, modo: 'linha', destaque: false }
  ];

  // Realce do mês de referência (o mais recente) — mesma ideia da faixa
  // suave usada nos gráficos de Utilities/Monitoramento.
  const hl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + (n - 1) * slotW, plotY, slotW, plotH);
  hl.getFill().setSolidFill(CORES.darkBlue, 0.06);
  hl.getBorder().setTransparent();

  const todosValores = meses.flatMap(m => SERIES.map(s => m[s.chave])).filter(v => v != null);
  const vMax   = todosValores.length ? Math.max(...todosValores) : 0;
  const escMax = _utilEscalaTeto_(vMax);

  // Grade + rótulos do eixo Y
  const nGrid = 4;
  for (let gi = 0; gi <= nGrid; gi++) {
    const gy   = plotY + plotH - (gi / nGrid) * plotH;
    const gVal = (gi / nGrid) * escMax;
    const gl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, gi === 0 ? 1 : 0.5);
    gl.getFill().setSolidFill(gi === 0 ? '#94A3B8' : '#E2E8F0'); gl.getBorder().setTransparent();
    _sTxt(slide, x, gy - 7, mL - 6, 14, formatarNumeroBR(Math.round(gVal)), 7, false, CORES.textGray, 'right');
  }

  // As COLUNAS vêm primeiro (ficam ao fundo) e as LINHAS por cima, senão a
  // barra do Geral cobriria as três linhas que passam dentro dela.
  const desenhadas = SERIES.map(s => ({
    serie: s,
    pontos: s.modo === 'coluna'
      ? _backlogDesenharColuna_(slide, plotX, plotY, plotH, slotW, meses.map(m => m[s.chave]), s.corBarra || s.cor, escMax)
      : null
  }));
  desenhadas.forEach(d => {
    if (d.serie.modo === 'coluna') return;
    d.pontos = _utilDesenharLinha_(slide, plotX, plotY, plotH, slotW,
      meses.map(m => m[d.serie.chave]), d.serie.cor, escMax, d.serie.destaque);
  });

  // Rótulo de valor em TODO mês de cada série (até 4 por coluna). Se duas
  // séries ficarem próximas demais na vertical no mesmo mês, afasta uma da
  // outra. O mês mais recente ganha corpo maior e negrito, igual ao rótulo
  // do eixo X — os demais ficam menores pra não pesar o gráfico.
  for (let i = 0; i < n; i++) {
    const destaque = i === n - 1;
    const coluna = desenhadas
      .map(d => { const p = d.pontos[i]; return p ? { x: p.x, y: p.y, val: p.val, cor: d.serie.cor } : null; })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y);
    const gapMin = destaque ? 11 : 9;
    for (let k = 1; k < coluna.length; k++) {
      if (coluna[k].y - coluna[k - 1].y < gapMin) coluna[k].y = coluna[k - 1].y + gapMin;
    }
    const lw = destaque ? 30 : 24, folga = destaque ? 10 : 6;
    coluna.forEach(r => {
      _sTxt(slide, r.x - lw / 2 - folga, r.y - (destaque ? 18 : 16), lw + folga * 2, 11,
        formatarNumeroBR(r.val), destaque ? 6.5 : 5.5, destaque, r.cor, 'center');
    });
  }

  // Rótulos do eixo X — cronológicos (ex.: "JUL/25"), não meses do ano.
  meses.forEach((m, i) => {
    const slotX = plotX + i * slotW;
    const destaque = i === n - 1;
    _sTxt(slide, slotX, plotY + plotH + 4, slotW, 12, m.rotulo, destaque ? 7.5 : 6.5,
      destaque, destaque ? CORES.darkBlue : CORES.textDark, 'center');
  });

  // Legenda — Geral, Facilities, Property, Responsabilidade Locatário (esquerda pra direita),
  // alinhada à direita no topo do painel.
  const legY = y + 10;
  let legX = x + w - 14;
  // Ícone condiz com a forma da série (quadrado = coluna, traço com bolinha
  // = linha), pra legenda não sugerir que tudo é do mesmo tipo.
  SERIES.slice().reverse().forEach(s => {
    const lw = 12 + s.rotulo.length * 5.5 + 16;
    legX -= lw;
    _utilLegendaIcone_(slide, legX, legY, 10, 8, s.corBarra || s.cor, s.modo === 'coluna' ? 'barra' : 'linha');
    _sTxt(slide, legX + 13, legY - 1, lw - 13, 11, s.rotulo, 7.5, false, CORES.textDark, 'left');
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
/**
 * Abre diálogo interativo para escolher qual empreendimento gerar o slide de Backlog Facilities.
 */
function escolherEmpreendimentoEGerarBacklogFacilities() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  if (!ui) {
    try { ui = SlidesApp.getUi(); } catch (e) {}
  }

  if (ui) {
    const resposta = ui.prompt(
      '📊 Gerar Slide — Backlog Facilities',
      'Escolha o empreendimento que deseja gerar:\n\n' +
      '1 - Mega Curitiba\n' +
      '2 - Mega Itajaí\n' +
      '3 - Mega Esteio\n' +
      '4 - Todos os Megas\n\n' +
      'Digite o número (1, 2, 3 ou 4):',
      ui.ButtonSet.OK_CANCEL
    );

    if (resposta.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Operação cancelada.');
      return;
    }

    const escolha = resposta.getResponseText().trim();
    if (escolha === '1') {
      gerarSoBacklogFacilitiesCuritiba();
      ui.alert('✓ Slide de Backlog Facilities (Mega Curitiba) gerado com sucesso!');
    } else if (escolha === '2') {
      gerarSoBacklogFacilitiesItajai();
      ui.alert('✓ Slide de Backlog Facilities (Mega Itajaí) gerado com sucesso!');
    } else if (escolha === '3') {
      gerarSoBacklogFacilitiesEsteio();
      ui.alert('✓ Slide de Backlog Facilities (Mega Esteio) gerado com sucesso!');
    } else if (escolha === '4') {
      gerarSoBacklogFacilitiesTodosOsMegas();
      ui.alert('✓ Slides de Backlog Facilities de todos os Megas gerados com sucesso!');
    } else {
      ui.alert('Opção inválida: "' + escolha + '". Digite 1, 2, 3 ou 4.');
    }
  } else {
    Logger.log('Escolha uma das funções: gerarSoBacklogFacilitiesCuritiba(), gerarSoBacklogFacilitiesItajai(), gerarSoBacklogFacilitiesEsteio() ou gerarSoBacklogFacilitiesTodosOsMegas().');
    gerarSoBacklogFacilitiesCuritiba();
  }
}

function gerarSoBacklogFacilitiesCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideBacklogFacilities(); }
function gerarSoBacklogFacilitiesItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideBacklogFacilities(); }
function gerarSoBacklogFacilitiesEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideBacklogFacilities(); }

function gerarSoBacklogFacilitiesTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(cidade => {
    setProjetoAtivo(cidade);
    gerarSlideBacklogFacilities();
  });
}
