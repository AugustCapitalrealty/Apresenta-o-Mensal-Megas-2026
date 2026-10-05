/**
 * ARQUIVO: 17_Investimento.gs
 * SLIDE:   Manutenção: investimento × custo recorrente — a alta da
 *          manutenção é custo de manter ou projeto pontual? Nasceu como
 *          sugestão e foi aprovado pelo gestor (05/10/2026); a
 *          classificação dos itens está em 05_DadosSugestoes.gs
 *          (_orcClassificarManutencao_).
 */

function gerarSlideInvestimento_(slide, W, H, cid, rel, classManut) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const cls = classManut, proj = cls.projetos;
  const manut = rel.contas.filter(c => c.chave === _orcChaveConta_('Manutenção de imóveis'))[0];
  _orcHeader_(slide, W, 'Manutenção: investimento × custo recorrente',
    _orcCompacto_(cls.total) + ' · ' + _orcCompacto_(proj.total) + ' (' + _orcPct_(cls.total ? proj.total / cls.total : 0) +
    ') são projetos pontuais · ' + cid.nome);

  const ty = 72, gap = 10, lw = 250, rx = MX + lw + gap, rw = W - MX - rx, bh = H - 28 - ty;
  _orcCard_(slide, MX, ty, lw, bh, 'Composição do Orç ' + a.orc);
  const cores = [C.brandDark, C.brandMed, C.brandLight, C.brandSoft];
  const maxG = Math.max.apply(null, cls.grupos.map(g => g.total)) || 1;
  cls.grupos.forEach((g, i) => {
    const y = ty + 26 + i * 34;
    _orcUmaLinha_(slide, MX + 12, y, lw - 24, 13, g.nome + ' · ' + g.itens.length + ' itens',
      { align: 'L', fs: 7.5, bold: true, cor: C.textMain, fonte: DS.typography.titles, cortar: true });
    _orcRet_(slide, MX + 12, y + 15, Math.max(2, (lw - 110) * g.total / maxG), 10, cores[i]);
    _orcUmaLinha_(slide, MX + lw - 12 - 84, y + 11, 84, 16, _orcCompacto_(g.total) + ' · ' + _orcPct_(cls.total ? g.total / cls.total : 0),
      { align: 'R', fs: 7.5, bold: true, cor: C.textBody, fonte: DS.typography.body, fsMin: 6 });
  });
  const by = ty + 26 + 4 * 34 + 6;
  _orcLinha_(slide, MX + 12, by, MX + lw - 12, by, C.lines, 0.75);
  const semProj = cls.total - proj.total;
  _orcUmaLinha_(slide, MX + 12, by + 6, lw - 24, 13, 'SEM OS PROJETOS', { align: 'L', fs: 7, bold: true, cor: C.textBody, fonte: DS.typography.titles });
  _orcUmaLinha_(slide, MX + 12, by + 19, lw - 24, 24, _orcMoeda_(semProj),
    { align: 'L', fs: 16, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 10 });
  if (manut) {
    const vv = _orcVariacao_(manut.v.ritmo, semProj);
    _orcParagrafo_(slide, MX + 12, by + 44, lw - 20, ty + bh - by - 50,
      'Contra ' + _orcMoeda_(manut.v.ritmo) + ' no Ritmo ' + a.ritmo + ' (' + vv.texto + '). A alta da manutenção ' +
      'vem dos projetos; o custo de manter fica ' + (semProj <= manut.v.ritmo ? 'abaixo' : 'acima') + ' do ritmo.',
      { fs: 7.5, fsMin: 6, cor: C.textBody });
  }

  // Tabela dos projetos.
  _orcCard_(slide, rx, ty, rw, bh, 'Projetos / investimento — do maior para o menor');
  const disp = bh - 30 - 18, maxL = Math.floor(disp / 14) - 1;
  let itens = proj.itens.slice(), resto = null;
  if (itens.length > maxL) {
    const fora = itens.slice(maxL - 1);
    resto = { n: fora.length, total: fora.reduce((s, it) => s + it.total, 0) };
    itens = itens.slice(0, maxL - 1);
  }
  const linhas = itens.map(it => ({ celulas: [
    { texto: it.descricao, aba: 'Sugestões' }, { texto: it.categoria, cor: C.textBody, fs: 6.5 },
    { texto: _orcQuando_(it.meses), cor: C.textBody, fs: 7 }, { texto: _orcMoeda_(it.total), bold: true }] }));
  if (resto) linhas.push({ celulas: [{ texto: '+ ' + resto.n + ' itens menores', cor: C.textBody }, null, null,
                                     { texto: _orcMoeda_(resto.total), bold: true }] });
  linhas.push({ total: true, celulas: [{ texto: 'TOTAL PROJETOS' }, null, null, { texto: _orcMoeda_(proj.total) }] });
  _orcTabela_(slide, rx + 8, ty + 22, rw - 16, [
    { titulo: 'Item', w: null, align: 'L' }, { titulo: 'Categoria', w: 92, align: 'L' },
    { titulo: 'Entrega', w: 52, align: 'C' }, { titulo: 'Valor', w: 70, align: 'C' }
  ], linhas, Math.min(16, disp / linhas.length), { hCab: 16 });

  _orcRodape_(slide, W, H, 'Critério: contrato → recorrente (6+ meses) → projeto (implantação, instalação, compra, ' +
    'defensas, melhoria, plantio) → pontual');
}
