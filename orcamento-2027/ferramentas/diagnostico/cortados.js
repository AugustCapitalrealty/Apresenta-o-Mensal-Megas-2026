// Gera os três Megas com a exportação completa dos modelos (12/10/2026) e lista
// os textos que saem cortados com "…": aba, original, como aparece e onde.
// Uso: node cortados.js <pasta teste>
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
  decks = {}; G._orcGerar_([chave]); G.aplicarPropostasTextos(); decks = {}; G._orcGerar_([chave]);
  console.log('\\n=== ' + cid.nome);
  Object.keys(G._ORC_TEXTOS_USADOS).map(k => G._ORC_TEXTOS_USADOS[k]).filter(r => /…$/.test(r.exibido)).forEach(r =>
    console.log(JSON.stringify([r.aba, r.original, r.exibido, Math.round(r.cabe), Object.keys(r.onde).join(' / ')])));
});
`;
eval(src + diag);
