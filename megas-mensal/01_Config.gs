/**
 * ARQUIVO: 01_Config.gs
 * SEÇÃO:   NÚCLEO — Configuração, Design System e Empreendimentos
 * DESCRIÇÃO: Tokens de design (CR_DESIGN_SYSTEM, CORES), cadastro oficial
 *            dos empreendimentos (PROJETOS), IDs de planilhas e controle do
 *            projeto ativo em tempo de execução.
 */

/**
 * ARQUIVO: 01_Config.gs
 * SEÇÃO:   NÚCLEO — Configuração e Design System
 * DESCRIÇÃO: Design system Capital Realty (portado do Boletim-2026),
 *            projetos por cidade e componentes visuais padrão.
 */

// ==========================================
// DESIGN SYSTEM — CAPITAL REALTY
// ==========================================
// Portado do Boletim Propriedades & Facilities (repo Boletim-2026).
// Fonte única de verdade visual: os slides consomem estes tokens
// diretamente ou através do objeto legado CORES (mais abaixo).
// ==========================================
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark:  '#151E49',  // azul institucional — títulos, barras escuras
    brandMed:   '#003D7B',  // azul médio — bandas de grupo, subtítulos fortes
    brandLight: '#065CA9',  // azul claro — accent principal, barras laterais
    brandSoft:  '#93C5FD',  // azul suave — séries secundárias de gráfico
    bgSlide:    '#F8FAFC',  // fundo padrão dos slides
    cardBg:     '#FFFFFF',  // fundo de cards e molduras de gráfico
    textMain:   '#151E49',  // texto principal
    textBody:   '#475569',  // texto de apoio / corpo
    lines:      '#E2E8F0',  // bordas de card e linhas separadoras
    accentGreen:  '#10B981',  // status positivo
    accentOrange: '#F97316',  // status de atenção
    accentRed:    '#EF4444'   // status negativo
  },
  typography: {
    titles: 'Montserrat',
    body:   'Open Sans'
  },
  layout: {
    marginX: 30,   // margem lateral padrão dos slides
    headerH: 64    // altura reservada pelo cabeçalho padrão
  },
  assets: {
    logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',  // logo Capital Realty (mesmo do boletim)
    logoW: 112,
    logoH: 32
  }
};

// ==========================================
// LOGOS OFICIAIS CAPITAL REALTY (todas as versões)
// ==========================================
// Enviadas pela marca. Regra de uso:
//   ▸ Negativo (logo branco)  → fundos ESCUROS (capas). É o que as capas usam.
//   ▸ Positivo (logo escuro)  → fundos CLAROS.
//   ▸ Color (colorido)        → fundos claros, versão institucional.
//   ▸ full  = símbolo + texto  | abrev = só o símbolo (marca reduzida).
// As inserções preservam a proporção da imagem (nunca distorcem).
const LOGOS_CR = {
  abrevColor:    '1elIm5tGMsZqgSBgUcag5BrG5XGpcMZs5',
  abrevNegativo: '1rQVs8LALoWb-gVVYoieDooqFpsOjjOVC',
  abrevPositivo: '1JPDHRzRwvqRvzsl8Cf6AOkm3GEr7SJfd',
  fullColor:     '1toRVfIgamy4CWBT2Gv2mGd6V_W0OGISS',
  fullNegativo:  '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p',
  fullPositivo:  '1XqFtIobiEq7VC2H41sKnFNUuOluw_J4V'
};

// ==========================================
// FOTOS DAS CAPAS DE SEÇÃO (por categoria — Slide_CapaSecao.gs)
// ==========================================
// Uma foto por CATEGORIA, compartilhada pelas 3 cidades (chave = linha2 do
// título da capa de seção, ver as chamadas gerarCapaSecao em 00_Main.gs).
// Categoria sem entrada aqui cai no capaFotoId da cidade (legado) e, por
// fim, no fundo escuro premium padrão — nunca quebra a geração.
const FOTOS_SECAO = {
  PREVENTIVA:   '1iC0svCXk7jSddAc65Eg0VMjjPtEHJErW',   // trocada (a de drone 25 MB era inválida no Slides)
  CORRETIVA:    '1e1nddV6U0KDrAYRMT16s54LAuKRBCC2g',
  CONTRATADOS:  '1SyVowumHac9e3PxDcmHhwFnfVU4K0hph',
  INTERNOS:     '1mP_ousYFrNSDV8rwPhPtXdYoOEYaW_3Z',
  PATRIMONIAL:  '1kua0uho-3-yzLtE4IR2y_epaBYtKttsx',
  OPERACIONAL:  '1kXwwPWzU6pimR9vSXY6I5M7eNgNjDC_h',
  UTILITIES:    '16DLJAVLl8xOsRr8Nhi_OTmnXcEx-URVB',   // só Mega Curitiba — geração/consumo de energia
  SUSTENTAVEL:  '1Sq519lQhsvqVgC1V9w4yVMbIjSDqIVu1',   // Mega Itajaí e Mega Esteio — Gestão Sustentável
  DOCUMENTACAO: '1fA13cXRur_UbMtLAjRYGbOyjaauNiOZ0'
};


// ==========================================
// PROJETOS POR CIDADE
// ==========================================
// Para gerar a apresentação de outra cidade, troque PROJETO_ATIVO
// para 'CURITIBA', 'ITAJAI' ou 'ESTEIO' e rode o orquestrador.
// ==========================================

// Planilha de HISTÓRICO VALIDADO (mantida manualmente pelo time).
// Fonte confiável de evolução de indicadores — usada no lugar dos números
// gravados automaticamente (que podiam sair errados). Ver Suporte_RegistroDados.gs.
const HISTORICO_VALIDADO_ID = '1o6vNzmZPlvil-DefoFZj92KzHBueqddk8wy26Ev2_DI';

// Planilha "BASE DE DADOS — QUADRO REM" — aba BD-CORRETIVAS, histórico bruto
// de TODOS os chamados corretivos desde 2021 (multi-empreendimento, não só
// os 3 Megas). Fonte pro Backlog de Clientes — Operação (chamados de
// cliente que NÃO são responsabilidade do locatário) — ver 02_Dados.gs,
// _lerBdCorretivasChamadosClientes_.
const BD_CORRETIVAS_ID = '1YlNZK_SdS_VTSPWzqOn_cYs1PjM5BO-VWgqSp-YpcVo';

// As colunas GERAL/FACILITIES/PROPERTY/LOCATÁRIO da aba BACKLOG eram
// digitadas à mão, enquanto o fluxo (criados/fechados) passou a ser contado
// na BD-CORRETIVAS. Com fontes diferentes, a conta não fechava: JUL/26 saiu
// com 29 criados e 29 fechados e o backlog subindo de 206 para 220.
// Recalculando as quatro da mesma base, a identidade
//     backlog(fim) = backlog(início) + criados − fechados
// passa a valer por construção.
//
// false volta a usar os valores digitados. A comparação continua indo pro
// Logger nos dois modos (BACKLOG_LOGAR_COMPARACAO_BD), pra dar pra auditar
// sem trocar os números do deck.
const BACKLOG_RECALCULAR_DA_BD    = true;
const BACKLOG_LOGAR_COMPARACAO_BD = true;

// Planilha do sistema irmão "Gestão à Vista TV" — já mantém a aba METAS
// (Mega | Papel | Título | Descrição | Pontos | ...) todo mês para os
// painéis de TV. O slide de Metas lê direto daqui: nada novo para
// preencher, evita duplicar o trabalho mensal. Ver Slide_Metas.gs.
const GESTAO_TV_METAS_SPREADSHEET_ID = '1XrgKQENISyM_cO7xslUQZrmCiZpRJ0UU512FQF1WiRA';

// Planilha do sistema "Controle de Acessos — Megas" (repo próprio). É a fonte
// AUTORITATIVA dos dados de acesso — aba "Dados" no formato
//   Mês (MM/AAAA) | Empreendimento | Fluxo Total | ...
// (mantida todo mês para o relatório dedicado de acessos). Usada para desenhar
// a Evolução dos Acessos. Se indisponível, cai no HISTORICO_VALIDADO_ID.
const ACESSOS_SPREADSHEET_ID = '1tl-7wR_vpIbybUh5Jvit0vO52Qg6ocoPv-K-pY_KI50';

// capaFotoId (opcional): ID de uma imagem no Drive usada como fundo das
// capas de seção da cidade. Sem ele, as capas usam o fundo escuro padrão.
//
// reaberturaId (opcional): planilha "MEGA <CIDADE> FACILITIES" com a aba
// "TAXA DE ABERTURA" (linhas FECHADOS/REABERTOS por mês) — fonte da meta
// TAXA DE REABERTURA do Analista (ver obterDadosTaxaReabertura_ em
// 02_Dados.gs). Sem ele, a meta cai no valor da planilha da TV.
//
// ppcId (opcional): planilha "PPC MEGA <CIDADE> 2026" com a aba "DASHBOARD"
// (linha 4 = mês, linha 7 = aderência % mensal, linha 8 = meta %, linha 9 =
// acumulado %) — fonte da parte "% das manutenções planejadas" da meta
// composta Custo M² (ver obterDadosPPC_ em 02_Dados.gs). Sem ele, essa parte
// cai no valor digitado manualmente na planilha da TV.
//
// unitLogoId (opcional): logo do próprio Mega (mesmos IDs do repositório
// da Gestão à Vista TV — Config.gs, UNITS[].unitLogoId).
// coBrandLogoId (opcional): logo da marca-mãe do empreendimento quando NÃO
// é a Capital Realty (ex.: Mega Curitiba pertence à Demercado). Nos outros
// (Itajaí/Esteio) a marca-mãe já É a Capital Realty — mesmo logo do
// cabeçalho padrão — então fica em branco.
const PROJETOS = {
  CURITIBA: {
    nome           : 'Mega Curitiba',
    spreadsheetId  : '160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q',
    presentationId : '1Cd2_D-Ht1nBJJ6dqPcXdvi-osTd_WkMDn3HvRZBdNL0',
    capaFotoId     : '',
    // Foto de fundo da CAPA (hero) — entra full-bleed com véu azul 50%.
    // Reaproveitada do repo "Controle de Acessos Megas" (mesma foto usada
    // lá nos divisores de seção). A foto de drone que você mandou (31 MB)
    // estourava o limite do Slides ("imagem inválida ou corrompida"); se
    // quiser usar ela mesmo assim, me manda comprimida (~1920px, poucos
    // MB) que eu troco.
    fotoFundoId    : '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',
    reaberturaId   : '1Xudsnn7KEkgGWSZ_kJ4cXpx6CjrJ0UzORHkyUvuCUc0',
    ppcId          : '1a5OlMoeFtgsKagPlmPr-5UTXXBVufczUzDVSQvUe4Zo',   // PPC Mega Curitiba 2026
    unitLogoId     : '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',   // logo Mega Curitiba
    coBrandLogoId  : '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T',   // logo Demercado
    // Pasta-raiz de FOTOS (FOTOS - APRESENTAÇÕES). A automação busca
    // subpastas por nome (CONTRATADOS/INTERNOS/COMPLEMENTOS), depois dentro
    // de cada uma a subpasta do mês de referência (ex.: "06-JUNHO"), e dentro
    // do mês as subpastas de serviço com as fotos. Sem pasta-raiz, cai no slide
    // manual. Ver gerarSlidesFotosDrive_ em Slide_ServicosContratados.gs.
    fotosRaizId    : '196ZBgMBAv3lLOjebEu2c37UaZIDHjBxb',
    contatos       : [
      { nome: 'Mauro Coelho',          cargo: 'Supervisor de Facilities' },
      { nome: 'Felipe Eduardo Campos', cargo: 'Analista de Facilities' }
    ]
  },
  ITAJAI: {
    nome           : 'Mega Itajaí',
    spreadsheetId  : '1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4',
    presentationId : '1kc23ue7SdKFqIZRJdZaE-X5T2BhdE7eZKFRE4zz_bnY',
    capaFotoId     : '',
    // Foto de fundo da CAPA — reaproveitada do Controle de Acessos (mesmo
    // padrão do Curitiba).
    fotoFundoId    : '1TwANLdubJUHjcW8WpWRRR5gRv2Sty10K',
    reaberturaId   : '1phOgA2wsbKsGTOMAoytqbpJbUseYQqSZONeap_vOKBc',
    ppcId          : '10wfrx335OaBeTuPcXIg42Wk6U6NsMNt4f97QwGT3hZU',   // PPC Mega Itajaí 2026
    unitLogoId     : '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',   // logo Mega Itajaí
    coBrandLogoId  : '',
    // Pasta-raiz de FOTOS — subpastas por seção são descobertas pelo nome
    // (CONTRATADOS/INTERNOS/COMPLEMENTOS), depois a subpasta do mês dentro de cada uma.
    fotosRaizId    : '1OaPX5AC9jk5rXHcCbF1SFFfYVwA-RB5e',
    logoEnergiaId  : '1QLHR8LPZ_VGeCitL4n0hy4wcpFjfCKkk',
    logoAguaId     : '1xF9sj8CRfUsLe_5BMaZCtRWNpPz8IaOp',
    contatos       : [
      { nome: 'Dionatan Rek',     cargo: 'Supervisor de Facilities' },
      { nome: 'Amanda de Campos', cargo: 'Analista de Facilities' }
    ]
  },
  ESTEIO: {
    nome           : 'Mega Esteio',
    spreadsheetId  : '1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY',
    presentationId : '15NZFgHNEwuXVijhCFPsNSHnm-cTpXCQho-BuVuG78kc',
    capaFotoId     : '',
    // Foto de fundo da CAPA — idem Itajaí.
    fotoFundoId    : '1ed2NujxpCBkk6tMDBC0h3LwB9wu6NEVA',
    reaberturaId   : '18d5bbTGm1_P3BiRsnfqqdh6MfDqiFvGbRI7gB1G4ZL0',
    ppcId          : '1I9DWcd8HXVRkjcv8eTk4UdQ5IZRuqUhFikw8tVfPt2c',   // PPC Mega Esteio 2026
    unitLogoId     : '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',   // logo Mega Esteio
    coBrandLogoId  : '',
    // Imóveis de OUTRO centro de custo que contam como Mega Esteio — só a
    // partir de `desde` (data de agendamento da preventiva / data de reporte
    // do chamado). Antes disso ficam fora, como o Posto Esteio sempre fica.
    // Regra do gestor, 06/10/2026. `nome` é procurado (sem acento, maiúsculo)
    // no Centro de Custos/Edifício/Local. Ver _rowPertenceAoMega_ (02_Dados.gs).
    agregados      : [
      { nome: 'MONOUSUARIO ESTEIO II', desde: '2026-01-01' },
      { nome: 'FRIOZEM',               desde: '2026-01-01' }
    ],
    fotosRaizId    : '1CQqkWhiAcA6E4o0PIGaobSF18TIEo4jU',
    // Logos das concessionárias, mostradas nos gráficos de Gestão de
    // Utilities (Slide_Utilities.gs) — opcional, some sem quebrar se vazio.
    logoEnergiaId  : '1wPWU_JPxIv3cEYs8iKRKpE9xjhr0Dvty',   // RGE
    logoAguaId     : '1LmweZVaJGvd1etINot2HBEuVt1aB-DpK',   // CORSAN
    // Planilha EXTERNA do sistema de gestão predial (fora do padrão das
    // outras — não é a spreadsheetId da cidade), aba "BDMEDI": lançamentos
    // brutos de medições de campo (data/hora + texto livre em "Medição").
    // Só Mega Esteio tem monitoramento de Pluviômetro e Canal de Drenagem
    // por enquanto. Ver obterDadosMonitoramentoEsteio_ em 02_Dados.gs.
    monitoramentoId: '1YlNZK_SdS_VTSPWzqOn_cYs1PjM5BO-VWgqSp-YpcVo',
    contatos       : [
      { nome: 'José Ernesto', cargo: 'Responsável Facilities' }
    ]
  }
};

// Projeto ativo é setado em tempo de execução pelas funções do 00_Main.gs
// (gerarCuritiba, gerarItajai, gerarEsteio, gerarTodas, etc.)
let _projetoAtivoChave = null;

function setProjetoAtivo(chave) {
  if (!PROJETOS[chave]) throw new Error('Projeto inválido: ' + chave + '. Use CURITIBA, ITAJAI ou ESTEIO.');
  _projetoAtivoChave = chave;
  Logger.log('▸ Projeto ativo: ' + PROJETOS[chave].nome);
}

function getProjetoAtivo() {
  if (!_projetoAtivoChave) {
    throw new Error('Nenhum projeto ativo. Rode uma função do 00_Main.gs (gerarCuritiba, gerarItajai, gerarEsteio ou gerarTodas).');
  }
  return PROJETOS[_projetoAtivoChave];
}

function getSpreadsheetIdAtivo()  { return getProjetoAtivo().spreadsheetId;  }
function getPresentationIdAtivo() { return getProjetoAtivo().presentationId; }

// Abre sempre a apresentação da cidade ativa, independente de qual estiver aberta no editor
function getDeckAtivo() {
  return SlidesApp.openById(getPresentationIdAtivo());
}


// ==========================================
// PALETA LEGADA (COMPATIBILIDADE)
// ==========================================
// As chaves são mantidas porque todos os slides as referenciam;
// os valores agora derivam do CR_DESIGN_SYSTEM acima.
// ==========================================
const CORES = {
  // Cores Base
  darkBlue:   CR_DESIGN_SYSTEM.colors.brandDark,
  mediumBlue: CR_DESIGN_SYSTEM.colors.brandMed,
  lightBlue:  CR_DESIGN_SYSTEM.colors.brandLight,
  softBlue:   CR_DESIGN_SYSTEM.colors.brandSoft,
  bgSlide:    CR_DESIGN_SYSTEM.colors.bgSlide,
  white: '#FFFFFF', shadow: '#D1D5DB',
  textHeader: '#FFFFFF',
  textDark:   CR_DESIGN_SYSTEM.colors.textMain,
  textGray:   CR_DESIGN_SYSTEM.colors.textBody,
  textPrev:   '#9CA3AF',
  lineSeparator: CR_DESIGN_SYSTEM.colors.lines,

  // --- CORES TEMÁTICAS (SLIDE 01 - DASHBOARD) ---
  themeAtivos: '#1E3A8A', // 1. AZUL (Forte/Institucional)
  themePrev:   CR_DESIGN_SYSTEM.colors.accentGreen, // 2. VERDE (Sucesso/Preventiva)
  themeCorr:   '#F59E0B', // 3. AMARELO (Alerta/Corretiva) - Tom Âmbar para leitura
  themeAcesso: '#0EA5E9', // 4. AZUL CLARO (Céu/Acesso)

  // Cores Específicas Slide 02 - Preventivas (Mantive compatibilidade)
  cardBlue:  CR_DESIGN_SYSTEM.colors.brandLight,
  cardGreen: CR_DESIGN_SYSTEM.colors.accentGreen,
  cardRed:   CR_DESIGN_SYSTEM.colors.accentRed,
  textPurple: '#9333EA', textOrange: '#D97706'
};


// ==========================================
// COMPONENTES VISUAIS PADRÃO
// ==========================================

/**
 * Cabeçalho padrão — estilo "aberto" do boletim: título escuro sobre fundo
 * claro com barra de destaque, subtítulo, logo à direita e linha separadora.
 * Ocupa a mesma faixa vertical do header antigo (0 a ~64pt), então os slides
 * existentes não precisam reposicionar conteúdo.
 */
