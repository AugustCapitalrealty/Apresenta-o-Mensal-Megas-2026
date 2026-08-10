/**
 * ARQUIVO: Slide_CheckConsistencia.gs
 * SLIDE — CHECK DE CONSISTÊNCIA (conferência interna, EXCLUIR da versão final)
 * DESCRIÇÃO: Slide de auto-verificação. Roda um conjunto de checagens que
 * cruzam números que aparecem em MAIS DE UM slide do deck (ou que são
 * derivados uns dos outros) e aponta as divergências — sem nenhuma
 * divergência, diz isso explicitamente.
 *
 * POR QUE ISSO EXISTE: o deck monta o mesmo indicador a partir de FONTES
 * DIFERENTES (abas diferentes da planilha da cidade, planilha de Histórico
 * Validado, BD-CORRETIVAS). Ex.: o total de despesas do mês aparece no DRE
 * (aba FINANCEIRO BRIDGE) e no Resultado Operacional (aba FINANCEIRO) — se
 * as duas abas divergirem, o deck mostra dois números diferentes pro mesmo
 * fato sem avisar ninguém. Este slide faz essa conferência automaticamente.
 *
 * O slide é DESCARTÁVEL: ele nasce marcado no título/subtítulo pra ser
 * apagado antes de apresentar. Por isso não entra no pipeline padrão de
 * gerarApresentacaoCompleta_ — roda avulso (gerarSoCheckCuritiba/Itajai/
 * Esteio) ou pelo pipeline "com check" (gerarComCheckCuritiba etc.).
 *
 * REGRA DE OURO DAS CHECAGENS: nenhuma pode quebrar a geração. Toda
 * checagem roda dentro de try/catch (_ckAdd_); fonte indisponível vira
 * status "N/D" (não deu pra checar), nunca uma exceção.
 */

// Tolerâncias — divergência só é apontada acima destes limites.
//
// Dinheiro: R$ 1 mil ABSOLUTO, sem válvula percentual. O critério é
// "a diferença é visível no deck?" — como os slides financeiros exibem em
// R$ mil, qualquer diferença de R$ 1 mil ou mais aparece na tela como dois
// números diferentes pro mesmo fato. Uma tolerância percentual (0,5% de um
// acumulado de R$ 3,5 mi = R$ 17 mil) deixaria passar justamente as
// divergências grandes, que são as que importam.
const CK_TOL_DINHEIRO_ABS = 1000;
// R$/m²: 1 centavo cobre o arredondamento das duas pontas.
const CK_TOL_M2 = 0.011;

function gerarSlideCheckConsistencia() {
  const checks = _rodarChecagensConsistencia_();

  const deck  = getDeckAtivo();
  const W     = deck.getPageWidth();
  const H     = deck.getPageHeight();
  const DS    = CR_DESIGN_SYSTEM;

  const marginX = 30, topY = 76;
  const alturaTotal = (H - 16) - topY;

  // Cada linha de grupo + cada checagem ocupa uma linha da tabela. Divide em
  // páginas quando não couber com altura legível (mesma ideia de
  // _paginarGruposBacklog_ em Slide_BacklogClientesDetalhes.gs).
  const linhas = [];
  let grupoAtual = null;
  checks.forEach(c => {
    if (c.grupo !== grupoAtual) { linhas.push({ tipo: 'grupo', nome: c.grupo }); grupoAtual = c.grupo; }
    linhas.push({ tipo: 'check', c: c });
  });

  const BANNER_H = 30, BANNER_GAP = 8, HEADER_H = 15, ROW_MIN = 11;
  const alturaUtil = alturaTotal - 32 - 4 - 8 - BANNER_H - BANNER_GAP - HEADER_H - 4;
  const porPagina  = Math.max(1, Math.floor(alturaUtil / ROW_MIN));

  const paginas = [];
  for (let i = 0; i < linhas.length; i += porPagina) paginas.push(linhas.slice(i, i + porPagina));
  if (!paginas.length) paginas.push([]);

  const divergencias = checks.filter(c => c.ok === false).length;
  const naoChecados  = checks.filter(c => c.ok === null).length;

  paginas.forEach((linhasPagina, i) => {
    const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(CORES.bgSlide);

    const sub = 'Conferência interna — EXCLUIR DA VERSÃO FINAL · ' + getProjetoAtivo().nome +
      (paginas.length > 1 ? ' — página ' + (i + 1) + ' de ' + paginas.length : '');
    criarHeaderPadrao(slide, 'CHECK DE CONSISTÊNCIA', sub);

    _ckDesenharPagina_(slide, marginX, topY, W - 2 * marginX, alturaTotal,
      linhasPagina, checks.length, divergencias, naoChecados, BANNER_H, BANNER_GAP, HEADER_H, DS);
  });

  Logger.log('Slide Check de Consistência gerado — ' + checks.length + ' checagem(ns), ' +
             divergencias + ' divergência(s), ' + naoChecados + ' não checada(s), ' +
             paginas.length + ' página(s).');
}

// ── Desenho de uma página do check ────────────────────────────────────────
function _ckDesenharPagina_(slide, x, y, w, h, linhasPagina, totalChecks, divergencias, naoChecados,
                            BANNER_H, BANNER_GAP, HEADER_H, DS) {
  const corTema = divergencias > 0 ? CORES.cardRed : CORES.cardGreen;
  const contentY = criarCardPainel(slide, x, y, w, h, 'RESULTADO DA CONFERÊNCIA', corTema);
  const areaY = contentY + 4, areaW = w - 30;

  // Banner de veredito — a primeira coisa que se lê no slide.
  const bannerTxt = divergencias > 0
    ? divergencias + (divergencias === 1 ? ' DIVERGÊNCIA ENCONTRADA' : ' DIVERGÊNCIAS ENCONTRADAS')
    : 'NENHUMA DIVERGÊNCIA ENCONTRADA';
  const bannerSub = totalChecks + ' verificação(ões)' + (naoChecados > 0 ? ' · ' + naoChecados + ' sem dado pra checar' : '');

  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 15, areaY, areaW, BANNER_H);
  bg.getFill().setSolidFill(corTema, 0.12);
  bg.getBorder().setTransparent();
  _sTxt(slide, x + 15, areaY + 2, areaW, 16, bannerTxt, 11, true, corTema, 'center');
  _sTxt(slide, x + 15, areaY + 17, areaW, 11, bannerSub, 7, false, CORES.textGray, 'center');

  // Colunas: STATUS | VERIFICAÇÃO | ESPERADO | OBTIDO
  const ST_W = 58, ESP_W = 96, OBT_W = 96, GAP = 8;
  const verifW = areaW - ST_W - ESP_W - OBT_W - GAP * 3;
  const stX    = x + 15;
  const verifX = stX + ST_W + GAP;
  const espX   = verifX + verifW + GAP;
  const obtX   = espX + ESP_W + GAP;

  const hdrY = areaY + BANNER_H + BANNER_GAP;
  const hbg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, hdrY, areaW, HEADER_H);
  hbg.getFill().setSolidFill(DS.colors.brandDark);
  hbg.getBorder().setTransparent();
  _sTxt(slide, stX,    hdrY, ST_W,   HEADER_H, 'STATUS',      6.5, true, '#FFFFFF', 'center');
  _sTxt(slide, verifX, hdrY, verifW, HEADER_H, 'VERIFICAÇÃO', 6.5, true, '#FFFFFF', 'left');
  _sTxt(slide, espX,   hdrY, ESP_W,  HEADER_H, 'ESPERADO',    6.5, true, '#FFFFFF', 'center');
  _sTxt(slide, obtX,   hdrY, OBT_W,  HEADER_H, 'OBTIDO',      6.5, true, '#FFFFFF', 'center');

  const linhasY = hdrY + HEADER_H + 2;
  const disponivel = (y + h - 8) - linhasY;
  const rowH = linhasPagina.length ? Math.min(14, disponivel / linhasPagina.length) : 14;
  const fs   = rowH >= 12 ? 6.8 : (rowH >= 10 ? 6.2 : 5.6);

  let cursorY = linhasY;
  linhasPagina.forEach(l => {
    if (l.tipo === 'grupo') {
      const g = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, cursorY, areaW, rowH);
      g.getFill().setSolidFill('#475569');
      g.getBorder().setTransparent();
      _sTxt(slide, stX + 4, cursorY, areaW - 8, rowH, l.nome.toUpperCase(), Math.min(fs, 6.3), true, '#FFFFFF', 'left');
      cursorY += rowH;
      return;
    }

    const c = l.c;
    // Cor/rótulo por status: OK verde, divergência vermelha, N/D cinza.
    const cor = c.ok === true ? CORES.cardGreen : (c.ok === false ? CORES.cardRed : CORES.textGray);
    const rotulo = c.ok === true ? 'OK' : (c.ok === false ? 'DIVERGE' : 'N/D');

    const chip = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, stX, cursorY + 1, ST_W, rowH - 2);
    chip.getFill().setSolidFill(cor, 0.16);
    chip.getBorder().setTransparent();
    _sTxt(slide, stX, cursorY, ST_W, rowH, rotulo, fs, true, cor, 'center');

    _sTxt(slide, verifX, cursorY, verifW, rowH, _ckTruncar_(c.nome, verifW, fs), fs, false, CORES.textDark, 'left');
    _sTxt(slide, espX,   cursorY, ESP_W,  rowH, c.esperado, fs, false, CORES.textGray, 'center');
    _sTxt(slide, obtX,   cursorY, OBT_W,  rowH, c.obtido,   fs, true,  cor,            'center');

    cursorY += rowH;
    _linhaTabela_(slide, x + 15, cursorY, areaW, _TABELA_LINHA_COR_, 0.5);
  });
}

// Corta o texto da coluna VERIFICAÇÃO no que cabe (mesma lógica de
// _charsQueCabem_ em Slide_ChamadosClientes.gs — o Slides não mede texto,
// então o orçamento é por contagem de caracteres, deliberadamente
// pessimista pra não quebrar linha e desalinhar a tabela).
function _ckTruncar_(txt, largura, fontSize) {
  const cap = _charsQueCabem_(largura, fontSize);
  const t = String(txt || '');
  return t.length <= cap ? t : t.slice(0, Math.max(4, cap - 1)) + '…';
}


// ==========================================
// MOTOR DAS CHECAGENS
// ==========================================
// Cada checagem roda isolada: se a fonte não existir/estourar, vira "N/D"
// em vez de derrubar o slide inteiro.
function _ckAdd_(lista, grupo, nome, fn) {
  try {
    const r = fn();
    if (!r) { lista.push({ grupo, nome, ok: null, esperado: '—', obtido: 'sem dado' }); return; }
    lista.push({ grupo, nome, ok: r.ok, esperado: r.esperado, obtido: r.obtido });
  } catch (e) {
    Logger.log('Check "' + nome + '" falhou: ' + e.message);
    lista.push({ grupo, nome, ok: null, esperado: '—', obtido: 'erro' });
  }
}

// Comparadores. Dinheiro tolera só o arredondamento da unidade exibida
// (R$ mil); contagem de chamados é exata.
function _ckDinheiro_(esperado, obtido) {
  return Math.abs(esperado - obtido) <= CK_TOL_DINHEIRO_ABS;
}
function _ckMil_(v)  { return (v == null || isNaN(v)) ? '—' : Math.round(v / 1000).toLocaleString('pt-BR') + ' mil'; }
function _ckM2_(v)   { return (v == null || isNaN(v)) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function _ckInt_(v)  { return (v == null || isNaN(v)) ? '—' : String(v); }

function _rodarChecagensConsistencia_() {
  const L = [];

  // Fontes carregadas uma vez só (cada uma pode ser null se a aba faltar).
  const dre       = _ckSafe_(() => obterDadosDRE_());
  const finMes    = _ckSafe_(() => obterDadosFinanceiroMensal_());
  const finAcum   = _ckSafe_(() => obterDadosFinanceiroAnual());
  const custoM2   = _ckSafe_(() => obterDadosCustoM2());
  const custoAcum = _ckSafe_(() => obterCustoM2Acumulado_());
  const area      = _ckSafe_(() => obterAreaM2_());
  const prio      = _ckSafe_(() => obterDadosChamadosPrioridade_());
  const cli       = _ckSafe_(() => obterDadosChamadosClientes_());
  const emerg     = _ckSafe_(() => obterDadosBacklogEmergencialDetalhe_());
  const bkLoc     = _ckSafe_(() => obterDadosBacklogClientesDetalhes_());
  const bkFac     = _ckSafe_(() => obterDadosBacklogClientesFacilities_());
  const bkProp    = _ckSafe_(() => obterDadosBacklogClientesProperties_());
  const pendentes = _ckSafe_(() => obterDadosBacklogPendentes_());
  const dash      = _ckSafe_(() => obterDadosDashboard());
  const corr      = _ckSafe_(() => obterDadosCorretivasV6());
  const prev      = _ckSafe_(() => obterDadosPreventivas());

  // ── FINANCEIRO ──────────────────────────────────────────────────────────
  // DRE (aba FINANCEIRO BRIDGE) x Resultado Operacional (aba FINANCEIRO):
  // são DUAS abas diferentes com o mesmo fato. Divergir aqui significa que
  // o deck mostra dois totais diferentes pro mesmo mês.
  //
  // ATENÇÃO ao montar check aqui: o Resultado Operacional (mês) e o
  // Resultado Acumulado agora SAEM da BRIDGE (fonte única). Comparar o que
  // eles exibem com o DRE seria sempre verdadeiro e esconderia o problema.
  // O que vale checar é a ABA de origem (`finMes.planilha` /
  // `finAcum.planilha`): quando ela discorda da BRIDGE, alguém atualizou uma
  // e esqueceu a outra — e é isso que precisa aparecer.
  const G_FIN = 'Financeiro — BRIDGE x abas FINANCEIRO';
  [['mês',       'mes',  () => finMes,  'FINANCEIRO'],
   ['acumulado', 'acum', () => finAcum, 'FINANCEIRO ANUAL']].forEach(par => {
    const rotulo = par[0], bloco = par[1], obter = par[2], aba = par[3];
    ['real', 'orc'].forEach(campo => {
      const nomeCampo = campo === 'real' ? 'REALIZADO' : 'ORÇADO';
      _ckAdd_(L, G_FIN, 'Total ' + rotulo + ' ' + nomeCampo + ' (BRIDGE x aba ' + aba + ')', () => {
        const fin = obter();
        if (!dre || !fin || !fin.planilha) return null;
        const a = dre.total[bloco][campo];
        const b = campo === 'real' ? fin.planilha.totalRealizado : fin.planilha.totalOrcado;
        return { ok: _ckDinheiro_(a, b), esperado: _ckMil_(a) + ' (BRIDGE)', obtido: _ckMil_(b) + ' (aba)' };
      });
    });
  });
  // Coerência da planilha de origem: o deck já EXIBE a soma das rubricas
  // (obterDadosDRE_ monta `total` somando), então comparar `total` com a
  // soma seria sempre verdadeiro. O que vale checar é a linha "TOTAL" CRUA
  // da aba (`totalPlanilha`): quando ela discorda da soma das próprias
  // rubricas, há erro na planilha de origem que alguém precisa corrigir.
  [['mês', 'mes'], ['acumulado', 'acum'], ['ano', 'anual']].forEach(par => {
    _ckAdd_(L, G_FIN, 'Aba BRIDGE: linha TOTAL = soma das rubricas (' + par[0] + ')', () => {
      if (!dre || !dre.totalPlanilha) return null;
      const soma = dre.rubricas.reduce((s, r) => s + r[par[1]].real, 0);
      const bruto = dre.totalPlanilha[par[1]].real;
      return { ok: _ckDinheiro_(bruto, soma), esperado: _ckMil_(soma), obtido: _ckMil_(bruto) + ' (TOTAL)' };
    });
  });
  // Rubrica a rubrica: isola SE a divergência está no total ou espalhada
  // pelas linhas. Se as rubricas batem e só o TOTAL não, o erro está na
  // linha TOTAL da planilha de origem, não nos lançamentos.
  [['mês',       'mes',  () => finMes,  'FINANCEIRO'],
   ['acumulado', 'acum', () => finAcum, 'FINANCEIRO ANUAL']].forEach(par => {
    const rotulo = par[0], bloco = par[1], obter = par[2], aba = par[3];
    _ckAdd_(L, G_FIN, 'Rubricas do ' + rotulo + ': BRIDGE x aba ' + aba + ' (uma a uma)', () => {
      const fin = obter();
      if (!dre || !fin || !fin.planilha || !fin.planilha.linhasDados) return null;
      const porNome = {};
      dre.rubricas.forEach(r => { porNome[_histNorm_(r.nome)] = r[bloco].real; });
      let comparadas = 0, divergentes = 0;
      fin.planilha.linhasDados.forEach(l => {
        const v = porNome[_histNorm_(l.natureza)];
        if (v === undefined) return;
        comparadas++;
        if (!_ckDinheiro_(v, l.realizado)) divergentes++;
      });
      if (!comparadas) return null;
      return { ok: divergentes === 0, esperado: comparadas + ' iguais', obtido: divergentes ? divergentes + ' diferem' : comparadas + ' iguais' };
    });
    // Rubrica que existe numa fonte e não na outra não aparece na checagem
    // acima (ela só compara os nomes em comum) — mas é exatamente assim que
    // dois totais divergem sem nenhuma linha divergir.
    _ckAdd_(L, G_FIN, 'Rubricas do ' + rotulo + ': mesma lista nas duas fontes', () => {
      const fin = obter();
      if (!dre || !fin || !fin.planilha || !fin.planilha.linhasDados) return null;
      const naBridge = dre.rubricas.filter(r => r[bloco].orc !== 0 || r[bloco].real !== 0).map(r => _histNorm_(r.nome));
      const naAba    = fin.planilha.linhasDados.map(l => _histNorm_(l.natureza));
      const soBridge = naBridge.filter(n => naAba.indexOf(n) < 0);
      const soAba    = naAba.filter(n => naBridge.indexOf(n) < 0);
      const ok = soBridge.length === 0 && soAba.length === 0;
      return {
        ok,
        esperado: naBridge.length + ' rubricas',
        obtido  : ok ? naAba.length + ' rubricas'
                     : (soBridge.length ? soBridge.length + ' só na BRIDGE ' : '') +
                       (soAba.length    ? soAba.length + ' só na aba' : '')
      };
    });
  });

  // ── METRO QUADRADO ──────────────────────────────────────────────────────
  // O R$/m² aparece em 3 lugares (slide Custo do M², cards do Resultado
  // Operacional e a linha R$/m² do DRE). Todos têm que sair da MESMA área.
  const G_M2 = 'Metro quadrado (R$/m²)';
  _ckAdd_(L, G_M2, 'R$/m² do mês REALIZADO (Custo M² x DRE ÷ área)', () => {
    if (!dre || !custoM2 || !area) return null;
    const a = custoM2.kpis.custo, b = dre.total.mes.real / area;
    return { ok: Math.abs(a - b) <= CK_TOL_M2, esperado: _ckM2_(a), obtido: _ckM2_(b) };
  });
  _ckAdd_(L, G_M2, 'R$/m² do mês ORÇADO (Custo M² x DRE ÷ área)', () => {
    if (!dre || !custoM2 || !area) return null;
    const a = custoM2.kpis.meta, b = dre.total.mes.orc / area;
    return { ok: Math.abs(a - b) <= CK_TOL_M2, esperado: _ckM2_(a), obtido: _ckM2_(b) };
  });
  _ckAdd_(L, G_M2, 'R$/m² acumulado (Custo M² médio x DRE ÷ área ÷ meses)', () => {
    if (!dre || !custoAcum || !area || !dre.mesesAcum) return null;
    const a = custoAcum.realizado, b = dre.total.acum.real / area / dre.mesesAcum;
    return { ok: Math.abs(a - b) <= CK_TOL_M2, esperado: _ckM2_(a), obtido: _ckM2_(b) };
  });
  _ckAdd_(L, G_M2, 'R$/m² do ano (média Custo M² x DRE ÷ área ÷ 12)', () => {
    if (!dre || !custoM2 || !area) return null;
    const media = _ckMediaAnualCustoM2_(custoM2, /^real/i);
    if (media == null) return null;
    const b = dre.total.anual.real / area / 12;
    return { ok: Math.abs(media - b) <= CK_TOL_M2, esperado: _ckM2_(media), obtido: _ckM2_(b) };
  });
  // A área agora é LIDA da aba METRO QUADRADO (obterAreaM2_), então estas
  // duas checagens deixaram de ser circulares: elas refazem a área a partir
  // do financeiro ÷ R$/m² e conferem se bate com a área declarada. Área
  // implícita diferente da declarada = a BRIDGE e a METRO QUADRADO
  // descolaram (alguém atualizou uma e esqueceu a outra).
  _ckAdd_(L, G_M2, 'Área implícita: realizado x orçado do mês (m²)', () => {
    if (!area || !finMes || !custoM2 || !custoM2.kpis.meta) return null;
    const areaOrc = finMes.totalOrcado / custoM2.kpis.meta;
    const ok = Math.abs(area - areaOrc) / Math.max(area, 1) <= 0.01;   // 1% de folga
    return { ok: ok, esperado: Math.round(area).toLocaleString('pt-BR'), obtido: Math.round(areaOrc).toLocaleString('pt-BR') };
  });
  _ckAdd_(L, G_M2, 'Área implícita: mês x acumulado (m²)', () => {
    if (!area || !finAcum || !custoAcum || !custoAcum.realizado || !custoAcum.meses) return null;
    const areaAcum = finAcum.totalRealizado / custoAcum.realizado / custoAcum.meses;
    const ok = Math.abs(area - areaAcum) / Math.max(area, 1) <= 0.01;
    return { ok: ok, esperado: Math.round(area).toLocaleString('pt-BR'), obtido: Math.round(areaAcum).toLocaleString('pt-BR') };
  });

  // ── CHAMADOS DO MÊS ─────────────────────────────────────────────────────
  const G_CHAM = 'Chamados do mês (Prioridade x Clientes)';
  _ckAdd_(L, G_CHAM, 'Prioridade ABERTOS: soma das fatias = total', () => {
    if (!prio) return null;
    const soma = prio.abertos.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === prio.abertos.total, esperado: _ckInt_(prio.abertos.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_CHAM, 'Prioridade FECHADOS: soma das fatias = total', () => {
    if (!prio) return null;
    const soma = prio.fechados.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === prio.fechados.total, esperado: _ckInt_(prio.fechados.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_CHAM, 'Clientes ABERTOS: soma das fatias = total', () => {
    if (!cli) return null;
    const soma = cli.abertos.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === cli.abertos.total, esperado: _ckInt_(cli.abertos.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_CHAM, 'Clientes ABERTOS: itens da lista = total', () => {
    if (!cli) return null;
    return { ok: cli.abertos.lista.length === cli.abertos.total, esperado: _ckInt_(cli.abertos.total), obtido: _ckInt_(cli.abertos.lista.length) };
  });
  _ckAdd_(L, G_CHAM, 'Clientes FECHADOS: itens da lista = total', () => {
    if (!cli) return null;
    return { ok: cli.fechados.lista.length === cli.fechados.total, esperado: _ckInt_(cli.fechados.total), obtido: _ckInt_(cli.fechados.lista.length) };
  });
  // Chamados de cliente saem das MESMAS abas dos chamados por prioridade
  // (só tiram as linhas do próprio condomínio), então nunca podem ser MAIS.
  _ckAdd_(L, G_CHAM, 'Clientes ABERTOS ≤ Prioridade ABERTOS (subconjunto)', () => {
    if (!prio || !cli) return null;
    return { ok: cli.abertos.total <= prio.abertos.total, esperado: '≤ ' + prio.abertos.total, obtido: _ckInt_(cli.abertos.total) };
  });
  _ckAdd_(L, G_CHAM, 'Clientes FECHADOS ≤ Prioridade FECHADOS (subconjunto)', () => {
    if (!prio || !cli) return null;
    return { ok: cli.fechados.total <= prio.fechados.total, esperado: '≤ ' + prio.fechados.total, obtido: _ckInt_(cli.fechados.total) };
  });
  // Cross-source forte: "Chamados criados/fechados" do slide de Corretivas
  // vem da aba CHAMADOS (digitada à mão na planilha da cidade); o total de
  // Chamados por Prioridade vem da contagem das linhas das abas brutas do
  // Histórico Validado. Duas origens independentes pro mesmo fato — é aqui
  // que um mês desalinhado aparece primeiro.
  _ckAdd_(L, G_CHAM, 'Chamados criados: Corretivas x Prioridade ABERTOS', () => {
    if (!corr || !prio) return null;
    const v = _ckKpi_(corr.mensal, 'chamados criados');
    if (v == null) return null;
    return { ok: v === prio.abertos.total, esperado: _ckInt_(v), obtido: _ckInt_(prio.abertos.total) };
  });
  _ckAdd_(L, G_CHAM, 'Chamados fechados: Corretivas x Prioridade FECHADOS', () => {
    if (!corr || !prio) return null;
    const v = _ckKpi_(corr.mensal, 'chamados fechados');
    if (v == null) return null;
    return { ok: v === prio.fechados.total, esperado: _ckInt_(v), obtido: _ckInt_(prio.fechados.total) };
  });

  // ── BACKLOG EMERGENCIAL ─────────────────────────────────────────────────
  const G_EMERG = 'Backlog emergencial';
  _ckAdd_(L, G_EMERG, 'Soma por equipe = total', () => {
    if (!emerg) return null;
    const soma = emerg.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === emerg.total, esperado: _ckInt_(emerg.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_EMERG, 'Itens da lista = total', () => {
    if (!emerg) return null;
    return { ok: emerg.lista.length === emerg.total, esperado: _ckInt_(emerg.total), obtido: _ckInt_(emerg.lista.length) };
  });
  // Um emergencial ABERTO no mês esteve aberto no mês — logo tem que
  // aparecer no backlog emergencial. Se não aparece, as duas fontes
  // (CHAMADOS ABERTOS MES, no Histórico Validado, x BD-CORRETIVAS) divergem.
  _ckAdd_(L, G_EMERG, 'Emergenciais abertos no mês estão no backlog', () => {
    if (!prio || !emerg) return null;
    const idsBacklog = {};
    emerg.lista.forEach(it => { idsBacklog[String(it.id).trim()] = true; });
    const faltando = prio.abertos.emergencial.filter(it => !idsBacklog[String(it.id).trim()]);
    return { ok: faltando.length === 0, esperado: '0 fora', obtido: faltando.length + ' fora' };
  });

  // ── BACKLOG DE CLIENTES ─────────────────────────────────────────────────
  // Os 3 slides de backlog de cliente (Locatário / Facilities / Properties)
  // particionam o mesmo universo — um chamado não pode estar em dois deles.
  const G_BKCLI = 'Backlog de clientes (Locatário / Facilities / Properties)';
  _ckAdd_(L, G_BKCLI, 'Locatário: soma das fatias = total', () => {
    if (!bkLoc) return null;
    const soma = bkLoc.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === bkLoc.total, esperado: _ckInt_(bkLoc.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_BKCLI, 'Facilities: soma das fatias = total', () => {
    if (!bkFac) return null;
    const soma = bkFac.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === bkFac.total, esperado: _ckInt_(bkFac.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_BKCLI, 'Properties: soma das fatias = total', () => {
    if (!bkProp) return null;
    const soma = bkProp.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === bkProp.total, esperado: _ckInt_(bkProp.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_BKCLI, 'Facilities ∩ Properties = vazio (sem chamado repetido)', () => {
    if (!bkFac || !bkProp) return null;
    const idsFac = {};
    bkFac.lista.forEach(it => { idsFac[String(it.id).trim()] = true; });
    const repetidos = bkProp.lista.filter(it => idsFac[String(it.id).trim()]);
    return { ok: repetidos.length === 0, esperado: '0 repetidos', obtido: repetidos.length + ' repetidos' };
  });
  _ckAdd_(L, G_BKCLI, 'Locatário ∩ (Facilities+Properties) = vazio', () => {
    if (!bkLoc || !bkFac || !bkProp) return null;
    const idsOper = {};
    bkFac.lista.forEach(it => { idsOper[String(it.id).trim()] = true; });
    bkProp.lista.forEach(it => { idsOper[String(it.id).trim()] = true; });
    const repetidos = bkLoc.lista.filter(it => idsOper[String(it.id).trim()]);
    return { ok: repetidos.length === 0, esperado: '0 repetidos', obtido: repetidos.length + ' repetidos' };
  });
  // Cross-PLANILHA (Histórico Validado x BD-CORRETIVAS): todo chamado de
  // cliente aberto no mês tem que aparecer em algum dos 3 backlogs de
  // cliente. Se some, as duas planilhas não estão contando o mesmo
  // universo. Os IDs do BD-CORRETIVAS já vêm normalizados por
  // _idChamadoNormaliza_ ("2.490.644,00" → "2490644"), então comparamos só
  // dígitos dos dois lados.
  _ckAdd_(L, G_BKCLI, 'Chamados de clientes do mês estão em algum backlog', () => {
    if (!cli || !bkLoc || !bkFac || !bkProp) return null;
    const soDigitos = v => String(v == null ? '' : v).replace(/\D/g, '');
    const universo = {};
    [bkLoc, bkFac, bkProp].forEach(b => b.lista.forEach(it => { universo[soDigitos(it.id)] = true; }));
    const faltando = cli.abertos.lista.filter(it => !universo[soDigitos(it.id)]);
    return { ok: faltando.length === 0, esperado: '0 fora', obtido: faltando.length + ' fora' };
  });
  // ── BACKLOG GERAL (slide Backlog Facilities) ────────────────────────────
  // A aba BACKLOG do Histórico Validado tem, por Mega, as colunas GERAL /
  // FACILITIES / PROPERTY / LOCATÁRIO / EMERGENCIAL do mês. É a fonte que
  // mais cruza com outros slides: o GERAL é o mesmo total do slide de
  // Chamados Pendentes, e LOCATÁRIO/EMERGENCIAL são os mesmos universos
  // dos slides de backlog detalhado. Se essas pontas divergirem, o deck
  // mostra dois números diferentes pro mesmo fato.
  const G_BKGER = 'Backlog geral (Facilities x Property x Locatário)';
  const histMes = _ckSafe_(() => {
    const serie = obterDadosBacklogHistorico_();
    if (!serie || !serie.length) return null;
    const ref = obterMesReferencia_();
    const ord = ref.ano * 100 + (ref.index + 1);
    return serie.find(p => p.ord === ord) || null;
  });

  _ckAdd_(L, G_BKGER, 'Geral = Facilities + Property + Locatário', () => {
    if (!histMes || histMes.geral == null || histMes.facilities == null ||
        histMes.property == null || histMes.locatario == null) return null;
    const soma = histMes.facilities + histMes.property + histMes.locatario;
    return { ok: soma === histMes.geral, esperado: _ckInt_(histMes.geral), obtido: _ckInt_(soma) };
  });
  // O total exibido em Chamados Pendentes já é conciliado com o Geral da aba
  // BACKLOG, então comparar os dois seria sempre verdadeiro. O que vale é a
  // SOMA CRUA da aba de estados (`somaAba`): se ela não fecha com o Geral do
  // histórico, falta (ou sobra) chamado em algum estado da planilha.
  _ckAdd_(L, G_BKGER, 'Chamados Geral x soma dos estados (aba de pendentes)', () => {
    if (!histMes || histMes.geral == null || !pendentes || pendentes.somaAba == null) return null;
    return { ok: histMes.geral === pendentes.somaAba, esperado: _ckInt_(histMes.geral), obtido: _ckInt_(pendentes.somaAba) };
  });
  // Dashboard (aba DADOS) x aba BACKLOG do Histórico Validado: duas
  // planilhas diferentes com as mesmas duas linhas. O "geral" costuma bater
  // (o backlog pendentes concilia com a aba DADOS), mas o "facilities" é
  // digitado separado nas duas — é onde aparece defasagem.
  // O Dashboard já CORRIGE "Chamados geral"/"Chamados de facilities" pela
  // aba BACKLOG (fonte autoritativa) — então comparar o valor exibido com o
  // backlog seria sempre verdadeiro. O que interessa é o que a aba DADOS
  // trazia ANTES da correção: `sobrescritos` guarda exatamente isso, pra
  // avisar que a planilha de origem está desatualizada.
  _ckAdd_(L, G_BKGER, 'Chamados Geral: aba DADOS x aba BACKLOG (origem)', () => {
    if (!dash || !dash.sobrescritos) return null;
    const s = dash.sobrescritos.find(x => _histNorm_(x.chave).indexOf('chamados geral') >= 0);
    if (!s) return { ok: true, esperado: 'iguais', obtido: 'iguais' };
    return { ok: false, esperado: _ckInt_(s.backlog), obtido: _ckInt_(s.dados) + ' (DADOS)' };
  });
  _ckAdd_(L, G_BKGER, 'Chamados Facilities: aba DADOS x aba BACKLOG (origem)', () => {
    if (!dash || !dash.sobrescritos) return null;
    const s = dash.sobrescritos.find(x => _histNorm_(x.chave).indexOf('facilities') >= 0);
    if (!s) return { ok: true, esperado: 'iguais', obtido: 'iguais' };
    return { ok: false, esperado: _ckInt_(s.backlog), obtido: _ckInt_(s.dados) + ' (DADOS)' };
  });
  // O backlog de cliente de cada equipe é subconjunto do backlog TOTAL
  // daquela equipe (que inclui também os chamados do próprio condomínio).
  // Estourar aqui denuncia erro no mapa de responsáveis (_RESPONSAVEL_EQUIPE_).
  _ckAdd_(L, G_BKGER, 'Clientes-Facilities ≤ Facilities do backlog', () => {
    if (!histMes || histMes.facilities == null || !bkFac) return null;
    return { ok: bkFac.total <= histMes.facilities, esperado: '≤ ' + histMes.facilities, obtido: _ckInt_(bkFac.total) };
  });
  _ckAdd_(L, G_BKGER, 'Clientes-Properties ≤ Property do backlog', () => {
    if (!histMes || histMes.property == null || !bkProp) return null;
    return { ok: bkProp.total <= histMes.property, esperado: '≤ ' + histMes.property, obtido: _ckInt_(bkProp.total) };
  });
  _ckAdd_(L, G_BKGER, 'Locatário x Backlog de Clientes — Detalhe', () => {
    if (!histMes || histMes.locatario == null || !bkLoc) return null;
    return { ok: histMes.locatario === bkLoc.total, esperado: _ckInt_(histMes.locatario), obtido: _ckInt_(bkLoc.total) };
  });
  _ckAdd_(L, G_BKGER, 'Emergencial x Backlog Emergencial — Detalhe', () => {
    if (!histMes || histMes.emergencial == null || !emerg) return null;
    return { ok: histMes.emergencial === emerg.total, esperado: _ckInt_(histMes.emergencial), obtido: _ckInt_(emerg.total) };
  });
  // "Responsabilidade Locatário" também é um ESTADO na aba de Chamados
  // Pendentes. Como o TOTAL daquela aba é o mesmo GERAL do backlog (ver
  // checagem acima), o universo é o mesmo — logo o estado tem que bater
  // com a coluna LOCATÁRIO.
  _ckAdd_(L, G_BKGER, 'Locatário: coluna do backlog x estado em Chamados Pendentes', () => {
    if (!histMes || histMes.locatario == null || !pendentes) return null;
    const est = pendentes.direcionados.find(d => _histNorm_(d.estado).indexOf('locatario') >= 0);
    if (!est) return null;
    return { ok: est.qtd === histMes.locatario, esperado: _ckInt_(histMes.locatario), obtido: _ckInt_(est.qtd) };
  });

  // ── INDICADORES (Dashboard x slides de detalhe) ─────────────────────────
  // O Dashboard (aba DADOS, digitada à mão) repete indicadores que os
  // slides de Preventivas/Corretivas calculam das suas próprias abas.
  const G_IND = 'Indicadores (Dashboard x slide de detalhe)';
  _ckAdd_(L, G_IND, 'SLA de preventivas do mês: Dashboard x Preventivas', () => {
    if (!dash || !prev) return null;
    const a = _ckPct_(prev.mensal.sla), b = _ckDash_(dash, 'sla atendido', true);
    if (a == null || b == null) return null;
    const r = _ckPctIguais_(a, b);
    return { ok: r.ok, esperado: _ckM2_(r.a) + '%', obtido: _ckM2_(r.b) + '%' };
  });
  _ckAdd_(L, G_IND, 'Disponibilidade do mês: Dashboard x Corretivas', () => {
    if (!dash || !corr) return null;
    const a = _ckKpi_(corr.mensal, 'disponibilidade', true), b = _ckDash_(dash, 'disponibilidade', true);
    if (a == null || b == null) return null;
    const r = _ckPctIguais_(a, b);
    return { ok: r.ok, esperado: _ckM2_(r.a) + '%', obtido: _ckM2_(r.b) + '%' };
  });

  return L;
}

// Carrega uma fonte sem deixar erro vazar (aba faltando, permissão etc.).
function _ckSafe_(fn) {
  try { return fn(); } catch (e) { Logger.log('Check: fonte indisponível — ' + e.message); return null; }
}

// A aba DADOS é indexada pelo rótulo EXATO da linha; aqui buscamos
// normalizado (_histNorm_) pra não depender de acento/caixa/espaço duplo.
// Devolve o número já convertido, ou null se não achar/não for numérico.
function _ckDash_(dash, trechoNorm, comoPct) {
  if (!dash || !dash.map) return null;
  let achado = null;
  dash.map.forEach((val, chave) => {
    if (achado === null && _histNorm_(chave).indexOf(trechoNorm) >= 0) achado = val;
  });
  if (!achado) return null;
  return comoPct ? _ckPct_(achado.atual) : _ckQtd_(achado.atual);
}

// Percentual vindo formatado ("89,13%", "89,13") OU como número cru da
// planilha ("89.13", 0.8913).
//
// POR QUE NÃO USA _histNum_: sem vírgula no texto, ele trata o ponto como
// separador de MILHAR ("66.408" → 66408) — certo para contagem, mas destrói
// o decimal de um percentual ("89.13" viraria 8913). A aba DADOS é lida com
// getValues() e vira string depois (String(89.13) === "89.13"), então cai
// exatamente nesse caso.
function _ckPct_(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const t = String(v).replace(/%/g, '').replace(/\s/g, '').trim();
  if (!t) return null;
  // Com vírgula = formato BR ("1.234,56"): ponto é milhar, vírgula é decimal.
  // Sem vírgula = número cru do Sheets ("89.13"): o ponto É o decimal.
  const n = t.indexOf(',') >= 0 ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return isNaN(n) ? null : n;
}

// Contagem inteira (chamados etc.) — aqui o ponto É separador de milhar,
// então _histNum_ é o parser certo.
function _ckQtd_(v) {
  if (v == null || v === '') return null;
  const n = _histNum_(v);
  return isNaN(n) ? null : n;
}

// Compara dois percentuais que podem estar em ESCALAS diferentes: uma aba
// guarda a fração (0,8913) e a outra o percentual (89,13) — mesma
// informação, formato diferente. Normaliza antes de comparar, senão o check
// acusa divergência onde só há diferença de formatação. O corte em 1,5
// é seguro para SLA/disponibilidade, que vivem na faixa de 80–100%.
function _ckPctIguais_(a, b, tol) {
  let x = a, y = b;
  if (x <= 1.5 && y > 1.5) x *= 100;
  else if (y <= 1.5 && x > 1.5) y *= 100;
  return { ok: Math.abs(x - y) <= (tol == null ? 0.05 : tol), a: x, b: y };
}

// Pega um KPI de obterDadosCorretivasV6() pelo rótulo (lista de {l, v}).
function _ckKpi_(bloco, rotuloNorm, comoPct) {
  if (!bloco || !bloco.kpis) return null;
  const k = bloco.kpis.find(x => _histNorm_(x.l).indexOf(rotuloNorm) >= 0);
  if (!k) return null;
  return comoPct ? _ckPct_(k.v) : _ckQtd_(k.v);
}

// Média anual (12 meses) de uma linha da tabela do slide Custo do M².
// Mesma regra de obterCustoM2Acumulado_: só conta mês com valor > 0.
function _ckMediaAnualCustoM2_(custoM2, regex) {
  if (!custoM2 || !custoM2.tabela) return null;
  const chave = Object.keys(custoM2.tabela).find(k => regex.test(k));
  if (!chave) return null;
  const arr = custoM2.tabela[chave];
  let soma = 0, n = 0;
  (arr || []).forEach(v => { if (v != null && !isNaN(v) && v > 0) { soma += Number(v); n++; } });
  return n > 0 ? soma / n : null;
}


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
// Slide avulso de conferência — gera SÓ o check na apresentação da cidade.
function gerarSoCheckCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideCheckConsistencia(); }
function gerarSoCheckItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCheckConsistencia(); }
function gerarSoCheckEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCheckConsistencia(); }
