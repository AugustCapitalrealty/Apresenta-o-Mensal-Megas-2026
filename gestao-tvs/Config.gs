/**
 * ARQUIVO: Config.gs
 * DESCRIÇÃO: Design System e Configuração Multi-Unidades e Multi-Marcas.
 */

const ID_PLANILHA = "1XrgKQENISyM_cO7xslUQZrmCiZpRJ0UU512FQF1WiRA";

// Planilha de HISTÓRICO VALIDADO (mantida manualmente pelo time) — MESMA
// fonte que megas-mensal/01_Config.gs usa para as tendências ▲/▼ vs mês
// anterior. Necessária para os "valores automáticos" das Metas (ver
// 08_Dados_MetasAuto.gs) baterem com os números que o Megas mensal mostra.
const HISTORICO_VALIDADO_ID = '1o6vNzmZPlvil-DefoFZj92KzHBueqddk8wy26Ev2_DI';

// ==========================================
// MAPEAMENTO DAS UNIDADES (TVs E LOGOMARCAS)
// ==========================================
const UNITS = [
  {
    name: "MEGA CURITIBA",
    deckId: "1Q1WGQy34pmspwFjE_F82_zJXKQSxSlVr0RXADLvyyX0",
    sheetChamadosDetalhe: "CHAMADOS - DETALHE - CURITIBA",
    sheetPreventivasDetalhe: "PREVENTIVA - DETALHE - CURITIBA",
    brandLogoId: '168kVyD9dXiZctYNl27f_-Ic9S1W3wm-T', // Demercado
    unitLogoId: '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',  // Mega Curitiba
    weather: { lat: -25.4284, lon: -49.2733, cidade: "Curitiba - PR" },
    rows: {
      chamados: { fac: 40, prop: 41, tot: 42 },
      chamadosDiario: { fac: 78, prop: 79, tot: 80 }, // NOVAS LINHAS FIXAS (Diário)
      preventiva: { conf: 24, nConf: 25, perc: 26 }
    },
    keys: { corr: "histFilaCorretivas_CWB", prev: "histFilaPreventivas_CWB" },
    // Planilha operacional própria da cidade (mesma que megas-mensal/01_Config.gs
    // usa em PROJETOS.CURITIBA) — fonte dos "valores automáticos" das Metas
    // (abas PREVENTIVAS, METRO QUADRADO, FINANCEIRO BRIDGE, META, DADOS).
    spreadsheetId: '160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q',
    ppcId: '1a5OlMoeFtgsKagPlmPr-5UTXXBVufczUzDVSQvUe4Zo',        // PPC Mega Curitiba 2026
    reaberturaId: '1Xudsnn7KEkgGWSZ_kJ4cXpx6CjrJ0UzORHkyUvuCUc0', // Taxa de Reabertura
    metas: [
      { papel: "SUPERVISOR" },
      { papel: "ANALISTA" }
    ]
  },
  {
    name: "MEGA ITAJAÍ",
    deckId: "1gWC55FL41TTJ4Ysi3M26PGtU5XfvARdscSZ7JpDKqQQ",
    sheetChamadosDetalhe: "CHAMADOS - DETALHE - ITAJAÍ",
    sheetPreventivasDetalhe: "PREVENTIVA - DETALHE - ITAJAÍ",
    brandLogoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', // Capital Realty
    unitLogoId: '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',  // Mega Itajaí
    weather: { lat: -26.9101, lon: -48.6705, cidade: "Itajaí - SC" },
    rows: {
      chamados: { fac: 46, prop: 47, tot: 48 },
      chamadosDiario: { fac: 84, prop: 85, tot: 86 }, // NOVAS LINHAS FIXAS (Diário)
      preventiva: { conf: 31, nConf: 32, perc: 33 }
    },
    keys: { corr: "histFilaCorretivas_ITJ", prev: "histFilaPreventivas_ITJ" },
    spreadsheetId: '1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4',
    ppcId: '10wfrx335OaBeTuPcXIg42Wk6U6NsMNt4f97QwGT3hZU',        // PPC Mega Itajaí 2026
    reaberturaId: '1phOgA2wsbKsGTOMAoytqbpJbUseYQqSZONeap_vOKBc',
    metas: [
      { papel: "SUPERVISOR" },
      { papel: "ANALISTA" }
    ]
  },
  {
    name: "MEGA ESTEIO",
    deckId: "1lbYlsLrnBk5nLuE3a278Um9I_M9t1OfcEPKRRRGFobs",
    sheetChamadosDetalhe: "CHAMADOS - DETALHE - ESTEIO",
    sheetPreventivasDetalhe: "PREVENTIVA - DETALHE - ESTEIO",
    brandLogoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', // Capital Realty
    unitLogoId: '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',  // Mega Esteio
    weather: { lat: -29.8617, lon: -51.1850, cidade: "Esteio - RS" },
    rows: {
      chamados: { fac: 52, prop: 53, tot: 54 },
      chamadosDiario: { fac: 90, prop: 91, tot: 92 }, // NOVAS LINHAS FIXAS (Diário)
      preventiva: { conf: 38, nConf: 39, perc: 40 }
    },
    keys: { corr: "histFilaCorretivas_EST", prev: "histFilaPreventivas_EST" },
    spreadsheetId: '1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY',
    ppcId: '1I9DWcd8HXVRkjcv8eTk4UdQ5IZRuqUhFikw8tVfPt2c',        // PPC Mega Esteio 2026
    reaberturaId: '18d5bbTGm1_P3BiRsnfqqdh6MfDqiFvGbRI7gB1G4ZL0',
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
