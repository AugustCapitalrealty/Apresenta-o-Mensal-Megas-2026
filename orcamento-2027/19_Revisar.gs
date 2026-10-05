/**
 * ARQUIVO: 19_Revisar.gs
 * SLIDE:   "Revisar antes da versão final" — logo depois da capa, só quando os
 *          relatórios da controladoria divergem entre si (rel.avisos). E o
 *          selo ⚠ REVISAR no canto dos slides cujos números passam pela conta
 *          divergente, com a linha da conta destacada nas tabelas.
 *
 * Nada disso é para a reunião: corrigida a planilha da controladoria, a
 * geração seguinte não acha divergência e o slide e os selos somem sozinhos.
 */

const _ORC_COR_REVISAR = { fundo: '#FFEDD5', borda: '#F97316', texto: '#9A3412', card: '#FFF7ED' };

// Divergências (rel.revisar) que tocam alguma das chaves. Sem chaves: todas —
// é o caso dos slides com o total geral, que soma toda conta.
function _orcRevisarDe_(rel, chaves) {
  const lista = (rel && rel.revisar) || [];
  if (!chaves) return lista;
  return lista.filter(r => chaves.indexOf(r.chave) >= 0);
}

// Selo laranja abaixo do logo, à direita do subtítulo (que termina 136 pt
// antes da margem — ver _orcHeader_).
function _orcSeloRevisar_(slide, W, rel, chaves) {
  const lista = _orcRevisarDe_(rel, chaves);
  if (!lista.length) return;
  const DS = CR_DESIGN_SYSTEM, w = 130, x = W - DS.layout.marginX - w, y = 47;
  _orcRet_(slide, x, y, w, 14, _ORC_COR_REVISAR.borda, { redondo: true });
  _orcUmaLinha_(slide, x, y, w, 14, '⚠ REVISAR · ' + lista.map(r => r.nome).join(', '),
    { align: 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6, fsMin: 5, cortar: true });
}

// Em que slides a conta aparece pelo nome (o total geral está em quase todos).
function _orcOndeAparece_(rel, r) {
  const onde = ['DRE'];
  const conta = rel.contas.filter(c => c.chave === r.chave)[0] ||
                { v: r.chave === _orcChaveConta_('IPTU') ? rel.iptu : rel.seguro };
  const delta = conta.v.orc - conta.v.ritmo;
  if (Math.abs(delta) >= ORC_OFENSOR_MINIMO) onde.push(delta > 0 ? 'Ofensores' : 'Defensores');
  if (_orcPonte_(rel, null).degraus.some(d => d.chave === r.chave)) onde.push('Ponte');
  if (ORC_CONTAS_DETALHE.some(n => _orcChaveConta_(n) === r.chave)) onde.push('Linha a linha');
  if (_orcM2PorConta_(rel).linhas.some(l => l.chaves && l.chaves.length === 1 && l.chaves[0] === r.chave)) onde.push('Custo por m²');
  return onde.join(', ');
}

function gerarSlideRevisar_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const tw = W - MX * 2;
  _orcHeader_(slide, W, 'Revisar antes da versão final',
    cid.nome + ' · os relatórios da controladoria não fecham entre si · este slide não vai para a reunião');

  // Card com o que fazer.
  const ky = 74, kh = 42;
  _orcRet_(slide, MX, ky, tw, kh, _ORC_COR_REVISAR.card, { redondo: true, borda: _ORC_COR_REVISAR.borda });
  _orcRet_(slide, MX, ky, 4, kh, _ORC_COR_REVISAR.borda);
  _orcParagrafo_(slide, MX + 14, ky + 4, tw - 24, kh - 8,
    'O deck usa a METRAGEM-COND. Os slides com estes números levam o selo ⚠ REVISAR e a linha da conta em laranja. ' +
    'Confirmar com a controladoria qual relatório está certo; corrigida a planilha, gere de novo — o selo e este slide somem.',
    { fs: 8.5, fsMin: 6.5, cor: _ORC_COR_REVISAR.texto, meio: true });

  let y = ky + kh + 14;
  if (rel.revisar.length) {
    const linhas = rel.revisar.map(r => {
      const d = r.mensal - r.metragem;
      return { tipo: 'item', nome: r.nome, celulas: [
        { texto: _orcMoeda_(r.mensal) }, { texto: _orcMoeda_(r.metragem), bold: true },
        { texto: (d >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(d)), sentido: d > 0 ? 1 : -1 },
        { texto: (d >= 0 ? '+' : '−') + _orcPct_(Math.abs(r.metragem ? d / r.metragem : 0)) },
        { texto: _orcOndeAparece_(rel, r) }] };
    });
    const labW = 120, ondeW = 180, numW = (tw - labW - ondeW) / 4;
    y = _orcTabelaNum_(slide, MX, y, tw, 16 + 15 * linhas.length, [
      { titulo: 'ORÇ ' + rel.anos.orc + ' — CONTA', w: labW },
      { titulo: 'MENSAL (12 MESES)', w: numW }, { titulo: 'METRAGEM (NO DECK)', w: numW, destaque: true },
      { titulo: 'DIFERENÇA', w: numW }, { titulo: 'DIF. %', w: numW },
      { titulo: 'ONDE A CONTA APARECE', w: ondeW, align: 'L' }
    ], linhas, null) + 14;
  }

  // Divergências de soma da própria METRAGEM (não são de conta: vão em texto).
  const outros = rel.avisos.filter(a => !/^Mensal ≠ METRAGEM/.test(a));
  outros.slice(0, 8).forEach((a, i) => {
    _orcUmaLinha_(slide, MX, y + i * 13, tw, 13, '⚠ ' + a,
      { align: 'L', fs: 7.5, bold: true, cor: C.accentRed, fonte: DS.typography.body, fsMin: 6, cortar: true });
  });

  _orcRodape_(slide, W, H, 'Conferência: soma dos 12 meses do Orç ' + rel.anos.orc + ' na Despesas-Mensal × Orç ' +
    rel.anos.orc + ' da METRAGEM-COND, conta a conta (_orcConferirMensal_) · ' + cid.nome);
}
