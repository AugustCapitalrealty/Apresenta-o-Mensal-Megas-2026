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
 * São 16 colunas num slide só: cada coluna de valor tem ~38pt, e a TEXT_BOX do
 * Slides come ~7pt de cada lado em recuo interno que a API não desliga. Foram
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
  const deck  = getDeckMensal_();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  // Margem enxuta: com 16 colunas, cada ponto de margem sai da largura das
  // colunas, que é justamente o recurso escasso deste slide.
  const mX = W * 0.022;

  const dados     = obterResumoResultadoEBITDA_();
  const premiacao = obterEbitdaPrePremiacao_();

  slide.getBackground().setSolidFill('#FFFFFF');

  // Grafismo de fundo — elipse suave no canto superior direito (mesma
  // assinatura do cabeçalho padrão dos outros projetos do repositório).
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W * 0.62, -H * 0.32, W * 0.55, W * 0.55);
  ellipse.getFill().setSolidFill(DS.colors.brandLight, 0.045);
  ellipse.getBorder().setTransparent();

  // ── Título + subtítulo (mês/ano vêm dos DADOS — nunca diverge da tabela) ──
  _rrUmaLinha_(slide, mX, H * 0.045, W * 0.55, H * 0.080, 'Resumo do Resultado',
    { fs: W * 0.029, bold: true, cor: DS.colors.textMain, align: 'L', folga: 0 });

  _rrUmaLinha_(slide, mX, H * 0.128, W * 0.55, H * 0.052, _rrMesAno_(dados.mes, dados.ano),
    { fs: W * 0.018, cor: DS.colors.brandMed, fonte: DS.typography.body, align: 'L', folga: 0 });

  // ── Logo Capital Realty ──
  // Vai no TOPO, ao lado do título, e não no rodapé: no rodapé ele disputava
  // espaço com a tabela de Pré-Premiação e obrigava essa tabela a ficar
  // espremida na metade esquerda do slide. Aqui em cima, as duas tabelas usam
  // a largura inteira.
  try {
    const blob = DriveApp.getFileById(DS.assets.logoId).getBlob();
    slide.insertImage(blob, W - mX - DS.assets.logoW, H * 0.055, DS.assets.logoW, DS.assets.logoH);
  } catch (e) {
    Logger.log('Resumo do Resultado: logo não carregado. ' + e.message);
  }

  // ── Tabela principal — EBITDA por empresa ──
  const tabTopo   = H * 0.205;
  const tabAltura = H * 0.435;
  _rrTabelaEbitda_(slide, W, mX, tabTopo, tabAltura, dados);

  // ── Ebitda Pré-Premiação ──
  // O título tem faixa própria ACIMA da tabela: quando os dois quase se
  // encostavam, a tabela (shape mais nova, portanto por cima) cobria a metade
  // de baixo das letras do título.
  const ppTituloY = H * 0.685;
  const ppTabelaY = H * 0.762;
  const ppBase    = H * 0.955;

  _rrUmaLinha_(slide, mX, ppTituloY, W * 0.55, H * 0.058, _rrPrimeiraLinha_(premiacao.titulo),
    { fs: W * 0.020, bold: true, cor: DS.colors.textMain, align: 'L', folga: 0 });

  _rrTabelaPremiacao_(slide, W, mX, ppTabelaY, ppBase - ppTabelaY, premiacao);

  Logger.log('Slide "Resumo do Resultado" gerado → ' + dados.mes + '/' + dados.ano);
}

// "JUNHO" + 2026 → "Junho/2026"
function _rrMesAno_(mesNome, ano) {
  const nome = String(mesNome || '').trim();
  const curto = nome ? nome.charAt(0) + nome.slice(1).toLowerCase() : '';
  return curto + '/' + ano;
}

// O rótulo da planilha vem com quebra ("Ebitda Pré-Premiação Anual\nRitmo
// 2026"); no slide o ano já aparece nos cabeçalhos das colunas.
function _rrPrimeiraLinha_(txt) {
  return String(txt || '').split('\n')[0].trim();
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
function _rrTabelaEbitda_(slide, W, mX, topo, altura, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const larguraTotal = W - mX * 2;
  const nCols  = dados.headers.length || 15;
  // "CR Estacionamentos" é o rótulo mais longo e é ele que dimensiona esta
  // coluna — com 0,155 ele encostava no primeiro valor.
  const labelW = larguraTotal * 0.175;
  const valW   = (larguraTotal - labelW) / nCols;

  const hBanda = altura * 0.100;   // faixa dos grupos (JUNHO / ACUMULADO / RITMO)
  // Faixa alta de propósito: "Real 2026 x Real 2025" quebra em 3–4 linhas numa
  // coluna de ~38pt, e é melhor dar altura do que encolher a fonte até sumir.
  const hSub   = altura * 0.260;
  const restante = altura - hBanda - hSub;

  const nEmpresas = dados.empresas.filter(e => !e.total).length;
  const pesoEmpresa = 1.15, pesoMargem = 0.85, pesoTotal = 1.3;
  const somaPesos = nEmpresas * (pesoEmpresa + pesoMargem) + pesoTotal;
  const unidade = restante / Math.max(1, somaPesos);
  const hEmpresa = unidade * pesoEmpresa;
  const hMargem  = unidade * pesoMargem;
  const hTotal   = unidade * pesoTotal;

  // Fontes-base; _rrUmaLinha_/_rrBloco_ encolhem a partir daqui se precisar.
  const fsBanda  = W * 0.0115;
  const fsHeader = W * 0.0098;
  const fsValor  = W * 0.0115;
  const fsMargem = W * 0.0100;

  let y = topo;

  // ── Faixa 1: rótulo (ocupa as duas faixas de cabeçalho) + 3 grupos ──
  _rrCelula_(slide, mX, y, labelW, hBanda + hSub, DS.colors.brandDark);
  _rrBloco_(slide, mX, y, labelW, hBanda + hSub, 'EBITDA\n(Em R$/Mil)',
    { fs: fsBanda, bold: true, cor: '#FFFFFF' });

  const grupos = [dados.mes, dados.acumuladoLabel, dados.ritmoLabel];
  const colsPorGrupo = Math.round(nCols / grupos.length);
  let x = mX + labelW;
  grupos.forEach((titulo, i) => {
    // O último grupo leva as colunas que sobraram, para a soma fechar exata
    // com a largura da tabela mesmo se nCols não for múltiplo de 3.
    const cols = (i === grupos.length - 1) ? (nCols - colsPorGrupo * (grupos.length - 1)) : colsPorGrupo;
    const gw = valW * cols;
    _rrCelula_(slide, x, y, gw, hBanda, DS.colors.brandDark);
    _rrUmaLinha_(slide, x, y, gw, hBanda, titulo, { fs: fsBanda, bold: true, cor: '#FFFFFF' });
    x += gw;
  });
  y += hBanda;

  // ── Faixa 2: os rótulos de coluna ──
  // Aqui é onde a primeira versão quebrou "Ritmo" no meio da palavra: são
  // rótulos longos ("Real 2026 x Orç 2026") em coluna de ~38pt. _rrBloco_
  // deixa quebrar entre palavras e encolhe a fonte até o bloco caber.
  x = mX + labelW;
  dados.headers.forEach(h => {
    _rrCelula_(slide, x, y, valW, hSub, DS.colors.brandDark);
    _rrBloco_(slide, x, y, valW, hSub, h, { fs: fsHeader, bold: true, cor: '#FFFFFF' });
    x += valW;
  });
  y += hSub;

  // ── Linhas de dados ──
  dados.empresas.forEach(emp => {
    if (emp.total) {
      _rrLinha_(slide, mX, y, labelW, valW, hTotal, 'TOTAL', emp.valores,
        DS.colors.brandMed, '#FFFFFF', fsValor, true);
      y += hTotal;
      return;
    }
    _rrLinha_(slide, mX, y, labelW, valW, hEmpresa, emp.nome, emp.valores,
      '#FFFFFF', DS.colors.textMain, fsValor, true);
    y += hEmpresa;
    if (emp.margem) {
      _rrLinha_(slide, mX, y, labelW, valW, hMargem, 'Margem EBITDA/ROL', emp.margem,
        '#EEF2F7', DS.colors.textBody, fsMargem, false);
      y += hMargem;
    }
  });
}

// Uma linha completa: rótulo (à esquerda) + os valores (centralizados).
function _rrLinha_(slide, mX, y, labelW, valW, h, rotulo, valores, corFundo, corTexto, fs, negrito) {
  const padL = labelW * 0.09;
  _rrCelula_(slide, mX, y, labelW, h, corFundo);
  _rrUmaLinha_(slide, mX + padL, y, labelW - padL, h, rotulo,
    { fs: fs, bold: negrito, cor: corTexto, align: 'L' });

  let x = mX + labelW;
  valores.forEach(v => {
    _rrCelula_(slide, x, y, valW, h, corFundo);
    _rrUmaLinha_(slide, x, y, valW, h, v, { fs: fs, bold: negrito, cor: corTexto });
    x += valW;
  });
}


// ==========================================
// TABELA — EBITDA PRÉ-PREMIAÇÃO
// ==========================================
// Os rótulos das colunas vêm da planilha (não são escritos aqui): eles citam o
// ano ("Orçado 2026", "Ritmo 2026 x Orç 2026") e ficariam errados na virada do
// exercício se estivessem no código.
function _rrTabelaPremiacao_(slide, W, mX, topo, alturaDisp, dados) {
  const DS = CR_DESIGN_SYSTEM;
  // Largura cheia, igual à tabela de cima: com o logo movido para o topo, não
  // há mais nada disputando o rodapé, e uma tabela estreita deixava metade do
  // slide vazia.
  const largura = W - mX * 2;
  const labelW  = largura * 0.34;
  const nCols   = dados.colunas.length || 3;
  const valW    = (largura - labelW) / nCols;

  // O cabeçalho tem rótulo longo em coluna estreita, então precisa de mais
  // altura que as linhas de dados; o resto se divide pelas linhas.
  const nLinhas = Math.max(1, dados.linhas.length);
  const hHeader = alturaDisp * 0.30;
  const hLinha  = (alturaDisp - hHeader) / nLinhas;

  const fsHeader = W * 0.0100;
  const fsLinha  = W * 0.0115;
  const padL = labelW * 0.06;

  let y = topo;
  _rrCelula_(slide, mX, y, labelW, hHeader, DS.colors.brandDark);
  _rrBloco_(slide, mX + padL, y, labelW - padL, hHeader, _rrPrimeiraLinha_(dados.titulo),
    { fs: fsHeader, bold: true, cor: '#FFFFFF', align: 'L' });

  let x = mX + labelW;
  dados.colunas.forEach(nome => {
    _rrCelula_(slide, x, y, valW, hHeader, DS.colors.brandDark);
    _rrBloco_(slide, x, y, valW, hHeader, nome, { fs: fsHeader, bold: true, cor: '#FFFFFF' });
    x += valW;
  });
  y += hHeader;

  dados.linhas.forEach((linha, i) => {
    const corFundo = (i % 2 === 0) ? '#FFFFFF' : '#EEF2F7';
    _rrCelula_(slide, mX, y, labelW, hLinha, corFundo);
    _rrUmaLinha_(slide, mX + padL, y, labelW - padL, hLinha, linha.nome,
      { fs: fsLinha, bold: true, cor: DS.colors.textMain, align: 'L' });

    x = mX + labelW;
    linha.valores.forEach(v => {
      _rrCelula_(slide, x, y, valW, hLinha, corFundo);
      _rrUmaLinha_(slide, x, y, valW, hLinha, v, { fs: fsLinha, cor: DS.colors.textMain });
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
// ~38pt e a média achatava justamente o caso ruim — "Ritmo 2026 x Real 2025" é
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


// ==========================================
// DESENHO
// ==========================================
// Fundo da célula. É uma shape SEPARADA do texto: por isso a caixa de texto
// pode ser desenhada mais larga que a célula sem mudar nada na aparência.
function _rrCelula_(slide, x, y, w, h, corFundo) {
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(corFundo);
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
  const centro = o.align !== 'L';
  const folga  = o.folga === undefined ? _RR_FOLGA : o.folga;
  const fsMin  = o.fsMin || 5;
  let   fs     = o.fs === undefined ? 10 : o.fs;

  const bx = centro ? x - folga : x;
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
    centro ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return box;
}

/**
 * Texto que PODE ocupar várias linhas (rótulo de coluna do cabeçalho), mas
 * encolhe até (a) a maior palavra caber na largura, para o Slides não partir
 * no meio de uma palavra, e (b) o bloco quebrado caber na altura da célula.
 */
function _rrBloco_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;

  const o = op || {};
  const fonte  = o.fonte || CR_DESIGN_SYSTEM.typography.titles;
  const centro = o.align !== 'L';
  const folga  = o.folga === undefined ? _RR_FOLGA : o.folga;
  const fsMin  = o.fsMin || 4.5;
  let   fs     = o.fs === undefined ? 8 : o.fs;

  const bx = centro ? x - folga : x;
  const bw = centro ? w + folga * 2 : w + folga;
  const util = bw - _RR_RECUO_TEXTBOX;
  const alturaLinha = f => f * 1.18;

  while (fs > fsMin &&
         (_rrMaiorPalavra_(t, fs, fonte, o.bold) > util ||
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
                                  : SlidesApp.ParagraphAlignment.START)
    // O Slides recusa espaçamento < 100.
    .setLineSpacing(100);
  return box;
}
