// Auditoria: o mesmo número em fontes diferentes, com orcDosModelos ligado.
// Uso: node auditoria.js <pasta teste>
const fs = require('fs'), path = require('path');
const TESTE = process.argv[2];
const src = fs.readFileSync(path.join(TESTE, 'teste_orcamento.js'), 'utf8').split('// ---------------- Helpers')[0]
  .replace(/__dirname/g, JSON.stringify(TESTE));
const diag = `
const R = v => Math.round(v).toLocaleString('pt-BR');
const dif = (rot, a, b, tol) => { const d = a - b; console.log((Math.abs(d) > (tol || 1) ? '  ≠ ' : '  = ') + rot + ': ' + R(a) + ' × ' + R(b) + (Math.abs(d) > (tol || 1) ? '  (dif ' + R(d) + ')' : '')); };
['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(chave => {
  const c = { CURITIBA: 'curitiba', ITAJAI: 'itajai', ESTEIO: 'esteio' }[chave];
  const cid = G.ORC_CIDADES[chave];
  porId[cid.relatorios.metragemId] = fixture('fixture_metragem_' + c + '.json');
  porId[cid.relatorios.mensalId] = fixture('fixture_mensal_' + c + '.json');
  porId[cid.despesasGeraisId] = chave === 'CURITIBA' ? FIXTURE : fixture('fixture_090_' + c + '_2027.json');
  porId[cid.servicosTerceirosId] = fixture('fixture_070_' + c + '_2027.json');
  porIdFinanceiro[cid.relatorios.financeiroMegasId] = fixture('fixture_financeiro2025_' + c + '.json');
  cid.relatorios.orcDosModelos = true;
  const visao = G._orcLerVisaoGeral_(chave), rel = visao.rel, mensal = visao.mensal;
  console.log('\\n=== ' + cid.nome + ' ===');
  console.log(' A. DRE (anual) × mês a mês, por conta e coluna');
  const contas = rel.contas.concat([{ nome: 'IPTU', chave: G._orcChaveConta_('IPTU'), v: rel.iptu }, { nome: 'Seguro', chave: G._orcChaveConta_('Seguro'), v: rel.seguro }]);
  contas.forEach(x => {
    const m = mensal.contas[x.chave]; if (!m) return;
    [['orc', 'orc'], ['ritmo', 'real'], ['orcAnt', 'orcAnt']].forEach(([k, km]) => {
      const s = m[km].reduce((a, v) => a + v, 0);
      if (Math.abs(s - x.v[k]) > 1) dif(x.nome + ' ' + k + ' (mensal × DRE)', s, x.v[k]);
    });
  });
  const semMensal = contas.filter(x => !mensal.contas[x.chave] && (Math.abs(x.v.orc) > 1 || Math.abs(x.v.ritmo) > 1)).map(x => x.nome + ' ' + R(x.v.orc));
  console.log('   contas da DRE fora do mês a mês: ' + (semMensal.join(', ') || '—'));
  console.log(' B. Real ' + rel.anos.real + ' mês a mês (Financeiro) × DRE');
  if (visao.realAnt) {
    dif('área comum', visao.realAnt.ac.reduce((a, v) => a + v, 0), rel.areaComum.real);
    dif('total', visao.realAnt.total.reduce((a, v) => a + v, 0), rel.total.real);
  }
  console.log(' C. Manutenção: categorias × DRE');
  const d = G.obterManutencao_(chave), man = rel.contas.filter(x => x.chave === G._orcChaveConta_('Manutenção de imóveis'))[0];
  dif('total categorias × DRE', d.total, man.v.orc);
  dif('soma categorias × total', d.categorias.reduce((a, x) => a + x.total, 0), d.total);
  dif('soma meses × total', d.meses.reduce((a, x) => a + x, 0), d.total);
  if (mensal.contas[man.chave]) d.meses.forEach((v, i) => { if (Math.abs(v - mensal.contas[man.chave].orc[i]) > 1) dif('mês ' + (i + 1) + ' categorias × mensal', v, mensal.contas[man.chave].orc[i]); });
  const cls = G._orcClassificarManutencao_(d);
  dif('projetos + recorrente × total', cls.projetos.total + (cls.recorrente ? cls.recorrente.total : 0), d.total);
  console.log(' D. Composição item a item × DRE');
  G.ORC_CONTAS_DETALHE.forEach(n => { const x = rel.contas.filter(y => y.chave === G._orcChaveConta_(n))[0]; const comp = G._orcComposicaoConta_(x, visao.modelos);
    dif(n + ' itens × DRE', comp.somaItens, x.v.orc); });
  console.log(' E. R$/m² mês a mês × DRE');
  const m2 = G._orcM2Mensal_(rel, mensal, visao.realAnt);
  m2.series.forEach(s => {
    const tab = m2.custo[s.k] ? m2.custo[s.k].areaComum.m2 : (rel.m2AreaComum ? rel.m2AreaComum[s.k] : null);
    console.log((tab != null && s.media.toFixed(2) !== tab.toFixed(2) ? '  ≠ ' : '  = ') + s.nome + ': média das linhas ' + s.media.toFixed(2) +
      ' × tabela/DRE (área comum) ' + (tab != null ? tab.toFixed(2) : '–') + ' · total DRE ' + (rel.m2Total ? rel.m2Total[s.k].toFixed(2) : '–'));
  });
  console.log(' F. Projetos × recorrente (4 grupos) × total');
  dif('grupos × total', cls.grupos.reduce((a, g) => a + g.total, 0), d.total);
  console.log(' G. Ponte: soma dos degraus × Orç − Ritmo');
  const p = G._orcPonte_(rel, mensal);
  dif('degraus', p.degraus.reduce((a, x) => a + x.delta, 0), p.fim - p.inicio);
  console.log(' H. Pendências: ' + (rel.mensalConciliado || []).length + ' ajustes no mês a mês');
  cid.relatorios.orcDosModelos = false;
});
`;
eval(src + diag);
