/**
 * Slide de Horário de Pico — Distribuição de fluxo por hora
 *
 * buildHorarioPico(pres, d, pageNum) renderiza o slide com 3 mini
 * gráficos de barras (um por empreendimento), destacando a hora de
 * maior concentração de fluxo no dia.
 *
 * Requer d.horarioPico  —  mapa { 'Mega Curitiba': { distribuicao,
 * pico, segundo, terceiro, total }, ... }
 */

function buildHorarioPico(pres, d, pageNum) {
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setBg(slide, THEME.bg);
  decorate(slide);
  addHeader(slide, 'Horário de Pico', 'Distribuição de fluxo por hora do dia');

  var nomes = d.empreendimentos.map(function (e) { return e.nome; });
  var n     = nomes.length;

  var gap     = 16;
  var cw      = Math.floor((PAGE.W - 2 * PAGE.MARGIN - (n - 1) * gap) / n); // ~200
  var ch      = 262;
  var cy      = 88;
  var startX  = PAGE.MARGIN;

  // Janela de horas exibida no gráfico: 00h – 23h (24 barras)
  var horaInicio = 0;
  var horaFim    = 23;
  var nBars      = horaFim - horaInicio + 1; // 24

  // Dimensões do mini-gráfico dentro do card
  var innerW  = cw - 28;                                       // largura útil
  var barGap  = 2;
  var barW    = Math.max(6, Math.floor((innerW - (nBars - 1) * barGap) / nBars));
  var chartW  = nBars * barW + (nBars - 1) * barGap;
  var barMaxH = 76;
  var chartDX = 14 + Math.floor((innerW - chartW) / 2);       // offset desde cx

  // Rótulos de hora exibidos no eixo (de 6 em 6 horas)
  var labelHoras = [0, 6, 12, 18];

  nomes.forEach(function (nome, i) {
    var cx        = startX + i * (cw + gap);
    var picoData  = d.horarioPico ? d.horarioPico[nome] : null;
    var cor       = MEGA_COLORS[nome] || THEME.blue;

    addCard(slide, cx, cy, cw, ch, { accent: cor });

    // Nome do empreendimento
    addText(slide, cx + 14, cy + 8, cw - 28, 14, nome, {
      size: 8, bold: true, color: cor,
    });

    // Separador
    addLine(slide, cx + 14, cy + 24, cw - 28, THEME.navy, 0.5, 0.12);

    if (!picoData || !picoData.pico) {
      addText(slide, cx + 14, cy + 110, cw - 28, 20,
        'Dados não disponíveis\npara este período', {
          size: 8, color: THEME.textMuted, align: 'CENTER',
        });
      addRect(slide, cx + 14, cy + ch - 6, cw - 28, 4, cor, false, 0.25);
      return;
    }

    var pico = picoData.pico;

    // Label "HORA PICO"
    addText(slide, cx + 14, cy + 30, cw - 28, 10, 'HORÁRIO DE PICO', {
      size: 6, bold: true, color: cor, align: 'CENTER',
    });

    // Número grande: hora pico
    addText(slide, cx + 14, cy + 40, cw - 28, 30,
      String(pico.hora).padStart(2, '0') + 'h', {
        size: 22, bold: true, color: THEME.navy, align: 'CENTER',
      });

    // Percentual do pico
    addText(slide, cx + 14, cy + 73, cw - 28, 12,
      pico.pct + '% do fluxo do dia concentrado nesta hora', {
        size: 7, color: THEME.textMuted, align: 'CENTER',
      });

    // ── Mini gráfico de barras ─────────────────────────────────────
    var barTopY  = cy + 104;   // centralizado entre o texto % e a seção inferior
    var baseY    = barTopY + barMaxH;
    var dist     = picoData.distribuicao || [];
    var janela   = dist.slice(horaInicio, horaFim + 1);
    var maxCnt   = Math.max.apply(null, janela.concat([1]));

    // Linha de base do gráfico
    addLine(slide, cx + chartDX, baseY + 1, chartW, THEME.navy, 0.6, 0.15);

    var horaSegundo  = picoData.segundo  ? picoData.segundo.hora  : -1;
    var horaTerceiro = picoData.terceiro ? picoData.terceiro.hora : -1;

    // Pré-calcula offset vertical dos rótulos para evitar sobreposição.
    // Barras a ≤ 3 posições de distância podem colidir; a de menor prioridade sobe 13px.
    var labelOffset = {};
    labelOffset[pico.hora]   = -8;
    if (horaSegundo  >= 0) labelOffset[horaSegundo]  = -8;
    if (horaTerceiro >= 0) labelOffset[horaTerceiro] = -8;

    var destaques = [pico.hora, horaSegundo, horaTerceiro].filter(function(h) { return h >= 0; });
    for (var a = 0; a < destaques.length; a++) {
      for (var b = a + 1; b < destaques.length; b++) {
        if (Math.abs(destaques[a] - destaques[b]) <= 3) {
          // empurra a de maior índice (menor prioridade) para cima
          labelOffset[destaques[b]] -= 10;
        }
      }
    }

    // 1º passe: todas as barras
    for (var j = 0; j < nBars; j++) {
      var h      = horaInicio + j;
      var count  = dist[h] || 0;
      var bh     = Math.max(2, Math.round(barMaxH * count / maxCnt));
      var bx     = cx + chartDX + j * (barW + barGap);
      var by     = baseY - bh;

      var isPico     = (h === pico.hora);
      var isSegundo  = (h === horaSegundo);
      var isTerceiro = (h === horaTerceiro);

      var barCor     = isPico ? cor : (isSegundo ? cor : (isTerceiro ? cor : THEME.lightBlue));
      var barOpacity = isPico ? 1   : (isSegundo ? 0.6 : (isTerceiro ? 0.4 : 0.85));
      addRect(slide, bx, by, barW, bh, barCor, true, barOpacity);
    }

    // 2º passe: rótulos de valor por cima de tudo (preto, frente das barras)
    for (var j = 0; j < nBars; j++) {
      var h      = horaInicio + j;
      var count  = dist[h] || 0;
      var bh     = Math.max(2, Math.round(barMaxH * count / maxCnt));
      var bx     = cx + chartDX + j * (barW + barGap);
      var by     = baseY - bh;

      var isPico     = (h === pico.hora);
      var isSegundo  = (h === horaSegundo);
      var isTerceiro = (h === horaTerceiro);

      if (isPico || isSegundo || isTerceiro) {
        var labelSize = isPico ? 6.5 : 5.5;
        var ldy  = labelOffset[h] || -8;
        var lw   = 52;                              // largura fixa do rótulo
        var lx   = bx + barW / 2 - lw / 2;         // centralizado sobre a barra
        addText(slide, lx, by + ldy, lw, 10,
          fmtNum(count), {
            size: labelSize, bold: true, color: THEME.navy, align: 'CENTER',
          });
      }
    }

    // Rótulos de hora (horizontais, de 3 em 3h)
    labelHoras.forEach(function (h) {
      if (h < horaInicio || h > horaFim) return;
      var j  = h - horaInicio;
      var bx = cx + chartDX + j * (barW + barGap);
      addText(slide, bx - 14 + barW / 2, baseY + 4, 32, 10,
        String(h).padStart(2, '0') + 'h', { size: 6, color: THEME.textMuted, align: 'CENTER' });
    });

    // ── 2º e 3º horários mais movimentados ───────────────────────
    addLine(slide, cx + 14, cy + ch - 50, cw - 28, THEME.navy, 0.5, 0.1);
    addText(slide, cx + 14, cy + ch - 46, cw - 28, 10,
      'DEMAIS HORÁRIOS DE MOVIMENTO', {
        size: 5.5, bold: true, color: THEME.textMuted, align: 'CENTER',
      });

    var peaks = [];
    if (picoData.segundo)  peaks.push('2°  ' + String(picoData.segundo.hora).padStart(2,'0')  + 'h  ·  ' + picoData.segundo.pct  + '%');
    if (picoData.terceiro) peaks.push('3°  ' + String(picoData.terceiro.hora).padStart(2,'0') + 'h  ·  ' + picoData.terceiro.pct + '%');
    if (peaks.length > 0) {
      addText(slide, cx + 14, cy + ch - 34, cw - 28, 28,
        peaks.join('\n'), {
          size: 8, bold: true, color: THEME.navy, align: 'CENTER',
        });
    }

    // Barra colorida no fundo do card
    addRect(slide, cx + 14, cy + ch - 6, cw - 28, 4, cor, false, 0.25);
  });

  // Nota de rodapé
  addText(slide,
    PAGE.MARGIN, cy + ch + 14, PAGE.W - 2 * PAGE.MARGIN, 12,
    'Cada barra representa o número de acessos por hora (00h–23h). ' +
    'A barra colorida marca o horário de maior fluxo do dia.', {
      size: 6.5, color: THEME.textMuted, italic: true, align: 'CENTER',
    });

  addFooter(slide, pageNum);
  return slide;
}
