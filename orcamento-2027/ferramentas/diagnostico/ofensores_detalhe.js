// Contas dos slides Ofensores/Defensores de cada Mega, com o DETALHAMENTO de hoje (maior item).
// Uso: node ofensores_detalhe.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
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
  const v = G._orcLerVisaoGeral_(chave), q = G._orcOfensores_(v.rel);
  console.log('== ' + cid.nome);
  [['OF', q.ofensores], ['DEF', q.defensores]].forEach(([t, b]) => b.contas.forEach(x => {
    const it = G._orcItensDaConta_(v.modelos, x.chave)[0];
    console.log('  ' + t + ' ' + x.nome.padEnd(40) + ' Δ ' + String(Math.round(x.delta)).padStart(9) + ' | ' + (it ? it.descricao.slice(0, 70) + ' · ' + Math.round(it.total) : '(sem item)'));
  }));
});
const m = fixture('fixture_090_megas_2027.json');
m.slice(1).filter(r => /CHICOTE|TRATOR 3/i.test(r[5])).forEach(r => console.log('090: ' + r[1] + ' ' + r[0] + ' | ' + r[5]));
`;
eval(src + diag);
