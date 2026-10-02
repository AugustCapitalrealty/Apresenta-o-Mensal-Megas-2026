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

// Colunas agrupadas por mês, uma cor por série, com legenda no topo.
function _orcBarrasAgrupadas_(slide, x, y, w, h, series) {
  const DS = CR_DESIGN_SYSTEM;
  const base = y + h - 14, topo = y + 16, ph = base - topo;
  const max = series.reduce((m, s) => Math.max(m, Math.max.apply(null, s.valores)), 0) || 1;
  const colW = w / 12, grupoW = colW * 0.78, barW = grupoW / series.length;

  // Legenda
  let lx = x + w;
  series.slice().reverse().forEach(s => {
    const tw = _orcLarguraTexto_(s.nome, 6.5, DS.typography.body) + 22;
    lx -= tw;
    _orcRet_(slide, lx, y + 3, 7, 7, s.cor);
    _orcUmaLinha_(slide, lx + 9, y - 1, tw - 9, 14, s.nome,
      { align: 'L', fs: 6.5, cor: DS.colors.textBody, fonte: DS.typography.body, folga: 4 });
  });

  _orcLinha_(slide, x, base, x + w, base, DS.colors.lines, 0.75);
  for (let i = 0; i < 12; i++) {
    const gx = x + i * colW + (colW - grupoW) / 2;
    series.forEach((s, k) => {
      const v = s.valores[i];
      if (v > 0.5) {
        const bh = Math.max(1, ph * v / max);
        _orcRet_(slide, gx + k * barW, base - bh, Math.max(0.5, barW - 0.8), bh, s.cor);
      }
    });
    _orcUmaLinha_(slide, x + i * colW, base + 1, colW, 12, ORC_MESES[i],
      { align: 'C', fs: 6, cor: DS.colors.textBody, fonte: DS.typography.titles, folga: 4 });
  }
}

function gerarSlideLinhaALinha_(slide, W, H, cid, rel, mensal, linhasModelo, conta) {
  const DS = CR_DESIGN_SYSTEM;
  const C = DS.colors;
  const MX = DS.layout.marginX;
  const a = rel.anos;
  const v = conta.v;
  const varR = _orcVariacao_(v.ritmo, v.orc);
  _orcHeader_(slide, W, conta.nome,
    'Orç ' + a.orc + ' ' + _orcCompacto_(v.orc) + ' · ' + varR.texto + ' contra o Ritmo ' + a.ritmo + ' (' +
    _orcDeltaMil_(v.orc - v.ritmo) + ' mil) · ' + cid.nome);

  // ---- Total contra os anos anteriores ----
  const ky = 72, kh = 50, gap = 10;
  const kpis = [
    ['Real ' + a.real, v.real, null],
    ['Orçado ' + a.orcAnt, v.orcAnt, null],
    ['Ritmo ' + a.ritmo, v.ritmo, null],
    ['Orçado ' + a.orc, v.orc, varR]
  ];
  const kw = (W - MX * 2 - gap * 3) / 4;
  kpis.forEach((k, i) => {
    const x = MX + i * (kw + gap);
    const ultimo = i === kpis.length - 1;
    _orcRet_(slide, x, ky, kw, kh, ultimo ? C.brandDark : C.cardBg, { redondo: true, borda: ultimo ? null : C.lines });
    _orcUmaLinha_(slide, x + 12, ky + 5, kw - 24, 14, k[0].toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: ultimo ? C.brandSoft : C.textBody, fonte: DS.typography.titles });
    _orcUmaLinha_(slide, x + 12, ky + 20, kw - 24, 24, _orcMoeda_(k[1]),
      { align: 'L', fs: 15, bold: true, cor: ultimo ? '#FFFFFF' : C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    if (k[2] && k[2].texto !== '–') {
      _orcUmaLinha_(slide, x + kw - 12 - 70, ky + 5, 70, 14, k[2].texto + ' × ritmo',
        { align: 'R', fs: 7, bold: true, fonte: DS.typography.body,
          cor: k[2].sentido === 1 ? _ORC_COR_VAR.sobeClaro : (k[2].sentido === -1 ? _ORC_COR_VAR.desceClaro : '#FFFFFF') });
    }
  });

  // ---- Mês a mês ----
  const by = ky + kh + gap, bh = H - 26 - by;
  const lw = Math.round((W - MX * 2 - gap) * 0.54), rx = MX + lw + gap, rw = W - MX - rx;
  _orcCard_(slide, MX, by, lw, bh, 'Mês a mês');
  const m = mensal && mensal.contas[conta.chave];
  if (m) {
    _orcBarrasAgrupadas_(slide, MX + 12, by + 22, lw - 24, bh - 30, [
      { nome: 'Orç ' + a.orcAnt, cor: '#CBD5E1', valores: m.orcAnt },
      { nome: 'Real/ritmo ' + a.ritmo, cor: C.brandSoft, valores: m.real },
      { nome: 'Orç ' + a.orc, cor: C.brandDark, valores: m.orc }
    ]);
  } else {
    _orcParagrafo_(slide, MX + 16, by + 40, lw - 32, 40,
      'Conta sem abertura mês a mês no relatório Despesas-Mensal ' + a.ritmo + ' x ' + a.orc + '.',
      { fs: 8, cor: C.textMuted, align: 'C' });
  }

  // ---- Composição do orçamento ----
  _orcCard_(slide, rx, by, rw, bh, 'Composição do Orç ' + a.orc);
  const comp = _orcComposicaoConta_(conta, linhasModelo);
  const ty = by + 22, disp = bh - 30 - 20;
  const maxLinhas = Math.max(2, Math.floor(disp / 14) - 1);          // -1 = TOTAL
  const extras = (comp.base ? 1 : 0);
  let itens = comp.itens.slice(), resto = null;
  if (itens.length + extras > maxLinhas) {
    const cabem = Math.max(0, maxLinhas - extras - 1);
    const fora = itens.slice(cabem);
    resto = { n: fora.length, total: fora.reduce((s, it) => s + it.total, 0) };
    itens = itens.slice(0, cabem);
  }
  const linhas = itens.map(it => ({ celulas: [
    { texto: it.descricao }, { texto: _orcMoeda_(it.total), bold: true }] }));
  if (resto) linhas.push({ celulas: [{ texto: '+ ' + resto.n + ' itens menores', cor: C.textBody },
                                     { texto: _orcMoeda_(resto.total), bold: true }] });
  if (comp.base) linhas.push({ celulas: [
    // Rótulo neutro: na segurança e na limpeza a diferença são os contratos,
    // mas na energia é consumo — o modelo não diz qual é qual.
    { texto: comp.itens.length ? 'Não detalhado nos modelos 070/090'
                               : 'Sem abertura por item nos modelos 070/090', cor: C.brandMed, bold: true },
    { texto: _orcMoeda_(comp.base), bold: true, cor: C.brandMed }] });
  linhas.push({ total: true, celulas: [{ texto: 'TOTAL ' + conta.nome.toUpperCase() }, { texto: _orcMoeda_(v.orc) }] });
  const rowH = Math.min(18, disp / Math.max(1, linhas.length));
  _orcTabela_(slide, rx + 8, ty, rw - 16, [
    { titulo: 'Item', w: null, align: 'L' }, { titulo: 'Valor ' + a.orc, w: 76, align: 'R' }
  ], linhas, rowH, { hCab: 16 });
  if (comp.excesso) {
    _orcUmaLinha_(slide, rx + 8, by + bh - 20, rw - 16, 12,
      '⚠ Itens dos modelos somam ' + _orcMoeda_(comp.excesso) + ' a mais que o relatório',
      { align: 'L', fs: 6.5, bold: true, cor: C.accentRed, fonte: DS.typography.body, fsMin: 5, cortar: true });
  }

  _orcRodape_(slide, W, H, 'Fontes: METRAGEM-COND e Despesas-Mensal ' + a.ritmo + ' x ' + a.orc + ' (controladoria); itens: ' +
    'modelos 070/090 de ' + a.orc + ' · ' + cid.nome);
}
