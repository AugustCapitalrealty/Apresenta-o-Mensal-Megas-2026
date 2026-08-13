/**
 * ARQUIVO: 01_Config.gs
 * SEÇÃO:   NÚCLEO — Configuração da Apresentação Mensal de Propriedades
 *
 * Projeto Apps Script PRÓPRIO, separado da apresentação dos Megas. Os dois
 * repetem nomes de propósito (CR_DESIGN_SYSTEM, getProjetoAtivo...) — como
 * são projetos distintos, cada um tem seu namespace e nada colide em
 * execução. O cuidado é só na hora de COPIAR código de uma pasta para a
 * outra: confira o nome no destino antes. Ver o CLAUDE.md da raiz.
 */

// ==========================================
// DESIGN SYSTEM
// ==========================================
// Mesmos valores de marca das outras apresentações — é o mesmo sistema,
// replicado por cópia (Apps Script não tem import). Ao mexer na paleta aqui,
// verifique megas-mensal/01_Config.gs, boletim/config.gs e
// gestao-tvs/Config.gs.
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark : '#151E49',
    brandMed  : '#003D7B',
    brandLight: '#065CA9',
    brandSoft : '#93C5FD',
    bgSlide   : '#F8FAFC',
    cardBg    : '#FFFFFF',
    textMain  : '#16213E',
    textBody  : '#46516B',
    textMuted : '#8592AC',
    line      : '#E2E8F1',
    white     : '#FFFFFF',
    verde     : '#00B050',
    vermelho  : '#D32F2F',
    // Acentos das TABELAS (03_Tabelas.gs), vindos de tabelas/propriedades-semanal.
    // Convivem com verde/vermelho acima em vez de substituí-los: os slides de
    // indicadores usam a paleta institucional (#00B050), as tabelas usam a de
    // status (#10B981), e trocar uma pela outra mudaria decks já aprovados.
    lines       : '#E2E8F0',
    accentGreen : '#10B981',
    accentOrange: '#F97316',
    accentRed   : '#EF4444'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  // Logo Capital Realty — mesmo arquivo usado nos outros decks.
  logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', logoW: 112, logoH: 32
};


// ==========================================
// FONTES DE DADOS
// ==========================================
// BD-CORRETIVAS: base bruta de chamados, uma linha por chamado, histórico
// desde 2021, multi-empreendimento. É de onde sai a classificação por equipe
// (PROPERTY / FACILITIES / LOCATARIO) que a apresentação dos Megas já usa —
// o caminho mais curto para o primeiro slide de Propriedades com dado real.
// Mesmo ID de megas-mensal/01_Config.gs.
const BD_CORRETIVAS_ID = '1YlNZK_SdS_VTSPWzqOn_cYs1PjM5BO-VWgqSp-YpcVo';

// Planilha de histórico validado, se a apresentação de Propriedades for usar
// as mesmas séries mensais. Mesmo ID de megas-mensal.
const HISTORICO_VALIDADO_ID = '1o6vNzmZPlvil-DefoFZj92KzHBueqddk8wy26Ev2_DI';

// Planilha própria da área de Propriedades — a mesma que alimenta a
// apresentação SEMANAL (tabelas/propriedades-semanal). Abas usadas:
//   Recebimento de Obras - Esteio | Recebimento de Obras - Ctba
//   Análise de Projetos           | GESTÃO DE CONTRATAÇÕES
// É de onde saem as tabelas de 03_Tabelas.gs.
const PROPRIEDADES_SPREADSHEET_ID = '1in5xwPsPBAQCRyuCZNdEmT_u4jOYADdGs0ABKeeovF4';


// ==========================================
// DECK DE DESTINO
// ==========================================
// A apresentação mensal de Propriedades é UMA só, do portfólio inteiro — o
// recorte é "Megas x demais imóveis" DENTRO dela, não um deck por imóvel.
// Por isso o destino é este ID único, e não o presentationId de PROPRIEDADES
// (que existe para o caso de algum imóvel ganhar deck próprio no futuro).
//
// Preencher antes de gerar: sem ID, getDeckMensal_ avisa em vez de escrever
// no lugar errado.
const DECK_PROPRIEDADES_ID = '';

function getDeckMensal_() {
  if (!DECK_PROPRIEDADES_ID) {
    throw new Error('DECK_PROPRIEDADES_ID está vazio em 01_Config.gs — ' +
                    'informe o ID do Google Slides da apresentação mensal de Propriedades.');
  }
  return SlidesApp.openById(DECK_PROPRIEDADES_ID);
}


// ==========================================
// EMPREENDIMENTOS
// ==========================================
// Estrutura pronta, valores a preencher. Cada entrada precisa de:
//   nome           rótulo que aparece no slide
//   ccBD           valor exato da coluna "Centro de Custos" na BD-CORRETIVAS
//                  (é por ele que os chamados são filtrados — tem que bater
//                  string a string, não é o nome de exibição)
//   presentationId ID do Google Slides de destino
//
// Enquanto estiver vazio, gerarApresentacaoPropriedades_ avisa e não gera
// nada — melhor que um deck com o empreendimento errado.
const PROPRIEDADES = {
  // EXEMPLO (não ative sem conferir o ccBD na planilha):
  // CURITIBA: {
  //   nome          : 'Mega Curitiba',
  //   ccBD          : 'MEGA CURITIBA',
  //   presentationId: ''
  // },
};

let _propAtiva = null;

function setPropriedadeAtiva(chave) {
  if (!PROPRIEDADES[chave]) {
    throw new Error('Propriedade "' + chave + '" não está em PROPRIEDADES (01_Config.gs). ' +
                    'Disponíveis: ' + (Object.keys(PROPRIEDADES).join(', ') || 'nenhuma cadastrada'));
  }
  _propAtiva = chave;
  Logger.log('▸ Propriedade ativa: ' + PROPRIEDADES[chave].nome);
}

function getPropriedadeAtiva() {
  if (!_propAtiva) {
    const chaves = Object.keys(PROPRIEDADES);
    if (!chaves.length) {
      throw new Error('Nenhuma propriedade cadastrada em PROPRIEDADES (01_Config.gs). ' +
                      'Preencha ao menos uma antes de gerar.');
    }
    _propAtiva = chaves[0];
  }
  return PROPRIEDADES[_propAtiva];
}

function getDeckPropriedadeAtiva() {
  const p = getPropriedadeAtiva();
  if (!p.presentationId) {
    throw new Error('A propriedade "' + p.nome + '" está sem presentationId em 01_Config.gs.');
  }
  return SlidesApp.openById(p.presentationId);
}
