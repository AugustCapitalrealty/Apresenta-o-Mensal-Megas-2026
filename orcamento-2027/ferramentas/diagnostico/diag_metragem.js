// Diagnóstico: modelos 070/090 + contratos 2027 × Orç 2027 da METRAGEM, conta a conta.
// Uso: node diag_metragem.js <pasta teste>
const fs = require('fs'), path = require('path'), vm = require('vm');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
;['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(chave => {
  const c = { CURITIBA: 'curitiba', ITAJAI: 'itajai', ESTEIO: 'esteio' }[chave];
  const cid = G.ORC_CIDADES[chave];
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  if (chave !== 'CURITIBA') {
    porId[cid.despesasGeraisId] = fixture('fixture_090_' + c + '_2027.json');
    porId[cid.servicosTerceirosId] = fixture('fixture_070_' + c + '_2027.json');
  }
  const rel = G.obterRelatorioAnual_(chave);
  const linhas = G._orcLinhasModelosCidade_(chave);
  const porConta = {};
  linhas.forEach(l => { const k = G._orcChaveConta_(l.conta); (porConta[k] = porConta[k] || { nome: l.conta, t: 0, n: 0 }); porConta[k].t += l.total; porConta[k].n++; });
  console.log('\\n=== ' + cid.nome + ' ===  área implícita orc: ' + Math.round(G._orcAreaImplicita_(rel, 'orc')) + ' m²');
  const vistos = {};
  rel.contas.concat([{ nome: 'IPTU', chave: G._orcChaveConta_('IPTU'), v: rel.iptu }, { nome: 'Seguro', chave: G._orcChaveConta_('Seguro'), v: rel.seguro }]).forEach(x => {
    const p = porConta[x.chave]; vistos[x.chave] = 1;
    if (!p) return;
    const d = p.t - x.v.orc;
    console.log((Math.abs(d) > 1 ? '  ≠ ' : '  = ') + x.nome.padEnd(42) + ' METRAGEM ' + Math.round(x.v.orc).toLocaleString('pt-BR').padStart(11) +
      '  modelos+contr ' + Math.round(p.t).toLocaleString('pt-BR').padStart(11) + '  dif ' + Math.round(d).toLocaleString('pt-BR') + '  (' + p.n + ' linhas)');
  });
  Object.keys(porConta).filter(k => !vistos[k]).forEach(k => console.log('  ? conta só nos modelos: ' + porConta[k].nome + ' ' + Math.round(porConta[k].t)));
});
`;
eval(src + diag);
