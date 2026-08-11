/**
 * Gráficos desenhados com formas (tema claro, paleta do brandbook).
 */

/**
 * Gráfico de linhas multi-série (13 meses).
 * series: [{ label, color, values: [...] }]
 * Segmentos desenhados com retângulos rotacionados (setRotation).
 */
function drawLineChart(slide, x, y, w, h, labels, series, opts) {
  if (!labels || labels.length < 2) return;
  opts = opts || {};
  const n = labels.length;
  const chartH = h - 34;

  // eixo Y: reserva espaço à esquerda para os rótulos de escala
  const yAxisW = opts.showYAxis ? 40 : 0;
  const cx = x + yAxisW;   // origem X da área do gráfico
  const cw = w - yAxisW;   // largura útil do gráfico

  const allVals = [];
  series.forEach(function (s) { s.values.forEach(function (v) { allVals.push(v); }); });
  const maxRaw = Math.max.apply(null, allVals);
  const max = (maxRaw || 1) * 1.08;

  // grade horizontal + rótulos do eixo Y
  for (var g = 0; g <= 3; g++) {
    const gy = y + 16 + (chartH - 16) * (g / 3);
    addLine(slide, cx, gy, cw, THEME.navy, 0.6, 0.08);
    if (opts.showYAxis) {
      const val = maxRaw * (1 - g / 3);
      addText(slide, x, gy - 7, yAxisW - 4, 14, fmtNum(Math.round(val)), {
        size: 6, color: THEME.textMuted, align: 'RIGHT',
      });
    }
  }

  // linha vertical do eixo Y
  if (opts.showYAxis) {
    addVerticalLine(slide, cx, y + 16, chartH - 16, THEME.navy, 0.75, 0.18);
  }

  // rótulos do eixo X (todos os 13 meses)
  labels.forEach(function (label, i) {
    const px = cx + (i / (n - 1)) * cw;
    const isLast = i === n - 1;
    addText(slide, px - 21, y + chartH + 4, 42, 12, label, {
      size: 5.5, bold: isLast, color: isLast ? THEME.blue : THEME.textMuted, align: 'CENTER',
    });
  });

  series.forEach(function (s) {
    const pts = s.values.map(function (v, i) {
      return {
        px: cx + (i / (n - 1)) * cw,
        py: y + 16 + (chartH - 16) * (1 - v / max),
      };
    });

    // segmentos como retângulos finos rotacionados
    for (var i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      const dx = p2.px - p1.px, dy = p2.py - p1.py;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const mx = (p1.px + p2.px) / 2, my = (p1.py + p2.py) / 2;
      const seg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
        mx - len / 2, my - 1, len, 2);
      seg.getFill().setSolidFill(s.color);
      seg.getBorder().setTransparent();
      seg.setRotation(angle);
    }

    // pontos (círculos) em cada mês
    pts.forEach(function (pt, i) {
      const isLast = i === n - 1;
      const r = isLast ? 5 : 3;
      const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE,
        pt.px - r, pt.py - r, r * 2, r * 2);
      if (isLast) {
        dot.getFill().setSolidFill(s.color);
        dot.getBorder().setTransparent();
      } else {
        dot.getFill().setSolidFill(THEME.bg);
        dot.getBorder().getLineFill().setSolidFill(s.color);
        dot.getBorder().setWeight(1.5);
      }
    });

    // rótulos de valor em todos os pontos (último maior e bold)
    pts.forEach(function (pt, i) {
      const isLast = i === n - 1;
      addText(slide, pt.px - 22, pt.py - (isLast ? 16 : 13), 44, 12,
        fmtNum(s.values[i]), {
          size: isLast ? 7 : 5, bold: isLast, color: s.color, align: 'CENTER',
        });
    });
  });

  // legenda centralizada dentro do gráfico, acima da primeira grade (y → y+16)
  var totalLegW = series.reduce(function (acc, s) {
    return acc + s.label.length * 5.6 + 26;
  }, -16);
  var lx = cx + (cw - totalLegW) / 2;
  const ly = y + 2;
  series.forEach(function (s) {
    addRect(slide, lx, ly + 2, 10, 9, s.color, true);
    const tw = s.label.length * 5.6 + 10;
    addText(slide, lx + 14, ly, tw, 12, s.label, { size: 7.5, bold: true, color: THEME.navy });
    lx += tw + 14 + 16;
  });
}

/**
 * Gráfico de colunas (série mensal) com linhas de grade,
 * cantos arredondados e destaque no último mês.
 */
function drawColumnChart(slide, x, y, w, h, labels, data, opts) {
  opts = opts || {};
  const barColor = opts.color || THEME.lightBlue;
  const highlightColor = opts.highlight || THEME.blue;
  const max = Math.max.apply(null, data) || 1;
  const n = data.length;
  const gap = opts.gap || 7;
  const barW = (w - gap * (n - 1)) / n;
  const chartH = h - 34;

  // linhas de grade horizontais sutis
  for (let g = 0; g <= 3; g++) {
    addLine(slide, x, y + 16 + (chartH - 16) * (g / 3), w, THEME.navy, 0.6, 0.08);
  }

  data.forEach(function (v, i) {
    const barH = Math.max(6, (v / max) * (chartH - 16));
    const bx = x + i * (barW + gap);
    const by = y + 16 + (chartH - 16 - barH);
    const isLast = i === n - 1;
    addRect(slide, bx, by, barW, barH, isLast ? highlightColor : barColor, true);
    addText(slide, bx - 8, by - 14, barW + 16, 12, fmtNum(v), {
      size: isLast ? 7.5 : 6.5, bold: isLast,
      color: isLast ? THEME.blue : THEME.textMuted, align: 'CENTER',
    });
    addText(slide, bx - 8, y + chartH + 4, barW + 16, 12, labels[i], {
      size: 6, bold: isLast, color: isLast ? THEME.blue : THEME.textMuted, align: 'CENTER',
    });
  });
}

/**
 * Barras horizontais (ranking por cliente). Top 1 em destaque.
 * items: [{ cliente, pct }]
 */
function drawHBarChart(slide, x, y, w, h, items, opts) {
  opts = opts || {};
  const labelW = opts.labelW || 175;
  const valueW = 54;
  const barAreaW = w - labelW - valueW;
  const rowH = h / items.length;
  const barH = Math.min(12, rowH * 0.6);
  const max = 100;

  items.forEach(function (it, i) {
    const ry = y + i * rowH + (rowH - barH) / 2;
    const isTop = i === 0;
    addText(slide, x, ry - 3, labelW - 10, barH + 6, it.cliente, {
      size: 8, bold: true, color: isTop ? THEME.blueMid : THEME.navy, align: 'RIGHT',
    });
    // trilho de fundo
    addRect(slide, x + labelW, ry, barAreaW, barH, THEME.navy, true, 0.06);
    // top 1 em navy sólido; demais em azul translúcido (hierarquia imediata)
    const bw = Math.max(4, (it.pct / max) * barAreaW);
    addRect(slide, x + labelW, ry, bw, barH, isTop ? THEME.blueMid : THEME.blue, true,
      isTop ? undefined : 0.6);
    addText(slide, x + labelW + bw + 5, ry - 3, valueW, barH + 6,
      it.pct.toFixed(2).replace('.', ',') + '%', {
        size: 8, bold: true, color: isTop ? THEME.blueMid : THEME.navy,
      });
  });
}

/**
 * Colunas empilhadas — contribuição de clientes para o tempo médio.
 * series: [{ cliente, valores: [...] }] (% somando ~100 por coluna)
 */
function drawStackedChart(slide, x, y, w, h, labels, series, opts) {
  opts = opts || {};
  const colors = opts.colors || [THEME.blue, THEME.blueMid, THEME.lightBlue, THEME.gray];
  // texto branco nas faixas escuras, navy nas claras
  const darkSeg = [true, true, false, false];
  const n = labels.length;
  const gap = 26;
  const barW = (w - gap * (n - 1)) / n;
  const chartH = h - 16;

  // grade horizontal sutil antes das barras
  for (var gg = 1; gg <= 3; gg++) {
    addLine(slide, x, y + (chartH * gg / 4), w, THEME.navy, 0.5, 0.06);
  }

  for (let m = 0; m < n; m++) {
    let acc = 0;
    const bx = x + m * (barW + gap);
    series.forEach(function (s, si) {
      const v = s.valores[m];
      const segH = (v / 100) * chartH;
      const by = y + acc;
      addRect(slide, bx, by, barW, segH, colors[si % colors.length]);
      if (v >= 8) {
        addText(slide, bx - 4, by + segH / 2 - 7, barW + 8, 14,
          v.toFixed(2).replace('.', ',') + '%', {
            size: 8.5, bold: true,
            color: darkSeg[si % darkSeg.length] ? THEME.white : THEME.navy,
            align: 'CENTER',
          });
      }
      acc += segH;
    });
    addText(slide, bx - 8, y + chartH + 5, barW + 16, 14, labels[m], {
      size: 8, bold: m === n - 1, color: THEME.navy, align: 'CENTER',
    });
  }

  // legenda 2×2 dentro da área do gráfico — nunca ultrapassa x+w
  const ly      = y - 38;
  const colW    = Math.floor(w / 2);   // 2 colunas de largura igual
  const rowH    = 17;
  const sqSize  = 8;
  const txtGap  = 4;
  series.forEach(function (s, si) {
    const row   = Math.floor(si / 2);
    const col   = si % 2;
    const lx    = x + col * colW;
    const iy    = ly + row * rowH;
    // Trunca em " - " e limita a 14 chars
    var nome = s.cliente.split(' - ')[0];
    if (nome.length > 14) nome = nome.slice(0, 12) + '…';
    const txt   = nome;
    addRect(slide, lx, iy + 3, sqSize, sqSize, colors[si % colors.length], true);
    addText(slide, lx + sqSize + txtGap, iy, colW - sqSize - txtGap - 4, 16, txt, {
      size: 6.5, bold: true, color: THEME.navy,
    });
  });
}

/**
 * Colunas empilhadas com valores absolutos — total no topo e
 * uma fatia por série (ex: fluxo mensal por Mega).
 * series: [{ label, color, values: [...] }] — mesma ordem de empilhamento
 */
function drawStackedColumnTotals(slide, x, y, w, h, labels, series, opts) {
  if (!labels || labels.length < 1) return;
  opts = opts || {};
  const n = labels.length;
  const gap = opts.gap || 7;
  const barW = (w - gap * (n - 1)) / n;
  const chartH = h - 34;

  // total por coluna e máximo
  const totais = labels.map(function (_, i) {
    return series.reduce(function (acc, s) { return acc + s.values[i]; }, 0);
  });
  const max = Math.max.apply(null, totais) || 1;

  // linhas de grade horizontais sutis
  for (let g = 0; g <= 3; g++) {
    addLine(slide, x, y + 16 + (chartH - 16) * (g / 3), w, THEME.navy, 0.6, 0.08);
  }

  labels.forEach(function (label, i) {
    const bx = x + i * (barW + gap);
    const colH = (totais[i] / max) * (chartH - 16);
    let acc = 0;
    const isLast = i === n - 1;
    // empilha de baixo para cima (primeira série na base)
    series.forEach(function (s) {
      const segH = (s.values[i] / totais[i]) * colH;
      const by = y + 16 + (chartH - 16 - colH) + (colH - acc - segH);
      addRect(slide, bx, by, barW, Math.max(segH, 1), s.color, false,
        isLast ? undefined : 0.55);
      acc += segH;
    });
    // total no topo
    addText(slide, bx - 8, y + 16 + (chartH - 16 - colH) - 14, barW + 16, 12, fmtNum(totais[i]), {
      size: isLast ? 7.5 : 6.5, bold: isLast,
      color: isLast ? THEME.blue : THEME.textMuted, align: 'CENTER',
    });
    // rótulo do mês
    addText(slide, bx - 8, y + chartH + 4, barW + 16, 12, label, {
      size: 6, bold: isLast, color: isLast ? THEME.blue : THEME.textMuted, align: 'CENTER',
    });
  });

  // legenda
  let lx = x;
  const ly = y - 6;
  series.forEach(function (s) {
    addRect(slide, lx, ly + 4, 9, 9, s.color, false);
    const tw = s.label.length * 5.2 + 14;
    addText(slide, lx + 13, ly, tw, 16, s.label, {
      size: 7.5, bold: true, color: THEME.navy,
    });
    lx += tw + 14;
  });
}

/**
 * Mini gráfico de colunas para séries mensais (small multiple).
 * opts.formatFn: função de formatação do valor (padrão: fmtTime para segundos).
 */
function drawTimeMiniChart(slide, x, y, w, h, data, opts) {
  opts = opts || {};
  const formatFn = opts.formatFn || fmtTime;
  const n = data.length;
  const gap = 3;
  const barW = (w - gap * (n - 1)) / n;
  const chartH = h - 26;
  const max = Math.max.apply(null, data) || 1;
  const avg = data.reduce(function (s, v) { return s + v; }, 0) / (n || 1);

  // linha de base
  addLine(slide, x, y + chartH, w, THEME.navy, 0.6, 0.12);

  // todas as barras do histórico na mesma cor clara; só o último mês em
  // destaque. A leitura da tendência é feita pela linha de média (abaixo),
  // não pela cor — evita a ambiguidade de "barras escuras" sem legenda.
  data.forEach(function (v, i) {
    const barH = Math.max(4, (v / max) * (chartH - 14));
    const bx = x + i * (barW + gap);
    const by = y + chartH - barH;
    const isLast = i === n - 1;
    const barColor = isLast ? THEME.blue : THEME.lightBlue;
    addRect(slide, bx, by, barW, barH, barColor, true);
    // valor só na última barra (mês atual)
    if (isLast) {
      addText(slide, bx + barW / 2 - 28, by - 16, 56, 14, formatFn(v), {
        size: 6.5, bold: true,
        color: THEME.blue, align: 'CENTER',
      });
    }
    // rótulos de mês: primeiro, meio e último
    if (i === 0 || i === Math.floor(n / 2) || isLast) {
      addText(slide, bx - 14, y + chartH + 4, barW + 28, 12, MESES_LABEL[i], {
        size: 5.5, bold: isLast, color: isLast ? THEME.blue : THEME.textMuted, align: 'CENTER',
      });
    }
  });

  // linha de média dos 13 meses (tracejada conceitualmente — fina e suave)
  // com rótulo "média", para dar referência clara à evolução das barras.
  const avgY = y + chartH - Math.max(4, (avg / max) * (chartH - 14));
  addLine(slide, x, avgY, w, THEME.navy, 0.75, 0.32);
  // rótulo "méd. valor" acima da linha, à esquerda — sem primeira barra
  // não há mais colisão com rótulo de valor.
  addText(slide, x + 1, avgY - 9, 72, 9, 'méd. ' + formatFn(Math.round(avg)), {
    size: 5, color: THEME.textMuted, align: 'LEFT',
  });
}

/**
 * Gráfico de barras agrupadas — comparativo entre 2 períodos.
 * groups: ['Mega Curitiba', ...]
 * series: [{ label, color, values: [...], display: [...] (opcional) }]
 * display: array de strings para exibir acima (ex: '08:35'); se omitido usa fmtNum(value)
 */
function drawGroupedBarChart(slide, x, y, w, h, groups, series, opts) {
  opts = opts || {};
  const n = groups.length;
  const s = series.length;
  const groupGap = opts.groupGap || 24;
  const barGap = opts.barGap || 3;
  const groupW = (w - groupGap * (n - 1)) / n;
  const barW = (groupW - barGap * (s - 1)) / s;
  const chartH = h - 28;

  // max para proporção
  const allVals = [];
  series.forEach(function (ser) { ser.values.forEach(function (v) { allVals.push(v); }); });
  const max = Math.max.apply(null, allVals) || 1;

  // linhas de grade horizontais
  for (var g = 0; g <= 3; g++) {
    addLine(slide, x, y + chartH - (chartH * g / 3), w, THEME.navy, 0.6, 0.07);
  }

  groups.forEach(function (group, gi) {
    const gx = x + gi * (groupW + groupGap);
    series.forEach(function (ser, si) {
      const v = ser.values[gi];
      const barH = Math.max(4, (v / max) * (chartH - 12));
      const bx = gx + si * (barW + barGap);
      const by = y + chartH - barH;
      const isLast = si === s - 1;
      addRect(slide, bx, by, barW, barH, ser.color, false);
      const label = ser.display ? ser.display[gi] : fmtNum(v);
      addText(slide, bx - 8, by - 14, barW + 16, 13, label, {
        size: 7.5, bold: isLast,
        color: isLast ? THEME.navy : THEME.textMuted, align: 'CENTER',
      });
    });
    // rótulo do grupo — quebra em duas linhas se necessário
    addText(slide, gx - 10, y + chartH + 5, groupW + 20, 22, group, {
      size: 6.5, color: THEME.textMuted, align: 'CENTER',
    });
  });

  // legenda
  let lx = x;
  const ly = y - 20;
  series.forEach(function (ser) {
    addRect(slide, lx, ly + 4, 9, 9, ser.color, false);
    const tw = ser.label.length * 5 + 14;
    addText(slide, lx + 13, ly, tw, 16, ser.label, {
      size: 7.5, color: THEME.navy,
    });
    lx += tw + 14;
  });
}

/**
 * Mini sparkline de linha para série curta (4–8 pontos).
 * Mostra o valor no último ponto e os rótulos do primeiro e último mês.
 * opts: { color, alpha, lineWeight }
 */
function drawSparkline(slide, x, y, w, h, labels, data, opts) {
  if (!data || data.length < 2) return;
  opts = opts || {};
  const color = opts.color || THEME.blue;
  const lw = opts.lineWeight || 2;
  const n = data.length;
  const chartH = h - 20;

  const maxVal = Math.max.apply(null, data);
  const minVal = Math.min.apply(null, data);
  const range = maxVal - minVal || 1;

  const pts = data.map(function (v, i) {
    return {
      px: x + (i / (n - 1)) * w,
      py: y + 8 + chartH * (1 - (v - minVal) / range),
    };
  });

  // área de preenchimento (faixa abaixo da linha)
  for (var i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const baseY = y + 8 + chartH;
    const fillH = Math.max(1, baseY - Math.min(p1.py, p2.py));
    addRect(slide, p1.px, Math.min(p1.py, p2.py), p2.px - p1.px, fillH,
      color, false, 0.05);
  }

  // segmentos de linha
  for (var i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const dx = p2.px - p1.px, dy = p2.py - p1.py;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const mx = (p1.px + p2.px) / 2, my = (p1.py + p2.py) / 2;
    const seg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
      mx - len / 2, my - lw / 2, len, lw);
    seg.getFill().setSolidFill(color, opts.alpha || 0.7);
    seg.getBorder().setTransparent();
    seg.setRotation(angle);
  }

  // pontos
  pts.forEach(function (pt, i) {
    const isLast = i === n - 1;
    const r = isLast ? 4 : 2.5;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE,
      pt.px - r, pt.py - r, r * 2, r * 2);
    if (isLast) {
      dot.getFill().setSolidFill(color);
      dot.getBorder().setTransparent();
    } else {
      dot.getFill().setSolidFill(THEME.bg);
      dot.getBorder().getLineFill().setSolidFill(color, 0.55);
      dot.getBorder().setWeight(1.2);
    }
  });

  // valor acima de todos os pontos (último maior e mais escuro)
  pts.forEach(function (pt, i) {
    const isLast = i === n - 1;
    const lw2 = 40;
    // alterna label acima/abaixo para evitar colisão entre pontos próximos
    const dy = (i % 2 === 0) ? -15 : -24;
    addText(slide, pt.px - lw2 / 2, pt.py + dy, lw2, 12, fmtNum(data[i]), {
      size: isLast ? 7.5 : 6,
      bold: isLast,
      color: isLast ? color : THEME.navy,
      align: 'CENTER',
    });
  });

  // rótulo de mês embaixo de todos os pontos
  if (labels && labels.length) {
    pts.forEach(function (pt, i) {
      const isLast = i === n - 1;
      const lw2 = 44;
      addText(slide, pt.px - lw2 / 2, y + h - 9, lw2, 14, labels[i], {
        size: 5.5,
        bold: isLast,
        color: isLast ? color : THEME.textMuted,
        align: 'CENTER',
      });
    });
  }
}

/**
 * Barras horizontais por tipo de acesso, em 3 colunas (uma por Mega).
 * Ordenado decrescente, cores por categoria, escala relativa ao máximo da coluna.
 * dataPorMega: { 'Mega Curitiba': {CARRO: 21, ...}, ... }
 */
function drawTipoAcessoChart(slide, x, y, w, h, dataPorMega) {
  const megas = Object.keys(dataPorMega);
  const colW = w / megas.length;

  // abreviações para rótulos longos
  const ABREV = {
    'CAMINHÃO COM BAÚ':      'CAM. COM BAÚ',
    'CAMINHÃO SEM CARRETA':  'CAM. S/ CARRETA',
    'CAMINHÃO COM CARRETA':  'CAM. C/ CARRETA',
  };

  // cor por categoria de veículo
  function tipoColor(tipo) {
    if (tipo === 'A PÉ')               return THEME.lightBlue;
    if (tipo === 'VAN')                return THEME.blue;
    if (tipo.indexOf('CAMINHÃO') === 0) return THEME.blueMid;
    return THEME.navy; // CARRO, MOTO, UTILITÁRIO
  }

  megas.forEach(function (mega, mi) {
    const mx = x + mi * colW;
    const megaColor = MEGA_COLORS[mega] || THEME.blue;

    // painel de fundo por coluna
    addRect(slide, mx + 6, y + 22, colW - 12, h - 24, THEME.bgSoft, true);

    // cabeçalho da coluna
    addText(slide, mx, y, colW - 14, 16, mega.toUpperCase(), {
      size: 9.5, bold: true, color: megaColor, align: 'CENTER',
    });
    addLine(slide, mx + 24, y + 18, colW - 48, megaColor, 1, 0.3);

    // ordena os tipos por valor decrescente
    const tipos = Object.keys(dataPorMega[mega]).sort(function (a, b) {
      return dataPorMega[mega][b] - dataPorMega[mega][a];
    });
    const maxVal = dataPorMega[mega][tipos[0]];

    const labelW = 84;
    const valueW = 34;
    const barAreaW = colW - labelW - valueW - 20;
    const rowH = (h - 30) / tipos.length;
    const barH = Math.min(10, rowH * 0.52);

    tipos.forEach(function (tipo, ti) {
      const v = dataPorMega[mega][tipo];
      const ry = y + 30 + ti * rowH + (rowH - barH) / 2;
      const isTop = ti === 0;
      const label = ABREV[tipo] || tipo;
      const color = isTop ? megaColor : tipoColor(tipo);

      // rótulo
      addText(slide, mx + 8, ry - 3, labelW - 4, barH + 6, label, {
        size: isTop ? 6.5 : 6, bold: isTop,
        color: isTop ? THEME.navy : THEME.textMuted, align: 'RIGHT',
      });

      // trilho
      addRect(slide, mx + labelW + 8, ry, barAreaW, barH, THEME.navy, true, 0.07);

      // barra proporcional ao máximo da coluna
      const bw = Math.max(4, (v / maxVal) * barAreaW);
      addRect(slide, mx + labelW + 8, ry, bw, barH, color, true, isTop ? 1 : 0.72);

      // valor
      addText(slide, mx + labelW + barAreaW + 12, ry - 3, valueW, barH + 6, v + '%', {
        size: isTop ? 8 : 7, bold: isTop,
        color: isTop ? megaColor : THEME.textMuted,
      });
    });
  });
}
