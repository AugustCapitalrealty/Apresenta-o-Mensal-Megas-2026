// Pareia os itens de manutenção do Orç 2026 com os do Orç 2027 de um Mega
// (sugestão automática; a revisão fica em curadoria.js).
// Uso: node ferramentas/parear.js . <curitiba|itajai|esteio> <saida.json>
const fs = require('fs'), path = require('path');
const { carregar } = require('./comparacao_base');
const D = process.argv[2], CIDADE = process.argv[3], SAIDA = process.argv[4];
const { G, it26, it27 } = carregar(D, CIDADE);

const PARE = new Set(('de da do das dos e em para no na nos nas com a o as os ao por sem ate fase amz armazem armazens ' +
  'servico servicos contrato manutencao mao obra material materiais compra provisao preventiva').split(' '));
const toks = s => G._orcNorm_(s).replace(/#\d+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(' ')
  .filter(t => t.length >= 3 && !PARE.has(t) && !/^\d+$/.test(t)).map(t => t.slice(0, 6));
const chamados = s => (String(s).match(/#\s*#?(\d{6,})/g) || []).map(x => x.replace(/\D/g, ''));
const meses = m => m.map((v, i) => Math.abs(v) > 0.005 ? i : -1).filter(i => i >= 0);
const score = (a, b) => {
  const A = new Set(toks(a.desc)), B = new Set(toks(b.desc));
  const inter = [...A].filter(t => B.has(t)).length;
  return { j: inter / Math.max(1, Math.min(A.size, B.size)), comuns: [...A].filter(t => B.has(t)) };
};

const pares = [];
const usados27 = new Set();
it26.forEach(a => {
  let melhor = null;
  it27.forEach((b, j) => {
    const ch = chamados(a.desc).filter(c => chamados(b.desc).indexOf(c) >= 0);
    const s = score(a, b);
    // Contrato só pareia com contrato do mesmo fornecedor (primeira palavra).
    if (a.contrato) {
      const k = G._orcChaveFornecedor_(a.forn);
      if (!(b.contrato && G._orcNorm_(b.desc).indexOf(k) >= 0)) return;
      s.j = 1; s.comuns = [k];
    }
    const v = ch.length ? 2 + s.j : s.j;
    if (!melhor || v > melhor.v) melhor = { v, j, b, s, ch };
  });
  pares.push({ a, melhor });
});
const out = pares.map(p => ({
  d26: p.a.desc, v26: p.a.total, m26: meses(p.a.meses).length, contrato: p.a.contrato,
  d27: p.melhor && p.melhor.v >= 0.2 ? p.melhor.b.desc : '', cat27: p.melhor && p.melhor.v >= 0.2 ? p.melhor.b.cat : '',
  v27: p.melhor && p.melhor.v >= 0.2 ? p.melhor.b.total : 0, m27: p.melhor && p.melhor.v >= 0.2 ? meses(p.melhor.b.meses).length : 0,
  j27: p.melhor && p.melhor.v >= 0.2 ? p.melhor.j : -1,
  score: p.melhor ? Math.round(p.melhor.v * 100) / 100 : 0, chamado: p.melhor ? p.melhor.ch.join(',') : '',
  comuns: p.melhor ? p.melhor.s.comuns.join(' ') : ''
}));
const usados = new Set(out.map(o => o.j27).filter(j => j >= 0));
const novos = it27.map((b, j) => ({ b, j })).filter(x => !usados.has(x.j))
  .map(x => ({ d27: x.b.desc, cat27: x.b.cat, v27: x.b.total, m27: meses(x.b.meses).length, contrato: x.b.contrato }));
fs.writeFileSync(SAIDA, JSON.stringify({ pares: out, novos, tot26: it26.reduce((a, x) => a + x.total, 0), tot27: it27.reduce((a, x) => a + x.total, 0) }, null, 1));
out.sort((x, y) => y.score - x.score).forEach(o => console.log(o.score.toFixed(2).padStart(5), '|', Math.round(o.v26), '|', o.d26.slice(0, 60), '=>', o.d27.slice(0, 60), '|', Math.round(o.v27), '|', o.comuns, o.chamado ? '#' + o.chamado : ''));
console.log('--- 2027 sem par:', novos.length, Math.round(novos.reduce((a, x) => a + x.v27, 0)));
console.log('tot26', Math.round(it26.reduce((a, x) => a + x.total, 0)), 'tot27', Math.round(it27.reduce((a, x) => a + x.total, 0)));
