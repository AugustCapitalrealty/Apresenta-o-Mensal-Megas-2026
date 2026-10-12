// Compara duas matrizes "Valores do Modelo" (mestra atual × exportação nova), achando as colunas
// pelo cabeçalho. Sem coluna "Item" na nova, compara por conta × unidade × centro de custo.
// Uso: node compara_modelos.js <antiga.json> <nova.json>
const fs = require('fs');
const [, , fa, fb] = process.argv;
const norm = s => String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const chave = s => norm(s).toLowerCase();
function registros(f) {
  const m = JSON.parse(fs.readFileSync(f, 'utf8')), h = m[0].map(norm);
  const ix = n => h.indexOf(n);
  const c = { conta: ix('Descrição do item'), un: ix('Cód. da unidade'), cc: ix('Cód. do centro de custo'), ccd: ix('Descrição do centro de custo'), item: ix('Item'), m1: ix('Mês 1') };
  return { temItem: c.item >= 0, linhas: m.slice(1).map(r => ({ conta: norm(r[c.conta]), un: String(r[c.un]), cc: norm(r[c.cc]), ccd: norm(r[c.ccd]),
    item: c.item >= 0 ? norm(r[c.item]) : '', meses: r.slice(c.m1, c.m1 + 12).map(v => -(+v || 0)) })) };
}
const A = registros(fa), B = registros(fb);
const porItem = A.temItem && B.temItem;
const soma = a => a.reduce((s, v) => s + v, 0);
const fmt = v => Math.round(v).toLocaleString('pt-BR');
function agrupar(R) {
  const g = {};
  R.linhas.forEach(l => {
    const k = [l.un, chave(l.conta), l.cc, porItem ? chave(l.item) : ''].join('§');
    if (!g[k]) g[k] = { un: l.un, conta: l.conta, cc: l.cc, ccd: l.ccd, item: porItem ? l.item : '', meses: new Array(12).fill(0), n: 0 };
    l.meses.forEach((v, i) => g[k].meses[i] += v); g[k].n++;
  });
  return g;
}
const ga = agrupar(A), gb = agrupar(B);
console.log('Antiga: ' + A.linhas.length + ' linhas' + (A.temItem ? ' (com Item)' : ' (sem Item)') + ' · Nova: ' + B.linhas.length + ' linhas' + (B.temItem ? ' (com Item)' : ' (sem Item)') + ' · comparação ' + (porItem ? 'por item' : 'por conta × unidade × centro de custo'));
const MEGAS = { 60: 'Curitiba', 19: 'Itajaí', 18: 'Esteio' };
const tot = (g, un) => Object.values(g).filter(x => x.un === un).reduce((s, x) => s + soma(x.meses), 0);
Object.keys(MEGAS).forEach(un => console.log('  ' + un + ' ' + MEGAS[un] + ': ' + fmt(tot(ga, un)) + ' → ' + fmt(tot(gb, un)) + '  (Δ ' + fmt(tot(gb, un) - tot(ga, un)) + ')'));
const outras = g => Object.values(g).filter(x => !MEGAS[x.un]).reduce((s, x) => s + soma(x.meses), 0);
console.log('  demais unidades: ' + fmt(outras(ga)) + ' → ' + fmt(outras(gb)));
// conta × unidade dos Megas
const porConta = g => { const o = {}; Object.values(g).filter(x => MEGAS[x.un]).forEach(x => { const k = x.un + '§' + chave(x.conta); o[k] = o[k] || { un: x.un, conta: x.conta, v: 0 }; o[k].v += soma(x.meses); }); return o; };
const ca = porConta(ga), cb = porConta(gb);
console.log('\nContas dos Megas que mudaram (anual):');
Array.from(new Set(Object.keys(ca).concat(Object.keys(cb)))).sort().forEach(k => {
  const a = ca[k] ? ca[k].v : 0, b = cb[k] ? cb[k].v : 0;
  if (Math.abs(a - b) > 0.5) console.log('  ' + MEGAS[(ca[k] || cb[k]).un].padEnd(9) + (ca[k] || cb[k]).conta.padEnd(36) + fmt(a).padStart(12) + ' → ' + fmt(b).padStart(12) + '  Δ ' + fmt(b - a));
});
console.log('\nLinhas dos Megas que mudaram:');
Array.from(new Set(Object.keys(ga).concat(Object.keys(gb)))).filter(k => MEGAS[k.split('§')[0]]).sort().forEach(k => {
  const a = ga[k], b = gb[k], x = a || b;
  const va = a ? a.meses : new Array(12).fill(0), vb = b ? b.meses : new Array(12).fill(0);
  if (va.every((v, i) => Math.abs(v - vb[i]) < 0.005)) return;
  const tag = !a ? 'NOVA' : !b ? 'SAIU' : 'MUDOU';
  console.log('  [' + tag + '] ' + MEGAS[x.un] + ' | ' + x.conta + (x.item ? ' | ' + x.item : ' | ' + x.ccd) + '\n      ' + fmt(soma(va)) + ' → ' + fmt(soma(vb)) +
    '   antes: ' + va.map(v => Math.round(v)).join(' ') + '\n' + ' '.repeat(Math.max(6, 6 + fmt(soma(va)).length + 3 + fmt(soma(vb)).length + 3)) + 'agora: ' + vb.map(v => Math.round(v)).join(' '));
});
