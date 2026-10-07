/**
 * ARQUIVO: 21_ContratosComparados.gs
 * SLIDE:   Manutenção — Ritmo do ano anterior × Orçamento, item a item nos
 *          contratos (pedido do gestor, 06/10/2026: "comparar itens de
 *          manutenção ritmo × 2027").
 *
 * Contratos do ano anterior: planilha "2025 - Contratos" (pasta APRESENTAÇÃO
 * ORÇAMENTO), o cadastro de obrigações do ERP — uma linha por contrato, com
 * Unidade, Valorização (a conta) e uma coluna por mês do ano anterior (o
 * cabeçalho é a data do vencimento, 26/01/2026 … 26/12/2026). Contratos do
 * ano: os itens com contrato da manutenção (planilha de contratos + itens
 * [CONTRATO] e "ampliação contrato" do modelo 090).
 *
 * O casamento é pelo fornecedor: a primeira palavra que identifica o nome no
 * cadastro ("MIRIAD", "FIRECAM", "LEANDRO"…) dentro da descrição do item do
 * ano — assim "AMPLIAÇÃO CONTRATO MANUTENÇÃO COBERTURA MIRIAD 6, 7A E 7B"
 * soma no contrato da Miriad. Item do ano sem par = contrato novo; contrato do
 * ano anterior sem par = não renovado.
 *
 * O ritmo da conta (METRAGEM) não abre item por item: o que não é contrato
 * ("avulsos") é o ritmo menos os contratos do cadastro.
 */

// "2025 - Contratos": cadastro com os valores mês a mês do ano anterior.
const ORC_CONTRATOS_ANO_ANTERIOR_ID = '11bcQ0zD81kjx_aGNg8nI6s72gxsea3vSH6AcnMssU6A';

// Palavras que não identificam fornecedor (o casamento pula para a seguinte).
// "PREVENTIVA E CORRETIVA DAS COBERTURAS" (Itajaí) casava com todo item de
// manutenção preventiva: o que identifica é "coberturas".
const _ORC_PALAVRAS_GENERICAS = ['empresa', 'servico', 'servicos', 'contrato', 'mega', 'manutencao', 'de', 'e', 'da', 'do',
  'das', 'dos', 'preventiva', 'corretiva'];

/**
 * Contratos da conta na unidade, com os doze meses do ano anterior.
 * @return [{ fornecedor, descricao, meses, total, reajuste }] — só os com
 *         valor no ano. null sem a planilha.
 */
function obterContratosAnoAnterior_(cid, conta) {
  if (!ORC_CONTRATOS_ANO_ANTERIOR_ID) return null;
  const dados = SpreadsheetApp.openById(ORC_CONTRATOS_ANO_ANTERIOR_ID).getSheets()[0].getDataRange().getValues();
  return _orcLerCadastroContratos_(dados, cid.nome, conta, ORC_ANO - 1);
}

// Data do cabeçalho: Date no Apps Script, texto ISO no teste.
function _orcDataCabecalho_(v) {
  if (v instanceof Date) return { ano: v.getFullYear(), mes: v.getMonth(), dia: v.getDate() };
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { ano: +m[1], mes: +m[2] - 1, dia: +m[3] } : null;
}

function _orcLerCadastroContratos_(dados, unidade, conta, ano) {
  const cab = (dados[0] || []).map(_orcNorm_);
  const col = { nome: cab.indexOf('nome'), descricao: cab.indexOf('descricao'), unidade: cab.indexOf('unidade'),
                conta: cab.indexOf('valorizacao'), reajuste: cab.indexOf('rejuste') };
  if (col.reajuste < 0) col.reajuste = cab.indexOf('reajuste');
  // O cabeçalho vem do CSV como "jan./26" e o Sheets o lê como a data
  // 26/01/<ano corrente>: o ano do cabeçalho é o DIA. Se nenhuma coluna casar
  // assim, vale o ano da data.
  const meses = [];
  (dados[0] || []).forEach((h, c) => { const d = _orcDataCabecalho_(h); if (d && d.dia === ano % 100) meses[d.mes] = c; });
  if (meses.filter(c => c !== undefined).length !== 12) {
    meses.length = 0;
    (dados[0] || []).forEach((h, c) => { const d = _orcDataCabecalho_(h); if (d && d.ano === ano) meses[d.mes] = c; });
  }
  const faltam = ['nome', 'unidade', 'conta'].filter(k => col[k] < 0);
  if (faltam.length || meses.filter(c => c !== undefined).length !== 12) {
    throw new Error('Cadastro de contratos (' + ano + '): cabeçalho inesperado — esperava "Nome", "Unidade", ' +
                    '"Valorização" e as 12 datas de ' + ano + ' na linha 1.');
  }
  const uni = _orcNorm_(unidade), chave = _orcChaveConta_(conta);
  const out = [];
  for (let i = 1; i < dados.length; i++) {
    const r = dados[i];
    if (_orcNorm_(r[col.unidade]) !== uni || _orcChaveConta_(r[col.conta]) !== chave) continue;
    const m = meses.map(c => Math.abs(_orcNum_(r[c])));
    const total = m.reduce((t, v) => t + v, 0);
    if (total < 0.5) continue;                               // contrato que já tinha acabado
    out.push({ fornecedor: String(r[col.nome] || '').replace(/ /g, ' ').trim(),
               descricao: col.descricao >= 0 ? String(r[col.descricao] || '').trim() : '',
               meses: m, total: total,
               reajuste: col.reajuste >= 0 ? String(r[col.reajuste] || '').trim() : '' });
  }
  // O mesmo fornecedor pode ter duas linhas (contrato que trocou no ano).
  const porForn = {};
  out.forEach(c => {
    const k = _orcNorm_(c.fornecedor);
    if (!porForn[k]) porForn[k] = c;
    else { porForn[k].total += c.total; c.meses.forEach((v, j) => { porForn[k].meses[j] += v; }); }
  });
  return Object.keys(porForn).map(k => porForn[k]).sort((a, b) => b.total - a.total);
}

// Nome curto para a linha: o texto escolhido na planilha de textos (ou a
// proposta de 07_PropostasTextos.gs, se ainda não foi aplicada), sem o
// "CONTRATO —" / "MANUT." da frente — no slide toda linha é contrato.
function _orcNomeContrato_(original) {
  let t = _orcTextoEscolhido_('Composição', original);
  if (t === String(original)) {
    const k = _orcNorm_(original);
    const p = ORC_PROPOSTAS_TEXTOS.filter(x => _orcNorm_(x[1]) === k)
      .sort((a, b) => (b[0] === 'Composição') - (a[0] === 'Composição'))[0];
    if (p) t = p[2];
  }
  return t.replace(/^\s*(contrato\s*(—|-|de)?|manut\.|manutenção)\s*/i, '').trim() || String(original);
}

// Palavra que identifica o fornecedor no texto do ano ("miriad", "firecam").
function _orcChaveFornecedor_(nome) {
  return _orcNorm_(nome).replace(/[^a-z0-9 ]+/g, ' ').split(' ')
    .filter(p => p.length >= 3 && _ORC_PALAVRAS_GENERICAS.indexOf(p) < 0)[0] || _orcNorm_(nome);
}

/**
 * @param itensContrato  itens com contrato da conta no ano (cls.grupos[0].itens)
 * @return { linhas: [{ nome, categoria, ant, atual, situacao, itens }], contratos: { ant, atual },
 *           avulsos: { ant, atual }, total: { ant, atual } }
 */
function _orcCompararContratos_(contaV, contratosAnt, itensContrato) {
  const usados = {};
  const linhas = contratosAnt.map(c => {
    const k = _orcChaveFornecedor_(c.fornecedor);
    const doAno = itensContrato.filter((it, j) => !usados[j] && _orcNorm_(it.descricao).indexOf(k) >= 0 && (usados[j] = true));
    const atual = doAno.reduce((t, it) => t + it.total, 0);
    const ampl = doAno.filter(it => /ampliacao/.test(_orcNorm_(it.descricao)));
    // Sem ampliação, a variação é reajuste — até ~8% ao ano; acima disso o
    // contrato mudou de escopo ou de preço e a linha diz isso.
    const pct = c.total ? atual / c.total - 1 : 0, indice = c.reajuste || 'reajuste';
    const situacao = !doAno.length ? 'Não renovado' :
      ampl.length ? 'Ampliação ' + _orcCompacto_(ampl.reduce((t, it) => t + it.total, 0)) :
      pct > 0.08 ? 'Acima do ' + indice :
      pct < -0.005 ? 'Redução' : 'Reajuste' + (c.reajuste ? ' ' + c.reajuste : '');
    // Nome: o do contrato do ano (texto curto escolhido na planilha de
    // textos, aba Composição), senão o fornecedor do cadastro.
    const base = doAno.filter(it => ampl.indexOf(it) < 0)[0] || doAno[0];
    return { nome: base ? _orcNomeContrato_(base.descricao) : c.fornecedor,
             categoria: base ? base.categoria : '', ant: c.total, atual: atual, situacao: situacao, itens: doAno };
  });
  itensContrato.forEach((it, j) => {
    if (usados[j]) return;
    linhas.push({ nome: _orcNomeContrato_(it.descricao), categoria: it.categoria,
                  ant: 0, atual: it.total, situacao: 'Novo em ' + ORC_ANO, itens: [it] });
  });
  linhas.sort((a, b) => Math.max(b.ant, b.atual) - Math.max(a.ant, a.atual));
  const contratos = { ant: linhas.reduce((t, l) => t + l.ant, 0), atual: linhas.reduce((t, l) => t + l.atual, 0) };
  const total = { ant: contaV.ritmo, atual: contaV.orc };
  return { linhas: linhas, contratos: contratos, total: total,
           avulsos: { ant: total.ant - contratos.ant, atual: total.atual - contratos.atual } };
}

function gerarSlideContratosComparados_(slide, W, H, cid, rel, conta, contratosAnt, cls) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors, MX = DS.layout.marginX;
  const a = rel.anos, tw = W - MX * 2;
  const cmp = _orcCompararContratos_(conta.v, contratosAnt, cls.grupos[0].itens);
  const aRit = _orcAreaImplicita_(rel, 'ritmo'), aOrc = _orcAreaImplicita_(rel, 'orc');
  const m2 = (v, area) => area ? v / area / 12 : null;
  const varTxt = (de, para) => _orcVariacao_(de, para);
  _orcHeader_(slide, W, conta.nome + ' — Ritmo ' + a.ritmo + ' × Orçamento ' + a.orc,
    'Contratos item a item e o que é avulso · ' + cid.nome + ' · em R$ e em R$/m² ao mês');

  // ---- Três cards: contratos, avulsos, total — em R$ e em m² ----
  const ky = 72, kh = 56, gap = 10, kw = (tw - gap * 2) / 3;
  [['Contratos', cmp.contratos], ['Avulsos (sem contrato)', cmp.avulsos], ['Total da conta', cmp.total]].forEach((k, i) => {
    const x = MX + i * (kw + gap), ult = i === 2, v = varTxt(k[1].ant, k[1].atual);
    _orcRet_(slide, x, ky, kw, kh, ult ? C.brandDark : C.cardBg, { redondo: true, borda: ult ? null : C.lines });
    _orcUmaLinha_(slide, x + 12, ky + 5, kw - 90, 13, k[0].toUpperCase(),
      { align: 'L', fs: 7, bold: true, cor: ult ? C.brandSoft : C.textBody, fonte: DS.typography.titles, fsMin: 6 });
    if (v.texto !== '–') {
      _orcUmaLinha_(slide, x + kw - 12 - 74, ky + 5, 74, 13, v.texto + ' × ritmo',
        { align: 'R', fs: 7, bold: true, fonte: DS.typography.body,
          cor: v.sentido === 1 ? (ult ? _ORC_COR_VAR.sobeClaro : _ORC_COR_VAR.sobe) : (ult ? _ORC_COR_VAR.desceClaro : _ORC_COR_VAR.desce) });
    }
    _orcUmaLinha_(slide, x + 12, ky + 18, kw - 24, 22, _orcCompacto_(k[1].ant) + ' → ' + _orcCompacto_(k[1].atual),
      { align: 'L', fs: 14, bold: true, cor: ult ? '#FFFFFF' : C.brandDark, fonte: DS.typography.titles, fsMin: 9 });
    const mA = m2(k[1].ant, aRit), mO = m2(k[1].atual, aOrc);
    if (mA !== null && mO !== null) {
      _orcUmaLinha_(slide, x + 12, ky + 39, kw - 24, 13, 'R$ ' + _orcM2_(mA) + ' → R$ ' + _orcM2_(mO) + ' por m² ao mês',
        { align: 'L', fs: 7, cor: ult ? '#CBD5E1' : C.textBody, fonte: DS.typography.body, fsMin: 6 });
    }
  });

  // ---- Tabela: contrato a contrato, avulsos e total ----
  const linhaTab = (tipo, nome, de, para, situacao, categoria) => {
    const d = para - de, v = varTxt(de, para);
    return { tipo: tipo, nome: nome, celulas: [
      { texto: categoria || '' }, { texto: de > 0.5 ? _orcMoeda_(de) : '–' }, { texto: para > 0.5 ? _orcMoeda_(para) : '–', bold: true },
      { texto: (d >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(d)).replace('R$ ', ''), sentido: Math.abs(d) < 0.5 ? 0 : (d > 0 ? 1 : -1) },
      { texto: v.texto, sentido: v.sentido },
      { texto: _orcM2_(m2(de, aRit)) }, { texto: _orcM2_(m2(para, aOrc)), bold: true },
      { texto: situacao || '' }] };
  };
  const linhas = [{ tipo: 'secao', nome: 'CONTRATOS — ' + cmp.linhas.length, celulas: [] }];
  cmp.linhas.forEach(l => linhas.push(linhaTab('item', _orcNomeCurtoContrato_(l.nome), l.ant, l.atual, l.situacao, l.categoria)));
  linhas.push(linhaTab('grupo', 'TOTAL CONTRATOS', cmp.contratos.ant, cmp.contratos.atual, ''));
  linhas.push(linhaTab('item', 'Avulsos (sem contrato)', cmp.avulsos.ant, cmp.avulsos.atual, 'ver nota abaixo'));
  linhas.push(linhaTab('total', 'TOTAL ' + conta.nome.toUpperCase(), cmp.total.ant, cmp.total.atual, ''));

  const lab = 178, cat = 104, nW = 56, dW = 46, pW = 36, mW = 30, sW = tw - lab - cat - nW * 2 - dW - pW - mW * 2;
  const ty = ky + kh + 10;
  const yFim = _orcTabelaNum_(slide, MX, ty, tw, Math.min(13 + 16 + 15 * linhas.length, H - 44 - ty), [
    { titulo: 'CONTRATO', w: lab }, { titulo: 'CATEGORIA', w: cat, align: 'L' },
    { titulo: 'RITMO ' + a.ritmo, w: nW }, { titulo: 'ORÇ ' + a.orc, w: nW, destaque: true },
    { titulo: 'Δ R$', w: dW }, { titulo: 'Δ %', w: pW },
    { titulo: String(a.ritmo).slice(-2), w: mW }, { titulo: String(a.orc).slice(-2), w: mW, destaque: true },
    { titulo: 'SITUAÇÃO', w: sW, align: 'L' }
  ], linhas, [{ titulo: 'R$', c0: 2, n: 4 }, { titulo: 'R$/M²', c0: 6, n: 2, cor: '#475569' }]);

  // Nota: os avulsos do ano abertos como no slide de Projetos; os do ano
  // anterior não abrem (o ritmo da METRAGEM é só o total da conta).
  _orcUmaLinha_(slide, MX, yFim + 3, tw, 12, 'Avulsos ' + a.orc + ': ' +
    cls.grupos.slice(1).map(x => x.nome.split(' (')[0].toLowerCase() + ' ' + _orcCompacto_(x.total)).join(' · ') +
    ' · avulsos ' + a.ritmo + ' = ritmo da conta − contratos do cadastro (o ritmo não abre item por item)',
    { align: 'L', fs: 6.5, cor: C.textBody, fonte: DS.typography.body, fsMin: 5.5, cortar: true });

  _orcRodape_(slide, W, H, 'Fontes: "' + (ORC_ANO - 2) + ' - Contratos" (cadastro, valores de ' + a.ritmo + '), contratos e modelo 090 de ' +
    a.orc + ', METRAGEM-COND · R$/m² ao mês pela área implícita de cada ano · ' + cid.nome);
}
