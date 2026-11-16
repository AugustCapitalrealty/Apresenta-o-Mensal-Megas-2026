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
  // A tag _HIST_ de Análise de Projetos é do histórico antigo (aposentado em
  // 16/11/2026): continua na limpeza para sumir de decks que ainda o tenham.
  [TAG_RECEBIMENTO, TAG_ANALISE_PROJETOS, TAG_ANALISE_INDICADORES].forEach(t => {
    _tabRemoverPorTag_(deck, t);
    _tabRemoverPorTag_(deck, _recTagHist_(t));
  });

  let n = 0;
  _recRelatorios_().forEach(r => { n += _recGerar_(deck, r.rel, TAG_RECEBIMENTO, r.linhas); });
  // Análise de Projetos: tag própria, vai para Adequações de Clientes (24_OrdemDeck.gs).
  n += _analiseGerar_(deck);
  Logger.log('  Recebimento de Obras e Análise de Projetos: ' + n + ' slide(s).');
  return n;
}


// ==========================================
// GERAÇÃO
// ==========================================
function _recTagHist_(tag) { return tag.replace('_AUTO】', '_HIST_AUTO】'); }

// As linhas de UM relatório: a aba é uma só (todos os empreendimentos) e a coluna Empreendimento separa.
function _recLinhas_(rel) {
  const todas = _tabLerAba_(rel.aba, rel.cabecalhoContem).rows;
  return rel.empreendimento ? todas.filter(r => rel.empreendimento.test(_tabV_(r, 0))) : todas;
}

// Esteio, Curitiba e QUALQUER outro empreendimento que a planilha trouxer (COMO PREENCHER: "de qualquer
// empreendimento — o slide separa por Empreendimento"). Sem isso, uma obra de um empreendimento novo
// ficava na planilha e nunca chegava ao slide, sem erro nenhum. Lê a aba UMA vez.
// → [{ rel, linhas }]
function _recRelatorios_() {
  const base = [REL_RECEBIMENTO.esteio, REL_RECEBIMENTO.ctba];
  const todas = _tabLerAba_(base[0].aba, base[0].cabecalhoContem).rows;
  const de = rel => (rel.empreendimento ? todas.filter(r => rel.empreendimento.test(_tabV_(r, 0))) : todas);
  const lista = base.map(rel => ({ rel: rel, linhas: de(rel) }));

  const vistos = [];
  todas.forEach(r => {
    const emp = _tabV_(r, 0).toUpperCase();
    if (emp && !base.some(b => b.empreendimento.test(emp)) && vistos.indexOf(emp) < 0) vistos.push(emp);
  });
  vistos.forEach(emp => {
    const curto = emp.replace(/^MEGA\s+/, '');
    const rel = Object.assign({}, base[0], {
      nome: curto, titulo: 'RECEBIMENTO DE OBRAS · ' + curto, subtitulo: 'Pendências da Obra · ' + emp,
      empreendimento: new RegExp('^' + emp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    });
    lista.push({ rel: rel, linhas: de(rel) });
    Logger.log('  Recebimento de Obras: empreendimento "' + emp + '" não tinha relatório próprio; gerado automaticamente.');
  });
  return lista;
}

function _recGerar_(deck, rel, tag, linhasDadas) {
  const linhas = linhasDadas || _recLinhas_(rel);

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


// ==========================================
// ANÁLISE DE PROJETOS — concluídas do mês + indicadores (16/11/2026)
// ==========================================
// Pedido do Guilherme: o deck mostra só o que está em andamento e o que foi
// concluído NO MÊS; o histórico deixou de ser listado e virou indicadores.
// Decisões (rascunho v1 aprovado em 16/11):
//   · "concluída no mês" = data de ENTREGA dentro do mês de referência;
//   · concluídos SEM data de entrega ficam fora de "por mês" e do prazo (e o
//     rodapé do slide diz quantos são), mas contam no total do ano e nos
//     recortes por empreendimento, avaliador e locatário;
//   · prazo = Entrega − Recebimento, em dias (a coluna PRAZO da planilha vem
//     negativa quando falta a Entrega, então não é lida).
// Colunas da aba (só as com nome): 0 Empr. 1 Locatário 2 Objetivo 3 Compl.
// 4 Memorial 5 Recebimento 6 Entrega 7 Avaliador 8 Status 9 Prazo.

function _analiseGerar_(deck) {
  const rel = REL_RECEBIMENTO.analise;
  const linhas = _tabLerAba_(rel.aba, rel.cabecalhoContem).rows;
  const ref = obterMesReferencia_();
  const ind = _analiseIndicadores_(linhas, ref);
  const SW = deck.getPageWidth(), SH = deck.getPageHeight();

  const relMes = Object.assign({}, rel, { subtitulo: 'Em andamento e concluídas em ' + ref.nome + ' ' + ref.ano });
  const kpis = [
    { label: rel.kpis[0].label, cor: rel.kpis[0].cor, valor: ind.concMes },
    { label: rel.kpis[1].label, cor: rel.kpis[1].cor, valor: ind.abertos.length }
  ];
  let n = _recPaginas_(deck, SW, SH, relMes, ind.linhasTabela, TAG_ANALISE_PROJETOS, kpis, '', _tabRotuloReferencia_(), null);
  n += _analiseDesenharIndicadores_(deck, ind, ref);
  Logger.log('  Análise de Projetos: ' + ind.abertos.length + ' em andamento, ' + ind.concMes + ' concluída(s) em ' +
             ref.nome + ', ' + ind.concAno + ' no ano (' + ind.semData + ' sem data de entrega).');
  return n;
}

// Conta pura (sem Slides): é o que o teste_analise.js confere.
function _analiseIndicadores_(linhas, ref) {
  const rel = REL_RECEBIMENTO.analise;
  const DIA = 86400000;
  const abertos = [], concl = [];
  linhas.forEach(r => (rel.testeConcluido(r) ? concl : abertos).push(r));

  const reg = r => ({ r: r, rec: _tabData_(_tabV_(r, 5)), ent: _tabData_(_tabV_(r, 6)) });
  const todas = concl.map(reg);
  const comData = todas.filter(x => x.ent);
  const semData = todas.filter(x => !x.ent);
  // Só entregas do ano do deck, até o mês de referência (entrega futura não conta).
  const noAno = comData.filter(x => x.ent.getFullYear() === ref.ano && x.ent.getMonth() <= ref.index);
  const doMes = m => (m < 0 ? [] : noAno.filter(x => x.ent.getMonth() === m));
  const prazoDe = lista => lista.filter(x => x.rec).map(x => Math.max(0, Math.round((x.ent - x.rec) / DIA)));
  const media = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const mediana = a => {
    if (!a.length) return null;
    const b = a.slice().sort((x, y) => x - y), m = Math.floor(b.length / 2);
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  };

  const mes = doMes(ref.index), ant = doMes(ref.index - 1);
  const pAno = prazoDe(noAno);
  const doAno = noAno.concat(semData);   // os sem data contam no ano e nos recortes

  const contar = (lista, f) => {
    const o = {};
    lista.forEach(x => { const k = f(x.r); if (k) o[k] = (o[k] || 0) + 1; });
    return Object.keys(o).map(k => [k, o[k]]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  };
  const pct = f => (doAno.length ? Math.round(100 * doAno.filter(x => f(x.r)).length / doAno.length) : null);

  const porMes = [];
  for (let m = 0; m <= ref.index; m++) porMes.push(doMes(m).length);

  const concMesLinhas = mes.slice().sort((a, b) => a.ent - b.ent).map(x => x.r);
  return {
    abertos: abertos,
    linhasTabela: abertos.concat(concMesLinhas),
    concMes: mes.length, concMesAnt: ant.length, concAno: doAno.length, semData: semData.length,
    prazoMes: media(prazoDe(mes)), prazoMesAnt: media(prazoDe(ant)),
    prazoAno: media(pAno), prazoMediana: mediana(pAno), prazoMax: pAno.length ? Math.max.apply(null, pAno) : null,
    porMes: porMes,
    porEmp:  contar(doAno, r => _analiseTitulo_(_tabV_(r, 0))),
    porAval: contar(doAno, r => _analiseTitulo_(_tabV_(r, 7).split(/\s+/)[0])),
    // Locatário fica como está na planilha: tem sigla (JBT, HP TRADE, BPB) que o Title Case estragaria.
    porLoc:  contar(doAno, r => _tabV_(r, 1)),
    pctMemorial: pct(r => /^sim$/i.test(_tabV_(r, 4))),
    pctComplementar: pct(r => { const t = _tabV_(r, 3); return t !== '' && !/^n\/?a$/i.test(t); })
  };
}

// "MEGA CURITIBA" → "Mega Curitiba"; conectivos curtos (de, da, do…) ficam minúsculos.
function _analiseTitulo_(s) {
  return String(s || '').trim().toLowerCase().split(/\s+/).filter(p => p).map((p, i) =>
    (i > 0 && p.length <= 2) ? p : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function _analiseDesenharIndicadores_(deck, ind, ref) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _slideNovo_(deck, TAG_ANALISE_INDICADORES, 'ANÁLISE DE PROJETOS',
    'Indicadores do ano · jan–' + String(ref.curto || '').toLowerCase() + ' ' + ref.ano + ' (projetos concluídos)');
  try {
    _analisePintar_(slide, W, H, ind, ref);
  } catch (e) {
    _slideFalha_(slide, 40, 160, W - 80, 200, 'INDICADORES DE ANÁLISE DE PROJETOS — NÃO FOI GERADO', e,
      'Confira se 16_Slide_RecebimentoObras.gs, 22_Slide_Pendencias.gs e 00_Helpers.gs estão iguais no editor (lição 6).');
  }
  return 1;
}

// Toda caixa de texto do Slides tem ~7pt de recuo interno de cada lado (lição 1). Com
// folga = 7 a caixa é alargada para os dois lados e o texto fica com a largura
// INTEIRA pedida e começa exatamente em x: sem isso "MAR", "21" e "MERCADO LIVRE"
// quebravam em duas linhas. Largura de texto em Montserrat: ~0,74 × corpo por letra
// maiúscula (medido na prévia: 0,66 ainda quebrava "MERCADO LIVRE").
const ANALISE_FOLGA = 7;
const ANALISE_LETRA = 0.74;
const _analiseLarg_ = (txt, fs) => String(txt).length * fs * ANALISE_LETRA;

function _analisePintar_(slide, W, H, ind, ref) {
  const c = CR_DESIGN_SYSTEM.colors;
  const mX = 40;
  const dias = x => (x == null ? '—' : _pendNum_(x) + 'd');

  // ── Cartões ──
  const cards = [
    { l: 'CONCLUÍDAS NO MÊS', v: ind.concMes, var: _pendVariacao_(ind.concMes, ind.concMesAnt, false),
      sub: 'mês anterior: ' + ind.concMesAnt + ' · no ano: ' + ind.concAno },
    { l: 'PRAZO MÉDIO NO MÊS', v: dias(ind.prazoMes), var: _pendVariacao_(ind.prazoMes, ind.prazoMesAnt, true),
      sub: 'mês anterior: ' + dias(ind.prazoMesAnt) },
    { l: 'PRAZO MÉDIO NO ANO', v: dias(ind.prazoAno), var: null,
      sub: 'mediana ' + dias(ind.prazoMediana) + ' · máx. ' + dias(ind.prazoMax) },
    { l: 'COM MEMORIAL BASE', v: ind.pctMemorial == null ? '—' : ind.pctMemorial + '%', var: null,
      sub: (ind.pctComplementar == null ? '—' : ind.pctComplementar + '%') + ' com análise complementar' }
  ];
  const cTop = 76, cH = 66, cGap = 10;
  const cW = (W - 2 * mX - cGap * (cards.length - 1)) / cards.length;
  cards.forEach((k, i) => _pendCartao_(slide, mX + i * (cW + cGap), cTop, cW, cH, k));

  // ── Gráfico: concluídas por mês de entrega ──
  const pTop = cTop + cH + 12, pH = H - pTop - 26;
  const wG = 300;
  const yIn = criarCardPainel(slide, mX, pTop, wG, pH, 'CONCLUÍDAS POR MÊS DE ENTREGA', c.brandLight);
  const MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const base = pTop + pH - 22, topo = yIn + 16, altMax = base - topo;
  const maxV = Math.max(1, Math.max.apply(null, ind.porMes));
  const n = Math.max(1, ind.porMes.length);
  const slot = (wG - 28) / n, barW = Math.min(28, slot * 0.62);
  ind.porMes.forEach((v, i) => {
    const x = mX + 14 + i * slot + (slot - barW) / 2;
    const h = v > 0 ? Math.max(3, altMax * v / maxV) : 2;
    // O mês do deck em verde; os outros no azul da marca.
    _sRet_(slide, x, base - h, barW, h, i === ref.index ? c.accentGreen : (v > 0 ? c.brandLight : c.lines));
    // Rótulos centrados na FATIA do mês (slot), não na barra: cabem as 3 letras do mês.
    const xs = mX + 14 + i * slot;
    _sTxt(slide, xs, base - h - 13, slot, 12, String(v), 8, true, c.textMain, 'center', ANALISE_FOLGA);
    _sTxt(slide, xs, base + 3, slot, 12, MES[i], 7, false, c.textMuted, 'center', ANALISE_FOLGA);
  });

  // ── Recortes do ano ──
  const xR = mX + wG + 12, wR = W - mX - xR;
  const hTop = Math.floor((pH - 10) / 2), hBot = pH - 10 - hTop;
  _analiseBarras_(slide, xR, pTop, wR, hTop, 'POR EMPREENDIMENTO (ANO)', c.brandLight, ind.porEmp, c.brandLight);
  const wB = (wR - 10) / 2;
  _analiseBarras_(slide, xR, pTop + hTop + 10, wB, hBot, 'POR AVALIADOR', c.brandMed, ind.porAval, c.brandMed);
  _analiseBarras_(slide, xR + wB + 10, pTop + hTop + 10, wB, hBot, 'TOP LOCATÁRIOS', c.accentGreen, ind.porLoc, c.accentGreen);

  const nota = 'Referência: ' + ref.nome + ' ' + ref.ano +
    (ind.semData ? ' · ' + ind.semData + ' concluído(s) sem data de entrega ficam fora de "por mês" e do prazo' : '');
  _sTxt(slide, mX, H - 22, W - 2 * mX, 14, nota, 6.5, false, c.textMuted, 'left');
}

// Lista de barras horizontais [[nome, n], …] dentro de um cartão. Não cabendo
// todas, a última linha diz quantas ficaram de fora (nada some calado).
function _analiseBarras_(slide, x, y, w, h, titulo, corTema, itens, corBarra) {
  const c = CR_DESIGN_SYSTEM.colors;
  const yIn = criarCardPainel(slide, x, y, w, h, titulo, corTema);
  if (!itens.length) { _sTxt(slide, x + 14, yIn + 8, w - 28, 14, 'Sem dados.', 8, false, c.textMuted, 'left', ANALISE_FOLGA); return; }
  const passo = 14;
  const cabem = Math.max(1, Math.floor((y + h - yIn - 4) / passo));
  const mostrar = itens.length > cabem ? cabem - 1 : cabem;
  const FS = 7.5, valW = 24, area = w - 28;
  const visiveis = itens.slice(0, Math.max(1, mostrar));
  // A coluna do nome tem a largura do MAIOR nome visível (no máximo 60% do cartão): as
  // barras ficam alinhadas e nenhum nome quebra. Só trunca se passar do teto.
  const labelW = Math.min(area * 0.6, Math.max(36, Math.max.apply(null, visiveis.map(it => _analiseLarg_(it[0], FS)))));
  const barMax = Math.max(8, area - labelW - valW - 4), max = itens[0][1];
  visiveis.forEach((it, i) => {
    const yy = yIn + 2 + i * passo;
    const len = Math.max(2, barMax * it[1] / max);
    _sTxt(slide, x + 14, yy, labelW, 12, _truncar_(it[0], Math.max(4, Math.floor(labelW / (FS * ANALISE_LETRA)))), FS, false, c.textMain, 'left', ANALISE_FOLGA);
    _sRet_(slide, x + 14 + labelW, yy + 2, len, 8, corBarra);
    _sTxt(slide, x + 14 + labelW + len + 3, yy, valW, 12, String(it[1]), FS, true, c.textMain, 'left', ANALISE_FOLGA);
  });
  if (itens.length > mostrar && mostrar >= 1) {
    _sTxt(slide, x + 14, yIn + 2 + mostrar * passo, area, 12, '+ ' + (itens.length - mostrar) + ' outro(s)', 7, false, c.textMuted, 'left', ANALISE_FOLGA);
  }
}
