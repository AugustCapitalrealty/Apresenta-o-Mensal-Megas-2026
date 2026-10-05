/**
 * ARQUIVO: 04_DadosRelatorios.gs
 * SEÇÃO:   NÚCLEO — Leitura dos relatórios da controladoria
 * DESCRIÇÃO: Lê os dois relatórios que a controladoria monta por Mega e
 *            cruza com os modelos 070/090 para abrir cada conta por item.
 *
 *   metragem → uma linha por conta: Real 2025 | Orça 2026 | Ritmo 2026 |
 *              Orça 2027, e abaixo TOTAL ÁREA COMUM, R$/m², IPTU, Seguro e o
 *              total geral. Alimenta a DRE e o quadro de ofensores.
 *   mensal   → uma linha por conta, doze trios Orç 26 | Real 26 | Orça 27.
 *              Alimenta o gráfico mês a mês da análise linha a linha.
 *
 * Os relatórios lançam despesa com sinal negativo; tudo aqui sai positivo.
 */

// ==========================================
// CONTAS
// ==========================================
// Cada planilha escreve a conta de um jeito: "Seguro" × "Seguros",
// "manutenção imóveis" × "Manutenção de imóveis", "despesas c/ veículos" ×
// "Despesa com veículos". A chave tira acento, conectivos e o plural, para as
// quatro fontes (metragem, mensal, 070, 090) caírem na mesma conta.
function _orcChaveConta_(s) {
  return _orcNorm_(s)
    .replace(/\bc\/\s*/g, 'com ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter(p => p && ['de', 'da', 'do', 'e', 'com', 'a', 'o'].indexOf(p) < 0)
    .map(p => p.length > 3 ? p.replace(/s$/, '') : p)
    .join(' ');
}

// Grupos da DRE, na ordem em que aparecem. Mesmo agrupamento da DRE da
// apresentação mensal (megas-mensal/02_Dados.gs, DRE_CATEGORIAS), com os
// nomes que estes relatórios usam. Conta fora da lista cai em "Outras
// despesas" — aparece solta em vez de sumir.
const ORC_DRE_GRUPOS = [
  { nome: 'Pessoal e Administrativas', contas: [
    'Despesa de pessoal', 'Cursos e seminários', 'Despesa com passagens', 'Despesa com hospedagem',
    'Representação e refeição', 'Despesa com taxi', 'Locação de veículos', 'Despesa com combustíveis',
    'KM, estacionamento e pedágio', 'Quilometragem, estacionamento e pedágio', 'Despesa com veículos',
    'Material de expediente', 'Outras despesas administrativas', 'Cópias e reproduções', 'Correios',
    'Fretes e Carretos', 'Bens de pequeno valor'] },
  { nome: 'Serviços de Terceiros', contas: [
    'Assistência jurídica', 'Segurança e vigilância', 'Consultoria e assessoria',
    'Assistência em informática', 'Serviços diversos', 'Propaganda e publicidade'] },
  { nome: 'Manutenção e Conservação', contas: [
    'Limpeza e conservação', 'Manutenção de imóveis', 'Manutenção de máquinas e equipamentos',
    'Materiais de informática'] },
  { nome: 'Utilities, Taxas e Consumo', contas: [
    'Energia elétrica', 'Água', 'Telefone', 'Material de consumo', 'Outras taxas e impostos'] }
];
const ORC_DRE_OUTRAS = 'Outras despesas';

function _orcGrupoDaConta_(nome) {
  const ch = _orcChaveConta_(nome);
  const g = ORC_DRE_GRUPOS.filter(gr => gr.contas.some(c => _orcChaveConta_(c) === ch))[0];
  return g ? g.nome : ORC_DRE_OUTRAS;
}

// ==========================================
// METRAGEM (anual por conta)
// ==========================================
/**
 * @return {{ anos:{real,orcAnt,ritmo,orc}, contas:[{nome, chave, grupo, v}],
 *            areaComum, m2AreaComum, iptu, seguro, total, m2Total, avisos:[] }}
 * Cada "v" é { real, orcAnt, ritmo, orc } em R$ positivos: Real do ano
 * retrasado, orçado e ritmo do ano anterior, orçado do ano em curso.
 */
function obterRelatorioAnual_(chaveCidade) {
  return _orcLerMetragem_(_orcLerPrimeiraAba_(_orcRelatorioId_(chaveCidade, 'metragemId', 'METRAGEM-COND')));
}

// Cada relatório é cobrado só por quem o usa: sem o mensal a cidade perde o
// mês a mês, não a DRE (a METRAGEM pode chegar antes).
function _orcRelatorioId_(chaveCidade, campo, nome) {
  const cid = ORC_CIDADES[chaveCidade];
  if (!cid) throw new Error('Cidade desconhecida: ' + chaveCidade);
  const id = cid.relatorios && cid.relatorios[campo];
  if (!id) {
    throw new Error(cid.nome + ': o relatório da controladoria ' + nome + ' ainda não foi ' +
                    'configurado em ORC_CIDADES (01_Config.gs).');
  }
  return id;
}

function _orcLerPrimeiraAba_(planilhaId) {
  return SpreadsheetApp.openById(planilhaId).getSheets()[0].getDataRange().getValues();
}

// Separado da leitura para o teste passar a matriz direto.
function _orcLerMetragem_(dados) {
  const cab = (dados[0] || []).map(_orcNorm_);
  const achar = (re, ano) => cab.findIndex(h => { const m = h.match(re); return m && +m[1] === ano; });
  const col = {
    real:   achar(/^real (\d{4})$/, ORC_ANO - 2),
    orcAnt: achar(/^orca? (\d{4})$/, ORC_ANO - 1),
    ritmo:  achar(/^ritmo (\d{4})$/, ORC_ANO - 1),
    orc:    achar(/^orca? (\d{4})$/, ORC_ANO)
  };
  const faltam = Object.keys(col).filter(k => col[k] < 0);
  if (faltam.length) {
    throw new Error('Relatório de metragem: cabeçalho inesperado. Esperava "Real ' + (ORC_ANO - 2) + '", "Orça ' +
                    (ORC_ANO - 1) + '", "Ritmo ' + (ORC_ANO - 1) + '" e "Orça ' + ORC_ANO + '" na linha 1. ' +
                    'Encontrado: ' + (dados[0] || []).filter(String).join(' | '));
  }
  // Despesa vem negativa (ou entre parênteses): tudo sai positivo.
  const valores = r => ({ real: -_orcNum_(r[col.real]), orcAnt: -_orcNum_(r[col.orcAnt]),
                          ritmo: -_orcNum_(r[col.ritmo]), orc: -_orcNum_(r[col.orc]) });

  const out = { anos: { real: ORC_ANO - 2, orcAnt: ORC_ANO - 1, ritmo: ORC_ANO - 1, orc: ORC_ANO },
                contas: [], areaComum: null, m2AreaComum: null, iptu: null, seguro: null,
                total: null, m2Total: null, avisos: [], revisar: [] };
  let depoisDoTotal = false;
  for (let i = 1; i < dados.length; i++) {
    const nome = String(dados[i][0] === null || dados[i][0] === undefined ? '' : dados[i][0])
      .replace(/ /g, ' ').trim();
    if (!nome) continue;
    const n = _orcNorm_(nome);
    if (/^total area comum \+/.test(n)) out.total = valores(dados[i]);
    // Itajaí e Esteio escrevem o total geral com o mesmo rótulo do subtotal
    // ("TOTAL ÁREA COMUM" duas vezes): a segunda, depois de IPTU e Seguro, é
    // o total geral — a conferência abaixo confirma pela soma.
    else if (/^total area comum/.test(n) && out.areaComum) out.total = valores(dados[i]);
    else if (/^total area comum/.test(n)) { out.areaComum = valores(dados[i]); depoisDoTotal = true; }
    else if (/^r\$ m/.test(n)) {
      if (out.total) out.m2Total = valores(dados[i]); else out.m2AreaComum = valores(dados[i]);
    }
    else if (/^iptu$/.test(n)) out.iptu = valores(dados[i]);
    else if (/^seguros?$/.test(n) && depoisDoTotal) out.seguro = valores(dados[i]);
    else if (!depoisDoTotal) {
      out.contas.push({ nome: nome, chave: _orcChaveConta_(nome), grupo: _orcGrupoDaConta_(nome),
                        v: valores(dados[i]) });
    }
  }

  // Zero falso: sem as linhas de total o relatório mudou de formato, e a DRE
  // sairia sem fecho em vez de avisar.
  ['areaComum', 'iptu', 'seguro', 'total'].forEach(k => {
    if (!out[k]) throw new Error('Relatório de metragem: linha "' +
      { areaComum: 'TOTAL ÁREA COMUM', iptu: 'IPTU', seguro: 'Seguro', total: 'TOTAL ÁREA COMUM + IPTU + SEGURO' }[k] +
      '" não encontrada.');
  });
  if (!out.contas.length) throw new Error('Relatório de metragem: nenhuma conta antes de TOTAL ÁREA COMUM.');

  // Conferência das somas: diverge → aviso no slide e no log, nunca em
  // silêncio (é assim que o erro de digitação aparece antes da reunião).
  ['real', 'orcAnt', 'ritmo', 'orc'].forEach(k => {
    const soma = out.contas.reduce((a, c) => a + c.v[k], 0);
    if (Math.abs(soma - out.areaComum[k]) > 1) {
      out.avisos.push('Soma das contas (' + _orcMoeda_(soma) + ') ≠ TOTAL ÁREA COMUM (' + _orcMoeda_(out.areaComum[k]) +
                      ') em ' + _orcRotuloColuna_(k, out.anos));
    }
    const geral = out.areaComum[k] + out.iptu[k] + out.seguro[k];
    if (Math.abs(geral - out.total[k]) > 1) {
      out.avisos.push('Área comum + IPTU + Seguro (' + _orcMoeda_(geral) + ') ≠ total geral (' +
                      _orcMoeda_(out.total[k]) + ') em ' + _orcRotuloColuna_(k, out.anos));
    }
  });
  out.avisos.forEach(a => Logger.log('AVISO metragem: ' + a));
  return out;
}

function _orcRotuloColuna_(k, anos) {
  return { real: 'Real ', orcAnt: 'Orç ', ritmo: 'Ritmo ', orc: 'Orç ' }[k] + anos[k];
}

// ==========================================
// MENSAL (mês a mês por conta)
// ==========================================
/**
 * @return {{ contas: { [chave]: { nome, orcAnt:number[12], real:number[12], orc:number[12] } } }}
 * "real" do ano anterior traz o realizado até o último mês fechado e o ritmo
 * projetado nos seguintes — o relatório não separa os dois.
 */
function obterRelatorioMensal_(chaveCidade) {
  return _orcLerMensal_(_orcLerPrimeiraAba_(_orcRelatorioId_(chaveCidade, 'mensalId', 'Despesas-Mensal')));
}

/**
 * Os doze meses do Orç do ano no relatório mensal têm que somar o Orç da
 * mesma conta na METRAGEM. Divergência vira aviso em rel.avisos (rodapé da
 * DRE e log) e entra em rel.revisar ({ nome, chave, mensal, metragem }), que
 * gera o slide "Revisar antes da versão final" e o selo ⚠ REVISAR nos slides
 * com a conta (19_Revisar.gs) — um mês digitado errado não passa calado.
 * Conta que o mensal não traz (despesa de pessoal) não é cobrada: o gráfico
 * avisa que ficou fora.
 */
function _orcConferirMensal_(rel, mensal) {
  const contas = rel.contas.concat([{ nome: 'IPTU', chave: _orcChaveConta_('IPTU'), v: rel.iptu },
                                    { nome: 'Seguro', chave: _orcChaveConta_('Seguro'), v: rel.seguro }]);
  contas.forEach(c => {
    const m = mensal.contas[c.chave];
    if (!m) return;
    const soma = m.orc.reduce((a, v) => a + v, 0);
    if (Math.abs(soma - c.v.orc) > 1) {
      const aviso = 'Mensal ≠ METRAGEM em ' + c.nome + ': ' + _orcMoeda_(soma) + ' × ' + _orcMoeda_(c.v.orc) +
                    ' (Orç ' + rel.anos.orc + ')';
      rel.avisos.push(aviso);
      rel.revisar.push({ nome: c.nome, chave: c.chave, mensal: soma, metragem: c.v.orc });
      Logger.log('AVISO mensal: ' + aviso);
    }
  });
}

const _ORC_MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function _orcLerMensal_(dados) {
  const cab = (dados[0] || []).map(_orcNorm_);
  const aa = n => String(n).slice(-2);
  const col = { orcAnt: [], real: [], orc: [] };
  _ORC_MES_ABREV.forEach((m, i) => {
    col.orcAnt[i] = cab.indexOf('orc ' + m + '/' + aa(ORC_ANO - 1));
    if (col.orcAnt[i] < 0) col.orcAnt[i] = cab.indexOf('orca ' + m + '/' + aa(ORC_ANO - 1));
    col.real[i] = cab.indexOf('real ' + m + '/' + aa(ORC_ANO - 1));
    col.orc[i] = cab.indexOf('orca ' + m + '/' + aa(ORC_ANO));
    if (col.orc[i] < 0) col.orc[i] = cab.indexOf('orc ' + m + '/' + aa(ORC_ANO));
  });
  const faltam = [];
  Object.keys(col).forEach(k => col[k].forEach((c, i) => { if (c < 0) faltam.push(k + ' ' + _ORC_MES_ABREV[i]); }));
  if (faltam.length) {
    throw new Error('Relatório mensal: cabeçalho inesperado, faltam as colunas ' + faltam.slice(0, 6).join(', ') +
                    (faltam.length > 6 ? '…' : '') + '. Esperava "Orç Jan/' + aa(ORC_ANO - 1) + '", "Real Jan/' +
                    aa(ORC_ANO - 1) + '", "Orça Jan/' + aa(ORC_ANO) + '"… na linha 1.');
  }

  const contas = {};
  for (let i = 1; i < dados.length; i++) {
    const nome = String(dados[i][0] === null || dados[i][0] === undefined ? '' : dados[i][0])
      .replace(/ /g, ' ').trim();
    if (!nome || /^total/.test(_orcNorm_(nome))) continue;
    const serie = k => col[k].map(c => -_orcNum_(dados[i][c]));
    contas[_orcChaveConta_(nome)] = { nome: nome, orcAnt: serie('orcAnt'), real: serie('real'), orc: serie('orc') };
  }
  if (!Object.keys(contas).length) throw new Error('Relatório mensal: nenhuma conta encontrada.');
  return { contas: contas };
}

// ==========================================
// ITENS DOS MODELOS 070 / 090
// ==========================================
/**
 * Itens orçados de uma conta nos modelos de orçamento (070 e 090), do maior
 * para o menor. Linhas zeradas (RATEIO) ficam de fora.
 * @param linhasModelo  saída de _orcLinhasModelo_ das duas planilhas, juntas
 */
function _orcItensDaConta_(linhasModelo, chaveConta) {
  return linhasModelo
    .filter(l => _orcChaveConta_(l.conta) === chaveConta && Math.abs(l.total) > 0.5)
    .map(l => Object.assign({ descricao: _orcSepararCategoria_(l.item).descricao,
                              categoria: _orcSepararCategoria_(l.item).categoria }, l))
    .sort((a, b) => b.total - a.total);
}

// Linhas dos dois modelos da cidade (070 e 090). Planilha ausente não quebra
// a análise: a conta só fica sem abertura por item.
function _orcLinhasModelosCidade_(chaveCidade) {
  const cid = ORC_CIDADES[chaveCidade];
  const out = [];
  [cid.servicosTerceirosId, cid.despesasGeraisId].forEach(id => {
    if (!id) return;
    try { Array.prototype.push.apply(out, _orcLerModelo_(id)); }
    catch (e) { Logger.log('Modelo ' + id + ' ignorado na análise por conta: ' + e.message); }
  });
  // Contratos recorrentes entram como linhas da sua conta: sem eles a
  // composição não fecha com a METRAGEM (sobraria "Não detalhado").
  Object.keys(cid.contratos || {}).forEach(conta => {
    const id = cid.contratos[conta];
    if (!id) return;
    try {
      _orcLerContratos_(id).forEach(k => out.push({
        linha: 0, conta: conta, contaNorm: _orcNorm_(conta), item: k.descricao, meses: k.meses, total: k.total
      }));
    } catch (e) { Logger.log('Contratos de "' + conta + '" ignorados na análise por conta: ' + e.message); }
  });
  return out;
}
