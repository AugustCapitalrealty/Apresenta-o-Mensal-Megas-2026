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
  const cx = MX, cy = 76, cw = W - MX * 2, ch = H - cy - 28 - 76;
  _orcCard_(slide, cx, cy, cw, ch, 'Orçamento por mês');

  // Legenda da linha de média, no canto do card.
  const lgW = area ? 210 : 150;
  const lg = _orcLinha_(slide, cx + cw - 12 - lgW, cy + 14, cx + cw - 12 - lgW + 18, cy + 14, DS.colors.accentOrange, 1.25);
  lg.setDashStyle(SlidesApp.DashStyle.DASH);
  _orcUmaLinha_(slide, cx + cw - 12 - lgW + 22, cy + 6, lgW - 22, 16, 'média mensal ' + _orcCompacto_(media) +
    (area ? ' · ' + m2(media) : ''),
    { align: 'L', fs: 7, cor: DS.colors.textBody, fonte: DS.typography.body });

  const px = cx + 16, pw = cw - 32;
  const pTop = cy + (area ? 50 : 40), base = cy + ch - 24, ph = base - pTop;
  const max = Math.max.apply(null, dados.meses.concat([media])) || 1;
  const colW = pw / 12, barW = colW * 0.56;
  let iPico = 0;
  dados.meses.forEach((v, i) => { if (v > dados.meses[iPico]) iPico = i; });

  _orcLinha_(slide, px, base, px + pw, base, DS.colors.lines, 1);
  dados.meses.forEach((v, i) => {
    const x = px + i * colW;
    if (v > 0.005) {
      const h = Math.max(1.5, ph * v / max);
      _orcRet_(slide, x + (colW - barW) / 2, base - h, barW, h, i === iPico ? DS.colors.brandDark : DS.colors.brandLight);
      // Valor em R$ e, embaixo dele, o R$/m² do mês (menor, cinza).
      const dy = area ? 11 : 0;
      _orcUmaLinha_(slide, x, base - h - 15 - dy, colW, 13, _orcCompacto_(v).replace('R$ ', ''),
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
  const yMedia = base - ph * media / max;
  _orcLinha_(slide, px, yMedia, px + pw, yMedia, DS.colors.accentOrange, 1).setDashStyle(SlidesApp.DashStyle.DASH);

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
