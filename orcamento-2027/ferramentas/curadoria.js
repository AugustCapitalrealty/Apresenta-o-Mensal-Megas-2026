// Pares revisados à mão (manutenção de imóveis, Mega Curitiba): Orç 2026
// (Modelos 2025 Megas + cadastro de contratos) × Orç 2027 (modelo 090 +
// contratos). Gera linhas.json para a planilha de decisão do gestor.
const fs = require('fs'), vm = require('vm'), path = require('path');
const D = process.argv[2];
const ctx = { Logger: { log() {} }, console }; vm.createContext(ctx);
fs.readdirSync(D).filter(f => f.endsWith('.gs')).sort().forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(D, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx));
const fx = n => JSON.parse(fs.readFileSync(path.join(D, 'teste', n), 'utf8'));
const G = ctx, K = G._orcChaveConta_('Manutenção de imóveis'), N = G._orcNorm_;

const it26 = fx('fixture_modelos2026_megas.json').slice(1)
  .filter(r => G._orcChaveConta_(r[0]) === K && r[2] === 'Mega Curitiba' && /RATEIO/.test(r[4]))
  .map(r => ({ desc: String(r[5]).trim(), total: -r.slice(8, 20).reduce((a, v) => a + (+v || 0), 0) }))
  .filter(x => x.total > 0.5)
  .concat(G._orcLerCadastroContratos_(fx('fixture_contratos_ano_anterior.json'), 'Mega Curitiba', 'Manutenção de imóveis', 2026)
    .map(c => ({ desc: 'CONTRATO — ' + c.fornecedor, total: c.total })));
const it27 = G._orcLinhasModelo_(fx('fixture_090_curitiba_2027.json')).filter(l => G._orcChaveConta_(l.conta) === K && Math.abs(l.total) > 0.5)
  .map(l => { const s = G._orcSepararCategoria_(l.item); return { desc: s.descricao, cat: s.categoria, total: l.total }; })
  .concat(G._orcLinhasContratos_(fx('fixture_contratos_manutencao_curitiba.json')).map(c => ({ desc: c.descricao, cat: c.categoria, total: c.total })));

// [trecho do item 2026, [trechos dos itens 2027], leitura, motivo]
const PARES = [
  ['CONTRATO — FIRECAM', ['CONTRATO — FIRECAM', 'SDAI FIRECAM'], 'Compara', 'Mesmo contrato (SDAI). Em 2027 o valor base cai e entra a ampliação para os armazéns 7A e 7B.'],
  ['CONTRATO — MIRIAD', ['CONTRATO — MIRIAD', 'COBERTURA MIRIAD'], 'Compara', 'Mesmo contrato de cobertura, com ampliação para os armazéns 6, 7A e 7B em 2027.'],
  ['CONTRATO — LEANDRO', ['LEANDRO CARVALHO'], 'Compara', 'Mesmo contrato (gerador), reajuste pelo IPCA.'],
  ['CONTRATO — FILTROIL', ['CONTRATO — FILTROIL'], 'Compara', 'Mesmo contrato (subestações), reajuste pelo IPCA.'],
  ['CONTRATO — EQUILIBRIO', ['CONTRATO — EQUILIBRIO'], 'Compara', 'Mesmo contrato (ETEs). Sobe 44%, bem acima do IPCA: confirmar se mudou o escopo.'],
  ['Provisão manutenção preventiva em VGAs', ['PREVENTIVA DAS VGAS'], 'Compara', 'Mesmo serviço: preventiva das VGAs.'],
  ['Preventiva bombas de incêndio', ['BOMBA DE INCÊNDIO - MECÂNICA'], 'Compara', 'Mesmo serviço: preventiva das bombas de incêndio.'],
  ['Preventiva sistema de PPCI com teste NFPA', ['CONFORME NFPA 25'], 'Compara', 'Mesmo serviço: inspeção anual do PPCI pela NFPA 25.'],
  ['Preventiva/PAE Brigada/extintores', ['BRIGADA DE INCÊNDIO', 'RECARGA DE EXTINTORES', 'PLANO DE AÇÃO E EMERGÊNCIA'], 'Compara',
   'Em 2026 era um item só; em 2027 virou três (brigada, extintores e PAE).'],
  ['Provisão manutenções emergências', ['MANUTENÇÃO NÃO PREVISTA'], 'Compara', 'As duas são a reserva para o que não foi previsto (em 2027, 3% do pacote).'],
  ['Preventiva condicionadores de ar', ['AR CONDICIONADO CONFORME PMOC'], 'Dúvida',
   'Mesmo serviço, mas em 2027 virou contrato (PMOC) e o valor mais que dobra. Comparar como o mesmo item?'],
  ['Guard-rail fase 2', ['PLATO 1 E 2 #14839525', 'PLATO 2 E 3 #14839525'], 'Dúvida',
   'Mesmo chamado (#14839525) orçado de novo em 2027. Se não foi feito em 2026, é o mesmo projeto adiado; se foi, são obras diferentes.'],
  ['Torniquete 4', ['4º TORNIQUETE', 'COMPRA DE TORNQUETE DIGICON'], 'Dúvida',
   'O 4º torniquete estava em 2026 e aparece de novo em 2027 (compra + instalação). Foi feito em 2026?'],
  ['Comunicação Horizontal - Demarcações', ['FRENTE DE ARMAZÉNS 1 A 7', 'TACHINHAS REFLETIVAS', 'BOLSÃO DE PESADOS', 'ÁREA DE ACESSOS', 'SEMESTRAL DESCIDA',
    'ROTATÓRIA', 'DEMARCAÇÃO DAS LOMBADAS', 'RUA LATERAL AMZ 1 E 2', 'EMBARQUE E DESEMBARQUE'], 'Dúvida',
   'Em 2026 era um pacote só; em 2027 a demarcação vem aberta por área (9 itens). Comparar o pacote com a soma?'],
  ['Provisão reparo sistemas de acesso', ['FM SECURITY'], 'Dúvida',
   'Em 2027 entra o contrato FM Security (segurança eletrônica). Ele substitui as provisões de acesso e CFTV de 2026?'],
  ['Provisão gastos CFTV', [], 'Dúvida', 'Ver a linha de cima: se o contrato FM Security cobre o CFTV, esta provisão entra na mesma comparação.'],
  ['Provisão para iluminação', ['ILUMINAÇÃO PERIMETRAL NA LATERAL DO ARMAZÉM 6/7', 'ILUMINAÇÃO PERIMETRAL NA LATERAL DO ARMAZÉM 3/4'], 'Dúvida',
   '2026 era provisão de manutenção elétrica; 2027 são duas obras de melhoria da iluminação. Natureza diferente.'],
  ['Provisão Plantação paisagismo 200', ['(FRENTE MELI AMZ 6)', '(FUNDOS RESTAURANTE)', '(FRENTE BOSCH)'], 'Dúvida',
   '2026: plantio em 200 m²; 2027: plantio de grama em 4,4 mil m² (três áreas). Mesmo tipo de serviço, escala bem maior.'],
  ['Provisão pacote serralheria', ['MANTERIAIS DE CONSTRUÇÃO PARA O ZELADOR'], 'Dúvida',
   'Os dois são verba para pequenos reparos, mas um é serralheria e o outro material de construção para o zelador.'],
  ['Provisão paisagismo', [], 'Não compara',
   '2026 era manutenção do paisagismo existente. Em 2027 não há item igual; a implantação de 1.500 m² é obra nova.'],
  ['Lavação em fechamentos metálico', [], 'Não compara', 'Lavagem dos fechamentos da fase 1. As lavagens de 2027 são de outras estruturas (portaria, pórtico, campo).'],
  ['Pintura da fachada cinza', [], 'Não compara', 'Obra pontual de 2026. As pinturas de 2027 são de subestações e áreas de convivência.'],
  ['Limpeza de cobertura armazéns 3 e 4', [], 'Não compara', 'Serviço pontual de 2026, sem item igual em 2027.'],
  ['Compra de duas cancelas', [], 'Não compara', 'Compra pontual de 2026.'],
  ['Compra de totem autoatedimento', [], 'Não compara', 'Compra pontual de 2026.'],
  ['Reforma dos  totens das cancelas', [], 'Não compara', 'Reforma pontual de 2026.'],
];

const usados27 = new Set();
const achar27 = t => it27.map((x, j) => ({ x, j })).filter(o => N(o.x.desc).indexOf(N(t)) >= 0 && !usados27.has(o.j));
const linhas = [];
const usados26 = new Set();
PARES.forEach(([t26, t27s, leitura, motivo]) => {
  const a = it26.map((x, i) => ({ x, i })).filter(o => N(o.x.desc).indexOf(N(t26)) >= 0 && !usados26.has(o.i))[0];
  if (!a) throw new Error('2026 não achado: ' + t26);
  usados26.add(a.i);
  const bs = [];
  t27s.forEach(t => {
    const b = achar27(t);
    if (!b.length) throw new Error('2027 não achado: ' + t);
    b.forEach(o => { usados27.add(o.j); bs.push(o.x); });
  });
  linhas.push({ tipo: /^CONTRATO/.test(a.x.desc) ? 'Contrato' : 'Avulso', d26: a.x.desc, v26: a.x.total,
                d27: bs.map(b => b.desc).join(' + '), v27: bs.reduce((s, b) => s + b.total, 0), cat27: bs[0] ? bs[0].cat : '',
                leitura, motivo });
});
it26.forEach((x, i) => {
  if (usados26.has(i)) return;
  linhas.push({ tipo: 'Avulso', d26: x.desc, v26: x.total, d27: '', v27: 0, cat27: '', leitura: 'Só 2026',
                motivo: 'Sem item parecido em 2027.' });
});
it27.forEach((x, j) => {
  if (usados27.has(j)) return;
  linhas.push({ tipo: /contrato/i.test(x.desc) || x.cat === 'CONTRATO' ? 'Contrato' : 'Avulso', d26: '', v26: 0, d27: x.desc, v27: x.total, cat27: x.cat,
                leitura: 'Só 2027', motivo: 'Item novo, sem par em 2026.' });
});
const soma = k => linhas.reduce((s, l) => s + l[k], 0);
console.log('linhas', linhas.length, 'tot26', Math.round(soma('v26')), 'tot27', Math.round(soma('v27')));
const c = {}; linhas.forEach(l => { c[l.leitura] = (c[l.leitura] || 0) + 1; }); console.log(c);
fs.writeFileSync(process.argv[3], JSON.stringify(linhas, null, 1));
