/**
 * ARQUIVO: Slide_BacklogEmergencialDetalhe.gs
 * SLIDE — BACKLOG EMERGENCIAL — DETALHE
 *
 * Detalhamento dos chamados de prioridade Emergencial que estavam em
 * aberto no mês de referência (equipe Propriedades), um por linha:
 * Empreendimento, Descrição, Data de Abertura e Dias em Aberto. É o "de
 * onde vêm" por trás do gráfico de Backlog de Chamados Emergências em
 * Slide_Corretivas.gs — mesma fonte (obterBacklogEmergencialDetalhe_,
 * 02_Dados.gs), mesmo mês de referência: o total de linhas aqui bate com a
 * última barra daquele gráfico.
 *
 * Desenhado com o motor de 03_Tabelas.gs (mesmo de Recebimento de
 * Obras/Contratações/Preventivas/Corretivas/Backlog neste deck) —
 * paginado, não resumido: "detalhamento" mostra todo mundo, mesmo que
 * precise de mais de um slide.
 */


function gerarSlideBacklogEmergencialDetalhe() {
  const deck = getDeckMensal_();

  if (typeof _tabRemoverPorTag_ === 'function' && typeof TAG_BACKLOG_EMERG_DETALHE !== 'undefined') {
    _tabRemoverPorTag_(deck, TAG_BACKLOG_EMERG_DETALHE);
  }

  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  const itens = obterBacklogEmergencialDetalhe_();

  if (!itens.length) {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DS.colors.bgSlide);

    if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_BACKLOG_EMERG_DETALHE !== 'undefined') {
      _tabMarcarSlide_(slide, TAG_BACKLOG_EMERG_DETALHE);
    }

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

  const linhas = itens.map(it => [it.cc, it.descricao, it.dataAbertura, it.dias]);
  const pgs = _tabPaginar_(linhas, BACKLOG_EMERG_MAX_LINHAS);

  pgs.forEach((pagina, idx) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(DS.colors.bgSlide);

    if (typeof _tabMarcarSlide_ === 'function' && typeof TAG_BACKLOG_EMERG_DETALHE !== 'undefined') {
      _tabMarcarSlide_(slide, TAG_BACKLOG_EMERG_DETALHE);
    }

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
