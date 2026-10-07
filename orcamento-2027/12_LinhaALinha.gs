/**
 * ARQUIVO: 12_LinhaALinha.gs
 * SLIDES:  Análise linha a linha — um slide por conta relevante: o total
 *          contra os anos anteriores, o mês a mês e a composição do orçamento
 *          pelos itens dos modelos 070/090.
 *
 * O relatório da controladoria traz o TOTAL da conta; os modelos 070/090 só
 * abrem os itens novos ou avulsos. A diferença entre os dois aparece como
 * "Não detalhado nos modelos" — na segurança e na limpeza são os contratos
 * recorrentes (Auxiliar, Moked, Firecam…), na energia é o consumo. Mostrar a
 * diferença em vez de escondê-la é o que faz a composição fechar com o total.
 */

// Contas detalhadas linha a linha, nesta ordem — o foco da apresentação
// (definido com o gestor em 30/09/2026). As demais aparecem só na DRE e no
// quadro de ofensores.
const ORC_CONTAS_DETALHE = ['Manutenção de imóveis', 'Segurança e vigilância', 'Limpeza e conservação'];

// Conta da lista que não existir no relatório vira erro no slide, e não um
// slide a menos sem ninguém perceber.
function _orcContasLinhaALinha_(rel) {
  return ORC_CONTAS_DETALHE.map(nome => {
    const c = rel.contas.filter(x => x.chave === _orcChaveConta_(nome))[0];
    if (!c) throw new Error('Conta "' + nome + '" (ORC_CONTAS_DETALHE) não encontrada no relatório de metragem.');
    return { nome: c.nome, chave: c.chave, v: c.v };
  });
}

// Itens do modelo + a base que o modelo não detalha, fechando com o total do
// relatório. { itens, base, excesso } — excesso > 0 quando os itens do modelo
// somam MAIS que o relatório (os dois divergem; vira aviso no slide).
function _orcComposicaoConta_(conta, linhasModelo) {
  const itens = _orcItensDaConta_(linhasModelo, conta.chave);
  const somaItens = itens.reduce((a, it) => a + it.total, 0);
  const dif = conta.v.orc - somaItens;
  return { itens: itens, somaItens: somaItens, base: dif > 1 ? dif : 0, excesso: dif < -1 ? -dif : 0 };
}

// Layout do slide principal da conta: cards de KPI no topo e, embaixo, o mês a
// mês e a composição. O corte da composição depende dele.
const _ORC_LL = { ky: 72, kh: 50, gap: 10 };

// Itens por página de continuação: duas colunas de até 30 linhas.
const ORC_ITENS_POR_PAGINA = 60;

/**
 * O que cabe na tabela de composição do slide principal e o que sobra para
 * as páginas seguintes (gerarSlideItensMenores_, pedido do gestor em
 * 06/10/2026 — antes os itens menores viravam só "+ N itens menores").
 * { comp, itens, fora }
 */
function _orcCorteComposicao_(conta, linhasModelo, H) {
  const comp = _orcComposicaoConta_(conta, linhasModelo);
  const by = _ORC_LL.ky + _ORC_LL.kh + _ORC_LL.gap, bh = H - 26 - by;
  const disp = bh - 30 - 20;
  const maxLinhas = Math.max(2, Math.floor(disp / 14) - 1);          // -1 = TOTAL
  const extras = (comp.base ? 1 : 0);
  if (comp.itens.length + extras <= maxLinhas) return { comp: comp, itens: comp.itens.slice(), fora: [] };
  const cabem = Math.max(0, maxLinhas - extras - 1);
  return { comp: comp, itens: comp.itens.slice(0, cabem), fora: comp.itens.slice(cabem) };
}

// Divide por igual entre as páginas: 70 itens viram 35 + 35, não 60 + 10.
function _orcPaginasItens_(fora) {
  if (!fora.length) return [];
  const nPag = Math.ceil(fora.length / ORC_ITENS_POR_PAGINA), porPag = Math.ceil(fora.length / nPag);
  const paginas = [];
  for (let i = 0; i < fora.length; i += porPag) paginas.push(fora.slice(i, i + porPag));
  return paginas;
}

// Mês a mês da conta (rascunho aprovado em 07/10/2026): o Orç do ano em
// barras com o valor (R$ mil), o ritmo do ano anterior em linha — contínua
// até o último mês fechado e tracejada na projeção, com a faixa "projeção do
// ritmo" — e o Orç do ano anterior como um traço cinza em cada mês. No topo,
// a leitura: o Orç por mês contra o ritmo antes e depois do fechamento.
// m: { orcAnt, real (ritmo), orc } do Despesas-Mensal; (cx, cy, cw, ch) = card.
function _orcMesAMesConta_(slide, cx, cy, cw, ch, m, a) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  const fech = ORC_RITMO_ULTIMO_MES_FECHADO;
  const mil = v => v < 9950 ? (v / 1000).toFixed(1).replace('.', ',') : _orcMilhar_(Math.round(v / 1000));
  const media = arr => arr.length ? arr.reduce((t, v) => t + v, 0) / arr.length : 0;
  const CINZA = '#9AA19F';

  // Legenda no canto do card, na altura do rótulo.
  const leg = [['Orç ' + a.orc, 'barra'], ['Ritmo ' + a.ritmo, 'linha'], ['Orç ' + a.orcAnt, 'traco']];
  const fsL = 6.5, larg = leg.map(l => 15 + _orcLarguraTexto_(l[0], fsL, DS.typography.body));
  let lx = cx + cw - 12 - larg.reduce((t, w) => t + w, 0) - 10 * (leg.length - 1);
  leg.forEach((l, k) => {
    if (l[1] === 'barra') _orcRet_(slide, lx, cy + 10, 8, 6, C.brandLight);
    else if (l[1] === 'linha') { _orcLinha_(slide, lx, cy + 13, lx + 10, cy + 13, C.brandDark, 1.5); _orcBolinha_(slide, lx + 5, cy + 13, 1.6, C.brandDark, 1); }
    else _orcLinha_(slide, lx, cy + 13, lx + 10, cy + 13, CINZA, 1.2);
    _orcUmaLinha_(slide, lx + 13 - _ORC_RECUO_TEXTBOX / 2, cy + 6.5, larg[k] - 13 + _ORC_RECUO_TEXTBOX, 13, l[0],
      { align: 'L', fs: fsL, fsMin: fsL, cor: C.textBody, fonte: DS.typography.body, folga: 8 });
    lx += larg[k] + 10;
  });

  // A leitura.
  const rit = m.real, proj = fech < 12;
  _orcUmaLinha_(slide, cx + 12, cy + 20, cw - 24, 11,
    'Orç ' + a.orc + ': ' + _orcCompacto_(media(m.orc)) + '/mês · ritmo ' + a.ritmo + ': ' +
    (proj ? _orcCompacto_(media(rit.slice(0, fech))) + '/mês em jan–' + ORC_MESES[fech - 1].toLowerCase() + ' e ' +
            _orcCompacto_(media(rit.slice(fech))) + ' em ' + ORC_MESES[fech].toLowerCase() + '–dez (projeção)'
          : _orcCompacto_(media(rit)) + '/mês'),
    { align: 'L', fs: 6.5, fsMin: 5.5, cor: C.textBody, fonte: DS.typography.body, cortar: true });

  const x0 = cx + 12, x1 = cx + cw - 12, top = cy + 44, base = cy + ch - 16;
  const col = (x1 - x0) / 12, barW = col * 0.56;
  const max = Math.max.apply(null, m.orc.concat(rit, m.orcAnt)) * 1.08 || 1;
  const y = v => base - (base - top) * Math.max(0, v) / max;
  const xm = i => x0 + col * (i + 0.5);

  if (proj) {
    _orcRet_(slide, x0 + col * fech, top - 10, col * (12 - fech), base - top + 10, C.brandTint);
    _orcUmaLinha_(slide, x0 + col * fech, top - 10, col * (12 - fech), 10, 'projeção do ritmo',
      { align: 'C', fs: 6, fsMin: 5, bold: true, cor: C.brandDark, fonte: DS.typography.body, folga: 4 });
  }
  _orcLinha_(slide, x0, base, x1, base, C.lines, 0.75);
  for (let i = 0; i < 12; i++) {
    const v = m.orc[i], bx = xm(i) - barW / 2;
    if (v > 0.5) {
      const bh = Math.max(1, base - y(v));
      _orcRet_(slide, bx, base - bh, barW, bh, C.brandLight);
      const dentro = bh >= 12;
      _orcUmaLinha_(slide, xm(i) - col / 2, dentro ? base - bh + 1 : base - bh - 11, col, 10, mil(v),
        { align: 'C', fs: 6, fsMin: 5, bold: true, cor: dentro ? '#FFFFFF' : C.textMain, fonte: DS.typography.titles, folga: 4 });
    }
    if (m.orcAnt[i] > 0.5) _orcLinha_(slide, bx - 1.5, y(m.orcAnt[i]), bx + barW + 1.5, y(m.orcAnt[i]), CINZA, 1.2);
    _orcUmaLinha_(slide, xm(i) - col / 2, base + 1, col, 11, ORC_MESES[i],
      { align: 'C', fs: 6, cor: C.textBody, fonte: DS.typography.titles, folga: 4 });
  }
  for (let i = 0; i < 11; i++) {
    const l = _orcLinha_(slide, xm(i), y(rit[i]), xm(i + 1), y(rit[i + 1]), C.brandDark, 1.5);
    if (i + 1 >= fech) l.setDashStyle(SlidesApp.DashStyle.DASH);
  }
  for (let i = 0; i < 12; i++) {
    _orcBolinha_(slide, xm(i), y(rit[i]), 1.6, C.brandDark, 1);
    if (proj && i >= fech) {
      // Valor da projeção numa etiqueta branca: legível em cima da barra.
      const t = mil(rit[i]), ew = Math.max(14, _orcLarguraTexto_(t, 6, DS.typography.titles, true) + 5);
      _orcRet_(slide, xm(i) - ew / 2, y(rit[i]) - 13, ew, 9, '#FFFFFF', { redondo: true, borda: C.brandDark, peso: 0.6 });
      _orcUmaLinha_(slide, xm(i) - ew / 2, y(rit[i]) - 13, ew, 9, t,
        { align: 'C', fs: 6, fsMin: 5, bold: true, cor: C.brandDark, fonte: DS.typography.titles, folga: 4 });
    }
  }
}

// nPag: total de páginas da conta (esta + as dos itens menores); com mais de
// uma, o título leva "(1/n)".
// cls (só na manutenção): marca de cada item com a cor do grupo.
function gerarSlideLinhaALinha_(slide, W, H, cid, rel, mensal, linhasModelo, conta, nPag, cls) {
  const DS = CR_DESIGN_SYSTEM;
  const C = DS.colors;
  const MX = DS.layout.marginX;
  const a = rel.anos;
  const v = conta.v;
  const varR = _orcVariacao_(v.ritmo, v.orc);
  _orcHeader_(slide, W, conta.nome + (nPag > 1 ? ' (1/' + nPag + ')' : ''),
    'Orç ' + a.orc + ' ' + _orcCompacto_(v.orc) + ' · ' + varR.texto + ' contra o Ritmo ' + a.ritmo + ' (' +
    _orcDeltaMil_(v.orc - v.ritmo) + ' mil) · ' + cid.nome);

  // ---- Total contra os anos anteriores ----
  const ky = _ORC_LL.ky, kh = _ORC_LL.kh, gap = _ORC_LL.gap;
  const kpis = [
    ['Real ' + a.real, v.real, null],
    ['Orç ' + a.orcAnt, v.orcAnt, null],
    ['Ritmo ' + a.ritmo, v.ritmo, null],
    ['Orç ' + a.orc, v.orc, varR]
  ];
  // 5º card: o R$/m² ao mês da conta no Orç, pela área implícita de cada ano —
  // o diretor lê em dinheiro e em m² (pedido de 06/10/2026). A variação em m²
  // difere da em R$ quando a área muda.
  const aRit = _orcAreaImplicita_(rel, 'ritmo'), aOrc = _orcAreaImplicita_(rel, 'orc');
  const m2Rit = aRit ? v.ritmo / aRit / 12 : null, m2Orc = aOrc ? v.orc / aOrc / 12 : null;
  const nCards = kpis.length + (m2Orc !== null ? 1 : 0);
  const kw = (W - MX * 2 - gap * (nCards - 1)) / nCards;
  if (m2Orc !== null) {
    const x = MX + kpis.length * (kw + gap);
    const vm = m2Rit !== null ? _orcVariacao_(m2Rit, m2Orc, 0.005) : null;
    _orcRet_(slide, x, ky, kw, kh, C.cardBg, { redondo: true, borda: C.brandLight, peso: 1 });
    _orcUmaLinha_(slide, x + 12, ky + 5, kw - 24, 14, 'R$/M² AO MÊS · ORÇ ' + String(a.orc).slice(-2),
      { align: 'L', fs: 7, bold: true, cor: C.brandLight, fonte: DS.typography.titles, fsMin: 6 });
    // A variação embaixo do valor: ao lado dele ficava por cima do "R$ 1,10"
    // (gestor, 07/10/2026).
    const temVar = vm && vm.texto !== '–';
    _orcUmaLinha_(slide, x + 12, ky + (temVar ? 16 : 20), kw - 24, 22, 'R$ ' + _orcM2_(m2Orc),
      { align: 'L', fs: 15, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    if (temVar) {
      _orcUmaLinha_(slide, x + 12, ky + 36, kw - 24, 11, vm.texto + ' × ritmo',
        { align: 'L', fs: 6.5, bold: true, fonte: DS.typography.body, fsMin: 5.5,
          cor: vm.sentido === 1 ? _ORC_COR_VAR.sobe : (vm.sentido === -1 ? _ORC_COR_VAR.desce : C.textBody) });
    }
  }
  kpis.forEach((k, i) => {
    const x = MX + i * (kw + gap);
    const ultimo = i === kpis.length - 1;
    _orcRet_(slide, x, ky, kw, kh, ultimo ? C.brandDark : C.cardBg, { redondo: true, borda: ultimo ? null : C.lines });
    _orcUmaLinha_(slide, x + 12, ky + 5, kw - 24, 14, k[0].toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: ultimo ? C.brandSoft : C.textBody, fonte: DS.typography.titles });
    const temVar = k[2] && k[2].texto !== '–';
    _orcUmaLinha_(slide, x + 12, ky + (temVar ? 16 : 20), kw - 24, 22, _orcMoeda_(k[1]),
      { align: 'L', fs: 15, bold: true, cor: ultimo ? '#FFFFFF' : C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    if (temVar) {
      // Embaixo do valor, como no card de R$/m²: no título encostava em "ORÇ 2027".
      _orcUmaLinha_(slide, x + 12, ky + 36, kw - 24, 11, k[2].texto + ' × ritmo',
        { align: 'L', fs: 6.5, bold: true, fonte: DS.typography.body, fsMin: 5.5,
          cor: k[2].sentido === 1 ? _ORC_COR_VAR.sobeClaro : (k[2].sentido === -1 ? _ORC_COR_VAR.desceClaro : '#FFFFFF') });
    }
  });

  // ---- Mês a mês ----
  const by = ky + kh + gap, bh = H - 26 - by;
  const lw = Math.round((W - MX * 2 - gap) * 0.54), rx = MX + lw + gap, rw = W - MX - rx;
  _orcCard_(slide, MX, by, lw, bh, 'Mês a mês · R$ mil');
  const m = mensal && mensal.contas[conta.chave];
  if (m) {
    _orcMesAMesConta_(slide, MX, by, lw, bh, m, a);
  } else {
    _orcParagrafo_(slide, MX + 16, by + 40, lw - 32, 40,
      'Conta sem abertura mês a mês no relatório Despesas-Mensal ' + a.ritmo + ' x ' + a.orc + '.',
      { fs: 8, cor: C.textMuted, align: 'C' });
  }

  // ---- Composição do orçamento ----
  _orcCard_(slide, rx, by, rw, bh, 'Composição do Orç ' + a.orc);
  const corte = _orcCorteComposicao_(conta, linhasModelo, H), comp = corte.comp;
  const ty = by + 22, disp = bh - 30 - 20;
  const linhas = corte.itens.map(it => ({ celulas: [
    { texto: it.descricao, aba: 'Composição' }, { texto: _orcMoeda_(it.total), bold: true }] }));
  if (corte.fora.length) {
    linhas.push({ celulas: [
      // Manutenção (cls): os itens menores estão no item a item, adiante.
      { texto: '+ ' + corte.fora.length + ' itens menores' + (nPag > 1 ? ' (página 2/' + nPag + ')' : (cls ? ' (item a item adiante)' : '')),
        cor: C.textBody },
      { texto: _orcMoeda_(corte.fora.reduce((s, it) => s + it.total, 0)), bold: true }] });
  }
  if (comp.base) linhas.push({ celulas: [
    // Rótulo neutro: na segurança e na limpeza a diferença são os contratos,
    // mas na energia é consumo — o modelo não diz qual é qual.
    { texto: comp.itens.length ? 'Não detalhado nos modelos 070/090'
                               : 'Sem abertura por item nos modelos 070/090', cor: C.brandMed, bold: true },
    { texto: _orcMoeda_(comp.base), bold: true, cor: C.brandMed }] });
  linhas.push({ total: true, celulas: [{ texto: 'TOTAL ' + conta.nome.toUpperCase() }, { texto: _orcMoeda_(v.orc) }] });
  // Manutenção: a marca do grupo (contrato, recorrente, pontual, projeto) na
  // frente de cada item — gestor, 07/10/2026.
  const colunas = [{ titulo: 'Item', w: null, align: 'L' }, { titulo: 'Valor ' + a.orc, w: 76, align: 'C' }];
  if (cls) _orcMarcarGrupos_(linhas, corte.itens, cls, colunas);
  const rowH = Math.min(18, disp / Math.max(1, linhas.length));
  _orcTabela_(slide, rx + 8, ty, rw - 16, colunas, linhas, rowH, { hCab: 16 });
  if (cls) _orcLegendaGrupos_(slide, MX, H - 19, W - MX * 2);   // no rodapé, à direita: no card cobria o título
  if (comp.excesso) {
    _orcUmaLinha_(slide, rx + 8, by + bh - 20, rw - 16, 12,
      '⚠ Itens dos modelos somam ' + _orcMoeda_(comp.excesso) + ' a mais que o relatório',
      { align: 'L', fs: 6.5, bold: true, cor: C.accentRed, fonte: DS.typography.body, fsMin: 5, cortar: true });
  }

  _orcRodape_(slide, W, H, 'Fontes: METRAGEM-COND e Despesas-Mensal ' + a.ritmo + ' x ' + a.orc + ' (controladoria); itens: ' +
    'modelos 070/090 de ' + a.orc + ' · ' + cid.nome);
}

/**
 * Página de continuação da conta: os itens menores que não couberam na
 * composição do slide principal, do maior para o menor, em duas colunas. A
 * última página fecha com o total dos itens menores — o mesmo valor da linha
 * "+ N itens menores" do slide principal.
 * todosFora: os itens menores de todas as páginas (para o total).
 */
// cls (só na manutenção): marca de cada item com a cor do grupo.
function gerarSlideItensMenores_(slide, W, H, cid, rel, conta, pagina, iPag, nPag, todosFora, cls) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  const a = rel.anos;
  const totalFora = todosFora.reduce((s, it) => s + it.total, 0);
  const ultima = iPag === nPag - 2;
  _orcHeader_(slide, W, conta.nome + ' (' + (iPag + 2) + '/' + nPag + ')',
    'Itens menores da composição do Orç ' + a.orc + ' · ' + todosFora.length + ' itens · ' + _orcMoeda_(totalFora) +
    ' · ' + cid.nome);

  const linhas = pagina.map(it => ({ celulas: [
    { texto: it.descricao, aba: 'Composição' }, { texto: _orcMoeda_(it.total), bold: true }] }));
  const nTotal = ultima ? 1 : 0;
  const porCol = Math.ceil((linhas.length + nTotal) / 2);
  const ty = 74, hCab = 16, gap = 12, cw = (W - MX * 2 - gap) / 2;
  const rowH = Math.min(15, (H - 28 - ty - hCab) / Math.max(1, porCol));
  const fs = rowH >= 12 ? 7.5 : (rowH >= 10 ? 7 : 6.5);
  const colunas = [{ titulo: 'Item', w: null, align: 'L' }, { titulo: 'Valor ' + a.orc, w: 76, align: 'C' }];
  if (cls) {
    _orcMarcarGrupos_(linhas, pagina, cls, colunas);
    _orcLegendaGrupos_(slide, MX, H - 19, W - MX * 2);
  }
  const esq = linhas.slice(0, porCol), dir = linhas.slice(porCol);
  if (ultima) {
    dir.push({ total: true, celulas: (cls ? [null] : []).concat([{ texto: 'TOTAL DOS ' + todosFora.length + ' ITENS MENORES' },
                                      { texto: _orcMoeda_(totalFora) }]) });
  }
  _orcTabela_(slide, MX, ty, cw, colunas, esq, rowH, { hCab: hCab, fs: fs });
  if (dir.length) _orcTabela_(slide, MX + cw + gap, ty, cw, colunas, dir, rowH, { hCab: hCab, fs: fs });

  _orcRodape_(slide, W, H, 'Fonte: modelos 070/090 de ' + a.orc + ' e planilhas de contratos · continuação da composição de ' +
    conta.nome + ' (página 1/' + nPag + ') · ' + cid.nome);
}
