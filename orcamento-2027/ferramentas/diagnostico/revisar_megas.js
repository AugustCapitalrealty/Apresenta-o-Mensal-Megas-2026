// Com a exportação dos modelos de 12/10/2026: o que vai para o slide "Revisar"
// de cada Mega, as obras adiadas e os contratos "2026 não identificado".
// Uso: node revisar_megas.js <pasta teste>
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
  const vis = G._orcLerVisaoGeral_(chave), rel = vis.rel;
  const pend = G._orcPendencias_(cid, rel, vis.mensal, vis.modelos);
  console.log('\\n=== ' + cid.nome + ' — slide Revisar');
  pend.forEach(p => console.log('  [' + p.tipo + '] ' + p.nome + ': ' + p.texto));
  const dados = G.obterManutencao_(chave), adi = G._orcAdiados2026_(cid, dados);
  console.log('  obras adiadas 2026→2027: ' + (adi ? adi.itens.map(i => i.nome + ' ' + Math.round(i.orc2027) + (i.doModelo ? '' : ' (planilha do gestor)')).join(' | ') + ' · total ' + Math.round(adi.total) : 'nenhuma'));
  const cmp = G._orcCompararTodosContratos_(rel, FIX_CAD_2026, cid.nome, vis.modelos, FIX_MOD_2026);
  cmp.grupos.forEach(g => g.linhas.filter(l => /não identificado/.test(l.situacao)).forEach(l =>
    console.log('  contrato "2026 não identificado": ' + g.conta + ' · ' + l.nome + ' · 2027 ' + Math.round(l.atual))));
});
`;
eval(src + diag);
