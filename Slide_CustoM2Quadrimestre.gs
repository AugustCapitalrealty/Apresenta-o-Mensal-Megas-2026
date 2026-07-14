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
