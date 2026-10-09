/**
 * ARQUIVO: 24_PorQueSobe.gs
 * SLIDE:   "Por que a manutenção sobe" — abre a seção Manutenção (07/10/2026).
 *          Separa, na alta da manutenção contra o Ritmo, as obras que o
 *          gestor disse terem sido orçadas em 2026, não feitas e passadas
 *          para 2027 ("não foi realizado, apenas deslocamos de 2026 para
 *          2027" — ORC_DECISOES_GESTOR, 23_DecisoesGestor.gs). À esquerda a
 *          ponte Ritmo → Orç com o degrau das obras adiadas; à direita, as
 *          obras. Mega sem obra adiada não ganha o slide.
 *          Logo depois, "as demais variações" (V16, aprovado em 09/10/2026):
 *          o degrau que sobra aberto item a item, pelos pares do gestor.
 */

// Obras adiadas de 2026 com o valor de hoje no modelo 090: { itens, total,
// total2026 } ou null. O valor de 2027 é o do modelo (os itens da planilha do
// gestor pelo nome); item que não está mais no modelo vai com o valor da
// planilha e fica no log.
function _orcAdiados2026_(cid, dados) {
  const dec = (ORC_DECISOES_GESTOR[cid.nome] || {}).adiados || [];
  if (!dec.length || !dados) return null;
  const porNome = {};
  dados.categorias.forEach(cat => cat.itens.forEach(it => {
    const k = _orcNorm_(it.descricao);
    porNome[k] = (porNome[k] || 0) + it.total;
  }));
  const itens = dec.map(a => {
    const achados = a.itens2027.map(n => porNome[_orcNorm_(n)]);
    const doModelo = achados.length > 0 && achados.every(v => v !== undefined);
    if (!doModelo) {
      Logger.log(cid.nome + ': obra adiada "' + a.de2026 + '" sem item no 090 de ' + ORC_ANO +
                 ' (' + a.itens2027.join(' + ') + ') — vai o valor da planilha do gestor.');
    }
    return { nome: _orcNomeObra_(a.de2026), orc2026: a.orc2026,
             orc2027: doModelo ? achados.reduce((t, v) => t + v, 0) : a.orc2027, doModelo: doModelo };
  }).sort((x, y) => y.orc2027 - x.orc2027);
  return { itens: itens, total: itens.reduce((t, x) => t + x.orc2027, 0),
           total2026: itens.reduce((t, x) => t + x.orc2026, 0) };
}

// "Reparo recalque docas funcionais * 14752188" → "Reparo recalque docas
// funcionais": sem o número de chamado/pedido.
function _orcNomeObra_(s) {
  const t = String(s || '').replace(/\s*[*#]+\s*\d[\d\s\/*#]*/g, ' ').replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Quadro da direita do "por que sobe" no Mega sem obra adiada: Orç anterior,
// Ritmo e Orç em R$ e R$/m² ao mês, e o Orç contra cada base. Quando a área
// implícita muda muito (Esteio cresce com B1 e B2), diz que o R$ e o R$/m²
// andam em sentidos diferentes — comparação honesta (analista, 07/10/2026).
function _orcQuadroBasesManut_(slide, x, y, w, h, rel, v, areas) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, a = rel.anos;
  _orcCard_(slide, x, y, w, h, 'Orçado, ritmo e orçamento da conta');
  const m2 = (val, ar) => ar ? 'R$ ' + _orcM2_(val / ar / 12) : '–';
  const var_ = (de, ate) => {
    if (!(de > 0.5)) return { texto: '–' };
    const d = ate / de - 1;
    return { texto: (d >= 0 ? '▲ +' : '▼ −') + _orcPct_(Math.abs(d)), sentido: d > 0.005 ? 1 : (d < -0.005 ? -1 : 0) };
  };
  const linhas = [
    { tipo: 'item', nome: 'Orç ' + a.orcAnt, celulas: [{ texto: _orcMoeda_(v.orcAnt) }, { texto: m2(v.orcAnt, areas.aAnt) }, var_(v.orcAnt, v.orc)] },
    { tipo: 'item', nome: 'Ritmo ' + a.ritmo, celulas: [{ texto: _orcMoeda_(v.ritmo) }, { texto: m2(v.ritmo, areas.aRit) }, var_(v.ritmo, v.orc)] },
    { tipo: 'total', nome: 'Orç ' + a.orc, celulas: [{ texto: _orcMoeda_(v.orc) }, { texto: m2(v.orc, areas.area) }, { texto: '' }] }
  ];
  const numW = (w - 20 - 90) / 3;
  const yFim = _orcTabelaNum_(slide, x + 10, y + 26, w - 20, 16 + 15 * linhas.length, [
    { titulo: 'BASE', w: 90 }, { titulo: 'R$ NO ANO', w: numW }, { titulo: 'R$/M² AO MÊS', w: numW, destaque: true },
    { titulo: 'ORÇ ' + a.orc + ' × BASE', w: numW }
  ], linhas, null);
  let texto = 'Sem obras de ' + a.ritmo + ' adiadas para ' + a.orc + ' neste Mega (planilha de comparação do gestor). ' +
              'A alta aberta item a item está no próximo slide.';
  if (areas.area && areas.aRit && Math.abs(areas.area / areas.aRit - 1) > 0.1) {
    texto += ' A área implícita muda de ' + _orcMilhar_(Math.round(areas.aRit / 1000)) + ' mil para ' +
             _orcMilhar_(Math.round(areas.area / 1000)) + ' mil m² entre o Ritmo e o Orç: por isso o R$ e o R$/m² não andam juntos.';
  }
  _orcParagrafo_(slide, x + 12, yFim + 10, w - 24, 50, texto, { fs: 7.5, fsMin: 6, cor: C.textBody, fonte: T.body });
}

// R$/m² ao mês das demais variações ("+R$ 0,08/m²"): cada ano com a sua área
// (a do Orç e a do Ritmo), por isso não é a diferença em R$ ÷ uma área só.
function _orcM2Demais_(rel, v, totalAdiados) {
  const area = _orcAreaImplicita_(rel, 'orc'), aRit = _orcAreaImplicita_(rel, 'ritmo');
  if (!area || !aRit) return '';
  const d = v.orc / area / 12 - v.ritmo / aRit / 12 - totalAdiados / area / 12;
  return (d >= 0 ? '+' : '−') + 'R$ ' + _orcM2_(Math.abs(d)) + '/m²';
}

// Mega sem obra adiada (adi null; Esteio): desde 09/10/2026 o slide sai também ("ter o orçado também nos 3 Megas"),
// com a ponte Orç → Ritmo → variação → Orç e, à direita, o quadro Orç anterior × Ritmo × Orç em R$ e R$/m².
function gerarSlidePorQueSobe_(slide, W, H, cid, rel, conta, adiOuNull) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const adi = adiOuNull || { itens: [], total: 0, total2026: 0 }, comAdi = adi.total > 0.5;
  const v = conta.v, a = rel.anos;
  const area = _orcAreaImplicita_(rel, 'orc'), aRit = _orcAreaImplicita_(rel, 'ritmo');
  const aAnt = _orcAreaImplicita_(rel, 'orcAnt') || aRit;
  const m2 = (x, ar) => ar ? 'R$ ' + _orcM2_(x / ar / 12) + '/m²' : '';
  const alta = v.orc - v.ritmo, demais = alta - adi.total, semAdiados = v.orc - adi.total;
  const pct = x => v.ritmo ? (x >= 0 ? '+' : '−') + _orcPct_(Math.abs(x / v.ritmo)) : '–';
  const pctAnt = x => v.orcAnt > 0.5 ? (x >= 0 ? '+' : '−') + _orcPct_(Math.abs(x / v.orcAnt)) : '–';
  _orcHeader_(slide, W, 'Por que a manutenção sobe — Orçamento ' + a.orc, comAdi
    ? 'Ritmo ' + a.ritmo + ' → Orç ' + a.orc + ': ' + pct(alta) + '; sem as obras adiadas de ' + a.ritmo + ': ' +
      pct(semAdiados - v.ritmo) + ' · ' + cid.nome
    : 'Ritmo ' + a.ritmo + ' → Orç ' + a.orc + ': ' + pct(alta) + '; Orç ' + a.orcAnt + ' → Orç ' + a.orc + ': ' +
      pctAnt(v.orc - v.orcAnt) + ' · ' + cid.nome);

  // ---- Ponte (esquerda) ----
  const cy = 74, ch = H - 28 - cy, cw = (W - MX * 2) * 0.44, cx = MX;
  _orcCard_(slide, cx, cy, cw, ch, 'Do Ritmo ' + a.ritmo + ' ao Orçamento ' + a.orc);
  // Gestor, 08/10/2026: "colocar coluna ao lado (comparativo) Orç 2026" — vem
  // primeiro, em cinza e fora da cascata (a ponte continua Ritmo → Orç).
  const temAnt = v.orcAnt > 0.5;
  const colunas = (temAnt ? [{ nome: 'Orç ' + a.orcAnt, de: 0, ate: v.orcAnt, cor: '#94A3B8', m2: m2(v.orcAnt, aAnt), comparativo: true }] : []).concat([
    { nome: 'Ritmo ' + a.ritmo, de: 0, ate: v.ritmo, cor: C.brandDark, m2: m2(v.ritmo, aRit) }
  ], comAdi ? [
    // "OBRAS ADIADAS DE 2026" ia para 3 linhas e o ano saía cortado (07/10/2026).
    { nome: 'Obras adiadas', de: v.ritmo, ate: v.ritmo + adi.total, cor: C.brandLight, delta: true, destaque: true,
      m2: area ? '+' + m2(adi.total, area) : '' }] : [], [
    { nome: comAdi ? 'Demais variações' : 'Variação', de: v.ritmo + adi.total, ate: v.orc, delta: true,
      cor: demais >= 0 ? _ORC_COR_VAR.sobe : _ORC_COR_VAR.desce, m2: _orcM2Demais_(rel, v, adi.total) },
    // "ORÇAMENTO 2027" quebrava no meio da palavra ("ORÇAMENT / O 2027", Guilherme, 09/10/2026).
    { nome: 'Orç ' + a.orc, de: 0, ate: v.orc, cor: C.brandDark, m2: m2(v.orc, area) }
  ]);
  const px = cx + 14, pw = cw - 28, topo = cy + 50, base = cy + ch - 74;
  const maxV = Math.max(v.ritmo, v.orc, v.ritmo + adi.total, temAnt ? v.orcAnt : 0) * 1.08;
  const y = x => base - (base - topo) * x / maxV;
  const colW = pw / colunas.length, barW = Math.min(colW * 0.56, 46);
  _orcLinha_(slide, px, base, px + pw, base, C.lines, 1);
  colunas.forEach((c, i) => {
    const bx = px + i * colW + (colW - barW) / 2, y1 = y(Math.max(c.de, c.ate)), y2 = y(Math.min(c.de, c.ate));
    _orcRet_(slide, bx, y1, barW, Math.max(0.8, y2 - y1), c.cor);
    const txt = c.delta ? _orcDeltaMil_(c.ate - c.de) + ' mil' : _orcCompacto_(c.ate);
    _orcUmaLinha_(slide, px + i * colW, y1 - 24, colW, 12, txt,
      { align: 'C', fs: 8, bold: true, cor: c.cor, fonte: T.titles, folga: 4, fsMin: 6 });
    if (c.m2) {
      _orcUmaLinha_(slide, px + i * colW, y1 - 13, colW, 11, c.m2,
        { align: 'C', fs: 6.5, cor: C.textBody, fonte: T.body, folga: 4, fsMin: 5.5 });
    }
    _orcParagrafo_(slide, px + i * colW - 2, base + 3, colW + 4, 22, c.nome.toUpperCase(),
      { align: 'C', fs: 6.5, fsMin: 5.5, bold: true, fonte: T.titles, cor: c.destaque ? C.brandLight : C.textBody });
  });
  // Separador entre o comparativo (Orç do ano anterior) e a cascata.
  if (temAnt) _orcLinha_(slide, px + colW, topo - 6, px + colW, base, C.lines, 0.75);
  // A leitura sem as obras adiadas, embaixo da ponte.
  const ly = base + 30;
  _orcRet_(slide, cx + 12, ly, cw - 24, 30, C.brandTint, { redondo: true });
  _orcRet_(slide, cx + 12, ly, 3, 30, C.brandLight);
  _orcParagrafo_(slide, cx + 20, ly + 2, cw - 36, 26, comAdi
    ? 'Sem as obras adiadas: ' + _orcCompacto_(semAdiados) + (area ? ' · ' + m2(semAdiados, area) + ' ao mês' : '') +
      ' · ' + pct(semAdiados - v.ritmo) + ' contra o Ritmo ' + a.ritmo + ' (com elas, ' + pct(alta) + ')'
    : 'Orç ' + a.orc + ': ' + _orcCompacto_(v.orc) + (area ? ' · ' + m2(v.orc, area) + ' ao mês' : '') + ' · ' +
      pct(alta) + ' contra o Ritmo ' + a.ritmo + ' e ' + pctAnt(v.orc - v.orcAnt) + ' contra o Orç ' + a.orcAnt,
    { fs: 8, fsMin: 6.5, bold: true, cor: C.brandDark, fonte: T.body, meio: true });

  const tx = cx + cw + 12, tw = W - MX - tx;
  if (!comAdi) {
    _orcQuadroBasesManut_(slide, tx, cy, tw, ch, rel, v, { area: area, aRit: aRit, aAnt: aAnt });
    _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND (Orç ' + a.orcAnt + ', Ritmo e Orçamento da conta) · área implícita = total ÷ R$/m² ÷ 12 · ' + cid.nome);
    return;
  }
  // ---- As obras (direita) ----
  _orcCard_(slide, tx, cy, tw, ch, 'As obras de ' + a.ritmo + ' que ficaram para ' + a.orc);
  const linhas = adi.itens.map(it => ({ tipo: 'item', nome: it.nome, celulas: [
    { texto: _orcMoeda_(it.orc2026) }, { texto: _orcMoeda_(it.orc2027), bold: true }] }));
  linhas.push({ tipo: 'total', nome: 'TOTAL (' + adi.itens.length + (adi.itens.length === 1 ? ' OBRA)' : ' OBRAS)'),
                celulas: [{ texto: _orcMoeda_(adi.total2026) }, { texto: _orcMoeda_(adi.total) }] });
  const numW = 56;
  const yFim = _orcTabelaNum_(slide, tx + 10, cy + 26, tw - 20, 16 + 15 * linhas.length, [
    { titulo: 'OBRA (COMO ESTAVA NO ORÇ ' + a.ritmo + ')', w: tw - 20 - numW * 2 },
    { titulo: 'ORÇ ' + a.ritmo, w: numW }, { titulo: 'ORÇ ' + a.orc, w: numW, destaque: true }
  ], linhas, null);
  _orcParagrafo_(slide, tx + 12, yFim + 8, tw - 24, 34,
    // Sem a menção ao "comentário do gestor" (gestor, 08/10/2026: "Retirar comentário").
    'Orçadas em ' + a.ritmo + ', não realizadas e passadas para ' + a.orc + '. Orç ' + a.orc + ' = valor de hoje no modelo 090.',
    { fs: 7, fsMin: 6, cor: C.textBody, fonte: T.body });

  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND (Orç ' + a.orcAnt + ', Ritmo e Orçamento da conta) · obras: planilhas de comparação ' +
    a.ritmo + ' × ' + a.orc + ' e modelo 090 de ' + a.orc + ' · ' + cid.nome);
}

// ==========================================
// AS DEMAIS VARIAÇÕES, ITEM A ITEM (V16, 09/10/2026)
// ==========================================
// O degrau "demais variações" da ponte (Orç − Ritmo − obras adiadas) aberto
// pelas decisões do gestor na planilha de comparação (ORC_DECISOES_GESTOR):
//   itens novos       → itens do modelo 090 que não são par nem obra adiada;
//   mesmo serviço     → pares SIM (Ritmo 2026 do par × itens de 2027 no 090);
//   não se repetem    → gastos do Ritmo 2026 sem par (semPar) e o ritmo das
//                       obras adiadas (o valor de 2027 delas já está no degrau
//                       das obras);
//   e as duas diferenças entre as fontes, quando existem: o ritmo item a item
//   × o da METRAGEM (pendência com a controladoria) e o modelo 090 × o Orç da
//   METRAGEM. Os degraus somam exatamente o "demais variações" da ponte.
// null sem as decisões na base ritmo (semPar) ou sem o modelo.
function _orcVariacoesItens_(cid, dados, conta, adi) {
  const dec = ORC_DECISOES_GESTOR[cid.nome];
  if (!dec || !dec.semPar || !dados) return null;
  const v = conta.v;
  const porNome = {};
  dados.categorias.forEach(cat => cat.itens.forEach(it => {
    const k = _orcNorm_(it.descricao);
    porNome[k] = (porNome[k] || 0) + it.total;
  }));
  const usados = {};
  (dec.adiados || []).forEach(a => a.itens2027.forEach(n => { usados[_orcNorm_(n)] = true; }));
  // Valor de 2027 do par: os itens no modelo pelo nome; se algum não está
  // mais no modelo, vai o valor da planilha (o degrau "novos" fecha a conta).
  const pares = (dec.pares || []).map(p => {
    const ks = p.itens2027.map(_orcNorm_).filter((k, i, arr) => arr.indexOf(k) === i);
    const doModelo = ks.length > 0 && ks.every(k => porNome[k] !== undefined);
    ks.forEach(k => { usados[k] = true; });
    return { nome: p.itens2027[0] || p.de2026, nome2027: p.itens2027.length > 0, v26: p.ritmo2026 || 0,
             v27: doModelo ? ks.reduce((t, k) => t + porNome[k], 0) : p.orc2027 };
  });
  const novos = [];
  dados.categorias.forEach(cat => cat.itens.forEach(it => {
    if (it.total && !usados[_orcNorm_(it.descricao)]) novos.push({ nome: it.descricao, nome2027: true, v26: 0, v27: it.total });
  }));
  const semPar = dec.semPar.map(s => ({ nome: s.de2026, nome2027: false, v26: s.ritmo2026, v27: 0 }));
  const soma = (l, f) => l.reduce((t, x) => t + f(x), 0);
  const totAdi = adi ? adi.total : 0;
  const p26 = soma(pares, x => x.v26), p27 = soma(pares, x => x.v27);
  const s26 = soma(semPar, x => x.v26) + soma(dec.adiados || [], a => a.ritmo2026 || 0);
  const a26 = ORC_ANO - 1, a27 = ORC_ANO;
  // As diferenças entre as fontes ficam à vista, em vez de sumir num degrau;
  // centavos (menos de R$ 0,50) vão para o degrau vizinho, para a soma fechar.
  const ritmoItens = p26 + s26;
  const difRitmo = Math.abs(ritmoItens - v.ritmo) >= 0.5, difOrc = Math.abs(v.orc - dados.total) >= 0.5;
  const blocos = [
    { nome: 'Itens novos em ' + a27, curto: 'Itens novos', expl: novos.length + ' itens sem gasto parecido no Ritmo ' + a26,
      v: (difOrc ? dados.total : v.orc) - totAdi - p27 },
    { nome: 'Mesmo serviço nos dois anos', curto: 'Mesmo serviço', expl: pares.length + ' pares ligados pelo gestor' +
      (totAdi ? ' (sem as obras adiadas)' : '') + ': reajuste, área nova, escopo', v: p27 - p26 },
    { nome: 'Gastos de ' + a26 + ' que não se repetem', curto: 'Não se repetem', expl: semPar.length + ' itens do Ritmo ' + a26 + ' sem item em ' + a27,
      v: -(difRitmo ? s26 : v.ritmo - p26) }
  ];
  if (difRitmo) {
    blocos.push({ nome: 'Ritmo da METRAGEM × soma dos itens', curto: 'METRAGEM × itens', v: ritmoItens - v.ritmo,
      expl: 'a soma item a item ' + (ritmoItens < v.ritmo ? 'fica abaixo' : 'passa') + ' da METRAGEM (a conferir com a controladoria)' });
  }
  if (difOrc) {
    blocos.push({ nome: 'Modelo 090 × Orç da METRAGEM', curto: '090 × METRAGEM', v: v.orc - dados.total,
      expl: 'os itens do modelo somam ' + (dados.total > v.orc ? 'mais' : 'menos') + ' que o Orç da METRAGEM (pendência)' });
  }
  const cand = pares.concat(novos, semPar).map(x => Object.assign(x, { d: x.v27 - x.v26 }));
  return { blocos: blocos, demais: v.orc - v.ritmo - totAdi, totAdi: totAdi, nCand: cand.length,
           altas: cand.filter(x => x.d > 0.5).sort((x, y) => y.d - x.d).slice(0, 5),
           quedas: cand.filter(x => x.d < -0.5).sort((x, y) => x.d - y.d).slice(0, 5) };
}

// Nome de item para a tabela: sem o número do chamado, o primeiro de um par
// com vários itens e, se vier todo em maiúsculas, só a inicial maiúscula.
function _orcNomeItemVar_(s) {
  let t = _orcNomeObra_(String(s || '').split(' + ')[0]);
  if (t === t.toUpperCase()) t = t.charAt(0) + t.slice(1).toLowerCase();
  return t;
}

function gerarSlideDemaisVariacoes_(slide, W, H, cid, rel, conta, vi) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const v = conta.v, a = rel.anos, comAdi = vi.totAdi > 0.5;
  const mil = x => (x >= 0 ? '+' : '−') + _orcCompacto_(Math.abs(x));
  const corDe = x => x >= 0 ? _ORC_COR_VAR.sobe : _ORC_COR_VAR.desce;
  const m2 = _orcM2Demais_(rel, v, vi.totAdi);
  _orcHeader_(slide, W, comAdi ? 'Por que a manutenção sobe: as demais variações' : 'Por que a manutenção sobe: item a item',
    (comAdi ? 'Além das obras adiadas, ' : 'Alta contra o Ritmo ' + a.ritmo + ': ') + mil(vi.demais) +
    (m2 ? ' (' + m2 + ' ao mês)' : '') + ' · Ritmo ' + a.ritmo + ' → Orç ' + a.orc + ', item a item · ' + cid.nome);

  // ---- Os degraus (esquerda): ponte em colunas, como a do slide anterior ----
  // (Guilherme, 09/10/2026: preferiu as colunas verticais à cascata horizontal.)
  // Cada degrau sobe ou desce a partir de onde o anterior parou; a última
  // coluna, cheia, é o total — "demais variações" (ou a alta inteira).
  const cy = 74, ch = H - 28 - cy, cw = (W - MX * 2) * 0.46, cx = MX;
  _orcCard_(slide, cx, cy, cw, ch, 'De onde vêm os ' + mil(vi.demais));
  const bl = vi.blocos, totH = 38, legL = 10;
  const ly = cy + ch - totH - 8;                       // caixa do total, embaixo
  const yLeg = ly - 6 - bl.length * legL;              // legenda dos degraus
  const base = yLeg - 28, topo = cy + 52;              // área das colunas (nomes embaixo da base)
  const acs = [0];
  bl.forEach(b => acs.push(acs[acs.length - 1] + b.v));
  const lo = Math.min(0, Math.min.apply(null, acs)), hi = Math.max(1, Math.max.apply(null, acs));
  const yDe = val => base - (base - topo) * (val - lo) / (hi - lo);
  const px = cx + 14, pw = cw - 28, colW = pw / (bl.length + 1), barW = Math.min(colW * 0.56, 40);
  _orcLinha_(slide, px, yDe(0), px + pw, yDe(0), C.lines, 1);
  const coluna = (i, de, ate, cor, rotulo, nome, sub) => {
    const bx = px + i * colW + (colW - barW) / 2, y1 = yDe(Math.max(de, ate)), y2 = yDe(Math.min(de, ate));
    _orcRet_(slide, bx, y1, barW, Math.max(0.8, y2 - y1), cor);
    _orcUmaLinha_(slide, px + i * colW, y1 - (sub ? 24 : 14), colW, 12, rotulo,
      { align: 'C', fs: 8, bold: true, cor: cor, fonte: T.titles, folga: 4, fsMin: 6 });
    if (sub) _orcUmaLinha_(slide, px + i * colW, y1 - 13, colW, 11, sub,
      { align: 'C', fs: 6.5, cor: C.textBody, fonte: T.body, folga: 4, fsMin: 5.5 });
    _orcParagrafo_(slide, px + i * colW - 2, base + 4, colW + 4, 22, nome.toUpperCase(),
      { align: 'C', fs: 6, fsMin: 5, bold: true, fonte: T.titles, cor: C.textBody });
  };
  bl.forEach((b, i) => coluna(i, acs[i], acs[i + 1], corDe(b.v), _orcDeltaMil_(b.v) + ' mil', b.curto, ''));
  coluna(bl.length, 0, vi.demais, C.brandDark, mil(vi.demais), comAdi ? 'Demais variações' : 'Alta total', m2);
  // Legenda: o que é cada degrau.
  bl.forEach((b, i) => _orcParagrafo_(slide, px, yLeg + i * legL, pw, legL, b.curto + ': ' + b.expl,
    { fs: 6, fsMin: 5, cor: C.textBody, fonte: T.body }));
  _orcRet_(slide, cx + 12, ly, cw - 24, totH, C.brandTint, { redondo: true });
  _orcRet_(slide, cx + 12, ly, 3, totH, C.brandLight);
  _orcUmaLinha_(slide, cx + 22, ly + 4, cw - 40, 16,
    '= ' + (comAdi ? 'Demais variações' : 'Alta contra o Ritmo ' + a.ritmo) + ': ' + mil(vi.demais),
    { align: 'L', fs: 10, bold: true, cor: C.brandDark, fonte: T.titles, fsMin: 8, folga: 4 });
  _orcParagrafo_(slide, cx + 20, ly + 19, cw - 36, 16, comAdi
    ? 'Com as obras adiadas (' + mil(vi.totAdi) + '), a alta toda da manutenção: ' + mil(v.orc - v.ritmo)
    : 'Ritmo ' + a.ritmo + ' ' + _orcCompacto_(v.ritmo) + ' → Orç ' + a.orc + ' ' + _orcCompacto_(v.orc),
    { fs: 7, fsMin: 6, cor: C.textBody, fonte: T.body });

  // ---- Maiores altas e quedas (direita) ----
  const tx = cx + cw + 12, tw = W - MX - tx;
  _orcCard_(slide, tx, cy, tw, ch, 'Maiores altas e quedas, item a item');
  const x0 = tx + 10, lw = tw - 20, numW = 54, nomeW = lw - numW * 3, hCab = 15, hNota = 24;
  const nLin = vi.altas.length + vi.quedas.length;
  const rowH = Math.min(20, (ch - 26 - hCab * 2 - 10 - hNota - 6) / Math.max(1, nLin));
  const tabela = (y, titulo, cor, lista) => {
    _orcRet_(slide, x0, y, lw, hCab, cor);
    _orcUmaLinha_(slide, x0 + 4, y, nomeW - 4, hCab, titulo,
      { align: 'L', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: T.titles, fsMin: 6, folga: 4 });
    ['Ritmo ' + a.ritmo, 'Orç ' + a.orc, 'Δ'].forEach((t, k) => _orcUmaLinha_(slide, x0 + nomeW + k * numW, y, numW - 4, hCab,
      t.toUpperCase(), { align: 'R', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: T.titles, fsMin: 5.5, folga: 4 }));
    let ry = y + hCab;
    lista.forEach((it, r) => {
      if (r % 2) _orcRet_(slide, x0, ry, lw, rowH, C.zebra);
      // Item de 2027 com o texto curto que o gestor escolheu na planilha de textos (aba Composição), se houver.
      const nome = it.nome2027 ? _orcTextoEscolhido_('Composição', it.nome) : it.nome;
      _orcParagrafo_(slide, x0 + 2, ry, nomeW - 4, rowH, _orcNomeItemVar_(nome),
        { fs: 6.5, fsMin: 5.5, cor: C.textMain, fonte: T.body, meio: true, espac: 100 });
      [it.v26 ? _orcMoeda_(it.v26) : '–', it.v27 ? _orcMoeda_(it.v27) : '–'].forEach((t, k) =>
        _orcUmaLinha_(slide, x0 + nomeW + k * numW, ry, numW - 4, rowH, t,
          { align: 'R', fs: 6.5, cor: C.textMain, fonte: T.body, fsMin: 5.5, folga: 4 }));
      _orcUmaLinha_(slide, x0 + nomeW + 2 * numW, ry, numW - 4, rowH, (it.d >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(it.d)),
        { align: 'R', fs: 6.5, bold: true, cor: corDe(it.d), fonte: T.body, fsMin: 5.5, folga: 4 });
      ry += rowH;
    });
    return ry;
  };
  let y = tabela(cy + 26, 'SOBEM', _ORC_COR_VAR.sobe, vi.altas);
  y = tabela(y + 10, 'CAEM', C.brandDark, vi.quedas);
  const mostrados = vi.altas.concat(vi.quedas);
  _orcParagrafo_(slide, tx + 12, y + 6, tw - 24, hNota,
    'Os ' + mostrados.length + ' itens somam ' + mil(mostrados.reduce((t, x) => t + x.d, 0)) + '; o resto se espalha em ' +
    (vi.nCand - mostrados.length) + ' itens. Par = item de ' + a.orc + ' que o gestor ligou a um gasto de ' + a.ritmo +
    ' na planilha de comparação.', { fs: 6.5, fsMin: 5.5, cor: C.textBody, fonte: T.body });

  _orcRodape_(slide, W, H, 'Fonte: planilha de comparação Ritmo ' + a.ritmo + ' × Orç ' + a.orc + ' (pares do gestor), modelo 090 de ' +
    a.orc + ' e METRAGEM-COND · ' + cid.nome);
}
