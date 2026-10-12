// Linhas "Novo em 2027" do slide de contratos, por Mega, com a data de início
// do contrato no cadastro de 2027. Uso: node novos_contratos.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
const cad27 = fixture('fixture_contratos_2027_completo.json'), cab = cad27[0].map(G._orcNorm_);
const iNome = cab.indexOf('nome'), iUni = cab.indexOf('unidade'), iIni = cab.indexOf('data inicio'), iVal = cab.indexOf('valor'), iRej = cab.indexOf('rejuste');
[['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
  const cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
  cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  const vis = G._orcLerVisaoGeral_(chave);
  const cmp = G._orcCompararTodosContratos_(vis.rel, FIX_CAD_2026, cid.nome, vis.modelos, FIX_MOD_2026);
  console.log('\\n=== ' + cid.nome);
  cmp.grupos.forEach(g => g.linhas.filter(l => /^Novo/.test(l.situacao)).forEach(l => {
    const t = G._orcNorm_((l.textos || []).join(' ') + ' ' + l.nome);
    const rows = cad27.slice(1).filter(r => G._orcNorm_(r[iUni]) === G._orcNorm_(cid.nome) && r[iNome] && t.indexOf(G._orcNorm_(r[iNome]).slice(0, 12)) >= 0);
    console.log('  ' + g.conta + ' · ' + l.nome + ' · 2027 ' + Math.round(l.atual) + ' · cadastro: ' +
      (rows.map(r => r[iNome] + ' início ' + r[iIni] + ' valor ' + r[iVal] + (r[iRej] ? ' ' + r[iRej] : '')).join(' / ') || '(não achei no cadastro — item do modelo)'));
  }));
});
`;
eval(src + diag);
