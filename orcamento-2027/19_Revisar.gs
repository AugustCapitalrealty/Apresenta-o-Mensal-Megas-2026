/**
 * ARQUIVO: 19_Revisar.gs
 * SLIDE:   "Revisar antes da versão final" — logo depois da capa, só quando os
 *          relatórios da controladoria divergem entre si (rel.avisos). E o
 *          selo ⚠ REVISAR no canto dos slides cujos números passam pela conta
 *          divergente, com a linha da conta destacada nas tabelas.
 *
 * Nada disso é para a reunião: corrigida a planilha da controladoria, a
 * geração seguinte não acha divergência e o slide e os selos somem sozinhos.
 * Se a contabilidade disser que vale a METRAGEM, a conta entra em
 * relatorios.valeMetragem (01_Config.gs) e deixa de ser cobrada.
 *
 * Pendências de dados (rel.pendencias, _orcPendencias_) entram no mesmo
 * slide e põem o selo ⚠ PENDENTE nos slides da conta — pedido do gestor,
 * 07/10/2026: "sempre ligue o alerta que está pendente". Somem quando a
 * fonte for preenchida. As perguntas em aberto com o gestor ou a
 * controladoria (ORC_PENDENCIAS_GESTOR, 01_Config.gs) entram do mesmo jeito
 * e somem quando a linha é apagada.
 */

const _ORC_COR_REVISAR = { fundo: '#FFEDD5', borda: '#F97316', texto: '#9A3412', card: '#FFF7ED' };

// Divergências (rel.revisar) que tocam alguma das chaves. Sem chaves: todas —
// é o caso dos slides com o total geral, que soma toda conta.
function _orcRevisarDe_(rel, chaves) {
  const lista = (rel && rel.revisar) || [];
  if (!chaves) return lista;
  return lista.filter(r => chaves.indexOf(r.chave) >= 0);
}

// Pendências de dados da conta. Sem chaves, nenhuma: a pendência é de uma
// conta e não marca os slides do total geral.
function _orcPendenciasDe_(rel, chaves) {
  if (!chaves) return [];
  return ((rel && rel.pendencias) || []).filter(p => chaves.indexOf(p.chave) >= 0);
}

// Selo laranja abaixo do logo, à direita do subtítulo (que termina 136 pt
// antes da margem — ver _orcHeader_). REVISAR (relatórios divergem) vale
// mais que PENDENTE (falta dado).
function _orcSeloRevisar_(slide, W, rel, chaves) {
  const lista = _orcRevisarDe_(rel, chaves), pend = _orcPendenciasDe_(rel, chaves);
  if (!lista.length && !pend.length) return;
  const nomes = [];
  lista.concat(pend).forEach(r => { if (nomes.indexOf(r.nome) < 0) nomes.push(r.nome); });
  const DS = CR_DESIGN_SYSTEM, w = 130, x = W - DS.layout.marginX - w, y = 47;
  _orcRet_(slide, x, y, w, 14, _ORC_COR_REVISAR.borda, { redondo: true });
  _orcUmaLinha_(slide, x, y, w, 14, (lista.length ? '⚠ REVISAR · ' : '⚠ PENDENTE · ') + nomes.join(', '),
    { align: 'C', fs: 6.5, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, folga: 6, fsMin: 5, cortar: true });
}

/**
 * O que falta nas fontes, por conta detalhada (ORC_CONTAS_DETALHE):
 *   ▸ contratos do ano não informados — conta sem planilha de contratos e
 *     sem contrato no cadastro do ano, com parte do total "Não detalhado";
 *   ▸ modelos acima da METRAGEM — itens dos modelos + contratos somam mais
 *     que o relatório (item que a controladoria não pôs na METRAGEM), com os
 *     meses em que isso acontece, pelo relatório mensal;
 *   ▸ as perguntas em aberto do Mega (ORC_PENDENCIAS_GESTOR).
 * @return [{ nome, chave, tipo, texto }]
 */
function _orcPendencias_(cid, rel, mensal, modelos) {
  const comContrato = {};
  _orcContratosDoAno_(cid).forEach(g => { if (g.contratos.length) comContrato[_orcChaveConta_(g.conta)] = true; });
  const out = [];
  ORC_CONTAS_DETALHE.forEach(nome => {
    const c = rel.contas.filter(x => x.chave === _orcChaveConta_(nome))[0];
    if (!c) return;
    const comp = _orcComposicaoConta_(c, modelos);
    if (comp.base > 1 && !comContrato[c.chave]) {
      out.push({ nome: c.nome, chave: c.chave, tipo: 'Contratos ' + ORC_ANO + ' não informados',
                 texto: _orcMoeda_(comp.base) + ' em "Não detalhado" — sem os contratos de ' + ORC_ANO + ' no cadastro' });
    }
    if (comp.excesso > 1) {
      const m = mensal && mensal.contas[c.chave], meses = [];
      if (m) {
        for (let i = 0; i < 12; i++) {
          const d = comp.itens.reduce((t, it) => t + ((it.meses && it.meses[i]) || 0), 0) - m.orc[i];
          if (d > 1) meses.push(ORC_MESES[i] + ' ' + _orcMoeda_(d));
        }
      }
      out.push({ nome: c.nome, chave: c.chave, tipo: 'Modelos acima da METRAGEM',
                 texto: 'itens somam ' + _orcMoeda_(comp.excesso) + ' a mais' + (meses.length ? ' · ' + meses.join(' · ') : '') });
    }
  });
  // Contratos que o gestor diz que já existiam em 2026, sem 2026 achado nas fontes
  // (08/10/2026: "deixar a pergunta em aberto sinalizando").
  ORC_CONTRATOS_2026_NAO_ID.filter(r => _orcNorm_(r.unidade) === _orcNorm_(cid.nome)).forEach(r => {
    const chave = _orcChaveConta_(r.conta), c = rel.contas.filter(x => x.chave === chave)[0];
    out.push({ nome: c ? c.nome : r.conta, chave: chave, tipo: (ORC_ANO - 1) + ' não identificado',
               texto: r.item + ' — sem ' + (ORC_ANO - 1) + ' nas fontes' });
  });
  (ORC_PENDENCIAS_GESTOR[cid.nome] || []).forEach(p => {
    const chave = _orcChaveConta_(p.conta), c = rel.contas.filter(x => x.chave === chave)[0];
    out.push({ nome: c ? c.nome : p.conta, chave: chave, tipo: p.tipo, texto: p.texto });
  });
  return out;
}

// Em que slides a conta aparece pelo nome (o total geral está em quase todos).
function _orcOndeAparece_(rel, r) {
  const onde = ['DRE'];
  const conta = rel.contas.filter(c => c.chave === r.chave)[0] ||
                { v: r.chave === _orcChaveConta_('IPTU') ? rel.iptu : rel.seguro };
  const delta = conta.v.orc - conta.v.ritmo;
  if (Math.abs(delta) >= ORC_OFENSOR_MINIMO) onde.push(delta > 0 ? 'Ofensores' : 'Defensores');
  if (_orcPonte_(rel, null).degraus.some(d => d.chave === r.chave)) onde.push('Ponte');
  if (ORC_CONTAS_DETALHE.some(n => _orcChaveConta_(n) === r.chave)) onde.push('Linha a linha');
  if (_orcM2PorConta_(rel).linhas.some(l => l.chaves && l.chaves.length === 1 && l.chaves[0] === r.chave)) onde.push('Custo por m²');
  return onde.join(', ');
}

function gerarSlideRevisar_(slide, W, H, cid, rel) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const tw = W - MX * 2;
  const pend = rel.pendencias || [], divergem = rel.avisos.length > 0;
  _orcHeader_(slide, W, 'Revisar antes da versão final',
    cid.nome + ' · ' + (divergem ? 'os relatórios da controladoria não fecham entre si' : 'dados pendentes') +
    ' · este slide não vai para a reunião');

  // Card com o que fazer.
  const ky = 74, kh = 42;
  _orcRet_(slide, MX, ky, tw, kh, _ORC_COR_REVISAR.card, { redondo: true, borda: _ORC_COR_REVISAR.borda });
  _orcRet_(slide, MX, ky, 4, kh, _ORC_COR_REVISAR.borda);
  _orcParagrafo_(slide, MX + 14, ky + 4, tw - 24, kh - 8,
    (divergem ? 'O deck usa a METRAGEM-COND. Os slides com estes números levam o selo ⚠ REVISAR e a linha da conta em laranja. ' +
                'Confirmar com a controladoria qual relatório está certo; corrigida a planilha, gere de novo — o selo e este slide somem.'
              : 'Falta dado nas fontes ou há pergunta em aberto com o gestor/controladoria: os slides da conta levam o selo ' +
                '⚠ PENDENTE. Preenchida a fonte ou respondida a pergunta (ORC_PENDENCIAS_GESTOR), gere de novo — o selo e ' +
                'este slide somem.'),
    { fs: 8.5, fsMin: 6.5, cor: _ORC_COR_REVISAR.texto, meio: true });

  let y = ky + kh + 14;
  if (pend.length) {
    const linhas = pend.map(p => ({ tipo: 'item', nome: p.nome, celulas: [{ texto: p.tipo }, { texto: p.texto }] }));
    y = _orcTabelaNum_(slide, MX, y, tw, 16 + 15 * linhas.length, [
      { titulo: 'PENDÊNCIA — CONTA', w: 130 }, { titulo: 'O QUE FALTA', w: 150, align: 'L' },
      { titulo: 'DETALHE', w: tw - 280, align: 'L' }
    ], linhas, null) + 14;
  }
  if (rel.revisar.length) {
    const linhas = rel.revisar.map(r => {
      const d = r.mensal - r.metragem;
      return { tipo: 'item', nome: r.nome, celulas: [
        { texto: _orcMoeda_(r.mensal) }, { texto: _orcMoeda_(r.metragem), bold: true },
        { texto: (d >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(d)), sentido: d > 0 ? 1 : -1 },
        { texto: (d >= 0 ? '+' : '−') + _orcPct_(Math.abs(r.metragem ? d / r.metragem : 0)) },
        { texto: _orcOndeAparece_(rel, r) }] };
    });
    const labW = 120, ondeW = 180, numW = (tw - labW - ondeW) / 4;
    y = _orcTabelaNum_(slide, MX, y, tw, 16 + 15 * linhas.length, [
      { titulo: 'ORÇ ' + rel.anos.orc + ' — CONTA', w: labW },
      { titulo: 'MENSAL (12 MESES)', w: numW }, { titulo: 'METRAGEM (NO DECK)', w: numW, destaque: true },
      { titulo: 'DIFERENÇA', w: numW }, { titulo: 'DIF. %', w: numW },
      { titulo: 'ONDE A CONTA APARECE', w: ondeW, align: 'L' }
    ], linhas, null) + 14;
  }

  // Divergências de soma da própria METRAGEM (não são de conta: vão em texto).
  const outros = rel.avisos.filter(a => !/^Mensal ≠ METRAGEM/.test(a));
  outros.slice(0, 8).forEach((a, i) => {
    _orcUmaLinha_(slide, MX, y + i * 13, tw, 13, '⚠ ' + a,
      { align: 'L', fs: 7.5, bold: true, cor: C.accentRed, fonte: DS.typography.body, fsMin: 6, cortar: true });
  });

  _orcRodape_(slide, W, H, (divergem ? 'Conferência: soma dos 12 meses do Orç ' + rel.anos.orc + ' na Despesas-Mensal × Orç ' +
    rel.anos.orc + ' da METRAGEM-COND, conta a conta (_orcConferirMensal_)' :
    'Conferência: modelos 070/090 + contratos de ' + rel.anos.orc + ' × METRAGEM-COND, conta a conta (_orcPendencias_)') +
    ' · ' + cid.nome);
}
