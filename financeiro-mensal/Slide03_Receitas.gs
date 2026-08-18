/** SLIDE 03 — RECEITAS. Única fonte: obterReceitas_(), em 02_Dados.gs. */
function gerarSlideReceitas() {
  const dados = obterReceitas_();
  const modelo = _fmComparativo_(dados, 'Receitas');
  const ctx = _fmNovoSlide_('Receitas', _fmUnidade_(dados, 'Real 2025'));
  _fmTabelaComparativa_(ctx, modelo, false);
  _fmRodape_(ctx);
  Logger.log('Slide "Receitas" gerado — ' + modelo.linhas.length + ' empreendimento(s).');
}

// Helpers compartilhadas apenas pelos cinco slides financeiros. O prefixo
// _fm evita colisões no namespace global do Apps Script.
function _fmComparativo_(dados, nome) {
  _fmExigirBloco_(dados, nome);
  const hs = dados.cabecalhos.map(_finNorm_);
  const achar = termo => hs.findIndex(h => h.indexOf(termo) >= 0);
  const cNome = hs.findIndex(h => h.indexOf('empreendimento') >= 0 || h.indexOf('empresa') >= 0);
  const c25 = achar('real 2025'), cOrc = hs.findIndex(h => h.indexOf('orc 2026') >= 0), c26 = achar('real 2026');
  if ([cNome, c25, cOrc, c26].some(c => c < 0)) throw new Error(nome + ': contrato inválido; são obrigatórios Empreendimento, Real 2025, Orçado 2026 e Real 2026.');
  const linhas = dados.linhas.filter(l => !/^total\b/i.test(String(l[cNome]).trim())).map((l, i) => {
    const a = _finNumero_(l[c25]), o = _finNumero_(l[cOrc]), r = _finNumero_(l[c26]);
    if (!String(l[cNome]).trim() || [a, o, r].some(v => v === null)) throw new Error(nome + ': linha ' + (dados.linhaCabecalho + i + 1) + ' sem nome ou base numérica comparável.');
    return { nome: String(l[cNome]), anterior: String(l[c25]), orcado: String(l[cOrc]), real: String(l[c26]),
      varAnterior: _fmVariacao_(r, a), varOrcado: _fmVariacao_(r, o) };
  });
  if (!linhas.length) throw new Error(nome + ': contrato inválido; não há empreendimentos além da linha TOTAL.');
  return { linhas: linhas };
}

function _fmVariacao_(real, comparador) {
  if (comparador === 0) return { texto: 'N/C', valor: null };
  const v = real / comparador - 1;
  return { texto: (v > 0 ? '+' : '') + (v * 100).toFixed(1).replace('.', ',') + '%', valor: v };
}

function _fmExigirBloco_(d, nome) {
  if (!d || !Array.isArray(d.cabecalhos) || !Array.isArray(d.linhas) || !d.cabecalhos.length || !d.linhas.length)
    throw new Error(nome + ': leitor não atendeu ao contrato {cabecalhos, linhas} não vazios.');
}

function _fmUnidade_(dados, pista) {
  const h = dados.cabecalhos.find(x => _finNorm_(x).indexOf(_finNorm_(pista)) >= 0) || '';
  const m = String(h).match(/\(([^)]+)\)|\b(R\$\s*(?:mil|mi|milhão|milhoes)?|m²|%)\b/i);
  return m ? 'Unidade: ' + (m[1] || m[2]) : 'Valores conforme unidade do bloco de origem';
}

function _fmNovoSlide_(titulo, subtitulo) {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), DS = CR_DESIGN_SYSTEM, m = W * .035;
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  const e = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W * .72, -H * .35, W * .48, W * .48);
  e.getFill().setSolidFill(DS.colors.brandLight, .045); e.getBorder().setTransparent();
  _rrUmaLinha_(slide, m, H * .045, W * .68, H * .075, titulo, { fs: W * .029, bold: true, cor: DS.colors.brandDark, align: 'L', folga: 0 });
  _rrUmaLinha_(slide, m, H * .12, W * .68, H * .045, subtitulo, { fs: W * .012, cor: DS.colors.textBody, fonte: DS.typography.body, align: 'L', folga: 0 });
  return { deck: deck, slide: slide, W: W, H: H, DS: DS, m: m };
}

function _fmRodape_(c) {
  const y = c.H * .94;
  const line = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, c.m, y, c.W - c.m * 2, .8);
  line.getFill().setSolidFill(c.DS.colors.lines); line.getBorder().setTransparent();
  try { c.slide.insertImage(DriveApp.getFileById(c.DS.assets.logoId).getBlob(), c.W - c.m - c.DS.assets.logoW * .68, y + 4, c.DS.assets.logoW * .68, c.DS.assets.logoH * .68); }
  catch (e) { Logger.log('Financeiro mensal: logo não carregado. ' + e.message); }
}

function _fmTabelaComparativa_(c, modelo, despesas) {
  const headers = ['Empreendimento', 'Real 2025', 'Orçado 2026', 'Real 2026', 'Var. ano ant.', 'Var. orçamento'];
  const rows = modelo.linhas, x = c.m, y0 = c.H * .205, totalW = c.W - c.m * 2;
  const ws = [totalW * .28].concat(Array(5).fill(totalW * .144));
  const hHead = c.H * .095, h = Math.min(c.H * .075, c.H * .66 / (rows.length + 1));
  let xx = x;
  headers.forEach((v, i) => { _rrCelula_(c.slide, xx, y0, ws[i], hHead, c.DS.colors.brandDark); _rrBloco_(c.slide, xx, y0, ws[i], hHead, v, { fs: c.W * .011, bold: true, cor: '#FFFFFF' }); xx += ws[i]; });
  rows.forEach((r, ri) => {
    const vals = [r.nome, r.anterior, r.orcado, r.real, r.varAnterior.texto, r.varOrcado.texto]; xx = x;
    vals.forEach((v, i) => {
      let bg = ri % 2 ? '#F1F5F9' : '#FFFFFF', cor = c.DS.colors.textMain;
      if (i >= 4 && (i === 4 ? r.varAnterior.valor : r.varOrcado.valor) !== null) {
        const variacao = i === 4 ? r.varAnterior.valor : r.varOrcado.valor;
        const favoravel = despesas ? variacao < 0 : variacao > 0;
        bg = favoravel ? '#DCFCE7' : (variacao === 0 ? bg : '#FEE2E2'); cor = favoravel ? '#047857' : (variacao === 0 ? cor : '#B91C1C');
      }
      _rrCelula_(c.slide, xx, y0 + hHead + ri * h, ws[i], h, bg);
      _rrUmaLinha_(c.slide, xx + (i === 0 ? 4 : 0), y0 + hHead + ri * h, ws[i] - (i === 0 ? 4 : 0), h, v,
        { fs: c.W * .011, bold: i === 0 || i >= 4, cor: cor, align: i === 0 ? 'L' : 'C' }); xx += ws[i];
    });
  });
}
