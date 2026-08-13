/**
 * ARQUIVO: Slide_BacklogEmergencialDetalhe.gs
 * SLIDE — BACKLOG EMERGENCIAL — DETALHE
 *
 * Detalhamento dos chamados de prioridade Emergencial que estavam em
 * aberto no mês de referência (equipe Propriedades), um por linha:
 * Segmento (Megas/Demais Imóveis), Centro de Custos, Descrição, Data de
 * Abertura e Dias em Aberto. É o "de onde vêm" por trás do gráfico de
 * Backlog de Chamados Emergências em Slide_Corretivas.gs — mesma fonte
 * (obterBacklogEmergencialDetalhe_, 02_Dados.gs), mesmo mês de referência:
 * o total de linhas aqui bate com a última barra daquele gráfico.
 *
 * Desenhado com o motor de 03_Tabelas.gs (mesmo de Recebimento de
 * Obras/Contratações/Preventivas/Corretivas/Backlog neste deck) —
 * paginado, não resumido: "detalhamento" mostra todo mundo, mesmo que
 * precise de mais de um slide.
 */

const BACKLOG_EMERG_MAX_LINHAS = 8;
// "Data Abertura" é 'textoCentro', não 'data': _tabDesenharTabela_ só
// desenha coluna 'data' se o texto bater com dd/mm/AAAA (_tabEhData_,
// 03_Tabelas.gs) — e _histFormatarDataCurta_ (02_Dados.gs) devolve ano com
// 2 dígitos (dd/mm/aa), pra caber na coluna estreita. 'textoCentro' exibe
// o texto como veio, sem essa validação.
const BACKLOG_EMERG_COLUNAS = [
  { nome: 'Segmento',         tipo: 'textoCentro', largura: 0.13 },
  { nome: 'Centro de Custos', tipo: 'textoCentro', largura: 0.20 },
  { nome: 'Descrição',        tipo: 'texto',        largura: 0.40 },
  { nome: 'Data Abertura',    tipo: 'textoCentro',  largura: 0.13 },
  { nome: 'Dias em Aberto',   tipo: 'numero',       largura: 0.14 }
];

function gerarSlideBacklogEmergencialDetalhe() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  const itens = obterBacklogEmergencialDetalhe_();

  if (!itens.length) {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DS.colors.bgSlide);
    criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE',
      'Chamados emergenciais em aberto no mês de referência · Equipe Propriedades');

    const msg = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, SH / 2 - 20, SW - 80, 40);
    msg.getText().setText('Nenhum chamado emergencial em aberto no mês de referência.').getTextStyle()
      .setFontSize(14).setItalic(true).setBold(true)
      .setForegroundColor(DS.colors.accentGreen).setFontFamily(DS.typography.titles);
    msg.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    msg.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    Logger.log('✓ Backlog Emergencial — Detalhe: nenhum chamado no mês.');
    return;
  }

  const linhas = itens.map(it => [it.segmento, it.cc, it.descricao, it.dataAbertura, it.dias]);
  const pgs = _tabPaginar_(linhas, BACKLOG_EMERG_MAX_LINHAS);

  pgs.forEach((pagina, idx) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DS.colors.bgSlide);

    const subtitulo = 'Chamados emergenciais em aberto · Equipe Propriedades' +
      (pgs.length > 1 ? ' — página ' + (idx + 1) + ' de ' + pgs.length : '');
    criarHeaderPadrao(slide, 'BACKLOG EMERGENCIAL — DETALHE', subtitulo);

    const topY = 74, marginBottom = 20;
    const legH = SH * 0.045;
    _tabDesenharLegenda_(slide, SW, topY, legH, 'EM ABERTO (' + itens.length + ')');
    const topoTab = topY + legH + SH * 0.008;

    _tabDesenharTabela_(slide, SW, SH, pagina, topoTab, SH - marginBottom,
      { colunas: BACKLOG_EMERG_COLUNAS, maxLinhas: BACKLOG_EMERG_MAX_LINHAS });
  });

  Logger.log('✓ Backlog Emergencial — Detalhe: ' + itens.length + ' chamado(s) em ' + pgs.length + ' página(s).');
}
