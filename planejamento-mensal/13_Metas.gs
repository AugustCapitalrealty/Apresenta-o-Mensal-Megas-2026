/**
 * ARQUIVO: 13_Metas.gs
 * 02 METAS — Farol 2026 (tabela + pontuação) e um slide por meta.
 * Fonte: aba METAS da planilha de P&G (carga inicial = Farol de setembro,
 * farol-guilherme/Farol.gs). Pontuação = pontos das metas com Status ano Verde.
 */

function _pgAvisoSituacao_(ctx, situacao) {
  if (!situacao) return '';
  const alvo = _pgNorm_(_pgMesTexto_(ctx));
  return _pgNorm_(situacao) === alvo ? '' : ' ⚠ Situação de ' + situacao.toLowerCase() + ' (planilha não atualizada para ' +
    _pgMesTexto_(ctx).toLowerCase() + ').';
}

function slideFarolPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM, M = ctx.metas;
  _pgHeader_(s, 'FAROL DE METAS 2026', 'Planejamento & Gestão · situação em ' + (M.situacao || _pgMesTexto_(ctx)).toLowerCase());
  const x = DS.marginX + 3;
  const cols = [{ w: 290, align: 'L' }, { w: 50, align: 'C' }, { w: 62, align: 'C' }, { w: 96, align: 'C' }, { w: 62, align: 'C' }, { w: 96, align: 'C' }];
  const W = cols.reduce((a, c) => a + c.w, 0);
  _pgTabela_(s, x, 74, cols, [{ tipo: 'cab', cel: ['META (PRAZO)', 'PONTOS', 'REAL MÊS', 'STATUS MÊS', 'REAL ANO', 'STATUS ANO'] }], 16, 7);

  const alt = Math.min(44, Math.floor(230 / Math.max(M.metas.length, 1)));
  let y = 90;
  M.metas.forEach(mt => {
    _pgLinha_(s, x, y + alt, x + W, y + alt, DS.lines, 0.5);
    _pgTxt_(s, mt.n + ' · ' + mt.meta, x - 4, y + 2, 298, alt * 0.6, { fs: 8.5, negrito: true });
    _pgTxt_(s, 'prazo: ' + (mt.prazo ? _pgDataCurta_(mt.prazo) + '/' + String(mt.prazo.getFullYear()).slice(2) : '—') +
      (mt.direcionador ? ' · ' + mt.direcionador : ''), x - 4, y + alt * 0.55, 298, alt * 0.4, { fs: 7, cor: DS.textMuted });
    let xx = x + 290;
    _pgTxt_(s, String(mt.pontos), xx - 5, y, 60, alt, { fs: 9, negrito: true, align: 'C' }); xx += 50;
    _pgTxt_(s, mt.realMes || '—', xx - 5, y, 72, alt, { fs: 8.5, align: 'C' }); xx += 62;
    _pgPill_(s, xx + 6, y + alt / 2 - 7, 84, 14, PG_STATUS_META[mt.statusMes] || PG_STATUS_VAZIO); xx += 96;
    _pgTxt_(s, mt.realAno || '—', xx - 5, y, 72, alt, { fs: 8.5, align: 'C' }); xx += 62;
    _pgPill_(s, xx + 6, y + alt / 2 - 7, 84, 14, PG_STATUS_META[mt.statusAno] || PG_STATUS_VAZIO);
    y += alt;
  });

  // Pontuação
  const yC = Math.max(y + 14, 300);
  _pgCard_(s, DS.marginX, yC, PG_W - 2 * DS.marginX, 62, null, DS.verde);
  _pgTxt_(s, String(M.atingidos), DS.marginX + 10, yC + 8, 60, 40, { fs: 28, negrito: true, fonte: DS.titulos });
  _pgTxt_(s, '/ ' + M.total + ' pontos', DS.marginX + 66, yC + 18, 90, 22, { fs: 10, cor: DS.textMuted });
  const xb = DS.marginX + 170, wb = 300, frac = M.total ? M.atingidos / M.total : 0;
  _pgRet_(s, xb, yC + 18, wb, 10, DS.cinzaBarra, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
  if (frac > 0) _pgRet_(s, xb, yC + 18, Math.max(wb * frac, 10), 10, DS.verde, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
  const xe = xb + wb * (PG_METAS_PONTOS_ELEGIVEL / (M.total || 100));
  if (M.total) _pgLinha_(s, xe, yC + 13, xe, yC + 33, DS.brandDark, 1.25);
  _pgTxt_(s, 'mín. ' + PG_METAS_PONTOS_ELEGIVEL + ' pontos para elegibilidade', xb - 4, yC + 32, 300, 14, { fs: 7.5, cor: DS.textBody });
  const ating = M.metas.filter(x => x.statusAno === 'verde').map(x => 'meta ' + x.n);
  _pgTxt_(s, ating.length ? 'Atingidas: ' + ating.join(', ') + '.' : 'Nenhuma meta atingida ainda.',
    xb + wb + 14, yC + 8, PG_W - DS.marginX - (xb + wb + 14) - 6, 46, { fs: 8, cor: DS.textBody });
  _pgRodape_(s, 'Fonte: ' + PG_PLANILHA_NOME + ', aba METAS. Pontua a meta com Status ano = Verde.' + _pgAvisoSituacao_(ctx, M.situacao));
}

function slideMetaDetalhePG_(s, ctx, mt) {
  const DS = CR_DESIGN_SYSTEM;
  const prazo = mt.prazo ? _pgDataCurta_(mt.prazo) + '/' + mt.prazo.getFullYear() : '—';
  _pgHeader_(s, 'META ' + mt.n + ' · ' + mt.meta.toUpperCase(),
    [mt.pontos + ' pontos', mt.direcionador, 'prazo ' + prazo].filter(Boolean).join(' · '));
  const st = PG_STATUS_META[mt.statusAno] || PG_STATUS_VAZIO;

  // Coluna da esquerda: status
  let y0 = _pgCard_(s, DS.marginX, 76, 190, 230, 'STATUS', st.cor);
  _pgPill_(s, DS.marginX + 16, y0 + 8, 158, 24, st, 9);
  [['REAL NO MÊS', mt.realMes, PG_STATUS_META[mt.statusMes]], ['REAL NO ANO', mt.realAno, PG_STATUS_META[mt.statusAno]]].forEach((r, i) => {
    const yy = y0 + 48 + i * 62;
    _pgTxt_(s, r[0], DS.marginX + 12, yy, 160, 14, { fs: 7.5, negrito: true, cor: DS.textMuted, fonte: DS.titulos });
    _pgTxt_(s, r[1] || '—', DS.marginX + 12, yy + 14, 160, 30, { fs: 20, negrito: true, fonte: DS.titulos, cor: r[2] ? r[2].texto : DS.textMain });
  });
  _pgTxt_(s, 'Pontos: ' + mt.pontos + (mt.statusAno === 'verde' ? ' (conquistados)' : ''), DS.marginX + 12, y0 + 168, 170, 14, { fs: 8, cor: DS.textBody });

  // Direita: andamento
  const xA = DS.marginX + 202, wA = PG_W - DS.marginX - xA;
  y0 = _pgCard_(s, xA, 76, wA, 230, 'ANDAMENTO', DS.brandMed);
  _pgTxt_(s, mt.andamento || '(preencher a coluna Andamento na aba METAS)', xA + 12, y0 + 4, wA - 24, 230 - (y0 - 76) - 12,
    { fs: 11, cor: mt.andamento ? DS.textMain : DS.textMuted, topo: true });

  // Próximo passo
  _pgRet_(s, DS.marginX, 318, PG_W - 2 * DS.marginX, 48, DS.brandDark);
  _pgTxt_(s, 'PRÓXIMO PASSO', DS.marginX + 10, 322, 200, 12, { fs: 7.5, negrito: true, fonte: DS.titulos, cor: DS.brandSoft });
  _pgTxt_(s, mt.proximo || '—', DS.marginX + 10, 334, PG_W - 2 * DS.marginX - 20, 30, { fs: 10, cor: '#FFFFFF' });
  _pgRodape_(s, 'Fonte: ' + PG_PLANILHA_NOME + ', aba METAS.' + _pgAvisoSituacao_(ctx, ctx.metas.situacao));
}
