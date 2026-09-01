/**
 * ARQUIVO: Slide_RecebimentoObras.gs
 * SEÇÃO:   SLIDE — Recebimento de Obras (Esteio · Curitiba · Análise de Projetos)
 *
 * Três relatórios com o mesmo desenho, descritos por ficha em REL_RECEBIMENTO.
 * O desenho em si é o motor de 03_Tabelas.gs.
 *
 * PENDÊNCIAS x HISTÓRICO
 * Cada relatório vira DOIS blocos de slides: o principal só com o que está em
 * aberto, e um histórico com o que já foi concluído. Misturar os dois no mesmo
 * slide faz a reunião discutir linha concluída, que é justamente o que não
 * precisa de decisão.
 *
 * Por isso os KPIs também mudam de bloco: no principal só a contagem em aberto
 * (o "% concluído" ao lado de uma lista de pendências confunde — o número fala
 * do total, a lista não); no histórico, o total geral, os concluídos e o %.
 */

const TAG_RECEBIMENTO = '【RECEBIMENTO_AUTO】';

const REC_COLUNAS = [
  { nome: 'Empreendimento', tipo: 'textoCentro', largura: 0.18 },
  { nome: 'Obra',           tipo: 'texto',       largura: 0.40 },
  { nome: 'Pendência',      tipo: 'textoCentro', largura: 0.24 },
  { nome: 'Status',         tipo: 'status',      largura: 0.18 }
];

// Contam sobre a coluna Status (índice 3).
const REC_KPIS = [
  { label: 'TOTAL',     cor: CR_DESIGN_SYSTEM.colors.brandDark,   teste: null },
  { label: 'CONCLUÍDO', cor: CR_DESIGN_SYSTEM.colors.accentGreen, teste: r => /conclu/i.test(_tabV_(r, 3)) },
  { label: 'PENDENTE',  cor: CR_DESIGN_SYSTEM.colors.accentRed,   teste: r => /pendente/i.test(_tabV_(r, 3)) }
];

const REL_RECEBIMENTO = {
  esteio: {
    nome:            'Esteio',
    aba:             'Recebimento de Obras - Esteio',
    titulo:          'RECEBIMENTO DE OBRAS · ESTEIO',
    subtitulo:       'Pendências da Obra · MEGA ESTEIO',
    cabecalhoContem: ['EMPREENDIMENTO', 'PENDÊNCIA', 'PENDENCIA'],
    colunas:         REC_COLUNAS,
    kpis:            REC_KPIS,
    pctTexto:        'concluído',
    testeConcluido:  r => /conclu/i.test(_tabV_(r, 3))
  },

  ctba: {
    nome:            'Curitiba',
    aba:             'Recebimento de Obras - Ctba',
    titulo:          'RECEBIMENTO DE OBRAS · CURITIBA',
    subtitulo:       'Pendências da Obra · MEGA CURITIBA',
    cabecalhoContem: ['EMPREENDIMENTO', 'PENDÊNCIA', 'PENDENCIA'],
    colunas:         REC_COLUNAS,
    kpis:            REC_KPIS,
    pctTexto:        'concluído',
    testeConcluido:  r => /conclu/i.test(_tabV_(r, 3))
  },

  analise: {
    nome:            'Análise de Projetos',
    aba:             'Análise de Projetos',
    titulo:          'ANÁLISE DE PROJETOS',
    subtitulo:       'Recebimento de Obras',
    cabecalhoContem: ['OBJETIVO', 'AVALIADOR', 'LOCAT'],
    // 10 colunas: fonte menor e 7 linhas/slide, para o Objetivo de 2 linhas
    // caber sem transbordar a célula.
    fonte:           7.5,
    fonteHeader:     7.5,
    maxLinhas:       7,
    colunas: [
      { nome: 'Empr.',     tipo: 'textoCentro', largura: 0.085 },
      { nome: 'Locatário', tipo: 'textoCentro', largura: 0.085 },
      { nome: 'Objetivo',  tipo: 'texto',       largura: 0.175 },
      { nome: 'Compl.',    tipo: 'textoCentro', largura: 0.13,  fonte: 6.5 },
      { nome: 'Mem.',      tipo: 'textoCentro', largura: 0.07,  fonte: 6.5 },
      { nome: 'Recebim.',  tipo: 'data',        largura: 0.085, fonte: 6.5 },
      { nome: 'Entrega',   tipo: 'data',        largura: 0.085, fonte: 6.5 },
      { nome: 'Avaliador', tipo: 'textoCentro', largura: 0.11,  maxPalavras: 2 },
      { nome: 'Status',    tipo: 'status',      largura: 0.11 },
      // Prazo é calculado, não lido: concluído → Entrega − Recebimento;
      // em andamento → corre até hoje. Sem isso o prazo de um projeto aberto
      // congela na data em que alguém digitou pela última vez.
      { nome: 'Prazo',     tipo: 'textoCentro', largura: 0.065,
        calcular: r => _recPrazoDias_(_tabV_(r, 5), _tabV_(r, 6), _tabV_(r, 9)) }
    ],
    kpis: [
      { label: 'TOTAL',     cor: CR_DESIGN_SYSTEM.colors.brandDark,    teste: null },
      { label: 'CONCLUÍDO', cor: CR_DESIGN_SYSTEM.colors.accentGreen,  teste: r => /conclu/i.test(_tabV_(r, 8)) },
      { label: 'ANDAMENTO', cor: CR_DESIGN_SYSTEM.colors.accentOrange, teste: r => /andamento/i.test(_tabV_(r, 8)) }
    ],
    pctTexto:       'concluído',
    testeConcluido: r => /conclu/i.test(_tabV_(r, 8))
  }
};


// ==========================================
// PONTO DE ENTRADA (pipeline de 00_Main.gs)
// ==========================================
function gerarSlideRecebimentoObras() {
  const deck = getDeckMensal_();
  _tabRemoverPorTag_(deck, TAG_RECEBIMENTO);
  _tabRemoverPorTag_(deck, TAG_RECEBIMENTO.replace('_AUTO】', '_HIST_AUTO】'));

  let n = 0;
  ['esteio', 'ctba', 'analise'].forEach(k => {
    n += _recGerar_(deck, REL_RECEBIMENTO[k]);
  });
  Logger.log('  Recebimento de Obras: ' + n + ' slide(s).');
  return n;
}


// ==========================================
// GERAÇÃO
// ==========================================
function _recGerar_(deck, rel) {
  const linhas = _tabLerAba_(rel.aba, rel.cabecalhoContem).rows;

  const SW = deck.getPageWidth();
  const SH = deck.getPageHeight();
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');

  const abertos    = linhas.filter(r => !rel.testeConcluido(r));
  const concluidos = linhas.filter(r =>  rel.testeConcluido(r));

  const kTotal = rel.kpis[0], kConcl = rel.kpis[1], kAberto = rel.kpis[2];

  // Bloco principal: só o que está em aberto, e só a contagem em aberto.
  let n = _recPaginas_(deck, SW, SH, rel, abertos, TAG_RECEBIMENTO,
    [{ label: kAberto.label, cor: kAberto.cor, valor: abertos.length }], '', hoje, null);

  // Bloco histórico: o total geral e o % concluído, que só fazem sentido aqui.
  if (concluidos.length) {
    const pct = linhas.length ? Math.round((concluidos.length / linhas.length) * 100) : 0;
    n += _recPaginas_(deck, SW, SH, rel, concluidos,
      TAG_RECEBIMENTO.replace('_AUTO】', '_HIST_AUTO】'),
      [{ label: kTotal.label, cor: kTotal.cor, valor: linhas.length },
       { label: kConcl.label, cor: kConcl.cor, valor: concluidos.length }],
      pct + '% ' + rel.pctTexto, hoje, 'HISTÓRICO · CONCLUÍDOS');
  }
  return n;
}

function _recPaginas_(deck, SW, SH, rel, linhas, tag, kpis, pctStr, hoje, legenda) {
  const maxL   = rel.maxLinhas || TAB_MAX_LINHAS;
  const pgs    = _tabPaginar_(linhas, maxL);

  pgs.forEach((pagina, idx) => {
    const slide = deck.appendSlide();
    slide.getBackground().setSolidFill(TAB_C.bgSlide);
    _tabMarcarSlide_(slide, tag);

    // criarHeaderPadrao (01_Config.gs), não _tabDesenharBanner_ — os dois
    // desenhavam cabeçalhos diferentes no mesmo deck (um claro, um faixa
    // escura), e a apresentação "trocava de layout" no meio da geração.
    // topo fixo em 74 = mesma linha usada por Preventivas/Corretivas/Backlog
    // (linha separadora do header em y=62 + ~12pt de folga).
    criarHeaderPadrao(slide, rel.titulo, rel.subtitulo);

    const rodapeH = SH * 0.095;
    const rodapeY = SH - SH * 0.025 - rodapeH;
    let topo      = 74;

    if (legenda) {
      const h = SH * 0.045;
      _tabDesenharLegenda_(slide, SW, topo, h, legenda);
      topo += h + SH * 0.008;
    }

    _tabDesenharTabela_(slide, SW, SH, pagina, topo, rodapeY - SH * 0.025, rel);
    _tabDesenharRodape_(slide, SW, kpis, pctStr, rodapeY, rodapeH, hoje, idx + 1, pgs.length);
  });

  return pgs.length;
}

// Prazo em dias. Com Entrega → Entrega − Recebimento. Sem Entrega (ainda em
// andamento) → corre até hoje, para o número envelhecer sozinho em vez de
// congelar. Sem as datas, cai no valor digitado na planilha.
function _recPrazoDias_(recebStr, entregaStr, prazoOriginal) {
  const receb = _tabData_(recebStr);
  if (!receb) return prazoOriginal || '';
  const fim  = _tabData_(entregaStr) || _tabHoje_();
  const dias = Math.round((fim - receb) / 86400000);
  return String(dias < 0 ? 0 : dias);
}
