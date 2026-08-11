/**
 * Identidade visual Capital Realty — conforme brandbook oficial.
 * Tema claro. Slide padrão do Google Slides: 720 x 405 pt (16:9).
 */

const THEME = {
  // cores oficiais do brandbook
  navy: '#151E49',        // PANTONE 2768 C — títulos e textos principais
  blueMid: '#003D7B',     // PANTONE 2186 C — apoio
  blue: '#065CA9',        // PANTONE 2175 C — cor de destaque principal

  // derivadas para o tema claro (tints permitidos pelo brandbook:
  // "são permitidos gradientes e transparências parciais das cores")
  bg: '#FFFFFF',
  bgSoft: '#F2F6FB',      // painéis e cards
  bgTint: '#E3EDF7',      // faixas de apoio
  lightBlue: '#B9CFE8',   // séries secundárias de gráficos

  // semáforo (pills de variação)
  green: '#0E8A5F',
  red: '#C2403F',

  // dourado — selo de recorde / conquista
  gold: '#B8860B',

  // neutros
  textMuted: '#5E6B85',
  gray: '#D9D9D9',
  white: '#FFFFFF',

  // Gotham é a fonte oficial; Montserrat é o substituto disponível no Google
  font: 'Montserrat',
};

const PAGE = {
  W: 720,
  H: 405,
  MARGIN: 44,
};

// Logos oficiais hospedadas no Google Drive (PNG positivo p/ fundo claro)
const LOGOS = {
  completa: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4',   // Capital Realty + assinatura
  abreviada: '18NcYD-VyWmkc3oSkIar3loMk55UCSm01',  // símbolo CR
  branca: '14Z4ofw4SwUU342UpTzDSwx1gmmiWUmkD',     // versão branca p/ fundo escuro
};

// Cor fixa de cada Mega — usada em todos os gráficos para leitura consistente
const MEGA_COLORS = {
  'Mega Curitiba': '#003D7B',  // blueMid
  'Mega Itajaí': '#065CA9',    // blue
  'Mega Esteio': '#5B8DB8',    // azul médio — legível em fundo branco
};

// Logo de cada empreendimento — fixada no canto superior direito de todos os
// slides que tratam de um Mega específico (Destaques, Clientes, Divisor…).
const LOGOS_MEGA = {
  'Mega Curitiba': '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',
  'Mega Itajaí':   '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',
  'Mega Esteio':   '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',
};

// Logos dos clientes (Google Drive) — exibidas nos cards de indicadores individuais.
// Chave: nome parcial do cliente (case-insensitive prefix match).
const LOGOS_CLIENTES = {
  'Shopee':        '1_5vQjNBWGR8j-e5M94tGobglBTBN1ewH',
  'Mercado Livre': '1rtesWo8XV5-CMeyLgc6lLaHXgQRWtuz9',
  'Sodexo':        '1391EvxTNYW3q9RCArhoc2earckFLGNSt',
  'Suzano':        '1E4laN6uhI3dgzTDnP9d63OQ3PkLlm36S',
  'NTN':           '12Oxh8itF46nWBefjv6bOUEi7_aYnSO5H',
  'Magnum':        '1StAJIlbMM2S523iuIZlAjuo3oGnPdEqF',
  'Boticario':     '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Calamo':        '1VLZirUEmMoBsI5fX3wFDiSMoPdms_4La',
  'Ativa':         '10-uTna_fhwqozMi8dvn-tzEJ6BhnfUo2',
  'Tornado':       '1Jxwe1oSRlDIR4-Qw0g5fOM_6zo1KHwUZ',
  'Bosch':         '1lh7-yq4HOFHWu6BI_we35khXldFATHg3',
  'HP Trade':      '1LB8AfjJnZFHTKIWGfk0sDoMmZ-Fz_7SI',
  'Damasio':       '1bDprE9vS940Pf04bGqb9OMqhJIypNveU',
  'Magalu':        '1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Magazine Luiza':'1R1NXo3r04uQQgKnEQUZoZZlBHh9HuiOU',
  'Rio Branco':    '1PXQvjnPymFWJhMGFY8JjLOoZaPRYVNxp',
  'Logistico Esteio':   '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',
  'Logistico Itajai':   '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',
  'Logistico Curitiba': '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',
  'Obra Esteio':   '18NcYD-VyWmkc3oSkIar3loMk55UCSm01',
  'Triunfante':    '1UxXcR0T39OMrRzpyaPq7ca-OSWUSTrzD',
  'Daybrasil':     '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'Day Brasil':    '1W2EKA5TFa-I9pWudmwarSpAFqsNf-Yod',
  'JBT':           '1ZoUcwT6-Iv9BknWqoGKgJsyjSq4G1uLc',
  'Domazzi':       '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Flexmodal':     '1lq-ALGuWn793yd613WIyG35Nh-ejIfTt',
  'Stella':        '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Orizon':        '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'STH':           '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Vm Vinhos':     '1G6D0j4-9p_7iPb4N2-BhO_RfKP2NOxNu',
  'Wine':          '1aoj0mr1Jcut4oXk0tvD5TaZiaK79dF-D',
  'Sigma':         '1eqv7IxU-utU7TkYjOzlM4hQ5QDtoQacu',
  'Pacific':       '1l7G3-cq9viXEMJi8bc0lBUejPJoU6W7i',
  'Domus':         '1VhxvlmFQ27aYiIjdsOJd2VU0s-A6Mg-C',
  'Veloz':         '1-i3nKyGyVWQIFbCO96Ih-5fiV9ZgtDZ2',
  'Demercado':     '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T',
};

// Ajuste de tamanho do logo por cliente (1 = padrão). Útil quando o arquivo
// tem muita margem interna e renderiza pequeno.
const LOGOS_CLIENTES_ESCALA = {
};

// Clientes cujo logo deve aparecer junto com um sublabel.
// null = derivar automaticamente (tudo antes do primeiro ' - ').
// string = texto fixo a exibir abaixo do logo.
const LOGOS_CLIENTES_COM_NOME = {
  'Obra Esteio': null,
  'Demercado':   null,
  'Calamo':      'Cálamo',
  'SOC':         'SOC',
  'Hub':         'Hub',
  'Boticario':   'E-commerce',
};

// Posição do sublabel para clientes específicos: 'above' (acima do logo) ou
// 'beside' (ao lado, padrão — não precisa listar aqui).
const LOGOS_CLIENTES_SUBLABEL_POS = {
  'SOC':       'above',
  'Calamo':    'above',
  'Boticario': 'above',
  'Demercado': 'above',
};

// Fotos dos empreendimentos (Google Drive) — fundo dos slides divisores de seção.
// Para atualizar: substitua o ID do arquivo correspondente no Drive.
const FOTOS_MEGA = {
  'Mega Curitiba': '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',
  'Mega Itajaí':   '1TwANLdubJUHjcW8WpWRRR5gRv2Sty10K',
  'Mega Esteio':   '1ed2NujxpCBkk6tMDBC0h3LwB9wu6NEVA',
};

// Fotos usadas em seções fixas da apresentação (fora dos empreendimentos):
// fundo do divisor "Cenário geral" e painel do slide "Índice".
const FOTOS_SECAO = {
  'Cenário geral': '1M5463zWAsXLRMnlsVJSq3-V4B7u8a7LO',
  'Índice':        '1VlqmBxtaoWmtQK3ah2Z7XHtEsGfNWXWg',
};

// Interruptor-mestre do selo "RECORDE DE ACESSOS". O recorde em si é
// DETECTADO AUTOMATICAMENTE por empreendimento (fluxo do mês × todo o
// histórico da aba Dados): o selo só aparece nos Megas que realmente
// bateram o próprio recorde no mês. Coloque false para nunca exibir.
var RECORDE_ACESSOS = true;

// var (não const) para que lerPlanilha() possa atualizar os rótulos
// dinamicamente a partir das linhas da planilha de dados.
var MESES_LABEL = [
  'ABR/25', 'MAI/25', 'JUN/25', 'JUL/25', 'AGO/25', 'SET/25', 'OUT/25',
  'NOV/25', 'DEZ/25', 'JAN/26', 'FEV/26', 'MAR/26', 'ABR/26',
];
