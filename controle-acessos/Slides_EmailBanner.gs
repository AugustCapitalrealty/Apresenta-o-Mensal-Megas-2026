/**
 * Banner de chamada para o e-mail (imagem do topo).
 *
 * Gerado por gerarBannerEmail() no arquivo BANNER_PRESENTATION_ID (um Google
 * Slides separado, em proporção retrato — ex: 1200x1500 px, definida em
 * Arquivo → Configuração da página).
 *
 * Estrutura, de cima para baixo: marca, período, selo do marco do mês,
 * número-herói do fluxo, variação, quebra por empreendimento, acumulado do
 * ano e chamada. Os textos são neutros — apenas apresentam os dados.
 * (O botão de ação fica no corpo do e-mail, não aqui.)
 *
 * LAYOUT — por que o empilhamento é calculado e não fixo:
 * as fontes são proporcionais à LARGURA (para manter a mesma aparência em
 * qualquer tamanho de página), então os espaçamentos verticais também precisam
 * ser proporcionais à largura, senão em páginas mais baixas os blocos se
 * sobrepõem e em páginas mais altas sobra um vão morto no meio. Aqui cada
 * bloco declara sua altura e um PESO; a sobra vertical é distribuída entre os
 * blocos conforme esses pesos, e se faltar espaço os respiros encolhem juntos.
 * Resultado: preenche bem o canvas em qualquer proporção, sem colisão.
 */
function buildEmailBanner(pres, d) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = pres.getPageWidth();
  const H = pres.getPageHeight();
  const m = Math.round(W * 0.07);
  const contentW = W - 2 * m;
  const cx = W / 2;
  const mk = (d.resumo && d.resumo.marcos) || {};
  setBg(slide, THEME.bgSoft);

  // Fontes proporcionais à LARGURA
  const fEyebrow = Math.round(W * 0.025);
  const fHero    = Math.round(W * 0.150);
  const fLabel   = Math.round(W * 0.027);
  const fMegaLbl = Math.round(W * 0.020);
  const fMegaVal = Math.round(W * 0.042);
  const fMegaVar = Math.round(W * 0.021);
  const fAcumLbl = Math.round(W * 0.019);
  const fAcumVal = Math.round(W * 0.036);
  const fCtaH    = Math.round(W * 0.046);
  const fCtaSub  = Math.round(W * 0.025);

  // Elementos decorativos do brandbook (azul translúcido)
  addRing(slide, W - W * 0.30, -W * 0.16, W * 0.62, THEME.blue, 2, 0.16);
  addRing(slide, W - W * 0.20, H - W * 0.26, W * 0.46, THEME.blueMid, 1.6, 0.09);
  addGlow(slide, -W * 0.16, H * 0.34, W * 0.38, THEME.blue, 0.05);
  addTriangle(slide, W - W * 0.21, H * 0.20, W * 0.11, THEME.bgTint);

  const divW = Math.round(W * 0.72);
  const blocos = [];

  // ── Marca ──
  const logoW = Math.round(W * 0.30);
  blocos.push({
    h: Math.round(W * 0.075), respiro: 0.020, peso: 1,
    draw: function (y) {
      addLogoImage(slide, 'completa', Math.round(cx - logoW / 2), y, logoW);
    },
  });

  // ── Período ──
  blocos.push({
    h: Math.round(fEyebrow * 1.6), respiro: 0.008, peso: 0.2,
    draw: function (y) {
      addText(slide, m, y, contentW, Math.round(fEyebrow * 1.6),
        'RELATÓRIO MENSAL · ' + d.mesAno, {
          size: fEyebrow, bold: true, color: THEME.blue, align: 'CENTER', nowrap: true,
        });
    },
  });

  // ── Selo do marco do mês (enunciado factual, só quando os dados confirmam) ──
  const recordeMes = (typeof RECORDE_ACESSOS !== 'undefined' && RECORDE_ACESSOS);
  let textoSelo = '';
  if (recordeMes && mk.primeiraVez100k)         textoSelo = '★ 1º MÊS ACIMA DE 100 MIL ACESSOS';
  else if (recordeMes && d.resumo.recordeTotal) textoSelo = '★ MAIOR VOLUME MENSAL DA SÉRIE';
  if (textoSelo) {
    const badgeW = Math.round(W * 0.66);
    const badgeH = Math.round(W * 0.048);
    blocos.push({
      h: badgeH, respiro: 0.020, peso: 1,
      draw: function (y) {
        addBadgeRecorde(slide, Math.round(cx - badgeW / 2), y, {
          texto: textoSelo, w: badgeW, h: badgeH, size: fEyebrow,
        });
      },
    });
  }

  // ── Número-herói: fluxo de acessos do mês (rótulo colado logo abaixo) ──
  const heroH = Math.round(fHero * 1.15);
  blocos.push({
    h: heroH, respiro: 0.002, peso: 0,
    draw: function (y) {
      addText(slide, m, y, contentW, heroH, fmtNum(d.resumo.totalAcessos), {
        size: fHero, bold: true, color: THEME.blue, align: 'CENTER', nowrap: true,
      });
    },
  });
  blocos.push({
    h: Math.round(fLabel * 1.6), respiro: 0.014, peso: 0.2,
    draw: function (y) {
      addText(slide, m, y, contentW, Math.round(fLabel * 1.6), 'FLUXO DE ACESSOS NO MÊS', {
        size: fLabel, bold: true, color: THEME.textMuted, align: 'CENTER', nowrap: true,
      });
    },
  });

  // ── Variação vs. mês anterior: pill e texto na mesma linha, grupo centralizado ──
  const variacao = ((d.resumo.totalAcessos / (d.resumo.totalAnterior || 1) - 1) * 100);
  const positivo = variacao >= 0;
  const variacaoStr = (positivo ? '+' : '') + variacao.toFixed(1).replace('.', ',') + '%';
  const corVar = positivo ? THEME.green : THEME.red;
  const pillW = Math.round(W * 0.20);
  const pillH = Math.round(W * 0.050);
  const vsW   = Math.round(W * 0.36);
  const gapP  = Math.round(W * 0.02);
  const grpX  = Math.round(cx - (pillW + gapP + vsW) / 2);
  blocos.push({
    h: pillH, respiro: 0.026, peso: 1.4,
    draw: function (y) {
      addRect(slide, grpX, y, pillW, pillH, corVar, true, 0.14);
      addText(slide, grpX, y, pillW, pillH, variacaoStr, {
        size: fLabel, bold: true, color: corVar, align: 'CENTER', nowrap: true,
      });
      addText(slide, grpX + pillW + gapP, y, vsW, pillH,
        'vs. ' + fmtNum(d.resumo.totalAnterior) + ' no mês anterior', {
          size: fMegaVar, color: THEME.textMuted, align: 'LEFT',
        });
    },
  });

  // ── Quebra por empreendimento: volume e variação de cada Mega ──
  const megas   = d.empreendimentos || [];
  const colW    = Math.round(contentW / (megas.length || 1));
  const megaOff = Math.round(W * 0.022);   // divisória → conteúdo
  const megaH   = megaOff + Math.round(fMegaLbl * 1.5) +
                  Math.round(fMegaVal * 1.4) + Math.round(fMegaVar * 1.5);
  if (megas.length) {
    blocos.push({
      h: megaH, respiro: 0.026, peso: 1.4,
      draw: function (y) {
        addLine(slide, Math.round(cx - divW / 2), y, divW, THEME.navy, 1, 0.12);
        const yTopo = y + megaOff;
        megas.forEach(function (mg, i) {
          const colX = m + i * colW;
          if (i > 0) {
            addRect(slide, colX, yTopo + Math.round(W * 0.004), 1,
              Math.round(W * 0.075), THEME.navy, false, 0.10);
          }
          addText(slide, colX, yTopo, colW, Math.round(fMegaLbl * 1.5),
            String(mg.nome).replace(/^Mega\s+/i, '').toUpperCase(), {
              size: fMegaLbl, bold: true, color: THEME.textMuted, align: 'CENTER', nowrap: true,
            });
          addText(slide, colX, yTopo + Math.round(fMegaLbl * 1.5), colW,
            Math.round(fMegaVal * 1.4), fmtNum(mg.fluxoTotal), {
              size: fMegaVal, bold: true, color: THEME.navy, align: 'CENTER', nowrap: true,
            });
          if (mg.variacaoMes) {
            const corMg = String(mg.variacaoMes).trim().indexOf('-') === 0 ? THEME.red : THEME.green;
            addText(slide, colX, yTopo + Math.round(fMegaLbl * 1.5) + Math.round(fMegaVal * 1.4),
              colW, Math.round(fMegaVar * 1.5), mg.variacaoMes, {
                size: fMegaVar, bold: true, color: corMg, align: 'CENTER', nowrap: true,
              });
          }
        });
      },
    });
  }

  // ── Acumulado do ano ──
  if (mk.acumAnoAtual) {
    const acumOff = Math.round(W * 0.022);
    const acumH   = Math.round(fAcumLbl * 1.6) + Math.round(fAcumVal * 1.4) +
                    (mk.superouAnoFechado ? Math.round(fMegaVar * 1.6) : 0) +
                    Math.round(W * 0.020);
    blocos.push({
      h: acumOff + acumH, respiro: 0.030, peso: 1.6,
      draw: function (y) {
        addLine(slide, Math.round(cx - divW / 2), y, divW, THEME.navy, 1, 0.12);
        const yc = y + acumOff;
        addRect(slide, m, yc, contentW, acumH, THEME.bgTint, true, 0.85);
        let yi = yc + Math.round(W * 0.010);
        addText(slide, m, yi, contentW, Math.round(fAcumLbl * 1.6),
          ('ACUMULADO ' + mk.periodoAcum + '/' + String(mk.anoAtual).slice(-2)).toUpperCase(), {
            size: fAcumLbl, bold: true, color: THEME.textMuted, align: 'CENTER', nowrap: true,
          });
        yi += Math.round(fAcumLbl * 1.6);
        addText(slide, m, yi, contentW, Math.round(fAcumVal * 1.4), fmtNum(mk.acumAnoAtual), {
          size: fAcumVal, bold: true, color: THEME.blueMid, align: 'CENTER', nowrap: true,
        });
        yi += Math.round(fAcumVal * 1.4);
        if (mk.superouAnoFechado) {
          addText(slide, m, yi, contentW, Math.round(fMegaVar * 1.6),
            'supera o total de ' + mk.anoAnterior + ' (' + fmtNum(mk.totalAnoAnterior) + ')', {
              size: fMegaVar, color: THEME.textMuted, align: 'CENTER',
            });
        }
      },
    });
  }

  // ── Chamada (último bloco) ──
  blocos.push({
    h: Math.round(fCtaH * 1.35) + Math.round(fCtaSub * 2.6), respiro: 0, peso: 0,
    draw: function (y) {
      addText(slide, m, y, contentW, Math.round(fCtaH * 1.35), 'Controle de acesso', {
        size: fCtaH, bold: true, color: THEME.navy, align: 'CENTER', nowrap: true,
      });
      addText(slide, m, y + Math.round(fCtaH * 1.35), contentW, Math.round(fCtaSub * 2.6),
        'Relatório completo com indicadores por empreendimento e por cliente.', {
          size: fCtaSub, color: THEME.blue, align: 'CENTER',
        });
    },
  });

  // ── Empilhamento: distribui a sobra vertical pelos pesos ──
  const topo  = Math.round(H * 0.035);
  const base  = Math.round(H * 0.040);
  const somaH = blocos.reduce(function (s, b) { return s + b.h; }, 0);
  const minGaps = blocos.map(function (b) { return Math.round(W * b.respiro); });
  const somaMin = minGaps.reduce(function (s, g) { return s + g; }, 0);
  const somaPesos = blocos.reduce(function (s, b) { return s + b.peso; }, 0) || 1;

  let sobra = H - topo - base - somaH - somaMin;
  // Canvas baixo demais para os respiros mínimos: encolhe todos na mesma proporção.
  let fator = 1;
  if (sobra < 0 && somaMin > 0) {
    fator = Math.max(0, 1 + sobra / somaMin);
    sobra = 0;
  }

  let y = topo;
  blocos.forEach(function (b, i) {
    b.draw(y);
    const extra = sobra > 0 ? Math.round(sobra * (b.peso / somaPesos)) : 0;
    y += b.h + Math.round(minGaps[i] * fator) + extra;
  });

  return slide;
}
