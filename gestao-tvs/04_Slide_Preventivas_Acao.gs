/**
 * ARQUIVO: 04_Slide_Preventivas_Acao.gs
 * DESCRIÇÃO: Foco de Ação (Preventivas em Aberto/Atrasadas).
 */

function gerarSlidePreventivasDetalhe(slide, dataGlobal, unit) {
  const d = obterBacklogPreventivoTV_(unit);
  if (!d) { Logger.log('⚠️ Backlog Preventivo (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  // O comparativo é CALCULADO na base (fila de N dias atrás), não lembrado
  // entre execuções. Ver TV_BACKLOG_DIAS_COMPARACAO em Dados.gs.
  const diff  = d.countEmAberto - d.emAbertoAntes;
  const trend = diff < 0 ? 'DOWN' : (diff > 0 ? 'UP' : 'FLAT');

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardDetalhePreventivas(slide, d.countEmAberto, d.countEmCurso, d.lista,
    d.equipeLider, dataGlobal, d.emAbertoAntes, trend, diff, unit, d.diasComparacao);
}

// Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026): as atrasadas
// no cartão cheio, a fila nos cartões ao lado e a lista das prioridades numa
// tabela com cabeçalho escuro e linhas zebradas. Vermelho = atraso.
function criarDashboardDetalhePreventivas(slide, countEmAberto, countEmCurso, lista, equipeLider, dataGlobal, prevEmAberto, trend, diff, unit, diasComp) {
  const quando = diasComp ? ` em ${diasComp} dias` : '';
  const v = _tvVariacao_(countEmAberto - (prevEmAberto == null ? countEmAberto : prevEmAberto), true);
  applyBrandHeaderAndBackground(slide, 'Backlog preventivo',
    `${countEmAberto} atrasadas · ${countEmCurso} em curso · ${v.txt}${quando}`, dataGlobal, unit);
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;

  const kx = 30, ky = 84, kh = 64, kg = 10, kw = (660 - 3 * kg) / 4;
  _tvKpi_(slide, kx, ky, kw, kh, { rotulo: 'Atrasadas', valor: countEmAberto, destaque: true, fsValor: 28,
    sub: v.txt + quando, corSub: v.cor });
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, { rotulo: 'Em curso', valor: countEmCurso, fsValor: 28,
    sub: 'em execução agora' });
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, { rotulo: 'Total na fila', valor: countEmAberto + countEmCurso, fsValor: 28,
    sub: 'atrasadas + em curso' });
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, { rotulo: 'Maior volume', valor: equipeLider || '—', fsValor: 15,
    sub: 'equipe com mais rotinas na fila' });

  // Tabela das prioridades
  const px = 30, py = 158, pw = 660, ph = 218;
  const cy = _tvCard_(slide, px, py, pw, ph, 'Prioridades · por volume');
  const tx = px + 14, tw = pw - 28;
  const cols = [
    { t: 'QTD', w: 50, a: 'C' }, { t: 'DESCRIÇÃO DO SERVIÇO', w: tw - 50 - 150 - 110, a: 'L' },
    { t: 'RESPONSÁVEL', w: 150, a: 'L' }, { t: 'DIAS EM ABERTO', w: 110, a: 'C' }];
  const xs = []; let acc = tx; cols.forEach(col => { xs.push(acc); acc += col.w; });

  if (!lista.length) {
    _tvTexto_(slide, px, cy + 60, pw, 26, 'Nenhuma preventiva atrasada ou em curso na fila.',
      { fs: 14, fsMin: 10, bold: true, cor: c.accentGreen, fonte: DS.typography.titles, align: 'C' });
  } else {
    const cabH = 20, rowH = Math.min(26, (py + ph - 10 - cy - cabH) / lista.length);
    _tvRet_(slide, tx, cy, tw, cabH, c.brandDark);
    cols.forEach((col, i) => _tvTexto_(slide, xs[i], cy, col.w, cabH, col.t,
      { fs: 8, fsMin: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, align: col.a, cortar: true }));
    lista.forEach((item, r) => {
      const y = cy + cabH + r * rowH;
      const atraso = !!item.isEmAberto;
      if (r % 2 === 1) _tvRet_(slide, tx, y, tw, rowH, c.zebra);
      if (r < 3 && atraso) _tvRet_(slide, tx, y + 3, 3, rowH - 6, c.accentRed);
      _tvTexto_(slide, xs[0], y, cols[0].w, rowH, item.qtd + 'x',
        { fs: 10, fsMin: 8, bold: true, cor: atraso ? c.accentRed : c.textMain, fonte: DS.typography.titles, align: 'C' });
      _tvTexto_(slide, xs[1], y, cols[1].w, rowH, item.desc,
        { fs: 9.5, fsMin: 9.5, bold: r < 3 && atraso, cor: c.textMain, fonte: DS.typography.body, cortar: true });
      _tvTexto_(slide, xs[2], y, cols[2].w, rowH, item.equipe,
        { fs: 9, fsMin: 9, cor: c.textBody, fonte: DS.typography.body, cortar: true });
      _tvTexto_(slide, xs[3], y, cols[3].w, rowH, item.dataLabel,
        { fs: 9, fsMin: 7.5, bold: atraso, cor: atraso ? c.accentRed : c.textBody, fonte: DS.typography.titles, align: 'C' });
    });
  }

  _tvRodape_(slide, 'Fonte: BD-PREVENTIVAS (Infraspeak) · fila em aberto na data da atualização' +
                    (diasComp ? `, comparada com ${diasComp} dias atrás` : '') + ' · vermelho = atrasada');
}
