// Gera os três Megas e lista as linhas "MEGA X · CONTA" da aba Ofensores (A, B, E, F) e o detalhamento no slide.
// Uso: node linhas_conta.js <pasta teste> [CIDADES separadas por vírgula]
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2], CIDS = (process.argv[3] || 'CURITIBA,ITAJAI,ESTEIO').split(',');
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_rev01.json');
const minus = { CURITIBA: 'curitiba', ITAJAI: 'itajai', ESTEIO: 'esteio' };
${JSON.stringify(CIDS)}.forEach(chave => {
  const c = minus[chave], cid = G.ORC_CIDADES[chave];
  cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
  cid.relatorios.orcDosModelos = true;
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  decks = {}; G._orcGerar_([chave]); G.aplicarPropostasTextos(); decks = {}; G._orcGerar_([chave]);
  console.log('== ' + cid.nome);
  PLANILHA_TEXTOS.getSheetByName('Ofensores').getDataRange().getValues().forEach((r, i) => {
    if (/^MEGA /.test(r[0]) && r[0].indexOf(cid.nome.toUpperCase()) === 0) console.log('  ' + (i + 1) + ' ' + JSON.stringify([r[0], r[1], r[2], r[3], r[4], r[5]]));
  });
  const sl = decks[cid.deckId].getSlides();
  sl.forEach((s, i) => { const t = s.shapes.filter(x => x.texto).map(x => x.texto); if (/^(Ofensores|Defensores) —/.test(t[0] || '') || t.some(x => /^(Ofensores|Defensores) — Orçamento/.test(x))) {
    const rod = t.filter(x => /^Fonte: METRAGEM/.test(x))[0]; console.log('  slide ' + (i + 1) + ' rodapé: ' + rod); } });
});
`;
eval(src + diag);
