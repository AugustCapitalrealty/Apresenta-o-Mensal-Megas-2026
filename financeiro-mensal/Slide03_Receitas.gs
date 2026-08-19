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
  const ref = _dcReferencia_();
  return _dsNovoSlideClaro_({
    entidade: 'Resultados Financeiros',
    topico: titulo + ' – ' + ref.texto,
    fonte: subtitulo || '',
    conteudoY: .16
  });
}

function _fmRodape_(c) {
  // Compatibilidade com os entrypoints antigos: o shell já desenha o rodapé
  // e a logo oficial uma única vez.
  return c.logo;
}

function _fmTabelaComparativa_(c, modelo, despesas) {
  const headers = ['Empreendimento', 'Real 2025', 'Orçado 2026', 'Real 2026', 'Var. ano ant.', 'Var. orçamento'];
  const colunasComparativas = headers.map(_rrEhCabecalhoComparativo_);
  const rows = modelo.linhas, x = c.m, y0 = c.H * .19, totalW = c.W - c.m * 2;
  const ws = [totalW * .28].concat(Array(5).fill(totalW * .144));
  const hHead = c.H * .095;
  const h = Math.min(c.H * .075,
    ((c.tableBottom || c.H * .875) - y0 - hHead) / Math.max(1, rows.length));
  const fsHeader = c.W * c.DS.typography.scale.tableHeader;
  const fsBody = c.W * c.DS.typography.scale.tableBodyRegular;
  if (h <= fsBody * 1.18) throw new Error('Comparativo manual sem altura para a fonte institucional.');
  let xx = x;
  headers.forEach((v, i) => {
    _rrCelula_(c.slide, xx, y0, ws[i], hHead, c.DS.colors.tableHeader);
    _rrBloco_(c.slide, xx, y0, ws[i], hHead, _rrFormatarCabecalhoTabela_(v),
      { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
        fonte: c.DS.typography.titles, folga: _RR_RECUO_TEXTBOX / 2 });
    xx += ws[i];
  });
  rows.forEach((r, ri) => {
    const vals = [r.nome, r.anterior, r.orcado, r.real, r.varAnterior.texto, r.varOrcado.texto]; xx = x;
    vals.forEach((v, i) => {
      const bg = ri % 2 ? c.DS.colors.tableStripe : null;
      const valorComparativo = i === 4 ? r.varAnterior.valor : (i === 5 ? r.varOrcado.valor : null);
      const cor = colunasComparativas[i]
        ? _rrCorValorComparativo_(valorComparativo, c.DS.colors.textMain, false,
          despesas ? 'despesa' : 'matematico')
        : c.DS.colors.textMain;
      _rrCelula_(c.slide, xx, y0 + hHead + ri * h, ws[i], h, bg);
      _rrUmaLinha_(c.slide, xx + (i === 0 ? 4 : 0), y0 + hHead + ri * h, ws[i] - (i === 0 ? 4 : 0), h, v,
        { fs: fsBody, fsMin: fsBody, bold: i === 0 || i >= 4, cor: cor,
          fonte: c.DS.typography.body, align: i === 0 ? 'L' : 'C' });
      xx += ws[i];
    });
  });
}
