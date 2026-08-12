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
    vermelho  : '#D32F2F'
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

// EM BRANCO ATÉ DEFINIRMOS: planilha própria da área de Propriedades
// (vistorias, contratos, ocupação — o que for entrar no deck).
const PROPRIEDADES_SPREADSHEET_ID = '';


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
