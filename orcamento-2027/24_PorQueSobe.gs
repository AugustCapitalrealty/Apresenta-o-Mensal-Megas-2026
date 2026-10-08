/**
 * ARQUIVO: 24_PorQueSobe.gs
 * SLIDE:   "Por que a manutenção sobe" — abre a seção Manutenção (07/10/2026).
 *          Separa, na alta da manutenção contra o Ritmo, as obras que o
 *          gestor disse terem sido orçadas em 2026, não feitas e passadas
 *          para 2027 ("não foi realizado, apenas deslocamos de 2026 para
 *          2027" — ORC_DECISOES_GESTOR, 23_DecisoesGestor.gs). À esquerda a
 *          ponte Ritmo → Orç com o degrau das obras adiadas; à direita, as
 *          obras. Mega sem obra adiada não ganha o slide.
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

function gerarSlidePorQueSobe_(slide, W, H, cid, rel, conta, adi) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const v = conta.v, a = rel.anos;
  const area = _orcAreaImplicita_(rel, 'orc'), aRit = _orcAreaImplicita_(rel, 'ritmo');
  const aAnt = _orcAreaImplicita_(rel, 'orcAnt') || aRit;
  const m2 = (x, ar) => ar ? 'R$ ' + _orcM2_(x / ar / 12) + '/m²' : '';
  const alta = v.orc - v.ritmo, demais = alta - adi.total, semAdiados = v.orc - adi.total;
  const pct = x => v.ritmo ? (x >= 0 ? '+' : '−') + _orcPct_(Math.abs(x / v.ritmo)) : '–';
  _orcHeader_(slide, W, 'Por que a manutenção sobe — Orçamento ' + a.orc,
    'Ritmo ' + a.ritmo + ' → Orç ' + a.orc + ': ' + pct(alta) + '; sem as obras adiadas de ' + a.ritmo + ': ' +
    pct(semAdiados - v.ritmo) + ' · ' + cid.nome);

  // ---- Ponte (esquerda) ----
  const cy = 74, ch = H - 28 - cy, cw = (W - MX * 2) * 0.44, cx = MX;
  _orcCard_(slide, cx, cy, cw, ch, 'Do Ritmo ' + a.ritmo + ' ao Orçamento ' + a.orc);
  // Gestor, 08/10/2026: "colocar coluna ao lado (comparativo) Orç 2026" — vem
  // primeiro, em cinza e fora da cascata (a ponte continua Ritmo → Orç).
  const temAnt = v.orcAnt > 0.5;
  const colunas = (temAnt ? [{ nome: 'Orç ' + a.orcAnt, de: 0, ate: v.orcAnt, cor: '#94A3B8', m2: m2(v.orcAnt, aAnt), comparativo: true }] : []).concat([
    { nome: 'Ritmo ' + a.ritmo, de: 0, ate: v.ritmo, cor: C.brandDark, m2: m2(v.ritmo, aRit) },
    // "OBRAS ADIADAS DE 2026" ia para 3 linhas e o ano saía cortado (07/10/2026).
    { nome: 'Obras adiadas', de: v.ritmo, ate: v.ritmo + adi.total, cor: C.brandLight,
      m2: area ? '+' + m2(adi.total, area) : '' },
    { nome: 'Demais variações', de: v.ritmo + adi.total, ate: v.orc,
      cor: demais >= 0 ? _ORC_COR_VAR.sobe : _ORC_COR_VAR.desce,
      m2: area && aRit ? (demais >= 0 ? '+' : '−') + 'R$ ' + _orcM2_(Math.abs(v.orc / area / 12 - v.ritmo / aRit / 12 - adi.total / area / 12)) + '/m²' : '' },
    { nome: 'Orçamento ' + a.orc, de: 0, ate: v.orc, cor: C.brandDark, m2: m2(v.orc, area) }
  ]);
  const i0 = temAnt ? 1 : 0;   // índice da coluna do Ritmo
  const px = cx + 14, pw = cw - 28, topo = cy + 50, base = cy + ch - 74;
  const maxV = Math.max(v.ritmo, v.orc, v.ritmo + adi.total, temAnt ? v.orcAnt : 0) * 1.08;
  const y = x => base - (base - topo) * x / maxV;
  const colW = pw / colunas.length, barW = Math.min(colW * 0.56, 46);
  _orcLinha_(slide, px, base, px + pw, base, C.lines, 1);
  colunas.forEach((c, i) => {
    const bx = px + i * colW + (colW - barW) / 2, y1 = y(Math.max(c.de, c.ate)), y2 = y(Math.min(c.de, c.ate));
    _orcRet_(slide, bx, y1, barW, Math.max(0.8, y2 - y1), c.cor);
    const delta = i === i0 + 1 || i === i0 + 2;
    const txt = delta ? _orcDeltaMil_(c.ate - c.de) + ' mil' : _orcCompacto_(c.ate);
    _orcUmaLinha_(slide, px + i * colW, y1 - 24, colW, 12, txt,
      { align: 'C', fs: 8, bold: true, cor: c.cor, fonte: T.titles, folga: 4, fsMin: 6 });
    if (c.m2) {
      _orcUmaLinha_(slide, px + i * colW, y1 - 13, colW, 11, c.m2,
        { align: 'C', fs: 6.5, cor: C.textBody, fonte: T.body, folga: 4, fsMin: 5.5 });
    }
    _orcParagrafo_(slide, px + i * colW - 2, base + 3, colW + 4, 22, c.nome.toUpperCase(),
      { align: 'C', fs: 6.5, fsMin: 5.5, bold: true, fonte: T.titles, cor: i === i0 + 1 ? C.brandLight : C.textBody });
  });
  // Separador entre o comparativo (Orç do ano anterior) e a cascata.
  if (temAnt) _orcLinha_(slide, px + colW, topo - 6, px + colW, base, C.lines, 0.75);
  // A leitura sem as obras adiadas, embaixo da ponte.
  const ly = base + 30;
  _orcRet_(slide, cx + 12, ly, cw - 24, 30, C.brandTint, { redondo: true });
  _orcRet_(slide, cx + 12, ly, 3, 30, C.brandLight);
  _orcParagrafo_(slide, cx + 20, ly + 2, cw - 36, 26,
    'Sem as obras adiadas: ' + _orcCompacto_(semAdiados) + (area ? ' · ' + m2(semAdiados, area) + ' ao mês' : '') +
    ' · ' + pct(semAdiados - v.ritmo) + ' contra o Ritmo ' + a.ritmo + ' (com elas, ' + pct(alta) + ')',
    { fs: 8, fsMin: 6.5, bold: true, cor: C.brandDark, fonte: T.body, meio: true });

  // ---- As obras (direita) ----
  const tx = cx + cw + 12, tw = W - MX - tx;
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
