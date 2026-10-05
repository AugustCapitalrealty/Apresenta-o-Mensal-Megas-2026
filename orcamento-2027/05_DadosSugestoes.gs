/**
 * ARQUIVO: 05_DadosSugestoes.gs
 * SEÇÃO:   NÚCLEO — Cálculos da seção "Sugestões"
 * DESCRIÇÃO: Os números dos slides que nasceram como sugestão (10_ResumoExecutivo,
 *            17_Investimento, 18_CustoM2 e os pendentes de 90_Pendentes.gs),
 *            todos derivados dos dados já lidos — relatório anual (METRAGEM),
 *            mensal, modelos 070/090 e planilhas de contratos. Separados do
 *            desenho para o teste conferir as contas sem olhar coordenada.
 */

// Palavras que marcam item de manutenção como PROJETO (algo novo, que se
// implanta uma vez) e não como manutenção. Só valem para item que não é
// contrato e aparece em menos de 6 meses — "COMPRA DE MATERIAIS PARA O
// ZELADOR" todo mês é recorrente, não projeto.
const ORC_PALAVRAS_PROJETO = ['implantacao', 'instalacao', 'compra', 'defensas', 'melhoria', 'plantio',
                              'torniquete', 'kit sonda'];

// Projeto que atende norma ou segurança da vida não entra na lista do que dá
// para adiar (linha de vida é NR-35; SPCQ e PPCI são exigência).
const ORC_PALAVRAS_NORMA = ['linha de vida', 'spcq', 'ppci', 'incendio', 'nr '];
const ORC_CATEGORIAS_NORMA = ['PPCI', 'SPCQ'];

// Contas em que a ponte separa "o que já roda em dez/ano anterior" do que é
// novo. Só faz sentido em conta de contrato mensal: na manutenção, dezembro
// anualizado não diz nada (é conta de projetos).
const ORC_PONTE_SEPARAR = ['Segurança e vigilância', 'Limpeza e conservação'];

// Fornecedores que aparecem com nomes diferentes em planilhas diferentes e
// são o mesmo grupo ("EMPRESA AUXILIAR DE SEGURANÇA", "…DE SERVIÇOS GERAIS",
// "[CONTRATO AUXILIAR]").
const ORC_GRUPOS_FORNECEDOR = [
  { termo: 'auxiliar', grupo: 'EMPRESA AUXILIAR' },
  { termo: 'miriad',   grupo: 'MIRIAD' },                     // contrato + "ampliação contrato … Miriad" do 090
  { termo: 'firecam',  grupo: 'FIRECAM' },                    // contrato + "ampliação contrato SDAI Firecam" do 090
  { termo: 'alteracao de escala', grupo: 'EMPRESA AUXILIAR' }, // "[CONTRATO] - SERVIÇO DE ALTERAÇÃO DE ESCALA 12X36…" do 070
  { termo: 'emprestimo itau', grupo: 'ITAÚ (FINANCIAMENTO)' }  // banco que financia a cerca elétrica (planilha de segurança)
];

// Item-contrato do modelo sem empresa no texto: aparece com este rótulo no
// ranking e nas listas, para ser identificado. Para identificar, acrescente um
// termo do item em ORC_GRUPOS_FORNECEDOR.
const ORC_SEM_FORNECEDOR = '[IDENTIFICAR EMPRESA]';
// Tags de "[CONTRATO …]" que não são fornecedor: LPU é a lista de preços
// unitários do contrato.
const ORC_TAGS_NAO_FORNECEDOR = ['lpu'];

// Parcela de empréstimo/financiamento tem valor fixo por natureza: não entra
// na conta de "sem reajuste".
const ORC_PALAVRAS_PARCELA_FIXA = ['emprestimo', 'financiamento'];

// ==========================================
// ÁREA E R$/m²
// ==========================================
// A METRAGEM traz o R$/m² ao mês, não a área. A área sai de total ÷ R$/m² ÷
// 12 — é aproximada (o R$/m² vem com duas casas), mas é a que o relatório
// usou. null quando o ano não tem R$/m².
function _orcAreaImplicita_(rel, k) {
  if (!rel.m2Total || !(rel.m2Total[k] > 0)) return null;
  return rel.total[k] / rel.m2Total[k] / 12;
}

// ==========================================
// S1 — RESUMO EXECUTIVO (slide promovido: 10_ResumoExecutivo.gs)
// ==========================================
/**
 * Decompõe a variação do total (Orç − Ritmo) em efeito ÁREA (mais m² ao
 * mesmo custo por m²) e efeito CUSTO/m² (a área nova ao custo novo). As
 * duas parcelas somam a variação exata, porque total = área × R$/m² × 12.
 */
function _orcResumoExecutivo_(rel, classManut) {
  const t = rel.total;
  const delta = t.orc - t.ritmo;
  const aRit = _orcAreaImplicita_(rel, 'ritmo'), aOrc = _orcAreaImplicita_(rel, 'orc');
  const out = {
    total: t.orc, ritmo: t.ritmo, delta: delta, pct: t.ritmo ? delta / t.ritmo : 0,
    m2Orc: rel.m2Total ? rel.m2Total.orc : null, m2Rit: rel.m2Total ? rel.m2Total.ritmo : null,
    areaRit: aRit, areaOrc: aOrc, efeitoArea: null, efeitoCusto: null,
    foco: [], deltaFoco: 0, projetos: classManut ? classManut.projetos.total : null
  };
  if (aRit && aOrc) {
    out.efeitoArea = (aOrc - aRit) * rel.m2Total.ritmo * 12;
    out.efeitoCusto = delta - out.efeitoArea;
  }
  ORC_CONTAS_DETALHE.forEach(nome => {
    const c = rel.contas.filter(x => x.chave === _orcChaveConta_(nome))[0];
    if (!c) return;
    const d = c.v.orc - c.v.ritmo;
    out.foco.push({ nome: c.nome, delta: d });
    out.deltaFoco += d;
  });
  return out;
}

// ==========================================
// S2 — PONTE RITMO → ORÇAMENTO (slide promovido: 10_ResumoExecutivo.gs)
// ==========================================
/**
 * Degraus da ponte, na ordem: as contas em foco, IPTU, Seguro, demais altas
 * e as reduções. Nas contas de ORC_PONTE_SEPARAR a variação vira duas
 * partes: "saída" = dezembro do ano anterior × 12 − ritmo (o que já está
 * rodando no fim do ano) e "novo" = o resto.
 * @return { inicio, fim, degraus: [{ nome, delta, partes: [{ tipo: 'saida'|'novo'|'total', v }] }] }
 */
function _orcPonte_(rel, mensal) {
  const usadas = {};
  const degraus = [];
  const contaDe = nome => rel.contas.filter(x => x.chave === _orcChaveConta_(nome))[0];
  const empurrar = (nome, v, chave, separar) => {
    const delta = v.orc - v.ritmo;
    let partes = [{ tipo: 'total', v: delta }];
    const m = separar && mensal && mensal.contas[chave];
    if (m) {
      const saida = m.real[11] * 12 - v.ritmo;
      partes = [{ tipo: 'saida', v: saida }, { tipo: 'novo', v: delta - saida }];
    }
    degraus.push({ nome: nome, chave: chave, delta: delta, partes: partes });
  };

  ORC_CONTAS_DETALHE.forEach(nome => {
    const c = contaDe(nome);
    if (!c) return;
    usadas[c.chave] = true;
    const separar = ORC_PONTE_SEPARAR.some(n => _orcChaveConta_(n) === c.chave);
    empurrar(c.nome, c.v, c.chave, separar);
  });
  empurrar('Seguro', rel.seguro, _orcChaveConta_('Seguro'), false);
  empurrar('IPTU', rel.iptu, _orcChaveConta_('IPTU'), false);

  let altas = 0, reducoes = 0, nAltas = 0, nRed = 0;
  rel.contas.forEach(c => {
    if (usadas[c.chave]) return;
    const d = c.v.orc - c.v.ritmo;
    if (d > 0) { altas += d; nAltas++; } else if (d < 0) { reducoes += d; nRed++; }
  });
  degraus.push({ nome: 'Outras altas (' + nAltas + ')', delta: altas, partes: [{ tipo: 'total', v: altas }] });
  degraus.push({ nome: 'Reduções (' + nRed + ')', delta: reducoes, partes: [{ tipo: 'total', v: reducoes }] });
  return { inicio: rel.total.ritmo, fim: rel.total.orc, degraus: degraus };
}

// ==========================================
// S3 — MANUTENÇÃO: INVESTIMENTO × RECORRENTE
// ==========================================
/**
 * Cada item da manutenção (modelo + contratos) em um de quatro grupos, nesta
 * ordem de precedência:
 *   contratos  → item.contrato
 *   recorrente → valor em 6 meses ou mais (provisão, zelador…)
 *   projetos   → palavra de ORC_PALAVRAS_PROJETO na descrição
 *   pontual    → o resto (pinturas, revisões, lavagens, demarcações…)
 */
function _orcClassificarManutencao_(dados) {
  const grupos = {
    contratos:  { nome: 'Contratos',            total: 0, itens: [] },
    recorrente: { nome: 'Recorrente (6+ meses)', total: 0, itens: [] },
    pontual:    { nome: 'Manutenção pontual',    total: 0, itens: [] },
    projetos:   { nome: 'Projetos / investimento', total: 0, itens: [] }
  };
  dados.categorias.forEach(cat => cat.itens.forEach(it => {
    const nMeses = it.meses.filter(v => Math.abs(v) > 0.005).length;
    const d = _orcNorm_(it.descricao);
    let g = 'pontual';
    if (it.contrato) g = 'contratos';
    else if (nMeses >= 6) g = 'recorrente';
    else if (ORC_PALAVRAS_PROJETO.some(p => d.indexOf(p) >= 0)) g = 'projetos';
    const reg = Object.assign({ categoria: cat.nome }, it);
    grupos[g].itens.push(reg);
    grupos[g].total += it.total;
  }));
  Object.keys(grupos).forEach(k => grupos[k].itens.sort((a, b) => b.total - a.total));
  return {
    total: dados.total,
    grupos: [grupos.contratos, grupos.recorrente, grupos.pontual, grupos.projetos],
    projetos: grupos.projetos
  };
}

// ==========================================
// S4 — CENÁRIOS: O QUE DÁ PARA ADIAR
// ==========================================
function _orcEhNorma_(it) {
  const d = _orcNorm_(it.descricao);
  return ORC_CATEGORIAS_NORMA.indexOf(it.categoria) >= 0 || ORC_PALAVRAS_NORMA.some(p => d.indexOf(p) >= 0);
}

/**
 * Projetos que podem ser adiados (sem os de norma), do maior para o menor,
 * com o efeito ACUMULADO no total geral e no R$/m² (área do orçamento fixa).
 */
function _orcCenarios_(rel, classManut) {
  const area = _orcAreaImplicita_(rel, 'orc');
  const candidatos = classManut.projetos.itens.filter(it => !_orcEhNorma_(it));
  const norma = classManut.projetos.itens.filter(_orcEhNorma_);
  let acum = 0;
  const linhas = candidatos.map(it => {
    acum += it.total;
    const total = rel.total.orc - acum;
    return { item: it, acumulado: acum, total: total, m2: area ? total / area / 12 : null };
  });
  return {
    base: rel.total.orc, m2Base: rel.m2Total ? rel.m2Total.orc : null, ritmo: rel.total.ritmo,
    linhas: linhas, totalCandidatos: acum,
    norma: norma, totalNorma: norma.reduce((a, it) => a + it.total, 0)
  };
}

// ==========================================
// S5 — CONTRATOS: CONCENTRAÇÃO E REAJUSTES
// ==========================================
// Grupo pelo termo conhecido (no fornecedor ou na descrição); sem termo, a
// primeira parte do nome; sem nome, ORC_SEM_FORNECEDOR.
function _orcGrupoFornecedor_(nome, descricao) {
  const n = _orcNorm_((nome || '') + ' ' + (descricao || ''));
  const g = ORC_GRUPOS_FORNECEDOR.filter(x => n.indexOf(_orcNorm_(x.termo)) >= 0)[0];
  if (g) return g.grupo;
  if (!nome) return ORC_SEM_FORNECEDOR;
  return String(nome).split(' - ')[0].trim().toUpperCase();
}

// Nome curto para tabela: fornecedor · serviço, sem repetir o fornecedor.
// "SERVIÇO DE PORTARIA - EMPRESA AUXILIAR DE SERVIÇOS GERAIS" → "EMPRESA AUXILIAR · PORTARIA";
// "COLETA DE REJEITOS DO RESTAURANTE (TRANSRESÍDUOS)" → "TRANSRESÍDUOS · COLETA DE REJEITOS DO RESTAURANTE";
// "MIRIAD SERVIÇOS INDUSTRIAIS E COMERCIO" → "MIRIAD".
function _orcRotuloContrato_(c) {
  if (c.grupo === ORC_SEM_FORNECEDOR) return ORC_SEM_FORNECEDOR + ' · ' + String(c.descricao).trim().toUpperCase();
  const g = _orcNorm_(c.grupo.replace(/\s*\(.*\)$/, ''));      // "ITAÚ (FINANCIAMENTO)" → "itau"
  const partes = String(c.descricao).replace(/\s*\([^)\d]+\)\s*$/, '').split(' - ').map(p => p.trim());
  // Com várias partes, a que cita o fornecedor sai; com uma só, sai quando é o
  // nome dele ("AMPLIAÇÃO CONTRATO … MIRIAD" fica).
  const servico = partes.filter(p => {
    const n = _orcNorm_(p);
    if (p.length <= 4) return false;                            // sigla: "LCW"
    return partes.length > 1 ? n.indexOf(g) < 0 : n.indexOf(g) !== 0;
  }).map(p => p.replace(/^(SERVIÇO DE|SRV)\s+/i, '')).join(' - ');
  return servico ? c.grupo + ' · ' + servico.toUpperCase() : c.grupo;
}

/**
 * Todos os contratos recorrentes da cidade: as planilhas de contratos de
 * cada conta e os itens-contrato dos modelos 070/090 das contas em foco.
 * @return [{ fornecedor, grupo, conta, descricao, meses, total }]
 */
function _orcContratosCidade_(cid, linhasModelo) {
  const out = [];
  Object.keys(cid.contratos || {}).forEach(conta => {
    const id = cid.contratos[conta];
    if (!id) return;
    try {
      _orcLerContratos_(id).forEach(k => out.push({
        fornecedor: k.fornecedor, grupo: _orcGrupoFornecedor_(k.fornecedor), conta: conta,
        descricao: k.fornecedor, meses: k.meses, total: k.total
      }));
    } catch (e) { Logger.log('Contratos de "' + conta + '" fora da análise de fornecedores: ' + e.message); }
  });
  const foco = ORC_CONTAS_DETALHE.map(_orcChaveConta_);
  (linhasModelo || []).forEach(l => {
    if (!l.item || Math.abs(l.total) < 0.5 || foco.indexOf(_orcChaveConta_(l.conta)) < 0) return;
    const s = _orcSepararCategoria_(l.item);
    if (!/^contrato\b/.test(_orcNorm_(s.categoria)) && !/\bcontrato\b/.test(_orcNorm_(s.descricao))) return;
    if (/^contrato — /i.test(String(l.item))) return;          // já veio da planilha de contratos
    // "[CONTRATO AUXILIAR] - POSTO…" → fornecedor AUXILIAR, pela tag; sem tag,
    // pelo texto do item. "[CONTRATO LPU]" não é fornecedor.
    let tag = /^contrato\b/i.test(s.categoria) ? s.categoria.replace(/^CONTRATO\s*/i, '').trim() : '';
    if (ORC_TAGS_NAO_FORNECEDOR.indexOf(_orcNorm_(tag)) >= 0) tag = '';
    const fornecedor = tag || _orcFornecedorDoItem_(s.descricao);
    out.push({ fornecedor: fornecedor, grupo: _orcGrupoFornecedor_(fornecedor, s.descricao), conta: l.conta,
               descricao: s.descricao, meses: l.meses, total: l.total });
  });
  return out;
}

// Fornecedor escrito no próprio item do modelo:
// "COLETA DE REJEITOS DO RESTAURANTE (TRANSRESÍDUOS)" → "TRANSRESÍDUOS";
// "…SEGURANÇA ELETRÔNICA - FM SECURITY" → "FM SECURITY";
// sem nenhum dos dois, '' (fornecedor não informado).
function _orcFornecedorDoItem_(descricao) {
  const t = String(descricao).trim();
  const par = t.match(/\(([^)]+)\)\s*$/);
  if (par && !/\d/.test(par[1])) return par[1].trim().toUpperCase();
  const partes = t.split(' - ');
  return partes.length > 1 ? partes[partes.length - 1].trim().toUpperCase() : '';
}

/**
 * Mudança de valor entre meses com valor, dentro do ano: é o reajuste que o
 * orçamento já prevê. Contrato com valor em 10+ meses e sem mudança entra em
 * "semReajuste" — é onde um reajuste não previsto cairia. Parcela de
 * empréstimo fica de fora (em "parcelasFixas"): não tem reajuste.
 */
function _orcReajustes_(contratos) {
  const reajustes = [], semReajuste = [], parcelasFixas = [];
  contratos.forEach(c => {
    const txt = _orcNorm_(c.fornecedor + ' ' + c.descricao);
    if (ORC_PALAVRAS_PARCELA_FIXA.some(p => txt.indexOf(p) >= 0)) { parcelasFixas.push(c); return; }
    let anterior = null, mudou = false;
    const nMeses = c.meses.filter(v => Math.abs(v) > 0.5).length;
    c.meses.forEach((v, i) => {
      if (Math.abs(v) < 0.5) return;
      if (anterior && Math.abs(v - anterior.v) / anterior.v > 0.005) {
        reajustes.push({ contrato: c, mes: i, de: anterior.v, para: v, pct: v / anterior.v - 1 });
        mudou = true;
      }
      anterior = { v: v, i: i };
    });
    if (!mudou && nMeses >= 10) semReajuste.push(c);
  });
  const baseSem = semReajuste.reduce((a, c) => a + c.total, 0);
  return { reajustes: reajustes.sort((a, b) => a.mes - b.mes),
           semReajuste: semReajuste.sort((a, b) => b.total - a.total), parcelasFixas: parcelasFixas,
           baseSemReajuste: baseSem, umPorCento: baseSem * 0.01 };
}

// Soma por grupo de fornecedor, do maior para o menor.
function _orcConcentracaoFornecedores_(contratos, totalGeral) {
  const mapa = {};
  contratos.forEach(c => {
    const g = mapa[c.grupo] || (mapa[c.grupo] = { grupo: c.grupo, total: 0, contas: {}, n: 0 });
    g.total += c.total; g.n++;
    // Chave da conta: "Segurança e Vigilância" (070) e "…vigilância" (config) são a mesma.
    const ch = _orcChaveConta_(c.conta);
    if (!g.contas[ch]) g.contas[ch] = c.conta;
  });
  return Object.keys(mapa).map(k => mapa[k])
    .map(g => Object.assign(g, { pct: totalGeral ? g.total / totalGeral : 0,
                                 contas: Object.keys(g.contas).map(k => g.contas[k]) }))
    .sort((a, b) => b.total - a.total);
}

// ==========================================
// S6 — FLUXO MENSAL DO ORÇAMENTO INTEIRO
// ==========================================
/**
 * Séries mensais do orçamento por bloco (as contas em foco, IPTU, Seguro e o
 * resto junto) e o real/ritmo do ano anterior somado. Contas que não estão
 * no relatório mensal (despesa de pessoal) ficam de fora — o slide avisa.
 */
function _orcFluxoMensal_(mensal, rel) {
  const zeros = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const blocos = ORC_CONTAS_DETALHE.map(n => ({ nome: n, chaves: [_orcChaveConta_(n)], orc: zeros() }))
    .concat([{ nome: 'IPTU', chaves: [_orcChaveConta_('IPTU')], orc: zeros() },
             { nome: 'Seguro', chaves: [_orcChaveConta_('Seguro')], orc: zeros() }]);
  const demais = { nome: 'Demais contas', chaves: [], orc: zeros() };
  const real = zeros();
  Object.keys(mensal.contas).forEach(ch => {
    const m = mensal.contas[ch];
    const b = blocos.filter(x => x.chaves.indexOf(ch) >= 0)[0] || demais;
    m.orc.forEach((v, i) => { b.orc[i] += v; });
    m.real.forEach((v, i) => { real[i] += v; });
  });
  const todos = blocos.concat([demais]);
  const total = zeros();
  todos.forEach(b => b.orc.forEach((v, i) => { total[i] += v; }));
  const noMensal = Object.keys(mensal.contas);
  const fora = (rel ? rel.contas : []).filter(c => noMensal.indexOf(c.chave) < 0 && c.v.orc > 0.5);
  return { blocos: todos, total: total, real: real, fora: fora };
}

// ==========================================
// S7 — R$/m² POR CONTA
// ==========================================
// Contas abertas no slide: as maiores pelo Orç do ano, do maior para o menor
// (pedido do gestor, 30/09/2026); as outras somam em "Demais contas".
const ORC_M2_TOP = 10;

function _orcM2PorConta_(rel) {
  const ks = ['real', 'orcAnt', 'ritmo', 'orc'];
  const area = {};
  ks.forEach(k => { area[k] = _orcAreaImplicita_(rel, k); });
  // Orç do ano anterior não tem R$/m² próprio na METRAGEM de todos os Megas:
  // sem ele, usa a área do ritmo do mesmo ano.
  if (!area.orcAnt) area.orcAnt = area.ritmo;
  const m2 = v => { const o = {}; ks.forEach(k => { o[k] = area[k] ? v[k] / area[k] / 12 : null; }); return o; };
  // IPTU e Seguro ficam fora de rel.contas (são linhas próprias da METRAGEM),
  // mas concorrem ao top como qualquer conta.
  const todas = rel.contas.map(c => ({ nome: c.nome, chave: c.chave, v: c.v }))
    .concat([{ nome: 'IPTU', chave: _orcChaveConta_('IPTU'), v: rel.iptu },
             { nome: 'Seguro', chave: _orcChaveConta_('Seguro'), v: rel.seguro }])
    .sort((a, b) => b.v.orc - a.v.orc);
  const linhas = todas.slice(0, ORC_M2_TOP).map(c => ({ nome: c.nome, chaves: [c.chave], v: c.v, m2: m2(c.v) }));
  const fora = todas.slice(ORC_M2_TOP);
  if (fora.length) {
    const resto = ks.reduce((o, k) => { o[k] = fora.reduce((a, c) => a + c.v[k], 0); return o; }, {});
    linhas.push({ nome: 'Demais contas (' + fora.length + ')', chaves: fora.map(c => c.chave), v: resto, m2: m2(resto) });
  }
  return { area: area, linhas: linhas, total: { nome: 'TOTAL GERAL', v: rel.total, m2: m2(rel.total) } };
}
