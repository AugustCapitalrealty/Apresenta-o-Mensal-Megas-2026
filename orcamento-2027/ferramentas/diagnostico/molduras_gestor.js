// Manifesto das molduras dos slides do gestor (o molde de fotos com a trilha na seção do assunto, 29_GestorRevisado.gs)
// nas duas marcas, seções 04 e 05 — para ferramentas/molduras_imagem.js desenhar as que faltam.
// Uso: node molduras_gestor.js <pasta teste> <saída.json>
const fs = require('fs'), path = require('path');
const TESTE = path.resolve(process.argv[2]), SAIDA = path.resolve(process.argv[3]);
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
eval(src + `
const man = {};
[null, G.ORC_CIDADES.CURITIBA].forEach(cid => {
  G._orcAplicarMarca_(cid);
  const DS = G.CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  [4, 5].forEach(secao => {
    const spec = G._orcSpecMoldura_({ header: true, secao: secao,
      cards: [{ x: MX, y: 74, w: W - MX * 2, h: H - 31 - 74, cor: DS.colors.cardBg, borda: DS.colors.lines, peso: 0.75 }] }, W, H);
    man[G._orcAssinatura_(spec)] = JSON.parse(spec);
    console.log((cid ? cid.nome : 'Capital') + ' · seção ' + secao + ' → MOLDURA - ' + G._orcAssinatura_(spec) + '.png');
  });
});
G._orcAplicarMarca_(null);
fs.writeFileSync(SAIDA, JSON.stringify(man, null, 1));
`);
