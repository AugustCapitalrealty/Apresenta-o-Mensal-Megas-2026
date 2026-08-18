/**
 * ARQUIVO: Slide01_ResumoResultado.gs
 * SLIDE 01 — RESUMO DO RESULTADO
 *
 * Quadro de EBITDA por empresa (Mês | Acumulado do ano | Ritmo), com a Margem
 * EBITDA/ROL logo abaixo de cada empresa e a linha TOTAL ao final, seguido do
 * quadro de Ebitda Pré-Premiação. Layout no estilo do print que a Ester
 * mandou (cabeçalho em duas linhas mescladas, linhas de empresa/margem
 * alternadas, TOTAL em destaque).
 *
 * Todo o conteúdo numérico vem de obterResumoResultadoEBITDA_() e
 * obterEbitdaPrePremiacao_() (02_Dados.gs), lido direto da aba "Quadro
 * EBITDA" com getDisplayValue() — o slide nunca inventa nem reformata número,
 * só desenha o que a planilha mostra.
 */

function gerarSlideResumoResultado() {
  const deck  = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const mX = DS.layout.marginX;

  const dados      = obterResumoResultadoEBITDA_();
  const premiacao  = obterEbitdaPrePremiacao_();

  slide.getBackground().setSolidFill('#FFFFFF');

  // Grafismo de fundo — elipse suave no canto superior direito (mesma
  // assinatura do cabeçalho padrão dos outros projetos do repositório).
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 380, -160, 520, 520);
  ellipse.getFill().setSolidFill(DS.colors.brandLight, 0.045);
  ellipse.getBorder().setTransparent();

  // Título + subtítulo (mês/ano vêm dos DADOS — nunca diverge da tabela)
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX, H * 0.035, W * 0.6, H * 0.075);
  titulo.getFill().setTransparent();
  titulo.getText().setText('Resumo do Resultado').getTextStyle()
    .setFontSize(22).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  const subtitulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX, H * 0.11, W * 0.6, H * 0.05);
  subtitulo.getFill().setTransparent();
  subtitulo.getText().setText(_rrMesAno_(dados.mes, dados.ano)).getTextStyle()
    .setFontSize(13).setForegroundColor(DS.colors.brandMed).setFontFamily(DS.typography.body);

  // Tabela principal — EBITDA por empresa
  const tabTopo    = H * 0.19;
  const tabAltura  = H * 0.44;
  _rrTabelaEbitda_(slide, W, mX, tabTopo, tabAltura, dados);

  // Ebitda Pré-Premiação
  const ppTituloY = tabTopo + tabAltura + H * 0.035;
  _rrTituloSecao_(slide, mX, ppTituloY, premiacao.titulo.split('\n')[0]);
  _rrTabelaPremiacao_(slide, mX, ppTituloY + H * 0.045, premiacao);

  // Logo Capital Realty, canto inferior direito
  try {
    const blob = DriveApp.getFileById(DS.assets.logoId).getBlob();
    slide.insertImage(blob, W - mX - DS.assets.logoW, H - 24 - DS.assets.logoH, DS.assets.logoW, DS.assets.logoH);
  } catch (e) {
    Logger.log('Resumo do Resultado: logo não carregado. ' + e.message);
  }

  Logger.log('Slide "Resumo do Resultado" gerado → ' + dados.mes + '/' + dados.ano);
}

// "JUNHO" + 2026 → "Junho/2026"
function _rrMesAno_(mesNome, ano) {
  const nome = String(mesNome || '').trim();
  const curto = nome ? nome.charAt(0) + nome.slice(1).toLowerCase() : '';
  return curto + '/' + ano;
}


// ==========================================
// TABELA — EBITDA (Em R$/Mil)
// ==========================================
// Cabeçalho em duas linhas (super-linha com os 3 grupos + sub-linha com os 15
// rótulos de coluna), depois uma linha por empresa (branca) com a Margem
// EBITDA/ROL logo abaixo (cinza claro) quando existir, e TOTAL em destaque.
function _rrTabelaEbitda_(slide, W, mX, topo, altura, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const larguraTotal = W - mX * 2;
  const labelW = larguraTotal * 0.15;
  const valW   = (larguraTotal - labelW) / 15;

  const hSuper = altura * 0.10;
  const hSub   = altura * 0.20;
  const restante = altura - hSuper - hSub;

  const n = dados.empresas.filter(e => !e.total).length;
  const pesoEmpresa = 1.15, pesoMargem = 0.85, pesoTotal = 1.3;
  const somaPesos = n * (pesoEmpresa + pesoMargem) + pesoTotal;
  const unidade = restante / somaPesos;
  const hEmpresa = unidade * pesoEmpresa;
  const hMargem  = unidade * pesoMargem;
  const hTotal   = unidade * pesoTotal;

  let y = topo;

  // ── Super-linha: rótulo (mescla as duas linhas de cabeçalho) + 3 grupos ──
  // Cabeçalhos NÃO usam a folga "sem quebra" (6º parâmetro false): o texto é
  // longo de propósito (ex.: "Real 2026 x Orç 2026") e PRECISA quebrar em
  // várias linhas — alargar a caixa invisível além da coluna faria o texto de
  // colunas vizinhas se sobrepor visualmente. A folga é só para valor curto
  // de uma linha só (ver skill slides-caixa-texto-sem-quebra).
  _rrCelula_(slide, mX, y, labelW, hSuper + hSub, 'EBITDA\n(Em R$/Mil)',
    DS.colors.brandDark, '#FFFFFF', 8, true, true, false);

  const grupos = [
    { titulo: dados.mes, cols: 5 },
    { titulo: dados.acumuladoLabel, cols: 5 },
    { titulo: dados.ritmoLabel, cols: 5 }
  ];
  let x = mX + labelW;
  grupos.forEach(g => {
    const gw = valW * g.cols;
    _rrCelula_(slide, x, y, gw, hSuper, g.titulo, DS.colors.brandDark, '#FFFFFF', 8, true, true, false);
    x += gw;
  });
  y += hSuper;

  // ── Sub-linha: os 15 rótulos de coluna ──
  x = mX + labelW;
  dados.headers.forEach(h => {
    _rrCelula_(slide, x, y, valW, hSub, h, DS.colors.brandDark, '#FFFFFF', 6.5, true, true, false);
    x += valW;
  });
  y += hSub;

  // ── Linhas de dados ──
  dados.empresas.forEach(emp => {
    if (emp.total) {
      _rrLinha_(slide, mX, y, labelW, valW, hTotal, 'TOTAL', emp.valores, DS.colors.brandMed, '#FFFFFF', 8, true);
      y += hTotal;
      return;
    }
    _rrLinha_(slide, mX, y, labelW, valW, hEmpresa, emp.nome, emp.valores, '#FFFFFF', DS.colors.textMain, 8, true);
    y += hEmpresa;
    if (emp.margem) {
      _rrLinha_(slide, mX, y, labelW, valW, hMargem, 'Margem EBITDA/ROL', emp.margem, '#EEF2F7', DS.colors.textBody, 7, false);
      y += hMargem;
    }
  });
}

// Uma linha completa da tabela principal: rótulo (à esquerda, alinhado à
// margem) + os 15 valores (centralizados).
function _rrLinha_(slide, mX, y, labelW, valW, h, rotulo, valores, corFundo, corTexto, fonte, negrito) {
  _rrCelula_(slide, mX, y, labelW, h, rotulo, corFundo, corTexto, fonte, negrito, false);
  let x = mX + labelW;
  valores.forEach(v => {
    _rrCelula_(slide, x, y, valW, h, v, corFundo, corTexto, fonte, negrito, true);
    x += valW;
  });
}


// ==========================================
// TABELA — EBITDA PRÉ-PREMIAÇÃO
// ==========================================
function _rrTabelaPremiacao_(slide, mX, topo, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const largura = 460;
  const labelW  = largura * 0.42;
  const valW    = (largura - labelW) / 3;
  const larguras = [labelW, valW, valW, valW];
  const hHeader = 26, hLinha = 20;

  let y = topo;
  let x = mX;
  ['Ebitda Pré-Premiação Anual', 'Orçado 2026', 'Ritmo 2026', 'Ritmo 2026 x Orç 2026'].forEach((t, i) => {
    _rrCelula_(slide, x, y, larguras[i], hHeader, t, DS.colors.brandDark, '#FFFFFF', 7, true, i > 0);
    x += larguras[i];
  });
  y += hHeader;

  dados.linhas.forEach((linha, i) => {
    const corFundo = (i % 2 === 0) ? '#FFFFFF' : '#EEF2F7';
    x = mX;
    [linha.nome, linha.orcado, linha.ritmo, linha.variacao].forEach((v, ci) => {
      _rrCelula_(slide, x, y, larguras[ci], hLinha, v, corFundo, DS.colors.textMain, 8, ci === 0, ci > 0);
      x += larguras[ci];
    });
    y += hLinha;
  });
}

function _rrTituloSecao_(slide, x, y, texto) {
  const DS = CR_DESIGN_SYSTEM;
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, 320, 20);
  tb.getFill().setTransparent();
  tb.getText().setText(texto).getTextStyle()
    .setFontSize(13).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);
}


// ==========================================
// HELPER — CÉLULA (fundo + texto "sem quebra")
// ==========================================
// Fundo (RECTANGLE) e texto (TEXT_BOX independente) são duas shapes
// separadas: a TEXT_BOX não tem cor própria, então alargá-la além da célula
// visível não muda a aparência — só vence o recuo interno da API que faria
// valor curto ("12%", "TOTAL") quebrar em duas linhas à toa. Ver a skill
// slides-caixa-texto-sem-quebra. Cabeçalhos longos (ex.: "Real 2026 x Orç
// 2026") PRECISAM quebrar em várias linhas — para esses, chame com
// comFolga=false (12º parâmetro), senão a caixa invisível alargada faz o
// texto de colunas vizinhas se sobrepor.
function _rrCelula_(slide, x, y, w, h, texto, corFundo, corTexto, fonteSize, negrito, centralizado, comFolga) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(corFundo);
  bg.getBorder().getLineFill().setSolidFill('#FFFFFF');
  bg.getBorder().setWeight(0.75);

  const folga = (comFolga === false) ? 0 : 10;
  const padX = centralizado ? 2 : 6;
  const tx = centralizado ? x + padX - folga : x + padX;
  const tw = centralizado ? w - padX * 2 + folga * 2 : w - padX + folga;

  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y, tw, h);
  tb.getFill().setTransparent();
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tb.getText().setText(String(texto)).getTextStyle()
    .setFontSize(fonteSize).setBold(!!negrito).setForegroundColor(corTexto)
    .setFontFamily(CR_DESIGN_SYSTEM.typography.titles);
  const ps = tb.getText().getParagraphStyle();
  ps.setParagraphAlignment(centralizado ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  // setLineSpacing abaixo de 100 lança "Invalid argument: spacing".
  ps.setLineSpacing(100);
}
