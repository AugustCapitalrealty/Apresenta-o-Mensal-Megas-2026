// Mede se textos cabem na coluna DETALHAMENTO dos ofensores do Esteio (sem cortar).
// Uso: node mede_detalhe.js <pasta teste> "texto 1" "texto 2" ...
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2], TEXTOS = process.argv.slice(3);
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
porId[G.ORC_MODELO_090_ID] = fixture('fixture_090_megas_2027.json');
porId[G.ORC_MODELO_070_ID] = fixture('fixture_070_megas_2027.json');
porId[G.ORC_CONTRATOS_ANO_IDS[0]] = fixture('fixture_contratos_2027_rev01.json');
const cid = G.ORC_CIDADES.ESTEIO;
cid.despesasGeraisId = G.ORC_MODELO_090_ID; cid.servicosTerceirosId = G.ORC_MODELO_070_ID;
cid.relatorios.orcDosModelos = true;
porId[cid.relatorios.metragemId] = fixture('fixture_metragem_esteio.json');
porId[cid.relatorios.mensalId] = fixture('fixture_mensal_esteio.json');
porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_esteio.json');
decks = {}; G._orcGerar_(['ESTEIO']);
const sl = decks[cid.deckId].getSlides();
const of = sl.filter(s => s.shapes.some(x => x.texto === 'DETALHAMENTO') && s.shapes.some(x => /^OFENSORES — SOBEM/.test(x.texto || '')))[0];
const cab = of.shapes.filter(x => x.texto === 'DETALHAMENTO')[0];
const det = of.shapes.filter(x => x.texto && x.x >= cab.x - 6 && x.x <= cab.x + 6 && x.texto !== 'DETALHAMENTO' && x.fs <= 7.5)[0];
const R = G._ORC_RECUO_TEXTBOX, cw = det.w - 4;   // align L: bw = w + folga(4)
const util = G._orcUtilUmaLinha_(cw, 'L', 4), fonte = det.fonte;
console.log('coluna ' + cw.toFixed(1) + ' pt · útil ' + util.toFixed(1) + ' pt · fonte ' + fonte + ' ' + det.fs + ' pt');
${JSON.stringify(TEXTOS)}.forEach(t => { const l = G._orcLarguraTexto_(t, det.fs, fonte, false);
  console.log((l <= util ? 'CABE   ' : 'CORTA  ') + l.toFixed(1).padStart(6) + ' pt  ' + t.length + ' letras  ' + t); });
`;
eval(src + diag);
