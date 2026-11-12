/**
 * ARQUIVO: 11_Dashboard.gs
 * DASHBOARD — resumo das três seções numa tela (mesmos números dos slides de
 * detalhe: sai das mesmas funções de dados).
 */

function _pgKpi_(s, x, y, w, valor, rotulo, linha3, cor3, corValor) {
  const DS = CR_DESIGN_SYSTEM;
  _pgTxt_(s, valor, x - 4, y, w + 8, 28, { fs: 22, negrito: true, fonte: DS.titulos, cor: corValor || DS.textMain });
  _pgTxt_(s, rotulo, x - 4, y + 28, w + 8, 24, { fs: 7.5, cor: DS.textBody, topo: true });
  if (linha3) _pgTxt_(s, linha3, x - 4, y + 52, w + 8, 12, { fs: 7.5, negrito: true, cor: cor3 || DS.textBody });
}

// "▲ 60% acima do ritmo" / "▼ 11% abaixo do ritmo" (despesa: acima é ruim).
function _pgVarTexto_(real, ritmo) {
  const DS = CR_DESIGN_SYSTEM;
  if (Math.abs(ritmo) < 0.5) return { txt: 'sem ritmo', cor: DS.textMuted };
  const p = Math.round((real - ritmo) / Math.abs(ritmo) * 100);
  if (p === 0) return { txt: '= ritmo', cor: DS.textBody };
  return p > 0 ? { txt: '▲ ' + p + '% acima do ritmo', cor: DS.pior } : { txt: '▼ ' + (-p) + '% abaixo do ritmo', cor: DS.melhor };
}

function slideDashboardPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM, m = ctx.mes;
  _pgHeader_(s, 'DASHBOARD · PLANEJAMENTO & GESTÃO', _pgMesTexto_(ctx) + ' · financeiro, metas e projetos da área');
  const mX = DS.marginX, gap = 12, wMeio = (PG_W - 2 * mX - gap) / 2;

  // FINANCEIRO -----------------------------------------------------------
  const k = _pgSomas_(ctx.agg.total, m);
  let y0 = _pgCard_(s, mX, 74, wMeio, 136, 'FINANCEIRO (R$ mil)', DS.brandMed);
  const wk = (wMeio - 24) / 3;
  const v1 = _pgVarTexto_(k.mesR, k.mesP), v2 = _pgVarTexto_(k.acumR, k.acumP), v3 = _pgVarTexto_(k.proj, k.anoP);
  _pgKpi_(s, mX + 12, y0 + 4, wk, _pgMil_(k.mesR), 'Realizado em ' + PG_MESES_CURTO[m].toLowerCase() + '\nRitmo ' + _pgMil_(k.mesP), v1.txt, v1.cor);
  _pgKpi_(s, mX + 12 + wk, y0 + 4, wk, _pgMil_(k.acumR), 'Acumulado jan–' + PG_MESES_CURTO[m].toLowerCase() + '\nRitmo ' + _pgMil_(k.acumP), v2.txt, v2.cor);
  _pgKpi_(s, mX + 12 + 2 * wk, y0 + 4, wk, _pgMil_(k.proj), 'Projeção ' + ctx.ano + '\nRitmo do ano ' + _pgMil_(k.anoP), v3.txt, v3.cor);

  // METAS ----------------------------------------------------------------
  const xM = mX + wMeio + gap;
  y0 = _pgCard_(s, xM, 74, wMeio, 136, 'METAS 2026', DS.verde);
  if (!ctx.metas) {
    _pgTxt_(s, 'Planilha de metas não encontrada (rodar criarPlanilhaPG).', xM + 12, y0 + 10, wMeio - 24, 40, { fs: 9, cor: DS.textMuted });
  } else {
    const M = ctx.metas;
    _pgTxt_(s, String(M.atingidos), xM + 8, y0 + 4, 70, 32, { fs: 26, negrito: true, fonte: DS.titulos });
    _pgTxt_(s, '/ ' + M.total + ' pontos', xM + 62, y0 + 12, 90, 20, { fs: 10, cor: DS.textMuted });
    _pgTxt_(s, 'mín. ' + PG_METAS_PONTOS_ELEGIVEL + ' para elegibilidade', xM + 8, y0 + 36, 160, 14, { fs: 7.5, cor: DS.textBody });
    const cnt = st => M.metas.filter(x => x.statusAno === st).length;
    const semSt = M.metas.filter(x => !x.statusAno).length;
    const lin = [[DS.verde, cnt('verde') + ' atingida(s)'], [DS.amarelo, cnt('amarelo') + ' em andamento'],
                 [DS.vermelho, cnt('vermelho') + ' não atingida(s)']];
    if (semSt) lin.push(['#CBD5E1', semSt + ' sem status']);
    lin.forEach((l, i) => {
      _pgRet_(s, xM + 172, y0 + 8 + i * 17, 8, 8, l[0], { forma: SlidesApp.ShapeType.ELLIPSE });
      _pgTxt_(s, l[1], xM + 182, y0 + 3 + i * 17, wMeio - 190, 17, { fs: 8.5, cor: DS.textMain });
    });
    if (M.situacao) _pgTxt_(s, 'Situação: ' + M.situacao.toLowerCase(), xM + 8, y0 + 82, wMeio - 20, 12, { fs: 7, cor: DS.textMuted, italico: true });
  }

  // PROJETOS -------------------------------------------------------------
  const wT = PG_W - 2 * mX;
  y0 = _pgCard_(s, mX, 220, wT, 162, 'PROJETOS', DS.brandLight);
  if (!ctx.projetos) {
    _pgTxt_(s, 'Planilha de projetos não encontrada (rodar criarPlanilhaPG).', mX + 12, y0 + 10, wT - 24, 40, { fs: 9, cor: DS.textMuted });
  } else {
    const P = ctx.projetos;
    const n = k => P.filter(p => p.situacao === k).length;
    const kp = [[String(P.length), 'projetos no ano', DS.textMain],
                [String(n('concluido')), 'concluído(s)', DS.melhor],
                [String(n('em andamento')), 'em andamento', DS.brandLight]];
    if (n('pausado')) kp.push([String(n('pausado')), 'pausado(s)', DS.textMuted]);
    kp.forEach((q, i) => _pgKpi_(s, mX + 12 + i * 86, y0 + 6, 78, q[0], q[1], null, null, q[2]));

    // Concluídos no ano, mais recentes primeiro.
    const xm = mX + 12 + 4 * 86 + 10, wm = wT - (xm - mX) - 12;
    _pgTxt_(s, 'CONCLUÍDOS EM ' + ctx.ano, xm - 4, y0, wm, 14, { fs: 7.5, negrito: true, fonte: DS.titulos, cor: DS.textMain });
    const conc = P.filter(p => p.situacao === 'concluido')
      .sort((a, b) => (b.concluidoEm || 0) - (a.concluidoEm || 0)).slice(0, 6);
    const txt = conc.length ? conc.map(p => '✓ ' + (p.concluidoEm ? _pgDataCurta_(p.concluidoEm) + ' · ' : '') + p.projeto).join('\n')
                            : 'Nenhum projeto concluído registrado.';
    _pgTxt_(s, txt, xm - 4, y0 + 15, wm, 100, { fs: 8, cor: DS.textBody, topo: true });
  }
  _pgRodape_(s, 'Fontes: ' + ctx.fin.arquivo + ' (CC ' + PG_CENTRO_CUSTO.split(' ')[0] + ') · ' + PG_PLANILHA_NOME + ' (abas METAS e PROJETOS).');
}
