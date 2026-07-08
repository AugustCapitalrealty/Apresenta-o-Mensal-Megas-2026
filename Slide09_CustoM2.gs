// ==========================================
// ARQUIVO: Slide09_CustoM2.gs
// SLIDE 09 — CUSTO DO M² (COMPLETO)
// Dados: obterDadosCustoM2() em 02_Dados.gs
// ==========================================

function gerarSlideCustoM2() {
  const dados = obterDadosCustoM2();
  if (!dados) {
    Logger.log('Sem dados para o Slide 09 (Custo do M²).');
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  criarHeaderPadrao(slide, 'CUSTO DO M²', 'Monitoramento de Custo');

  const marginX = 30;
  const topY    = 85;
  const gap     = 14;
  const kpiH    = 72;
  const tableH  = pageH - topY - kpiH - gap - 18;

  _custoDesenharKPIs  (slide, marginX, topY,              pageW - 2 * marginX, kpiH,   dados);
  _custoDesenharTabela(slide, marginX, topY + kpiH + gap, pageW - 2 * marginX, tableH, dados);

  Logger.log('Slide 09 (Custo do M²) gerado → ' + dados.referencia.mesExtenso + ' ' + dados.referencia.ano);
}


// ==========================================
// COMPONENTE: CARDS DE KPI
// ==========================================
function _custoDesenharKPIs(slide, x, y, w, h, dados) {
  const gap   = 18;
  const cardW = (w - 2 * gap) / 3;
  const k     = dados.kpis;

  const kpis = [
    { label: 'CUSTO (R$/m²)', valor: formatarMoedaSlide(k.custo),    cor: CORES.darkBlue,   strip: CORES.lightBlue },
    { label: 'META ORÇADA',   valor: formatarMoedaSlide(k.meta),     cor: CORES.textGray,   strip: '#94A3B8'       },
    { label: k.status,        valor: formatarMoedaSlide(k.variacao), cor: k.corStatus,      strip: k.corStatus     }
  ];

  kpis.forEach((kpi, i) => {
    const cx = x + i * (cardW + gap);

    // sombra
    const sombra = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx + 3, y + 3, cardW, h);
    sombra.getFill().setSolidFill(CORES.shadow); sombra.getBorder().setTransparent(); sombra.sendToBack();

    // fundo
    const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y, cardW, h);
    bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

    // franja lateral
    const strip = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y + 8, 4, h - 16);
    strip.getFill().setSolidFill(kpi.strip); strip.getBorder().setTransparent();

    const _t = (txt, tx, ty, tw, th, size, bold, cor, align) => {
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, ty, tw, th);
      const t = b.getText();
      t.setText(txt).getTextStyle().setFontSize(size).setBold(!!bold)
        .setForegroundColor(cor).setFontFamily('Montserrat');
      if (align === 'C') t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      return b;
    };

    _t(kpi.label, cx + 18, y + 8,  cardW - 26, 16, 8,  true,  CORES.textGray, '');
    _t(kpi.valor, cx + 18, y + 26, cardW - 26, 34, 22, true,  kpi.cor,        '');
  });
}


// ==========================================
// COMPONENTE: TABELA DE DETALHAMENTO
// ==========================================
function _custoDesenharTabela(slide, x, y, w, h, dados) {
  // Card de fundo
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  // Título
  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 16, y + 8, w - 32, 18);
  title.getText().setText('DETALHAMENTO MENSAL (TABELA)')
    .getTextStyle().setFontSize(9).setBold(true)
    .setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');

  // ── Montar colunas (remove "Ano" se existir) ──────────────────────────────
  let meses  = [...dados.meses];
  const tabela = {};
  for (const k in dados.tabela) { tabela[k] = [...dados.tabela[k]]; }

  const idxAno = meses.findIndex(m => m.toLowerCase().trim() === 'ano');
  if (idxAno !== -1) {
    meses.splice(idxAno, 1);
    for (const k in tabela) { tabela[k].splice(idxAno, 1); }
  }

  // ── IPTU/m² = Real − Real sem IPTU ───────────────────────────────────────
  const parseNum = v => {
    if (v === null || v === undefined || v === '') return NaN;
    return typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  };
  const keySemIptu = Object.keys(tabela).find(k => k.toLowerCase().includes('sem iptu'));
  if (keySemIptu) {
    const ano     = (keySemIptu.match(/\d{4}/) || [''])[0];
    const keyReal = Object.keys(tabela).find(
      k => k.toLowerCase().includes('real') && !k.toLowerCase().includes('sem iptu') && (!ano || k.includes(ano))
    );
    if (keyReal) {
      const iptuRow = [];
      let temIptu = false;
      meses.forEach((_, i) => {
        const diff = parseNum(tabela[keyReal][i]) - parseNum(tabela[keySemIptu][i]);
        if (!isNaN(diff) && diff > 0.005) { iptuRow.push(diff); temIptu = true; }
        else iptuRow.push(null);
      });
      if (temIptu) tabela['IPTU/m²'] = iptuRow;
    }
  }

  const linhas  = Object.keys(tabela);
  const mesRef  = dados.referencia.index;   // índice do mês atual (já sem "Ano")

  // ── Dimensões ─────────────────────────────────────────────────────────────
  const areaX  = x + 10;
  const areaY  = y + 32;
  const areaW  = w - 20;
  const areaH  = h - 42;
  const labelW = 120;
  const mediaW = 52;
  const useW   = areaW - labelW - mediaW - 14;
  const monthW = useW / (meses.length || 12);
  const rowH   = Math.min(26, Math.floor((areaH - 30) / Math.max(linhas.length, 1)));
  const startX = areaX + 5;
  const startY = areaY + 8;

  // Moldura da área
  const moldura = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX, areaY, areaW, areaH);
  moldura.getFill().setSolidFill('#F8FAFC'); moldura.getBorder().setTransparent();

  // ── Destaque vertical do mês de referência ────────────────────────────────
  if (mesRef >= 0 && mesRef < meses.length) {
    const hx = startX + labelW + mesRef * monthW;
    const hl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, hx, areaY, monthW - 1, areaH);
    hl.getFill().setSolidFill('#EFF6FF'); hl.getBorder().setTransparent();
  }

  // ── Cabeçalho dos meses ───────────────────────────────────────────────────
  meses.forEach((mes, i) => {
    const cellX  = startX + labelW + i * monthW;
    const isRef  = i === mesRef;
    const corBg  = isRef ? CORES.darkBlue : CORES.lightBlue;

    const head = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cellX, startY, monthW - 1, 20);
    head.getFill().setSolidFill(corBg); head.getBorder().setTransparent();

    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cellX, startY + 1, monthW - 1, 18);
    txt.getText().setText(mes).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Cabeçalho "Média"
  const mediaX = startX + labelW + meses.length * monthW + 5;
  const mHead  = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mediaX, startY, mediaW, 20);
  mHead.getFill().setSolidFill(CORES.darkBlue); mHead.getBorder().setTransparent();
  const mTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mediaX, startY + 1, mediaW, 18);
  mTxt.getText().setText('Média').getTextStyle()
    .setFontSize(7.5).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
  mTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  mTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // ── Linhas de dados ───────────────────────────────────────────────────────
  linhas.forEach((label, r) => {
    const rowY   = startY + 28 + r * rowH;
    const valores = tabela[label] || [];
    const isIptu  = label === 'IPTU/m²';

    // Zebrado
    if (r % 2 === 0) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX + 2, rowY - 1, areaW - 4, rowH);
      z.getFill().setSolidFill(CORES.white); z.getBorder().setTransparent();
    }

    // Label
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, startX + 4, rowY, labelW - 10, rowH);
    lab.getText().setText(label).getTextStyle()
      .setFontSize(7.5).setBold(!isIptu).setItalic(isIptu)
      .setForegroundColor(isIptu ? CORES.textGray : '#111827').setFontFamily('Montserrat');
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Células por mês
    valores.forEach((v, i) => {
      const cellX = startX + labelW + i * monthW;
      const isRef = i === mesRef;

      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cellX, rowY, monthW - 1, rowH);
      txt.getText().setText(formatarNumeroTabela(v)).getTextStyle()
        .setFontSize(7.5).setBold(isRef)
        .setForegroundColor(isRef ? CORES.darkBlue : '#374151').setFontFamily('Montserrat');
      txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    });

    // Média
    const media = _calcularMedia(valores);
    const mBox  = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mediaX, rowY, mediaW, rowH);
    mBox.getText().setText(formatarNumeroTabela(media)).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');
    mBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    mBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Linha separadora debaixo do cabeçalho
  const sep = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX, startY + 20, areaW, 1);
  sep.getFill().setSolidFill(CORES.lineSeparator); sep.getBorder().setTransparent();
}


// ==========================================
// HELPERS
// ==========================================
function formatarMoedaSlide(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

function formatarNumeroTabela(valor) {
  if (valor === null || valor === undefined || valor === '') return ' ';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return ' ';
  return num.toFixed(2).replace('.', ',');
}

function _calcularMedia(arr) {
  const nums = (arr || []).map(v => {
    if (v === null || v === undefined || v === '') return NaN;
    return typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  }).filter(v => !isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
