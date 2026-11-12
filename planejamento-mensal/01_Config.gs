/**
 * ARQUIVO: 01_Config.gs
 * CONFIGURAÇÃO — IDs, cores e o mapa conta → rubrica do DRE de P&G.
 *
 * Deck mensal da Gerência de Planejamento e Gestão (P&G). Três seções:
 * 01 Financeiro (export da controladoria), 02 Metas (Farol 2026),
 * 03 Projetos (planilha de portfólio). Decisões do Guilherme, 12/11/2026.
 */

// Pasta do Drive: 29 - Template Apresentações/03 - APRESENTAÇÃO MENSAL - GERENCIAL/PLANEJAMENTO & GESTÃO
// Nela ficam o export (Planejamento-<Mês>-<Ano>.csv), a planilha de metas e
// projetos e os decks do mês.
const PG_PASTA_ID = '1LEc7_dZzkX9HueP0T2_5Oi8NAF34ERZj';

const PG_PLANILHA_NOME = 'PLANILHA PLANEJAMENTO & GESTÃO';
const PG_PROP_PLANILHA = 'PG_PLANILHA_ID';          // Propriedades do script (gravado por criarPlanilhaPG)

// Logos Capital Realty no Drive (os mesmos dos outros geradores).
const PG_LOGO_COR_ID = '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4';   // positivo/colorido (cabeçalho dos slides claros)
const PG_LOGO_NEG_ID = '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p';   // negativo (capa, divisórias, encerramento)

// Centro de custo do export (só para conferência e rodapé).
const PG_CENTRO_CUSTO = '1.01.01.008 GERÊNCIA DE PLANEJAMENTO E GESTÃO';

// Pontuação mínima para elegibilidade (mesma regra dos Megas e do Farol).
const PG_METAS_PONTOS_ELEGIVEL = 50;

const PG_MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO',
  'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const PG_MESES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Mesmos valores de marca do CR_DESIGN_SYSTEM de megas-mensal / propriedades-mensal.
// Função, não const lendo outro arquivo (lição 7 do README do repositório).
const CR_DESIGN_SYSTEM = {
  brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9', brandSoft: '#93C5FD',
  bgSlide: '#F8FAFC', card: '#FFFFFF', azulClaro: '#E9F0FA',
  textMain: '#16213E', textBody: '#46516B', textMuted: '#8592AC', lines: '#E2E8F0',
  verde: '#10B981', verdeEsc: '#0B5C34', verdeClaro: '#DEF4E9',
  amarelo: '#E5A417', amareloEsc: '#7A5B00', amareloClaro: '#FDF1D2',
  vermelho: '#EF4444', vermelhoEsc: '#9B1C1C', vermelhoClaro: '#FDE2E2',
  cinzaPill: '#E3E8F4', cinzaBarra: '#E8EDF5', entregue: '#8FA3C7',
  // Variação de despesa: gastar MAIS que o ritmo é ruim (vermelho), menos é bom (verde).
  pior: '#D32F2F', melhor: '#0E8A5F',
  titulos: 'Montserrat', corpo: 'Open Sans',
  marginX: 30, logoH: 30
};

/**
 * Conta da controladoria → rubrica do DRE de P&G. Comparação por prefixo do
 * código ("06.01.05" pega 06.01.05.01 e 06.01.05.02).
 *
 * POR QUE NÃO É O DRE_PROP_CATEGORIAS de Propriedades: aqui 95% do gasto é
 * pessoal; com a categoria única "Despesa de pessoal" o DRE viraria uma linha
 * só. As 4 categorias dos Megas não fazem sentido (não há manutenção nem
 * utilities); estes grupos dizem o que a área gasta de verdade.
 *
 * Conta de despesa (06) fora do mapa entra em "Outras (fora do mapa)" e vai
 * para o log e para a nota do slide — nunca some do total.
 * Depreciação (08) fica fora do DRE (não é despesa operacional), como em
 * Propriedades; aparece só no rodapé.
 *
 * detalhar: false → o grupo sai SEMPRE numa linha só (DRE, mês a mês, cascata e
 *   notas). PESSOAL: decisão do Guilherme, 12/11/2026 ("o DRE não entra em
 *   detalhes do custo com pessoal") — numa área pequena, abrir salário/bônus/
 *   provisão expõe a remuneração de pessoas. Os itens continuam aqui só para
 *   conferência no log/diagnóstico.
 * mesAMes: false → no Bridge mês a mês o grupo sai numa linha só (VIAGENS,
 *   Guilherme, 12/11/2026: "mês a mês de viagens não precisa"); no DRE abre.
 */
const PG_RUBRICAS = [
  { grupo: 'PESSOAL', detalhar: false, itens: [
    ['Salários, férias e bônus', ['06.01.01']],
    ['Encargos (INSS e FGTS)', ['06.01.05']],
    ['Provisões (férias e 13º)', ['06.01.06']],
    ['Benefícios', ['06.01.02', '06.01.03', '06.01.04', '06.01.07', '06.01.08', '06.01.09', '06.01.10', '06.01.11']],
    ['Outras despesas de pessoal', ['06.01']]
  ] },
  { grupo: 'VIAGENS E DESLOCAMENTOS', mesAMes: false, itens: [
    ['Passagens', ['06.04.09']],
    ['Hospedagem', ['06.04.10']],
    ['Refeição e representação', ['06.04.11']],
    ['Táxi / Uber', ['06.04.12']],
    ['Veículos, combustível e estacionamento', ['06.04.13', '06.04.14', '06.04.04']]
  ] },
  { grupo: 'SERVIÇOS DE TERCEIROS', itens: [
    ['Serviços de terceiros', ['06.02', '06.04.06', '06.04.20']]
  ] },
  { grupo: 'OUTRAS DESPESAS', itens: [
    ['Cursos, cópias e outras administrativas', ['06.04.21']],
    ['Telefone, material e taxas', ['06.04.03', '06.04.02', '06.03', '06.04.01', '06.04.05', '06.04.07', '06.04.08']],
    ['Outras (fora do mapa)', ['06']]
  ] }
];

// Situação dos projetos do ano (aba PROJETOS, coluna Situação). Chave = texto sem acento, minúsculo.
// Seção 03 = só a LISTA dos projetos feitos no ano (Guilherme, 12/11/2026: sem
// cronograma, sem farol de prazo, sem marcos).
const PG_SITUACAO_PROJETO = {
  'concluido':    { rotulo: 'CONCLUÍDO',    cor: '#10B981', fundo: '#DEF4E9', texto: '#0B5C34', ordem: 0 },
  'em andamento': { rotulo: 'EM ANDAMENTO', cor: '#065CA9', fundo: '#E9F0FA', texto: '#003D7B', ordem: 1 },
  'pausado':      { rotulo: 'PAUSADO',      cor: '#94A3B8', fundo: '#EEF1F5', texto: '#46516B', ordem: 2 }
};
const PG_STATUS_VAZIO = { rotulo: 'A PREENCHER', cor: '#CBD5E1', fundo: '#F1F5F9', texto: '#8592AC', ordem: 3 };

// Status das METAS (colunas Status mês / Status ano), no padrão das cores do Farol.
const PG_STATUS_META = {
  'verde':    { rotulo: 'ATINGIDA',      fundo: '#DEF4E9', texto: '#0B5C34', cor: '#10B981' },
  'amarelo':  { rotulo: 'EM ANDAMENTO',  fundo: '#FDF1D2', texto: '#7A5B00', cor: '#E5A417' },
  'vermelho': { rotulo: 'NÃO ATINGIDA',  fundo: '#FDE2E2', texto: '#9B1C1C', cor: '#EF4444' }
};
