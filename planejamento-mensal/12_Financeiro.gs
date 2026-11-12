/**
 * ARQUIVO: 12_Financeiro.gs
 * 01 FINANCEIRO — DRE, Bridge (tabela) e Bridge (cascata).
 *
 * Regras (Guilherme, 12/11/2026):
 *  - "Planejado" do export = RITMO. Aparece sempre como "Ritmo".
 *  - P&G NÃO tem meta financeira: não há coluna Meta/Orçamento.
 *  - Ano = realizado até o mês de referência + ritmo dos meses seguintes.
 * Os três slides saem da MESMA agregação (agregarFinanceiroPG_), então os
 * totais batem entre si por construção.
 */

function _pgCap_(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }

// Linhas do DRE/Bridge: grupos e itens com algum valor no ano (ritmo ou real).
// modo 'mes' (Bridge mês a mês): também fecha os grupos com mesAMes = false.
function _pgLinhasFin_(agg, modo) {
  const temValor = x => x.P.some(v => Math.abs(v) >= 0.5) || x.R.some(v => Math.abs(v) >= 0.5);
  const out = [];
  agg.grupos.forEach(g => {
    if (!temValor(g)) return;
    out.push({ tipo: 'grupo', nome: g.nome, serie: g });
    if (!g.detalhar || (modo === 'mes' && !g.mesAMes)) return;
    g.itens.forEach(it => { if (temValor(it)) out.push({ tipo: 'item', nome: it.nome, serie: it }); });
  });
  return out;
}

function slideDREPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM, m = ctx.mes, agg = ctx.agg;
  const mesC = PG_MESES_CURTO[m];
  _pgHeader_(s, 'DRE · PLANEJAMENTO & GESTÃO',
    'Realizado × ritmo em R$ mil · ' + _pgMesTexto_(ctx).toLowerCase().replace(/^./, c => c.toUpperCase()) +
    ', acumulado e projeção do ano');

  const x = DS.marginX + 3, y = 72, alt = 14;
  const cols = [{ w: 186, align: 'L' }].concat(Array(9).fill(0).map(() => ({ w: 52, align: 'R' })));
  const W = cols.reduce((a, c) => a + c.w, 0);

  // Faixa de cima com os três blocos.
  _pgRet_(s, x, y, W, alt, DS.brandDark);
  _pgTxt_(s, 'RUBRICA', x - 5, y, 196, alt, { fs: 7, negrito: true, fonte: DS.titulos, cor: '#FFFFFF' });
  [mesC + '/' + String(ctx.ano).slice(2), 'ACUMULADO JAN–' + mesC, 'ANO ' + ctx.ano + ' (REAL + RITMO)'].forEach((t, i) => {
    _pgTxt_(s, t, x + 186 + i * 156, y, 156, alt, { fs: 7, negrito: true, fonte: DS.titulos, cor: '#FFFFFF', align: 'C' });
    if (i) _pgLinha_(s, x + 186 + i * 156, y + 2, x + 186 + i * 156, y + alt - 2, '#3B4A7A', 0.75);
  });

  const linhas = [{ tipo: 'sub', cel: ['', 'Ritmo', 'Real', 'Var.', 'Ritmo', 'Real', 'Var.', 'Ritmo', 'Projeção', 'Var.'] }];
  const linhaDe = (tipo, nome, serie) => {
    const k = _pgSomas_(serie, m);
    const v1 = _pgVar_(k.mesR, k.mesP), v2 = _pgVar_(k.acumR, k.acumP), v3 = _pgVar_(k.proj, k.anoP);
    const corV = tipo === 'tot' ? null : undefined;
    return {
      tipo: tipo,
      cel: [(tipo === 'item' ? '   ' : '') + nome, _pgMil_(k.mesP), _pgMil_(k.mesR), v1.txt,
            _pgMil_(k.acumP), _pgMil_(k.acumR), v2.txt, _pgMil_(k.anoP), _pgMil_(k.proj), v3.txt],
      cores: corV === null ? null : [null, null, null, v1.cor, null, null, v2.cor, null, null, v3.cor]
    };
  };
  _pgLinhasFin_(agg).forEach(l => linhas.push(linhaDe(l.tipo, l.nome, l.serie)));
  linhas.push(linhaDe('tot', 'TOTAL P&G', agg.total));
  const yFim = _pgTabela_(s, x, y + alt, cols, linhas, alt, 7.5);

  // Notas automáticas: maiores diferenças e créditos (estornos) do realizado.
  const notas = [];
  const vars = _pgMaioresVariacoes_(ctx.fin, 4);
  if (vars.length) {
    notas.push('Maiores diferenças no acumulado: ' + vars.map(v =>
      _pgCap_(v.desc) + ' ' + _pgMil_(Math.abs(v.dif)) + ' mil ' + (v.dif > 0 ? 'acima' : 'abaixo') + ' do ritmo').join(' · ') + '.');
  }
  if (agg.creditos.length) {
    const por = {};
    agg.creditos.slice().sort((a, b) => a.mes - b.mes).forEach(c => { (por[c.desc] = por[c.desc] || []).push(c); });
    notas.push('Créditos no realizado (estornos que abatem a despesa): ' + Object.keys(por).map(d =>
      _pgCap_(d) + ' ' + por[d].map(c => '+' + _pgMil_(c.valor) + ' mil (' + PG_MESES_CURTO[c.mes].toLowerCase() + ')').join(', ')
    ).join(' · ') + '.');
  }
  if (agg.foraMapa.length) notas.push('⚠ Contas fora do mapa de rubricas (em "Outras"): ' + agg.foraMapa.join('; ') + '.');
  if (notas.length) {
    _pgTxt_(s, 'NOTAS', x - 4, yFim + 4, 60, 12, { fs: 7, negrito: true, fonte: DS.titulos, cor: DS.brandMed });
    _pgTxt_(s, notas.join('\n'), x - 4, yFim + 15, W + 8, PG_H - 22 - (yFim + 15), { fs: 7, cor: DS.textBody, topo: true });
  }
  const dep = _pgSomas_(agg.deprec, m);
  _pgRodape_(s, 'Fonte: ' + ctx.fin.arquivo + ' (CC ' + PG_CENTRO_CUSTO.split(' ')[0] + '). Ritmo = "Planejado" do export; ' +
    'P&G sem meta financeira. Depreciação fora do DRE (real acum. ' + _pgMil_(dep.acumR) + ' mil).');
}

function slideBridgeTabelaPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM, m = ctx.mes, agg = ctx.agg;
  _pgHeader_(s, 'ANÁLISE DE VARIAÇÃO · MÊS A MÊS',
    'R$ mil · realizado até ' + PG_MESES_CURTO[m].toLowerCase() + ', ritmo nos meses seguintes · projeção do ano');
  const x = DS.marginX + 2, y = 72, alt = 13;
  const cols = [{ w: 150, align: 'L' }].concat(Array(12).fill(0).map(() => ({ w: 38, align: 'R' })), [{ w: 50, align: 'R' }]);

  // Faixa REAL | RITMO sobre os meses.
  const xMes = x + 150, wReal = 38 * (m + 1);
  _pgRet_(s, xMes, y, wReal, 11, DS.brandMed);
  _pgTxt_(s, 'REALIZADO', xMes, y, wReal, 11, { fs: 6.5, negrito: true, cor: '#FFFFFF', align: 'C', fonte: DS.titulos });
  if (m < 11) {
    _pgRet_(s, xMes + wReal, y, 38 * (11 - m), 11, DS.cinzaBarra);
    _pgTxt_(s, 'RITMO', xMes + wReal, y, 38 * (11 - m), 11, { fs: 6.5, negrito: true, cor: DS.textBody, align: 'C', fonte: DS.titulos });
  }

  const italico = [false].concat(Array(12).fill(0).map((_, i) => i > m), [false]);
  const linhas = [{ tipo: 'cab', cel: ['RUBRICA'].concat(PG_MESES_CURTO, ['ANO']) }];
  const valores = serie => serie.R.map((r, i) => (i <= m ? r : serie.P[i]));
  const cinza = [null].concat(Array(12).fill(0).map((_, i) => (i > m ? DS.textMuted : null)), [null]);
  _pgLinhasFin_(agg, 'mes').forEach(l => {
    const v = valores(l.serie);
    linhas.push({ tipo: l.tipo, cel: [(l.tipo === 'item' ? '   ' : '') + l.nome].concat(v.map(_pgMil_), [_pgMil_(_pgSomas_(l.serie, m).proj)]),
                  italico: italico, cores: l.tipo === 'item' ? cinza : null });
  });
  const tot = valores(agg.total), k = _pgSomas_(agg.total, m);
  linhas.push({ tipo: 'tot', cel: ['TOTAL (REAL + RITMO)'].concat(tot.map(_pgMil_), [_pgMil_(k.proj)]) });
  linhas.push({ tipo: 'grupo', cel: ['RITMO (PLANEJADO DO EXPORT)'].concat(agg.total.P.map(_pgMil_), [_pgMil_(k.anoP)]) });
  const dif = tot.map((v, i) => v - agg.total.P[i]);
  const corDif = d => (Math.abs(d) < 50 ? DS.textMuted : d > 0 ? DS.pior : DS.melhor);
  linhas.push({ tipo: 'item', cel: ['DIFERENÇA (REAL − RITMO)'].concat(dif.map((d, i) => (i <= m ? _pgMil_(d) : '')), [_pgMil_(k.proj - k.anoP)]),
                cores: [DS.textMain].concat(dif.map(corDif), [corDif(k.proj - k.anoP)]) });
  _pgTabela_(s, x, y + 11, cols, linhas, alt, 6.5);
  _pgRodape_(s, 'Despesa positiva; crédito (estorno) entra negativo e abate. Diferença: vermelho = gastou mais que o ritmo, verde = menos.');
}

function slideBridgeGraficoPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM, m = ctx.mes, agg = ctx.agg;
  const kTot = _pgSomas_(agg.total, m);
  _pgHeader_(s, 'BRIDGE · RITMO → PROJEÇÃO ' + ctx.ano,
    'O que explica a diferença entre o ritmo do ano e a projeção (realizado até ' + PG_MESES_CURTO[m].toLowerCase() + ' + ritmo) · R$ mil');

  // Variação por rubrica (item); as pequenas viram "Demais".
  let deltas = [];
  agg.grupos.forEach(g => (g.detalhar ? g.itens.map(it => ({ nome: it.nome, s: it })) : [{ nome: _pgNomeGrupo_(g.nome), s: g }]).forEach(x => {
    const k = _pgSomas_(x.s, m);
    const d = k.proj - k.anoP;
    if (Math.abs(d) >= 0.5) deltas.push({ nome: x.nome, d: d });
  }));
  deltas.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  if (deltas.length > 7) {
    const resto = deltas.slice(6).reduce((a, x) => a + x.d, 0);
    deltas = deltas.slice(0, 6).concat([{ nome: 'Demais rubricas', d: resto }]);
  }
  const barras = [{ nome: 'Ritmo ' + ctx.ano, v: kTot.anoP, total: true }]
    .concat(deltas.map(x => ({ nome: x.nome, v: x.d })), [{ nome: 'Projeção ' + ctx.ano, v: kTot.proj, total: true }]);

  // Escala a partir do zero.
  let acum = 0, maxY = 0;
  const geo = barras.map(b => {
    let ini, fim;
    if (b.total) { ini = 0; fim = b.v; acum = b.v; }
    else { ini = acum; fim = acum + b.v; acum = fim; }
    maxY = Math.max(maxY, ini, fim);
    return { ini: ini, fim: fim };
  });
  const x0 = 50, x1 = PG_W - 40, yTop = 96, yBase = 300;
  const esc = (yBase - yTop) / (maxY || 1);
  const slot = (x1 - x0) / barras.length, bw = Math.min(54, slot * 0.6);
  _pgLinha_(s, x0 - 8, yBase, x1, yBase, DS.lines, 1);

  barras.forEach((b, i) => {
    const g = geo[i], cx = x0 + slot * i + slot / 2;
    const yA = yBase - Math.max(g.ini, g.fim) * esc, h = Math.max(Math.abs(g.fim - g.ini) * esc, 1.5);
    const cor = b.total ? DS.brandMed : (b.v > 0 ? DS.pior : DS.melhor);
    _pgRet_(s, cx - bw / 2, yA, bw, h, cor);
    const rot = b.total ? _pgMil_(b.v) : (b.v > 0 ? '+' : '−') + _pgMil_(Math.abs(b.v));
    _pgTxt_(s, rot, cx - slot / 2, yA - 15, slot, 13, { fs: 8, negrito: true, cor: b.total ? DS.textMain : cor, align: 'C', fonte: DS.titulos });
    _pgTxt_(s, b.nome, cx - slot / 2, yBase + 3, slot, 28, { fs: 6.5, cor: DS.textBody, align: 'C', topo: true, negrito: !!b.total });
    // conector até a próxima barra
    if (i < barras.length - 1) {
      const yC = yBase - g.fim * esc, nx = x0 + slot * (i + 1) + slot / 2 - bw / 2;
      _pgLinha_(s, cx + bw / 2, yC, nx, yC, DS.textMuted, 0.5);
    }
  });

  // Leitura em uma frase (calculada).
  const dif = kTot.proj - kTot.anoP;
  const pct = kTot.anoP ? Math.round(Math.abs(dif) / kTot.anoP * 100) : 0;
  const maior = deltas.filter(x => x.nome !== 'Demais rubricas')[0];
  let frase = 'Projeção ' + ctx.ano + ' de R$ ' + _pgMil_(kTot.proj) + ' mil, R$ ' + _pgMil_(Math.abs(dif)) + ' mil (' + pct + '%) ' +
    (dif <= 0 ? 'abaixo' : 'acima') + ' do ritmo do ano.';
  if (maior) frase += ' Maior efeito: ' + maior.nome.toLowerCase() + ' (' + (maior.d > 0 ? '+' : '−') + _pgMil_(Math.abs(maior.d)) + ' mil).';
  const y0 = _pgCard_(s, DS.marginX, 340, PG_W - 2 * DS.marginX, 44, null, DS.brandMed);
  _pgTxt_(s, frase, DS.marginX + 10, 344, PG_W - 2 * DS.marginX - 20, 36, { fs: 9, cor: DS.textMain });
  _pgRodape_(s, 'Vermelho = gasto acima do ritmo; verde = abaixo. Fonte: ' + ctx.fin.arquivo + '.');
}
