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
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('DADOS') || ss.getSheets()[0];
    const cab   = String(sheet.getRange(1, 2).getDisplayValue() || '').toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    idx = MESES_3_REF.findIndex(m => cab.indexOf(m) === 0);
  } catch (e) {
    Logger.log('Mês de referência: usando fallback de calendário. ' + e.message);
  }
  if (idx < 0) {
    const ant = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês anterior
    idx = ant.getMonth();
  }
  // Se o mês de referência for "maior" que o mês atual, é do ano passado
  const ano  = idx > hoje.getMonth() ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const nome = MESES_NOME_REF[idx];

  const ref = {
    index : idx,
    nome  : nome,                                              // MAIO
    curto : nome.charAt(0) + nome.slice(1).toLowerCase(),      // Maio
    ano   : ano,
    label : nome + ' / ' + ano,                                // MAIO / 2026
    rodape: nome.charAt(0) + nome.slice(1, 3).toLowerCase() + '/' + ano  // Mai/2026
  };
  _mesRefCache[chave] = ref;
  return ref;
}


// ==========================================
// ÁREA (m²) DERIVADA DO CUSTO M²
// ==========================================
// área = Total Realizado (Financeiro Mensal) ÷ Custo R$/m² do mês.
// Permite expressar qualquer valor financeiro em R$/m² (a diretoria gosta).
// Retorna null se faltar alguma das abas → os slides simplesmente omitem
// o R$/m² sem quebrar. Resultado em cache por cidade.
// ==========================================
let _areaM2Cache = {};

function obterAreaM2_() {
  const chave = getProjetoAtivo().nome;
  if (chave in _areaM2Cache) return _areaM2Cache[chave];

  let area = null;
  try {
    const custo = obterDadosCustoM2();
    const fin   = obterDadosFinanceiroMensal_();
    if (custo && custo.kpis && custo.kpis.custo > 0 && fin && fin.totalRealizado > 0) {
      area = fin.totalRealizado / custo.kpis.custo;
      Logger.log('Área m² derivada: ' + Math.round(area).toLocaleString('pt-BR') +
                 ' m² (Real ' + fin.totalRealizado + ' ÷ Custo ' + custo.kpis.custo + ')');
    }
  } catch (e) {
    Logger.log('Área m²: não foi possível derivar. ' + e.message);
  }
  _areaM2Cache[chave] = area;
  return area;
}


// ==========================================
// DADOS DASHBOARD (Slide 01)
// ==========================================
function obterDadosDashboard() {
  const SHEET_NAME = 'DADOS';
  let dataMap = new Map();
  let headers = ['DEZ', 'NOV', "DEZ'24"];

  try {
    const ss = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    const data = sheet.getDataRange().getValues();
    if (data.length > 0) {
      headers = [
        String(data[0][1] || 'DEZ').toUpperCase(),
        String(data[0][2] || 'NOV').toUpperCase(),
        String(data[0][3] || 'ANO ANT').toUpperCase()
      ];
    }

    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (row[0]) {
        let key = String(row[0]).trim();
        dataMap.set(key, {
          atual  : row[1] !== '' ? String(row[1]) : '-',
          mesAnt : row[2] !== '' ? String(row[2]) : '-',
          anoAnt : row[3] !== '' ? String(row[3]) : '-'
        });
      }
    }
  } catch (e) {
    Logger.log('Erro Dashboard: ' + e.message);
  }
  return { map: dataMap, headers: headers };
}


// ==========================================
// DADOS PREVENTIVAS (Slide 02)
// ==========================================
function obterDadosPreventivas() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('PREVENTIVAS');
    if (!sheet) throw new Error('Aba PREVENTIVAS não encontrada.');

    const data = sheet.getDataRange().getValues();
    let res = {
      mensal          : { titulo: 'VISÃO MENSAL',    previstas: '-', realizadas: '-', sla: '-' },
      anual           : { titulo: 'VISÃO ACUMULADA', previstas: '-', realizadas: '-', sla: '-' },
      servicosForaSla : [],
      counts          : { facilities: 0, terceiros: 0 }
    };

    // Só acrescenta o mês entre parênteses se o cabeçalho for de fato um mês
    // (planilhas com cabeçalho "MENSAL" geravam "VISÃO MENSAL (MENSAL)")
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
        const servico = String(row[6] || '').trim();
        const equipe  = norm(row[5]);
        if (servico && servico !== '-' && norm(servico) !== 'servico') {
          let type = 'OUTROS';
          if      (equipe.includes('facilities')) { res.counts.facilities++; type = 'FACILITIES'; }
          else if (equipe.includes('terceiros'))  { res.counts.terceiros++;  type = 'TERCEIROS';  }
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

    return res;

  } catch (e) {
    Logger.log('Erro Preventivas: ' + e.message);
    return { mensal: {}, anual: {}, servicosForaSla: [], counts: {} };
  }
}


// ==========================================
// DADOS CORRETIVAS (Slide 03)
// ==========================================
function obterDadosCorretivasV6() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('INDICADORES');
    if (!sheet) throw new Error('Aba INDICADORES não encontrada.');

    const data = sheet.getDataRange().getDisplayValues();

    let kpiData = {
      mCriados: '-', mFechados: '-', mTempo: '-', mDisp: '-',
      aCriados: '-', aFechados: '-', aTempo: '-', aDisp: '-'
    };

    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    data.forEach(row => {
      const ind = norm(row[0]);
      if      (ind.includes('criado')  && !ind.includes('tempo')) { kpiData.mCriados  = row[1]; kpiData.aCriados  = row[2]; }
      else if (ind.includes('fechado') && !ind.includes('tempo')) { kpiData.mFechados = row[1]; kpiData.aFechados = row[2]; }
      else if (ind.includes('tempo')   &&  ind.includes('medio')) { kpiData.mTempo = formatarTempo(row[1]); kpiData.aTempo = formatarTempo(row[2]); }
      else if (ind.includes('disponibilidade'))                    { kpiData.mDisp    = row[1]; kpiData.aDisp     = row[2]; }
    });

    return {
      mensal: {
        titulo: 'VISÃO MENSAL',
        kpis: [
          { l: 'Chamados criados',                   v: kpiData.mCriados  },
          { l: 'Chamados fechados',                  v: kpiData.mFechados },
          { l: 'Tempo médio entre criado e fechado', v: kpiData.mTempo    },
          { l: 'Índice de disponibilidade',          v: kpiData.mDisp     }
        ]
      },
      anual: {
        titulo: 'VISÃO ACUMULADA',
        kpis: [
          { l: 'Chamados criados',                   v: kpiData.aCriados  },
          { l: 'Chamados fechados',                  v: kpiData.aFechados },
          { l: 'Tempo médio entre criado e fechado', v: kpiData.aTempo    },
          { l: 'Índice de disponibilidade',          v: kpiData.aDisp     }
        ]
      }
    };

  } catch (e) {
    Logger.log('Erro planilha Slide 03 (Corretivas): ' + e.message);
    return null;
  }
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

    return {
      mensal: {
        titulo: 'VISÃO MENSAL',
        kpis: [
          { l: 'Fluxo de pessoas',         v: kpis.fluxo       },
          { l: 'Tempo médio de acesso',    v: kpis.tempoAcesso },
          { l: 'Turnover de equipe',       v: kpis.turnover    },
          { l: 'Ocorrências de segurança', v: kpis.seguranca   }
        ]
      },
      anual: {
        titulo: 'VISÃO ACUMULADA',
        kpis: [
          { l: 'Fluxo de pessoas',         v: kpis.aFluxo       },
          { l: 'Tempo médio de acesso',    v: kpis.aTempoAcesso },
          { l: 'Turnover de equipe',       v: kpis.aTurnover    },
          { l: 'Ocorrências de segurança', v: kpis.aSeguranca   }
        ]
      }
    };

  } catch (e) {
    Logger.log('Erro planilha Slide 04 (Acesso/Segurança): ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS FINANCEIROS (Slide 05 - Financeiro Mensal)
// ==========================================
function obterDadosFinanceiro() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('FINANCEIRO');
    if (!sheet) throw new Error('Aba FINANCEIRO não encontrada.');

    const data = sheet.getDataRange().getValues();

    let totalOrcado    = 0;
    let totalRealizado = 0;
    let items          = [];

    for (let i = 1; i < data.length; i++) {
      const row      = data[i];
      const natureza = String(row[1]).trim();
      const custo    = parseFloat(row[2]) || 0;
      const orcado   = parseFloat(row[3]) || 0;

      if (!natureza) continue;

      totalOrcado    += orcado;
      totalRealizado += custo;

      const diff = orcado - custo;
      items.push({ natureza, custo, orcado, diff, absDiff: Math.abs(diff) });
    }

    items.sort((a, b) => b.absDiff - a.absDiff);
    const ofensores  = items.filter(i => i.diff < 0).slice(0, 3);
    const defensores = items.filter(i => i.diff > 0).slice(0, 3);

    items.sort((a, b) => b.custo - a.custo);
    const dadosGrafico = items.slice(0, 10).map(i => ({
      label     : i.natureza,
      orcado    : i.orcado,
      realizado : i.custo
    }));

    return { totalOrcado, totalRealizado, ofensores, defensores, dadosGrafico };

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
function obterDadosCustoM2() {
  try {
    const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
    const sheet = ss.getSheetByName('METRO QUADRADO');
    if (!sheet) throw new Error('Aba METRO QUADRADO não encontrada');

    const data   = sheet.getDataRange().getDisplayValues();
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

    const linhaComIptu = data[idxComIptu];
    const linhaSemIptu = idxSemIptu >= 0 ? data[idxSemIptu] : null;

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
      tabela['Orç 2026'].push(parseNumeroCusto_(linhaComIptu[m.colOrc]));
      tabela['Real 2026'].push(parseNumeroCusto_(linhaComIptu[m.colReal]));
      tabela['Real 2026 sem IPTU'].push(
        linhaSemIptu ? parseNumeroCusto_(linhaSemIptu[m.colReal]) : null
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

    Logger.log('obterDadosCustoM2: OK → cidade=' + nomeCidade +
               ' | mês=' + mesRef.nomeMesExtenso + ' ' + mesRef.ano +
               ' | Orç=' + orcado + ' Real=' + realizado);

    return {
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
      meses: meses.map(m => m.nome)
    };

  } catch (e) {
    Logger.log('Erro Custo M2: ' + e.message);
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
    return Math.round(n) + '%';
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
