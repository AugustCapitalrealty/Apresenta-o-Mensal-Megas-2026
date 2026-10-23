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

// Modelos de orçamento 2027 de TODAS as unidades (exportação completa do
// sistema, pasta "00 - PLANILHAS MESTRAS" — Guilherme, 12/10/2026). Os três
// Megas leem as mesmas duas planilhas e ficam só com as linhas da sua unidade
// (unidadeModelo, coluna B "Cód. da unidade"): Capital Realty, Demercado, CR
// SP e as comissões por módulo ficam de fora, como nas planilhas por Mega de
// antes (hoje "PODE EXCLUIR - MEGA <X> - 0x0 …"). Nova exportação: substituir
// o conteúdo destas planilhas (o ID fica) ou trocar o ID aqui.
// 12/10/2026, 16h: exportação "…-Atualizado" — o empréstimo Itaú entra no 070
// de Curitiba, o Moked do Esteio cai e as duas lavagens das estruturas
// metálicas de Curitiba saem do ano (090 "v2"; a primeira veio sem a coluna
// Item). As de 12h (1eGg8vWV…, 1TSAqizR…) viraram "PODE EXCLUIR - …".
// 12/10/2026, 19h54: a atualização final (pasta "ATUALIZAÇÃO 12-10-2026", importarAtualizacao()) —
// o Moked do Esteio volta ao 070 (R$ 7.000/mês). As das 16h: 090 1GsxlXr-…, 070 1Msx1LjK….
const ORC_MODELO_090_ID = '16LPXeEkCwAwFOCuss4v5dYe11KM8JAfNWnSlljBb78I';   // MESTRA - 090 - DESPESAS GERAIS (22-10-2026 23h); a de 18h era 1i1XFv1X…
const ORC_MODELO_070_ID = '1U8cUr3PrFaDvzE-ziEyFMtUWpArnI__ffbyMe2SE8BA';   // MESTRA - 070 - SERVIÇOS DE TERCEIROS (22-10-2026)

// Planilhas do modelo de orçamento, por cidade. Itajaí e Esteio entram quando
// as planilhas existirem — com o ID vazio a geração escreve o aviso no slide
// em vez de desenhar números zerados.
const ORC_CIDADES = {
  CURITIBA: {
    nome: 'Mega Curitiba',
    // O Mega Curitiba é da Demercado, não da Capital Realty: cores, logo e
    // nome da marca da Demercado (ORC_MARCAS) — Guilherme, 07/10/2026.
    marca: 'DEMERCADO',
    deckId: '1dxVHYGcpaOHJzO6_37cNz4WQ94mR6gh9PUHt5zVifvI',            // MEGA CURITIBA - APRESENTAÇÃO ORÇAMENTO 2027
    // Capa (10_Capa.gs): foto do Mega e logo do Mega — os mesmos da capa da
    // apresentação mensal dos Megas (megas-mensal/01_Config.gs, PROJETOS).
    fotoFundoId: '1F3tWOxcemRJUcf5di6DygCu7s5KHH_NC',
    unitLogoId:  '14shFW_8eNUMdc6MBsrg9IvDMerQsTVv7',
    // Até 12/10/2026: "MEGA CURITIBA - 090 DESPESAS GERAIS 2027" (1cMgo0gB…)
    // e "… - 070 SERVIÇOS DE TERCEIROS 2027" (1BrIqFUF…), só com a unidade 60.
    despesasGeraisId:    ORC_MODELO_090_ID,
    servicosTerceirosId: ORC_MODELO_070_ID,
    unidadeModelo: 60,                                                     // Mega Curitiba
    // Relatórios da controladoria (pasta "02 - MEGA CURITIBA"), uma aba cada:
    //   metragem → conta × Real 2025 | Orça 2026 | Ritmo 2026 | Orça 2027, com
    //              IPTU, Seguro e R$/m² — base da DRE e dos ofensores.
    //   mensal   → conta × (Orç 26 | Real 26 | Orça 27 | Variação) por mês —
    //              base da análise linha a linha.
    // A "Mega-Curitiba-Mensal-2027" NÃO é usada: a coluna Variação do ano
    // dela repete a variação de janeiro (-58.471 em vez de -425.122 na
    // segurança).
    relatorios: {
      metragemId: '1tawzpoCAEF3ftXZPhCW1FcboxxFPARKsLheBabaszkk',   // MEGA CURITIBA - METRAGEM-COND 2027 (22-10-2026)
      // 2026 mês a mês (Orç e Ritmo) que fecha com a METRAGEM — substitui o do Despesas-Mensal.
      ritmoId:    '121pYnxYFP0OippjzeJSdvd_IzHxCnzqqqy7BgqBZ1zU',   // MEGA CURITIBA - RITMO 2026 (12-10-2026 20h42)
      mensalId:   '1Un6j9AfAqiftiogUUDq3soieqEGf8ufOGf82ekdPMwU',   // MEGA CURITIBA - MENSAL 2027 (22-10-2026 23h)
      // Planilha da apresentação mensal dos Megas (megas-mensal/01_Config.gs,
      // PROJETOS.<cidade>.spreadsheetId): a aba "Financeiro <ano retrasado>"
      // dá o Real mês a mês do slide de custo por m² (20_M2Mensal.gs).
      financeiroMegasId: '160_zGacZ5c4Y9uPnJbmP9Ca5vMMQTm8sjmFI5WvOg8Q',   // Mega Curitiba - Planilha 2026
      // Contas em que o mensal não fecha com a METRAGEM e a contabilidade
      // orientou usar a METRAGEM (06/10/2026: IPTU −R$ 3.032, Seguro
      // −R$ 10.645 no Orç 2027). Ficam sem o ⚠ REVISAR e fora do slide de
      // revisão; a divergência só vai para o log.
      // 12/10/2026, 20h: + Outras taxas e impostos — a METRAGEM das 19h56 traz
      // R$ 2.455 e o Despesas-Mensal (mais antigo, não veio na atualização)
      // ainda R$ 0; os modelos não têm a conta, o número é o da METRAGEM. Sem
      // isso, 7 slides com ⚠ REVISAR. O mês a mês se ajusta à DRE sozinho.
      valeMetragem: ['IPTU', 'Seguro', 'Outras taxas e impostos'],
      // Orç 2027 de cada conta = modelos 070/090 + contratos, conferido com a
      // METRAGEM a cada geração (12/10/2026): batendo, nada aparece; não
      // batendo, vale o dos modelos e a diferença vai para o slide de revisão.
      // Fica ligado também com METRAGEM nova — não precisa mexer.
      // Real 2025, Orç e Ritmo 2026 seguem da METRAGEM. Ver 04_DadosRelatorios.gs.
      orcDosModelos: true
    },
    // Contratos: do cadastro mestre do ano, como Itajaí e Esteio (pedido do
    // usuário em 07/10/2026: "padronizar os 3, usar as planilhas mestres").
    // As planilhas individuais "MEGA CURITIBA - CONTRATOS 2027 - <CONTA>"
    // deixaram de ser lidas — os totais batiam centavo por centavo com o
    // cadastro (manutenção R$ 343.189,40; segurança R$ 1.647.520,43; limpeza
    // R$ 348.423,60).
    contratos: {},
    contratosDoCadastro: true,
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
  // 02_Dados.gs, "CONTRATOS-2027-COMPLETO"), como em Curitiba.
  // Conta sem contrato no cadastro sai com o alerta de pendência
  // (19_Revisar.gs).
  ITAJAI: {
    nome: 'Mega Itajaí',
    deckId: '1IBhGpq4PPPHj4il-2zEYRX1a_7ftJN_1X0VRFb4kA_E',            // MEGA ITAJAÍ - APRESENTAÇÃO ORÇAMENTO 2027
    fotoFundoId: '1TwANLdubJUHjcW8WpWRRR5gRv2Sty10K',
    unitLogoId:  '1MADm_n6K200Bij43OcIf1pLo3fKt3UDm',
    // Até 12/10/2026: "MEGA ITAJAÍ - 090 …" (1x2Fqc_t…) e "… - 070 …" (1jlUb8NJ…).
    despesasGeraisId:    ORC_MODELO_090_ID,
    servicosTerceirosId: ORC_MODELO_070_ID,
    unidadeModelo: 19,                                                     // Mega Itajaí
    relatorios: {
      metragemId: '14j2urNQdd5hkypJJ5RlVjyora7-Y14m0rDjnBIF1XtY',   // MEGA ITAJAÍ - METRAGEM-COND 2027 (22-10-2026)
      ritmoId:    '1fNnwrqm22x0RVq0zXMO5f3vD1oOZF0pCpPS-ytmYOyk',   // MEGA ITAJAÍ - RITMO 2026 (12-10-2026 20h43)
      mensalId:   '1S0jfhLXIRKTGynuOfoetkrjCkXx72NEGcNaSsmNxxjE',   // MEGA ITAJAÍ - MENSAL 2027 (22-10-2026 23h)
      financeiroMegasId: '1UQXY1bNS-w4PuLOILpemiXRuMu3ao2mguVgsiO-14k4',   // planilha dos Megas (Itajaí)
      orcDosModelos: true   // Orç 2027 pelos modelos + contratos (ver Curitiba)
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
    // Até 12/10/2026: "MEGA ESTEIO - 090 …" (1jC7aDDG…) e "… - 070 …" (1hDki35E…).
    despesasGeraisId:    ORC_MODELO_090_ID,
    servicosTerceirosId: ORC_MODELO_070_ID,
    unidadeModelo: 18,                                                     // Mega Esteio
    relatorios: {
      metragemId: '1RvWqP_wxSk2eJVsojIMpu3tjfRPpHg1UZWjjiql5vCU',   // MEGA ESTEIO - METRAGEM-COND 2027 (22-10-2026 Pátio)
      ritmoId:    '1p3RX8XDVy9PZHmjfWfap1YdlZO7n1tDPfwd4ZEag8AQ',   // MEGA ESTEIO - RITMO 2026 (12-10-2026 20h43)
      mensalId:   '1LdGKll9z-edZIFhfCKlu0SaOYfm-CsI7xeYhvdZV2B0',   // MEGA ESTEIO - MENSAL 2027 (22-10-2026 23h)
      financeiroMegasId: '1wbtzAqiv7fhXiwmxaAmQb5Nc0UV0EaDZwPoJqknhvYY',   // planilha dos Megas (Esteio)
      // 12/10/2026, 20h: a METRAGEM das 19h56 traz R$ 1.200 em Outras taxas e
      // impostos e o Despesas-Mensal ainda R$ 0 — vale a METRAGEM (ver Curitiba).
      valeMetragem: ['Outras taxas e impostos'],
      orcDosModelos: true   // Orç 2027 pelos modelos + contratos (ver Curitiba)
    },
    contratos: {},
    contratosDoCadastro: true,
    // Por que a área muda do ritmo para o orçamento (rodapé dos slides com
    // R$/m², _orcNotaArea_): sem isso, "+95% em R$ e −0,85 em R$/m²" parecia
    // erro (gestor, 07/10/2026).
    motivoArea: 'entram os Armazéns B1 e B2',
    premissas: { premissas: '', analisado: '', comoLer: '' }
  }
};

// Colunas da aba "Valores do Modelo" (base 0): A = descrição do item (é a
// conta: "manutenção imóveis", "Seguros"...), B = código da unidade (filtro
// do Mega na planilha de todas as unidades), F = item, I..T = Mês 1..12.
// O cabeçalho é conferido na leitura: se alguém inserir uma coluna, a geração
// para com erro em vez de ler o mês errado.
const ORC_COL = { conta: 0, unidade: 1, item: 5, mes1: 8 };

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

// Último mês FECHADO do ritmo do ano anterior (9 = setembro). O relatório
// Despesas-Mensal não separa o realizado da projeção: daqui em diante o ritmo
// é projeção (tracejado e com a faixa "projeção" no Custo por m² mês a mês).
// Atualizar a cada fechamento.
const ORC_RITMO_ULTIMO_MES_FECHADO = 9;

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
    accentRed:    '#EF4444',
    brandAccent:  '#60A5FA',   // destaque claro (número da sub capa, ponto do rodapé da capa)
    brandTint:    '#EFF6FF',   // fundo bem claro da marca (caixas de leitura)
    brandTint2:   '#DBEAFE'    // linha de total e coluna em destaque das tabelas
  },
  typography: {
    titles:  'Montserrat',
    body:    'Open Sans',
    heading: 'Montserrat'   // só o título do slide (cabeçalho); a Demercado usa serifa
  },
  layout: {
    marginX: 30,
    headerH: 64
  },
  marca: { nome: 'Capital Realty', slogan: 'Expandir Eficiência' }
};

// Logos oficiais (mesmos IDs de megas-mensal/01_Config.gs).
//   Negativo (branco) → capa, fundo escuro.  Positivo (escuro) → cabeçalho.
//   "pasta:<nome>" = imagem da pasta ORC_PASTA_IMAGENS, pelo nome.
const LOGOS_CR = {
  fullNegativo: '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p',
  fullPositivo: '1XqFtIobiEq7VC2H41sKnFNUuOluw_J4V'
};

// Marcas dos Megas (cid.marca; sem ela, CAPITAL). _orcAplicarMarca_
// (00_Helpers.gs) troca, durante a geração do Mega, as cores de
// CR_DESIGN_SYSTEM, o nome da marca e os logos de LOGOS_CR; no fim volta à
// Capital Realty. Demercado: manual de marca AF-6914-21 (cores p. 9: verde
// 3292 C #00594F, amarelo 104 C #AF9800, cinza escuro #262626) e logos
// extraídos do PDF "Atualização logo DEMERCADO" (IMAGENS - SLIDES).
const ORC_MARCAS = {
  CAPITAL: {
    colors: JSON.parse(JSON.stringify(CR_DESIGN_SYSTEM.colors)),
    typography: JSON.parse(JSON.stringify(CR_DESIGN_SYSTEM.typography)),
    marca: { nome: 'Capital Realty', slogan: 'Expandir Eficiência' },
    trilha: 'TRILHA - CAPITAL',
    logos: { fullNegativo: LOGOS_CR.fullNegativo, fullPositivo: LOGOS_CR.fullPositivo }
  },
  DEMERCADO: {
    colors: {
      brandDark:  '#00594F',   // verde petróleo (principal)
      brandMed:   '#3C8C7F',   // verde médio (distinto do principal nas marcas dos grupos)
      brandLight: '#AF9800',   // amarelo ouro
      brandSoft:  '#D9CB7E',   // ouro claro
      bgSlide:    '#F8FAF9',
      textMain:   '#262626',   // cinza escuro
      textBody:   '#4B5250',
      textMuted:  '#9AA19F',
      lines:      '#E3E8E6',
      zebra:      '#F2F6F5',
      brandAccent: '#C9B037',
      brandTint:  '#EEF5F3',
      brandTint2: '#D7E8E4'
    },
    // Título do slide em EB Garamond (a Garamond do manual, livre no Google
    // Slides); números e tabelas seguem em Montserrat/Open Sans (legibilidade).
    // Aprovado pelo Guilherme em 07/10/2026.
    typography: { heading: 'EB Garamond' },
    marca: { nome: 'Demercado Investimentos', slogan: '' },
    trilha: 'TRILHA - DEMERCADO',
    logos: { fullNegativo: 'pasta:LOGO - DEMERCADO - NEGATIVO.png', fullPositivo: 'pasta:LOGO - DEMERCADO - POSITIVO.png' }
  }
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

// Sub capa (gerarSlideSubcapa_, 10_Capa.gs) e sumário de cada seção, pelo
// título:
//   foto  → chave de ORC_FOTOS_SECAO, ou 'MEGA' = a foto da capa do próprio
//           Mega (cid.fotoFundoId). Escolhidas olhando as imagens (07/10/2026):
//           a foto mostra o que a seção trata — técnicos nas plataformas na
//           Manutenção, a doca com nivelador nos Projetos, o gramado
//           conservado na Limpeza, o armazém no Custo por m².
//   frase → a linha curta embaixo do título (sub capa e sumário). Textos
//           propostos em 07/10/2026; o gestor pode trocar aqui.
const ORC_SUBCAPAS = {
  'Premissas':             { foto: 'DOCUMENTACAO', frase: 'Como este orçamento foi construído' },
  'Resumo Executivo':      { foto: 'MEGA',         frase: 'O orçamento do ano em uma página' },
  'DRE':                   { foto: 'OPERACIONAL',  frase: 'Conta a conta, do ritmo ao orçamento' },
  'Segurança':             { foto: 'PATRIMONIAL',  frase: 'Vigilância, portaria e monitoramento' },
  'Manutenção':            { foto: 'CORRETIVA',    frase: 'O custo para manter o Mega rodando' },
  'Limpeza e Conservação': { foto: 'INTERNOS',     frase: 'O Mega limpo e conservado o ano inteiro' },
  'Contratos':             { foto: 'PREVENTIVA',   frase: 'Cada contrato, de 2026 para 2027' },
  'Análise de Custos':     { foto: 'CONTRATADOS',  frase: 'Quanto custa cada m² por mês' },
  // Moldes de fotos do gestor (26_Fotos.gs): desde 13/10/2026 sem seção própria no sumário.
  'Registro fotográfico':  { foto: 'PREVENTIVA',   frase: 'O que o gestor quer mostrar, em fotos' }
};
// Seções do deck, na ordem que o gestor montou no Mega Esteio da v3 (13/10/2026) — o padrão dos três Megas:
// Contratos saiu da DRE e virou seção; Segurança antes da Manutenção; "Custo por m²" virou "Análise de Custos";
// as fotos do gestor ficam dentro da seção delas (Segurança, Manutenção), sem a seção "Registro fotográfico".
// Sumário, trilha do topo e sub capas seguem esta lista (ferramentas/trilha_imagem.py e capas_imagem.py também).
const ORC_SECOES = ['Premissas', 'Resumo Executivo', 'DRE', 'Segurança', 'Manutenção', 'Limpeza e Conservação',
                    'Contratos', 'Análise de Custos'];
// No deck de Facilities, seções que abrem sem sub capa (o gestor não pôs: vêm logo depois do sumário do Mega).
const ORC_SECOES_SEM_SUBCAPA = ['Premissas', 'Resumo Executivo'];
// Perguntas em aberto com o gestor ou a controladoria, por Mega (nome em
// ORC_CIDADES): entram no slide "Revisar antes da versão final" junto com as
// pendências de dados e põem o selo ⚠ PENDENTE nos slides da conta. Resolvida
// a pergunta, apague a linha e gere de novo. Origem: comentários do gestor nas
// planilhas de comparação 2026 × 2027 (07/10/2026).
const ORC_PENDENCIAS_GESTOR = {
  // Itajaí: tudo respondido pelo gestor na exportação dos modelos de 12/10/2026 —
  // entrou a "PROVISÃO DE 3% SOBRE A MANUTENÇÃO PARA ITENS NÃO PREVISTOS"
  // (R$ 4.506/mês) e as iluminações do bolsão e do AMZ 4/5, o quadro da portaria
  // e o totem foram puxados para 2026 (zerados no 090 de 2027). Antes:
  // recalque paver (feito em ago/2026) e Orbital → Firecam / NFPA (NFPA feita
  // em out/2026; em 2027 só a Firecam), respondidas pelo ritmo.
  'Mega Itajaí': [],
  // Curitiba, linha 4 da comparação (provisão de acesso × FM Security): vale o
  // SIM, não entra nos 3% (gestor, via Guilherme, 12/10/2026).
  'Mega Curitiba': []
};

// Pasta (dentro de APRESENTAÇÃO ORÇAMENTO) com slides desenhados como imagem
// por ferramentas/capas_imagem.py: "CAPA - MEGA CURITIBA.jpg"… O gerador usa a
// imagem como fundo do slide e escreve por cima só o que vem dos dados. Sem a
// imagem, o slide é desenhado com formas, como antes.
const ORC_PASTA_IMAGENS = 'IMAGENS - SLIDES';

// Molduras em imagem (v2, 07/10/2026): o fundo de cada slide — cards com
// sombra suave, barra e linha do cabeçalho, trilha de progresso — vem numa
// imagem só, "MOLDURA - <assinatura>.png" da pasta acima, feita por
// ferramentas/molduras_imagem.py a partir do manifesto que o teste grava. Sem
// a imagem (ou com false aqui), o slide desenha tudo com formas, como antes.
const ORC_USAR_MOLDURAS = true;

// Formas pelo motor (07/10/2026, "o máximo de moldura possível"): em todo
// slide com cabeçalho, as formas do conteúdo (fundos de tabela, faixas,
// barras, linhas dos gráficos, bolinhas) viram UMA imagem "GRAFICO -
// <assinatura>.png" na pasta de imagens, desenhada por
// ferramentas/graficos_imagem.py, logo acima da moldura; os textos ficam no
// slide, editáveis. A assinatura sai das próprias formas: a imagem só muda se
// algum número (ou o layout) mudar. false = tudo em formas, como antes.
const ORC_USAR_GRAFICOS_IMAGEM = true;

// Onde está o assunto em cada foto (fração da largura): a foto do bloco da
// sub capa é centrada nesse ponto quando dá.
const ORC_FOTO_FOCO = {
  CORRETIVA: 0.40, PATRIMONIAL: 0.45, INTERNOS: 0.65, PREVENTIVA: 0.68, CONTRATADOS: 0.47,
  DOCUMENTACAO: 0.58, OPERACIONAL: 0.47, 'MEGA CURITIBA': 0.26, 'MEGA ITAJAÍ': 0.30, 'MEGA ESTEIO': 0.52
};
