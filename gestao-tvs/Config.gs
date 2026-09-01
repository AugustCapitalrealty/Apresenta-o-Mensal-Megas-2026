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

// ==========================================
// MAPEAMENTO DAS UNIDADES (TVs E LOGOMARCAS)
// ==========================================
const UNITS = [
  {
    name: "MEGA CURITIBA",
    deckId: "1Q1WGQy34pmspwFjE_F82_zJXKQSxSlVr0RXADLvyyX0",
    brandLogoId: '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T', // Demercado
    unitLogoId: '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',  // Mega Curitiba
    weather: { lat: -25.4284, lon: -49.2733, cidade: "Curitiba - PR" },
    // Planilha "Mega Curitiba - Planilha 2026" (mesma fonte da Apresentação
    // Mensal) — usada só para auto-preencher no slide de Metas os
    // indicadores "Índice de Disponibilidade" (aba CHAMADOS) e "Custo M²"
    // (aba METRO QUADRADO), substituindo a digitação manual desses dois.
    metasAutoSpreadsheetId: "160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q",
    // Planilha "MEGA CURITIBA FACILITIES 2026" — só para "Taxa de
    // Reabertura" (Analista), aba TAXA DE ABERTURA.
    reaberturaId: "1Xudsnn7KEkgGWSZ_kJ4cXpx6CjrJ0UzORHkyUvuCUc0",
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
    weather: { lat: -26.9101, lon: -48.6705, cidade: "Itajaí - SC" },
    metasAutoSpreadsheetId: "1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4",
    reaberturaId: "1phOgA2wsbKsGTOMAoytqbpJbUseYQqSZONeap_vOKBc",
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
