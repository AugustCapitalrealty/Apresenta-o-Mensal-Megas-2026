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

  // Gráfico BACKLOG DE CHAMADOS EMERGÊNCIAS — os valores mês a mês vêm
  // RECALCULADOS a partir da aba "BACKLOG - EMERGENCIAL - DETALHE" (mesma
  // fonte crua e mesma regra — _histAbertoNoMes_ — do slide Backlog
  // Emergencial — Detalhe), em vez da coluna EMERGENCIAL da aba BACKLOG que
  // era digitada à mão mês a mês. Onde a aba de detalhe cobre o mês, o
  // recalculado PREVALECE (loga quando diverge do que estava digitado); nos
  // meses fora do alcance dela (nenhum chamado encontrado ali) mantém o
  // valor manual, sem perder histórico antigo.
  const chartY = topY + cardH + 20;
  const chartW = PageWidth - (2 * marginX);
  const footerH = PageHeight - chartY - 20;

  const historicoBacklog = obterDadosBacklogHistorico_();
  const recalculado = obterDadosBacklogEmergencialHistoricoPorMes_(historicoBacklog);
  historicoBacklog.forEach(m => {
    if (!recalculado.has(m.ord)) return;   // aba de detalhe não cobre esse mês — mantém o valor manual
    const calc = recalculado.get(m.ord);
    if (m.emergencial != null && m.emergencial !== calc) {
      Logger.log('Backlog Emergencial (' + m.mes + '): aba BACKLOG tinha ' + m.emergencial +
                 ' digitado à mão, recalculado da aba de detalhe deu ' + calc + '. Usando o recalculado.');
    }
    m.emergencial = calc;
  });
  const temEmergencial = historicoBacklog.some(m => m.emergencial != null);

  if (temEmergencial) {
    _corretivasGraficoEmergencial_(slide, marginX, chartY, chartW, footerH, historicoBacklog.slice(-13));
  } else {
    const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, chartY, chartW, footerH);
    ph.getFill().setSolidFill(CORES.white);
    ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill('#CBD5E1');

    const chartTitle = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 15, chartY + 10, chartW - 30, 25);
    chartTitle.getText().setText("BACKLOG DE CHAMADOS EMERGÊNCIAS")
      .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.lightBlue).setFontFamily('Montserrat');

    const phTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, chartY + (footerH/2), chartW, 30);
    phTxt.getText().setText("[ ESPAÇO RESERVADO PARA COLAR O GRÁFICO — preencha a coluna EMERGENCIAL da aba BACKLOG ]")
      .getTextStyle().setFontSize(10).setBold(true).setForegroundColor('#CBD5E1').setFontFamily('Montserrat');
    phTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  Logger.log("Slide 03 (Corretivas) gerado com sucesso.");
}

// ── Gráfico de barras — chamados emergenciais, cronológico (últimos meses
// disponíveis na aba BACKLOG, mais recente por último) ─────────────────────
function _corretivasGraficoEmergencial_(slide, x, y, w, h, meses) {
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().getLineFill().setSolidFill('#CBD5E1');
  bg.getBorder().setWeight(1);

  const chartTitle = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, y + 10, w - 30, 25);
  chartTitle.getText().setText("BACKLOG DE CHAMADOS EMERGÊNCIAS")
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(CORES.lightBlue).setFontFamily('Montserrat');

  const MESES_MIN = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const n = meses.length;
  const mL = 14, mR = 14, mT = 42, mB = 26;
  const plotW = w - mL - mR;
  const plotH = h - mT - mB;
  const plotX = x + mL;
  const plotY = y + mT;
  const slotW = plotW / n;
  const barW  = Math.min(slotW * 0.5, 40);

  const valores = meses.map(m => m.emergencial).filter(v => v != null);
  const vMax    = valores.length ? Math.max(...valores) : 0;
  const escMax  = _utilEscalaTeto_(vMax);

  meses.forEach((m, i) => {
    const v = m.emergencial;
    const slotX = plotX + i * slotW;
    const cx = slotX + (slotW - barW) / 2;

    if (v != null) {
      const bh = (v > 0 && escMax > 0) ? Math.max((v / escMax) * plotH, 3) : 0;
      if (bh > 0) {
        const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, plotY + plotH - bh, barW, bh);
        bar.getFill().setSolidFill(CORES.lightBlue);
        bar.getBorder().setTransparent();
      }
      _corretivasSTxt_(slide, slotX, plotY + plotH - bh - 18, slotW, 13,
        formatarNumeroBR(v), 8.5, true, CORES.textDark, 'center');
    }

    const mesNum = parseInt(m.mes.slice(0, 2), 10);
    const rotuloEixo = (MESES_MIN[mesNum - 1] || '') + '.' + m.mes.slice(-4);
    _corretivasSTxt_(slide, slotX, plotY + plotH + 6, slotW, 12, rotuloEixo, 6.5, false, CORES.textGray, 'center');
  });
}

function _corretivasSTxt_(slide, x, y, w, h, txt, size, bold, cor, align) {
  const t = String(txt == null ? '' : txt).trim();
  if (!t) return null;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  const tr = box.getText();
  tr.setText(t);
  tr.getTextStyle().setFontSize(size || 8).setBold(!!bold)
    .setForegroundColor(cor || '#1E293B').setFontFamily('Montserrat');
  const alignMap = {
    center: SlidesApp.ParagraphAlignment.CENTER,
    right:  SlidesApp.ParagraphAlignment.END,
    left:   SlidesApp.ParagraphAlignment.START
  };
  if (align && alignMap[align]) {
    tr.getParagraphStyle().setParagraphAlignment(alignMap[align]);
  }
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  return box;
}

// Função Auxiliar Local
function desenharCardListaKPIs(slide, x, y, w, h, CORES, dados, corTema) {
  // Painel padrão do design system (01_Config.gs)
  const startContentY = criarCardPainel(slide, x, y, w, h, dados.titulo, corTema);
  const DS = CR_DESIGN_SYSTEM;

  const usableH = h - (startContentY - y) - 8;
  const rowH = usableH / 4;

  (dados.kpis || []).forEach((kpi, i) => {
    const ry = startContentY + (i * rowH);

    const lbl = String(kpi.l || 'Indicador').trim();
    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, ry, w * 0.50, rowH);
    const lt = lblBox.getText();
    lt.setText(lbl);
    lt.getTextStyle().setFontSize(7.5).setBold(true).setForegroundColor(CORES.textDark).setFontFamily(DS.typography.body);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Valor + tendência vs mês anterior (histórico validado)
    let valStr = String(kpi.v == null ? '' : kpi.v).trim();
    if (!valStr || valStr === 'undefined' || valStr === 'null' || valStr === '-') valStr = '—';

    const trend = tendenciaTexto_(kpi.delta, kpi.menor);
    const temTrend = trend && trend.txt;
    const txt = temTrend ? valStr + '   ' + trend.txt : valStr;

    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w * 0.52, ry, w * 0.43, rowH);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const vr = valBox.getText();
    vr.setText(txt);
    vr.getTextStyle().setFontSize(10).setBold(true).setForegroundColor(corTema).setFontFamily(DS.typography.titles);

    if (temTrend && txt.length > valStr.length) {
      vr.getRange(valStr.length, txt.length).getTextStyle().setFontSize(9.5).setBold(true).setForegroundColor(trend.cor);
    }
    vr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });
}


// ==========================================
// PONTOS DE ENTRADA AVULSOS (POR EMPREENDIMENTO)
// ==========================================
// Permite gerar apenas o slide de Indicadores de Corretivas no deck do
// empreendimento selecionado diretamente pelo menu de funções do editor:
function gerarSoCorretivasCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideCorretivas(); }
function gerarSoCorretivasItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCorretivas(); }
function gerarSoCorretivasEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCorretivas(); }

function gerarSoCorretivasTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(cidade => {
    setProjetoAtivo(cidade);
    gerarSlideCorretivas();
  });
}

