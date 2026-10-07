/**
 * ARQUIVO: 01_Config.gs
 * SEÇÃO:   NÚCLEO — Configuração e design system
 * DESCRIÇÃO: IDs da apresentação e das planilhas do modelo de orçamento,
 *            por cidade, e os tokens visuais da marca.
 */

// A apresentação de cada cidade é `deckId` em ORC_CIDADES. Cada geração
// acrescenta os slides novos e só no fim apaga os antigos: se algo quebrar no
// meio, a versão anterior continua lá.
const ORC_ANO = 2027;
const ORC_ABA_MODELO = 'Valores do Modelo';

// Planilha "ORÇAMENTO 2027 - TEXTOS DAS TABELAS" (pasta APRESENTAÇÃO
// ORÇAMENTO): o texto curto que o gestor escolhe para cada descrição longa
// das tabelas. Ver 06_TextosTabelas.gs.
const ORC_TEXTOS_ID = '1whAdU26wkp6gV5RKtgX7jaBhhGIywZ3iV2CSiXdacGY';
// As propostas de texto curto que aplicarPropostasTextos() copia para a
// coluna C estão em 07_PropostasTextos.gs.

// Planilhas do modelo de orçamento, por cidade. Itajaí e Esteio entram quando
// as planilhas existirem — com o ID vazio a geração escreve o aviso no slide
// em vez de desenhar números zerados.
const ORC_CIDADES = {
  CURITIBA: {
    nome: 'Mega Curitiba',
    deckId: '1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI',            // MEGA CURITIBA - APRESENTAÇÃO ORÇAMENTO 2027
    // Capa (10_Capa.gs): foto do Mega e logo do Mega — os mesmos da capa da
    // apresentação mensal dos Megas (megas-mensal/01_Config.gs, PROJETOS).
    fotoFundoId: '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',
    unitLogoId:  '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',
    despesasGeraisId:    '1cMgo0gBmqFj0K8rKDtlnqyEBy7TlMK0OuAS6SMs5_OA',  // MEGA CURITIBA - 090 DESPESAS GERAIS 2027
    servicosTerceirosId: '1BrIqFUFhFN9IJG77SidP5mlkID4U5UrrRzXfTepBXBw',  // MEGA CURITIBA - 070 SERVIÇOS DE TERCEIROS 2027
    // Relatórios da controladoria (pasta "02 - MEGA CURITIBA"), uma aba cada:
    //   metragem → conta × Real 2025 | Orça 2026 | Ritmo 2026 | Orça 2027, com
    //              IPTU, Seguro e R$/m² — base da DRE e dos ofensores.
    //   mensal   → conta × (Orç 26 | Real 26 | Orça 27 | Variação) por mês —
    //              base da análise linha a linha.
    // A "Mega-Curitiba-Mensal-2027" NÃO é usada: a coluna Variação do ano
    // dela repete a variação de janeiro (-58.471 em vez de -425.122 na
    // segurança).
    relatorios: {
      metragemId: '1D8CeKKOKXSsO-BpfNqy8oCLvX019np3Zz_P3fcP3s1c',   // MEGA CURITIBA - METRAGEM-COND 2027
      mensalId:   '1QhfFrV8EzUVChX0DGtrTdaOjsMnLBLyHmbI0Eiy-yjM',   // MEGA CURITIBA - DESPESAS MENSAL 2026 x 2027
      // Planilha da apresentação mensal dos Megas (megas-mensal/01_Config.gs,
      // PROJETOS.<cidade>.spreadsheetId): a aba "Financeiro <ano retrasado>"
      // dá o Real mês a mês do slide de custo por m² (20_M2Mensal.gs).
      financeiroMegasId: '160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q',   // Mega Curitiba - Planilha 2026
      // Contas em que o mensal não fecha com a METRAGEM e a contabilidade
      // orientou usar a METRAGEM (06/10/2026: IPTU −R$ 3.032, Seguro
      // −R$ 10.645 no Orç 2027). Ficam sem o ⚠ REVISAR e fora do slide de
      // revisão; a divergência só vai para o log.
      valeMetragem: ['IPTU', 'Seguro']
    },
    // Contratos recorrentes por conta — o que os modelos 070/090 NÃO listam.
    // Modelo + contratos = total da conta na METRAGEM. Conta sem planilha
    // aparece na linha a linha com o "Não detalhado nos modelos".
    contratos: {
      'Manutenção de imóveis':  '1diDWTo5tQPL28YRrejGILSEsRhPkUt4kasmC8ehVlrA',  // MEGA CURITIBA - CONTRATOS 2027 - MANUTENÇÃO DE IMÓVEIS
      'Segurança e vigilância': '12EFl12AKmwwCwEZ84j2UO2TQiT2B9I9QwrK5cYdLqK8',  // MEGA CURITIBA - CONTRATOS 2027 - SEGURANÇA E VIGILÂNCIA
      'Limpeza e conservação':  '1eLJmH-lHef_mczrQ6kgxOs_aGWHcJB6ZMJMLzF5H4FI'   // MEGA CURITIBA - CONTRATOS 2027 - LIMPEZA E CONSERVAÇÃO
    },
    // Texto do slide de Premissas (10_Capa.gs). Vazio = espaço para o gestor
    // escrever no próprio slide. Depois que ele escrever, copie o texto para
    // cá: cada geração recria o deck e apagaria o que foi escrito lá.
    premissas: {
      premissas: '',
      analisado: '',
      comoLer:   ''
    }
  },
  // Itajaí e Esteio (05/10/2026): relatórios da controladoria nas pastas
  // "03 - MEGA ITAJAÍ" / "04 - MEGA ESTEIO", convertidos dos .xlsx. Os contratos vêm do
  // cadastro do ano (`contratosDoCadastro`, ORC_CONTRATOS_ANO_IDS em
  // 02_Dados.gs, "CONTRATOS-2027-COMPLETO") em vez de uma planilha por conta.
  // Conta sem contrato no cadastro sai com o alerta de pendência
  // (19_Revisar.gs).
  ITAJAI: {
    nome: 'Mega Itajaí',
    deckId: '1IBhGpq4PPPHj4il-2zEYRX1a_7ftJN_1X0VRFb4kA_E',            // MEGA ITAJAÍ - APRESENTAÇÃO ORÇAMENTO 2027
    fotoFundoId: '1TwANLdubJUHjcW8WpWRRR5gRv2Sty10K',
    unitLogoId:  '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',
    despesasGeraisId:    '1x2Fqc_t2IEOvc5FnZVyNRo9YUG-3v3viGqmplRJrgwg',  // MEGA ITAJAÍ - 090 DESPESAS GERAIS 2027
    servicosTerceirosId: '1jlUb8NJbt6uhfezuK7YHU2qxmxQN0B8wEvaQu8uI0xY',  // MEGA ITAJAÍ - 070 SERVIÇOS DE TERCEIROS 2027
    relatorios: {
      metragemId: '1MXl34wpw1JWxtssYydfFTX9pXX2nmWjxWSuFuikEZYw',   // MEGA ITAJAÍ - METRAGEM-COND 2027
      mensalId:   '1IaJvCRMBnuxJhcDhDq3ECvqRRTsyAM4Gvku8jEKrwgA',   // MEGA ITAJAÍ - DESPESAS MENSAL 2026 x 2027
      financeiroMegasId: '1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4'    // planilha dos Megas (Itajaí)
    },
    contratos: {},
    // Conferido em 07/10/2026 (Itajaí e Esteio): na segurança, na limpeza,
    // no telefone, em informática e em cursos o cadastro fecha exato com o
    // que os modelos não abrem na METRAGEM.
    contratosDoCadastro: true,
    premissas: { premissas: '', analisado: '', comoLer: '' }
  },
  ESTEIO: {
    nome: 'Mega Esteio',
    deckId: '1hynGvAf4fCYFexCOi5jvf7dm50TFFwbmPV1jwLy1w_0',            // MEGA ESTEIO - APRESENTAÇÃO ORÇAMENTO 2027
    fotoFundoId: '1ed2NujxpCBkk6tMDBC0h3LwB9wu6NEVA',
    unitLogoId:  '1bYPL_-57T8G8o-rATfSX1LL8J6WLiLpB',
    despesasGeraisId:    '1jC7aDDGSDF6yzPxzmTlbGIbwbe4Se6svwj7XtZkG9qQ',  // MEGA ESTEIO - 090 DESPESAS GERAIS 2027
    servicosTerceirosId: '1hDki35EFiw1d6gGTt3bSb75flqdt-DCr9_Gb8VmkXpk',  // MEGA ESTEIO - 070 SERVIÇOS DE TERCEIROS 2027
    relatorios: {
      metragemId: '1mlDwyG5x6L7SPbjGkG1B8Vq8T34EqGbBiZWnm7Pk2jE',   // MEGA ESTEIO - METRAGEM-COND 2027
      mensalId:   '1Un3Seh4c9BJsVBuRFzYIYoiNb_KuXgg84AIbaN9DHBg',   // MEGA ESTEIO - DESPESAS MENSAL 2026 x 2027
      financeiroMegasId: '1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY'    // planilha dos Megas (Esteio)
    },
    contratos: {},
    contratosDoCadastro: true,
    premissas: { premissas: '', analisado: '', comoLer: '' }
  }
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
  { termo: 'equilibrio',               categoria: 'CONSULTORIA AMBIENTAL' },
  // Itajaí e Esteio (cadastro de 2027, 07/10/2026).
  { termo: 'rodrigo rohde',            categoria: 'ELÉTRICA' },
  { termo: 'gerador',                  categoria: 'ELÉTRICA' },
  { termo: 'subestacao',               categoria: 'ELÉTRICA' },
  { termo: 'arca agro',                categoria: 'ÁREA VERDE' },
  { termo: 'ads manutencao',           categoria: 'COBERTURA' },
  { termo: 'cobertura',                categoria: 'COBERTURA' }
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

// Fotos das sub capas: os MESMOS arquivos das capas de seção da apresentação
// mensal dos Megas (megas-mensal/01_Config.gs, FOTOS_SECAO). Trocar uma foto
// lá não troca aqui: atualize os dois.
const ORC_FOTOS_SECAO = {
  PREVENTIVA:   '1iC0svCXk7jSddAc65Eg0VMjjPtEHJErW',
  CORRETIVA:    '1e1nddV6U0KDrAYRMT16s54LAuKRBCC2g',
  CONTRATADOS:  '1SyVowumHac9e3PxDcmHhwFnfVU4K0hph',
  INTERNOS:     '1mP_ousYFrNSDV8rwPhPtXdYoOEYaW_3Z',
  PATRIMONIAL:  '1kua0uho-3-yzLtE4IR2y_epaBYtKttsx',
  OPERACIONAL:  '1kXwwPWzU6pimR9vSXY6I5M7eNgNjDC_h',
  UTILITIES:    '16DLJAVLl8xOsRr8Nhi_OTmnXcEx-URVB',   // energia de Curitiba: não serve aos três Megas
  SUSTENTAVEL:  '1Sq519lQhsvqVgC1V9w4yVMbIjSDqIVu1',
  DOCUMENTACAO: '1fA13cXRur_UbMtLAjRYGbOyjaauNiOZ0'
};

// Sub capa de cada seção (gerarSlideSubcapa_, 10_Capa.gs), pelo título:
//   foto   → chave de ORC_FOTOS_SECAO, ou 'MEGA' = a foto da capa do próprio
//            Mega (cid.fotoFundoId). Sem foto, fundo azul-escuro.
//   motivo → o desenho à direita no padrão da mensal (_orcMotivoSecao_); 'M2'
//            (planta) e 'ANEIS' são só do orçamento.
//   frase  → a linha em serifa itálica da sub capa "recorte" (jeito das capas
//            de vídeo, 07/10/2026): diz do que a seção trata, sem número.
// A sub capa "recorte" usa a foto já tratada (retícula + papel rasgado) da
// pasta ORC_PASTA_IMAGENS_SUBCAPAS, feita por ferramentas/subcapas_youtube.py;
// sem ela, a sub capa sai no padrão da mensal (foto + véu + motivo).
const ORC_SUBCAPAS = {
  'Premissas':             { foto: 'DOCUMENTACAO', motivo: 'DOCUMENTACAO', frase: 'como este orçamento foi construído' },
  'Resumo Executivo':      { foto: 'MEGA',         motivo: 'ANEIS',        frase: 'o orçamento do ano em uma página' },
  'DRE':                   { foto: 'OPERACIONAL',  motivo: 'OPERACIONAL',  frase: 'conta a conta, do ritmo ao orçamento' },
  'Manutenção':            { foto: 'CORRETIVA',    motivo: 'PREVENTIVA',   frase: 'o que custa manter o Mega rodando' },
  'Segurança':             { foto: 'PATRIMONIAL',  motivo: 'PATRIMONIAL',  frase: 'vigilância, portaria e monitoramento' },
  'Limpeza e Conservação': { foto: 'INTERNOS',     motivo: 'CONTRATADOS',  frase: 'o Mega limpo e conservado o ano inteiro' },
  'Projetos × Recorrente': { foto: 'PREVENTIVA',   motivo: 'INTERNOS',     frase: 'o que é obra pontual e o que é rotina' },
  'Custo por m²':          { foto: 'CONTRATADOS',  motivo: 'M2',           frase: 'quanto custa cada m² por mês' }
};
// Fotos escolhidas olhando as imagens (07/10/2026): a foto mostra o que a
// seção trata — técnicos nas plataformas na Manutenção, a doca com nivelador
// nos Projetos, o gramado conservado na Limpeza, o armazém no Custo por m².
// Pasta (dentro de APRESENTAÇÃO ORÇAMENTO) com as fotos tratadas das sub
// capas: "SUBCAPA - <chave da foto>.png" (MEGA → "SUBCAPA - MEGA CURITIBA.png")
// e o traço de caneta "CANETA - SUBLINHADO.png".
const ORC_PASTA_IMAGENS_SUBCAPAS = 'IMAGENS - SUBCAPAS';
