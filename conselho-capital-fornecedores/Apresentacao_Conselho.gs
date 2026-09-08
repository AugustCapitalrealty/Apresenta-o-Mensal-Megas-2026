/**
 * ARQUIVO: Apresentacao_Conselho.gs
 * DESCRIÇÃO: Gera a apresentação do projeto "Capital Fornecedores" ao
 * Conselho — Concurso da Melhor Ideia 2026, Capital Realty & Demercado.
 *
 * Este é um script AUTÔNOMO. Não depende de nenhum outro arquivo deste
 * repositório: traz o próprio design system e as próprias helpers de
 * texto, com o prefixo `_cn` justamente para poder ser colado em QUALQUER
 * projeto Apps Script sem colidir com os `_g` do Farol nem com o
 * CR_DESIGN_SYSTEM das apresentações mensais.
 *
 * COMO USAR:
 *   1. Cole este arquivo inteiro num projeto Apps Script (pode ser avulso).
 *   2. Rode `gerarApresentacaoConselho()` (▶ no topo do editor).
 *   3. Se CONSELHO_DECK_ID estiver vazio, o script CRIA a apresentação e
 *      escreve a URL no Logger. Copie o ID para a constante se quiser
 *      regerar sempre no mesmo arquivo.
 *
 * REGRA DE CONTEÚDO — leia antes de editar:
 *   Todo slide separa o que JÁ FUNCIONA do que AINDA SERÁ IMPLEMENTADO, e
 *   nenhum número aparece sem lastro. Isto não é estilo: uma auditoria do
 *   próprio sistema encontrou dois números fabricados em telas executivas
 *   (um saving fixo de "11,8%" e uma taxa de resposta de "100%" sobre zero
 *   convites). Foram removidos. Se algum número desta apresentação não
 *   puder ser apontado num dado real, ele não entra.
 *
 * SOBRE O LAYOUT: todo texto passa por _cnUmaLinha_ (texto curto, nunca
 * quebra) ou _cnParagrafo_ (bloco, encolhe até caber na altura). Os dois
 * medem antes de desenhar. Ver a lição 1 do CLAUDE.md deste repositório:
 * TEXT_BOX tem ~7pt de recuo interno de cada lado que a API não desliga, e
 * é ele que faz texto curto quebrar em caixa estreita.
 */

const DS_CN = {
  colors: {
    brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9',
    brandSoft: '#E9F0FA',
    bgSlide: '#F6F8FC', white: '#FFFFFF',
    textMain: '#16213E', textBody: '#46516B', textMuted: '#8592AC',
    line: '#E4EAF3', lineStrong: '#CBD5E4',
    amberBg: '#FDF1D2', amberInk: '#7A5B00', amberSolid: '#E5A417',
    greenBg: '#DEF4E9', greenInk: '#0B5C34', greenSolid: '#1E9E62',
    redBg: '#FCE8E8', redInk: '#8C1D1D', redSolid: '#D64545'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', logoW: 112, logoH: 32
};

/** Vazio = cria uma apresentação nova e loga a URL. */
const CONSELHO_DECK_ID = '';

const CN_MX  = 32;   // margem lateral
const CN_TOP = 72;   // topo do conteúdo, logo abaixo do header

function _cnFimConteudo_(H) { return H - 55; }
function _cnTopoRodape_(H)  { return H - 47; }


// ==========================================
// PONTO DE ENTRADA
// ==========================================

function gerarApresentacaoConselho() {
  let deck;
  if (CONSELHO_DECK_ID) {
    deck = SlidesApp.openById(CONSELHO_DECK_ID);
  } else {
    deck = SlidesApp.create('Capital Fornecedores — Apresentação ao Conselho');
    Logger.log('Apresentação criada: ' + deck.getUrl());
    Logger.log('ID: ' + deck.getId() + '  (cole em CONSELHO_DECK_ID para regerar aqui)');
    // O Slides cria um slide de título em branco; ele sai para a capa
    // desenhada entrar como primeira página.
    const primeiros = deck.getSlides();
    if (primeiros.length === 1) primeiros[0].remove();
  }

  // Um try/catch POR SLIDE: sem isso, a primeira falha aborta as demais e
  // o resultado é uma apresentação pela metade sem dizer onde parou.
  // O aviso de falha usa só insertShape — nada de helper, que é justamente
  // o que costuma faltar quando algo quebra.
  const paginas = [
    ['Capa',              _cnSlideCapa],
    ['O problema',        _cnSlideProblema],
    ['O que já funciona', _cnSlideFunciona],
    ['O ciclo',           _cnSlideCiclo],
    ['A implementar',     _cnSlideAImplementar],
    ['O que falta provar', _cnSlideFaltaProvar],
    ['Pedidos',           _cnSlidePedidos]
  ];

  paginas.forEach(function (p) {
    try {
      p[1](deck);
    } catch (e) {
      _cnSlideFalha_(deck, p[0], e);
      Logger.log('FALHA no slide "' + p[0] + '": ' + e.message);
    }
  });

  Logger.log('Apresentação ao Conselho: ' + paginas.length + ' slides gerados.');
  Logger.log('URL: ' + deck.getUrl());
  return deck.getUrl();
}


// ==========================================
// MEDIÇÃO DE TEXTO
// ==========================================
// A API do Slides não expõe métrica de fonte: estimamos pela largura média
// do caractere. Montserrat é mais larga que Open Sans; negrito soma ~4%.

const _CN_FATOR_FONTE = { 'Montserrat': 0.58, 'Open Sans': 0.52 };
const _CN_RECUO_TEXTBOX = 14;

function _cnLarguraTexto_(texto, fs, fonte, bold) {
  const f = (_CN_FATOR_FONTE[fonte] || 0.55) * (bold ? 1.04 : 1);
  return String(texto).length * fs * f;
}

function _cnLinhasTexto_(texto, larguraCaixa, fs, fonte, bold) {
  const util = Math.max(12, larguraCaixa - _CN_RECUO_TEXTBOX);
  return Math.max(1, Math.ceil(_cnLarguraTexto_(texto, fs, fonte, bold) / util));
}

/**
 * Texto curto que TEM que caber numa linha só.
 *
 * Duas defesas: a caixa é desenhada mais larga que o espaço visível (o
 * retângulo visível é outra shape, então esticar a TEXT_BOX não muda a
 * aparência e devolve o recuo que o Slides tinha roubado); e, se ainda
 * não couber, a fonte encolhe de 0,25 em 0,25 até fsMin.
 */
function _cnUmaLinha_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;   // caixa vazia: estilizar lança "object has no text"

  const o = op || {};
  const fonte  = o.fonte || DS_CN.typography.titles;
  const centro = o.align !== 'L';
  const folga  = o.folga === undefined ? 12 : o.folga;
  const fsMin  = o.fsMin || 6;
  let   fs     = o.fs === undefined ? 10 : o.fs;

  const bx = centro ? x - folga : x;
  const bw = centro ? w + folga * 2 : w + folga;
  const util = bw - _CN_RECUO_TEXTBOX;
  while (fs > fsMin && _cnLarguraTexto_(t, fs, fonte, o.bold) > util) fs -= 0.25;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, y, bw, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || DS_CN.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    centro ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return box;
}

/** Bloco de texto: pode ter várias linhas, encolhe até caber na altura. */
function _cnParagrafo_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;

  const o = op || {};
  const fonte = o.fonte || DS_CN.typography.body;
  const espac = o.espac || 122;      // o Slides recusa espaçamento < 100
  const fsMin = o.fsMin || 6.5;
  let   fs    = o.fs === undefined ? 10 : o.fs;

  const alturaLinha = function (f) { return f * 1.2 * (espac / 100); };
  while (fs > fsMin && _cnLinhasTexto_(t, w, fs, fonte, o.bold) * alturaLinha(fs) > h) {
    fs -= 0.25;
  }

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  if (o.meio) box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || DS_CN.colors.textBody).setFontFamily(fonte);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(o.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
                                           : SlidesApp.ParagraphAlignment.START)
    .setLineSpacing(espac);
  return box;
}


// ==========================================
// ESTRUTURA DO SLIDE
// ==========================================

function _cnNovoSlide_(deck) {
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS_CN.colors.bgSlide);
  return slide;
}

function _cnHeader_(slide, W, titulo, chips) {
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, CN_MX, 11, 5, 34);
  bar.getFill().setSolidFill(DS_CN.colors.brandLight); bar.getBorder().setTransparent();

  const tituloX = CN_MX + 15;
  const tituloW = (W - CN_MX - DS_CN.logoW - 24) - tituloX;
  _cnUmaLinha_(slide, tituloX, 8, tituloW, 26, titulo,
    { fs: 17, fsMin: 11, bold: true, cor: DS_CN.colors.textMain, align: 'L', folga: 8 });

  let cx = tituloX;
  (chips || []).forEach(function (txt) {
    const w = _cnLarguraTexto_(txt, 7.5, DS_CN.typography.body, true) + 18;
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, 37, w, 15);
    pill.getFill().setSolidFill(DS_CN.colors.brandSoft); pill.getBorder().setTransparent();
    _cnUmaLinha_(slide, cx, 37, w, 15, txt,
      { fs: 7.5, fsMin: 6, bold: true, cor: DS_CN.colors.brandMed,
        fonte: DS_CN.typography.body, folga: 10 });
    cx += w + 6;
  });

  try {
    const logoBlob = DriveApp.getFileById(DS_CN.logoId).getBlob();
    slide.insertImage(logoBlob, W - CN_MX - DS_CN.logoW, 14, DS_CN.logoW, DS_CN.logoH);
  } catch (e) {
    Logger.log('Aviso (Header): logo não carregado. ' + e.message);
  }

  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 60, W, 60);
  sep.getLineFill().setSolidFill(DS_CN.colors.line); sep.setWeight(1);
  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, CN_MX, 60, CN_MX + 110, 60);
  acc.getLineFill().setSolidFill(DS_CN.colors.brandLight); acc.setWeight(3);
}

function _cnRodape_(slide, W, H, texto, cor) {
  const y = _cnTopoRodape_(H), h = 24;
  const faixa = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, CN_MX, y, W - 2 * CN_MX, h);
  faixa.getFill().setSolidFill(cor || DS_CN.colors.brandSoft); faixa.getBorder().setTransparent();
  const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, CN_MX + 6, y + 5, 3, h - 10);
  acc.getFill().setSolidFill(DS_CN.colors.brandLight); acc.getBorder().setTransparent();
  _cnUmaLinha_(slide, CN_MX + 18, y, W - 2 * CN_MX - 32, h, texto,
    { fs: 8.6, fsMin: 6.5, italic: true, cor: DS_CN.colors.brandMed,
      fonte: DS_CN.typography.body, align: 'L', folga: 8 });
}

/**
 * Aviso de falha desenhado NO slide.
 *
 * Usa só insertShape e a paleta — nenhuma helper. Se dependesse delas,
 * quebraria junto e o slide voltaria a ficar em branco, que é o pior
 * resultado possível: ninguém leva para a reunião o que não viu falhar.
 */
function _cnSlideFalha_(deck, nome, erro) {
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS_CN.colors.redBg);
  const cx = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, 120, 640, 120);
  cx.getText().setText('Falha ao gerar o slide "' + nome + '"\n\n' + erro.message);
  cx.getText().getTextStyle().setFontSize(14).setBold(true)
    .setForegroundColor(DS_CN.colors.redInk);
}


// ==========================================
// COMPONENTES
// ==========================================

function _cnCartao_(slide, x, y, w, h, corAcento, corFundo) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(corFundo || DS_CN.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_CN.colors.lineStrong);
  if (corAcento) {
    const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 8, 4, h - 16);
    acc.getFill().setSolidFill(corAcento); acc.getBorder().setTransparent();
  }
  return y;
}

function _cnPill_(slide, x, y, w, h, texto, corFundo, corTexto, fs) {
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  pill.getFill().setSolidFill(corFundo); pill.getBorder().setTransparent();
  _cnUmaLinha_(slide, x, y, w, h, texto,
    { fs: fs || 6.8, fsMin: 5.5, bold: true, cor: corTexto || DS_CN.colors.white,
      fonte: DS_CN.typography.body, folga: 12 });
}

function _cnKPI_(slide, x, y, w, h, label, valor, corInk, sub, corFundo) {
  _cnCartao_(slide, x, y, w, h, corInk, corFundo);
  const px = x + 16, pw = w - 30;
  _cnUmaLinha_(slide, px, y + 10, pw, 13, label,
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_CN.colors.textMuted, align: 'L', folga: 8 });
  _cnUmaLinha_(slide, px, y + 25, pw, 26, valor,
    { fs: 17, fsMin: 10, bold: true, cor: corInk, align: 'L', folga: 8 });
  if (sub) {
    _cnUmaLinha_(slide, px, y + h - 24, pw, 16, sub,
      { fs: 7.6, fsMin: 6, cor: DS_CN.colors.textBody, fonte: DS_CN.typography.body,
        align: 'L', folga: 8 });
  }
}

function _cnPainel_(slide, x, y, w, h, titulo, cor) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(DS_CN.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_CN.colors.lineStrong);

  const barH = 22;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, barH);
  bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();
  _cnUmaLinha_(slide, x + 12, y, w - 24, barH, titulo,
    { fs: 8, fsMin: 6, bold: true, cor: DS_CN.colors.white, align: 'L', folga: 8 });

  return y + barH + 10;
}

/** Lista com marcador colorido. `itens` = [texto, ...] ou [[texto, cor], ...]. */
function _cnLista_(slide, itens, x, y, w, gap, corPadrao) {
  itens.forEach(function (item, i) {
    const txt = Array.isArray(item) ? item[0] : item;
    const cor = Array.isArray(item) ? item[1] : corPadrao;
    const cy = y + i * gap;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, cy + (gap - 7) / 2, 7, 7);
    dot.getFill().setSolidFill(cor || DS_CN.colors.brandLight);
    dot.getBorder().setTransparent();
    _cnUmaLinha_(slide, x + 13, cy, w - 13, gap, txt,
      { fs: 8.4, fsMin: 6.2, cor: DS_CN.colors.textMain,
        fonte: DS_CN.typography.body, align: 'L', folga: 10 });
  });
}

/** Linha "de → para": o que era na planilha, o que passou a ser. */
function _cnDePara_(slide, x, y, w, h, antes, depois) {
  const meio = 26;
  const wCol = (w - meio) / 2;

  const cA = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, wCol, h);
  cA.getFill().setSolidFill('#F1F3F8');
  cA.getBorder().setWeight(1).getLineFill().setSolidFill(DS_CN.colors.line);
  _cnParagrafo_(slide, x + 12, y + 6, wCol - 24, h - 12, antes,
    { fs: 8, fsMin: 6.2, cor: DS_CN.colors.textBody, meio: true });

  const seta = slide.insertShape(SlidesApp.ShapeType.RIGHT_ARROW, x + wCol + 5, y + h / 2 - 7, 16, 14);
  seta.getFill().setSolidFill(DS_CN.colors.brandLight); seta.getBorder().setTransparent();

  const cB = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + wCol + meio, y, wCol, h);
  cB.getFill().setSolidFill(DS_CN.colors.white);
  cB.getBorder().setWeight(1).getLineFill().setSolidFill(DS_CN.colors.brandLight);
  _cnParagrafo_(slide, x + wCol + meio + 12, y + 6, wCol - 24, h - 12, depois,
    { fs: 8, fsMin: 6.2, bold: true, cor: DS_CN.colors.brandMed, meio: true });
}


// ==========================================
// SLIDE 1 — CAPA
// ==========================================

function _cnSlideCapa(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS_CN.colors.brandDark);

  const faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, H * 0.62, W, 4);
  faixa.getFill().setSolidFill(DS_CN.colors.brandLight); faixa.getBorder().setTransparent();

  _cnUmaLinha_(slide, CN_MX + 10, H * 0.30, W - 2 * CN_MX - 20, 30, 'CAPITAL FORNECEDORES',
    { fs: 11, fsMin: 8, bold: true, cor: DS_CN.colors.brandSoft,
      fonte: DS_CN.typography.body, align: 'L', folga: 10 });

  _cnParagrafo_(slide, CN_MX + 10, H * 0.36, W - 2 * CN_MX - 20, 74,
    'Equalização de compras com memória de preço, de fornecedor e de desempenho',
    { fs: 27, fsMin: 15, bold: true, cor: DS_CN.colors.white,
      fonte: DS_CN.typography.titles, espac: 110 });

  _cnParagrafo_(slide, CN_MX + 10, H * 0.66, W * 0.62, 46,
    'Concurso da Melhor Ideia 2026 · Capital Realty & Demercado\n' +
    'Guilherme Marques — Suprimentos / Facilities',
    { fs: 10.5, fsMin: 8, cor: DS_CN.colors.brandSoft });

  // A régua da apresentação, dita já na capa: é o que separa esta conversa
  // de uma demonstração otimista.
  const y = H * 0.66;
  const bw = 232;
  const bx = W - CN_MX - bw;
  const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, bx, y - 6, bw, 52);
  box.getFill().setSolidFill('#1E2A5A'); box.getBorder().setTransparent();
  _cnParagrafo_(slide, bx + 14, y, bw - 28, 40,
    'Nesta apresentação, o que já funciona está separado do que ainda será ' +
    'implementado — e nenhum número aparece sem dado por trás.',
    { fs: 8, fsMin: 6.5, italic: true, cor: DS_CN.colors.brandSoft });

  try {
    const logoBlob = DriveApp.getFileById(DS_CN.logoId).getBlob();
    slide.insertImage(logoBlob, CN_MX + 10, H * 0.14, DS_CN.logoW, DS_CN.logoH);
  } catch (e) {
    Logger.log('Aviso (Capa): logo não carregado. ' + e.message);
  }
}


// ==========================================
// SLIDE 2 — O PROBLEMA
// ==========================================

function _cnSlideProblema(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _cnNovoSlide_(deck);
  _cnHeader_(slide, W, 'O problema, com evidência de campo',
    ['45 documentos reais analisados', 'Facilities e Engenharia']);

  const w = W - 2 * CN_MX;
  let y = CN_TOP;

  _cnParagrafo_(slide, CN_MX, y, w, 26,
    'Não partimos de suposição. Estes quatro achados vieram do acervo real de cotações:',
    { fs: 9.5, fsMin: 7.5, cor: DS_CN.colors.textBody });
  y += 30;

  const achados = [
    ['A numeração da EAP tem buracos',
     'Faltam os itens 11, 15, 22, 24 e 26 na lista do contrato. Numeração mantida à mão apodrece, e duas planilhas do mesmo serviço deixam de conversar.'],
    ['A negociação vive fora da planilha',
     'Contratou-se por R$ 70.000 e a planilha mostra R$ 80.563,38. O valor real do contrato não está no arquivo que documenta a compra.'],
    ['O mesmo fornecedor, cinco grafias',
     'Cinco formas de escrever para dois CNPJs. Sem chave única não há como somar quanto se gastou com quem — e o Cód. Fornecedor veio vazio em 10 de 10 documentos.'],
    ['Cada arquivo é um retrato isolado',
     'O preço pago no mês passado, pelo mesmo item, no mesmo Mega, não está ao alcance de quem compra hoje.']
  ];

  const colW = (w - 16) / 2;
  const cardH = 84;
  achados.forEach(function (a, i) {
    const cx = CN_MX + (i % 2) * (colW + 16);
    const cy = y + Math.floor(i / 2) * (cardH + 12);
    _cnCartao_(slide, cx, cy, colW, cardH, DS_CN.colors.redSolid);
    _cnUmaLinha_(slide, cx + 16, cy + 9, colW - 30, 16, a[0],
      { fs: 10, fsMin: 7.5, bold: true, cor: DS_CN.colors.textMain, align: 'L', folga: 8 });
    _cnParagrafo_(slide, cx + 16, cy + 28, colW - 30, cardH - 38, a[1],
      { fs: 8, fsMin: 6.4, cor: DS_CN.colors.textBody });
  });

  _cnRodape_(slide, W, H,
    'A planilha não erra por descuido de quem a usa — ela não tem onde guardar o que a compra aprendeu.');
}


// ==========================================
// SLIDE 3 — O QUE JÁ FUNCIONA
// ==========================================

function _cnSlideFunciona(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _cnNovoSlide_(deck);
  _cnHeader_(slide, W, 'O que já funciona — demonstrável ao vivo',
    ['implantado', 'auditado contra o código-fonte']);

  const w = W - 2 * CN_MX;
  let y = CN_TOP;

  // KPIs de engenharia. Todos verificáveis: saem de contagem no repositório.
  const kw = (w - 3 * 10) / 4;
  const kpis = [
    ['LINHAS EM PRODUÇÃO', '20.025', DS_CN.colors.brandMed, 'sistema completo, no ar'],
    ['ASSERÇÕES DE TESTE', '1.044', DS_CN.colors.greenInk, '90% verificam comportamento'],
    ['SUÍTES AUTOMÁTICAS', '25', DS_CN.colors.greenInk, 'bloqueiam a publicação se falharem'],
    ['DOCUMENTOS DO ACERVO', '45', DS_CN.colors.brandMed, 'analisados; 21 já importados']
  ];
  kpis.forEach(function (k, i) {
    _cnKPI_(slide, CN_MX + i * (kw + 10), y, kw, 62, k[0], k[1], k[2], k[3]);
  });
  y += 74;

  const colW = (w - 14) / 2;
  const painelH = _cnFimConteudo_(H) - y - 34;

  let iy = _cnPainel_(slide, CN_MX, y, colW, painelH, 'A COMPRA, DE PONTA A PONTA', DS_CN.colors.brandMed);
  _cnLista_(slide, [
    'Comparativo item a item, sem fórmula que quebra',
    'Numeração da EAP derivada da posição, nunca digitada',
    'Número livre de proponentes — as 3 colunas não estouram mais',
    'Cadastro por CNPJ com preenchimento automático',
    'Documento de aprovação em Sheets e PDF',
    'Importação do acervo antigo, sem duplicar'
  ], CN_MX + 16, iy, colW - 32, 21, DS_CN.colors.brandLight);

  const x2 = CN_MX + colW + 14;
  let iy2 = _cnPainel_(slide, x2, y, colW, painelH, 'A MEMÓRIA QUE A PLANILHA NÃO TINHA', DS_CN.colors.greenInk);
  _cnLista_(slide, [
    'Histórico de preço por item ao longo do tempo',
    'Alerta na digitação quando o preço foge do histórico',
    'Marca cotada distinta da marca pedida, item a item',
    'Avaliação pós-serviço com cinco critérios ponderados',
    'A nota do fornecedor aparece na tela de quem decide',
    'Cotação mínima por faixa de valor, configurável'
  ], x2 + 16, iy2, colW - 32, 21, DS_CN.colors.greenSolid);

  _cnRodape_(slide, W, H,
    'Se o Conselho pedir para ver qualquer item desta página, ele é aberto na hora.');
}


// ==========================================
// SLIDE 4 — O CICLO QUE SE FECHA
// ==========================================

function _cnSlideCiclo(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _cnNovoSlide_(deck);
  _cnHeader_(slide, W, 'O ciclo que se fecha', ['é isto que muda o processo']);

  const w = W - 2 * CN_MX;
  let y = CN_TOP;

  _cnParagrafo_(slide, CN_MX, y, w, 26,
    'A avaliação de fornecedor já existia e não pegou. O diagnóstico foi que ela era um ' +
    'formulário isolado: quem preenchia não colhia nada em troca.',
    { fs: 9.5, fsMin: 7.5, cor: DS_CN.colors.textBody });
  y += 32;

  // As cinco etapas do laço. A última fecha no primeiro, e é o ponto todo.
  const etapas = [
    ['1', 'COTAR', 'Convite registrado:\nquem respondeu\ne quem não'],
    ['2', 'EQUALIZAR', 'Comparativo item\na item, com alerta\nde preço fora da faixa'],
    ['3', 'HOMOLOGAR', 'Exige justificativa\nfora do menor preço\ne abaixo da cotação mínima'],
    ['4', 'AVALIAR', 'Cinco critérios\nponderados,\nem um minuto'],
    ['5', 'A NOTA VOLTA', 'O IQF aparece na\ncoluna do fornecedor\nna próxima cotação']
  ];

  const gap = 8;
  const cw = (w - gap * (etapas.length - 1)) / etapas.length;
  const ch = 118;

  etapas.forEach(function (e, i) {
    const cx = CN_MX + i * (cw + gap);
    const ultimo = i === etapas.length - 1;
    const cor = ultimo ? DS_CN.colors.greenSolid : DS_CN.colors.brandLight;
    _cnCartao_(slide, cx, y, cw, ch, cor, ultimo ? DS_CN.colors.greenBg : DS_CN.colors.white);

    const num = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx + 14, y + 12, 22, 22);
    num.getFill().setSolidFill(cor); num.getBorder().setTransparent();
    _cnUmaLinha_(slide, cx + 14, y + 12, 22, 22, e[0],
      { fs: 10, fsMin: 8, bold: true, cor: DS_CN.colors.white, folga: 8 });

    _cnUmaLinha_(slide, cx + 12, y + 40, cw - 24, 16, e[1],
      { fs: 9.5, fsMin: 7, bold: true,
        cor: ultimo ? DS_CN.colors.greenInk : DS_CN.colors.brandMed, folga: 10 });
    _cnParagrafo_(slide, cx + 12, y + 58, cw - 24, ch - 66, e[2],
      { fs: 7.6, fsMin: 6.2, cor: DS_CN.colors.textBody });
  });

  y += ch + 14;

  _cnDePara_(slide, CN_MX, y, w, 40,
    'Avaliar era um favor: quem preenchia não via retorno nenhum, e por isso ninguém preenchia.',
    'Avaliar é um investimento: a nota volta para a mesa de quem compra, na cotação seguinte.');

  _cnRodape_(slide, W, H,
    'O aviso ativo ao gestor — e-mail e chatbot — está mapeado para a versão seguinte.');
}


// ==========================================
// SLIDE 5 — O QUE AINDA SERÁ IMPLEMENTADO
// ==========================================

function _cnSlideAImplementar(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _cnNovoSlide_(deck);
  _cnHeader_(slide, W, 'O que ainda NÃO fizemos — e será implementado',
    ['nada aqui está pronto', 'com prazo']);

  const w = W - 2 * CN_MX;
  let y = CN_TOP;

  _cnParagrafo_(slide, CN_MX, y, w, 24,
    'Esta página existe para que nada seja apresentado como pronto sem estar. ' +
    'Todos os itens abaixo estão por fazer.',
    { fs: 9.5, fsMin: 7.5, cor: DS_CN.colors.textBody });
  y += 30;

  const itens = [
    ['ATÉ 20/09', 'Trava de cotação mínima ativada na base',
     'A regra existe e é configurável por faixa de valor. Enquanto a tabela não for preenchida, ela não bloqueia nada.'],
    ['ATÉ 30/09', 'Registro completo do comportamento de cotação',
     'Hoje grava quem apresentou proposta. Falta validade, prazo declarado e agilidade na negociação — e quem foi convidado e não respondeu.'],
    ['VERSÃO FUTURA', 'Aviso ativo ao gestor: e-mail e chatbot',
     'A fila de pendências existe dentro do sistema. Falta ele ir atrás do gestor. Foi deixado para depois de propósito: notificação disparada antes de haver piloto ensina a equipe a ignorá-la.'],
    ['VERSÃO FUTURA', 'Catálogo com unidade base',
     'Para comparar "pacote de 500 g" com "quilo" é preciso um fator de conversão por item. Só se preenche com uso real.']
  ];

  const cardH = 52;
  itens.forEach(function (it, i) {
    const cy = y + i * (cardH + 8);
    const futuro = it[0].indexOf('FUTURA') >= 0;
    const cor = futuro ? DS_CN.colors.textMuted : DS_CN.colors.amberSolid;
    _cnCartao_(slide, CN_MX, cy, w, cardH, cor);

    const pw = _cnLarguraTexto_(it[0], 7, DS_CN.typography.body, true) + 20;
    _cnPill_(slide, CN_MX + 16, cy + 10, pw, 15, it[0],
      futuro ? '#E7EAF1' : DS_CN.colors.amberBg,
      futuro ? DS_CN.colors.textBody : DS_CN.colors.amberInk, 7);

    _cnUmaLinha_(slide, CN_MX + 16 + pw + 10, cy + 8, w - pw - 60, 18, it[1],
      { fs: 10, fsMin: 7.5, bold: true, cor: DS_CN.colors.textMain, align: 'L', folga: 8 });
    _cnParagrafo_(slide, CN_MX + 16, cy + 28, w - 40, cardH - 32, it[2],
      { fs: 7.8, fsMin: 6.2, cor: DS_CN.colors.textBody });
  });

  _cnRodape_(slide, W, H,
    'Preferimos declarar o que falta a ser perguntados por ele.');
}


// ==========================================
// SLIDE 6 — O QUE AINDA FALTA PROVAR
// ==========================================

function _cnSlideFaltaProvar(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _cnNovoSlide_(deck);
  _cnHeader_(slide, W, 'Os números que ainda não temos',
    ['a parte mais importante desta apresentação']);

  const w = W - 2 * CN_MX;
  let y = CN_TOP;

  _cnParagrafo_(slide, CN_MX, y, w, 24,
    'Sou direto: a ferramenta está construída, a prova não. Estes são os números que ' +
    'o Conselho vai querer e que ainda não existem.',
    { fs: 9.5, fsMin: 7.5, cor: DS_CN.colors.textBody });
  y += 30;

  const kw = (w - 3 * 10) / 4;
  const zeros = [
    ['EQUALIZAÇÕES REAIS', '0', 'nenhuma compra passou pelo sistema ainda'],
    ['MEDIÇÕES DE TEMPO', '0', 'nem no Excel, nem no sistema'],
    ['SAVING APURADO', '—', 'o dado existe na base; falta somar'],
    ['AVALIAÇÕES', '1', 'o índice precisa de 3 para deixar de ser preliminar']
  ];
  zeros.forEach(function (k, i) {
    _cnKPI_(slide, CN_MX + i * (kw + 10), y, kw, 62, k[0], k[1],
      DS_CN.colors.redInk, k[2], DS_CN.colors.redBg);
  });
  y += 74;

  const alturaRestante = _cnFimConteudo_(H) - y - 34;
  const colW = (w - 14) / 2;

  let iy = _cnPainel_(slide, CN_MX, y, colW, alturaRestante,
    'POR QUE ISSO IMPORTA MAIS QUE O RESTO', DS_CN.colors.redSolid);
  _cnParagrafo_(slide, CN_MX + 16, iy, colW - 32, alturaRestante - 42,
    'A redução de tempo por equalização é o indicador de maior peso do concurso.\n\n' +
    'A instrumentação já mede sozinha os dois lados — e não rodou nenhuma vez.\n\n' +
    'Hoje eu consigo defender "a ferramenta existe, funciona e está testada". ' +
    'Ainda não consigo defender "aqui está o impacto".',
    { fs: 8.6, fsMin: 6.5, cor: DS_CN.colors.textBody });

  const x2 = CN_MX + colW + 14;
  let iy2 = _cnPainel_(slide, x2, y, colW, alturaRestante,
    'UMA JANELA QUE SE FECHA SOZINHA', DS_CN.colors.amberSolid);
  _cnParagrafo_(slide, x2 + 16, iy2, colW - 32, alturaRestante - 42,
    'A medição do tempo NO EXCEL só pode ser feita enquanto o Excel ainda estiver em uso.\n\n' +
    'Depois que ele sair, o "antes" é perdido para sempre e o ganho vira estimativa.\n\n' +
    'É a tarefa mais barata do projeto — cronometrar três equalizações — e a única ' +
    'cuja oportunidade expira sozinha.',
    { fs: 8.6, fsMin: 6.5, cor: DS_CN.colors.textBody });

  _cnRodape_(slide, W, H,
    'Prefiro dizer isto ao Conselho a ser desmontado na terceira pergunta.',
    DS_CN.colors.amberBg);
}


// ==========================================
// SLIDE 7 — O QUE PEÇO AO CONSELHO
// ==========================================

function _cnSlidePedidos(deck) {
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _cnNovoSlide_(deck);
  _cnHeader_(slide, W, 'O que peço ao Conselho', ['três decisões']);

  const w = W - 2 * CN_MX;
  let y = CN_TOP + 4;

  const pedidos = [
    ['1', 'Autorizar o piloto em Facilities',
     'Megas Curitiba e Esteio, de 8 a 12 equalizações reais em setembro e outubro. ' +
     'Cada compra real produz de graça uma medição de tempo, um ponto de histórico ' +
     'de preço, uma disputa decidida e uma avaliação pendente.'],
    ['2', 'Definir quem preenche a avaliação pós-serviço',
     'O gestor do Mega, que viu o serviço acontecer, ou Suprimentos, que conduziu a ' +
     'compra. O sistema já grava o papel de quem avaliou, então dá para começar com ' +
     'um e ajustar — mas a orientação do Conselho aqui vale mais que a minha escolha.'],
    ['3', 'Aval para cronometrar o Excel esta semana',
     'Três equalizações, de duas a três horas no total, antes que a planilha saia de ' +
     'uso. Sem isso o indicador de maior peso do concurso fica sem linha de base.']
  ];

  const cardH = 62;
  pedidos.forEach(function (p, i) {
    const cy = y + i * (cardH + 10);
    _cnCartao_(slide, CN_MX, cy, w, cardH, DS_CN.colors.brandLight);

    const num = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, CN_MX + 16, cy + 18, 26, 26);
    num.getFill().setSolidFill(DS_CN.colors.brandMed); num.getBorder().setTransparent();
    _cnUmaLinha_(slide, CN_MX + 16, cy + 18, 26, 26, p[0],
      { fs: 12, fsMin: 9, bold: true, cor: DS_CN.colors.white, folga: 8 });

    _cnUmaLinha_(slide, CN_MX + 54, cy + 10, w - 84, 18, p[1],
      { fs: 11, fsMin: 8, bold: true, cor: DS_CN.colors.textMain, align: 'L', folga: 8 });
    _cnParagrafo_(slide, CN_MX + 54, cy + 29, w - 84, cardH - 34, p[2],
      { fs: 8.2, fsMin: 6.4, cor: DS_CN.colors.textBody });
  });

  y += 3 * (cardH + 10) + 6;

  const faixa = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, CN_MX, y, w, 36);
  faixa.getFill().setSolidFill(DS_CN.colors.brandDark); faixa.getBorder().setTransparent();
  _cnParagrafo_(slide, CN_MX + 18, y + 4, w - 36, 28,
    'O caminho daqui até o relatório final de 15/10 não é mais programação. ' +
    'São três equalizações cronometradas, oito a doze compras reais e o saving somado.',
    { fs: 9, fsMin: 7, bold: true, cor: DS_CN.colors.white, meio: true });
}
