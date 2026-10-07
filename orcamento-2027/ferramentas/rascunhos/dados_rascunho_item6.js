// Dados do rascunho do item 6 (composição da manutenção com o ritmo 2026), Mega Curitiba.
const fs = require('fs');
const P = 'G:/Drives compartilhados/08.000 - Business Analysis/APRESENTAÇÃO ORÇAMENTO/Apresenta-o-Mensal-Megas-2026/orcamento-2027';
const { carregar } = require(P + '/ferramentas/comparacao_base.js');
const cid = process.argv[2] || 'curitiba', MEGA = { curitiba: 'Mega Curitiba', itajai: 'Mega Itajaí', esteio: 'Mega Esteio' }[cid];
const { G, it27 } = carregar(P, cid, 'ritmo');
const N = G._orcNorm_;
const curto = d => {
  const p = G.ORC_PROPOSTAS_TEXTOS.filter(x => N(x[1]) === N(d))[0];
  return (p && (p[3] || p[2])) || d;
};
const vm = require('vm'), ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(P + '/23_DecisoesGestor.gs', 'utf8').replace(/^const /m, 'var '), ctx);
const pares = ctx.ORC_DECISOES_GESTOR[MEGA].pares.filter(p => p.itens2027.length);
const usados = new Set();
const grupos = pares.map(p => {
  const itens = p.itens2027.map(n => {
    const j = it27.findIndex((x, k) => !usados.has(k) && N(x.desc) === N(n));
    if (j < 0) return { nome: curto(n), v: 0, faltou: true };
    usados.add(j); return { nome: curto(it27[j].desc), v: it27[j].total };
  });
  return { de2026: G._orcNomeObra_(p.de2026), ritmo: p.ritmo2026, orc: itens.reduce((s, x) => s + x.v, 0), itens };
}).sort((a, b) => b.orc - a.orc);
const total27 = it27.reduce((s, x) => s + x.total, 0);
const comp27 = grupos.reduce((s, g) => s + g.orc, 0), compR = grupos.reduce((s, g) => s + g.ritmo, 0);
const out = { mega: MEGA, grupos, total27, comp27, compR, pontuais: total27 - comp27, nPontuais: it27.length - usados.size };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(MEGA, grupos.length, 'pares', 'ritmo', Math.round(compR), 'orc', Math.round(comp27), 'pontuais', Math.round(out.pontuais), out.nPontuais, 'itens',
  grupos.filter(g => g.itens.some(i => i.faltou)).length, 'com item faltando');
grupos.forEach(g => console.log(Math.round(g.ritmo), Math.round(g.orc), g.itens.length, g.de2026.slice(0, 40), '|', g.itens.map(i => i.nome).join(' + ').slice(0, 90)));
