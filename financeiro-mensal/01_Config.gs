/**
 * ARQUIVO: 01_Config.gs
 * SEÇÃO:   NÚCLEO — Configuração da Apresentação Mensal do Financeiro
 *
 * Projeto Apps Script PRÓPRIO, separado dos outros (megas-mensal,
 * propriedades-mensal...). Repete nomes de propósito (CR_DESIGN_SYSTEM,
 * getDeckMensal_...) — como é projeto distinto, não há colisão em execução.
 * O cuidado é só ao COPIAR código de uma pasta para a outra: confira o nome
 * no destino antes. Ver o CLAUDE.md da raiz.
 */

// ==========================================
// DESIGN SYSTEM
// ==========================================
// Mesmos valores de marca das outras apresentações — é o mesmo sistema,
// replicado por cópia (Apps Script não tem import). Ao mexer na paleta aqui,
// verifique megas-mensal/01_Config.gs, propriedades-mensal/01_Config.gs,
// boletim/config.gs e gestao-tvs/Config.gs.
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark : '#151E49',
    brandMed  : '#003D7B',
    brandLight: '#065CA9',
    brandSoft : '#93C5FD',
    bgSlide   : '#F8FAFC',
    cardBg    : '#FFFFFF',
    textMain  : '#151E49',
    textBody  : '#475569',
    lines     : '#E2E8F0',
    accentGreen : '#10B981',
    accentOrange: '#F97316',
    accentRed   : '#EF4444'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  layout: { marginX: 30, headerH: 64 },
  // Logo Capital Realty — mesmo arquivo usado nos outros decks.
  assets: {
    logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',
    logoW: 112,
    logoH: 32
  }
};

// Logos oficiais Capital Realty (mesmos IDs dos outros projetos — ver
// megas-mensal/01_Config.gs para o significado de cada versão).
const LOGOS_CR = {
  abrevColor:    '1elIm5tGMsZqgSBgUcag5BrG5XGpcMZs5',
  abrevNegativo: '1rQVs8LALoWb-gVVYoieDooqFpsOjjOVC',
  abrevPositivo: '1JPDHRzRwvqRvzsl8Cf6AOkm3GEr7SJfd',
  fullColor:     '1toRVfIgamy4CWBT2Gv2mGd6V_W0OGISS',
  fullNegativo:  '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p',
  fullPositivo:  '1XqFtIobiEq7VC2H41sKnFNUuOluw_J4V'
};


// ==========================================
// FONTES DE DADOS
// ==========================================
// Planilha principal enviada pela Ester (financeiro): DRE por empresa do
// grupo (Capital Realty, Demercado, Garoto, Hangar Vip, Postos, DCL, D-Espaço,
// Deminvest, CR Comb, CR Estacionamentos, CR Infra...) com Real/Orçado/Ritmo
// por mês, e um consolidado. Também tem uma aba de pauta/agenda da reunião de
// resultados. Ainda não mapeamos abas/colunas linha a linha — isso entra em
// 02_Dados.gs conforme os slides forem sendo especificados.
const FINANCEIRO_SPREADSHEET_ID = '1tBWt4JfBWE7LidnxnwBMXKlGewjZEvuBBE6Z3CP8ibM';


// ==========================================
// DECK DE DESTINO
// ==========================================
// AINDA NÃO TEMOS O ID do Google Slides desta apresentação — a Ester vai
// mandar os slides/especificação. Preencha aqui assim que tiver o link
// (copie só o ID, o trecho entre /d/ e /edit da URL do Slides).
const DECK_FINANCEIRO_ID = '';

function getDeckMensal_() {
  if (!DECK_FINANCEIRO_ID) {
    throw new Error('DECK_FINANCEIRO_ID está vazio em 01_Config.gs — informe o ID ' +
      'do Google Slides da apresentação mensal do Financeiro antes de gerar.');
  }
  return SlidesApp.openById(DECK_FINANCEIRO_ID);
}
