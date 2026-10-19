/**
 * ARQUIVO: 02_Slide_Corretivas_Acao.gs
 * DESCRIÇÃO: Foco de Ação (Matriz de Corretivas).
 */

function gerarSlideCorretivasDetalhe(slide, dataGlobal, unit) {
  const d = obterBacklogCorretivoTV_(unit);
  if (!d) { Logger.log('⚠️ Backlog Corretivo (' + unit.name + '): sem dados na BD — slide preservado.'); return; }

  slide.getPageElements().forEach(el => el.remove());
  criarDashboardCorretivasDetalhe(slide, d.pEmergencial, d.pAlta, d.pNormal, d.pBaixa,
    d.topAreas, dataGlobal, unit, d.totalAnterior, d.diasComparacao);
}

// Visual do Orçamento 2027 (Visual.gs, rebrand de 19/10/2026): a fila no
// cartão cheio, as prioridades nos cartões ao lado e, embaixo, as disciplinas
// com mais chamados em barras. Vermelho/verde só na variação da fila.
function criarDashboardCorretivasDetalhe(slide, pEmergencial, pAlta, pNormal, pBaixa, topAreas, dataGlobal, unit, prevBacklog, diasComp) {
  const total = pEmergencial + pAlta + pNormal + pBaixa;
  // prevBacklog vem CALCULADO da base (fila de N dias atrás), não de um
  // retrato guardado no ScriptProperties entre execuções.
  if (prevBacklog == null) prevBacklog = total;
  const v = _tvVariacao_(total - prevBacklog, true);
  const quando = diasComp ? ` em ${diasComp} dias` : '';
  const nomeArea = a => {
    const s = String(a || '').toUpperCase();
    return s.indexOf('PREVENTIVO DE INCÊNDIO') >= 0 ? 'SISTEMA DE INCÊNDIO' : s;
  };
  const maior = topAreas.length ? nomeArea(topAreas[0].area) : null;

  applyBrandHeaderAndBackground(slide, 'Backlog corretivo',
    `${total} na fila · ${v.txt}${quando}` + (maior ? ` · mais chamados: ${maior.toLowerCase()}` : ''), dataGlobal, unit);
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const pct = n => total > 0 ? Math.round(n / total * 100) + '% da fila' : '—';

  const kx = 30, ky = 84, kh = 64, kg = 10, kw = (660 - 3 * kg) / 4;
  _tvKpi_(slide, kx, ky, kw, kh, { rotulo: 'Fila em aberto', valor: total, destaque: true, fsValor: 28,
    sub: v.txt + quando, corSub: v.cor });
  _tvKpi_(slide, kx + (kw + kg), ky, kw, kh, { rotulo: 'Emergencial', valor: pEmergencial, fsValor: 28,
    sub: pct(pEmergencial), corSub: pEmergencial ? c.accentRed : null });
  _tvKpi_(slide, kx + 2 * (kw + kg), ky, kw, kh, { rotulo: 'Alta', valor: pAlta, fsValor: 28,
    sub: pct(pAlta), corSub: pAlta ? c.accentOrange : null });
  _tvKpi_(slide, kx + 3 * (kw + kg), ky, kw, kh, { rotulo: 'Normal + baixa', valor: pNormal + pBaixa, fsValor: 28,
    sub: `normal ${pNormal} · baixa ${pBaixa}` });

  // Disciplinas: uma barra por disciplina, a maior na cor escura da marca
  const px = 30, py = 158, pw = 660, ph = 218;
  const cy = _tvCard_(slide, px, py, pw, ph, 'Disciplinas com mais chamados na fila');
  if (!topAreas.length) {
    _tvTexto_(slide, px, cy + 60, pw, 24, 'Nenhum chamado corretivo em aberto.',
      { fs: 14, fsMin: 10, bold: true, cor: c.accentGreen, fonte: DS.typography.titles, align: 'C' });
  } else {
    const maxVal = Math.max(...topAreas.map(a => a.count), 1);
    const n = topAreas.length;
    const linhaH = Math.min(30, (py + ph - 10 - cy) / n);
    const nomeW = 210, valW = 90, barX = px + 20 + nomeW, barW = pw - 40 - nomeW - valW;
    topAreas.forEach((item, i) => {
      const y = cy + i * linhaH;
      const forte = i === 0;
      _tvTexto_(slide, px + 14, y, nomeW, linhaH, nomeArea(item.area),
        { fs: 9.5, fsMin: 7, bold: true, cor: forte ? c.brandDark : c.textBody, fonte: DS.typography.titles, cortar: true });
      const bh = Math.min(14, linhaH - 10);
      _tvRet_(slide, barX, y + (linhaH - bh) / 2, barW, bh, c.zebra);
      _tvRet_(slide, barX, y + (linhaH - bh) / 2, Math.max(2, item.count / maxVal * barW), bh, forte ? c.brandDark : c.brandTint2);
      _tvTexto_(slide, barX + barW + 4, y, valW, linhaH,
        `${item.count} · ${total > 0 ? Math.round(item.count / total * 100) : 0}%`,
        { fs: 10, fsMin: 8, bold: true, cor: forte ? c.brandDark : c.textBody, fonte: DS.typography.titles, align: 'R' });
    });
  }

  _tvRodape_(slide, 'Fonte: BD-CORRETIVAS (Infraspeak) · fila em aberto na data da atualização' +
                    (diasComp ? `, comparada com ${diasComp} dias atrás` : '') + ' · ▲ vermelho = fila maior');
}
