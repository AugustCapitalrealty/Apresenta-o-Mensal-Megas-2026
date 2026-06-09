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
  const grupos = [];
  for (let c = 1; c + 1 < hdr.length; c += 3) {
    const h0 = normTxt(hdr[c]);
    if (!/^or[cç]/.test(h0)) break;                    // sem mais triplets

    const h1    = normTxt(hdr[c + 1] || '');
    const tipo  = h1.includes('ritmo') ? 'RITMO' : 'REAL';

    // Extrai rótulo do mês: "Orç Jan/26" → "JAN/26"
    const m = String(hdr[c]).match(/([A-Za-zçÇ]{3}\/\d{2,4})/);
    const label = m ? m[1].toUpperCase() : ('M' + grupos.length + 1);

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
    { t: 'MÊS',       x: cAcc(0.10), w: useW * 0.10, a: 'C' },
    { t: 'TIPO',      x: cAcc(0.10), w: useW * 0.10, a: 'C' },
    { t: 'ORÇADO',    x: cAcc(0.22), w: useW * 0.22, a: 'R' },
    { t: 'REAL/RITMO',x: cAcc(0.22), w: useW * 0.22, a: 'R' },
    { t: 'VARIAÇÃO',  x: cAcc(0.22), w: useW * 0.22, a: 'R' },
    { t: 'VAR %',     x: cAcc(0.14), w: useW * 0.14, a: 'C' }
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
    const bgRow  = i % 2 === 0 ? '#F8FAFC' : CORES.white;
    const varPct = m.orc > 0 ? (Math.abs(m.var / m.orc) * 100).toFixed(1) + '%' : '-';
    const sinal  = m.tipo === 'RITMO' ? '' : (abaixo ? '-' : '+');

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
    _cel(sinal + formatarMoeda(Math.abs(m.var)), cols[4], corVar, true);

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
    vBg.getFill().setSolidFill(corVar + '22'); vBg.getBorder().setTransparent();
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
    totBar.getFill().setSolidFill(CORES.darkBlue + '18'); totBar.getBorder().setTransparent();

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
    _totCel((abTot ? '-' : '+') + formatarMoeda(Math.abs(d.totalVar)), cols[4], corTot);
    const pct = d.totalOrc > 0 ? (Math.abs(d.totalVar / d.totalOrc) * 100).toFixed(1) + '%' : '-';
    _totCel(pct, cols[5], corTot);
  }
}
