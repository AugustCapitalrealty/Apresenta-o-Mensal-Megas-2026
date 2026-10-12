// Geração dos três Megas com o que vale em 13/10/2026: modelos de todas as unidades (12/10) +
// cadastro de contratos rev01. Lista falhas, textos cortados, avisos do slide de revisão e totais.
// Uso: node geracao_final.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
const textos = s => s.shapes.filter(r => r.texto).map(r => r.texto);
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_rev01.json');
[['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
  const cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
  cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  decks = {}; G._orcGerar_([chave]); G.aplicarPropostasTextos(); decks = {}; G._orcGerar_([chave]);
  const sl = decks[cid.deckId].getSlides();
  const falhas = sl.filter(s => textos(s).some(t => t.indexOf('Falha ao gerar') === 0)).length;
  const cortados = []; sl.forEach(s => textos(s).forEach(t => { if (/…$/.test(t)) cortados.push(t); }));
  const vis = G._orcLerVisaoGeral_(chave), rel = vis.rel;
  const pend = G._orcPendencias_(cid, rel, vis.mensal, vis.modelos);
  const seg = rel.contas.filter(x => x.chave === G._orcChaveConta_('Segurança e vigilância'))[0];
  console.log(cid.nome + ': ' + sl.length + ' slides · falhas ' + falhas + ' · cortados ' + cortados.length + (cortados.length ? ' (' + cortados.join(' | ') + ')' : '') +
    ' · Orç 2027 ' + G._orcMoeda_(rel.total.orc) + ' · Segurança ' + G._orcMoeda_(seg.v.orc));
  pend.filter(p => !/ajustado|Mês a mês/.test(p.tipo)).forEach(p => console.log('   aviso: [' + p.tipo + '] ' + p.nome + ' — ' + p.texto));
});
`;
eval(src + diag);
