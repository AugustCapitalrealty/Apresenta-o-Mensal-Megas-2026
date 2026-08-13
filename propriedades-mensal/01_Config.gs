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
  try {
    const logoBlob = DriveApp.getFileById(DS.logoId).getBlob();
    slide.insertImage(logoBlob, W - mX - DS.logoW, 14, DS.logoW, DS.logoH);
  } catch (e) {
    Logger.log('Aviso (Header): logo não carregado. ' + e.message);
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
