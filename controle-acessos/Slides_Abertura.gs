/**
 * Slides de abertura: Capa, Índice, Resumo, Divisor de seção.
 */

// ---------- CAPA ----------
function buildCapa(pres, d) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);

  addRing(slide, 380, -230, 600, THEME.blue, 1.5, 0.3);
  addRing(slide, 440, -170, 480, THEME.blue, 1, 0.18);
  addRing(slide, 500, -110, 360, THEME.blueMid, 0.75, 0.12);
  addGlow(slide, 530, -80, 300, THEME.blue, 0.05);
  addTriangle(slide, PAGE.W - 150, 250, 110, THEME.bgTint);
  addGlow(slide, -120, 260, 300, THEME.blue, 0.04);

  addLogoImage(slide, 'completa', PAGE.MARGIN, 36, 150);

  addText(slide, PAGE.MARGIN, 140, 560, 26, 'RELATÓRIO MENSAL', {
    size: 12, bold: true, color: THEME.blue,
  });
  addText(slide, PAGE.MARGIN, 166, 620, 64, 'Controle de acesso', {
    size: 44, bold: true, color: THEME.navy,
  });
  addRect(slide, PAGE.MARGIN + 4, 236, 56, 4, THEME.blue);

  addRect(slide, PAGE.MARGIN, 262, 120, 30, THEME.blue, true, 0.1);
  addText(slide, PAGE.MARGIN, 262, 120, 30, d.mesAno, {
    size: 14, bold: true, color: THEME.blue, align: 'CENTER',
  });

  addText(slide, PAGE.MARGIN, 306, 420, 20,
    fmtNum(d.resumo.totalAcessos) + ' acessos em ' + d.mesAno.toLowerCase(), {
      size: 11, color: THEME.textMuted,
    });

  addText(slide, PAGE.MARGIN, PAGE.H - 40, 400, 18,
    'Mega Curitiba   •   Mega Itajaí   •   Mega Esteio', {
      size: 10, bold: true, color: THEME.textMuted,
    });
  return slide;
}

// ---------- ÍNDICE ----------
// paginas: { cenario, megas: [...] } — calculadas no Main.gs para
// manter o índice correto quando slides forem adicionados/removidos.
function buildIndice(pres, d, paginas) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Índice');

  function pg(n) { return String(n).padStart(2, '0'); }
  const itens = [
    ['01', 'Resumo',        '03', null],
    ['02', 'Cenário geral', pg(paginas.cenario), null],
  ];
  d.empreendimentos.forEach(function (m, i) {
    itens.push([
      pg(i + 3), m.nome, pg(paginas.megas[i]),
      fmtNum(m.fluxoTotal) + '  ' + m.variacaoMes,
    ]);
  });
  itens.forEach(function (it, i) {
    const y = 100 + i * 48;
    addText(slide, PAGE.MARGIN, y, 50, 30, it[0], {
      size: 16, bold: true, color: THEME.blue,
    });
    addText(slide, PAGE.MARGIN + 60, y, 260, 30, it[1], {
      size: 15, bold: true, color: THEME.navy,
    });
    if (it[3]) {
      addText(slide, PAGE.MARGIN + 230, y + 4, 180, 22, it[3], {
        size: 9, bold: true, color: THEME.textMuted, align: 'RIGHT',
      });
    }
    addText(slide, PAGE.MARGIN + 416, y, 44, 30, it[2], {
      size: 12, bold: true, color: THEME.textMuted, align: 'RIGHT',
    });
    addLine(slide, PAGE.MARGIN, y + 34, 460, THEME.navy, 0.75, 0.1);
  });
  addFooter(slide, 2);
  return slide;
}

/**
 * Texto do resumo executivo — NEUTRO: apresenta e destaca os dados do mês
 * (volume, variação, máximas da série, participação, tempo médio e acumulado
 * do ano) sem juízo de valor, sem recomendação e sem adjetivar o desempenho.
 * Nada é fixo no código: todas as frases saem dos dados do mês.
 */
function montarTextoResumo(d) {
  const e   = d.empreendimentos;
  const mk  = (d.resumo && d.resumo.marcos) || {};
  const tot = d.resumo.totalAcessos;
  const dTot = ((tot / (d.resumo.totalAnterior || 1) - 1) * 100);
  const dTotStr = (dTot >= 0 ? '+' : '') + dTot.toFixed(1).replace('.', ',') + '%';

  const lider = _ordenaPor(e, function (m) { return m.fluxoTotal; })[0];
  const fatia = Math.round(lider.fluxoTotal / (tot || 1) * 100);
  const recordistas = (typeof RECORDE_ACESSOS !== 'undefined' && RECORDE_ACESSOS)
    ? e.filter(function (m) { return m.recordeAcessos; })
    : [];

  const p = [];

  // 1) Volume do mês — com o marco de 100 mil quando ocorre.
  p.push(mk.primeiraVez100k
    ? 'Primeiro mês acima de 100 mil acessos: ' + fmtNum(tot) + ', ' + dTotStr +
      ' sobre o mês anterior.'
    : fmtNum(tot) + ' acessos no mês, ' + dTotStr + ' sobre o mês anterior.');

  // 2) Maior volume do mês e sua participação; registra a máxima da série.
  if (recordistas.length === 1) {
    p.push('O ' + recordistas[0].nome + ' registrou ' + fmtNum(recordistas[0].fluxoTotal) +
      ' acessos, maior volume mensal de sua série, e responde por ' + fatia + '% do total.');
  } else if (recordistas.length > 1) {
    p.push(recordistas.length + ' dos três Megas registraram o maior volume mensal de suas séries.');
  } else {
    p.push('O ' + lider.nome + ' registrou ' + fmtNum(lider.fluxoTotal) +
      ' acessos, ' + fatia + '% do total.');
  }

  // 3) Faixa de tempo médio do mês.
  p.push('O tempo médio situou-se entre ' + d.resumo.tempoMedioMin +
    ' e ' + d.resumo.tempoMedioMax + '.');

  // 4) Acumulado do ano frente ao ano anterior fechado.
  if (mk.superouAnoFechado) {
    p.push('O acumulado de ' + mk.periodoAcum + '/' + String(mk.anoAtual).slice(-2) +
      ' soma ' + fmtNum(mk.acumAnoAtual) + ' e supera o total de ' + mk.anoAnterior + '.');
  }

  return p.join(' ');
}

// ---------- RESUMO EXECUTIVO ----------
function buildResumo(pres, d) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Resumo', 'Visão executiva do mês');

  const e = d.empreendimentos;
  const variacao = ((d.resumo.totalAcessos / (d.resumo.totalAnterior || 1) - 1) * 100);
  const variacaoStr = (variacao >= 0 ? '+' : '') + variacao.toFixed(1).replace('.', ',') + '%';

  addText(slide, PAGE.MARGIN, 92, 300, 56, fmtNum(d.resumo.totalAcessos), {
    size: 46, bold: true, color: THEME.blue,
  });
  addText(slide, PAGE.MARGIN, 150, 280, 18, 'ACESSOS TOTAIS NO MÊS', {
    size: 9, bold: true, color: THEME.textMuted,
  });
  addPill(slide, PAGE.MARGIN, 174, 70, variacaoStr, {});
  addText(slide, PAGE.MARGIN + 78, 174, 200, 18,
    'vs. ' + fmtNum(d.resumo.totalAnterior) + ' no mês anterior', {
      size: 8.5, color: THEME.textMuted,
    });

  // sparkline dos últimos 6 meses disponíveis
  addText(slide, 304, 90, 152, 12, 'TENDÊNCIA — ' + Math.min(MESES_LABEL.length, 6) + ' MESES', {
    size: 5.5, bold: true, color: THEME.textMuted, align: 'CENTER',
  });
  const sparkLabels = MESES_LABEL.slice(-6);
  const sparkData = sparkLabels.map(function (_, i) {
    const mi = MESES_LABEL.length - sparkLabels.length + i;
    return Object.keys(d.fluxoMensal).reduce(function (acc, mega) {
      return acc + (d.fluxoMensal[mega][mi] || 0);
    }, 0);
  });
  drawSparkline(slide, 304, 104, 152, 78, sparkLabels, sparkData, {});

  addCard(slide, PAGE.MARGIN, 202, 400, 74, {});
  addText(slide, PAGE.MARGIN + 12, 206, 376, 66, montarTextoResumo(d), {
    size: 9.5, color: THEME.textMuted, align: 'JUSTIFY',
  });

  // barra de participação no fluxo do mês (segmentos proporcionais por Mega)
  addText(slide, PAGE.MARGIN, 282, 300, 14, 'PARTICIPAÇÃO NO FLUXO DO MÊS', {
    size: 7.5, bold: true, color: THEME.textMuted,
  });
  const totalMes = e.reduce(function (acc, m) { return acc + m.fluxoTotal; }, 0) || 1;
  const shareW = 380;
  let sx = PAGE.MARGIN;
  e.forEach(function (m) {
    const segW = (m.fluxoTotal / totalMes) * shareW;
    addRect(slide, sx, 300, Math.max(segW, 3), 14, MEGA_COLORS[m.nome]);
    sx += segW;
  });
  // legenda da barra
  let lx = PAGE.MARGIN;
  e.forEach(function (m) {
    const pct = (m.fluxoTotal / totalMes * 100).toFixed(0);
    addRect(slide, lx, 324, 8, 8, MEGA_COLORS[m.nome], true);
    const lbl = m.nome.replace('Mega ', '') + ' ' + pct + '%';
    const tw = lbl.length * 5.2 + 14;
    addText(slide, lx + 12, 319, tw, 16, lbl, {
      size: 7.5, bold: true, color: THEME.navy,
    });
    lx += tw + 16;
  });

  e.forEach(function (m, i) {
    const y = 92 + i * 64;
    addCard(slide, 470, y, 206, 54, {});
    addText(slide, 484, y + 8, 130, 18, m.nome.toUpperCase(), {
      size: 8.5, bold: true, color: THEME.textMuted,
    });
    addText(slide, 484, y + 24, 110, 24, fmtNum(m.fluxoTotal), {
      size: 17, bold: true, color: THEME.navy,
    });
    addPill(slide, 606, y + 26, 56, m.variacaoMes, {});
    if (typeof RECORDE_ACESSOS !== 'undefined' && RECORDE_ACESSOS && m.recordeAcessos) {
      addBadgeRecorde(slide, 606, y + 6, { mini: true, w: 56 });
    }
  });

  // Marcos históricos — só aparecem quando os dados confirmam o feito.
  const marcos = (d.resumo && d.resumo.marcos) || {};
  const listaMarcos = [];
  if (marcos.primeiraVez100k) {
    listaMarcos.push('1ª vez acima de 100 mil acessos em um único mês');
  }
  if (marcos.superouAnoFechado) {
    listaMarcos.push('Acumulado ' + marcos.periodoAcum + '/' +
      String(marcos.anoAtual).slice(-2) + ' (' + fmtNum(marcos.acumAnoAtual) +
      ') já supera todo o ' + marcos.anoAnterior +
      ' (' + fmtNum(marcos.totalAnoAnterior) + ')');
  }
  if (listaMarcos.length) {
    addCard(slide, 470, 284, 206, 56, { accent: THEME.gold });
    addText(slide, 484, 287, 178, 12, '★ MARCOS HISTÓRICOS', {
      size: 6.5, bold: true, color: THEME.gold,
    });
    let my = 300;
    listaMarcos.forEach(function (t) {
      addText(slide, 484, my, 182, 18, '• ' + t, {
        size: 6.5, color: THEME.navy,
      });
      my += t.length > 52 ? 19 : 11;
    });
  }

  addFooter(slide, 3);
  return slide;
}

// ---------- DIVISOR DE SEÇÃO ----------
function buildDivisor(pres, titulo, subitens, pageNum, numeroSecao, empreendimento) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  // ── Versão com foto de fundo (empreendimentos ou seções fixas, ex: Cenário geral) ──
  const fotoBlob = empreendimento ? getFotoBlob(empreendimento.nome) : getFotoSecaoBlob(titulo);

  if (fotoBlob) {
    setBg(slide, THEME.navy);

    // 1. Foto cobrindo o slide inteiro
    const img = slide.insertImage(fotoBlob, 0, 0, PAGE.W, PAGE.H);
    img.sendToBack();

    // 2. Overlay navy semi-transparente (dá o tom azul escuro sobre a foto)
    addRect(slide, 0, 0, PAGE.W, PAGE.H, THEME.navy, false, 0.62);

    // 3. Elementos decorativos do brandbook em branco translúcido
    addRing(slide,  PAGE.W - 250,  80, 420, THEME.white, 1.5, 0.12);
    addRing(slide,  PAGE.W - 210, 120, 320, THEME.white, 1,   0.07);
    addGlow(slide,  PAGE.W - 180, 140, 260, THEME.white, 0.04);
    addTriangle(slide, PAGE.W - 155, 195, 90, THEME.white, 0.08);

    // 4. Título grande em branco
    addText(slide, PAGE.MARGIN, 148, 560, 80, titulo, {
      size: 52, bold: true, color: THEME.white,
    });

    // 5. Linha branca sob o título
    addRect(slide, PAGE.MARGIN, 236, 500, 2, THEME.white, false, 0.7);

    // 6. Dados do empreendimento (canto inferior esquerdo)
    if (empreendimento) {
      if (typeof RECORDE_ACESSOS !== 'undefined' && RECORDE_ACESSOS &&
          empreendimento.recordeAcessos) {
        addBadgeRecorde(slide, PAGE.MARGIN, PAGE.H - 100, { dark: true });
      }
      addText(slide, PAGE.MARGIN, PAGE.H - 72, 380, 26,
        fmtNum(empreendimento.fluxoTotal) + ' acessos no mês', {
          size: 16, bold: true, color: THEME.white,
        });
      const varStr = empreendimento.variacaoMes;
      if (varStr) {
        addText(slide, PAGE.MARGIN, PAGE.H - 46, 380, 16,
          varStr + ' vs. mês anterior', {
            size: 8.5, color: THEME.white,
          });
      }
    }

    // Logo do empreendimento fixa no canto superior direito (chip branco p/ contraste)
    if (empreendimento) addMegaLogo(slide, empreendimento.nome, true);

    addFooterDark(slide, pageNum);
    return slide;
  }

  // ── Versão original (slides divisores sem foto — ex: Cenário Geral) ──
  setBg(slide, THEME.bgSoft);
  addRing(slide, PAGE.W - 250, 90, 420, THEME.blue, 1.5, 0.22);
  addRing(slide, PAGE.W - 210, 130, 320, THEME.blueMid, 1, 0.12);
  addGlow(slide, PAGE.W - 190, 150, 260, THEME.blue, 0.05);
  addTriangle(slide, PAGE.W - 170, 200, 90, THEME.blue, 0.12);

  if (numeroSecao) {
    addText(slide, PAGE.MARGIN - 10, 50, 320, 170, numeroSecao, {
      size: 130, bold: true, color: THEME.bgTint,
    });
  }
  addText(slide, PAGE.MARGIN, 185, 540, 56, titulo, {
    size: 38, bold: true, color: THEME.navy,
  });
  addRect(slide, PAGE.MARGIN + 4, 246, 56, 4, THEME.blue);

  if (subitens && subitens.length) {
    let bx = PAGE.MARGIN;
    const by = 272;
    subitens.forEach(function (s) {
      const bw = s.length * 5.4 + 26;
      addRect(slide, bx, by, bw, 22, THEME.blue, true, 0.09);
      addText(slide, bx, by, bw, 22, s.toUpperCase(), {
        size: 7.5, bold: true, color: THEME.blue, align: 'CENTER',
      });
      bx += bw + 10;
    });
  }

  if (empreendimento) {
    addText(slide, PAGE.MARGIN, 312, 400, 28,
      fmtNum(empreendimento.fluxoTotal) + ' acessos no mês', {
        size: 17, bold: true, color: THEME.navy,
      });
    addPill(slide, PAGE.MARGIN, 344, 82, empreendimento.variacaoMes, {});
    addText(slide, PAGE.MARGIN + 90, 346, 160, 16, 'vs. mês anterior', {
      size: 8, color: THEME.textMuted,
    });
    if (typeof RECORDE_ACESSOS !== 'undefined' && RECORDE_ACESSOS &&
        empreendimento.recordeAcessos) {
      addBadgeRecorde(slide, PAGE.MARGIN, 300, {});
    }
  }

  addFooter(slide, pageNum);
  return slide;
}

// ---------- ENCERRAMENTO ----------
function buildEncerramento(pres, d, pageNum) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.navy);

  addRing(slide, PAGE.W / 2 - 300, PAGE.H / 2 - 300, 600, THEME.white, 1.5, 0.12);
  addRing(slide, PAGE.W / 2 - 260, PAGE.H / 2 - 260, 520, THEME.white, 1, 0.08);
  addGlow(slide, PAGE.W / 2 - 150, PAGE.H / 2 - 150, 300, THEME.blue, 0.1);
  addTriangle(slide, PAGE.W - 150, 60, 90, THEME.white, 0.1);
  addTriangle(slide, 60, PAGE.H - 150, 70, THEME.white, 0.08);

  addLogoImage(slide, 'branca', PAGE.W / 2 - 75, 116, 150);

  addText(slide, 0, 198, PAGE.W, 56, 'Obrigado', {
    size: 40, bold: true, color: THEME.white, align: 'CENTER',
  });
  addRect(slide, PAGE.W / 2 - 28, 258, 56, 3, THEME.white, false, 0.7);
  addText(slide, 0, 270, PAGE.W, 22,
    'Relatório mensal de controle de acesso — ' + d.mesAno, {
      size: 12, color: THEME.white, align: 'CENTER',
    });

  addText(slide, 0, PAGE.H - 40, PAGE.W, 16,
    'Mega Curitiba   •   Mega Itajaí   •   Mega Esteio', {
      size: 9, bold: true, color: THEME.white, align: 'CENTER',
    });

  addFooterDark(slide, pageNum);
  return slide;
}
