/**
 * ARQUIVO: 18_CustoM2.gs
 * SLIDE:   Custo por m² ao mês — as 10 maiores contas pelo Orç do ano e a
 *          área implícita. Nasceu como sugestão e foi aprovado pelo gestor
 *          (05/10/2026); os números vêm de _orcM2PorConta_ (05_DadosSugestoes.gs).
 */

function gerarSlideCustoM2_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos;
  const d = _orcM2PorConta_(rel);
  const vt = _orcVariacao_(d.total.m2.ritmo, d.total.m2.orc, 0.005);
  const vArea = d.area.ritmo && d.area.orc ? d.area.orc / d.area.ritmo - 1 : null;
  _orcHeader_(slide, W, 'Custo por m² ao mês, ' + a.real + ' → ' + a.orc,
    'O Mega está mais caro ou só maior? · ' + cid.nome + ' · R$/m² ao mês');

  const linha = (l, tipo) => {
    const v = _orcVariacao_(l.m2.ritmo, l.m2.orc, 0.005);
    return { tipo: tipo, nome: l.nome, revisar: !!l.chaves && _orcRevisarDe_(rel, l.chaves).length > 0, celulas: [
      { texto: _orcM2_(l.m2.real) }, { texto: _orcM2_(l.m2.orcAnt) }, { texto: _orcM2_(l.m2.ritmo) },
      { texto: _orcM2_(l.m2.orc), bold: true }, { texto: v.texto, sentido: v.sentido }] };
  };
  const linhas = [linha(d.total, 'total')].concat(d.linhas.map(l => linha(l, 'item')));
  linhas.push({ tipo: 'm2', nome: 'Área implícita (m²)', celulas: ['real', 'orcAnt', 'ritmo', 'orc'].map(k =>
    ({ texto: d.area[k] ? _orcMilhar_(d.area[k]) : '–' })).concat([
    { texto: vArea != null ? (vArea >= 0 ? '▲ ' : '▼ ') + Math.round(Math.abs(vArea) * 100) + '%' : '–' }]) });

  const tw = W - MX * 2, labW = 200, numW = (tw - labW) / 5;
  const th = Math.min(H - 28 - 72 - 70, 16 * (linhas.length + 1) + 29);
  const yFim = _orcTabelaNum_(slide, MX, 72, tw, th, [
    { titulo: 'R$/M² AO MÊS', w: labW },
    { titulo: 'REAL ' + a.real, w: numW }, { titulo: 'ORÇ ' + a.orcAnt, w: numW },
    { titulo: 'RITMO ' + a.ritmo, w: numW }, { titulo: 'ORÇ ' + a.orc, w: numW, destaque: true },
    { titulo: 'Δ% × RITMO', w: numW }
  ], linhas, null);

  // Nota em card baixo: é uma frase só; esticada até o rodapé fica vazia.
  const ny = yFim + 12, nh = Math.min(H - 28 - ny, 52);
  if (nh > 30 && vArea != null) {
    _orcRet_(slide, MX, ny, tw, nh, C.cardBg, { redondo: true, borda: C.lines });
    _orcRet_(slide, MX, ny, 4, nh, C.brandLight);
    _orcParagrafo_(slide, MX + 14, ny + 6, tw - 24, nh - 12,
      'A área implícita cresce ' + _orcPct_(vArea) + ' e o custo por m² ' + vt.texto.replace('▲ ', 'sobe ').replace('▼ ', 'cai ') +
      ' contra o Ritmo ' + a.ritmo + '. Área implícita = total ÷ R$/m² ÷ 12 da METRAGEM — confirmar com a ABL oficial antes de usar.',
      { fs: 8.5, fsMin: 6.5, cor: C.textBody, meio: true });
  }

  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND — ' + cid.nome + ' · comparação com os outros Megas quando Itajaí e Esteio estiverem configurados');
}
