/**
 * ARQUIVO: Slide08_DeckCompleto.gs
 * SLIDES COMPLEMENTARES — deck de 55 páginas da reunião de resultados.
 *
 * Os pontos de entrada abaixo são finos: leitura em
 * 03_DadosDeckCompleto.gs e desenho concentrado em helpers _dc*. Isso deixa
 * capas, tabelas e gráficos consistentes e permite reutilizar o mesmo modelo
 * para Demercado, Capital Realty, Deminvest e Estacionamentos.
 */

function _dcReferencia_() {
  const r = obterMesReferencia_();
  return { mes: r.curto, ano: r.ano, texto: r.curto + '/' + r.ano };
}

function _dcNovoSlide_(titulo, entidade, subtitulo) {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), DS = CR_DESIGN_SYSTEM;
  const m = W * .035, ref = _dcReferencia_();
  slide.getBackground().setSolidFill('#FFFFFF');
  const marca = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W * .68, -H * .40, W * .54, W * .54);
  marca.getFill().setSolidFill(DS.colors.brandLight, .045); marca.getBorder().setTransparent();
  _rrUmaLinha_(slide, m, H * .035, W * .70, H * .055, entidade || 'Indicadores Financeiros',
    { fs: W * .014, bold: true, cor: DS.colors.brandMed, align: 'L', folga: 0 });
  _rrUmaLinha_(slide, m, H * .086, W * .72, H * .068, titulo + ' — ' + ref.texto,
    { fs: W * .025, bold: true, cor: DS.colors.textMain, align: 'L', folga: 0 });
  if (subtitulo) _rrUmaLinha_(slide, m, H * .151, W * .72, H * .035, subtitulo,
    { fs: W * .0105, cor: DS.colors.textBody, fonte: DS.typography.body, align: 'L', folga: 0 });
  _dcLogoRodape_({ slide: slide, W: W, H: H, DS: DS, m: m });
  return { deck: deck, slide: slide, W: W, H: H, DS: DS, m: m };
}

function _dcLogoRodape_(c) {
  const y = c.H * .94;
  const linha = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, c.m, y, c.W - c.m * 2, .8);
  linha.getFill().setSolidFill(c.DS.colors.lines); linha.getBorder().setTransparent();
  try {
    c.slide.insertImage(DriveApp.getFileById(c.DS.assets.logoId).getBlob(),
      c.W - c.m - c.DS.assets.logoW * .70, y + 4, c.DS.assets.logoW * .70, c.DS.assets.logoH * .70);
  } catch (e) { Logger.log('Deck completo: logo não carregado. ' + e.message); }
}

function _dcGerarCapaSecao_(titulo, linha2, overline) {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), DS = CR_DESIGN_SYSTEM, ref = _dcReferencia_();
  _capaFundo_(slide, W, H);
  _capaWordmark_(slide, 42, 30, { h: 28 });
  _rrUmaLinha_(slide, 48, H * .37, W * .72, H * .045, _capaEspacado_(overline || 'Resultados Financeiros'),
    { fs: 8, bold: true, cor: '#60A5FA', align: 'L', folga: 0 });
  _rrBloco_(slide, 44, H * .42, W * .72, H * .23, titulo,
    { fs: 32, minFs: 20, bold: true, cor: '#FFFFFF', align: 'L', folga: 0 });
  if (linha2) _rrUmaLinha_(slide, 48, H * .67, W * .70, H * .055, linha2,
    { fs: 16, bold: true, cor: '#93C5FD', align: 'L', folga: 0 });
  _capaRodape_(slide, W, H, ref.texto.toUpperCase(), 'Expandir Eficiência');
}

function _dcPrepararTabela_(matriz, maxLinhas, maxColunas) {
  let m = (matriz || []).map(r => r.slice());
  while (m.length && m[0].filter(v => String(v || '').trim()).length <= 1) m.shift();
  while (m.length > 1) {
    const n0 = m[0].filter(v => String(v || '').trim()).length;
    const n1 = m[1].filter(v => String(v || '').trim()).length;
    if (n0 <= 2 && n1 >= 3 && n1 > n0) m.shift();
    else break;
  }
  while (m.length && m[m.length - 1].every(v => !String(v || '').trim())) m.pop();
  if (!m.length) return [['Dados não localizados']];
  let ultima = 0;
  m.forEach(r => r.forEach((v, c) => { if (String(v || '').trim()) ultima = Math.max(ultima, c); }));
  m = m.map(r => r.slice(0, Math.min(ultima + 1, maxColunas || 12)));
  if (m.length > (maxLinhas || 22)) {
    const limite = maxLinhas || 22;
    m = m.slice(0, limite - 1).concat([['…', 'Demais linhas permanecem na planilha de origem']]);
  }
  const largura = Math.max.apply(null, m.map(r => r.length));
  return m.map(r => r.concat(Array(Math.max(0, largura - r.length)).fill('')));
}

function _dcDesenharTabela_(c, matriz, op) {
  op = op || {};
  const m = _dcPrepararTabela_(matriz, op.maxLinhas || 22, op.maxColunas || 12);
  const x = op.x == null ? c.m : op.x, y = op.y == null ? c.H * .21 : op.y;
  const w = op.w == null ? c.W - c.m * 2 : op.w, h = op.h == null ? c.H * .69 : op.h;
  const table = c.slide.insertTable(m.length, m[0].length, x, y, w, h);
  const fs = Math.max(5.5, Math.min(9.5, (op.fs || c.W * .0105) * Math.min(1, 10 / m[0].length)));
  m.forEach((row, r) => row.forEach((valor, col) => {
    const cell = table.getCell(r, col), texto = String(valor == null ? '' : valor);
    const norm = _dcNorm_(row.join(' '));
    const header = r === 0 || /ofensores|defensores/.test(norm);
    const total = /^total\b/.test(_dcNorm_(row[0]));
    cell.getText().setText(texto);
    cell.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    cell.getFill().setSolidFill(header ? c.DS.colors.brandDark :
      (total ? '#DBEAFE' : (r % 2 ? '#F8FAFC' : '#FFFFFF')));
    cell.getText().getTextStyle().setFontFamily(c.DS.typography.body).setFontSize(fs)
      .setBold(header || total || col === 0)
      .setForegroundColor(header ? '#FFFFFF' : c.DS.colors.textMain);
    cell.getText().getParagraphStyle().setParagraphAlignment(col === 0 ?
      SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
  }));
  return table;
}

function _dcDesenharTabelaDupla_(c, matriz) {
  const m = _dcPrepararTabela_(matriz, 44, 9);
  let corte = m.findIndex((r, i) => i > 0 && _dcNorm_(r.join(' ')).indexOf('defensores') >= 0);
  let esquerda, direita;
  if (corte > 0) {
    esquerda = m.slice(0, corte);
    direita = m.slice(corte);
  } else {
    const cab = m[0], meio = Math.ceil((m.length - 1) / 2);
    esquerda = [cab].concat(m.slice(1, meio + 1));
    direita = [cab].concat(m.slice(meio + 1));
  }
  _dcDesenharTabela_(c, esquerda, { x: c.m, y: c.H * .21, w: c.W * .445, h: c.H * .69,
    maxLinhas: 23, maxColunas: 8, fs: 7.2 });
  _dcDesenharTabela_(c, direita.length > 1 ? direita : [['Sem segundo bloco']],
    { x: c.W * .515, y: c.H * .21, w: c.W * .45, h: c.H * .69,
      maxLinhas: 23, maxColunas: 8, fs: 7.2 });
}

function _dcCoresSeries_(i) {
  return ['#003D7B', '#6D5BD0', '#60A5FA', '#10B981'][i % 4];
}

function _dcDesenharBarras_(c, dados, op) {
  op = op || {};
  if (!dados || !dados.series.length) return false;
  const categorias = dados.categorias.slice(0, op.maxCategorias || 12);
  const series = dados.series.slice(0, op.maxSeries || 3);
  const x = op.x || c.m, y = op.y || c.H * .24, w = op.w || c.W * .90, h = op.h || c.H * .57;
  const todos = [];
  series.forEach(s => s.valores.slice(0, categorias.length).forEach(v => todos.push(Math.abs(v))));
  const max = Math.max.apply(null, todos.concat([1]));
  const baseY = y + h, cw = w / Math.max(1, categorias.length), gap = cw * .14;
  const bw = Math.max(2, (cw - gap * 2) / Math.max(1, series.length));
  const eixo = c.slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, baseY, x + w, baseY);
  eixo.getLineFill().setSolidFill(c.DS.colors.lines); eixo.setWeight(1);
  categorias.forEach((cat, i) => {
    series.forEach((s, si) => {
      const v = Number(s.valores[i] || 0), bh = h * .82 * Math.abs(v) / max;
      const bx = x + i * cw + gap + si * bw, by = v >= 0 ? baseY - bh : baseY;
      const bar = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, by, Math.max(1, bw - 1), Math.max(1, bh));
      bar.getFill().setSolidFill(_dcCoresSeries_(si)); bar.getBorder().setTransparent();
    });
    _rrBloco_(c.slide, x + i * cw, baseY + 2, cw, c.H * .065, cat,
      { fs: Math.max(5.5, c.W * .0078), minFs: 5, cor: c.DS.colors.textBody });
  });
  series.forEach((s, i) => {
    const xx = x + i * w * .22;
    const marca = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xx, y - c.H * .055, 10, 10);
    marca.getFill().setSolidFill(_dcCoresSeries_(i)); marca.getBorder().setTransparent();
    _rrUmaLinha_(c.slide, xx + 14, y - c.H * .063, w * .20 - 14, c.H * .04, s.nome,
      { fs: c.W * .009, bold: true, cor: c.DS.colors.textBody, align: 'L' });
  });
  return true;
}

function _dcDesenharLinha_(c, dados, op) {
  op = op || {};
  if (!dados || !dados.series.length || dados.categorias.length < 2) return false;
  const categorias = dados.categorias.slice(0, op.maxCategorias || 12);
  const series = dados.series.slice(0, op.maxSeries || 4);
  const x = op.x || c.m, y = op.y || c.H * .25, w = op.w || c.W * .90, h = op.h || c.H * .53;
  let valores = [];
  series.forEach(s => { valores = valores.concat(s.valores.slice(0, categorias.length)); });
  const min = Math.min.apply(null, valores.concat([0])), max = Math.max.apply(null, valores.concat([1]));
  const escala = max === min ? 1 : max - min;
  const px = i => x + i * w / Math.max(1, categorias.length - 1);
  const py = v => y + h - (v - min) * h / escala;
  [0, .25, .5, .75, 1].forEach(p => {
    const yy = y + h * p, grid = c.slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, yy, x + w, yy);
    grid.getLineFill().setSolidFill('#E2E8F0'); grid.setWeight(.7);
  });
  series.forEach((s, si) => {
    for (let i = 1; i < categorias.length; i++) {
      const line = c.slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
        px(i - 1), py(Number(s.valores[i - 1] || 0)), px(i), py(Number(s.valores[i] || 0)));
      line.getLineFill().setSolidFill(_dcCoresSeries_(si)); line.setWeight(2.2);
    }
  });
  categorias.forEach((cat, i) => _rrBloco_(c.slide, px(i) - w / categorias.length / 2, y + h + 3,
    w / categorias.length, c.H * .05, cat, { fs: c.W * .0078, minFs: 5, cor: c.DS.colors.textBody }));
  series.forEach((s, i) => {
    const xx = x + i * w * .22;
    const line = c.slide.insertLine(SlidesApp.LineCategory.STRAIGHT, xx, y - 16, xx + 12, y - 16);
    line.getLineFill().setSolidFill(_dcCoresSeries_(i)); line.setWeight(3);
    _rrUmaLinha_(c.slide, xx + 16, y - 27, w * .20 - 16, 20, s.nome,
      { fs: c.W * .009, bold: true, cor: c.DS.colors.textBody, align: 'L' });
  });
  return true;
}

function _dcGerarSlideBloco_(titulo, entidade, bloco, op) {
  const c = _dcNovoSlide_(titulo, entidade, 'Fonte: ' + bloco.aba + ' · linha ' + bloco.linha);
  _dcDesenharTabela_(c, bloco.matriz, op || {});
}

function _dcGerarTemaEmpresa_(tema, entidade) {
  const e = _dcEntidade_(entidade), bloco = obterBlocoDeck_(tema, entidade);
  const titulos = { RECEITAS: 'Receitas', COMPOSICAO_RECEITA: 'Composição da Receita',
    DESPESAS: 'Despesas', VACANCIA: 'Vacância', CONTRATOS: 'Cronograma dos Contratos' };
  const c = _dcNovoSlide_(titulos[tema], e.titulo, 'Fonte: ' + bloco.aba + ' · linha ' + bloco.linha);
  if (tema === 'RECEITAS' || tema === 'DESPESAS') {
    _dcDesenharTabelaDupla_(c, bloco.matriz);
  } else if (tema === 'COMPOSICAO_RECEITA') {
    const serie = _dcSeries_(bloco);
    if (!_dcDesenharBarras_(c, serie, { maxCategorias: 14 })) _dcDesenharTabela_(c, bloco.matriz);
  } else if (tema === 'VACANCIA') {
    const serie = _dcSeries_(bloco);
    if (!_dcDesenharLinha_(c, serie, { maxSeries: 3 })) _dcDesenharTabela_(c, bloco.matriz);
  } else {
    const serie = _dcSeries_(bloco);
    if (!_dcDesenharBarras_(c, serie, { maxSeries: 2, maxCategorias: 12 })) _dcDesenharTabela_(c, bloco.matriz);
  }
}

// ── Abertura, pauta e metas ───────────────────────────────────────────────
function gerarSlideAgendaResultados() {
  const d = obterAgendaResultados_();
  _dcGerarSlideBloco_('Agenda', 'Reunião de Resultados', d, { maxLinhas: 14, maxColunas: 6 });
}

function gerarSlideMetaDiretoria() {
  const d = obterMetasResultados_('Diretoria');
  _dcGerarSlideBloco_('Meta · Diretoria', 'Diretoria', d, { maxLinhas: 12, maxColunas: 10, fs: 7.4 });
}

function gerarSlideMetaGerenciaFinanceira() {
  const d = obterMetasResultados_('Gerência Financeira');
  _dcGerarSlideBloco_('Meta · Gerência Financeira', 'Gerência Contábil Financeira', d,
    { maxLinhas: 18, maxColunas: 10, fs: 6.8 });
}

// ── Capas de seção ───────────────────────────────────────────────────────
function gerarSlideCapaDemercado() { _dcGerarCapaSecao_('DEMERCADO'); }
function gerarSlideCapaCapitalRealty() { _dcGerarCapaSecao_('CAPITAL REALTY'); }
function gerarSlideCapaLocacaoConsolidada() {
  _dcGerarCapaSecao_('Resultado Unidades de Negócios · Locação', 'Capital Realty + Demercado');
}
function gerarSlideCapaIndicadoresFinanceiros() { _dcGerarCapaSecao_('Indicadores Financeiros'); }
function gerarSlideCapaAnexos() { _dcGerarCapaSecao_('ANEXOS'); }
function gerarSlideCapaRitmoFluxoCaixa() { _dcGerarCapaSecao_('Ritmo: Fluxo de Caixa', null, 'Análise de Caixa'); }
function gerarSlideCapaDeminvest() { _dcGerarCapaSecao_('DEMINVEST'); }
function gerarSlideCapaCRInfra() { _dcGerarCapaSecao_('CAPITAL REALTY', 'INFRAESTRUTURA LOGÍSTICA'); }
function gerarSlideCapaCREstacionamentos() { _dcGerarCapaSecao_('CAPITAL REALTY', 'ESTACIONAMENTO · HANGAR VIP'); }

// ── Painéis Demercado, Capital Realty e consolidado ─────────────────────
function gerarSlideReceitasDemercadoCompleto() { _dcGerarTemaEmpresa_('RECEITAS', 'DEMERCADO'); }
function gerarSlideComposicaoDemercadoCompleto() { _dcGerarTemaEmpresa_('COMPOSICAO_RECEITA', 'DEMERCADO'); }
function gerarSlideDespesasDemercadoCompleto() { _dcGerarTemaEmpresa_('DESPESAS', 'DEMERCADO'); }
function gerarSlideVacanciaDemercadoCompleto() { _dcGerarTemaEmpresa_('VACANCIA', 'DEMERCADO'); }
function gerarSlideContratosDemercadoCompleto() { _dcGerarTemaEmpresa_('CONTRATOS', 'DEMERCADO'); }
function gerarSlideReceitasCapitalRealty() { _dcGerarTemaEmpresa_('RECEITAS', 'CAPITAL_REALTY'); }
function gerarSlideComposicaoCapitalRealty() { _dcGerarTemaEmpresa_('COMPOSICAO_RECEITA', 'CAPITAL_REALTY'); }
function gerarSlideDespesasCapitalRealty() { _dcGerarTemaEmpresa_('DESPESAS', 'CAPITAL_REALTY'); }
function gerarSlideVacanciaCapitalRealty() { _dcGerarTemaEmpresa_('VACANCIA', 'CAPITAL_REALTY'); }
function gerarSlideContratosCapitalRealty() { _dcGerarTemaEmpresa_('CONTRATOS', 'CAPITAL_REALTY'); }
function gerarSlideComposicaoLocacaoConsolidada() { _dcGerarTemaEmpresa_('COMPOSICAO_RECEITA', 'CONSOLIDADO_LOCACAO'); }
function gerarSlideVacanciaLocacaoConsolidada() { _dcGerarTemaEmpresa_('VACANCIA', 'CONSOLIDADO_LOCACAO'); }

// ── Indicadores ──────────────────────────────────────────────────────────
function _dcGerarIndicador_(tema, titulo, tabela) {
  const d = obterIndicadorDeck_(tema), c = _dcNovoSlide_(titulo, 'Indicadores Financeiros',
    'Fonte: ' + d.aba + ' · linha ' + d.linha);
  if (tabela || !_dcDesenharLinha_(c, _dcSeries_(d), { maxSeries: 4, maxCategorias: 12 }))
    _dcDesenharTabela_(c, d.matriz, { maxLinhas: 20, maxColunas: 12 });
}
function gerarSlideEndividamento() { _dcGerarIndicador_('ENDIVIDAMENTO', 'Endividamento', true); }
function gerarSlidePrazoPagamento() { _dcGerarIndicador_('PRAZO_PAGAMENTO', 'Prazo de Pagamento', false); }
function gerarSlidePrazoRecebimento() { _dcGerarIndicador_('PRAZO_RECEBIMENTO', 'Prazo de Recebimento', false); }
function gerarSlideLiquidezCorrente() { _dcGerarIndicador_('LIQUIDEZ_CORRENTE', 'Liquidez Corrente', false); }
function gerarSlideMargemEbitdaIndicador() { _dcGerarIndicador_('MARGEM_EBITDA', 'Margem EBITDA', false); }

// ── Anexos de fluxo de caixa ─────────────────────────────────────────────
function _dcGerarFluxoCaixa_(entidade) {
  const e = _dcEntidade_(entidade), d = obterFluxoCaixaDeck_(entidade);
  _dcGerarSlideBloco_('Fluxo de Caixa', e.titulo, d, { maxLinhas: 24, maxColunas: 16, fs: 6.6 });
}
function gerarSlideFluxoCaixaDemercado() { _dcGerarFluxoCaixa_('DEMERCADO'); }
function gerarSlideFluxoCaixaCRInfra() { _dcGerarFluxoCaixa_('CR_INFRA'); }
function gerarSlideFluxoCaixaCREstacionamentos() { _dcGerarFluxoCaixa_('CR_ESTACIONAMENTOS'); }

// ── Ritmo de caixa: quatro slides reaproveitados por entidade ────────────
function _dcGerarRitmo_(entidade, tipo, titulo, modo) {
  const e = _dcEntidade_(entidade), d = obterRitmoDeck_(entidade, tipo);
  const c = _dcNovoSlide_(titulo, e.titulo, 'Fonte: ' + d.aba + ' · linha ' + d.linha);
  const serie = _dcSeries_(d);
  if (modo === 'tabela') _dcDesenharTabela_(c, d.matriz, { maxLinhas: 22, maxColunas: 16, fs: 6.8 });
  else if (modo === 'linha') {
    if (!_dcDesenharLinha_(c, serie, { maxSeries: 4 })) _dcDesenharTabela_(c, d.matriz);
  } else if (!_dcDesenharBarras_(c, serie, { maxSeries: 3 })) _dcDesenharTabela_(c, d.matriz);
}
function gerarSlideRitmoEntradasDemercado() { _dcGerarRitmo_('DEMERCADO', 'RITMO_ENTRADAS', 'Ritmo Entradas', 'barras'); }
function gerarSlideRitmoSaidasDemercado() { _dcGerarRitmo_('DEMERCADO', 'RITMO_SAIDAS', 'Ritmo Saídas', 'barras'); }
function gerarSlideRitmoSaldoDemercado() { _dcGerarRitmo_('DEMERCADO', 'RITMO_SALDO', 'Ritmo Comportamento do Saldo Final', 'linha'); }
function gerarSlideRitmoFluxoDemercado() { _dcGerarRitmo_('DEMERCADO', 'RITMO_FLUXO', 'Ritmo Fluxo de Caixa', 'tabela'); }
function gerarSlideRitmoEntradasDeminvest() { _dcGerarRitmo_('DEMINVEST', 'RITMO_ENTRADAS', 'Ritmo Entradas', 'barras'); }
function gerarSlideRitmoSaidasDeminvest() { _dcGerarRitmo_('DEMINVEST', 'RITMO_SAIDAS', 'Ritmo Saídas', 'barras'); }
function gerarSlideRitmoSaldoDeminvest() { _dcGerarRitmo_('DEMINVEST', 'RITMO_SALDO', 'Ritmo Comportamento do Saldo Final', 'linha'); }
function gerarSlideRitmoFluxoDeminvest() { _dcGerarRitmo_('DEMINVEST', 'RITMO_FLUXO', 'Ritmo Fluxo de Caixa', 'tabela'); }
function gerarSlideRitmoEntradasCRInfra() { _dcGerarRitmo_('CR_INFRA', 'RITMO_ENTRADAS', 'Ritmo Entradas', 'barras'); }
function gerarSlideRitmoSaidasCRInfra() { _dcGerarRitmo_('CR_INFRA', 'RITMO_SAIDAS', 'Ritmo Saídas', 'barras'); }
function gerarSlideRitmoSaldoCRInfra() { _dcGerarRitmo_('CR_INFRA', 'RITMO_SALDO', 'Ritmo Comportamento do Saldo Final', 'linha'); }
function gerarSlideRitmoFluxoCRInfra() { _dcGerarRitmo_('CR_INFRA', 'RITMO_FLUXO', 'Ritmo Fluxo de Caixa', 'tabela'); }
function gerarSlideRitmoEntradasCREstacionamentos() { _dcGerarRitmo_('CR_ESTACIONAMENTOS', 'RITMO_ENTRADAS', 'Ritmo Entradas', 'barras'); }
function gerarSlideRitmoSaidasCREstacionamentos() { _dcGerarRitmo_('CR_ESTACIONAMENTOS', 'RITMO_SAIDAS', 'Ritmo Saídas', 'barras'); }
function gerarSlideRitmoSaldoCREstacionamentos() { _dcGerarRitmo_('CR_ESTACIONAMENTOS', 'RITMO_SALDO', 'Ritmo Comportamento do Saldo Final', 'linha'); }
function gerarSlideRitmoFluxoCREstacionamentos() { _dcGerarRitmo_('CR_ESTACIONAMENTOS', 'RITMO_FLUXO', 'Ritmo Fluxo de Caixa', 'tabela'); }

function gerarSlideEncerramentoFinanceiro() {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), DS = CR_DESIGN_SYSTEM;
  _capaFundo_(slide, W, H, { espinha: false });
  _capaWordmark_(slide, W * .08, H * .40, { h: 48 });
  _rrBloco_(slide, W * .56, H * .38, W * .34, H * .16, 'Obrigado',
    { fs: 30, minFs: 22, bold: true, cor: '#FFFFFF' });
  _rrBloco_(slide, W * .56, H * .55, W * .34, H * .12, 'capitalrealty.com.br',
    { fs: 13, bold: true, cor: '#93C5FD' });
  const faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, H * .90, W, H * .10);
  faixa.getFill().setSolidFill('#FFFFFF'); faixa.getBorder().setTransparent();
  _rrUmaLinha_(slide, W * .56, H * .92, W * .36, H * .045,
    'Curitiba · Paraná  |  41 2169 6850', { fs: 9, cor: DS.colors.textBody });
}
