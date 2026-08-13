/**
 * ARQUIVO: Slide_Preventivas.gs
 * SLIDE — MANUTENÇÃO PREVENTIVA
 *
 * Tabela de preventivas por equipe (Propriedades/Facilities/Terceiros) com
 * cumpridos, não cumpridos e SLA, dois blocos empilhados (Megas e Demais
 * Imóveis). O desenho da tabela é o motor de 03_Tabelas.gs — a mesma faixa
 * de legenda (_tabDesenharLegenda_) e o mesmo grid de tabela
 * (_tabDesenharTabela_) que Slide_RecebimentoObras.gs e
 * Slide_Contratacoes.gs já usam — em vez do retângulo-a-retângulo desenhado
 * à mão que existia aqui antes.
 *
 * _propLinhasEquipeSLA_/_propBlocoEquipeSLA_ são compartilhados com
 * Slide_Corretivas.gs (mesmo formato de dado — cumpridos/não cumpridos por
 * equipe —, só a fonte dos números muda). Definidos aqui por serem usados
 * pela primeira vez neste slide.
 */

function gerarSlidePreventivas() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'MANUTENÇÃO PREVENTIVA',
    'SLA de manutenção preventiva por segmento e equipe');

  const megas  = obterIndicadoresAcumulado_().preventivas;
  const demais = obterIndicadoresAcumulado_().preventivasDemais;
  if (!megas || !demais) {
    Logger.log('✗ Preventivas: sem dados disponíveis');
    return;
  }

  const topY = 74, marginBottom = 16, gap = 16;
  const blocoH = (SH - topY - marginBottom - gap) / 2;

  _propBlocoEquipeSLA_(slide, SW, SH, topY, blocoH, 'MEGAS', megas);
  _propBlocoEquipeSLA_(slide, SW, SH, topY + blocoH + gap, blocoH, 'DEMAIS IMÓVEIS', demais);

  Logger.log('✓ Preventivas gerado');
}


// ==========================================
// TABELA POR EQUIPE (Propriedades/Facilities/Terceiros) — compartilhada
// com Slide_Corretivas.gs
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

function _propLinhasEquipeSLA_(dados) {
  return [
    ['Propriedades', dados.properties_cumpridos, dados.properties_nao_cumpridos,
      _propSlaPct_(dados.properties_cumpridos, dados.properties_nao_cumpridos)],
    ['Facilities', dados.facilities_cumpridos, dados.facilities_nao_cumpridos,
      _propSlaPct_(dados.facilities_cumpridos, dados.facilities_nao_cumpridos)],
    ['Terceiros', dados.terceiros_cumpridos, dados.terceiros_nao_cumpridos,
      _propSlaPct_(dados.terceiros_cumpridos, dados.terceiros_nao_cumpridos)]
  ];
}

// Um bloco = faixa de legenda (mesmo componente usado por "HISTÓRICO ·
// CONCLUÍDOS" no Recebimento de Obras) + tabela de 3 linhas fixas
// (Propriedades/Facilities/Terceiros).
function _propBlocoEquipeSLA_(slide, SW, SH, y, h, legenda, dados) {
  const legH = SH * 0.045;
  _tabDesenharLegenda_(slide, SW, y, legH, legenda);
  const topoTab = y + legH + SH * 0.008;

  _tabDesenharTabela_(slide, SW, SH, _propLinhasEquipeSLA_(dados), topoTab, y + h,
    { colunas: PROP_EQUIPE_COLUNAS_SLA, maxLinhas: 3 });
}
