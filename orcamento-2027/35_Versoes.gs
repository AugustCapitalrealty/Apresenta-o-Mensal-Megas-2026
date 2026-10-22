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

const ORC_VERSAO_ATUAL = 'V2';
const ORC_V1 = {
  deck: 'FACILITIES - ORÇAMENTO 2027 · V1 (apresentada à diretoria em 13-10-2026)',
  base: 'ORÇAMENTO 2027 - BASE V1.json',
  pastaVersoes: '103UkBjeBrhvE1feH94aVOO6jymCoim7s',   // VERSÕES (onde estão a v3 e a v4 do gestor)
  propDeck: 'ORC_V1_DECK_ID',
  propBase: 'ORC_V1_BASE_ID'
};

// Valores oficiais congelados da V1 (13/10/2026): base para o slide de Impacto V1 → V2
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

// Detecta se a rodada atual é a V2 para incluir os slides de impacto
function _orcTemImpactoV2Mega_(chave, rel) {
  if (ORC_VERSAO_ATUAL !== 'V2') return false;
  if (!rel || !rel.total) return false;
  if (rel.patio && Math.abs(rel.patio.orc) > 0.5) return true;
  const v1 = ORC_V1_VALORES[chave];
  return v1 && Math.abs(rel.total.orc - v1) > 1000;
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
function _orcLinhasImpactoFacilities_(rels) {
  const v1Tot = ORC_V1_VALORES.FACILITIES;
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

  // Lista dos ajustes acordados e lançados na revisão de 22/10/2026
  const ajustes = [
    { item: 'POSTO 24H NOTURNO → 12H DIURNO', mega: 'MEGA CURITIBA', delta: -250120.40, obs: 'Substituição do posto noturno 24h por 12h diurno (CCO/Bolsão)' },
    { item: 'PAISAGISMO, TORNIQUETE E VGAS', mega: 'MEGA CURITIBA', delta: -188891.00, obs: 'Paisagismo 200k→64k; torniquete 68,9k→39,9k; revisão de 20 VGAs 47,4k→23,5k' },
    { item: 'RETROFIT DA CASA DE BOMBAS', mega: 'MEGA CURITIBA', delta: +179000.00, obs: 'Alimentação de água potável (2 parcelas de R$ 89,5 mil)' },
    { item: 'REVISÃO DE CONTRATOS E RH', mega: 'MEGA CURITIBA', delta: +93478.85, obs: 'Vigilância (+51,5k), limpeza (+17,7k), manutenção (+9,4k), pessoal (+10k)' },
    { item: 'POSTOS ADICIONAIS DE SEGURANÇA', mega: 'MEGA ESTEIO', delta: +55300.00, obs: 'Postos Voigt diurno (+26k) e noturno (+29,3k) no Armazém B em Jan–Fev' },
    { item: 'SELANTES E BACIAS DE CONTENÇÃO', mega: 'MEGA ESTEIO', delta: +18924.96, obs: 'Carry-over selantes M7–M12 (+8,9k) e 2 bacias contenção diesel (+9,9k)' },
    { item: 'KEY ACCESS, CONTRATOS E RH', mega: 'MEGA ESTEIO', delta: +13088.71, obs: 'Key Access facial (+3,6k), pessoal (+7,4k), contratos (+2k)' },
    { item: 'OBRAS EXCLUÍDAS DE MANUTENÇÃO', mega: 'MEGA ITAJAÍ', delta: -677604.00, obs: 'Saíram reservatório SPK (180k), docas 4/5 (151k), defensas (131k), limpeza (90k)...' },
    { item: 'OBRAS DAS CANCELAS (24X)', mega: 'MEGA ITAJAÍ', delta: +344234.00, obs: 'Financiamento 24 meses: civil (+287k), elétrica/lógica (+38k), equip. (+19k)' },
    { item: 'ALPHA SENSE E REFORÇO BOLSÃO', mega: 'MEGA ITAJAÍ', delta: -82035.00, obs: 'Alpha Sense reduzida de 10 para 7 meses (45k); reforço bolsão 2 para 1 mês (37k)' },
    { item: 'REVISÃO DE CONTRATOS E RH', mega: 'MEGA ITAJAÍ', delta: +135042.41, obs: 'Portovig segurança (+67,2k), Lauri Batista dedetização (+40k), limpeza e RH' }
  ];

  ajustes.forEach(aj => {
    saldo += aj.delta;
    const pctAcum = (saldo - v1Tot) / v1Tot;
    linhas.push({
      tipo: 'item',
      celulas: [
        { texto: aj.item, align: 'L' },
        { texto: aj.mega, align: 'C' },
        { texto: _orcDeltaImpacto_(aj.delta), align: 'R', sentido: aj.delta < 0 ? -1 : 1 },
        { texto: _orcPctImpacto_(pctAcum), align: 'C', sentido: pctAcum < 0 ? -1 : 1 },
        { texto: aj.obs, align: 'L' }
      ]
    });
  });

  // Subtotal Antes do Pátio Mercado Livre
  const saldoAntesPatio = saldo;
  const pctAntesPatio = (saldoAntesPatio - v1Tot) / v1Tot;
  linhas.push({
    tipo: 'subtotal',
    celulas: [
      { texto: 'SUBTOTAL V2 (ANTES DO PÁTIO) -->', align: 'R', bold: true },
      { texto: 'FACILITIES', align: 'C', bold: true },
      { texto: _orcMoeda_(saldoAntesPatio), align: 'R', bold: true },
      { texto: _orcPctImpacto_(pctAntesPatio), align: 'C', bold: true },
      { texto: 'Total das revisões de Facilities antes do Pátio Mercado Livre', align: 'L' }
    ]
  });

  // Linha do Pátio Mercado Livre
  const deltaPatio = -267144.28;
  saldo += deltaPatio;
  const pctFinal = (saldo - v1Tot) / v1Tot;
  linhas.push({
    tipo: 'item',
    destaque: true,
    celulas: [
      { texto: 'EFEITO PÁTIO MERCADO LIVRE', align: 'L', bold: true },
      { texto: 'MEGA ESTEIO', align: 'C', bold: true },
      { texto: _orcDeltaImpacto_(deltaPatio), align: 'R', bold: true, sentido: -1 },
      { texto: _orcPctImpacto_(pctFinal), align: 'C', bold: true, sentido: -1 },
      { texto: 'Abatimento do Pátio Mercado Livre (−R$ 0,42/m² no Esteio)', align: 'L', bold: true }
    ]
  });

  // Saldo final V2
  linhas.push({
    tipo: 'saldo',
    destaque: true,
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V2 FINAL - 22/10) -->', align: 'R', bold: true },
      { texto: 'FACILITIES', align: 'C', bold: true },
      { texto: _orcMoeda_(saldo), align: 'R', bold: true },
      { texto: _orcPctImpacto_(pctFinal), align: 'C', bold: true },
      { texto: 'Redução líquida vs. V1 de 13/10 (−3,4% no consolidado)', align: 'L', bold: true }
    ]
  });

  return linhas;
}

function gerarSlideImpactoFacilities_(slide, W, H, rels) {
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

  const linhas = _orcLinhasImpactoFacilities_(rels);
  const yTabela = 72, hTabela = H - 26 - yTabela;
  _orcTabelaImpacto_(slide, MX, yTabela, tw, hTabela, colunas, linhas);

  _orcRodape_(slide, W, H, 'Fonte: Apresentação V1 (13/10/2026) × Atualização das planilhas de 22/10/2026 · reduções em vermelho entre parênteses');
}

// ==========================================
// SLIDE DE IMPACTO — POR MEGA
// ==========================================
function _orcLinhasImpactoMega_(chave, rel) {
  const v1 = ORC_V1_VALORES[chave] || (rel ? rel.total.orc : 0);
  let saldo = v1;
  const linhas = [];

  linhas.push({
    tipo: 'saldo',
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V1 - 13/10) -->', align: 'R', bold: true },
      { texto: 'TOTAL V1', align: 'C', bold: true },
      { texto: _orcMoeda_(v1), align: 'R', bold: true },
      { texto: '0,00%', align: 'C', bold: true },
      { texto: 'Apresentado à Diretoria na 1ª rodada (R$ ' + _orcM2_(ORC_V1_M2[chave]) + '/m²)', align: 'L' }
    ]
  });

  const ajustesPorMega = {
    ESTEIO: [
      { item: 'POSTOS SEGURANÇA VOIGT (AMZ B JAN–FEV)', conta: 'Segurança', delta: +55300.00, obs: 'Posto diurno (+26k) e noturno (+29,3k) Voigt Jan–Fev' },
      { item: 'SELANTES E BACIAS DE CONTENÇÃO DIESEL', conta: 'Manutenção', delta: +18924.96, obs: 'Carry-over selantes M7–M12 (+8,9k) e 2 bacias contenção (+9,9k)' },
      { item: 'KEY ACCESS FACIAL, CONTRATOS E RH', conta: 'Outras', delta: +13088.71, obs: 'Key Access facial (+3,6k), pessoal (+7,4k), contratos (+2k)' }
    ],
    ITAJAI: [
      { item: 'OBRAS EXCLUÍDAS DE MANUTENÇÃO', conta: 'Manutenção', delta: -677604.00, obs: 'Reservatório SPK (180k), docas 4/5 (151k), defensas (131k), limpeza (90k)...' },
      { item: 'OBRAS DAS CANCELAS (24 MESES)', conta: 'Manutenção', delta: +344234.00, obs: 'Financiamento 24 meses: civil (+287k), elétrica (+38k), equip. (+19k)' },
      { item: 'ALPHA SENSE E REFORÇO BOLSÃO', conta: 'Segurança', delta: -82035.00, obs: 'Alpha Sense 10→7 meses (45k) e reforço bolsão 2→1 mês (37k)' },
      { item: 'REVISÃO DE CONTRATOS E RH', conta: 'Contratos/RH', delta: +135042.41, obs: 'Portovig segurança (+67,2k), Lauri Batista dedetização (+40k), limpeza e RH' }
    ],
    CURITIBA: [
      { item: 'POSTO 24H NOTURNO → 12H DIURNO', conta: 'Segurança', delta: -250120.40, obs: 'Substituição de posto 24h noturno por 12h diurno (CCO/Bolsão)' },
      { item: 'PAISAGISMO, TORNIQUETE E VGAS', conta: 'Manutenção', delta: -188891.00, obs: 'Paisagismo 200k→64k; torniquete 68,9k→39,9k; revisão 20 VGAs 47,4k→23,5k' },
      { item: 'RETROFIT DA CASA DE BOMBAS', conta: 'Manutenção', delta: +179000.00, obs: 'Alimentação de água potável (2 parcelas de R$ 89,5 mil)' },
      { item: 'REVISÃO DE CONTRATOS E RH', conta: 'Contratos/RH', delta: +93478.85, obs: 'Vigilância (+51,5k), limpeza (+17,7k), manutenção (+9,4k), pessoal (+10k)' }
    ]
  };

  const lista = ajustesPorMega[chave] || [];
  lista.forEach(aj => {
    saldo += aj.delta;
    const pctAcum = (saldo - v1) / v1;
    linhas.push({
      tipo: 'item',
      celulas: [
        { texto: aj.item, align: 'L' },
        { texto: aj.conta, align: 'C' },
        { texto: _orcDeltaImpacto_(aj.delta), align: 'R', sentido: aj.delta < 0 ? -1 : 1 },
        { texto: _orcPctImpacto_(pctAcum), align: 'C', sentido: pctAcum < 0 ? -1 : 1 },
        { texto: aj.obs, align: 'L' }
      ]
    });
  });

  if (chave === 'ESTEIO') {
    const saldoAntesPatio = saldo;
    const pctAntesPatio = (saldoAntesPatio - v1) / v1;
    linhas.push({
      tipo: 'subtotal',
      celulas: [
        { texto: 'SUBTOTAL ANTES DO PÁTIO ML -->', align: 'R', bold: true },
        { texto: 'ESTEIO', align: 'C', bold: true },
        { texto: _orcMoeda_(saldoAntesPatio), align: 'R', bold: true },
        { texto: _orcPctImpacto_(pctAntesPatio), align: 'C', bold: true },
        { texto: 'Orçamento antes do abatimento do Pátio ML (R$ 6,40/m² ao mês)', align: 'L' }
      ]
    });

    const deltaPatio = -267144.28;
    saldo += deltaPatio;
    const pctFinal = (saldo - v1) / v1;
    linhas.push({
      tipo: 'item',
      destaque: true,
      celulas: [
        { texto: 'EFEITO PÁTIO MERCADO LIVRE', align: 'L', bold: true },
        { texto: 'ÁREA COMUM', align: 'C', bold: true },
        { texto: _orcDeltaImpacto_(deltaPatio), align: 'R', bold: true, sentido: -1 },
        { texto: _orcPctImpacto_(pctFinal), align: 'C', bold: true, sentido: -1 },
        { texto: 'Abatimento do Pátio Mercado Livre (−R$ 0,42/m²)', align: 'L', bold: true }
      ]
    });
  }

  const pctFinalGeral = (saldo - v1) / v1;
  const m2Final = chave === 'ESTEIO' ? '5,98' : (chave === 'ITAJAI' ? '4,90' : '4,61');
  linhas.push({
    tipo: 'saldo',
    destaque: true,
    celulas: [
      { texto: 'ORÇAMENTO 2027 (V2 FINAL - 22/10) -->', align: 'R', bold: true },
      { texto: 'TOTAL V2', align: 'C', bold: true },
      { texto: _orcMoeda_(saldo), align: 'R', bold: true },
      { texto: _orcPctImpacto_(pctFinalGeral), align: 'C', bold: true },
      { texto: 'Redução líquida vs. V1 · R$ ' + m2Final + '/m² ao mês', align: 'L', bold: true }
    ]
  });

  return linhas;
}

function gerarSlideImpactoMega_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, T = DS.typography, MX = DS.layout.marginX;
  const chave = Object.keys(ORC_CIDADES).filter(k => ORC_CIDADES[k].nome === cid.nome)[0] || 'ESTEIO';
  _orcHeader_(slide, W, 'Impacto das revisões — ' + cid.nome + ' · V1 → V2',
    'O que mudou entre a apresentação da 1ª rodada (13/10) e a revisão da 2ª rodada (22/10) · valores com IPTU e seguro');

  // Cards resumo no topo
  const v1 = ORC_V1_VALORES[chave] || rel.total.orc;
  const v2 = rel.total.orc;
  const delta = v2 - v1;
  const m2V1 = ORC_V1_M2[chave] || 0;
  const m2V2 = rel.m2Total ? rel.m2Total.orc : 0;

  const ky = 74, kh = 48, gap = 10, kw = (W - MX * 2 - gap * 3) / 4;
  const kpis = [
    ['V1 · 13/10/2026', _orcMoeda_(v1), 'R$ ' + _orcM2_(m2V1) + '/m² ao mês'],
    ['Variação V1 → V2', (delta >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(delta)), _orcPctImpacto_(v1 ? delta / v1 : 0) + ' no orçamento'],
    [chave === 'ESTEIO' ? 'Efeito Pátio ML' : 'Redução por m²',
     chave === 'ESTEIO' ? '−R$ 267.144' : '−R$ ' + _orcM2_(Math.abs(m2V2 - m2V1)) + '/m²',
     chave === 'ESTEIO' ? '−R$ 0,42/m² ao mês' : 'custo unitário'],
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

  const linhas = _orcLinhasImpactoMega_(chave, rel);
  const yTabela = ky + kh + 10, hTabela = H - 26 - yTabela;
  _orcTabelaImpacto_(slide, MX, yTabela, tw, hTabela, colunas, linhas);

  _orcRodape_(slide, W, H, 'Fonte: METRAGEM-COND e modelos 070/090 de 22/10/2026 vs. base V1 de 13/10/2026 · ' + cid.nome);
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
