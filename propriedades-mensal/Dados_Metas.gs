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
 * PPC — lido DAS CÉLULAS do painel, igual ao Facilities.
 *
 * O Facilities (gestao-tvs/Dados.gs, obterDadosPPC) abre a planilha de PPC e
 * pega o que já está calculado nas linhas ADERENCIA % / META / ACUMULADO. Aqui
 * é o mesmo: a planilha é dona do número, o código só lê. Decisão do usuário
 * — "siga o que está aparecendo na célula".
 *
 *   mês → ADERENCIA % na coluna do mês de referência
 *   ano → ACUMULADO   na mesma coluna (é a série acumulada, não o ano inteiro)
 *
 * UMA DIFERENÇA DELIBERADA para o Facilities: lá as linhas são pegas por
 * POSIÇÃO (data[6], data[7], data[8]). Aqui são achadas pelo RÓTULO da coluna
 * A. É o caso do boletim no CLAUDE.md — uma linha a mais na aba moveu o TOTAL
 * de C40 para C41 e o slide passou a mostrar outro número, sem erro nenhum.
 * Rótulo sobrevive a linha inserida; posição não.
 *
 * A contagem de SIM continua sendo feita, mas só como CONFERÊNCIA: se a
 * célula e a contagem divergirem, o Logger avisa. Foi assim que apareceu que
 * o painel tinha ficado defasado depois de o usuário editar as abas.
 */
function _metaPPC_(ref) {
  const painel = _metaPainelPPC_();
  if (!painel) return { mes: null, ano: null };

  const mes = painel.aderencia[ref.index];
  const ano = painel.acumulado[ref.index];

  // Conferência: recontar os SIM tem que dar o mesmo que a célula diz.
  const prev = _metaContarSim_(METAS_PPC_ABA_PREVISTAS);
  const real = _metaContarSim_(METAS_PPC_ABA_REALIZADAS);
  if (prev && real) {
    let p = 0, r = 0;
    for (let m = 0; m <= ref.index; m++) { p += prev[m]; r += real[m]; }
    const contado = p > 0 ? (r / p) * 100 : null;
    if (contado != null && ano != null && Math.abs(contado - ano) > 0.5) {
      Logger.log('Metas PPC: ⚠ o painel diz ' + ano.toFixed(2) + '% acumulado, mas contar os ' +
                 'SIM das abas dá ' + contado.toFixed(2) + '% (' + r + '/' + p + '). ' +
                 'As linhas ESPERADO/REALIZADO do painel podem estar como número fixo ' +
                 'em vez de fórmula — o slide mostra o que a célula diz.');
    }
  }

  if (painel.meta[ref.index] != null) {
    Logger.log('Metas PPC: mês ' + (mes == null ? '—' : mes.toFixed(2) + '%') +
               ' · acumulado ' + (ano == null ? '—' : ano.toFixed(2) + '%') +
               ' · meta da planilha ' + painel.meta[ref.index].toFixed(2) + '%');
  }
  return { mes: mes, ano: ano };
}

/**
 * Acha o painel do PPC e devolve as três séries por mês.
 *
 * Não pede o nome da aba: procura em todas a que tem uma linha começando por
 * ADERENCIA. O usuário montou esse painel à mão e o nome pode mudar; o rótulo
 * da linha é o que identifica.
 */
function _metaPainelPPC_() {
  const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  try {
    const ss = SpreadsheetApp.openById(METAS_PPC_ID);
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      const data = abas[i].getDataRange().getDisplayValues();
      const acha = pref => {
        for (let r = 0; r < data.length; r++) {
          if (_histNorm_(data[r][0]).indexOf(pref) === 0) return data[r];
        }
        return null;
      };
      const lAder = acha('aderencia');
      if (!lAder) continue;
      const lMeta = acha('meta'), lAcum = acha('acumulado'), lMes = acha('mes');
      if (!lMes) continue;

      // Coluna de cada mês, pelo nome no cabeçalho. A aba tem colunas extras
      // (ANO, ACUMULADO) depois dos 12 meses — casar pelo nome as ignora.
      const aderencia = [], meta = [], acumulado = [];
      lMes.forEach((cel, c) => {
        const idx = MESES.indexOf(_histNorm_(cel));
        if (idx < 0) return;
        aderencia[idx] = _metaPct_(lAder[c]);
        meta[idx]      = lMeta ? _metaPct_(lMeta[c]) : null;
        acumulado[idx] = lAcum ? _metaPct_(lAcum[c]) : null;
      });
      if (aderencia.length) {
        Logger.log('Metas PPC: painel lido da aba "' + abas[i].getName() + '".');
        return { aderencia: aderencia, meta: meta, acumulado: acumulado };
      }
    }
    Logger.log('Metas PPC: nenhuma aba com linha ADERENCIA. Abas: ' +
               abas.map(a => a.getName()).join(' | '));
    return null;
  } catch (e) {
    Logger.log('Metas PPC: falha lendo o painel — ' + e.message);
    return null;
  }
}

// Conta "SIM" por mês numa das abas do PPC — usado só como CONFERÊNCIA
// contra o que a célula do painel diz. As 12 colunas de mês vêm depois de
// Empresa|Empreendimento|Categoria|Manutenção|Responsavel|META.
function _metaContarSim_(nomeAba) {
  try {
    const ss  = SpreadsheetApp.openById(METAS_PPC_ID);
    const aba = ss.getSheetByName(nomeAba);
    if (!aba) return null;
    const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getDisplayValues();
    const cab = v[0].map(c => String(c || '').trim().toUpperCase());
    const c0 = cab.indexOf('JAN');
    if (c0 < 0) return null;

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
    Logger.log('Metas PPC: conferência não pôde ler "' + nomeAba + '" — ' + e.message);
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
