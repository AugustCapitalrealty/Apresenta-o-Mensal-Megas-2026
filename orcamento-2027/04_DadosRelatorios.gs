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
    .filter(p => p && ['de', 'da', 'do', 'e', 'em', 'com', 'a', 'o'].indexOf(p) < 0)   // "Assistência em informática" = "ASSISTÊNCIA INFORMÁTICA"
    .map(p => p.length > 3 ? p.replace(/s$/, '') : p)
    .join(' ');
}

// Grupos da DRE, na ordem em que aparecem. Mesmo agrupamento da DRE da
// apresentação mensal (megas-mensal/02_Dados.gs, DRE_CATEGORIAS), com os
// nomes que estes relatórios usam. Conta fora da lista cai em "Outras
// despesas" — aparece solta em vez de sumir.
// Mesmos grupos, nomes e ORDEM das contas da DRE dos Megas (DRE_CATEGORIAS
// em megas-mensal/02_Dados.gs): a conta aparece sempre na mesma posição, e
// IPTU e Seguro ficam em Utilities. As contas que só a METRAGEM tem vêm no
// fim do grupo.
const ORC_DRE_GRUPOS = [
  { nome: 'Despesas com Pessoal e Administrativas', contas: [
    'Despesa de pessoal', 'Cursos e seminários', 'Despesa com passagens', 'Despesa com hospedagem',
    'Representação e refeição', 'Despesa com taxi', 'Locação de veículos', 'Despesa com combustíveis',
    'KM, estacionamento e pedágio', 'Quilometragem, estacionamento e pedágio', 'Despesa com veículos',
    'Bens de pequeno valor', 'Outras despesas administrativas',
    'Material de expediente', 'Cópias e reproduções', 'Correios', 'Fretes e Carretos'] },
  { nome: 'Serviços de Terceiros', contas: [
    'Assistência jurídica', 'Segurança e vigilância', 'Assistência em informática',
    'Consultoria e assessoria', 'Serviços diversos', 'Propaganda e publicidade'] },
  { nome: 'Manutenção e Conservação', contas: [
    'Limpeza e conservação', 'Manutenção de imóveis', 'Manutenção de máquinas e equipamentos',
    'Materiais de informática'] },
  { nome: 'Utilities, Taxas e Consumo', contas: [
    'Energia elétrica', 'Água', 'Telefone', 'Material de consumo', 'Outras taxas e impostos', 'IPTU', 'Seguro'] }
];
const ORC_DRE_OUTRAS = 'Outras despesas';

// Número que traz IPTU e Seguro leva o aviso (Guilherme, 12/10/2026: "sinalizar
// quando IPTU tiver incluso"): o total da DRE (área comum + IPTU + Seguro), o
// R$/m² dele e o grupo Utilities, Taxas e Consumo, onde os dois entram. O mesmo
// texto em todo slide.
const ORC_COM_IPTU = 'com IPTU e seguro';
const ORC_TOTAL_COM_IPTU = 'DESPESAS OPERACIONAIS (' + ORC_COM_IPTU.toUpperCase() + ')';

// Nome da conta como a METRAGEM escreve, com o acento que faltar
// ("Manutenção de maquinas…" → "máquinas…", gestor 07/10/2026): vale o nome
// de ORC_DRE_GRUPOS quando a diferença é só de acento.
function _orcNomeContaExibido_(nome) {
  const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  const n = semAcento(nome).trim();
  for (const g of ORC_DRE_GRUPOS) for (const c of g.contas) if (semAcento(c) === n) return c;
  return nome;
}

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
// modelos: linhas de _orcLinhasModelosCidade_ já lidas (opcional — sem elas,
// e com o Orç calculado ligado, são lidas aqui).
function obterRelatorioAnual_(chaveCidade, modelos) {
  const rel = _orcLerMetragem_(_orcLerPrimeiraAba_(_orcRelatorioId_(chaveCidade, 'metragemId', 'METRAGEM-COND')));
  const cid = ORC_CIDADES[chaveCidade];
  if (cid.relatorios.orcDosModelos) {
    _orcAplicarOrcDosModelos_(rel, _orcOrcDosModelos_(cid, modelos || _orcLinhasModelosCidade_(chaveCidade)));
  }
  _orcAplicarAreaAnoAnterior_(rel, ORC_AREA_ANO_ANTERIOR[chaveCidade]);
  return rel;
}

// R$/m² do Orç e do Ritmo do ano anterior pela área oficial do condomínio
// (ORC_AREA_ANO_ANTERIOR, 01_Config.gs), não pela que a METRAGEM deixa
// implícita: com o R$/m² refeito aqui, _orcAreaImplicita_ devolve essa área e
// todo slide (DRE, custo por m², mês a mês, Facilities) usa a mesma.
function _orcAplicarAreaAnoAnterior_(rel, area) {
  if (!(area > 0)) return;
  if (!rel.m2Total) rel.m2Total = { real: 0, orcAnt: 0, ritmo: 0, orc: 0 };
  ['orcAnt', 'ritmo'].forEach(k => {
    rel.m2Total[k] = rel.total[k] / area / 12;
    if (rel.m2AreaComum) rel.m2AreaComum[k] = rel.areaComum[k] / area / 12;
  });
  rel.areaAnoAnterior = area;
}

// ==========================================
// ORÇ DO ANO CALCULADO PELOS MODELOS (relatorios.orcDosModelos)
// ==========================================
// Out/2026: os modelos 070/090 e os contratos são atualizados antes de a
// controladoria fechar a METRAGEM. Com orcDosModelos ligado (sempre, também
// com METRAGEM nova: batendo, nada muda; não batendo, valem os modelos e a
// diferença vai para o slide de revisão), a
// coluna Orç do ano de cada conta passa a ser a soma dos modelos + contratos
// (no anual e no mês a mês); Real, Orç e Ritmo do ano anterior continuam os
// da METRAGEM. Conta que os modelos não trazem (ou trazem zerada) e as de
// valeMetragem ficam com a METRAGEM. O R$/m² é refeito com a área da
// METRAGEM (a área não muda porque o custo mudou).
// Antes de ligar, conferido nas fixtures de 08/10/2026: modelos + contratos
// fechavam com a METRAGEM em toda conta, menos a manutenção de Itajaí
// (+R$ 29.313) e Esteio (+R$ 15.268) e Representação e refeição (zerada nos
// modelos, fica a METRAGEM).

// Mesma conta com outro nome nos modelos (conferido pelos valores: Esteio
// R$ 146.046 e R$ 1.200 exatos).
const ORC_CONTAS_SINONIMOS = {
  'Manutenção de bens móveis': 'Manutenção de máquinas e equipamentos',
  'Quilometragem / Estacionamento': 'KM, estacionamento e pedágio'
};

// Conta dos modelos que SOMA numa conta da METRAGEM que os modelos não montam
// (a despesa de pessoal vem do RH, não do 070/090). Esteio (Guilherme,
// 12/10/2026): "CUSTO PARA ALOCAÇÃO DE CADEIRA DE ASSISTENTE DE FACILITIES",
// R$ 90 mil em "Assessoria de RH" — lançado para medir o efeito na despesa com
// pessoal; quem inclui de fato é o RH, quando aprovar ("pode considerar, mas
// ainda não está junto"). Quando a Despesa de pessoal da METRAGEM passar a
// trazer a assistente, apague a linha — senão conta em dobro.
const ORC_CONTAS_SOMAR = {
  'Assessoria de RH': { conta: 'Despesa de pessoal', nota: '(+ assistente de facilities)' }
};

// { [chave]: { nome, total, meses[12] } } — só contas com valor. As de
// ORC_CONTAS_SOMAR vêm em 'somar:<chave da conta da METRAGEM>', com somar: true.
function _orcOrcDosModelos_(cid, modelos) {
  const sin = {}, somar = {};
  Object.keys(ORC_CONTAS_SINONIMOS).forEach(k => { sin[_orcChaveConta_(k)] = _orcChaveConta_(ORC_CONTAS_SINONIMOS[k]); });
  Object.keys(ORC_CONTAS_SOMAR).forEach(k => { somar[_orcChaveConta_(k)] = ORC_CONTAS_SOMAR[k]; });
  const fixas = (cid.relatorios.valeMetragem || []).map(_orcChaveConta_);
  const out = {};
  modelos.forEach(l => {
    let k = _orcChaveConta_(l.conta);
    const soma = somar[k];
    k = soma ? 'somar:' + _orcChaveConta_(soma.conta) : (sin[k] || k);
    if (fixas.indexOf(k) >= 0) return;
    const s = out[k] || (out[k] = { nome: soma ? soma.conta : l.conta, total: 0, meses: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                    somar: !!soma, nota: soma ? soma.nota : '' });
    s.total += l.total;
    (l.meses || []).forEach((v, i) => { s.meses[i] += v || 0; });
  });
  Object.keys(out).forEach(k => { if (Math.abs(out[k].total) < 0.5) delete out[k]; });
  return out;
}

// Troca o Orç do ano no relatório anual e refaz totais e R$/m². O que mudou
// fica em rel.orcCalculado (vira pendência no slide de revisão).
function _orcAplicarOrcDosModelos_(rel, calc) {
  // Áreas antes de mexer no total: depois, total ÷ R$/m² já não dá a área.
  const areaAC = rel.m2AreaComum && rel.m2AreaComum.orc > 0 ? rel.areaComum.orc / rel.m2AreaComum.orc / 12 : null;
  const areaT = _orcAreaImplicita_(rel, 'orc');
  const usadas = {}, mudou = [];
  // s: a conta montada pelos modelos (troca o Orç); a: o que soma por cima (ORC_CONTAS_SOMAR).
  const aplicar = (nome, chave, v) => {
    const s = calc[chave], a = calc['somar:' + chave];
    if (!s && !a) return;
    if (s) usadas[chave] = true;
    if (a) usadas['somar:' + chave] = true;
    const novo = (s ? s.total : v.orc) + (a ? a.total : 0);
    if (Math.abs(novo - v.orc) > 1) mudou.push({ nome: nome, metragem: v.orc, calculado: novo, nota: a ? a.nota : '' });
    v.orc = novo;
  };
  rel.contas.forEach(c => aplicar(c.nome, c.chave, c.v));
  aplicar('IPTU', _orcChaveConta_('IPTU'), rel.iptu);
  aplicar('Seguro', _orcChaveConta_('Seguro'), rel.seguro);
  // Conta dos modelos sem linha na METRAGEM: não há onde pôr — fica fora do
  // total e vira pendência, nunca some calada.
  const semConta = Object.keys(calc).filter(k => !usadas[k]).map(k => calc[k]);
  rel.areaComum.orc = rel.contas.reduce((a, c) => a + c.v.orc, 0);
  rel.total.orc = rel.areaComum.orc + rel.iptu.orc + rel.seguro.orc;
  if (areaAC) rel.m2AreaComum.orc = rel.areaComum.orc / areaAC / 12;
  if (areaT) rel.m2Total.orc = rel.total.orc / areaT / 12;
  rel.orcCalculado = { mudou: mudou, semConta: semConta };
  mudou.forEach(m => Logger.log('Orç ' + rel.anos.orc + ' calculado — ' + m.nome + ': METRAGEM ' + _orcMoeda_(m.metragem) +
                                ' → modelos + contratos ' + _orcMoeda_(m.calculado)));
  semConta.forEach(s => Logger.log('Orç ' + rel.anos.orc + ' calculado — conta dos modelos sem linha na METRAGEM: ' +
                                   s.nome + ' ' + _orcMoeda_(s.total)));
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
      out.contas.push({ nome: _orcNomeContaExibido_(nome), chave: _orcChaveConta_(nome), grupo: _orcGrupoDaConta_(nome),
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
function obterRelatorioMensal_(chaveCidade, modelos) {
  const mensal = _orcLerMensal_(_orcLerPrimeiraAba_(_orcRelatorioId_(chaveCidade, 'mensalId', 'Despesas-Mensal')));
  const cid = ORC_CIDADES[chaveCidade];
  if (cid.relatorios.orcDosModelos) {
    // Mesmas contas que o anual troca: os 12 meses continuam somando o anual
    // (o que é de ORC_CONTAS_SOMAR soma por cima dos meses da conta).
    const calc = _orcOrcDosModelos_(cid, modelos || _orcLinhasModelosCidade_(chaveCidade));
    Object.keys(calc).forEach(k => {
      const e = calc[k], m = mensal.contas[e.somar ? k.slice('somar:'.length) : k];
      if (m) m.orc = e.somar ? m.orc.map((v, i) => v + e.meses[i]) : e.meses.slice();
    });
  }
  return mensal;
}

/**
 * Os doze meses do Orç do ano no relatório mensal têm que somar o Orç da
 * mesma conta na METRAGEM. Divergência vira aviso em rel.avisos (rodapé da
 * DRE e log) e entra em rel.revisar ({ nome, chave, mensal, metragem }), que
 * gera o slide "Revisar antes da versão final" e o selo ⚠ REVISAR nos slides
 * com a conta (19_Revisar.gs) — um mês digitado errado não passa calado.
 * Conta que o mensal não traz (despesa de pessoal) não é cobrada: o gráfico
 * avisa que ficou fora.
 * @param valeMetragem  nomes de conta em que a contabilidade já confirmou a
 *                      METRAGEM (relatorios.valeMetragem): divergência só no log
 */
function _orcConferirMensal_(rel, mensal, valeMetragem) {
  const confirmadas = (valeMetragem || []).map(_orcChaveConta_);
  const contas = rel.contas.concat([{ nome: 'IPTU', chave: _orcChaveConta_('IPTU'), v: rel.iptu },
                                    { nome: 'Seguro', chave: _orcChaveConta_('Seguro'), v: rel.seguro }]);
  contas.forEach(c => {
    const m = mensal.contas[c.chave];
    if (!m) return;
    const soma = m.orc.reduce((a, v) => a + v, 0);
    if (Math.abs(soma - c.v.orc) > 1) {
      const aviso = 'Mensal ≠ METRAGEM em ' + c.nome + ': ' + _orcMoeda_(soma) + ' × ' + _orcMoeda_(c.v.orc) +
                    ' (Orç ' + rel.anos.orc + ')';
      if (confirmadas.indexOf(c.chave) >= 0) {
        Logger.log('Mensal ≠ METRAGEM (vale a METRAGEM, confirmado pela contabilidade): ' + aviso);
        return;
      }
      rel.avisos.push(aviso);
      rel.revisar.push({ nome: c.nome, chave: c.chave, mensal: soma, metragem: c.v.orc });
      Logger.log('AVISO mensal: ' + aviso);
    }
  });
}

/**
 * Um número, uma fonte (Guilherme, 12/10/2026: "não aparecer na DRE um valor e
 * na estratificação outro"): com orcDosModelos, o mês a mês passa a somar o que
 * a DRE mostra, conta a conta e coluna a coluna. Sem isso o slide linha a linha
 * dizia Ritmo 2026 = R$ 542 mil no card e R$ 563 mil no gráfico (limpeza de
 * Curitiba: o Despesas-Mensal e a METRAGEM são exportados em dias diferentes).
 * O Ritmo mexe só na projeção (meses depois de ORC_RITMO_ULTIMO_MES_FECHADO):
 * o realizado fica como está. O Real do ano retrasado (planilha dos Megas) vai
 * ao total da METRAGEM do mesmo jeito. O que foi ajustado fica em
 * rel.mensalConciliado (uma linha no slide de revisão).
 */
function _orcConciliarMensal_(rel, mensal, realAnt) {
  const ajustes = [];
  const contas = rel.contas.concat([{ nome: 'IPTU', chave: _orcChaveConta_('IPTU'), v: rel.iptu },
                                    { nome: 'Seguro', chave: _orcChaveConta_('Seguro'), v: rel.seguro }]);
  if (mensal) contas.forEach(c => {
    const m = mensal.contas[c.chave];
    if (!m) return;
    [['orcAnt', 'orcAnt', 0], ['ritmo', 'real', ORC_RITMO_ULTIMO_MES_FECHADO], ['orc', 'orc', 0]].forEach(([k, campo, desde]) => {
      const d = _orcAjustarSerie_(m[campo], c.v[k], desde);
      if (d) ajustes.push({ nome: c.nome, k: k, dif: d });
    });
  });
  if (realAnt) {
    const d = _orcAjustarSerie_(realAnt.ac, rel.areaComum.real, 0);
    _orcAjustarSerie_(realAnt.total, rel.total.real, 0);
    if (d) ajustes.push({ nome: 'Real ' + rel.anos.real + ' mês a mês', k: 'real', dif: d });
  }
  ajustes.forEach(a => Logger.log('Mês a mês conciliado com a DRE — ' + a.nome + ' (' + _orcRotuloColuna_(a.k, rel.anos) +
                                  '): ' + (a.dif >= 0 ? '+' : '−') + _orcMoeda_(Math.abs(a.dif))));
  rel.mensalConciliado = ajustes;
}

// Leva a soma da série (12 meses, alterada no lugar) ao alvo; devolve a
// diferença (0 se já batia). Os meses antes de `desde` ficam; a diferença vai
// para os outros na proporção do que já têm (por igual se zerados). Se ali
// não couber sem mês negativo, vai para o ano todo.
function _orcAjustarSerie_(serie, alvo, desde) {
  const d = alvo - serie.reduce((t, v) => t + v, 0);
  if (Math.abs(d) <= 1) return 0;
  const tenta = (ini, semNegativo) => {
    const idx = [];
    for (let i = ini; i < 12; i++) idx.push(i);
    const base = idx.reduce((t, i) => t + serie[i], 0);
    const novo = serie.slice();
    idx.forEach(i => { novo[i] += base > 0.5 ? d * serie[i] / base : d / idx.length; });
    return !semNegativo || idx.every(i => novo[i] >= -0.005) ? novo : null;
  };
  const novo = (desde > 0 && desde < 12 ? tenta(desde, true) : null) || tenta(0, true) || tenta(0, false);
  novo.forEach((v, i) => { serie[i] = v; });
  return d;
}

const _ORC_MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ==========================================
// REAL DO ANO RETRASADO MÊS A MÊS (planilha dos Megas)
// ==========================================
/**
 * Despesa de cada mês do ano retrasado (Real 2025 no orçamento 2027), da aba
 * "Financeiro <ano>" da planilha da apresentação mensal dos Megas — a mesma
 * que a DRE dos Megas usa na coluna do ano anterior. O Despesas-Mensal não
 * traz esse ano. null sem a planilha configurada ou sem a aba: o slide de
 * custo por m² segue sem a linha do Real.
 * @return { ano, total: number[12], ac: number[12] } em R$ positivos;
 *         ac = área comum, sem IPTU e seguro
 */
function obterRealMensalAnoRetrasado_(chaveCidade) {
  const id = (ORC_CIDADES[chaveCidade].relatorios || {}).financeiroMegasId;
  if (!id) return null;
  const ano = ORC_ANO - 2;
  const aba = SpreadsheetApp.openById(id).getSheetByName('Financeiro ' + ano);
  if (!aba) {
    Logger.log('Planilha dos Megas sem a aba "Financeiro ' + ano + '": custo por m² sem o Real ' + ano + '.');
    return null;
  }
  return _orcLerFinanceiroMegas_(aba.getDataRange().getValues(), ano);
}

// Cabeçalho "Orç Jan/25 | Real Jan/25 | Variação R$" por mês; linhas por
// rubrica, IPTU e SEGURO, e "TOTAL ÁREA COMUM" — que nessa aba JÁ soma IPTU e
// seguro (o nome engana: em março/25 ele traz o IPTU do ano).
function _orcLerFinanceiroMegas_(dados, ano) {
  const cab = (dados[0] || []).map(_orcNorm_);
  const aa = String(ano).slice(-2);
  const col = _ORC_MES_ABREV.map(m => cab.indexOf('real ' + m + '/' + aa));
  if (col.some(c => c < 0)) {
    throw new Error('Financeiro ' + ano + ' (planilha dos Megas): cabeçalho inesperado, esperava "Real Jan/' + aa +
                    '" … "Real Dez/' + aa + '" na linha 1.');
  }
  const linha = re => dados.slice(1).filter(r => re.test(_orcNorm_(r[0])))[0];
  const tot = linha(/^total/), iptu = linha(/^iptu$/), seg = linha(/^seguros?$/);
  if (!tot) throw new Error('Financeiro ' + ano + ' (planilha dos Megas): linha TOTAL não encontrada.');
  const serie = r => col.map(c => r ? -_orcNum_(r[c]) : 0);
  const total = serie(tot), ip = serie(iptu), sg = serie(seg);
  return { ano: ano, total: total, ac: total.map((v, i) => v - ip[i] - sg[i]) };
}

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
    try { Array.prototype.push.apply(out, _orcLerModelo_(id, cid.unidadeModelo)); }
    catch (e) { Logger.log('Modelo ' + id + ' ignorado na análise por conta: ' + e.message); }
  });
  // Contratos recorrentes entram como linhas da sua conta: sem eles a
  // composição não fecha com a METRAGEM (sobraria "Não detalhado").
  // catContrato: a categoria do contrato (ORC_CONTRATOS_CATEGORIA) para a
  // tabela de contratos — o texto "CONTRATO — X" não traz tag.
  _orcContratosDoAno_(cid).forEach(g => g.contratos.forEach(k => out.push({
    linha: 0, conta: g.conta, contaNorm: _orcNorm_(g.conta), item: k.descricao, meses: k.meses, total: k.total,
    catContrato: k.semCategoria ? '' : k.categoria
  })));
  return out;
}
