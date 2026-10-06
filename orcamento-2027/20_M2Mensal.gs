/**
 * ARQUIVO: 20_M2Mensal.gs
 * SLIDE:   Custo por m² mês a mês — no formato do slide do orçamento do ano
 *          passado (pedido do gestor, 06/10/2026): linhas do R$/m² de cada
 *          mês, a tabela dos meses com a média e o custo do condomínio com e
 *          sem IPTU e seguro, com a área.
 *
 * O R$/m² do mês é a despesa da área comum (sem IPTU e seguro) do mês ÷ a
 * área implícita do ano na METRAGEM (total ÷ R$/m² ÷ 12). De onde vem cada
 * série:
 *   Real do ano retrasado → aba "Financeiro <ano>" da planilha dos Megas
 *                           (obterRealMensalAnoRetrasado_; o Despesas-Mensal
 *                           não traz esse ano)
 *   Orç e Ritmo do ano anterior, Orç do ano → Despesas-Mensal. As contas que
 *                           ele não traz (despesa de pessoal…) entram com
 *                           1/12 do valor anual da METRAGEM em cada mês — sem
 *                           isso a média ficaria abaixo do R$/m² da METRAGEM.
 * O gráfico mostra Real, Ritmo e Orç do ano (como o slide de referência); o
 * Orç do ano anterior fica só na tabela.
 */

// Séries do relatório mensal: chave na METRAGEM (rel.v), campo no mensal.
const _ORC_M2_SERIES = [
  { k: 'orcAnt', campo: 'orcAnt' },
  { k: 'ritmo',  campo: 'real' },
  { k: 'orc',    campo: 'orc' }
];

/**
 * @param realAnt  saída de obterRealMensalAnoRetrasado_ (ou null)
 * @return { series: [{ k, nome, meses:number[12] (R$/m²), media, area }] na
 *           ordem real, orcAnt, ritmo, orc; fora: [nomes];
 *           custo: { real, ritmo, orc } com { areaComum, iptu, seguro, total } em R$ e R$/m²;
 *           area: { real, orcAnt, ritmo, orc } }
 */
function _orcM2Mensal_(rel, mensal, realAnt) {
  const a = rel.anos;
  const nomes = { real: 'Real ' + a.real, orcAnt: 'Orç ' + a.orcAnt, ritmo: 'Ritmo ' + a.ritmo, orc: 'Orç ' + a.orc };
  const semAc = [_orcChaveConta_('IPTU'), _orcChaveConta_('Seguro')];
  const fora = rel.contas.filter(c => !mensal.contas[c.chave]);
  const area = {};
  ['real', 'orcAnt', 'ritmo', 'orc'].forEach(k => { area[k] = _orcAreaImplicita_(rel, k); });
  if (!area.orcAnt) area.orcAnt = area.ritmo;
  const serie = (k, reais) => {
    const meses = reais.map(v => area[k] ? v / area[k] : null);
    return { k: k, nome: nomes[k], meses: meses, area: area[k],
             media: area[k] ? meses.reduce((t, v) => t + v, 0) / 12 : null };
  };

  const series = [];
  if (realAnt) series.push(serie('real', realAnt.ac));
  _ORC_M2_SERIES.forEach(s => {
    const reais = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    Object.keys(mensal.contas).forEach(ch => {
      if (semAc.indexOf(ch) >= 0) return;
      mensal.contas[ch][s.campo].forEach((v, i) => { reais[i] += v; });
    });
    const foraMes = fora.reduce((t, c) => t + c.v[s.k], 0) / 12;
    series.push(serie(s.k, reais.map(v => v + foraMes)));
  });

  const custo = {};
  ['real', 'ritmo', 'orc'].forEach(k => {
    const m2 = v => area[k] ? v / area[k] / 12 : null;
    custo[k] = {
      // Área comum e total com o R$/m² escrito na METRAGEM (a área implícita
      // vem dele arredondado: recalcular daria 3,44 onde o relatório diz 3,45).
      areaComum: { v: rel.areaComum[k], m2: (rel.m2AreaComum && rel.m2AreaComum[k]) || m2(rel.areaComum[k]) },
      iptu:      { v: rel.iptu[k],      m2: m2(rel.iptu[k]) },
      seguro:    { v: rel.seguro[k],    m2: m2(rel.seguro[k]) },
      total:     { v: rel.total[k],     m2: (rel.m2Total && rel.m2Total[k]) || m2(rel.total[k]) }
    };
  });
  return { series: series, fora: fora.map(c => c.nome), custo: custo, area: area };
}

function gerarSlideM2Mensal_(slide, W, H, cid, rel, mensal, realAnt) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos, tw = W - MX * 2;
  if (!mensal) {
    _orcHeader_(slide, W, 'Custo por m² mês a mês — Orçamento ' + a.orc, cid.nome + ' · R$/m²');
    _orcParagrafo_(slide, MX, 120, tw, 40, 'Sem o relatório Despesas-Mensal ' + a.ritmo + ' x ' + a.orc +
      ' não há o mês a mês desta cidade.', { fs: 10, cor: C.textMuted, align: 'C' });
    return;
  }
  const d = _orcM2Mensal_(rel, mensal, realAnt);
  const S = {};
  d.series.forEach(s => { S[s.k] = s; });

  // Subtítulo = a mensagem: o R$/m² do Orç contra o ritmo e contra o real.
  const contra = (base, nome) => base && base.media ? ' · ' + _orcVariacao_(base.media, S.orc.media, 0.005).texto + ' × ' + nome : '';
  _orcHeader_(slide, W, 'Custo por m² mês a mês — Orçamento ' + a.orc,
    'Área comum (sem IPTU e seguro) · Orç ' + a.orc + ' R$ ' + _orcM2_(S.orc.media) + '/m²' +
    contra(S.ritmo, 'Ritmo ' + a.ritmo) + contra(S.real, 'Real ' + a.real) + ' · ' + cid.nome);

  const COR = { real: '#94A3B8', ritmo: _ORC_COR_VAR.sobe, orc: C.brandLight };
  const noGrafico = d.series.filter(s => COR[s.k]);
  const tracejada = s => s.k === 'real';
  const peso = s => s.k === 'orc' ? 2.25 : 1.5;

  // ---- Gráfico de linhas ----
  const cy = 70, ch = 126, labW = 76, mediaW = 52, colW = (tw - labW - mediaW) / 12;
  _orcCard_(slide, MX, cy, tw, ch, null);
  const vals = [];
  noGrafico.forEach(s => s.meses.forEach(v => { if (v !== null) vals.push(v); }));
  const vMin = Math.min.apply(null, vals), vMax = Math.max.apply(null, vals);
  const folgaV = Math.max(0.05, (vMax - vMin) * 0.12);
  const lo = vMin - folgaV, hi = vMax + folgaV;
  const pTop = cy + 34, pBase = cy + ch - 8;
  const y = v => pBase - (pBase - pTop) * (v - lo) / (hi - lo);
  const xMes = i => MX + labW + colW * (i + 0.5);       // alinhado com as colunas da tabela

  // Legenda centralizada no topo do card.
  const fsL = 7, larg = noGrafico.map(s => 22 + _orcLarguraTexto_(s.nome, fsL, DS.typography.body));
  let lx = MX + (tw - larg.reduce((t, w) => t + w, 0) - 16 * (larg.length - 1)) / 2;
  noGrafico.forEach((s, k) => {
    const l = _orcLinha_(slide, lx, cy + 13, lx + 14, cy + 13, COR[s.k], peso(s));
    if (tracejada(s)) l.setDashStyle(SlidesApp.DashStyle.DASH);
    _orcUmaLinha_(slide, lx + 18 - _ORC_RECUO_TEXTBOX / 2, cy + 6, larg[k] - 18 + _ORC_RECUO_TEXTBOX, 14, s.nome,
      { align: 'L', fs: fsL, fsMin: fsL, cor: C.textBody, fonte: DS.typography.body, folga: 12 });
    lx += larg[k] + 16;
  });

  // Média do Orç: linha pontilhada, com o valor na faixa da coluna MÉDIA.
  const yMed = y(S.orc.media);
  _orcLinha_(slide, xMes(0), yMed, xMes(11) + colW / 2, yMed, C.brandSoft, 0.75).setDashStyle(SlidesApp.DashStyle.DOT);
  _orcUmaLinha_(slide, MX + labW + 12 * colW, yMed - 6, mediaW, 12, 'média ' + _orcM2_(S.orc.media),
    { align: 'C', fs: 6.5, bold: true, cor: C.brandLight, fonte: DS.typography.titles, folga: 6, fsMin: 5.5 });

  // Linhas: o Orç do ano por último (por cima), com ponto e valor de cada mês.
  noGrafico.forEach(s => {
    for (let i = 0; i < 11; i++) {
      if (s.meses[i] === null || s.meses[i + 1] === null) continue;
      const l = _orcLinha_(slide, xMes(i), y(s.meses[i]), xMes(i + 1), y(s.meses[i + 1]), COR[s.k], peso(s));
      if (tracejada(s)) l.setDashStyle(SlidesApp.DashStyle.DASH);
    }
  });
  S.orc.meses.forEach((v, i) => {
    if (v === null) return;
    _orcRet_(slide, xMes(i) - 2.5, y(v) - 2.5, 5, 5, C.brandLight, { redondo: true });
    _orcUmaLinha_(slide, xMes(i) - colW / 2, y(v) - 15, colW, 11, _orcM2_(v),
      { align: 'C', fs: 6.5, bold: true, cor: C.brandDark, fonte: DS.typography.titles, folga: 6, fsMin: 6 });
  });

  // ---- Tabela dos meses (as colunas ficam embaixo dos pontos do gráfico) ----
  const colunas = [{ titulo: 'R$/M²', w: labW }].concat(ORC_MESES.map(m => ({ titulo: m, w: colW })))
    .concat([{ titulo: 'MÉDIA', w: mediaW, destaque: true }]);
  const linhas = d.series.map(s => ({ tipo: s.k === 'orc' ? 'subtotal' : 'item', nome: s.nome,
    celulas: s.meses.map(v => ({ texto: _orcM2_(v) })).concat([{ texto: _orcM2_(s.media), bold: true }]) }));
  const ty = cy + ch + 4;
  const yFim = _orcTabelaNum_(slide, MX, ty, tw, 16 + 12 * linhas.length, colunas, linhas, null);

  // ---- Custo do condomínio: R$ e R$/m² por ano, com a área ----
  const anos = ['real', 'ritmo', 'orc'];
  const lab = 150, dW = 58, nW = (tw - lab - dW) / 6;
  const linhaCusto = (nome, chave, tipo) => {
    const cel = [];
    anos.forEach(k => {
      const ult = k === 'orc';
      cel.push({ texto: _orcMoeda_(d.custo[k][chave].v), bold: ult }, { texto: _orcM2_(d.custo[k][chave].m2), bold: ult });
    });
    const v = _orcVariacao_(d.custo.ritmo[chave].m2, d.custo.orc[chave].m2, 0.005);
    cel.push({ texto: v.texto, sentido: v.sentido });
    return { tipo: tipo || 'item', nome: nome, celulas: cel };
  };
  const vArea = d.area.ritmo && d.area.orc ? d.area.orc / d.area.ritmo - 1 : null;
  const m2Txt = v => v ? _orcMilhar_(Math.round(v)) + ' m²' : '–';
  const linhaArea = { tipo: 'item', nome: 'Área (m², implícita)', celulas: [
    { texto: m2Txt(d.area.real) }, null, { texto: m2Txt(d.area.ritmo) }, null, { texto: m2Txt(d.area.orc), bold: true }, null,
    { texto: vArea === null ? '–' : (vArea >= 0 ? '+' : '−') + _orcPct_(Math.abs(vArea)) }] };
  const by = yFim + 8;
  _orcTabelaNum_(slide, MX, by, tw, H - 26 - by, [
    { titulo: 'CUSTO CONDOMÍNIO', w: lab },
    { titulo: 'R$', w: nW }, { titulo: 'R$/M²', w: nW }, { titulo: 'R$', w: nW }, { titulo: 'R$/M²', w: nW },
    { titulo: 'R$', w: nW, destaque: true }, { titulo: 'R$/M²', w: nW, destaque: true }, { titulo: 'Δ R$/M²', w: dW }
  ], [
    linhaCusto('Área comum (sem IPTU e seguro)', 'areaComum', 'subtotal'),
    linhaCusto('IPTU', 'iptu'),
    linhaCusto('Seguro', 'seguro'),
    linhaCusto('Total de despesas', 'total', 'total'),
    linhaArea
  ], [{ titulo: 'REAL ' + a.real, c0: 1, n: 2 }, { titulo: 'RITMO ' + a.ritmo, c0: 3, n: 2 },
      { titulo: 'ORÇ ' + a.orc, c0: 5, n: 2 }, { titulo: '× RITMO', c0: 7, n: 1, cor: '#475569' }]);

  const fora = !d.fora.length ? '' : ' · sem abertura mensal (1/12 por mês): ' + d.fora[0].toLowerCase() +
    (d.fora.length > 1 ? ' e mais ' + (d.fora.length - 1) + (d.fora.length > 2 ? ' contas' : ' conta') : '');
  _orcRodape_(slide, W, H, 'Fontes: METRAGEM-COND, Despesas-Mensal' + (S.real ? ' e Financeiro ' + a.real + ' (planilha dos Megas)' : '') +
    ' · área implícita = total ÷ R$/m² ÷ 12' + fora + ' · ' + cid.nome);
}
