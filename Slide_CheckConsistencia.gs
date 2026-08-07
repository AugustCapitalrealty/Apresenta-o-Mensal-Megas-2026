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

  // ── FINANCEIRO ──────────────────────────────────────────────────────────
  // DRE (aba FINANCEIRO BRIDGE) x Resultado Operacional (aba FINANCEIRO):
  // são DUAS abas diferentes com o mesmo fato. Divergir aqui significa que
  // o deck mostra dois totais diferentes pro mesmo mês.
  const G_FIN = 'Financeiro — DRE x Resultado Operacional';
  _ckAdd_(L, G_FIN, 'Total do mês REALIZADO (DRE x Resultado Operacional)', () => {
    if (!dre || !finMes) return null;
    const a = dre.total.mes.real, b = finMes.totalRealizado;
    return { ok: _ckDinheiro_(a, b), esperado: _ckMil_(a), obtido: _ckMil_(b) };
  });
  _ckAdd_(L, G_FIN, 'Total do mês ORÇADO (DRE x Resultado Operacional)', () => {
    if (!dre || !finMes) return null;
    const a = dre.total.mes.orc, b = finMes.totalOrcado;
    return { ok: _ckDinheiro_(a, b), esperado: _ckMil_(a), obtido: _ckMil_(b) };
  });
  _ckAdd_(L, G_FIN, 'Acumulado REALIZADO (DRE x Resultado Acumulado)', () => {
    if (!dre || !finAcum) return null;
    const a = dre.total.acum.real, b = finAcum.totalRealizado;
    return { ok: _ckDinheiro_(a, b), esperado: _ckMil_(a), obtido: _ckMil_(b) };
  });
  _ckAdd_(L, G_FIN, 'Acumulado ORÇADO (DRE x Resultado Acumulado)', () => {
    if (!dre || !finAcum) return null;
    const a = dre.total.acum.orc, b = finAcum.totalOrcado;
    return { ok: _ckDinheiro_(a, b), esperado: _ckMil_(a), obtido: _ckMil_(b) };
  });
  // Coerência interna do DRE: a linha TOTAL tem que ser a soma das rubricas.
  _ckAdd_(L, G_FIN, 'DRE: soma das rubricas = linha TOTAL (mês)', () => {
    if (!dre) return null;
    const soma = dre.rubricas.reduce((s, r) => s + r.mes.real, 0);
    return { ok: _ckDinheiro_(dre.total.mes.real, soma), esperado: _ckMil_(dre.total.mes.real), obtido: _ckMil_(soma) };
  });
  _ckAdd_(L, G_FIN, 'DRE: soma das rubricas = linha TOTAL (acumulado)', () => {
    if (!dre) return null;
    const soma = dre.rubricas.reduce((s, r) => s + r.acum.real, 0);
    return { ok: _ckDinheiro_(dre.total.acum.real, soma), esperado: _ckMil_(dre.total.acum.real), obtido: _ckMil_(soma) };
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
  // A área é derivada (Financeiro ÷ Custo m²). Se o acumulado devolver uma
  // área diferente da do mês, alguma das duas pontas está inconsistente.
  _ckAdd_(L, G_M2, 'Área implícita: mês x acumulado (m²)', () => {
    if (!area || !finAcum || !custoAcum || !custoAcum.realizado || !custoAcum.meses) return null;
    const areaAcum = finAcum.totalRealizado / custoAcum.realizado / custoAcum.meses;
    const ok = Math.abs(area - areaAcum) / Math.max(area, 1) <= 0.01;   // 1% de folga
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

  // ── BACKLOG EMERGENCIAL ─────────────────────────────────────────────────
  const G_EMERG = 'Backlog emergencial';
  _ckAdd_(L, G_EMERG, 'Soma por equipe (Facilities+Property) = total', () => {
    if (!emerg) return null;
    const soma = emerg.fatias.reduce((s, f) => s + f.qtd, 0);
    return { ok: soma === emerg.total, esperado: _ckInt_(emerg.total), obtido: _ckInt_(soma) };
  });
  _ckAdd_(L, G_EMERG, 'Itens da lista = total', () => {
    if (!emerg) return null;
    return { ok: emerg.lista.length === emerg.total, esperado: _ckInt_(emerg.total), obtido: _ckInt_(emerg.lista.length) };
  });
  // Um emergencial ABERTO no mês esteve aberto no mês — logo tem que
  // aparecer no backlog emergencial. Se não aparece, as duas abas
  // (CHAMADOS ABERTOS MES x BACKLOG - EMERGENCIAL - DETALHE) divergem.
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
  _ckAdd_(L, G_BKGER, 'Chamados Geral x total de Chamados Pendentes', () => {
    if (!histMes || histMes.geral == null || !pendentes) return null;
    return { ok: histMes.geral === pendentes.total, esperado: _ckInt_(histMes.geral), obtido: _ckInt_(pendentes.total) };
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

  return L;
}

// Carrega uma fonte sem deixar erro vazar (aba faltando, permissão etc.).
function _ckSafe_(fn) {
  try { return fn(); } catch (e) { Logger.log('Check: fonte indisponível — ' + e.message); return null; }
}


// ==========================================
// PONTOS DE ENTRADA
// ==========================================
// Slide avulso de conferência — gera SÓ o check na apresentação da cidade.
function gerarSoCheckCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideCheckConsistencia(); }
function gerarSoCheckItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCheckConsistencia(); }
function gerarSoCheckEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCheckConsistencia(); }
