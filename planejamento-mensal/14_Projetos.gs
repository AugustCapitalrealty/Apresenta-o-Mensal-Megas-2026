/**
 * ARQUIVO: 14_Projetos.gs
 * 03 PROJETOS — Portfólio (tabela, até 11 por slide), Cronograma (Gantt de 6
 * meses) e Entregas do mês + próximos marcos. Fonte: aba PROJETOS.
 * Campo vazio na planilha aparece vazio/"a preencher" no slide — nunca é
 * deduzido.
 */

const PG_PROJ_POR_SLIDE = 11;

// Ativos por prazo (sem prazo no fim); entregues por último.
function _pgOrdenarProjetos_(lista) {
  const chave = p => (p.statusKey === 'entregue' ? 2 : p.prazo ? 0 : 1);
  return lista.slice().sort((a, b) => (chave(a) - chave(b)) ||
    ((a.prazo || 0) - (b.prazo || 0)) || a.projeto.localeCompare(b.projeto));
}

function slidesPortfolioPG_(novo, ctx) {
  const lista = _pgOrdenarProjetos_(ctx.projetos);
  const paginas = Math.max(1, Math.ceil(lista.length / PG_PROJ_POR_SLIDE));
  for (let p = 0; p < paginas; p++) {
    _pgSlidePortfolio_(novo(), ctx, lista.slice(p * PG_PROJ_POR_SLIDE, (p + 1) * PG_PROJ_POR_SLIDE), p + 1, paginas);
  }
}

function _pgSlidePortfolio_(s, ctx, itens, pag, total) {
  const DS = CR_DESIGN_SYSTEM;
  _pgHeader_(s, 'PORTFÓLIO DE PROJETOS' + (total > 1 ? ' (' + pag + '/' + total + ')' : ''),
    'Situação em ' + (ctx.metas && ctx.metas.situacao ? ctx.metas.situacao.toLowerCase() : _pgMesTexto_(ctx).toLowerCase()) +
    ' · ativos por prazo, entregues no fim');
  const x = DS.marginX + 3;
  const cols = [{ w: 168, align: 'L' }, { w: 84, align: 'L' }, { w: 74, align: 'L' }, { w: 44, align: 'C' },
                { w: 84, align: 'L' }, { w: 72, align: 'C' }, { w: 134, align: 'L' }];
  const W = cols.reduce((a, c) => a + c.w, 0);
  _pgTabela_(s, x, 72, cols, [{ tipo: 'cab', cel: ['PROJETO', 'ÁREA', 'RESPONSÁVEL', 'PRAZO', 'AVANÇO', 'STATUS', 'PRÓXIMO PASSO'] }], 16, 7);
  const alt = Math.min(33, Math.floor(288 / Math.max(itens.length, 1)));
  let y = 88;
  itens.forEach(p => {
    _pgLinha_(s, x, y + alt, x + W, y + alt, DS.lines, 0.5);
    let xx = x;
    _pgTxt_(s, p.projeto, xx - 5, y, cols[0].w + 6, alt, { fs: 8, negrito: true }); xx += cols[0].w;
    _pgTxt_(s, p.area || '—', xx - 5, y, cols[1].w + 6, alt, { fs: 7.5, cor: DS.textBody }); xx += cols[1].w;
    _pgTxt_(s, p.responsavel || '—', xx - 5, y, cols[2].w + 6, alt, { fs: 7.5, cor: DS.textBody }); xx += cols[2].w;
    _pgTxt_(s, p.prazo ? _pgDataCurta_(p.prazo) : '—', xx - 5, y, cols[3].w + 10, alt, { fs: 7.5, align: 'C' }); xx += cols[3].w;
    if (p.avanco != null) {
      const bw = 46;
      _pgRet_(s, xx + 2, y + alt / 2 - 3, bw, 6, DS.cinzaBarra, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
      if (p.avanco > 0) _pgRet_(s, xx + 2, y + alt / 2 - 3, Math.max(bw * p.avanco / 100, 6), 6,
        p.statusKey === 'entregue' ? DS.verde : DS.brandLight, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
      _pgTxt_(s, Math.round(p.avanco) + '%', xx + bw - 2, y, 40, alt, { fs: 7.5 });
    } else {
      _pgTxt_(s, '—', xx - 5, y, cols[4].w, alt, { fs: 7.5, cor: DS.textMuted });
    }
    xx += cols[4].w;
    _pgPill_(s, xx + 2, y + alt / 2 - 6, cols[5].w - 4, 12, _pgStatusProjeto_(p), 6); xx += cols[5].w;
    _pgTxt_(s, _pgTruncar_(p.proximo || p.obs || '—', 64), xx - 5, y, cols[6].w + 8, alt, { fs: 7, cor: DS.textBody });
    y += alt;
  });
  if (!itens.length) _pgTxt_(s, 'Nenhum projeto na aba PROJETOS.', x, 100, 400, 20, { fs: 10, cor: DS.textMuted });
  _pgRodape_(s, 'Fonte: ' + PG_PLANILHA_NOME + ', aba PROJETOS.' + (ctx.metas ? _pgAvisoSituacao_(ctx, ctx.metas.situacao) : ''));
}

function _pgTruncar_(t, max) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const c = t.slice(0, max), e = c.lastIndexOf(' ');
  return (e > max * 0.6 ? c.slice(0, e) : c) + '…';
}

function slideCronogramaPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM;
  // Janela de 6 meses: 3 antes do mês de referência, ele, e 2 depois.
  const ini = new Date(ctx.ano, ctx.mes - 3, 1), fim = new Date(ctx.ano, ctx.mes + 3, 1);
  const nomeMes = d => PG_MESES_CURTO[d.getMonth()];
  _pgHeader_(s, 'CRONOGRAMA DOS PROJETOS', _pgCap_(nomeMes(ini).toLowerCase()) + ' a ' + nomeMes(new Date(fim.getTime() - 1)).toLowerCase() +
    ' · barra = início → prazo · cor = status');
  const xL = DS.marginX, wL = 168, x0 = xL + wL + 6, x1 = PG_W - DS.marginX, yT = 74;
  const span = fim - ini, px = d => x0 + (x1 - x0) * Math.max(0, Math.min(1, (d - ini) / span));

  const comData = _pgOrdenarProjetos_(ctx.projetos.filter(p => (p.inicio || p.prazo) &&
    (p.prazo || p.inicio) >= ini && (p.inicio || p.prazo) < fim)).slice(0, 12);
  const semData = ctx.projetos.filter(p => !p.inicio && !p.prazo).length;

  // Grade de meses
  const rowH = Math.min(24, Math.floor(270 / Math.max(comData.length, 1)));
  const yG = yT + 16, hG = Math.max(rowH * comData.length, 60);
  _pgRet_(s, x0, yG, x1 - x0, hG, '#FFFFFF', { borda: DS.lines });
  for (let k = 0; k < 6; k++) {
    const d = new Date(ini.getFullYear(), ini.getMonth() + k, 1), xa = px(d), xb = px(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    _pgTxt_(s, nomeMes(d), xa, yT, xb - xa, 14, { fs: 8, negrito: true, fonte: DS.titulos, cor: DS.brandMed, align: 'C' });
    if (k) _pgLinha_(s, xa, yG, xa, yG + hG, DS.lines, 0.75);
  }
  // Linha do fim do mês de referência
  const xRef = px(new Date(ctx.ano, ctx.mes + 1, 1));
  _pgLinha_(s, xRef, yG - 4, xRef, yG + hG + 4, DS.vermelho, 1.25);
  _pgTxt_(s, 'fim de ' + PG_MESES[ctx.mes].toLowerCase(), xRef - 60, yG + hG + 4, 120, 12, { fs: 7, negrito: true, cor: DS.vermelho, align: 'C' });

  comData.forEach((p, i) => {
    const y = yG + i * rowH, st = _pgStatusProjeto_(p);
    _pgTxt_(s, _pgTruncar_(p.projeto, 38), xL - 4, y, wL + 6, rowH, { fs: 7.5, negrito: true });
    if (p.inicio && p.prazo) {
      const a = px(p.inicio), b = px(p.prazo);
      _pgRet_(s, a, y + rowH / 2 - 4, Math.max(b - a, 3), 8, st.cor, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
    } else {
      // Só uma data: marco (losango) nela.
      const d = p.prazo || p.inicio;
      _pgRet_(s, px(d) - 5, y + rowH / 2 - 5, 10, 10, st.cor, { forma: SlidesApp.ShapeType.DIAMOND });
    }
  });
  if (!comData.length) _pgTxt_(s, 'Nenhum projeto com datas nesta janela. Preencha Início e Prazo na aba PROJETOS.',
    x0 + 10, yG + 10, x1 - x0 - 20, 40, { fs: 9, cor: DS.textMuted });

  // Legenda
  const leg = ['no prazo', 'atencao', 'atrasado', 'entregue'].map(k => PG_STATUS_PROJETO[k]).concat([PG_STATUS_VAZIO]);
  let xl = DS.marginX;
  const yLeg = PG_H - 34;
  leg.forEach(st => {
    _pgRet_(s, xl, yLeg + 3, 8, 8, st.cor, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
    _pgTxt_(s, st.rotulo.toLowerCase(), xl + 6, yLeg - 1, 80, 16, { fs: 7, cor: DS.textBody });
    xl += 82;
  });
  _pgTxt_(s, '◆ = só uma data (prazo ou início)', xl, yLeg - 1, 180, 16, { fs: 7, cor: DS.textBody });
  _pgRodape_(s, 'Fonte: aba PROJETOS.' + (semData ? ' ' + semData + ' projeto(s) sem início nem prazo não aparecem.' : ''));
}

function slideEntregasPG_(s, ctx) {
  const DS = CR_DESIGN_SYSTEM;
  _pgHeader_(s, 'ENTREGAS DO MÊS E PRÓXIMOS PASSOS', _pgMesTexto_(ctx) + ' · entregas registradas e prazos dos próximos 60 dias');
  const w = (PG_W - 2 * DS.marginX - 12) / 2, h = 300;

  const ent = _pgEntreguesNoMes_(ctx);
  let y0 = _pgCard_(s, DS.marginX, 76, w, h, 'ENTREGUES EM ' + PG_MESES[ctx.mes], DS.verde);
  if (!ent.length) _pgTxt_(s, 'Nenhuma entrega registrada no mês (coluna "Entregue em" da aba PROJETOS).', DS.marginX + 12, y0 + 4, w - 24, 40, { fs: 9, cor: DS.textMuted, topo: true });
  ent.slice(0, 7).forEach((p, i) => {
    const y = y0 + 4 + i * 38;
    _pgTxt_(s, '✓  ' + p.projeto, DS.marginX + 10, y, w - 20, 16, { fs: 9, negrito: true, cor: DS.verdeEsc });
    _pgTxt_(s, _pgDataCurta_(p.entregueEm) + (p.area ? ' · ' + p.area : '') + (p.obs ? ' · ' + _pgTruncar_(p.obs, 60) : ''),
      DS.marginX + 22, y + 15, w - 34, 16, { fs: 7.5, cor: DS.textBody });
  });

  const xR = DS.marginX + w + 12;
  const marcos = _pgProximosMarcos_(ctx, 60);
  y0 = _pgCard_(s, xR, 76, w, h, 'PRÓXIMOS MARCOS (60 DIAS)', DS.brandLight);
  if (!marcos.length) _pgTxt_(s, 'Nenhum prazo nos próximos 60 dias (coluna "Prazo" da aba PROJETOS).', xR + 12, y0 + 4, w - 24, 40, { fs: 9, cor: DS.textMuted, topo: true });
  marcos.slice(0, 7).forEach((p, i) => {
    const y = y0 + 4 + i * 38, st = _pgStatusProjeto_(p);
    _pgRet_(s, xR + 12, y + 2, 36, 14, DS.brandDark, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
    _pgTxt_(s, _pgDataCurta_(p.prazo), xR + 6, y + 2, 48, 14, { fs: 7.5, negrito: true, cor: '#FFFFFF', align: 'C' });
    _pgTxt_(s, _pgTruncar_(p.projeto, 34), xR + 52, y, w - 130, 16, { fs: 8.5, negrito: true });
    _pgPill_(s, xR + w - 78, y + 3, 66, 12, st, 6);
    _pgTxt_(s, _pgTruncar_(p.proximo || '—', 85), xR + 52, y + 16, w - 64, 18, { fs: 7.5, cor: DS.textBody });
  });
  _pgRodape_(s, 'Fonte: aba PROJETOS (Status, Entregue em, Prazo, Próximo passo).');
}
