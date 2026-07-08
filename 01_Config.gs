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
// PROJETOS POR CIDADE
// ==========================================
// Para gerar a apresentação de outra cidade, troque PROJETO_ATIVO
// para 'CURITIBA', 'ITAJAI' ou 'ESTEIO' e rode o orquestrador.
// ==========================================

const PROJETOS = {
  CURITIBA: {
    nome           : 'Mega Curitiba',
    spreadsheetId  : '160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q',
    presentationId : '1Cd2_D-Ht1nBJJ6dqPcXdvi-osTd_WkMDn3HvRZBdNL0'
  },
  ITAJAI: {
    nome           : 'Mega Itajaí',
    spreadsheetId  : '1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4',
    presentationId : '1kc23ue7SdKFqIZRJdZaE-X5T2BhdE7eZKFRE4zz_bnY'
  },
  ESTEIO: {
    nome           : 'Mega Esteio',
    spreadsheetId  : '1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY',
    presentationId : '15NZFgHNEwuXVijhCFPsNSHnm-cTpXCQho-BuVuG78kc'
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
function criarHeaderPadrao(slide, titulo, subtitulo) {
  const deck = getDeckAtivo();
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
    const logoBlob = DriveApp.getFileById(DS.assets.logoId).getBlob();
    slide.insertImage(logoBlob, W - mX - DS.assets.logoW, 14, DS.assets.logoW, DS.assets.logoH);
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
