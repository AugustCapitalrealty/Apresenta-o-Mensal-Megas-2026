/**
 * ARQUIVO: 14_Mensal.gs
 * SLIDE:   Distribuição mensal — previsão de entrega do orçamento de
 *          manutenção, e o item que puxa cada um dos três meses mais pesados.
 *          O mês do modelo é o da ENTREGA do serviço, não o do pagamento.
 */

// area: área implícita do Orç. Com ela cada mês mostra também o R$/m² — o
// diretor lê em dinheiro e em m² (06/10/2026).
function gerarSlideMensal_(slide, W, H, cid, dados, area) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  const media = dados.total / 12;
  const m2 = v => area ? 'R$ ' + _orcM2_(v / area) + '/m²' : '';

  _orcHeader_(slide, W, 'Distribuição mensal',
    'Previsão de entrega do orçamento de manutenção · ' + cid.nome + ' · média de ' + _orcCompacto_(media) + ' por mês' +
    (area ? ' (' + m2(media) + ')' : ''));

  // ---- Gráfico de colunas ----
  // Cada barra separa os contratos (a base, quase igual todo mês) dos avulsos
  // (o que faz os picos) — rascunho aprovado em 07/10/2026. A média está no
  // subtítulo; a linha dela saiu.
  const C = DS.colors;
  const cx = MX, cy = 76, cw = W - MX * 2, ch = H - cy - 28 - 76;
  _orcCard_(slide, cx, cy, cw, ch, 'Orçamento por mês · R$ mil');
  const contr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  dados.categorias.forEach(c => c.itens.forEach(it => { if (it.contrato) it.meses.forEach((v, i) => { contr[i] += v; }); }));
  const tc = contr.reduce((t, v) => t + v, 0), ta = dados.total - tc;
  const comContr = tc > 0.5;
  const cMes = contr.filter(v => v > 0.5);
  const plano = comContr && cMes.length === 12 && Math.max.apply(null, cMes) / Math.min.apply(null, cMes) < 1.15;
  if (comContr) {
    const pct = v => Math.round(dados.total ? v / dados.total * 100 : 0) + '%';
    _orcUmaLinha_(slide, cx + 12, cy + 19, cw - 160, 12,
      'Contratos ' + _orcCompacto_(tc) + ' no ano (' + pct(tc) + ')' + (plano ? ', quase o mesmo valor todo mês' : '') +
      ' · avulsos ' + _orcCompacto_(ta) + ' (' + pct(ta) + ')' + (plano ? ' fazem os picos' : ''),
      { align: 'L', fs: 7, fsMin: 6, cor: C.textBody, fonte: DS.typography.body, cortar: true });
    // Legenda no canto do card.
    [['Contratos', C.brandDark], ['Avulsos', C.brandLight]].forEach((l, k) => {
      const lx = cx + cw - 118 + k * 56;
      _orcRet_(slide, lx, cy + 10, 8, 7, l[1]);
      _orcUmaLinha_(slide, lx + 11, cy + 7, 44, 13, l[0], { align: 'L', fs: 7, cor: C.textBody, fonte: DS.typography.body, folga: 4 });
    });
  }

  // Contratos planos: o rótulo "base de contratos" à direita das barras.
  const px = cx + 16, pw = cw - 32 - (plano ? 44 : 0);
  const pTop = cy + (area ? 56 : 46), base = cy + ch - 24, ph = base - pTop;
  const max = Math.max.apply(null, dados.meses) || 1;
  const colW = pw / 12, barW = colW * 0.6;
  let iPico = 0;
  dados.meses.forEach((v, i) => { if (v > dados.meses[iPico]) iPico = i; });
  const corPico = _orcMisturarCor_(C.brandLight, '#000000', 0.2);

  _orcLinha_(slide, px, base, px + pw, base, C.lines, 1);
  dados.meses.forEach((v, i) => {
    const x = px + i * colW;
    if (v > 0.005) {
      const h = Math.max(1.5, ph * v / max);
      const bx = x + (colW - barW) / 2;
      if (comContr) {
        const hc = Math.min(h, ph * contr[i] / max);
        if (h - hc > 0.3) _orcRet_(slide, bx, base - h, barW, h - hc, i === iPico ? corPico : C.brandLight);
        if (hc > 0.3) _orcRet_(slide, bx, base - hc, barW, hc, C.brandDark);
      } else {
        _orcRet_(slide, bx, base - h, barW, h, i === iPico ? C.brandDark : C.brandLight);
      }
      // Valor em R$ e, embaixo dele, o R$/m² do mês (menor, cinza).
      const dy = area ? 11 : 0;
      // Em R$ mil (unidade no rótulo do card).
      _orcUmaLinha_(slide, x, base - h - 15 - dy, colW, 13, v < 9950 ? (v / 1000).toFixed(1).replace('.', ',') : _orcMilhar_(Math.round(v / 1000)),
        { align: 'C', fs: 7, bold: i === iPico, cor: DS.colors.textMain, fonte: DS.typography.body, fsMin: 5.5 });
      if (area) {
        _orcUmaLinha_(slide, x, base - h - 15, colW, 12, _orcM2_(v / area) + '/m²',
          { align: 'C', fs: 6, cor: DS.colors.textBody, fonte: DS.typography.body, fsMin: 5, folga: 6 });
      }
    } else {
      _orcUmaLinha_(slide, x, base - 15, colW, 13, '—', { align: 'C', fs: 7, cor: DS.colors.textMuted });
    }
    _orcUmaLinha_(slide, x, base + 3, colW, 14, ORC_MESES[i],
      { align: 'C', fs: 7.5, bold: i === iPico, cor: DS.colors.textBody, fonte: DS.typography.titles });
  });
  if (plano) {
    const yb = base - ph * (tc / 12) / max;
    _orcParagrafo_(slide, px + pw + 2, yb - 13, 46, 26, 'base de contratos ~' + _orcCompacto_(tc / 12),
      { fs: 6, fsMin: 5.5, bold: true, cor: C.brandDark, espac: 100 });
  }

  // ---- Os três meses mais pesados e o item que puxa cada um ----
  const itens = _orcTodosItens_(dados);
  const picos = dados.meses.map((v, i) => ({ i: i, v: v })).filter(m => m.v > 0.005)
    .sort((a, b) => b.v - a.v).slice(0, 3);
  const hy = cy + ch + 8, hh = H - 28 - hy, gap = 10;
  const hw = (cw - gap * 2) / 3;
  picos.forEach((m, k) => {
    const x = cx + k * (hw + gap);
    let driver = null;
    itens.forEach(it => { if (!driver || it.meses[m.i] > driver.meses[m.i]) driver = it; });
    _orcRet_(slide, x, hy, hw, hh, DS.colors.cardBg, { redondo: true, borda: DS.colors.lines });
    _orcRet_(slide, x, hy, 4, hh, k === 0 ? DS.colors.brandDark : DS.colors.brandLight);
    _orcUmaLinha_(slide, x + 12, hy + 5, hw - 24, 18, ORC_MESES[m.i] + ' · ' + _orcCompacto_(m.v) +
      (area ? ' · ' + m2(m.v) : ''),
      { align: 'L', fs: 11, bold: true, cor: DS.colors.brandDark, fonte: DS.typography.titles, fsMin: 8 });
    if (driver) {
      _orcParagrafo_(slide, x + 12, hy + 23, hw - 20, hh - 27,
        'Principal: [' + driver.categoria + '] ' + _orcTextoEscolhido_('Maiores itens', driver.descricao) + ' — ' + _orcCompacto_(driver.meses[m.i]),
        { fs: 7.5, fsMin: 6, cor: DS.colors.textBody });
    }
  });

  _orcRodape_(slide, W, H, _orcFonteManutencao_(cid, dados));
}
