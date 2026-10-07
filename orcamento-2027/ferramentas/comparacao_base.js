// Itens de manutenção de imóveis de um Mega, 2026 × Orç 2027, para a
// comparação item a item (parear.js e curadoria.js).
//   2026, BASE26=ritmo (padrão desde 07/10/2026): ritmo 2026 item a item do
//         090 (só o centro de custo do condomínio, "… RATEIO …") + cadastro de
//         contratos 2026 exportado do sistema (ferramentas/ritmo2026_fixtures.py).
//   2026, BASE26=orcado (até 07/10/2026): "MESTRA - ORÇAMENTO 2026 ITEM A
//         ITEM" + "MESTRA - CONTRATOS 2026".
//   2027: modelo 090 + "MESTRA - CONTRATOS 2027" (os três Megas).
// Lê as cópias em teste/ (fixture_*.json).
const fs = require('fs'), vm = require('vm'), path = require('path');

const CIDADES = {
  curitiba: { unidade: 'Mega Curitiba' },
  itajai:   { unidade: 'Mega Itajaí' },
  esteio:   { unidade: 'Mega Esteio' }
};
const BASES26 = {
  ritmo:  { itens: 'fixture_ritmo2026_090.json',     contratos: 'fixture_contratos_2026_cadastro.json', nome: 'Ritmo 2026' },
  orcado: { itens: 'fixture_modelos2026_megas.json', contratos: 'fixture_contratos_ano_anterior.json',  nome: 'Orç 2026' }
};
const BASE26 = BASES26[process.env.BASE26 || 'ritmo'];

// base: 'ritmo' ou 'orcado'; sem ela, a de BASE26 (variável de ambiente).

function carregar(D, cidade, base) {
  const cfg = CIDADES[cidade];
  if (!cfg) throw new Error('Cidade desconhecida: ' + cidade + ' (use ' + Object.keys(CIDADES).join(', ') + ')');
  const ctx = { Logger: { log() {} }, console }; vm.createContext(ctx);
  fs.readdirSync(D).filter(f => f.endsWith('.gs')).sort().forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(D, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx));
  const fx = n => JSON.parse(fs.readFileSync(path.join(D, 'teste', n), 'utf8'));
  const G = ctx, K = G._orcChaveConta_('Manutenção de imóveis');

  const B = base ? BASES26[base] : BASE26;
  if (!B) throw new Error('BASE26 desconhecida (use ' + Object.keys(BASES26).join(' ou ') + ')');
  const it26 = fx(B.itens).slice(1)
    .filter(r => G._orcChaveConta_(r[0]) === K && r[2] === cfg.unidade && /RATEIO/.test(r[4]))
    .map(r => { const meses = r.slice(8, 20).map(v => -(+v || 0));
                return { desc: String(r[5]).trim(), meses, total: meses.reduce((a, v) => a + v, 0), contrato: false }; })
    .filter(x => x.total > 0.5)
    .concat(G._orcLerCadastroContratos_(fx(B.contratos), cfg.unidade, 'Manutenção de imóveis', 2026)
      .map(c => ({ desc: 'CONTRATO — ' + c.fornecedor, meses: c.meses, total: c.total, contrato: true, forn: c.fornecedor })));

  const c27 = G._orcLerCadastroContratos_(fx('fixture_contratos_2027_completo.json'), cfg.unidade, 'Manutenção de imóveis', 2027)
    .map(k => G._orcContratoItem_(k.fornecedor, k.meses));
  const it27 = G._orcLinhasModelo_(fx('fixture_090_' + cidade + '_2027.json'))
    .filter(l => G._orcChaveConta_(l.conta) === K && Math.abs(l.total) > 0.5)
    .map(l => { const s = G._orcSepararCategoria_(l.item);
                return { desc: s.descricao, cat: s.categoria, meses: l.meses, total: l.total,
                         contrato: G._orcItemEhContrato_(s.categoria, s.descricao) }; })
    .concat(c27.map(c => ({ desc: c.descricao, cat: c.categoria, meses: c.meses, total: c.total, contrato: true })));

  const rel = G._orcLerMetragem_(fx('fixture_metragem_' + cidade + '.json'));
  const conta = rel.contas.filter(x => x.chave === K)[0];
  return { G, cfg, it26, it27, metragem: conta ? conta.v : null, base26: B.nome };
}

module.exports = { carregar, CIDADES, BASE26, BASES26 };
