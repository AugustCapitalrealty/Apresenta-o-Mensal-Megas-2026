/**
 * ARQUIVO: 02_Dados.gs
 * SEÇÃO:   NÚCLEO — Camada de dados
 * DESCRIÇÃO: Busca os dados na planilha da cidade ativa (setProjetoAtivo em 01_Config.gs/00_Main.gs).
 *            As abas são localizadas pelo NOME (cada cópia da planilha tem GIDs próprios).
 */

// ==========================================
// MÊS DE REFERÊNCIA DA APRESENTAÇÃO
// ==========================================
// Lê o mês do cabeçalho da aba DADOS (ex.: 'MAI') — o mesmo que alimenta o
// Dashboard — para que capa, subtítulos e rodapé falem do MESMO mês dos
// dados. Fallback: mês anterior ao calendário. Resultado em cache por cidade.
// ==========================================
const MESES_NOME_REF = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                        'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const MESES_3_REF    = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
let _mesRefCache = {};

function obterMesReferencia_() {
  const chave = getProjetoAtivo().nome;
  if (_mesRefCache[chave]) return _mesRefCache[chave];

  const hoje = new Date();
  let idx = -1;
  let ano = hoje.getFullYear();

  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('DADOS') || ss.getSheets()[0];
    const rawVal = sheet.getRange(1, 2).getValue();
    const rawDisplay = String(sheet.getRange(1, 2).getDisplayValue() || '').trim();

    // 1) Se a célula B1 for um objeto Date do Google Sheets:
    if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
      idx = rawVal.getMonth();
      ano = rawVal.getFullYear();
    } else {
      // 2) Parse de texto do cabeçalho da célula B1
      const cab = rawDisplay.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      // Procura por nome de mês por extenso ou 3 letras
      for (let m = 0; m < MESES_3_REF.length; m++) {
        const reg = new RegExp('\\b' + MESES_3_REF[m] + '|' + MESES_NOME_REF[m].normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '\\b', 'i');
        if (reg.test(cab) || cab.indexOf(MESES_3_REF[m]) >= 0) {
          idx = m;
          break;
        }
      }

      // Se não achou por nome, tenta formatos numéricos como "07/2026", "7/2026", "07/26", "2026-07"
      if (idx < 0) {
        const mNum = cab.match(/(?:^|\D)(0?[1-9]|1[0-2])[\/\-\.](20\d\d|\d\d)(?:\D|$)/);
        if (mNum) {
          idx = parseInt(mNum[1], 10) - 1;
          ano = mNum[2].length === 2 ? 2000 + parseInt(mNum[2], 10) : parseInt(mNum[2], 10);
        } else {
          const mIso = cab.match(/(20\d\d)[\/\-\.](0?[1-9]|1[0-2])/);
          if (mIso) {
            ano = parseInt(mIso[1], 10);
            idx = parseInt(mIso[2], 10) - 1;
          }
        }
      }

      // Procura ano explícito no texto se ainda não achou
      const mAno = cab.match(/\b(20\d\d)\b/);
      if (mAno) {
        ano = parseInt(mAno[1], 10);
      } else {
        const mAno2 = cab.match(/[\/\-](\d{2})\b/);
        if (mAno2 && parseInt(mAno2[1], 10) >= 20) {
          ano = 2000 + parseInt(mAno2[1], 10);
        }
      }
    }
  } catch (e) {
    Logger.log('Mês de referência: erro ao ler célula B1 da aba DADOS (' + e.message + ')');
  }

  // Fallback seguro se B1 não puder ser lida: usa o mês anterior ao calendário
  if (idx < 0) {
    const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    idx = ant.getMonth();
    ano = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
  }

  const nome = MESES_NOME_REF[idx];
  const ref = {
    index    : idx,
    nome     : nome,                                              // JULHO
    curto    : nome.charAt(0) + nome.slice(1).toLowerCase(),      // Julho
    sigla    : MESES_3_REF[idx],                                  // JUL
    mes      : String(idx + 1).padStart(2, '0'),                  // 07
    ano      : ano,                                               // 2026
    ord      : ano * 100 + (idx + 1),                             // 202607
    label    : nome + ' / ' + ano,                                // JULHO / 2026
    mesAno   : String(idx + 1).padStart(2, '0') + '/' + ano,      // 07/2026
    siglaAno : MESES_3_REF[idx] + '/' + String(ano).slice(-2),    // JUL/26
    rodape   : nome.charAt(0) + nome.slice(1, 3).toLowerCase() + '/' + ano // Jul/2026
  };

  _mesRefCache[chave] = ref;
  return ref;
}


// ==========================================
// ÁREA (m²) — aba METRO QUADRADO
// ==========================================
// Permite expressar qualquer valor financeiro em R$/m² (a diretoria gosta).
//
// 1º) LIDA direto da linha "TOTAL ÁREA COM IPTU E SEGURO" da aba METRO
//     QUADRADO (ver obterDadosCustoM2). É o caminho certo: a área é um dado
//     próprio, não um resultado de conta.
// 2º) Fallback (planilha antiga, sem essa linha legível): área = Total
//     Realizado ÷ Custo R$/m² do mês, como era antes. Nesse caso usamos o
//     total da ABA FINANCEIRO (`planilha`) e não o da BRIDGE, para que o
//     número continue idêntico ao que o deck vinha mostrando.
//
// Retorna null se as duas rotas falharem → os slides simplesmente omitem o
// R$/m² sem quebrar. Resultado em cache por cidade.
// ==========================================
let _areaM2Cache = {};

function obterAreaM2_() {
  const chave = getProjetoAtivo().nome;
  if (chave in _areaM2Cache) return _areaM2Cache[chave];

  let area = null;
  try {
    const custo = obterDadosCustoM2();

    if (custo && custo.area > 0) {
      area = custo.area;
      Logger.log('Área m²: ' + Math.round(area).toLocaleString('pt-BR') + ' m² (lida da aba METRO QUADRADO).');
    } else if (custo && custo.kpis && custo.kpis.custo > 0) {
      const fin   = obterDadosFinanceiroMensal_();
      const total = fin && fin.planilha && fin.planilha.totalRealizado > 0
        ? fin.planilha.totalRealizado
        : (fin && fin.totalRealizado > 0 ? fin.totalRealizado : 0);
      if (total > 0) {
        area = total / custo.kpis.custo;
        Logger.log('Área m² derivada (fallback): ' + Math.round(area).toLocaleString('pt-BR') +
                   ' m² (Real ' + total + ' ÷ Custo ' + custo.kpis.custo + ')');
      }
    }
  } catch (e) {
    Logger.log('Área m²: não foi possível obter. ' + e.message);
  }
  _areaM2Cache[chave] = area;
  return area;
}


// ==========================================
// LEITOR DO HISTÓRICO VALIDADO
// ==========================================
// Lê a planilha HISTORICO_VALIDADO_ID (mantida à mão pelo time), no formato:
//   Mês (MM/AAAA) | Empreendimento | INDICADOR | DADO
// distribuído em uma ou mais abas (DADOS, PREVENTIVAS, CHAMADOS...).
//
//   lerHistoricoValidado('Fluxo de VISITANTES')            → série da cidade ativa
//   lerHistoricoValidado('SLA MENSAL', { aba: 'PREVENTIVAS' })
//   lerHistoricoValidado('Disponibilidade', { empreendimento: 'Mega Itajaí' })
//
// Retorna a série ORDENADA por mês: [{ mes:'04/2026', ord:202604, valor:31572, bruto:'31.572' }]
// Só entram linhas com valor numérico. Vazio se a planilha/indicador não existir.
// ==========================================
function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function _histEmpChave_(s) {
  const norm = String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  if (!norm) return '';
  if (norm.includes('CURITIBA') || /\bCTBA\b/.test(norm) || /\bCWB\b/.test(norm)) return 'MEGA CURITIBA';
  if (norm.includes('ITAJAI') || /\bITJ\b/.test(norm) || norm.includes('ITAJA')) return 'MEGA ITAJAI';
  if (norm.includes('ESTEIO') || /\bEST\b/.test(norm)) return 'MEGA ESTEIO';
  return norm;
}

function _histParseMes_(txt) {
  if (!txt) return null;
  if (txt instanceof Date && !isNaN(txt.getTime())) {
    const m = txt.getMonth() + 1, a = txt.getFullYear();
    return { label: String(m).padStart(2, '0') + '/' + a, ord: a * 100 + m };
  }
  const s = String(txt).trim();
  // Formato "07/2026", "7/2026", "07-2026"
  let m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const mes = parseInt(m[1], 10), ano = parseInt(m[2], 10);
    if (mes >= 1 && mes <= 12) return { label: String(mes).padStart(2, '0') + '/' + ano, ord: ano * 100 + mes };
  }
  // Formato "07/26", "7/26"
  m = s.match(/^(\d{1,2})[\/\-](\d{2})$/);
  if (m) {
    const mes = parseInt(m[1], 10), ano = 2000 + parseInt(m[2], 10);
    if (mes >= 1 && mes <= 12) return { label: String(mes).padStart(2, '0') + '/' + ano, ord: ano * 100 + mes };
  }
  // Formato "JUL/26", "JUL/2026", "JULHO/2026"
  const sNorm = s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (let i = 0; i < MESES_3_REF.length; i++) {
    if (sNorm.indexOf(MESES_3_REF[i]) >= 0) {
      const mes = i + 1;
      const mAno = sNorm.match(/\b(20\d\d)\b/) || sNorm.match(/[\/\-](\d{2})\b/);
      let ano = new Date().getFullYear();
      if (mAno) {
        ano = mAno[1].length === 2 ? 2000 + parseInt(mAno[1], 10) : parseInt(mAno[1], 10);
      }
      return { label: String(mes).padStart(2, '0') + '/' + ano, ord: ano * 100 + mes };
    }
  }
  return null;
}

// Converte "66.408" → 66408, "27,91" → 27.91, "100" → 100, "5m45s" → NaN
function _histNum_(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (/[a-z]/i.test(s)) return NaN;                      // tempo (5m45s) etc. → não numérico
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\./g, '');
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

let _histPlanilhaCache_ = {};

function _obterDadosAbaHistorico_(abaNome) {
  if (_histPlanilhaCache_[abaNome]) return _histPlanilhaCache_[abaNome];
  try {
    const ss = SpreadsheetApp.openById(HISTORICO_VALIDADO_ID);
    if (abaNome === '__all__') {
      const abas = ss.getSheets();
      const res = [];
      abas.forEach(s => {
        if (s) {
          const nome = s.getName();
          const d = s.getDataRange().getDisplayValues();
          _histPlanilhaCache_[nome] = d;
          res.push(d);
        }
      });
      _histPlanilhaCache_['__all__'] = res;
      return res;
    } else {
      const sheet = ss.getSheetByName(abaNome);
      const d = sheet ? sheet.getDataRange().getDisplayValues() : [];
      _histPlanilhaCache_[abaNome] = d;
      return d;
    }
  } catch (e) {
    Logger.log('_obterDadosAbaHistorico_("' + abaNome + '"): ' + e.message);
    return abaNome === '__all__' ? [] : [];
  }
}

function lerHistoricoValidado(indicador, opts) {
  opts = opts || {};
  const alvoEmp = _histEmpChave_(opts.empreendimento || getProjetoAtivo().nome);
  const alvoInd = _histNorm_(indicador);
  const saida   = [];

  try {
    const abasData = opts.aba ? [_obterDadosAbaHistorico_(opts.aba)] : _obterDadosAbaHistorico_('__all__');

    abasData.forEach(data => {
      if (!data || data.length < 2) return;

      const hdr  = data[0].map(_histNorm_);
      const cMes = hdr.findIndex(h => h.indexOf('mes') === 0 || h === 'mes/ano');
      const cEmp = hdr.findIndex(h => h.indexOf('empreend') >= 0);
      const cInd = hdr.findIndex(h => h.indexOf('indicador') >= 0);
      const cVal = hdr.findIndex(h => h.indexOf('dado') >= 0 || h.indexOf('valor') >= 0);
      if (cMes < 0 || cInd < 0 || cVal < 0) return;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (cEmp >= 0 && _histEmpChave_(row[cEmp]) !== alvoEmp) continue;
        if (_histNorm_(row[cInd]) !== alvoInd) continue;
        const mes = _histParseMes_(row[cMes]);
        const val = _histNum_(row[cVal]);
        if (!mes || isNaN(val)) continue;
        saida.push({ mes: mes.label, ord: mes.ord, valor: val, bruto: String(row[cVal]).trim() });
      }
    });
  } catch (e) {
    Logger.log('lerHistoricoValidado("' + indicador + '"): ' + e.message);
  }

  // ordena por mês e remove meses duplicados (mantém a última ocorrência)
  saida.sort((a, b) => a.ord - b.ord);
  const vistos = {};
  const unico  = [];
  saida.forEach(p => { vistos[p.ord] = p; });
  Object.keys(vistos).sort((a, b) => a - b).forEach(k => unico.push(vistos[k]));
  return unico;
}


// Número tolerante: "11h"→11, "95%"→95, "97,47"→97.47, "66.408"→66408.
function _numLenient_(v) {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if (!s) return NaN;
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\.(?=\d{3}\b)/g, '');
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

// Variação do valor ATUAL (do slide) vs o mês anterior no HISTÓRICO VALIDADO.
// O histórico guarda os meses fechados (ex.: 05/2026); o mês atual (06/2026)
// vem do próprio slide. Compara com o maior mês do histórico ANTES do mês de
// referência. Retorna { atual, anterior, delta } ou null.
//   deltaVsMesAnterior_('95%', 'SLA MENSAL', 'PREVENTIVAS')
//   deltaVsMesAnterior_('17',  'Chamados criados', 'CHAMADOS')
function deltaVsMesAnterior_(atual, indicador, aba) {
  const atualN = _numLenient_(atual);
  if (isNaN(atualN)) return null;
  const serie = lerHistoricoValidado(indicador, aba ? { aba } : {});
  if (!serie.length) return null;

  let ordRef = Infinity;
  try { const r = obterMesReferencia_(); ordRef = r.ano * 100 + (r.index + 1); } catch (e) {}

  // Mês anterior = maior mês do histórico ESTRITAMENTE antes do mês de referência
  let prev = null;
  serie.forEach(p => { if (p.ord < ordRef && (!prev || p.ord > prev.ord)) prev = p; });
  // Fallback: nada antes da referência → usa o mais recente que não seja o próprio mês
  if (!prev) {
    const outros = serie.filter(p => p.ord !== ordRef);
    if (outros.length) prev = outros[outros.length - 1];
  }
  if (!prev) return null;

  return { atual: atualN, anterior: prev.valor, delta: Math.round((atualN - prev.valor) * 100) / 100 };
}


// ==========================================
// SÉRIE DE FLUXO DE ACESSOS (planilha dedicada de Controle de Acessos)
// ==========================================
// Lê a aba "Dados" da planilha ACESSOS_SPREADSHEET_ID (formato largo:
// Mês | Empreendimento | Fluxo Total | ...) e devolve o fluxo mensal da
// cidade ativa nos últimos `maxMeses` meses, no mesmo formato do histórico:
//   [{ mes:'05/2026', ord:202605, valor:66408 }]
// A linha de cabeçalho é localizada por conteúdo (a linha 1 costuma ser
// instrução mesclada). Vazio se a planilha/aba não existir.
// ==========================================
function obterSerieFluxoAcessos_(maxMeses) {
  maxMeses = maxMeses || 13;
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  const saida   = [];

  try {
    const ss    = SpreadsheetApp.openById(ACESSOS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Dados');
    if (!sheet) { Logger.log('Fluxo acessos: aba "Dados" não encontrada.'); return []; }

    const data = sheet.getDataRange().getDisplayValues();
    let hRow = -1, cMes = -1, cEmp = -1, cFlx = -1;
    for (let i = 0; i < Math.min(6, data.length); i++) {
      const norm = data[i].map(_histNorm_);
      const iEmp = norm.findIndex(h => h.indexOf('empreend') >= 0);
      const iFlx = norm.findIndex(h => h.indexOf('fluxo') >= 0 && h.indexOf('total') >= 0);
      if (iEmp >= 0 && iFlx >= 0) {
        hRow = i; cEmp = iEmp; cFlx = iFlx;
        cMes = norm.findIndex(h => h.indexOf('mes') === 0 || h === 'mes/ano');
        break;
      }
    }
    if (hRow < 0 || cMes < 0) { Logger.log('Fluxo acessos: cabeçalho não localizado.'); return []; }

    for (let i = hRow + 1; i < data.length; i++) {
      const row = data[i];
      if (_histEmpChave_(row[cEmp]) !== alvoEmp) continue;
      const mes = _histParseMes_(row[cMes]);
      const val = _histNum_(row[cFlx]);
      if (!mes || isNaN(val)) continue;
      saida.push({ mes: mes.label, ord: mes.ord, valor: val });
    }
  } catch (e) {
    Logger.log('obterSerieFluxoAcessos_: ' + e.message);
  }

  saida.sort((a, b) => a.ord - b.ord);
  const vistos = {};
  saida.forEach(p => { vistos[p.ord] = p; });
  const uniq = Object.keys(vistos).sort((a, b) => a - b).map(k => vistos[k]);
  return uniq.slice(-maxMeses);
}

// "05:45" → "5m45s"; segundos (345) → "5m45s"; vazio → ''.
function _fmtTempoAcesso_(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  const mm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (mm) return parseInt(mm[1], 10) + 'm' + mm[2] + 's';
  if (/^\d+([.,]\d+)?$/.test(s)) {
    const seg = Math.round(Number(s.replace(',', '.')));
    return Math.floor(seg / 60) + 'm' + String(seg % 60).padStart(2, '0') + 's';
  }
  return s;
}

// KPIs de acesso (Fluxo e Tempo médio, mensal e acumulado) do mês mais recente
// da cidade ativa, lidos da planilha dedicada de Controle de Acessos.
// Retorna null se indisponível. Colunas: Fluxo Total | Tempo Médio (MM:SS) |
// Fluxo Acum. (ano) | Tempo Acum. (ano).
function obterKpisAcessos_() {
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  try {
    const ss    = SpreadsheetApp.openById(ACESSOS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Dados');
    if (!sheet) return null;

    const data = sheet.getDataRange().getDisplayValues();
    let hRow = -1, c = {};
    for (let i = 0; i < Math.min(6, data.length); i++) {
      const norm = data[i].map(_histNorm_);
      const iEmp = norm.findIndex(h => h.indexOf('empreend') >= 0);
      const iFlx = norm.findIndex(h => h.indexOf('fluxo') >= 0 && h.indexOf('total') >= 0);
      if (iEmp >= 0 && iFlx >= 0) {
        hRow = i; c.emp = iEmp; c.fluxo = iFlx;
        c.mes    = norm.findIndex(h => h.indexOf('mes') === 0 || h === 'mes/ano');
        c.tempo  = norm.findIndex(h => h.indexOf('tempo medio') >= 0);
        c.fluxoA = norm.findIndex(h => h.indexOf('fluxo acum') >= 0);
        c.tempoA = norm.findIndex(h => h.indexOf('tempo acum') >= 0);
        break;
      }
    }
    if (hRow < 0 || c.mes < 0) return null;

    let melhor = null, melhorOrd = -1;
    for (let i = hRow + 1; i < data.length; i++) {
      const row = data[i];
      if (_histEmpChave_(row[c.emp]) !== alvoEmp) continue;
      const mes = _histParseMes_(row[c.mes]);
      if (mes && mes.ord > melhorOrd) { melhorOrd = mes.ord; melhor = row; }
    }
    if (!melhor) return null;

    const fluxoM = c.fluxo  >= 0 ? _histNum_(melhor[c.fluxo])  : NaN;
    const fluxoA = c.fluxoA >= 0 ? _histNum_(melhor[c.fluxoA]) : NaN;
    return {
      mensal: {
        fluxo: isNaN(fluxoM) ? '' : formatarNumeroBR(Math.round(fluxoM)),
        tempo: c.tempo  >= 0 ? _fmtTempoAcesso_(melhor[c.tempo])  : ''
      },
      anual: {
        fluxo: isNaN(fluxoA) ? '' : formatarNumeroBR(Math.round(fluxoA)),
        tempo: c.tempoA >= 0 ? _fmtTempoAcesso_(melhor[c.tempoA]) : ''
      }
    };
  } catch (e) {
    Logger.log('obterKpisAcessos_: ' + e.message);
    return null;
  }
}

// KPIs de acesso pro painel "CONTROLE DE ACESSO" do Dashboard (Slide 01):
// mês atual, mês anterior e mesmo mês do ano anterior — direto da planilha
// dedicada de Controle de Acessos (fonte autoritativa), em vez da aba DADOS
// da própria cidade, que raramente tem "Fluxo de VISITANTES"/"Tempo médio"
// preenchidos (essas duas linhas nunca foram o fluxo de trabalho mensal ali).
// Retorna { 'Fluxo de VISITANTES': {atual,mesAnt,anoAnt}, 'Tempo médio': {...} },
// com '-' em qualquer célula sem mês correspondente na planilha.
function obterAcessosDashboard_() {
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  try {
    const ss    = SpreadsheetApp.openById(ACESSOS_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Dados');
    if (!sheet) return null;

    const data = sheet.getDataRange().getDisplayValues();
    let hRow = -1, c = {};
    for (let i = 0; i < Math.min(6, data.length); i++) {
      const norm = data[i].map(_histNorm_);
      const iEmp = norm.findIndex(h => h.indexOf('empreend') >= 0);
      const iFlx = norm.findIndex(h => h.indexOf('fluxo') >= 0 && h.indexOf('total') >= 0);
      if (iEmp >= 0 && iFlx >= 0) {
        hRow = i; c.emp = iEmp; c.fluxo = iFlx;
        c.mes   = norm.findIndex(h => h.indexOf('mes') === 0 || h === 'mes/ano');
        c.tempo = norm.findIndex(h => h.indexOf('tempo medio') >= 0);
        break;
      }
    }
    if (hRow < 0 || c.mes < 0) return null;

    // Indexa por ord do mês (ano*100+mes), só as linhas da cidade ativa.
    const porOrd = {};
    for (let i = hRow + 1; i < data.length; i++) {
      const row = data[i];
      if (_histEmpChave_(row[c.emp]) !== alvoEmp) continue;
      const mes = _histParseMes_(row[c.mes]);
      if (mes) porOrd[mes.ord] = row;
    }
    const ords = Object.keys(porOrd).map(Number).sort((a, b) => a - b);
    if (!ords.length) return null;

    const ordAtual = ords[ords.length - 1];
    // Mês anterior = penúltimo mês PRESENTE na planilha (não ordAtual-1, que
    // quebraria em janeiro e em meses com lacuna) — mesmo critério já usado
    // em obterSerieFluxoAcessos_/Slide04.
    const rowAtual  = porOrd[ordAtual];
    const rowMesAnt = ords.length >= 2 ? porOrd[ords[ords.length - 2]] : null;
    // Mesmo mês do ano anterior: subtrair 100 no ord (ano*100+mes) sempre
    // preserva o mês e decrementa o ano em 1, sem casos especiais.
    const rowAnoAnt = porOrd[ordAtual - 100] || null;

    const fluxoStr = row => {
      if (!row) return '-';
      const v = _histNum_(row[c.fluxo]);
      return isNaN(v) ? '-' : String(Math.round(v));
    };
    const tempoStr = row => {
      if (!row || c.tempo < 0) return '-';
      const t = _fmtTempoAcesso_(row[c.tempo]);
      return t || '-';
    };

    return {
      'Fluxo de VISITANTES': {
        atual:  fluxoStr(rowAtual),
        mesAnt: fluxoStr(rowMesAnt),
        anoAnt: fluxoStr(rowAnoAnt)
      },
      'Tempo médio': {
        atual:  tempoStr(rowAtual),
        mesAnt: tempoStr(rowMesAnt),
        anoAnt: tempoStr(rowAnoAnt)
      }
    };
  } catch (e) {
    Logger.log('obterAcessosDashboard_: ' + e.message);
    return null;
  }
}


// ==========================================
// CHAMADOS PENDENTES (BACKLOG) POR ESTADO
// ==========================================
// Lê a aba 'CHAMADOS PENDENTES (BACKLOG)' da planilha da cidade:
//   MÊS (MM/AAAA) | ESTADO | QUANTIDADE
// Usa o mês de referência (ou o mais recente disponível na aba).
//
// CONCILIAÇÃO: o Total Geral oficial é o 'Chamados geral' da aba DADOS
// (o mesmo número do Dashboard). Como os direcionados podem estar
// defasados no tempo, 'Em resolução' = Total oficial − soma dos
// direcionados — assim o total SEMPRE bate com a aba DADOS.
// ==========================================
function obterDadosBacklogPendentes_() {
  try {
    const ref = obterMesReferencia_();
    const ordRef = ref.ord || (ref.ano * 100 + (ref.index + 1));
    const anoRef = Math.floor(ordRef / 100);
    const mesIdxRef = (ordRef % 100) - 1;

    // ── 1. TENTA CALCULAR DIRETO DA BD-CORRETIVAS ────────────────────────────
    // Regra oficial Capital Realty: =SE(Estado="Pausado"; Motivo_de_pausa; Estado)
    try {
      const itens = _lerBdCorretivasCru_();
      if (itens && itens.length) {
        // Datas do mês atual de referência (1º dia do mês até 1º dia do mês seguinte)
        const refIni = new Date(Date.UTC(anoRef, mesIdxRef, 1));
        const refFim = new Date(Date.UTC(anoRef, mesIdxRef + 1, 1));

        // Datas do mês anterior
        const refIniAnt = new Date(Date.UTC(mesIdxRef === 0 ? anoRef - 1 : anoRef, mesIdxRef === 0 ? 11 : mesIdxRef - 1, 1));
        const refFimAnt = refIni;

        const countsAtual = {};
        let emResolucaoAtual = 0;
        let totalAtual = 0;

        itens.forEach(it => {
          if (!_histAbertoNoMes_(it.estadoSistema, it.dtReporte, it.dtFechado, refIni, refFim)) return;
          totalAtual++;
          const est = it.estado || 'Em resolução';
          const estNorm = _histNorm_(est);
          if (estNorm.includes('em resolucao') || estNorm.includes('resolv') || estNorm === 'novo' || estNorm === 'atribuido') {
            emResolucaoAtual++;
          } else {
            countsAtual[est] = (countsAtual[est] || 0) + 1;
          }
        });

        if (totalAtual > 0) {
          const countsAnt = {};
          let totalAnt = 0;
          let emResolucaoAnt = 0;

          itens.forEach(it => {
            if (!_histAbertoNoMes_(it.estadoSistema, it.dtReporte, it.dtFechado, refIniAnt, refFimAnt)) return;
            totalAnt++;
            const est = it.estado || 'Em resolução';
            const estNorm = _histNorm_(est);
            if (estNorm.includes('em resolucao') || estNorm.includes('resolv') || estNorm === 'novo' || estNorm === 'atribuido') {
              emResolucaoAnt++;
            } else {
              const k = _histNorm_(est);
              countsAnt[k] = (countsAnt[k] || 0) + 1;
            }
          });

          // Monta lista de direcionados ordenada de forma crescente por quantidade
          const direcionados = [];
          Object.keys(countsAtual).forEach(est => {
            const qtd = countsAtual[est];
            const k = _histNorm_(est);
            const ant = countsAnt[k] !== undefined ? countsAnt[k] : null;
            direcionados.push({ estado: est, qtd, anterior: ant });
          });

          direcionados.sort((a, b) => a.qtd - b.qtd);

          Logger.log('Backlog pendentes: calculado diretamente da BD-CORRETIVAS para ' + ref.mesAno +
                     ' (Total=' + totalAtual + ', Em resolução=' + emResolucaoAtual + ', ' +
                     direcionados.length + ' estados direcionados).');

          return {
            mesLabel: ref.mesAno,
            direcionados: direcionados,
            emResolucao: emResolucaoAtual,
            total: totalAtual,
            totalAnterior: totalAnt > 0 ? totalAnt : null,
            emResolucaoAnterior: emResolucaoAnt,
            somaAba: totalAtual,
            emResolucaoAba: emResolucaoAtual
          };
        }
      }
    } catch (errBd) {
      Logger.log('Backlog pendentes: tentativa via BD-CORRETIVAS (' + errBd.message + ') — tentando aba manual.');
    }

    // ── 2. FALLBACK: ABA MANUAL 'CHAMADOS PENDENTES (BACKLOG)' ───────────────
    const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    let sheet = ss.getSheetByName('CHAMADOS PENDENTES (BACKLOG)');
    if (!sheet) {
      sheet = ss.getSheets().find(s => {
        const n = _histNorm_(s.getName());
        return n.includes('backlog') || n.includes('pendentes');
      });
    }
    if (!sheet) { Logger.log('Backlog pendentes: aba não encontrada.'); return null; }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return null;

    const hdr  = data[0].map(_histNorm_);
    const cMes = hdr.findIndex(h => h.indexOf('mes') === 0);
    const cEst = hdr.findIndex(h => h.includes('estado'));
    const cQtd = hdr.findIndex(h => h.includes('quantidade') || h.includes('qtd'));
    if (cMes < 0 || cEst < 0 || cQtd < 0) {
      Logger.log('Backlog pendentes: cabeçalho MÊS/ESTADO/QUANTIDADE não encontrado.');
      return null;
    }

    // Agrupa linhas por mês (preservando a ordem da planilha dentro do mês)
    const porMes = {};
    for (let i = 1; i < data.length; i++) {
      const mes    = _histParseMes_(data[i][cMes]);
      const estado = String(data[i][cEst] || '').trim();
      const qtd    = _histNum_(data[i][cQtd]);
      if (!mes || !estado || isNaN(qtd)) continue;
      if (!porMes[mes.ord]) porMes[mes.ord] = { label: mes.label, itens: [] };
      porMes[mes.ord].itens.push({ estado, qtd });
    }
    const ords = Object.keys(porMes).map(Number).sort((a, b) => a - b);
    if (!ords.length) return null;

    let alvoOrd = null;
    if (porMes[ordRef]) alvoOrd = ordRef;
    if (alvoOrd == null) alvoOrd = ords[ords.length - 1];
    const alvo = porMes[alvoOrd];

    // Mês anterior na PRÓPRIA aba: total, valor por estado e Em resolução
    const idxAlvo  = ords.indexOf(alvoOrd);
    const prevOrd  = idxAlvo > 0 ? ords[idxAlvo - 1] : null;
    const totalAnteriorAba = prevOrd != null
      ? porMes[prevOrd].itens.reduce((s, it) => s + it.qtd, 0) : null;

    const prevMap = {};
    let prevEmResRaw = 0, prevSomaDir = 0;
    if (prevOrd != null) {
      porMes[prevOrd].itens.forEach(it => {
        const k = _histNorm_(it.estado);
        if (k.includes('em resolucao')) prevEmResRaw += it.qtd;
        else { prevMap[k] = (prevMap[k] || 0) + it.qtd; prevSomaDir += it.qtd; }
      });
    }

    const direcionados = [];
    let emResolucaoAba = 0;
    alvo.itens.forEach(it => {
      if (_histNorm_(it.estado).includes('em resolucao')) emResolucaoAba += it.qtd;
      else direcionados.push({ estado: it.estado, qtd: it.qtd, anterior: prevMap[_histNorm_(it.estado)] });
    });
    const somaDir = direcionados.reduce((s, it) => s + it.qtd, 0);

    let totalOficial = null, totalAnterior = null;
    try {
      const serie = obterDadosBacklogHistorico_();
      if (serie && serie.length) {
        const iAlvo = serie.findIndex(p => p.ord === alvoOrd);
        if (iAlvo >= 0 && serie[iAlvo].geral != null) {
          totalOficial = serie[iAlvo].geral;
          if (iAlvo > 0 && serie[iAlvo - 1].geral != null) totalAnterior = serie[iAlvo - 1].geral;
        }
      }
    } catch (e) {
      Logger.log('Backlog pendentes: aba BACKLOG indisponível — ' + e.message);
    }

    if (totalAnterior == null) totalAnterior = totalAnteriorAba;
    const somaAba = somaDir + emResolucaoAba;

    let emResolucao, total;
    if (totalOficial !== null && totalOficial >= somaDir) {
      emResolucao = totalOficial - somaDir;
      total       = totalOficial;
    } else {
      emResolucao = emResolucaoAba;
      total       = somaAba;
    }

    const emResolucaoAnterior = prevOrd == null ? null
      : (totalAnterior != null ? Math.max(totalAnterior - prevSomaDir, 0) : prevEmResRaw);

    return { mesLabel: alvo.label, direcionados, emResolucao, total, totalAnterior, emResolucaoAnterior,
             somaAba: somaAba, emResolucaoAba: emResolucaoAba };
  } catch (e) {
    Logger.log('obterDadosBacklogPendentes_: ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS DASHBOARD (Slide 01)
// ==========================================
function obterDadosDashboard() {
  const SHEET_NAME = 'DADOS';
  let dataMap = new Map();
  const ref = obterMesReferencia_();
  const mesAtualNome = MESES_3_REF[ref.index];
  const mesAntNome   = MESES_3_REF[(ref.index + 11) % 12];
  const anoAntNome   = mesAtualNome + "'" + String((ref.ano - 1) % 100).padStart(2, '0');
  let headers = [mesAtualNome, mesAntNome, anoAntNome];
  const sobrescritos = [];

  // 1. Leitura base da aba DADOS da planilha da cidade (como fallback/base)
  try {
    const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        let row = data[i];
        if (row[0]) {
          let key = String(row[0]).trim();
          dataMap.set(key, {
            atual  : row[1] !== '' && row[1] != null ? String(row[1]) : '-',
            mesAnt : row[2] !== '' && row[2] != null ? String(row[2]) : '-',
            anoAnt : row[3] !== '' && row[3] != null ? String(row[3]) : '-'
          });
        }
      }
    }
  } catch (e) {
    Logger.log('Erro Dashboard (aba DADOS): ' + e.message);
  }

  // 2. DISPONIBILIDADE: busca na aba CHAMADOS do Histórico Validado (mesma fonte de Metas)
  try {
    const sDisp = lerHistoricoValidado('Índice de disponibilidade', { aba: 'CHAMADOS' });
    if (sDisp && sDisp.length) {
      const ordAtual  = ref.ano * 100 + (ref.index + 1);
      const ordAnt    = (ref.index === 0 ? (ref.ano - 1) * 100 + 12 : ref.ano * 100 + ref.index);
      const ordAnoAnt = (ref.ano - 1) * 100 + (ref.index + 1);

      const itAtual  = sDisp.find(s => s.ord === ordAtual) || sDisp[sDisp.length - 1];
      const itAnt    = sDisp.find(s => s.ord === ordAnt) || (sDisp.length > 1 ? sDisp[sDisp.length - 2] : null);
      const itAnoAnt = sDisp.find(s => s.ord === ordAnoAnt);

      const fmt = it => it ? (it.bruto ? (String(it.bruto).includes('%') ? String(it.bruto) : String(it.bruto) + '%') : (formatarNumeroBR(it.valor) + '%')) : '-';
      dataMap.set('Disponibilidade', {
        atual:  fmt(itAtual),
        mesAnt: fmt(itAnt),
        anoAnt: fmt(itAnoAnt)
      });
      Logger.log('Dashboard (disponibilidade): ' + fmt(itAtual) + ' | ' + fmt(itAnt) + ' | ' + fmt(itAnoAnt));
    }
  } catch (e) {
    Logger.log('Erro Dashboard (disponibilidade): ' + e.message);
  }

  // 3. CHAMADOS FACILITIES / GERAL: contagem unificada da BD-CORRETIVAS / Backlog
  try {
    const serie = obterDadosBacklogHistorico_();
    if (serie && serie.length) {
      const ordAtual  = ref.ano * 100 + (ref.index + 1);
      const ordAnt    = (ref.index === 0 ? (ref.ano - 1) * 100 + 12 : ref.ano * 100 + ref.index);
      const ordAnoAnt = (ref.ano - 1) * 100 + (ref.index + 1);

      const idxAtual  = serie.findIndex(p => p.ord === ordAtual);
      const mesRef    = idxAtual >= 0 ? serie[idxAtual] : serie[serie.length - 1];
      const mesAnt    = idxAtual > 0 ? serie[idxAtual - 1] : (serie.find(p => p.ord === ordAnt) || null);
      const mesAnoAnt = serie.find(p => p.ord === ordAnoAnt);

      const getVal = (m, campo) => (m && m[campo] != null) ? String(m[campo]) : '-';

      dataMap.set('Chamados geral', {
        atual:  getVal(mesRef, 'geral'),
        mesAnt: getVal(mesAnt, 'geral'),
        anoAnt: getVal(mesAnoAnt, 'geral')
      });

      dataMap.set('Chamados de facilities', {
        atual:  getVal(mesRef, 'facilities'),
        mesAnt: getVal(mesAnt, 'facilities'),
        anoAnt: getVal(mesAnoAnt, 'facilities')
      });
    }
  } catch (e) {
    Logger.log('Erro Dashboard (backlog histórico): ' + e.message);
  }

  // 4. PERCENTUAL DE CONCLUSÃO HISTÓRICO: calculado da base bruta BD-CORRETIVAS
  try {
    const rawCorr = _lerBdCorretivasCru_();
    if (rawCorr && rawCorr.length) {
      const calcConc = (ano, mes1_12) => {
        const dtLimite = new Date(Date.UTC(ano, mes1_12, 1)); // limite exclusivo
        let criados = 0, fechados = 0;
        rawCorr.forEach(r => {
          if (r.dtReporte && r.dtReporte < dtLimite) {
            criados++;
            if (r.dtFechado && r.dtFechado < dtLimite) {
              fechados++;
            }
          }
        });
        return criados > 0 ? (fechados / criados * 100).toFixed(1).replace('.', ',') + '%' : '-';
      };

      const mesAntIdx = (ref.index === 0 ? 11 : ref.index - 1);
      const mesAntAno = (ref.index === 0 ? ref.ano - 1 : ref.ano);

      dataMap.set('Percentual de conclusão histórico', {
        atual:  calcConc(ref.ano, ref.index + 1),
        mesAnt: calcConc(mesAntAno, mesAntIdx + 1),
        anoAnt: calcConc(ref.ano - 1, ref.index + 1)
      });
    }
  } catch (e) {
    Logger.log('Erro Dashboard (conclusao historico): ' + e.message);
  }

  // 5. MANUTENÇÃO PREVENTIVA (Em dia % e SLA %): calculado direto da BD-PREVENTIVAS
  try {
    const rawPrev = _lerBdPreventivasCru_();
    if (rawPrev && rawPrev.length) {
      const calcPrev = (ano, mes0_11) => {
        const dtIni = new Date(Date.UTC(ano, mes0_11, 1));
        const dtFim = new Date(Date.UTC(ano, mes0_11 + 1, 1));
        let prev = 0, real = 0, cump = 0, naoCump = 0;
        rawPrev.forEach(it => {
          if (it.dtAgendado && it.dtAgendado >= dtIni && it.dtAgendado < dtFim) {
            prev++;
            const estNorm = _histNorm_(it.estado);
            const fechada = _bdChamadoFechado_(it.estado, it.dtFechado) || estNorm === 'fechada' || estNorm === 'fechado' || estNorm === 'concluida' || estNorm === 'concluido';
            if (fechada) real++;
            const slaCls = _slaClasse_(it.sla);
            if (slaCls === 'CUMPRIDO') cump++;
            else if (slaCls === 'NAO') naoCump++;
          }
        });
        const emDia = prev > 0 ? (real / prev * 100).toFixed(1).replace('.', ',') + '%' : '-';
        const slaBase = cump + naoCump;
        const sla = slaBase > 0 ? (cump / slaBase * 100).toFixed(1).replace('.', ',') + '%' : '-';
        return { emDia, sla };
      };

      const mesAntIdx = (ref.index === 0 ? 11 : ref.index - 1);
      const mesAntAno = (ref.index === 0 ? ref.ano - 1 : ref.ano);

      const pAtual  = calcPrev(ref.ano, ref.index);
      const pAnt    = calcPrev(mesAntAno, mesAntIdx);
      const pAnoAnt = calcPrev(ref.ano - 1, ref.index);

      dataMap.set('Em dia', {
        atual:  pAtual.emDia,
        mesAnt: pAnt.emDia,
        anoAnt: pAnoAnt.emDia
      });

      dataMap.set('SLA atendido', {
        atual:  pAtual.sla,
        mesAnt: pAnt.sla,
        anoAnt: pAnoAnt.sla
      });
    } else {
      // Fallback: busca no histórico validado aba PREVENTIVAS
      const sSla = lerHistoricoValidado('SLA MENSAL', { aba: 'PREVENTIVAS' });
      if (sSla && sSla.length) {
        const ordAtual  = ref.ano * 100 + (ref.index + 1);
        const ordAnt    = (ref.index === 0 ? (ref.ano - 1) * 100 + 12 : ref.ano * 100 + ref.index);
        const ordAnoAnt = (ref.ano - 1) * 100 + (ref.index + 1);

        const itAtual  = sSla.find(s => s.ord === ordAtual) || sSla[sSla.length - 1];
        const itAnt    = sSla.find(s => s.ord === ordAnt) || (sSla.length > 1 ? sSla[sSla.length - 2] : null);
        const itAnoAnt = sSla.find(s => s.ord === ordAnoAnt);

        const fmt = it => it ? (it.bruto ? (String(it.bruto).includes('%') ? String(it.bruto) : String(it.bruto) + '%') : (formatarNumeroBR(it.valor) + '%')) : '-';
        dataMap.set('SLA atendido', {
          atual:  fmt(itAtual),
          mesAnt: fmt(itAnt),
          anoAnt: fmt(itAnoAnt)
        });
      }
    }
  } catch (e) {
    Logger.log('Erro Dashboard (preventivas BD): ' + e.message);
  }

  // 6. CONTROLE DE ACESSO: planilha dedicada de acessos
  try {
    const acessos = obterAcessosDashboard_();
    if (acessos) {
      Object.keys(acessos).forEach(chave => {
        const nova = acessos[chave];
        const atual = dataMap.get(chave) || { atual: '-', mesAnt: '-', anoAnt: '-' };
        dataMap.set(chave, {
          atual:  nova.atual  !== '-' ? nova.atual  : atual.atual,
          mesAnt: nova.mesAnt !== '-' ? nova.mesAnt : atual.mesAnt,
          anoAnt: nova.anoAnt !== '-' ? nova.anoAnt : atual.anoAnt
        });
      });
    }
  } catch (e) {
    Logger.log('Erro Dashboard (acessos): ' + e.message);
  }

  // ── DESTAQUES: documentação dos inquilinos ──────────────────────────────
  // SEM comparativo, e isso não é omissão: a aba DOCUMENTOS INQUILINOS é uma
  // LISTA VIVA, com o estado de hoje de cada documento. Não há registro de
  // "quantos estavam vencidos em junho" — a categoria é recalculada contra a
  // data de referência a cada execução. Inventar mês anterior aqui seria
  // comparar o presente com ele mesmo.
  //
  // Por isso os três valores vão iguais e o painel que os consome é marcado
  // com `semComparativo` (Slide01_Dashboard.gs): ele desenha o número uma vez,
  // em vez de três colunas repetidas fingindo série histórica.
  try {
    const docs = obterDadosDocumentos();
    if (docs && docs.resumo && docs.resumo.total > 0) {
      const r = docs.resumo;
      const pct = n => (n / r.total * 100).toFixed(1).replace('.', ',');
      const um = v => ({ atual: String(v), mesAnt: '-', anoAnt: '-' });

      dataMap.set('Documentação vencida (%)', um(pct(r.vencido) + '%'));
      dataMap.set('Documentos vencidos',      um(r.vencido));
      dataMap.set('Documentos a vencer',      um(r.critico));
      dataMap.set('Documentação em dia (%)',  um(pct(r.emDia) + '%'));
      dataMap.set('Documentos no total',      um(r.total));

      Logger.log('Dashboard (documentação): ' + r.total + ' documento(s) — ' +
                 r.vencido + ' vencido(s) (' + pct(r.vencido) + '%), ' +
                 r.critico + ' a vencer, ' + r.emDia + ' em dia, ' +
                 r.pendente + ' pendente(s).');
    } else {
      Logger.log('Dashboard (documentação): aba DOCUMENTOS INQUILINOS sem dados — ' +
                 'o quadrante de destaques fica com "-".');
    }
  } catch (e) {
    Logger.log('Erro Dashboard (documentação): ' + e.message);
  }

  // ── DESTAQUES: financeiro ───────────────────────────────────────────────
  // TAMBÉM sem comparativo, e pelo mesmo tipo de motivo da documentação: as
  // funções de financeiro leem a ABA do período de referência
  // (_financeiroDaAba_), com colunas NATUREZA / ORÇADO / REALIZADO. Não é uma
  // série mensal em colunas como o backlog — para ter mês anterior seria
  // preciso abrir a aba de outro período, e o nome delas não segue um padrão
  // que dê para derivar daqui.
  //
  // Os valores vão PRÉ-FORMATADOS (com R$ e %) de propósito: formatarNumeroBR
  // devolve texto que já tem símbolo sem mexer, e assim a unidade fica ao lado
  // do número em vez de só no rótulo — num painel de destaques o número é lido
  // sozinho, longe do cabeçalho.
  try {
    const um  = v => ({ atual: String(v), mesAnt: '-', anoAnt: '-' });

    // MÊS e ACUMULADO DO ANO saem do MESMO lugar — o DRE separa os blocos
    // `mes` e `acum` por rubrica, e _financeiroDoBridge_ só escolhe qual ler.
    // Por virem da mesma fonte, os dois não podem divergir por recorte
    // diferente: é a mesma soma, em duas janelas.
    [{ bloco: 'mes',  chave: 'Orçado consumido mês (%)', rotulo: 'mês' },
     { bloco: 'acum', chave: 'Orçado consumido ano (%)', rotulo: 'acumulado do ano' }
    ].forEach(function (j) {
      const f = _financeiroDoBridge_(j.bloco);
      if (f && f.totalOrcado > 0) {
        const consumo = f.totalRealizado / f.totalOrcado * 100;
        dataMap.set(j.chave, um(consumo.toFixed(1).replace('.', ',') + '%'));
        Logger.log('Dashboard (financeiro, ' + j.rotulo + '): realizado ' +
                   formatarMoedaCompacta(f.totalRealizado) + ' de ' +
                   formatarMoedaCompacta(f.totalOrcado) + ' orçado = ' +
                   consumo.toFixed(1) + '% consumido.');
      } else {
        Logger.log('Dashboard (financeiro, ' + j.rotulo + '): sem orçado — fica com "-".');
      }
    });

    const cm2 = obterCustoM2Acumulado_();
    if (cm2 && cm2.realizado != null) {
      dataMap.set('Custo por m²', um(formatarRsM2_(cm2.realizado)));
      // O orçado não vira linha (não há espaço no painel), mas fica no log:
      // é ele que diz se o número da tela é bom ou ruim.
      Logger.log('Dashboard (custo/m²): realizado ' + formatarRsM2_(cm2.realizado) +
                 (cm2.orcado != null ? ' contra ' + formatarRsM2_(cm2.orcado) + ' orçado' : '') +
                 ' (acumulado de ' + cm2.meses + ' mês(es)).');
    } else {
      Logger.log('Dashboard (custo/m²): sem valor acumulado — o destaque fica com "-".');
    }
  } catch (e) {
    Logger.log('Erro Dashboard (financeiro): ' + e.message);
  }

  return { map: dataMap, headers: headers, sobrescritos: sobrescritos };
}


// ==========================================
// DADOS PREVENTIVAS (Slide 02) — BD-PREVENTIVAS
// ==========================================
// Calcula automaticamente Previstas, Realizadas, SLA mensal e acumulado, e
// a lista de desvios de SLA diretamente da base bruta BD-PREVENTIVAS
// (planilha BASE DE DADOS — QUADRO REM).
//
// Se a BD-PREVENTIVAS estiver indisponível, cai na aba PREVENTIVAS da
// planilha da cidade como reserva (fallback).

function _slaClasse_(valor) {
  const n = _histNorm_(valor);
  if (!n) return 'SEM';
  if (n === 'nao cumprido' || n === 'sla nao cumprido' || n.indexOf('nao cumprido') >= 0 || n.indexOf('fora') >= 0) return 'NAO';
  if (n === 'cumprido'     || n === 'sla cumprido'     || n.indexOf('cumprido') >= 0 || n.indexOf('dentro') >= 0)  return 'CUMPRIDO';
  if (n === 'sem sla')                                  return 'SEM';
  return 'SEM';
}

// Limpa o nome do serviço preventivo para exibição no slide:
// Remove prefixos de metadados como "CHECKLIST - FACILITIES |",
// "CHECKLIST - TERCEIROS |", IDs de formulário e sufixos de empreendimento
// ("| MEGA Curitiba - BELEZA.COM"), deixando apenas o nome real do serviço
// (ex.: "Leitura Clientes", "Inspeção Diária Trator", "Carro Locado", "Casa de Bombas").
function _limparDescricaoPreventiva_(desc) {
  if (!desc) return '';
  let txt = String(desc).trim();

  // 1) Remove código de formulário se houver (ex.: "PMP.904036.68674893 ")
  txt = txt.replace(/^[A-Z]{2,5}\.\d+(?:\.\d+)?\s+/i, '');

  // 2) Se tiver pipes (|), divide nos pedaços e extrai a parte útil (nome do serviço)
  if (txt.indexOf('|') >= 0) {
    const partes = txt.split('|').map(p => p.trim()).filter(Boolean);
    const uteis = partes.filter(p => {
      const pn = _histNorm_(p);
      if (pn.indexOf('checklist') >= 0) return false;
      if (pn.indexOf('mega') >= 0) return false;
      if (pn.indexOf('condominio') >= 0) return false;
      return true;
    });

    if (uteis.length > 0) {
      txt = uteis[0];
    } else if (partes.length > 1) {
      txt = partes[1];
    }
  }

  // 3) Limpezas residuais
  txt = txt.replace(/^CHECKLIST\s*-\s*(?:FACILITIES|TERCEIROS|PROPERTY|OUTROS)\s*[-|:]?\s*/i, '');
  txt = txt.replace(/\s*[-|:]?\s*MEGA\s+(?:Curitiba|Itajaí|Itajai|Esteio).*$/i, '');
  txt = txt.replace(/:\s*(?:Não\s+)?Conforme\b.*$/i, '');
  txt = txt.trim();

  return txt || String(desc).trim();
}

// Resolve se a preventiva é de FACILITIES (azul) ou TERCEIROS (laranja).
// Considera tanto a descrição do checklist (que frequentemente diz
// "CHECKLIST - TERCEIROS" ou "CHECKLIST - FACILITIES") quanto o responsável/executor.
function _equipePreventiva_(quemFechou, descricao) {
  const descNorm = _histNorm_(descricao);
  if (descNorm.indexOf('terceiro') >= 0) return 'TERCEIROS';
  if (descNorm.indexOf('facilit') >= 0)  return 'FACILITIES';

  const norm = _histNorm_(quemFechou);
  if (norm) {
    if (norm.indexOf('terceiro') >= 0) return 'TERCEIROS';
    if (typeof _RESPONSAVEL_EQUIPE_ !== 'undefined' && _RESPONSAVEL_EQUIPE_[norm]) {
      return _RESPONSAVEL_EQUIPE_[norm] === 'PROPERTY' ? 'FACILITIES' : _RESPONSAVEL_EQUIPE_[norm];
    }
    if (norm.indexOf('facilities') >= 0 || norm.indexOf('mega') >= 0 || norm.indexOf('capital') >= 0) {
      return 'FACILITIES';
    }
    return 'TERCEIROS';
  }
  return 'FACILITIES';
}

let _bdPreventivasCache = {};

function _abaBdPreventivas_(ss) {
  let sheet = ss.getSheetByName('BD-PREVENTIVAS') || ss.getSheetByName('BD - PREVENTIVAS') || ss.getSheetByName('BD_PREVENTIVAS');
  if (!sheet) {
    sheet = ss.getSheets().find(s => _histNorm_(s.getName()).replace(/[\s_]+/g, '-').indexOf('bd-preventivas') >= 0);
  }
  return sheet || null;
}

function _lerBdPreventivasCru_() {
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  if (_bdPreventivasCache[alvoEmp]) return _bdPreventivasCache[alvoEmp];
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _abaBdPreventivas_(ss);
    if (!sheet) return [];

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr = data[0].map(_histNorm_);
    const col = (...trechos) => {
      for (let i = 0; i < trechos.length; i++) {
        const c = hdr.findIndex(h => h.indexOf(trechos[i]) >= 0);
        if (c >= 0) return c;
      }
      return -1;
    };

    const cId      = col('id agendamento', 'id chamado', 'id');
    const cDesc    = col('descricao', 'descrição', 'servico', 'serviço', 'atividade', 'rotina');
    const cEstado  = col('estado');
    const cSla     = col('sla');
    const cCC      = col('centro de custo');
    const cQuem    = col('fechado por', 'responsavel', 'responsáveis', 'responsaveis');
    const cAgend   = col('data de agendamento', 'data agendamento', 'data de reporte', 'agendamento');
    const cFechado = col('fechada em', 'fechado em');

    if (cCC < 0) return [];

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (_histEmpChave_(row[cCC]) !== alvoEmp) continue;

      const rawDescricao = cDesc >= 0 ? String(row[cDesc] || '').trim() : '';

      saida.push({
        id:          _idChamadoNormaliza_(cId >= 0 ? row[cId] : ''),
        rawDesc:     rawDescricao,
        descricao:   _limparDescricaoPreventiva_(rawDescricao),
        estado:      cEstado >= 0 ? String(row[cEstado] || '').trim() : '',
        sla:         cSla    >= 0 ? String(row[cSla]    || '').trim() : '',
        fechadoPor:  cQuem   >= 0 ? String(row[cQuem]   || '').trim() : '',
        dtAgendado:  cAgend  >= 0 ? _histParseDataHora_(row[cAgend]) : null,
        dtFechado:   cFechado >= 0 ? _histParseDataHora_(row[cFechado]) : null
      });
    }

    if (saida.length) _bdPreventivasCache[alvoEmp] = saida;
    return saida;
  } catch (e) {
    Logger.log('_lerBdPreventivasCru_: ' + e.message);
    return [];
  }
}

function obterDadosPreventivasBD_() {
  const itens = _lerBdPreventivasCru_();
  if (!itens.length) return null;

  if (!itens.some(it => it.dtAgendado)) {
    Logger.log('BD-PREVENTIVAS: ' + itens.length + ' linhas do empreendimento, mas nenhuma com data de agendamento legível.');
    return null;
  }

  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));   // exclusivo
  const anoIni = new Date(Date.UTC(ref.ano, 0, 1));

  const dentro = (d, ini, fim) => !!d && d >= ini && d < fim;

  let mPrevistas = 0, mRealizadas = 0, mCumpridos = 0, mNaoCumpridos = 0;
  let aPrevistas = 0, aRealizadas = 0, aCumpridos = 0, aNaoCumpridos = 0;

  let rawServices = [];
  let counts = { facilities: 0, terceiros: 0 };

  itens.forEach(it => {
    const noMes   = dentro(it.dtAgendado, refIni, refFim);
    const noAno   = dentro(it.dtAgendado, anoIni, refFim);
    const estNorm = _histNorm_(it.estado);
    const fechada = _bdChamadoFechado_(it.estado, it.dtFechado) || estNorm === 'fechada' || estNorm === 'fechado' || estNorm === 'concluida' || estNorm === 'concluido';
    const slaCls  = _slaClasse_(it.sla);

    if (noMes) {
      mPrevistas++;
      if (fechada) mRealizadas++;
      if (slaCls === 'CUMPRIDO') mCumpridos++;
      else if (slaCls === 'NAO') {
        mNaoCumpridos++;
        const tipo = _equipePreventiva_(it.fechadoPor, it.rawDesc);
        if (tipo === 'FACILITIES') counts.facilities++;
        else counts.terceiros++;

        const desc = _limparDescricaoPreventiva_(it.rawDesc || it.descricao) || 'Serviço preventivo';
        rawServices.push({ name: desc, type: tipo });
      }
    }

    if (noAno) {
      aPrevistas++;
      if (fechada) aRealizadas++;
      if (slaCls === 'CUMPRIDO') aCumpridos++;
      else if (slaCls === 'NAO') aNaoCumpridos++;
    }
  });

  const grouped = {};
  rawServices.forEach(s => {
    const key = s.name + '||' + s.type;
    if (!grouped[key]) grouped[key] = { name: s.name, type: s.type, count: 0 };
    grouped[key].count++;
  });

  const servicosForaSla = Object.values(grouped).map(g => {
    let txt = g.name;
    if (g.count > 1) txt += ' (' + g.count + 'x)';
    return { text: txt, type: g.type };
  });

  const mBase = mCumpridos + mNaoCumpridos;
  const aBase = aCumpridos + aNaoCumpridos;

  const mSla = mBase > 0 ? (Math.round((mCumpridos / mBase) * 10000) / 100).toFixed(2).replace('.', ',') + '%' : '-';
  const aSla = aBase > 0 ? (Math.round((aCumpridos / aBase) * 10000) / 100).toFixed(2).replace('.', ',') + '%' : '-';

  return {
    mensal: {
      titulo: 'VISÃO MENSAL (' + MESES_3_REF[ref.index] + ')',
      previstas: String(mPrevistas),
      realizadas: String(mRealizadas),
      sla: mSla
    },
    anual: {
      titulo: 'VISÃO ACUMULADA (' + ref.ano + ')',
      previstas: String(aPrevistas),
      realizadas: String(aRealizadas),
      sla: aSla
    },
    servicosForaSla: servicosForaSla,
    counts: counts
  };
}

function obterDadosPreventivas() {
  try {
    // 1º Tenta calcular automaticamente da base bruta BD-PREVENTIVAS (fonte oficial)
    let res = null;
    try {
      res = obterDadosPreventivasBD_();
    } catch (eBd) {
      Logger.log('BD-PREVENTIVAS indisponível (' + eBd.message + ') — caindo na aba PREVENTIVAS da cidade.');
    }

    // Se a BD-PREVENTIVAS calculou com sucesso, enriquece com tendências e retorna
    if (res && res.mensal && res.mensal.previstas !== '-') {
      Logger.log('Preventivas ' + getProjetoAtivo().nome + ': calculado da BD-PREVENTIVAS (Previstas: ' +
                 res.mensal.previstas + ', Realizadas: ' + res.mensal.realizadas + ', SLA: ' + res.mensal.sla + ')');

      const _dp = (atual, ind) => { const r = deltaVsMesAnterior_(atual, ind, 'PREVENTIVAS'); return r ? r.delta : null; };
      res.mensal.previstasDelta  = _dp(res.mensal.previstas,  'PREVISTAS');
      res.mensal.realizadasDelta = _dp(res.mensal.realizadas, 'REALIZADAS');
      res.mensal.slaDelta        = _dp(res.mensal.sla,        'SLA MENSAL');
      res.anual.slaDelta         = _dp(res.anual.sla,         'SLA ACUMULADO');

      const _n = v => { const n = _numLenient_(v); return isNaN(n) ? null : n; };
      res.anual.previstasDelta  = _n(res.mensal.previstas);
      res.anual.realizadasDelta = _n(res.mensal.realizadas);

      return res;
    }

    // 2º Fallback: Aba PREVENTIVAS digitada da planilha local
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('PREVENTIVAS');
    if (!sheet) throw new Error('Aba PREVENTIVAS não encontrada.');

    const data = sheet.getDataRange().getValues();
    res = {
      mensal          : { titulo: 'VISÃO MENSAL',    previstas: '-', realizadas: '-', sla: '-' },
      anual           : { titulo: 'VISÃO ACUMULADA', previstas: '-', realizadas: '-', sla: '-' },
      servicosForaSla : [],
      counts          : { facilities: 0, terceiros: 0 }
    };

    const mesAtual = (data.length > 0 && data[0][1]) ? String(data[0][1]).toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') : '';
    const ehMes = MESES_3_REF.some(m => mesAtual.indexOf(m) === 0);
    res.mensal.titulo = ehMes ? 'VISÃO MENSAL (' + mesAtual + ')' : 'VISÃO MENSAL';
    res.anual.titulo  = 'VISÃO ACUMULADA (' + obterMesReferencia_().ano + ')';

    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    let rawServices = [];

    for (let i = 0; i < data.length; i++) {
      const row       = data[i];
      const indicador = norm(row[0]);

      if (indicador.includes('previst')) {
        res.mensal.previstas = String(row[1] || '-');
        res.anual.previstas  = String(row[2] || '-');
      } else if (indicador.includes('realiz') || indicador.includes('feit')) {
        res.mensal.realizadas = String(row[1] || '-');
        res.anual.realizadas  = String(row[2] || '-');
      } else if (indicador.includes('sla') || indicador.includes('atend')) {
        res.mensal.sla = formatarPorcentagem(row[1]);
        res.anual.sla  = formatarPorcentagem(row[2]);
      }

      if (i > 0) {
        const servicoBruto = String(row[6] || '').trim();
        const equipeBruta  = norm(row[5]);
        const servico      = _limparDescricaoPreventiva_(servicoBruto);
        if (servico && servico !== '-' && norm(servico) !== 'servico') {
          let type = _equipePreventiva_(equipeBruta, servicoBruto);
          if (type === 'FACILITIES') res.counts.facilities++;
          else res.counts.terceiros++;
          rawServices.push({ name: servico, type: type });
        }
      }
    }

    const grouped = {};
    rawServices.forEach(s => {
      const key = s.name + '||' + s.type;
      if (!grouped[key]) grouped[key] = { name: s.name, type: s.type, count: 0 };
      grouped[key].count++;
    });

    res.servicosForaSla = Object.values(grouped).map(g => {
      let txt = g.name;
      if (g.count > 1) txt += ' (' + g.count + 'x)';
      return { text: txt, type: g.type };
    });

    const _dp = (atual, ind) => { const r = deltaVsMesAnterior_(atual, ind, 'PREVENTIVAS'); return r ? r.delta : null; };
    res.mensal.previstasDelta  = _dp(res.mensal.previstas,  'PREVISTAS');
    res.mensal.realizadasDelta = _dp(res.mensal.realizadas, 'REALIZADAS');
    res.mensal.slaDelta        = _dp(res.mensal.sla,        'SLA MENSAL');
    res.anual.slaDelta         = _dp(res.anual.sla,         'SLA ACUMULADO');

    const _n = v => { const n = _numLenient_(v); return isNaN(n) ? null : n; };
    res.anual.previstasDelta  = _n(res.mensal.previstas);
    res.anual.realizadasDelta = _n(res.mensal.realizadas);

    return res;

  } catch (e) {
    Logger.log('Erro Preventivas: ' + e.message);
    return { mensal: {}, anual: {}, servicosForaSla: [], counts: {} };
  }
}


// ==========================================
// DADOS CORRETIVAS (Slide 03)
// ==========================================
// Executa fn e devolve null se ela falhar — a contagem da BD-CORRETIVAS não
// pode derrubar o slide de Corretivas (o valor digitado serve de reserva).
function _ckSafeCorretivas_(fn) {
  try { return fn(); } catch (e) {
    Logger.log('Corretivas: contagem da BD-CORRETIVAS indisponível — ' + e.message);
    return null;
  }
}

// Registra quando o valor digitado na aba CHAMADOS da cidade não bate com a
// contagem da BD-CORRETIVAS. Não altera nada: só deixa o rastro de que a
// planilha da cidade está desatualizada naquele mês.
function _avisarDivergenciaChamados_(qual, digitado, contado) {
  const d = _numLenient_(digitado);
  if (isNaN(d) || d === contado) return;
  Logger.log('Corretivas: "Chamados ' + qual + '" digitado = ' + digitado +
             ', contado na BD-CORRETIVAS = ' + contado + '. Vale a BD; ' +
             'atualize a aba CHAMADOS da planilha da cidade.');
}

function obterDadosCorretivasV6() {
  let kpiData = {
    mCriados: '-', mFechados: '-', mTempo: '-', mDisp: '-',
    aCriados: '-', aFechados: '-', aTempo: '-', aDisp: '-'
  };

  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('CHAMADOS') || ss.getSheetByName('INDICADORES');
    if (sheet) {
      const data = sheet.getDataRange().getDisplayValues();
      const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      data.forEach(row => {
        const ind = norm(row[0]);
        if      (ind.includes('criado')  && !ind.includes('tempo')) { kpiData.mCriados  = row[1]; kpiData.aCriados  = row[2]; }
        else if (ind.includes('fechado') && !ind.includes('tempo')) { kpiData.mFechados = row[1]; kpiData.aFechados = row[2]; }
        else if (ind.includes('tempo')   &&  ind.includes('medio')) { kpiData.mTempo = formatarTempo(row[1]); kpiData.aTempo = formatarTempo(row[2]); }
        else if (ind.includes('disponibilidade'))                    { kpiData.mDisp    = row[1]; kpiData.aDisp     = row[2]; }
      });
    }
  } catch (e) {
    Logger.log('Corretivas (leitura local da cidade): ' + e.message);
  }

  // 1. FONTE DOS CRIADOS/FECHADOS: contagem na BD-CORRETIVAS
  const fluxo = _ckSafeCorretivas_(() => obterFluxoCorretivasBD_());
  kpiData.digitado = {
    criados:   kpiData.mCriados,  fechados:   kpiData.mFechados,
    aCriados:  kpiData.aCriados,  aFechados:  kpiData.aFechados
  };
  if (fluxo) {
    _avisarDivergenciaChamados_('criados (mês)',  kpiData.mCriados,  fluxo.mCriados);
    _avisarDivergenciaChamados_('fechados (mês)', kpiData.mFechados, fluxo.mFechados);
    _avisarDivergenciaChamados_('criados (acum.)',  kpiData.aCriados,  fluxo.aCriados);
    _avisarDivergenciaChamados_('fechados (acum.)', kpiData.aFechados, fluxo.aFechados);
    kpiData.mCriados  = String(fluxo.mCriados);
    kpiData.mFechados = String(fluxo.mFechados);
    kpiData.aCriados  = String(fluxo.aCriados);
    kpiData.aFechados = String(fluxo.aFechados);
  }

  // 2. FONTE DA DISPONIBILIDADE E TEMPO MÉDIO: busca na aba CHAMADOS do Histórico Validado
  try {
    const ref = obterMesReferencia_();
    const ordRef = ref.ord || (ref.ano * 100 + (ref.index + 1));
    const sDispM = lerHistoricoValidado('Índice de disponibilidade', { aba: 'CHAMADOS' });
    const sDispA = lerHistoricoValidado('Índice de disponibilidade - ACUMULADO', { aba: 'CHAMADOS' });
    const itM = sDispM.find(s => s.ord === ordRef) || (sDispM.length ? sDispM[sDispM.length - 1] : null);
    const itA = sDispA.find(s => s.ord === ordRef) || (sDispA.length ? sDispA[sDispA.length - 1] : null);
    if (itM) kpiData.mDisp = String(itM.bruto || itM.valor);
    if (itA) kpiData.aDisp = String(itA.bruto || itA.valor);

    // Se tempo médio estiver vazio, busca no Histórico Validado
    if (kpiData.mTempo === '-' || kpiData.aTempo === '-') {
      const sTmp = lerHistoricoValidado('Tempo médio entre criado e fechado', { aba: 'CHAMADOS' });
      if (sTmp && sTmp.length) {
        const itTmp = sTmp.find(s => s.ord === ordRef) || sTmp[sTmp.length - 1];
        if (itTmp && itTmp.bruto) {
          if (kpiData.mTempo === '-') kpiData.mTempo = formatarTempo(itTmp.bruto);
          if (kpiData.aTempo === '-') kpiData.aTempo = formatarTempo(itTmp.bruto);
        }
      }
    }
  } catch (e) {
    Logger.log('obterDadosCorretivasV6 disponibilidade/tempo: ' + e.message);
  }

  // 3. Tendências vs mês anterior (histórico validado, aba CHAMADOS)
  const _d = (atual, ind) => { const r = deltaVsMesAnterior_(atual, ind, 'CHAMADOS'); return r ? r.delta : null; };
  const dCri = _d(kpiData.mCriados, 'Chamados criados');
  const dFec = _d(kpiData.mFechados, 'Chamados fechados');
  const dTmp = _d(kpiData.mTempo, 'Tempo médio entre criado e fechado');
  const dDisp = _d(kpiData.mDisp, 'Índice de disponibilidade');
  const dDispAc = _d(kpiData.aDisp, 'Índice de disponibilidade - ACUMULADO');

  return {
    digitado: kpiData.digitado,
    mensal: {
      titulo: 'VISÃO MENSAL',
      kpis: [
        { l: 'Chamados criados',                   v: kpiData.mCriados,  delta: dCri,  menor: true  },
        { l: 'Chamados fechados',                  v: kpiData.mFechados, delta: dFec,  menor: false },
        { l: 'Tempo médio entre criado e fechado', v: kpiData.mTempo,    delta: dTmp,  menor: true  },
        { l: 'Índice de disponibilidade',          v: kpiData.mDisp,     delta: dDisp, menor: false }
      ]
    },
    anual: {
      titulo: 'VISÃO ACUMULADA',
      kpis: [
        { l: 'Chamados criados',                   v: kpiData.aCriados  },
        { l: 'Chamados fechados',                  v: kpiData.aFechados },
        { l: 'Tempo médio entre criado e fechado', v: kpiData.aTempo    },
        { l: 'Índice de disponibilidade',          v: kpiData.aDisp,  delta: dDispAc, menor: false }
      ]
    }
  };
}


// ==========================================
// DADOS ACESSO/SEGURANÇA (Slide 04)
// ==========================================
function obterDadosTempo() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('TEMPO');
    if (!sheet) throw new Error('Aba TEMPO não encontrada.');

    const data = sheet.getDataRange().getDisplayValues();
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    let kpis = {
      fluxo: '-', aFluxo: '-',
      tempoAcesso: '-', aTempoAcesso: '-',
      turnover: '-', aTurnover: '-',
      seguranca: '-', aSeguranca: '-'
    };

    data.forEach(row => {
      const ind = norm(row[0]);
      if      (ind.includes('fluxo') && ind.includes('pessoas'))        { kpis.fluxo       = row[1]; kpis.aFluxo       = row[2]; }
      else if (ind.includes('tempo') && ind.includes('acesso'))         { kpis.tempoAcesso = formatarTempo(row[1]); kpis.aTempoAcesso = formatarTempo(row[2]); }
      else if (ind.includes('turnover'))                                 { kpis.turnover    = formatarPorcentagem(row[1]); kpis.aTurnover = formatarPorcentagem(row[2]); }
      else if (ind.includes('ocorrencia') || ind.includes('seguranca')) { kpis.seguranca   = row[1]; kpis.aSeguranca   = row[2]; }
    });

    // Fluxo e Tempo médio vêm da planilha validada de Controle de Acessos
    // (fonte autoritativa). Turnover fica EM BRANCO (a pedido). Ocorrências
    // continua vindo da aba TEMPO. Se a planilha de acessos estiver
    // indisponível, cai nos valores da aba TEMPO.
    const acc = obterKpisAcessos_();
    const fluxoMensal = acc && acc.mensal.fluxo ? acc.mensal.fluxo : kpis.fluxo;
    const tempoMensal = acc && acc.mensal.tempo ? acc.mensal.tempo : kpis.tempoAcesso;
    const fluxoAnual  = acc && acc.anual.fluxo  ? acc.anual.fluxo  : kpis.aFluxo;
    const tempoAnual  = acc && acc.anual.tempo  ? acc.anual.tempo  : kpis.aTempoAcesso;

    return {
      mensal: {
        titulo: 'VISÃO MENSAL',
        kpis: [
          { l: 'Fluxo de pessoas',         v: fluxoMensal    },
          { l: 'Tempo médio de acesso',    v: tempoMensal    },
          { l: 'Turnover de equipe',       v: ''             },
          { l: 'Ocorrências de segurança', v: kpis.seguranca }
        ]
      },
      anual: {
        titulo: 'VISÃO ACUMULADA',
        kpis: [
          { l: 'Fluxo de pessoas',         v: fluxoAnual      },
          { l: 'Tempo médio de acesso',    v: tempoAnual      },
          { l: 'Turnover de equipe',       v: ''              },
          { l: 'Ocorrências de segurança', v: kpis.aSeguranca }
        ]
      }
    };

  } catch (e) {
    Logger.log('Erro planilha Slide 04 (Acesso/Segurança): ' + e.message);
    return null;
  }
}


// ==========================================
// FONTE ÚNICA DO FINANCEIRO — aba FINANCEIRO BRIDGE
// ==========================================
// A planilha tinha QUATRO abas financeiras para o mesmo fato:
//   FINANCEIRO        → rubricas do MÊS (Orçado x Realizado)
//   FINANCEIRO ANUAL  → as mesmas rubricas, ACUMULADAS no ano
//   FINANCEIRO BRIDGE → as mesmas rubricas, mês a mês (12 × Orç/Real)
//   METRO QUADRADO    → R$/m² por mês (e a área)
//
// As três primeiras são o MESMO dado em recortes diferentes, e a BRIDGE já
// contém os outros dois: o mês é a coluna do mês de referência e o acumulado
// é a soma de Jan até ele — é exatamente o que obterDadosDRE_ já calcula
// (blocos `mes` e `acum` por rubrica). Manter três abas à mão significa três
// lugares para errar, e no deck de julho/2026 elas de fato divergiram
// (Realizado do mês: R$ 469.287 na aba FINANCEIRO x soma das rubricas da
// BRIDGE; mesma história no acumulado).
//
// Por isso o mês e o acumulado passaram a sair da BRIDGE. As abas FINANCEIRO
// e FINANCEIRO ANUAL continuam sendo LIDAS, mas só como conferência: o valor
// delas vai em `planilha` e o slide de CHECK compara os dois. Assim a
// divergência aparece para ser corrigida em vez de sumir em silêncio — e
// quem mantém a planilha só precisa alimentar a BRIDGE.
//
// bloco = 'mes' | 'acum' | 'anual' | 'anualOrc' (os mesmos de obterDadosDRE_)
function _financeiroDoBridge_(bloco) {
  const dre = obterDadosDRE_();
  if (!dre || !dre.rubricas || !dre.rubricas.length) return null;

  const linhasDados = [];
  let totalOrcado = 0, totalRealizado = 0;

  dre.rubricas.forEach(rb => {
    const orcado    = rb[bloco].orc;
    const realizado = rb[bloco].real;
    if (orcado === 0 && realizado === 0) return;   // mesma regra dos leitores antigos
    const diff = orcado - realizado;
    linhasDados.push({ natureza: rb.nome, orcado, realizado, diff, absDiff: Math.abs(diff) });
    totalOrcado    += orcado;
    totalRealizado += realizado;
  });
  if (!linhasDados.length) return null;

  const acimaDoOrcado = linhasDados
    .filter(i => i.realizado > i.orcado)
    .sort((a, b) => b.absDiff - a.absDiff)
    .slice(0, 3);

  const abaixoDoOrcado = linhasDados
    .filter(i => i.realizado < i.orcado)
    .sort((a, b) => b.absDiff - a.absDiff)
    .slice(0, 3);

  const dadosGrafico = linhasDados.slice()
    .sort((a, b) => b.realizado - a.realizado)
    .slice(0, 8)
    .map(i => ({ label: i.natureza, orcado: i.orcado, realizado: i.realizado, diff: i.diff }));

  return {
    totalOrcado, totalRealizado, acimaDoOrcado, abaixoDoOrcado, dadosGrafico,
    linhasDados,
    mesesAcum: dre.mesesAcum,
    fonte    : 'FINANCEIRO BRIDGE'
  };
}

// Leitor cru de uma aba no formato NATUREZA | ORÇADO | CUSTO MENSAL/REALIZADO
// [| VARIAÇÃO] — serve tanto a FINANCEIRO quanto a FINANCEIRO ANUAL (as duas
// têm exatamente a mesma estrutura; antes havia uma cópia do mesmo código em
// Slide05 e outra em Slide08). Hoje o retorno é usado só como CONFERÊNCIA
// contra a BRIDGE, então uma aba ausente devolve null em vez de lançar erro:
// o deck não depende mais dela para ser gerado.
function _financeiroDaAba_(nomeAba) {
  try {
    const ss  = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const aba = ss.getSheetByName(nomeAba);
    if (!aba) { Logger.log('_financeiroDaAba_: aba "' + nomeAba + '" não encontrada (só conferência).'); return null; }

    const ultimaLinha  = aba.getLastRow();
    const ultimaColuna = aba.getLastColumn();
    if (ultimaLinha < 2) return null;

    const valores   = aba.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
    const cabecalho = valores[0].map(v => normalizarTexto(v));

    const idxNatureza  = cabecalho.indexOf('natureza');
    const idxOrcado    = cabecalho.indexOf('orcado');
    const idxRealizado = cabecalho.indexOf('custo mensal') >= 0
      ? cabecalho.indexOf('custo mensal')
      : cabecalho.indexOf('realizado');
    const idxVariacao  = cabecalho.indexOf('variacao');
    if (idxNatureza === -1 || idxOrcado === -1 || idxRealizado === -1) {
      Logger.log('_financeiroDaAba_: colunas NATUREZA/ORÇADO/REALIZADO não encontradas em "' + nomeAba + '".');
      return null;
    }

    const linhasDados = [];
    let totalOrcado = 0, totalRealizado = 0;

    for (let i = 1; i < valores.length; i++) {
      const linha       = valores[i];
      const naturezaRaw = limparTexto(linha[idxNatureza]);
      if (!naturezaRaw) continue;

      const norm = normalizarTexto(naturezaRaw);
      if (norm === 'total geral' || norm === 'total' || norm.indexOf('resultado total') >= 0) continue;

      const orcado    = converterNumero(linha[idxOrcado]);
      const realizado = converterNumero(linha[idxRealizado]);
      if (orcado === 0 && realizado === 0) continue;

      const diffCalculado = orcado - realizado;
      const diffPlanilha  = idxVariacao >= 0 ? converterNumero(linha[idxVariacao]) : diffCalculado;
      const diff          = Number.isFinite(diffPlanilha) ? diffPlanilha : diffCalculado;

      linhasDados.push({
        natureza: padronizarRubrica_(naturezaRaw),
        orcado, realizado, diff, absDiff: Math.abs(diff)
      });
      totalOrcado    += orcado;
      totalRealizado += realizado;
    }

    if (!linhasDados.length) return null;
    return { aba: nomeAba, linhasDados, totalOrcado, totalRealizado, cabecalho: valores[0] };

  } catch (e) {
    Logger.log('_financeiroDaAba_("' + nomeAba + '"): ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS FINANCEIROS (registro de dados / histórico)
// ==========================================
// Mantido pela compatibilidade com Suporte_RegistroDados.gs, mas agora sai da
// mesma fonte do deck (BRIDGE) em vez de reler a aba FINANCEIRO por índice de
// coluna fixo — o registro histórico tem que gravar o número que foi
// APRESENTADO, senão o histórico e o deck contam histórias diferentes.
function obterDadosFinanceiro() {
  try {
    const d = obterDadosFinanceiroMensal_();
    if (!d) return null;
    return {
      totalOrcado   : d.totalOrcado,
      totalRealizado: d.totalRealizado,
      ofensores     : d.acimaDoOrcado,
      defensores    : d.abaixoDoOrcado,
      dadosGrafico  : d.dadosGrafico
    };
  } catch (e) {
    Logger.log('Erro Financeiro: ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS CUSTO M² (Slide 09 - Custo do m²)
// ==========================================
//
// Estrutura fixa da aba METRO QUADRADO (cidade na col A pode variar):
//
//  [0] Headers
//  [1] TOTAL ÁREA COM IPTU E SEGURO   ← âncora 1
//  [2] R$ M² MÊS- <CIDADE>            ← Orç e Real (com IPTU e Seguro)
//  [3] R$ M² ANO - <CIDADE>
//  [4] TOTAL ÁREA COMUM
//  [5] R$ M² MÊS- <CIDADE>            ← sem IPTU e sem Seguro
//  [6] R$ M² ANO - <CIDADE>
//  [7] TOTAL ÁREA - COM SEGURO SEM IPTU  ← âncora 2
//  [8] R$ M² MÊS- <CIDADE>            ← sem IPTU (com Seguro)
//
//  tabela retornada:
//    'Orç 2026'           → linha [2] colunas Orç  (com IPTU e Seguro)
//    'Real 2026'          → linha [2] colunas Real (com IPTU e Seguro)
//    'Real 2026 sem IPTU' → linha [8] colunas Real (com Seguro, sem IPTU)
//
//  A linha 'IPTU/m²' é calculada automaticamente no slide:
//    IPTU/m² = Real 2026 − Real 2026 sem IPTU  (só aparece nos meses com IPTU)
//
// ==========================================
let _custoM2Cache = {};
function obterDadosCustoM2() {
  const _ckCusto = getProjetoAtivo().nome;
  if (_custoM2Cache[_ckCusto]) return _custoM2Cache[_ckCusto];
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('METRO QUADRADO');
    if (!sheet) throw new Error('Aba METRO QUADRADO não encontrada');

    const rango  = sheet.getDataRange();
    const data   = rango.getDisplayValues();
    // Os NÚMEROS vêm também em precisão total (getValues), não só como o
    // texto formatado da planilha. getDisplayValues devolve o R$/m² já
    // arredondado em 2 casas ("4,53"), e quem tirava média/acumulado desses
    // valores acumulava o erro de arredondamento: o slide CUSTO DO M²
    // fechava o ano 1 centavo diferente do DRE e do Bridge, que calculam do
    // total bruto (Σ R$ ÷ área ÷ meses). Agora todo mundo parte do mesmo
    // número cheio e o arredondamento acontece só na hora de exibir.
    // (getDisplayValues continua sendo a fonte dos RÓTULOS — cabeçalho de
    // mês, nome da linha, mês em A1 — que precisam do texto como está.)
    let brutos = null;
    try { brutos = rango.getValues(); } catch (e) { Logger.log('Custo m²: getValues indisponível — ' + e.message); }
    // Devolve SEMPRE positivo, igual ao parseNumeroCusto_ (que já fazia
    // Math.abs): Curitiba e Esteio guardam a aba em formato contábil, com
    // despesa negativa — "(3,66)" no texto, -3.66 no valor cru. O deck
    // sempre mostrou custo como número positivo; sem o Math.abs aqui, ler o
    // valor cru fazia o slide CUSTO DO M² sair com "R$ -3,89".
    const numeroCelula = (linha, col) => {
      const cru = brutos && brutos[linha] ? brutos[linha][col] : null;
      if (typeof cru === 'number' && isFinite(cru)) return Math.abs(cru);
      return parseNumeroCusto_(data[linha][col]);
    };
    const header = data[0];
    const meses  = extrairMesesCustoM2_(header);

    // ── Localizar linhas pela estrutura, não por índice fixo ──────────────
    const normLbl = s => String(s || '')
      .replace(/ /g, ' ')
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    let idxComIptu = -1;   // R$/m² de TOTAL ÁREA COM IPTU E SEGURO  → âncora1 + 1
    let idxSemIptu = -1;   // R$/m² de TOTAL ÁREA COM SEGURO SEM IPTU → âncora2 + 1

    for (let r = 0; r < data.length; r++) {
      const lbl = normLbl(data[r][0]);

      if (lbl.includes('TOTAL ÁREA') && lbl.includes('IPTU E SEGURO')) {
        idxComIptu = r + 1;   // R$/m² está sempre na linha imediatamente seguinte
      }
      if (lbl.includes('TOTAL ÁREA') && lbl.includes('SEM IPTU')) {
        idxSemIptu = r + 1;   // R$/m² sem IPTU está sempre na linha imediatamente seguinte
      }
    }

    if (idxComIptu < 0) throw new Error('"TOTAL ÁREA COM IPTU E SEGURO" não encontrado na aba METRO QUADRADO');

    // ── Detectar cidade pelo label da linha (ex: "R$ M² MÊS- ITAJAÍ") ────
    const labelRaw    = String(data[idxComIptu][0] || '').replace(/ /g, ' ').trim();
    const cidadeMatch = labelRaw.match(/[-–]\s*([A-ZÀÁÂÃÉÊÍÓÔÕÚÜ ]+)$/i);
    const nomeCidade  = cidadeMatch ? cidadeMatch[1].trim() : '';

    // ── Montar tabela ──────────────────────────────────────────────────────
    const tabela = {
      'Orç 2026'          : [],
      'Real 2026'         : [],
      'Real 2026 sem IPTU': []
    };

    meses.forEach(m => {
      tabela['Orç 2026'].push(numeroCelula(idxComIptu, m.colOrc));
      tabela['Real 2026'].push(numeroCelula(idxComIptu, m.colReal));
      tabela['Real 2026 sem IPTU'].push(
        idxSemIptu >= 0 ? numeroCelula(idxSemIptu, m.colReal) : null
      );
    });

    // ── Mês de referência ─────────────────────────────────────────────────
    // Prioridade:
    //   1. Mês escrito na célula A1 da aba (ex: "MAIO", "Abril") — controle manual
    //   2. Mês corrente (se tiver dados)
    //   3. Último mês com Orç e Real preenchidos
    const temDados = i => tabela['Orç 2026'][i] !== null && tabela['Real 2026'][i] !== null;
    let mesRef = null;

    const mesesIdx = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const a1 = normalizarTextoCusto_(data[0][0]).substring(0, 3);
    const idxManual = mesesIdx.indexOf(a1);
    if (idxManual >= 0 && idxManual < meses.length && temDados(idxManual)) {
      mesRef = { ...meses[idxManual], index: idxManual };
      Logger.log('obterDadosCustoM2: mês definido manualmente em A1 → ' + data[0][0]);
    }

    if (!mesRef) {
      const mesAtualIdx = new Date().getMonth();   // 0 = Jan … 11 = Dez
      if (mesAtualIdx < meses.length && temDados(mesAtualIdx)) {
        mesRef = { ...meses[mesAtualIdx], index: mesAtualIdx };
      } else {
        for (let i = meses.length - 1; i >= 0; i--) {
          if (temDados(i)) { mesRef = { ...meses[i], index: i }; break; }
        }
      }
    }

    if (!mesRef) throw new Error('Nenhum mês com dados completos encontrado');

    const orcado    = tabela['Orç 2026'][mesRef.index];
    const realizado = tabela['Real 2026'][mesRef.index];
    const variacao  = realizado - orcado;

    // ── ÁREA (m²) ──────────────────────────────────────────────────────────
    // A linha "TOTAL ÁREA COM IPTU E SEGURO" (a âncora, logo ACIMA da linha
    // de R$/m²) já traz a metragem mês a mês — a aba sempre teve esse número
    // e o código o ignorava, derivando a área por divisão
    // (Realizado ÷ R$/m²), o que amarrava duas abas uma na outra. Lendo
    // direto, o R$/m² de qualquer valor do deck passa a depender só da
    // BRIDGE (valores) + desta linha (área).
    //
    // COMO a área é obtida: NÃO lendo a linha "TOTAL ÁREA..." como se ela
    // trouxesse metragem — ela NÃO traz. Verificado nas três cidades: essa
    // linha guarda o TOTAL EM R$ do mês, e a linha logo abaixo é o R$/m²
    // correspondente. Em Mega Esteio, por exemplo, "TOTAL ÁREA - COM IPTU E
    // SEGURO" de janeiro é (308.679,60) e o "R$ M² MÊS- ESTEIO" logo abaixo
    // é (12,71) — 308.679,60 ÷ 12,71 = 24.286 m², a metragem real. Ler a
    // primeira linha como área dava ~300 mil "m²" e jogava todo R$/m² do
    // Bridge/DRE pra uma ordem de grandeza errada.
    //
    // Então a área sai da DIVISÃO das duas linhas, que é consistente por
    // construção e vale pras três cidades (a planilha é montada assim em
    // todas). Os valores vêm em formato contábil (negativos entre
    // parênteses), daí o Math.abs.
    //
    // Filtro de plausibilidade que sobra: a área é da ordem de
    // dezenas/centenas de milhares de m² — exigir > 1.000 descarta divisão
    // de célula vazia/ruído. E como cada mês produz sua própria estimativa,
    // uma variação grande entre elas denuncia dado inconsistente na aba: aí
    // a linha inteira é descartada e cai no cálculo derivado de
    // obterAreaM2_ (Realizado ÷ Custo R$/m²).
    const areaMeses = [];
    if (idxComIptu > 0) {
      meses.forEach(m => {
        // Em precisão total: a área divide TODO R$/m² do deck, então um
        // arredondamento aqui se propaga pro DRE e pro Bridge.
        // numeroCelula já devolve positivo (ver acima), então a divisão não
        // precisa se preocupar com o sinal contábil.
        const derivar = col => {
          const totalRs = numeroCelula(idxComIptu - 1, col);
          const rsPorM2 = numeroCelula(idxComIptu, col);
          if (totalRs == null || rsPorM2 == null || !(rsPorM2 > 0)) return null;
          const a = totalRs / rsPorM2;
          return isFinite(a) ? a : null;
        };
        const v = derivar(m.colReal);
        const w = v !== null && v > 1000 ? v : derivar(m.colOrc);
        areaMeses.push(w !== null && w > 1000 ? w : null);
      });
      const valores = areaMeses.filter(v => v != null);
      if (valores.length >= 2) {
        const min = Math.min.apply(null, valores), max = Math.max.apply(null, valores);
        if (max / min > 1.5) {
          Logger.log('obterDadosCustoM2: a área derivada (Total R$ ÷ R$/m²) varia demais entre os meses (' +
                     Math.round(min).toLocaleString('pt-BR') + ' a ' + Math.round(max).toLocaleString('pt-BR') +
                     ' m²) — a aba METRO QUADRADO provavelmente tem alguma linha inconsistente. ' +
                     'Ignorando; caindo no cálculo derivado.');
          areaMeses.length = 0;
          meses.forEach(() => areaMeses.push(null));
        }
      }
    }
    let area = areaMeses[mesRef.index];
    if (area == null) area = areaMeses.find(v => v != null) || null;   // mês sem área: usa a 1ª disponível
    if (area != null) Logger.log('obterDadosCustoM2: área lida da aba METRO QUADRADO → ' + Math.round(area) + ' m²');

    Logger.log('obterDadosCustoM2: OK → cidade=' + nomeCidade +
               ' | mês=' + mesRef.nomeMesExtenso + ' ' + mesRef.ano +
               ' | Orç=' + orcado + ' Real=' + realizado);

    const _resCusto = {
      referencia: {
        mes        : mesRef.nome,
        mesExtenso : mesRef.nomeMesExtenso,
        ano        : mesRef.ano,
        index      : mesRef.index,
        cidade     : nomeCidade
      },
      kpis: {
        custo    : realizado,
        meta     : orcado,
        variacao : Math.abs(variacao),
        status   : variacao <= 0 ? 'ABAIXO DO ORÇADO' : 'ACIMA DO ORÇADO',
        corStatus: variacao <= 0 ? '#00B050'           : '#D32F2F'
      },
      tabela,
      meses: meses.map(m => m.nome),
      area,        // m² do mês de referência (null se não deu pra ler)
      areaMeses    // m² mês a mês, na mesma ordem de `meses`
    };
    _custoM2Cache[_ckCusto] = _resCusto;
    return _resCusto;

  } catch (e) {
    Logger.log('Erro Custo M2: ' + e.message);
    return null;
  }
}

// ==========================================
// HELPERS DE m² DERIVADOS (para o financeiro e o bridge)
// ==========================================

// Custo por m² ACUMULADO = MÉDIA dos R$/m² mensais até o mês de referência
// (soma dos m² de cada mês ÷ nº de meses). Fonte: aba METRO QUADRADO.
// Retorna { orcado, realizado, meses } (números) ou null.
function obterCustoM2Acumulado_() {
  const cm = obterDadosCustoM2();
  if (!cm || !cm.tabela) return null;

  const keys  = Object.keys(cm.tabela);
  const kOrc  = keys.find(k => /^or[cç]/i.test(k));
  const kReal = keys.find(k => /^real/i.test(k) && !/sem iptu/i.test(k));
  const refIdx = cm.referencia.index;

  const media = arr => {
    if (!arr) return NaN;
    let soma = 0, n = 0;
    for (let i = 0; i <= refIdx && i < arr.length; i++) {
      const v = arr[i];
      if (v != null && !isNaN(v) && v > 0) { soma += Number(v); n++; }
    }
    return n > 0 ? soma / n : NaN;
  };

  const orc  = media(cm.tabela[kOrc]);
  const real = media(cm.tabela[kReal]);
  return {
    orcado    : isNaN(orc)  ? null : orc,
    realizado : isNaN(real) ? null : real,
    meses     : refIdx + 1
  };
}

// Recorte FIXO do 1º Quadrimestre (Jan–Abr), independente do mês de
// referência corrente — para o slide avulso Slide_CustoM2Quadrimestre.gs.
// O valor do quadrimestre é a MÉDIA dos 4 meses (mesma regra do acumulado
// anual: soma os R$/m² de cada mês e divide pelos meses com dado válido).
function obterDadosCustoM2Quadrimestre_() {
  const cm = obterDadosCustoM2();
  if (!cm || !cm.tabela || !cm.meses || cm.meses.length < 4) return null;

  const keys  = Object.keys(cm.tabela);
  const kOrc  = keys.find(k => /^or[cç]/i.test(k));
  const kReal = keys.find(k => /^real/i.test(k) && !/sem iptu/i.test(k));
  if (!kOrc || !kReal) return null;

  const arrOrc  = cm.tabela[kOrc]  || [];
  const arrReal = cm.tabela[kReal] || [];

  const numOu = v => (v != null && v !== '' && !isNaN(Number(v))) ? Number(v) : null;

  const NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril'];
  const meses = NOMES.map((nome, i) => {
    const orc  = numOu(arrOrc[i]);
    const real = numOu(arrReal[i]);
    return {
      nome,
      curto    : cm.meses[i] || nome.substring(0, 3).toUpperCase(),
      orc, real,
      variacao : (orc != null && real != null) ? real - orc : null
    };
  });

  const media = arr => {
    let soma = 0, n = 0;
    for (let i = 0; i < 4; i++) {
      const v = arr[i];
      if (v != null && v !== '' && !isNaN(Number(v)) && Number(v) > 0) { soma += Number(v); n++; }
    }
    return n > 0 ? soma / n : null;
  };

  const orcQuad  = media(arrOrc);
  const realQuad = media(arrReal);
  const varQuad  = (orcQuad != null && realQuad != null) ? realQuad - orcQuad : null;

  return {
    cidade: cm.referencia.cidade || getProjetoAtivo().nome,
    ano   : cm.referencia.ano || new Date().getFullYear(),
    meses,
    quadrimestre: {
      orc: orcQuad, real: realQuad, variacao: varQuad,
      status    : varQuad == null ? '-'                : (varQuad <= 0 ? 'ABAIXO DO ORÇADO' : 'ACIMA DO ORÇADO'),
      corStatus : varQuad == null ? CORES.textGray      : (varQuad <= 0 ? '#00B050'          : '#D32F2F')
    }
  };
}

// R$/m² Orçado e Real de CADA mês, indexado pelas 3 primeiras letras do mês
// ('jan' → { orc, real }). Usado pelo bridge para mostrar o m² por mês.
function obterCustoM2PorMes_() {
  const cm = obterDadosCustoM2();
  if (!cm || !cm.tabela) return {};

  const keys  = Object.keys(cm.tabela);
  const kOrc  = keys.find(k => /^or[cç]/i.test(k));
  const kReal = keys.find(k => /^real/i.test(k) && !/sem iptu/i.test(k));

  const mapa = {};
  (cm.meses || []).forEach((nome, i) => {
    const chave = String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').substring(0, 3);
    if (!chave) return;
    mapa[chave] = {
      orc  : cm.tabela[kOrc]  ? cm.tabela[kOrc][i]  : null,
      real : cm.tabela[kReal] ? cm.tabela[kReal][i] : null
    };
  });
  return mapa;
}


// ==========================================
// AUTO-VALOR DO SLIDE DE METAS (Slide_Metas.gs)
// ==========================================
// Três indicadores da tabela de Metas já são calculados pela apresentação:
//   ▸ CHECK-LIST/SLA        → SLA das Preventivas (mensal e acumulado)
//   ▸ ÍNDICE DE DISPONIBILIDADE → Corretivas (mensal e acumulado)
//   ▸ CUSTO M²              → aba METRO QUADRADO (mês ref. e média acumulada);
//     a parte "% das manutenções planejadas" ainda não tem fonte → fixa em 0%
//     quando a meta for composta (contém "/"). Quando houver a aba, trocamos.
// Este helper resolve o valor pelo Descrição da linha e devolve também a
// TENDÊNCIA vs mês anterior:
//   { valor:'R$ 4,62 / 0%', delta:+1.07, menorMelhor:true } ou null (sem match
//   ou sem dado — aí a célula da planilha da TV permanece como está).
function obterMetaAuto_(descricao, metaStr, qual) {
  const d = _histNorm_(descricao);
  const ehMensal = qual === 'mes';

  try {
    // CHECK-LIST / SLA (Preventivas) — exceto o SLA de Terceiros (do Analista)
    if ((d.includes('check') || d.includes('sla')) && !d.includes('terceiro') && !d.includes('acesso')) {
      const p = obterDadosPreventivas();
      const val = ehMensal ? p.mensal.sla : p.anual.sla;
      if (!val || val === '-') return null;
      const dv = deltaVsMesAnterior_(val, ehMensal ? 'SLA MENSAL' : 'SLA ACUMULADO', 'PREVENTIVAS');
      return { valor: String(val), delta: dv ? dv.delta : null, menorMelhor: false };
    }

    // ÍNDICE DE DISPONIBILIDADE (Histórico Validado — aba CHAMADOS)
    if (d.includes('disponibilidade')) {
      const nomeInd = ehMensal ? 'Índice de disponibilidade' : 'Índice de disponibilidade - ACUMULADO';
      const serie = lerHistoricoValidado(nomeInd, { aba: 'CHAMADOS' });
      if (serie && serie.length) {
        let ordRef = Infinity;
        try {
          const r = obterMesReferencia_();
          ordRef = r.ord || (r.ano * 100 + (r.index + 1));
        } catch (e) {}

        const iAlvo = serie.findIndex(s => s.ord === ordRef);
        const atual = iAlvo >= 0 ? serie[iAlvo] : serie[serie.length - 1];
        const idxAtual = serie.indexOf(atual);
        const prev = idxAtual > 0 ? serie[idxAtual - 1] : null;
        const delta = prev ? Math.round((atual.valor - prev.valor) * 100) / 100 : null;

        let valorStr = String(atual.bruto || atual.valor);
        if (!valorStr.includes('%') && !isNaN(Number(valorStr.replace(',', '.')))) {
          valorStr += '%';
        }
        return { valor: valorStr, delta: delta, menorMelhor: false };
      }

      const c = obterDadosCorretivasV6();
      if (!c) return null;
      const kpis = ehMensal ? c.mensal.kpis : c.anual.kpis;
      const kpi  = kpis.find(k => _histNorm_(k.l).includes('disponibilidade'));
      if (!kpi || kpi.v === '-' || kpi.v === '—') return null;
      const dv = deltaVsMesAnterior_(kpi.v,
        ehMensal ? 'Índice de disponibilidade' : 'Índice de disponibilidade - ACUMULADO', 'CHAMADOS');
      return { valor: String(kpi.v), delta: dv ? dv.delta : null, menorMelhor: false };
    }

    // CUSTO M² (menor = melhor); tendência vem da própria aba METRO QUADRADO
    if (d.includes('custo') && (d.includes('m2') || d.includes('m²'))) {
      const cm = obterDadosCustoM2();
      if (!cm) return null;
      const keys  = Object.keys(cm.tabela);
      const kReal = keys.find(k => /^real/i.test(k) && !/sem iptu/i.test(k));
      const arr   = (kReal && cm.tabela[kReal]) || [];
      const i     = cm.referencia.index;

      let valorNum, metaNum, delta = null;
      if (ehMensal) {
        valorNum = cm.kpis.custo;
        metaNum  = cm.kpis.meta;           // Orçado do mês de referência
        if (i > 0 && arr[i] != null && arr[i - 1] != null) {
          delta = Math.round((Number(arr[i]) - Number(arr[i - 1])) * 100) / 100;
        }
      } else {
        const ac = obterCustoM2Acumulado_();
        if (!ac || ac.realizado == null) return null;
        valorNum = ac.realizado;
        metaNum  = ac.orcado;              // Orçado acumulado (média até o mês ref) — mesma
                                            // conta usada no card "ORÇADO ACUM." do Financeiro
        // média acumulada até o mês ref vs média até o mês anterior
        const media = fim => {
          let s = 0, n = 0;
          for (let j = 0; j <= fim && j < arr.length; j++) {
            const v = arr[j];
            if (v != null && !isNaN(v) && v > 0) { s += Number(v); n++; }
          }
          return n ? s / n : NaN;
        };
        const mPrev = media(i - 1);
        if (!isNaN(mPrev)) delta = Math.round((valorNum - mPrev) * 100) / 100;
      }

      let valor = formatarMoedaSlide(valorNum);
      let metaValor = metaNum != null ? formatarMoedaSlide(metaNum) : null;

      // Meta composta (ex.: "R$ 4,21 / 80%") → a parte "% das manutenções
      // planejadas" vem da planilha de PPC (obterDadosPPC_, ppcId em
      // 01_Config.gs). Cidade sem ppcId ainda → mantém o valor digitado
      // manualmente na planilha da TV (metaStr), como antes.
      const barra = String(metaStr || '').indexOf('/');
      let delta2 = null, menorMelhor2 = false;
      if (barra >= 0) {
        const ppc = obterDadosPPC_();
        const p   = ppc && ppc[i];
        if (p && !isNaN(p.aderencia) && !isNaN(p.acumulado)) {
          const pctAtual = ehMensal ? p.aderencia : p.acumulado;
          valor += ' / ' + formatarNumeroBR(Math.round(pctAtual * 100) / 100) + '%';
          metaValor = metaValor != null && !isNaN(p.meta)
            ? metaValor + ' / ' + formatarNumeroBR(Math.round(p.meta * 100) / 100) + '%'
            : metaValor;

          const pAnt = i > 0 ? ppc[i - 1] : null;
          const pctAnt = pAnt ? (ehMensal ? pAnt.aderencia : pAnt.acumulado) : null;
          if (pctAnt != null && !isNaN(pctAnt)) delta2 = Math.round((pctAtual - pctAnt) * 100) / 100;
          menorMelhor2 = false;   // % de manutenções planejadas: maior = melhor
        } else {
          valor += ' / 0%';
          if (metaValor != null) metaValor += ' / ' + String(metaStr).slice(barra + 1).trim();
        }
      }
      return { valor, metaValor, delta, delta2, menorMelhor: true, menorMelhor2 };
    }

    // CHECK-LIST/SLA - TERCEIROS (Analista) — aba META da própria planilha da cidade
    if (d.includes('terceiro')) {
      const serie = _lerSerieMetaAnalista_(txt => _histNorm_(txt).includes('terceiro'));
      if (!serie.length) return null;
      const ref = obterMesReferencia_();
      const refOrd = ref.ano * 100 + (ref.index + 1);
      const atual = serie.find(s => s.ord === refOrd);
      if (!atual) return null;
      const val = ehMensal ? atual.mes : atual.acum;
      if (val == null || isNaN(val)) return null;

      const anteriores = serie.filter(s => s.ord < refOrd);
      let delta = null;
      if (anteriores.length) {
        const prev = anteriores[anteriores.length - 1];
        const pval = ehMensal ? prev.mes : prev.acum;
        if (pval != null && !isNaN(pval)) delta = Math.round((val - pval) * 100) / 100;
      }
      return { valor: formatarNumeroBR(val), delta, menorMelhor: false };
    }

    // TAXA DE REABERTURA (Analista) — planilha "MEGA <CIDADE> FACILITIES"
    // (reaberturaId em 01_Config.gs), aba TAXA DE ABERTURA (FECHADOS/REABERTOS por mês)
    if (d.includes('reabertura')) {
      const serie = obterDadosTaxaReabertura_();
      if (!serie || !serie.length) return null;
      const ref = obterMesReferencia_();
      const refOrd = ref.ano * 100 + (ref.index + 1);
      const idx = serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) return null;

      const pctAte = fim => {
        let f = 0, r = 0;
        for (let j = 0; j <= fim; j++) {
          if (!isNaN(serie[j].fechados))  f += serie[j].fechados;
          if (!isNaN(serie[j].reabertos)) r += serie[j].reabertos;
        }
        return f > 0 ? (r / f) * 100 : null;
      };

      let valorNum, valorPrevNum = null;
      if (ehMensal) {
        const f = serie[idx].fechados, r = serie[idx].reabertos;
        valorNum = (!isNaN(f) && f > 0) ? (r / f) * 100 : (f === 0 ? 0 : null);
        if (idx > 0) {
          const fp = serie[idx - 1].fechados, rp = serie[idx - 1].reabertos;
          valorPrevNum = (!isNaN(fp) && fp > 0) ? (rp / fp) * 100 : (fp === 0 ? 0 : null);
        }
      } else {
        valorNum = pctAte(idx);
        if (idx > 0) valorPrevNum = pctAte(idx - 1);
      }
      if (valorNum == null) return null;

      let delta = null;
      if (valorPrevNum != null) delta = Math.round((valorNum - valorPrevNum) * 100) / 100;

      return { valor: formatarNumeroBR(Math.round(valorNum * 100) / 100), delta, menorMelhor: true };
    }

    // CUMPRIR ORÇAMENTO (Analista) — soma de rubricas na aba FINANCEIRO BRIDGE
    // (Energia Elétrica, Água, Telefone, Material de Consumo, Materiais de
    // Informática); acima do orçado = vermelho, abaixo = verde (feito pelo
    // motor de status existente, comparando Real vs Meta pelo Sentido "<=").
    if (d.includes('orcamento') || d.includes('orçamento')) {
      const od = obterDadosOrcamentoAnalista_();
      if (!od || !od.serie.length) return null;
      const ref = obterMesReferencia_();
      const refOrd = ref.ano * 100 + (ref.index + 1);
      const idx = od.serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) return null;

      const somaAte = (campo, fim) => od.serie.slice(0, fim + 1).reduce((s, m) => s + m[campo], 0);

      let orcVal, realVal, orcPrev = null, realPrev = null;
      if (ehMensal) {
        orcVal = od.serie[idx].orc; realVal = od.serie[idx].real;
        if (idx > 0) { orcPrev = od.serie[idx - 1].orc; realPrev = od.serie[idx - 1].real; }
      } else {
        orcVal = somaAte('orc', idx); realVal = somaAte('real', idx);
        if (idx > 0) { orcPrev = somaAte('orc', idx - 1); realPrev = somaAte('real', idx - 1); }
      }

      let delta = null;
      if (realPrev != null) delta = Math.round((realVal - realPrev) * 100) / 100;

      return {
        valor: formatarMoedaSlideSemCentavos_(realVal),
        metaValor: formatarMoedaSlideSemCentavos_(orcVal),
        delta,
        menorMelhor: true
      };
    }
  } catch (e) {
    Logger.log('obterMetaAuto_("' + descricao + '"): ' + e.message);
  }
  return null;
}


// ==========================================
// FONTES AUXILIARES — METAS DO ANALISTA (obterMetaAuto_ acima)
// ==========================================

// Lê a aba META da PRÓPRIA planilha da cidade (mesma de DADOS/PREVENTIVAS):
// colunas MÊS (MM/AAAA) | CARGO | META | RESULTADO MÊS | RESULTADO ACUMULADO.
// Filtra por CARGO contendo "analista" e pela descrição (matchFn). Quando há
// mais de uma linha para o mesmo mês, a ÚLTIMA da planilha vence (correção).
// Retorna [{ord, mes, acum}] ordenado por mês.
function _lerSerieMetaAnalista_(matchFn) {
  const saida = [];
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('META');
    if (!sheet) return saida;
    const ultima = sheet.getLastRow();
    if (ultima < 2) return saida;

    const dados  = sheet.getRange(2, 1, ultima - 1, 5).getDisplayValues();
    const porOrd = {};
    dados.forEach(l => {
      const cargo = _histNorm_(l[1]);
      if (!cargo.includes('analista')) return;
      if (!matchFn(l[2])) return;
      const pm = _histParseMes_(String(l[0] || '').trim());
      if (!pm) return;
      const vMes  = _histNum_(l[3]);
      const vAcum = _histNum_(l[4]);
      if (isNaN(vMes) && isNaN(vAcum)) return;
      porOrd[pm.ord] = { ord: pm.ord, mes: vMes, acum: vAcum };   // última linha vence
    });
    Object.keys(porOrd).forEach(k => saida.push(porOrd[k]));
    saida.sort((a, b) => a.ord - b.ord);
  } catch (e) {
    Logger.log('_lerSerieMetaAnalista_: ' + e.message);
  }
  return saida;
}

// Lê a planilha externa "MEGA <CIDADE> FACILITIES" (reaberturaId em
// 01_Config.gs), aba TAXA DE ABERTURA: uma linha FECHADOS e uma REABERTOS,
// um mês por coluna (cabeçalho tipo "jan. de 2026"). Retorna
// [{ord, fechados, reabertos}] ordenado por mês, ou null se a cidade não
// tiver reaberturaId configurado ou a aba não existir.
function obterDadosTaxaReabertura_() {
  const id = getProjetoAtivo().reaberturaId;
  if (!id) return null;
  try {
    const ss    = SpreadsheetApp.openById(id);
    const sheet = ss.getSheetByName('TAXA DE ABERTURA') || ss.getSheetByName('TAXA DE REABERTURA');
    if (!sheet) return null;
    const data = sheet.getDataRange().getDisplayValues();

    let rFechados = -1, rReabertos = -1;
    for (let r = 0; r < data.length; r++) {
      const lbl = _histNorm_(data[r][0] || data[r][1] || '');
      if (rFechados < 0  && lbl.includes('fechado'))  rFechados  = r;
      if (rReabertos < 0 && lbl.includes('reaberto')) rReabertos = r;
    }
    if (rFechados < 0 || rReabertos < 0) return null;
    const hdrRow = Math.min(rFechados, rReabertos) - 1;
    if (hdrRow < 0) return null;

    const MESES_VALIDOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const cols = [];
    data[hdrRow].forEach((cell, c) => {
      const norm = _histNorm_(cell);
      const m = norm.match(/^([a-z]{3})[a-z]*\.?\s*de\s*(\d{4})/);
      if (!m) return;
      const idxMes = MESES_VALIDOS.indexOf(m[1]);
      if (idxMes < 0) return;
      cols.push({ c, ord: parseInt(m[2], 10) * 100 + (idxMes + 1) });
    });
    if (!cols.length) return null;
    cols.sort((a, b) => a.ord - b.ord);

    return cols.map(g => ({
      ord      : g.ord,
      fechados : _histNum_(data[rFechados][g.c]),
      reabertos: _histNum_(data[rReabertos][g.c])
    }));
  } catch (e) {
    Logger.log('obterDadosTaxaReabertura_: ' + e.message);
    return null;
  }
}

// Converte "80,00%" / "200,00%" → 80 / 200 (número, escala 0-100+).
function _histPct_(v) {
  return _histNum_(String(v == null ? '' : v).replace('%', ''));
}

// Lê a planilha externa de PPC — Plano de Preventivas Cumprido (ppcId em
// 01_Config.gs), aba DASHBOARD: linha 4 = mês (JANEIRO..DEZEMBRO, uma coluna
// por mês), linha 7 = aderência % do mês, linha 8 = meta %, linha 9 =
// acumulado %. É a fonte da parte "% das manutenções planejadas" da meta
// composta Custo M² (ver obterMetaAuto_). Retorna um array indexado por mês
// (0=Janeiro..11=Dezembro) com { aderencia, meta, acumulado }, ou null se a
// cidade não tiver ppcId configurado ou a aba não existir/tiver o formato
// esperado.
function obterDadosPPC_() {
  const id = getProjetoAtivo().ppcId;
  if (!id) return null;
  try {
    const ss    = SpreadsheetApp.openById(id);
    const sheet = ss.getSheetByName('DASHBOARD');
    if (!sheet) return null;
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 9) return null;

    const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const linhaMes       = data[3];   // linha 4
    const linhaAderencia = data[6];   // linha 7
    const linhaMeta      = data[7];   // linha 8
    const linhaAcumulado = data[8];   // linha 9

    const porMes = [];
    linhaMes.forEach((cell, c) => {
      const idxMes = MESES.indexOf(_histNorm_(cell));
      if (idxMes < 0) return;
      porMes[idxMes] = {
        aderencia: _histPct_(linhaAderencia[c]),
        meta:      _histPct_(linhaMeta[c]),
        acumulado: _histPct_(linhaAcumulado[c])
      };
    });
    return porMes.length ? porMes : null;
  } catch (e) {
    Logger.log('obterDadosPPC_: ' + e.message);
    return null;
  }
}


// ==========================================
// DRE — DEMONSTRATIVO DE RESULTADO (Slide_DRE.gs)
// ==========================================
// Lê a aba FINANCEIRO BRIDGE POR RUBRICA (as outras leituras usam só o
// TOTAL) e consolida quatro recortes por linha contábil:
//   mes      → Orç/Real do mês de referência da apresentação
//   acum     → soma Jan..mês de referência
//   anual    → soma dos 12 meses usando a coluna Real/Ritmo tal como está na
//              planilha (Real nos meses fechados, Ritmo nos futuros) =
//              "Realizado + Ritmo", a projeção pelo ritmo atual
//   anualOrc → soma dos 12 meses, mas nos meses futuros usa o Orçado (não o
//              Ritmo) = "Realizado + Orçado", a projeção pelo plano original
// Retorna { mesLabel, mesesAcum, rubricas:[{nome, mes, acum, anual,
// anualOrc}], total } ou null. Rubricas 100% zeradas ficam de fora. Nomes
// normalizados via padronizarRubrica_ (01_Config.gs).

// ── Categorias do DRE (agrupamento fixo por rubrica) ────────────────────────
// A pedido do gestor: mostrar o DRE agrupado por categoria contábil em vez
// de lista solta ordenada por tamanho. Mapeamento FIXO aqui no código (não
// vem de planilha — combinado assim porque a categorização em si não muda
// mês a mês). Rubrica da FINANCEIRO BRIDGE que não constar em nenhuma
// categoria cai em "Outras Despesas" — nunca some do relatório.
// A ORDEM das rubricas dentro de cada categoria aqui é a ORDEM EM QUE ELAS
// APARECEM NO SLIDE — fixa, igual todo mês. Antes a tabela era ordenada por
// valor (materialidade), então as linhas trocavam de lugar de um mês pro
// outro e ficava difícil comparar; agora a posição é sempre a mesma.
const DRE_CATEGORIAS = [
  { nome: 'Despesas com Pessoal e Administrativas', itens: [
    'Despesa de pessoal', 'cursos e seminarios', 'despesa com passagens',
    'despesas com hospedagem', 'representação e refeição', 'despesa com taxi',
    'locação de veículos', 'despesa com combustiveis',
    'quilometragem, estacionamento e pedágio', 'despesas c/veiculos',
    'bens de pequeno valor', 'outras despesas administrativas'
  ] },
  { nome: 'Serviços de Terceiros', itens: [
    'Assistência jurídica', 'Segurança vigilância', 'Assistencia informatica',
    'consultoria assessoria', 'serviços diversos', 'propaganda e publicidade'
  ] },
  { nome: 'Manutenção e Conservação', itens: [
    'limpeza e conservação', 'manutenção imóveis', 'manutenção de bens móveis',
    'Materiais de Informática'
  ] },
  { nome: 'Utilities, Taxas e Consumo', itens: [
    'Energia eletrica', 'água', 'telefone', 'material consumo',
    'outras taxas e impostos', 'IPTU', 'SEGURO'
  ] }
];

// Rede de segurança: cada planilha escreve a rubrica de um jeito ("Consultoria
// e assessoria", "Consultoria/assessoria"...). Quando a chave exata não bate,
// tentamos por PALAVRA-CHAVE contida no nome — assim a rubrica cai na
// categoria certa mesmo com a grafia variando entre as cidades.
const DRE_CATEGORIA_PALAVRAS = [
  { termo: 'consultoria',   categoria: 'Serviços de Terceiros' },
  { termo: 'assessoria',    categoria: 'Serviços de Terceiros' },
  { termo: 'pequeno valor', categoria: 'Despesas com Pessoal e Administrativas' }
];

// chave normalizada (_histNorm_) → { categoria, ordem }. Índice construído
// uma única vez (cache em módulo) a partir de DRE_CATEGORIAS acima. A ordem
// é o índice global do item no mapa: garante posição fixa no slide.
let _dreIndicePorChave_ = null;
function _dreIndice_() {
  if (!_dreIndicePorChave_) {
    _dreIndicePorChave_ = {};
    let ordem = 0;
    DRE_CATEGORIAS.forEach(cat => {
      cat.itens.forEach(item => {
        _dreIndicePorChave_[_histNorm_(item)] = { categoria: cat.nome, ordem: ordem++ };
      });
    });
  }
  return _dreIndicePorChave_;
}

function dreCategoriaDe_(chave) {
  const achado = _dreIndice_()[chave];
  if (achado) return achado.categoria;
  const porPalavra = DRE_CATEGORIA_PALAVRAS.find(p => String(chave).indexOf(p.termo) >= 0);
  // Sem categoria conhecida a rubrica ainda aparece (em "Outras Despesas"):
  // é dado financeiro, sumir em silêncio seria pior do que aparecer solto.
  return porPalavra ? porPalavra.categoria : 'Outras Despesas';
}

// Posição fixa da rubrica no slide. Rubrica fora do mapa vai para o fim.
function dreOrdemDe_(chave) {
  const achado = _dreIndice_()[chave];
  if (achado) return achado.ordem;
  const porPalavra = DRE_CATEGORIA_PALAVRAS.find(p => String(chave).indexOf(p.termo) >= 0);
  if (!porPalavra) return 9999;
  // Casou por palavra-chave: entra logo depois do último item da categoria.
  const cat = DRE_CATEGORIAS.find(c => c.nome === porPalavra.categoria);
  const ultimo = cat ? _dreIndice_()[_histNorm_(cat.itens[cat.itens.length - 1])] : null;
  return ultimo ? ultimo.ordem + 0.5 : 9998;
}

function obterDadosDRE_() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('FINANCEIRO BRIDGE');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;

    const toAbs = v => Math.abs(typeof v === 'number' ? v : 0);

    let hdrRow = -1;
    for (let r = 0; r < Math.min(5, data.length); r++) {
      if (data[r].some(c => /^or[cç]/i.test(_histNorm_(c)))) { hdrRow = r; break; }
    }
    if (hdrRow < 0) return null;
    const hdr = data[hdrRow];

    const MESES_VALIDOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const grupos = [];
    for (let c = 1; c + 1 < hdr.length; c += 3) {
      if (!/^or[cç]/.test(_histNorm_(hdr[c]))) break;
      const m = String(hdr[c]).match(/([A-Za-zçÇ]{3})\/(\d{2,4})/);
      if (!m) continue;
      const idxMes = MESES_VALIDOS.indexOf(m[1].toLowerCase());
      if (idxMes < 0) continue;
      const ano2 = m[2].length === 2 ? m[2] : m[2].slice(-2);
      grupos.push({ ord: (2000 + parseInt(ano2, 10)) * 100 + (idxMes + 1), cOrc: c, cReal: c + 1 });
    }
    if (!grupos.length) return null;
    grupos.sort((a, b) => a.ord - b.ord);

    const ref    = obterMesReferencia_();
    let   refOrd = ref.ano * 100 + (ref.index + 1);
    // Fallback: se o mês de referência não existir na aba, usa o último mês disponível
    if (!grupos.some(g => g.ord === refOrd)) refOrd = grupos[grupos.length - 1].ord;

    const consolidar = linha => {
      const blocos = {
        mes: { orc: 0, real: 0 }, acum: { orc: 0, real: 0 },
        anual: { orc: 0, real: 0 }, anualOrc: { orc: 0, real: 0 }
      };
      grupos.forEach(g => {
        const orc = toAbs(linha[g.cOrc]), real = toAbs(linha[g.cReal]);
        const futuro = g.ord > refOrd;
        blocos.anual.orc += orc; blocos.anual.real += real;
        blocos.anualOrc.orc += orc; blocos.anualOrc.real += futuro ? orc : real;
        if (g.ord <= refOrd) { blocos.acum.orc += orc; blocos.acum.real += real; }
        if (g.ord === refOrd) { blocos.mes.orc = orc; blocos.mes.real = real; }
      });
      return blocos;
    };

    // Algumas planilhas (ex.: Itajaí) têm uma SEGUNDA tabela auxiliar logo
    // depois da linha TOTAL, repetindo as mesmas rubricas (valores em
    // positivo, sem parênteses) — provavelmente uma área de apoio/rascunho.
    // Por isso PARAMOS de ler assim que a linha TOTAL aparece: nada depois
    // dela pertence à tabela principal de despesas.
    const porChave = {};
    let totalLinha = null;
    for (let r = hdrRow + 1; r < data.length; r++) {
      const nome = String(data[r][0] || '').trim();
      if (!nome) continue;
      const chave = _histNorm_(nome);
      if (chave.includes('total')) { totalLinha = consolidar(data[r]); break; }
      const b = consolidar(data[r]);
      const temValor = b.anual.orc !== 0 || b.anual.real !== 0;
      if (!temValor) continue;
      const nova = { nome: padronizarRubrica_(nome), _chave: chave, categoria: dreCategoriaDe_(chave), _ordem: dreOrdemDe_(chave), mes: b.mes, acum: b.acum, anual: b.anual, anualOrc: b.anualOrc };
      const existente = porChave[chave];
      if (!existente) {
        porChave[chave] = nova;
      } else {
        const pesoExistente = Math.abs(existente.anual.orc) + Math.abs(existente.anual.real);
        const pesoNova      = Math.abs(nova.anual.orc)      + Math.abs(nova.anual.real);
        Logger.log('obterDadosDRE_: rubrica duplicada na FINANCEIRO BRIDGE — "' + nome +
                   '" aparece mais de uma vez; usando a linha com dado mais completo.');
        if (pesoNova > pesoExistente) porChave[chave] = nova;
      }
    }
    const rubricas = Object.keys(porChave).map(k => porChave[k]);
    if (!rubricas.length) return null;

    // ORDEM FIXA (posição no mapa DRE_CATEGORIAS), não por valor: assim a
    // tabela tem sempre as mesmas linhas nos mesmos lugares, mês após mês —
    // dá pra comparar duas apresentações lado a lado sem procurar a rubrica.
    // Empate (rubricas fora do mapa) desempata por nome, p/ ficar estável.
    rubricas.sort((a, b) => (a._ordem - b._ordem) || a.nome.localeCompare(b.nome, 'pt-BR'));

    // TOTAL: SEMPRE a soma das rubricas, nunca a linha "TOTAL" da planilha.
    //
    // FONTE ÚNICA do financeiro: uma tabela cujo TOTAL não fecha com as
    // próprias linhas se contradiz na cara do leitor. No deck de julho/2026
    // a linha TOTAL da FINANCEIRO BRIDGE trazia R$ 2.192 a mais no mês e no
    // acumulado do que a soma das suas rubricas — e é a SOMA que bate com
    // duas fontes independentes: a aba FINANCEIRO/FINANCEIRO ANUAL (conferida
    // rubrica a rubrica) e a aba METRO QUADRADO no ano. Somando, o DRE, o
    // Bridge e o Resultado Operacional passam a mostrar o mesmo número.
    //
    // A linha da planilha continua sendo lida e devolvida em `totalPlanilha`
    // — o slide de CHECK compara as duas e segue avisando quando a planilha
    // de origem discorda (se ele comparasse o total já corrigido com a soma,
    // a checagem viraria sempre verdadeira e esconderia o problema).
    const totalPlanilha = totalLinha;
    totalLinha = { mes: { orc: 0, real: 0 }, acum: { orc: 0, real: 0 }, anual: { orc: 0, real: 0 }, anualOrc: { orc: 0, real: 0 } };
    rubricas.forEach(rb => {
      ['mes', 'acum', 'anual', 'anualOrc'].forEach(k => {
        totalLinha[k].orc += rb[k].orc; totalLinha[k].real += rb[k].real;
      });
    });

    // ── ANO ANTERIOR (2025), na MESMA janela de cada bloco — aba "Financeiro
    // 2025" (opcional; mesma estrutura da FINANCEIRO BRIDGE). Sem ela, os
    // três campos ficam null e a coluna "2025" mostra "—" sem quebrar nada.
    const aa = _lerAnoAnterior_();
    const somaAA = (arr, ini, fim) => arr ? arr.slice(ini, fim + 1).reduce((s, v) => s + v, 0) : null;
    rubricas.forEach(rb => {
      const arr = (aa && aa.porChave[rb._chave]) || null;
      rb.aaMes  = arr ? arr[ref.index] : null;
      rb.aaAcum = arr ? somaAA(arr, 0, ref.index) : null;
      rb.aaAno  = arr ? somaAA(arr, 0, 11) : null;
    });
    totalLinha.aaMes  = aa ? aa.total[ref.index]      : null;
    totalLinha.aaAcum = aa ? somaAA(aa.total, 0, ref.index) : null;
    totalLinha.aaAno  = aa ? somaAA(aa.total, 0, 11)  : null;

    const mesesAcum = grupos.filter(g => g.ord <= refOrd).length;
    return {
      cidade   : getProjetoAtivo().nome,
      ano      : ref.ano,
      mesLabel : ref.curto + '/' + String(ref.ano).slice(-2),
      mesesAcum,
      rubricas,
      total         : totalLinha,      // soma das rubricas (o que o deck exibe)
      totalPlanilha : totalPlanilha    // linha "TOTAL" crua da aba, só pro CHECK
    };
  } catch (e) {
    Logger.log('obterDadosDRE_: ' + e.message);
    return null;
  }
}

// Lê os 12 meses de Realizado na aba "Financeiro 2025" — mesma estrutura de
// colunas da FINANCEIRO BRIDGE, só que com o ano 2025 — SEM somar, pra que
// obterDadosDRE_ monte a janela certa pra cada bloco (mês, acumulado, ano
// inteiro). Casa as rubricas pelo NOME normalizado (mesma chave usada em
// obterDadosDRE_). Opcional: retorna null se a aba não existir (a coluna
// "2025" simplesmente mostra "—").
function _lerAnoAnterior_() {
  try {
    const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    // O slide rotula a coluna com (ano de referência − 1), então a aba
    // procurada acompanha o ano: em 2027 passa a ler "Financeiro 2026".
    // Mantém "Financeiro 2025" como alternativa para não quebrar hoje.
    let anoAnterior = 2025;
    try { anoAnterior = obterMesReferencia_().ano - 1; } catch (e) {}
    const sheet = ss.getSheetByName('Financeiro ' + anoAnterior)
               || ss.getSheetByName('Financeiro 2025');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;

    const toAbs = v => Math.abs(typeof v === 'number' ? v : 0);
    let hdrRow = -1;
    for (let r = 0; r < Math.min(5, data.length); r++) {
      if (data[r].some(c => /^or[cç]/i.test(_histNorm_(c)))) { hdrRow = r; break; }
    }
    if (hdrRow < 0) return null;
    const hdr = data[hdrRow];

    const MESES_VALIDOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const grupos = [];
    for (let c = 1; c + 1 < hdr.length; c += 3) {
      if (!/^or[cç]/.test(_histNorm_(hdr[c]))) break;
      const m = String(hdr[c]).match(/([A-Za-zçÇ]{3})\//);
      if (!m) continue;
      const idxMes = MESES_VALIDOS.indexOf(m[1].toLowerCase());
      if (idxMes < 0) continue;
      grupos.push({ mi: idxMes, cReal: c + 1 });
    }
    if (!grupos.length) return null;

    const porChave = {};
    let total = null;
    for (let r = hdrRow + 1; r < data.length; r++) {
      const nome = String(data[r][0] || '').trim();
      if (!nome) continue;
      const chave = _histNorm_(nome);
      if (chave.indexOf('r$ m') === 0) continue;   // linhas de R$/m² não são rubricas
      const vals = new Array(12).fill(0);
      grupos.forEach(g => { vals[g.mi] = toAbs(data[r][g.cReal]); });
      // Para na linha TOTAL — como na FINANCEIRO BRIDGE, pode haver uma
      // tabela auxiliar repetindo as rubricas logo depois (ver obterDadosDRE_).
      if (chave.includes('total')) { total = vals; break; }
      if (!porChave[chave]) porChave[chave] = new Array(12).fill(0);
      grupos.forEach(g => { porChave[chave][g.mi] += vals[g.mi]; });
    }
    // Sem linha TOTAL na aba, soma as rubricas (mesma saída de emergência que
    // obterDadosDRE_ usa). Antes ficava 12 zeros e a linha DESPESAS
    // OPERACIONAIS — a mais visível do slide — mostrava 2025 = 0.
    if (!total) {
      total = new Array(12).fill(0);
      Object.keys(porChave).forEach(k => {
        porChave[k].forEach((v, i) => { total[i] += v; });
      });
    }
    return { porChave, total };
  } catch (e) {
    Logger.log('_lerAnoAnterior_: ' + e.message);
    return null;
  }
}

// Soma, por mês, o Orçado e o Real das rubricas "Energia Elétrica", "Água",
// "Telefone", "Material de Consumo" e "Materiais de Informática" na aba
// FINANCEIRO BRIDGE (mesma estrutura de colunas usada por obterDadosBridge,
// em Slide06_FinanceiroBridge.gs: trincas Orç|Real|Variação por mês).
// Retorna { serie: [{ord, orc, real}] } ordenado por mês, ou null.
function obterDadosOrcamentoAnalista_() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('FINANCEIRO BRIDGE');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;

    const toAbs = v => Math.abs(typeof v === 'number' ? v : 0);

    let hdrRow = -1;
    for (let r = 0; r < Math.min(5, data.length); r++) {
      if (data[r].some(c => /^or[cç]/i.test(_histNorm_(c)))) { hdrRow = r; break; }
    }
    if (hdrRow < 0) return null;
    const hdr = data[hdrRow];

    const MESES_VALIDOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const grupos = [];
    for (let c = 1; c + 1 < hdr.length; c += 3) {
      if (!/^or[cç]/.test(_histNorm_(hdr[c]))) break;
      const m = String(hdr[c]).match(/([A-Za-zçÇ]{3})\/(\d{2,4})/);
      if (!m) continue;
      const idxMes = MESES_VALIDOS.indexOf(m[1].toLowerCase());
      if (idxMes < 0) continue;
      const ano2 = m[2].length === 2 ? m[2] : m[2].slice(-2);
      grupos.push({ ord: (2000 + parseInt(ano2, 10)) * 100 + (idxMes + 1), cOrc: c, cReal: c + 1 });
    }
    if (!grupos.length) return null;

    // Rubricas-alvo: casamento por palavras-chave (radical "materia" cobre
    // "material" E "materiais"). Informática entra nas DUAS formas —
    // "Materiais de Informática" e "Assistência de Informática".
    const bateRubrica = norm => {
      if (norm.includes('energia') && norm.includes('eletric'))          return true;
      if (norm === 'agua' || norm.indexOf('agua') === 0)                 return true;
      if (norm.includes('telefon'))                                     return true;
      if (norm.includes('materia') && norm.includes('consumo'))         return true;
      if (norm.includes('informatic'))                                  return true;  // materiais e assistência de informática
      return false;
    };

    const linhasAlvo = [];
    for (let r = hdrRow + 1; r < data.length; r++) {
      const norm = _histNorm_(data[r][0]);
      if (norm && bateRubrica(norm)) linhasAlvo.push(r);
    }
    if (!linhasAlvo.length) return null;

    const serie = grupos
      .map(g => {
        let orc = 0, real = 0;
        linhasAlvo.forEach(r => { orc += toAbs(data[r][g.cOrc]); real += toAbs(data[r][g.cReal]); });
        return { ord: g.ord, orc, real };
      })
      .sort((a, b) => a.ord - b.ord);

    return { serie };
  } catch (e) {
    Logger.log('obterDadosOrcamentoAnalista_: ' + e.message);
    return null;
  }
}


// ==========================================
// HELPERS INTERNOS - CUSTO M²
// ==========================================

function extrairMesesCustoM2_(headerRow) {
  const meses   = [];
  const mapaMes = {
    jan: 'Jan', fev: 'Fev', mar: 'Mar', abr: 'Abr',
    mai: 'Mai', jun: 'Jun', jul: 'Jul', ago: 'Ago',
    set: 'Set', out: 'Out', nov: 'Nov', dez: 'Dez'
  };
  const MESES_VALIDOS = Object.keys(mapaMes);

  for (let c = 1; c < headerRow.length; c += 3) {
    const txt = String(headerRow[c] || '').trim();
    const m   = txt.match(/Orç\s+([A-Za-zçÇ]{3})\/(\d{2,4})/i);
    if (!m) continue;

    const mesKey = normalizarTextoCusto_(m[1]).substring(0, 3);
    if (MESES_VALIDOS.indexOf(mesKey) < 0) continue;   // ignora "Ano/26" e afins

    const ano = normalizarAnoCusto_(m[2]);

    meses.push({
      nome           : mapaMes[mesKey],
      nomeMesExtenso : nomeMesExtensoCusto_(mesKey),
      ano,
      colOrc  : c,
      colReal : c + 1,
      colVar  : c + 2
    });
  }

  return meses;
}

function normalizarTextoCusto_(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumeroCusto_(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  let s = String(valor).trim();
  if (!s) return null;
  s = s
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/[()]/g, '')     // negativos como "(432.621,10)" → "432.621,10"
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.abs(n);
}

function normalizarAnoCusto_(anoTxt) {
  const ano = String(anoTxt || '').trim();
  return ano.length === 2 ? '20' + ano : ano;
}

function nomeMesExtensoCusto_(mes3) {
  const mapa = {
    jan: 'Janeiro',   fev: 'Fevereiro', mar: 'Março',    abr: 'Abril',
    mai: 'Maio',      jun: 'Junho',     jul: 'Julho',     ago: 'Agosto',
    set: 'Setembro',  out: 'Outubro',   nov: 'Novembro',  dez: 'Dezembro'
  };
  return mapa[mes3] || mes3;
}


// ==========================================
// UTILITÁRIOS GERAIS DE FORMATAÇÃO
// ==========================================

function formatarTempo(val) {
  if (!val || val === '-' || val === '') return '-';
  let s = String(val).trim();
  // Já formatado como tempo ("5m45s", "08:30", "12h") → devolve como está.
  // Só anexa "h" quando o valor é PURAMENTE numérico.
  if (/[hms:]/i.test(s)) return s;
  if (/^-?\d+([.,]\d+)?$/.test(s)) return s + 'h';
  return s;
}

function formatarPorcentagem(val) {
  if (!val && val !== 0) return '-';
  let s = String(val);
  if (!s.includes('%') && !isNaN(parseFloat(s))) {
    let n = parseFloat(s);
    if (n <= 1 && n !== 0) n = n * 100;
    // Valor cru (ex.: "99,41%"), não arredondado para inteiro — o
    // comparativo (deltaVsMesAnterior_) parte deste mesmo valor, então
    // arredondar aqui também distorcia a tendência ▲/▼ mostrada nos slides.
    return formatarNumeroBR(Math.round(n * 100) / 100) + '%';
  }
  return s;
}


// ==========================================
// DADOS DOCUMENTOS INQUILINOS (Slide 11 - Documentação Legal)
// ==========================================
//
// Aba 'DOCUMENTOS INQUILINOS':
//   título + cabeçalho + dados. Pode ter coluna(s) em branco à esquerda —
//   as colunas são localizadas PELO NOME do cabeçalho, nunca por posição fixa.
//   - EMPRESA em branco / mesclada = repete a empresa da linha anterior.
//   - VENC.: data dd/MM/aaaa OU texto (Não Enviado, Protocolo, **, DISPENSA...).
//   - Os dias são CALCULADOS de VENC. vs. hoje (não dependem de fórmula).
//
// Classificação por dias até o vencimento:
//   VENCIDO  : dias < 0
//   CRITICO  : 0 <= dias <= LIMITE_CRITICO_DIAS  (vence em breve)
//   EM_DIA   : dias > LIMITE_CRITICO_DIAS
//   PENDENTE : sem data (Não Enviado, Protocolo, **, etc.)
// ==========================================

const LIMITE_CRITICO_DIAS = 60;

function obterDadosDocumentos() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('DOCUMENTOS INQUILINOS');
    if (!sheet) throw new Error('Aba DOCUMENTOS INQUILINOS não encontrada.');

    const data = sheet.getDataRange().getDisplayValues();
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // ── Localiza o PRIMEIRO cabeçalho (linha com "empresa" + "documento") ────
    let hdr = -1, col = {};
    for (let i = 0; i < data.length; i++) {
      const linha = data[i].map(norm);
      const iEmp = linha.findIndex(c => c === 'empresa');
      const iDoc = linha.findIndex(c => c.includes('documento'));
      if (iEmp >= 0 && iDoc >= 0) {
        hdr = i;
        col.empresa   = iEmp;
        col.documento = iDoc;
        col.venc      = linha.findIndex(c => c.includes('venc'));
        col.obs       = linha.findIndex(c => c.includes('observ') || c.includes('historico'));
        col.status    = linha.findIndex(c => c.includes('status'));
        break;
      }
    }
    if (hdr < 0) throw new Error('Cabeçalho (EMPRESA/DOCUMENTOS) não encontrado.');

    // ── Detecta coluna de status real varrendo primeiras linhas de dados ─────
    // Esteio: header "Status" (col E) é obs; status real (VENCIDO/DIAS...) fica
    // na última coluna sem header. Curitiba/Itajaí: col.status = -1, sem problema.
    {
      const statusKw = ['vencido', 'dias para vencer', 'prazo indeterminado'];
      let realStatusCol = -1;
      for (let ri = hdr + 1; ri < Math.min(hdr + 15, data.length) && realStatusCol < 0; ri++) {
        for (let ci = 0; ci < data[ri].length; ci++) {
          const v = norm(data[ri][ci] || '');
          if (statusKw.some(k => v.includes(k))) { realStatusCol = ci; break; }
        }
      }
      if (realStatusCol >= 0 && realStatusCol !== col.status) {
        // A coluna do header "Status" é na verdade observações
        if (col.obs < 0) col.obs = col.status;
        col.status = realStatusCol;
      }
    }

    // Identifica linha de cabeçalho REPETIDA (Itajaí repete o header por empresa)
    const eHeaderRepetido = row => {
      const empVal = norm(row[col.empresa] || '');
      const docVal = norm(row[col.documento] || '');
      return empVal === 'empresa' || docVal === 'documentos' || docVal === 'documento';
    };

    const itens   = [];
    const resumo  = { vencido: 0, critico: 0, emDia: 0, pendente: 0, total: 0 };
    let empresaAtual = '';

    // Data de referência = último dia do mês anterior (a apresentação é espelho do mês passado)
    const hoje = new Date();
    hoje.setDate(1);       // dia 1 do mês atual
    hoje.setDate(0);       // volta para o último dia do mês anterior
    hoje.setHours(0, 0, 0, 0);

    for (let i = hdr + 1; i < data.length; i++) {
      const row = data[i];
      const cell = idx => (idx >= 0 ? String(row[idx] || '').trim() : '');

      // Pula cabeçalhos repetidos (Itajaí repete header por empresa)
      if (eHeaderRepetido(row)) continue;

      const empresa   = cell(col.empresa);
      const documento = cell(col.documento);
      const venc      = cell(col.venc);
      const obs       = cell(col.obs);
      const statusRaw = cell(col.status);

      // Atualiza empresa atual (ignora se contiver texto de cabeçalho)
      if (empresa && norm(empresa) !== 'empresa') empresaAtual = empresa;
      if (!documento) continue;  // pula linhas sem documento
      // pula "documentos" sem nenhuma letra/número (célula com traço, ponto etc.)
      if (!/[0-9a-z]/.test(norm(documento))) continue;

      // Calcula dias a partir da data de vencimento (dd/MM/aaaa) vs. hoje
      const dataVenc = parseDataBR_(venc);
      const temData  = dataVenc !== null;
      const dias     = temData ? Math.round((dataVenc - hoje) / 86400000) : null;

      let categoria;
      if (!temData)                          categoria = 'PENDENTE';
      else if (dias < 0)                     categoria = 'VENCIDO';
      else if (dias <= LIMITE_CRITICO_DIAS)  categoria = 'CRITICO';
      else                                   categoria = 'EM_DIA';

      // O status escrito na planilha tem prioridade sobre o cálculo por data
      // (ex.: Esteio marca VENCIDO sem preencher a data de vencimento)
      const stNorm = norm(statusRaw);
      const vencNorm = norm(venc);
      if (stNorm.includes('vencido'))                                                    categoria = 'VENCIDO';
      else if (stNorm.includes('indeterminado') || vencNorm.includes('indeterminado')) categoria = 'EM_DIA';
      else if (vencNorm.includes('dispensa') || stNorm.includes('dispensa'))           categoria = 'EM_DIA';

      switch (categoria) {
        case 'VENCIDO':  resumo.vencido++;  break;
        case 'CRITICO':  resumo.critico++;  break;
        case 'EM_DIA':   resumo.emDia++;    break;
        case 'PENDENTE': resumo.pendente++; break;
      }
      resumo.total++;

      itens.push({
        empresa   : empresaAtual,
        documento : documento,
        venc      : vencNorm.includes('indeterminado') ? 'INDETERM.'
                  : vencNorm.includes('dispensa')     ? 'DISPENSA'
                  : (venc || '-'),
        obs       : obs,
        dias      : dias,
        diasTexto : temData ? String(dias) : '--',
        status    : statusRaw || (categoria === 'VENCIDO' ? 'VENCIDO' : 'DIAS PARA VENCER'),
        categoria : categoria
      });
    }

    return { itens, resumo };

  } catch (e) {
    Logger.log('Erro Documentos: ' + e.message);
    return null;
  }
}

// Converte 'dd/MM/aaaa' em Date (meia-noite). Retorna null se não for data válida.
function parseDataBR_(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let d = parseInt(m[1], 10), mes = parseInt(m[2], 10), ano = parseInt(m[3], 10);
  if (ano < 100) ano += 2000;

  // Formato americano (MM/DD/aaaa): se o "mês" for > 12, inverte dia e mês
  // (ex.: Esteio usa "12/31/2030")
  if (mes > 12 && d <= 12) { const tmp = d; d = mes; mes = tmp; }

  const dt = new Date(ano, mes - 1, d);
  dt.setHours(0, 0, 0, 0);
  if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== d) return null;
  return dt;
}


// ==========================================
// DADOS ENERGIA SOLAR (Slide 10 - Energia Solar)
// ==========================================
// Aba esperada: "ENERGIA SOLAR"
// Linha 1 = cabeçalho: Mês | Geração (kWh) | Consumo (kWh) | CO² (t) | Carvão (t) | Árvores | KM neutro
function obterDadosEnergiaSolar() {
  try {
    // Energia Solar só existe para Curitiba
    if (_projetoAtivoChave !== 'CURITIBA') return null;
    const ENERGIA_SOLAR_ID = '1eRvNopH-6U87xyy9chERsROvyHf9ZpDs5veoB9H671I';
    const ss    = SpreadsheetApp.openById(ENERGIA_SOLAR_ID);
    const sheet = ss.getSheetByName('ENERGIA SOLAR');
    if (!sheet) {
      Logger.log('Energia Solar: aba "ENERGIA SOLAR" não encontrada.');
      return null;
    }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return null;

    // Detecta colunas pelo cabeçalho (linha 1, case-insensitive)
    const hdr  = data[0].map(c => c.toLowerCase());
    const cMes  = hdr.findIndex(h => h.includes('mês') || h.includes('mes'));
    const cGer  = hdr.findIndex(h => h.includes('gera'));
    const cCon  = hdr.findIndex(h => h.includes('consumo'));
    // CO² usa caractere superscript ² (U+00B2), não o dígito "2"
    const cCo2  = hdr.findIndex(h => h.includes('co') && (h.includes('2') || h.includes('²')));
    const cCarv = hdr.findIndex(h => h.includes('carv'));
    const cArv  = hdr.findIndex(h => h.includes('rvore'));
    const cKm   = hdr.findIndex(h => h.includes('km'));

    const _num = v => {
      let s = String(v || '').replace(/[^\d,.-]/g, '');
      // Formato BR: "7.572,21" — ponto é milhar, vírgula é decimal
      if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(',', '.');
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    };

    const meses = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const mes = String(row[cMes >= 0 ? cMes : 0] || '').trim();
      if (!mes) continue;
      meses.push({
        mes    : mes,
        geracao: _num(cGer  >= 0 ? row[cGer]  : null),
        consumo: _num(cCon  >= 0 ? row[cCon]  : null),
        co2    : _num(cCo2  >= 0 ? row[cCo2]  : null),
        carvao : _num(cCarv >= 0 ? row[cCarv] : null),
        arvores: _num(cArv  >= 0 ? row[cArv]  : null),
        km     : _num(cKm   >= 0 ? row[cKm]   : null)
      });
    }

    if (meses.length === 0) return null;

    const atual    = meses[meses.length - 1];
    const anterior = meses.length >= 2 ? meses[meses.length - 2] : null;

    return { atual, anterior, meses };

  } catch (e) {
    Logger.log('Erro Energia Solar: ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS UTILITIES — CONSUMO E GASTO DE ENERGIA E ÁGUA
// ==========================================
// Aba esperada: "UTILITIES", na própria planilha da cidade (Itajaí e Esteio;
// Curitiba usa o slide dedicado de Energia Solar acima). Layout: uma linha de
// rótulo de seção ("ENERGIA" / "ÁGUA", em célula mesclada) seguida da linha
// de colunas (MÊS/ANO | VALOR | CONSUMO), repetida lado a lado por seção; uma
// linha por mês/ano (ex.: "06/2026"). Usada por gerarSlidesUtilities_
// (Slide_Utilities.gs).
function obterDadosUtilities_() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('UTILITIES');
    if (!sheet) return null;

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 3) return null;

    // Acha a linha com os cabeçalhos de coluna ("mês/ano").
    let linhaHdr = -1;
    for (let r = 0; r < Math.min(data.length, 5); r++) {
      if (data[r].some(c => _histNorm_(c).indexOf('mes') === 0)) { linhaHdr = r; break; }
    }
    if (linhaHdr < 0) return null;

    // Rótulo de seção fica na linha acima ("ENERGIA" / "ÁGUA"). A célula
    // mesclada costuma cobrir só as colunas VALOR/CONSUMO do bloco (não a de
    // MÊS/ANO) — por isso o rótulo é procurado dentro do próprio intervalo de
    // colunas do bloco, não numa única célula fixa.
    const linhaSecao = data[Math.max(0, linhaHdr - 1)];
    const linhaCol   = data[linhaHdr];

    // Cada ocorrência de "mês/ano" abre um bloco [mês/ano, valor, consumo].
    const inicios = [];
    linhaCol.forEach((cab, c) => { if (_histNorm_(cab).indexOf('mes') === 0) inicios.push(c); });
    if (inicios.length === 0) return null;

    const blocos = inicios.map((cMes, i) => {
      const fim = i + 1 < inicios.length ? inicios[i + 1] : linhaCol.length;
      let rotulo = '';
      for (let c = cMes; c < fim; c++) {
        const v = String(linhaSecao[c] || '').trim();
        if (v) { rotulo = v; break; }
      }
      return { rotulo: _histNorm_(rotulo), cMes: cMes, cValor: cMes + 1, cConsumo: cMes + 2 };
    });

    const resultado = {};
    blocos.forEach(b => {
      const chave = b.rotulo.indexOf('energ') >= 0 ? 'energia'
                  : b.rotulo.indexOf('agua')  >= 0 ? 'agua'
                  : null;
      if (!chave) return;   // seção não reconhecida — ignora sem quebrar

      const porAnoValor   = {};
      const porAnoConsumo = {};
      for (let r = linhaHdr + 1; r < data.length; r++) {
        const ref = _histParseMes_(data[r][b.cMes]);
        if (!ref) continue;
        const ano = Math.floor(ref.ord / 100);
        const mes = (ref.ord % 100) - 1;   // 0-11
        if (!porAnoValor[ano])   porAnoValor[ano]   = new Array(12).fill(null);
        if (!porAnoConsumo[ano]) porAnoConsumo[ano] = new Array(12).fill(null);
        const v = _histNum_(data[r][b.cValor]);
        const c = _histNum_(data[r][b.cConsumo]);
        porAnoValor[ano][mes]   = isNaN(v) ? null : v;
        porAnoConsumo[ano][mes] = isNaN(c) ? null : c;
      }

      const anos = Object.keys(porAnoValor).map(Number).sort((a, z) => a - z);
      if (anos.length === 0) return;

      resultado[chave] = {
        valor:   { anos: anos, porAno: porAnoValor },
        consumo: { anos: anos, porAno: porAnoConsumo }
      };
    });

    if (!resultado.energia && !resultado.agua) return null;
    return resultado;

  } catch (e) {
    Logger.log('Erro Utilities: ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS MONITORAMENTO — PLUVIÔMETRO E CANAL DE DRENAGEM (só Mega Esteio)
// ==========================================
// Fonte: planilha EXTERNA do sistema de gestão predial (monitoramentoId em
// 01_Config.gs), aba "BDMEDI" (nome buscado por correspondência parcial —
// a planilha reúne várias tabelas "BD-*"). Diferente da aba UTILITIES, que
// já vem pré-agregada por mês, aqui cada linha é um LANÇAMENTO bruto de
// campo, com data/hora e o texto livre da medição na coluna "Medição". A
// agregação mensal é feita aqui, filtrando por "Edifício" conter "Esteio"
// (a aba pode reunir medições de outros empreendimentos/pontos — há também
// níveis de rio e itens de checklist que não interessam aqui).
//
//   Pluviômetro (chuva, mm): cada leitura é o volume acumulado DESDE A
//     ÚLTIMA LEITURA (não um total corrido do dia) → soma no mês = total.
//   Canal de Drenagem (nível, m): leitura pontual do nível da água — pode
//     ser lançada várias vezes num mesmo dia em eventos de chuva forte →
//     média no mês representa o nível típico; o máximo de cada mês é
//     rastreado à parte, para o card de pico de cheia.
function obterDadosMonitoramentoEsteio_() {
  const projeto = getProjetoAtivo();
  if (!projeto.monitoramentoId) return null;

  try {
    const ss    = SpreadsheetApp.openById(projeto.monitoramentoId);
    const sheet = _monEncontrarAba_(ss);
    if (!sheet) {
      Logger.log('Monitoramento: aba "BDMEDI" não encontrada na planilha externa.');
      return null;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;

    const hdr      = data[0].map(h => _histNorm_(h));
    const cData    = hdr.indexOf('data');
    const cEdif    = hdr.indexOf('edificio');
    const cMedicao = hdr.indexOf('medicao');
    const cValor   = hdr.indexOf('valor');
    if (cData < 0 || cMedicao < 0 || cValor < 0) {
      Logger.log('Monitoramento: colunas esperadas (Data/Medição/Valor) não encontradas na aba.');
      return null;
    }

    const chuvaSoma = {}, chuvaN = {};
    const nivelSoma = {}, nivelN = {}, nivelMax = {};

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (cEdif >= 0 && _histNorm_(row[cEdif]).indexOf('esteio') < 0) continue;

      const medicao = _histNorm_(row[cMedicao]);
      const ehChuva = medicao.indexOf('pluviometro') >= 0;
      const ehNivel = medicao.indexOf('canal de drenagem') >= 0;
      if (!ehChuva && !ehNivel) continue;

      const dt = _monParseData_(row[cData]);
      if (!dt) continue;
      const valor = _monNum_(row[cValor]);
      if (isNaN(valor)) continue;

      if (ehChuva) {
        if (!chuvaSoma[dt.ano]) { chuvaSoma[dt.ano] = new Array(12).fill(0); chuvaN[dt.ano] = new Array(12).fill(0); }
        chuvaSoma[dt.ano][dt.mes] += valor;
        chuvaN[dt.ano][dt.mes]++;
      } else {
        if (!nivelSoma[dt.ano]) { nivelSoma[dt.ano] = new Array(12).fill(0); nivelN[dt.ano] = new Array(12).fill(0); nivelMax[dt.ano] = new Array(12).fill(null); }
        nivelSoma[dt.ano][dt.mes] += valor;
        nivelN[dt.ano][dt.mes]++;
        if (nivelMax[dt.ano][dt.mes] == null || valor > nivelMax[dt.ano][dt.mes]) nivelMax[dt.ano][dt.mes] = valor;
      }
    }

    const chuva = _monSerieSoma_(chuvaSoma, chuvaN);
    const nivel = _monSerieMedia_(nivelSoma, nivelN);
    const nivelMaxSerie = _monSerieDireta_(nivelMax);

    if (chuva.anos.length === 0 && nivel.anos.length === 0) return null;
    return { chuva: chuva, nivel: nivel, nivelMax: nivelMaxSerie };

  } catch (e) {
    Logger.log('Erro Monitoramento (Esteio): ' + e.message);
    return null;
  }
}

function _monEncontrarAba_(ss) {
  const abas = ss.getSheets();
  for (let i = 0; i < abas.length; i++) {
    // Remove espaço/hífen/etc. antes de comparar — o nome real é
    // "BD-MEDIÇÕES", e o hífen quebraria um indexOf direto por "bdmedi".
    const nome = _histNorm_(abas[i].getName()).replace(/[^a-z0-9]/g, '');
    if (nome.indexOf('bdmedi') >= 0) return abas[i];
  }
  return null;
}

// Aceita tanto Date genuíno (coluna de data real na planilha, via
// getValues()) quanto texto "DD/MM/AAAA..." como respaldo.
function _monParseData_(cell) {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return { ano: cell.getFullYear(), mes: cell.getMonth() };
  }
  const m = String(cell || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return { ano: parseInt(m[3], 10), mes: parseInt(m[2], 10) - 1 };
}

// Aceita tanto número genuíno (coluna numérica real) quanto texto "3,90"
// no formato BR (via _histNum_).
function _monNum_(cell) {
  if (typeof cell === 'number') return cell;
  return _histNum_(cell);
}

function _monSerieSoma_(soma, n) {
  const porAno = {};
  Object.keys(soma).forEach(anoStr => {
    porAno[Number(anoStr)] = soma[anoStr].map((s, i) => n[anoStr][i] > 0 ? s : null);
  });
  const anos = Object.keys(porAno).map(Number).sort((a, z) => a - z);
  return { anos: anos, porAno: porAno };
}

function _monSerieMedia_(soma, n) {
  const porAno = {};
  Object.keys(soma).forEach(anoStr => {
    porAno[Number(anoStr)] = soma[anoStr].map((s, i) => n[anoStr][i] > 0 ? s / n[anoStr][i] : null);
  });
  const anos = Object.keys(porAno).map(Number).sort((a, z) => a - z);
  return { anos: anos, porAno: porAno };
}

function _monSerieDireta_(porAnoRaw) {
  const porAno = {};
  Object.keys(porAnoRaw).forEach(anoStr => { porAno[Number(anoStr)] = porAnoRaw[anoStr]; });
  const anos = Object.keys(porAno).map(Number).sort((a, z) => a - z);
  return { anos: anos, porAno: porAno };
}


// ==========================================
// DADOS BACKLOG (Geral, Facilities, Property, Locatário, Emergencial) — aba
// "BACKLOG" da planilha de HISTÓRICO VALIDADO
// ==========================================
// Layout diferente do padrão "Mês | Empreendimento | Indicador | Dado" usado
// por lerHistoricoValidado — essa aba é em blocos lado a lado, um por Mega
// (célula mesclada com o nome na linha 1; GERAL/FACILITIES/PROPERTY/
// LOCATÁRIO/EMERGENCIAL na linha 2, nessa ordem), com uma coluna "ANO MES"
// compartilhada:
//   ANO MES | MEGA ESTEIO (GERAL|FACILITIES|PROPERTY|LOCATÁRIO|EMERGENCIAL) | MEGA CURITIBA (...) | MEGA ITAJAÍ (...)
// Facilities/Geral já batem com as linhas "Chamados de facilities"/"Chamados
// geral" da aba DADOS de cada Mega — aqui é só o histórico consolidado das
// três, com Property, Locatário (Clientes) e Emergencial inclusos também.
// Retorna a série cronológica da cidade ativa, ordenada, mais recente por
// último: [{ mes:'07/2025', ord:202507, rotulo:'JUL/25', facilities:94,
//            geral:108, property:13, locatario:11, emergencial:4 }]
let _backlogHistoricoCache = {};

function obterDadosBacklogHistorico_() {
  const chave = getProjetoAtivo().nome;
  if (_backlogHistoricoCache[chave]) {
    return _backlogHistoricoCache[chave];
  }

  try {
    const data = _obterDadosAbaHistorico_('BACKLOG');
    if (!data || data.length < 3) return [];

    // Acha a linha de cabeçalho de coluna ("ano mes" ou "mes").
    let linhaHdr = -1;
    for (let r = 0; r < Math.min(data.length, 5); r++) {
      if (data[r].some(c => _histNorm_(c).indexOf('mes') >= 0)) { linhaHdr = r; break; }
    }
    if (linhaHdr < 0) return [];

    const linhaMega = data[Math.max(0, linhaHdr - 1)];
    const linhaCol  = data[linhaHdr];
    const cMes = linhaCol.findIndex(c => _histNorm_(c).indexOf('mes') >= 0);
    if (cMes < 0) return [];

    // Cada Mega abre um bloco de colunas, marcado pela célula mesclada com o
    // nome (linha acima do cabeçalho) — só a coluna inicial do bloco tem
    // texto ali (o resto da mesclagem vem em branco). Dentro do bloco, as 4
    // colunas podem estar em qualquer ordem; localizamos cada uma pelo
    // próprio texto do cabeçalho, não pela posição.
    const blocos = [];
    linhaMega.forEach((v, c) => {
      if (c === cMes) return;
      const nome = String(v || '').trim();
      if (nome) blocos.push({ col: c, nome: nome });
    });
    if (blocos.length === 0) return [];

    const alvoMega = _histEmpChave_(getProjetoAtivo().nome);
    let cFac = -1, cGer = -1, cProp = -1, cLoc = -1, cEmerg = -1;
    for (let i = 0; i < blocos.length; i++) {
      if (_histEmpChave_(blocos[i].nome) !== alvoMega) continue;
      const cIni = blocos[i].col;
      const cFim = i + 1 < blocos.length ? blocos[i + 1].col : linhaCol.length;
      for (let c = cIni; c < cFim; c++) {
        const h = _histNorm_(linhaCol[c]);
        if (h.indexOf('geral') >= 0) cGer = c;
        else if (h.indexOf('facilit') >= 0) cFac = c;
        else if (h.indexOf('propert') >= 0) cProp = c;
        else if (h.indexOf('locatari') >= 0) cLoc = c;
        else if (h.indexOf('emergenc') >= 0) cEmerg = c;
      }
      break;
    }
    if (cFac < 0 || cGer < 0) {
      Logger.log('Backlog: colunas do empreendimento não encontradas na aba BACKLOG — gerando série a partir da BD-CORRETIVAS.');
      const sBD = _gerarSerieBacklogDiretoBD_();
      if (sBD.length) {
        _backlogHistoricoCache[chave] = sBD;
        return sBD;
      }
      return [];
    }

    const saida = [];
    for (let r = linhaHdr + 1; r < data.length; r++) {
      const mes = _histParseMes_(data[r][cMes]);
      if (!mes) continue;
      const facilities  = _histNum_(data[r][cFac]);
      const geral       = _histNum_(data[r][cGer]);
      const property    = cProp   >= 0 ? _histNum_(data[r][cProp])   : NaN;
      const locatario   = cLoc    >= 0 ? _histNum_(data[r][cLoc])    : NaN;
      const emergencial = cEmerg  >= 0 ? _histNum_(data[r][cEmerg])  : NaN;
      saida.push({
        mes: mes.label,
        ord: mes.ord,
        rotulo: MESES_3_REF[parseInt(mes.label.slice(0, 2), 10) - 1] + '/' + mes.label.slice(-2),
        facilities: isNaN(facilities) ? null : facilities,
        geral: isNaN(geral) ? null : geral,
        property: isNaN(property) ? null : property,
        locatario: isNaN(locatario) ? null : locatario,
        emergencial: isNaN(emergencial) ? null : emergencial
      });
    }
    // Garante que o mês de referência oficial da Capa (DADOS!B1 / obterMesReferencia_)
    // esteja presente na série histórica. Se a linha ainda não foi digitada na aba
    // BACKLOG, o recálculo da BD-CORRETIVAS abaixo preencherá os números automaticamente.
    try {
      const ref = obterMesReferencia_();
      const ordRef = ref.ord || (ref.ano * 100 + (ref.index + 1));
      if (!saida.some(m => m.ord === ordRef)) {
        saida.push({
          mes: ref.mesAno,
          ord: ordRef,
          rotulo: ref.siglaAno,
          facilities: null,
          geral: null,
          property: null,
          locatario: null,
          emergencial: null
        });
      }
    } catch (e) {}

    saida.sort((a, b) => a.ord - b.ord);
    _backlogAplicarRecalculoBD_(saida);
    _backlogHistoricoCache[chave] = saida;
    return saida;

  } catch (e) {
    Logger.log('Erro Backlog Histórico: ' + e.message);
    const sBD = _gerarSerieBacklogDiretoBD_();
    if (sBD.length) {
      _backlogHistoricoCache[chave] = sBD;
      return sBD;
    }
    return [];
  }
}

// Gera a série histórica mensal dos últimos 14 meses diretamente da base bruta BD-CORRETIVAS
function _gerarSerieBacklogDiretoBD_() {
  try {
    const rawCorr = _lerBdCorretivasCru_();
    if (!rawCorr || !rawCorr.length) return [];
    const ref = obterMesReferencia_();
    const saidaBD = [];
    for (let offset = 13; offset >= 0; offset--) {
      let a = ref.ano, m = ref.index - offset;
      while (m < 0) { m += 12; a -= 1; }
      const ord = a * 100 + (m + 1);
      const refIni = new Date(Date.UTC(a, m, 1));
      const refFim = new Date(Date.UTC(a, m + 1, 1));
      let geral = 0, facilities = 0, property = 0, locatario = 0;
      rawCorr.forEach(it => {
        if (!_histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)) return;
        geral++;
        if (it.equipe === 'LOCATARIO') locatario++;
        else if (it.equipe === 'PROPERTY') property++;
        else facilities++;
      });
      const mesLabel = String(m + 1).padStart(2, '0') + '/' + a;
      saidaBD.push({
        mes: mesLabel,
        ord: ord,
        rotulo: MESES_3_REF[m] + '/' + String(a).slice(-2),
        facilities,
        geral,
        property,
        locatario,
        emergencial: null
      });
    }
    return saidaBD;
  } catch (e) {
    Logger.log('_gerarSerieBacklogDiretoBD_: ' + e.message);
    return [];
  }
}

// Substitui GERAL/FACILITIES/PROPERTY/LOCATÁRIO digitados na aba BACKLOG
// pelo recálculo da BD-CORRETIVAS, mês a mês, registrando cada divergência.
//
// Fica AQUI, e não no arquivo do slide, porque a aba BACKLOG alimenta cinco
// consumidores (Backlog Facilities, Dashboard, Chamados Pendentes, o
// gráfico de emergenciais e os checks de consistência). Corrigir só no
// slide faria o deck mostrar 220 num lugar e 206 noutro pro mesmo mês.
//
// Mês que a BD não cobre mantém o valor manual, sem perder histórico antigo
// — mesmo tratamento que a coluna EMERGENCIAL já recebe.
function _backlogAplicarRecalculoBD_(serie) {
  if (!BACKLOG_RECALCULAR_DA_BD && !BACKLOG_LOGAR_COMPARACAO_BD) return;

  let recalculado;
  try {
    recalculado = obterDadosBacklogPorMesBD_(serie);
  } catch (e) {
    Logger.log('Backlog: recálculo da BD-CORRETIVAS indisponível (' + e.message +
               ') — usando os valores digitados na aba BACKLOG.');
    return;
  }
  if (!recalculado || !recalculado.size) return;

  const campos = ['geral', 'facilities', 'property', 'locatario'];
  serie.forEach(m => {
    if (!recalculado.has(m.ord)) return;   // fora da cobertura da BD — mantém o manual
    const calc = recalculado.get(m.ord);
    const difs = campos
      .filter(c => m[c] != null && m[c] !== calc[c])
      .map(c => c + ': ' + m[c] + ' → ' + calc[c]);
    if (difs.length) {
      Logger.log('Backlog (' + m.mes + '): aba BACKLOG digitada x BD-CORRETIVAS — ' +
                 difs.join(', ') + '.' +
                 (BACKLOG_RECALCULAR_DA_BD ? ' Usando o recalculado.' : ' Mantendo o digitado.'));
    }
    if (BACKLOG_RECALCULAR_DA_BD) campos.forEach(c => { m[c] = calc[c]; });
  });
}


// ==========================================
// CHAMADOS POR PRIORIDADE (Abertos x Fechados) — abas "CHAMADOS ABERTOS MES"
// e "CHAMADOS FECHADOS MES" da planilha de HISTÓRICO VALIDADO
// ==========================================
// As duas abas são a exportação bruta do sistema de chamados (colunas "Id
// chamado", "Cliente", "Prioridade", "Descrição", "Centro de Custos" etc.),
// substituída inteira todo mês — cabeçalho na linha 1, sem mesclagem.
// A aba tem DUAS colunas chamadas "Prioridade" (a de texto — Emergencial/
// Alta/Normal/Baixa — vem primeiro; uma segunda, numérica, vem bem mais à
// direita e é ignorada aqui, já que a busca por cabeçalho pega a primeira
// ocorrência). O Centro de Custos define o Mega: só contam as linhas cujo
// Centro de Custos é exatamente "MEGA <CIDADE>" — outros centros de custo
// (postos, outros clientes fora dos 3 Megas) ficam de fora.
function _lerChamadosMes_(nomeAba) {
  const alvoMega = _histEmpChave_(getProjetoAtivo().nome);
  try {
    const ss    = SpreadsheetApp.openById(HISTORICO_VALIDADO_ID);
    const sheet = ss.getSheetByName(nomeAba);
    if (sheet) {
      const data = sheet.getDataRange().getDisplayValues();
      if (data.length >= 2) {
        const hdr   = data[0].map(_histNorm_);
        const cId   = hdr.findIndex(h => h.indexOf('id chamado') >= 0);
        const cCli  = hdr.findIndex(h => h.indexOf('cliente') >= 0);
        const cPri  = hdr.findIndex(h => h.indexOf('prioridade') >= 0);
        const cDesc = hdr.findIndex(h => h.indexOf('descricao') >= 0);
        const cCC   = hdr.findIndex(h => h.indexOf('centro de custo') >= 0);
        if (cId >= 0 && cCC >= 0) {
          const saida = [];
          for (let r = 1; r < data.length; r++) {
            const row = data[r];
            if (_histEmpChave_(row[cCC]) !== alvoMega) continue;
            saida.push({
              id:         String(row[cId]   || '').trim(),
              cliente:    cCli  >= 0 ? String(row[cCli]  || '').trim() : '',
              prioridade: cPri  >= 0 ? String(row[cPri]  || '').trim() : '',
              descricao:  cDesc >= 0 ? _limparDescricaoChecklist_(String(row[cDesc] || '').trim()) : ''
            });
          }
          if (saida.length) return saida;
        }
      }
    }
  } catch (e) {
    Logger.log('_lerChamadosMes_(' + nomeAba + '): ' + e.message);
  }

  // Fallback: busca direto na BD-CORRETIVAS para o mês de referência
  try {
    const rawCorr = _lerBdCorretivasCru_();
    if (rawCorr && rawCorr.length) {
      const ref    = obterMesReferencia_();
      const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
      const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));
      const ehFechados = _histNorm_(nomeAba).indexOf('fechado') >= 0;

      const saidaBD = [];
      rawCorr.forEach(it => {
        if (ehFechados) {
          const fechado = _bdChamadoFechado_(it.estado, it.dtFechado);
          if (fechado && it.dtFechado && it.dtFechado >= refIni && it.dtFechado < refFim) {
            saidaBD.push({
              id:         it.id,
              cliente:    it.cliente || '',
              prioridade: it.prioridade || '',
              descricao:  it.descricao || ''
            });
          }
        } else {
          // Abertos no mês
          if (it.dtReporte && it.dtReporte >= refIni && it.dtReporte < refFim) {
            saidaBD.push({
              id:         it.id,
              cliente:    it.cliente || '',
              prioridade: it.prioridade || '',
              descricao:  it.descricao || ''
            });
          }
        }
      });
      if (saidaBD.length) return saidaBD;
    }
  } catch (eBD) {
    Logger.log('_lerChamadosMes_ BD fallback: ' + eBD.message);
  }

  return [];
}

function _normalizarPrioridade_(v) {
  const n = _histNorm_(v);
  if (n.indexOf('emergenc') >= 0) return 'Emergencial';
  if (n.indexOf('alta') >= 0)     return 'Alta';
  if (n.indexOf('normal') >= 0)   return 'Normal';
  if (n.indexOf('baixa') >= 0)    return 'Baixa';
  return '';
}

// A coluna Descrição vem com um prefixo de metadado de checklist na frente
// do texto livre — ex.: "PMP.904036.68674893 CHECKLIST - FACILITIES |
// Bombas de Drenagem | Posto SIM: C02. Em funcionamento os instrumentos do
// painel: Não Conforme - Bomba não está no local". O prefixo (ID do
// formulário + "CHECKLIST - <equipe>" + categorias separadas por "|",
// terminando em "<local>: <código>.") não interessa pra quem lê o slide —
// só a descrição real do problema, que vem depois. Remove só quando a
// descrição REALMENTE começa com esse padrão; texto livre sem prefixo
// (ex.: "Água voltando pelos tubos das bombas inundando o piso.") fica
// intacto. Cópia deste mesmo comportamento em propriedades-mensal/
// 02_Dados.gs — pedido do usuário pra valer nos dois projetos.
function _limparDescricaoChecklist_(desc) {
  if (!desc) return desc;
  let limpo = desc;

  // 1) Prefixo do formulário: "<ID> CHECKLIST - <equipe> | ... : <código>."
  const reMeta = /^\S+\s+CHECKLIST\s*-\s*\S+(?:\s*\|[^|]*)+?:\s*\S+?\.\s*/i;
  limpo = limpo.replace(reMeta, '');

  // 2) Rótulo do item avaliado + resultado do checklist: "<campo
  // avaliado>: [Não] Conforme -" — ex.: "Estado de conservação e aspecto
  // geral da carcaça: Não Conforme -", "Em funcionamento os instrumentos
  // do painel: Não Conforme -". Só age quando o texto REALMENTE começa
  // com "<até 80 caracteres>: [Não] Conforme" — descrição livre sem
  // esse padrão (ex.: "Água voltando pelos tubos das bombas inundando o
  // piso.") não tem colon logo no início e fica intacta.
  const reCampo = /^[^:\n]{1,80}:\s*(?:Não\s+)?Conforme\b[\s\-–]*/i;
  limpo = limpo.replace(reCampo, '');

  limpo = limpo.trim();
  return limpo || desc;
}

// Retorna { abertos: {total, fatias:[{label,qtd}], emergencial:[{id,descricao}]},
//           fechados: {...} }, ou null se as duas abas estiverem vazias ou
// sem nenhuma linha da cidade ativa.
function obterDadosChamadosPrioridade_() {
  const abertos  = _lerChamadosMes_('CHAMADOS ABERTOS MES');
  const fechados = _lerChamadosMes_('CHAMADOS FECHADOS MES');
  if (!abertos.length && !fechados.length) return null;

  const ORDEM_PRIORIDADE = ['Emergencial', 'Alta', 'Normal', 'Baixa'];
  function agrupar(lista) {
    const porPrioridade = {};
    ORDEM_PRIORIDADE.forEach(p => porPrioridade[p] = 0);
    lista.forEach(c => {
      const p = _normalizarPrioridade_(c.prioridade);
      if (p) porPrioridade[p]++;
    });
    const fatias = ORDEM_PRIORIDADE
      .map(p => ({ label: p, qtd: porPrioridade[p] }))
      .filter(f => f.qtd > 0);
    const emergencial = lista
      .filter(c => _normalizarPrioridade_(c.prioridade) === 'Emergencial')
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(c => ({ id: c.id, descricao: c.descricao }));
    return { total: lista.length, fatias: fatias, emergencial: emergencial };
  }

  return { abertos: agrupar(abertos), fechados: agrupar(fechados) };
}


// ==========================================
// CHAMADOS DE CLIENTES (Abertos x Fechados) — mesmas abas "CHAMADOS ABERTOS
// MES"/"CHAMADOS FECHADOS MES", agrupado por Cliente em vez de Prioridade
// ==========================================
// Mesmo filtro por Centro de Custos de obterDadosChamadosPrioridade_, mas
// aqui as linhas do próprio condomínio ("CONDOMÍNIO MEGA <CIDADE>") ficam
// de fora — não são chamados de cliente, são do condomínio em si. Os 4
// clientes com mais chamados aparecem nomeados; o resto vira "Outros" (a
// lista detalhada embaixo, porém, mostra todos, sem agrupar).
function _ehCondominio_(cliente) {
  return _histNorm_(cliente).indexOf('condomini') >= 0;
}

// Retorna { abertos: {total, fatias:[{label,qtd}], lista:[{id,cliente,descricao}]},
//           fechados: {...} }, ou null se as duas abas estiverem vazias ou
// sem nenhuma linha da cidade ativa.
function obterDadosChamadosClientes_() {
  const abertos  = _lerChamadosMes_('CHAMADOS ABERTOS MES');
  const fechados = _lerChamadosMes_('CHAMADOS FECHADOS MES');
  if (!abertos.length && !fechados.length) return null;

  const MAX_FATIAS = 5;
  function agrupar(lista) {
    const semCondominio = lista.filter(c => c.cliente && !_ehCondominio_(c.cliente));

    const porCliente = {};
    semCondominio.forEach(c => { porCliente[c.cliente] = (porCliente[c.cliente] || 0) + 1; });
    const ranked = Object.keys(porCliente)
      .map(cli => ({ label: cli, qtd: porCliente[cli] }))
      .sort((a, b) => b.qtd - a.qtd);

    let fatias = ranked;
    if (ranked.length > MAX_FATIAS) {
      const top = ranked.slice(0, MAX_FATIAS - 1);
      const restoQtd = ranked.slice(MAX_FATIAS - 1).reduce((s, f) => s + f.qtd, 0);
      fatias = top.concat([{ label: 'Outros', qtd: restoQtd }]);
    }

    const listaOrdenada = semCondominio
      .slice()
      .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR') || a.id.localeCompare(b.id))
      .map(c => ({ id: c.id, cliente: c.cliente, descricao: c.descricao }));

    return { total: semCondominio.length, fatias: fatias, lista: listaOrdenada };
  }

  return { abertos: agrupar(abertos), fechados: agrupar(fechados) };
}


// ==========================================
// BACKLOG EMERGENCIAL — DETALHE — aba "BD-CORRETIVAS" da planilha BASE DE
// DADOS — QUADRO REM (BD_CORRETIVAS_ID, histórico bruto desde 2021,
// multi-empreendimento) — MESMA fonte que já alimenta o Backlog de
// Clientes — Facilities/Properties (ver _lerBdCorretivasChamadosClientes_
// mais abaixo). Antes lia de uma aba separada e curada à mão ("BACKLOG -
// EMERGENCIAL - DETALHE", na planilha de Histórico Validado) — trocada pela
// base completa por pedido do usuário, porque aquela aba só passou a ser
// preenchida a partir de um certo mês e não tinha histórico anterior (o
// gráfico de Slide03_Corretivas.gs zerava os meses antes disso). Chamado
// "emergencial" = coluna "Prioridade" (a de texto — a aba tem duas colunas
// com esse nome, a busca por cabeçalho pega a primeira ocorrência)
// normalizada para 'Emergencial' (_normalizarPrioridade_).
//
// Conta QUALQUER chamado emergencial em aberto no mês, não importa a
// equipe responsável — inclusive os marcados como responsabilidade do
// locatário (decisão explícita do usuário: aqui é uma visão ampla de
// emergências pendentes, diferente do Backlog de Clientes —
// Facilities/Properties, que exclui locatário de propósito porque aquele
// slide é só sobre responsabilidade DA OPERAÇÃO).
//
// A apresentação é sempre do MÊS ANTERIOR (obterMesReferencia_), gerada dias
// depois do mês já ter fechado — então um chamado que hoje aparece "Fechado"
// pode muito bem ter estado em aberto durante TODO o mês de referência (só
// foi fechado agora, já em agosto, por exemplo). Por isso não dá pra usar o
// Estado atual como filtro: comparamos "Data de reporte" x "Fechado em" com
// a janela do mês de referência — conta como backlog em aberto todo chamado
// cujo intervalo [reporte, fechamento) tem interseção com esse mês (aberto
// antes do mês terminar e, se fechado, fechado depois do mês começar).

// Datas nessa aba vêm como número de série (Google Sheets/Excel, dia 0 =
// 30/12/1899), exibidas em texto com vírgula decimal (ex.: "46155,62211") —
// a coluna não está formatada como data na planilha de origem. Aceita
// também, defensivamente, um texto já formatado tipo "13/05/2026" ou
// "13/05/2026 14:55", caso a formatação da coluna mude no futuro.
function _histParseDataHora_(v) {
  const txt = String(v || '').trim();
  if (!txt) return null;

  if (/^\d+([.,]\d+)?$/.test(txt)) {
    const serial = parseFloat(txt.replace(',', '.'));
    if (isNaN(serial)) return null;
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  }

  const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)));
  }

  // BD-CORRETIVAS (planilha BASE DE DADOS — QUADRO REM) traz "Data de
  // reporte"/"Fechado em" em formato ISO "AAAA-MM-DD HH:MM:SS".
  const iso = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0), +(iso[6] || 0)));
  }
  return null;
}

// Ponto único da regra "estava aberto durante o mês de referência", usado por
// toda fonte de backlog no formato bruto (Estado + Data de reporte + Fechado
// em) — hoje BD-CORRETIVAS (Backlog Emergencial e Backlog de Clientes —
// Facilities/Properties) e BACKLOG - CLIENTES - DETALHES. Conta como aberto
// no mês todo chamado cujo intervalo [reporte, fechamento) tem interseção
// com a janela [refIni, refFim) — ver o comentário completo acima da seção
// BACKLOG EMERGENCIAL — DETALHE.
// BACKLOG = chamado que ainda estava aberto no ÚLTIMO DIA do mês de
// referência — não "qualquer chamado que passou por essa janela". Aberto E
// fechado dentro do MESMO mês de referência não é backlog daquele mês (foi
// resolvido dentro do próprio mês); só conta se ainda seguia aberto quando o
// mês fechou (fechou depois, ou nem fechou ainda). Definição do usuário:
// "aberto em julho e fechado em julho não é backlog, só se foi fechado em
// agosto" — um chamado aberto em maio e fechado em julho também não entra no
// backlog de JULHO (já tinha fechado antes de julho acabar), mas teria
// entrado no de maio e de junho.
// Ponto ÚNICO da regra "este chamado está fechado". O backlog e o fluxo de
// criados/fechados precisam concordar aqui, senão a identidade
//     backlog(fim) = backlog(início) + criados − fechados
// quebra mesmo com os dois saindo da BD-CORRETIVAS: um chamado com "Fechado
// em" preenchido mas Estado diferente de "Fechado" contaria como fechado no
// fluxo e continuaria no backlog pra sempre — foi exatamente esse
// descasamento que fez JUL/26 sair com 29 criados, 29 fechados e o backlog
// subindo 14.
function _bdChamadoFechado_(estado, dtFechado) {
  return _histNorm_(estado) === 'fechado' && !!dtFechado;
}

function _histAbertoNoMes_(estado, dtReporte, dtFechado, refIni, refFim) {
  const fechado = _histNorm_(estado) === 'fechado';
  if (dtReporte) {
    if (dtReporte >= refFim) return false;                     // ainda não existia no mês de referência
    if (fechado && dtFechado && dtFechado < refFim) return false; // já tinha fechado até o fim do mês — não é mais backlog
    return true;
  }
  // Sem data de reporte pra confirmar a janela: comportamento conservador —
  // só entra se ainda não estava fechado.
  return !fechado;
}

// "dd/mm/aa" pra exibir a data de reporte no card sem gastar muito espaço.
function _histFormatarDataCurta_(d) {
  if (!d) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(d.getUTCFullYear()).slice(-2);
  return dd + '/' + mm + '/' + yy;
}

// Dias em aberto NÃO é "até hoje" — é até o ÚLTIMO DIA do mês de referência
// (refFim é o 1º dia do mês seguinte, exclusivo), porque a apresentação
// retrata a situação daquele mês, não do dia em que o script rodou.
function _histDiasAberto_(dtReporte, refFim) {
  if (!dtReporte) return null;
  return Math.max(0, Math.floor((refFim - dtReporte) / 86400000));
}

// Lê BD-CORRETIVAS filtrando por Centro de Custos do empreendimento ativo e
// Prioridade=Emergencial, SEM filtrar por mês — devolve todo mundo com as
// datas prontas, pra que obterDadosBacklogEmergencialDetalhe_ (mês de
// referência) e obterDadosBacklogEmergencialHistoricoPorMes_ (série
// histórica) apliquem _histAbertoNoMes_ sem reler a planilha duas vezes.
function _lerBdCorretivasEmergenciaisCru_() {
  return _lerBdCorretivasCru_().filter(it => it.prioridade === 'Emergencial');
}

// Leitura base da BD-CORRETIVAS: filtra só por Centro de Custos do
// empreendimento ativo e devolve todo mundo com as datas prontas. Quem
// precisa de recorte (prioridade, mês, equipe) filtra em cima — assim o
// mapeamento de colunas fica num lugar só.
// A BD-CORRETIVAS tem histórico desde 2021 e agora é lida por vários pontos
// numa mesma rodada (backlog emergencial, backlogs de clientes, fluxo de
// corretivas e o recálculo da aba BACKLOG). Sem cache seria a planilha
// inteira baixada uma vez por consumidor, por cidade.
let _bdCorretivasCache = {};

function _lerBdCorretivasCru_() {
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  if (_bdCorretivasCache[alvoEmp]) return _bdCorretivasCache[alvoEmp];
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _abaBdCorretivas_(ss);
    if (!sheet) return [];

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr      = data[0].map(_histNorm_);
    const cId      = hdr.findIndex(h => h.indexOf('id chamado') >= 0);
    const cCliente = hdr.findIndex(h => h.indexOf('cliente') >= 0);
    const cDesc    = hdr.findIndex(h => h.indexOf('descricao') >= 0);
    const cEstado  = hdr.findIndex(h => h === 'estado' || h.indexOf('estado') >= 0);
    const cMotivo  = hdr.findIndex(h => h.indexOf('motivo de pausa') >= 0 || h.indexOf('motivo') >= 0);
    const cCC      = hdr.findIndex(h => h.indexOf('centro de custo') >= 0);
    const cPri     = hdr.findIndex(h => h.indexOf('prioridade') >= 0);   // 1ª ocorrência = texto; a 2ª (numérica) é ignorada
    const cResp    = hdr.findIndex(h => h.indexOf('responsaveis') >= 0);
    const cReporte = hdr.findIndex(h => h.indexOf('data de reporte') >= 0);
    const cFechado = hdr.findIndex(h => h.indexOf('fechado em') >= 0);
    if (cId < 0 || cCC < 0) return [];

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (_histEmpChave_(row[cCC]) !== alvoEmp) continue;

      const rawEstado = cEstado >= 0 ? String(row[cEstado] || '').trim() : '';
      const rawMotivo = cMotivo >= 0 ? String(row[cMotivo] || '').trim() : '';
      const rawResp   = cResp   >= 0 ? String(row[cResp] || '').trim() : '';

      // Regra oficial Capital Realty: =SE(Estado="Pausado"; Motivo_de_pausa; Estado)
      let estadoOp = rawEstado;
      if (_histNorm_(rawEstado).indexOf('pausad') >= 0 && rawMotivo) {
        estadoOp = rawMotivo;
      }

      saida.push({
        id:            _idChamadoNormaliza_(cId >= 0 ? row[cId] : ''),
        cliente:       cCliente >= 0 ? String(row[cCliente] || '').trim() : '',
        descricao:     cDesc   >= 0 ? _limparDescricaoChecklist_(String(row[cDesc] || '').trim()) : '',
        estado:        estadoOp,
        estadoSistema: rawEstado,
        motivoPausa:   rawMotivo,
        responsaveis:  rawResp,
        prioridade:    _normalizarPrioridade_(cPri >= 0 ? row[cPri] : ''),
        // Chamado sem responsável preenchido (ou com um nome que não está
        // no mapa) conta como FACILITIES, não "OUTROS": é a mesma regra do
        // slide irmão Backlog de Clientes — Facilities, que já recebe tudo
        // que não é PROPERTY, e bate com o que a aba curada antiga trazia
        // na coluna EQUIPE pra esses chamados. "OUTROS" dava a impressão
        // falsa de que ninguém da operação era responsável.
        equipe:        _resolverEquipeResponsaveis_(rawResp) || 'FACILITIES',
        dtReporte:     cReporte >= 0 ? _histParseDataHora_(row[cReporte]) : null,
        dtFechado:     cFechado >= 0 ? _histParseDataHora_(row[cFechado]) : null
      });
    }
    // Só cacheia resultado bom: leitura vazia por falha transitória não pode
    // ficar grudada na rodada inteira.
    if (saida.length) _bdCorretivasCache[alvoEmp] = saida;
    return saida;
  } catch (e) {
    Logger.log('_lerBdCorretivasCru_: ' + e.message);
    return [];
  }
}

// ==========================================
// FLUXO DE CORRETIVAS (criados / fechados) — contado na BD-CORRETIVAS
// ==========================================
// Fonte dos KPIs "Chamados criados"/"Chamados fechados" do Slide 03. A
// BD-CORRETIVAS é a base bruta (uma linha por chamado, histórico desde
// 2021, com "Data de reporte" e "Fechado em"), então dá pra contar tanto o
// MÊS quanto o ACUMULADO da mesma origem — e, principalmente, é a MESMA
// base de onde já saem os backlogs (_histAbertoNoMes_). Com estoque e fluxo
// vindo das mesmas linhas, a identidade
//     backlog(fim) = backlog(início) + criados − fechados
// deixa de depender de duas planilhas digitadas concordarem entre si.
//
// Critério: criado no mês = "Data de reporte" dentro da janela;
// fechado no mês = "Fechado em" dentro da janela. Acumulado = do dia 1º de
// janeiro do ano de referência até o fim do mês de referência.
//
// Retorna { mCriados, mFechados, aCriados, aFechados, total } ou null se a
// base não trouxer nenhuma linha do empreendimento ativo.
function obterFluxoCorretivasBD_() {
  const itens = _lerBdCorretivasCru_();
  if (!itens.length) return null;

  // Guarda contra coluna de data renomeada/ausente: _lerBdCorretivasCru_ só
  // exige "Id chamado" e "Centro de Custos", então se "Data de reporte"
  // sumir do cabeçalho a leitura passa e todas as datas vêm nulas — o que
  // daria 0 criados e 0 fechados sem nenhum erro, zerando o slide em
  // silêncio. Havendo linhas mas nenhuma data legível, é falha de fonte:
  // devolve null e o slide cai no valor digitado.
  if (!itens.some(it => it.dtReporte)) {
    Logger.log('BD-CORRETIVAS: ' + itens.length + ' linhas do empreendimento, mas ' +
               'nenhuma com "Data de reporte" legível — confira o cabeçalho da aba. ' +
               'Os criados/fechados vão sair do valor digitado.');
    return null;
  }

  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));   // exclusivo
  const anoIni = new Date(Date.UTC(ref.ano, 0, 1));

  const dentro = (d, ini, fim) => !!d && d >= ini && d < fim;

  let mCriados = 0, mFechados = 0, aCriados = 0, aFechados = 0;
  // Quantos têm data de fechamento mas NÃO estão em estado "Fechado". Esses
  // não saem do backlog; contá-los como fechados aqui é o que descasa as
  // duas contas. Vão pro Logger porque, se o número for grande, é sinal de
  // que o vocabulário de Estado da base tem mais valores de "encerrado" do
  // que só "Fechado" — e aí a regra precisa ser revista, não o cálculo.
  let comDataSemEstado = 0;
  itens.forEach(it => {
    if (dentro(it.dtReporte, refIni, refFim)) mCriados++;
    if (dentro(it.dtReporte, anoIni, refFim)) aCriados++;
    const fechado = _bdChamadoFechado_(it.estado, it.dtFechado);
    if (fechado && dentro(it.dtFechado, refIni, refFim)) mFechados++;
    if (fechado && dentro(it.dtFechado, anoIni, refFim)) aFechados++;
    if (!fechado && dentro(it.dtFechado, refIni, refFim)) comDataSemEstado++;
  });
  if (comDataSemEstado) {
    Logger.log('BD-CORRETIVAS: ' + comDataSemEstado + ' chamado(s) com "Fechado em" no mês ' +
               'mas Estado diferente de "Fechado" — não contam como fechados nem saem do ' +
               'backlog. Confira os valores da coluna Estado.');
  }

  return { mCriados, mFechados, aCriados, aFechados,
           comDataSemEstado: comDataSemEstado, total: itens.length };
}

// Retorna { total, fatias:[{label,qtd}], lista:[{id,descricao,estado,equipe,dataReporte,diasAberto}] }
// ou null se não houver nenhum chamado emergencial em aberto no mês de
// referência pro empreendimento ativo.
function obterDadosBacklogEmergencialDetalhe_() {
  const ref    = obterMesReferencia_();
  const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
  const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));   // exclusivo

  const itens = _lerBdCorretivasEmergenciaisCru_()
    .filter(it => _histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim))
    .map(it => ({
      id:          it.id,
      descricao:   it.descricao,
      estado:      it.estado,
      equipe:      it.equipe,
      dataReporte: _histFormatarDataCurta_(it.dtReporte),
      diasAberto:  _histDiasAberto_(it.dtReporte, refFim)
    }));
  if (!itens.length) return null;

  const porEquipe = {};
  itens.forEach(it => {
    const eq = it.equipe || 'OUTROS';
    porEquipe[eq] = (porEquipe[eq] || 0) + 1;
  });
  const fatias = Object.keys(porEquipe)
    .map(eq => ({ label: eq, qtd: porEquipe[eq] }))
    .sort((a, b) => b.qtd - a.qtd);

  const lista = itens.slice().sort((a, b) => a.id.localeCompare(b.id));

  return { total: itens.length, fatias: fatias, lista: lista };
}

// Recalcula o backlog emergencial MÊS A MÊS a partir da BD-CORRETIVAS (mesma
// fonte crua e mesma regra — _histAbertoNoMes_ — de
// obterDadosBacklogEmergencialDetalhe_ acima), em vez de depender da coluna
// EMERGENCIAL da aba BACKLOG, que o usuário vinha preenchendo à mão mês a
// mês.
//
// `meses` é a lista de referência já produzida por obterDadosBacklogHistorico_
// (mesmos `ord`/rótulos que já desenham o eixo X do gráfico em
// Slide03_Corretivas.gs — reaproveitada aqui só pra saber QUAIS janelas
// mês/ano calcular, não os valores). Retorna um Map ord -> quantidade.
//
// Fonte única: como aqui é a mesma base+regra que já gera o "Backlog
// Emergencial — Detalhe" do MÊS DE REFERÊNCIA, o valor do último mês desta
// série tem que bater exatamente com o total daquele slide — se algum dia
// divergir, é sinal de bug nesta função, não de dado da planilha.
function obterDadosBacklogEmergencialHistoricoPorMes_(meses) {
  const itens = _lerBdCorretivasEmergenciaisCru_();
  const porOrd = new Map();
  if (!itens.length) return porOrd;

  // BD-CORRETIVAS tem histórico bruto desde 2021, mas mantém a mesma
  // checagem defensiva de quando a fonte era a aba curada à mão: só computa
  // (mesmo que dê 0) a partir do mês do chamado mais antigo encontrado pro
  // empreendimento ativo — meses anteriores a isso ficam fora do Map, e
  // quem chama mantém o valor manual pra eles em vez de zerar sem dado
  // nenhum (protege contra empreendimento novo/sem histórico emergencial).
  let primeiroOrd = null;
  itens.forEach(it => {
    if (!it.dtReporte) return;
    const ord = it.dtReporte.getUTCFullYear() * 100 + (it.dtReporte.getUTCMonth() + 1);
    if (primeiroOrd === null || ord < primeiroOrd) primeiroOrd = ord;
  });
  if (primeiroOrd === null) return porOrd;

  meses.forEach(m => {
    if (m.ord < primeiroOrd) return; // fora da cobertura da aba — mantém o valor manual
    const ano = Math.floor(m.ord / 100), mesIdx = (m.ord % 100) - 1;
    const refIni = new Date(Date.UTC(ano, mesIdx, 1));
    const refFim = new Date(Date.UTC(ano, mesIdx + 1, 1));
    let qtd = 0;
    itens.forEach(it => {
      if (_histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)) qtd++;
    });
    porOrd.set(m.ord, qtd);
  });
  return porOrd;
}


// Recalcula GERAL / FACILITIES / PROPERTY / LOCATÁRIO mês a mês a partir da
// BD-CORRETIVAS — mesma fonte e mesma regra (_histAbertoNoMes_) que a coluna
// EMERGENCIAL já usa desde que deixou de ser digitada.
//
// Motivo: essas quatro colunas da aba BACKLOG continuavam preenchidas à mão,
// e é aí que estava o descasamento que ninguém explicava — JUL/26 com 29
// chamados criados e 29 fechados (variação zero, agora contados na própria
// BD) e o backlog digitado subindo de 206 para 220.
//
// Classificação: LOCATÁRIO e PROPERTY saem de _resolverEquipeResponsaveis_
// (coluna "Responsáveis"); FACILITIES recebe TODO O RESTO — inclusive
// OPERACAO e chamado sem responsável —, que é a mesma regra do slide
// Backlog de Clientes — Facilities. Assim GERAL = FACILITIES + PROPERTY +
// LOCATÁRIO fecha por construção, em vez de depender de três digitações
// concordarem.
//
// `meses` é a lista de referência de obterDadosBacklogHistorico_ (só pra
// saber QUAIS janelas calcular). Retorna Map ord -> {geral, facilities,
// property, locatario}.
function obterDadosBacklogPorMesBD_(meses) {
  const itens = _lerBdCorretivasCru_();
  const porOrd = new Map();
  if (!itens.length) return porOrd;

  // Mesma guarda de obterFluxoCorretivasBD_: sem data legível a conta daria
  // zero em silêncio. Melhor manter o valor digitado.
  if (!itens.some(it => it.dtReporte)) {
    Logger.log('Backlog: BD-CORRETIVAS sem "Data de reporte" legível — ' +
               'mantendo os valores digitados na aba BACKLOG.');
    return porOrd;
  }

  // Só computa a partir do mês do chamado mais antigo da base: meses
  // anteriores ficam fora do Map e quem chama mantém o valor manual, em vez
  // de zerar um período que a BD simplesmente não cobre.
  let primeiroOrd = null;
  itens.forEach(it => {
    if (!it.dtReporte) return;
    const ord = it.dtReporte.getUTCFullYear() * 100 + (it.dtReporte.getUTCMonth() + 1);
    if (primeiroOrd === null || ord < primeiroOrd) primeiroOrd = ord;
  });
  if (primeiroOrd === null) return porOrd;

  meses.forEach(m => {
    if (m.ord < primeiroOrd) return;
    const ano = Math.floor(m.ord / 100), mesIdx = (m.ord % 100) - 1;
    const refIni = new Date(Date.UTC(ano, mesIdx, 1));
    const refFim = new Date(Date.UTC(ano, mesIdx + 1, 1));
    let geral = 0, facilities = 0, property = 0, locatario = 0;
    itens.forEach(it => {
      if (!_histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)) return;
      geral++;
      if      (it.equipe === 'LOCATARIO') locatario++;
      else if (it.equipe === 'PROPERTY')  property++;
      else                                facilities++;
    });
    porOrd.set(m.ord, { geral, facilities, property, locatario });
  });
  return porOrd;
}


// ==========================================
// BACKLOG DE CLIENTES — DETALHE — aba "BACKLOG - CLIENTES - DETALHES" da
// planilha de Histórico Validado
// ==========================================
// Mesmo formato bruto da aba de Backlog Emergencial (Estado, Data de
// reporte, Fechado em, Centro de Custos, EQUIPE), mas sem filtro de
// Prioridade — é o backlog de chamados de responsabilidade do locatário
// (coluna "Responsabilidade Locatario" da planilha), agrupado por CLIENTE em
// vez de Equipe. Mesma janela de mês de referência (_histAbertoNoMes_) e
// mesma exclusão do próprio condomínio de obterDadosChamadosClientes_ — as
// linhas "CONDOMÍNIO MEGA <EMPREENDIMENTO>" não são chamados de cliente.
function _abaBacklogClientesDetalhes_(ss) {
  let sheet = ss.getSheetByName('BACKLOG - CLIENTES - DETALHES');
  if (!sheet) {
    sheet = ss.getSheets().find(s => {
      const n = _histNorm_(s.getName());
      return n.indexOf('clientes') >= 0 && n.indexOf('detalhe') >= 0 && n.indexOf('backlog') >= 0;
    });
  }
  return sheet || null;
}

function _lerBacklogClientesDetalhes_() {
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  try {
    const ss    = SpreadsheetApp.openById(HISTORICO_VALIDADO_ID);
    const sheet = _abaBacklogClientesDetalhes_(ss);
    if (sheet) {
      const data = sheet.getDataRange().getDisplayValues();
      if (data.length >= 2) {
        const hdr      = data[0].map(_histNorm_);
        const cId      = hdr.findIndex(h => h.indexOf('id chamado') >= 0);
        const cCliente = hdr.findIndex(h => h.indexOf('cliente') >= 0);
        const cDesc    = hdr.findIndex(h => h.indexOf('descricao') >= 0);
        const cEstado  = hdr.findIndex(h => h.indexOf('estado') >= 0);
        const cCC      = hdr.findIndex(h => h.indexOf('centro de custo') >= 0);
        const cEquipe  = hdr.findIndex(h => h.indexOf('equipe') >= 0);
        const cReporte = hdr.findIndex(h => h.indexOf('data de reporte') >= 0);
        const cFechado = hdr.findIndex(h => h.indexOf('fechado em') >= 0);
        if (cId >= 0 && cCC >= 0 && cCliente >= 0) {
          const ref    = obterMesReferencia_();
          const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
          const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));

          const saida = [];
          for (let r = 1; r < data.length; r++) {
            const row = data[r];
            if (_histEmpChave_(row[cCC]) !== alvoEmp) continue;

            const estado    = cEstado  >= 0 ? String(row[cEstado] || '').trim() : '';
            const dtReporte = cReporte >= 0 ? _histParseDataHora_(row[cReporte]) : null;
            const dtFechado = cFechado >= 0 ? _histParseDataHora_(row[cFechado]) : null;
            if (!_histAbertoNoMes_(estado, dtReporte, dtFechado, refIni, refFim)) continue;

            saida.push({
              id:          String(row[cId] || '').trim(),
              cliente:     String(row[cCliente] || '').trim(),
              descricao:   cDesc   >= 0 ? _limparDescricaoChecklist_(String(row[cDesc] || '').trim()) : '',
              estado:      estado,
              equipe:      cEquipe >= 0 ? String(row[cEquipe] || '').trim().toUpperCase() : '',
              dataReporte: _histFormatarDataCurta_(dtReporte),
              diasAberto:  _histDiasAberto_(dtReporte, refFim)
            });
          }
          if (saida.length) return saida;
        }
      }
    }
  } catch (e) {
    Logger.log('_lerBacklogClientesDetalhes_: ' + e.message);
  }

  // Fallback: lê direto da BD-CORRETIVAS filtrando por LOCATÁRIO
  try {
    const rawCorr = _lerBdCorretivasCru_();
    if (rawCorr && rawCorr.length) {
      const ref    = obterMesReferencia_();
      const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
      const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));
      const saidaBD = [];
      rawCorr.forEach(it => {
        const ehLocatario = it.equipe === 'LOCATARIO' ||
                            _chamadoResponsabilidadeLocatario_(it.responsaveis || '') ||
                            _histNorm_(it.estado).indexOf('locatario') >= 0;
        if (!ehLocatario) return;
        if (!_histAbertoNoMes_(it.estado, it.dtReporte, it.dtFechado, refIni, refFim)) return;
        saidaBD.push({
          id:          it.id,
          cliente:     it.cliente || 'Cliente',
          descricao:   it.descricao || '',
          estado:      it.estado,
          equipe:      'LOCATARIO',
          dataReporte: _histFormatarDataCurta_(it.dtReporte),
          diasAberto:  _histDiasAberto_(it.dtReporte, refFim)
        });
      });
      if (saidaBD.length) return saidaBD;
    }
  } catch (eBD) {
    Logger.log('_lerBacklogClientesDetalhes_ BD fallback: ' + eBD.message);
  }

  return [];
}

// Retorna { total, fatias:[{label,qtd}], lista:[{id,cliente,descricao,dataReporte,diasAberto}] }
// ou null se a aba estiver vazia/ausente ou sem nenhuma linha do
// empreendimento ativo no mês de referência. Agrupamento por Cliente (top 4
// + "Outros"), igual a obterDadosChamadosClientes_ — só que aqui é um
// período único (o backlog atual), sem Abertos x Fechados.
function obterDadosBacklogClientesDetalhes_() {
  const itens = _lerBacklogClientesDetalhes_();
  if (!itens.length) return null;

  const semCondominio = itens.filter(c => c.cliente && !_ehCondominio_(c.cliente));

  const MAX_FATIAS = 5;
  const porCliente = {};
  semCondominio.forEach(c => { porCliente[c.cliente] = (porCliente[c.cliente] || 0) + 1; });
  const ranked = Object.keys(porCliente)
    .map(cli => ({ label: cli, qtd: porCliente[cli] }))
    .sort((a, b) => b.qtd - a.qtd);

  let fatias = ranked;
  if (ranked.length > MAX_FATIAS) {
    const top = ranked.slice(0, MAX_FATIAS - 1);
    const restoQtd = ranked.slice(MAX_FATIAS - 1).reduce((s, f) => s + f.qtd, 0);
    fatias = top.concat([{ label: 'Outros', qtd: restoQtd }]);
  }

  const lista = semCondominio
    .slice()
    .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR') || a.id.localeCompare(b.id))
    .map(c => ({ id: c.id, cliente: c.cliente, descricao: c.descricao, dataReporte: c.dataReporte, diasAberto: c.diasAberto }));

  return { total: semCondominio.length, fatias: fatias, lista: lista };
}


// ==========================================
// BACKLOG DE CLIENTES — FACILITIES / PROPERTIES — aba "BD-CORRETIVAS" da
// planilha BASE DE DADOS — QUADRO REM (BD_CORRETIVAS_ID, histórico bruto
// desde 2021, multi-empreendimento). Complementar ao Backlog de Clientes —
// Detalhe acima (que é só responsabilidade do LOCATÁRIO): aqui são os
// chamados de cliente que são responsabilidade DA OPERAÇÃO — todo chamado
// de cliente em aberto no mês de referência, MENOS os marcados como
// responsabilidade do locatário — divididos em DOIS slides por equipe
// responsável (Slide_BacklogClientesFacilities.gs /
// Slide_BacklogClientesProperties.gs).
// ==========================================

// Mapa NOME → EQUIPE (PROPERTY/FACILITIES/OPERACAO) dos responsáveis que
// aparecem na coluna "Responsáveis" do BD-CORRETIVAS (lista separada por
// vírgula, pode ter mais de um nome no mesmo chamado). Chave normalizada
// (_histNorm_) pra casar com/sem acento e maiúscula/minúscula.
const _RESPONSAVEL_EQUIPE_ = (function () {
  const bruto = {
    PROPERTY: [
      'Jonatas Augusto Ferreira', 'Matheus Ferreira Rompa', 'Luiz Guilherme Bernart',
      'Nicolly Correa Branco', 'Ivan Fuscolin Neto', 'Jéssica Garcia de Holanda',
      'Coordenação Propriedades', 'Lucas Beltrao Carneiro Santos', 'Ricardo Murilo da Silva',
      'Analista de Propriedades II', 'Fernando Cesar Iurk', 'Cleverson Boeno Moro',
      'Daniel Moreira', 'Pedro Henrique Dinalli Fidalgo', 'Wilson Francisco Leffer Junior'
    ],
    FACILITIES: [
      'Guilherme Heck', 'Henrique Augusto Lobo', 'Jessé J. Do Prado', 'Jessé Jandir do Prado',
      'José Ernesto', 'Leandro Genoveski', 'MEGA Curitiba', 'Mega Esteio', 'Mega Itajaí',
      'Rodrigo Habitzreuter', 'Paulo Augusto Maximiano', 'Dionatan Rek',
      // Supervisores/analistas de Facilities dos próprios Megas (os mesmos
      // nomes que aparecem em PROJETOS[].contatos, 01_Config.gs). Faltavam
      // aqui: como são justamente quem assina os chamados emergenciais, o
      // slide Backlog Emergencial — Detalhe mostrava 100% dos chamados como
      // "OUTROS" depois que a fonte passou a ser a BD-CORRETIVAS (que
      // resolve a equipe pela coluna Responsáveis, em vez da coluna EQUIPE
      // pronta que a aba curada antiga tinha).
      'Mauro Sergio Silva Coelho', 'Mauro Coelho',
      'Felipe Eduardo Campos',
      'Amanda de Campos Alexandre', 'Amanda de Campos'
    ],
    OPERACAO: [
      'Gerente Hangar', 'Leonardo Casagrande', 'Mariana Lucia Fernandes Rodrigues',
      'Motorista', 'Motoristas', 'Anderson Matheus Da Cunha', 'Ariel Glisczeski Barbosa',
      "Sergio Sivonei Sant'ana"
    ]
  };
  const mapa = {};
  Object.keys(bruto).forEach(equipe => bruto[equipe].forEach(nome => { mapa[_histNorm_(nome)] = equipe; }));
  return mapa;
})();

// "Responsabilidade Locatario" aparece como um item A MAIS dentro da
// própria lista de Responsáveis (mesmo padrão de placeholder que
// "Disponivel") — quando presente, PREVALECE sobre a equipe (mesmo que
// PROPERTY também esteja na lista): o chamado é do locatário, não da
// operação.
function _chamadoResponsabilidadeLocatario_(responsaveisTxt) {
  return _histNorm_(responsaveisTxt).indexOf('responsabilidade locatario') >= 0;
}

// Resolve a equipe responsável por um chamado a partir do texto bruto da
// coluna "Responsáveis" (lista separada por vírgula). Prioridade: 1) marca
// de responsabilidade do locatário (ver acima) → 'LOCATARIO'; 2) PROPERTY
// vence se qualquer nome da lista for PROPERTY (regra combinada do
// usuário: "quem vai prevalecer é Property"); 3) senão FACILITIES; 4)
// senão OPERACAO; 5) '' se nenhum nome reconhecido.
function _resolverEquipeResponsaveis_(responsaveisTxt) {
  if (_chamadoResponsabilidadeLocatario_(responsaveisTxt)) return 'LOCATARIO';
  const equipes = String(responsaveisTxt || '').split(',')
    .map(n => _RESPONSAVEL_EQUIPE_[_histNorm_(n)])
    .filter(Boolean);
  if (equipes.indexOf('PROPERTY') >= 0) return 'PROPERTY';
  if (equipes.indexOf('FACILITIES') >= 0) return 'FACILITIES';
  if (equipes.indexOf('OPERACAO') >= 0) return 'OPERACAO';
  return '';
}

// BD-CORRETIVAS traz "Id chamado" formatado como número decimal brasileiro
// (ex.: "2.490.644,00", coluna com formatação de moeda por engano na
// planilha de origem) — normaliza pro mesmo formato de dígitos puros
// ("2490644") usado no resto do deck/das outras abas.
function _idChamadoNormaliza_(v) {
  const txt = String(v || '').trim();
  if (!txt) return '';
  const n = parseFloat(txt.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? txt.replace(/\D/g, '') : String(Math.round(n));
}

function _abaBdCorretivas_(ss) {
  let sheet = ss.getSheetByName('BD-CORRETIVAS');
  if (!sheet) {
    sheet = ss.getSheets().find(s => _histNorm_(s.getName()).replace(/\s+/g, '-').indexOf('bd-corretivas') >= 0);
  }
  return sheet || null;
}

/**
 * Função utilitária para listar no Logger todas as colunas existentes na aba BD-CORRETIVAS.
 */
function listarColunasBdCorretivas() {
  try {
    const ss = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _abaBdCorretivas_(ss);
    if (!sheet) { Logger.log('Aba BD-CORRETIVAS não encontrada na planilha ' + BD_CORRETIVAS_ID); return; }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('====================================================');
    Logger.log('COLUNAS ENCONTRADAS NA BD-CORRETIVAS (' + headers.length + ' colunas):');
    headers.forEach((h, i) => Logger.log(`Coluna ${i + 1} (${String.fromCharCode(65 + (i % 26))}): "${h}"`));
    Logger.log('====================================================');
  } catch (e) {
    Logger.log('Erro ao listar colunas da BD-CORRETIVAS: ' + e.message);
  }
}

// Lê a aba BD-CORRETIVAS filtrando por Centro de Custos do empreendimento
// ativo, chamados de CLIENTE de verdade (exclui "CONDOMÍNIO MEGA
// <CIDADE>" — mesma regra de _ehCondominio_), em aberto no mês de
// referência (_histAbertoNoMes_), e que NÃO sejam responsabilidade do
// locatário (_chamadoResponsabilidadeLocatario_ na coluna Responsáveis) —
// esses já têm slide próprio (Slide_BacklogClientesDetalhes.gs).
function _lerBdCorretivasChamadosClientes_() {
  const alvoEmp = _histEmpChave_(getProjetoAtivo().nome);
  try {
    const ss    = SpreadsheetApp.openById(BD_CORRETIVAS_ID);
    const sheet = _abaBdCorretivas_(ss);
    if (!sheet) return [];

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) return [];

    const hdr      = data[0].map(_histNorm_);
    const cId      = hdr.findIndex(h => h.indexOf('id chamado') >= 0);
    const cCliente = hdr.findIndex(h => h.indexOf('cliente') >= 0);
    const cDesc    = hdr.findIndex(h => h.indexOf('descricao') >= 0);
    const cEstado  = hdr.findIndex(h => h.indexOf('estado') >= 0);
    const cCC      = hdr.findIndex(h => h.indexOf('centro de custo') >= 0);
    const cReporte = hdr.findIndex(h => h.indexOf('data de reporte') >= 0);
    const cFechado = hdr.findIndex(h => h.indexOf('fechado em') >= 0);
    const cResp    = hdr.findIndex(h => h.indexOf('responsaveis') >= 0);
    if (cId < 0 || cCC < 0 || cCliente < 0) return [];

    const ref    = obterMesReferencia_();
    const refIni = new Date(Date.UTC(ref.ano, ref.index, 1));
    const refFim = new Date(Date.UTC(ref.ano, ref.index + 1, 1));   // exclusivo

    const saida = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (_histEmpChave_(row[cCC]) !== alvoEmp) continue;

      const cliente = String(row[cCliente] || '').trim();
      if (!cliente || _ehCondominio_(cliente)) continue;

      const responsaveis = cResp >= 0 ? row[cResp] : '';
      if (_chamadoResponsabilidadeLocatario_(responsaveis)) continue;   // é do locatário, não da operação

      const estado    = cEstado  >= 0 ? String(row[cEstado] || '').trim() : '';
      const dtReporte = cReporte >= 0 ? _histParseDataHora_(row[cReporte]) : null;
      const dtFechado = cFechado >= 0 ? _histParseDataHora_(row[cFechado]) : null;
      if (!_histAbertoNoMes_(estado, dtReporte, dtFechado, refIni, refFim)) continue;

      saida.push({
        id:          _idChamadoNormaliza_(row[cId]),
        cliente:     cliente,
        descricao:   cDesc >= 0 ? _limparDescricaoChecklist_(String(row[cDesc] || '').trim()) : '',
        dataReporte: _histFormatarDataCurta_(dtReporte),
        diasAberto:  _histDiasAberto_(dtReporte, refFim),
        equipe:      _resolverEquipeResponsaveis_(responsaveis)
      });
    }
    return saida;
  } catch (e) {
    Logger.log('_lerBdCorretivasChamadosClientes_: ' + e.message);
    return [];
  }
}

// Agrupa uma lista já filtrada de chamados de cliente (BD-CORRETIVAS) por
// Cliente — mesma lógica (top 4 + "Outros") de obterDadosBacklogClientesDetalhes_.
// Retorna { total, fatias:[{label,qtd}], lista:[{id,cliente,descricao,dataReporte,diasAberto,equipe}] }
// ou null se a lista filtrada vier vazia.
function _agruparBacklogClientesPorCliente_(itens) {
  if (!itens.length) return null;

  const MAX_FATIAS = 5;
  const porCliente = {};
  itens.forEach(c => { porCliente[c.cliente] = (porCliente[c.cliente] || 0) + 1; });
  const ranked = Object.keys(porCliente)
    .map(cli => ({ label: cli, qtd: porCliente[cli] }))
    .sort((a, b) => b.qtd - a.qtd);

  let fatias = ranked;
  if (ranked.length > MAX_FATIAS) {
    const top = ranked.slice(0, MAX_FATIAS - 1);
    const restoQtd = ranked.slice(MAX_FATIAS - 1).reduce((s, f) => s + f.qtd, 0);
    fatias = top.concat([{ label: 'Outros', qtd: restoQtd }]);
  }

  const lista = itens
    .slice()
    .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR') || a.id.localeCompare(b.id));

  return { total: itens.length, fatias: fatias, lista: lista };
}

// Backlog de Clientes — FACILITIES: chamados cuja equipe resolvida
// (_resolverEquipeResponsaveis_) é FACILITIES. Também recebe OPERAÇÃO e
// equipe não resolvida (nome fora do mapa) — são os casos residuais mais
// próximos operacionalmente dos dois grupos que este par de slides separa.
function obterDadosBacklogClientesFacilities_() {
  const itens = _lerBdCorretivasChamadosClientes_().filter(c => c.equipe !== 'PROPERTY');
  return _agruparBacklogClientesPorCliente_(itens);
}

// Backlog de Clientes — PROPERTIES: chamados cuja equipe resolvida é
// PROPERTY.
function obterDadosBacklogClientesProperties_() {
  const itens = _lerBdCorretivasChamadosClientes_().filter(c => c.equipe === 'PROPERTY');
  return _agruparBacklogClientesPorCliente_(itens);
}
