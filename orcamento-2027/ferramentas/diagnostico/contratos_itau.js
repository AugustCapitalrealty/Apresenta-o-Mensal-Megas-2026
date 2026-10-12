// Linhas do slide "Contratos — 2026 × Orçamento 2027" e da composição de Segurança com os modelos
// atuais (fixtures) + cadastro rev01. Uso: node contratos_itau.js <pasta teste> [regex]
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2], RE = process.argv[3] || 'ITA[UÚ]|MOKED|SENSE|FIBRA|EMPR[EÉ]STIMO';
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
const re = new RegExp(${JSON.stringify(RE)}, 'i');
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
  const v = G._orcLerVisaoGeral_(chave);
  const cmp = G._orcCompararTodosContratos_(v.rel, FIX_CAD_2026, cid.nome, v.modelos, FIX_MOD_2026);
  console.log('== ' + cid.nome + ' · contratos ' + Math.round(cmp.ant) + ' → ' + Math.round(cmp.atual) + ' · novos ' + cmp.novos.n + ' · sem item ' + cmp.semPar.n);
  cmp.grupos.forEach(g => g.linhas.filter(l => re.test(l.nome + ' ' + (l.textos || []).join(' ') + ' ' + l.categoria)).forEach(l =>
    console.log('   [' + g.conta + '] ' + l.nome + ' | cat ' + l.categoria + ' | ' + Math.round(l.ant) + ' → ' + Math.round(l.atual) + ' | ' + l.situacao)));
  v.modelos.filter(l => re.test(l.item)).forEach(l => console.log('   modelo: ' + l.conta + ' | ' + l.item + ' | ' + Math.round(l.total)));
  const seg = v.rel.contas.filter(x => x.chave === G._orcChaveConta_('Segurança e vigilância'))[0];
  console.log('   Segurança: ritmo ' + Math.round(seg.v.ritmo) + ' → orç ' + Math.round(seg.v.orc) + ' · total Orç ' + Math.round(v.rel.total.orc));
});
`;
eval(src + diag);
