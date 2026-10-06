/**
 * ARQUIVO: 22_Slide_CustoM2.gs
 * SEÇÃO:   SLIDES — Custo do m² (Mensal e 1º Quadrimestre)
 * DESCRIÇÃO: Indicador de Custo por Metro Quadrado mensal com tabela de
 *            rubricas detalhadas e recorte analítico do 1º Quadrimestre.
 */

// ==========================================
// CUSTO DO M² — MENSAL
// ==========================================
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
  const ref = obterMesReferencia_();
  criarHeaderPadrao(slide, 'CUSTO DO M²', getProjetoAtivo().nome + ' — Monitoramento de Custo · Mês: ' + ref.siglaAno);

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

  // Card KPI padrão do design system (01_Config.gs)
  kpis.forEach((kpi, i) => {
    const cx = x + i * (cardW + gap);
    criarCardKPI(slide, cx, y, cardW, h, {
      label: kpi.label, valor: kpi.valor, cor: kpi.strip, corValor: kpi.cor
    });
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

  // Remove linhas sem nenhum valor numérico (sobras de formatação da planilha)
  const linhas = Object.keys(tabela).filter(k =>
    (tabela[k] || []).some(v => v !== '' && v !== null && v !== undefined && !isNaN(parseNum(v)))
  );
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
// Sempre com separador de milhar (1.000, 100.000, 1.000.000...) — pedido da
// diretoria para facilitar a leitura de qualquer valor em R$ no deck.
function formatarMoedaSlide(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Mesma formatação, mas sem casas decimais — usada em metas com valores na
// casa dos milhares (Cumprir Orçamento), onde o centavo é ruído.
function formatarMoedaSlideSemCentavos_(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return '-';
  return 'R$ ' + Math.round(num).toLocaleString('pt-BR');
}

function formatarNumeroTabela(valor) {
  if (valor === null || valor === undefined || valor === '') return ' ';
  const num = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (isNaN(num)) return ' ';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function _calcularMedia(arr) {
  const nums = (arr || []).map(v => {
    if (v === null || v === undefined || v === '') return NaN;
    return typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  }).filter(v => !isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Gera o slide de Custo do M² no empreendimento ativo
function gerarSoCustoM2(cidade) {
  if (cidade) setProjetoAtivo(cidade);
  gerarSlideCustoM2();
}

function gerarSoCustoM2Curitiba() { setProjetoAtivo('CURITIBA'); gerarSlideCustoM2(); }
function gerarSoCustoM2Itajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCustoM2(); }
function gerarSoCustoM2Esteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCustoM2(); }

// Gera em todas as apresentações dos Megas de uma vez
function gerarSoCustoM2TodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => {
    setProjetoAtivo(c);
    gerarSlideCustoM2();
  });
}

// ==========================================
// CUSTO DO M² — 1º QUADRIMESTRE (JAN-ABR)
// ==========================================
/**
 * ARQUIVO: Slide_CustoM2Quadrimestre.gs
 * SLIDE — CUSTO DO M² · 1º QUADRIMESTRE 2026 (Janeiro a Abril)
 * DESCRIÇÃO: Slide avulso — não entra na geração mensal automática
 * (00_Main.gs), porque é um recorte de PERÍODO FIXO (Jan–Abr), diferente do
 * slide de Custo M² normal que segue o mês de referência corrente.
 *
 * Dados: obterDadosCustoM2Quadrimestre_() em 02_Dados.gs — lê a mesma aba
 * METRO QUADRADO do Custo M² mensal, mas soma/calcula só os 4 primeiros
 * meses do ano. Valor do quadrimestre = MÉDIA dos 4 meses (mesma regra do
 * acumulado anual).
 *
 * Para gerar: setProjetoAtivo('CURITIBA' | 'ITAJAI' | 'ESTEIO') e rodar
 * gerarSlideCustoM2Quadrimestre().
 */

function gerarSlideCustoM2Quadrimestre() {
  const dados = obterDadosCustoM2Quadrimestre_();
  if (!dados) {
    Logger.log('Sem dados para o Slide Custo M² — 1º Quadrimestre.');
    return;
  }

  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);

  const pageW = deck.getPageWidth();
  const pageH = deck.getPageHeight();

  criarHeaderPadrao(slide, 'CUSTO DO M² — 1º QUADRIMESTRE',
    'Janeiro a Abril / ' + dados.ano + ' · ' + dados.cidade);
  _custoQuadDesenharLogosParceiras(slide, pageW);

  const marginX = 30;
  const topY    = 85;
  const gap     = 14;
  const kpiH    = 72;
  const tableH  = pageH - topY - kpiH - gap - 18;

  _custoQuadDesenharKPIs  (slide, marginX, topY,              pageW - 2 * marginX, kpiH,   dados);
  _custoQuadDesenharTabela(slide, marginX, topY + kpiH + gap, pageW - 2 * marginX, tableH, dados);

  Logger.log('Slide Custo M² — 1º Quadrimestre gerado → ' + dados.cidade + ' ' + dados.ano);
}


// ==========================================
// LOGOS PARCEIRAS NO CABEÇALHO (logo do Mega + marca-mãe quando não é a
// Capital Realty — ex.: Mega Curitiba pertence à Demercado). Desenhadas à
// esquerda do logo da Capital Realty que o cabeçalho padrão já coloca.
// Graceful: se algum ID faltar ou não carregar, simplesmente não desenha.
// ==========================================
function _custoQuadDesenharLogosParceiras(slide, pageW) {
  const DS = CR_DESIGN_SYSTEM;
  const mX = DS.layout.marginX;
  const proj = getProjetoAtivo();

  const logoW = 58, logoH = 26, gap = 10, y = 17;
  let xDireita = pageW - mX - DS.assets.logoW - gap;   // início logo à esq. da Capital Realty

  const desenhar = id => {
    if (!id) return;
    try {
      const blob = DriveApp.getFileById(id).getBlob();
      const x = xDireita - logoW;
      slide.insertImage(blob, x, y, logoW, logoH);
      xDireita = x - gap;
    } catch (e) {
      Logger.log('Aviso (logo parceira): não carregado (' + id + '). ' + e.message);
    }
  };

  desenhar(proj.unitLogoId);       // logo do próprio Mega
  desenhar(proj.coBrandLogoId);    // marca-mãe (só quando ≠ Capital Realty)
}


// ==========================================
// COMPONENTE: CARDS DE KPI (médias do quadrimestre)
// ==========================================
function _custoQuadDesenharKPIs(slide, x, y, w, h, dados) {
  const gap   = 18;
  const cardW = (w - 2 * gap) / 3;
  const q     = dados.quadrimestre;

  const kpis = [
    { label: 'CUSTO MÉDIO (R$/m²)', valor: formatarMoedaSlide(q.real), cor: CORES.darkBlue, strip: CORES.lightBlue },
    { label: 'META ORÇADA (R$/m²)', valor: formatarMoedaSlide(q.orc),  cor: CORES.textGray,  strip: '#94A3B8'       },
    { label: q.status,              valor: formatarMoedaSlide(q.variacao == null ? null : Math.abs(q.variacao)),
      cor: q.corStatus, strip: q.corStatus }
  ];

  // Card KPI padrão do design system (01_Config.gs)
  kpis.forEach((kpi, i) => {
    const cx = x + i * (cardW + gap);
    criarCardKPI(slide, cx, y, cardW, h, {
      label: kpi.label, valor: kpi.valor, cor: kpi.strip, corValor: kpi.cor
    });
  });
}


// ==========================================
// COMPONENTE: TABELA JAN–ABR + LINHA DO QUADRIMESTRE
// ==========================================
function _custoQuadDesenharTabela(slide, x, y, w, h, dados) {
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(CORES.white); bg.getBorder().setTransparent();

  const title = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 16, y + 8, w - 32, 18);
  title.getText().setText('DETALHAMENTO MENSAL — R$/m² (ORÇADO x REALIZADO)')
    .getTextStyle().setFontSize(9).setBold(true)
    .setForegroundColor(CORES.darkBlue).setFontFamily('Montserrat');

  const areaX = x + 16, areaY = y + 34, areaW = w - 32, areaH = h - 46;

  const cols = [
    { label: 'MÊS',       w: 0.28 },
    { label: 'ORÇADO',    w: 0.24 },
    { label: 'REALIZADO', w: 0.24 },
    { label: 'VARIAÇÃO',  w: 0.24 }
  ];
  let acc = areaX;
  const colX = cols.map(c => { const cx = acc; acc += areaW * c.w; return cx; });

  const linhas = dados.meses.map(m => ({
    label: m.nome, orc: m.orc, real: m.real, variacao: m.variacao, destaque: false
  }));
  linhas.push({
    label: '1º QUADRIMESTRE (MÉDIA)',
    orc: dados.quadrimestre.orc, real: dados.quadrimestre.real, variacao: dados.quadrimestre.variacao,
    destaque: true
  });

  // Cabeçalho
  const headH = 22;
  cols.forEach((c, i) => {
    const head = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, colX[i], areaY, areaW * c.w - 1, headH);
    head.getFill().setSolidFill(CORES.darkBlue); head.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX[i] + (i === 0 ? 6 : 0), areaY, areaW * c.w - (i === 0 ? 10 : 1), headH);
    t.getText().setText(c.label).getTextStyle()
      .setFontSize(8).setBold(true).setForegroundColor(CORES.white).setFontFamily('Montserrat');
    t.getText().getParagraphStyle().setParagraphAlignment(i === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  // Linhas (Jan, Fev, Mar, Abr + Quadrimestre em destaque)
  const rowH = Math.min(44, Math.floor((areaH - headH - 6) / linhas.length));
  linhas.forEach((l, r) => {
    const rowY  = areaY + headH + 6 + r * rowH;
    const corTxt = l.destaque ? CORES.white : '#111827';

    if (l.destaque) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX, rowY, areaW, rowH);
      z.getFill().setSolidFill(CORES.darkBlue); z.getBorder().setTransparent();
    } else if (r % 2 !== 0) {
      const z = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, areaX, rowY, areaW, rowH);
      z.getFill().setSolidFill('#F8FAFC'); z.getBorder().setTransparent();
    }

    const lab = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX[0] + 6, rowY, areaW * cols[0].w - 10, rowH);
    lab.getText().setText(l.label).getTextStyle()
      .setFontSize(l.destaque ? 9 : 8.5).setBold(true)
      .setForegroundColor(corTxt).setFontFamily('Montserrat');
    lab.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    const _cel = (colIdx, texto, cor) => {
      const cel = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX[colIdx], rowY, areaW * cols[colIdx].w - 1, rowH);
      cel.getText().setText(texto).getTextStyle()
        .setFontSize(l.destaque ? 9 : 8.5).setBold(l.destaque)
        .setForegroundColor(cor).setFontFamily('Montserrat');
      cel.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      cel.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    };

    _cel(1, formatarNumeroTabela(l.orc),  corTxt);
    _cel(2, formatarNumeroTabela(l.real), corTxt);

    const corVar   = l.destaque || l.variacao == null ? corTxt : (l.variacao <= 0 ? '#00B050' : '#D32F2F');
    const sinalVar = l.variacao == null ? '' : (l.variacao > 0 ? '+' : (l.variacao < 0 ? '−' : ''));
    const txtVar   = l.variacao == null ? ' ' : sinalVar + formatarNumeroTabela(Math.abs(l.variacao));
    _cel(3, txtVar, corVar);
  });
}


// ==========================================
// PONTOS DE ENTRADA — SLIDE AVULSO
// ==========================================
// Custo do M² do 1º Quadrimestre (Jan-Abr/2026). Não entra na geração
// mensal automática (é um recorte de período fixo, não do mês de
// referência corrente). Troque a cidade e rode a função correspondente.
function gerarSoCustoM2QuadrimestreCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideCustoM2Quadrimestre(); }
function gerarSoCustoM2QuadrimestreItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideCustoM2Quadrimestre(); }
function gerarSoCustoM2QuadrimestreEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideCustoM2Quadrimestre(); }

// Ponto de entrada avulso para todas as cidades — 1º Quadrimestre
function gerarSoCustoM2QuadrimestreTodosOsMegas() {
  ['CURITIBA', 'ITAJAI', 'ESTEIO'].forEach(c => { setProjetoAtivo(c); gerarSlideCustoM2Quadrimestre(); });
}
