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
 * Orç do ano anterior fica só na tabela. Desenho de 07/10/2026: painel com as
 * duas comparações à esquerda, ritmo tracejado na projeção, nome no fim de
 * cada linha (_orcGraficoM2_, _orcPainelM2_).
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

  // A mensagem nas duas faces (avaliação da analista, 07/10/2026): o Orç
  // contra o ritmo do ano inteiro e contra a SAÍDA do ano anterior (out–dez,
  // em geral ainda projeção). Só o recorte de 3 meses enganaria.
  const m = _orcM2Mensagem_(S);
  const mas = m.saida && m.vAno.sentido && m.vSaida.sentido && m.vAno.sentido !== m.vSaida.sentido;
  _orcHeader_(slide, W, 'Custo por m² mês a mês — Orçamento ' + a.orc,
    'Área comum (sem IPTU e seguro) · Orç ' + a.orc + ' R$ ' + _orcM2_(S.orc.media) + '/m²' +
    (m.vAno ? ' · ' + m.vAno.texto + ' × Ritmo ' + a.ritmo : '') +
    (m.saida ? (mas ? ', mas ' : ' · ') + m.vSaida.texto + ' × a saída de ' + a.ritmo + ' (out–dez)' : '') + ' · ' + cid.nome);

  const cy = 70, ch = 126, labW = 76, mediaW = 52, colW = (tw - labW - mediaW) / 12;
  _orcCard_(slide, MX, cy, tw, ch, null);
  _orcGraficoM2_(slide, S, a, { x0: MX + labW, colW: colW, top: cy + 14, base: cy + ch - 20, rotY: cy + ch - 17 });
  _orcPainelM2_(slide, MX + 6, cy + 6, labW - 8, S, a, m);

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
      { titulo: 'ORÇ ' + a.orc, c0: 5, n: 2 }, { titulo: '× RITMO', c0: 7, n: 1, cor: C.brandDark }]);

  const fora = !d.fora.length ? '' : ' · 1/12 por mês: ' + d.fora[0].toLowerCase() +
    (d.fora.length > 1 ? ' e mais ' + (d.fora.length - 1) : '');
  // Curto para caber numa linha (o nome do Mega já está no subtítulo).
  _orcRodape_(slide, W, H, 'Fontes: METRAGEM-COND, Despesas-Mensal' + (S.real ? ', Financeiro ' + a.real : '') +
    ' · área implícita = total ÷ R$/m² ÷ 12' + fora + ' · ritmo ' + a.ritmo + ' fechado até ' +
    ORC_MESES[ORC_RITMO_ULTIMO_MES_FECHADO - 1].toLowerCase());
}

// ==========================================
// GRÁFICO E PAINEL (desenho aprovado em 07/10/2026 — rascunho
// ferramentas/rascunhos/grafico_m2_rascunho_v2.py)
// ==========================================
// As duas comparações do Orç: contra o ritmo do ano e contra a saída do ano
// anterior (média de out–dez). A saída só entra quando difere do ano em 5% ou
// mais — senão repete a primeira. degrau: saída 15%+ acima de jan–set.
function _orcM2Mensagem_(S) {
  const r = S.ritmo, o = S.orc;
  if (!r || !r.media || !o || !o.media) return { vAno: null, saida: null };
  const media = arr => { const v = arr.filter(x => x !== null); return v.length ? v.reduce((t, x) => t + x, 0) / v.length : null; };
  const saida = media(r.meses.slice(9)), antes = media(r.meses.slice(0, 9));
  const fech = ORC_RITMO_ULTIMO_MES_FECHADO;
  const m = { vAno: _orcVariacao_(r.media, o.media, 0.005), saida: null };
  if (saida && Math.abs(saida / r.media - 1) >= 0.05) {
    m.saida = saida;
    m.vSaida = _orcVariacao_(saida, o.media, 0.005);
    m.projecao = fech < 12 ? (fech <= 9 ? 'é projeção' : 'inclui projeção') : '';
    m.degrau = !!antes && saida / antes - 1 >= 0.15;
  }
  return m;
}

function _orcCorSentido_(sentido) {
  return sentido > 0 ? _ORC_COR_VAR.sobe : (sentido < 0 ? _ORC_COR_VAR.desce : CR_DESIGN_SYSTEM.colors.textBody);
}

// Bolinha branca com anel (marcador das linhas).
function _orcBolinha_(slide, cx, cy, r, cor, peso) {
  const s = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - r, cy - r, r * 2, r * 2);
  s.getFill().setSolidFill('#FFFFFF');
  s.getBorder().getLineFill().setSolidFill(cor);
  s.getBorder().setWeight(peso);
  return s;
}

/**
 * Linhas do R$/m² mês a mês: Real (tracejado, contexto), Ritmo (contínuo até
 * o último mês fechado, tracejado na projeção, com a faixa "projeção") e o Orç
 * do ano por cima, com o valor de cada mês. Sem legenda: o nome de cada linha
 * vai no fim dela, na faixa da coluna MÉDIA. Grade leve com a escala. O
 * rótulo de valor desce quando outra linha passa logo acima no mesmo mês.
 * @param g { x0, colW, top, base, rotY } — x0 = início da coluna JAN
 */
function _orcGraficoM2_(slide, S, a, g) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  const COR = { real: '#A7AEAC', ritmo: C.brandDark, orc: C.brandLight };
  const PESO = { real: 1.1, ritmo: 1.5, orc: 2.4 };
  const ser = ['real', 'ritmo', 'orc'].filter(k => S[k]).map(k => S[k]);
  const xMes = i => g.x0 + g.colW * (i + 0.5), xb = g.x0 + 12 * g.colW;
  const fech = ORC_RITMO_ULTIMO_MES_FECHADO;

  const vals = [];
  ser.forEach(s => s.meses.forEach(v => { if (v !== null) vals.push(v); }));
  const vMin = Math.min.apply(null, vals), vMax = Math.max.apply(null, vals);
  const folgaV = Math.max(0.05, (vMax - vMin) * 0.06);
  const lo = vMin - folgaV, hi = vMax + folgaV;
  const pTop = g.top + 12, pBase = g.base - 4;
  const y = v => pBase - (pBase - pTop) * (v - lo) / (hi - lo);

  // Faixa da projeção do ritmo (só na altura do gráfico).
  if (S.ritmo && fech < 12) {
    const bx = g.x0 + fech * g.colW;
    _orcRet_(slide, bx, g.top, xb - bx, g.base - g.top, C.brandTint);
    _orcUmaLinha_(slide, bx, g.rotY, xb - bx, 11,
      (fech === 11 ? 'dez ' : ORC_MESES[fech].toLowerCase() + '–dez ') + a.ritmo + ' = projeção do ritmo',
      { align: 'C', fs: 6.5, bold: true, cor: C.brandDark, fonte: DS.typography.body, fsMin: 5.5, folga: 6 });
  }

  // Grade: passo "redondo" com até 4 linhas.
  const passo = [0.1, 0.2, 0.25, 0.5, 1, 2, 5].filter(p => (hi - lo) / p <= 4.5)[0] || 5;
  for (let k = Math.ceil(lo / passo); k * passo <= hi; k++) {
    const v = k * passo;
    if (y(v) < pTop - 2) continue;
    _orcLinha_(slide, g.x0, y(v), xb, y(v), C.lines, 0.5);
    // O número da escala sai quando bateria no valor de JAN do Orç.
    // (caixa da escala: y-9…y-1; rótulo de JAN: yJan-14,5…yJan-3,5)
    if (S.orc.meses[0] !== null && Math.abs(y(v) + 4 - y(S.orc.meses[0])) < 9.5) continue;
    _orcUmaLinha_(slide, g.x0 + 1, y(v) - 9, 24, 8, _orcM2_(v),
      { align: 'L', fs: 6, fsMin: 6, cor: C.textBody, fonte: DS.typography.body, folga: 0 });
  }

  // Linhas: contexto atrás, Orç por cima.
  ser.forEach(s => {
    for (let i = 0; i < 11; i++) {
      if (s.meses[i] === null || s.meses[i + 1] === null) continue;
      const l = _orcLinha_(slide, xMes(i), y(s.meses[i]), xMes(i + 1), y(s.meses[i + 1]), COR[s.k], PESO[s.k]);
      if (s.k === 'real' || (s.k === 'ritmo' && i + 1 >= fech)) l.setDashStyle(SlidesApp.DashStyle.DASH);
    }
  });

  // Valor em cima do ponto, ou embaixo quando outra linha passa logo acima
  // (até 12 pt) e nada logo abaixo.
  const rotulo = (s, i, v, fs, cor) => {
    const perto = lado => ser.some(o => o !== s && o.meses[i] !== null &&
      lado * (y(v) - y(o.meses[i])) > 0 && Math.abs(y(v) - y(o.meses[i])) <= 12);
    const baixo = perto(1) && !perto(-1);
    _orcUmaLinha_(slide, xMes(i) - g.colW / 2, baixo ? y(v) + 3.5 : y(v) - 14.5, g.colW, 11, _orcM2_(v),
      { align: 'C', fs: fs, fsMin: fs, bold: true, cor: cor, fonte: DS.typography.titles, folga: 6 });
  };
  if (S.ritmo && fech < 12) {
    S.ritmo.meses.forEach((v, i) => {
      if (i < fech || v === null) return;
      _orcBolinha_(slide, xMes(i), y(v), 1.8, C.brandDark, 1);
      rotulo(S.ritmo, i, v, 6.5, C.brandDark);
    });
  }
  S.orc.meses.forEach((v, i) => {
    if (v === null) return;
    _orcBolinha_(slide, xMes(i), y(v), 2.7, C.brandLight, 1.4);
    rotulo(S.orc, i, v, 7, C.textMain);
  });

  // Nome de cada linha no fim dela (no lugar da legenda), 9 pt entre eles.
  const ultimo = s => { for (let i = 11; i >= 0; i--) if (s.meses[i] !== null) return s.meses[i]; return null; };
  const nomes = ser.filter(s => ultimo(s) !== null).map(s => ({ s: s, y: y(ultimo(s)) })).sort((p, q) => p.y - q.y);
  let yAnt = -1e9;
  nomes.forEach(n => {
    const yy = Math.max(n.y, yAnt + 9); yAnt = yy;
    const l = _orcLinha_(slide, xb + 4, yy, xb + 11, yy, COR[n.s.k], Math.min(PESO[n.s.k], 2));
    if (n.s.k === 'real') l.setDashStyle(SlidesApp.DashStyle.DASH);
    _orcUmaLinha_(slide, xb + 13, yy - 5.5, 40, 11, n.s.nome,
      { align: 'L', fs: 6.5, fsMin: 5.5, bold: true, cor: n.s.k === 'ritmo' ? C.brandDark : (n.s.k === 'orc' ? C.textMain : C.textBody),
        fonte: DS.typography.body, folga: 4 });
  });
}

// Painel da esquerda: os números que sustentam a mensagem.
function _orcPainelM2_(slide, x, y, w, S, a, m) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  const txt = (yy, h, t, op) => _orcUmaLinha_(slide, x, yy, w, h, t,
    Object.assign({ align: 'L', fsMin: 5.5, fonte: DS.typography.body, cor: C.textBody, folga: 4 }, op));
  txt(y, 9, 'ORÇ ' + a.orc + ' · MÉDIA', { fs: 5.6, bold: true, fonte: DS.typography.titles });
  txt(y + 8, 16, 'R$ ' + _orcM2_(S.orc.media) + '/m²', { fs: 10, fsMin: 8, bold: true, cor: C.brandDark, fonte: DS.typography.titles });
  let yy = y + 27;
  const bloco = (l1, l2, v) => {
    _orcLinha_(slide, x + 2, yy, x + w - 4, yy, C.lines, 0.6);
    txt(yy + 2, 9, l1, { fs: 6.5 });
    if (l2) { yy += 8; txt(yy + 2, 9, l2, { fs: 6.5 }); }
    txt(yy + 10, 13, v.texto, { fs: 9, bold: true, cor: _orcCorSentido_(v.sentido) });
    yy += 26;
  };
  if (m.vAno) bloco('× ritmo ' + a.ritmo + ' (' + _orcM2_(S.ritmo.media) + ')', null, m.vAno);
  if (m.saida) bloco('× saída de ' + a.ritmo, 'out–dez (' + _orcM2_(m.saida) + ')', m.vSaida);
  else if (S.real && S.real.media) bloco('× real ' + a.real + ' (' + _orcM2_(S.real.media) + ')', null, _orcVariacao_(S.real.media, S.orc.media, 0.005));
  if (m.saida && m.projecao) {
    txt(yy, 9, 'saída ' + a.ritmo + ' ' + m.projecao + (m.degrau ? ';' : ''), { fs: 6.5 });
    if (m.degrau) txt(yy + 8, 9, 'degrau a explicar', { fs: 6.5 });
  }
}
