// Pareia os itens de manutenção do Orç 2026 (Modelos 2025 Megas + cadastro de
// contratos) com os do Orç 2027 (modelo 090 + contratos) de Curitiba.
// Uso: node parear.js <pasta orcamento-2027> <saida.json>
const fs = require('fs'), vm = require('vm'), path = require('path');
const D = process.argv[2];
const ctx = { Logger: { log() {} }, console }; vm.createContext(ctx);
fs.readdirSync(D).filter(f => f.endsWith('.gs')).sort().forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(D, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx));
const fx = n => JSON.parse(fs.readFileSync(path.join(D, 'teste', n), 'utf8'));
const G = ctx, K = G._orcChaveConta_('Manutenção de imóveis');

// 2026: modelo (só o centro de custo do condomínio) + contratos do cadastro.
const mod26 = fx('fixture_modelos2026_megas.json').slice(1)
  .filter(r => G._orcChaveConta_(r[0]) === K && r[2] === 'Mega Curitiba' && /RATEIO/.test(r[4]))
  .map(r => { const meses = r.slice(8, 20).map(v => -(+v || 0)); return { desc: String(r[5]).trim(), meses, total: meses.reduce((a, v) => a + v, 0), contrato: false }; })
  .filter(x => x.total > 0.5);
const cad = G._orcLerCadastroContratos_(fx('fixture_contratos_ano_anterior.json'), 'Mega Curitiba', 'Manutenção de imóveis', 2026)
  .map(c => ({ desc: 'CONTRATO — ' + c.fornecedor, meses: c.meses, total: c.total, contrato: true, forn: c.fornecedor }));
const it26 = mod26.concat(cad);

// 2027: linhas do modelo 090 + contratos 2027.
const m27 = G._orcLinhasModelo_(fx('fixture_090_curitiba_2027.json')).filter(l => G._orcChaveConta_(l.conta) === K && Math.abs(l.total) > 0.5)
  .map(l => { const s = G._orcSepararCategoria_(l.item); return { desc: s.descricao, cat: s.categoria, meses: l.meses, total: l.total,
    contrato: G._orcItemEhContrato_(s.categoria, s.descricao) }; });
const c27 = G._orcLinhasContratos_(fx('fixture_contratos_manutencao_curitiba.json'))
  .map(c => ({ desc: c.descricao, cat: c.categoria, meses: c.meses, total: c.total, contrato: true }));
const it27 = m27.concat(c27);

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
fs.writeFileSync(process.argv[3], JSON.stringify({ pares: out, novos, tot26: it26.reduce((a, x) => a + x.total, 0), tot27: it27.reduce((a, x) => a + x.total, 0) }, null, 1));
out.sort((x, y) => y.score - x.score).forEach(o => console.log(o.score.toFixed(2).padStart(5), '|', Math.round(o.v26), '|', o.d26.slice(0, 60), '=>', o.d27.slice(0, 60), '|', Math.round(o.v27), '|', o.comuns, o.chamado ? '#' + o.chamado : ''));
console.log('--- 2027 sem par:', novos.length, Math.round(novos.reduce((a, x) => a + x.v27, 0)));
console.log('tot26', Math.round(it26.reduce((a, x) => a + x.total, 0)), 'tot27', Math.round(it27.reduce((a, x) => a + x.total, 0)));
