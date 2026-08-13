/**
 * ARQUIVO: Slide_Corretivas.gs
 * SLIDE — MANUTENÇÃO CORRETIVA
 *
 * SLA de corretivas fechadas pela equipe Propriedades, dois blocos
 * (Megas/Demais Imóveis) desenhados com o motor de 03_Tabelas.gs — ainda no
 * formato de tabela (diferente do novo layout de Slide_Preventivas.gs, que
 * virou 2 cards estilo Megas). _propBlocoEquipeSLA_ e afins moraram em
 * Slide_Preventivas.gs até esse slide ser redesenhado; agora que só a
 * Corretiva ainda usa esse desenho, vieram pra cá.
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


// ==========================================
// TABELA DE SLA (equipe Propriedades) — motor de 03_Tabelas.gs
// ==========================================
const PROP_EQUIPE_COLUNAS_SLA = [
  { nome: 'Equipe',         tipo: 'texto',  largura: 0.34 },
  { nome: 'Cumpridos',      tipo: 'numero', largura: 0.20 },
  { nome: 'Não Cumpridos',  tipo: 'numero', largura: 0.23 },
  { nome: 'SLA',            tipo: 'numero', largura: 0.23 }
];

function _propSlaPct_(cumpridos, naoCumpridos) {
  const total = (cumpridos || 0) + (naoCumpridos || 0);
  return total > 0 ? (cumpridos / total * 100).toFixed(1) + '%' : '-';
}

// Uma linha só — Propriedades. Facilities e Terceiros não entram nesta
// apresentação (pedido do usuário).
function _propLinhasEquipeSLA_(dados) {
  return [
    ['Propriedades', dados.properties_cumpridos, dados.properties_nao_cumpridos,
      _propSlaPct_(dados.properties_cumpridos, dados.properties_nao_cumpridos)]
  ];
}

// Um bloco = faixa de legenda (mesmo componente usado por "HISTÓRICO ·
// CONCLUÍDOS" no Recebimento de Obras) + tabela de 1 linha (Propriedades).
function _propBlocoEquipeSLA_(slide, SW, SH, y, h, legenda, dados) {
  const legH = SH * 0.045;
  _tabDesenharLegenda_(slide, SW, y, legH, legenda);
  const topoTab = y + legH + SH * 0.008;

  _tabDesenharTabela_(slide, SW, SH, _propLinhasEquipeSLA_(dados), topoTab, y + h,
    { colunas: PROP_EQUIPE_COLUNAS_SLA, maxLinhas: 1 });
}
