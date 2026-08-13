/**
 * ARQUIVO: Slide_Corretivas.gs
 * SLIDE — MANUTENÇÃO CORRETIVA
 *
 * Mesmo desenho de Slide_Preventivas.gs (tabela por equipe, motor de
 * 03_Tabelas.gs, dois blocos Megas/Demais Imóveis) — só a fonte dos números
 * muda. _propBlocoEquipeSLA_ e afins estão em Slide_Preventivas.gs, o
 * primeiro slide a precisar deles.
 */

function gerarSlideCorretivas() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'MANUTENÇÃO CORRETIVA',
    'SLA de manutenção corretiva por segmento e equipe');

  const megas  = obterIndicadoresAcumulado_().corretivas;
  const demais = obterIndicadoresAcumulado_().corretvasDemais;
  if (!megas || !demais) {
    Logger.log('✗ Corretivas: sem dados disponíveis');
    return;
  }

  const topY = 74, marginBottom = 16, gap = 16;
  const blocoH = (SH - topY - marginBottom - gap) / 2;

  _propBlocoEquipeSLA_(slide, SW, SH, topY, blocoH, 'MEGAS', megas);
  _propBlocoEquipeSLA_(slide, SW, SH, topY + blocoH + gap, blocoH, 'DEMAIS IMÓVEIS', demais);

  Logger.log('✓ Corretivas gerado');
}
