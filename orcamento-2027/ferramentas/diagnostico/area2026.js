// R$/m² de 2026 (Orç e Ritmo) pela área implícita da METRAGEM × pela área do rateio 2026.
// Uso: node area2026.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
const f = v => v.toFixed(2).replace('.', ',');
const rels = {};
[['CURITIBA', 'curitiba'], ['ITAJAI', 'itajai'], ['ESTEIO', 'esteio']].forEach(([chave, c]) => {
  const cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
  cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  const of = G._orcLerMetragem_(fixture('fixture_metragem_' + c + '.json'));
  const rel = rels[chave] = G.obterRelatorioAnual_(chave);
  const aR0 = G._orcAreaImplicita_(of, 'ritmo'), aR1 = G._orcAreaImplicita_(rel, 'ritmo');
  const v0 = rel.total.orc / G._orcAreaImplicita_(rel, 'orc') / (rel.total.ritmo / aR0) - 1, v1 = rel.total.orc / G._orcAreaImplicita_(rel, 'orc') / (rel.total.ritmo / aR1) - 1;
  console.log(cid.nome + ': área 2025 ' + Math.round(G._orcAreaImplicita_(of, 'real')).toLocaleString('pt-BR') + ' → ' + Math.round(G._orcAreaImplicita_(rel, 'real')).toLocaleString('pt-BR') +
    ' m² (média) · R$/m² Real 2025 ' + f(of.m2Total.real) + ' → ' + f(rel.m2Total.real) + ' · área comum ' + f(of.m2AreaComum.real) + ' → ' + f(rel.areaComum.real / G._orcAreaImplicita_(rel, 'real') / 12));
  console.log(cid.nome + ': área 2026 '+ Math.round(aR0).toLocaleString('pt-BR') + ' → ' + aR1.toLocaleString('pt-BR') +
    ' m² · R$/m² Ritmo 2026 ' + f(of.m2Total.ritmo) + ' → ' + f(rel.m2Total.ritmo) + ' · Orç 2026 ' + f(of.m2Total.orcAnt) + ' → ' + f(rel.m2Total.orcAnt) +
    ' · Orç 2027 ' + f(rel.m2Total.orc) + ' · variação R$/m² × ritmo ' + (v0 * 100).toFixed(1) + '% → ' + (v1 * 100).toFixed(1) + '%');
});
const t = G._orcTotaisFacilities_(rels);
console.log('Facilities: área 2026 ' + t.areaRitmo.toLocaleString('pt-BR') + ' m² · R$/m² Ritmo 2026 ' + f(t.ritmo / t.areaRitmo / 12) + ' · Orç 2027 ' + f(t.orc / t.areaOrc / 12));
`;
eval(src + diag);
