/**
 * ARQUIVO: Slide_Backlog.gs
 * SLIDE — BACKLOG (Demandas em Aberto)
 *
 * Resumo do backlog (chamados em aberto) por Centro de Custos, dois blocos
 * empilhados (Megas e Demais Imóveis). Mesmo motor de tabela de
 * 03_Tabelas.gs usado por Preventivas/Corretivas/Recebimento de Obras, em
 * vez do retângulo-a-retângulo desenhado à mão que existia aqui antes.
 */

function gerarSlideBacklog() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'BACKLOG — DEMANDAS EM ABERTO',
    'Chamados aguardando atendimento, agrupados por Centro de Custos');

  const backlog = obterBacklogPorCC_();
  if (!backlog || backlog.length === 0) {
    Logger.log('✗ Backlog: sem dados disponíveis');
    return;
  }

  const megas  = backlog.filter(b => _propEhMega_(b.cc));
  const demais = backlog.filter(b => !_propEhMega_(b.cc));

  const topY = 74, marginBottom = 16, gap = 16;
  const blocoH = (SH - topY - marginBottom - gap) / 2;

  _propBlocoBacklogCC_(slide, SW, SH, topY, blocoH, 'MEGAS', megas);
  _propBlocoBacklogCC_(slide, SW, SH, topY + blocoH + gap, blocoH, 'DEMAIS IMÓVEIS', demais);

  Logger.log('✓ Backlog gerado');
}

// Linhas por bloco antes de resumir o resto em "+ N outro(s)" — Megas nunca
// bate nisso (só 3 cidades), Demais Imóveis pode ter mais Centros de Custos
// do que cabe numa tabela de 5 linhas.
const PROP_BACKLOG_MAX_LINHAS = 5;
const PROP_BACKLOG_COLUNAS = [
  { nome: 'Centro de Custos', tipo: 'texto',  largura: 0.65 },
  { nome: 'Em Aberto',        tipo: 'numero', largura: 0.35 }
];

function _propBlocoBacklogCC_(slide, SW, SH, y, h, legenda, dados) {
  const legH = SH * 0.045;
  _tabDesenharLegenda_(slide, SW, y, legH, legenda);
  const topoTab = y + legH + SH * 0.008;

  // Quando sobra Centro de Custos, a última linha reservada vira "+ N
  // outro(s)" em vez de estourar a tabela — mesma ideia do slide antigo,
  // só que a linha extra agora é uma LINHA DE VERDADE da tabela (o motor
  // cuida da geometria) em vez de uma caixa de texto solta por baixo dela.
  const cabe   = dados.length > PROP_BACKLOG_MAX_LINHAS;
  const exibir = dados.slice(0, cabe ? PROP_BACKLOG_MAX_LINHAS - 1 : PROP_BACKLOG_MAX_LINHAS);
  const resto  = dados.length - exibir.length;

  const linhas = exibir.map(d => [d.cc, d.total]);
  if (resto > 0) linhas.push(['+ ' + resto + ' outro(s)', '']);

  _tabDesenharTabela_(slide, SW, SH, linhas, topoTab, y + h,
    { colunas: PROP_BACKLOG_COLUNAS, maxLinhas: PROP_BACKLOG_MAX_LINHAS });
}
