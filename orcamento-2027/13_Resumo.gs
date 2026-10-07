/**
 * ARQUIVO: 13_Resumo.gs
 * SLIDE:   Visão geral da manutenção — KPIs, ranking por categoria e os
 *          maiores itens do ano.
 */

// Rodapé de fonte da seção de manutenção (resumo e mensal).
function _orcFonteManutencao_(cid, dados) {
  return 'Fonte: 090-Despesas-Gerais — ' + cid.nome + ' — ' + ORC_ANO + ', aba "' + ORC_ABA_MODELO +
    '", conta Manutenção de Imóveis' + (dados.nContratos ? ' + planilha de contratos de manutenção (' +
    dados.nContratos + ' contratos)' : '');
}

// area: área implícita do Orç; com ela, um card a mais com o R$/m² ao mês.
function gerarSlideResumo_(slide, W, H, cid, dados, area) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  const cats = dados.categorias;

  _orcHeader_(slide, W, 'Manutenção de Imóveis — Orçamento ' + ORC_ANO,
    cid.nome + ' · ' + dados.nItens + ' itens em ' + cats.length + ' categorias' +
    (dados.nContratos ? ' · contratos ' + _orcCompacto_(dados.totalContratos) + ' + avulsos ' +
                        _orcCompacto_(dados.total - dados.totalContratos) : ''));

  // ---- KPIs ----
  let iPico = 0;
  dados.meses.forEach((v, i) => { if (v > dados.meses[iPico]) iPico = i; });
  const kpis = [
    ['Orçamento anual', _orcMoeda_(dados.total)],
    ['Média mensal', _orcMoeda_(dados.total / 12)],
    ['Mês de maior gasto', ORC_MESES[iPico] + ' · ' + _orcCompacto_(dados.meses[iPico])],
    // O percentual vai no rótulo: "ESTRUTURA METÁLICA · 18%" não cabia no card.
    [cats.length ? 'Maior categoria · ' + _orcPct_(cats[0].pct) : 'Maior categoria', cats.length ? cats[0].nome : '—']
  ];
  if (area) kpis.splice(2, 0, ['R$/m² ao mês', 'R$ ' + _orcM2_(dados.total / area / 12)]);
  const ky = 76, kh = 54, gap = 10;
  const kw = (W - MX * 2 - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, i) => {
    const x = MX + i * (kw + gap);
    _orcCard_(slide, x, ky, kw, kh, k[0]);
    _orcUmaLinha_(slide, x + 12, ky + 22, kw - 24, 26, k[1],
      { align: 'L', fs: 16, bold: true, cor: DS.colors.brandDark, fonte: DS.typography.titles, fsMin: 7, cortar: true });
  });

  // ---- Corpo ----
  const by = ky + kh + gap, bh = H - 28 - by;
  const lw = Math.round((W - MX * 2 - gap) * 0.58);
  const rx = MX + lw + gap, rw = W - MX - rx;

  // Ranking por categoria em barra combinada — contratos + avulsos, como o
  // gestor pediu ("PPCI 150k contratos + 152k avulsos"). As 8 maiores e, se
  // houver mais, "Demais" somadas.
  _orcCard_(slide, MX, by, lw, bh, 'Orçamento por categoria');
  const COR_CONTR = DS.colors.brandDark, COR_AVULSO = DS.colors.brandLight;
  [['Avulsos', COR_AVULSO], ['Contratos', COR_CONTR]].forEach((l, k) => {
    const lx = MX + lw - 12 - (k + 1) * 64;
    _orcRet_(slide, lx, by + 10, 7, 7, l[1]);
    _orcUmaLinha_(slide, lx + 9, by + 6, 52, 14, l[0],
      { align: 'L', fs: 6.5, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 4 });
  });
  let linhas = cats.slice();
  if (cats.length > 9) {
    const resto = cats.slice(8);
    const soma = campo => resto.reduce((a, c) => a + c[campo], 0);
    linhas = cats.slice(0, 8).concat([{
      nome: 'DEMAIS (' + resto.length + ')', total: soma('total'), pct: soma('pct'),
      totalContratos: soma('totalContratos'), totalAvulsos: soma('totalAvulsos'), demais: true
    }]);
  }
  const ly = by + 26, lh = bh - 34;
  const rowH = linhas.length ? Math.min(28, lh / linhas.length) : lh;
  const maxT = linhas.reduce((a, c) => Math.max(a, c.total), 0) || 1;
  const labW = 124, valW = 116;
  const bx0 = MX + 12 + labW + 6, bMax = lw - 12 - labW - 6 - valW - 10;
  const mil = v => String(Math.round(v / 1000));
  linhas.forEach((c, i) => {
    const y = ly + i * rowH;
    _orcUmaLinha_(slide, MX + 12, y, labW, rowH, c.nome,
      { align: 'L', fs: 8, bold: true, cor: c.demais ? DS.colors.textBody : DS.colors.textMain,
        fonte: DS.typography.titles, fsMin: 6.5, cortar: true });
    const bh2 = Math.min(12, rowH * 0.5), byy = y + (rowH - bh2) / 2;
    const wC = bMax * c.totalContratos / maxT, wA = bMax * c.totalAvulsos / maxT;
    if (wC > 0.5) _orcRet_(slide, bx0, byy, wC, bh2, c.demais ? '#64748B' : COR_CONTR);
    if (wA > 0.5) _orcRet_(slide, bx0 + wC, byy, wA, bh2, c.demais ? DS.colors.textMuted : COR_AVULSO);
    const temContr = c.totalContratos > 0.5;
    _orcUmaLinha_(slide, MX + lw - 12 - valW, y + (temContr ? 1 : 0), valW, temContr ? rowH * 0.55 : rowH,
      _orcCompacto_(c.total) + ' · ' + _orcPct_(c.pct),
      { align: 'R', fs: 8, bold: true, cor: DS.colors.textMain, fonte: DS.typography.body, fsMin: 8, cortar: true });
    if (temContr) {
      _orcUmaLinha_(slide, MX + lw - 12 - valW, y + rowH * 0.5, valW, rowH * 0.45,
        mil(c.totalContratos) + ' contr. + ' + mil(c.totalAvulsos) + ' avulsos (mil)',
        { align: 'R', fs: 6.5, cor: DS.colors.textBody, fonte: DS.typography.body, fsMin: 6.5, cortar: true });
    }
  });

  // Maiores itens do ano, de qualquer categoria.
  _orcCard_(slide, rx, by, rw, bh, 'Maiores itens do ano');
  const top = _orcTodosItens_(dados).slice(0, 6);
  const iy = by + 26, ih = (bh - 34) / Math.max(1, top.length);
  const vW = 72;
  top.forEach((it, i) => {
    const y = iy + i * ih;
    if (i > 0) _orcLinha_(slide, rx + 12, y, rx + rw - 12, y, DS.colors.lines, 0.5);
    _orcUmaLinha_(slide, rx + 12, y + 3, rw - 24 - vW, 12, it.categoria,
      { align: 'L', fs: 6.5, bold: true, cor: DS.colors.brandLight, fonte: DS.typography.titles, cortar: true });
    _orcUmaLinha_(slide, rx + 12, y + 14, rw - 24 - vW, Math.max(12, ih - 16), it.descricao,
      { align: 'L', fs: 8, cor: DS.colors.textMain, fonte: DS.typography.body, fsMin: 8, cortar: true, aba: 'Maiores itens' });
    _orcUmaLinha_(slide, rx + rw - 12 - vW, y, vW, ih, _orcCompacto_(it.total),
      { align: 'R', fs: 9, bold: true, cor: DS.colors.brandDark, fonte: DS.typography.titles, fsMin: 9, cortar: true });
  });

  _orcRodape_(slide, W, H, _orcFonteManutencao_(cid, dados));
}
