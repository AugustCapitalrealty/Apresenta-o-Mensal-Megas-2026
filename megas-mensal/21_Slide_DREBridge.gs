/**
 * ARQUIVO: 21_Slide_DREBridge.gs
 * SEÇÃO:   SLIDES — Variação Orçada (Bridge) e Demonstrativo de Resultado (DRE)
 * DESCRIÇÃO: Análise de variação Orçado vs Realizado (tabela Bridge e gráfico
 *            waterfall) e DRE gerencial detalhado por rubrica contábil com
 *            comparativo mensal, acumulado e ritmo anual.
 */

// ==========================================
// BRIDGE FINANCEIRO (TABELA & WATERFALL)
// ==========================================
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

  // ── Vetor de valores: SOMA DAS RUBRICAS (não a linha TOTAL) ───────────────
  // FONTE ÚNICA do financeiro: o total exibido é sempre a soma das rubricas
  // da própria aba, não a linha "TOTAL" dela. Motivo: no deck de julho/2026
  // a linha TOTAL trazia R$ 2.192 a mais no mês (e no acumulado) do que a
  // soma das suas próprias rubricas — e a soma é que bate com a aba
  // FINANCEIRO/FINANCEIRO ANUAL (conferido rubrica a rubrica) e com a aba
  // METRO QUADRADO no ano. Somando, o Bridge, o DRE e o Resultado
  // Operacional passam a mostrar o MESMO número.
  //
  // A soma PARA na linha TOTAL (não a inclui): além de evitar contar tudo em
  // dobro, algumas planilhas (ex.: Itajaí) trazem uma segunda tabela
  // auxiliar logo depois dela, que não pertence às despesas — mesma regra
  // de obterDadosDRE_ em 02_Dados.gs.
  const vetor = new Array(hdr.length).fill(0);
  let vetorTotalPlanilha = null;
  for (let r = hdrRow + 1; r < data.length; r++) {
    if (!data[r][0]) continue;
    if (normTxt(data[r][0]).includes('total')) { vetorTotalPlanilha = data[r]; break; }
    for (let c = 1; c < data[r].length; c++) {
      vetor[c] += typeof data[r][c] === 'number' ? data[r][c] : 0;
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

  // Valor em R$ com o R$/m² menor e cinza na sequência (alinhado à direita)
  const _valM2 = (valorStr, m2Str, fx, fy, fw, size, cor) => {
    const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx, fy, fw, size + 11);
    const t = b.getText();
    const txt = m2Str ? valorStr + '  ' + m2Str : valorStr;
    t.setText(txt).getTextStyle()
      .setFontSize(size).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
    if (m2Str) t.getRange(valorStr.length, txt.length).getTextStyle()
      .setFontSize(Math.max(size - 4, 5.5)).setBold(false).setForegroundColor('#94A3B8');
    t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  };

  // R$/m² médio por mês: valor ÷ (área × nº de meses). A área vem calibrada
  // do Custo M², então a média bate com a aba METRO QUADRADO.
  const area  = obterAreaM2_();
  const nReal = d.meses.filter(m => m.tipo === 'REAL').length || 1;
  const nTot  = d.meses.length || 12;
  const m2Periodo = v => area ? formatarReaisM2_(v, area * nReal) : '';
  const m2Anual   = v => area ? formatarReaisM2_(v, area * nTot)  : '';

  let cy = y + 10;
  _txt('RESUMO DO PERÍODO', x + 12, cy, w - 20, 16, 7.5, true, CORES.textGray);
  cy += 20;

  // ── Orçado do Período ─────────────────────────────────────────────────────
  _txt('ORÇADO', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 13;
  _valM2(formatarMoeda(d.totalOrc), m2Periodo(d.totalOrc), x + 12, cy, w - 24, 11, CORES.textDark);
  cy += 24;

  // ── Realizado ─────────────────────────────────────────────────────────────
  _txt('REALIZADO', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 13;
  _valM2(formatarMoeda(d.totalReal), m2Periodo(d.totalReal), x + 12, cy, w - 24, 11, CORES.textDark);
  cy += 24;

  // ── Pill variação do período (R$, % e R$/m²) ──────────────────────────────
  const abaixo    = d.totalVar >= 0;
  const corVar    = abaixo ? '#166534' : '#DC2626';
  const bgVar     = abaixo ? '#F0FDF4' : '#FEF2F2';
  const varLabel  = abaixo ? '▼ ABAIXO DO ORÇADO' : '▲ ACIMA DO ORÇADO';
  const varPctStr = d.totalOrc > 0 ? (Math.abs(d.totalVar / d.totalOrc) * 100).toFixed(1) + '%' : '0%';
  const varM2Str  = m2Periodo(Math.abs(d.totalVar));

  cy += 4;
  const pillBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 10, cy, w - 20, 52);
  pillBox.getFill().setSolidFill(bgVar); pillBox.getBorder().setTransparent();

  _txt(varLabel, x + 10, cy + 4, w - 20, 16, 7, true, corVar, 'C');
  _txt(formatarMoeda(Math.abs(d.totalVar)) + (varM2Str ? '  |  ' + varM2Str : ''),
       x + 10, cy + 20, w - 20, 18, 11, true, corVar, 'C');
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
  _valM2(formatarMoeda(d.totalOrcAnual), m2Anual(d.totalOrcAnual), x + 12, cy, w - 24, 9, CORES.textDark);
  cy += 20;

  _txt('PROJETADO', x + 12, cy, 60, 13, 6, true, '#94A3B8');
  _valM2(formatarMoeda(d.totalProjetado), m2Anual(d.totalProjetado), x + 12, cy, w - 24, 9, CORES.textDark);
  cy += 20;

  const abaixoAnual = d.varAnual >= 0;
  const corAnual    = abaixoAnual ? '#166534' : '#DC2626';
  const sinalAnual  = abaixoAnual ? '▼ ' : '▲ ';
  _valM2(sinalAnual + formatarMoeda(Math.abs(d.varAnual)), m2Anual(Math.abs(d.varAnual)), x + 12, cy, w - 24, 9, corAnual);
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

    // Célula com R$ em cima e R$/m² (cinza, menor) embaixo — centralizada.
    // avisoCor (opcional): cor de alerta pra 2ª linha quando o sinal do R$/m²
    // destoa do sinal do R$ (abas desalinhadas — ver comentário abaixo).
    const _celM2 = (valorStr, m2Str, col, cor, bold, avisoCor) => {
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col.x, ry, col.w, rowH);
      const t = b.getText();
      const txt = m2Str ? valorStr + '\n' + m2Str : valorStr;
      t.setText(txt).getTextStyle().setFontSize(7.5).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
      if (m2Str) t.getRange(valorStr.length + 1, txt.length).getTextStyle()
        .setFontSize(5.5).setBold(!!avisoCor).setForegroundColor(avisoCor || '#94A3B8');
      t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    };

    const temM2   = cmM2 && cmM2.orc != null && cmM2.real != null && !isNaN(cmM2.orc) && !isNaN(cmM2.real);
    const deltaM2 = temM2 ? Number(cmM2.real) - Number(cmM2.orc) : null;
    const varM2   = temM2 ? formatarRsM2_(deltaM2, true) : '';
    // m.var = orç − real (positivo = abaixo do orçado); deltaM2 = real − orç
    // (positivo = acima). R$ e R$/m² vêm de abas diferentes (FINANCEIRO
    // BRIDGE e METRO QUADRADO) — se uma foi atualizada e a outra não, os
    // sentidos destoam. Sinaliza com ⚠ em vez de mostrar como se batesse.
    let m2Aviso = false;
    if (temM2 && Math.abs(m.var) > 0.5 && Math.abs(deltaM2) > 0.005) {
      m2Aviso = (m.var >= 0) !== (deltaM2 <= 0);
    }
    const varM2Txt = m2Aviso ? '⚠ ' + varM2 : varM2;

    _cel(m.label, cols[0], CORES.darkBlue, true);
    _celM2(formatarMoeda(m.orc),  temM2 ? formatarRsM2_(Number(cmM2.orc))  : '', cols[2], CORES.textDark);
    _celM2(formatarMoeda(m.real), temM2 ? formatarRsM2_(Number(cmM2.real)) : '', cols[3], CORES.textDark);
    _celM2(seta + formatarMoeda(Math.abs(m.var)), varM2Txt, cols[4], corVar, true, m2Aviso ? '#B45309' : null);

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

  // Desvio PROJETADO vs orçado anual (>0 = projeta estourar o orçamento).
  // Entra na escala junto com os meses para a barra da ponta nunca vazar.
  const deltaProj = d.totalProjetado - d.totalOrcAnual;

  const maxUp   = Math.max(1, deltaProj > 0 ?  deltaProj : 0, ...meses.filter(m => m.delta > 0).map(m => m.delta));
  const maxDown = Math.max(1, deltaProj < 0 ? -deltaProj : 0, ...meses.filter(m => m.delta < 0).map(m => -m.delta));

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

  // Linha do zero (eixo) — o ORÇADO É o ponto zero, então a linha começa
  // já no slot do orçado e vai até o slot do projetado
  const eixo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + slotW * 0.1, zeroY, plotW - slotW * 0.2, 1.4);
  eixo.getFill().setSolidFill('#94A3B8'); eixo.getBorder().setTransparent();

  // R$/m² médio mensal dos valores anuais (mesma convenção do card de
  // resumo do Bridge: valor ÷ (área × nº de meses do ano))
  const areaBg = obterAreaM2_();
  const nTotBg = Math.max(d.meses.length, 1);
  const m2AnualBg = v => areaBg ? formatarReaisM2_(v, areaBg * nTotBg) : '';

  // ── Ponta esquerda: ORÇADO ANUAL = ponto zero (sem barra, só o valor) ────
  {
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      plotX - slotW * 0.25, zeroY - 30, slotW * 1.5, 24);
    const m2Orc = m2AnualBg(d.totalOrcAnual);
    const txtOrc = formatarMoedaCompacta(d.totalOrcAnual) + (m2Orc ? '\n' + m2Orc : '');
    const vr = valBox.getText();
    vr.setText(txtOrc).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#475569').setFontFamily('Montserrat');
    if (m2Orc) vr.getRange(txtOrc.indexOf('\n') + 1, txtOrc.length)
      .getTextStyle().setFontSize(5.5).setBold(false).setForegroundColor('#94A3B8');
    vr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const cap = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      plotX - slotW * 0.25, zeroY + 4, slotW * 1.5, 22);
    cap.getText().setText('ORÇADO\nANUAL').getTextStyle()
      .setFontSize(6).setBold(true).setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');
    cap.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // ── Ponta direita: PROJETADO como DESVIO do zero (mesma lógica dos meses:
  //    p/ cima = projeta gastar acima do orçado; p/ baixo = economia) ───────
  {
    const slotIdx = n + 1;
    const mag  = Math.abs(deltaProj);
    const hBar = Math.max(deltaProj > 0 ? (mag / maxUp) * upH : (mag / maxDown) * downH, 3);
    const yBar = deltaProj > 0 ? zeroY - hBar : zeroY + 1.4;
    const cor  = deltaProj > 0 ? '#EF4444' : '#10B981';
    const cx   = plotX + slotIdx * slotW + (slotW - barW) / 2;

    const bar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, yBar, barW, hBar);
    bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();

    // Rótulo do desvio: R$ + R$/m² (padrão dos meses)
    const m2Proj  = m2AnualBg(mag);
    const bloco   = (deltaProj > 0 ? '+' : '−') + formatarMoedaCompacta(mag) +
                    (m2Proj ? '\n' + (deltaProj > 0 ? '+' : '−') + m2Proj : '');
    const blocoH  = m2Proj ? 22 : 12;
    const lblY    = deltaProj > 0 ? yBar - blocoH - 8 : yBar + hBar + 8;
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, lblY, slotW * 1.5, blocoH);
    const lr  = lbl.getText();
    lr.setText(bloco).getTextStyle().setFontSize(6.5).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
    if (m2Proj) lr.getRange(bloco.indexOf('\n') + 1, bloco.length).getTextStyle().setFontSize(5.5).setBold(false);
    lr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Rótulo "PROJETADO" + total anual projetado, do lado oposto ao da barra
    const capH = 22;
    const capY = deltaProj > 0 ? zeroY + 4 : zeroY - capH - 3;
    const cap = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, capY, slotW * 1.5, capH);
    const capTxt = 'PROJETADO\n' + formatarMoedaCompacta(d.totalProjetado);
    const cr = cap.getText();
    cr.setText(capTxt).getTextStyle()
      .setFontSize(6).setBold(true).setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');
    cr.getRange(capTxt.indexOf('\n') + 1, capTxt.length)
      .getTextStyle().setBold(false).setForegroundColor('#64748B');
    cr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // ── Barras de variação mensal (slots 1..n) ──────────────────────────────
  meses.forEach((m, i) => {
    const slotIdx = i + 1;
    const cx   = plotX + slotIdx * slotW + (slotW - barW) / 2;
    const mag  = Math.abs(m.delta);
    const hBar = Math.max(m.delta > 0 ? (mag / maxUp) * upH : (mag / maxDown) * downH, 3);
    const yBar = m.delta > 0 ? zeroY - hBar : zeroY + 1.4;

    const bar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, yBar, barW, hBar);
    bar.getFill().setSolidFill(m.cor); bar.getBorder().setTransparent();

    // Variação por m² do mês (real − orç) — deveria ter o MESMO sinal do R$
    // (as duas vêm de abas diferentes: R$ da FINANCEIRO BRIDGE, R$/m² da
    // METRO QUADRADO; se alguém atualiza uma e esquece a outra, os sinais
    // destoam — sinaliza com ⚠ em vez de mostrar como se estivesse ok)
    const cm = m2Mes[key3(m.label)];
    let m2Str = '', m2Aviso = false;
    if (cm && cm.orc != null && cm.real != null && !isNaN(cm.orc) && !isNaN(cm.real)) {
      const deltaM2 = Number(cm.real) - Number(cm.orc);
      m2Str = formatarRsM2_(deltaM2, true);
      if (Math.abs(m.delta) > 0.5 && Math.abs(deltaM2) > 0.005) {
        m2Aviso = (m.delta > 0) !== (deltaM2 > 0);
      }
    }

    // Rótulo: R$ (linha 1) + R$/m² (linha 2, menor) — afastado da barra
    const linha2  = m2Str ? (m2Aviso ? '⚠ ' : '') + m2Str : '';
    const bloco   = (m.delta > 0 ? '+' : '−') + formatarMoedaCompacta(mag) + (linha2 ? '\n' + linha2 : '');
    const blocoH  = m2Str ? 22 : 12;
    const lblY    = m.delta > 0 ? yBar - blocoH - 8 : yBar + hBar + 8;
    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, lblY, slotW * 1.5, blocoH);
    const lr  = lbl.getText();
    lr.setText(bloco).getTextStyle().setFontSize(6.5).setBold(true).setForegroundColor(m.cor).setFontFamily('Montserrat');
    if (m2Str) {
      const styleM2 = lr.getRange(bloco.indexOf('\n') + 1, bloco.length).getTextStyle()
        .setFontSize(5.5).setBold(m2Aviso);
      if (m2Aviso) styleM2.setForegroundColor('#B45309');
    }
    lr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Mês junto ao eixo, do lado oposto ao da barra
    const mesY = m.delta > 0 ? zeroY + 4 : zeroY - 15;
    const mes = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, mesY, slotW * 1.5, 12);
    mes.getText().setText(m.label).getTextStyle()
      .setFontSize(6).setBold(m.ritmo).setForegroundColor(m.ritmo ? '#B45309' : CORES.textGray).setFontFamily('Montserrat');
    mes.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // ── Legenda centralizada no rodapé do card (itens juntos) ────────────────
  _bridgeLegenda(slide, marginX + (cardW - 240) / 2, topY + cardH - 26);

  Logger.log('Slide Gráfico Bridge gerado (' + d.meses.length + ' meses).');
}

// Legenda do gráfico — rótulos curtos e itens próximos uns dos outros
function _bridgeLegenda(slide, x, y) {
  const itens = [
    { cor: '#10B981', txt: 'Abaixo' },
    { cor: '#EF4444', txt: 'Acima' },
    { cor: '#F59E0B', txt: 'Projetado' }
  ];
  let cx = x;
  itens.forEach(it => {
    const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y + 2, 9, 9);
    box.getFill().setSolidFill(it.cor); box.getBorder().setTransparent();
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 12, y - 2, 60, 14);
    tb.getText().setText(it.txt).getTextStyle()
      .setFontSize(7).setForegroundColor(CORES.textGray).setFontFamily('Montserrat');
    cx += 80;
  });
}

// ==========================================
// DRE CONTÁBIL (REALIZADO, ACUMULADO & RITMO)
// ==========================================
/**
 * ARQUIVO: Slide_DRE.gs
 * SLIDE — DRE (DEMONSTRATIVO DE RESULTADO)
 * DESCRIÇÃO: Tabela consolidada por rubrica contábil no estilo DRE da
 * controladoria, com os dados que a apresentação já tem (obterDadosDRE_ em
 * 02_Dados.gs). Três recortes, cada um com 5 colunas — os VALORES juntos e
 * as VARIAÇÕES juntas, para não misturar as duas leituras:
 *
 *   2025 | Meta | Real | Δ% Meta | Δ% 2025
 *
 *   Bloco 1 — MÊS (mês de referência)
 *   Bloco 2 — ACUMULADO (Jan..mês ref)
 *   Bloco 3 — projeção do ANO (destacado em cor própria: é o FUTURO)
 *     ▸ gerarSlideDREComRitmo() → REALIZADO + RITMO (projeção run-rate)
 *     ▸ gerarSlideDRE()         → REALIZADO + ORÇADO (plano original)
 *
 * "% Var" é VARIAÇÃO, não atingimento: Real ÷ base − 1, sempre em módulo,
 * com seta indicando o sentido — ▲ vermelha gastou MAIS, ▼ verde gastou
 * MENOS. "% 25" é a mesma conta contra o Realizado de 2025 (aba "Financeiro
 * 2025"; sem ela a coluna mostra "-", nunca quebra).
 *
 * Valores em R$ MIL, sem casas decimais. Linha TOTAL (DESPESAS OPERACIONAIS)
 * no topo em azul escuro; cada CATEGORIA é uma linha de subtotal em cinza
 * (soma das suas rubricas), com as rubricas indentadas embaixo. A ordem das
 * linhas é FIXA (posição no mapa DRE_CATEGORIAS), igual todo mês, para dar
 * pra comparar dois meses lado a lado sem procurar a rubrica.
 */

function gerarSlideDRE()         { _gerarSlideDRE_('orcado'); }
function gerarSlideDREComRitmo() { _gerarSlideDRE_('ritmo');  }

// Soma Meta (orç) e Realizado das rubricas de uma categoria, nos 4 recortes
// que obterDadosDRE_ calcula por rubrica — vira a linha de SUBTOTAL. A parte
// de 2025 soma só as rubricas que tiverem o dado (rubrica sem "Financeiro
// 2025" não zera o subtotal do grupo inteiro); se nenhuma tiver, fica null.
function _dreSomarCategoria_(itens) {
  const blocos = {
    mes: { orc: 0, real: 0 }, acum: { orc: 0, real: 0 },
    anual: { orc: 0, real: 0 }, anualOrc: { orc: 0, real: 0 }
  };
  itens.forEach(r => {
    ['mes', 'acum', 'anual', 'anualOrc'].forEach(k => {
      blocos[k].orc += r[k].orc; blocos[k].real += r[k].real;
    });
  });
  const somaAA = campo => {
    const vals = itens.map(r => r[campo]).filter(v => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };
  blocos.aaMes  = somaAA('aaMes');
  blocos.aaAcum = somaAA('aaAcum');
  blocos.aaAno  = somaAA('aaAno');
  return blocos;
}

// Converte uma linha (TOTAL ou subtotal de CATEGORIA) em R$ numa linha
// equivalente em R$/m², dividindo cada bloco pela área do empreendimento
// (obterAreaM2_, 02_Dados.gs) E pelo número de meses que o bloco soma —
// senão MÊS sai numa escala (1 mês) e ACUMULADO/ANO saem em outra (N
// meses somados), o que parecia "errado"/instável comparado lado a lado.
// Todos os blocos viram a MESMA leitura: R$/m² MÉDIO POR MÊS.
//   MÊS      → já é 1 mês, não divide por nada além da área.
//   ACUMULADO→ divide também por mesesAcum (Jan..mês de referência).
//   ANO      → divide também por 12 (ano completo, realizado + ritmo/orçado).
// Mesmo formato { mes, acum, anual, anualOrc, aaMes, aaAcum, aaAno } da
// linha original, então reaproveita o mesmo desenho de blocos/variação.
function _dreValoresPorM2_(b, area, mesesAcum) {
  const div = (v, meses) => v / area / meses;
  const divBloco = (bl, meses) => ({ orc: div(bl.orc, meses), real: div(bl.real, meses) });
  const divAA = (v, meses) => (v == null ? null : v / area / meses);
  return {
    mes:      divBloco(b.mes, 1),
    acum:     divBloco(b.acum, mesesAcum),
    anual:    divBloco(b.anual, 12),
    anualOrc: divBloco(b.anualOrc, 12),
    aaMes:  divAA(b.aaMes, 1),
    aaAcum: divAA(b.aaAcum, mesesAcum),
    aaAno:  divAA(b.aaAno, 12)
  };
}

function _gerarSlideDRE_(modo) {
  const d = obterDadosDRE_();
  if (!d) {
    Logger.log('Sem dados para o Slide DRE (aba FINANCEIRO BRIDGE).');
    return;
  }

  const campoAnual  = modo === 'ritmo' ? 'anual' : 'anualOrc';
  const tituloAnual = modo === 'ritmo' ? 'REALIZADO + RITMO — ANO' : 'REALIZADO + ORÇADO — ANO';
  const subHeader   = modo === 'ritmo'
    ? 'Meta vs Realizado (projeção pelo ritmo) · valores em R$ mil · '
    : 'Meta vs Realizado (projeção pelo orçado) · valores em R$ mil · ';

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W  = deck.getPageWidth();
  const H  = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  // Cores das linhas de hierarquia
  const CINZA_CATEGORIA    = '#475569';   // subtotal de categoria (destoa do azul)
  const CINZA_CATEGORIA_M2 = '#64748B';   // subtotal de categoria em R$/m² (mesma família, mais claro)
  const COR_FUTURO      = DS.colors.brandLight;   // bloco da projeção anual
  // Vermelho/verde DESSATURADOS: a tabela tem ~90 variações coloridas e o tom
  // saturado (#DC2626/#166534) pesava demais na leitura. Estes mantêm o
  // significado com contraste suficiente (~5:1) sem gritar na tela.
  const VERM = '#A85450', VERDE = '#4E7B5F';               // sobre fundo claro
  const VERM_CLARO = '#E0A9A6', VERDE_CLARO = '#9FC4AF';   // sobre fundo escuro

  criarHeaderPadrao(slide, 'DRE — DESPESAS OPERACIONAIS', subHeader + d.cidade);

  // ── Grade — 3 blocos × 5 colunas ────────────────────────────────────────
  // Ordem pedida pela diretoria: ano anterior, orçamento, ano atual — os
  // valores leem como linha do tempo (de onde viemos, o que foi planejado,
  // onde chegamos). Cada VARIAÇÃO fica colada no valor que ela compara, em
  // vez de as duas irem juntas no fim do bloco:
  //
  //     2025 | Meta | Real | Δ% Meta | Δ% 2025
  //
  // Os VALORES juntos, na linha do tempo (de onde viemos, o que foi
  // planejado, onde chegamos), e as VARIAÇÕES juntas depois deles — números
  // de um lado, comparações do outro. As duas comparações partem do mesmo
  // Real, então ficam lado a lado.
  const NCOL = 5;
  const x0 = 10, tableW = W - 20;
  const rubricaW = 158;
  // Colunas NÃO são todas iguais: as de variação carregam seta + número
  // ("▲ 2.088%") e precisam de mais espaço que as de valor ("2.088"), senão
  // a seta encosta no número. Os pesos somam 5,00 por bloco, então a largura
  // total da tabela não muda.
  // Ano anterior | Meta | Real | Δ% Meta | Δ% ano anterior.
  // Os pesos seguem a POSIÇÃO, não o conteúdo: as colunas de variação
  // carregam seta + número ("▲ 2.088%") e precisam de mais espaço que as de
  // valor ("2.088"), então 1,30 e 1,24 ficam nas duas últimas. A soma é 5,00
  // por bloco, e a largura total da tabela não muda.
  const PESO_COL = [0.82, 0.82, 0.82, 1.30, 1.24];
  const unidade  = (tableW - rubricaW) / (3 * NCOL);
  const colPos = [], colLarg = [];
  let _accX = x0 + rubricaW;
  for (let b = 0; b < 3; b++) {
    for (let i = 0; i < NCOL; i++) {
      const w = unidade * PESO_COL[i];
      colPos.push(_accX); colLarg.push(w); _accX += w;
    }
  }
  const colX = i => colPos[i];                       // i = 0..14
  const colW = i => colLarg[i];
  // Largura de um bloco inteiro (5 colunas), usada nas barras de cabeçalho
  const blocoW = c0 => colLarg.slice(c0, c0 + NCOL).reduce((s, w) => s + w, 0);

  // ── Barra dos blocos ──────────────────────────────────────────────────────
  const blocoY = 66, blocoH = 14;
  // "JAN A JUL/26" em vez de "7 MESES" — o range fica explícito sem precisar
  // contar nos dedos. d.mesLabel já vem como "Julho/26"; abrevia pro nome
  // curto (3 letras) mantendo o "/26". Mês de referência = Janeiro não repete
  // ("JANEIRO/26" sozinho, sem "JAN A JAN/26").
  const mesAbrev = d.mesLabel.slice(0, 3).toUpperCase() + d.mesLabel.slice(d.mesLabel.indexOf('/'));
  const acumTxt  = d.mesesAcum > 1 ? ('ACUMULADO — JAN A ' + mesAbrev) : ('ACUMULADO — ' + mesAbrev);
  const blocos = [
    { txt: 'MÊS — ' + d.mesLabel.toUpperCase(),     c0: 0,  cor: DS.colors.brandMed },
    { txt: acumTxt,                                 c0: 5,  cor: DS.colors.brandMed },
    // Projeção do ano: cor própria em TODO o cabeçalho do bloco (barra + a
    // régua Meta/Real/…) e um leve tingido atrás das células — sinaliza que
    // aquele trecho é FUTURO/projeção, não realizado.
    { txt: tituloAnual,                             c0: 10, cor: COR_FUTURO, futuro: true }
  ];

  // Faixa tingida atrás das 5 colunas da projeção (desenhada antes das
  // linhas para ficar por baixo; as linhas de dado cobrem só o que precisam).
  const futuroX = colX(10), futuroW = blocoW(10) - 1;

  const cabRub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, blocoY, rubricaW - 1, blocoH + 14);
  cabRub.getFill().setSolidFill(DS.colors.brandDark); cabRub.getBorder().setTransparent();
  const cabRubT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 4, blocoY, rubricaW - 8, blocoH + 14);
  cabRubT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  cabRubT.getText().setText('R$ MIL').getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  blocos.forEach(b => {
    const bx = colX(b.c0), bw = blocoW(b.c0) - 1;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, blocoY, bw, blocoH);
    bg.getFill().setSolidFill(b.cor); bg.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, blocoY, bw, blocoH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(b.txt).getTextStyle()
      .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Sub-cabeçalho. As caixas de texto vão além da célula (folga simétrica,
    // sem fundo próprio → invisível) só para vencer o recuo interno padrão do
    // Slides, que quebrava "Realizado" em "Realizad/o".
    // "Δ%" deixa explícito que a coluna é a DIFERENÇA percentual, e contra o
    // quê: Δ% Meta = Real vs Meta; Δ% 2025 = Real vs o realizado do ano anterior.
    // ORDEM PEDIDA PELA DIRETORIA: ano anterior → orçamento → ano atual.
    // Lê como uma linha do tempo — de onde viemos, o que foi planejado, onde
    // chegamos. Antes era Meta | Real | ano anterior (planejado primeiro).
    // A ordem das VARIAÇÕES não mudou: elas vêm depois dos três valores, e
    // cada uma diz contra o quê compara no próprio rótulo.
    [String(d.ano - 1), 'Meta', 'Real',
     'Δ% Meta', 'Δ% ' + String(d.ano - 1)].forEach((s, i) => {
      const sx = colX(b.c0 + i), sw = colW(b.c0 + i) - 1;
      const sb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, blocoY + blocoH, sw, 14);
      // No bloco da projeção a régua também sai na cor do futuro (um pouco
      // escurecida), para o cabeçalho inteiro daquele trecho destoar.
      sb.getFill().setSolidFill(b.futuro ? '#0A4C86' : DS.colors.brandDark);
      sb.getBorder().setTransparent();
      const folga = 10;
      const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, sx - folga, blocoY + blocoH, sw + folga * 2, 14);
      st.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      st.getText().setText(s).getTextStyle()
        .setFontSize(6.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
      st.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    });
  });

  // ── Linhas: TOTAL, depois cada CATEGORIA (subtotal) com suas rubricas ─────
  // Ordem fixa: obterDadosDRE_ já entrega as rubricas na ordem do mapa.
  const linhas = [{ tipo: 'total', nome: 'DESPESAS OPERACIONAIS', b: d.total }];
  // Linha extra logo abaixo do TOTAL (e uma por CATEGORIA, ver abaixo), em
  // R$/m² — "upgrade" pedido pelo usuário: mesma leitura de Meta/Real/2025
  // nos 3 blocos, só que por m² em vez de R$ mil, pra comparar eficiência
  // independente do tamanho do portfólio. As colunas Δ% NÃO se repetem
  // aqui — são idênticas às da linha em R$ (dividir os dois lados de uma
  // razão pela mesma constante não muda o resultado), então ficariam só
  // redundantes (ver desenharVar/ehLinhaM2 mais abaixo). Sem obterAreaM2_()
  // (falta Custo M² ou Financeiro Mensal), nenhuma linha de m² aparece —
  // nunca quebra a geração.
  const areaM2 = obterAreaM2_();
  if (areaM2) {
    linhas.push({ tipo: 'total_m2', nome: 'DESPESAS OPERACIONAIS (R$/M²)', b: _dreValoresPorM2_(d.total, areaM2, d.mesesAcum) });
  }
  const ordemCategorias = DRE_CATEGORIAS.map(c => c.nome).concat(['Outras Despesas']);
  ordemCategorias.forEach(nomeCat => {
    const doCat = d.rubricas.filter(r => r.categoria === nomeCat);
    if (!doCat.length) return;
    const somaCat = _dreSomarCategoria_(doCat);
    linhas.push({ tipo: 'categoria', nome: nomeCat, b: somaCat });
    // Rótulo curto ("R$/M²", não o nome da categoria repetido) — categorias
    // como "DESPESAS COM PESSOAL E ADMINISTRATIVAS" já ocupam quase toda a
    // largura da coluna de rubrica; repetir o nome + sufixo estouraria e
    // truncaria bem o "(R$/M²)" que é a parte que importa identificar.
    if (areaM2) {
      linhas.push({ tipo: 'categoria_m2', nome: 'R$/M²', b: _dreValoresPorM2_(somaCat, areaM2, d.mesesAcum) });
    }
    doCat.forEach(r => linhas.push({ tipo: 'item', nome: r.nome, b: r }));
  });

  const tY = blocoY + blocoH + 14 + 2;
  // SEM piso mínimo: a tabela precisa caber inteira no slide, senão as
  // últimas linhas ficam empurradas para fora da área visível.
  const rowH = Math.min(16, (H - tY - 8) / linhas.length);
  const fs   = rowH >= 12 ? 7 : (rowH >= 9 ? 6.3 : (rowH >= 7 ? 5.5 : 4.8));


  // R$ mil, sempre inteiro (a pedido: "0,1" vira "0").
  const mil = v => {
    if (v == null || isNaN(v)) return '-';
    return Math.round(v / 1000).toLocaleString('pt-BR');
  };

  // R$/m² — valor já pequeno (não passa por milhares), 2 casas decimais
  // (mesma convenção de formatarMoedaSlide em Slide09_CustoM2.gs, sem o
  // prefixo "R$" que a linha já deixa implícito no rótulo).
  const porM2 = v => {
    if (v == null || isNaN(v)) return '-';
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // VARIAÇÃO: Real ÷ base − 1, sempre positiva, com o sentido na seta.
  // Base ZERADA com gasto = 100% (a pedido: "orçado 0 e gastei 1 real → 100%").
  // Base AUSENTE é caso diferente: quando não existe dado de 2025 para a
  // rubrica não dá para afirmar variação nenhuma — devolve null (mostra "-"),
  // senão a coluna "% 25" cravaria "▲ 100%" em cima de um dado inexistente.
  // `nulo` marca a igualdade EXATA (real === base). É diferente de uma
  // variação pequena que só arredonda para 0%: nesse caso ainda houve
  // desvio e a seta precisa aparecer indicando para que lado foi.
  const variacao = (base, real) => {
    if (real == null || isNaN(real)) return null;
    if (base == null || isNaN(base))  return null;
    if (base === 0) return real > 0.005 ? { pct: 100, maior: true, nulo: false } : null;
    const v = (real / base - 1) * 100;
    return { pct: Math.abs(v), maior: v > 0, nulo: v === 0 };
  };

  // Só o NÚMERO da variação (a seta vai numa caixa separada, ver desenharVar).
  // Variações de milhares de % são reais aqui (rubrica com orçado pequeno e
  // gasto alto), então o número é mantido — só acima de 9.999% vira ">9999",
  // porque aí não caberia na célula e a informação já é só "estourou muito".
  const numeroVar = va => {
    if (!va) return '-';
    const p = Math.round(va.pct);
    if (p === 0) return '0%';
    return (p > 9999 ? '>9999' : p.toLocaleString('pt-BR')) + '%';
  };
  const corVar = (va, escuro) => {
    if (!va || va.nulo) return escuro ? '#CBD5E1' : CORES.textGray;
    if (va.maior) return escuro ? VERM_CLARO : VERM;
    return escuro ? VERDE_CLARO : VERDE;
  };

  // Célula de variação: a SETA fica numa caixa própria ancorada sempre no
  // mesmo ponto da célula, então "▲ 1%" e "▲ 100%" têm a seta na mesma
  // vertical — dá pra varrer a coluna de relance sem a seta dançando conforme
  // o número de dígitos. O número continua alinhado à direita, para os
  // dígitos seguirem comparáveis entre as linhas.
  const SETA_W = 9;
  const desenharVar = (va, cx, ry, cw, escuro) => {
    const cor = corVar(va, escuro);

    // A seta aparece sempre que houve desvio — inclusive quando o número
    // arredonda para "0%" (ex.: 6.097 contra meta de 6.084). Aí o número
    // sozinho não diria para que lado foi; a seta resolve sem precisar abrir
    // casas decimais. Só na igualdade exata (nulo) não há direção a mostrar.
    if (va && !va.nulo) {
      // Alinhada à ESQUERDA numa caixa fixa → a folga vai só para a direita
      // (skill slides-caixa-texto-sem-quebra), senão o glifo se desloca.
      const sa = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx - 5, ry, SETA_W + 10, rowH);
      sa.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      sa.getText().setText(va.maior ? '▲' : '▼').getTextStyle()
        .setFontSize(fs).setBold(true).setForegroundColor(cor).setFontFamily(DS.typography.body);
      sa.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
    }

    const folga = 12;
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      cx + SETA_W - folga, ry, cw - SETA_W + folga, rowH);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    t.getText().setText(numeroVar(va)).getTextStyle()
      .setFontSize(fs).setBold(true).setForegroundColor(cor).setFontFamily(DS.typography.body);
    t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  };

  let zebra = 0;   // conta só os ITENS: a zebra reinicia a cada categoria e
                   // não é bagunçada pelas linhas de TOTAL/subtotal no meio.
  linhas.forEach((l, r) => {
    const ry = tY + r * rowH;
    const ehTotal       = l.tipo === 'total';
    const ehTotalM2     = l.tipo === 'total_m2';
    const ehCategoria   = l.tipo === 'categoria';
    const ehCategoriaM2 = l.tipo === 'categoria_m2';
    const ehLinhaM2     = ehTotalM2 || ehCategoriaM2;   // Δ% não se repete nessas (ver comentário acima)
    const resumo        = ehTotal || ehCategoria || ehLinhaM2;   // linhas de fundo escuro

    // Fundo: TOTAL azul escuro, TOTAL R$/m² azul médio (relacionado mas
    // distinto — é o mesmo total, só que por m²), categoria cinza,
    // categoria R$/m² num cinza mais claro (mesma relação), itens em
    // zebra. Nos itens, a faixa das 5 colunas da projeção sai levemente
    // azulada — banda de cor que percorre a tabela inteira marcando "isto é
    // futuro".
    if (resumo) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, rowH);
      let bgCor = CINZA_CATEGORIA;
      if (ehTotal) bgCor = DS.colors.brandDark;
      else if (ehTotalM2) bgCor = DS.colors.brandMed;
      else if (ehCategoriaM2) bgCor = CINZA_CATEGORIA_M2;
      z.getFill().setSolidFill(bgCor);
      z.getBorder().setTransparent();
      if (ehCategoria) zebra = 0;
    } else {
      const par = zebra % 2 === 0;
      if (par) {
        const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, futuroX - x0, rowH);
        z.getFill().setSolidFill('#FFFFFF'); z.getBorder().setTransparent();
      }
      const zf = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, futuroX, ry, futuroW, rowH);
      zf.getFill().setSolidFill(par ? '#EFF5FC' : '#E7EEF8'); zf.getBorder().setTransparent();
      zebra++;
    }

    const corBase = resumo ? '#FFFFFF' : DS.colors.textMain;

    // Nome da linha. Categorias usam fonte um pouco menor + caixa alargada
    // para o nome completo caber em uma linha ("DESPESAS COM PESSOAL E
    // ADMINISTRATIVAS" não cabia e quebrava/cortava). Texto alinhado à
    // esquerda → a folga vai só para a DIREITA, senão o texto "anda".
    const fsLinha = (ehCategoria || ehLinhaM2) ? Math.min(fs, 6.3) : fs;
    const indent  = l.tipo === 'item' ? 12 : (ehCategoriaM2 ? 8 : 4);
    const larguraVisual = rubricaW - 4 - indent;
    let nome = (ehCategoria || ehCategoriaM2) ? l.nome.toUpperCase() : l.nome;
    // 0,62 em/char é a medida real do Montserrat/Open Sans em CAIXA ALTA
    // negrito (0,58 subestimava e deixava o texto passar da coluna, indo
    // parar embaixo do separador vertical).
    const maxChars = Math.floor(larguraVisual / (fsLinha * 0.62));
    if (nome.length > maxChars) nome = nome.substring(0, maxChars - 1) + '…';
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      x0 + indent, ry, larguraVisual + 10, rowH);
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    lab.getText().setText(nome).getTextStyle()
      .setFontSize(fsLinha).setBold(resumo).setForegroundColor(corBase).setFontFamily(DS.typography.body);

    // Blocos de valores (o 3º bloco muda com o modo: anualOrc ou anual)
    [{ bl: l.b.mes, aa: l.b.aaMes }, { bl: l.b.acum, aa: l.b.aaAcum }, { bl: l.b[campoAnual], aa: l.b.aaAno }]
      .forEach((blk, bi) => {
        const bl = blk.bl;
        const c0 = bi * NCOL;
        const vsMeta = variacao(bl.orc, bl.real);
        const vs25   = variacao(blk.aa, bl.real);

        // Primeiro os VALORES, depois as VARIAÇÕES.
        //
        // A ordem dos três é ANO ANTERIOR | META | REAL, e tem que ser a mesma
        // do cabeçalho lá em cima — as duas listas são posicionais, então
        // mexer numa sem mexer na outra troca os números de coluna sem erro
        // nenhum, com o slide continuando a parecer certo. Se mudar aqui,
        // mude lá.
        //
        // As CORES seguem o papel de cada coluna, não a posição: o realizado
        // é o número forte (corBase, negrito), a meta e o ano anterior são
        // referência (cinza). Por isso elas viajam junto com o valor.
        //
        // Linha R$/m² usa o formatador com 2 casas (porM2) — as demais
        // continuam em R$ mil arredondado (mil).
        const valFmt = ehLinhaM2 ? porM2 : mil;
        // Cada valor leva o SEU índice de coluna: com o Δ% do ano anterior
        // entre o 2025 e a Meta, as colunas de valor deixaram de ser
        // contíguas (0, 2, 3) e não dá mais para usar a posição no array.
        const valores = [
          { col: 0, txt: valFmt(blk.aa),  cor: resumo ? '#CBD5E1' : '#64748B',      bold: false  },
          { col: 1, txt: valFmt(bl.orc),  cor: resumo ? '#CBD5E1' : CORES.textGray, bold: resumo },
          { col: 2, txt: valFmt(bl.real), cor: corBase,                             bold: true   }
        ];
        valores.forEach(cel => {
          const i = cel.col;
          // Valores alinhados à direita: a folga da caixa vai só para a
          // ESQUERDA, mantendo a borda direita no lugar — o número não se
          // desloca e ainda assim ganha espaço para não quebrar linha.
          const folga = 12;
          const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
            colX(c0 + i) - folga, ry, colW(c0 + i) - 1 + folga, rowH);
          t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
          t.getText().setText(cel.txt).getTextStyle()
            .setFontSize(fs).setBold(cel.bold).setForegroundColor(cel.cor).setFontFamily(DS.typography.body);
          t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
        });

        // Variações (seta ancorada + número à direita) — as linhas em R$/m²
        // NÃO repetem: dividir os dois lados de uma razão pela mesma
        // constante (área, meses) não muda o resultado, então a % é
        // idêntica à da linha em R$ logo acima (pedido do usuário).
        // As duas variações fecham o bloco, na ordem Δ% Meta, Δ% ano anterior.
        //
        // Cabeçalho e desenho são duas listas posicionais — mexer numa sem
        // mexer na outra põe o número na coluna errada sem erro nenhum, e o
        // slide continua parecendo certo. Se mudar aqui, mude lá.
        if (!ehLinhaM2) {
          desenharVar(vsMeta, colX(c0 + 3), ry, colW(c0 + 3) - 1, resumo);
          desenharVar(vs25,   colX(c0 + 4), ry, colW(c0 + 4) - 1, resumo);
        }
      });
  });

  // Separadores verticais entre os blocos
  [0, NCOL, NCOL * 2, NCOL * 3].forEach(c => {
    const vx = c === NCOL * 3 ? x0 + tableW : colX(c);
    const v = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, vx - 1, blocoY, 1, tY + linhas.length * rowH - blocoY);
    v.getFill().setSolidFill(DS.colors.lines); v.getBorder().setTransparent();
  });

  Logger.log('Slide DRE (' + modo + ') gerado: ' + d.rubricas.length + ' rubrica(s), mês ' + d.mesLabel + '.');
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// DRE avulso — só a versão Realizado + Ritmo (a que entra na apresentação
// completa). Gera direto na apresentação da cidade, sem rodar o resto do
// fluxo.
function gerarSoDRECuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideDREComRitmo(); }
function gerarSoDREItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideDREComRitmo(); }
function gerarSoDREEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideDREComRitmo(); }
