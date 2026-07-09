// ==========================================
// ARQUIVO: Slide04_AcessoSeguranca.gs
// SLIDE 04 — INDICADORES DE ACESSO E SEGURANÇA
// Dados: obterDadosTempo() em 02_Dados.gs
// ==========================================

function gerarSlideTempo() {
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
  const anoAtual = new Date().getFullYear();

  // 1. Cabeçalho
  criarHeaderPadrao(slide, 'INDICADORES DE ACESSO E SEGURANÇA', `Fluxo, Segurança e Turnover - ${anoAtual}`);

  const marginX = 40;
  const topY = 80;
  const gap = 30;

  const cardW = (PageWidth - (2 * marginX) - gap) / 2;
  const cardH = 120; 

  // Desenha os cards com dados (Mensal = Azul, Anual = Verde)
  desenharCardTempo(slide, marginX, topY, cardW, cardH, CORES, dados.mensal, CORES.lightBlue);
  desenharCardTempo(slide, marginX + cardW + gap, topY, cardW, cardH, CORES, dados.anual, CORES.cardGreen);

  // Gráfico de Evolução dos Acessos — alimentado pelo histórico validado
  // (indicador "Fluxo de VISITANTES" na aba DADOS). Ver Slide_GraficosHistorico.gs.
  const chartY = topY + cardH + 15;
  const chartW = PageWidth - (2 * marginX);
  const chartH = PageHeight - chartY - 10;

  // Fonte autoritativa: planilha dedicada de Controle de Acessos (Fluxo Total).
  // Se estiver indisponível, cai no histórico validado (Fluxo de VISITANTES).
  let serieAcessos = obterSerieFluxoAcessos_(13);
  let fonte = 'Controle de Acessos';
  if (!serieAcessos || serieAcessos.length < 2) {
    serieAcessos = lerHistoricoValidado('Fluxo de VISITANTES', { aba: 'DADOS' });
    fonte = 'Histórico validado';
  }

  desenharGraficoHistorico(slide, marginX, chartY, chartW, chartH, serieAcessos, {
    titulo   : 'EVOLUÇÃO DOS ACESSOS — FLUXO DE PESSOAS',
    cor      : CORES.lightBlue,
    formatar : v => formatarNumeroBR(Math.round(v))
  });

  Logger.log('Slide 04 (Acesso/Segurança) — série de acessos: ' +
             serieAcessos.length + ' mes(es), fonte: ' + fonte + '.');
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

    const lblBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 15, ry, w * 0.58, rowH);
    // FIX: Converte label para String e garante valor
    let labelTexto = kpi.l ? String(kpi.l) : "-";
    lblBox.getText().setText(labelTexto)
      .getTextStyle().setFontSize(8).setBold(true).setForegroundColor(CORES.textDark).setFontFamily(DS.typography.body);
    lblBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Coluna de valor larga (0.34 da largura) para não quebrar textos da planilha
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + w * 0.60, ry, w * 0.34, rowH);
    let valorTexto = (kpi.v !== undefined && kpi.v !== null && kpi.v !== "") ? String(kpi.v) : "—";
    valBox.getText().setText(formatarNumeroBR(valorTexto))
      .getTextStyle().setFontSize(9.5).setBold(true).setForegroundColor(corTema).setFontFamily(DS.typography.titles);
    valBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    valBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  });
}
