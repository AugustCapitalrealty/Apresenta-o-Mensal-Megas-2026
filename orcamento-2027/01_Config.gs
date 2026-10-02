/**
 * ARQUIVO: 01_Config.gs
 * SEÇÃO:   NÚCLEO — Configuração e design system
 * DESCRIÇÃO: IDs da apresentação e das planilhas do modelo de orçamento,
 *            por cidade, e os tokens visuais da marca.
 */

// Apresentação onde o orçamento é gerado. Cada geração acrescenta os slides
// novos e só no fim apaga os antigos: se algo quebrar no meio, a versão
// anterior continua lá.
const ORC_DECK_ID = '1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI';
const ORC_ANO = 2027;
const ORC_ABA_MODELO = 'Valores do Modelo';

// Planilhas do modelo de orçamento, por cidade. Itajaí e Esteio entram quando
// as planilhas existirem — com o ID vazio a geração escreve o aviso no slide
// em vez de desenhar números zerados.
const ORC_CIDADES = {
  CURITIBA: {
    nome: 'Mega Curitiba',
    despesasGeraisId:    '1cMgo0gBmqFj0K8rKDtlnqyEBy7TlMK0OuAS6SMs5_OA',  // 090-Despesas-Gerais - MEGA CURITIBA - 2027
    servicosTerceirosId: '1BrIqFUFhFN9IJG77SidP5mlkID4U5UrrRzXfTepBXBw',  // 070-Servicos-de-Terceiros - MEGA CURITIBA - 2027
    // Relatórios da controladoria (pasta "MEGA CURITIBA"), uma aba cada:
    //   metragem → conta × Real 2025 | Orça 2026 | Ritmo 2026 | Orça 2027, com
    //              IPTU, Seguro e R$/m² — base da DRE e dos ofensores.
    //   mensal   → conta × (Orç 26 | Real 26 | Orça 27 | Variação) por mês —
    //              base da análise linha a linha.
    // A "Mega-Curitiba-Mensal-2027" NÃO é usada: a coluna Variação do ano
    // dela repete a variação de janeiro (-58.471 em vez de -425.122 na
    // segurança).
    relatorios: {
      metragemId: '1D8CeKKOKXSsO-BpfNqy8oCLvX019np3Zz_P3fcP3s1c',   // METRAGEM-COND-MEGA-CURITIBA
      mensalId:   '1QhfFrV8EzUVChX0DGtrTdaOjsMnLBLyHmbI0Eiy-yjM'    // Despesas-Mensal-2026-x-2027
    },
    // Contratos recorrentes por conta — o que os modelos 070/090 NÃO listam.
    // Modelo + contratos = total da conta na METRAGEM. Conta sem planilha
    // aparece na linha a linha com o "Não detalhado nos modelos".
    contratos: {
      'Manutenção de imóveis':  '1diDWTo5tQPL28YRrejGILSEsRhPkUt4kasmC8ehVlrA',  // MEGA CURITIBA - MANUTENÇÕES DE IMOVEIS - CONTRATOS
      'Segurança e vigilância': '12EFl12AKmwwCwEZ84j2UO2TQiT2B9I9QwrK5cYdLqK8',  // MEGA CURITIBA - SEGURANÇA E VIGILANCIA - CONTRATOS
      'Limpeza e conservação':  '1eLJmH-lHef_mczrQ6kgxOs_aGWHcJB6ZMJMLzF5H4FI'   // MEGA CURITIBA - LIMPEZA E CONSERVAÇÃO - CONTRATOS
    }
  },
  ITAJAI: { nome: 'Mega Itajaí', despesasGeraisId: '', servicosTerceirosId: '' },
  ESTEIO: { nome: 'Mega Esteio', despesasGeraisId: '', servicosTerceirosId: '' }
};

// Colunas da aba "Valores do Modelo" (base 0): A = descrição do item (é a
// conta: "manutenção imóveis", "Seguros"...), F = item, I..T = Mês 1..12.
// O cabeçalho é conferido na leitura: se alguém inserir uma coluna, a geração
// para com erro em vez de ler o mês errado.
const ORC_COL = { conta: 0, item: 5, mes1: 8 };

// Conta desta primeira versão, já normalizada por _orcNorm_ (a planilha grava
// "manutenção imóveis", com espaço não-quebrável).
const ORC_CONTA_MANUTENCAO = 'manutencao imoveis';

// Categoria de cada contrato recorrente de manutenção, pelo nome do
// fornecedor (definido com o gestor em 30/09/2026). Contrato que não casar
// com nenhum termo vai para ORC_CONTRATO_SEM_CATEGORIA e gera aviso — nunca
// some do total.
const ORC_CONTRATOS_CATEGORIA = [
  { termo: 'firecam',                  categoria: 'PPCI' },
  { termo: 'miriad',                   categoria: 'COBERTURA' },
  { termo: 'leandro carvalho weiss',   categoria: 'ELÉTRICA' },
  { termo: 'filtroil',                 categoria: 'ELÉTRICA' },
  { termo: 'equilibrio',               categoria: 'CONSULTORIA AMBIENTAL' }
];
const ORC_CONTRATO_SEM_CATEGORIA = 'CONTRATOS SEM CATEGORIA';

// Itens do modelo que mudam de categoria: a tag "[CONTRATO]" dizia o tipo de
// despesa, não o assunto, e o gestor pediu os contratos distribuídos nas
// categorias.
const ORC_RECATEGORIZAR = [
  { de: 'CONTRATO', termo: 'seguranca eletronica', para: 'SEGURANÇA ELETRÔNICA' }
];

// Categoria com pelo menos esta fatia do total ganha slide próprio; as
// menores vão juntas no slide "Demais categorias".
const ORC_FATIA_SLIDE_PROPRIO = 0.05;

// Mês 1 do modelo = janeiro.
const ORC_MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// ==========================================
// DESIGN SYSTEM — CAPITAL REALTY
// ==========================================
// Mesmos valores de marca dos outros projetos do repositório (ver CLAUDE.md
// da raiz). Ao mexer na paleta, confira os demais.
const CR_DESIGN_SYSTEM = {
  colors: {
    brandDark:  '#151E49',
    brandMed:   '#003D7B',
    brandLight: '#065CA9',
    brandSoft:  '#93C5FD',
    bgSlide:    '#F8FAFC',
    cardBg:     '#FFFFFF',
    textMain:   '#151E49',
    textBody:   '#475569',
    textMuted:  '#94A3B8',
    lines:      '#E2E8F0',
    zebra:      '#F1F5F9',
    accentGreen:  '#10B981',
    accentOrange: '#F97316',
    accentRed:    '#EF4444'
  },
  typography: {
    titles: 'Montserrat',
    body:   'Open Sans'
  },
  layout: {
    marginX: 30,
    headerH: 64
  }
};

// Logos oficiais (mesmos IDs de megas-mensal/01_Config.gs).
//   Negativo (branco) → capa, fundo escuro.  Positivo (escuro) → cabeçalho.
const LOGOS_CR = {
  fullNegativo: '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p',
  fullPositivo: '1XqFtIobiEq7VC2H41sKnFNUuOluw_J4V'
};
