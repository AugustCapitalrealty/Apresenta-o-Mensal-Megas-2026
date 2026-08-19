/**
 * ARQUIVO: Slide01_ResumoResultado.gs
 * SLIDE 01 — RESUMO DO RESULTADO
 *
 * Quadro de EBITDA por empresa (Mês | Acumulado do ano | Ritmo), com a Margem
 * EBITDA/ROL logo abaixo de cada empresa e a linha TOTAL ao final, seguido do
 * quadro de Ebitda Pré-Premiação.
 *
 * Todo o conteúdo numérico vem de obterResumoResultadoEBITDA_() e
 * obterEbitdaPrePremiacao_() (02_Dados.gs), lido da aba "Quadro EBITDA" com
 * getDisplayValue() — o slide nunca inventa nem reformata número, só desenha
 * o que a planilha mostra.
 *
 * POR QUE TUDO É MEDIDO ANTES DE DESENHAR
 * São 16 colunas num slide só: as colunas simples têm ~34pt e as comparativas
 * ~44pt. A TEXT_BOX do Slides come ~7pt de cada lado em recuo interno que a
 * API não desliga. Foram
 * três rodadas até fechar, e vale registrar o que cada uma ensinou:
 *
 *   1ª  fonte fixa → "Ritmo" quebrou em "Ritm"/"o", "CR Estacionamentos" vazou
 *       da coluna de rótulo e a tabela de baixo cobriu o próprio título.
 *   2ª  passou a medir, mas com a média única de caractere (0,58) herdada do
 *       Farol e folga de 9pt. As duas coisas erraram para o mesmo lado: a média
 *       subestima MAIÚSCULA e dígito, que é do que os cabeçalhos são feitos, e
 *       a folga de 9 deixava a largura útil PASSAR da largura da célula. Os
 *       cabeçalhos de RITMO rendiam ~2pt mais largos que a coluna e invadiam a
 *       vizinha.
 *   3ª  medição por CLASSE de caractere (_rrLarguraTexto_) e folga amarrada ao
 *       recuo (_RR_FOLGA), de forma que a linha não tem como render mais larga
 *       que a célula — e ainda sobra o _RR_RESPIRO.
 *
 * As helpers seguem megas-mensal/Farol_Guilherme.gs: _rrUmaLinha_ (texto curto,
 * encolhe até caber numa linha) e _rrBloco_ (cabeçalho, encolhe até o texto
 * quebrado caber na altura). Nenhuma caixa estoura quando o conteúdo muda, e o
 * slide continua fechando se a Ester acrescentar uma empresa na planilha.
 *
 * Tudo também é proporcional a W/H (nada de pt fixo), porque o deck pode ser
 * 720x405 ou 960x540 dependendo de como foi criado.
 *
 * COMO ISSO FOI CONFERIDO (vale para a próxima vez)
 * Medir o slide com a MESMA função de largura que o código usa não prova nada —
 * o teste concorda com o erro do código e passa. Foi o que aconteceu na 2ª
 * rodada. A conferência que valeu mede o texto com a métrica REAL do Montserrat
 * (canvas do Chromium com a fonte do Google Fonts) e compara com a largura da
 * célula; rodada contra a 2ª versão, ela acusa exatamente os dois cabeçalhos de
 * RITMO que apareciam vazando no slide.
 */

function gerarSlideResumoResultado() {
  const dados     = obterResumoResultadoEBITDA_();
  const premiacao = obterEbitdaPrePremiacao_();
  const c = _dsNovoSlideClaro_({
    entidade: 'Resumo do Resultado',
    topico: _rrMesAno_(dados.mes, dados.ano),
    fonte: 'Fonte: ' + QUADRO_EBITDA_SHEET,
    aviso: _rrAvisoMesFonteTexto_(dados.mes, dados.ano),
    conteudoY: .16
  });
  const slide = c.slide, W = c.W, H = c.H, DS = c.DS;
  // A tabela de 16 colunas usa uma margem própria menor; o cabeçalho externo
  // e a marca continuam exatamente nos tokens do shell canônico.
  const mX = W * 0.022;

  // ── Tabela principal — EBITDA por empresa ──
  const tabTopo   = H * DS.layout.light.contentTop;
  const tabAltura = H * 0.405;
  // Um único tamanho para todos os cabeçalhos de coluna das duas tabelas.
  // As bandas de grupo continuam maiores por serem outro nível hierárquico.
  const fsCabecalhoTabelas = W * DS.typography.scale.tableHeader;
  _rrTabelaEbitda_(slide, W, mX, tabTopo, tabAltura, dados, fsCabecalhoTabelas);

  // ── Ebitda Pré-Premiação ──
  // O título tem faixa própria ACIMA da tabela: quando os dois quase se
  // encostavam, a tabela (shape mais nova, portanto por cima) cobria a metade
  // de baixo das letras do título.
  const ppTituloY = H * 0.595;
  const ppTabelaY = H * 0.665;
  const ppBase    = H * DS.layout.light.tableBottom;

  _rrUmaLinha_(slide, mX, ppTituloY, W * 0.55, H * 0.058, _rrPrimeiraLinha_(premiacao.titulo),
    { fs: W * 0.020, bold: true, cor: DS.colors.textMain, align: 'L', folga: 0 });

  _rrTabelaPremiacao_(slide, W, mX, ppTabelaY, ppBase - ppTabelaY,
    premiacao, fsCabecalhoTabelas);

  Logger.log('Slide "Resumo do Resultado" gerado → ' + dados.mes + '/' + dados.ano);
}

// "JUNHO" + 2026 → "Junho/2026"
function _rrMesAno_(mesNome, ano) {
  const nome = String(mesNome || '').trim();
  const curto = nome ? nome.charAt(0) + nome.slice(1).toLowerCase() : '';
  return curto + '/' + ano;
}

function _rrAvisoMesFonteTexto_(mesNome, ano) {
  const fonteLabel = String(mesNome || '').toUpperCase() + ' / ' + ano;
  if (_finNorm_(fonteLabel) === _finNorm_(obterMesReferencia_().label)) return '';
  return 'Referência geral: ' + obterMesReferencia_().label +
    ' · fonte preservada: ' + _rrMesAno_(mesNome, ano);
}

// O mês do quadro pertence à fonte e nunca é renomeado para acompanhar a
// referência geral do deck. Quando diverge, o aviso deixa as duas referências
// visíveis sem alterar os números nem o rótulo original.
function _rrAvisoMesFonte_(slide, W, H, mesNome, ano, fonte) {
  const aviso = _rrAvisoMesFonteTexto_(mesNome, ano);
  if (!aviso) return;
  const DS = CR_DESIGN_SYSTEM;
  _rrBloco_(slide, W * DS.layout.light.metadataX, H * .059,
    W * DS.layout.light.metadataW, H * .041,
    'Fonte ' + fonte + ' · ' + aviso,
    { fs: W * DS.typography.scale.metadata,
      fsMin: W * DS.typography.scale.metadata, bold: true,
      cor: DS.colors.warningText, fonte: DS.typography.body,
      align: 'R', folga: 0, preservarLinhas: false });
}

// O rótulo da planilha vem com quebra ("Ebitda Pré-Premiação Anual\nRitmo
// 2026"); no slide o ano já aparece nos cabeçalhos das colunas.
function _rrPrimeiraLinha_(txt) {
  return String(txt || '').split('\n')[0].trim();
}

/**
 * Padroniza somente a apresentação dos cabeçalhos. O texto armazenado na
 * planilha não é alterado: quebras existentes são primeiro normalizadas e as
 * referências de período recebem quebras semânticas previsíveis.
 *
 *   Orç 2026                 → Orç\n2026
 *   Real 2026 x Orç 2026    → Real 2026\nx\nOrç 2026
 */
function _rrFormatarCabecalhoTabela_(texto) {
  const limpo = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
  if (!limpo) return '';

  const comparativo = limpo.match(/^(.+?\s+20\d{2})\s+x\s+(.+?\s+20\d{2})$/i);
  if (comparativo) return comparativo[1].trim() + '\n' + 'x' + '\n' + comparativo[2].trim();

  const periodo = limpo.match(/^(Real|Orç|Orcado|Orçado|Ritmo)\s+(20\d{2})$/i);
  if (periodo) return periodo[1] + '\n' + periodo[2];

  return limpo;
}

function _rrEhCabecalhoComparativo_(texto) {
  const normalizado = String(texto == null ? '' : texto).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return /(^| )x( |$)/.test(normalizado) || /^(variacao|var)( |$)/.test(normalizado);
}

// Distribui a largura pela necessidade real dos trechos explícitos. Todos os
// cabeçalhos mantêm a mesma fonte: comparativos recebem o necessário e as
// colunas simples dividem o restante, em vez de cada caixa reduzir sua fonte.
function _rrLargurasCabecalhoTemporal_(headers, larguraTotal, fs) {
  const DS = CR_DESIGN_SYSTEM, fonte = DS.typography.titles;
  const comparativas = headers.map(_rrEhCabecalhoComparativo_);
  const qtdComp = comparativas.filter(Boolean).length;
  if (!qtdComp) return headers.map(() => larguraTotal / Math.max(1, headers.length));

  let larguraComp = 0;
  headers.forEach((h, i) => {
    if (!comparativas[i]) return;
    const formatado = _rrFormatarCabecalhoTabela_(h);
    larguraComp = Math.max(larguraComp,
      _rrMaiorLinhaExplicita_(formatado, fs, fonte, true) + 1);
  });
  const qtdSimples = headers.length - qtdComp;
  const larguraSimples = qtdSimples
    ? (larguraTotal - larguraComp * qtdComp) / qtdSimples : 0;
  if (larguraSimples <= 0) throw new Error('Cabeçalho temporal sem largura para as colunas simples.');

  headers.forEach((h, i) => {
    if (comparativas[i]) return;
    const necessaria = _rrMaiorLinhaExplicita_(
      _rrFormatarCabecalhoTabela_(h), fs, fonte, true) + 1;
    if (necessaria > larguraSimples) {
      throw new Error('Cabeçalho "' + h + '" não cabe no tamanho institucional.');
    }
  });
  return comparativas.map(c => c ? larguraComp : larguraSimples);
}

// Comparativos gerais seguem o sinal matemático. Em Despesas, o modo explícito
// inverte a semântica: redução é favorável (verde) e aumento é desfavorável
// (vermelho). Zero, “N/C” e células vazias mantêm a cor original.
function _rrCorValorComparativo_(valor, corNeutra, fundoEscuro, modo) {
  const numero = typeof valor === 'number' ? valor : _finNumero_(valor);
  if (numero === null || !isFinite(numero) || numero === 0) return corNeutra;
  const DS = CR_DESIGN_SYSTEM;
  const positivo = modo === 'despesa' ? numero < 0 : numero > 0;
  if (fundoEscuro) return positivo
    ? DS.colors.comparisonPositiveDark : DS.colors.comparisonNegativeDark;
  return positivo ? DS.colors.comparisonPositive : DS.colors.comparisonNegative;
}


// ==========================================
// TABELA — EBITDA (Em R$/Mil)
// ==========================================
// Cabeçalho em duas faixas (banda dos 3 grupos + os 15 rótulos de coluna),
// depois uma linha por empresa (branca) com a Margem EBITDA/ROL logo abaixo
// (cinza claro) quando existir, e TOTAL em destaque.
//
// As alturas das linhas saem de pesos, não de pt fixo: se a Ester acrescentar
// uma empresa na planilha, a tabela redistribui a altura em vez de vazar para
// fora do slide.
function _rrTabelaEbitda_(slide, W, mX, topo, altura, dados, fsCabecalhoUniforme) {
  const DS = CR_DESIGN_SYSTEM;
  const larguraTotal = W - mX * 2;
  const nCols  = dados.headers.length || 15;
  const colunasComparativas = dados.headers.map(_rrEhCabecalhoComparativo_);
  // "CR Estacionamentos" é o rótulo mais longo e é ele que dimensiona esta
  // coluna — com 0,155 ele encostava no primeiro valor.
  const labelW = larguraTotal * 0.175;
  const larguraValores = larguraTotal - labelW;
  const fsHeader = fsCabecalhoUniforme || W * DS.typography.scale.tableHeader;
  const valWs = _rrLargurasCabecalhoTemporal_(dados.headers, larguraValores, fsHeader);

  const hBanda = altura * 0.100;   // faixa dos grupos (JUNHO / ACUMULADO / RITMO)
  // Os comparativos ocupam exatamente três linhas, todos no mesmo tamanho.
  const hSub   = altura * 0.260;
  const restante = altura - hBanda - hSub;

  const nEmpresas = dados.empresas.filter(e => !e.total).length;
  const pesoEmpresa = 1.15, pesoMargem = 0.85, pesoTotal = 1.3;
  const somaPesos = nEmpresas * (pesoEmpresa + pesoMargem) + pesoTotal;
  const unidade = restante / Math.max(1, somaPesos);
  const hEmpresa = unidade * pesoEmpresa;
  const hMargem  = unidade * pesoMargem;
  const hTotal   = unidade * pesoTotal;

  // As bandas formam um nível hierárquico maior. Todos os subcabeçalhos das
  // duas tabelas compartilham fsHeader, sem redução célula a célula.
  const fsBanda  = W * DS.typography.scale.tableGroup;
  const fsValor  = W * DS.typography.scale.tableBodyRegular;
  const fsMargem = W * DS.typography.scale.tableBodyCompact;
  if (hMargem <= fsMargem * 1.18 || hEmpresa <= fsValor * 1.18) {
    throw new Error('Resumo EBITDA sem altura para as fontes institucionais.');
  }

  let y = topo;

  // ── Faixa 1: rótulo (ocupa as duas faixas de cabeçalho) + 3 grupos ──
  _rrCelula_(slide, mX, y, labelW, hBanda + hSub, DS.colors.tableGroup);
  _rrBloco_(slide, mX, y, labelW, hBanda + hSub, 'EBITDA\n(Em R$/Mil)',
    { fs: fsBanda, fsMin: fsBanda, bold: true, cor: '#FFFFFF',
      fonte: DS.typography.titles });

  const grupos = [dados.mes, dados.acumuladoLabel, dados.ritmoLabel];
  const colsPorGrupo = Math.round(nCols / grupos.length);
  let x = mX + labelW, primeiraColunaGrupo = 0;
  grupos.forEach((titulo, i) => {
    // O último grupo leva as colunas que sobraram, para a soma fechar exata
    // com a largura da tabela mesmo se nCols não for múltiplo de 3.
    const cols = (i === grupos.length - 1) ? (nCols - colsPorGrupo * (grupos.length - 1)) : colsPorGrupo;
    const gw = valWs.slice(primeiraColunaGrupo, primeiraColunaGrupo + cols)
      .reduce((s, largura) => s + largura, 0);
    _rrCelula_(slide, x, y, gw, hBanda, DS.colors.tableGroup);
    _rrUmaLinha_(slide, x, y, gw, hBanda, titulo,
      { fs: fsBanda, fsMin: fsBanda, bold: true, cor: '#FFFFFF',
        fonte: DS.typography.titles });
    x += gw;
    primeiraColunaGrupo += cols;
  });
  y += hBanda;

  // ── Faixa 2: os rótulos de coluna ──
  // As larguras variáveis permitem manter uma única fonte: simples e
  // comparativos não são mais redimensionados individualmente.
  x = mX + labelW;
  dados.headers.forEach((h, i) => {
    const cw = valWs[i];
    _rrCelula_(slide, x, y, cw, hSub, DS.colors.tableHeader);
    _rrBloco_(slide, x, y, cw, hSub, _rrFormatarCabecalhoTabela_(h),
      { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
        fonte: DS.typography.titles, folga: _RR_RECUO_TEXTBOX / 2 });
    x += cw;
  });
  y += hSub;

  // ── Linhas de dados ──
  dados.empresas.forEach(emp => {
    if (emp.total) {
      _rrLinha_(slide, mX, y, labelW, valWs, hTotal, 'TOTAL', emp.valores,
        DS.colors.brandMed, '#FFFFFF', fsValor, true, colunasComparativas);
      y += hTotal;
      return;
    }
    _rrLinha_(slide, mX, y, labelW, valWs, hEmpresa, emp.nome, emp.valores,
      null, DS.colors.textMain, fsValor, true, colunasComparativas);
    y += hEmpresa;
    if (emp.margem) {
      _rrLinha_(slide, mX, y, labelW, valWs, hMargem, 'Margem EBITDA/ROL', emp.margem,
        DS.colors.tableStripe, DS.colors.textBody, fsMargem, false, colunasComparativas);
      y += hMargem;
    }
  });
}

// Uma linha completa: rótulo (à esquerda) + os valores (centralizados).
function _rrLinha_(slide, mX, y, labelW, valWs, h, rotulo, valores, corFundo, corTexto, fs, negrito, colunasComparativas) {
  const padL = labelW * 0.09;
  _rrCelula_(slide, mX, y, labelW, h, corFundo);
  _rrUmaLinha_(slide, mX + padL, y, labelW - padL, h, rotulo,
    { fs: fs, fsMin: fs, bold: negrito, cor: corTexto,
      fonte: CR_DESIGN_SYSTEM.typography.body, align: 'L' });

  let x = mX + labelW;
  valores.forEach((v, i) => {
    const cw = Array.isArray(valWs) ? valWs[i] : valWs;
    const corValor = colunasComparativas && colunasComparativas[i]
      ? _rrCorValorComparativo_(v, corTexto, corTexto === '#FFFFFF') : corTexto;
    _rrCelula_(slide, x, y, cw, h, corFundo);
    _rrUmaLinha_(slide, x, y, cw, h, v,
      { fs: fs, fsMin: fs, bold: negrito, cor: corValor,
        fonte: CR_DESIGN_SYSTEM.typography.body });
    x += cw;
  });
}


// ==========================================
// TABELA — EBITDA PRÉ-PREMIAÇÃO
// ==========================================
// Os rótulos das colunas vêm da planilha (não são escritos aqui): eles citam o
// ano ("Orçado 2026", "Ritmo 2026 x Orç 2026") e ficariam errados na virada do
// exercício se estivessem no código.
function _rrTabelaPremiacao_(slide, W, mX, topo, alturaDisp, dados, fsCabecalhoUniforme) {
  const DS = CR_DESIGN_SYSTEM;
  // Largura cheia, igual à tabela de cima. O limite inferior institucional
  // reserva uma faixa própria para o logo canônico.
  const largura = W - mX * 2;
  const labelW  = largura * 0.34;
  const nCols   = dados.colunas.length || 3;
  const colunasComparativas = dados.colunas.map(_rrEhCabecalhoComparativo_);
  const valW    = (largura - labelW) / nCols;

  // O cabeçalho tem rótulo longo em coluna estreita, então precisa de mais
  // altura que as linhas de dados; o resto se divide pelas linhas.
  const nLinhas = Math.max(1, dados.linhas.length);
  const hHeader = alturaDisp * 0.34;
  const hLinha  = (alturaDisp - hHeader) / nLinhas;

  const fsHeader = fsCabecalhoUniforme || W * DS.typography.scale.tableHeader;
  const fsLinha  = W * DS.typography.scale.tableBodyRegular;
  const padL = labelW * 0.06;
  if (hLinha <= fsLinha * 1.18) {
    throw new Error('Pré-Premiação sem altura para a fonte institucional.');
  }

  let y = topo;
  _rrCelula_(slide, mX, y, labelW, hHeader, DS.colors.tableHeader);
  _rrBloco_(slide, mX + padL, y, labelW - padL, hHeader, _rrPrimeiraLinha_(dados.titulo),
    { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
      fonte: DS.typography.titles, align: 'L' });

  let x = mX + labelW;
  dados.colunas.forEach(nome => {
    _rrCelula_(slide, x, y, valW, hHeader, DS.colors.tableHeader);
    _rrBloco_(slide, x, y, valW, hHeader, _rrFormatarCabecalhoTabela_(nome),
      { fs: fsHeader, fsMin: fsHeader, bold: true, cor: '#FFFFFF',
        fonte: DS.typography.titles, folga: _RR_RECUO_TEXTBOX / 2 });
    x += valW;
  });
  y += hHeader;

  dados.linhas.forEach((linha, i) => {
    const corFundo = (i % 2 === 0) ? null : DS.colors.tableStripe;
    _rrCelula_(slide, mX, y, labelW, hLinha, corFundo);
    _rrUmaLinha_(slide, mX + padL, y, labelW - padL, hLinha, linha.nome,
      { fs: fsLinha, fsMin: fsLinha, bold: true, cor: DS.colors.textMain,
        fonte: DS.typography.body, align: 'L' });

    x = mX + labelW;
    linha.valores.forEach((v, coluna) => {
      const corValor = colunasComparativas[coluna]
        ? _rrCorValorComparativo_(v, DS.colors.textMain, false) : DS.colors.textMain;
      _rrCelula_(slide, x, y, valW, hLinha, corFundo);
      _rrUmaLinha_(slide, x, y, valW, hLinha, v,
        { fs: fsLinha, fsMin: fsLinha, cor: corValor, fonte: DS.typography.body });
      x += valW;
    });
    y += hLinha;
  });
}


// ==========================================
// MEDIÇÃO DE TEXTO
// ==========================================
// A API do Slides não expõe métrica de fonte, então a largura é estimada.
//
// POR QUE NÃO USAR A MÉDIA ÚNICA DE Farol_Guilherme.gs (0,58 por caractere):
// lá as caixas são largas e um erro de 10% não aparece. Aqui as colunas têm
// estreitas e a média achatava justamente o caso ruim — "Ritmo 2026 x Real 2025" é
// quase todo MAIÚSCULA e dígito, que em Montserrat são bem mais largos que a
// média, então a conta dizia "cabe" e o Slides quebrava assim mesmo.
//
// Medir por CLASSE de caractere corrige isso: em Montserrat a maiúscula ocupa
// ~0,72em, o dígito ~0,60em, a minúscula ~0,58em, a pontuação ~0,34em e o
// espaço ~0,26em.
const _RR_EM = { maiuscula: 0.72, digito: 0.60, minuscula: 0.58, pontuacao: 0.34, espaco: 0.26 };

// Recuo interno que toda TEXT_BOX tem e a API não deixa desligar (~7pt de
// cada lado). É ele que faz texto curto quebrar dentro de caixa estreita.
const _RR_RECUO_TEXTBOX = 14;

function _rrLarguraTexto_(texto, fs, fonte, bold) {
  const t = String(texto);
  let em = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t.charAt(i);
    if (c === ' ') em += _RR_EM.espaco;
    else if (c >= '0' && c <= '9') em += _RR_EM.digito;
    // Maiúscula, incluindo acentuada (Ç, Á): só ela difere de si mesma em
    // minúsculo E é igual a si mesma em maiúsculo.
    else if (c !== c.toLowerCase() && c === c.toUpperCase()) em += _RR_EM.maiuscula;
    else if ('.,;:%-/()'.indexOf(c) >= 0) em += _RR_EM.pontuacao;
    else em += _RR_EM.minuscula;
  }
  // Montserrat é a referência das medidas acima; Open Sans é mais estreita.
  const fonteF = (fonte === 'Open Sans') ? 0.93 : 1;
  return em * fs * fonteF * (bold ? 1.05 : 1);
}

// Quantas linhas o texto ocupa numa caixa de largura `larguraCaixa`, quebrando
// só entre palavras (é assim que o Slides quebra) e respeitando as quebras
// explícitas do próprio texto.
function _rrLinhasTexto_(texto, larguraCaixa, fs, fonte, bold) {
  const util = Math.max(8, larguraCaixa - _RR_RECUO_TEXTBOX);
  let total = 0;
  String(texto).split('\n').forEach(paragrafo => {
    const palavras = paragrafo.split(/\s+/).filter(p => p !== '');
    if (!palavras.length) { total += 1; return; }
    let linhas = 1, atual = 0;
    palavras.forEach(p => {
      const wp = _rrLarguraTexto_(p, fs, fonte, bold);
      const wEspaco = atual === 0 ? 0 : _rrLarguraTexto_(' ', fs, fonte, bold);
      if (atual > 0 && atual + wEspaco + wp > util) { linhas++; atual = wp; }
      else { atual += wEspaco + wp; }
    });
    total += linhas;
  });
  return Math.max(1, total);
}

// A palavra mais longa é o que decide se dá para quebrar SÓ entre palavras:
// se ela sozinha não couber, o Slides parte no meio dela ("Ritmo" → "Ritm"/"o").
function _rrMaiorPalavra_(texto, fs, fonte, bold) {
  let maior = 0;
  String(texto).split(/[\s\n]+/).forEach(p => {
    if (p === '') return;
    maior = Math.max(maior, _rrLarguraTexto_(p, fs, fonte, bold));
  });
  return maior;
}

// Uma quebra explícita define a composição desejada do cabeçalho. Esta
// medida impede que o Slides torne a quebrar cada trecho internamente:
// "Real 2026\nx\nOrç 2026" permanece em exatamente três linhas.
function _rrMaiorLinhaExplicita_(texto, fs, fonte, bold) {
  let maior = 0;
  String(texto).split('\n').forEach(linha => {
    maior = Math.max(maior, _rrLarguraTexto_(linha, fs, fonte, bold));
  });
  return maior;
}


// ==========================================
// DESENHO
// ==========================================
// Fundo da célula. É uma shape SEPARADA do texto: por isso a caixa de texto
// pode ser desenhada mais larga que a célula sem mudar nada na aparência.
function _rrCelula_(slide, x, y, w, h, corFundo) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  if (corFundo) bg.getFill().setSolidFill(corFundo);
  else bg.getFill().setTransparent();
  bg.getBorder().getLineFill().setSolidFill('#FFFFFF');
  bg.getBorder().setWeight(0.75);
  return bg;
}

// Espaço que fica GARANTIDO livre dentro da célula, para o texto não encostar
// na borda nem no vizinho.
const _RR_RESPIRO = 4;

// A folga não é chute: é o recuo interno menos o respiro, dividido pelos dois
// lados. Assim a largura útil da caixa (bw − 14) fica igual à largura visível
// da célula MENOS o respiro — o Slides quebra a linha antes de encostar na
// borda, e o texto não tem como render mais largo que a célula.
//
// Foi isso que faltou nas duas versões anteriores: com folga maior que este
// valor, a largura útil passava da largura da célula e o cabeçalho
// ("Ritmo 2026 x Orç 2026") rendia ~2pt mais largo que a coluna, invadindo a
// vizinha — exatamente o que aparecia no slide.
const _RR_FOLGA = (_RR_RECUO_TEXTBOX - _RR_RESPIRO) / 2;

/**
 * Texto curto que TEM que caber numa linha só (valor de célula, rótulo de
 * empresa, título). Duas defesas combinadas, como em Farol_Guilherme.gs:
 *   1) a caixa é desenhada mais larga que a célula (folga simétrica quando
 *      centralizado, só à direita quando à esquerda) — devolve o recuo interno
 *      que o Slides tinha roubado, e é invisível porque a TEXT_BOX não tem
 *      fundo próprio;
 *   2) se ainda assim não couber, a fonte encolhe até caber (nunca < fsMin).
 * Ver .claude/skills/slides-caixa-texto-sem-quebra.
 */
function _rrUmaLinha_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"

  const o = op || {};
  const fonte  = o.fonte || CR_DESIGN_SYSTEM.typography.titles;
  const direita = o.align === 'R';
  const centro = o.align !== 'L' && !direita;
  const folga  = o.folga === undefined ? _RR_FOLGA : o.folga;
  const fsMin  = o.fsMin || 5;
  let   fs     = o.fs === undefined ? 10 : o.fs;

  const bx = centro ? x - folga : (direita ? x - folga : x);
  const bw = centro ? w + folga * 2 : w + folga;
  const util = bw - _RR_RECUO_TEXTBOX;

  while (fs > fsMin && _rrLarguraTexto_(t, fs, fonte, o.bold) > util) fs -= 0.25;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, y, bw, h);
  box.getFill().setTransparent();
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold)
    .setForegroundColor(o.cor || CR_DESIGN_SYSTEM.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    centro ? SlidesApp.ParagraphAlignment.CENTER :
      (direita ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START));
  return box;
}

/**
 * Texto que PODE ocupar várias linhas (rótulo de coluna do cabeçalho), mas
 * encolhe até (a) a maior palavra caber na largura, para o Slides não partir
 * no meio de uma palavra, (b) as três linhas dos comparativos permanecerem
 * inteiras e (c) o bloco quebrado caber na altura da célula.
 */
function _rrBloco_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;

  const o = op || {};
  const fonte  = o.fonte || CR_DESIGN_SYSTEM.typography.titles;
  const direita = o.align === 'R';
  const centro = o.align !== 'L' && !direita;
  const folga  = o.folga === undefined ? _RR_FOLGA : o.folga;
  const fsMin  = o.fsMin || 4.5;
  let   fs     = o.fs === undefined ? 8 : o.fs;

  const bx = centro ? x - folga : (direita ? x - folga : x);
  const bw = centro ? w + folga * 2 : w + folga;
  const util = bw - _RR_RECUO_TEXTBOX;
  const alturaLinha = f => f * 1.18;
  // Comparativos têm composição rígida de três linhas. Outros textos com
  // quebra manual continuam livres para se ajustar, salvo opção explícita.
  const comparativoTresLinhas = /\n\s*x\s*\n/i.test(t);
  const preservarLinhas = o.preservarLinhas === true ||
    (o.preservarLinhas !== false && comparativoTresLinhas);

  while (fs > fsMin &&
         (_rrMaiorPalavra_(t, fs, fonte, o.bold) > util ||
          (preservarLinhas && _rrMaiorLinhaExplicita_(t, fs, fonte, o.bold) > util) ||
          _rrLinhasTexto_(t, bw, fs, fonte, o.bold) * alturaLinha(fs) > h)) {
    fs -= 0.25;
  }

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, y, bw, h);
  box.getFill().setTransparent();
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold)
    .setForegroundColor(o.cor || CR_DESIGN_SYSTEM.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(centro ? SlidesApp.ParagraphAlignment.CENTER
                                  : (direita ? SlidesApp.ParagraphAlignment.END
                                             : SlidesApp.ParagraphAlignment.START))
    // O Slides recusa espaçamento < 100.
    .setLineSpacing(100);
  return box;
}
