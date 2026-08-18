/** SLIDE 07 — CRONOGRAMA. Única fonte: obterCronogramaContratos_(). */
function gerarSlideCronogramaContratos() {
  const d = obterCronogramaContratos_(); _fmExigirBloco_(d, 'Cronograma dos Contratos');
  const hs = d.cabecalhos.map(_finNorm_);
  const cn = hs.findIndex(h => h.indexOf('empreendimento') >= 0), ci = hs.findIndex(h => h.indexOf('indeterminado') >= 0);
  const cq = hs.findIndex(h => h.indexOf('contratos') >= 0 || h.indexOf('quantidade') >= 0), cp = hs.findIndex(h => h.indexOf('%') >= 0 || h.indexOf('percentual') >= 0);
  if ([cn, ci, cq, cp].some(i => i < 0)) throw new Error('Cronograma dos Contratos: contrato exige empreendimento, categoria/prazo indeterminado, contratos e %.');
  let categoriaCol = hs.findIndex(h => /ano|vencimento|faixa/.test(h));
  if (categoriaCol < 0) categoriaCol = ci;
  const rows = d.linhas.filter(l => !/^total\b/i.test(String(l[cn]).trim())).map((l, i) => {
    const q = _finNumero_(l[cq]), p = _finNumero_(l[cp]);
    if (!String(l[cn]).trim() || q === null || p === null) throw new Error('Cronograma dos Contratos: linha ' + (d.linhaCabecalho + i + 1) + ' incompleta.');
    let categoria = String(l[categoriaCol] || '').trim();
    if (/indeterminado/i.test(String(l[ci])) || (!categoria && _finNumero_(l[ci]) > 0)) categoria = 'Prazo indeterminado';
    if (!categoria) throw new Error('Cronograma dos Contratos: ano/categoria ausente na linha ' + (d.linhaCabecalho + i + 1) + '.');
    return { nome: String(l[cn]), categoria: categoria, quantidade: String(l[cq]), q: q, percentual: String(l[cp]), p: p };
  });
  if (!rows.length) throw new Error('Cronograma dos Contratos: nenhuma faixa de vencimento válida.');
  const c = _fmNovoSlide_('Cronograma dos Contratos', 'Contratos por ano de vencimento · prazo indeterminado preservado');
  _fmCronogramaDesenhar_(c, rows); _fmRodape_(c);
}

function _fmCronogramaDesenhar_(c, rows) {
  const top = c.H * .22, max = Math.max.apply(null, rows.map(r => r.q)), left = c.m, cw = c.W * .52, rh = Math.min(c.H * .07, c.H * .58 / rows.length);
  rows.forEach((r, i) => {
    const y = top + i * rh, label = r.categoria + (rows.filter(x => x.categoria === r.categoria).length > 1 ? ' · ' + r.nome : '');
    _rrUmaLinha_(c.slide, left, y, cw * .36, rh, label, { fs: c.W * .010, bold: true, align: 'L' });
    const b = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, left + cw * .37, y + rh * .22, Math.max(1, cw * .48 * r.q / Math.max(1, max)), rh * .56);
    b.getFill().setSolidFill(/indeterminado/i.test(r.categoria) ? '#6D5BD0' : c.DS.colors.brandMed); b.getBorder().setTransparent();
    _rrUmaLinha_(c.slide, left + cw * .86, y, cw * .14, rh, r.percentual, { fs: c.W * .0105, bold: true });
  });
  const x = c.W * .64, w = c.W * .31, ws = [w * .50, w * .25, w * .25], heads = ['Vencimento', 'Contratos', '%']; let xx = x;
  heads.forEach((h, i) => { _rrCelula_(c.slide, xx, top, ws[i], c.H * .08, c.DS.colors.brandDark); _rrBloco_(c.slide, xx, top, ws[i], c.H * .08, _rrFormatarCabecalhoTabela_(h), { fs: c.W * .010, bold: true, cor: '#FFF' }); xx += ws[i]; });
  rows.forEach((r, ri) => { xx = x; [r.categoria, r.quantidade, r.percentual].forEach((v, i) => { _rrCelula_(c.slide, xx, top + c.H * .08 + ri * rh, ws[i], rh, ri % 2 ? '#F1F5F9' : '#FFF'); _rrUmaLinha_(c.slide, xx + (i ? 0 : 3), top + c.H * .08 + ri * rh, ws[i] - (i ? 0 : 3), rh, v, { fs: c.W * .010, bold: i === 0, align: i ? 'C' : 'L' }); xx += ws[i]; }); });
}
