/**
 * ARQUIVO: Config.gs
 * DESCRIÇÃO: Design System e Configuração Multi-Unidades e Multi-Marcas.
 */

const ID_PLANILHA = "1XrgKQENISyM_cO7xslUQZrmCiZpRJ0UU512FQF1WiRA";

// Planilha "HISTORICO GERENCIAL" (mesma usada pela Apresentação Mensal dos
// Megas) — série mensal por Empreendimento/Indicador, usada só para calcular
// a tendência (▲/▼) vs mês anterior nos indicadores automáticos do slide de
// Metas. Ausência/erro nessa planilha nunca quebra o slide (a tendência
// simplesmente não aparece).
const HISTORICO_VALIDADO_ID = "1o6vNzmZPlvil-DefoFZj92KzHBueqddk8wy26Ev2_DI";

// Portal de Solicitações (app Lovable, repo AugustCapitalrealty/megas-adc1ba20):
// função `kanban-megas` que devolve as solicitações em andamento de um Mega,
// já separadas nas quatro colunas do kanban. A chave NÃO fica no código: vai
// nas Propriedades do script como PORTAL_API_KEY (a mesma do secret
// RELATORIOS_API_KEY no portal). Ver 09_Slide_Solicitacoes.gs.
const PORTAL_KANBAN_URL = "https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/kanban-megas";
// Mesmo portal, mesma chave: contratos em andamento no Webdox (10_Slide_Webdox.gs).
const PORTAL_WEBDOX_URL = "https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/webdox-megas";
// E as aprovações no Fluig (12_Slide_Fluig.gs).
const PORTAL_FLUIG_URL = "https://wcxybuietfmaaqzmcmnq.supabase.co/functions/v1/fluig-megas";

// ==========================================
// MAPEAMENTO DAS UNIDADES (TVs E LOGOMARCAS)
// ==========================================
const UNITS = [
  {
    name: "MEGA CURITIBA",
    deckId: "1Q1WGQy34pmspwFjE_F82_zJXKQSxSlVr0RXADLvyyX0",
    brandLogoId: '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T', // Demercado
    unitLogoId: '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',  // Mega Curitiba
    // Foto da capa (05_Slide_Capa.gs): o MESMO arquivo da capa da
    // apresentação mensal e do Orçamento 2027. fotoFoco = onde fica o ponto de
    // interesse, em fração da largura (o mesmo do Orçamento, ORC_FOTO_FOCO).
    fotoCapaId: '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',
    fotoFoco: 0.26,
    weather: { lat: -25.4284, lon: -49.2733, cidade: "Curitiba - PR" },
    // Planilha "Mega Curitiba - Planilha 2026" (mesma fonte da Apresentação
    // Mensal) — usada só para auto-preencher no slide de Metas os
    // indicadores "Índice de Disponibilidade" (aba CHAMADOS) e "Custo M²"
    // (aba METRO QUADRADO), substituindo a digitação manual desses dois.
    metasAutoSpreadsheetId: "160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q",
    // Planilha "MEGA CURITIBA FACILITIES 2026" — só para "Taxa de
    // Reabertura" (Analista), aba TAXA DE ABERTURA.
    reaberturaId: "1Xudsnn7KEkgGWSZ_kJ4cXpx6CjrJ0UzORHkyUvuCUc0",
    // Mega no Portal de Solicitações — liga o kanban e o Webdox (os dois
    // últimos slides da TV).
    portalEmpreendimento: "mega_curitiba",
    // O Mega Curitiba é Demercado: verde petróleo e ouro, título em
    // EB Garamond (TV_MARCAS em Visual.gs). Sem `marca`, é Capital Realty.
    marca: "DEMERCADO",
    metas: [
      { papel: "SUPERVISOR" },
      { papel: "ANALISTA" }
    ]
  },
  {
    name: "MEGA ITAJAÍ",
    deckId: "1gWC55FL41TTJ4Ysi3M26PGtU5XfvARdscSZ7JpDKqQQ",
    brandLogoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', // Capital Realty
    unitLogoId: '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',  // Mega Itajaí
    fotoCapaId: '1TwANLdubJUHjcW8WpWRRR5gRv2Sty10K',
    fotoFoco: 0.30,
    weather: { lat: -26.9101, lon: -48.6705, cidade: "Itajaí - SC" },
    metasAutoSpreadsheetId: "1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4",
    reaberturaId: "1phOgA2wsbKsGTOMAoytqbpJbUseYQqSZONeap_vOKBc",
    portalEmpreendimento: "mega_itajai",
    metas: [
      { papel: "SUPERVISOR" },
      { papel: "ANALISTA" }
    ]
  },
  {
    name: "MEGA ESTEIO",
    deckId: "1lbYlsLrnBk5nLuE3a278Um9I_M9t1OfcEPKRRRGFobs",
    brandLogoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', // Capital Realty
    unitLogoId: '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',  // Mega Esteio
    fotoCapaId: '1ed2NujxpCBkk6tMDBC0h3LwB9wu6NEVA',
    fotoFoco: 0.52,
    weather: { lat: -29.8617, lon: -51.1850, cidade: "Esteio - RS" },
    cheiasSheetId: "1fzVDxlUYbWGqu1ok9wo3TByA2ckstoK0xySK_GPIj74",
    // Cota de inundação (em metros) de cada ponto de monitoramento, na MESMA
    // ordem dos rios do slide (Campo Bom, São Leopoldo, Porto Alegre).
    // ⚠️ Apenas a do Campo Bom (7,20 m) consta na planilha ("Alerta de
    // inundação: 720"). As de São Leopoldo e Porto Alegre são valores de
    // referência da Defesa Civil — CONFIRME/ajuste se necessário.
    cheiasCotas: [7.20, 4.80, 3.00],
    metasAutoSpreadsheetId: "1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY",
    // Planilha "PPC MEGA ESTEIO 2026" (aba DASHBOARD) — fonte da parte
    // "% das manutenções planejadas" da meta composta Custo M².
    // Curitiba/Itajaí ainda não têm PPC → a parte % fica manual lá.
    ppcId: "1I9DWcd8HXVRkjcv8eTk4UdQ5IZRuqUhFikw8tVfPt2c",
    // Planilha "MEGA ESTEIO FACILITIES 2026" — Taxa de Reabertura. Em
    // Esteio essa meta é do Supervisor (não do Analista como em Curitiba/
    // Itajaí), mas a fonte é a mesma planilha externa.
    reaberturaId: "18d5bbTGm1_P3BiRsnfqqdh6MfDqiFvGbRI7gB1G4ZL0",
    portalEmpreendimento: "mega_esteio",
    // painelExtras: [url, …] — páginas que a TV mostraria além dos slides do
    // deck (gerarArquivosPainelTV). A planilha publicada que estava no
    // Painel_Esteio.txt antigo saiu em 19/10/2026: "não precisa" (Guilherme).
    metas: [
      { papel: "SUPERVISOR" }
    ]
  }
];

// ==========================================
// DESIGN SYSTEM - CAPITAL REALTY
// ==========================================
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark: '#151E49',
    brandMed: '#003D7B',
    brandLight: '#065CA9',
    bgSlide: '#F8FAFC',
    cardBg: '#FFFFFF',
    textMain: '#151E49',
    textBody: '#475569',
    lines: '#E2E8F0',
    accentGreen: '#10B981',
    accentOrange: '#F97316',
    accentRed: '#EF4444'
  },
  typography: {
    titles: 'Montserrat',
    body: 'Open Sans'
  },
  layout: {
    marginX: 50,
    marginY: 35,
    contentY: 125 // Rebaixado para dar espaço ao novo Banner de Status
  }
};
