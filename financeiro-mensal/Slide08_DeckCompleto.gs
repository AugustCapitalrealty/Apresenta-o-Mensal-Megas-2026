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
  const ref = _dcReferencia_();
  return _dsNovoSlideClaro_({
    entidade: entidade || 'Indicadores Financeiros',
    topico: titulo + ' – ' + ref.texto,
    aviso: aviso || '',
    conteudoY: CR_DESIGN_SYSTEM.layout.light.contentTop
  });
}

// Mantida para compatibilidade interna. O aviso não cria mais uma barra; ele
// usa a mesma tipografia e cor de metadado do shell canônico.
function _dcAvisoDivergencia_(slide, W, H, texto, y) {
  const DS = CR_DESIGN_SYSTEM, x = W * DS.layout.light.metadataX;
  _rrBloco_(slide, x, y, W * DS.layout.light.metadataW, H * .041, texto,
    { fs: W * DS.typography.scale.metadata,
      fsMin: W * DS.typography.scale.metadata, bold: true,
      cor: DS.colors.warningText, fonte: DS.typography.body,
      align: 'R', folga: 0, preservarLinhas: false });
}

function _dcAvisoFonte_(bloco) {
  if (!bloco || !bloco.divergenciaMes) return null;
  return 'Referência geral: ' + _dcReferencia_().texto +
    ' · fonte preservada: ' + _dcReferenciaFonteCurta_(bloco);
}

function _dcLogoRodape_(c) {
  return _dsLogoCanonico_(c.slide, c.W, c.H, false);
}

function _dcReferenciaFonteCurta_(bloco) {
  const origem = String(bloco && bloco.referenciaFonte || '').trim();
  if (!origem) return _dcReferencia_().texto;
  const partes = origem.split('/').map(p => p.trim()).filter(Boolean);
  if (partes.length < 2) return origem;
  const mes = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
  return mes + '/' + partes[1];
}

// A marca d'água foi removida do design (ver _dsCabecalhoPadrao_): numa
// página densa de tabela ela competia com os números. Mantida como no-op para
// não quebrar chamadas antigas.
function _dcMarcaDaguaComparativo_() {}

function _dcNovoSlideComparativo_(titulo, entidade, bloco) {
  const referenciaFonte = _dcReferenciaFonteCurta_(bloco);
  // A procedência (aba + linha + mapeamento) segue registrada, mas vai para o
  // Logger em vez do slide — na página ela roubava atenção da tabela.
  Logger.log('  · ' + entidade + ' / ' + titulo + ' ← ' + bloco.aba +
    ' linha ' + bloco.linha + (bloco.mapeamento ? ' · ' + bloco.mapeamento : ''));
  const aviso = bloco.divergenciaMes
    ? 'Referência geral: ' + _dcReferencia_().texto + ' · fonte preservada: ' + referenciaFonte
    : '';
  return _dsNovoSlideClaro_({
    entidade: entidade,
    topico: titulo + ' – ' + referenciaFonte,
    aviso: aviso,
    conteudoY: .21
  });
}

function _dcGerarCapaSecao_(titulo, linha2, overline) {
  const deck = getDeckMensal_(), slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight(), ref = _dcReferencia_();
  _capaFundo_(slide, W, H);
  _dsAplicarMarcaEscura_(slide, W, H, ref.texto.toUpperCase(), 'Expandir Eficiência');
  _rrUmaLinha_(slide, 48, H * .37, W * .72, H * .045, _capaEspacado_(overline || 'Resultados Financeiros'),
    { fs: 8, fsMin: 8, bold: true, cor: CR_DESIGN_SYSTEM.colors.highlight,
      fonte: CR_DESIGN_SYSTEM.typography.titles, align: 'L', folga: 0 });
  _rrBloco_(slide, 44, H * .42, W * .72, H * .23, titulo,
    { fs: 32, fsMin: 20, bold: true, cor: '#FFFFFF', align: 'L', folga: 0 });
  if (linha2) _rrUmaLinha_(slide, 48, H * .67, W * .70, H * .055, linha2,
    { fs: 16, fsMin: 16, bold: true, cor: CR_DESIGN_SYSTEM.colors.brandSoft,
      fonte: CR_DESIGN_SYSTEM.typography.titles, align: 'L', folga: 0 });
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
  const h = op.h == null ? (c.tableBottom || c.H * .875) - y : op.h;
  const nCol = m[0].length, hLinhaBase = h / Math.max(1, m.length);
  const primeiraW = nCol === 1 ? w : w * (op.primeiraColuna || .40);
  const demaisW = nCol === 1 ? 0 : (w - primeiraW) / (nCol - 1);
  const escala = c.DS.typography.scale;
  const fsHeader = c.W * escala.tableHeader;
  const fsBody = op.fs || c.W * (m.length > 28
    ? escala.tableBodyDense : (m.length > 16
      ? escala.tableBodyCompact : escala.tableBodyRegular));
  const elementos = [];
  let colunasComparativas = [];
  const tipos = m.map((row, r) => {
    const norm = _dcNorm_(row.join(' '));
    return { header: r === 0 || /^(ofensores|defensores)\b/.test(norm) };
  });
  const nHeaders = tipos.filter(t => t.header).length;
  const nCorpo = m.length - nHeaders;
  // Em quadros densos, reserva altura mínima ao cabeçalho de três linhas sem
  // aumentar a tabela: a diferença é redistribuída entre as linhas do corpo.
  let maxLinhasHeader = 1;
  m.forEach((row, r) => {
    if (!tipos[r].header) return;
    row.forEach(v => {
      maxLinhasHeader = Math.max(maxLinhasHeader,
        String(_rrFormatarCabecalhoTabela_(v)).split('\n').length);
    });
  });
  const hHeaderMin = maxLinhasHeader * fsHeader * 1.18 + 1;
  const hHeader = nCorpo ? Math.max(hLinhaBase, hHeaderMin) : hLinhaBase;
  const hCorpo = nCorpo ? (h - hHeader * nHeaders) / nCorpo : hLinhaBase;
  if (hCorpo <= fsBody * 1.18) {
    throw new Error('Tabela sem altura para aplicar uma única fonte ao corpo.');
  }
  let yy = y;

  m.forEach((row, r) => {
    const header = tipos[r].header;
    const total = /^total\b/.test(_dcNorm_(row[0]));
    const hLinha = header ? hHeader : hCorpo;
    if (header) colunasComparativas = row.map(_rrEhCabecalhoComparativo_);
    let xx = x;
    row.forEach((valor, col) => {
      const cw = col === 0 ? primeiraW : demaisW;
      const fundo = header ? c.DS.colors.tableHeader :
        (total ? c.DS.colors.tableTotal : (r % 2 ? c.DS.colors.tableStripe : null));
      elementos.push(_rrCelula_(c.slide, xx, yy, cw, hLinha, fundo));
      const textoOriginal = String(valor == null ? '' : valor);
      const texto = header ? _rrFormatarCabecalhoTabela_(textoOriginal) : textoOriginal;
      // Tabela inteira em Calibri (cabeçalho e corpo) — ver typography.tables.
      const fonte = c.DS.typography.tables;
      const tamanho = header ? fsHeader : fsBody;
      const estilo = { fs: tamanho, fsMin: tamanho,
        bold: header || total || col === 0,
        cor: header ? '#FFFFFF' : (colunasComparativas[col]
          ? _rrCorValorComparativo_(textoOriginal, c.DS.colors.textMain, false, op.modoCor)
          : c.DS.colors.textMain),
        fonte: fonte, align: col === 0 ? 'L' : 'C',
        folga: header ? _RR_RECUO_TEXTBOX / 2 : 0 };
      if (col === 0 || header) {
        _rrBloco_(c.slide, xx + (col === 0 ? 4 : 1), yy,
          cw - (col === 0 ? 8 : 2), hLinha, texto, estilo);
      } else {
        _rrUmaLinha_(c.slide, xx + 1, yy, cw - 2, hLinha, texto, estilo);
      }
      xx += cw;
    });
    yy += hLinha;
  });
  return elementos;
}

function _dcDesenharTabelaDupla_(c, matriz) {
  return _dcDesenharTabelaComparativa_(c, matriz,
    { densidade: 'dense', modoCor: 'despesa' });
}

// Tabela compacta e única, com Ofensores e Defensores empilhados como no
// rascunho. Linhas comuns ficam transparentes para revelar a marca d'água;
// cabeçalhos e totais recebem faixas sólidas.
function _dcPrepararTabelaIntegra_(matriz, maxLinhas, maxColunas) {
  const m = _dcPrepararTabela_(matriz, 10000, maxColunas);
  if (m.length > maxLinhas) {
    throw new Error('Tabela possui ' + m.length + ' linhas; o layout institucional aceita ' +
      maxLinhas + ' sem truncamento.');
  }
  return m;
}

function _dcDesenharTabelaComparativa_(c, matriz, op) {
  op = op || {};
  const dense = op.densidade === 'dense';
  const m = _dcPrepararTabelaIntegra_(matriz, 44, 6);
  const x = c.W * .16;
  const y = dense ? c.H * c.DS.layout.light.contentTop : c.H * .21;
  const w = c.W * (dense ? .62 : .72);
  const nCol = m[0].length;
  const primeiraW = nCol === 1 ? w : w * .42;
  const demaisW = nCol === 1 ? 0 : (w - primeiraW) / (nCol - 1);
  const tipos = m.map((row, r) => {
    const norm = _dcNorm_(row.join(' '));
    return {
      header: r === 0 || /^(ofensores|defensores)\b/.test(norm),
      total: /^total\b/.test(_dcNorm_(row[0]))
    };
  });
  const pesoHeader = dense ? 1.90 : 1.32;
  const pesoTotal = dense ? 1.10 : 1.06;
  const pesos = tipos.map(t => t.header ? pesoHeader : (t.total ? pesoTotal : 1));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const alturaDisponivel = dense ? c.H * .968 - y : c.H * .62;
  const unidade = dense ? alturaDisponivel / Math.max(1, somaPesos)
    : Math.min(c.H * .050, alturaDisponivel / Math.max(1, somaPesos));
  const fsHeader = c.W * c.DS.typography.scale.tableHeader;
  const fsBody = c.W * (dense
    ? c.DS.typography.scale.tableBodyDense
    : c.DS.typography.scale.tableBodyRegular);
  if (unidade <= fsBody * 1.18) {
    throw new Error('Tabela comparativa sem altura para a densidade ' +
      (dense ? 'densa' : 'regular') + '.');
  }
  let yy = y, colunasComparativas = [];

  m.forEach((row, r) => {
    const tipo = tipos[r], h = unidade * pesos[r];
    if (tipo.header) colunasComparativas = row.map(_rrEhCabecalhoComparativo_);
    let xx = x;
    row.forEach((valor, col) => {
      const cw = col === 0 ? primeiraW : demaisW;
      const textoOriginal = String(valor == null ? '' : valor);
      if (tipo.header) _rrCelula_(c.slide, xx, yy, cw, h, c.DS.colors.tableHeader);
      else if (tipo.total) _rrCelula_(c.slide, xx, yy, cw, h, c.DS.colors.tableTotal);

      if (tipo.header) {
        const texto = _rrFormatarCabecalhoTabela_(textoOriginal);
        if (col === 0) {
          _rrUmaLinha_(c.slide, xx + 4, yy, cw - 8, h, texto,
            { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
              fonte: c.DS.typography.tables, align: 'L', folga: 0 });
        } else {
          _rrBloco_(c.slide, xx + 1, yy, cw - 2, h, texto,
            { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
              fonte: c.DS.typography.tables, folga: _RR_RECUO_TEXTBOX / 2 });
        }
      } else {
        const corNeutra = c.DS.colors.textMain;
        const cor = colunasComparativas[col]
          ? _rrCorValorComparativo_(textoOriginal, corNeutra, false, op.modoCor) : corNeutra;
        _rrUmaLinha_(c.slide, xx + (col === 0 ? 4 : 1), yy,
          cw - (col === 0 ? 8 : 2), h, textoOriginal,
          { fs: fsBody, fsMin: fsBody, bold: tipo.total || colunasComparativas[col], cor: cor,
            fonte: c.DS.typography.tables, align: col === 0 ? 'L' : 'C', folga: 0 });
      }
      xx += cw;
    });
    yy += h;
  });

  return { x: x, y: y, w: w, h: yy - y, linhas: m.length, colunas: nCol };
}

function _dcGerarSlideBloco_(titulo, entidade, bloco, op) {
  const fonte = 'Fonte: ' + bloco.aba + ' · linha ' + bloco.linha;
  const c = _dcNovoSlide_(titulo, entidade, fonte, _dcAvisoFonte_(bloco));
  _dcDesenharTabela_(c, bloco.matriz, op || {});
}

function _dcGerarTemaEmpresa_(tema, entidade) {
  const e = _dcEntidade_(entidade), bloco = obterBlocoDeck_(tema, entidade);
  const titulo = tema === 'RECEITAS' ? 'Receitas' : 'Despesas';
  const comparativo = _dcNovoSlideComparativo_(titulo, e.titulo, bloco);
  _dcDesenharTabelaComparativa_(comparativo, bloco.matriz, tema === 'DESPESAS'
    ? { densidade: 'dense', modoCor: 'despesa' }
    : { densidade: 'regular', modoCor: 'matematico' });
}

function gerarSlidePlaceholderFinanceiro_(titulo, entidade, motivo) {
  const c = _dcNovoSlide_(titulo, entidade || 'Resultados Financeiros', null, null);
  const x = c.W * .16, y = c.H * .33, w = c.W * .68, h = c.H * .34;
  _rrCelula_(c.slide, x, y, w, h, c.DS.colors.tableStripe);
  _rrBloco_(c.slide, x + w * .08, y + h * .16, w * .84, h * .22,
    'Fonte de dados não disponível',
    { fs: c.W * .022, fsMin: c.W * .022, bold: true,
      cor: c.DS.colors.brandDark, fonte: c.DS.typography.titles });
  _rrBloco_(c.slide, x + w * .10, y + h * .48, w * .80, h * .20,
    motivo || 'Painel mantido na estrutura para preenchimento quando a fonte for disponibilizada.',
    { fs: c.W * .0115, fsMin: c.W * .0115, cor: c.DS.colors.textBody,
      fonte: c.DS.typography.body });
  _rrUmaLinha_(c.slide, x, y + h * .77, w, h * .10, obterMesReferencia_().label,
    { fs: c.W * .0105, fsMin: c.W * .0105, bold: true,
      cor: c.DS.colors.brandMed, fonte: c.DS.typography.body });
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
  _capaFundo_(slide, W, H);
  _dsAplicarMarcaEscura_(slide, W, H,
    _dcReferencia_().texto.toUpperCase(), 'Expandir Eficiência');
  _rrBloco_(slide, W * .22, H * .38, W * .56, H * .16, 'Obrigado',
    { fs: 30, fsMin: 22, bold: true, cor: '#FFFFFF' });
  _rrBloco_(slide, W * .22, H * .55, W * .56, H * .12, 'capitalrealty.com.br',
    { fs: 13, fsMin: 13, bold: true, cor: DS.colors.brandSoft, fonte: DS.typography.body });
  _rrUmaLinha_(slide, W * .22, H * .68, W * .56, H * .045,
    'Curitiba · Paraná  |  41 2169 6850',
    { fs: 9, cor: '#FFFFFF', fonte: DS.typography.body });
}
