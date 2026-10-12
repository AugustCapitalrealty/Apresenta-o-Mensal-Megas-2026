// Gera os três Megas (modelos atuais nas fixtures + cadastro rev01) e lista como os textos que batem
// com o regex aparecem em cada tabela (aba, original, exibido, onde), mais os cortados.
// Uso: node textos_itens.js <pasta teste> [regex]
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2], RE = process.argv[3] || 'ITA[UÚ]|SENSE|FIBRA|EMPR[EÉ]STIMO|MOKED|LAVAGEM DAS ESTRUTURAS';
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
  decks = {}; G._orcGerar_([chave]); G.aplicarPropostasTextos(); decks = {}; G._orcGerar_([chave]);
  console.log('\\n=== ' + cid.nome);
  const usados = Object.keys(G._ORC_TEXTOS_USADOS).map(k => G._ORC_TEXTOS_USADOS[k]);
  usados.filter(r => re.test(r.original) || re.test(r.exibido)).forEach(r =>
    console.log('  ' + JSON.stringify([r.aba, r.original, r.exibido, Object.keys(r.onde).join(' / ')])));
  usados.filter(r => /…$/.test(r.exibido)).forEach(r => console.log('  CORTADO ' + JSON.stringify([r.aba, r.original, r.exibido])));
  const sl = decks[cid.deckId].getSlides();
  sl.forEach((s, i) => s.shapes.filter(x => x.texto && re.test(x.texto) && !usados.some(u => u.exibido === x.texto)).forEach(x =>
    console.log('  slide ' + (i + 1) + ': ' + x.texto.replace(/\\n/g, ' ⏎ ').slice(0, 160))));
});
`;
eval(src + diag);
