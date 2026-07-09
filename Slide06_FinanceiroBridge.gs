/**
 * ARQUIVO: Slide06_FinanceiroBridge.gs
 * SLIDES 06 e 07 — ANÁLISE DE VARIAÇÃO (BRIDGE) FINANCEIRA
 * DESCRIÇÃO: Gera dois slides — 06: tabela de variação (gerarSlideBridge)
 *            e 07: gráfico bridge (gerarSlideBridgeGrafico).
 *
 * Aba esperada: 'FINANCEIRO BRIDGE'
 * Estrutura da aba:
 *   Col 0      : Natureza / descrição
 *   Cols 1,2,3 : Orç Jan/26 | Real Jan/26 | Variação R$
 *   Cols 4,5,6 : Orç Fev/26 | Real Fev/26 | Variação R$
 *   …
 *   Meses futuros usam "Ritmo" no lugar de "Real"
 *   Valores de custo são negativos na planilha → todos convertidos para positivo aqui
 *
 * Classificação de status por mês:
 *   REAL + variação >= 0  → ABAIXO DO ORÇADO (verde)
 *   REAL + variação <  0  → ACIMA DO ORÇADO  (vermelho)
 *   RITMO              → PROJEÇÃO             (âmbar)
 *   Sem dados          → ignorado
 */

const NOME_ABA_BRIDGE = 'FINANCEIRO BRIDGE';


// ==========================================
// PONTO DE ENTRADA
// ==========================================
function gerarSlideBridge() {
  const dados = obterDadosBridge();
  if (!dados || !dados.meses.length) {
    Logger.log('Sem dados para o Slide Bridge.');
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  criarHeaderPadrao(slide, 'ANÁLISE DE VARIAÇÃO (BRIDGE)',
    'Orçado vs Realizado — ' + dados.projeto);

  const marginX = 20;
  const topY    = 85;
  const gap     = 14;
  const contH   = pageH - topY - 15;

  const leftW  = 210;
  const rightX = marginX + leftW + gap;
  const rightW = pageW - rightX - marginX;

  _bridgeDesenharResumo(slide, marginX, topY, leftW, contH, dados);
  _bridgeDesenharTabela(slide, rightX,  topY, rightW, contH, dados);

  Logger.log('Slide Bridge gerado (' + dados.meses.length + ' meses).');
}


// ==========================================
// LEITURA DA PLANILHA
// ==========================================
function obterDadosBridge() {
  const ss    = SpreadsheetApp.openById(getSpreadsheetIdAtivo());
  const sheet = ss.getSheetByName(NOME_ABA_BRIDGE);
  if (!sheet) throw new Error('Aba "' + NOME_ABA_BRIDGE + '" não encontrada.');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  const normTxt = s => String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const toAbs = v => Math.abs(typeof v === 'number' ? v : 0);

  // ── Localiza linha de cabeçalho ───────────────────────────────────────────
  let hdrRow = -1;
  for (let r = 0; r < Math.min(5, data.length); r++) {
    if (data[r].some(c => /^or[cç]/i.test(normTxt(c)))) { hdrRow = r; break; }
  }
  if (hdrRow < 0) throw new Error('Cabeçalho não encontrado em "' + NOME_ABA_BRIDGE + '".');

  const hdr = data[hdrRow];

  // ── Detecta grupos de colunas (triplets: Orç | Real/Ritmo | Variação) ────
  const MESES_VALIDOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const grupos = [];
  for (let c = 1; c + 1 < hdr.length; c += 3) {
    const h0 = normTxt(hdr[c]);
    if (!/^or[cç]/.test(h0)) break;                    // sem mais triplets

    // Extrai mês/ano: "Orç Jan/26" → mês "jan", rótulo "JAN/26"
    const m = String(hdr[c]).match(/([A-Za-zçÇ]{3})\/(\d{2,4})/);
    if (!m) continue;
    const mesKey = m[1].toLowerCase();
    if (MESES_VALIDOS.indexOf(mesKey) < 0) continue;   // ignora "Ano/26" e afins

    const h1   = normTxt(hdr[c + 1] || '');
    const tipo = h1.includes('ritmo') ? 'RITMO' : 'REAL';
    const ano  = m[2].length === 2 ? m[2] : m[2].slice(-2);
    const label = m[1].toUpperCase() + '/' + ano;

    grupos.push({ label, mes: m[1].toUpperCase(), ano, tipo, cOrc: c, cReal: c + 1, cVar: c + 2 });
  }
  if (!grupos.length) throw new Error('Nenhuma coluna de mês encontrada em "' + NOME_ABA_BRIDGE + '".');

  // ── Blindagem: normaliza anos fora do padrão pelo ano predominante ────────
  // (célula com "Fev/25" no meio de um bloco 2026 gerava rótulo FEV/25)
  {
    const contagem = {};
    grupos.forEach(g => { contagem[g.ano] = (contagem[g.ano] || 0) + 1; });
    const anoModa = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0];
    grupos.forEach(g => {
      if (g.ano !== anoModa) {
        g.ano   = anoModa;
        g.label = g.mes + '/' + anoModa;
      }
    });
  }

  // ── Localiza linha TOTAL (ou soma tudo) ───────────────────────────────────
  let vetor = null;
  for (let r = hdrRow + 1; r < data.length; r++) {
    if (normTxt(data[r][0]).includes('total')) { vetor = data[r]; break; }
  }
  if (!vetor) {
    // soma todas as linhas com natureza preenchida
    vetor = new Array(hdr.length).fill(0);
    for (let r = hdrRow + 1; r < data.length; r++) {
      if (!data[r][0]) continue;
      for (let c = 1; c < data[r].length; c++) {
        vetor[c] += typeof data[r][c] === 'number' ? data[r][c] : 0;
      }
    }
  }

  // ── Monta dados por mês (valores → positivos) ────────────────────────────
  const meses = grupos
    .map(g => {
      const orc  = toAbs(vetor[g.cOrc]);
      const real = toAbs(vetor[g.cReal]);
      const var_ = orc - real;               // positivo = abaixo do orçado
      if (orc === 0 && real === 0) return null;
      return { label: g.label, tipo: g.tipo, orc, real, var: var_ };
    })
    .filter(Boolean);

  // ── Totais do período com REAL ────────────────────────────────────────────
  const real_meses = meses.filter(m => m.tipo === 'REAL');
  const totalOrc   = real_meses.reduce((s, m) => s + m.orc, 0);
  const totalReal  = real_meses.reduce((s, m) => s + m.real, 0);
  const totalVar   = totalOrc - totalReal;

  // Projeção anual = real dos meses passados + ritmo dos futuros
  const totalOrcAnual  = meses.reduce((s, m) => s + m.orc, 0);
  const totalProjetado = meses.reduce((s, m) => s + m.real, 0);
  const varAnual       = totalOrcAnual - totalProjetado;

  return {
    projeto      : getProjetoAtivo().nome,
    meses,
    totalOrc,
    totalReal,
    totalVar,
    totalOrcAnual,
    totalProjetado,
    varAnual
  };
}


// ==========================================
// PAINEL ESQUERDO: RESUMO
// ==========================================
function _bridgeDesenharResumo(slide, x, y, w, h, d) {
  // Painel padrão do design system (01_Config.gs)
  criarCardPainel(slide, x, y, w, h, null, CORES.darkBlue);

  const _txt = (texto, fx, fy, fw, fh, size, bold, cor, align) => {
    const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx, fy, fw, fh);
    const t = b.getText();
    t.setText(texto).getTextStyle()
      .setFontSize(size).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
    if (align === 'C') t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    if (align === 'R') t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    return b;
  };

  let cy = y + 10;
  _txt('RESUMO DO PERÍODO', x + 12, cy, w - 20, 16, 7.5, true, CORES.textGray);
  cy += 20;

  // ── Orçado do Período ─────────────────────────────────────────────────────
  _txt('ORÇADO', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 13;
  _txt(formatarMoeda(d.totalOrc), x + 12, cy, w - 20, 22, 11, true, CORES.textDark, 'R');
  cy += 24;

  // ── Realizado ─────────────────────────────────────────────────────────────
  _txt('REALIZADO', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 13;
  _txt(formatarMoeda(d.totalReal), x + 12, cy, w - 20, 22, 11, true, CORES.textDark, 'R');
  cy += 24;

  // ── Pill variação do período ──────────────────────────────────────────────
  const abaixo    = d.totalVar >= 0;
  const corVar    = abaixo ? '#166534' : '#DC2626';
  const bgVar     = abaixo ? '#F0FDF4' : '#FEF2F2';
  const varLabel  = abaixo ? '▼ ABAIXO DO ORÇADO' : '▲ ACIMA DO ORÇADO';
  const varPctStr = d.totalOrc > 0 ? (Math.abs(d.totalVar / d.totalOrc) * 100).toFixed(1) + '%' : '0%';

  cy += 4;
  const pillBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 10, cy, w - 20, 52);
  pillBox.getFill().setSolidFill(bgVar); pillBox.getBorder().setTransparent();

  _txt(varLabel, x + 10, cy + 4, w - 20, 16, 7, true, corVar, 'C');
  _txt(formatarMoeda(Math.abs(d.totalVar)), x + 10, cy + 20, w - 20, 18, 12, true, corVar, 'C');
  _txt(varPctStr + ' do orçado do período', x + 10, cy + 38, w - 20, 13, 7, false, corVar, 'C');
  cy += 62;

  // ── Divisor ───────────────────────────────────────────────────────────────
  const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 10, cy, w - 20, 1);
  div.getFill().setSolidFill(CORES.lineSeparator); div.getBorder().setTransparent();
  cy += 10;

  // ── Projeção Anual ────────────────────────────────────────────────────────
  _txt('PROJEÇÃO ANUAL (REAL + RITMO)', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 14;

  _txt('ORÇADO', x + 12, cy, 60, 13, 6, true, '#94A3B8');
  _txt(formatarMoeda(d.totalOrcAnual), x + 12, cy, w - 24, 18, 9, true, CORES.textDark, 'R');
  cy += 20;

  _txt('PROJETADO', x + 12, cy, 60, 13, 6, true, '#94A3B8');
  _txt(formatarMoeda(d.totalProjetado), x + 12, cy, w - 24, 18, 9, true, CORES.textDark, 'R');
  cy += 20;

  const abaixoAnual = d.varAnual >= 0;
  const corAnual    = abaixoAnual ? '#166534' : '#DC2626';
  const sinalAnual  = abaixoAnual ? '▼ ' : '▲ ';
  _txt(sinalAnual + formatarMoeda(Math.abs(d.varAnual)), x + 12, cy, w - 24, 18, 9, true, corAnual, 'R');
}


// ==========================================
// PAINEL DIREITO: TABELA MENSAL
// ==========================================
function _bridgeDesenharTabela(slide, x, y, w, h, d) {
  // ── Colunas: MÊS | TIPO | ORÇADO | REAL/RITMO | VARIAÇÃO R$ | VAR% ──────
  // Proporções: 10 + 10 + 22 + 22 + 22 + 14 = 100%
  const pad  = 12;
  const x0   = x + pad;
  const useW = w - (2 * pad);
  const cAcc = (() => { let a = 0; return f => { const px = x0 + a * useW; a += f; return px; }; })();
  // Todas as colunas centralizadas
  const cols = [
    { t: 'MÊS',       x: cAcc(0.13), w: useW * 0.13, a: 'C' },
    { t: 'TIPO',      x: cAcc(0.11), w: useW * 0.11, a: 'C' },
    { t: 'ORÇADO',    x: cAcc(0.21), w: useW * 0.21, a: 'C' },
    { t: 'REAL/RITMO',x: cAcc(0.21), w: useW * 0.21, a: 'C' },
    { t: 'VARIAÇÃO',  x: cAcc(0.21), w: useW * 0.21, a: 'C' },
    { t: 'VAR %',     x: cAcc(0.13), w: useW * 0.13, a: 'C' }
  ];

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  const headH = 24;
  const headBar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, y, w - 8, headH);
  headBar.getFill().setSolidFill(CORES.darkBlue); headBar.getBorder().setTransparent();
  cols.forEach(c => {
    const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, c.x, y + 3, c.w, headH - 6);
    const t = b.getText();
    t.setText(c.t).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    const pa = c.a === 'C' ? SlidesApp.ParagraphAlignment.CENTER
             : c.a === 'R' ? SlidesApp.ParagraphAlignment.END
             : SlidesApp.ParagraphAlignment.START;
    t.getParagraphStyle().setParagraphAlignment(pa);
    b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // ── Linhas ────────────────────────────────────────────────────────────────
  const startY   = y + headH + 4;
  const availH   = h - headH - 10;
  const rowH     = Math.max(14, Math.min(22, availH / d.meses.length));

  // m² por mês → segunda linha (cinza) nas células Orçado e Real
  const m2Mes = obterCustoM2PorMes_();
  const key3  = lbl => String(lbl || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').substring(0, 3);

  d.meses.forEach((m, i) => {
    const ry   = startY + i * rowH;
    const cmM2 = m2Mes[key3(m.label)];
    const abaixo = m.var >= 0;
    const corVar = m.tipo === 'RITMO' ? '#D97706' : (abaixo ? '#166534' : '#DC2626');
    const bgVarPill = m.tipo === 'RITMO' ? '#FFF7ED' : (abaixo ? '#F0FDF4' : '#FEF2F2');
    const bgRow  = i % 2 === 0 ? '#F8FAFC' : CORES.white;
    const varPct = m.orc > 0 ? (Math.abs(m.var / m.orc) * 100).toFixed(1) + '%' : '-';
    const seta   = abaixo ? '▼ ' : '▲ ';   // ▼ abaixo do orçado (bom) · ▲ acima (atenção)

    // Fundo zebrado
    const zebra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, ry, w - 8, rowH);
    zebra.getFill().setSolidFill(bgRow); zebra.getBorder().setTransparent();

    const _cel = (texto, col, cor, bold) => {
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col.x, ry, col.w, rowH);
      const t = b.getText();
      t.setText(String(texto)).getTextStyle()
        .setFontSize(7.5).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
      const pa = col.a === 'C' ? SlidesApp.ParagraphAlignment.CENTER
               : col.a === 'R' ? SlidesApp.ParagraphAlignment.END
               : SlidesApp.ParagraphAlignment.START;
      t.getParagraphStyle().setParagraphAlignment(pa);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    };

    // Célula com R$ em cima e R$/m² (cinza, menor) embaixo — centralizada
    const _celM2 = (valorStr, m2Str, col, cor, bold) => {
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col.x, ry, col.w, rowH);
      const t = b.getText();
      const txt = m2Str ? valorStr + '\n' + m2Str : valorStr;
      t.setText(txt).getTextStyle().setFontSize(7.5).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
      if (m2Str) t.getRange(valorStr.length + 1, txt.length).getTextStyle().setFontSize(5.5).setBold(false).setForegroundColor('#94A3B8');
      t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    };

    const temM2  = cmM2 && cmM2.orc != null && cmM2.real != null && !isNaN(cmM2.orc) && !isNaN(cmM2.real);
    const varM2  = temM2 ? formatarRsM2_(Number(cmM2.real) - Number(cmM2.orc), true) : '';

    _cel(m.label, cols[0], CORES.darkBlue, true);
    _celM2(formatarMoeda(m.orc),  temM2 ? formatarRsM2_(Number(cmM2.orc))  : '', cols[2], CORES.textDark);
    _celM2(formatarMoeda(m.real), temM2 ? formatarRsM2_(Number(cmM2.real)) : '', cols[3], CORES.textDark);
    _celM2(seta + formatarMoeda(Math.abs(m.var)), varM2, cols[4], corVar, true);

    // Pill TIPO (REAL / RITMO)
    const pillH = Math.min(rowH - 4, 14);
    const pillW = cols[1].w - 4;
    const pillX = cols[1].x + 2;
    const pillY = ry + (rowH - pillH) / 2;
    const corPill  = m.tipo === 'RITMO' ? '#D97706'
                   : (abaixo ? '#10B981' : '#EF4444');
    const pillBg   = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, pillX, pillY, pillW, pillH);
    pillBg.getFill().setSolidFill(corPill); pillBg.getBorder().setTransparent();
    const pt = pillBg.getText();
    pt.setText(m.tipo === 'RITMO' ? 'RITMO' : 'REAL')
      .getTextStyle().setFontSize(5.5).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    pt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    pillBg.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Pill VAR%
    const vPillH = Math.min(rowH - 4, 14);
    const vPillW = cols[5].w - 4;
    const vPillX = cols[5].x + 2;
    const vPillY = ry + (rowH - vPillH) / 2;
    const vBg    = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, vPillX, vPillY, vPillW, vPillH);
    vBg.getFill().setSolidFill(bgVarPill); vBg.getBorder().setTransparent();
    const vt = vBg.getText();
    vt.setText(varPct)
      .getTextStyle().setFontSize(6).setBold(true).setForegroundColor(corVar).setFontFamily('Montserrat');
    vt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    vBg.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // ── Linha separadora e totais ─────────────────────────────────────────────
  const totY = startY + d.meses.length * rowH + 4;
  if (totY + 24 < y + h) {
    const sep = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, totY, w - 8, 1);
    sep.getFill().setSolidFill(CORES.lineSeparator); sep.getBorder().setTransparent();

    const totBar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 4, totY + 3, w - 8, 22);
    totBar.getFill().setSolidFill('#EEF2F7'); totBar.getBorder().setTransparent();

    const _totCel = (txt, col, cor) => {
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col.x, totY + 3, col.w, 22);
      const t = b.getText();
      t.setText(txt).getTextStyle()
        .setFontSize(7.5).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
      const pa = col.a === 'C' ? SlidesApp.ParagraphAlignment.CENTER
               : col.a === 'R' ? SlidesApp.ParagraphAlignment.END
               : SlidesApp.ParagraphAlignment.START;
      t.getParagraphStyle().setParagraphAlignment(pa);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    };

    const abTot  = d.totalVar >= 0;
    const corTot = abTot ? '#166534' : '#DC2626';
    _totCel('PERÍODO', cols[0], CORES.darkBlue);
    _totCel(formatarMoeda(d.totalOrc),  cols[2], CORES.darkBlue);
    _totCel(formatarMoeda(d.totalReal), cols[3], CORES.darkBlue);
    _totCel((abTot ? '▼ ' : '▲ ') + formatarMoeda(Math.abs(d.totalVar)), cols[4], corTot);
    const pct = d.totalOrc > 0 ? (Math.abs(d.totalVar / d.totalOrc) * 100).toFixed(1) + '%' : '-';
    _totCel(pct, cols[5], corTot);
  }
}


// ==========================================
// SLIDE GRÁFICO WATERFALL (BRIDGE)
// ==========================================
// Parte do Orçado anual e aplica a variação de cada mês, terminando no
// Realizado/Projetado. Barras descem (verde = abaixo) ou sobem (vermelho =
// acima); meses de RITMO ficam em âmbar (projeção).
function gerarSlideBridgeGrafico() {
  const d = obterDadosBridge();
  if (!d || !d.meses.length) {
    Logger.log('Sem dados para o Gráfico Bridge.');
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  criarHeaderPadrao(slide, 'BRIDGE DE VARIAÇÃO',
    'Do Orçado ao Realizado/Projetado — ' + d.projeto);

  // ── Card de fundo ──────────────────────────────────────────────────────
  const marginX = 20;
  const topY    = 78;
  const cardW   = pageW - 2 * marginX;
  const cardH   = pageH - topY - 15;
  const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, marginX, topY, cardW, cardH);
  card.getFill().setSolidFill(CORES.white);
  card.getBorder().getLineFill().setSolidFill(CORES.lineSeparator);
  card.getBorder().setWeight(1);

  // ── Chips de resumo no topo (a mensagem-chave do slide) ─────────────────
  const chip = (cx, cw, titulo, valor, positivo) => {
    const bgC  = positivo ? '#F0FDF4' : '#FEF2F2';
    const txtC = positivo ? '#166534' : '#DC2626';
    const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, topY + 9, cw, 30);
    box.getFill().setSolidFill(bgC); box.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 10, topY + 9, cw - 20, 30);
    const tr = t.getText();
    tr.setText(titulo + '  ' + valor);
    tr.getTextStyle().setFontSize(8.5).setBold(true).setForegroundColor(txtC).setFontFamily('Montserrat');
    tr.getRange(0, titulo.length).getTextStyle().setFontSize(7).setForegroundColor(positivo ? '#15803D' : '#B91C1C');
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  };

  const pctReal  = d.totalOrc > 0 ? (Math.abs(d.totalVar / d.totalOrc) * 100).toFixed(1) : '0';
  const pctAnual = d.totalOrcAnual > 0 ? (Math.abs(d.varAnual / d.totalOrcAnual) * 100).toFixed(1) : '0';
  chip(marginX + 16, 300, 'REALIZADO ATÉ AGORA',
       (d.totalVar >= 0 ? '▼ ' : '▲ ') + formatarMoeda(Math.abs(d.totalVar)) + ' ' +
       (d.totalVar >= 0 ? 'abaixo' : 'acima') + ' do orçado (' + pctReal + '%)', d.totalVar >= 0);
  chip(marginX + 16 + 312, 280, 'PROJEÇÃO ANUAL',
       (d.varAnual >= 0 ? '▼ ' : '▲ ') + formatarMoeda(Math.abs(d.varAnual)) + ' ' +
       (d.varAnual >= 0 ? 'abaixo' : 'acima') + ' (' + pctAnual + '%)', d.varAnual >= 0);

  // ── Barras divergentes: variação mensal vs orçado ────────────────────────
  // Acima do orçado (real > orç) = barra p/ CIMA em vermelho;
  // economia = barra p/ BAIXO em verde; meses de RITMO = âmbar.
  const meses = d.meses.map(m => {
    const delta = m.real - m.orc;    // >0 = acima do orçado
    return {
      label: m.label, delta,
      cor: m.tipo === 'RITMO' ? '#F59E0B' : (delta > 0 ? '#EF4444' : '#10B981'),
      ritmo: m.tipo === 'RITMO'
    };
  });

  const maxUp   = Math.max(1, ...meses.filter(m => m.delta > 0).map(m => m.delta));
  const maxDown = Math.max(1, ...meses.filter(m => m.delta < 0).map(m => -m.delta));

  const plotX = marginX + 24;
  const plotY = topY + 56;
  const plotW = cardW - 48;
  const plotH = cardH - 56 - 44;      // reserva topo (chips) e rodapé (legenda)

  // Divide o plot entre lado positivo e negativo na proporção dos dados
  let fracUp = maxUp / (maxUp + maxDown);
  fracUp = Math.max(0.25, Math.min(0.75, fracUp));
  const upH   = (plotH - 30) * fracUp;      // 30pt reservados p/ rótulos nas pontas
  const downH = (plotH - 30) * (1 - fracUp);
  const zeroY = plotY + 15 + upH;
  const baseBottom = zeroY + downH;         // base das barras (fim da zona de variação)

  // m² por mês (para o rótulo de variação por m²)
  const m2Mes = obterCustoM2PorMes_();
  const key3  = lbl => String(lbl || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').substring(0, 3);

  const n     = meses.length;
  const slotW = plotW / (n + 2);            // +2 slots para as pontas (orçado / projetado)
  const barW  = Math.min(slotW * 0.5, 34);

  // Linha do zero (eixo) — apenas sob a zona das variações mensais
  const eixo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + slotW, zeroY, plotW - 2 * slotW, 1.4);
  eixo.getFill().setSolidFill('#94A3B8'); eixo.getBorder().setTransparent();

  // ── Pontas do waterfall: ORÇADO ANUAL (início) e PROJETADO (fim) ─────────
  const orcAnual  = d.totalOrcAnual;
  const projAnual = d.totalProjetado;
  const fullH  = upH + downH;
  const maxEnd = Math.max(orcAnual, projAnual, 1);
  const drawEndpoint = (slotIdx, val, cor, linha1, linha2) => {
    const h  = Math.max((val / maxEnd) * fullH, 4);
    const cx = plotX + slotIdx * slotW + (slotW - barW) / 2;
    const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, baseBottom - h, barW, h);
    bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();
    const tot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, baseBottom - h - 18, slotW * 1.5, 12);
    tot.getText().setText(formatarMoedaCompacta(val)).getTextStyle()
      .setFontSize(7).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
    tot.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    const cap = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, baseBottom + 3, slotW * 1.5, 22);
    cap.getText().setText(linha1 + (linha2 ? '\n' + linha2 : '')).getTextStyle()
      .setFontSize(6).setBold(true).setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');
    cap.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  };
  drawEndpoint(0,     orcAnual,  '#94A3B8',       'ORÇADO', 'ANUAL');
  drawEndpoint(n + 1, projAnual, CORES.darkBlue,  'PROJETADO', '');

  // ── Barras de variação mensal (slots 1..n) ──────────────────────────────
  meses.forEach((m, i) => {
    const slotIdx = i + 1;
    const cx   = plotX + slotIdx * slotW + (slotW - barW) / 2;
    const mag  = Math.abs(m.delta);
    const hBar = Math.max(m.delta > 0 ? (mag / maxUp) * upH : (mag / maxDown) * downH, 3);
    const yBar = m.delta > 0 ? zeroY - hBar : zeroY + 1.4;

    const bar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, yBar, barW, hBar);
    bar.getFill().setSolidFill(m.cor); bar.getBorder().setTransparent();

    // Variação por m² do mês (real − orç), mesmo sinal do R$
    const cm = m2Mes[key3(m.label)];
    let m2Str = '';
    if (cm && cm.orc != null && cm.real != null && !isNaN(cm.orc) && !isNaN(cm.real)) {
      m2Str = formatarRsM2_(Number(cm.real) - Number(cm.orc), true);
    }

    // Rótulo: R$ (linha 1) + R$/m² (linha 2, menor) — afastado da barra
    const bloco   = (m.delta > 0 ? '+' : '−') + formatarMoedaCompacta(mag) + (m2Str ? '\n' + m2Str : '');
    const blocoH  = m2Str ? 22 : 12;
    const lblY    = m.delta > 0 ? yBar - blocoH - 8 : yBar + hBar + 8;
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, lblY, slotW * 1.5, blocoH);
    const lr  = lbl.getText();
    lr.setText(bloco).getTextStyle().setFontSize(6.5).setBold(true).setForegroundColor(m.cor).setFontFamily('Montserrat');
    if (m2Str) lr.getRange(bloco.indexOf('\n') + 1, bloco.length).getTextStyle().setFontSize(5.5).setBold(false);
    lr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Mês junto ao eixo, do lado oposto ao da barra
    const mesY = m.delta > 0 ? zeroY + 4 : zeroY - 15;
    const mes = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, mesY, slotW * 1.5, 12);
    mes.getText().setText(m.label).getTextStyle()
      .setFontSize(6).setBold(m.ritmo).setForegroundColor(m.ritmo ? '#B45309' : CORES.textGray).setFontFamily('Montserrat');
    mes.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // ── Legenda centralizada no rodapé do card ───────────────────────────────
  _bridgeLegenda(slide, marginX + (cardW - 390) / 2, topY + cardH - 26);

  Logger.log('Slide Gráfico Bridge gerado (' + d.meses.length + ' meses).');
}

// Legenda do gráfico
function _bridgeLegenda(slide, x, y) {
  const itens = [
    { cor: '#10B981', txt: 'Abaixo (economia)' },
    { cor: '#EF4444', txt: 'Acima (atenção)' },
    { cor: '#F59E0B', txt: 'Ritmo (projeção)' }
  ];
  let cx = x;
  itens.forEach(it => {
    const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y + 2, 9, 9);
    box.getFill().setSolidFill(it.cor); box.getBorder().setTransparent();
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 12, y - 2, 110, 14);
    tb.getText().setText(it.txt).getTextStyle()
      .setFontSize(7).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
    cx += 130;
  });
}
