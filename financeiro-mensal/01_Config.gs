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
    textMuted : '#94A3B8',
    darkLine  : '#334155',
    highlight : '#60A5FA',
    lines     : '#E2E8F0',
    tableGroup: '#151E49',
    tableHeader: '#065CA9',
    tableTotal: '#BFC3C7',
    tableStripe: '#EEF2F7',
    watermark: '#E2E8F0',
    warningText: '#C2410C',
    comparisonPositive: '#15803D',
    comparisonNegative: '#DC2626',
    comparisonPositiveDark: '#86EFAC',
    comparisonNegativeDark: '#FCA5A5',
    accentGreen : '#10B981',
    accentOrange: '#F97316',
    accentRed   : '#EF4444'
  },
  typography: {
    titles: 'Montserrat',
    body: 'Open Sans',
    // Escala proporcional à largura do deck. Os três tamanhos de corpo são
    // modos de densidade da TABELA inteira — nunca ajustes célula a célula.
    scale: {
      entity: .027,
      entityCompact: .019,
      topic: .021,
      topicCompact: .015,
      metadata: .0082,
      tableGroup: .0115,
      tableHeader: .0098,
      tableBodyRegular: .0114,
      tableBodyCompact: .0097,
      tableBodyDense: .0092
    }
  },
  layout: {
    marginX: 30,
    headerH: 64,
    light: {
      marginX: .03,
      entityY: .02,
      entityH: .055,
      topicY: .073,
      topicH: .048,
      metadataX: .58,
      metadataY: .025,
      metadataW: .39,
      metadataH: .075,
      contentTop: .16,
      tableBottom: .875,
      logoH: .068,
      logoRight: .03,
      logoBottom: .018
    },
    dark: {
      logoX: .058,
      logoY: .074,
      logoH: .075
    }
  },
  // Assets canônicos por contraste. logoId fica apenas como alias legado;
  // nenhum renderizador financeiro ativo troca para ele como fallback.
  assets: {
    logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',
    logoLightId: '1toRVfIgamy4CWBT2Gv2mGd6V_W0OGISS',
    logoDarkId: '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p',
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
// Apresentação Mensal do Financeiro:
// https://docs.google.com/presentation/d/10LL0oerPM_3KD0yQitt509HQV6k1h8VEK2OssMkOSwQ/edit
const DECK_FINANCEIRO_ID = '10LL0oerPM_3KD0yQitt509HQV6k1h8VEK2OssMkOSwQ';

function getDeckMensal_() {
  if (!DECK_FINANCEIRO_ID) {
    throw new Error('DECK_FINANCEIRO_ID está vazio em 01_Config.gs — informe o ID ' +
      'do Google Slides da apresentação mensal do Financeiro antes de gerar.');
  }
  return SlidesApp.openById(DECK_FINANCEIRO_ID);
}
