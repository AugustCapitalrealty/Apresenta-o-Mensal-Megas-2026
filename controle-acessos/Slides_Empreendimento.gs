/**
 * Slides de seção por empreendimento:
 * Destaques do mês, Participação para o tempo médio,
 * % Agendado por cliente, Cards de clientes.
 */

// ---------- DESTAQUES DO MÊS ----------
function buildDestaques(pres, d, e, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Destaques do mês', e.nome + ' — ' + d.mesAno);
  addMegaLogo(slide, e.nome, false);

  addText(slide, PAGE.MARGIN, 92, 220, 48, fmtNum(e.fluxoTotal), {
    size: 38, bold: true, color: THEME.blue,
  });
  addText(slide, PAGE.MARGIN, 142, 220, 16, 'FLUXO TOTAL DE VISITANTES', {
    size: 8, bold: true, color: THEME.textMuted,
  });
  addPill(slide, PAGE.MARGIN, 162, 64, e.variacaoMes, {});
  if (typeof RECORDE_ACESSOS !== 'undefined' && RECORDE_ACESSOS && e.recordeAcessos) {
    addBadgeRecorde(slide, PAGE.MARGIN + 72, 162, { texto: '★ RECORDE', w: 150 });
  }

  // divisor sutil entre os dois números hero
  addVerticalLine(slide, PAGE.MARGIN + 232, 98, 78, THEME.navy, 1, 0.12);

  addText(slide, PAGE.MARGIN + 250, 92, 220, 48, fmtNum(e.filaEvitada), {
    size: 38, bold: true, color: THEME.navy,
  });
  addText(slide, PAGE.MARGIN + 250, 142, 220, 16, 'PESSOAS QUE EVITARAM FILA', {
    size: 8, bold: true, color: THEME.textMuted,
  });
  addText(slide, PAGE.MARGIN + 250, 162, 220, 16, e.filaEvitadaPct + ' do fluxo total', {
    size: 8.5, color: THEME.textMuted,
  });

  const kpis = [
    ['EVENTOS AGENDADOS', e.eventosAgendados],
    ['PRÉ-AUTORIZADOS', e.preAutorizados],
    ['ACESSO EM ATÉ 5 MIN', e.acesso5min],
    ['ACESSO EM ATÉ 10 MIN', e.acesso10min],
    ['EVENTOS EM CANCELA', e.eventosCancela],
    ['USO DE CELULAR', e.usoCelular],
  ];
  const kw = (PAGE.W - 2 * PAGE.MARGIN - 44) / 3;
  const megaAccent = MEGA_COLORS[e.nome] || THEME.blue;
  kpis.forEach(function (k, i) {
    const x = PAGE.MARGIN + (i % 3) * (kw + 22);
    const y = 196 + Math.floor(i / 3) * 84;
    addCard(slide, x, y, kw, 70, { accent: megaAccent });
    addText(slide, x + 8, y + 8, kw - 16, 28, k[1], {
      size: 19, bold: true, color: THEME.navy, align: 'CENTER',
    });
    addText(slide, x + 8, y + 36, kw - 16, 16, k[0], {
      size: 7, bold: true, color: THEME.textMuted, align: 'CENTER',
    });
    // barra proporcional ao percentual do KPI
    addProgressBar(slide, x + 16, y + 56, kw - 32, pctToNumber(k[1]), megaAccent);
  });
  addFooter(slide, pageNum);
  return slide;
}

// ---------- PARTICIPAÇÃO NO FLUXO DE ACESSOS ----------
function buildParticipacao(pres, d, e, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Clientes', 'Participação no fluxo de acessos — ' + e.nome);
  addMegaLogo(slide, e.nome, false);

  const part = e.participacaoTempoMedio || [];
  const principal = part[0];
  const segundo = part[1];

  if (!principal) {
    addText(slide, PAGE.MARGIN, 180, PAGE.W - 2 * PAGE.MARGIN, 40,
      'Dados de participação não disponíveis para este período.',
      { size: 12, color: THEME.textMuted, align: 'CENTER' });
    addFooter(slide, pageNum);
    return slide;
  }

  // Nome simplificado do cliente (sem sufixo " - …" nem cidade). Ver Helpers.gs.
  const nomeCli = simplificarNomeCliente;

  if (segundo) {
    const txt =
      nomeCli(principal.cliente) + ' representa ' + String(principal.pct).replace('.', ',') +
      '% do fluxo de acessos, em comparação a ' + String(principal.anterior).replace('.', ',') +
      '% no período anterior. ' + nomeCli(segundo.cliente) + ' representa ' +
      String(segundo.pct).replace('.', ',') + '%, em relação a ' +
      String(segundo.anterior).replace('.', ',') + '%.';
    addCard(slide, PAGE.MARGIN, 88, 300, 118, {});
    addText(slide, PAGE.MARGIN + 14, 96, 272, 102, txt, { size: 9.5, color: THEME.textMuted, align: 'JUSTIFY' });
  }

  addCard(slide, PAGE.MARGIN, 230, 300, 92, {});
  addText(slide, PAGE.MARGIN + 16, 246, 268, 18, 'MAIOR PARTICIPAÇÃO', {
    size: 8, bold: true, color: THEME.textMuted,
  });
  // Quando há logo, exibe somente a logo (sem o nome redundante); senão, o nome
  // simplificado (sem o sufixo após " - ", ex: "Mercado Livre - DHL" → "Mercado Livre").
  const nomePrincipal = principal.cliente.split(' - ')[0].trim();
  const subLabelPrincipal = _clienteSubLabel(principal.cliente);
  const logoPrincipal = getClienteLogoBlob(principal.cliente);
  var logoPrincipalOk = false;
  if (logoPrincipal) {
    try {
      const logoW = subLabelPrincipal ? 130 : 160;
      insertLogoFit(slide, logoPrincipal, PAGE.MARGIN + 16, 264, logoW, 28);
      if (subLabelPrincipal) {
        addText(slide, PAGE.MARGIN + 16 + logoW + 6, 264, 60, 28, subLabelPrincipal, {
          size: 11, bold: true, color: THEME.navy, align: 'LEFT',
        });
      }
      logoPrincipalOk = true;
    } catch(le) { logoPrincipalOk = false; }
  }
  if (!logoPrincipalOk) {
    addText(slide, PAGE.MARGIN + 16, 264, 268, 26, nomePrincipal, {
      size: 15, bold: true, color: THEME.navy,
    });
  }
  addText(slide, PAGE.MARGIN + 16, 292, 130, 24, String(principal.pct).replace('.', ',') + '%', {
    size: 18, bold: true, color: THEME.blue,
  });
  const deltaPrincipal = (principal.pct - (principal.anterior || 0));
  // Crescimento de participação é positivo → verde (sem invert).
  addPill(slide, PAGE.MARGIN + 150, 294, 100,
    (deltaPrincipal >= 0 ? '+' : '') + deltaPrincipal.toFixed(2).replace('.', ',') + ' p.p.',
    {});

  // demais participantes
  const outros = part.slice(1, 3);
  if (outros.length > 0) {
    addText(slide, PAGE.MARGIN, 326, 300, 12, 'DEMAIS PARTICIPANTES', {
      size: 6.5, bold: true, color: THEME.textMuted,
    });
    outros.forEach(function (c, ci) {
      const ry = 341 + ci * 18;
      const nome = nomeCli(c.cliente) +
        (c.qtdClientes ? ' (' + c.qtdClientes + ' clientes)' : '');
      addText(slide, PAGE.MARGIN + 8, ry, 200, 15, nome, {
        size: 8, bold: true, color: THEME.navy,
      });
      addText(slide, PAGE.MARGIN + 8, ry, 290, 15,
        c.pct.toFixed(2).replace('.', ',') + '%', {
          size: 8, bold: true, color: THEME.blue, align: 'RIGHT',
        });
      if (ci === 0) addLine(slide, PAGE.MARGIN + 8, ry + 16, 290, THEME.navy, 0.4, 0.07);
    });
  }

  if (part.length > 0) {
    const series = part.map(function (c) {
      return { cliente: c.cliente, valores: [c.anterior, c.pct] };
    });
    // Deriva label do mês anterior a partir de mesAno (mesmo formato: ABR/26)
    const _labelAtual = _abrevMes(d.mesAno);
    const _labelAnt   = (function(mesAno) {
      var p = (mesAno || '').split('/');
      var mm = parseInt(p[0], 10) || 0;
      var yy = parseInt(p[1] || '', 10);
      if (mm <= 1) { mm = 12; yy -= 1; } else { mm -= 1; }
      var ABR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      return (ABR[mm - 1] || '?') + '/' + String(yy).slice(-2);
    })(d.mesAno);
    drawStackedChart(slide, 420, 130, 250, 210,
      [_labelAnt, _labelAtual], series, {});
  }
  addFooter(slide, pageNum);
  return slide;
}

// ---------- % AGENDADO POR CLIENTE ----------
function buildAgendamento(pres, d, e, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Clientes', '% de evento agendado por cliente — ' + e.nome);
  addMegaLogo(slide, e.nome, false);

  addText(slide, PAGE.MARGIN, 84, 360, 18,
    'Agendamento total no período: ', { size: 9.5, color: THEME.textMuted });
  addText(slide, PAGE.MARGIN + 158, 82, 70, 20, e.agendamentoTotal, {
    size: 12, bold: true, color: THEME.blue,
  });
  addPill(slide, PAGE.MARGIN + 232, 83, 86, e.agendamentoVar, {});
  addText(slide, PAGE.MARGIN + 326, 84, 200, 18,
    'vs. ' + e.agendamentoAnterior + ' em ' + d.mesAnterior, {
      size: 8.5, color: THEME.textMuted,
    });

  const items = (e.agendamentoPorCliente || []).slice(0, 15);
  if (items.length > 0) {
    const rowH = items.length <= 8 ? 34 : 22;
    const chartH = Math.min(248, Math.max(72, items.length * rowH));
    drawHBarChart(slide, PAGE.MARGIN, 112, PAGE.W - 2 * PAGE.MARGIN, chartH, items);
  } else {
    addText(slide, PAGE.MARGIN, 180, PAGE.W - 2 * PAGE.MARGIN, 40,
      'Dados de agendamento por cliente não disponíveis.',
      { size: 12, color: THEME.textMuted, align: 'CENTER' });
  }
  addFooter(slide, pageNum);
  return slide;
}

// ---------- CARDS DE CLIENTES ----------
// offset: índice inicial para paginação (0, 6, 12, …)
function buildCardsClientes(pres, d, e, pageNum, offset) {
  offset = offset || 0;
  const allCards = e.cardsClientes || [];
  const cards    = allCards.slice(offset, offset + 6);
  const totalPag = Math.ceil(allCards.length / 6) || 1;
  const pagAtual = Math.floor(offset / 6) + 1;
  const subLabel = (totalPag > 1 ? '(' + pagAtual + '/' + totalPag + ') ' : '') +
                   'Indicadores individuais — ' + e.nome;

  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Clientes', subLabel);
  addMegaLogo(slide, e.nome, false);
  const cw = (PAGE.W - 2 * PAGE.MARGIN - 40) / 3;
  const ch = 132;   // +10 px para acomodar a 4ª métrica (Hora Pico)
  const nCols = 3;
  const megaColor = MEGA_COLORS[e.nome] || THEME.blue;
  cards.forEach(function (c, i) {
    const row = Math.floor(i / nCols);
    const col = i % nCols;
    const rowStart = row * nCols;
    const rowCount = Math.min(nCols, cards.length - rowStart);
    const rowW = rowCount * cw + (rowCount - 1) * 20;
    const rowX = PAGE.MARGIN + ((PAGE.W - 2 * PAGE.MARGIN) - rowW) / 2;
    const x = rowX + col * (cw + 20);
    const y = 92 + row * (ch + 14);
    const isTop = i === 0;
    // top cliente com faixa de destaque na cor do empreendimento
    addCard(slide, x, y, cw, ch, { accent: isTop ? megaColor : THEME.blue });

    // Logo do cliente — substitui o nome; se tiver sublabel exibe ao lado (ou acima,
    // ver LOGOS_CLIENTES_SUBLABEL_POS) do logo, sempre em tamanho padrão.
    // Caixa de tamanho fixo (130×26) padroniza o tamanho visual entre logos
    // de proporções bem diferentes (insertLogoFit usa "contain": ocupa o máximo da
    // caixa preservando a proporção original do arquivo).
    var logoBlob  = getClienteLogoBlob(c.cliente);
    var subLabel  = _clienteSubLabel(c.cliente);
    var subPos    = _clienteSubLabelPos(c.cliente);
    var temLogo   = false;
    var logoGrande = false;   // logo escalado ocupa a faixa toda → sem linha separadora
    if (logoBlob) {
      try {
        var escala = _clienteEscala(c.cliente);
        if (subLabel && subPos === 'above') {
          // Rótulo bem próximo do topo do logo (caixa do logo idêntica ao tamanho
          // padrão); como o arquivo do logo é transparente, pode ficar coladinho
          // sem prejudicar a leitura.
          var boxH = Math.min(36, Math.round(26 * escala));
          var boxY = y + 6 + (36 - boxH) / 2;
          var boxW = Math.min(cw - 28, Math.round(130 * escala));
          addText(slide, x + 14, y, cw - 28, 9, subLabel, {
            size: 7, bold: true, color: isTop ? megaColor : THEME.navy, align: 'CENTER',
          });
          insertLogoFit(slide, logoBlob, x + (cw - boxW) / 2, boxY, boxW, boxH);
        } else if (subLabel) {
          // Logo em tamanho padrão à esquerda, rótulo (com quebra de linha) à direita.
          var boxH = Math.min(36, Math.round(26 * escala));
          var boxY = y + 6 + (36 - boxH) / 2;
          var gap = 8;
          var labelW = 58;
          var boxW = Math.min(cw - 28 - gap - labelW, Math.round(90 * escala));
          var groupW = boxW + gap + labelW;
          var groupX = x + (cw - groupW) / 2;
          insertLogoFit(slide, logoBlob, groupX, boxY, boxW, boxH);
          addText(slide, groupX + boxW + gap, y + 6, labelW, 36, subLabel, {
            size: 9, bold: true, color: isTop ? megaColor : THEME.navy, align: 'LEFT',
          });
        } else {
          var boxH = Math.min(36, Math.round(26 * escala));
          var boxY = y + 6 + (36 - boxH) / 2;
          var boxW = Math.min(cw - 28, Math.round(130 * escala));
          insertLogoFit(slide, logoBlob, x + (cw - boxW) / 2, boxY, boxW, boxH);
        }
        temLogo = true;
        logoGrande = boxH > 28 && !(subLabel && subPos === 'above');
      } catch(le) { temLogo = false; }
    }
    if (!temLogo) {
      addText(slide, x + 14, y + 10, cw - 28, 26, c.cliente, {
        size: 10.5, bold: true, color: isTop ? megaColor : THEME.navy, align: 'CENTER',
      });
    }
    // Linha separadora — omitida quando o logo escalado já ocupa toda a faixa.
    if (!logoGrande) addLine(slide, x + 14, y + 38, cw - 28, THEME.navy, 0.75, 0.12);

    const metricas = [
      ['TEMPO MÉDIO',   c.tempoMedio],
      ['ACESSOS',       fmtNum(c.acessos)],
      ['PRÉ-AGENDADOS', c.preAprovados],
      ['PARTICIPAÇÃO',  c.participacao || '—'],
    ];
    metricas.forEach(function (m, mi) {
      const my = y + 44 + mi * 17;
      addText(slide, x + 14, my, 110, 16, m[0], {
        size: 6.5, bold: true, color: THEME.textMuted,
      });
      // seta de tendência no tempo médio (tempo menor = melhor → verde)
      let valor = m[1];
      let arrowColor = null;
      if (mi === 0 && c.tempoMedioAnterior) {
        const delta = timeToMinutes(c.tempoMedio) - timeToMinutes(c.tempoMedioAnterior);
        if (delta !== 0) {
          valor = (delta > 0 ? '▲ ' : '▼ ') + m[1];
          arrowColor = delta > 0 ? THEME.red : THEME.green;
        }
      }
      // Hora Pico em destaque na cor do empreendimento
      const corValor = mi === 3 ? megaColor : THEME.blue;

      if (mi === 1 && c.acessosVar) {
        // ACESSOS: número em box menor à direita, variação em box ao lado
        const valW = 48;
        const varW = 46;
        const innerW = cw - 28;
        // nowrap: caixas de 48/46pt — sem a folga, o recuo interno quebraria
        // valores como "31.491" ou "+189,2%" em duas linhas.
        addText(slide, x + 14 + innerW - valW, my, valW, 16, valor, {
          size: 9, bold: true, color: corValor, align: 'RIGHT', nowrap: true,
        });
        const varColor = c.acessosVar.startsWith('-') ? THEME.red : THEME.green;
        addText(slide, x + 14 + innerW - valW - varW - 2, my, varW, 16, c.acessosVar, {
          size: 6.5, bold: true, color: varColor, align: 'RIGHT', nowrap: true,
        });
      } else {
        const box = addText(slide, x + 14, my, cw - 28, 16, valor, {
          size: 9, bold: true, color: corValor, align: 'RIGHT',
        });
        if (arrowColor) {
          box.getText().getRange(0, 1).getTextStyle()
            .setForegroundColor(arrowColor).setFontSize(7);
        }
      }
    });
    // barra proporcional à participação do cliente no fluxo do empreendimento
    addProgressBar(slide, x + 14, y + ch - 12, cw - 28, pctToNumber(c.participacao), THEME.blue, 5);
  });
  addFooter(slide, pageNum);
  return slide;
}
