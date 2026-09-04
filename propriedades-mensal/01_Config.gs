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
    accentRed   : '#EF4444',
    // Cores temáticas do grid 2×2 do Dashboard Operacional (Slide_
    // IndicadoresGerais.gs), copiadas de megas-mensal/01_Config.gs (CORES).
    // Lá coloriam "Ativos Críticos/Preventiva/Corretiva/Acesso"; aqui não há
    // dado de acesso, então os 4 tons só emprestam a paleta — cada quadrante
    // usa o que faz sentido pro dado real que este deck tem.
    themeAtivos: '#1E3A8A',
    themePrev  : '#10B981',
    themeCorr  : '#F59E0B',
    themeAcesso: '#0EA5E9'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  // Logo Capital Realty — mesmo arquivo usado nos outros decks.
  logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', logoW: 112, logoH: 32,
  // Usado por criarHeaderPadrao (mesma margem/altura de megas-mensal/01_Config.gs).
  layout: { marginX: 30, headerH: 64 }
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
//
// É aqui que ela difere dos Megas, e a diferença já custou confusão: em
// megas-mensal existe um registro de empreendimentos, cada um com o seu
// presentationId, porque lá são TRÊS decks (Curitiba, Itajaí, Esteio). Copiar
// essa estrutura para cá criou um cadastro que nunca seria preenchido e que
// bloqueava a geração com "nenhuma propriedade cadastrada". Um deck, um ID.
//
// Apresentação Mensal de Propriedades:
// https://docs.google.com/presentation/d/1hU2a_7dms3fQV6bLBcVWIrNgmoE_ePg2aq-oUf9MNLY/edit
const DECK_PROPRIEDADES_ID = '1hU2a_7dms3fQV6bLBcVWIrNgmoE_ePg2aq-oUf9MNLY';

function getDeckMensal_() {
  if (!DECK_PROPRIEDADES_ID) {
    throw new Error('DECK_PROPRIEDADES_ID está vazio em 01_Config.gs — ' +
                    'informe o ID do Google Slides da apresentação mensal de Propriedades.');
  }
  return SlidesApp.openById(DECK_PROPRIEDADES_ID);
}

// ==========================================
// TAGS DE IDENTIFICAÇÃO DOS SLIDES
// ==========================================
// Permitem regerar ou atualizar seções individuais sem duplicar slides nem
// apagar alterações manuais do apresentador.
const TAG_CAPA                      = '【PROP_CAPA_AUTO】';
const TAG_DASHBOARD                 = '【PROP_DASHBOARD_AUTO】';
const TAG_PREVENTIVAS               = '【PROP_PREVENTIVAS_AUTO】';
const TAG_CORRETIVAS                = '【PROP_CORRETIVAS_AUTO】';
const TAG_BACKLOG                   = '【PROP_BACKLOG_AUTO】';
const TAG_BACKLOG_EMERG_DETALHE     = '【PROP_BACKLOG_EMERG_DETALHE_AUTO】';
const TAG_CHAMADOS_PENDENTES        = '【PROP_CHAMADOS_PENDENTES_AUTO】';
const TAG_BACKLOG_CLIENTES          = '【PROP_BACKLOG_CLIENTES_AUTO】';
const TAG_TORRE_MANUTENCAO          = '【PROP_TORRE_MANUTENCAO_AUTO】';
const TAG_DRE_PROPRIEDADES          = '【PROP_DRE_PROPRIEDADES_AUTO】';
const TAG_DRE_MANUTENCAO            = '【PROP_DRE_MANUTENCAO_AUTO】';
const TAG_BRIDGE_MANUTENCAO         = '【PROP_BRIDGE_MANUTENCAO_AUTO】';
const TAG_BRIDGE_GRAFICO            = '【PROP_BRIDGE_GRAFICO_AUTO】';

// ==========================================
// TORRE DE MANUTENÇÃO — CONFIGURAÇÃO E DADOS BASE
// ==========================================
// IDs das planilhas online do Google Sheets:
// Torre CR: https://docs.google.com/spreadsheets/d/1BKvWWjFDarUzSa2aop2EJMrlsw3kGgaydHXC_yfsRO8/edit
const TORRE_MANUTENCAO_CR_ID        = '1BKvWWjFDarUzSa2aop2EJMrlsw3kGgaydHXC_yfsRO8';

// Torre Demercado: https://docs.google.com/spreadsheets/d/1DvqLw3EIDerqJhSZedKrx_ZJZ5JWiGIkXXacAgxzLqM/edit
const TORRE_MANUTENCAO_DEMERCADO_ID = '1DvqLw3EIDerqJhSZedKrx_ZJZ5JWiGIkXXacAgxzLqM';

// ==========================================
// FAROL DE METAS — PROPERTY
// ==========================================
// FONTE OFICIAL: aba "METAS" da planilha da Gestão à Vista TV
// (GESTAO_TV_METAS_SPREADSHEET_ID abaixo), exatamente como no sistema dos Megas
// (megas-mensal/Slide_Metas.gs). As metas e os valores manuais (SIM/NÃO)
// são mantidos diretamente na planilha oficial — sem necessidade de alterar código todo mês.
//
// As 14 colunas da aba METAS:
//   Mega | Papel | Título | Descrição | Pontos | Direcionador | Unidade |
//   Sentido | Meta Mês | Real Mês | Status Mês | Meta Acum. | Real Acum. | Status Acum.
//
// Mínimo de pontos no ANO para o analista ficar elegível (METAS_PONTOS_ELEGIVEL).
// Aparece no selo do rodapé do slide.
const GESTAO_TV_METAS_SPREADSHEET_ID = '1XrgKQENISyM_cO7xslUQZrmCiZpRJ0UU512FQF1WiRA';
const METAS_PONTOS_ELEGIVEL = 50;

const METAS_PROPRIEDADES = [
  {
    nome: 'WILSON FRANCISCO LEFFER JUNIOR',
    papel: 'ANALISTA DE PROPRIEDADES',
    linhas: [
      { descricao: 'INSPEÇÕES PREDIAIS MONOUSUÁRIOS (DEZEMBRO)', pontos: 25,
        direcionador: 'Projetos', unidade: 'SIM/NÃO', sentido: '=',
        metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
      { descricao: 'IMPLEMENTAÇÃO DA MEDIÇÃO DE QUALIDADE E PERFORMANCE (DEZEMBRO)', pontos: 20,
        direcionador: 'Projetos', unidade: 'SIM/NÃO', sentido: '=',
        metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
      { descricao: 'DESENVOLVIMENTO DE MEMORIAIS DESCRITIVOS (NOVEMBRO)', pontos: 20,
        direcionador: 'Padronização', unidade: 'SIM/NÃO', sentido: '=',
        metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
      { descricao: 'INFRASPEAK CHECK-LIST/SLA', pontos: 20,
        direcionador: 'Performance', unidade: '%', sentido: '>=',
        metaMes: '90,00', metaAno: '90,00', calc: 'slaPreventivas' },
      { descricao: 'DESENVOLVIMENTO DE POPS DE VISTORIA DE ENTRADA E SAÍDA (NOVEMBRO)', pontos: 15,
        direcionador: 'Padronização', unidade: 'SIM/NÃO', sentido: '>=',
        metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' }
    ]
  },
  {
    nome: 'RICARDO MURILO DA SILVA',
    papel: 'ANALISTA DE PROPRIEDADES',
    linhas: [
      // Meta 80% no MÊS e no ANO. O farol trazia 6,67% no mês (= 80÷12), que
      // fazia sentido quando o real era "quanto do plano anual saiu no mês".
      // Com o PPC virando taxa de conclusão (realizados ÷ previstos), a escala
      // vai a 100% e o validador é 80% nos dois recortes — decisão do usuário.
      { descricao: 'Concluir no mínimo 80% do Planejamento (PPC) previsto em Manutenção', pontos: 25,
        direcionador: 'Performance', unidade: '%', sentido: '>=',
        metaMes: '80', metaAno: '80', calc: 'ppc' },
      { descricao: 'Realizar levantamento de projeto de retrofit de elétrica e hidráulica', pontos: 20,
        direcionador: 'Projetos', unidade: 'SIM/NÃO', sentido: '=',
        metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
      { descricao: 'Realizar manutenção de piso equivalente a pelo menos 1.000 metros', pontos: 20,
        direcionador: 'Performance', unidade: 'M', sentido: '>=',
        metaMes: '143', metaAno: '1000', calc: 'piso' },
      { descricao: 'Desenvolver checklist de recebimento de serviços contratados', pontos: 20,
        direcionador: 'Padronização', unidade: 'SIM/NÃO', sentido: '=',
        metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
      { descricao: 'TAXA DE REABERTURA', pontos: 15,
        direcionador: 'Performance', unidade: '%', sentido: '<=',
        metaMes: '2', metaAno: '2', calc: 'reabertura' }
    ]
  }
];

// Fontes das linhas calculadas.
// CONTROLE PISO 2026 - RICARDO: linhas TOTAL REALIZADO e META, um mês por coluna.
const METAS_PISO_ID = '1mFoMIe5fu2allIDAHN-IrieGGTdNn43Sl_gF1fqitHk';
// RICARDO - PROPRIEDADES 2026: aba CHAMADOS FECHADOS (base bruta, uma linha por
// chamado, coluna REABERTURA SIM/NÃO) + tabela agregada FECHADOS/REABERTOS.
// Lemos a BASE BRUTA e usamos a agregada como reserva (lição 3).
const METAS_REABERTURA_ID = '1FEC-fSYqc23O4HOMQisZFzelPSqdyxQWQ-pSwtsl4qc';
// PPC: as duas abas de SIM que substituíram os valores em R$.
const METAS_PPC_ID = '13H14RAeSZYwlNzrMj32ll1IWyPTGbNAWYeMYaY5WMVE';
const METAS_PPC_ABA_PREVISTAS  = 'MANUTENÇÕES PREVISTAS';
const METAS_PPC_ABA_REALIZADAS = 'MANUTENÇÕES REALIZADAS';

const TAG_METAS = '【PROP_METAS_AUTO】';

// ==========================================
// DRE / BRIDGE DE MANUTENÇÃO — PLANILHA PROPRIEDADES
// ==========================================
// Planilha "PLANILHA PROPRIEDADES" — DRE gerencial no plano de contas da
// controladoria. NÃO é a mesma coisa que PROPRIEDADES_SPREADSHEET_ID (que é
// a "ANÁLISE DE PROJETOS"): são planilhas diferentes, com donos diferentes.
// https://docs.google.com/spreadsheets/d/1SVlPPyPuvGtCM4pzoA5kpc4VaszzP91NaMyTWRzkKSo/edit
const DRE_MANUTENCAO_ID = '1SVlPPyPuvGtCM4pzoA5kpc4VaszzP91NaMyTWRzkKSo';

// DUAS ABAS, cada uma com um papel — e a segunda mente no rótulo.
//
//   PLANEJAMENTO 2026 - MANUTENÇÕES → colunas [Realizado AA | Planejado].
//     O PLANEJADO sai daqui, e é FIXO o ano inteiro. ("Realizado AA" é o
//     ritmo de 2025; confirmado batendo com a Torre no Demercado.)
//
//   RITMO 2026 - MANUTENÇÕES → colunas [Planejado | Realizado].
//     ⚠ A primeira coluna está rotulada "Planejado" na planilha mas é o
//     RITMO (projeção run-rate). Não é erro de leitura nossa: é o rótulo da
//     planilha que engana. Em TODO lugar que ela aparece no slide, é
//     mostrada como "Ritmo". Nunca use esta coluna como plano — o plano é o
//     da outra aba, e os dois divergem muito (ano: −592.450 × −1.083.499).
const DRE_ABA_PLANEJAMENTO = 'PLANEJAMENTO 2026 - MANUTENÇÕES';
const DRE_ABA_RITMO        = 'RITMO 2026 - MANUTENÇÕES';

// Abas de DRE de Despesas Operacionais (Propriedades)
const DRE_PROP_ABA_PLANEJAMENTO = 'PLANEJAMENTO 2026 - PROPRIEDADES';
const DRE_PROP_ABA_RITMO        = 'RITMO 2026 - PROPRIEDADES';

const DRE_PROP_ESTRUTURA = {
  raiz: { cod: '06', nome: 'DESPESAS OPERACIONAIS' },
  grupos: [
    { cod: '06.01', nome: 'DESPESA DE PESSOAL' },
    { cod: '06.02', nome: 'SERVIÇOS DE TERCEIROS' },
    { cod: '06.03', nome: 'DESPESAS FISCAIS' },
    { cod: '06.04', nome: 'DESPESAS GERAIS' }
  ],
  contasGerais: [
    { cod: '06.04.01', nome: 'seguros' },
    { cod: '06.04.02', nome: 'material consumo' },
    { cod: '06.04.03', nome: 'telefone' },
    { cod: '06.04.04', nome: 'quilometragem, estacionamento e pedágio' },
    { cod: '06.04.05', nome: 'alugueis e condominios' },
    { cod: '06.04.06', nome: 'propaganda e publicidade' },
    { cod: '06.04.07', nome: 'energia eletrica' },
    { cod: '06.04.08', nome: 'água' },
    { cod: '06.04.09', nome: 'despesa com passagens' },
    { cod: '06.04.10', nome: 'despesas com hospedagem' },
    { cod: '06.04.11', nome: 'representação e refeição' },
    { cod: '06.04.12', nome: 'despesa com taxi' },
    { cod: '06.04.13', nome: 'locação de veículos' },
    { cod: '06.04.14', nome: 'despesa com combustiveis' },
    { cod: '06.04.15', nome: 'manutenção imóveis' },
    { cod: '06.04.16', nome: 'despesas condomínio MEGA Esteio' },
    { cod: '06.04.17', nome: 'despesas condomínio MEGA Itajaí' },
    { cod: '06.04.18', nome: 'despesas condomínio MEGA Curitiba' },
    { cod: '06.04.19', nome: 'despesas condomínio MEGA Canoas' },
    { cod: '06.04.20', nome: 'processos judiciais' },
    { cod: '06.04.21', nome: 'outras despesas gerais' },
    { cod: '06.04.22', nome: 'despesas condomínios Mega' },
    { cod: '06.04.23', nome: 'Outras Receitas Operacionais' }
  ]
};

// Em cada aba, por mês, duas colunas na ordem acima; depois duas de Total.
// Par = 1ª coluna do mês, ímpar = 2ª. Mês m (0-based) → colunas 2m e 2m+1.

// A subárvore que interessa. Só manutenção: o resto do DRE (faturamento,
// pessoal, fiscais) não entra nesta apresentação.
const DRE_CONTA_RAIZ = '06.04.15.01';   // manutenção imóveis

// ⚠ ERRO CONHECIDO DA CONTABILIDADE — NÃO CONSERTAR AQUI.
//
// As duas abas não têm os mesmos centros de custo, e isso é ERRO NA ORIGEM,
// não decisão de modelagem. Confirmado com o usuário em 03/09/2026: "o
// pessoal da contabilidade vai arrumar".
//
// POR QUE O CÓDIGO NÃO CORRIGE: escolher uma das abas, ou somar a diferença
// à mão, esconderia o erro justamente de quem pode consertá-lo. E no dia em
// que a contabilidade arrumar a planilha, o ajuste viraria contagem dobrada
// em silêncio. Então a divergência fica VISÍVEL: os centros aparecem na
// tabela marcados com "só plano" / "só ritmo", e o slide avisa quando as
// linhas não somam o total do grupo.
//
// QUANDO AVISAREM QUE ARRUMOU: reconferir as duas abas, e só então tirar as
// marcas `so:` daqui e o aviso do slide.
//
// A LISTA É A UNIÃO DAS DUAS ABAS, não a de uma delas.
//
// POR QUE ISSO IMPORTA: as abas não têm os mesmos centros de custo. Três
// existem só no PLANEJAMENTO (ESTACIONAMENTO GAROTO, LJ 01 RESTAURANTE,
// AR 3000) e três só no RITMO (LOJAS GAROTO, LJ 04 HANGAR do CR, Terreno
// Guaratuba). Os do PLANEJAMENTO têm plano ZERO — sair deles não muda conta
// nenhuma. Os do RITMO têm valor: −11.400, −6.067 e −2.000 de ritmo. Montar
// a lista só pela aba do plano faria essas três sumirem em silêncio, e as
// linhas deixariam de somar o total do grupo (que confere: as 8 linhas do CR
// somam os −908.428 de ritmo do 010).
//
// A ordem é a da planilha e as linhas são FIXAS, para dois meses ficarem
// comparáveis lado a lado sem procurar o centro de custo (mesmo princípio do
// DRE dos Megas). `so` marca quem aparece em uma aba só — o slide mostra "—"
// na coluna que não existe, em vez de zero, porque não medir é diferente de
// medir zero (lição 3).
const DRE_EMPRESAS = [
  { codigo: '010', nome: 'Capital Realty', centros: [
    { codigo: '14.01.01.002', nome: 'ARMAZÉM MONOUSUÁRIO ITAJAÍ' },
    { codigo: '14.01.01.003', nome: 'ARMAZÉM MONOUSUÁRIO CUBATÃO' },
    { codigo: '14.01.01.004', nome: 'ARMAZÉM MONOUSUÁRIO ESTEIO I' },
    { codigo: '14.01.01.005', nome: 'ARMAZÉM MONOUSUÁRIO ESTEIO II' },
    { codigo: '14.02.01.999', nome: 'MEGA ESTEIO DESPESAS' },
    { codigo: '14.02.02.999', nome: 'MEGA ITAJAI DESPESAS' },
    { codigo: '14.03.01.007', nome: 'ESTACIONAMENTO GAROTO',        so: 'plano' },
    { codigo: '14.03.01.999', nome: 'LOJAS GAROTO DESPESAS',        so: 'ritmo' },
    { codigo: '14.03.03.004', nome: 'LJ 04 HANGAR VIP-OUTDOOR',     so: 'ritmo' },
    { codigo: '14.03.08.001', nome: 'LJ 01 MEGA ITAJAÍ-RESTAURANTE', so: 'plano' },
    { codigo: '14.04.02.001', nome: 'AR 3000',                      so: 'plano' }
  ]},
  { codigo: '070', nome: 'Demercado', centros: [
    { codigo: '64.02.03.999', nome: 'MEGA CURITIBA DESPESAS' },
    { codigo: '64.02.04.999', nome: 'MEGA CANOAS DESPESA' },
    { codigo: '64.03.03.004', nome: 'LJ 04 HANGAR VIP-OUTDOOR' },
    { codigo: '64.03.05.003', nome: 'PRAÇA CARLOS GOMES DESPESA' },
    { codigo: '64.03.10.001', nome: 'Terreno Guaratuba',            so: 'ritmo' }
  ]}
];

// ⚠ ERRO CONHECIDO DA CONTABILIDADE (o mesmo de cima) — NÃO CONSERTAR AQUI.
// DIVERGÊNCIA CONHECIDA contra a Torre de Manutenção (TORRE_MANUTENCAO_*_REF
// acima), que alimenta o quadrante Financeiro do Dashboard. Reconciliado
// linha a linha em 03/09/2026:
//
//   Demercado  bate exato: ritmo −161.957, orçado −183.515.
//   Capital Realty NÃO bate: aqui −440.621 / −408.935, na Torre −455.412 /
//   −421.028. A diferença é inteiramente destas duas linhas:
//     · AR 3000 — aqui −1.926 / 0; na Torre −16.368 / −12.093.
//     · GERÊNCIA DE PROPRIEDADES −349,61 — existe na Torre, não existe aqui.
//       (14.442 + 349,61 = 14.791, a diferença exata do ritmo.)
//   MEGA ITAJAI difere em 4.000 só por desmembramento (a linha LJ 01 MEGA
//   ITAJAÍ-RESTAURANTE foi separada); o total fecha.
//
// Por que isso está registrado aqui e não corrigido: escolher uma das duas
// em silêncio é o erro que a lição 2 do CLAUDE.md descreve. O slide mostra a
// divergência; a decisão de qual fonte vale é de quem conhece o número.
const DRE_TORRE_DIVERGENCIA = {
  'Capital Realty': { ritmoTorre: -455412.14, orcTorre: -421028.0 },
  'Demercado':      { ritmoTorre: -161957.30, orcTorre: -183515.0 }
};


const TORRE_MANUTENCAO_CR_REF = [
  ['ARMAZÉM MONOUSUÁRIO COLOMBO', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ['ARMAZÉM MONOUSUÁRIO ITAJAÍ', 0.0, -10000.0, -45492.0, -10000.0, -0.7802, 35492.0],
  ['ARMAZÉM MONOUSUÁRIO CUBATÃO', -7300.0, 0.0, -66340.0, 0.0, -1.0, 66340.0],
  ['ARMAZÉM MONOUSUÁRIO ESTEIO I', -28716.6, 0.0, -11786.55, 0.0, -1.0, 11786.55],
  ['ARMAZÉM MONOUSUÁRIO ESTEIO II', -268006.67, -144429.33, -179196.79, -207090.91, 0.1557, -27894.12],
  ['MEGA ESTEIO DESPESAS', -504143.89, -155000.0, -7747.81, -58775.4, 6.5861, -51027.59],
  ['MEGA ITAJAI DESPESAS', -60159.64, -102551.86, -123831.45, -133069.06, 0.0746, -9237.61],
  ['AR 3000', -6489.03, -6700.0, -16367.93, -12092.63, -0.2612, 4275.3],
  ['IMÓVEIS GAROTO', 0.0, -4500.0, -4300.0, 0.0, -1.0, 4300.0],
  ['TERRENOS COLOMBO', 0.0, -5375.0, 0.0, 0.0, 0.0, 0.0],
  ['MEGA POSTO', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ['ESTACIONAMENTO HANGAR', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ['GERÊNCIA DE PROPRIEDADES', -43.9, 0.0, -349.61, 0.0, -1.0, 349.61],
  ['AR CONDICIONADO - TI', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ['TOTAL MANUTENÇÃO', -874859.73, -428556.19, -455412.14, -421028.0, -0.0755, 34384.14]
];

const TORRE_MANUTENCAO_DEMERCADO_REF = [
  ['MEGA CURITIBA DESPESAS', -104072.6, -81400.0, -112565.8, -111140.0, -0.0127, 1425.8],
  ['MEGA CANOAS DESPESAS', -26980.0, -53750.0, -7700.0, -71625.0, 8.3019, -63925.0],
  ['IMÓVEL CARLOS GOMES', -8974.24, -1000.0, -40691.5, -750.0, -0.9816, 39941.5],
  ['IMÓVEL COMENDADOR ARAUJO', -773.33, -600.0, 0.0, 0.0, 0.0, 0.0],
  ['GUARATUBA', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ['ESTACIONAMENTO HANGAR', 0.0, 0.0, -1000.0, 0.0, -1.0, 1000.0],
  ['GERÊNCIA DE PROPRIEDADES', -94.82, 0.0, 0.0, 0.0, 0.0, 0.0],
  ['TOTAL MANUTENÇÃO', -140894.99, -136750.0, -161957.3, -183515.0, 0.1331, -21557.7]
];

// ==========================================
// PORTFÓLIO — O CORTE "MEGAS x DEMAIS"
// ==========================================
// NÃO há cadastro de imóveis aqui, de propósito. A lista de empreendimentos
// não é digitada: ela é DESCOBERTA na coluna "Centro de Custos" da
// BD-CORRETIVAS (descobrirPortfolio(), 02_Dados.gs), que já é
// multi-empreendimento e cobre o portfólio inteiro.
//
// O único recorte que a apresentação precisa é Megas x demais, e ele sai do
// prefixo do centro de custos — _propEhMega_ em 02_Dados.gs. Um cadastro à
// mão só criaria uma segunda fonte de verdade para divergir da base.
//
// Se um dia um imóvel específico precisar de rótulo próprio no slide, o lugar
// é um mapa ccBD -> nome de exibição, não um registro com deck por imóvel.


// ==========================================
// COMPONENTES VISUAIS PADRÃO
// ==========================================
// Copiados de megas-mensal/01_Config.gs (mesmo desenho, funções sem cópia
// direta em imports — Apps Script não tem — então valem os dois ao vivo. Ao
// mexer aqui, verifique se megas-mensal precisa do mesmo ajuste, e
// vice-versa). Adaptados só no essencial: getDeckAtivo() -> getDeckMensal_()
// (aqui não há "projeto ativo", é um deck só) e DS.assets.logoId/W/H ->
// DS.logoId/logoW/logoH (o CR_DESIGN_SYSTEM daqui já guardava o logo direto
// na raiz antes desta cópia existir, então manteve-se a forma local em vez
// de reestruturar o objeto).

/**
 * Cabeçalho padrão — estilo "aberto" do boletim: título escuro sobre fundo
 * claro com barra de destaque, subtítulo, logo à direita e linha separadora.
 * Mesmo componente usado em TODO slide de dado dos Megas (criarHeaderPadrao).
 */
var _propDriveAppDisponivel = true;




/**
 * Formata número no padrão brasileiro quando o valor for numérico
 * (66336 → "66.336"; 27.91 → "27,91"). Valores não numéricos passam direto.
 * Copiado de megas-mensal/01_Config.gs — usado pelo Dashboard Operacional.
 */
function formatarNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '' || valor === '-') return '-';
  const s = String(valor).trim();
  if (/[^\d.,\-\s]/.test(s)) return s;   // tem %, h, letras etc. → já formatado
  let n;
  if (s.includes(',')) n = Number(s.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ''));  // "61.245" = milhar pt-BR
  else n = Number(s);
  if (isNaN(n)) return s;
  const temDecimal = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: temDecimal ? 2 : 0,
    maximumFractionDigits: 2
  });
}



// ==========================================
// CONSTANTES DOS SLIDES — reunidas aqui na onda B
// ==========================================
// Estavam espalhadas por nove arquivos: 43 das 81 constantes do projeto
// moravam fora do Config, incluindo TAGs de slide enquanto as outras onze já
// estavam aqui. Ajuste de layout, limite de linhas e tag de slide são
// CONFIGURAÇÃO — mudam sem que a lógica mude, e quem procura por elas procura
// aqui.
//
// O que NÃO veio junto, de propósito: tabelas que são dado interno do próprio
// algoritmo (_CLIENTE_APELIDOS_, LOGOS_CLIENTES, _PROP_DEPENDENCIAS_,
// _DEPS_BACKLOG_CLIENTES_, _PROP_EQUIPE_, _LOGOS_LEGENDA_). Elas só fazem
// sentido ao lado da função que as usa.

// ── de 17_Slide_Contratacoes.gs ───────────────────────
const ABA_CONTRATACOES = 'GESTÃO DE CONTRATAÇÕES';
const TAG_CONTRATACOES      = '【CONTRATACOES_AUTO】';
const TAG_CONTRATACOES_HIST = '【CONTRATACOES_HIST_AUTO】';
const CONTRAT_MAX_LINHAS = 12;
const CONTRAT_FONTE = { colHeader: 7, grupo: 8.5, item: 7, descricao: 7.5 };
// Ordem canônica interna da linha, independente do layout da planilha:
// 0=Imóvel 1=Etapa 2=Objeto 3=Área 4=Responsável 5=Prazo/SLA
// 6=Participantes 7=Visitas 8=Propostas 9=Início
const CONTRAT_LARGURAS = [0.110, 0.115, 0.205, 0.085, 0.085, 0.085, 0.105, 0.080, 0.060, 0.070];

// ── de 16_Slide_RecebimentoObras.gs ───────────────────
const TAG_RECEBIMENTO = '【RECEBIMENTO_AUTO】';
const REC_COLUNAS = [
  { nome: 'Empreendimento', tipo: 'textoCentro', largura: 0.18 },
  { nome: 'Obra',           tipo: 'texto',       largura: 0.40 },
  { nome: 'Pendência',      tipo: 'textoCentro', largura: 0.24 },
  { nome: 'Status',         tipo: 'status',      largura: 0.18 }
];
// Contam sobre a coluna Status (índice 3).
const REC_KPIS = [
  { label: 'TOTAL',     cor: CR_DESIGN_SYSTEM.colors.brandDark,   teste: null },
  { label: 'CONCLUÍDO', cor: CR_DESIGN_SYSTEM.colors.accentGreen, teste: r => /conclu/i.test(_tabV_(r, 3)) },
  { label: 'PENDENTE',  cor: CR_DESIGN_SYSTEM.colors.accentRed,   teste: r => /pendente/i.test(_tabV_(r, 3)) }
];
const REL_RECEBIMENTO = {
  esteio: {
    nome:            'Esteio',
    aba:             'Recebimento de Obras - Esteio',
    titulo:          'RECEBIMENTO DE OBRAS · ESTEIO',
    subtitulo:       'Pendências da Obra · MEGA ESTEIO',
    cabecalhoContem: ['EMPREENDIMENTO', 'PENDÊNCIA', 'PENDENCIA'],
    colunas:         REC_COLUNAS,
    kpis:            REC_KPIS,
    pctTexto:        'concluído',
    testeConcluido:  r => /conclu/i.test(_tabV_(r, 3))
  },

  ctba: {
    nome:            'Curitiba',
    aba:             'Recebimento de Obras - Ctba',
    titulo:          'RECEBIMENTO DE OBRAS · CURITIBA',
    subtitulo:       'Pendências da Obra · MEGA CURITIBA',
    cabecalhoContem: ['EMPREENDIMENTO', 'PENDÊNCIA', 'PENDENCIA'],
    colunas:         REC_COLUNAS,
    kpis:            REC_KPIS,
    pctTexto:        'concluído',
    testeConcluido:  r => /conclu/i.test(_tabV_(r, 3))
  },

  analise: {
    nome:            'Análise de Projetos',
    aba:             'Análise de Projetos',
    titulo:          'ANÁLISE DE PROJETOS',
    subtitulo:       'Recebimento de Obras',
    cabecalhoContem: ['OBJETIVO', 'AVALIADOR', 'LOCAT'],
    // 10 colunas: fonte menor e 7 linhas/slide, para o Objetivo de 2 linhas
    // caber sem transbordar a célula.
    fonte:           7.5,
    fonteHeader:     7.5,
    maxLinhas:       7,
    colunas: [
      { nome: 'Empr.',     tipo: 'textoCentro', largura: 0.085 },
      { nome: 'Locatário', tipo: 'textoCentro', largura: 0.085 },
      { nome: 'Objetivo',  tipo: 'texto',       largura: 0.175 },
      { nome: 'Compl.',    tipo: 'textoCentro', largura: 0.13,  fonte: 6.5 },
      { nome: 'Mem.',      tipo: 'textoCentro', largura: 0.07,  fonte: 6.5 },
      { nome: 'Recebim.',  tipo: 'data',        largura: 0.085, fonte: 6.5 },
      { nome: 'Entrega',   tipo: 'data',        largura: 0.085, fonte: 6.5 },
      { nome: 'Avaliador', tipo: 'textoCentro', largura: 0.11,  maxPalavras: 2 },
      { nome: 'Status',    tipo: 'status',      largura: 0.11 },
      // Prazo é calculado, não lido: concluído → Entrega − Recebimento;
      // em andamento → corre até hoje. Sem isso o prazo de um projeto aberto
      // congela na data em que alguém digitou pela última vez.
      { nome: 'Prazo',     tipo: 'textoCentro', largura: 0.065,
        calcular: r => _recPrazoDias_(_tabV_(r, 5), _tabV_(r, 6), _tabV_(r, 9)) }
    ],
    kpis: [
      { label: 'TOTAL',     cor: CR_DESIGN_SYSTEM.colors.brandDark,    teste: null },
      { label: 'CONCLUÍDO', cor: CR_DESIGN_SYSTEM.colors.accentGreen,  teste: r => /conclu/i.test(_tabV_(r, 8)) },
      { label: 'ANDAMENTO', cor: CR_DESIGN_SYSTEM.colors.accentOrange, teste: r => /andamento/i.test(_tabV_(r, 8)) }
    ],
    pctTexto:       'concluído',
    testeConcluido: r => /conclu/i.test(_tabV_(r, 8))
  }
};

// ── de 14_Slide_Backlog.gs ────────────────────────────
const PROP_BACKLOG_MAX_BARRAS = 14;

// ── de 14_Slide_Backlog.gs ──────────
const BACKLOG_EMERG_MAX_LINHAS = 8;
// "Data Abertura" é 'textoCentro', não 'data': _tabDesenharTabela_ só
// desenha coluna 'data' se o texto bater com dd/mm/AAAA (_tabEhData_,
// 03_Tabelas.gs) — e _histFormatarDataCurta_ (02_Dados.gs) devolve ano com
// 2 dígitos (dd/mm/aa), pra caber na coluna estreita. 'textoCentro' exibe
// o texto como veio, sem essa validação.
const BACKLOG_EMERG_COLUNAS = [
  { nome: 'Empreendimento', tipo: 'textoCentro', largura: 0.20 },
  { nome: 'Descrição',      tipo: 'texto',        largura: 0.53 },
  { nome: 'Data Abertura',  tipo: 'textoCentro',  largura: 0.13 },
  { nome: 'Dias em Aberto', tipo: 'numero',       largura: 0.14 }
];

// ── de 13_Slide_Corretivas.gs ─────────────────────────
// Gráfico de barras — chamados emergenciais em aberto, mês a mês
// (cronológico, mais recente por último). Mesmo desenho de
// megas-mensal/Slide03_Corretivas.gs (_corretivasGraficoEmergencial_).
const PROP_MESES_MIN = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ── de 15_Slide_BacklogClientes.gs ──────────
const _TABELA_LINHA_COR_ = '#E2E8F0';
const _CLIENTE_PALETA_ = ['#1E3A8A', '#0EA5E9', '#F59E0B', '#10B981', '#9333EA', '#D97706'];
const _CLIENTE_COR_OUTROS_ = '#94A3B8';

// ── de 03_Tabelas.gs ───────────────────────────────
// ==========================================
// CONFIGURAÇÃO
// ==========================================
const TAB_MAX_LINHAS = 9;    // linhas por slide antes de paginar

const TAB_FONTE = { colHeader: 9, item: 9, descricao: 8.5, celula: 8.5, badge: 7.5 };
const TAB_CORES = {
  rowAlt1: 'FFFFFF',
  rowAlt2: 'EAF1FB',
  status: {
    ok        : CR_DESIGN_SYSTEM.colors.accentGreen.slice(1),
    pendente  : CR_DESIGN_SYSTEM.colors.accentRed.slice(1),
    aguardando: CR_DESIGN_SYSTEM.colors.accentOrange.slice(1),
    na        : '8A94A6',
    default   : 'C9CFDB'
  }
};

// ── de 02_Dados.gs ─────────────────────────────────
// Nomes EXATOS das abas na planilha BASE DE DADOS — QUADRO REM. Repare no
// espaço em volta do hífen em "BD - PREVENTIVAS": as abas não seguem um
// padrão único, então _propAba_ compara ignorando espaços e pontuação.
const BD_ABA_CORRETIVAS  = 'BD-CORRETIVAS';
const BD_ABA_PREVENTIVAS = 'BD - PREVENTIVAS';
// VERIFICADO contra a planilha de controle do time (aba de fórmulas, blocos
// FACILITIES por Mega): as CANCELADAS ENTRAM na conta. Confronto de 12 casos
// — Curitiba, Itajaí e Esteio, janeiro a abril/2026 — bateu 12/12 sem filtro
// de Estado, e errou em 5 deles ao excluir canceladas:
//
//     Curitiba jan   oficial 197/28   tudo 197/28 ✓   sem canceladas 197/15 ✗
//     Esteio   jan   oficial 197/5    tudo 197/5  ✓   sem canceladas 197/2  ✗
//
// Não é detalhe: são 1.242 canceladas com SLA classificado na base (1.002
// delas "Não cumprido"), ~20% de toda a não-conformidade. Deixar em true
// afastaria o indicador do número oficial.
const SLA_EXCLUIR_CANCELADAS = false;
// JANELA DO MÊS — também verificada nos mesmos 12 casos.
// Vale a DATA DE AGENDAMENTO, não a de fechamento: a preventiva pertence ao
// mês em que estava programada. Pela data de fechamento os números não batem
// (Curitiba jun daria 94,88% em vez do valor da planilha).
// A fórmula da planilha confirma a janela: de "1/1/2026 00:00:00" até
// "31/1/2026 23:59:59", sobre a coluna de agendamento.
const SLA_JANELA_PADRAO = 'inicio';

// ── de Slide_LogosClientes.gs ──────────────────────
const _LOGO_LEGENDA_H_        = 9;    // faixa reservada pra legenda (pt)
const _LOGO_LEGENDA_FS_       = 6;    // fonte da legenda (pt)
const _LOGO_LEGENDA_FOLGA_    = 10;   // folga lateral da caixa de texto (ver abaixo)
const _LOGO_LEGENDA_MIN_BOX_  = 22;   // altura mínima pra caber logo + legenda
// ── TAMANHO PADRÃO DO LOGO (homogeneidade entre slides) ───────────────────
// _insertLogoFit_ faz "contain": a imagem cresce até esbarrar na LARGURA ou
// na ALTURA da caixa, o que vier primeiro. O efeito colateral é justamente a
// falta de homogeneidade que o usuário apontou: numa mesma tabela, um logo
// largo (Mercado Livre, ~4:1) esbarra na largura e sai baixinho, enquanto um
// logo mais quadrado (NTN, HP) esbarra na altura e sai no tamanho cheio —
// duas marcas lado a lado com alturas visivelmente diferentes.
//
// _insertLogoPadrao_ inverte a regra: fixa a ALTURA e deixa a largura variar
// com a proporção de cada marca. Assim todo logo do deck tem exatamente a
// mesma altura visual, independente do formato do arquivo e de qual slide
// está desenhando — que é o que faz a tabela de DOCUMENTAÇÃO LEGAL (a
// referência que o usuário considerou correta) parecer alinhada.
//
// Pra isso funcionar a coluna precisa ser larga o bastante pro logo mais
// largo do acervo caber na altura padrão:
//     larguraDaColuna >= LOGO_ALT_PADRAO * LOGO_RATIO_MAX
// Abaixo disso o logo largo volta a ser limitado pela largura (e sai menor
// que os demais) — por isso as colunas de logo dos slides estão
// dimensionadas a partir de LOGO_LARG_PADRAO.
// Altura ÚNICA pro deck inteiro (tabelas e cards-resumo): a pedido do
// usuário, a mesma marca tem que ter o mesmo tamanho em qualquer página —
// nada de logo maior no resumo e menor na tabela. Uma altura só também
// evita o problema de a faixa de destaque precisar de uma coluna mais larga
// do que o tile comporta (aí o logo largo encolheria e a homogeneidade se
// perderia justamente onde ela é mais visível).
const LOGO_ALT_PADRAO   = 18;   // altura de TODO logo de cliente do deck
const LOGO_RATIO_MAX    = 5;    // logo mais largo do acervo (~5:1)
const LOGO_LARG_PADRAO  = LOGO_ALT_PADRAO * LOGO_RATIO_MAX;   // 90pt


// ── LOGOS DE CLIENTE ──────────────────────────────────────────────────────
// Vieram do antigo Slide_LogosClientes.gs. São tabelas de LOOKUP: mudam
// quando entra um cliente novo, não quando o desenho muda. O comportamento
// (buscar no Drive, encaixar na caixa) ficou em 06_Logos.gs.

const LOGOS_CLIENTES = {
  'Shopee':         '1_5vQjNBWGR8j-e5M94tGobglBTBN1ewH',
  'Mercado Livre':  '1rtesWo8XV5-CMeyLgc6lLaHXgQRWtuz9',
  'Sodexo':         '1391EvxTNYW3q9RCArhoc2earckFLGNSt',
  'Suzano':         '1E4laN6uhI3dgzTDnP9d63OQ3PkLlm36S',
  'NTN':            '12Oxh8itF46nWBefjv6bOUEi7_aYnSO5H',
  'Magnum':         '1StAJIlbMM2S523iuIZlAjuo3oGnPdEqF',
  'Boticario':      '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Calamo':         '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Ativa':          '10-uTna_fhwqozMi8dvn-tzEJ6BhnfUo2',
  'Tornado':        '1Jxwe1oSRlDIR4-Qw0g5fOM_6zo1KHwUZ',
  'Bosch':          '1lh7-yq4HOFHWu6BI_we35khXldFATHg3',
  'HP':             '1LB8AfjJnZFHTKIWGfk0sDoMmZ-Fz_7SI',
  'Damasio':        '1bDprE9vS940Pf04bGqb9OMqhJIypNveU',
  'Magalu':         '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Magazine Luiza': '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Rio Branco':     '1PXQvjnPymFWJhMGFY8JjLOoZaPRYVNxp',
  'Triunfante':     '1UxXcR0T39OMrRzpyaPq7ca-OSWUSTrzD',
  'Daybrasil':      '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'Day Brasil':     '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'JBT':            '1ZoUcwT6-Iv9BknWqoGKgJsyjSq4G1uLc',
  'Domazzi':        '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Flexmodal':      '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Stella':         '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Orizon':         '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'STH':            '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Vm Vinhos':      '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Wine':           '1aoj0mr1Jcut4oXk0tvD5TaZiaK79dF-D',
  'Sigma':          '1eqv7IxU-utU7TkYjOzlM4hQ5QDtoQacu',
  'Pacific':        '1l7G3-cq9viXEMJi8bc0lBUejPJoU6W7i',
  'Domus':          '1VhxvlmFQ27aYiIjdsOJd2VU0s-A6Mg-C',
  'Veloz':          '1-i3nKyGyVWQIFbCO96Ih-5fiV9ZgtDZ2',
  'Demercado':      '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T',
  'DHL':            '1MtKYh79eDwOXw52reQ4WLDEXLGv-cm9z'
  // TornadoLog e outros apelidos sem logo cadastrado aqui caem no fallback
  // de texto (_getClienteLogoBlob_ retorna null) — não fabricamos ID de
  // arquivo pra cliente que não estava no mapa de origem.
};

// ── Legenda embaixo do logo (marcas que dividem o mesmo arquivo) ─────────
// Alguns clientes aparecem sob o logo de OUTRA marca porque compartilham o
// mesmo arquivo no mapa acima — herança do projeto "Controle de Acessos
// Megas", que já mostra a logo do Boticário para o Cálamo. Sem nada escrito
// embaixo, o slide exibe duas empresas diferentes com exatamente a mesma
// imagem e ninguém sabe qual é qual. Nesses casos (e só nesses) o nome curto
// da empresa vai numa legenda logo abaixo do logo.
//
// O casamento é por TRECHO normalizado, igual ao de LOGOS_CLIENTES: o nome
// que chega aqui pode ser o apelido ("Cálamo") ou a razão social inteira
// ("ORIZON COMERCIO DE ALIMENTOS LTDA"), e a legenda tem que mostrar sempre
// o nome curto.
const _LOGOS_LEGENDA_ = [
  { trecho: 'boticario', rotulo: 'Boticário' },   // BPB / O Boticário — ícone
  { trecho: 'calamo',    rotulo: 'Cálamo'    }    // genérico, sem texto próprio: precisa da legenda
  // Domazzi/Flexmodal e Stella/Orizon/STH/Vm Vinhos dividem arquivo (ver
  // LOGOS_CLIENTES acima), mas a pedido do usuário NÃO ganham legenda: os
  // logos de Stella e Domazzi têm o nome escrito na própria imagem (ao
  // contrário do ícone genérico do Boticário), então a legenda embaixo era
  // redundante. Fica registrado aqui que Orizon/STH/Vm Vinhos e Flexmodal
  // continuam mostrando a logo (real) de Stella/Domazzi sem nenhuma marca —
  // se algum desses aparecer num slide, o logo exibido será o da OUTRA
  // empresa, sem aviso.
];
