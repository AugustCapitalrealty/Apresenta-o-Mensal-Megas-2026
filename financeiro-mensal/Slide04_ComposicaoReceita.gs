/** SLIDE 04 — COMPOSIÇÃO DE RECEITA. Única fonte: obterComposicaoReceita_(). */
function gerarSlideComposicaoReceita() {
  const d = obterComposicaoReceita_(); _fmExigirBloco_(d, 'Composição de Receita');
  const hs = d.cabecalhos.map(_finNorm_);
  const cn = hs.findIndex(h => /empreendimento|empresa|carteira/.test(h));
  const cr = hs.findIndex(h => h.indexOf('receita') >= 0);
  const cp = hs.findIndex(h => h.indexOf('%') >= 0 || h.indexOf('participacao') >= 0);
  if ([cn, cr, cp].some(i => i < 0)) throw new Error('Composição de Receita: contrato exige empreendimento/carteira, receita bruta faturada e participação %.');
  const itens = d.linhas.filter(l => !/^total\b/i.test(String(l[cn]).trim())).map((l, i) => {
    const p = _finNumero_(l[cp]), receita = _finNumero_(l[cr]);
    if (!String(l[cn]).trim() || p === null || receita === null || p < 0) throw new Error('Composição de Receita: linha ' + (d.linhaCabecalho + i + 1) + ' inválida.');
    return { nome: String(l[cn]), receita: String(l[cr]), p: p };
  });
  const soma = itens.reduce((a, b) => a + b.p, 0);
  if (!itens.length || soma < .98 || soma > 1.02) throw new Error('Composição de Receita: percentuais devem conciliar entre 98% e 102%; soma=' + (soma * 100).toFixed(2) + '%.');
  const c = _fmNovoSlide_('Composição de Receita', 'Participação na receita bruta faturada');
  _fmGraficoComposicao_(c, itens, soma); _fmRodape_(c);
}

function _fmGraficoComposicao_(c, itens, soma) {
  const palette = [c.DS.colors.brandMed, c.DS.colors.brandLight,
    c.DS.colors.brandSoft, c.DS.colors.accentGreen,
    c.DS.colors.accentOrange, c.DS.colors.textBody];
  const top = c.H * .22, left = c.m, chartW = c.W * .58, barH = Math.min(c.H * .065, c.H * .58 / itens.length);
  if (itens.length > 6) {
    itens.forEach((it, i) => {
      _rrUmaLinha_(c.slide, left, top + i * barH, chartW * .34, barH, it.nome,
        { fs: c.W * .011, fsMin: c.W * .011, bold: true,
          fonte: c.DS.typography.body, align: 'L' });
      const w = Math.max(1, chartW * .55 * it.p / Math.max.apply(null, itens.map(x => x.p)));
      const b = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, left + chartW * .35, top + i * barH + barH * .22, w, barH * .56);
      b.getFill().setSolidFill(i % 2 ? c.DS.colors.brandLight : c.DS.colors.brandMed); b.getBorder().setTransparent();
      _rrUmaLinha_(c.slide, left + chartW * .91, top + i * barH, chartW * .09, barH, (it.p * 100).toFixed(1).replace('.', ',') + '%',
        { fs: c.W * .010, fsMin: c.W * .010, bold: true,
          fonte: c.DS.typography.body });
    });
  } else {
    let x = left;
    itens.forEach((it, i) => { const w = chartW * it.p / soma; const b = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, top, w, c.H * .11); b.getFill().setSolidFill(palette[i % palette.length]); b.getBorder().setTransparent(); x += w; });
  }
  // No modo de muitas categorias os próprios rótulos das barras já são a
  // legenda; repetir todos à direita faria uma caixa estreita transbordar.
  const lx = c.W * .67, ly = top;
  (itens.length > 6 ? [] : itens).forEach((it, i) => {
    const sw = c.W * .018, yy = ly + i * c.H * .068;
    const s = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, yy + 5, sw, sw); s.getFill().setSolidFill(palette[i % palette.length]); s.getBorder().setTransparent();
    _rrUmaLinha_(c.slide, lx + sw + 5, yy, c.W * .20, c.H * .035, it.nome,
      { fs: c.W * .0105, fsMin: c.W * .0105, bold: true,
        fonte: c.DS.typography.body, align: 'L' });
    _rrUmaLinha_(c.slide, lx + sw + 5, yy + c.H * .03, c.W * .20, c.H * .03,
      it.receita + ' · ' + (it.p * 100).toFixed(1).replace('.', ',') + '%',
      { fs: c.W * .0095, fsMin: c.W * .0095, cor: c.DS.colors.textBody,
        fonte: c.DS.typography.body, align: 'L' });
  });
}
