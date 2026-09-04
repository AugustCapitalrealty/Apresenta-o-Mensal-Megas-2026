/**
 * ARQUIVO: Dados_Metas.gs
 * DADOS — FAROL DE METAS (Property)
 *
 * Preenche o `real` das linhas que trazem `calc` em METAS_PROPRIEDADES. As
 * linhas de SIM/NÃO não passam por aqui: elas são escritas à mão no config.
 *
 * TODAS as quatro contas respeitam o mês de referência (CONFIG!B1): o "mês" é
 * o mês de referência e o "ano" é o ACUMULADO até ele, nunca o ano inteiro.
 * Sem isso o deck de agosto mostraria execução de setembro em diante — foi
 * exatamente o que apareceu na primeira versão do PPC.
 *
 * Devolve null quando não há o que medir, nunca zero (lição 3). Zero é um
 * resultado; null é ausência de medição, e as duas coisas pintam diferente.
 */

// Real de cada linha calculada → { mes, ano } já como texto no formato do farol.
function obterMetasCalculadas_() {
  const ref = obterMesReferencia_();
  return {
    slaPreventivas: _metaSlaPreventivas_(ref),
    ppc:            _metaPPC_(ref),
    piso:           _metaPiso_(ref),
    reabertura:     _metaReabertura_(ref)
  };
}

/**
 * SLA das preventivas de PROPRIEDADES — todas, não só as do analista.
 *
 * POR QUE TODAS: o farol do Wilson contava só as preventivas dele e chegou a
 * 84,55% no ano; o deck conta todas e dá 81,9%. Números diferentes porque a
 * população é diferente, não porque um esteja errado. O deck manda, e é o
 * mesmo `obterIndicadoresPropriedades_` que o slide de Preventivas usa — um
 * número só de fonte.
 */
function _metaSlaPreventivas_(ref) {
  try {
    const mes  = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index);
    const acum = obterIndicadoresPropriedades_(BD_ABA_PREVENTIVAS, ref.ano, ref.index, 'acumulado');
    return {
      mes: mes  && mes.total.sla.pct  != null ? mes.total.sla.pct  : null,
      ano: acum && acum.total.sla.pct != null ? acum.total.sla.pct : null
    };
  } catch (e) {
    Logger.log('Metas: SLA de preventivas falhou — ' + e.message);
    return { mes: null, ano: null };
  }
}

/**
 * PPC — Percent Plan Complete, por CONTAGEM de serviços.
 *
 * realizados ÷ previstos, contando marcas "SIM" nas duas abas. NÃO é média
 * ponderada por R$: a definição clássica de PPC conta tarefas, e é o que a
 * referência (PPC MEGA CURITIBA 2026) faz na linha ADERENCIA %.
 *
 * A diferença entre as duas leituras é grande — 50% contra 48,7% ponderado —
 * então a escolha está travada por teste.
 */
function _metaPPC_(ref) {
  const prev = _metaContarSim_(METAS_PPC_ABA_PREVISTAS);
  const real = _metaContarSim_(METAS_PPC_ABA_REALIZADAS);
  if (!prev || !real) return { mes: null, ano: null };

  const pct = (r, p) => (p > 0 ? (r / p) * 100 : null);
  let pAcum = 0, rAcum = 0;
  for (let m = 0; m <= ref.index; m++) { pAcum += prev[m]; rAcum += real[m]; }

  Logger.log('Metas PPC: mês ' + real[ref.index] + '/' + prev[ref.index] +
             ' · acumulado ' + rAcum + '/' + pAcum);
  return { mes: pct(real[ref.index], prev[ref.index]), ano: pct(rAcum, pAcum) };
}

// Conta "SIM" por mês numa das abas do PPC. As 12 colunas de mês vêm depois
// de Empresa|Empreendimento|Categoria|Manutenção|Responsavel|META.
function _metaContarSim_(nomeAba) {
  try {
    const ss  = SpreadsheetApp.openById(METAS_PPC_ID);
    const aba = ss.getSheetByName(nomeAba);
    if (!aba) {
      Logger.log('Metas PPC: aba "' + nomeAba + '" não existe. Abas: ' +
                 ss.getSheets().map(s => s.getName()).join(' | '));
      return null;
    }
    const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();
    const cab = v[0].map(c => String(c || '').trim().toUpperCase());
    const c0 = cab.indexOf('JAN');
    if (c0 < 0) { Logger.log('Metas PPC: coluna JAN não encontrada em "' + nomeAba + '".'); return null; }

    const cont = [];
    for (let m = 0; m < 12; m++) cont.push(0);
    for (let r = 1; r < v.length; r++) {
      // A linha de total (ESPERADO/REALIZADO) não é serviço — não conta.
      const rot = String(v[r][0] || '').trim().toUpperCase();
      if (rot === 'ESPERADO' || rot === 'REALIZADO') continue;
      for (let m = 0; m < 12; m++) {
        if (String(v[r][c0 + m] || '').trim().toUpperCase() === 'SIM') cont[m]++;
      }
    }
    return cont;
  } catch (e) {
    Logger.log('Metas PPC: falha lendo "' + nomeAba + '" — ' + e.message);
    return null;
  }
}

/**
 * Metros de piso — CONTROLE PISO 2026, linha TOTAL REALIZADO.
 *
 * O ano é o ACUMULADO até o mês de referência, não a coluna TOTAL da
 * planilha: aquela soma os 12 meses e inclui setembro em diante.
 */
function _metaPiso_(ref) {
  try {
    const ss  = SpreadsheetApp.openById(METAS_PISO_ID);
    const aba = ss.getSheets()[0];
    const v   = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();

    let linha = -1, cabIdx = -1;
    for (let r = 0; r < v.length; r++) {
      if (_histNorm_(v[r][0]).indexOf('total realizado') >= 0 ||
          _histNorm_(v[r][8]).indexOf('total realizado') >= 0) { linha = r; break; }
    }
    for (let r = 0; r < v.length; r++) {
      if (v[r].some(c => _histNorm_(c) === 'janeiro')) { cabIdx = r; break; }
    }
    if (linha < 0 || cabIdx < 0) { Logger.log('Metas piso: TOTAL REALIZADO ou cabeçalho de meses não encontrado.'); return { mes: null, ano: null }; }

    const c0 = v[cabIdx].findIndex(c => _histNorm_(c) === 'janeiro');
    const num = s => {
      const t = String(s || '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(t);
      return isNaN(n) ? 0 : n;
    };
    let acum = 0;
    for (let m = 0; m <= ref.index; m++) acum += num(v[linha][c0 + m]);
    const mes = num(v[linha][c0 + ref.index]);
    Logger.log('Metas piso: mês ' + mes.toFixed(2) + 'm · acumulado ' + acum.toFixed(2) + 'm');
    return { mes: mes, ano: acum };
  } catch (e) {
    Logger.log('Metas piso: falha — ' + e.message);
    return { mes: null, ano: null };
  }
}

/**
 * Taxa de reabertura — reabertos ÷ fechados.
 *
 * Lê a BASE BRUTA (aba CHAMADOS FECHADOS, uma linha por chamado, coluna
 * REABERTURA SIM/NÃO), que é preferível à tabela agregada da mesma planilha
 * (lição 3). Ambas conferidas: as 19 linhas batem mês a mês com a agregada.
 *
 * MÊS SEM FECHAMENTO devolve null, não 0%. Agosto teve zero chamados
 * fechados: dizer "0% de reabertura" daria crédito por um resultado que não
 * existiu. O acumulado do ano segue definido (0/19 = 0%).
 */
function _metaReabertura_(ref) {
  try {
    const ss = SpreadsheetApp.openById(METAS_REABERTURA_ID);
    const aba = ss.getSheetByName('CHAMADOS FECHADOS') || ss.getSheets()[0];
    const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();

    const cab = v[0].map(c => _histNorm_(c));
    const cFech = cab.indexOf('fechado em');
    const cReab = cab.indexOf('reabertura');
    if (cFech < 0 || cReab < 0) {
      Logger.log('Metas reabertura: colunas "Fechado em"/"REABERTURA" não encontradas. Cabeçalho: ' +
                 v[0].filter(String).join(' | '));
      return { mes: null, ano: null };
    }

    let fMes = 0, rMes = 0, fAno = 0, rAno = 0, semData = 0;
    for (let r = 1; r < v.length; r++) {
      const d = _histParseDataHora_(v[r][cFech]);
      if (!d) { if (String(v[r][0] || '').trim()) semData++; continue; }
      if (d.getUTCFullYear() !== ref.ano) continue;
      const m = d.getUTCMonth();
      if (m > ref.index) continue;                       // depois do mês de referência não conta
      const reaberto = _histNorm_(v[r][cReab]) === 'sim';
      fAno++; if (reaberto) rAno++;
      if (m === ref.index) { fMes++; if (reaberto) rMes++; }
    }
    // Zero falso: linhas existem mas nenhuma data legível → null, não 0%.
    if (!fAno && semData) {
      Logger.log('Metas reabertura: ' + semData + ' linha(s) sem data de fechamento legível.');
      return { mes: null, ano: null };
    }
    Logger.log('Metas reabertura: mês ' + rMes + '/' + fMes + ' · ano ' + rAno + '/' + fAno);
    return {
      mes: fMes > 0 ? (rMes / fMes) * 100 : null,
      ano: fAno > 0 ? (rAno / fAno) * 100 : null
    };
  } catch (e) {
    Logger.log('Metas reabertura: falha — ' + e.message);
    return { mes: null, ano: null };
  }
}
