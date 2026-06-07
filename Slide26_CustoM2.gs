// ==========================================
// SLIDE 26: CUSTO DO M² (COMPLETO)
// ==========================================
// obterDadosCustoM2() está no arquivo Dados.gs
// ==========================================


// ==========================================
// SLIDE 26: gerarSlideCustoM2
// ==========================================
function gerarSlideCustoM2() {
  const dados = obterDadosCustoM2();

  if (!dados) {
    Logger.log('Sem dados para o Slide 26 (Custo do M²).');
    return;
  }

  const deck  = SlidesApp.getActivePresentation();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  const subtitulo = dados.referencia.cidade
    ? 'Monitoramento de Custo - ' + dados.referencia.mesExtenso + ' ' + dados.referencia.ano +
      ' | ' + dados.referencia.cidade
    : 'Monitoramento de Custo - ' + dados.referencia.mesExtenso + ' ' + dados.referencia.ano;

  criarHeaderPadrao(slide, 'CUSTO DO M²', subtitulo);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const idx = dados.referencia.index || 0;

  const parseSafe = val => {
    if (val === null || val === undefined || val === '') return NaN;
    if (typeof val === 'number') return val;
    return Number(String(val).replace(',', '.'));
  };

  const keyOrc  = Object.keys(dados.tabela).find(
    k => k.toLowerCase().includes('orç') || k.toLowerCase().includes('orc')
  );
  const keyReal = Object.keys(dados.tabela).find(
    k => k.toLowerCase().includes('real') && !k.toLowerCase().includes('sem iptu')
  );

  const valOrc  = (keyOrc  && dados.tabela[keyOrc])  ? parseSafe(dados.tabela[keyOrc][idx])  : NaN;
  const valReal = (keyReal && dados.tabela[keyReal])  ? parseSafe(dados.tabela[keyReal][idx]) : NaN;

  const diff        = valOrc - valReal;
  const isFavoravel = diff >= 0;

  dados.kpis = {
    custo    : isNaN(valReal) ? null : valReal,
    meta     : isNaN(valOrc)  ? null : valOrc,
    variacao : isNaN(diff)    ? null : Math.abs(diff),
    status   : isNaN(diff)    ? 'VARIAÇÃO'
             : isFavoravel    ? 'ABAIXO DO ORÇADO'
             :                  'ACIMA DO ORÇADO',
    corStatus: isNaN(diff)    ? CORES.textGray
             : isFavoravel    ? '#10B981'
             :                  '#EF4444'
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const marginX      = 30;
  const topY         = 85;
  const gap          = 15;
  const bottomMargin = 20;
  const totalH       = pageH - topY - bottomMargin;
  const kpiH         = 70;
  const tableH       = totalH - kpiH - gap;

  desenharKPIsCustoM2(slide, marginX, topY, pageW - (2 * marginX), kpiH, dados);
  desenharTabelaCustoM2(slide, marginX, topY + kpiH + gap, pageW - (2 * marginX), tableH, dados);

  Logger.log('Slide 26 (Custo do M²) gerado → ' + subtitulo);
}


// ==========================================
// COMPONENTE: CARDS DE KPI
// ==========================================
function desenharKPIsCustoM2(slide, x, y, containerW, h, dados) {
  const gap   = 20;
  const cardW = (containerW - (2 * gap)) / 3;

  const kpis = [
    { label: 'CUSTO (R$/m²)', valor: formatarMoedaSlide(dados.kpis.custo),    cor: CORES.darkBlue      },
    { label: 'META ORÇADA',   valor: formatarMoedaSlide(dados.kpis.meta),     cor: CORES.textGray      },
    { label: dados.kpis.status, valor: formatarMoedaSlide(dados.kpis.variacao), cor: dados.kpis.corStatus }
  ];

  kpis.forEach((kpi, i) => {
    const cx = x + (i * (cardW + gap));

    const sombra = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx + 3, y + 3, cardW, h);
    sombra.getFill().setSolidFill(CORES.shadow);
    sombra.getBorder().setTransparent();
    sombra.sendToBack();

    const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y, cardW, h);
    bg.getFill().setSolidFill(CORES.white);
    bg.getBorder().setTransparent();

    const strip = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y + 8, 4, h - 16);
    strip.getFill().setSolidFill(kpi.cor);
    strip.getBorder().setTransparent();

    const lbl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 18, y + 10, cardW - 30, 20);
    lbl.getText().setText(kpi.label)
      .getTextStyle().setFontSize(9).setBold(true)
      .setForegroundColor(CORES.textGray).setFontFamily('Montserrat');

    const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 18, y + 30, cardW - 30, 30);
    val.getText().setText(kpi.valor)
      .getTextStyle().setFontSize(18).setBold(true)
      .setForegroundColor(kpi.cor).setFontFamily('Montserrat');
    val.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
}


// ==========================================
// COMPONENTE: TABELA DE DETALHAMENTO
// ==========================================
function desenharTabelaCustoM2(slide, x, y, w, h, dados) {

  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white);
  bg.getBorder().setTransparent();

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, y + 8, w - 40, 20);
  title.getText().setText('DETALHAMENTO MENSAL (CUSTO R$/m²)')
    .getTextStyle().setFontSize(10).setBold(true)
    .setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');

  // ── Remover coluna "Ano" da tabela visual ─────────────────────────────────
  let meses  = [...dados.meses];
  let tabela = {};
  for (let k in dados.tabela) { tabela[k] = [...dados.tabela[k]]; }

  const idxAno = meses.findIndex(m => m.toLowerCase().trim() === 'ano');
  if (idxAno !== -1) {
    meses.splice(idxAno, 1);
    for (let k in tabela) { tabela[k].splice(idxAno, 1); }
  }

  // ── Calcular IPTU/m² = Real − Real sem IPTU ───────────────────────────────
  const parseNum = val => {
    if (val === null || val === undefined || val === '') return NaN;
    return typeof val === 'number' ? val : Number(String(val).replace(',', '.'));
  };

  const keySemIptu = Object.keys(tabela).find(k => k.toLowerCase().includes('sem iptu'));

  if (keySemIptu && tabela[keySemIptu]) {
    const anoMatch = keySemIptu.match(/\d{4}/);
    const ano      = anoMatch ? anoMatch[0] : '';
    const keyReal  = Object.keys(tabela).find(
      k => k.toLowerCase().includes('real') &&
           !k.toLowerCase().includes('sem iptu') &&
           (ano === '' || k.includes(ano))
    );

    if (keyReal && tabela[keyReal]) {
      const iptuRow = [];
      let   temIptu = false;
      for (let i = 0; i < meses.length; i++) {
        const valReal    = parseNum(tabela[keyReal][i]);
        const valSemIptu = parseNum(tabela[keySemIptu][i]);
        if (!isNaN(valReal) && !isNaN(valSemIptu)) {
          const diff = valReal - valSemIptu;
          if (diff > 0.01) { iptuRow.push(diff); temIptu = true; }
          else             { iptuRow.push(null); }
        } else {
          iptuRow.push(null);
        }
      }
      if (temIptu) tabela['IPTU/m²'] = iptuRow;
    }
  }

  // ── TODAS as linhas, sem filtro e sem limite ───────────────────────────────
  const linhas = Object.keys(tabela);

  // ── Dimensões ─────────────────────────────────────────────────────────────
  const areaX = x + 10;
  const areaY = y + 35;
  const areaW = w - 20;
  const areaH = h - 50;

  const moldura = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX, areaY, areaW, areaH);
  moldura.getFill().setSolidFill('#FFFFFF');
  moldura.getBorder()
    .setDashStyle(SlidesApp.DashStyle.DASH)
    .setWeight(1)
    .getLineFill().setSolidFill('#CBD5E1');

  const labelW   = 115;
  const mediaW   = 55;
  const monthGap = 1;
  const usableW  = areaW - labelW - mediaW - 10;
  const monthW   = usableW / (meses.length || 12);
  const rowH     = Math.min(28, Math.floor((areaH - 55) / (linhas.length || 1)));
  const startX   = areaX + 5;
  const startY   = areaY + 18;

  // ── Cabeçalho dos meses ───────────────────────────────────────────────────
  meses.forEach((mes, i) => {
    const cellX = startX + labelW + (i * monthW);

    const head = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cellX, startY, monthW - monthGap, 20);
    head.getFill().setSolidFill(CORES.lightBlue);
    head.getBorder().setTransparent();

    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cellX, startY + 1, monthW - monthGap, 18);
    txt.getText().setText(mes)
      .getTextStyle().setFontSize(8).setBold(true)
      .setForegroundColor(CORES.white).setFontFamily('Montserrat');
    txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Cabeçalho "Média"
  const mediaX    = startX + labelW + (meses.length * monthW) + 5;
  const mediaHead = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mediaX, startY, mediaW, 20);
  mediaHead.getFill().setSolidFill(CORES.lightBlue);
  mediaHead.getBorder().setTransparent();

  const mediaTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mediaX, startY + 1, mediaW, 18);
  mediaTxt.getText().setText('Média')
    .getTextStyle().setFontSize(8).setBold(true)
    .setForegroundColor(CORES.white).setFontFamily('Montserrat');
  mediaTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  mediaTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // ── Linhas de dados ───────────────────────────────────────────────────────
  linhas.forEach((label, r) => {
    const rowY   = startY + 28 + (r * rowH);
    const valores = tabela[label];

    // Zebrado
    if (r % 2 === 0) {
      const zebra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX + 2, rowY - 2, areaW - 4, rowH);
      zebra.getFill().setSolidFill('#F8FAFC');
      zebra.getBorder().setTransparent();
    }

    // Label
    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, startX, rowY, labelW - 5, rowH);
    lab.getText().setText(label)
      .getTextStyle().setFontSize(8).setBold(true)
      .setForegroundColor('#111827').setFontFamily('Montserrat');
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Células de valor por mês
    valores.forEach((v, i) => {
      const cellX = startX + labelW + (i * monthW);

      const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cellX, rowY, monthW - monthGap, rowH);
      txt.getText().setText(formatarNumeroTabela(v))
        .getTextStyle().setFontSize(8)
        .setForegroundColor('#111827').setFontFamily('Montserrat');
      txt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      txt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

      // Destaque no mês de referência
      if (i === dados.referencia.index) {
        const destaque = slide.insertShape(
          SlidesApp.ShapeType.RECTANGLE,
          cellX - 1, rowY - 2,
          monthW - monthGap + 2, rowH + 2
        );
        destaque.getFill().setTransparent();
        destaque.getBorder().setWeight(2).getLineFill().setSolidFill('#EF4444');
      }
    });

    // Média
    const media    = calcularMediaSlide(valores);
    const mediaBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mediaX, rowY, mediaW, rowH);
    mediaBox.getText().setText(formatarNumeroTabela(media))
      .getTextStyle().setFontSize(8).setBold(true)
      .setForegroundColor('#111827').setFontFamily('Montserrat');
    mediaBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    mediaBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
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

function calcularMediaSlide(arr) {
  const nums = arr
    .map(v => {
      if (v === null || v === undefined || v === '') return NaN;
      return typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    })
    .filter(v => !isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
