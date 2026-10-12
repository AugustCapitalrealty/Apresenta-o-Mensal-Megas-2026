// Degraus do slide "Por que a manutenção sobe: as demais variações" de cada Mega (modelos atuais + rev01).
// Uso: node demais_var.js <pasta teste>
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
  LOG.length = 0;
  decks = {}; G._orcGerar_([chave]);
  const sl = decks[cid.deckId].getSlides();
  const s = sl.filter(x => /^Por que a manutenção sobe: (as demais variações|item a item)/.test(x.shapes.filter(y => y.texto).map(y => y.texto).join('|')))[0];
  console.log('== ' + cid.nome + (s ? '' : ' — sem o slide'));
  if (s) s.shapes.filter(y => y.texto && /mil$|^[A-ZÇÃÉÊÍÓÚ ]+$|^(Itens novos|Mesmo serviço|Não se repetem|= )/.test(y.texto) && y.y > 80 && y.x < 340)
    .forEach(y => console.log('   ' + y.texto));
  LOG.filter(l => /demais variações:/.test(l)).forEach(l => console.log('   log: ' + l));
});
`;
eval(src + diag);
