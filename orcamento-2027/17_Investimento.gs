/**
 * ARQUIVO: 17_Investimento.gs
 * SLIDE:   Manutenção: projetos × custo recorrente — a alta da
 *          manutenção é custo de manter ou projeto pontual? Nasceu como
 *          sugestão e foi aprovado pelo gestor (05/10/2026); a
 *          classificação dos itens está em 05_DadosSugestoes.gs
 *          (_orcClassificarManutencao_).
 */

// O que entra em cada grupo, em palavras de quem lê o slide — vai na faixa de
// legenda embaixo dos cards (pedido do gestor, 06/10/2026: "vai gerar
// dúvidas"). Mesma ordem de classManut.grupos.
const ORC_GRUPOS_MANUT_LEGENDA = [
  'Serviço com contrato fechado com o fornecedor (vem das planilhas de contratos ou da tag [CONTRATO]).',
  'Sem contrato, mas se repete em 6 meses ou mais do ano (ex.: provisões).',
  'Serviço em poucos meses do ano para manter o que já existe (pintura, revisão, lavagem).',
  'Obra ou compra nova, que não existia antes (implantação, instalação, compra, plantio).'
];

function gerarSlideInvestimento_(slide, W, H, cid, rel, classManut) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const cls = classManut, proj = cls.projetos;
  const manut = rel.contas.filter(c => c.chave === _orcChaveConta_('Manutenção de imóveis'))[0];
  _orcHeader_(slide, W, 'Manutenção: projetos × custo recorrente',
    _orcCompacto_(cls.total) + ' · ' + _orcCompacto_(proj.total) + ' (' + _orcPct_(cls.total ? proj.total / cls.total : 0) +
    ') são projetos pontuais · ' + cid.nome);

  // Embaixo dos cards, a faixa que explica cada grupo (hLeg).
  const hLeg = 44;
  const ty = 72, gap = 10, lw = 250, rx = MX + lw + gap, rw = W - MX - rx, bh = H - 28 - ty - hLeg - 6;
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
  // Tudo menos os projetos: o que o Mega gasta para continuar funcionando.
  _orcUmaLinha_(slide, MX + 12, by + 6, lw - 24, 13, 'CUSTO PARA MANTER O MEGA RODANDO',
    { align: 'L', fs: 7, bold: true, cor: C.textBody, fonte: DS.typography.titles, fsMin: 6 });
  _orcUmaLinha_(slide, MX + 12, by + 19, lw - 24, 24, _orcMoeda_(semProj),
    { align: 'L', fs: 16, bold: true, cor: C.brandDark, fonte: DS.typography.titles, fsMin: 10 });
  // O ritmo é a conta inteira de 2026 — com os projetos de 2026, que a
  // METRAGEM não separa. Dito no slide para a comparação não enganar.
  const txt = 'Contratos + recorrente + manutenção pontual (tudo menos os projetos).' + (manut
    ? ' Ritmo ' + a.ritmo + ' da conta inteira: ' + _orcMoeda_(manut.v.ritmo) + ' (' +
      _orcVariacao_(manut.v.ritmo, semProj).texto + ') — o ritmo inclui os projetos de ' + a.ritmo +
      ', que o relatório não separa.'
    : '');
  _orcParagrafo_(slide, MX + 12, by + 44, lw - 20, ty + bh - by - 48, txt, { fs: 7, fsMin: 6, cor: C.textBody });

  // Tabela dos projetos.
  _orcCard_(slide, rx, ty, rw, bh, 'Projetos — do maior para o menor');
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

  // Legenda: o que é cada grupo, na cor da barra.
  const ly = ty + bh + 6, lgw = (W - MX * 2 - gap * 3) / 4;
  cls.grupos.forEach((g, i) => {
    const x = MX + i * (lgw + gap);
    _orcRet_(slide, x, ly, lgw, hLeg, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, x + 8, ly + 7, 8, 8, cores[i], { redondo: true });
    _orcUmaLinha_(slide, x + 20, ly + 4, lgw - 26, 14, g.nome,
      { align: 'L', fs: 7, bold: true, cor: C.textMain, fonte: DS.typography.titles, fsMin: 6, cortar: true });
    _orcParagrafo_(slide, x + 6, ly + 17, lgw - 10, hLeg - 19, ORC_GRUPOS_MANUT_LEGENDA[i] || '',
      { fs: 6.5, fsMin: 5.5, cor: C.textBody, espac: 100 });
  });

  _orcRodape_(slide, W, H, 'Cada item cai no primeiro grupo que servir, nesta ordem: contrato → recorrente (6+ meses) → ' +
    'projeto (palavra de obra nova na descrição) → pontual · ' + cid.nome);
}
