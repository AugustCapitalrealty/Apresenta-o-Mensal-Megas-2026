/**
 * SLIDES COMPLEMENTARES — deck financeiro de 55 páginas.
 *
 * Tabelas são desenhadas somente com retângulos e caixas de texto. A API de
 * tabelas nativas do Slides não é usada, pois células mescladas/vazias podem
 * lançar “object has no text”.
 */

function _dcReferencia_() {
  const r = obterMesReferencia_();
  return { mes: r.curto, ano: r.ano, texto: r.curto + '/' + r.ano };
}

function _dcNovoSlide_(titulo, entidade, subtitulo, aviso) {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), DS = CR_DESIGN_SYSTEM;
  const m = W * .035, ref = _dcReferencia_();
  slide.getBackground().setSolidFill('#FFFFFF');
  const marca = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W * .68, -H * .40, W * .54, W * .54);
  marca.getFill().setSolidFill(DS.colors.brandLight, .045);
  marca.getBorder().setTransparent();
  _rrUmaLinha_(slide, m, H * .035, W * .70, H * .055, entidade || 'Indicadores Financeiros',
    { fs: W * .014, bold: true, cor: DS.colors.brandMed, align: 'L', folga: 0 });
  _rrUmaLinha_(slide, m, H * .086, W * .78, H * .068, titulo + ' — ' + ref.texto,
    { fs: W * .025, bold: true, cor: DS.colors.textMain, align: 'L', folga: 0 });
  if (subtitulo) _rrUmaLinha_(slide, m, H * .151, W * .88, H * .035, subtitulo,
    { fs: W * .0105, cor: DS.colors.textBody, fonte: DS.typography.body, align: 'L', folga: 0 });
  if (aviso) _dcAvisoDivergencia_(slide, W, H, aviso, H * .185);
  _dcLogoRodape_({ slide: slide, W: W, H: H, DS: DS, m: m });
  return { deck: deck, slide: slide, W: W, H: H, DS: DS, m: m,
    conteudoY: aviso ? H * .255 : H * .215 };
}

function _dcAvisoDivergencia_(slide, W, H, texto, y) {
  const x = W * .035, w = W * .76, h = H * .045;
  _rrCelula_(slide, x, y, w, h, '#FFF7ED');
  _rrUmaLinha_(slide, x + 8, y, w - 16, h, texto,
    { fs: W * .0095, bold: true, cor: '#C2410C', align: 'L', folga: 0 });
}

function _dcAvisoFonte_(bloco) {
  if (!bloco || !bloco.divergenciaMes) return null;
  return 'Divergência preservada: esta fonte ainda está identificada como ' +
    bloco.referenciaFonte + '.';
}

function _dcLogoRodape_(c) {
  const y = c.H * .94;
  const linha = c.slide.insertShape(SlidesApp.ShapeType.RECTANGLE, c.m, y, c.W - c.m * 2, .8);
  linha.getFill().setSolidFill(c.DS.colors.lines);
  linha.getBorder().setTransparent();
  try {
    c.slide.insertImage(DriveApp.getFileById(c.DS.assets.logoId).getBlob(),
      c.W - c.m - c.DS.assets.logoW * .70, y + 4,
      c.DS.assets.logoW * .70, c.DS.assets.logoH * .70);
  } catch (e) { Logger.log('Deck completo: logo não carregado. ' + e.message); }
}

function _dcGerarCapaSecao_(titulo, linha2, overline) {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), ref = _dcReferencia_();
  _capaFundo_(slide, W, H);
  _capaWordmark_(slide, 42, 30, { h: 28 });
  _rrUmaLinha_(slide, 48, H * .37, W * .72, H * .045, _capaEspacado_(overline || 'Resultados Financeiros'),
    { fs: 8, bold: true, cor: '#60A5FA', align: 'L', folga: 0 });
  _rrBloco_(slide, 44, H * .42, W * .72, H * .23, titulo,
    { fs: 32, fsMin: 20, bold: true, cor: '#FFFFFF', align: 'L', folga: 0 });
  if (linha2) _rrUmaLinha_(slide, 48, H * .67, W * .70, H * .055, linha2,
    { fs: 16, bold: true, cor: '#93C5FD', align: 'L', folga: 0 });
  _capaRodape_(slide, W, H, ref.texto.toUpperCase(), 'Expandir Eficiência');
}

function _dcPrepararTabela_(matriz, maxLinhas, maxColunas) {
  let m = (matriz || []).map(r => r.slice());
  while (m.length && _dcLinhaVazia_(m[0])) m.shift();
  while (m.length && _dcLinhaVazia_(m[m.length - 1])) m.pop();
  if (!m.length) return [['Dados não localizados']];
  let ultima = 0;
  m.forEach(r => r.forEach((v, c) => {
    if (String(v == null ? '' : v).trim()) ultima = Math.max(ultima, c);
  }));
  m = m.map(r => r.slice(0, Math.min(ultima + 1, maxColunas || 12)));
  if (m.length > (maxLinhas || 22)) {
    const limite = maxLinhas || 22;
    m = m.slice(0, limite - 1).concat([['…', 'Demais linhas na planilha de origem']]);
  }
  const largura = Math.max.apply(null, m.map(r => r.length));
  return m.map(r => r.concat(Array(Math.max(0, largura - r.length)).fill('')));
}

/** Renderizador vetorial: cada célula é um retângulo + uma caixa de texto. */
function _dcDesenharTabela_(c, matriz, op) {
  op = op || {};
  const m = _dcPrepararTabela_(matriz, op.maxLinhas || 22, op.maxColunas || 12);
  const x = op.x == null ? c.m : op.x, y = op.y == null ? c.conteudoY : op.y;
  const w = op.w == null ? c.W - c.m * 2 : op.w;
  const h = op.h == null ? c.H * .90 - y : op.h;
  const nCol = m[0].length, hLinha = h / Math.max(1, m.length);
  const primeiraW = nCol === 1 ? w : w * (op.primeiraColuna || .40);
  const demaisW = nCol === 1 ? 0 : (w - primeiraW) / (nCol - 1);
  const fs = Math.max(5.2, Math.min(9.2, op.fs || c.W * .0095));
  const elementos = [];
  let colunasComparativas = [];

  m.forEach((row, r) => {
    const norm = _dcNorm_(row.join(' '));
    const header = r === 0 || /^(ofensores|defensores)\b/.test(norm);
    const total = /^total\b/.test(_dcNorm_(row[0]));
    if (header) colunasComparativas = row.map(_rrEhCabecalhoComparativo_);
    let xx = x;
    row.forEach((valor, col) => {
      const cw = col === 0 ? primeiraW : demaisW;
      const fundo = header ? c.DS.colors.brandDark :
        (total ? '#DBEAFE' : (r % 2 ? '#F8FAFC' : '#FFFFFF'));
      elementos.push(_rrCelula_(c.slide, xx, y + r * hLinha, cw, hLinha, fundo));
      const textoOriginal = String(valor == null ? '' : valor);
      const texto = header ? _rrFormatarCabecalhoTabela_(textoOriginal) : textoOriginal;
      const estilo = { fs: fs, fsMin: 4.8, bold: header || total || col === 0,
        cor: header ? '#FFFFFF' : (colunasComparativas[col]
          ? _rrCorValorComparativo_(textoOriginal, c.DS.colors.textMain, false)
          : c.DS.colors.textMain),
        align: col === 0 ? 'L' : 'C', folga: 0 };
      if (col === 0 || header) {
        _rrBloco_(c.slide, xx + (col === 0 ? 4 : 1), y + r * hLinha,
          cw - (col === 0 ? 8 : 2), hLinha, texto, estilo);
      } else {
        _rrUmaLinha_(c.slide, xx + 1, y + r * hLinha, cw - 2, hLinha, texto, estilo);
      }
      xx += cw;
    });
  });
  return elementos;
}

function _dcDesenharTabelaDupla_(c, matriz) {
  const m = _dcPrepararTabela_(matriz, 44, 6);
  const corte = m.findIndex((r, i) => i > 0 && /^defensores\b/.test(_dcNorm_(r[0])));
  let esquerda, direita;
  if (corte > 0) {
    esquerda = m.slice(0, corte);
    direita = m.slice(corte);
  } else {
    const meio = Math.ceil(m.length / 2);
    esquerda = m.slice(0, meio);
    direita = m.slice(meio);
  }
  const h = c.H * .90 - c.conteudoY;
  _dcDesenharTabela_(c, esquerda, { x: c.m, y: c.conteudoY, w: c.W * .445, h: h,
    maxLinhas: 24, maxColunas: 6, fs: 6.4, primeiraColuna: .43 });
  _dcDesenharTabela_(c, direita.length ? direita : [['Sem segundo bloco']],
    { x: c.W * .515, y: c.conteudoY, w: c.W * .45, h: h,
      maxLinhas: 24, maxColunas: 6, fs: 6.4, primeiraColuna: .43 });
}

function _dcGerarSlideBloco_(titulo, entidade, bloco, op) {
  const fonte = 'Fonte: ' + bloco.aba + ' · linha ' + bloco.linha;
  const c = _dcNovoSlide_(titulo, entidade, fonte, _dcAvisoFonte_(bloco));
  _dcDesenharTabela_(c, bloco.matriz, op || {});
}

function _dcGerarTemaEmpresa_(tema, entidade) {
  const e = _dcEntidade_(entidade), bloco = obterBlocoDeck_(tema, entidade);
  const titulo = tema === 'RECEITAS' ? 'Receitas' : 'Despesas';
  const fonte = 'Fonte: ' + bloco.aba + ' · linha ' + bloco.linha +
    (bloco.mapeamento ? ' · ' + bloco.mapeamento : '');
  const c = _dcNovoSlide_(titulo, e.titulo, fonte, _dcAvisoFonte_(bloco));
  _dcDesenharTabelaDupla_(c, bloco.matriz);
}

function gerarSlidePlaceholderFinanceiro_(titulo, entidade, motivo) {
  const c = _dcNovoSlide_(titulo, entidade || 'Resultados Financeiros', null, null);
  const x = c.W * .16, y = c.H * .33, w = c.W * .68, h = c.H * .34;
  _rrCelula_(c.slide, x, y, w, h, '#F8FAFC');
  _rrBloco_(c.slide, x + w * .08, y + h * .16, w * .84, h * .22,
    'Fonte de dados não disponível',
    { fs: c.W * .022, fsMin: 14, bold: true, cor: c.DS.colors.brandDark });
  _rrBloco_(c.slide, x + w * .10, y + h * .48, w * .80, h * .20,
    motivo || 'Painel mantido na estrutura para preenchimento quando a fonte for disponibilizada.',
    { fs: c.W * .0115, fsMin: 8, cor: c.DS.colors.textBody });
  _rrUmaLinha_(c.slide, x, y + h * .77, w, h * .10, obterMesReferencia_().label,
    { fs: c.W * .0105, bold: true, cor: c.DS.colors.brandMed });
}

function _dcPlaceholder_(titulo, entidade) {
  gerarSlidePlaceholderFinanceiro_(titulo, entidade,
    'Nenhuma fonte confirmada para este painel no arquivo Julho/2026.');
}

// Abertura, pauta e metas
function gerarSlideAgendaResultados() {
  _dcGerarSlideBloco_('Agenda', 'Reunião de Resultados', obterAgendaResultados_(),
    { maxLinhas: 14, maxColunas: 4, primeiraColuna: .48 });
}
function gerarSlideMetaDiretoria() { _dcPlaceholder_('Meta · Diretoria', 'Diretoria'); }
function gerarSlideMetaGerenciaFinanceira() { _dcPlaceholder_('Meta · Gerência Financeira', 'Gerência Contábil Financeira'); }

// Capas de seção
function gerarSlideCapaDemercado() { _dcGerarCapaSecao_('DEMERCADO'); }
function gerarSlideCapaCapitalRealty() { _dcGerarCapaSecao_('CAPITAL REALTY'); }
function gerarSlideCapaLocacaoConsolidada() { _dcGerarCapaSecao_('Resultado Unidades de Negócios · Locação', 'Capital Realty + Demercado'); }
function gerarSlideCapaIndicadoresFinanceiros() { _dcGerarCapaSecao_('Indicadores Financeiros'); }
function gerarSlideCapaAnexos() { _dcGerarCapaSecao_('ANEXOS'); }
function gerarSlideCapaRitmoFluxoCaixa() { _dcGerarCapaSecao_('Ritmo: Fluxo de Caixa', null, 'Análise de Caixa'); }
function gerarSlideCapaDeminvest() { _dcGerarCapaSecao_('DEMINVEST'); }
function gerarSlideCapaCRInfra() { _dcGerarCapaSecao_('CAPITAL REALTY', 'INFRAESTRUTURA LOGÍSTICA'); }
function gerarSlideCapaCREstacionamentos() { _dcGerarCapaSecao_('CAPITAL REALTY', 'ESTACIONAMENTO · HANGAR VIP'); }

// Painéis com fonte confirmada e placeholders temáticos
function gerarSlideReceitasDemercadoCompleto() { _dcGerarTemaEmpresa_('RECEITAS', 'DEMERCADO'); }
function gerarSlideComposicaoDemercadoCompleto() { _dcPlaceholder_('Composição da Receita', 'Demercado'); }
function gerarSlideDespesasDemercadoCompleto() { _dcGerarTemaEmpresa_('DESPESAS', 'DEMERCADO'); }
function gerarSlideVacanciaDemercadoCompleto() { _dcPlaceholder_('Vacância', 'Demercado'); }
function gerarSlideContratosDemercadoCompleto() { _dcPlaceholder_('Cronograma dos Contratos', 'Demercado'); }
function gerarSlideReceitasCapitalRealty() { _dcGerarTemaEmpresa_('RECEITAS', 'CAPITAL_REALTY'); }
function gerarSlideComposicaoCapitalRealty() { _dcPlaceholder_('Composição da Receita', 'Capital Realty'); }
function gerarSlideDespesasCapitalRealty() { _dcGerarTemaEmpresa_('DESPESAS', 'CAPITAL_REALTY'); }
function gerarSlideVacanciaCapitalRealty() { _dcPlaceholder_('Vacância', 'Capital Realty'); }
function gerarSlideContratosCapitalRealty() { _dcPlaceholder_('Cronograma dos Contratos', 'Capital Realty'); }
function gerarSlideComposicaoLocacaoConsolidada() { _dcPlaceholder_('Composição da Receita', 'Locação Consolidada'); }
function gerarSlideVacanciaLocacaoConsolidada() { _dcPlaceholder_('Vacância', 'Locação Consolidada'); }

// Indicadores sem fonte confirmada
function gerarSlideEndividamento() { _dcPlaceholder_('Endividamento', 'Indicadores Financeiros'); }
function gerarSlidePrazoPagamento() { _dcPlaceholder_('Prazo de Pagamento', 'Indicadores Financeiros'); }
function gerarSlidePrazoRecebimento() { _dcPlaceholder_('Prazo de Recebimento', 'Indicadores Financeiros'); }
function gerarSlideLiquidezCorrente() { _dcPlaceholder_('Liquidez Corrente', 'Indicadores Financeiros'); }
function gerarSlideMargemEbitdaIndicador() { _dcPlaceholder_('Margem EBITDA', 'Indicadores Financeiros'); }

// Fluxos sem fonte confirmada
function gerarSlideFluxoCaixaDemercado() { _dcPlaceholder_('Fluxo de Caixa', 'Demercado'); }
function gerarSlideFluxoCaixaCRInfra() { _dcPlaceholder_('Fluxo de Caixa', 'Capital Realty Infraestrutura Logística'); }
function gerarSlideFluxoCaixaCREstacionamentos() { _dcPlaceholder_('Fluxo de Caixa', 'Capital Realty Estacionamento'); }

function _dcGerarRitmoPlaceholder_(entidade, titulo) {
  _dcPlaceholder_(titulo, _dcEntidade_(entidade).titulo);
}
function gerarSlideRitmoEntradasDemercado() { _dcGerarRitmoPlaceholder_('DEMERCADO', 'Ritmo Entradas'); }
function gerarSlideRitmoSaidasDemercado() { _dcGerarRitmoPlaceholder_('DEMERCADO', 'Ritmo Saídas'); }
function gerarSlideRitmoSaldoDemercado() { _dcGerarRitmoPlaceholder_('DEMERCADO', 'Ritmo Comportamento do Saldo Final'); }
function gerarSlideRitmoFluxoDemercado() { _dcGerarRitmoPlaceholder_('DEMERCADO', 'Ritmo Fluxo de Caixa'); }
function gerarSlideRitmoEntradasDeminvest() { _dcGerarRitmoPlaceholder_('DEMINVEST', 'Ritmo Entradas'); }
function gerarSlideRitmoSaidasDeminvest() { _dcGerarRitmoPlaceholder_('DEMINVEST', 'Ritmo Saídas'); }
function gerarSlideRitmoSaldoDeminvest() { _dcGerarRitmoPlaceholder_('DEMINVEST', 'Ritmo Comportamento do Saldo Final'); }
function gerarSlideRitmoFluxoDeminvest() { _dcGerarRitmoPlaceholder_('DEMINVEST', 'Ritmo Fluxo de Caixa'); }
function gerarSlideRitmoEntradasCRInfra() { _dcGerarRitmoPlaceholder_('CR_INFRA', 'Ritmo Entradas'); }
function gerarSlideRitmoSaidasCRInfra() { _dcGerarRitmoPlaceholder_('CR_INFRA', 'Ritmo Saídas'); }
function gerarSlideRitmoSaldoCRInfra() { _dcGerarRitmoPlaceholder_('CR_INFRA', 'Ritmo Comportamento do Saldo Final'); }
function gerarSlideRitmoFluxoCRInfra() { _dcGerarRitmoPlaceholder_('CR_INFRA', 'Ritmo Fluxo de Caixa'); }
function gerarSlideRitmoEntradasCREstacionamentos() { _dcGerarRitmoPlaceholder_('CR_ESTACIONAMENTOS', 'Ritmo Entradas'); }
function gerarSlideRitmoSaidasCREstacionamentos() { _dcGerarRitmoPlaceholder_('CR_ESTACIONAMENTOS', 'Ritmo Saídas'); }
function gerarSlideRitmoSaldoCREstacionamentos() { _dcGerarRitmoPlaceholder_('CR_ESTACIONAMENTOS', 'Ritmo Comportamento do Saldo Final'); }
function gerarSlideRitmoFluxoCREstacionamentos() { _dcGerarRitmoPlaceholder_('CR_ESTACIONAMENTOS', 'Ritmo Fluxo de Caixa'); }

function gerarSlideEncerramentoFinanceiro() {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), DS = CR_DESIGN_SYSTEM;
  _capaFundo_(slide, W, H, { espinha: false });
  _capaWordmark_(slide, W * .08, H * .40, { h: 48 });
  _rrBloco_(slide, W * .56, H * .38, W * .34, H * .16, 'Obrigado',
    { fs: 30, fsMin: 22, bold: true, cor: '#FFFFFF' });
  _rrBloco_(slide, W * .56, H * .55, W * .34, H * .12, 'capitalrealty.com.br',
    { fs: 13, bold: true, cor: '#93C5FD' });
  const faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, H * .90, W, H * .10);
  faixa.getFill().setSolidFill('#FFFFFF');
  faixa.getBorder().setTransparent();
  _rrUmaLinha_(slide, W * .56, H * .92, W * .36, H * .045,
    'Curitiba · Paraná  |  41 2169 6850', { fs: 9, cor: DS.colors.textBody });
}
