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

// Planilha de HISTÓRICO VALIDADO (mantida manualmente pelo time).
// Fonte confiável de evolução de indicadores — usada no lugar dos números
// gravados automaticamente (que podiam sair errados). Ver Suporte_RegistroDados.gs.
const HISTORICO_VALIDADO_ID = '1o6vNzmZPlvil-DefoFZj92KzHBueqddk8wy26Ev2_DI';

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
    reaberturaId   : '1Xudsnn7KEkgGWSZ_kJ4cXpx6CjrJ0UzORHkyUvuCUc0',
    unitLogoId     : '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',   // logo Mega Curitiba
    coBrandLogoId  : '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T',   // logo Demercado
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
    reaberturaId   : '1phOgA2wsbKsGTOMAoytqbpJbUseYQqSZONeap_vOKBc',
    unitLogoId     : '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',   // logo Mega Itajaí
    coBrandLogoId  : '',
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
    reaberturaId   : '18d5bbTGm1_P3BiRsnfqqdh6MfDqiFvGbRI7gB1G4ZL0',
    unitLogoId     : '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',   // logo Mega Esteio
    coBrandLogoId  : '',
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

/**
 * Formata número no padrão brasileiro quando o valor for numérico
 * (66336 → "66.336"; 27.91 → "27,91"). Valores não numéricos passam direto.
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
 * Padroniza o nome de uma rubrica contábil que vem "sujo" da planilha:
 * sentence-case (1ª letra maiúscula, resto minúsculo), corrige acentos de um
 * dicionário de termos contábeis comuns, mantém preposições em minúsculo e
 * siglas conhecidas em maiúsculo. Ex.: 'energia eletrica' → 'Energia elétrica';
 * 'SEGURO' → 'Seguro'; 'manutenção imóveis' → 'Manutenção imóveis';
 * 'iptu' → 'IPTU'.
 */
const RUBRICA_ACENTOS = {
  eletrica: 'elétrica', eletrico: 'elétrico', eletricas: 'elétricas',
  juridica: 'jurídica', juridico: 'jurídico', juridicos: 'jurídicos',
  informatica: 'informática', imoveis: 'imóveis', imovel: 'imóvel',
  moveis: 'móveis', movel: 'móvel', assistencia: 'assistência',
  agua: 'água', condominio: 'condomínio', condominios: 'condomínios',
  seguranca: 'segurança', vigilancia: 'vigilância', manutencao: 'manutenção',
  conservacao: 'conservação', servicos: 'serviços', servico: 'serviço',
  locacao: 'locação', depreciacao: 'depreciação', predios: 'prédios',
  predio: 'prédio', predial: 'predial', tributaria: 'tributária',
  tributarias: 'tributárias', tributos: 'tributos', telefonia: 'telefonia',
  administrativa: 'administrativa', administrativas: 'administrativas',
  utilidades: 'utilidades', combustivel: 'combustível', veiculos: 'veículos',
  refeicao: 'refeição', alimentacao: 'alimentação', comunicacao: 'comunicação',
  reparacao: 'reparação', operacao: 'operação', gestao: 'gestão',
  jardinagem: 'jardinagem', dedetizacao: 'dedetização', energia: 'energia'
};
const RUBRICA_PREPOSICOES = ['de','da','do','das','dos','e','com','sem','a','o','em','para','por','no','na'];
const RUBRICA_SIGLAS = ['IPTU','IPVA','GLP','TI','EPI','EPIS','CIPA','ART','CNPJ','ISS','PIS','COFINS','FGTS','INSS','CPFL','GNV'];

function padronizarRubrica_(txt) {
  let s = String(txt || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return s;

  const semAcento = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const palavras = s.split(' ');

  const out = palavras.map((w, i) => {
    const bare = semAcento(w).toLowerCase();

    // Sigla conhecida → maiúsculo
    if (RUBRICA_SIGLAS.indexOf(bare.toUpperCase()) >= 0) return bare.toUpperCase();

    // Correção de acento pelo dicionário
    let base = RUBRICA_ACENTOS[bare] || w.toLowerCase();

    // Preposição (não sendo a primeira palavra) → minúsculo
    if (i > 0 && RUBRICA_PREPOSICOES.indexOf(bare) >= 0) return base.toLowerCase();

    // 1ª palavra recebe inicial maiúscula; demais ficam minúsculas
    if (i === 0) return base.charAt(0).toUpperCase() + base.slice(1);
    return base;
  });

  return out.join(' ');
}

/**
 * Formata um valor absoluto (R$) como custo por m²: "R$ 4,62/m²".
 * Retorna '' se a área não estiver disponível.
 */
function formatarReaisM2_(valor, area) {
  if (!area || area <= 0 || valor == null || isNaN(valor)) return '';
  const v = valor / area;
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/m²';
}

/**
 * Formata um valor JÁ em R$/m² (ex.: 4,62 → "R$ 4,62/m²"). '' se inválido.
 * Com sinal opcional para variações (+/−).
 */
function formatarRsM2_(v, comSinal) {
  if (v == null || isNaN(v)) return '';
  const abs = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sinal = comSinal ? (v >= 0 ? '+' : '−') : '';
  return sinal + 'R$ ' + abs + '/m²';
}

/**
 * Texto e cor da tendência vs mês anterior a partir de um delta numérico.
 * menorMelhor=true → cair é bom (verde). Retorna { txt:'▲ +1,2', cor }.
 * Sem variação → '▬ 0' cinza. delta null → txt vazio.
 */
function tendenciaTexto_(delta, menorMelhor, neutro) {
  if (delta == null || isNaN(delta)) return { txt: '', cor: CORES.textGray };
  if (delta === 0) return { txt: '▬ 0', cor: CORES.textGray };
  const seta = delta > 0 ? '▲' : '▼';
  const txt  = seta + ' ' + (delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(delta));
  if (neutro) return { txt: txt, cor: CORES.textGray };   // sem juízo de valor
  const bom = menorMelhor ? delta < 0 : delta > 0;
  return { txt: txt, cor: bom ? CORES.cardGreen : CORES.cardRed };
}

/**
 * Cor semântica para percentuais de SLA (regra do boletim):
 * ≥95 verde, ≥90 âmbar, <90 vermelho. Sem número → cor padrão.
 */
function corPorSLA(valor, corPadrao) {
  const n = parseFloat(String(valor == null ? '' : valor).replace('%', '').replace(',', '.'));
  if (isNaN(n)) return corPadrao || CR_DESIGN_SYSTEM.colors.textMain;
  if (n < 90) return CR_DESIGN_SYSTEM.colors.accentRed;
  if (n < 95) return '#F59E0B';
  return CR_DESIGN_SYSTEM.colors.accentGreen;
}

/**
 * Card de KPI padrão (padrão do boletim): card branco com borda fina,
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

  const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y + 6, w - 20, 13);
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
    sub.getText().setText(String(opts.sub)).getTextStyle()
      .setFontSize(8).setBold(true)
      .setForegroundColor(opts.corSub || DS.colors.textBody).setFontFamily(DS.typography.titles);
    fy += 13;
  }
  if (opts.nota) {
    const nota = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, fy, w - 20, 11);
    nota.getText().setText(String(opts.nota)).getTextStyle()
      .setFontSize(6.5).setBold(false)
      .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
  }
}

/**
 * Painel padrão (contêiner de conteúdo): card branco com borda fina, barra
 * lateral e título opcional na cor do tema, com linha divisória.
 * Retorna o Y onde o conteúdo interno deve começar.
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
