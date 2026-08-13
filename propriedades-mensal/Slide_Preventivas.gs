/**
 * ARQUIVO: Slide_Preventivas.gs
 * SLIDE — MANUTENÇÃO PREVENTIVA
 *
 * SLA de preventivas fechadas pela equipe PROPRIEDADES (nada de Facilities
 * nem Terceiros — esta apresentação é só do time de Propriedades), dois
 * blocos lado a lado (Megas e Demais Imóveis). O desenho da tabela é o
 * motor de 03_Tabelas.gs — a mesma faixa de legenda (_tabDesenharLegenda_)
 * e o mesmo grid de tabela (_tabDesenharTabela_) que Slide_RecebimentoObras.gs
 * e Slide_Contratacoes.gs já usam.
 *
 * _propLinhasEquipeSLA_/_propBlocoEquipeSLA_ são compartilhados com
 * Slide_Corretivas.gs (mesmo formato de dado — cumpridos/não cumpridos —,
 * só a fonte dos números muda). Definidos aqui por serem usados pela
 * primeira vez neste slide.
 */

function gerarSlidePreventivas() {
  const deck = getDeckMensal_();
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);

  criarHeaderPadrao(slide, 'MANUTENÇÃO PREVENTIVA',
    'SLA de preventivas fechadas pela equipe de Propriedades');

  const megas  = obterIndicadoresAcumulado_().preventivas;
  const demais = obterIndicadoresAcumulado_().preventivasDemais;
  if (!megas || !demais) {
    Logger.log('✗ Preventivas: sem dados disponíveis');
    return;
  }

  // Blocos compactos (1 linha de dado cada) centralizados no espaço abaixo
  // do cabeçalho, em vez de esticados pela metade do slide como quando
  // cada um tinha 3 linhas (Propriedades/Facilities/Terceiros).
  const topY = 74, marginBottom = 16, gap = 16, blocoH = 92;
  const availH = SH - topY - marginBottom;
  const startY = topY + Math.max(0, (availH - (blocoH * 2 + gap)) / 2);

  _propBlocoEquipeSLA_(slide, SW, SH, startY, blocoH, 'MEGAS', megas);
  _propBlocoEquipeSLA_(slide, SW, SH, startY + blocoH + gap, blocoH, 'DEMAIS IMÓVEIS', demais);

  Logger.log('✓ Preventivas gerado');
}


// ==========================================
// TABELA DE SLA (equipe Propriedades) — compartilhada com Slide_Corretivas.gs
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
