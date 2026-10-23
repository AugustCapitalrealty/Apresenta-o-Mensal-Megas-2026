/**
 * ARQUIVO: 35_Versoes.gs — VERSÕES DA APRESENTAÇÃO (13/10/2026)
 *
 * V1 = a apresentação do Orçamento 2027 mostrada à diretoria na 1ª rodada (13/10/2026) — tudo o que foi feito até
 * aqui. Os apontamentos da diretoria estão na planilha "ORÇAMENTO 2027 - AJUSTES PEDIDOS PELO DIRETOR (13-10-2026)".
 * V2 (22/10/2026): planilhas novas de 22/10 e o efeito Pátio Mercado Livre no Esteio. Os slides "Impacto das
 * revisões V1 → V2" (Facilities e cada Mega) saem da base da V1 contra a geração de agora (ORC_AJUSTES_V2).
 *
 *   ▸ congelarV1() → guarda a V1, uma vez só:
 *       - cópia do deck de Facilities: "FACILITIES - ORÇAMENTO 2027 · V1 (apresentada à diretoria em 13-10-2026)",
 *         na pasta VERSÕES — nunca mais é gerada por cima;
 *       - a base de números da V1: "ORÇAMENTO 2027 - BASE V1.json" na pasta do orçamento — por Mega, a METRAGEM
 *         (contas da DRE, total, IPTU, seguro, área) e as linhas dos modelos 070/090 + contratos item a item (conta,
 *         item, 12 meses, total). É contra ela que a V2 diz o que mudou e quanto mexeu no R$ e no R$/m².
 *     Rodar de novo não refaz (a V1 é a que foi apresentada): o log diz onde ela está.
 */

const ORC_VERSAO_ATUAL = 'V2';
const ORC_V1 = {
  deck: 'FACILITIES - ORÇAMENTO 2027 · V1 (apresentada à diretoria em 13-10-2026)',
  base: 'ORÇAMENTO 2027 - BASE V1.json',
  pastaVersoes: '103UkBjeBrhvE1feH94aVOO6jymCoim7s',   // VERSÕES (onde estão a v3 e a v4 do gestor)
  propDeck: 'ORC_V1_DECK_ID',
  propBase: 'ORC_V1_BASE_ID'
};

// Valores oficiais congelados da V1 (13/10/2026): reserva para quando a base da V1 não abre no Drive.
const ORC_V1_VALORES = {
  ESTEIO: 4020586.74,
  ITAJAI: 6643596.24,
  CURITIBA: 7528284.42,
  FACILITIES: 18192467.40
};
const ORC_V1_M2 = {
  ESTEIO: 6.27,
  ITAJAI: 5.12,
  CURITIBA: 4.71
};

// A base da V1 ("ORÇAMENTO 2027 - BASE V1.json", gravada por congelarV1): lida do Drive uma vez por execução.
const ORC_V1_BASE_ID_PADRAO = '1-O6ybc4RZfJeoEviENdGqc_yi14Mgxyu';
const _ORC_BASE_V1 = { dados: null, lido: false };
function _orcBaseV1_() {
  if (_ORC_BASE_V1.lido) return _ORC_BASE_V1.dados;
  _ORC_BASE_V1.lido = true;
  try {
    const id = PropertiesService.getScriptProperties().getProperty(ORC_V1.propBase) || ORC_V1_BASE_ID_PADRAO;
    _ORC_BASE_V1.dados = JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    Logger.log('Base da V1 não lida (' + e.message + '): o impacto V1 → V2 usa os valores da revisão de 22/10/2026.');
  }
  return _ORC_BASE_V1.dados;
}

// V1 de um Mega: total, R$/m² e itens dos modelos (070/090 + contratos) — da base; sem ela, ORC_V1_VALORES.
function _orcV1Mega_(chave) {
  const b = _orcBaseV1_(), m = b && b.megas && b.megas[chave];
  if (m && m.total && !m.erro) {
    return { total: m.total.orc, m2: m.area && m.area.orc ? m.total.orc / m.area.orc / 12 : ORC_V1_M2[chave],
             area: m.area && m.area.orc ? m.area.orc : null, itens: m.itens || null, contas: m.contas || null };
  }
  return { total: ORC_V1_VALORES[chave], m2: ORC_V1_M2[chave], area: null, itens: null };
}

// Detecta se a rodada atual é a V2 para incluir os slides de impacto
function _orcTemImpactoV2Mega_(chave, rel) {
  if (ORC_VERSAO_ATUAL !== 'V2') return false;
  if (!rel || !rel.total) return false;
  if (rel.patio && Math.abs(rel.patio.orc) > 0.5) return true;
  const v1 = ORC_V1_VALORES[chave];
  return v1 && Math.abs(rel.total.orc - v1) > 1000;
}

// Os ajustes da revisão de 22/10/2026, por Mega. Rótulo e observação são texto (conferidos com as planilhas em
// 22/10); o valor sai da diferença item a item entre a base da V1 e os modelos de agora: soma dos itens cujo nome
// (sem acento, minúsculo) casa com `pega`. `resto`: o que sobra para fechar no total (reajuste de contratos e a
// Despesa de pessoal, que vem da METRAGEM e não dos modelos). `ref`: o valor de 22/10 — a observação cita esses
// números, então valor diferente (planilha mudou) põe ⚠ na observação. itemFac/obsFac: o texto no slide de Facilities.
const ORC_AJUSTES_V2 = {
  ESTEIO: [
    { item: 'POSTOS SEGURANÇA VOIGT (AMZ B JAN–FEV)', conta: 'Segurança', ref: 55300.00,
      pega: /posto (diurno|noturno) voigt/,
      obs: 'Posto diurno (+26k) e noturno (+29,3k) Voigt Jan–Fev',
      itemFac: 'POSTOS ADICIONAIS DE SEGURANÇA', obsFac: 'Postos Voigt diurno (+26k) e noturno (+29,3k) no Armazém B em Jan–Fev' },
    { item: 'SELANTES E BACIAS DE CONTENÇÃO DIESEL', conta: 'Manutenção', ref: 18924.96,
      pega: /selantes das paredes m7|bacias de contencao/,
      obs: 'Carry-over selantes M7–M12 (+8,9k) e 2 bacias contenção (+9,9k)',
      itemFac: 'SELANTES E BACIAS DE CONTENÇÃO', obsFac: 'Carry-over selantes M7–M12 (+8,9k) e 2 bacias contenção diesel (+9,9k)' },
    // Itens com "RETIRADO DO ORÇAMENTO" no nome e valor no sistema: a geração não conta mais (02_Dados.gs, 22/10/2026).
    { item: 'ITENS RETIRADOS DO ORÇAMENTO', conta: 'Manutenção', ref: -1467.57,
      pega: /retirado do orcamento/,
      obs: 'Limpeza da galeria da comporta B2 (R$ 1.465,57) e 2 revisões da bomba do SPK (R$ 1 cada)' },
    { item: 'KEY ACCESS FACIAL, CONTRATOS E RH', conta: 'Outras', ref: 13088.71, resto: true,
      obs: 'Key Access facial (+3,6k), pessoal (+7,4k), contratos (+2k)',
      itemFac: 'KEY ACCESS, CONTRATOS E RH' }
  ],
  ITAJAI: [
    { item: 'OBRAS EXCLUÍDAS DE MANUTENÇÃO', conta: 'Manutenção', ref: -677604.00,
      pega: /reservatorio spk|nivelamento das docas|limpeza das estruturas metalicas do armazem|defensas metalicas|doca dos modulos 12|pavimento pintado|linha de vida vertical|placas de sinalizacao/,
      obs: 'Reservatório SPK (180k), docas 4/5 (151k), defensas (131k), limpeza (90k)...',
      obsFac: 'Saíram reservatório SPK (180k), docas 4/5 (151k), defensas (131k), limpeza (90k)...' },
    { item: 'OBRAS DAS CANCELAS (24 MESES)', conta: 'Manutenção', ref: 344234.00,
      pega: /obras das cancelas/,
      obs: 'Financiamento 24 meses: civil (+287k), elétrica (+38k), equip. (+19k)',
      itemFac: 'OBRAS DAS CANCELAS (24X)', obsFac: 'Financiamento 24 meses: civil (+287k), elétrica/lógica (+38k), equip. (+19k)' },
    { item: 'ALPHA SENSE E REFORÇO BOLSÃO', conta: 'Segurança', ref: -82035.00,
      pega: /alfa sense|reforco final do ano bolsao/,
      obs: 'Alpha Sense 10→7 meses (45k) e reforço bolsão 2→1 mês (37k)',
      obsFac: 'Alpha Sense reduzida de 10 para 7 meses (45k); reforço bolsão 2 para 1 mês (37k)' },
    { item: 'REVISÃO DE CONTRATOS E RH', conta: 'Contratos/RH', ref: 135042.41, resto: true,
      obs: 'Portovig segurança (+67,2k), Lauri Batista dedetização (+40k), limpeza e RH' }
  ],
  CURITIBA: [
    { item: 'POSTO 24H NOTURNO → 12H DIURNO', conta: 'Segurança', ref: -250120.40,
      pega: /posto adicional \(bolsao/,
      obs: 'Substituição de posto 24h noturno por 12h diurno (CCO/Bolsão)',
      obsFac: 'Substituição do posto noturno 24h por 12h diurno (CCO/Bolsão)' },
    { item: 'PAISAGISMO, TORNIQUETE E VGAS', conta: 'Manutenção', ref: -188891.00,
      pega: /area de paisagismo em 1500|digicon|preventiva das vgas/,
      obs: 'Paisagismo 200k→64k; torniquete 68,9k→39,9k; revisão 20 VGAs 47,4k→23,5k',
      obsFac: 'Paisagismo 200k→64k; torniquete 68,9k→39,9k; revisão de 20 VGAs 47,4k→23,5k' },
    { item: 'RETROFIT DA CASA DE BOMBAS', conta: 'Manutenção', ref: 179000.00,
      pega: /retrofit da casa de bombas/,
      obs: 'Alimentação de água potável (2 parcelas de R$ 89,5 mil)' },
    { item: 'REVISÃO DE CONTRATOS E RH', conta: 'Contratos/RH', ref: 93478.85, resto: true,
      obs: 'Vigilância (+51,5k), limpeza (+17,7k), manutenção (+9,4k), pessoal (+10k)' }
  ]
};
const ORC_IMPACTO_TOLERANCIA = 2;   // R$: arredondamento dos centavos entre a base e os modelos

// Diferença V2 − V1 por item (nome sem acento): { nomeItem: delta }.
function _orcDifItens_(itensV1, modelos) {
  const soma = (arr, sinal, out) => arr.forEach(l => {
    const k = _orcNorm_(l.item);
    out[k] = (out[k] || 0) + sinal * (Number(l.total) || 0);
  });
  const out = {};
  soma(itensV1, -1, out);
  soma(modelos, 1, out);
  return out;
}

// O impacto V1 → V2 de um Mega, fechando no total de agora (rel.total.orc, já sem o Pátio):
// { v1, v2, bruto, patio, m2V1, m2V2, m2Bruto, ajustes:[{…ajuste, delta, revisar}], daBase }.
function _orcImpactoMega_(chave, rel, modelos) {
  const v1 = _orcV1Mega_(chave);
  const v2 = rel.total.orc;
  const patio = rel.patio && Math.abs(rel.patio.orc) > 0.5 ? rel.patio.orc : 0;
  const bruto = v2 + patio;
  const dif = v1.itens && modelos ? _orcDifItens_(v1.itens, modelos) : null;
  const ajustes = (ORC_AJUSTES_V2[chave] || []).map(a => {
    let delta = a.ref;
    if (dif && !a.resto) {
      delta = Object.keys(dif).filter(k => a.pega.test(k)).reduce((t, k) => t + dif[k], 0);
    }
    return Object.assign({}, a, { delta: delta });
  });
  const somaPegos = ajustes.filter(a => !a.resto).reduce((t, a) => t + a.delta, 0);
  ajustes.filter(a => a.resto).forEach(a => { a.delta = bruto - v1.total - somaPegos; });
  ajustes.forEach(a => { a.revisar = Math.abs(a.delta - a.ref) > ORC_IMPACTO_TOLERANCIA; });
  const m2V2 = rel.m2Total ? rel.m2Total.orc : 0;
  return {
    v1: v1.total, v2: v2, bruto: bruto, patio: patio, m2V1: v1.m2, m2V2: m2V2,
    m2Bruto: rel.m2TotalBruto ? rel.m2TotalBruto.orc : m2V2,
    m2Patio: v2 ? patio * m2V2 / v2 : 0,
    ajustes: ajustes.filter(a => Math.abs(a.delta) >= 0.5 || a.revisar),
    daBase: !!dif
  };
}

function _orcObsImpacto_(a, fac) {
  const t = (fac && a.obsFac) || a.obs;
  return a.revisar ? '⚠ ' + t : t;
}

function _orcPctCurto_(pct) {
  return (pct < 0 ? '−' : '+') + (Math.abs(pct) * 100).toFixed(1).replace('.', ',') + '%';
}

function _orcTemImpactoV2_(rels) {
  if (ORC_VERSAO_ATUAL !== 'V2') return false;
  if (!rels) return false;
  return Object.keys(rels).some(k => _orcTemImpactoV2Mega_(k, rels[k]));
}

// ==========================================
// FORMATAÇÃO ESTILO FOTO DO USUÁRIO (R01..R04)
// ==========================================
function _orcDeltaImpacto_(d) {
  if (d === null || d === undefined || Math.abs(d) < 0.5) return '–';
  const r = Math.round(d);
  if (r < 0) return '(' + _orcMilhar_(Math.abs(r)) + ')';
  return '+' + _orcMilhar_(r);
}

function _orcPctImpacto_(pct) {
  if (pct === null || pct === undefined || Math.abs(pct) < 0.0001) return '0,00%';
  const p = (pct * 100).toFixed(2).replace('.', ',');
  return (pct > 0 ? '+' : '') + p + '%';
}

/**
 * Tabela de evolução das rodadas no padrão da foto enviada pela gestão:
 * Cabeçalho azul escuro, linhas de versão cinza claro com rótulo à direita,
 * linhas de ajuste com bordas suaves e reduções em vermelho entre parênteses.
 */
function _orcTabelaImpacto_(slide, x, y, w, h, colunas, linhas) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography;
  const hCab = 16, xs = [];
  let acc = x;
  colunas.forEach(c => { xs.push(acc); acc += c.w; });

  // Faixa do cabeçalho
  _orcRet_(slide, x, y, w, hCab, C.brandDark);
  colunas.forEach((c, i) => {
    _orcUmaLinha_(slide, xs[i] + 4, y, c.w - 8, hCab, c.titulo,
      { align: c.align || 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: T.titles, folga: 4, cortar: true });
  });

  const y0 = y + hCab;
  const rowH = Math.min(16, (h - hCab) / Math.max(1, linhas.length));
  const fs = rowH >= 13 ? 7 : (rowH >= 11 ? 6.5 : 6);

  linhas.forEach((ln, r) => {
    const ry = y0 + r * rowH;
    const ehSaldo = ln.tipo === 'saldo' || ln.tipo === 'subtotal';
    const ehDestaque = ln.destaque;
    const bg = ehSaldo ? (ehDestaque ? C.brandDark : '#E2E8F0') : (ehDestaque ? '#FEF2F2' : (r % 2 === 1 ? '#F8FAFC' : '#FFFFFF'));
    _orcRet_(slide, x, ry, w, rowH, bg);
    _orcLinha_(slide, x, ry + rowH, x + w, ry + rowH, C.lines, 0.5);

    ln.celulas.forEach((cel, k) => {
      if (!cel) return;
      const c = colunas[k];
      const bold = ehSaldo || !!cel.bold;
      let corTexto = ehSaldo ? (ehDestaque ? '#FFFFFF' : C.brandDark) : (cel.cor || C.textMain);
      if (cel.sentido === -1) corTexto = ehSaldo && ehDestaque ? _ORC_COR_VAR.desceClaro : _ORC_COR_VAR.sobe;
      else if (cel.sentido === 1) corTexto = ehSaldo && ehDestaque ? '#FFFFFF' : C.brandDark;

      _orcUmaLinha_(slide, xs[k] + 4, ry, c.w - 8, rowH, cel.texto,
        { align: cel.align || c.align || 'L', fs: fs, bold: bold, cor: corTexto,
          fonte: (ehSaldo || cel.bold) ? T.titles : T.body, folga: 4, cortar: true });
    });
  });

  _orcSombraTabela_(x, y, w, hCab + linhas.length * rowH);
  return y0 + linhas.length * rowH;
}

// ==========================================
// SLIDE DE IMPACTO — CONSOLIDADO FACILITIES
// ==========================================
// rels: METRAGEM de cada Mega; modelosPor: linhas dos modelos de cada Mega (sem elas, os valores de 22/10).
// Ordem da revisão de 22/10: Curitiba, Esteio, Itajaí. Mega sem METRAGEM: sem slide (null).
function _orcLinhasImpactoFacilities_(rels, modelosPor) {
  const ordem = ['CURITIBA', 'ESTEIO', 'ITAJAI'];
  if (ordem.some(k => !rels || !rels[k] || !rels[k].total)) return null;
  const imp = {};
  ordem.forEach(k => { imp[k] = _orcImpactoMega_(k, rels[k], modelosPor ? modelosPor[k] : null); });
  const v1Tot = ordem.reduce((t, k) => t + imp[k].v1, 0);
  const patio = ordem.reduce((t, k) => t + imp[k].patio, 0);
  let saldo = v1Tot;
  const linhas = [];

  // Saldo inicial V1
  linhas.push({
    tipo: 'saldo',
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V1 - 13/10) -->', align: 'R', bold: true },
      { texto: 'FACILITIES', align: 'C', bold: true },
      { texto: _orcMoeda_(v1Tot), align: 'R', bold: true },
      { texto: '0,00%', align: 'C', bold: true },
      { texto: 'Apresentação à Diretoria (1ª rodada)', align: 'L' }
    ]
  });

  // Os ajustes da revisão de 22/10/2026 (ORC_AJUSTES_V2), com o valor de agora
  ordem.forEach(k => imp[k].ajustes.forEach(aj => {
    saldo += aj.delta;
    const pctAcum = (saldo - v1Tot) / v1Tot;
    linhas.push({
      tipo: 'item',
      celulas: [
        { texto: aj.itemFac || aj.item, align: 'L' },
        { texto: ORC_CIDADES[k].nome.toUpperCase(), align: 'C' },
        { texto: _orcDeltaImpacto_(aj.delta), align: 'R', sentido: aj.delta < 0 ? -1 : 1 },
        { texto: _orcPctImpacto_(pctAcum), align: 'C', sentido: pctAcum < 0 ? -1 : 1 },
        { texto: _orcObsImpacto_(aj, true), align: 'L' }
      ]
    });
  }));

  // Subtotal antes do Pátio Mercado Livre e a linha do Pátio (só o Esteio tem)
  if (patio) {
    linhas.push({
      tipo: 'subtotal',
      celulas: [
        { texto: 'SUBTOTAL V2 (ANTES DO PÁTIO) -->', align: 'R', bold: true },
        { texto: 'FACILITIES', align: 'C', bold: true },
        { texto: _orcMoeda_(saldo), align: 'R', bold: true },
        { texto: _orcPctImpacto_((saldo - v1Tot) / v1Tot), align: 'C', bold: true },
        { texto: 'Total das revisões de Facilities antes do Pátio Mercado Livre', align: 'L' }
      ]
    });
    saldo -= patio;
    linhas.push({
      tipo: 'item',
      destaque: true,
      celulas: [
        { texto: 'EFEITO PÁTIO MERCADO LIVRE', align: 'L', bold: true },
        { texto: 'MEGA ESTEIO', align: 'C', bold: true },
        { texto: _orcDeltaImpacto_(-patio), align: 'R', bold: true, sentido: -1 },
        { texto: _orcPctImpacto_((saldo - v1Tot) / v1Tot), align: 'C', bold: true, sentido: -1 },
        { texto: 'Abatimento do Pátio Mercado Livre (−R$ ' + _orcM2_(imp.ESTEIO.m2Patio) + '/m² no Esteio)', align: 'L', bold: true }
      ]
    });
  }

  // Saldo final V2
  const pctFinal = (saldo - v1Tot) / v1Tot;
  linhas.push({
    tipo: 'saldo',
    destaque: true,
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V2 FINAL - 22/10) -->', align: 'R', bold: true },
      { texto: 'FACILITIES', align: 'C', bold: true },
      { texto: _orcMoeda_(saldo), align: 'R', bold: true },
      { texto: _orcPctImpacto_(pctFinal), align: 'C', bold: true },
      { texto: (pctFinal < 0 ? 'Redução líquida' : 'Aumento líquido') + ' vs. V1 de 13/10 (' + _orcPctCurto_(pctFinal) + ' no consolidado)',
        align: 'L', bold: true }
    ]
  });

  linhas.revisar = ordem.some(k => imp[k].ajustes.some(a => a.revisar));
  linhas.daBase = ordem.every(k => imp[k].daBase);
  return linhas;
}

// modelosPor: opcional (a abertura lê os modelos de cada Mega aqui; sem eles, os valores de 22/10).
function gerarSlideImpactoFacilities_(slide, W, H, rels, modelosPor) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  _orcHeader_(slide, W, 'Impacto das revisões — Facilities · V1 → V2',
    'Evolução do Orçamento 2027 entre a 1ª rodada (13/10) e a 2ª rodada (22/10) · valores com IPTU e seguro');

  const tw = W - MX * 2;
  const colunas = [
    { titulo: 'ITEM / MANUTENÇÃO', w: 165, align: 'L' },
    { titulo: 'EMPREENDIMENTO', w: 90, align: 'C' },
    { titulo: '2027', w: 75, align: 'R' },
    { titulo: 'Δ% ACUM.', w: 54, align: 'C' },
    { titulo: 'OBSERVAÇÃO', w: 280, align: 'L' }
  ];

  let modelos = modelosPor;
  if (!modelos) {
    modelos = {};
    ORC_FAC_MEGAS.forEach(k => {
      try { modelos[k] = _orcLinhasModelosCidade_(k); }
      catch (e) { Logger.log('Impacto V1 → V2: modelos de ' + ORC_CIDADES[k].nome + ' não lidos — ' + e.message); }
    });
  }
  const linhas = _orcLinhasImpactoFacilities_(rels, modelos);
  if (!linhas) throw new Error('falta a METRAGEM de algum Mega: o impacto de Facilities não fecha sem os três');
  const yTabela = 72, hTabela = H - 26 - yTabela;
  _orcTabelaImpacto_(slide, MX, yTabela, tw, hTabela, colunas, linhas);

  _orcRodape_(slide, W, H, _orcRodapeImpacto_('Fonte: Apresentação V1 (13/10/2026) × Atualização das planilhas de 22/10/2026', linhas));
}

// ==========================================
// SLIDE DE IMPACTO — POR MEGA
// ==========================================
// modelos: linhas dos modelos do Mega (070/090 + contratos); sem elas, os valores de 22/10 (ORC_AJUSTES_V2.ref).
function _orcLinhasImpactoMega_(chave, rel, modelos) {
  const imp = _orcImpactoMega_(chave, rel, modelos);
  const v1 = imp.v1;
  let saldo = v1;
  const linhas = [];

  linhas.push({
    tipo: 'saldo',
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V1 - 13/10) -->', align: 'R', bold: true },
      { texto: 'TOTAL V1', align: 'C', bold: true },
      { texto: _orcMoeda_(v1), align: 'R', bold: true },
      { texto: '0,00%', align: 'C', bold: true },
      { texto: 'Apresentado à Diretoria na 1ª rodada (R$ ' + _orcM2_(imp.m2V1) + '/m²)', align: 'L' }
    ]
  });

  imp.ajustes.forEach(aj => {
    saldo += aj.delta;
    const pctAcum = (saldo - v1) / v1;
    linhas.push({
      tipo: 'item',
      celulas: [
        { texto: aj.item, align: 'L' },
        { texto: aj.conta, align: 'C' },
        { texto: _orcDeltaImpacto_(aj.delta), align: 'R', sentido: aj.delta < 0 ? -1 : 1 },
        { texto: _orcPctImpacto_(pctAcum), align: 'C', sentido: pctAcum < 0 ? -1 : 1 },
        { texto: _orcObsImpacto_(aj, false), align: 'L' }
      ]
    });
  });

  if (imp.patio) {
    linhas.push({
      tipo: 'subtotal',
      celulas: [
        { texto: 'SUBTOTAL ANTES DO PÁTIO ML -->', align: 'R', bold: true },
        { texto: ORC_CIDADES[chave].nome.replace(/^Mega /, '').toUpperCase(), align: 'C', bold: true },
        { texto: _orcMoeda_(saldo), align: 'R', bold: true },
        { texto: _orcPctImpacto_((saldo - v1) / v1), align: 'C', bold: true },
        { texto: 'Orçamento antes do abatimento do Pátio ML (R$ ' + _orcM2_(imp.m2Bruto) + '/m² ao mês)', align: 'L' }
      ]
    });

    saldo -= imp.patio;
    linhas.push({
      tipo: 'item',
      destaque: true,
      celulas: [
        { texto: 'EFEITO PÁTIO MERCADO LIVRE', align: 'L', bold: true },
        { texto: 'ÁREA COMUM', align: 'C', bold: true },
        { texto: _orcDeltaImpacto_(-imp.patio), align: 'R', bold: true, sentido: -1 },
        { texto: _orcPctImpacto_((saldo - v1) / v1), align: 'C', bold: true, sentido: -1 },
        { texto: 'Abatimento do Pátio Mercado Livre (−R$ ' + _orcM2_(imp.m2Patio) + '/m²)', align: 'L', bold: true }
      ]
    });
  }

  const pctFinalGeral = (saldo - v1) / v1;
  linhas.push({
    tipo: 'saldo',
    destaque: true,
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V2 FINAL - 22/10) -->', align: 'R', bold: true },
      { texto: 'TOTAL V2', align: 'C', bold: true },
      { texto: _orcMoeda_(saldo), align: 'R', bold: true },
      { texto: _orcPctImpacto_(pctFinalGeral), align: 'C', bold: true },
      { texto: (pctFinalGeral < 0 ? 'Redução líquida' : 'Aumento líquido') + ' vs. V1 · R$ ' + _orcM2_(imp.m2V2) + '/m² ao mês',
        align: 'L', bold: true }
    ]
  });

  linhas.revisar = imp.ajustes.some(a => a.revisar);
  linhas.daBase = imp.daBase;
  linhas.imp = imp;
  return linhas;
}

// Rodapé do slide de impacto: a fonte e, quando for o caso, o aviso do ⚠ e da base da V1 que não abriu.
function _orcRodapeImpacto_(fonte, linhas) {
  let t = fonte + ' · reduções em vermelho entre parênteses';
  if (linhas.revisar) t += ' · ⚠ valor diferente do da revisão de 22/10: revisar a observação';
  if (!linhas.daBase) t += ' · base V1 não lida: valores da revisão de 22/10';
  return t;
}

function gerarSlideImpactoMega_(slide, W, H, cid, rel, modelos) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const chave = Object.keys(ORC_CIDADES).filter(k => ORC_CIDADES[k].nome === cid.nome)[0] || 'ESTEIO';
  _orcHeader_(slide, W, 'Impacto das revisões — ' + cid.nome + ' · V1 → V2',
    'O que mudou entre a apresentação da 1ª rodada (13/10) e a revisão da 2ª rodada (22/10) · valores com IPTU e seguro');

  const linhas = _orcLinhasImpactoMega_(chave, rel, modelos);
  const imp = linhas.imp;

  // Cards resumo no topo
  const v1 = imp.v1, v2 = imp.v2, delta = v2 - v1;
  const m2V1 = imp.m2V1, m2V2 = imp.m2V2;

  const ky = 74, kh = 48, gap = 10, kw = (W - MX * 2 - gap * 3) / 4;
  const kpis = [
    ['V1 · 13/10/2026', _orcMoeda_(v1), 'R$ ' + _orcM2_(m2V1) + '/m² ao mês'],
    ['Variação V1 → V2', (delta >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(delta)), _orcPctImpacto_(v1 ? delta / v1 : 0) + ' no orçamento'],
    imp.patio
      ? ['Efeito Pátio ML', '−' + _orcMoeda_(imp.patio), '−R$ ' + _orcM2_(imp.m2Patio) + '/m² ao mês']
      : [m2V2 <= m2V1 ? 'Redução por m²' : 'Aumento por m²',
         (m2V2 <= m2V1 ? '−' : '+') + 'R$ ' + _orcM2_(Math.abs(m2V2 - m2V1)) + '/m²', 'custo unitário'],
    ['V2 Final · 22/10', _orcMoeda_(v2), 'R$ ' + _orcM2_(m2V2) + '/m² ao mês']
  ];

  kpis.forEach((kp, i) => {
    const x = MX + i * (kw + gap);
    const escuro = i === 3;
    _orcRet_(slide, x, ky, kw, kh, escuro ? C.brandDark : C.cardBg, { redondo: true, borda: escuro ? null : C.lines });
    _orcUmaLinha_(slide, x + 10, ky + 4, kw - 20, 12, kp[0].toUpperCase(),
      { align: 'L', fs: 6.5, bold: true, cor: escuro ? C.brandSoft : C.textBody, fonte: T.titles });
    _orcUmaLinha_(slide, x + 10, ky + 16, kw - 20, 18, kp[1],
      { align: 'L', fs: 13, bold: true, cor: escuro ? '#FFFFFF' : (i === 1 ? (delta < 0 ? _ORC_COR_VAR.desce : _ORC_COR_VAR.sobe) : C.brandDark), fonte: T.titles, fsMin: 9 });
    _orcUmaLinha_(slide, x + 10, ky + 34, kw - 20, 11, kp[2],
      { align: 'L', fs: 6.5, cor: escuro ? '#CBD5E1' : C.textBody, fonte: T.body, cortar: true });
  });

  // Tabela no formato da foto logo abaixo
  const tw = W - MX * 2;
  const colunas = [
    { titulo: 'ITEM / MANUTENÇÃO', w: 165, align: 'L' },
    { titulo: 'CONTA / DISCIPLINA', w: 90, align: 'C' },
    { titulo: '2027', w: 75, align: 'R' },
    { titulo: 'Δ% ACUM.', w: 54, align: 'C' },
    { titulo: 'OBSERVAÇÃO', w: 280, align: 'L' }
  ];

  const yTabela = ky + kh + 10, hTabela = H - 26 - yTabela;
  _orcTabelaImpacto_(slide, MX, yTabela, tw, hTabela, colunas, linhas);

  _orcRodape_(slide, W, H, _orcRodapeImpacto_('Fonte: METRAGEM-COND e modelos 070/090 de 22/10/2026 vs. base V1 de 13/10/2026', linhas));
}

// ==========================================
// SLIDE "O QUE SAIU E O QUE ENTROU" — POR MEGA (Guilherme, 22/10/2026)
// ==========================================
// Item a item (modelos 070/090 + contratos), base da V1 × agora, com o efeito de cada um no R$/m² ao mês. Vem
// logo depois do slide de impacto; incluirSlideEntrouSaiu() (27_Atualizar.gs) põe só ele no deck já gerado.
// A ponte do R$/m² fecha: cada R$ dividido pela área V2 (÷ 12), mais o efeito da área (o total V1 na área nova).
const ORC_ES_MIN = 5000;   // R$: abaixo disso o item vai para "Demais ajustes" (reajuste de contrato)

// { v1, v2, m2V1, m2V2, area1, area2, patio, reduz:[linha], aumenta:[linha], metragem, efArea, semEfeito:[linha] }
// linha = { nome, conta, v1, v2, d }. Sem a base da V1 (ou sem a área), null.
function _orcEntrouSaiu_(chave, rel, modelos) {
  const cid = ORC_CIDADES[chave], v1 = _orcV1Mega_(chave);
  const area2 = _orcAreaImplicita_(rel, 'orc');
  if (!v1.itens || !v1.area || !area2 || !modelos) return null;

  // Contas cujo item não mexe no total: as de dentro de uma conta da METRAGEM e as em que vale a METRAGEM.
  const semTotal = {};
  Object.keys(ORC_CONTAS_DENTRO).forEach(k => { semTotal[_orcChaveConta_(k)] = true; });
  (cid.relatorios.valeMetragem || []).forEach(k => { semTotal[_orcChaveConta_(k)] = true; });

  const porItem = {};
  const juntar = (arr, campo) => arr.forEach(l => {
    const k = _orcNorm_(l.item);
    const r = porItem[k] || (porItem[k] = { nome: l.item, conta: _orcChaveConta_(l.conta), v1: 0, v2: 0 });
    r[campo] += Number(l.total) || 0;
  });
  juntar(v1.itens, 'v1');
  juntar(modelos, 'v2');
  let linhas = Object.keys(porItem).map(k => porItem[k]);
  linhas.forEach(r => { r.d = r.v2 - r.v1; });
  linhas = linhas.filter(r => Math.abs(r.d) >= 0.5);

  // Item que só trocou de nome (saiu um e entrou outro, mesma conta e mesmo valor): fica de fora.
  const saiu = linhas.filter(r => Math.abs(r.v2) < 0.5), entrou = linhas.filter(r => Math.abs(r.v1) < 0.5);
  saiu.forEach(s => {
    const par = entrou.filter(e => !e.renomeado && e.conta === s.conta && Math.abs(e.v2 - s.v1) < 1)[0];
    if (par) { par.renomeado = true; s.renomeado = true; }
  });
  linhas = linhas.filter(r => !r.renomeado);

  // O mesmo item em vários armazéns ("… AMZ 1", "… AMZ 2"…) numa linha só: "4× … (AMZ 1 a 4)".
  const grupos = {};
  linhas.forEach(r => {
    const m = String(r.nome).match(/^(.*?)\s*AMZ\s*(\d+)\s*$/i);
    if (!m) return;
    const k = r.conta + '|' + _orcNorm_(m[1]) + '|' + (r.d < 0 ? '-' : '+');
    (grupos[k] || (grupos[k] = { base: m[1], nums: [], itens: [] })).itens.push(r);
    grupos[k].nums.push(+m[2]);
  });
  Object.keys(grupos).forEach(k => {
    const g = grupos[k];
    if (g.itens.length < 2) return;
    const nums = g.nums.sort((a, b) => a - b), r0 = g.itens[0];
    const junto = { nome: g.base + ' (AMZ ' + nums[0] + ' a ' + nums[nums.length - 1] + ')', vezes: g.itens.length, conta: r0.conta,
                    v1: 0, v2: 0, d: 0 };
    g.itens.forEach(r => { junto.v1 += r.v1; junto.v2 += r.v2; junto.d += r.d; });
    linhas = linhas.filter(r => g.itens.indexOf(r) < 0).concat([junto]);
  });

  const semEfeito = linhas.filter(r => semTotal[r.conta]);
  const contam = linhas.filter(r => !semTotal[r.conta]);
  const patio = rel.patio && Math.abs(rel.patio.orc) > 0.5 ? rel.patio.orc : 0;
  const v2 = rel.total.orc;
  const somaItens = contam.reduce((t, r) => t + r.d, 0);
  // O que não vem dos modelos: a Despesa de pessoal, que vem pronta da METRAGEM (RH). Se a sobra for só ela (até R$ 1),
  // o cartão diz "Despesa de pessoal" com o de/para; senão, "Pessoal e outras (METRAGEM)".
  const metragem = v2 + patio - v1.total - somaItens;
  const kPes = _orcChaveConta_('Despesa de pessoal');
  const pes = arr => (arr || []).filter(c => _orcChaveConta_(c.nome) === kPes).reduce((t, c) => t + ((c.v && c.v.orc) || 0), 0);
  const pes1 = pes(v1.contas), pes2 = pes(rel.contas);
  return {
    v1: v1.total, v2: v2, m2V1: v1.total / v1.area / 12, m2V2: v2 / area2 / 12, area1: v1.area, area2: area2, patio: patio,
    reduz: contam.filter(r => r.d < 0).sort((a, b) => a.d - b.d),
    aumenta: contam.filter(r => r.d > 0).sort((a, b) => b.d - a.d),
    metragem: metragem,
    pessoal: { v1: pes1, v2: pes2, so: !!(v1.contas && Math.abs(metragem - (pes2 - pes1)) < 1) },
    efArea: v1.total / 12 * (1 / area2 - 1 / v1.area),
    semEfeito: semEfeito
  };
}

// "[ESTRUTURA METÁLICA] - LIMPEZA DO RESERVATÓRIO SPK (R$ 188,88/M2 X 800M2)" → tag "Estrutura Metálica", base
// "Limpeza, Tratamento e Pintura do Reservatório SPK" (sem a conta do R$/m²), contrato: "CONTRATO — X".
const _ORC_ES_SIGLAS = ['SPK', 'VGAS', 'VGA', 'AMZ', 'CCO', 'RH', 'PPCI', 'BT', 'AVAC', 'SP', 'STE', 'ML', 'LCW', 'RD', 'CFTV', 'SCPQ', 'TX1500'];
const _ORC_ES_MINUSC = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'na', 'no', 'para', 'com', 'ao', 'à', 'por', 'e/ou'];
// Abreviações só quando o nome não cabe (antes de tirar parênteses e palavras do fim).
const _ORC_ES_ABREV = [[/\bInstalação\b/g, 'Inst.'], [/\bManutenção\b/g, 'Manut.'], [/\bSubstituição\b/g, 'Subst.'],
  [/\bImplantação\b/g, 'Implant.'], [/\bPreventiva\b/g, 'Prev.'], [/\bMetálicas?\b/g, 'Metál.'], [/\bEstruturas?\b/g, 'Estr.'],
  [/\bArmazém\b/g, 'AMZ'], [/\bServiços?\b/g, 'Serv.'], [/\bFinanciamento\b/g, 'Financ.'], [/\bReferente\b/g, 'Ref.']];
function _orcTituloES_(t) {
  if (t.replace(/\([^)]*\)/g, '') !== t.replace(/\([^)]*\)/g, '').toUpperCase()) return t;
  return t.toLowerCase().split(' ').map((p, i) => {
    const P = p.toUpperCase();
    if (_ORC_ES_SIGLAS.indexOf(P.replace(/[^A-Z0-9]/g, '')) >= 0 || /\d/.test(p)) return P;
    if (i > 0 && _ORC_ES_MINUSC.indexOf(p) >= 0) return p;
    return p.replace(/^([("']?)(\S)/, (m, a, c) => a + c.toUpperCase());
  }).join(' ');
}
function _orcPartesItemES_(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim();
  const contrato = /^CONTRATO\s*[—–-]\s*/i.test(t);
  t = t.replace(/^CONTRATO\s*[—–-]\s*/i, '');
  const tags = [];
  t = t.replace(/^(\s*\[[^\]]*\]\s*[-–—]?\s*)+/, m => { m.replace(/\[([^\]]*)\]/g, (x, g) => { tags.push(g); return x; }); return ''; });
  t = t.replace(/\s*\([^)]*(R\$|M2|M²|\bX\b)[^)]*\)/gi, '').replace(/\s*-\s*$/, '').trim();
  return { tag: tags.filter(x => !/^MEGA /i.test(x)).pop() || '', base: t, contrato: contrato };
}
// Nome que cabe em `util` pt a `fs` pt (sem "…"): com a tag na frente quando pedida ("Civil — Obras das Cancelas…",
// itens que sem ela ficariam iguais), "4× " na frente do item juntado; se não couber, saem os parênteses e depois
// palavras do fim.
function _orcNomeItemES_(s, util, fs, comTag, vezes) {
  const p = _orcPartesItemES_(s);
  let t = (vezes > 1 ? vezes + '× ' : '') + (comTag && p.tag ? _orcTituloES_(p.tag) + ' — ' : '') +
          (p.contrato ? 'Contrato ' : '') + _orcTituloES_(p.base);
  const f = CR_DESIGN_SYSTEM.typography.body;
  const cabe = x => _orcLarguraTexto_(x, fs || 6, f, false) <= util * 0.92;   // folga: a medida estimada erra um pouco
  if (!cabe(t)) _ORC_ES_ABREV.forEach(a => { if (!cabe(t)) t = t.replace(a[0], a[1]); });
  if (!cabe(t)) t = t.replace(/\s*\([^)]*\)/g, '');
  while (!cabe(t) && t.split(' ').length > 1) {
    t = t.split(' ').slice(0, -1).join(' ').replace(/(\s+(de|da|do|das|dos|e|para|com|a|o|em|na|no|ao|via)|[\s,:;(–—-])+$/i, '');
  }
  return t.replace(/\s*\([^)]*$/, '');
}

function _orcM2Sinal_(v) {
  if (Math.abs(v) < 0.005) return '0,00';
  return (v < 0 ? '−' : '+') + _orcM2_(Math.abs(v));
}

function gerarSlideEntrouSaiu_(slide, W, H, cid, rel, modelos) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const chave = Object.keys(ORC_CIDADES).filter(k => ORC_CIDADES[k].nome === cid.nome)[0];
  const es = _orcEntrouSaiu_(chave, rel, modelos);
  if (!es) {
    _orcHeader_(slide, W, 'O que saiu e o que entrou — ' + cid.nome + ' · V1 → V2', 'Item a item · efeito no R$/m² ao mês');
    _orcParagrafo_(slide, MX, 140, W - MX * 2, 40, 'Sem a base da V1 (ORÇAMENTO 2027 - BASE V1.json) ou sem os modelos de agora ' +
      'não dá para comparar item a item.', { fs: 10, cor: C.textMuted, align: 'C' });
    return;
  }
  const porM2 = d => d / es.area2 / 12;
  _orcHeader_(slide, W, 'O que saiu e o que entrou — ' + cid.nome + ' · V1 → V2',
    'Item a item (modelos 070/090 e contratos) · R$/m² ao mês: V1 R$ ' + _orcM2_(es.m2V1) + ' → V2 R$ ' + _orcM2_(es.m2V2) +
    ' (' + _orcM2Sinal_(es.m2V2 - es.m2V1) + ')');

  // ---- Ponte do R$/m² (topo): cada passo com o R$/m² e o R$ ----
  const soma = arr => arr.reduce((t, r) => t + r.d, 0);
  const sR = soma(es.reduz), sA = soma(es.aumenta);
  const passos = [
    { rot: 'V1 · 13/10', m2: _orcM2_(es.m2V1), rs: _orcMoeda_(es.v1), cheio: true },
    { rot: 'Saiu ou reduziu', m2: _orcM2Sinal_(porM2(sR)), rs: Math.abs(sR) < 0.5 ? 'nenhum item' : '−' + _orcMoeda_(Math.abs(sR)), s: -1 },
    { rot: 'Entrou ou aumentou', m2: _orcM2Sinal_(porM2(sA)), rs: Math.abs(sA) < 0.5 ? 'nenhum item' : '+' + _orcMoeda_(sA), s: 1 },
    { rot: es.pessoal.so ? 'Despesa de pessoal' : 'Pessoal e outras (METRAGEM)', m2: _orcM2Sinal_(porM2(es.metragem)),
      rs: (es.metragem < 0 ? '−' : '+') + _orcMoeda_(Math.abs(es.metragem)) +
          (es.pessoal.so ? ' · ' + _orcMil_(es.pessoal.v1) + ' → ' + _orcMil_(es.pessoal.v2) + ' mil' : ''),
      s: es.metragem < 0 ? -1 : 1 }
  ];
  if (es.patio) passos.push({ rot: 'Pátio Mercado Livre', m2: _orcM2Sinal_(porM2(-es.patio)), rs: '−' + _orcMoeda_(es.patio), s: -1 });
  // Sem o passo "Efeito da área" (Guilherme, 22/10/2026: a área não mudou da V1 para a V2 — a diferença da área
  // implícita é arredondamento, ±0,01/m²). es.efArea continua calculado (o teste confere que a conta fecha).
  passos.push({ rot: 'V2 · 22/10', m2: _orcM2_(es.m2V2), rs: _orcMoeda_(es.v2), cheio: true });

  const tw = W - MX * 2, py = 66, ph = 40, pg = 6, pw = (tw - pg * (passos.length - 1)) / passos.length;
  passos.forEach((p, i) => {
    const x = MX + i * (pw + pg);
    _orcRet_(slide, x, py, pw, ph, p.cheio ? C.brandDark : C.cardBg, { redondo: true, borda: p.cheio ? null : C.lines });
    // Passo que arredonda para 0,00/m²: cinza (nem sobe nem desce).
    const cor = p.cheio ? '#FFFFFF' : (p.m2 === '0,00' ? C.textMuted : (p.s < 0 ? _ORC_COR_VAR.desce : _ORC_COR_VAR.sobe));
    _orcUmaLinha_(slide, x + 6, py + 3, pw - 12, 10, p.rot.toUpperCase(),
      { align: 'L', fs: 5.5, bold: true, cor: p.cheio ? C.brandSoft : C.textBody, fonte: T.titles, fsMin: 4.5 });
    _orcUmaLinha_(slide, x + 6, py + 13, pw - 12, 15, (p.cheio ? 'R$ ' : '') + p.m2 + '/m²',
      { align: 'L', fs: 11, bold: true, cor: cor, fonte: T.titles, fsMin: 7 });
    _orcUmaLinha_(slide, x + 6, py + 28, pw - 12, 10, p.rs,
      { align: 'L', fs: 6, cor: p.cheio ? '#CBD5E1' : C.textBody, fonte: T.body, fsMin: 4.5 });
  });

  // ---- As duas tabelas: saiu ou reduziu | entrou ou aumentou ----
  // Os dois cartões com a altura do maior conteúdo (sem quadro vazio até o rodapé).
  const nota = es.semEfeito.length ? 12 : 0, gap = 10, cw = (tw - gap) / 2;
  let rowH = 11;
  const ty = py + ph + 10, thMax = H - 26 - ty - nota;
  const cols = [{ t: 'ITEM', w: cw - 16 - 150, a: 'L' }, { t: 'V1 → V2 (R$ MIL)', w: 66, a: 'R' },
                { t: 'R$', w: 46, a: 'R' }, { t: 'R$/M²', w: 38, a: 'R' }];
  const fsL = 6.5, utilNome = _orcUtilUmaLinha_(cols[0].w - 2, 'L', 2);
  const cabemMax = Math.max(2, Math.floor((thMax - 29 - 6) / rowH) - 1);   // linhas de item; a última é o total
  const montar = arr => {
    const grandes = arr.filter(r => Math.abs(r.d) >= ORC_ES_MIN);
    let mostra = grandes, resto = arr.filter(r => Math.abs(r.d) < ORC_ES_MIN);
    if (mostra.length + (resto.length ? 1 : 0) > cabemMax) {
      mostra = grandes.slice(0, cabemMax - 1);
      resto = arr.filter(r => mostra.indexOf(r) < 0);
    }
    // Itens que sem a tag ficariam iguais (as três "Obras das Cancelas"): com a tag na frente.
    const chave = r => _orcNorm_(_orcPartesItemES_(r.nome).base.replace(/\s*\([^)]*\)/g, '')).split(' ').slice(0, 3).join(' ');
    const tags = {};
    mostra.forEach(r => { const k = chave(r); (tags[k] || (tags[k] = [])).push(_orcPartesItemES_(r.nome).tag); });
    const comTag = r => { const t = tags[chave(r)]; return t.length > 1 && t.some(x => x !== t[0]); };
    const linhas = mostra.map(r => ({ nome: _orcNomeItemES_(r.nome, utilNome, fsL, comTag(r), r.vezes),
                                      v: _orcMil_(r.v1) + ' → ' + _orcMil_(r.v2), d: r.d }));
    if (resto.length) linhas.push({ nome: 'Demais ajustes (' + resto.length + (resto.length === 1 ? ' item)' : ' itens)'), v: '', d: soma(resto), italico: true });
    if (!linhas.length) linhas.push({ nome: 'Nenhum item', v: '', d: 0, italico: true });
    linhas.push({ nome: 'Total', v: '', d: soma(arr), total: true });
    return linhas;
  };
  const linhasR = montar(es.reduz), linhasA = montar(es.aumenta), nLin = Math.max(linhasR.length, linhasA.length);
  rowH = Math.max(11, Math.min(14, (thMax - 35) / nLin));
  const th = Math.min(thMax, 29 + nLin * rowH + 6);
  const tabela = (x, titulo, linhas, sentido) => {
    _orcCard_(slide, x, ty, cw, th, null);
    _orcUmaLinha_(slide, x + 8, ty + 4, cw - 16, 12, titulo,
      { align: 'L', fs: 7, bold: true, cor: sentido < 0 ? _ORC_COR_VAR.desce : _ORC_COR_VAR.sobe, fonte: T.titles });
    const xs = [];
    let acc = x + 8;
    cols.forEach(c => { xs.push(acc); acc += c.w; });
    const hy = ty + 17;
    cols.forEach((c, i) => _orcUmaLinha_(slide, xs[i], hy, c.w - 2, 9, c.t,
      { align: c.a, fs: 5.5, bold: true, cor: C.textMuted, fonte: T.titles, folga: 2 }));
    _orcLinha_(slide, x + 8, hy + 10, x + cw - 8, hy + 10, C.lines, 0.5);
    linhas.forEach((l, i) => {
      const ry = hy + 12 + i * rowH;
      if (l.total) _orcLinha_(slide, x + 8, ry, x + cw - 8, ry, C.lines, 0.5);
      const corV = Math.abs(l.d) < 0.5 ? C.textMuted : (l.d < 0 ? _ORC_COR_VAR.desce : _ORC_COR_VAR.sobe);
      const op = (a, extra) => Object.assign({ align: a, fs: fsL, fsMin: 5.5, bold: !!l.total, italic: !!l.italico,
                                               cor: C.textMain, fonte: l.total ? T.titles : T.body, folga: 2 }, extra || {});
      _orcUmaLinha_(slide, xs[0], ry, cols[0].w - 2, rowH, l.nome, op('L'));
      if (l.v) _orcUmaLinha_(slide, xs[1], ry, cols[1].w - 2, rowH, l.v, op('R', { cor: C.textBody }));
      _orcUmaLinha_(slide, xs[2], ry, cols[2].w - 2, rowH, Math.abs(l.d) < 0.5 ? '–' : (l.d < 0 ? '−' : '+') + _orcMilhar_(Math.abs(l.d)),
        op('R', { cor: corV }));
      _orcUmaLinha_(slide, xs[3], ry, cols[3].w - 2, rowH, _orcM2Sinal_(porM2(l.d)), op('R', { cor: corV }));
    });
  };
  tabela(MX, 'SAIU OU REDUZIU', linhasR, -1);
  tabela(MX + cw + gap, 'ENTROU OU AUMENTOU', linhasA, 1);

  if (nota) {
    const t = es.semEfeito.map(r => _orcNomeItemES_(r.nome, 260, 6) + ' (' + (r.d < 0 ? '−' : '+') + _orcMoeda_(Math.abs(r.d)) + ')').join('; ');
    _orcUmaLinha_(slide, MX, ty + th + 4, tw, nota, 'Sem efeito no total (já estão na Despesa de pessoal ou a conta segue a METRAGEM): ' + t,
      { align: 'L', fs: 6, fsMin: 5, cor: C.textBody, fonte: T.body, italic: true });
  }
  _orcRodape_(slide, W, H, 'Fonte: base V1 (13/10/2026) × modelos 070/090 e contratos de 22/10/2026 · R$/m² ao mês na área V2 · ' +
    'itens abaixo de R$ ' + _orcMilhar_(ORC_ES_MIN) + ' em "Demais ajustes" · Despesa de pessoal: vem da METRAGEM (RH), não dos modelos');
}

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
