/**
 * ARQUIVO: Slide_Corretivas.gs
 * SLIDE — MANUTENÇÃO CORRETIVA
 *
 * Mesmo desenho de Slide_Preventivas.gs (SLA da equipe Propriedades, motor
 * de 03_Tabelas.gs, dois blocos Megas/Demais Imóveis) — só a fonte dos
 * números muda. _propBlocoEquipeSLA_ e afins estão em Slide_Preventivas.gs,
 * o primeiro slide a precisar deles.
 */

function gerarSlideCorretivas() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'MANUTENÇÃO CORRETIVA',
    'SLA de corretivas fechadas pela equipe de Propriedades');

  const megas  = obterIndicadoresAcumulado_().corretivas;
  const demais = obterIndicadoresAcumulado_().corretvasDemais;
  if (!megas || !demais) {
    Logger.log('✗ Corretivas: sem dados disponíveis');
    return;
  }

  const topY = 74, marginBottom = 16, gap = 16, blocoH = 92;
  const availH = SH - topY - marginBottom;
  const startY = topY + Math.max(0, (availH - (blocoH * 2 + gap)) / 2);

  _propBlocoEquipeSLA_(slide, SW, SH, startY, blocoH, 'MEGAS', megas);
  _propBlocoEquipeSLA_(slide, SW, SH, startY + blocoH + gap, blocoH, 'DEMAIS IMÓVEIS', demais);

  Logger.log('✓ Corretivas gerado');
}
