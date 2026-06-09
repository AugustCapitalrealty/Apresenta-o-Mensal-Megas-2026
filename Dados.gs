/**
 * ARQUIVO: Dados.gs
 * DESCRIÇÃO: Busca os dados na planilha da cidade ativa (setProjetoAtivo em Config.gs/Main.gs).
 *            As abas são localizadas pelo NOME (cada cópia da planilha tem GIDs próprios).
 */

// ==========================================
// DADOS DASHBOARD (Slide 4)
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
// DADOS PREVENTIVAS (Slide 5)
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

    let mesAtual = (data.length > 0 && data[0][1]) ? String(data[0][1]).toUpperCase() : 'MÊS';
    res.mensal.titulo = 'VISÃO MENSAL (' + mesAtual + ')';
    res.anual.titulo  = 'VISÃO ACUMULADA (2025)';

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
// DADOS CORRETIVAS (Slide 6)
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
    Logger.log('Erro planilha Slide 6: ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS TEMPO/SEGURANÇA (Slide 7)
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
    Logger.log('Erro planilha Slide 7: ' + e.message);
    return null;
  }
}


// ==========================================
// DADOS FINANCEIROS (Slide 8)
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
// DADOS CUSTO M² (Slide Custo do m²)
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
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    let idxComIptu = -1;   // R$/m² de TOTAL ÁREA COM IPTU E SEGURO  → âncora1 + 1
    let idxSemIptu = -1;   // R$/m² de TOTAL ÁREA COM SEGURO SEM IPTU → âncora2 + 1

    for (let r = 0; r < data.length; r++) {
      const lbl = normLbl(data[r][0]);

      if (lbl === 'TOTAL ÁREA COM IPTU E SEGURO') {
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

    // ── Mês de referência: último com Orç e Real preenchidos ──────────────
    let mesRef = null;
    for (let i = meses.length - 1; i >= 0; i--) {
      if (tabela['Orç 2026'][i] !== null && tabela['Real 2026'][i] !== null) {
        mesRef = { ...meses[i], index: i };
        break;
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

  for (let c = 1; c < headerRow.length; c += 3) {
    const txt = String(headerRow[c] || '').trim();
    const m   = txt.match(/Orç\s+([A-Za-zçÇ]{3})\/(\d{2,4})/i);
    if (!m) continue;

    const mesKey = normalizarTextoCusto_(m[1]).substring(0, 3);
    const ano    = normalizarAnoCusto_(m[2]);

    meses.push({
      nome           : mapaMes[mesKey] || m[1],
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
  if (s.toLowerCase().includes('h') || s.includes(':')) return s;
  if (!isNaN(parseFloat(s.replace(',', '.')))) return s + 'h';
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
// DADOS DOCUMENTOS INQUILINOS (Slide Documentação Legal)
// ==========================================
//
// Aba 'DOCUMENTOS INQUILINOS':
//   linha de título (mesclada) + linha de cabeçalho + linhas de dados.
//   Colunas: EMPRESA | DOCUMENTOS | VENC. | HISTÓRICO/OBSERVAÇÕES | DIAS PARA VENCER | STATUS
//   - EMPRESA em branco = repete a empresa da linha anterior.
//   - DIAS PARA VENCER: número (negativo = vencido) ou '**' quando sem data.
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

    // Localizar a linha de cabeçalho (contém EMPRESA e DOCUMENTOS)
    let hdr = -1;
    for (let i = 0; i < data.length; i++) {
      const linha = data[i].map(norm);
      if (linha.indexOf('empresa') >= 0 && linha.some(c => c.includes('documento'))) { hdr = i; break; }
    }
    if (hdr < 0) throw new Error('Cabeçalho (EMPRESA/DOCUMENTOS) não encontrado.');

    const itens   = [];
    const resumo  = { vencido: 0, critico: 0, emDia: 0, pendente: 0, total: 0 };
    let empresaAtual = '';

    for (let i = hdr + 1; i < data.length; i++) {
      const row = data[i];
      const empresa   = String(row[0] || '').trim();
      const documento = String(row[1] || '').trim();
      const venc      = String(row[2] || '').trim();
      const obs       = String(row[3] || '').trim();
      const diasRaw   = String(row[4] || '').trim();
      const statusRaw = String(row[5] || '').trim();

      if (empresa) empresaAtual = empresa;
      if (!documento) continue;  // pula linhas vazias

      // Interpreta os dias (pode ser '**', '-103', '0', '349'...)
      const diasNum = parseInt(String(diasRaw).replace(/[^\d-]/g, ''), 10);
      const temData = !isNaN(diasNum) && diasRaw !== '**' && diasRaw !== '';

      let categoria;
      if (!temData)              categoria = 'PENDENTE';
      else if (diasNum < 0)      categoria = 'VENCIDO';
      else if (diasNum <= LIMITE_CRITICO_DIAS) categoria = 'CRITICO';
      else                       categoria = 'EM_DIA';

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
        venc      : venc || '-',
        obs       : obs,
        dias      : temData ? diasNum : null,
        diasTexto : temData ? String(diasNum) : (venc || '--'),
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
