// Gera os três Megas (deck por Mega e deck único de Facilities, com a abertura) com os dados de uma atualização e
// grava o manifesto das molduras usadas — para node ferramentas/molduras_imagem.js desenhar as que faltam.
// Uso: node molduras_dados.js <pasta teste> <saida.json> [sufixo das fixtures, ex.: _1956] [cadastro, ex.: rev02]
const fs = require('fs'), path = require('path');
const [TESTE, SAIDA, SUF, CAD] = process.argv.slice(2);
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
const suf = ${JSON.stringify(SUF || '')}, cad = ${JSON.stringify(CAD || 'rev01')};
const f = n => fixture(n) || fixture(n.replace(suf, ''));
porId[G.ORC_MODELO_090_ID] = f('fixture_090_megas_2027' + suf + '.json');
porId[G.ORC_MODELO_070_ID] = f('fixture_070_megas_2027' + suf + '.json');
porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_' + cad + '.json');
[['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
  const cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID; cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = f('fixture_metragem_' + c + suf + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
});
['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(k => { decks = {}; G._orcGerar_([k]); G.aplicarPropostasTextos(); decks = {}; G._orcGerar_([k]); });
['ABERTURA', 'ESTEIO', 'ITAJAI', 'CURITIBA'].forEach(p => { try { G._orcGerarFacilities_(p); } catch (e) { console.log('Facilities ' + p + ': ' + e.message); } });
fs.writeFileSync(SAIDA, JSON.stringify(G._ORC_MOLDURAS_USADAS, null, 1));
console.log(Object.keys(G._ORC_MOLDURAS_USADAS).length + ' molduras usadas → ' + SAIDA);
`;
eval(src + diag);
