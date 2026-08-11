/**
 * MockData.gs — dados de demonstração para apresentar ao gestor.
 * Rode gerarApresentacaoDemo() no Apps Script.
 * Baseado nos dados reais de MAIO/2026 do PAINEL INDICADORES.
 */

var _MESES_DEMO = ['MAI/25','JUN/25','JUL/25','AGO/25','SET/25','OUT/25',
                   'NOV/25','DEZ/25','JAN/26','FEV/26','MAR/26','ABR/26','MAI/26'];

var MOCK = {
  mesAno:      'MAIO/26',
  mesAnterior: 'abril',

  comparativo2025x2026: {
    fluxoAcumulado: {
      '2025': { 'Mega Curitiba': 198420, 'Mega Itajaí': 87340, 'Mega Esteio': 11200 },
      '2026': { 'Mega Curitiba': 241850, 'Mega Itajaí': 103900, 'Mega Esteio': 14620 },
    },
    tempoMedioAcumulado: {
      '2025': { 'Mega Curitiba': '07m12s', 'Mega Itajaí': '06m48s', 'Mega Esteio': '08m05s' },
      '2026': { 'Mega Curitiba': '05m46s', 'Mega Itajaí': '05m05s', 'Mega Esteio': '03m44s' },
    },
    textoFluxo: 'O Mega Curitiba registrou variação de +21,9% no fluxo de visitantes e motoristas no comparativo com o período anterior. O Mega Itajaí registrou variação de +18,9%. Enquanto o Mega Esteio registrou variação de +30,5%.',
    textoTempo: 'O Mega Curitiba registrou 05m46s, variação de -01m26s em relação a 07m12s em abril. O Mega Itajaí registrou 05m05s. Enquanto o Mega Esteio registrou 03m44s.',
  },

  resumo: {
    totalAcessos:  95875,
    recordeTotal:  true,
    marcos: {
      primeiraVez100k:   false,
      superouAnoFechado: true,
      acumAnoAtual:      360370,
      totalAnoAnterior:  296960,
      anoAtual:          '2026',
      anoAnterior:       '2025',
      periodoAcum:       'jan a mai',
    },
    totalAnterior: 48256,
    tempoMedioMin: '03m44s',
    tempoMedioMax: '05m46s',
  },

  fluxoMensal: {
    'Mega Curitiba': [28400,31200,30800,33500,35100,38200,40100,22300,29800,31500,33200,31572,66336],
    'Mega Itajaí':   [11200,12400,11800,13200,14100,15300,16200, 9800,12100,13400,14200,14934,25631],
    'Mega Esteio':   [ 1200, 1350, 1280, 1420, 1510, 1630, 1720,  980, 1310, 1450, 1580, 1750, 3908],
  },

  tempoMedioMensalSeg: {
    'Mega Curitiba': [621,598,587,572,563,551,543,618,534,521,508,501,346],
    'Mega Itajaí':   [598,574,561,549,537,524,516,592,512,499,487,432,305],
    'Mega Esteio':   [712,689,671,654,638,622,609,698,596,578,562,373,224],
  },

  usoCelularMensal: {
    'Mega Curitiba': [82.1,83.4,84.2,85.1,85.9,86.8,87.4,87.9,88.3,88.7,89.1,88.88,89.86],
    'Mega Itajaí':   [80.3,81.5,82.1,83.0,83.8,84.6,85.2,85.8,86.3,86.9,87.4,87.70,88.53],
    'Mega Esteio':   [77.2,78.4,79.1,80.0,80.8,81.6,82.3,82.9,83.3,83.7,84.1,92.57,83.88],
  },

  colaboradoresMensal: {
    'Mega Curitiba': [1820,1840,1850,1865,1878,1890,1900,1912,1920,1930,1941,1950,1960],
    'Mega Itajaí':   [ 820, 828, 834, 841, 848, 856, 862, 869, 874, 880, 886, 891, 896],
    'Mega Esteio':   [ 180, 182, 184, 186, 188, 190, 192, 194, 195, 197, 198, 200, 202],
  },

  empreendimentos: [
    {
      nome:               'Mega Curitiba',
      recordeAcessos:     true,
      fluxoTotal:         66336,
      variacaoMes:        '+110,1%',
      variacaoAno:        '+21,9%',
      colaboradoresFixos: 1960,
      colaboradoresVar:   '+0,5%',
      tempoMedio:         '05m46s',
      tempoMedioAnterior: '08m21s',
      tempoMedioVar:      '-02m35s',
      usoCelular:         '89,86%',
      filaEvitada:        1934,
      filaEvitadaPct:     '2,92%',
      eventosAgendados:   '48,49%',
      preAutorizados:     '2,92%',
      acesso5min:         '80,85%',
      acesso10min:        '86,88%',
      eventosCancela:     '57,79%',
      tipoAcesso: { 'Carro': 38, 'Caminhão': 25, 'Carreta': 18, 'Van': 10, 'Moto': 5, 'Outros': 4 },
      participacaoTempoMedio: [
        { cliente: 'Assaí',       pct: 28, anterior: 26 },
        { cliente: 'Atacadão',    pct: 22, anterior: 24 },
        { cliente: 'Makro',       pct: 18, anterior: 17 },
        { cliente: 'Outros', pct: 32, anterior: 33, qtdClientes: 14 },
      ],
      agendamentoTotal:    '48,49%',
      agendamentoAnterior: '20,32%',
      agendamentoVar:      '+28,17 p.p.',
      agendamentoPorCliente: [
        { cliente: 'Assaí',    pct: 62 },
        { cliente: 'Atacadão', pct: 55 },
        { cliente: 'Makro',    pct: 48 },
      ],
      cardsClientes: [
        { cliente: 'Assaí',    tempoMedio: '04m12s', tempoMedioAnterior: '07m30s', acessos: 18420, agendados: '62%', participacao: '41,1%' },
        { cliente: 'Atacadão', tempoMedio: '05m08s', tempoMedioAnterior: '09m15s', acessos: 14592, agendados: '55%', participacao: '32,5%' },
        { cliente: 'Makro',    tempoMedio: '06m22s', tempoMedioAnterior: '08m45s', acessos: 11840, agendados: '48%', participacao: '26,4%' },
      ],
      rankingMes:   [
        { tipo: 'Carro',    acessos: 25248, delta: '+112%' },
        { tipo: 'Caminhão', acessos: 16584, delta: '+108%' },
        { tipo: 'Carreta',  acessos: 11940, delta: '+115%' },
      ],
      rankingAnual: [
        { tipo: 'Carro',    acessos: 142800, delta: '+22%' },
        { tipo: 'Caminhão', acessos: 98400,  delta: '+19%' },
        { tipo: 'Carreta',  acessos: 72600,  delta: '+24%' },
      ],
    },
    {
      nome:               'Mega Itajaí',
      recordeAcessos:     true,
      fluxoTotal:         25631,
      variacaoMes:        '+71,6%',
      variacaoAno:        '+18,9%',
      colaboradoresFixos: 896,
      colaboradoresVar:   '+0,6%',
      tempoMedio:         '05m05s',
      tempoMedioAnterior: '07m12s',
      tempoMedioVar:      '-02m07s',
      usoCelular:         '88,53%',
      filaEvitada:        218,
      filaEvitadaPct:     '0,85%',
      eventosAgendados:   '52,32%',
      preAutorizados:     '0,85%',
      acesso5min:         '83,38%',
      acesso10min:        '88,81%',
      eventosCancela:     '52,45%',
      tipoAcesso: { 'Carro': 35, 'Caminhão': 28, 'Carreta': 20, 'Van': 9, 'Moto': 5, 'Outros': 3 },
      participacaoTempoMedio: [
        { cliente: 'Leroy Merlin', pct: 32, anterior: 29 },
        { cliente: 'C&C',         pct: 24, anterior: 26 },
        { cliente: 'Outros', pct: 44, anterior: 45, qtdClientes: 11 },
      ],
      agendamentoTotal:    '52,32%',
      agendamentoAnterior: '23,57%',
      agendamentoVar:      '+28,75 p.p.',
      agendamentoPorCliente: [
        { cliente: 'Leroy Merlin', pct: 68 },
        { cliente: 'C&C',         pct: 58 },
      ],
      cardsClientes: [
        { cliente: 'Leroy Merlin', tempoMedio: '04m38s', tempoMedioAnterior: '06m52s', acessos: 8202, agendados: '68%', participacao: '57,1%' },
        { cliente: 'C&C',         tempoMedio: '05m22s', tempoMedioAnterior: '07m40s', acessos: 6151, agendados: '58%', participacao: '42,9%' },
      ],
      rankingMes:   [
        { tipo: 'Carro',    acessos: 8970, delta: '+72%' },
        { tipo: 'Caminhão', acessos: 7177, delta: '+70%' },
        { tipo: 'Carreta',  acessos: 5126, delta: '+74%' },
      ],
      rankingAnual: [
        { tipo: 'Carro',    acessos: 52400, delta: '+19%' },
        { tipo: 'Caminhão', acessos: 41200, delta: '+17%' },
        { tipo: 'Carreta',  acessos: 28600, delta: '+21%' },
      ],
    },
    {
      nome:               'Mega Esteio',
      recordeAcessos:     true,
      fluxoTotal:         3908,
      variacaoMes:        '+123,3%',
      variacaoAno:        '+30,5%',
      colaboradoresFixos: 202,
      colaboradoresVar:   '+1,0%',
      tempoMedio:         '03m44s',
      tempoMedioAnterior: '06m13s',
      tempoMedioVar:      '-02m29s',
      usoCelular:         '83,88%',
      filaEvitada:        127,
      filaEvitadaPct:     '3,25%',
      eventosAgendados:   '49,69%',
      preAutorizados:     '3,25%',
      acesso5min:         '82,29%',
      acesso10min:        '89,76%',
      eventosCancela:     '49,85%',
      tipoAcesso: { 'Carro': 40, 'Caminhão': 22, 'Carreta': 15, 'Van': 12, 'Moto': 7, 'Outros': 4 },
      participacaoTempoMedio: [
        { cliente: 'Grupo Zaffari', pct: 45, anterior: 42 },
        { cliente: 'Outros', pct: 55, anterior: 58, qtdClientes: 8 },
      ],
      agendamentoTotal:    '49,69%',
      agendamentoAnterior: '25,94%',
      agendamentoVar:      '+23,75 p.p.',
      agendamentoPorCliente: [
        { cliente: 'Grupo Zaffari', pct: 71 },
      ],
      cardsClientes: [
        { cliente: 'Grupo Zaffari', tempoMedio: '03m18s', tempoMedioAnterior: '05m44s', acessos: 1759, agendados: '71%', participacao: '100%' },
      ],
      rankingMes:   [
        { tipo: 'Carro',    acessos: 1563, delta: '+124%' },
        { tipo: 'Caminhão', acessos:  860, delta: '+120%' },
        { tipo: 'Carreta',  acessos:  586, delta: '+128%' },
      ],
      rankingAnual: [
        { tipo: 'Carro',    acessos: 8400, delta: '+31%' },
        { tipo: 'Caminhão', acessos: 5200, delta: '+28%' },
        { tipo: 'Carreta',  acessos: 3600, delta: '+33%' },
      ],
    },
  ],

  perfilSolicitacoes: {
    titulo: 'Informação acumulada: 2026',
    itens: [
      { perfil: 'MOTORISTA',  pct: 52, anterior: 49, media12m: 50 },
      { perfil: 'VISITANTE',  pct: 38, anterior: 41, media12m: 39 },
      { perfil: 'AJUDANTE',   pct: 10, anterior: 10, media12m: 11 },
    ],
  },

  horarioPico: {
    'Mega Curitiba': {
      distribuicao: [0,0,0,0,0,12,180,820,1240,1520,1680,1810,1920,1640,1480,1360,1120,860,620,380,180,80,20,0],
      total: 16922,
      pico:     { hora: 12, count: 1920, pct: 11 },
      segundo:  { hora: 11, count: 1810, pct: 11 },
      terceiro: { hora: 10, count: 1680, pct: 10 },
    },
    'Mega Itajaí': {
      distribuicao: [0,0,0,0,0,8,90,380,560,720,840,910,960,820,740,680,560,420,310,180,80,30,8,0],
      total: 7298,
      pico:     { hora: 12, count: 960, pct: 13 },
      segundo:  { hora: 11, count: 910, pct: 12 },
      terceiro: { hora: 10, count: 840, pct: 12 },
    },
    'Mega Esteio': {
      distribuicao: [0,0,0,0,0,2,18,72,98,124,148,162,172,148,132,118,96,74,52,32,14,6,2,0],
      total: 1470,
      pico:     { hora: 12, count: 172, pct: 12 },
      segundo:  { hora: 11, count: 162, pct: 11 },
      terceiro: { hora: 10, count: 148, pct: 10 },
    },
  },
};
