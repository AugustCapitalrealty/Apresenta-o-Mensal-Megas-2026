/**
 * Funções utilitárias para montar os slides (tema claro).
 */

// Mapeia nomes amigáveis para os valores reais do enum do Slides API
const ALIGN_MAP = { LEFT: 'START', CENTER: 'CENTER', RIGHT: 'END', JUSTIFY: 'JUSTIFIED' };

// Termos (nomes de empreendimentos e clientes) que devem aparecer em negrito
// sempre que citados em qualquer texto. Preenchido por construirTermosBold().
var TERMOS_BOLD = [];

// Nome simplificado do cliente: remove sufixo após " - " e sufixo de cidade
// (ex: "Mercado Livre - Itajaí" → "Mercado Livre"; "Shopee Esteio" → "Shopee").
function simplificarNomeCliente(nome) {
  var n = String(nome || '').split(' - ')[0].trim();
  ['Esteio', 'Itajaí', 'Itajai', 'Curitiba'].forEach(function (cidade) {
    n = n.replace(new RegExp('\\s+' + cidade + '$', 'i'), '').trim();
  });
  return n;
}

// Monta a lista de termos a destacar em negrito a partir dos dados da apresentação.
function construirTermosBold(d) {
  var set = {};
  function add(s) { if (s) { s = String(s).trim(); if (s.length >= 2) set[s] = true; } }
  (d.empreendimentos || []).forEach(function (e) {
    add(e.nome);
    function addCli(c) { if (c && c.cliente) { add(c.cliente); add(simplificarNomeCliente(c.cliente)); } }
    (e.cardsClientes || []).forEach(addCli);
    (e.participacaoTempoMedio || []).forEach(addCli);
    (e.agendamentoPorCliente || []).forEach(addCli);
  });
  // nomes mais longos primeiro, para casar "Mercado Livre - Itajaí" antes de "Mercado Livre"
  return Object.keys(set).sort(function (a, b) { return b.length - a.length; });
}

/**
 * Calcula w/h para uma imagem de proporção `ratio` (largura/altura) ocupar o
 * máximo de área possível dentro de uma caixa maxW × maxH, preservando a
 * proporção ("contain"). Usado para padronizar o tamanho visual dos logos
 * dos clientes, independente da proporção original de cada arquivo.
 */
function fitBox(ratio, maxW, maxH) {
  var wByH = maxH * ratio;
  if (wByH <= maxW) return { w: Math.round(wByH), h: Math.round(maxH) };
  return { w: Math.round(maxW), h: Math.round(maxW / ratio) };
}

// Insere uma imagem de logo centralizada dentro de uma caixa x,y,boxW,boxH,
// ocupando o máximo de área possível mantendo a proporção original.
function insertLogoFit(slide, blob, x, y, boxW, boxH) {
  var img = slide.insertImage(blob);
  var ratio = img.getWidth() / img.getHeight();
  var fit = fitBox(ratio, boxW, boxH);
  img.setWidth(fit.w).setHeight(fit.h)
     .setLeft(x + (boxW - fit.w) / 2)
     .setTop(y + (boxH - fit.h) / 2);
  return img;
}

// Cache dos blobs das logos (evita baixar do Drive a cada slide)
const _logoCache = {};

function getLogoBlob(tipo) {
  if (!_logoCache[tipo]) {
    var id = LOGOS[tipo];
    if (!id) return null;
    try {
      _logoCache[tipo] = DriveApp.getFileById(id).getBlob();
    } catch(e) {
      Logger.log('Logo "' + tipo + '" não encontrada (ID: ' + id + '): ' + e.message);
      return null;
    }
  }
  return _logoCache[tipo];
}

// Fator de escala do logo para um cliente específico (1 = padrão).
function _clienteEscala(nomeCliente) {
  var upper = _stripAccents(nomeCliente);
  var mapa  = (typeof LOGOS_CLIENTES_ESCALA !== 'undefined') ? LOGOS_CLIENTES_ESCALA : {};
  var keys  = Object.keys(mapa);
  for (var k = 0; k < keys.length; k++) {
    if (upper.indexOf(_stripAccents(keys[k])) >= 0) return mapa[keys[k]];
  }
  return 1;
}

// Returns the sublabel string to show ao lado (ou acima) do logo, ou null se logo-only.
function _clienteSubLabel(nomeCliente) {
  var upper = _stripAccents(nomeCliente);
  var mapa  = (typeof LOGOS_CLIENTES_COM_NOME !== 'undefined') ? LOGOS_CLIENTES_COM_NOME : {};
  var keys  = Object.keys(mapa);
  for (var k = 0; k < keys.length; k++) {
    if (upper.indexOf(_stripAccents(keys[k])) >= 0) {
      var lbl = mapa[keys[k]];
      return lbl !== null ? lbl : nomeCliente.split(' - ')[0].trim();
    }
  }
  return null;
}

// Posição do sublabel em relação ao logo: 'beside' (padrão) ou 'above'.
// Ver LOGOS_CLIENTES_SUBLABEL_POS em Config.gs.
function _clienteSubLabelPos(nomeCliente) {
  var upper = _stripAccents(nomeCliente);
  var mapa  = (typeof LOGOS_CLIENTES_SUBLABEL_POS !== 'undefined') ? LOGOS_CLIENTES_SUBLABEL_POS : {};
  var keys  = Object.keys(mapa);
  for (var k = 0; k < keys.length; k++) {
    if (upper.indexOf(_stripAccents(keys[k])) >= 0) return mapa[keys[k]];
  }
  return 'beside';
}

function testarLogosClientes() {
  var nomes = ['HP Trade e DGI', 'Day Brasil', 'Shopee SOC', 'GrupoBoticário'];
  nomes.forEach(function(nome) {
    var blob = getClienteLogoBlob(nome);
    Logger.log(nome + ' → ' + (blob ? 'OK (' + blob.getContentType() + ')' : 'FALHOU'));
  });
  // testa acesso direto ao arquivo HP Trade
  try {
    var f = DriveApp.getFileById('1jtVwbG-7IbNmHIKdjs8j_DTNEZZy4nlJ');
    Logger.log('HP Trade arquivo: ' + f.getName() + ' | tipo: ' + f.getMimeType());
  } catch(e) {
    Logger.log('HP Trade acesso direto ERRO: ' + e.message);
  }
}

// Cache dos blobs das logos de clientes
const _clienteLogoCache = {};

function _stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')   // normaliza espa\u00e7os (nbsp, duplos) \u2192 espa\u00e7o simples
    .trim()
    .toUpperCase();
}

function getClienteLogoBlob(nomeCliente) {
  var upper = _stripAccents(nomeCliente);
  var matchKey = null;
  var keys = Object.keys(LOGOS_CLIENTES);
  for (var k = 0; k < keys.length; k++) {
    if (upper.indexOf(_stripAccents(keys[k])) >= 0) { matchKey = keys[k]; break; }
  }
  if (!matchKey) return null;
  if (!_clienteLogoCache[matchKey]) {
    var id = LOGOS_CLIENTES[matchKey];
    try {
      _clienteLogoCache[matchKey] = DriveApp.getFileById(id).getBlob();
    } catch(e) {
      Logger.log('Logo cliente "' + matchKey + '" não encontrada: ' + e.message);
      return null;
    }
  }
  return _clienteLogoCache[matchKey];
}

// Cache dos blobs das logos dos empreendimentos
const _megaLogoCache = {};

function getMegaLogoBlob(nomeEmp) {
  if (!(nomeEmp in _megaLogoCache)) {
    var id = (typeof LOGOS_MEGA !== 'undefined') ? LOGOS_MEGA[nomeEmp] : null;
    if (!id) { _megaLogoCache[nomeEmp] = null; return null; }
    try {
      _megaLogoCache[nomeEmp] = DriveApp.getFileById(id).getBlob();
    } catch(e) {
      Logger.log('Logo Mega "' + nomeEmp + '" não encontrada: ' + e.message);
      _megaLogoCache[nomeEmp] = null;
    }
  }
  return _megaLogoCache[nomeEmp];
}

/**
 * Insere a logo do empreendimento numa posição fixa (canto superior direito),
 * para manter a identidade visual consistente em todos os slides daquele Mega.
 * dark=true adiciona um chip branco atrás (garante visibilidade sobre foto/navy).
 */
function addMegaLogo(slide, nomeEmp, dark) {
  var blob = getMegaLogoBlob(nomeEmp);
  if (!blob) return;
  var boxW = 116, boxH = 38;
  var x = PAGE.W - PAGE.MARGIN - boxW;   // canto superior direito
  var y = 22;
  try {
    if (dark) {
      addRect(slide, x - 10, y - 5, boxW + 20, boxH + 10, THEME.white, true, 0.95);
    }
    insertLogoFit(slide, blob, x, y, boxW, boxH);
  } catch(e) {
    Logger.log('addMegaLogo falhou (' + nomeEmp + '): ' + e.message);
  }
}

// Cache dos blobs das fotos dos empreendimentos
const _fotoCache = {};

function getFotoBlob(nomeEmp) {
  if (!_fotoCache[nomeEmp]) {
    var id = FOTOS_MEGA[nomeEmp];
    if (!id) return null;
    try {
      _fotoCache[nomeEmp] = DriveApp.getFileById(id).getBlob();
    } catch(e) {
      Logger.log('Foto "' + nomeEmp + '" não encontrada: ' + e.message);
      return null;
    }
  }
  return _fotoCache[nomeEmp];
}

// Foto de uma seção fixa (ex: "Cenário geral", "Índice") — ver FOTOS_SECAO.
function getFotoSecaoBlob(chave) {
  if (!_fotoCache[chave]) {
    var id = (typeof FOTOS_SECAO !== 'undefined') ? FOTOS_SECAO[chave] : null;
    if (!id) return null;
    try {
      _fotoCache[chave] = DriveApp.getFileById(id).getBlob();
    } catch(e) {
      Logger.log('Foto seção "' + chave + '" não encontrada: ' + e.message);
      return null;
    }
  }
  return _fotoCache[chave];
}

/**
 * Insere a logo oficial mantendo a proporção original.
 * tipo: 'completa' | 'abreviada'. w define a largura final.
 */
function addLogoImage(slide, tipo, x, y, w) {
  var blob = getLogoBlob(tipo);
  if (!blob) return null;
  const img = slide.insertImage(blob);
  const ratio = img.getWidth() / img.getHeight();
  img.setWidth(w).setHeight(w / ratio).setLeft(x).setTop(y);
  return img;
}

/** Define o fundo do slide com cor sólida. */
function setBg(slide, color) {
  slide.getBackground().setSolidFill(color || THEME.bg);
}

/**
 * Insere uma caixa de texto estilizada.
 * opts: { size, bold, color, align ('LEFT'|'CENTER'|'RIGHT'), italic, font }
 */
function addText(slide, x, y, w, h, text, opts) {
  if (text === null || text === undefined || String(text).trim() === '') return null;
  opts = opts || {};

  // opts.nowrap (true ou nº de pt de folga): toda TEXT_BOX do Slides tem um
  // recuo interno de ~7pt por lado que não pode ser desligado pela API. Em
  // caixas estreitas (pill, chip, célula, valor de card) esse recuo "come" a
  // largura útil e o Slides quebra um texto curto em duas linhas mesmo cabendo
  // de sobra. A correção é alargar a própria caixa de texto — que é invisível
  // (sem fundo nem borda; o retângulo visível é outra shape) — devolvendo a
  // largura roubada. A folga vai para o lado oposto ao alinhamento, então o
  // texto não "anda" de lugar.
  var folga = opts.nowrap ? (opts.nowrap === true ? 10 : opts.nowrap) : 0;
  var bx = x, bw = w;
  if (folga) {
    if (opts.align === 'CENTER')     { bx = x - folga; bw = w + folga * 2; }
    else if (opts.align === 'RIGHT') { bx = x - folga; bw = w + folga; }
    else                             { bw = w + folga; }
  }

  const box = slide.insertTextBox(String(text), bx, y, bw, h);
  const t = box.getText();
  const style = t.getTextStyle();
  style.setFontFamily(opts.font || THEME.font);
  style.setFontSize(opts.size || 12);
  style.setForegroundColor(opts.color || THEME.navy);
  style.setBold(!!opts.bold);
  if (opts.italic) style.setItalic(true);
  if (opts.align) {
    const alignKey = ALIGN_MAP[opts.align] || opts.align;
    t.getParagraphs().forEach(function (p) {
      p.getRange().getParagraphStyle()
        .setParagraphAlignment(SlidesApp.ParagraphAlignment[alignKey]);
    });
  }
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  // Negrito automático nos nomes de empreendimentos e clientes (apenas a parte
  // citada), em textos que não são totalmente negrito. Ver TERMOS_BOLD.
  if (!opts.bold && !opts.skipBoldTerms &&
      typeof TERMOS_BOLD !== 'undefined' && TERMOS_BOLD && TERMOS_BOLD.length) {
    var full = t.asString();
    for (var ti = 0; ti < TERMOS_BOLD.length; ti++) {
      var term = TERMOS_BOLD[ti];
      if (!term || term.length < 2) continue;
      var from = 0, idx;
      while ((idx = full.indexOf(term, from)) !== -1) {
        try { t.getRange(idx, idx + term.length).getTextStyle().setBold(true); } catch (e) {}
        from = idx + term.length;
      }
    }
  }
  return box;
}

/**
 * Insere um retângulo. alpha (0–1) controla a transparência do preenchimento.
 */
function addRect(slide, x, y, w, h, color, rounded, alpha) {
  if (!w || !h || w <= 0 || h <= 0 || isNaN(w) || isNaN(h)) return null;
  const type = rounded
    ? SlidesApp.ShapeType.ROUND_RECTANGLE
    : SlidesApp.ShapeType.RECTANGLE;
  const r = slide.insertShape(type, x, y, w, h);
  if (alpha !== undefined) {
    r.getFill().setSolidFill(color, alpha);
  } else {
    r.getFill().setSolidFill(color);
  }
  r.getBorder().setTransparent();
  return r;
}

/** Círculo/elipse apenas com contorno (anel decorativo do brandbook). */
function addRing(slide, x, y, size, color, weight, alpha) {
  const c = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, size, size);
  c.getFill().setTransparent();
  if (alpha !== undefined) {
    c.getBorder().getLineFill().setSolidFill(color, alpha);
  } else {
    c.getBorder().getLineFill().setSolidFill(color);
  }
  c.getBorder().setWeight(weight || 1);
  return c;
}

/** Círculo preenchido translúcido (mancha de cor decorativa). */
function addGlow(slide, x, y, size, color, alpha) {
  const c = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, size, size);
  c.getFill().setSolidFill(color, alpha === undefined ? 0.06 : alpha);
  c.getBorder().setTransparent();
  return c;
}

/** Triângulo (elemento gráfico do brandbook). */
function addTriangle(slide, x, y, size, color, alpha) {
  const t = slide.insertShape(SlidesApp.ShapeType.TRIANGLE, x, y, size, size * 0.9);
  t.getFill().setSolidFill(color, alpha === undefined ? 1 : alpha);
  t.getBorder().setTransparent();
  return t;
}

/** Linha horizontal fina (detalhe visual). */
function addLine(slide, x, y, w, color, weight, alpha) {
  const l = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, weight || 1.2);
  if (alpha !== undefined) {
    l.getFill().setSolidFill(color, alpha);
  } else {
    l.getFill().setSolidFill(color);
  }
  l.getBorder().setTransparent();
  return l;
}

/**
 * Card claro com sombra suave e faixa de destaque no topo.
 * opts: { accent (cor da faixa), noStrip, fill }
 */
function addCard(slide, x, y, w, h, opts) {
  opts = opts || {};
  addRect(slide, x + 2, y + 3, w, h, THEME.navy, true, 0.07);
  const card = addRect(slide, x, y, w, h, opts.fill || THEME.bgSoft, true);
  if (!opts.noStrip) {
    addRect(slide, x + 14, y, w - 28, 3, opts.accent || THEME.blue);
  }
  return card;
}

/**
 * Pill (badge arredondado) de variação: verde p/ positivo, vermelho p/ negativo.
 * opts: { invert (menor = melhor, inverte as cores), neutral (sempre azul) }
 */
function addPill(slide, x, y, w, text, opts) {
  if (text == null || String(text).trim() === '' || String(text).trim() === '—') return;
  opts = opts || {};
  let color = THEME.blue;
  if (!opts.neutral) {
    const negativo = String(text).trim().indexOf('-') === 0;
    const bom = opts.invert ? negativo : !negativo;
    color = bom ? THEME.green : THEME.red;
  }
  addRect(slide, x, y, w, 18, color, true, 0.13);
  // nowrap: pills são estreitos (56–100pt) e o recuo interno da caixa quebraria
  // valores como "+104,5%" ou "-21,60 p.p." em duas linhas.
  addText(slide, x, y - 1, w, 20, String(text), {
    size: 9.5, bold: true, color: color, align: 'CENTER', nowrap: true,
  });
}

/**
 * Selo de "RECORDE DE ACESSOS" (dourado). Destaca o maior volume mensal já
 * registrado. opts: { texto, w, h, size, dark (fundo escuro), mini (compacto) }.
 */
function addBadgeRecorde(slide, x, y, opts) {
  opts = opts || {};
  const texto = opts.texto || (opts.mini ? '★ RECORDE' : '★ RECORDE DE ACESSOS');
  const w = opts.w || (opts.mini ? 64 : 168);
  const h = opts.h || (opts.mini ? 14 : 22);
  const size = opts.size || (opts.mini ? 6.5 : 8.5);
  if (opts.dark) {
    // chip dourado sólido com texto navy — alto contraste sobre foto/navy
    addRect(slide, x, y, w, h, THEME.gold, true, 0.95);
    addText(slide, x, y - 1, w, h + 2, texto, {
      size: size, bold: true, color: THEME.navy, align: 'CENTER', nowrap: true,
    });
  } else {
    // chip dourado translúcido com texto dourado — sobre fundo claro
    addRect(slide, x, y, w, h, THEME.gold, true, 0.16);
    addText(slide, x, y - 1, w, h + 2, texto, {
      size: size, bold: true, color: THEME.gold, align: 'CENTER', nowrap: true,
    });
  }
}

/** Decoração padrão: anéis e triângulo nas bordas (elementos do brandbook). */
function decorate(slide) {
  addRing(slide, PAGE.W - 120, -140, 260, THEME.blue, 1, 0.18);
  addRing(slide, PAGE.W - 95, -115, 210, THEME.blue, 0.75, 0.1);
  addGlow(slide, -100, PAGE.H - 150, 240, THEME.blue, 0.04);
}

/** Cabeçalho padrão: título, subtítulo e linha de destaque. */
function addHeader(slide, titulo, subtitulo) {
  addText(slide, PAGE.MARGIN, 24, 560, 32, titulo, {
    size: 23, bold: true, color: THEME.navy,
  });
  addRect(slide, PAGE.MARGIN + 2, 56, 38, 3, THEME.blue);
  if (subtitulo) {
    addText(slide, PAGE.MARGIN, 62, 560, 18, subtitulo.toUpperCase(), {
      size: 9.5, bold: true, color: THEME.blue,
    });
  }
}

/** Número formatado no padrão brasileiro: 48256 -> "48.256". */
function fmtNum(n) {
  if (n == null || n === '') return '—';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Converte segundos em "08m20s". */
function fmtTime(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return String(m).padStart(2, '0') + 'm' + String(s).padStart(2, '0') + 's';
}

/** Converte "08m35s" / "8m20s" / "HH:MM" em segundos. Retorna 0 se inválido. */
function timeToMinutes(t) {
  if (t == null || t === '' || t === '—') return 0;
  var m = String(t).match(/(\d+)\s*m\s*(\d+)\s*s/i);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  var parts = String(t).split(':');
  if (parts.length >= 2) {
    var mm = parseInt(parts[0], 10);
    var ss = parseInt(parts[1], 10);
    if (!isNaN(mm) && !isNaN(ss)) return mm * 60 + ss;
  }
  return 0;
}

/** Barra de progresso: trilho cinza + preenchimento proporcional (0–100). */
function addProgressBar(slide, x, y, w, pct, color, h) {
  h = h || 6;
  pct = parseFloat(pct) || 0;
  addRect(slide, x, y, w, h, THEME.navy, true, 0.08);
  if (pct <= 0) return;
  const bw = Math.max(5, (Math.min(pct, 100) / 100) * w);
  addRect(slide, x, y, bw, h, color || THEME.blue, true);
}

/** Extrai número de strings como "37,6%" ou "72%". */
function pctToNumber(s) {
  return parseFloat(String(s).replace('%', '').replace(',', '.'));
}

/** Linha vertical fina (detalhe visual). */
function addVerticalLine(slide, x, y, h, color, weight, alpha) {
  const l = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, weight || 1.2, h);
  if (alpha !== undefined) {
    l.getFill().setSolidFill(color, alpha);
  } else {
    l.getFill().setSolidFill(color);
  }
  l.getBorder().setTransparent();
  return l;
}

/** Rodapé padrão: linha, logo oficial e número da página. */
function addFooter(slide, num) {
  addLine(slide, PAGE.MARGIN, PAGE.H - 28, PAGE.W - 2 * PAGE.MARGIN, THEME.navy, 0.75, 0.1);
  addLogoImage(slide, 'completa', PAGE.MARGIN, PAGE.H - 21, 64);
  if (num) {
    addText(slide, PAGE.W - PAGE.MARGIN - 40, PAGE.H - 23, 40, 16,
      String(num).padStart(2, '0'), {
        size: 8, bold: true, color: THEME.blue, align: 'RIGHT',
      });
  }
}

/** Rodapé para slides com fundo escuro: linha, logo branca e número brancos. */
function addFooterDark(slide, num) {
  addLine(slide, PAGE.MARGIN, PAGE.H - 28, PAGE.W - 2 * PAGE.MARGIN, THEME.white, 0.75, 0.25);
  addLogoImage(slide, 'branca', PAGE.MARGIN, PAGE.H - 21, 64);
  if (num) {
    addText(slide, PAGE.W - PAGE.MARGIN - 40, PAGE.H - 23, 40, 16,
      String(num).padStart(2, '0'), {
        size: 8, bold: true, color: THEME.white, align: 'RIGHT',
      });
  }
}
