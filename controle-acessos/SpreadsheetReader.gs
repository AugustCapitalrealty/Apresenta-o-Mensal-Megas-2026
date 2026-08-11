/**
 * SpreadsheetReader.gs
 *
 * Lê a planilha inteligente (criada por SpreadsheetSetup.gs) e monta
 * o mesmo objeto de dados que MockData.gs — compatível com gerarApresentacao().
 *
 * Estrutura da planilha:
 *  Aba DADOS          → séries históricas + KPIs dos empreendimentos
 *  Aba PARTICIPACAO   → participação de clientes no tempo médio
 *  Aba AGENDAMENTO    → % agendado por cliente
 *  Aba CARDS CLIENTES → indicadores individuais por cliente
 *  Aba RANKING        → top 3 por tipo de veículo (mensal e anual)
 *  Aba PERFIL         → perfil de solicitações (MOTORISTA/VISITANTE/AJUDANTE)
 *  Aba TIPO ACESSO    → distribuição por tipo de veículo
 *  Aba COMPARATIVO    → acumulado anual (atualiza-se a cada mês)
 *  Aba CONFIG         → mesAno, mesAnterior, perfilTitulo
 */

function lerPlanilha() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var cfg = _lerConfig(ss);
  var mes = cfg.mesAno;

  // Lê aba Dados (fonte única de séries + KPIs por empreendimento)
  var dadosResult = _lerDados(ss, mes);

  // Atualiza a variável global de rótulos usada pelos chart builders
  MESES_LABEL = dadosResult.mesesLabel;

  // Abas opcionais: retornam vazio se a aba não existir na planilha
  function _safe(fn, def) { try { return fn() || def; } catch(e) { return def; } }
  var mapCli  = _safe(function() { return _lerClientes(ss, mes); }, {});
  var mapVeic = _safe(function() { return _lerVeiculos(ss, mes); }, {});
  var perf    = _safe(function() { return _lerPerfil(ss, mes); }, []);
  var mapPico = _safe(function() { return _lerHorarioPico(ss, mes); }, {});

  // Comparativo anual: prioriza o cálculo a partir da aba Dados (mês atual ×
  // mesmo mês do ano anterior). Se não houver os 2 anos, tenta a aba Comparativo.
  var comp = dadosResult.comparativo;
  if (!comp || Object.keys(comp.fluxo || {}).length < 2) {
    comp = _safe(function() { return _lerComparativo(ss); }, { fluxo: {}, tempo: {} });
  }

  var nomes = ['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'];

  // Totais do mês e mês anterior (calculados a partir de Dados)
  var totalMes = nomes.reduce(function(acc, n) {
    return acc + (dadosResult.kpis[n] ? dadosResult.kpis[n].fluxoTotal : 0);
  }, 0);
  var totalAnt = nomes.reduce(function(acc, n) {
    return acc + (dadosResult.kpisAnt[n] ? dadosResult.kpisAnt[n].fluxoTotal : 0);
  }, 0);

  // tempoMedioMin / Max (empreendimentos com menor e maior tempo médio)
  var tempos = nomes
    .map(function(n) { return dadosResult.kpis[n] ? dadosResult.kpis[n].tempoMedioSeg : 0; })
    .filter(function(v) { return v > 0; });
  var tMin = tempos.length ? _formatTempo(Math.min.apply(null, tempos)) : '';
  var tMax = tempos.length ? _formatTempo(Math.max.apply(null, tempos)) : '';

  // Textos gerados automaticamente
  var e0 = dadosResult.kpis[nomes[0]] || {};
  var e1 = dadosResult.kpis[nomes[1]] || {};
  var e2 = dadosResult.kpis[nomes[2]] || {};

  var textoFluxo = _textoFluxo(nomes, dadosResult.kpis, dadosResult.kpisAnt);
  var textoTempo = _textoTempo(nomes, dadosResult.kpis, dadosResult.kpisAnt, cfg.mesAnterior);

  // Textos do comparativo anual (ano atual × ano anterior)
  var anosComp = Object.keys(comp.fluxo || {}).sort();
  var compTextoFluxo = '', compTextoTempo = '';
  if (anosComp.length >= 2) {
    var yB = anosComp[anosComp.length - 2], yA = anosComp[anosComp.length - 1];
    // ── Textos do acumulado do ano (NEUTROS) ──
    // Apresentam a escala do acumulado, a maior variação e o maior volume
    // absoluto, e o total do ano anterior. Sem juízo de valor.
    var mkA  = dadosResult.marcos || {};
    var totA = nomes.reduce(function(s, n) { return s + (comp.fluxo[yA][n] || 0); }, 0);
    var totB = nomes.reduce(function(s, n) { return s + (comp.fluxo[yB][n] || 0); }, 0);
    var dlTot = totB ? (totA / totB - 1) * 100 : 0;

    var fFluxo = [];
    fFluxo.push('O acumulado do ano soma ' + fmtNum(totA) + ' acessos, ' +
      (dlTot >= 100
        ? 'mais que o dobro do'
        : 'variação de ' + (dlTot >= 0 ? '+' : '') + dlTot.toFixed(1).replace('.', ',') +
          '% sobre o') +
      ' mesmo período de ' + yB + ' (' + fmtNum(totB) + ').');

    var ritmo = nomes.map(function(n) {
      var a = comp.fluxo[yA][n] || 0, b = comp.fluxo[yB][n] || 0;
      return { n: n, pct: b ? (a / b - 1) * 100 : 0, abs: a };
    });
    var maisRitmo = ritmo.slice().sort(function(a, b) { return b.pct - a.pct; })[0];
    var maisVol   = ritmo.slice().sort(function(a, b) { return b.abs - a.abs; })[0];
    if (maisRitmo && maisVol && maisRitmo.n !== maisVol.n && maisRitmo.pct > 0) {
      fFluxo.push('Maior variação no ' + maisRitmo.n + ' (+' +
        maisRitmo.pct.toFixed(1).replace('.', ',') + '%); maior volume absoluto no ' +
        maisVol.n + ' (' + fmtNum(maisVol.abs) + ').');
    }
    if (mkA.superouAnoFechado) {
      fFluxo.push('O acumulado supera o total de ' + mkA.anoAnterior +
        ' (' + fmtNum(mkA.totalAnoAnterior) + ').');
    }
    compTextoFluxo = fFluxo.join(' ');

    // Tempo médio acumulado por Mega, com o mesmo período do ano anterior.
    var linhasTempo = nomes.map(function(n) {
      var ta = comp.tempo[yA][n] || '', tb = comp.tempo[yB][n] || '';
      if (!ta) return '';
      return n.replace(/^Mega\s+/i, '') + ' ' + ta + (tb ? ' (vs ' + tb + ')' : '');
    }).filter(function(t) { return t; });
    compTextoTempo = linhasTempo.length
      ? 'Tempo médio acumulado, com o mesmo período de ' + yB +
        ' entre parênteses: ' + linhasTempo.join('; ') + '.'
      : '';
  }

  return {
    mesAno:      cfg.mesAno,
    mesAnterior: cfg.mesAnterior,

    comparativo2025x2026: {
      fluxoAcumulado:      comp.fluxo,
      tempoMedioAcumulado: comp.tempo,
      textoFluxo:          compTextoFluxo || textoFluxo,
      textoTempo:          compTextoTempo || textoTempo,
    },

    resumo: {
      totalAcessos:  totalMes,
      totalAnterior: totalAnt,
      tempoMedioMin: tMin,
      tempoMedioMax: tMax,
      recordeTotal:  dadosResult.recordeTotal || false,
      marcos:        dadosResult.marcos || {},
    },

    fluxoMensal:         dadosResult.fluxoMensal,
    tempoMedioMensalSeg: dadosResult.tempoSerie,
    usoCelularMensal:    dadosResult.celularSerie,
    colaboradoresMensal: dadosResult.colabSerie,

    empreendimentos: nomes.map(function(nome) {
      var e   = dadosResult.kpis[nome] || {};
      var cli = mapCli[nome]           || {};
      return {
        nome:               nome,
        fluxoTotal:         e.fluxoTotal          || 0,
        recordeAcessos:     e.recordeAcessos      || false,
        variacaoMes:        e.variacaoMes         || '',
        variacaoAno:        e.variacaoAno         || '',
        colaboradoresFixos: e.colaboradoresFixos  || 0,
        colaboradoresVar:   e.colaboradoresVar    || '',
        tempoMedio:         e.tempoMedio          || '',
        tempoMedioAnterior: e.tempoMedioAnterior  || '',
        tempoMedioVar:      e.tempoMedioVar       || '',
        usoCelular:         e.usoCelular          || '',
        filaEvitada:        e.filaEvitada         || 0,
        filaEvitadaPct:     e.filaEvitadaPct      || '',
        eventosAgendados:   e.eventosAgendados    || '',
        preAutorizados:     e.preAutorizados      || '',
        acesso5min:         e.acesso5min          || '',
        acesso10min:        e.acesso10min         || '',
        eventosCancela:     e.eventosCancela      || '',
        tipoAcesso:                (mapVeic[nome] || {}).tipoAcesso  || {},
        participacaoTempoMedio:    cli.participacao || [],
        agendamentoTotal:          e.eventosAgendados    || '',
        agendamentoAnterior:       e.eventosAgendadosAnt || '',
        agendamentoVar:            e.agendadoVar         || '',
        agendamentoPorCliente:     cli.agendamento  || [],
        cardsClientes:             cli.cards        || [],
        rankingMes:    (mapVeic[nome] || {}).rankingMes  || [],
        rankingAnual:  (mapVeic[nome] || {}).rankingAnual || [],
      };
    }),

    perfilSolicitacoes: {
      titulo: cfg.perfilTitulo,
      itens:  perf,
    },

    horarioPico: mapPico,
  };
}

// ── Helpers internos ──────────────────────────────────────────────

/**
 * Lê uma aba e retorna array de objetos keyed pelo header.
 * skipRows: quantas linhas pular antes do header (default 0).
 *   Use skipRows=1 para abas com linha de instrução acima do header real.
 */
function _abaObj(ss, nomeAba, skipRows) {
  skipRows = skipRows || 0;
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) return [];
  var vals = aba.getDataRange().getValues();
  if (vals.length < 2 + skipRows) return [];
  var header = vals[skipRows].map(function(h) { return String(h).trim().replace(/\s+/g, ' '); });
  return vals.slice(skipRows + 1).filter(function(row) {
    return row.some(function(c) { return c !== ''; });
  }).map(function(row) {
    var obj = {};
    header.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * Filtra pelo mês via sequência numérica — imune a diferença de formato
 * entre Config (ex: "JUNHO/26") e Dados (ex: "06/2026").
 */
function _filtraMes(rows, mesAno, nomeAba) {
  var alvoSeq = _seqMes(mesAno);
  var out = rows.filter(function(r) {
    return _seqMes(r['Mês']) === alvoSeq;
  });
  return out;
}

/**
 * Normaliza o nome do empreendimento para o canônico ('Mega Curitiba',
 * 'Mega Itajaí', 'Mega Esteio'), aceitando variações de caixa, acentos e
 * texto extra (ex: "MEGA ITAJAI ", "Mega Centro Logístico Curitiba").
 */
function _canonEmpreendimento(v) {
  var s = String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (s.indexOf('CURITIBA') >= 0) return 'Mega Curitiba';
  if (s.indexOf('ITAJAI')   >= 0) return 'Mega Itajaí';
  if (s.indexOf('ESTEIO')   >= 0) return 'Mega Esteio';
  return String(v == null ? '' : v).trim();
}

/** Converte segundos em "08m20s". */
function _formatTempo(seg) {
  var s = Math.round(Number(seg) || 0);
  return String(Math.floor(s / 60)).padStart(2,'0') + 'm' +
         String(s % 60).padStart(2,'0') + 's';
}

var _ABREV_LIST = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
var _MES_MIN    = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var _NOME_TO_ABREV = {
  JANEIRO:'JAN',FEVEREIRO:'FEV','MARÇO':'MAR',ABRIL:'ABR',MAIO:'MAI',
  JUNHO:'JUN',JULHO:'JUL',AGOSTO:'AGO',SETEMBRO:'SET',OUTUBRO:'OUT',
  NOVEMBRO:'NOV',DEZEMBRO:'DEZ',
};

/**
 * Converte o valor da célula de mês em texto "MM/AAAA".
 * O Sheets devolve datas como objeto Date — ex: célula "05/2026"
 * vira Date(2026, 4, 1). Aqui normalizamos para "05/2026".
 */
function _mesToStr(v) {
  if (v instanceof Date) {
    return String(v.getMonth() + 1).padStart(2, '0') + '/' + v.getFullYear();
  }
  return String(v == null ? '' : v).trim();
}

/**
 * Abreviação: suporta "ABRIL/26" → "ABR/26" e "05/2026" → "MAI/26".
 * Usado como rótulo nos gráficos.
 */
function _abrevMes(mes) {
  var p  = _mesToStr(mes).split('/');
  var p0 = (p[0] || '').trim().toUpperCase();
  var p1 = (p[1] || '').trim();
  if (/^\d{1,2}$/.test(p0) && p1.length === 4) {
    return (_ABREV_LIST[parseInt(p0, 10) - 1] || p0) + '/' + p1.slice(-2);
  }
  return (_NOME_TO_ABREV[p0] || p0.slice(0, 3)) + '/' + p1;
}

/**
 * Número do mês para ordenação: "ABRIL/26" → 316, "05/2026" → 316.
 * Formato MM/AAAA: aa × 12 + mm. Formato NOME/AA: aa × 12 + idx.
 */
function _seqMes(mes) {
  var p  = _mesToStr(mes).split('/');
  var p0 = (p[0] || '').trim().toUpperCase();
  var p1 = (p[1] || '').trim();
  if (/^\d{1,2}$/.test(p0) && p1.length === 4) {
    return parseInt(p1.slice(-2), 10) * 12 + parseInt(p0, 10);
  }
  var abrev = _NOME_TO_ABREV[p0] || p0.slice(0, 3);
  return (parseInt(p1, 10) || 0) * 12 + (_ABREV_LIST.indexOf(abrev) + 1);
}

/**
 * Normaliza tempo para segundos. O Sheets devolve células de tempo como
 * objeto Date (base 1899). Tratamos os formatos de entrada:
 *   "05:46"    → Date(h=5, m=46, s=0)  → interpretado como MM:SS = 346s
 *   "0:05:46"  → Date(h=0, m=5, s=46)  → interpretado como H:MM:SS = 346s
 *   fração de dia (número 0–1)         → × 86400
 */
function _normTime(v) {
  if (v instanceof Date) {
    var h = v.getHours(), m = v.getMinutes(), s = v.getSeconds();
    // "5:46" (duas partes) → Sheets lê como 5h46min00s; queremos 5min46s
    if (s === 0 && h > 0) return h * 60 + m;
    // "0:05:46" (três partes) → 0h05min46s = 5min46s
    return h * 3600 + m * 60 + s;
  }
  // Texto "05:46" ou "0:05:46" (quando a célula não foi formatada como hora)
  if (typeof v === 'string' && v.indexOf(':') >= 0) {
    var parts = v.split(':').map(function(p) { return parseInt(p, 10) || 0; });
    if (parts.length === 2) return parts[0] * 60 + parts[1];          // MM:SS
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  var n = Number(v) || 0;
  return (n > 0 && n < 1) ? Math.round(n * 86400) : Math.round(n);
}

/**
 * Normaliza percentual para número real (ex: 89.86).
 * Aceita: 0.8986 (fração), 89.86 (número), "89,86%" / "89,86" (texto pt-BR).
 */
function _normPct(v) {
  if (typeof v === 'string') {
    var t = v.replace('%', '').replace(/\s/g, '').replace(',', '.');
    var num = parseFloat(t);
    if (isNaN(num)) return 0;
    return (num > 0 && num < 1) ? Math.round(num * 1000) / 10 : num;
  }
  var n = Number(v) || 0;
  return (n > 0 && n < 1) ? Math.round(n * 1000) / 10 : n;
}

/**
 * Normaliza inteiros com separador de milhar brasileiro.
 * "1.046" → 1046, "1.046.832" → 1046832, 1046 → 1046.
 * Também trata floats vindos do Sheets quando a célula foi lida como número:
 * 3.461 → 3461 (separador de milhar mal interpretado como decimal).
 */
function _normInt(v) {
  if (typeof v === 'number') {
    if (v === Math.floor(v)) return v || 0;
    // Float com parte fracionária: trata como N.NNN (milhar BR lido como decimal)
    // Ex: 3.461 → 3*1000 + round(0.461*1000) = 3461
    var intPart  = Math.floor(v);
    var fracPart = Math.round((v - intPart) * 1000);
    return intPart * 1000 + fracPart;
  }
  if (typeof v === 'string') {
    var t = v.trim();
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) return parseInt(t.replace(/\./g, ''), 10) || 0;
    return parseInt(t.replace(/[^\d]/g, ''), 10) || 0;
  }
  return 0;
}

// ── Config ────────────────────────────────────────────────────────

function _lerConfig(ss) {
  var rows = _abaObj(ss, 'Config');
  var m = {};
  rows.forEach(function(r) { m[String(r['Chave'] || '').trim()] = r['Valor']; });
  return {
    mesAno:       _mesToStr(m.mesAno),
    mesAnterior:  String(m.mesAnterior  || ''),
    perfilTitulo: String(m.perfilTitulo || ''),
  };
}

// ── Dados (aba principal — série + KPIs) ─────────────────────────
//
// A aba Dados tem:
//   Colunas de entrada: Mês, Empreendimento, Fluxo Total, Colaboradores Fixos,
//     Tempo Médio (seg), Uso Celular (%), Fila Evitada,
//     Acesso ≤5min (%), Acesso ≤10min (%), Cancela (%), Agendado (%), Pré-Aut. (%), Var. Anual (manual)
//   Colunas de fórmula (Sheets calcula): Fluxo Var %, Colab. Var %, Tempo Médio (texto),
//     Tempo Ant. (texto), Tempo Var (texto), Celular Var, Fila Evit. %

function _lerDados(ss, mesAtual) {
  // skipRows=1: linha 1 da aba Dados é instrução (merge), linha 2 é o header real
  var rows = _abaObj(ss, 'Dados', 1);

  // Descarta linhas sem mês válido (linhas em branco no final)
  rows = rows.filter(function(r) {
    return _mesToStr(r['Mês']) !== '';
  });

  // Ordena por sequência cronológica
  rows.sort(function(a, b) {
    return _seqMes(a['Mês']) - _seqMes(b['Mês']);
  });

  // Últimas 13 combinações de mês
  var mesSeqsVistas = [];
  var mesesUnicos = [];
  rows.forEach(function(r) {
    var seq = _seqMes(r['Mês']);
    if (mesSeqsVistas.indexOf(seq) === -1) {
      mesSeqsVistas.push(seq);
      mesesUnicos.push({ seq: seq, label: _abrevMes(r['Mês']), nome: _mesToStr(r['Mês']) });
    }
  });
  var ultimos13 = mesesUnicos.slice(-13);
  var seqs13 = ultimos13.map(function(m) { return m.seq; });

  var nomes = ['Mega Curitiba','Mega Itajaí','Mega Esteio'];

  // Mapa de lookup { seq: { empreendimento: row } } — O(N) em vez de O(N×13×3)
  var rowMap = {};
  rows.forEach(function(r) {
    var seq = _seqMes(r['Mês']);
    var emp = _canonEmpreendimento(r['Empreendimento']);
    if (!rowMap[seq]) rowMap[seq] = {};
    rowMap[seq][emp] = r;
  });

  // Inicializa séries
  var fluxoMensal = {}, tempoSerie = {}, celularSerie = {}, colabSerie = {};
  nomes.forEach(function(n) {
    fluxoMensal[n] = []; tempoSerie[n] = []; celularSerie[n] = []; colabSerie[n] = [];
  });

  // Preenche séries para os 13 meses via lookup
  seqs13.forEach(function(seq) {
    nomes.forEach(function(nome) {
      var row = rowMap[seq] ? rowMap[seq][nome] : null;
      fluxoMensal[nome].push(row ? _normInt(row['Fluxo Total']) : 0);
      tempoSerie[nome].push(row ? _normTime(row['Tempo Médio\n(MM:SS)'] || row['Tempo Médio (MM:SS)'] || row['Tempo Médio\n(seg)'] || row['Tempo Médio (seg)'] || 0) : 0);
      celularSerie[nome].push(row ? _normPct(row['Uso Celular\n(%)'] != null ? row['Uso Celular\n(%)'] : row['Uso Celular (%)']) : 0);
      colabSerie[nome].push(row ? _normInt(row['Colaboradores\nFixos'] != null ? row['Colaboradores\nFixos'] : row['Colaboradores Fixos']) : 0);
    });
  });

  // KPIs do mês atual via lookup
  var seqAtual = _seqMes(mesAtual);
  var kpis = {}, kpisAnt = {};
  nomes.forEach(function(nome) {
    var row    = rowMap[seqAtual]     ? rowMap[seqAtual][nome]     : null;
    var rowAnt = rowMap[seqAtual - 1] ? rowMap[seqAtual - 1][nome] : null;

    // Fluxo do mês e anterior
    var fluxoCur = row    ? _normInt(row['Fluxo Total'])    : 0;
    var fluxoAnt = rowAnt ? _normInt(rowAnt['Fluxo Total']) : 0;

    // Variação do fluxo (calculada em JS — não depende da coluna fórmula)
    var varMes = '';
    if (fluxoCur && fluxoAnt) {
      var delta = (fluxoCur / fluxoAnt - 1) * 100;
      varMes = (delta >= 0 ? '+' : '') + delta.toFixed(1).replace('.', ',') + '%';
    }

    // Colaboradores e variação
    var colabCur = row    ? _normInt(row['Colaboradores\nFixos']    != null ? row['Colaboradores\nFixos']    : row['Colaboradores Fixos'])    : 0;
    var colabAnt = rowAnt ? _normInt(rowAnt['Colaboradores\nFixos'] != null ? rowAnt['Colaboradores\nFixos'] : rowAnt['Colaboradores Fixos']) : 0;
    var varColab = '';
    if (colabCur && colabAnt) {
      var dc = (colabCur / colabAnt - 1) * 100;
      varColab = (dc >= 0 ? '+' : '') + dc.toFixed(1).replace('.', ',') + '%';
    }

    // Tempo médio atual e anterior (normaliza fração de dia → segundos)
    var _rawTempo    = row    ? (row['Tempo Médio\n(MM:SS)']    || row['Tempo Médio (MM:SS)']    || row['Tempo Médio\n(seg)']    || row['Tempo Médio (seg)']    || 0) : 0;
    var _rawTempoAnt = rowAnt ? (rowAnt['Tempo Médio\n(MM:SS)'] || rowAnt['Tempo Médio (MM:SS)'] || rowAnt['Tempo Médio\n(seg)'] || rowAnt['Tempo Médio (seg)'] || 0) : 0;
    var tempoSeg    = _normTime(_rawTempo);
    var tempoSegAnt = _normTime(_rawTempoAnt);
    var tempoFmt    = tempoSeg    > 0 ? _formatTempo(tempoSeg)    : '';
    var tempoAntFmt = tempoSegAnt > 0 ? _formatTempo(tempoSegAnt) : '';

    // Variação de tempo
    var tempoVar = '';
    if (tempoSeg > 0 && tempoSegAnt > 0) {
      var dt = tempoSeg - tempoSegAnt;
      if (dt === 0) {
        tempoVar = '=';
      } else {
        var absdt = Math.abs(dt);
        tempoVar = (dt < 0 ? '-' : '+') +
          String(Math.floor(absdt / 60)).padStart(2, '0') + 'm' +
          String(absdt % 60).padStart(2, '0') + 's';
      }
    }

    // Uso de celular atual e anterior (normaliza 89% → 89)
    var _rawCel    = row    ? (row['Uso Celular\n(%)']    != null ? row['Uso Celular\n(%)']    : row['Uso Celular (%)'])    : 0;
    var _rawCelAnt = rowAnt ? (rowAnt['Uso Celular\n(%)'] != null ? rowAnt['Uso Celular\n(%)'] : rowAnt['Uso Celular (%)']) : 0;
    var usoCel    = _normPct(_rawCel);
    var usoCelAnt = _normPct(_rawCelAnt);

    // Variação de celular (p.p.)
    var celVar = '';
    if (usoCel > 0 && usoCelAnt > 0) {
      var diff = usoCel - usoCelAnt;
      celVar = (diff >= 0 ? '+' : '') + diff.toFixed(1).replace('.', ',') + ' p.p.';
    }

    // Fila evitada
    var filaAbs = row ? _normInt(row['Fila\nEvitada'] != null ? row['Fila\nEvitada'] : row['Fila Evitada']) : 0;
    var filaPct = (filaAbs > 0 && fluxoCur > 0)
      ? (filaAbs / fluxoCur * 100).toFixed(1).replace('.', ',') + '%'
      : '';

    function _pctStr(row, col1, col2) {
      if (!row) return '';
      var v = _normPct(row[col1] != null ? row[col1] : row[col2]);
      return v ? v + '%' : '';
    }

    // Agendamento (total do empreendimento) atual, anterior e variação (p.p.)
    var agdCur = row    ? _normPct(row['Agendado\n(%)']    != null ? row['Agendado\n(%)']    : row['Agendado (%)'])    : 0;
    var agdAnt = rowAnt ? _normPct(rowAnt['Agendado\n(%)'] != null ? rowAnt['Agendado\n(%)'] : rowAnt['Agendado (%)']) : 0;
    var agdVar = '';
    if (agdCur > 0 && agdAnt > 0) {
      var da = agdCur - agdAnt;
      agdVar = (da >= 0 ? '+' : '') + da.toFixed(1).replace('.', ',') + ' p.p.';
    }

    kpis[nome] = {
      fluxoTotal:         fluxoCur,
      variacaoMes:        varMes,
      variacaoAno:        row ? String(row['Var. Anual\n(manual)'] || row['Var. Anual (manual)'] || '') : '',
      colaboradoresFixos: colabCur,
      colaboradoresVar:   varColab,
      tempoMedioSeg:      tempoSeg,
      tempoMedio:         tempoFmt,
      tempoMedioAnterior: tempoAntFmt,
      tempoMedioVar:      tempoVar,
      usoCelular:         usoCel ? usoCel + '%' : '',
      filaEvitada:        filaAbs,
      filaEvitadaPct:     filaPct,
      eventosAgendados:   _pctStr(row, 'Agendado\n(%)',    'Agendado (%)'),
      eventosAgendadosAnt: agdAnt ? agdAnt + '%' : '',
      agendadoVar:        agdVar,
      preAutorizados:     _pctStr(row, 'Pré-Aut.\n(%)',    'Pré-Aut. (%)'),
      acesso5min:         _pctStr(row, 'Acesso\n≤5min (%)', 'Acesso ≤5min (%)'),
      acesso10min:        _pctStr(row, 'Acesso\n≤10min (%)', 'Acesso ≤10min (%)'),
      eventosCancela:     _pctStr(row, 'Cancela\n(%)',     'Cancela (%)'),
    };

    kpisAnt[nome] = { fluxoTotal: fluxoAnt };
  });

  // ── Recorde de acessos: mês atual × TODO o histórico da aba Dados ──
  // Por Mega: recorde quando o fluxo do mês supera o de todos os meses
  // anteriores. Total: idem para a soma dos três Megas no mesmo mês.
  var recordeTotal = false;
  var marcos = {
    primeiraVez100k:   false,
    superouAnoFechado: false,
    acumAnoAtual:      0,
    totalAnoAnterior:  0,
    anoAtual:          '',
    anoAnterior:       '',
    periodoAcum:       '',
  };
  (function() {
    var seqsAnt = Object.keys(rowMap).map(Number).filter(function(s) {
      return s < seqAtual;
    });
    var totalAtual = 0;
    var totPorSeq = {};
    nomes.forEach(function(nome) {
      var rowCur = rowMap[seqAtual] ? rowMap[seqAtual][nome] : null;
      var cur = rowCur ? _normInt(rowCur['Fluxo Total']) : 0;
      totalAtual += cur;
      var maxAnt = 0;
      seqsAnt.forEach(function(s) {
        var r = rowMap[s][nome];
        var v = r ? _normInt(r['Fluxo Total']) : 0;
        if (v > maxAnt) maxAnt = v;
        totPorSeq[s] = (totPorSeq[s] || 0) + v;
      });
      kpis[nome].recordeAcessos = cur > 0 && maxAnt > 0 && cur > maxAnt;
    });
    var maxTotAnt = 0;
    Object.keys(totPorSeq).forEach(function(s) {
      if (totPorSeq[s] > maxTotAnt) maxTotAnt = totPorSeq[s];
    });
    recordeTotal = totalAtual > 0 && maxTotAnt > 0 && totalAtual > maxTotAnt;

    // (a) Primeira vez que o total mensal dos 3 Megas passa de 100 mil.
    marcos.primeiraVez100k =
      totalAtual >= 100000 && maxTotAnt > 0 && maxTotAnt < 100000;

    // (b) Acumulado do ano corrente (jan → mês atual) já supera o ano
    //     anterior FECHADO (jan a dez). Só afirmamos isso quando temos o ano
    //     anterior completo: 12 meses de linhas ou a coluna de acumulado em dez.
    var ano2   = Math.floor((seqAtual - 1) / 12);   // ano de 2 dígitos (ex: 26)
    var mesNum = seqAtual - ano2 * 12;              // 1..12

    var acumAtual = totalAtual;                     // totPorSeq não tem o mês atual
    for (var s2 = ano2 * 12 + 1; s2 < seqAtual; s2++) {
      acumAtual += totPorSeq[s2] || 0;
    }

    var somaAnoAnt = 0, mesesAnoAnt = 0;
    for (var s3 = (ano2 - 1) * 12 + 1; s3 <= (ano2 - 1) * 12 + 12; s3++) {
      if (totPorSeq[s3]) { somaAnoAnt += totPorSeq[s3]; mesesAnoAnt++; }
    }

    // Fonte autoritativa do ano fechado: acumulado da linha de dezembro.
    var seqDez = (ano2 - 1) * 12 + 12;
    var acumDez = 0;
    if (rowMap[seqDez]) {
      nomes.forEach(function(nome) {
        var r = rowMap[seqDez][nome];
        if (r) acumDez += _acumFluxo(r);
      });
    }

    var totalAnoAnt = Math.max(somaAnoAnt, acumDez);
    var anoAnteriorCompleto = (mesesAnoAnt === 12) || acumDez > 0;

    marcos.superouAnoFechado =
      anoAnteriorCompleto && totalAnoAnt > 0 && acumAtual > totalAnoAnt;
    marcos.acumAnoAtual     = acumAtual;
    marcos.totalAnoAnterior = totalAnoAnt;
    marcos.anoAtual         = '20' + String(ano2);
    marcos.anoAnterior      = '20' + String(ano2 - 1);
    marcos.periodoAcum      = 'jan a ' + (_MES_MIN[mesNum - 1] || '');
  })();

  // ── Comparativo anual: mês atual (ex 05/2026) × mesmo mês ano anterior (05/2025) ──
  // Fluxo acumulado: coluna M ("Fluxo Acum. (ano)" ou antiga "Var. Anual (manual)").
  // Tempo acumulado: coluna N ("Tempo Acum. (ano)").
  function _acumFluxo(r) {
    var v = r['Fluxo Acum. (ano)'] != null ? r['Fluxo Acum. (ano)']
          : (r['Fluxo Acum.\n(ano)'] != null ? r['Fluxo Acum.\n(ano)']
          : (r['Var. Anual (manual)'] != null ? r['Var. Anual (manual)']
          : r['Var. Anual\n(manual)']));
    return _normInt(v);
  }
  function _acumTempo(r) {
    return _normTime(r['Tempo Acum. (ano)'] != null ? r['Tempo Acum. (ano)'] : r['Tempo Acum.\n(ano)']);
  }
  function _anoDeRows(obj) {
    for (var k in obj) {
      var p = _mesToStr(obj[k]['Mês']).split('/');
      var y = (p[1] || '').trim();
      return y.length === 2 ? '20' + y : y;
    }
    return '';
  }

  var rowsAtual  = rowMap[seqAtual]      || {};
  var rowsAnoAnt = rowMap[seqAtual - 12] || {};
  var anoA = _anoDeRows(rowsAtual);
  var anoB = _anoDeRows(rowsAnoAnt);
  var compFluxo = {}, compTempo = {};
  if (anoA && anoB && anoA !== anoB) {
    compFluxo[anoB] = {}; compFluxo[anoA] = {};
    compTempo[anoB] = {}; compTempo[anoA] = {};
    nomes.forEach(function(nome) {
      var rA = rowsAtual[nome], rB = rowsAnoAnt[nome];
      compFluxo[anoA][nome] = rA ? _acumFluxo(rA) : 0;
      compFluxo[anoB][nome] = rB ? _acumFluxo(rB) : 0;
      var tA = rA ? _acumTempo(rA) : 0;
      var tB = rB ? _acumTempo(rB) : 0;
      compTempo[anoA][nome] = tA > 0 ? _formatTempo(tA) : '';
      compTempo[anoB][nome] = tB > 0 ? _formatTempo(tB) : '';
    });
  }

  return {
    mesesLabel:   ultimos13.map(function(m) { return m.label; }),
    fluxoMensal:  fluxoMensal,
    tempoSerie:   tempoSerie,
    celularSerie: celularSerie,
    colabSerie:   colabSerie,
    kpis:         kpis,
    kpisAnt:      kpisAnt,
    recordeTotal: recordeTotal,
    marcos:       marcos,
    comparativo:  { fluxo: compFluxo, tempo: compTempo },
  };
}

// ── Textos automáticos ────────────────────────────────────────────

function _textoFluxo(nomes, kpis, kpisAnt) {
  return nomes.map(function(nome, i) {
    var k  = kpis[nome]    || {};
    var ka = kpisAnt[nome] || {};
    if (!ka.fluxoTotal) return '';
    var delta = ((k.fluxoTotal / ka.fluxoTotal) - 1) * 100;
    var variacao = (delta >= 0 ? 'variação de +' : 'variação de ') +
      Math.abs(delta).toFixed(1).replace('.', ',') + '%';
    return (i === 0 ? 'O ' : i === nomes.length - 1 ? 'Enquanto o ' : 'O ') +
      nome + ' registrou ' + variacao + ' no fluxo de visitantes e motoristas no comparativo com o período anterior.';
  }).filter(function(t) { return t; }).join(' ');
}

function _textoTempo(nomes, kpis, kpisAnt, mesAnterior) {
  return nomes.map(function(nome, i) {
    var k = kpis[nome] || {};
    if (!k.tempoMedio) return '';
    var base = (i === 0 ? 'O ' : i === nomes.length - 1 ? 'Enquanto o ' : 'O ') +
      nome + ' registrou ' + k.tempoMedio;
    if (k.tempoMedioVar && k.tempoMedioVar !== '—') {
      base += ', variação de ' + k.tempoMedioVar;
    }
    if (k.tempoMedioAnterior && k.tempoMedioAnterior !== '—') {
      base += ' em relação a ' + k.tempoMedioAnterior;
      if (mesAnterior) base += ' em ' + mesAnterior;
    }
    return base + '.';
  }).filter(function(t) { return t; }).join(' ');
}

// ── Comparativo anual ─────────────────────────────────────────────

function _lerComparativo(ss) {
  var rows = _abaObj(ss, 'Comparativo');
  var anosSet = {};
  rows.forEach(function(r) { anosSet[String(r['Ano'])] = true; });
  var anos = Object.keys(anosSet).sort().slice(-2);
  var fluxo = {}, tempo = {};
  anos.forEach(function(a) { fluxo[a] = {}; tempo[a] = {}; });
  rows.forEach(function(r) {
    var ano = String(r['Ano']);
    var emp = String(r['Empreendimento']);
    if (fluxo[ano]) {
      fluxo[ano][emp] = Number(r['Fluxo Acumulado'])       || 0;
      tempo[ano][emp] = String(r['Tempo Médio Acumulado'] ||
                               r['Tempo Medio Acumulado']  || '');
    }
  });
  return { fluxo: fluxo, tempo: tempo };
}

// ── Clientes (aba única → participação, agendamento e cards) ──────
//
// A aba Clientes tem 1 linha por cliente / empreendimento / mês, com apenas
// os dados brutos: Acessos, Tempo Médio, Agendado (%). Tudo o mais é derivado:
//   • participação no fluxo = acessos do cliente ÷ total de acessos do Mega
//   • tempo do mês anterior  = linha do mesmo cliente em (mês − 1)
//   • "Outros"               = agrupa clientes fora do top 3 (participação)
//
// Retorna { empreendimento: { participacao:[...], agendamento:[...], cards:[...] } }
function _lerClientes(ss, mesAno) {
  var rows = _abaObj(ss, 'Clientes');
  if (!rows.length) return {};

  var alvoSeq = _seqMes(mesAno);

  // Indexa por sequência de mês → empreendimento → cliente.
  // O empreendimento é canonicalizado (aceita variações de caixa/acentos) e,
  // quando a célula está vazia (ex: células mescladas por bloco), herda o
  // valor da linha anterior.
  var idx = {};
  var empAnterior = '';
  rows.forEach(function(r) {
    var seq = _seqMes(r['Mês']);
    var emp = _canonEmpreendimento(r['Empreendimento']);
    if (!emp) emp = empAnterior; else empAnterior = emp;
    var cli = String(r['Cliente'] || '').trim();
    if (!emp || !cli) return;
    if (!idx[seq]) idx[seq] = {};
    if (!idx[seq][emp]) idx[seq][emp] = {};
    idx[seq][emp][cli] = {
      acessos:     _normInt(r['Acessos']),
      tempoSeg:    _normTime(r['Tempo Médio\n(MM:SS)'] != null ? r['Tempo Médio\n(MM:SS)'] : r['Tempo Médio (MM:SS)']),
      preAprovado: _normPct(r['Pré-aprovado\n(%)'] != null ? r['Pré-aprovado\n(%)'] : r['Pré-aprovado (%)']),
      agendado:    _normPct(r['Agendado\n(%)']     != null ? r['Agendado\n(%)']     : r['Agendado (%)']),
    };
  });

  var atual = idx[alvoSeq]      || {};
  var anter = idx[alvoSeq - 1]  || {};
  var out = {};

  Object.keys(atual).forEach(function(emp) {
    var cliMap    = atual[emp];
    var cliMapAnt = anter[emp] || {};
    var nomesCli  = Object.keys(cliMap);

    var totalAcessos    = nomesCli.reduce(function(s, c) { return s + cliMap[c].acessos; }, 0) || 1;
    var totalAcessosAnt = Object.keys(cliMapAnt).reduce(function(s, c) { return s + cliMapAnt[c].acessos; }, 0) || 1;

    // Lista base por cliente (ordenada por acessos desc)
    var lista = nomesCli.map(function(c) {
      var cur = cliMap[c];
      var ant = cliMapAnt[c];
      var partPct    = Math.round(cur.acessos / totalAcessos * 1000) / 10;
      var partPctAnt = ant ? Math.round(ant.acessos / totalAcessosAnt * 1000) / 10 : 0;
      return {
        cliente:            c,
        acessos:            cur.acessos,
        acessosAnt:         ant ? ant.acessos : null,
        participacao:       partPct,
        participacaoAnt:    partPctAnt,
        tempoMedio:         cur.tempoSeg > 0 ? _formatTempo(cur.tempoSeg) : '',
        tempoMedioAnterior: (ant && ant.tempoSeg > 0) ? _formatTempo(ant.tempoSeg) : '',
        preAprovado:        cur.preAprovado,
        agendado:           cur.agendado,
      };
    }).sort(function(a, b) { return b.acessos - a.acessos; });

    // Participação: top 3 + "Outros" agrupado
    var participacao = lista.slice(0, 3).map(function(c) {
      return { cliente: c.cliente, pct: c.participacao, anterior: c.participacaoAnt };
    });
    var resto = lista.slice(3);
    if (resto.length) {
      participacao.push({
        cliente: 'Outros',
        pct:      Math.round(resto.reduce(function(s, c) { return s + c.participacao; }, 0) * 10) / 10,
        anterior: Math.round(resto.reduce(function(s, c) { return s + c.participacaoAnt; }, 0) * 10) / 10,
        qtdClientes: resto.length,
      });
    }

    // Agendamento por cliente (ordena por % desc)
    var agendamento = lista
      .filter(function(c) { return c.agendado > 0; })
      .sort(function(a, b) { return b.agendado - a.agendado; })
      .map(function(c) { return { cliente: c.cliente, pct: c.agendado }; });

    // Cards (todos os clientes, ordenados por acessos — paginação feita no slide)
    var cards = lista.map(function(c) {
      var acessosVar = '';
      if (c.acessosAnt != null && c.acessosAnt > 0) {
        var pctAc = ((c.acessos / c.acessosAnt) - 1) * 100;
        acessosVar = (pctAc >= 0 ? '+' : '') + pctAc.toFixed(1).replace('.', ',') + '%';
      }
      return {
        cliente:            c.cliente,
        tempoMedio:         c.tempoMedio,
        tempoMedioAnterior: c.tempoMedioAnterior,
        acessos:            c.acessos,
        acessosVar:         acessosVar,
        preAprovados:       c.preAprovado ? c.preAprovado + '%' : '',
        participacao:       c.participacao + '%',
      };
    });

    out[emp] = { participacao: participacao, agendamento: agendamento, cards: cards };
  });

  return out;
}

// ── Veículos (aba única → tipo de acesso, ranking mês e anual) ───
//
// A aba Veículos tem 1 linha por tipo de veículo / empreendimento / mês.
// O script deriva: % por tipo (tipoAcesso), top 3 mês (rankingMes) com
// delta vs mês anterior, e top 3 acumulado do ano (rankingAnual).
function _lerVeiculos(ss, mesAno) {
  var rows = _abaObj(ss, 'Veículos');
  if (!rows.length) return {};

  var alvoSeq   = _seqMes(mesAno);
  var alvoAno2  = Math.floor((alvoSeq - 1) / 12); // ano de 2 dígitos (ex: 26)

  // Index: seqNum → emp → tipo → acessos
  var idx = {};
  var empAnteriorVeic = '';
  rows.forEach(function(r) {
    var seq  = _seqMes(r['Mês']);
    var emp  = _canonEmpreendimento(r['Empreendimento']);
    if (!emp) emp = empAnteriorVeic; else empAnteriorVeic = emp;
    var tipo = String(r['Tipo Veículo'] || r['Tipo Veiculo'] || '').trim().toUpperCase();
    var ac   = _normInt(r['Acessos']);
    if (!emp || !tipo || !ac) return;
    if (!idx[seq]) idx[seq] = {};
    if (!idx[seq][emp]) idx[seq][emp] = {};
    idx[seq][emp][tipo] = (idx[seq][emp][tipo] || 0) + ac;
  });

  // Coleta empreendimentos presentes no mês atual
  var empNomes = Object.keys((idx[alvoSeq] || {}));
  var out = {};

  empNomes.forEach(function(emp) {
    var curMap = idx[alvoSeq][emp] || {};
    var antMap = (idx[alvoSeq - 1] || {})[emp] || {};
    var totalCur = Object.keys(curMap).reduce(function(s, t) { return s + curMap[t]; }, 0) || 1;

    // tipoAcesso: % por tipo no mês atual
    var tipoAcesso = {};
    Object.keys(curMap).forEach(function(tipo) {
      tipoAcesso[tipo] = Math.round(curMap[tipo] / totalCur * 100);
    });

    // rankingMes: top 3 por acessos, delta vs mês anterior
    var rankingMes = Object.keys(curMap).map(function(tipo) {
      var ant   = antMap[tipo] || 0;
      var delta = '';
      if (ant > 0) {
        var pct = ((curMap[tipo] / ant) - 1) * 100;
        delta = (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
      }
      return { tipo: tipo, acessos: curMap[tipo], delta: delta };
    }).sort(function(a, b) { return b.acessos - a.acessos; }).slice(0, 3);

    // rankingAnual: acumula todos os meses do ano atual até o mês corrente
    var anoMap = {};
    Object.keys(idx).forEach(function(seqStr) {
      var seqNum = parseInt(seqStr, 10);
      if (seqNum > alvoSeq) return;
      if (Math.floor((seqNum - 1) / 12) !== alvoAno2) return;
      var empMap = idx[seqNum][emp];
      if (!empMap) return;
      Object.keys(empMap).forEach(function(tipo) {
        anoMap[tipo] = (anoMap[tipo] || 0) + empMap[tipo];
      });
    });
    var rankingAnual = Object.keys(anoMap).map(function(tipo) {
      return { tipo: tipo, acessos: anoMap[tipo], delta: '' };
    }).sort(function(a, b) { return b.acessos - a.acessos; }).slice(0, 3);

    out[emp] = { tipoAcesso: tipoAcesso, rankingMes: rankingMes, rankingAnual: rankingAnual };
  });

  return out;
}

// ── Perfil de solicitações ────────────────────────────────────────
//
// Aba Perfil: 1 linha por mês — colunas % Motorista, % Visitante, % Ajudante.
// O script calcula a MÉDIA ACUMULADA DO ANO (YTD):
//   pct      = média de jan até o mês atual   (ex: jan–mai)
//   anterior = média de jan até o mês anterior (ex: jan–abr)
// Isso permite o usuário digitar valores mensais simples e ver a
// evolução acumulada do perfil sem precisar calcular nada manualmente.
function _lerPerfil(ss, mesAno) {
  var rows = _abaObj(ss, 'Perfil');
  if (!rows.length) return [];

  rows.sort(function(a, b) { return _seqMes(a['Mês']) - _seqMes(b['Mês']); });

  var alvoSeq  = _seqMes(mesAno);
  var alvoAno2 = Math.floor((alvoSeq - 1) / 12);

  // Meses do ano corrente até o mês atual
  var histAtual = rows.filter(function(r) {
    var seq = _seqMes(r['Mês']);
    return Math.floor((seq - 1) / 12) === alvoAno2 && seq <= alvoSeq;
  });
  // Meses do ano corrente até o mês anterior
  var histAnt = histAtual.slice(0, histAtual.length - 1);

  if (!histAtual.length) return [];

  function _avg(rowList, key) {
    if (!rowList.length) return 0;
    var soma = rowList.reduce(function(s, r) { return s + _normPct(r[key]); }, 0);
    return Math.round(soma / rowList.length * 100) / 100;
  }

  return [
    { key: '% Motorista', label: 'MOTORISTA' },
    { key: '% Visitante', label: 'VISITANTE' },
    { key: '% Ajudante',  label: 'AJUDANTE'  },
  ].map(function(t) {
    return {
      perfil:   t.label,
      pct:      _avg(histAtual, t.key),
      anterior: _avg(histAnt,   t.key),
      media12m: null, // omitido no modo acumulado
    };
  });
}

// ── Horário de Pico ───────────────────────────────────────────────

function _lerHorarioPico(ss, mesAno) {
  var abaHorario = ss.getSheetByName('Horário') || ss.getSheetByName('Horário de Pico');
  if (!abaHorario) return {};

  var rows = _abaObj(ss, abaHorario.getName());
  var alvoSeq = _seqMes(mesAno);
  var mesRows = rows.filter(function(r) {
    return _seqMes(r['Mês']) === alvoSeq;
  });

  var map = {};
  mesRows.forEach(function(r) {
    var emp  = _canonEmpreendimento(r['Empreendimento']);
    var dist = [];
    for (var h = 0; h < 24; h++) {
      dist.push(_normInt(r[String(h).padStart(2, '0')]));
    }

    var total = dist.reduce(function(s, v) { return s + v; }, 0);
    if (total === 0) { map[emp] = null; return; }

    // Ordena horas por contagem desc para encontrar pico e 2°/3°
    var sorted = dist
      .map(function(v, i) { return { hora: i, count: v }; })
      .filter(function(x) { return x.count > 0; })
      .sort(function(a, b) { return b.count - a.count; });

    function _pct(c) { return Math.round(c / total * 100); }

    map[emp] = {
      distribuicao: dist,
      total:    total,
      pico:     sorted[0] ? { hora: sorted[0].hora, count: sorted[0].count, pct: _pct(sorted[0].count) } : null,
      segundo:  sorted[1] ? { hora: sorted[1].hora, count: sorted[1].count, pct: _pct(sorted[1].count) } : null,
      terceiro: sorted[2] ? { hora: sorted[2].hora, count: sorted[2].count, pct: _pct(sorted[2].count) } : null,
    };
  });

  return map;
}

// ── Diagnóstico ───────────────────────────────────────────────────

/**
 * Diagnóstico da aba Clientes — rode no editor quando clientes aparecerem
 * no Mega errado. Loga a contagem de clientes por mês × empreendimento e
 * aponta linhas suspeitas (ex: cliente com "Itajaí" no nome marcado como
 * Mega Curitiba). Ver → Registros (Ctrl+Enter) para o resultado.
 */
function validarClientes() {
  var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  var rows = _abaObj(ss, 'Clientes');
  var porMes = {};
  var suspeitas = [];
  var vazias = [];
  var cidades = {
    'CURITIBA': 'Mega Curitiba',
    'ITAJAI':   'Mega Itajaí',
    'ESTEIO':   'Mega Esteio',
  };
  rows.forEach(function(r, i) {
    var linha = i + 2; // 1 = header
    var mes = _mesToStr(r['Mês']);
    var emp = _canonEmpreendimento(r['Empreendimento']);
    var cli = String(r['Cliente'] || '').trim();
    if (!cli) return;
    if (!emp) vazias.push('Linha ' + linha + ': "' + cli + '" sem Empreendimento');
    var chave = mes + ' | ' + (emp || '(vazio)');
    porMes[chave] = (porMes[chave] || 0) + 1;
    var cliNorm = cli.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    Object.keys(cidades).forEach(function(cid) {
      if (cliNorm.indexOf(cid) >= 0 && emp && cidades[cid] !== emp) {
        suspeitas.push('Linha ' + linha + ' (' + mes + '): "' + cli +
          '" está marcado como ' + emp);
      }
    });
  });
  Logger.log('── Clientes por mês × empreendimento ──');
  Object.keys(porMes).sort().forEach(function(k) {
    Logger.log('  ' + k + ' → ' + porMes[k] + ' cliente(s)');
  });
  if (vazias.length) {
    Logger.log('── Linhas sem empreendimento (herdam a linha de cima) ──');
    vazias.forEach(function(s) { Logger.log('  ' + s); });
  }
  if (suspeitas.length) {
    Logger.log('⚠ LINHAS SUSPEITAS — confira o Empreendimento:');
    suspeitas.forEach(function(s) { Logger.log('  ' + s); });
  } else {
    Logger.log('Nenhuma linha suspeita encontrada.');
  }
}

/**
 * Diagnóstico do recorde — rode no editor para ver o que o script calcula.
 * Mostra, por Mega, o fluxo do mês, o maior valor já registrado (e em qual
 * mês), e o veredito. Use quando um selo de recorde aparecer/faltar sem
 * explicação. Ver → Registros (Ctrl+Enter).
 */
function validarRecordes() {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var cfg = _lerConfig(ss);
  var rows = _abaObj(ss, 'Dados', 1).filter(function(r) {
    return _mesToStr(r['Mês']) !== '';
  });

  var seqAtual = _seqMes(cfg.mesAno);
  var nomes = ['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'];

  var rowMap = {};
  rows.forEach(function(r) {
    var seq = _seqMes(r['Mês']);
    if (!rowMap[seq]) rowMap[seq] = {};
    rowMap[seq][_canonEmpreendimento(r['Empreendimento'])] = r;
  });

  Logger.log('Mês da Config: ' + cfg.mesAno + '  (seq ' + seqAtual + ')');
  Logger.log('Meses na aba Dados: ' + Object.keys(rowMap).length);
  if (!rowMap[seqAtual]) {
    Logger.log('⚠ Nenhuma linha encontrada para o mês atual — confira a aba Dados/Config.');
    return;
  }

  var seqsAnt = Object.keys(rowMap).map(Number).filter(function(s) { return s < seqAtual; });
  var totalAtual = 0, totPorSeq = {};

  nomes.forEach(function(nome) {
    var rc  = rowMap[seqAtual][nome];
    var cur = rc ? _normInt(rc['Fluxo Total']) : 0;
    totalAtual += cur;
    var maxAnt = 0, mesMax = '';
    seqsAnt.forEach(function(s) {
      var r = rowMap[s][nome];
      var v = r ? _normInt(r['Fluxo Total']) : 0;
      if (v > maxAnt) { maxAnt = v; mesMax = _mesToStr(r['Mês']); }
      totPorSeq[s] = (totPorSeq[s] || 0) + v;
    });
    var rec = cur > 0 && maxAnt > 0 && cur > maxAnt;
    Logger.log(nome + ': mês = ' + cur + ' | recorde anterior = ' + maxAnt +
      ' (' + mesMax + ') → ' + (rec ? '★ RECORDE' : 'sem recorde'));
  });

  var maxTot = 0, mesMaxTot = '';
  Object.keys(totPorSeq).forEach(function(s) {
    if (totPorSeq[s] > maxTot) { maxTot = totPorSeq[s]; mesMaxTot = s; }
  });
  Logger.log('TOTAL: mês = ' + totalAtual + ' | maior total anterior = ' + maxTot +
    ' (seq ' + mesMaxTot + ') → ' + (totalAtual > maxTot ? '★ RECORDE' : 'sem recorde'));
  Logger.log('Primeira vez acima de 100 mil: ' +
    (totalAtual >= 100000 && maxTot > 0 && maxTot < 100000));

  var d = lerPlanilha();
  Logger.log('── Marcos calculados ──');
  Logger.log(JSON.stringify(d.resumo.marcos, null, 2));
}
