/**
 * ARQUIVO: 00_Helpers.gs
 * HELPERS COMPARTILHADOS — número, texto e normalização
 *
 * POR QUE ESTE ARQUIVO EXISTE: o projeto tinha QUATRO conversores de
 * texto→número, cada um com uma regra diferente (um entendia negativo entre
 * parênteses, outro não; um devolvia null para vazio, outro devolvia ZERO),
 * quatro formatadores e dois normalizadores de acento com a mesma regex
 * escrita de jeitos diferentes. Ler um número passou a depender de qual
 * arquivo você estava.
 *
 * Aqui fica UMA implementação de cada. Os nomes antigos continuam existindo
 * como apelidos que chamam estas — assim nada precisa ser reescrito de uma vez
 * e o projeto não quebra no meio da mudança.
 */

// ==========================================
// NÚMERO
// ==========================================

/**
 * Texto → número, no formato da controladoria brasileira.
 *
 * Entende, tudo junto: "1.234,56", "(1.234,56)" como NEGATIVO (formato
 * contábil), "R$ 1.234", "67,21%", espaço não-quebrável.
 *
 * VAZIO DEVOLVE null, NÃO ZERO. É a lição 3 do CLAUDE.md: não medir é
 * diferente de medir zero, e as duas coisas precisam pintar diferente no
 * slide. Quem precisa de zero pede explicitamente com _numOuZero_.
 */
function _num_(v) {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  let t = String(v).replace(/ /g, ' ').trim();
  if (!t || t === '-' || t === '—' || t.charAt(0) === '#') return null;   // #DIV/0! etc.
  const neg = /^\(.*\)$/.test(t);
  t = t.replace(/[()]/g, '').replace(/R\$/gi, '').replace(/%/g, '').trim();
  // Tira o separador de milhar só quando ele SEPARA MILHAR (três dígitos
  // depois). "1.234" vira 1234; "1.5" continua 1.5.
  t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// Mesma leitura, mas vazio vira 0. Use só quando a ausência REALMENTE
// significa zero — somatório de coluna, contagem. Nunca para exibir.
function _numOuZero_(v) { const n = _num_(v); return n == null ? 0 : n; }

// 1234567 → "1.234.567"
function _milhar_(n) {
  if (n == null || isNaN(n)) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Valor em reais → R$ mil, inteiro. null → "—" (não medido); 0 → "0".
function _mil_(v) {
  if (v == null || isNaN(v)) return '—';
  const m = v / 1000;
  return (Math.abs(m) < 0.5 && m !== 0) ? '~0' : _milhar_(Math.round(m));
}



// ==========================================
// TEXTO
// ==========================================

/**
 * Tira acento para comparar. A classe é escrita ESCAPADA (̀-ͯ) de
 * propósito: são os acentos combinantes, e escrevê-los literais é o erro que o
 * CLAUDE.md registra — some da tela e quebra a comparação em MARÇO. Já
 * aconteceu neste projeto.
 */
function _norm_(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

// Corta no último espaço quando ele não fica cedo demais — cortar no meio de
// uma palavra é mais difícil de ler que perder a palavra inteira.
function _truncar_(txt, max) {
  const t = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const esp = corte.lastIndexOf(' ');
  return (esp > max * 0.6 ? corte.slice(0, esp) : corte) + '…';
}

/**
 * Quantos caracteres cabem numa caixa dessa largura, nessa fonte.
 *
 * Toda TEXT_BOX do Slides tem ~7pt de recuo interno de cada lado que a API não
 * deixa desligar; em caixa estreita ele "come" a largura e o Slides quebra a
 * linha mesmo sobrando espaço visual (lição 1).
 */
const TEXTBOX_INSET_PT = 4;
function _charsQueCabem_(w, fontSize) {
  return Math.max(8, Math.floor((w - TEXTBOX_INSET_PT * 2) / (fontSize * 0.62)));
}


// ==========================================
// DESENHO
// ==========================================

/**
 * Caixa de texto simples. É a helper mais usada do projeto (17 arquivos).
 *
 * `folga` alarga a caixa para os dois lados sem mudar onde o texto aparece —
 * serve para vencer o recuo interno em célula estreita, onde "Realizado"
 * quebrava em "Realizad/o" e "R$ 6,46" saía em duas linhas. Só faz sentido em
 * texto CENTRALIZADO e curto; num parágrafo alinhado à esquerda a folga só
 * faria o texto invadir a célula vizinha.
 */
function _sTxt(slide, x, y, w, h, txt, size, bold, cor, align, folga) {
  const f = folga || 0;
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - f, y, w + f * 2, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const ts = tb.getText();
  ts.setText(String(txt == null ? '' : txt));
  ts.getTextStyle().setFontSize(size).setBold(!!bold).setForegroundColor(cor)
    .setFontFamily(CR_DESIGN_SYSTEM.typography.body);
  const ps = ts.getParagraphStyle();
  if (align === 'center')     ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  else if (align === 'right') ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
  else                        ps.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  tb.getBorder().setTransparent();
  return tb;
}

// Retângulo cheio, sem borda — o bloco mais repetido do projeto.
function _sRet_(slide, x, y, w, h, cor, alpha) {
  const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  if (alpha == null) r.getFill().setSolidFill(cor); else r.getFill().setSolidFill(cor, alpha);
  r.getBorder().setTransparent();
  return r;
}


// ==========================================
// APELIDOS — os nomes antigos, agora com uma implementação só
// ==========================================
// Ficam para o código existente não precisar ser reescrito de uma vez. Ao
// mexer num arquivo, troque pela função nova e apague o apelido daqui.

function _dreNum_(v)    { return _num_(v); }
function _metaPct_(v)   { return _num_(v); }
function _brgMilhar_(n) { return _milhar_(n); }
function _dreMil_(v)    { return _mil_(v); }
function _dashNum_(v)   { return (v == null || isNaN(v)) ? null : v; }
function _truncarNome_(txt, max) { return _truncar_(txt, max); }

// _metaNum_ devolvia NaN para vazio e o comparador de status conta com isso
// (isNaN → status Cinza). Mantém o contrato.
function _metaNum_(s) { const n = _num_(s); return n == null ? NaN : n; }

// ⚠ _toNum_ devolve ZERO para vazio. É o zero falso da lição 3, e está assim
// porque somatórios antigos contam com esse comportamento. NÃO use em código
// novo — use _num_ e trate o null.
function _toNum_(v) { return _numOuZero_(v); }


// ==========================================
// PLANILHA — abrir e ler, com cache
// ==========================================
/**
 * O projeto abria SpreadsheetApp.openById em 16 lugares de 7 arquivos, sem
 * cache: BD_CORRETIVAS_ID sozinha era aberta quatro vezes na mesma geração.
 * Cada abertura é uma chamada de rede, e o Apps Script tem cota de tempo.
 *
 * Aqui a abertura passa por um cache de execução. O cache vive só enquanto a
 * geração roda — o Apps Script recria o escopo global a cada execução, então
 * não há risco de servir dado velho entre duas gerações.
 *
 * Erro de abertura vira null com aviso no Logger, nunca exceção: uma planilha
 * fora do ar tem que derrubar UM slide, não a apresentação inteira.
 */
let _ssCache_ = {};

/**
 * LANÇA quando não abre, igual ao SpreadsheetApp.openById que ela substitui.
 * Devolver null aqui pareceria mais gentil, mas mudaria o contrato de 16
 * chamadas existentes: o `catch` de cada uma deixaria de pegar a falha e ela
 * reapareceria depois como "Cannot read properties of null", longe da causa.
 * O ganho desta função é o CACHE, não um tratamento de erro novo.
 */
function _abrirPlanilha_(id, apelido) {
  if (id in _ssCache_) {
    const c = _ssCache_[id];
    if (c.erro) throw c.erro;
    return c.ss;
  }
  try {
    const ss = SpreadsheetApp.openById(id);
    _ssCache_[id] = { ss: ss };
    return ss;
  } catch (e) {
    Logger.log('Planilha ' + (apelido || id) + ': não abriu — ' + e.message);
    _ssCache_[id] = { erro: e };
    throw e;
  }
}

// Só para os testes: sem isso, trocar o dublê entre cenários não tem efeito e
// o teste falha por motivo errado (a lição está em gestao-tvs/teste_bases.js).
function _ssCacheLimpar_() { _ssCache_ = {}; }

/**
 * Aba pelo nome, tolerante a acento, caixa e espaço. Não achou, LISTA as que
 * existem — é a diferença entre "não funcionou" e "a aba foi renomeada de
 * `Cópia de PAINEL INDICADORES` para `BOLETIM`", que é o caso registrado no
 * CLAUDE.md e levou um slide inteiro a sair vazio sem dar erro.
 */
function _abrirAba_(id, nomeAba, apelido) {
  const ss = _abrirPlanilha_(id, apelido);
  if (!ss) return null;
  const alvo = _norm_(nomeAba);
  const abas = ss.getSheets();
  for (let i = 0; i < abas.length; i++) {
    if (_norm_(abas[i].getName()) === alvo) return abas[i];
  }
  Logger.log('Planilha ' + (apelido || ss.getName()) + ': aba "' + nomeAba +
             '" não existe. Abas: ' + abas.map(a => a.getName()).join(' | '));
  return null;
}



// ==========================================
// DESENHO — primitivas do design system
// ==========================================
// Estavam no 01_Config.gs. criarHeaderPadrao é usada por 15 arquivos e
// criarCardPainel por 7 — são a biblioteca de desenho do projeto, não
// configuração. Config passa a ter só valores; desenho mora aqui.

function criarHeaderPadrao(slide, titulo, subtitulo) {
  const deck = getDeckMensal_();
  const W  = deck.getPageWidth();
  const DS = CR_DESIGN_SYSTEM;
  const mX = DS.layout.marginX;

  // Grafismo de fundo — elipse suave no canto superior direito (assinatura do boletim)
  const ellipse = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 350, -80, 450, 450);
  ellipse.getFill().setSolidFill(DS.colors.brandLight, 0.03);
  ellipse.getBorder().setTransparent();

  // Barra de destaque à esquerda do título
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mX, 13, 5, 36);
  bar.getFill().setSolidFill(DS.colors.brandLight);
  bar.getBorder().setTransparent();

  // Título
  const txt1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 6, W - mX - 200, 30);
  txt1.getText().setText(titulo).getTextStyle()
    .setFontSize(19).setBold(true)
    .setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);

  // Subtítulo
  if (subtitulo) {
    const txt2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 34, W - mX - 200, 18);
    txt2.getText().setText(subtitulo).getTextStyle()
      .setFontSize(9.5).setBold(false)
      .setForegroundColor(DS.colors.textBody).setFontFamily(DS.typography.body);
  }

  // Logo no canto superior direito (não quebra a geração se indisponível)
  if (typeof _propDriveAppDisponivel === 'undefined' || _propDriveAppDisponivel) {
    try {
      const logoBlob = DriveApp.getFileById(DS.logoId).getBlob();
      slide.insertImage(logoBlob, W - mX - DS.logoW, 14, DS.logoW, DS.logoH);
    } catch (e) {
      _propDriveAppDisponivel = false;
      Logger.log('Aviso (Header): logo não carregado via DriveApp (' + e.message + ').');
    }
  }

  // Linha separadora de largura total + segmento de destaque
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 62, W, 62);
  sep.getLineFill().setSolidFill(DS.colors.lines);
  sep.setWeight(1);

  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, mX, 62, mX + 110, 62);
  acc.getLineFill().setSolidFill(DS.colors.brandLight);
  acc.setWeight(3);
}


/**
 * Painel padrão (contêiner de conteúdo): card branco com borda fina, barra
 * lateral e título opcional na cor do tema, com linha divisória. Retorna o Y
 * onde o conteúdo interno deve começar. Copiado de megas-mensal/01_Config.gs
 * (mesmo desenho) — usado pelo grid 2×2 do Dashboard Operacional
 * (Slide_IndicadoresGerais.gs).
 */
function criarCardPainel(slide, x, y, w, h, titulo, cor) {
  const DS = CR_DESIGN_SYSTEM;
  const corTema = cor || DS.colors.brandLight;

  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(DS.colors.cardBg);
  bg.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  bg.getBorder().setWeight(1);

  const side = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, 4, h);
  side.getFill().setSolidFill(corTema);
  side.getBorder().setTransparent();

  if (titulo) {
    // Marcador quadrado na cor do tema antes do título (substitui emojis)
    const marca = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 14, y + 11, 7, 7);
    marca.getFill().setSolidFill(corTema);
    marca.getBorder().setTransparent();

    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 27, y + 6, w - 37, 18);
    t.getText().setText(String(titulo)).getTextStyle()
      .setFontSize(10).setBold(true)
      .setForegroundColor(corTema).setFontFamily(DS.typography.titles);

    const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 14, y + 26, w - 28, 1);
    div.getFill().setSolidFill(DS.colors.lines);
    div.getBorder().setTransparent();
    return y + 32;
  }
  return y + 10;
}

/**
 * Cor semântica para percentuais de SLA (regra do boletim):
 * ≥95 verde, ≥90 âmbar, <90 vermelho. Sem número → cor padrão.
 * Copiado de megas-mensal/01_Config.gs — usado pelo Dashboard Operacional.
 */
function corPorSLA(valor, corPadrao) {
  const n = parseFloat(String(valor == null ? '' : valor).replace('%', '').replace(',', '.'));
  if (isNaN(n)) return corPadrao || CR_DESIGN_SYSTEM.colors.textMain;
  if (n < 90) return CR_DESIGN_SYSTEM.colors.accentRed;
  if (n < 95) return '#F59E0B';
  return CR_DESIGN_SYSTEM.colors.accentGreen;
}


// ==========================================
// LOGOS DE CLIENTE  (era 06_Logos.gs)
// ==========================================
// Buscar no Drive com cache e encaixar na caixa. Hoje só o Backlog de
// Clientes usa, mas é capacidade de desenho reutilizável — nos Megas o logo
// aparece em vários slides. Fica em Helpers, não junto de um slide só.
// O mapa cliente→ID do Drive continua no 01_Config.gs.

// Cache do blob de cada logo (evita baixar o mesmo arquivo do Drive várias
// vezes na mesma execução — chave é o ID do arquivo, não o nome do cliente,
// então clientes diferentes que casam no mesmo logo reaproveitam o download).
const _clienteLogoCache_ = {};

// O próprio Mega aparece como "cliente" em várias listas (linhas de área
// comum/condomínio: "MEGA Curitiba - ÁREA COMUM", "CONDOMÍNIO MEGA
// CURITIBA"). Nesses casos o logo certo é o do empreendimento ATIVO
// (unitLogoId em 01_Config.gs) — não existe um "logo do Mega" genérico, cada
// cidade tem o seu, e a apresentação sempre roda com uma cidade ativa.
// `_histEmpChave_` devolve MAIÚSCULO sem acento, daí a comparação em caixa
// alta; e o casamento é por PALAVRA inteira (\bMEGA\b) pra não pegar razão
// social que só contenha as letras (ex.: "OMEGA ...").
function _logoDoMegaId_(nomeCliente) {
  // Nos Megas isto devolvia o logo da unidade ativa quando o "cliente" era o
  // próprio Mega. Aqui não existe unidade ativa — o deck é do portfólio
  // inteiro — e o condomínio já é filtrado antes de chegar na tabela
  // (_ehCondominio_), então não há caso a atender. Fica declarada para o
  // arquivo continuar sendo cópia fiel do dos Megas: quando alguém corrigir
  // um logo lá, o diff aqui mostra só esta função.
  return null;
}

function _getClienteLogoBlob_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  let idAchado = _logoDoMegaId_(nomeCliente);
  if (!idAchado) {
    const chaves = Object.keys(LOGOS_CLIENTES);
    for (let k = 0; k < chaves.length; k++) {
      if (alvo.indexOf(_histEmpChave_(chaves[k])) >= 0) { idAchado = LOGOS_CLIENTES[chaves[k]]; break; }
    }
  }
  if (!idAchado) return null;

  if (!(idAchado in _clienteLogoCache_)) {
    try {
      _clienteLogoCache_[idAchado] = DriveApp.getFileById(idAchado).getBlob();
    } catch (e) {
      Logger.log('Logo do cliente "' + nomeCliente + '" (arquivo ' + idAchado + ') não carregou: ' + e.message);
      _clienteLogoCache_[idAchado] = null;
    }
  }
  return _clienteLogoCache_[idAchado];
}



// Devolve o nome curto da marca quando o logo é ambíguo, senão null.
function _logoLegendaRotulo_(nomeCliente) {
  const alvo = _histEmpChave_(nomeCliente);
  for (let i = 0; i < _LOGOS_LEGENDA_.length; i++) {
    if (alvo.indexOf(_histEmpChave_(_LOGOS_LEGENDA_[i].trecho)) >= 0) return _LOGOS_LEGENDA_[i].rotulo;
  }
  return null;
}

// Escreve a legenda centralizada na faixa x,y,w,h.
//
// A caixa de texto é criada MAIS LARGA que a faixa (_LOGO_LEGENDA_FOLGA_ de
// cada lado): toda TEXT_BOX do Slides tem um recuo interno de ~7pt que não dá
// pra desligar pela API, e numa coluna estreita esse recuo faz um nome curto
// como "Flexmodal" quebrar em duas linhas mesmo sobrando espaço visível.
// Como o texto é centralizado e a folga é simétrica, a largura extra sobra
// igual dos dois lados e não muda nada na aparência — a caixa não tem fundo
// nem borda própria.
function _logoLegendaTexto_(slide, x, y, w, h, rotulo) {
  const caixaW = w + _LOGO_LEGENDA_FOLGA_ * 2;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x - _LOGO_LEGENDA_FOLGA_, y, caixaW, h);
  const txt = box.getText();
  txt.setText(_truncarNome_(rotulo, _charsQueCabem_(caixaW, _LOGO_LEGENDA_FS_)))
    .getTextStyle().setFontSize(_LOGO_LEGENDA_FS_).setBold(true)
    .setForegroundColor(CR_DESIGN_SYSTEM.colors.textMuted).setFontFamily('Montserrat');
  txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}

// Igual a _insertLogoPadrao_, mas escreve o nome curto embaixo quando o logo
// é compartilhado por mais de uma marca. Devolve a imagem inserida, ou null
// quando a caixa é baixa demais pra comportar logo + legenda legíveis — aí o
// chamador cai no fallback de texto, que diferencia melhor do que um logo
// minúsculo com uma legenda ilegível embaixo.
//
// Ponto único de entrada dos logos de cliente: todos os slides passam por
// aqui, então a altura padrão (e a homogeneidade) vale pro deck inteiro.
function _insertLogoFitLegenda_(slide, blob, nomeCliente, x, y, boxW, boxH, altura) {
  const rotulo = _logoLegendaRotulo_(nomeCliente);
  if (!rotulo) return _insertLogoPadrao_(slide, blob, x, y, boxW, boxH, altura);
  if (boxH < _LOGO_LEGENDA_MIN_BOX_) return null;

  const img = _insertLogoPadrao_(slide, blob, x, y, boxW, boxH - _LOGO_LEGENDA_H_, altura);
  _logoLegendaTexto_(slide, x, y + boxH - _LOGO_LEGENDA_H_, boxW, _LOGO_LEGENDA_H_, rotulo);
  return img;
}


// Insere o logo com ALTURA FIXA (`altura`, default LOGO_ALT_PADRAO),
// centralizado na caixa x,y,boxW,boxH. Só reduz abaixo da altura padrão
// quando a caixa é baixa demais ou quando o logo é largo demais pra coluna
// — os dois casos ficam registrados no Logger, porque são exatamente os que
// quebram a homogeneidade e valem ajuste de layout.
function _insertLogoPadrao_(slide, blob, x, y, boxW, boxH, altura) {
  const img = slide.insertImage(blob);
  const ratio = img.getWidth() / img.getHeight();

  let h = Math.min(altura || LOGO_ALT_PADRAO, boxH);
  let w = h * ratio;
  if (w > boxW) {
    w = boxW;
    h = boxW / ratio;
    Logger.log('Logo mais largo que a coluna (' + ratio.toFixed(1) + ':1 em ' + Math.round(boxW) +
               'pt): saiu com ' + Math.round(h) + 'pt de altura em vez de ' + Math.round(altura || LOGO_ALT_PADRAO) + 'pt.');
  }

  img.setWidth(Math.round(w)).setHeight(Math.round(h))
     .setLeft(x + (boxW - w) / 2)
     .setTop(y + (boxH - h) / 2);
  return img;
}
