/**
 * ARQUIVO: 16_Slide_RecebimentoObras.gs
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






// ==========================================
// PONTO DE ENTRADA (pipeline de 00_Main.gs)
// ==========================================
function gerarSlideRecebimentoObras() {
  const deck = getDeckMensal_();
  [TAG_RECEBIMENTO, TAG_ANALISE_PROJETOS].forEach(t => {
    _tabRemoverPorTag_(deck, t);
    _tabRemoverPorTag_(deck, _recTagHist_(t));
  });

  let n = 0;
  // Análise de Projetos com tag própria: vai para Adequações de Clientes (24_OrdemDeck.gs).
  [['esteio', TAG_RECEBIMENTO], ['ctba', TAG_RECEBIMENTO], ['analise', TAG_ANALISE_PROJETOS]].forEach(([k, tag]) => {
    n += _recGerar_(deck, REL_RECEBIMENTO[k], tag);
  });
  Logger.log('  Recebimento de Obras: ' + n + ' slide(s).');
  return n;
}


// ==========================================
// GERAÇÃO
// ==========================================
function _recTagHist_(tag) { return tag.replace('_AUTO】', '_HIST_AUTO】'); }

function _recGerar_(deck, rel, tag) {
  const linhas = _tabLerAba_(rel.aba, rel.cabecalhoContem).rows;

  const SW = deck.getPageWidth();
  const SH = deck.getPageHeight();
  // Deck mensal: o rodapé diz o mês de referência, não o dia da geração.
  // Ver _tabRotuloReferencia_ em 03_Tabelas.gs.
  const referencia = _tabRotuloReferencia_();

  const abertos    = linhas.filter(r => !rel.testeConcluido(r));
  const concluidos = linhas.filter(r =>  rel.testeConcluido(r));

  const kTotal = rel.kpis[0], kConcl = rel.kpis[1], kAberto = rel.kpis[2];

  // Bloco principal: só o que está em aberto, e só a contagem em aberto.
  let n = _recPaginas_(deck, SW, SH, rel, abertos, tag,
    [{ label: kAberto.label, cor: kAberto.cor, valor: abertos.length }], '', referencia, null);

  // Bloco histórico: o total geral e o % concluído, que só fazem sentido aqui.
  if (concluidos.length) {
    const pct = linhas.length ? Math.round((concluidos.length / linhas.length) * 100) : 0;
    n += _recPaginas_(deck, SW, SH, rel, concluidos,
      _recTagHist_(tag),
      [{ label: kTotal.label, cor: kTotal.cor, valor: linhas.length },
       { label: kConcl.label, cor: kConcl.cor, valor: concluidos.length }],
      pct + '% ' + rel.pctTexto, referencia, 'HISTÓRICO · CONCLUÍDOS');
  }
  return n;
}

function _recPaginas_(deck, SW, SH, rel, linhas, tag, kpis, pctStr, referencia, legenda) {
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
    _tabDesenharRodape_(slide, SW, kpis, pctStr, rodapeY, rodapeH, referencia, idx + 1, pgs.length);
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
