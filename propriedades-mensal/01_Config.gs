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

// ==========================================
// TORRE DE MANUTENÇÃO — CONFIGURAÇÃO E DADOS BASE
// ==========================================
// IDs das planilhas online do Google Sheets:
// Torre CR: https://docs.google.com/spreadsheets/d/1BKvWWjFDarUzSa2aop2EJMrlsw3kGgaydHXC_yfsRO8/edit
const TORRE_MANUTENCAO_CR_ID        = '1BKvWWjFDarUzSa2aop2EJMrlsw3kGgaydHXC_yfsRO8';

// Torre Demercado: https://docs.google.com/spreadsheets/d/1DvqLw3EIDerqJhSZedKrx_ZJZ5JWiGIkXXacAgxzLqM/edit
const TORRE_MANUTENCAO_DEMERCADO_ID = '1DvqLw3EIDerqJhSZedKrx_ZJZ5JWiGIkXXacAgxzLqM';

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

// Em cada aba, por mês, duas colunas na ordem acima; depois duas de Total.
// Par = 1ª coluna do mês, ímpar = 2ª. Mês m (0-based) → colunas 2m e 2m+1.
const DRE_COL_TOTAL_A = 24;   // PLANEJAMENTO: Realizado AA · RITMO: Ritmo
const DRE_COL_TOTAL_B = 25;   // PLANEJAMENTO: Planejado    · RITMO: Realizado

// A subárvore que interessa. Só manutenção: o resto do DRE (faturamento,
// pessoal, fiscais) não entra nesta apresentação.
const DRE_CONTA_RAIZ = '06.04.15.01';   // manutenção imóveis

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

const TORRE_MANUTENCAO_COLUNAS_PADRAO = [
  'Imóvel', 'Real 2024', 'Orçamento 2025', 'Ritmo 2025', 'Orçamento 2026', 'Orç 26/Ritmo 25 (%)', 'Orç 26/ Ritmo 25 (R$)'
];

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

function criarHeaderPadrao(slide, titulo, subtitulo) {
  const deck = getDeckMensal_();
  const W  = deck.getPageWidth();
  const DS = CR_DESIGN_SYSTEM;
  const mX = DS.layout.marginX;

  // Grafismo de fundo — elipse suave no canto superior direito (assinatura do boletim)
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 350, -80, 450, 450);
  ellipse.getFill().setSolidFill(DS.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  // Barra de destaque à esquerda do título
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mX, 13, 5, 36);
  bar.getFill().setSolidFill(DS.colors.brandLight);
  bar.getBorder().setTransparent();

  // Título
  const txt1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 6, W - mX - 200, 30);
  txt1.getText().setText(titulo).getTextStyle()
    .setFontSize(19).setBold(true)
    .setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  // Subtítulo
  if (subtitulo) {
    const txt2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 34, W - mX - 200, 18);
    txt2.getText().setText(subtitulo).getTextStyle()
      .setFontSize(9.5).setBold(false)
      .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
  }

  // Logo no canto superior direito (não quebra a geração se indisponível)
  if (typeof _propDriveAppDisponivel === 'undefined' || _propDriveAppDisponivel) {
    try {
      const logoBlob = DriveApp.getFileById(DS.logoId).getBlob();
      slide.insertImage(logoBlob, W - mX - DS.logoW, 14, DS.logoW, DS.logoH);
    } catch (e) {
      _propDriveAppDisponivel = false;
      Logger.log('Aviso (Header): logo não carregado via DriveApp (' + e.message + ').');
    }
  }

  // Linha separadora de largura total + segmento de destaque
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 62, W, 62);
  sep.getLineFill().setSolidFill(DS.colors.lines);
  sep.setWeight(1);

  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, mX, 62, mX + 110, 62);
  acc.getLineFill().setSolidFill(DS.colors.brandLight);
  acc.setWeight(3);
}

/**
 * Card de KPI padrão (padrão do boletim/Megas): card branco com borda fina,
 * barra lateral colorida, label pequeno em cima e valor grande embaixo.
 *
 * opts = {
 *   label    : rótulo pequeno superior (obrigatório)
 *   valor    : valor em destaque (obrigatório)
 *   cor      : cor da barra lateral (default brandLight)
 *   corValor : cor do valor (default = cor da barra)
 *   tamValor : tamanho da fonte do valor (default 22)
 *   sub      : linha auxiliar sob o valor, ex.: '▲ 1,2 (+4%)' (opcional)
 *   corSub   : cor da linha auxiliar (default textBody)
 *   nota     : nota menor sob a linha auxiliar, ex.: 'vs mês anterior' (opcional)
 * }
 */
function criarCardKPI(slide, x, y, w, h, opts) {
  const DS = CR_DESIGN_SYSTEM;
  const corBarra = opts.cor || DS.colors.brandLight;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(corBarra);
  side.getBorder().setTransparent();

  // +10pt de folga à direita: vence o recuo interno do TEXT_BOX pra rótulos
  // mais longos (ex.: "SLA RECEBIMENTO DE OBRAS") não quebrarem em duas
  // linhas à toa — a caixa não tem borda própria, então a folga é invisível.
  const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 6, w - 20 + 10, 13);
  lbl.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  lbl.getText().setText(String(opts.label)).getTextStyle()
    .setFontSize(7.5).setBold(true)
    .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);

  // Área do valor ocupa o meio; sub/nota reservam o rodapé do card
  const footH = (opts.sub ? 13 : 0) + (opts.nota ? 11 : 0);
  const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 18, w - 20, h - 22 - footH);
  val.getText().setText(String(opts.valor)).getTextStyle()
    .setFontSize(opts.tamValor || 22).setBold(true)
    .setForegroundColor(opts.corValor || corBarra)
    .setFontFamily(DS.typography.titles);
  val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  let fy = y + h - footH - 4;
  if (opts.sub) {
    const sub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, fy, w - 20, 13);
    sub.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    sub.getText().setText(String(opts.sub)).getTextStyle()
      .setFontSize(8).setBold(true)
      .setForegroundColor(opts.corSub || DS.colors.textBody).setFontFamily(DS.typography.titles);
    fy += 13;
  }
  if (opts.nota) {
    const nota = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, fy, w - 20, 11);
    nota.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    nota.getText().setText(String(opts.nota)).getTextStyle()
      .setFontSize(6.5).setBold(false)
      .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
  }
}

/**
 * Painel padrão (contêiner de conteúdo): card branco com borda fina, barra
 * lateral e título opcional na cor do tema, com linha divisória. Retorna o Y
 * onde o conteúdo interno deve começar. Copiado de megas-mensal/01_Config.gs
 * (mesmo desenho) — usado pelo grid 2×2 do Dashboard Operacional
 * (Slide_IndicadoresGerais.gs).
 */
function criarCardPainel(slide, x, y, w, h, titulo, cor) {
  const DS = CR_DESIGN_SYSTEM;
  const corTema = cor || DS.colors.brandLight;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(corTema);
  side.getBorder().setTransparent();

  if (titulo) {
    // Marcador quadrado na cor do tema antes do título (substitui emojis)
    const marca = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 14, y + 11, 7, 7);
    marca.getFill().setSolidFill(corTema);
    marca.getBorder().setTransparent();

    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 27, y + 6, w - 37, 18);
    t.getText().setText(String(titulo)).getTextStyle()
      .setFontSize(10).setBold(true)
      .setForegroundColor(corTema).setFontFamily(DS.typography.titles);

    const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 14, y + 26, w - 28, 1);
    div.getFill().setSolidFill(DS.colors.lines);
    div.getBorder().setTransparent();
    return y + 32;
  }
  return y + 10;
}

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

/**
 * Cor semântica para percentuais de SLA (regra do boletim):
 * ≥95 verde, ≥90 âmbar, <90 vermelho. Sem número → cor padrão.
 * Copiado de megas-mensal/01_Config.gs — usado pelo Dashboard Operacional.
 */
function corPorSLA(valor, corPadrao) {
  const n = parseFloat(String(valor == null ? '' : valor).replace('%', '').replace(',', '.'));
  if (isNaN(n)) return corPadrao || CR_DESIGN_SYSTEM.colors.textMain;
  if (n < 90) return CR_DESIGN_SYSTEM.colors.accentRed;
  if (n < 95) return '#F59E0B';
  return CR_DESIGN_SYSTEM.colors.accentGreen;
}
