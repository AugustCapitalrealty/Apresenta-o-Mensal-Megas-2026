// Itens de manutenção de imóveis de um Mega, Orç 2026 × Orç 2027, para a
// comparação item a item (parear.js e curadoria.js).
//   2026: "MESTRA - ORÇAMENTO 2026 ITEM A ITEM" (só o centro de custo do
//         condomínio, "… RATEIO …") + "MESTRA - CONTRATOS 2026".
//   2027: modelo 090 + contratos (Curitiba: planilha de contratos de
//         manutenção; Itajaí e Esteio: "MESTRA - CONTRATOS 2027").
// Lê as cópias em teste/ (fixture_*.json).
const fs = require('fs'), vm = require('vm'), path = require('path');

const CIDADES = {
  curitiba: { unidade: 'Mega Curitiba', contratos27: 'fixture_contratos_manutencao_curitiba.json' },
  itajai:   { unidade: 'Mega Itajaí',   contratos27: null },
  esteio:   { unidade: 'Mega Esteio',   contratos27: null }
};

function carregar(D, cidade) {
  const cfg = CIDADES[cidade];
  if (!cfg) throw new Error('Cidade desconhecida: ' + cidade + ' (use ' + Object.keys(CIDADES).join(', ') + ')');
  const ctx = { Logger: { log() {} }, console }; vm.createContext(ctx);
  fs.readdirSync(D).filter(f => f.endsWith('.gs')).sort().forEach(f =>
    vm.runInContext(fs.readFileSync(path.join(D, f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx));
  const fx = n => JSON.parse(fs.readFileSync(path.join(D, 'teste', n), 'utf8'));
  const G = ctx, K = G._orcChaveConta_('Manutenção de imóveis');

  const it26 = fx('fixture_modelos2026_megas.json').slice(1)
    .filter(r => G._orcChaveConta_(r[0]) === K && r[2] === cfg.unidade && /RATEIO/.test(r[4]))
    .map(r => { const meses = r.slice(8, 20).map(v => -(+v || 0));
                return { desc: String(r[5]).trim(), meses, total: meses.reduce((a, v) => a + v, 0), contrato: false }; })
    .filter(x => x.total > 0.5)
    .concat(G._orcLerCadastroContratos_(fx('fixture_contratos_ano_anterior.json'), cfg.unidade, 'Manutenção de imóveis', 2026)
      .map(c => ({ desc: 'CONTRATO — ' + c.fornecedor, meses: c.meses, total: c.total, contrato: true, forn: c.fornecedor })));

  const c27 = cfg.contratos27
    ? G._orcLinhasContratos_(fx(cfg.contratos27))
    : G._orcLerCadastroContratos_(fx('fixture_contratos_2027_completo.json'), cfg.unidade, 'Manutenção de imóveis', 2027)
        .map(k => G._orcContratoItem_(k.fornecedor, k.meses));
  const it27 = G._orcLinhasModelo_(fx('fixture_090_' + cidade + '_2027.json'))
    .filter(l => G._orcChaveConta_(l.conta) === K && Math.abs(l.total) > 0.5)
    .map(l => { const s = G._orcSepararCategoria_(l.item);
                return { desc: s.descricao, cat: s.categoria, meses: l.meses, total: l.total,
                         contrato: G._orcItemEhContrato_(s.categoria, s.descricao) }; })
    .concat(c27.map(c => ({ desc: c.descricao, cat: c.categoria, meses: c.meses, total: c.total, contrato: true })));

  const rel = G._orcLerMetragem_(fx('fixture_metragem_' + cidade + '.json'));
  const conta = rel.contas.filter(x => x.chave === K)[0];
  return { G, cfg, it26, it27, metragem: conta ? conta.v : null };
}

module.exports = { carregar, CIDADES };
