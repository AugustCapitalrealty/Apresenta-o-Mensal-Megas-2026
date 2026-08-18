/** SLIDE 06 — VACÂNCIA. Única fonte: obterVacancia_(). */
function gerarSlideVacancia() {
  const d = obterVacancia_(); _fmExigirBloco_(d, 'Vacância');
  const hs = d.cabecalhos.map(_finNorm_), idx = termo => hs.findIndex(h => h.indexOf(termo) >= 0);
  const cn = idx('empreendimento'), cc = idx('area construida'), co = idx('area ocupada'), cd = idx('area disponivel'), cv = idx('vacancia fisica');
  if ([cn, cc, co, cd, cv].some(i => i < 0)) throw new Error('Vacância: contrato exige empreendimento, áreas construída locável, ocupada e disponível e vacância física.');
  const rows = d.linhas.filter(l => !/nao locavel|não locável/i.test(String(l[cn])) && !/^total\b/i.test(String(l[cn]).trim())).map((l, i) => {
    const a = _finNumero_(l[cc]), o = _finNumero_(l[co]), disp = _finNumero_(l[cd]), v = _finNumero_(l[cv]);
    if (!String(l[cn]).trim() || [a, o, disp, v].some(x => x === null)) throw new Error('Vacância: linha ' + (d.linhaCabecalho + i + 1) + ' incompleta.');
    if (Math.abs(o + disp - a) > Math.max(1, Math.abs(a) * .001)) throw new Error('Vacância: áreas de "' + l[cn] + '" não conciliam (ocupada + disponível != construída locável).');
    return { nome: String(l[cn]), area: String(l[cc]), ocupada: String(l[co]), disponivel: String(l[cd]), vacancia: String(l[cv]), v: v };
  });
  if (!rows.length) throw new Error('Vacância: nenhuma área locável válida para apresentar.');
  const c = _fmNovoSlide_('Vacância', 'Posição da vacância física · somente áreas locáveis');
  _fmVacanciaDesenhar_(c, rows); _fmRodape_(c);
}

function _fmVacanciaDesenhar_(c, rows) {
  const top = c.H * .21, chartW = c.W * .36, rh = Math.min(c.H * .075, c.H * .60 / rows.length);
  rows.forEach((r, i) => {
    const y = top + i * rh;
    _rrUmaLinha_(c.slide, c.m, y, chartW * .38, rh, r.nome, { fs: c.W * .0105, bold: true, align: 'L' });
    const bg = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, c.m + chartW * .39, y + rh * .25, chartW * .46, rh * .5); bg.getFill().setSolidFill('#DBEAFE'); bg.getBorder().setTransparent();
    const fg = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, c.m + chartW * .39, y + rh * .25, Math.max(1, chartW * .46 * Math.min(1, r.v)), rh * .5); fg.getFill().setSolidFill('#6D5BD0'); fg.getBorder().setTransparent();
    _rrUmaLinha_(c.slide, c.m + chartW * .86, y, chartW * .14, rh, r.vacancia, { fs: c.W * .0105, bold: true });
  });
  const x = c.W * .45, totalW = c.W * .515, ws = [totalW * .31, totalW * .23, totalW * .23, totalW * .23];
  const heads = ['Empreendimento', 'Área construída', 'Ocupada', 'Disponível']; let xx = x;
  heads.forEach((h, i) => { _rrCelula_(c.slide, xx, top, ws[i], c.H * .09, c.DS.colors.brandDark); _rrBloco_(c.slide, xx, top, ws[i], c.H * .09, h, { fs: c.W * .010, bold: true, cor: '#FFF' }); xx += ws[i]; });
  rows.forEach((r, ri) => { xx = x; [r.nome, r.area, r.ocupada, r.disponivel].forEach((v, i) => { _rrCelula_(c.slide, xx, top + c.H * .09 + ri * rh, ws[i], rh, ri % 2 ? '#F1F5F9' : '#FFF'); _rrUmaLinha_(c.slide, xx + (i ? 0 : 3), top + c.H * .09 + ri * rh, ws[i] - (i ? 0 : 3), rh, v, { fs: c.W * .010, bold: i === 0, align: i ? 'C' : 'L' }); xx += ws[i]; }); });
}
