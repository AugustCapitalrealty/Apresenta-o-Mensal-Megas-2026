// Gera a abertura do deck de Facilities com as exportações novas e lista os
// textos com "IPTU" e os cortados com "…". Uso: node facilities_iptu.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
[['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
  const cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
  cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
});
decks = {};
G.gerarFacilitiesAbertura();
const deck = Object.keys(decks).map(k => decks[k]).filter(d => d.getSlides().length > 1)[0];
deck.getSlides().forEach((s, i) => {
  const ts = s.shapes.filter(r => r.texto).map(r => r.texto);
  const tit = ts[0] || '';
  ts.filter(t => /IPTU|…$/.test(t)).forEach(t => console.log((i + 1) + ' [' + tit.slice(0, 40) + '] ' + t));
});
`;
eval(src + diag);
