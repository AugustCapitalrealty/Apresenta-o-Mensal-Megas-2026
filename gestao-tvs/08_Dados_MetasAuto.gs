/**
 * ARQUIVO: 08_Dados_MetasAuto.gs
 * DESCRIÇÃO: "Valores automáticos" das Metas — port de megas-mensal/02_Dados.gs
 * (obterMetaAuto_ e toda a cadeia por trás) para o gestão-tvs.
 *
 * POR QUE ESTE ARQUIVO EXISTE: no Megas mensal, o slide de Metas lê a aba
 * METAS da planilha "Gestão à Vista TV" (a mesma ID_PLANILHA daqui) e
 * SOBRESCREVE o Real Mês/Real Acum. de alguns indicadores (Check-list/SLA
 * Preventivas, Custo M², Cumprir Orçamento, Taxa de Reabertura, Check-list/SLA
 * Terceiros) pelo valor calculado na hora, com tendência ▲/▼ vs mês anterior —
 * em vez do valor digitado à mão na planilha da TV. O gestão-tvs usava só o
 * valor digitado. Este arquivo replica a MESMA conta, lendo as MESMAS
 * planilhas-fonte de cada cidade (spreadsheetId/ppcId/reaberturaId agora em
 * Config.gs, UNITS[]), para que o número batido aqui seja idêntico ao que o
 * Megas mensal mostra.
 *
 * DIFERENÇA DE ARQUITETURA vs megas-mensal: lá existe um "projeto ativo"
 * global (getProjetoAtivo()/setProjetoAtivo()); aqui o gestão-tvs já opera
 * com um `unit` explícito passado por parâmetro (padrão UNITS.forEach), então
 * toda função abaixo recebe `unit` em vez de ler estado global — mesma
 * lógica, sem a variável globalmarker.
 *
 * ÍNDICE DE DISPONIBILIDADE FICA DE FORA DE PROPÓSITO: pedido do usuário
 * (ver conversa) — esse indicador continua digitado à mão na aba METAS,
 * assim como já era.
 */

// ==========================================
// UTILITÁRIOS DE TEXTO/NÚMERO (cópia fiel de megas-mensal/02_Dados.gs e
// 01_Config.gs — não dependem de projeto ativo, então a cópia é 1:1)
// ==========================================
function _histNorm_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function _histEmpChave_(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function _histParseMes_(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mes = parseInt(m[1], 10), ano = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) return null;
  return { label: String(mes).padStart(2, '0') + '/' + ano, ord: ano * 100 + mes };
}

// Converte "66.408" → 66408, "27,91" → 27.91, "100" → 100, "5m45s" → NaN
function _histNum_(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (/[a-z]/i.test(s)) return NaN;
  s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\./g, '');
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

// Converte "80,00%" / "200,00%" → 80 / 200 (número, escala 0-100+).
function _histPct_(v) {
  return _histNum_(String(v == null ? '' : v).replace('%', ''));
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

function formatarNumeroBR(valor) {
  if (valor === null || valor === undefined || valor === '' || valor === '-') return '-';
  const s = String(valor).trim();
  if (/[^\d.,\-\s]/.test(s)) return s;
  let n;
  if (s.includes(',')) n = Number(s.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ''));
  else n = Number(s);
  if (isNaN(n)) return s;
  const temDecimal = Math.abs(n % 1) > 1e-9;
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: temDecimal ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function formatarPorcentagem(val) {
  if (!val && val !== 0) return '-';
  let s = String(val);
  if (!s.includes('%') && !isNaN(parseFloat(s))) {
    let n = parseFloat(s);
    if (n <= 1 && n !== 0) n = n * 100;
    return formatarNumeroBR(Math.round(n * 100) / 100) + '%';
  }
  return s;
}

function formatarMoedaSlide(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarMoedaSlideSemCentavos_(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return 'R$ ' + Math.round(num).toLocaleString('pt-BR');
}

// Texto e cor da tendência vs mês anterior a partir de um delta numérico.
// menorMelhor=true → cair é bom (verde). Adaptado para CR_DESIGN_SYSTEM.colors
// (gestão-tvs não tem o objeto legado CORES do Megas).
function tendenciaTexto_(delta, menorMelhor, neutro) {
  const cinza = CR_DESIGN_SYSTEM.colors.textBody;
  if (delta == null || isNaN(delta)) return { txt: '', cor: cinza };
  if (delta === 0) return { txt: '▬ 0', cor: cinza };
  const seta = delta > 0 ? '▲' : '▼';
  const txt  = seta + ' ' + (delta > 0 ? '+' : '−') + formatarNumeroBR(Math.abs(delta));
  if (neutro) return { txt: txt, cor: cinza };
  const bom = menorMelhor ? delta < 0 : delta > 0;
  return { txt: txt, cor: bom ? CR_DESIGN_SYSTEM.colors.accentGreen : CR_DESIGN_SYSTEM.colors.accentRed };
}


// ==========================================
// MÊS DE REFERÊNCIA (por unidade) — mesma lógica de
// megas-mensal/02_Dados.gs, obterMesReferencia_, lendo unit.spreadsheetId
// ==========================================
const MESES_NOME_REF_TV = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                           'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const MESES_3_REF_TV    = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
let _mesRefCacheTV = {};

function obterMesReferenciaUnit_(unit) {
  if (_mesRefCacheTV[unit.name]) return _mesRefCacheTV[unit.name];

  const hoje = new Date();
  let idx = -1;
  try {
    const ss    = SpreadsheetApp.openById(unit.spreadsheetId);
    const sheet = ss.getSheetByName('DADOS') || ss.getSheets()[0];
    const cab   = String(sheet.getRange(1, 2).getDisplayValue() || '').toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    idx = MESES_3_REF_TV.findIndex(m => cab.indexOf(m) === 0);
  } catch (e) {
    Logger.log('Mês de referência (' + unit.name + '): usando fallback de calendário. ' + e.message);
  }
  if (idx < 0) {
    const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    idx = ant.getMonth();
  }
  const ano  = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const nome = MESES_NOME_REF_TV[idx];

  const ref = {
    index : idx,
    nome  : nome,
    curto : nome.charAt(0) + nome.slice(1).toLowerCase(),
    ano   : ano,
    label : nome + ' / ' + ano,
    rodape: nome.charAt(0) + nome.slice(1, 3).toLowerCase() + '/' + ano
  };
  _mesRefCacheTV[unit.name] = ref;
  return ref;
}


// ==========================================
// HISTÓRICO VALIDADO — tendência ▲/▼ vs mês anterior (por unidade)
// ==========================================
function lerHistoricoValidadoUnit_(indicador, unit, opts) {
  opts = opts || {};
  const alvoEmp = _histEmpChave_(opts.empreendimento || unit.name);
  const alvoInd = _histNorm_(indicador);
  const saida   = [];

  try {
    const ss   = SpreadsheetApp.openById(HISTORICO_VALIDADO_ID);
    const abas = opts.aba ? [ss.getSheetByName(opts.aba)] : ss.getSheets();

    abas.forEach(sheet => {
      if (!sheet) return;
      const data = sheet.getDataRange().getDisplayValues();
      if (data.length < 2) return;

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
    Logger.log('lerHistoricoValidadoUnit_("' + indicador + '", ' + unit.name + '): ' + e.message);
  }

  saida.sort((a, b) => a.ord - b.ord);
  const vistos = {};
  saida.forEach(p => { vistos[p.ord] = p; });
  return Object.keys(vistos).sort((a, b) => a - b).map(k => vistos[k]);
}

// Variação do valor ATUAL vs o mês anterior no HISTÓRICO VALIDADO.
function deltaVsMesAnteriorUnit_(atual, indicador, aba, unit) {
  const atualN = _numLenient_(atual);
  if (isNaN(atualN)) return null;
  const serie = lerHistoricoValidadoUnit_(indicador, unit, aba ? { aba } : {});
  if (!serie.length) return null;

  let ordRef = Infinity;
  try { const r = obterMesReferenciaUnit_(unit); ordRef = r.ano * 100 + (r.index + 1); } catch (e) {}

  let prev = null;
  serie.forEach(p => { if (p.ord < ordRef && (!prev || p.ord > prev.ord)) prev = p; });
  if (!prev) {
    const outros = serie.filter(p => p.ord !== ordRef);
    if (outros.length) prev = outros[outros.length - 1];
  }
  if (!prev) return null;

  return { atual: atualN, anterior: prev.valor, delta: Math.round((atualN - prev.valor) * 100) / 100 };
}


// ==========================================
// PREVENTIVAS (Check-list/SLA) — aba PREVENTIVAS da planilha da cidade
// ==========================================
function obterDadosPreventivasUnit_(unit) {
  try {
    const ss    = SpreadsheetApp.openById(unit.spreadsheetId);
    const sheet = ss.getSheetByName('PREVENTIVAS');
    if (!sheet) throw new Error('Aba PREVENTIVAS não encontrada.');

    const data = sheet.getDataRange().getValues();
    let res = {
      mensal: { previstas: '-', realizadas: '-', sla: '-' },
      anual : { previstas: '-', realizadas: '-', sla: '-' }
    };

    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

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
    }

    return res;
  } catch (e) {
    Logger.log('obterDadosPreventivasUnit_(' + unit.name + '): ' + e.message);
    return null;
  }
}


// ==========================================
// CUSTO M² — aba METRO QUADRADO da planilha da cidade (helpers puros,
// cópia fiel de megas-mensal/02_Dados.gs)
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
    if (MESES_VALIDOS.indexOf(mesKey) < 0) continue;

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
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function parseNumeroCusto_(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  let s = String(valor).trim();
  if (!s) return null;
  s = s
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/[()]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.abs(n);
}

let _custoM2CacheTV = {};

function obterDadosCustoM2Unit_(unit) {
  if (_custoM2CacheTV[unit.name]) return _custoM2CacheTV[unit.name];
  try {
    const ss    = SpreadsheetApp.openById(unit.spreadsheetId);
    const sheet = ss.getSheetByName('METRO QUADRADO');
    if (!sheet) throw new Error('Aba METRO QUADRADO não encontrada');

    const rango = sheet.getDataRange();
    const data  = rango.getDisplayValues();
    let brutos = null;
    try { brutos = rango.getValues(); } catch (e) { Logger.log('Custo m² (' + unit.name + '): getValues indisponível — ' + e.message); }

    const numeroCelula = (linha, col) => {
      const cru = brutos && brutos[linha] ? brutos[linha][col] : null;
      if (typeof cru === 'number' && isFinite(cru)) return Math.abs(cru);
      return parseNumeroCusto_(data[linha][col]);
    };
    const header = data[0];
    const meses  = extrairMesesCustoM2_(header);

    const normLbl = s => String(s || '')
      .replace(/ /g, ' ')
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    let idxComIptu = -1;
    for (let r = 0; r < data.length; r++) {
      const lbl = normLbl(data[r][0]);
      if (lbl.includes('TOTAL ÁREA') && lbl.includes('IPTU E SEGURO')) idxComIptu = r + 1;
    }
    if (idxComIptu < 0) throw new Error('"TOTAL ÁREA COM IPTU E SEGURO" não encontrado na aba METRO QUADRADO');

    const tabela = { 'Orç 2026': [], 'Real 2026': [] };
    meses.forEach(m => {
      tabela['Orç 2026'].push(numeroCelula(idxComIptu, m.colOrc));
      tabela['Real 2026'].push(numeroCelula(idxComIptu, m.colReal));
    });

    const temDados = i => tabela['Orç 2026'][i] !== null && tabela['Real 2026'][i] !== null;
    let mesRef = null;

    const mesesIdx = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const a1 = normalizarTextoCusto_(data[0][0]).substring(0, 3);
    const idxManual = mesesIdx.indexOf(a1);
    if (idxManual >= 0 && idxManual < meses.length && temDados(idxManual)) {
      mesRef = Object.assign({}, meses[idxManual], { index: idxManual });
    }
    if (!mesRef) {
      const mesAtualIdx = new Date().getMonth();
      if (mesAtualIdx < meses.length && temDados(mesAtualIdx)) {
        mesRef = Object.assign({}, meses[mesAtualIdx], { index: mesAtualIdx });
      } else {
        for (let i = meses.length - 1; i >= 0; i--) {
          if (temDados(i)) { mesRef = Object.assign({}, meses[i], { index: i }); break; }
        }
      }
    }
    if (!mesRef) throw new Error('Nenhum mês com dados completos encontrado');

    const orcado    = tabela['Orç 2026'][mesRef.index];
    const realizado = tabela['Real 2026'][mesRef.index];

    const _resCusto = {
      referencia: { mes: mesRef.nome, mesExtenso: mesRef.nomeMesExtenso, ano: mesRef.ano, index: mesRef.index },
      kpis: { custo: realizado, meta: orcado },
      tabela,
      meses: meses.map(m => m.nome)
    };
    _custoM2CacheTV[unit.name] = _resCusto;
    return _resCusto;
  } catch (e) {
    Logger.log('Erro Custo M2 (' + unit.name + '): ' + e.message);
    return null;
  }
}

// Custo por m² ACUMULADO = MÉDIA dos R$/m² mensais até o mês de referência.
function obterCustoM2AcumuladoUnit_(unit) {
  const cm = obterDadosCustoM2Unit_(unit);
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


// ==========================================
// PPC — % das manutenções planejadas (planilha externa, unit.ppcId)
// ==========================================
function obterDadosPPCUnit_(unit) {
  const id = unit.ppcId;
  if (!id) return null;
  try {
    const ss    = SpreadsheetApp.openById(id);
    const sheet = ss.getSheetByName('DASHBOARD');
    if (!sheet) return null;
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length < 9) return null;

    const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const linhaMes       = data[3];
    const linhaAderencia = data[6];
    const linhaMeta      = data[7];
    const linhaAcumulado = data[8];

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
    Logger.log('obterDadosPPCUnit_(' + unit.name + '): ' + e.message);
    return null;
  }
}


// ==========================================
// TAXA DE REABERTURA (Analista) — planilha externa, unit.reaberturaId
// ==========================================
function obterDadosTaxaReaberturaUnit_(unit) {
  const id = unit.reaberturaId;
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
    Logger.log('obterDadosTaxaReaberturaUnit_(' + unit.name + '): ' + e.message);
    return null;
  }
}


// ==========================================
// CUMPRIR ORÇAMENTO (Analista) — aba FINANCEIRO BRIDGE da planilha da cidade
// ==========================================
function obterDadosOrcamentoAnalistaUnit_(unit) {
  try {
    const ss    = SpreadsheetApp.openById(unit.spreadsheetId);
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

    const bateRubrica = norm => {
      if (norm.includes('energia') && norm.includes('eletric'))  return true;
      if (norm === 'agua' || norm.indexOf('agua') === 0)         return true;
      if (norm.includes('telefon'))                               return true;
      if (norm.includes('materia') && norm.includes('consumo'))  return true;
      if (norm.includes('informatic'))                            return true;
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
    Logger.log('obterDadosOrcamentoAnalistaUnit_(' + unit.name + '): ' + e.message);
    return null;
  }
}


// ==========================================
// SÉRIE DE METAS DO ANALISTA — aba META da própria planilha da cidade
// (Check-list/SLA Terceiros)
// ==========================================
function _lerSerieMetaAnalistaUnit_(matchFn, unit) {
  const saida = [];
  try {
    const ss    = SpreadsheetApp.openById(unit.spreadsheetId);
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
      porOrd[pm.ord] = { ord: pm.ord, mes: vMes, acum: vAcum };
    });
    Object.keys(porOrd).forEach(k => saida.push(porOrd[k]));
    saida.sort((a, b) => a.ord - b.ord);
  } catch (e) {
    Logger.log('_lerSerieMetaAnalistaUnit_(' + unit.name + '): ' + e.message);
  }
  return saida;
}


// ==========================================
// MOTOR — VALOR AUTOMÁTICO POR DESCRIÇÃO (port de obterMetaAuto_,
// SEM o ramo de Índice de Disponibilidade — fica manual, a pedido do usuário)
// ==========================================
function obterMetaAutoUnit_(descricao, metaStr, qual, unit) {
  const d = _histNorm_(descricao);
  const ehMensal = qual === 'mes';

  try {
    // CHECK-LIST / SLA (Preventivas) — exceto SLA de Terceiros (Analista)
    if ((d.includes('check') || d.includes('sla')) && !d.includes('terceiro') && !d.includes('acesso')) {
      const p = obterDadosPreventivasUnit_(unit);
      if (!p) return null;
      const val = ehMensal ? p.mensal.sla : p.anual.sla;
      if (!val || val === '-') return null;
      const dv = deltaVsMesAnteriorUnit_(val, ehMensal ? 'SLA MENSAL' : 'SLA ACUMULADO', 'PREVENTIVAS', unit);
      return { valor: String(val), delta: dv ? dv.delta : null, menorMelhor: false };
    }

    // CUSTO M² (menor = melhor); tendência da própria aba METRO QUADRADO;
    // % de manutenções planejadas vem do PPC (unit.ppcId)
    if (d.includes('custo') && (d.includes('m2') || d.includes('m²'))) {
      const cm = obterDadosCustoM2Unit_(unit);
      if (!cm) return null;
      const keys  = Object.keys(cm.tabela);
      const kReal = keys.find(k => /^real/i.test(k) && !/sem iptu/i.test(k));
      const arr   = (kReal && cm.tabela[kReal]) || [];
      const i     = cm.referencia.index;

      let valorNum, metaNum, delta = null;
      if (ehMensal) {
        valorNum = cm.kpis.custo;
        metaNum  = cm.kpis.meta;
        if (i > 0 && arr[i] != null && arr[i - 1] != null) {
          delta = Math.round((Number(arr[i]) - Number(arr[i - 1])) * 100) / 100;
        }
      } else {
        const ac = obterCustoM2AcumuladoUnit_(unit);
        if (!ac || ac.realizado == null) return null;
        valorNum = ac.realizado;
        metaNum  = ac.orcado;
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

      const barra = String(metaStr || '').indexOf('/');
      let delta2 = null, menorMelhor2 = false;
      if (barra >= 0) {
        const ppc = obterDadosPPCUnit_(unit);
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
          menorMelhor2 = false;
        } else {
          valor += ' / 0%';
          if (metaValor != null) metaValor += ' / ' + String(metaStr).slice(barra + 1).trim();
        }
      }
      return { valor, metaValor, delta, delta2, menorMelhor: true, menorMelhor2 };
    }

    // CHECK-LIST/SLA - TERCEIROS (Analista) — aba META da própria planilha
    if (d.includes('terceiro')) {
      const serie = _lerSerieMetaAnalistaUnit_(txt => _histNorm_(txt).includes('terceiro'), unit);
      if (!serie.length) return null;
      const ref = obterMesReferenciaUnit_(unit);
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

    // TAXA DE REABERTURA (Analista) — unit.reaberturaId
    if (d.includes('reabertura')) {
      const serie = obterDadosTaxaReaberturaUnit_(unit);
      if (!serie || !serie.length) return null;
      const ref = obterMesReferenciaUnit_(unit);
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
    if (d.includes('orcamento') || d.includes('orçamento')) {
      const od = obterDadosOrcamentoAnalistaUnit_(unit);
      if (!od || !od.serie.length) return null;
      const ref = obterMesReferenciaUnit_(unit);
      const refOrd = ref.ano * 100 + (ref.index + 1);
      const idx = od.serie.findIndex(s => s.ord === refOrd);
      if (idx < 0) return null;

      const somaAte = (campo, fim) => od.serie.slice(0, fim + 1).reduce((s, m) => s + m[campo], 0);

      let orcVal, realVal, realPrev = null;
      if (ehMensal) {
        orcVal = od.serie[idx].orc; realVal = od.serie[idx].real;
        if (idx > 0) realPrev = od.serie[idx - 1].real;
      } else {
        orcVal = somaAte('orc', idx); realVal = somaAte('real', idx);
        if (idx > 0) realPrev = somaAte('real', idx - 1);
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
    Logger.log('obterMetaAutoUnit_("' + descricao + '", ' + unit.name + '): ' + e.message);
  }
  return null;
}

// Tendência de uma célula: um selo (indicador simples) ou dois concatenados
// (indicador composto, ex.: Custo M² tem a tendência do R$ e a da % de
// manutenções planejadas juntas). Segmentos separados: cada um com sua
// própria cor, para não esconder uma parte ruim atrás de uma boa.
function _metasTrendUnit_(auto) {
  const t1 = tendenciaTexto_(auto.delta, auto.menorMelhor);
  if (auto.delta2 == null || isNaN(auto.delta2)) {
    return t1.txt ? { segmentos: [t1] } : null;
  }
  const t2 = tendenciaTexto_(auto.delta2, auto.menorMelhor2);
  const segmentos = [t1, t2].filter(s => s.txt);
  return segmentos.length ? { segmentos: segmentos } : null;
}
