/**
 * ARQUIVO: Slide_FinanceiroBridge.gs
 * DESCRIÇÃO: Slide de Análise de Variação (Bridge) Financeiro Mensal
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

    grupos.push({ label, tipo, cOrc: c, cReal: c + 1, cVar: c + 2 });
  }
  if (!grupos.length) throw new Error('Nenhuma coluna de mês encontrada em "' + NOME_ABA_BRIDGE + '".');

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
  // Card fundo
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 6, 4, h - 12);
  barra.getFill().setSolidFill(CORES.darkBlue); barra.getBorder().setTransparent();

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
  const cols = [
    { t: 'MÊS',       x: cAcc(0.13), w: useW * 0.13, a: 'C' },
    { t: 'TIPO',      x: cAcc(0.11), w: useW * 0.11, a: 'C' },
    { t: 'ORÇADO',    x: cAcc(0.21), w: useW * 0.21, a: 'R' },
    { t: 'REAL/RITMO',x: cAcc(0.21), w: useW * 0.21, a: 'R' },
    { t: 'VARIAÇÃO',  x: cAcc(0.21), w: useW * 0.21, a: 'R' },
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

  d.meses.forEach((m, i) => {
    const ry  = startY + i * rowH;
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

    _cel(m.label,                      cols[0], CORES.darkBlue,  true);
    _cel(formatarMoeda(m.orc),         cols[2], CORES.textDark,  false);
    _cel(formatarMoeda(m.real),        cols[3], CORES.textDark,  false);
    _cel(seta + formatarMoeda(Math.abs(m.var)), cols[4], corVar, true);

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
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, topY, cardW, cardH);
  card.getFill().setSolidFill(CORES.white); card.getBorder().setTransparent();

  // ── Legenda ────────────────────────────────────────────────────────────
  _bridgeLegenda(slide, marginX + 20, topY + 10);

  // ── Sequência de barras: [Orçado] + meses + [Realizado/Projetado] ──────
  const inicio = d.totalOrcAnual;     // orçado anual
  const passos = [];
  let acumulado = inicio;
  passos.push({ tipo: 'TOTAL', label: 'ORÇADO', topo: inicio, base: inicio, valor: inicio, cor: '#94A3B8' });

  d.meses.forEach(m => {
    const delta = m.real - m.orc;     // >0 gastou mais (sobe) ; <0 economizou (desce)
    const antes = acumulado;
    acumulado  += delta;
    const topo  = Math.max(antes, acumulado);
    const base  = Math.min(antes, acumulado);
    const subiu = delta > 0;          // subir = acima do orçado (ruim)
    const cor   = m.tipo === 'RITMO' ? '#F59E0B' : (subiu ? '#EF4444' : '#10B981');
    passos.push({ tipo: 'STEP', label: m.label, topo, base, valor: delta, cor, subiu, ritmo: m.tipo === 'RITMO' });
  });

  passos.push({ tipo: 'TOTAL', label: 'REAL./PROJ.', topo: acumulado, base: acumulado, valor: acumulado, cor: CORES.darkBlue });

  // ── Escala a partir do ZERO ───────────────────────────────────────────────
  // Base em zero (intuitiva): as barras-total mostram a proporção real e os
  // valores de cada variação ficam legíveis pelos rótulos acima das barras.
  let vMax = -Infinity;
  passos.forEach(p => { vMax = Math.max(vMax, p.base, p.topo); });
  const escMin  = 0;
  const escMax  = vMax * 1.08;
  const escSpan = escMax - escMin;

  const plotX = marginX + 30;
  const plotY = topY + 44;
  const plotW = cardW - 60;
  const plotH = cardH - 100;
  const baseY = plotY + plotH;                          // base do plot (= escMin)

  const n     = passos.length;
  const slotW = plotW / n;
  const barW  = Math.min(slotW * 0.58, 44);
  // valor (absoluto, no eixo) → coordenada Y na tela
  const vToY  = v => baseY - ((v - escMin) / escSpan) * plotH;

  // ── Linhas de grade horizontais (4 faixas) + rótulos do eixo ──────────────
  for (let g = 0; g <= 4; g++) {
    const val = escMin + (escSpan * g / 4);
    const gy  = vToY(val);
    const grid = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX, gy, plotW, 0.75);
    grid.getFill().setSolidFill(g === 0 ? '#CBD5E1' : '#EEF2F7'); grid.getBorder().setTransparent();
    const gl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX - 30, gy - 7, 28, 14);
    gl.getText().setText(formatarMoedaCompacta(val)).getTextStyle()
      .setFontSize(5.5).setForegroundColor('#94A3B8').setFontFamily('Montserrat');
    gl.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  }

  let prevConnX = null, prevConnY = null;

  passos.forEach((p, i) => {
    const cx   = plotX + i * slotW + (slotW - barW) / 2;
    let yTop, yBot;
    if (p.tipo === 'TOTAL') {
      // barra cheia: do topo do valor até a base do plot
      yTop = vToY(p.topo);
      yBot = baseY;
    } else {
      yTop = vToY(p.topo);
      yBot = vToY(p.base);
    }
    const hBar = Math.max(yBot - yTop, 3);

    // Conector horizontal do passo anterior até este (na altura do acumulado)
    if (prevConnX !== null && prevConnY !== null) {
      const conn = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, prevConnX, prevConnY, cx - prevConnX, 1);
      conn.getFill().setSolidFill('#CBD5E1'); conn.getBorder().setTransparent();
    }

    // Barra
    const bar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, yTop, barW, hBar);
    bar.getFill().setSolidFill(p.cor); bar.getBorder().setTransparent();

    // Valor acima da barra
    const lblVal = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx - slotW * 0.25, yTop - 15, barW + slotW * 0.5, 13);
    let txtVal;
    if (p.tipo === 'TOTAL') txtVal = formatarMoedaCompacta(p.valor);
    else txtVal = (p.subiu ? '+' : '−') + formatarMoedaCompacta(Math.abs(p.valor));
    const tv = lblVal.getText();
    tv.setText(txtVal).getTextStyle()
      .setFontSize(6).setBold(true).setForegroundColor(p.tipo === 'TOTAL' ? CORES.textDark : p.cor).setFontFamily('Montserrat');
    tv.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo do mês/etapa abaixo da base
    const lblCat = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + i * slotW - slotW * 0.15, baseY + 4, slotW * 1.3, 14);
    const tc = lblCat.getText();
    tc.setText(p.label).getTextStyle()
      .setFontSize(p.tipo === 'TOTAL' ? 6 : 5.5).setBold(p.tipo === 'TOTAL')
      .setForegroundColor(p.tipo === 'TOTAL' ? CORES.darkBlue : CORES.textGray).setFontFamily('Montserrat');
    tc.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    prevConnX = cx + barW;
    // conector sai da altura do acumulado final deste passo
    prevConnY = (p.tipo === 'TOTAL' && i === n - 1) ? null
              : (p.tipo === 'TOTAL' ? vToY(p.topo) : (p.subiu ? yTop : yBot));
  });

  // ── Rodapé resumo ─────────────────────────────────────────────────────
  const abAnual = d.varAnual >= 0;
  const corR    = abAnual ? '#166534' : '#DC2626';
  const resumo  = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 20, topY + cardH - 26, cardW - 40, 18);
  const rt = resumo.getText();
  rt.setText('Projeção anual ' + (abAnual ? 'ABAIXO' : 'ACIMA') + ' do orçado em ' +
             formatarMoeda(Math.abs(d.varAnual)) +
             ' (' + (d.totalOrcAnual > 0 ? (Math.abs(d.varAnual / d.totalOrcAnual) * 100).toFixed(1) : '0') + '%).')
    .getTextStyle().setFontSize(9).setBold(true).setItalic(true).setForegroundColor(corR).setFontFamily('Montserrat');
  rt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

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
