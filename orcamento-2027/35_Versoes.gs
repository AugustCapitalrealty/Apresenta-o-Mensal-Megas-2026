/**
 * ARQUIVO: 35_Versoes.gs — VERSÕES DA APRESENTAÇÃO (13/10/2026)
 *
 * V1 = a apresentação do Orçamento 2027 mostrada à diretoria na 1ª rodada (13/10/2026) — tudo o que foi feito até
 * aqui. Os apontamentos da diretoria estão na planilha "ORÇAMENTO 2027 - AJUSTES PEDIDOS PELO DIRETOR (13-10-2026)".
 * A V2 só começa quando o Guilherme confirmar; nela entra um slide com o que mudou desde a V1 (a fazer).
 *
 *   ▸ congelarV1() → guarda a V1, uma vez só:
 *       - cópia do deck de Facilities: "FACILITIES - ORÇAMENTO 2027 · V1 (apresentada à diretoria em 13-10-2026)",
 *         na pasta VERSÕES — nunca mais é gerada por cima;
 *       - a base de números da V1: "ORÇAMENTO 2027 - BASE V1.json" na pasta do orçamento — por Mega, a METRAGEM
 *         (contas da DRE, total, IPTU, seguro, área) e as linhas dos modelos 070/090 + contratos item a item (conta,
 *         item, 12 meses, total). É contra ela que a V2 diz o que mudou e quanto mexeu no R$ e no R$/m².
 *     Rodar de novo não refaz (a V1 é a que foi apresentada): o log diz onde ela está.
 */

const ORC_VERSAO_ATUAL = 'V1';
const ORC_V1 = {
  deck: 'FACILITIES - ORÇAMENTO 2027 · V1 (apresentada à diretoria em 13-10-2026)',
  base: 'ORÇAMENTO 2027 - BASE V1.json',
  pastaVersoes: '103UkBjeBrhvE1feH94aVOO6jymCoim7s',   // VERSÕES (onde estão a v3 e a v4 do gestor)
  propDeck: 'ORC_V1_DECK_ID',
  propBase: 'ORC_V1_BASE_ID'
};

function congelarV1() {
  const props = PropertiesService.getScriptProperties();
  const deckJa = props.getProperty(ORC_V1.propDeck), baseJa = props.getProperty(ORC_V1.propBase);
  if (deckJa && baseJa) {
    Logger.log('A V1 já está congelada — deck: https://docs.google.com/presentation/d/' + deckJa + '/edit · base: ' +
               'https://drive.google.com/file/d/' + baseJa + '/view. Não é refeita.');
    return;
  }
  const facId = _orcIdFacilities_();
  if (!facId) throw new Error('Falta o deck de Facilities (25_Facilities.gs).');

  // 1. O deck como foi apresentado.
  if (!deckJa) {
    const copia = DriveApp.getFileById(facId).makeCopy(ORC_V1.deck, DriveApp.getFolderById(ORC_V1.pastaVersoes));
    props.setProperty(ORC_V1.propDeck, copia.getId());
    Logger.log('V1 · deck congelado: ' + copia.getUrl());
  }

  // 2. Os números da V1, Mega a Mega.
  if (!baseJa) {
    const base = { versao: 'V1', quando: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
                   ano: ORC_ANO, megas: {} };
    ORC_FAC_MEGAS.forEach(k => {
      const cid = ORC_CIDADES[k];
      try {
        const v = _orcLerVisaoGeral_(k), rel = v.rel;
        base.megas[k] = {
          nome: cid.nome,
          area: { real: _orcAreaImplicita_(rel, 'real'), ritmo: _orcAreaImplicita_(rel, 'ritmo'), orc: _orcAreaImplicita_(rel, 'orc') },
          total: rel.total, areaComum: rel.areaComum, iptu: rel.iptu, seguro: rel.seguro,
          contas: rel.contas.map(c => ({ nome: c.nome, grupo: c.grupo, v: c.v })),
          itens: (v.modelos || []).map(l => ({ conta: l.conta, item: l.item, meses: l.meses.map(x => Math.round(x * 100) / 100),
                                              total: Math.round(l.total * 100) / 100 }))
        };
        Logger.log('V1 · ' + cid.nome + ': total ' + _orcMoeda_(rel.total.orc) + ' · ' + base.megas[k].itens.length + ' linhas dos modelos');
      } catch (e) {
        base.megas[k] = { nome: cid.nome, erro: e.message };
        Logger.log('V1 · ' + cid.nome + ': NÃO GUARDADO — ' + e.message + ' (rode congelarV1() de novo)');
      }
    });
    if (Object.keys(base.megas).some(k => base.megas[k].erro)) {
      throw new Error('A base da V1 não foi gravada: algum Mega não leu (o log diz qual). Rode congelarV1() de novo.');
    }
    const arq = DriveApp.getFolderById(ORC_PASTA_ORCAMENTO_ID)
      .createFile(ORC_V1.base, JSON.stringify(base, null, 1), MimeType.PLAIN_TEXT);
    props.setProperty(ORC_V1.propBase, arq.getId());
    Logger.log('V1 · base gravada: ' + arq.getUrl());
  }
  Logger.log('Pronto: V1 congelada. A V2 começa quando o Guilherme confirmar.');
}
