// ==========================================
// ARQUIVO: Slide04_AcessoSeguranca.gs
// SLIDE 04 — INDICADORES DE ACESSO E SEGURANÇA
// Dados: obterDadosTempo() em 02_Dados.gs
// ==========================================

function gerarSlideTempo() {
  if (!_projetoAtivoChave) {
    Logger.log('Aviso: Nenhum projeto ativo especificado. Assumindo CURITIBA como padrão.');
    setProjetoAtivo('CURITIBA');
  }
  const dados = obterDadosTempo();
  
  if (!dados) {
    Logger.log("Sem dados para o Slide 04 (Acesso/Segurança).");
    return;
  }

  const deck = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const PageWidth = deck.getPageWidth();
  const PageHeight = deck.getPageHeight();
  const ref = obterMesReferencia_();
  criarHeaderPadrao(slide, 'INDICADORES DE ACESSO E SEGURANÇA', getProjetoAtivo().nome + ' — Fluxo, Segurança e Turnover · Mês: ' + ref.siglaAno);

  const marginX = 40;
  const topY = 80;
  const gap = 30;

  const cardW = (PageWidth - (2 * marginX) - gap) / 2;
  const cardH = 120;

  // Série de acessos — alimenta o gráfico E o comparativo do card.
  // Fonte autoritativa: planilha de Controle de Acessos (Fluxo Total);
  // se indisponível, cai no histórico validado (Fluxo de VISITANTES).
  let serieAcessos = obterSerieFluxoAcessos_(24);
  let fonte = 'Controle de Acessos';
  if (!serieAcessos || serieAcessos.length < 2) {
    serieAcessos = lerHistoricoValidado('Fluxo de VISITANTES', { aba: 'DADOS' });
    fonte = 'Histórico validado';
  }
  serieAcessos = _acessoAncorarNoMes_(serieAcessos, 13);

  // Comparativo vs mês anterior vai no CARD (Fluxo de pessoas mensal), não no gráfico
  const nS = serieAcessos.length;
  if (nS >= 2 && serieAcessos[nS - 1].valor != null && serieAcessos[nS - 2].valor != null &&
      dados.mensal && dados.mensal.kpis) {
    const dFlux = serieAcessos[nS - 1].valor - serieAcessos[nS - 2].valor;
    const kFlux = dados.mensal.kpis.find(k => /fluxo/i.test(k.l));
    if (kFlux) kFlux.delta = dFlux;   // fluxo subindo = mais atividade (verde)
  }

  // Desenha os cards com dados (Mensal = Azul, Anual = Verde)
  desenharCardTempo(slide, marginX, topY, cardW, cardH, CORES, dados.mensal, CORES.lightBlue);
  desenharCardTempo(slide, marginX + cardW + gap, topY, cardW, cardH, CORES, dados.anual, CORES.cardGreen);

  // Gráfico de Evolução dos Acessos (sem o delta — ele agora vai no card)
  const chartY = topY + cardH + 15;
  const chartW = PageWidth - (2 * marginX);
  const chartH = PageHeight - chartY - 10;

  desenharGraficoHistorico(slide, marginX, chartY, chartW, chartH, serieAcessos, {
    titulo          : 'EVOLUÇÃO DOS ACESSOS — FLUXO DE PESSOAS',
    cor             : CORES.lightBlue,
    formatar        : v => formatarNumeroBR(Math.round(v)),
    deltaMesAnterior: false
  });

  Logger.log('Slide 04 (Acesso/Segurança) — série de acessos: ' +
             serieAcessos.length + ' mes(es), fonte: ' + fonte + '.');
}

// O gráfico termina no MÊS DA APRESENTAÇÃO, não no último mês da planilha.
// No deck de SET/26 a aba Dados do Controle de Acessos ia só até 08/2026 e o
// gráfico simplesmente acabava em agosto, sem sinal de que faltava setembro.
// Agora o mês sem linha entra com valor 0 (decisão do Guilherme, 15/10/2026:
// o mês aparece sempre, mesmo zerado, em vez de "sem dado").
function _acessoAncorarNoMes_(serie, n) {
  const ordRef = _acessoOrdRef_();
  let s = (serie || []).filter(p => p.ord <= ordRef);
  if (ordRef !== Infinity && (!s.length || s[s.length - 1].ord !== ordRef)) {
    s = s.concat([{ mes: _acessoLabelOrd_(ordRef), ord: ordRef, valor: 0 }]);
  }
  return s.slice(-n);
}

// Função Auxiliar Local (CORRIGIDA PARA EVITAR ERRO DE TEXTO)
function desenharCardTempo(slide, x, y, w, h, CORES, dados, corTema) {
  // Painel padrão do design system (01_Config.gs)
  // FIX: Garante que o título não seja nulo
  const tituloTexto = dados.titulo ? String(dados.titulo) : "VISÃO GERAL";
  const startContentY = criarCardPainel(slide, x, y, w, h, tituloTexto, corTema);
  const DS = CR_DESIGN_SYSTEM;

  const usableH = h - (startContentY - y) - 8;

  // Proteção: se kpis não existir, cria array vazio
  const listaKPIs = dados.kpis || [];
  const rowH = usableH / (listaKPIs.length || 1);

  listaKPIs.forEach((kpi, i) => {
    const ry = startContentY + (i * rowH);

    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, ry, w * 0.48, rowH);
    // FIX: Converte label para String e garante valor
    let labelTexto = kpi.l ? String(kpi.l) : "-";
    lblBox.getText().setText(labelTexto)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textDark).setFontFamily(DS.typography.body);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Coluna de valor larga para caber valor + comparativo vs mês anterior
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w * 0.50, ry, w * 0.44, rowH);
    let valorTexto = (kpi.v !== undefined && kpi.v !== null && kpi.v !== "") ? String(kpi.v) : "—";
    const valBase = formatarNumeroBR(valorTexto);
    let vtxt = valBase;
    const temDelta = kpi.delta != null && !isNaN(kpi.delta) && kpi.delta !== 0;
    if (temDelta) {
      const seta = kpi.delta > 0 ? '▲' : '▼';
      vtxt += '   ' + seta + ' ' + (kpi.delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(kpi.delta));
    }
    const vr = valBox.getText();
    vr.setText(vtxt).getTextStyle()
      .setFontSize(9.5).setBold(true).setForegroundColor(corTema).setFontFamily(DS.typography.titles);
    if (temDelta) {
      const corDelta = kpi.delta > 0 ? CORES.cardGreen : CORES.cardRed;  // fluxo subindo = verde
      vr.getRange(valBase.length, vtxt.length).getTextStyle()
        .setFontSize(9).setBold(true).setForegroundColor(corDelta);
    }
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    vr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Gera o slide de Acesso e Segurança no empreendimento ativo
function gerarSoAcessoSeguranca(cidade) {
  if (cidade) setProjetoAtivo(cidade);
  else if (!_projetoAtivoChave) setProjetoAtivo('CURITIBA');
  gerarSlideTempo();
}

function gerarSoAcessoSegurancaCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideTempo(); }
function gerarSoAcessoSegurancaItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideTempo(); }
function gerarSoAcessoSegurancaEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideTempo(); }

// Aliases curtos
function gerarSoTempoCuritiba() { gerarSoAcessoSegurancaCuritiba(); }
function gerarSoTempoItajai()   { gerarSoAcessoSegurancaItajai(); }
function gerarSoTempoEsteio()   { gerarSoAcessoSegurancaEsteio(); }
function gerarSoTempo(cidade)   { gerarSoAcessoSeguranca(cidade); }

// Gera em todas as apresentações dos Megas de uma vez
function gerarSoAcessoSegurancaTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => {
    setProjetoAtivo(c);
    gerarSlideTempo();
  });
}
function gerarSoTempoTodosOsMegas() { gerarSoAcessoSegurancaTodosOsMegas(); }