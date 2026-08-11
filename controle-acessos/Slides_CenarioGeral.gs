/**
 * Slides da seção "Cenário geral":
 * 2025x2026, Fluxo, Colaboradores, Tempo médio, Uso de celular,
 * Indicador genérico, Tipo de acesso, Perfil de solicitações.
 */

// ---------- Textos automáticos ----------
//
// Os textos são NEUTROS: apresentam e destacam os dados (volumes, variações,
// participações, máximas da série) sem juízo de valor, sem recomendação e sem
// adjetivar o desempenho. A leitura dos números fica com quem lê o relatório.
// Todas as frases são derivadas dos dados — nada fixo no código.

/** Nome curto do Mega ("Mega Curitiba" → "Curitiba"). */
function _mgCurto(nome) {
  return String(nome || '').replace(/^Mega\s+/i, '');
}

/** "-02m35s" → { sinal: -1, abs: '02m35s' }. '=' / vazio → sinal 0. */
function _parseVarTempo(v) {
  var s = String(v || '').trim();
  if (!s || s === '=' || s === '—') return { sinal: 0, abs: '' };
  var c = s.charAt(0);
  return {
    sinal: c === '-' ? -1 : (c === '+' ? 1 : 0),
    abs:   s.replace(/^[+-]/, ''),
  };
}

/** "+15,7%" → 15.7 (NaN quando vazio/inválido). */
function _pctNum(v) {
  var n = parseFloat(String(v || '').replace('%', '').replace(',', '.').trim());
  return isNaN(n) ? NaN : n;
}

/** Ordena Megas por uma métrica, do maior para o menor. */
function _ordenaPor(lista, fn) {
  return lista.slice().sort(function (a, b) { return fn(b) - fn(a); });
}

/**
 * Colaboradores fixos: relação acessos/colaborador e o quadro de cada Mega
 * com sua variação. Apenas os números, sem avaliação.
 */
function montarTextoColaboradores(d) {
  const e = d.empreendimentos;
  const p = [];

  const comBase = e.filter(function (m) { return m.colaboradoresFixos > 0 && m.fluxoTotal > 0; });
  if (comBase.length) {
    const top = _ordenaPor(comBase, function (m) { return m.fluxoTotal / m.colaboradoresFixos; })[0];
    const razao = top.fluxoTotal / top.colaboradoresFixos;
    p.push('O ' + top.nome + ' registra ' + razao.toFixed(1).replace('.', ',') +
      ' acessos por colaborador fixo, a maior relação entre os Megas.');
  }

  const lista = e.filter(function (m) { return m.colaboradoresFixos > 0; })
    .map(function (m) {
      return _mgCurto(m.nome) + ' ' + fmtNum(m.colaboradoresFixos) +
        (m.colaboradoresVar ? ' (' + m.colaboradoresVar + ')' : '');
    });
  if (lista.length) p.push('Quadro fixo no mês: ' + lista.join('; ') + '.');

  return p.join(' ') || 'Dados de colaboradores fixos não disponíveis para este período.';
}

/**
 * Tempo médio de acesso por Mega, com a variação sobre o mês anterior.
 * Apenas os números, sem avaliação.
 */
function montarTextoTempoMedio(d) {
  const partes = d.empreendimentos.map(function (m) {
    if (!m.tempoMedio) return '';
    const v = _parseVarTempo(m.tempoMedioVar);
    let s = _mgCurto(m.nome) + ' ' + m.tempoMedio;
    if (v.sinal < 0)      s += ' (-' + v.abs + ')';
    else if (v.sinal > 0) s += ' (+' + v.abs + ')';
    return s;
  }).filter(function (t) { return t; });

  if (!partes.length) return 'Tempo médio não disponível para este período.';
  return 'Tempo médio de acesso no mês, com a variação sobre o mês anterior: ' +
    partes.join('; ') + '.';
}

/**
 * Fluxo de pessoas: volume, participação no total e variação de cada Mega.
 * Apenas os números, sem avaliação.
 */
function montarTextoFluxo(d) {
  const tot = d.resumo.totalAcessos || 1;
  const ord = _ordenaPor(d.empreendimentos, function (m) { return m.fluxoTotal; });
  const partes = ord.map(function (m) {
    return _mgCurto(m.nome) + ' ' + fmtNum(m.fluxoTotal) + ' (' +
      Math.round(m.fluxoTotal / tot * 100) + '% do total' +
      (m.variacaoMes ? ', ' + m.variacaoMes : '') + ')';
  });
  return 'O volume de acessos totalizou ' + fmtNum(d.resumo.totalAcessos) +
    ' no mês: ' + partes.join('; ') + '.';
}

// ---------- COMPARATIVO ANUAL (ex: 2025 x 2026) ----------
function buildComparativo2025x2026(pres, d, pageNum) {
  const comp = d.comparativo2025x2026;
  const anos = Object.keys(comp.fluxoAcumulado || {}).sort();
  if (anos.length < 2) {
    pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    return;
  }

  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);

  const anoAnt = anos[anos.length - 2];
  const anoAtu = anos[anos.length - 1];

  // Período acumulado: jan até o mês atual (ex: "jan a mai")
  const _mAbr = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const _mp = (d.mesAno || '').split('/');
  const _mIdx = (_mp[0].length <= 2 && !isNaN(Number(_mp[0]))) ? (parseInt(_mp[0], 10) - 1) : -1;
  const periodo = _mIdx >= 0 ? 'jan a ' + _mAbr[_mIdx] : 'acumulado';
  const lblAnt = periodo + '/' + anoAnt.slice(-2);
  const lblAtu = periodo + '/' + anoAtu.slice(-2);

  // valores com fallback 0 / '' para grupos ausentes
  const vFluxo = function (ano, g) { return (comp.fluxoAcumulado[ano] || {})[g] || 0; };
  const vTempo = function (ano, g) { return (comp.tempoMedioAcumulado[ano] || {})[g] || ''; };

  addHeader(slide, anoAnt + ' x ' + anoAtu,
    'Comparativo acumulado ' + periodo + ' — visitantes e motoristas');

  // divisor vertical central entre os dois gráficos
  addVerticalLine(slide, 363, 82, 230, THEME.navy, 1.2, 0.1);

  const groups = ['Mega Curitiba', 'Mega Itajaí', 'Mega Esteio'];

  // gráfico esquerdo — fluxo acumulado
  const seriesFluxo = [
    {
      label: lblAnt, color: THEME.lightBlue,
      values: groups.map(function (g) { return vFluxo(anoAnt, g); }),
    },
    {
      label: lblAtu, color: THEME.blueMid,
      values: groups.map(function (g) { return vFluxo(anoAtu, g); }),
    },
  ];
  drawGroupedBarChart(slide, PAGE.MARGIN, 98, 302, 148, groups, seriesFluxo, {});

  // gráfico direito — tempo médio acumulado
  const seriesTempo = [
    {
      label: lblAnt, color: THEME.lightBlue,
      values: groups.map(function (g) { return timeToMinutes(vTempo(anoAnt, g)); }),
      display: groups.map(function (g) { return vTempo(anoAnt, g); }),
    },
    {
      label: lblAtu, color: THEME.blueMid,
      values: groups.map(function (g) { return timeToMinutes(vTempo(anoAtu, g)); }),
      display: groups.map(function (g) { return vTempo(anoAtu, g); }),
    },
  ];
  drawGroupedBarChart(slide, 376, 98, 300, 148, groups, seriesTempo, {});

  // textos de análise em cards
  addCard(slide, PAGE.MARGIN, 260, 308, 72, {});
  addText(slide, PAGE.MARGIN + 12, 264, 284, 64, comp.textoFluxo, {
    size: 9, color: THEME.textMuted, align: 'JUSTIFY',
  });
  addCard(slide, 374, 260, 302, 72, {});
  addText(slide, 386, 264, 278, 64, comp.textoTempo, {
    size: 9, color: THEME.textMuted, align: 'JUSTIFY',
  });

  // card: delta acumulado total (usa anos derivados dos dados)
  var totAnt = groups.reduce(function (acc, g) { return acc + vFluxo(anoAnt, g); }, 0);
  var totAtu = groups.reduce(function (acc, g) { return acc + vFluxo(anoAtu, g); }, 0);
  var deltaTot = ((totAtu / (totAnt || 1) - 1) * 100);
  var deltaTotStr = (deltaTot >= 0 ? '+' : '') + deltaTot.toFixed(1).replace('.', ',') + '%';
  var labelAcum = 'FLUXO ACUMULADO ' + periodo.toUpperCase() + ' ' + anoAtu;
  addCard(slide, PAGE.MARGIN, 340, PAGE.W - 2 * PAGE.MARGIN, 28, { noStrip: true });
  addText(slide, PAGE.MARGIN + 14, 340, 220, 28, labelAcum, {
    size: 7.5, bold: true, color: THEME.textMuted,
  });
  addText(slide, PAGE.MARGIN + 232, 340, 90, 28, fmtNum(totAtu), {
    size: 13, bold: true, color: THEME.navy, align: 'CENTER',
  });
  addPill(slide, PAGE.MARGIN + 330, 345, 72, deltaTotStr, {});
  // Quando o acumulado do ano já supera o ano anterior FECHADO, destacamos o
  // marco em duas linhas dentro da mesma faixa (ver marcos em SpreadsheetReader).
  const mk = (d.resumo && d.resumo.marcos) || {};
  if (mk.superouAnoFechado) {
    addText(slide, PAGE.MARGIN + 410, 339, 200, 13,
      'vs. ' + fmtNum(totAnt) + ' em ' + periodo + '/' + anoAnt.slice(-2), {
        size: 6.5, color: THEME.textMuted,
      });
    addText(slide, PAGE.MARGIN + 410, 352, 200, 14,
      '★ já supera todo o ' + mk.anoAnterior + ' (' + fmtNum(mk.totalAnoAnterior) + ')', {
        size: 7, bold: true, color: THEME.gold,
      });
  } else {
    addText(slide, PAGE.MARGIN + 410, 344, 180, 18, 'vs. ' + fmtNum(totAnt) + ' em ' + anoAnt, {
      size: 7.5, color: THEME.textMuted,
    });
  }

  addFooter(slide, pageNum);
  return slide;
}

// ---------- LAYOUT COMPARTILHADO: série empilhada 13 meses + painel ----------
// Usado por Fluxo de pessoas e Colaboradores fixos.
function buildSerieEmpilhada(pres, d, cfg, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, cfg.titulo, cfg.subtitulo);

  addCard(slide, PAGE.MARGIN, 77, 478, 52, {});
  addText(slide, PAGE.MARGIN + 12, 81, 454, 44, cfg.texto, { size: 9.5, color: THEME.textMuted, align: 'JUSTIFY' });

  const series = Object.keys(MEGA_COLORS).map(function (nome) {
    return {
      label: nome.replace('Mega ', ''),
      color: MEGA_COLORS[nome],
      values: cfg.dataMensal[nome],
    };
  });
  if (cfg.tipoGrafico === 'linha') {
    drawLineChart(slide, PAGE.MARGIN, 134, 478, 226, MESES_LABEL, series, { showYAxis: true });
  } else {
    drawStackedColumnTotals(slide, PAGE.MARGIN, 134, 478, 226, MESES_LABEL, series, {});
  }

  const panelX = 540;
  addText(slide, panelX, 124, 136, 16, d.mesAno + ' POR MEGA', {
    size: 8.5, bold: true, color: THEME.textMuted,
  });
  const totalAtual = d.empreendimentos.reduce(function (acc, m) {
    return acc + cfg.getValor(m);
  }, 0);
  d.empreendimentos.forEach(function (m, i) {
    const y = 146 + i * 72;
    addCard(slide, panelX, y, 136, 62, { noStrip: true });
    addRect(slide, panelX, y, 4, 62, MEGA_COLORS[m.nome]);
    addText(slide, panelX + 14, y + 8, 116, 14, m.nome.toUpperCase(), {
      size: 7, bold: true, color: THEME.textMuted,
    });
    addText(slide, panelX + 14, y + 22, 116, 22, fmtNum(cfg.getValor(m)), {
      size: 15, bold: true, color: THEME.navy,
    });
    const pct = (cfg.getValor(m) / (totalAtual || 1) * 100).toFixed(0);
    addText(slide, panelX + 14, y + 44, 50, 14, pct + '%', {
      size: 8, bold: true, color: MEGA_COLORS[m.nome],
    });
    addPill(slide, panelX + 70, y + 41, 58, cfg.getVar(m), {});
  });

  addFooter(slide, pageNum);
  return slide;
}

// ---------- FLUXO DE PESSOAS ----------
function buildFluxo(pres, d, pageNum) {
  const e = d.empreendimentos;
  return buildSerieEmpilhada(pres, d, {
    titulo: 'Fluxo de pessoas',
    subtitulo: 'Visitantes e motoristas — 13 meses',
    texto: montarTextoFluxo(d),
    dataMensal: d.fluxoMensal,
    tipoGrafico: 'linha',
    getValor: function (m) { return m.fluxoTotal; },
    getVar: function (m) { return m.variacaoMes; },
  }, pageNum);
}

// ---------- COLABORADORES FIXOS ----------
function buildColaboradores(pres, d, pageNum) {
  return buildSerieEmpilhada(pres, d, {
    titulo: 'Colaboradores fixos',
    subtitulo: 'Comparativo entre empreendimentos — 13 meses',
    texto: montarTextoColaboradores(d),
    dataMensal: d.colaboradoresMensal,
    tipoGrafico: 'linha',
    getValor: function (m) { return m.colaboradoresFixos; },
    getVar: function (m) { return m.colaboradoresVar; },
  }, pageNum);
}

// ---------- TEMPO MÉDIO ----------
function buildTempoMedio(pres, d, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Tempo médio', 'Evolução por empreendimento — 13 meses');

  addCard(slide, PAGE.MARGIN, 75, PAGE.W - 2 * PAGE.MARGIN, 42, {});
  addText(slide, PAGE.MARGIN + 12, 79, PAGE.W - 2 * PAGE.MARGIN - 24, 34, montarTextoTempoMedio(d), {
    size: 9, color: THEME.textMuted, align: 'JUSTIFY',
  });

  const colW = 197;
  const gap = (PAGE.W - 2 * PAGE.MARGIN - 3 * colW) / 2;
  d.empreendimentos.forEach(function (m, i) {
    const x = PAGE.MARGIN + i * (colW + gap);
    const serie = d.tempoMedioMensalSeg[m.nome];

    addText(slide, x, 121, colW, 14, m.nome.toUpperCase(), {
      size: 8.5, bold: true, color: THEME.textMuted, align: 'CENTER',
    });
    addText(slide, x, 137, colW, 28, m.tempoMedio, {
      size: 21, bold: true, color: THEME.blue, align: 'CENTER',
    });
    addPill(slide, x + colW / 2 - 38, 168, 76, m.tempoMedioVar, { invert: true });

    drawTimeMiniChart(slide, x, 192, colW, 158, serie);
  });

  addFooter(slide, pageNum);
  return slide;
}

// ---------- USO DE CELULAR ----------
function buildUsoCelular(pres, d, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Uso de celular', 'Evolução por empreendimento — 13 meses');

  var _mp = (d.mesAno || '').split('/');
  var _mNomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var mes = (_mp[0].length <= 2 && !isNaN(Number(_mp[0])))
    ? (_mNomes[parseInt(_mp[0], 10) - 1] || _mp[0])
    : _mp[0].toLowerCase();
  addCard(slide, PAGE.MARGIN, 75, PAGE.W - 2 * PAGE.MARGIN, 42, {});
  addText(slide, PAGE.MARGIN + 12, 79, PAGE.W - 2 * PAGE.MARGIN - 24, 34,
    'O indicador de uso de celular apresenta variação entre os três empreendimentos no fechamento de ' +
    mes + '. O crescimento gradual reflete maior adoção da plataforma móvel para agendamentos e pré-autorização.', {
      size: 9, color: THEME.textMuted, align: 'JUSTIFY',
    });

  const colW = 197;
  const gap = (PAGE.W - 2 * PAGE.MARGIN - 3 * colW) / 2;

  d.empreendimentos.forEach(function (m, i) {
    const x = PAGE.MARGIN + i * (colW + gap);
    const serie = d.usoCelularMensal[m.nome];
    const varPp = serie[serie.length - 1] - serie[serie.length - 2];
    const varStr = (varPp >= 0 ? '+' : '') + varPp.toFixed(2).replace('.', ',') + ' p.p.';

    addText(slide, x, 121, colW, 14, m.nome.toUpperCase(), {
      size: 8.5, bold: true, color: THEME.textMuted, align: 'CENTER',
    });
    addText(slide, x, 137, colW, 28, m.usoCelular, {
      size: 21, bold: true, color: THEME.blue, align: 'CENTER',
    });
    addPill(slide, x + colW / 2 - 38, 168, 76, varStr, {});

    drawTimeMiniChart(slide, x, 192, colW, 158, serie, {
      formatFn: function (v) { return v + '%'; },
    });
  });

  addFooter(slide, pageNum);
  return slide;
}

// ---------- INDICADOR COMPARATIVO (genérico) ----------
function buildIndicador(pres, d, titulo, campo, sufixoVar, texto, pageNum, opts) {
  opts = opts || {};
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, titulo, 'Comparativo entre empreendimentos');

  addText(slide, PAGE.MARGIN, 86, PAGE.W - 2 * PAGE.MARGIN, 48, texto, {
    size: 9.5, color: THEME.textMuted,
  });

  const cardW = (PAGE.W - 2 * PAGE.MARGIN - 44) / 3;
  d.empreendimentos.forEach(function (e, i) {
    const x = PAGE.MARGIN + i * (cardW + 22);
    addCard(slide, x, 158, cardW, 176, {});
    addText(slide, x + 12, 176, cardW - 24, 20, e.nome.toUpperCase(), {
      size: 10.5, bold: true, color: THEME.textMuted, align: 'CENTER',
    });
    const valor = typeof e[campo] === 'number' ? fmtNum(e[campo]) : e[campo];
    addText(slide, x + 12, 212, cardW - 24, 50, valor, {
      size: 30, bold: true, color: THEME.blue, align: 'CENTER',
    });
    if (sufixoVar && e[sufixoVar]) {
      addPill(slide, x + cardW / 2 - 42, 282, 84, e[sufixoVar], { invert: opts.invert });
    }
  });
  addFooter(slide, pageNum);
  return slide;
}

// ---------- TIPO DE ACESSO ----------
function buildTipoAcesso(pres, d, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Tipo de acesso', 'Visitantes e motoristas');
  const data = {};
  d.empreendimentos.forEach(function (e) { data[e.nome] = e.tipoAcesso; });
  drawTipoAcessoChart(slide, PAGE.MARGIN, 96, PAGE.W - 2 * PAGE.MARGIN, 264, data);
  addFooter(slide, pageNum);
  return slide;
}

// ---------- PERFIL DE SOLICITAÇÕES ----------
function buildPerfil(pres, d, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Perfil de solicitações', d.perfilSolicitacoes.titulo);

  const itens = d.perfilSolicitacoes.itens;
  const cardW = (PAGE.W - 2 * PAGE.MARGIN - 40) / 3;
  const cardY = 88;
  const cardH = 272;

  itens.forEach(function (it, i) {
    const cx = PAGE.MARGIN + i * (cardW + 20);        // x do card
    const mid = cx + cardW / 2;                        // centro horizontal

    // card de fundo
    addCard(slide, cx, cardY, cardW, cardH, { noStrip: true });

    // nome do perfil no topo do card
    addText(slide, cx + 12, cardY + 14, cardW - 24, 20, it.perfil, {
      size: 11, bold: true, color: THEME.blue, align: 'CENTER',
    });
    addLine(slide, mid - 24, cardY + 36, 48, THEME.blue, 1, 0.35);

    // anel decorativo + glow centralizado no card
    const ringY = cardY + 52;
    const ringSize = 120;
    addGlow(slide, mid - ringSize / 2, ringY, ringSize, THEME.blue, 0.07);
    addRing(slide, mid - ringSize / 2, ringY, ringSize, THEME.blue, 2.5, 0.22);
    addRing(slide, mid - ringSize / 2 + 10, ringY + 10, ringSize - 20, THEME.blue, 1, 0.1);

    // percentual atual — hero number centralizado no anel
    const _fmtPct = function(v) {
      return (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v)) + '%';
    };
    addText(slide, cx + 12, ringY + 30, cardW - 24, 60, _fmtPct(it.pct), {
      size: 38, bold: true, color: THEME.navy, align: 'CENTER',
    });

    // anterior
    addText(slide, cx + 12, cardY + 192, cardW - 24, 18,
      'Período anterior: ' + _fmtPct(it.anterior), {
        size: 8.5, color: THEME.textMuted, align: 'CENTER',
      });

    // barras: anterior e atual (méd. 12m omitida no modo acumulado)
    const barW = cardW - 48;
    const barX = cx + 24;
    const barY = cardY + 216;
    addProgressBar(slide, barX, barY, barW, it.anterior, THEME.lightBlue, 5);
    addProgressBar(slide, barX, barY + 8, barW, it.pct, THEME.blueMid, 5);
    if (it.media12m != null && it.media12m > 0) {
      const refX = barX + (it.media12m / 100) * barW;
      addRect(slide, refX - 0.75, barY - 3, 1.5, 19, THEME.navy, false, 0.4);
      addText(slide, refX - 22, barY - 14, 44, 11, 'méd. 12m', {
        size: 5.5, color: THEME.textMuted, align: 'CENTER',
      });
    }

    // pill com variação em p.p.
    if (it.anterior != null && it.anterior > 0) {
      const delta = it.pct - it.anterior;
      const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(2).replace('.', ',') + ' p.p.';
      addPill(slide, mid - 36, cardY + 238, 72, deltaStr, {});
    }
  });

  addFooter(slide, pageNum);
  return slide;
}

// ---------- RANKING DE ACESSOS ----------
function buildRankingAcessos(pres, d, tipo, pageNum) {
  const isMes = tipo === 'mes';
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  var _p = (d.mesAno || '').split('/');
  var anoLabel = _p[1] && _p[1].length === 4 ? _p[1] : '20' + (_p[1] || '26');
  addHeader(slide, 'Ranking de acessos',
    isMes
      ? d.mesAno + ' — top 3 por tipo de veículo'
      : 'Acumulado ' + anoLabel + ' — top 3 por tipo de veículo');

  const RANK_COLORS = [THEME.navy, THEME.blueMid, THEME.blue];
  const MEDALHAS = ['🥇', '🥈', '🥉'];
  const VEICULO_EMOJI = {
    'CARRO': '🚗',
    'MOTO': '🏍️',
    'UTILITÁRIO': '🛻',
    'VAN': '🚐',
    'CAMINHÃO COM BAÚ': '🚚',
    'CAMINHÃO SEM CARRETA': '🚛',
    'CAMINHÃO COM CARRETA': '🚛',
    'A PÉ': '🚶',
  };
  const colW   = 200;
  const colGap = 16;
  const cardH  = 84;
  const cardGap = 10;

  d.empreendimentos.forEach(function (m, mi) {
    const cx = PAGE.MARGIN + mi * (colW + colGap);
    const megaColor = MEGA_COLORS[m.nome];

    // cabeçalho da coluna
    addRect(slide, cx, 82, colW, 3, megaColor);
    addText(slide, cx, 87, colW, 14, m.nome.toUpperCase(), {
      size: 8.5, bold: true, color: megaColor, align: 'CENTER',
    });

    const ranking = isMes ? m.rankingMes : m.rankingAnual;
    if (!ranking || ranking.length === 0) {
      addCard(slide, cx, 106, colW, 60, { noStrip: true });
      addText(slide, cx + 8, 124, colW - 16, 24, 'Sem dados para este período', {
        size: 8, color: THEME.textMuted, align: 'CENTER',
      });
      return;
    }
    ranking.slice(0, 3).forEach(function (item, ri) {
      const cardY = 106 + ri * (cardH + cardGap);
      const rColor = RANK_COLORS[ri];

      addCard(slide, cx, cardY, colW, cardH, { noStrip: true });
      addRect(slide, cx, cardY, 4, cardH, rColor);

      // medalha da posição
      addText(slide, cx + 8, cardY + cardH / 2 - 14, 32, 28, MEDALHAS[ri], {
        size: 17, align: 'CENTER',
      });

      // emoji + tipo de veículo
      addText(slide, cx + 44, cardY + 8, colW - 52, 16,
        (VEICULO_EMOJI[item.tipo] || '🚘') + '  ' + item.tipo, {
          size: 8, bold: true, color: THEME.navy,
        });

      // número de acessos (hero)
      addText(slide, cx + 44, cardY + 26, 130, 28, fmtNum(item.acessos), {
        size: 19, bold: true, color: rColor,
      });

      // pill com delta (ignorado se vazio)
      addPill(slide, cx + 44, cardY + cardH - 24, 80, item.delta, {});
    });
  });

  addFooter(slide, pageNum);
  return slide;
}
