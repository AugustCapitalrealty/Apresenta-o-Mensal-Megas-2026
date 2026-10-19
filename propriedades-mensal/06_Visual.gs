/**
 * ARQUIVO: 06_Visual.gs
 * DESCRIÇÃO: Identidade visual da Apresentação Mensal de Propriedades — o
 *            padrão do Orçamento 2027 (orcamento-2027/IDEIAS-DESIGN.md), sem
 *            imagens em Python. Mesmo rebrand das TVs (gestao-tvs/Visual.gs,
 *            19/10/2026), de onde a paleta, a medição de texto e os
 *            componentes foram COPIADOS com o prefixo trocado de _tv para _pv.
 *            Ao corrigir algo aqui, confira lá, e vice-versa.
 *
 * O que o padrão pede, e onde está aqui:
 *   - cabeçalho com barra de destaque, título da marca, subtítulo com o
 *     número que importa, logos à direita e linha fina embaixo → _pvCabecalho_;
 *   - faixa de KPIs em cartões arredondados, rótulo em caixa alta pequena e
 *     número grande; um só cartão cheio na cor escura da marca → _pvKpi_;
 *   - painel branco arredondado com barra lateral e rótulo     → _pvCard_;
 *   - tabela com cabeçalho escuro e linhas zebradas            → _pvTabela_;
 *   - rodapé "Fonte: …" discreto                              → _pvRodape_;
 *   - verde e vermelho SÓ para variação; laranja só para pendência.
 *
 * MARCAS: Capital Realty por padrão; Demercado (verde petróleo e ouro, título
 * em EB Garamond) onde o conteúdo for da Demercado, como a Torre de
 * Manutenção Demercado. A marca vale só durante o desenho do slide
 * (_pvComMarca_) e sempre parte da Capital, para não vazar de um slide para
 * o outro.
 *
 * Os valores das paletas são escritos aqui, e não lidos de CR_DESIGN_SYSTEM:
 * const de topo não pode ler outro arquivo (CLAUDE.md, lição 7).
 */

const PV_MARCAS = {
  CAPITAL: {
    colors: {
      brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9',
      bgSlide: '#F8FAFC', cardBg: '#FFFFFF',
      textMain: '#151E49', textBody: '#475569', textMuted: '#94A3B8',
      lines: '#E2E8F0', zebra: '#F1F5F9',
      brandAccent: '#60A5FA',   // rótulo sobre o cartão cheio
      brandTint: '#EFF6FF', brandTint2: '#DBEAFE',
      accentGreen: '#10B981', accentOrange: '#F97316', accentRed: '#EF4444'
    },
    typography: { titles: 'Montserrat', body: 'Open Sans', heading: 'Montserrat' }
  },
  DEMERCADO: {
    colors: {
      brandDark: '#00594F', brandMed: '#3C8C7F', brandLight: '#AF9800',
      bgSlide: '#F8FAF9', cardBg: '#FFFFFF',
      textMain: '#262626', textBody: '#4B5250', textMuted: '#9AA19F',
      lines: '#E3E8E6', zebra: '#F2F6F5',
      brandAccent: '#D9CB7E',
      brandTint: '#EEF5F3', brandTint2: '#D7E8E4'
    },
    // Título do slide em EB Garamond (a Garamond do manual da Demercado);
    // números e textos seguem em Montserrat/Open Sans.
    typography: { heading: 'EB Garamond' }
  }
};

// Cores e fontes do CR_DESIGN_SYSTEM ANTES da primeira marca aplicada. Os
// slides que ainda não estão no visual novo seguem com a paleta antiga
// (01_Config.gs) mesmo rodando depois de um que já está: a marca é aplicada
// só enquanto o slide novo desenha e desfeita no fim (_pvComMarca_).
// Preenchida dentro de função, nunca no topo (lição 7).
let _PV_ORIGINAL_ = null;

// Põe as cores e fontes da marca em CR_DESIGN_SYSTEM. Sempre parte da
// paleta original + Capital: sem isso, a Demercado da Torre vazaria para o
// slide seguinte.
function _pvAplicarMarca_(marca) {
  const DS = CR_DESIGN_SYSTEM;
  if (!_PV_ORIGINAL_) {
    _PV_ORIGINAL_ = { colors: Object.assign({}, DS.colors), typography: Object.assign({}, DS.typography) };
  }
  const base = PV_MARCAS.CAPITAL, m = PV_MARCAS[marca || 'CAPITAL'] || base;
  Object.assign(DS.colors, _PV_ORIGINAL_.colors, base.colors, m.colors || {});
  Object.assign(DS.typography, _PV_ORIGINAL_.typography, base.typography, m.typography || {});
}

// Volta o CR_DESIGN_SYSTEM ao que era antes da primeira marca.
function _pvRestaurarMarca_() {
  if (!_PV_ORIGINAL_) return;
  const DS = CR_DESIGN_SYSTEM;
  Object.keys(DS.colors).forEach(k => { delete DS.colors[k]; });
  Object.keys(DS.typography).forEach(k => { delete DS.typography[k]; });
  Object.assign(DS.colors, _PV_ORIGINAL_.colors);
  Object.assign(DS.typography, _PV_ORIGINAL_.typography);
}

// Desenha um slide inteiro na marca pedida e desfaz a marca no fim, mesmo
// se o desenho lançar exceção.
function _pvComMarca_(marca, desenhar) {
  _pvAplicarMarca_(marca);
  try { return desenhar(); }
  finally { _pvRestaurarMarca_(); }
}


// ==========================================
// CABEÇALHO, LOGO E TABELA
// ==========================================

// Cabeçalho do padrão: barra de destaque à esquerda, título na fonte da
// marca, subtítulo com o número que importa, logos à direita, canto com a
// referência e linha fina embaixo (y = 72). Pinta também o fundo do slide.
// op: { logos: [ids do Drive, da direita para a esquerda] (padrão: Capital
//       Realty), canto: texto pequeno sob os logos }
function _pvCabecalho_(slide, titulo, subtitulo, op) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  op = op || {};
  slide.getBackground().setSolidFill(c.bgSlide);

  _pvRet_(slide, 30, 16, 5, 46, c.brandLight);
  const serifa = DS.typography.heading !== DS.typography.titles;   // Garamond é menor no mesmo corpo
  _pvTexto_(slide, 40, 10, 430, 34, titulo,
    { fs: serifa ? 28 : 24, fsMin: 14, bold: true, cor: c.brandDark, fonte: DS.typography.heading, cortar: true });
  if (subtitulo) {
    _pvTexto_(slide, 40, 42, 430, 20, subtitulo,
      { fs: 11.5, fsMin: 8, cor: c.textBody, fonte: DS.typography.body, cortar: true });
  }

  let direita = 690;
  (op.logos || [DS.logoId]).forEach(id => {
    const w = _pvLogo_(slide, id, direita, 12, 120, 32);
    if (w) direita -= w + 12;
  });
  if (op.canto) {
    _pvTexto_(slide, 480, 50, 210, 16, op.canto,
      { fs: 8.5, fsMin: 7, bold: true, cor: c.textMuted, fonte: DS.typography.body, align: 'R', cortar: true });
  }

  const linha = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 30, 72, 690, 72);
  linha.getLineFill().setSolidFill(c.lines);
  linha.setWeight(1);
}

// Logo encaixado em maxW × maxH, alinhado à direita em `direita`. Devolve a
// largura usada (0 se o Drive não entregou o arquivo — o slide segue sem logo).
function _pvLogo_(slide, id, direita, y, maxW, maxH) {
  if (!id) return 0;
  try {
    const img = slide.insertImage(DriveApp.getFileById(id).getBlob());
    const ar = img.getWidth() / img.getHeight();
    let w = maxW, h = maxW / ar;
    if (h > maxH) { h = maxH; w = maxH * ar; }
    img.setWidth(w).setHeight(h).setLeft(direita - w).setTop(y + (maxH - h) / 2);
    return w;
  } catch (e) {
    Logger.log('Cabeçalho: logo indisponível (' + id + '): ' + e.message);
    return 0;
  }
}

/**
 * Tabela do padrão: cabeçalho escuro na cor da marca, linhas zebradas, rótulos
 * medidos (encolhem e cortam com "…", nunca quebram).
 *
 * colunas: [{ rotulo, peso, align: 'L'|'C'|'R' }] — `peso` divide a largura.
 * linhas : cada uma é
 *   { celulas: [texto | { texto, cor, bold }] }  linha normal, ou
 *   { grupo: 'TEXTO' }                           faixa de subgrupo (tom claro).
 * op: { altCab, altLinha, fs }
 * Devolve o y logo abaixo da última linha.
 */
function _pvTabela_(slide, x, y, w, colunas, linhas, op) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  op = op || {};
  const altCab = op.altCab || 18, altLinha = op.altLinha || 20, fs = op.fs || 8.5;
  const pesoTotal = colunas.reduce((s, col) => s + (col.peso || 1), 0);
  const larguras = colunas.map(col => w * (col.peso || 1) / pesoTotal);
  const xs = larguras.map((_, i) => x + larguras.slice(0, i).reduce((s, v) => s + v, 0));

  _pvRet_(slide, x, y, w, altCab, c.brandDark);
  colunas.forEach((col, i) => {
    _pvTexto_(slide, xs[i], y, larguras[i], altCab, String(col.rotulo || '').toUpperCase(),
      { fs: 7.5, fsMin: 6, bold: true, cor: '#FFFFFF', fonte: DS.typography.titles, align: col.align, cortar: true });
  });

  // Um tamanho de letra por coluna: o maior (até `fs`) que cabe em TODAS as
  // linhas. Encolher célula por célula deixava rótulos vizinhos com tamanhos
  // diferentes na mesma coluna.
  const celula = cel => ((cel !== null && typeof cel === 'object') ? cel : { texto: cel });
  const fsColuna = colunas.map((col, i) => {
    let f = fs;
    const fonte = i === 0 ? DS.typography.body : DS.typography.titles;
    linhas.forEach(lin => {
      if (lin.grupo) return;
      const o = celula(lin.celulas[i]);
      const txt = o.texto == null ? '—' : String(o.texto);
      while (f > 6.5 && _pvLargura_(txt, f, fonte, !!o.bold) > larguras[i] - _PV_RECUO_) f -= 0.25;
    });
    return f;
  });

  let yy = y + altCab, zebra = false;
  linhas.forEach(lin => {
    if (lin.grupo) {
      _pvRet_(slide, x, yy, w, altLinha, c.brandTint);
      _pvTexto_(slide, x, yy, w, altLinha, String(lin.grupo).toUpperCase(),
        { fs: 7.5, fsMin: 6, bold: true, cor: c.brandDark, fonte: DS.typography.titles, cortar: true });
      yy += altLinha;
      zebra = false;   // a zebra recomeça em cada subgrupo
      return;
    }
    if (zebra) _pvRet_(slide, x, yy, w, altLinha, c.zebra);
    lin.celulas.forEach((cel, i) => {
      const o = celula(cel);
      _pvTexto_(slide, xs[i], yy, larguras[i], altLinha, o.texto == null ? '—' : String(o.texto),
        { fs: fsColuna[i], fsMin: fsColuna[i], bold: !!o.bold, cor: o.cor || c.textMain,
          fonte: i === 0 ? DS.typography.body : DS.typography.titles, align: colunas[i].align, cortar: true });
    });
    yy += altLinha;
    zebra = !zebra;
  });
  return yy;
}


// ==========================================
// MEDIÇÃO DE TEXTO (caixa estreita quebra sozinha — lição 1 do CLAUDE.md)
// ==========================================
// Largura REAL de cada letra, medida nas fontes do deck
// (orcamento-2027/ferramentas/fontes) com o Chrome — ferramentas/medir_fontes.html.
// Na TV de 19/10/2026 as estimativas (nº de letras × fator, e depois classes de
// letra) deixaram quebrar "T IANKOSKI CONSTRUCOES E…" e "…para pagam…": a
// medida real de "Emissão de Ordem de Compra para pagam…" em 7 pt é 146 pt,
// numa caixa com 137 pt úteis. A tabela tem, para cada fonte e peso, a largura
// de cada caractere de _PV_CHARS_ em milésimos de "em", 2 dígitos base 36 por
// caractere. Caractere fora da lista conta 0,65 em (largo, de propósito).
// Recuo interno da TEXT_BOX do Slides: 7,2 pt de cada lado (14,4), mais 1,6 de folga.
const _PV_RECUO_ = 16;
const _PV_CHARS_ = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç·…▲▼—−–²ºª";
const _PV_LARGURAS_ = {
  'Montserrat|400': '7a78adjch3n1il5m9595aqfz5wam5w9biea1fsfoidfqgxgdhqgx5w5wfzfzfzfrspjxkyjpmyilhllhml8edxjrgdqjmlnbjynbk3h3fym0jeuvi8hni38u9b8ug0dwgogeiufniugs9fj1is7h7mgm7hthishfiuiub5dkbaiof2ofeuf2e79a869afzjxjxjxjxilil8enbnbnbm0jpgegegegegsgs7hhfhfhfiofn70hzgogorsfzdwbybib5',
  'Montserrat|700': '7v81c5k0hqodk86e9x9yc2gn7aaq7aawivawgeggj5gjhph8ichp7a7agngngngdsrlal9k4myinhrlfmg94f1kkgsqjmgngkcngkfhqh6lwkqwbjuisina8awa8godwgoh5j6gfj8hjarjgj78d8ji78dt5j7i7j6j6bzerc3j3gmq1gjgmf3av8lavgnlalalalainin94ngngnglwk4h5h5h5h5hjhj8di7i7i7j3gf8em6gogorsgndwbybvbg',
  'Open Sans|400': '787cb2hyfwmzk9638787fbfw778y7ba7fwfwfwfwfwfwfwfwfwfw7b7bfwfwfwc0owhkhyhik6fgeck7kh7r7hh0eiozkxlmgqlmh5f8fbk9gkpng2fjfw93a793fwc67pfgh0dbh0fm9cf3h17070el70pqh1gqh0h0bdd99wh1dwljejdxd1aff9affwhkhkhkhkfgfg7rlmlmlmk9hifgfgfgfgfmfm70gqgqgqh1db7blmririrsfwdw9oae9t',
  'Open Sans|700': '787yd4hyfwp1ku7e9f9ff5fw7x8y7xbhfwfwfwfwfwfwfwfwfwfw7x7xfwfwfwd9oxj6iohpkkfkf9k4l99797igfpq7mlm4hgm4icfbg3l0i2qvijhcg397bh97fwbfa2gshleahlgfarfpi98h8hh88hrai9h7hlhlcmdtc2i9ftnsg2ftdkayfbayfwj6j6j6j6fkfk97m4m4m4l0hpgsgsgsgsgfgf8hh7h7h7i9ea7xnrririrsfwdwajasan',
  'EB Garamond|400': '5k6y96d0c9i2l05k8r8r9gge6e7m6eb3dcdcdcdcdcdcdcdcdcdc6w6cfkfqfkagktj8gbjqkyfoe8k9mi9g9gixg8p1m0l7fcl7jtcximkiiopgjng2gr97b397dwdw5kb3ebbbe2au8uc3eb6t6ad16olmeodrefei9a8z8qenc6j1byc6ahag78agdwj8j8j8j8fofo9gl7l7l7kijqb3b3b3b3auau6tdrdrdrenbb5kj2izizqegofa8c8l8m',
  'EB Garamond|700': '6l82b2dgctjim76l8g8g9xgp6v8s6vbaepepepepepepepepepep7u6vf1hhf1azlpk0hejplafzf6jzm9a4aal7gaphmhl4gvl4l4dqjbkpjmsckui6gk9wba9weage6lc6f2bffdbla0dwfj877ef67xmffqdzfbewbia0affbdfkwe1ddc5ad7oadf5k0k0k0k0fzfza4l4l4l4kpjpc6c6c6c6blbl87dzdzdzfbbf73kqizizqoh0hk9h939q'
};
const _PV_LARGURAS_CACHE_ = {};

function _pvLargura_(texto, fs, fonte, bold) {
  const chave = (fonte || 'Open Sans') + '|' + (bold ? 700 : 400);
  let t = _PV_LARGURAS_CACHE_[chave];
  if (!t) {
    const enc = _PV_LARGURAS_[chave] || _PV_LARGURAS_['Open Sans|' + (bold ? 700 : 400)];
    t = {};
    for (let i = 0; i < _PV_CHARS_.length; i++) t[_PV_CHARS_[i]] = parseInt(enc.substr(i * 2, 2), 36);
    _PV_LARGURAS_CACHE_[chave] = t;
  }
  let mil = 0;
  for (const ch of String(texto)) mil += (t[ch] !== undefined ? t[ch] : 650);
  return mil / 1000 * fs;
}

// Corta com "…" até caber numa linha de largura `w`.
function _pvCortar_(texto, w, fs, fonte, bold) {
  const t = String(texto || '');
  const util = w - _PV_RECUO_;
  if (_pvLargura_(t, fs, fonte, bold) <= util) return t;
  let n = t.length;
  while (n > 1 && _pvLargura_(t.slice(0, n) + '…', fs, fonte, bold) > util) n--;
  return t.slice(0, n).replace(/\s+$/, '') + '…';
}

// Texto de uma linha só: encolhe a fonte (até fsMin) se não couber; com
// `cortar`, corta com "…" no tamanho mínimo.
// op: { fs, fsMin, bold, italic, cor, fonte, align: 'L'|'C'|'R', cortar }
function _pvTexto_(slide, x, y, w, h, texto, op) {
  let t = String(texto == null ? '' : texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"
  const fonte = op.fonte || CR_DESIGN_SYSTEM.typography.body;
  let fs = op.fs;
  while (fs > (op.fsMin || fs) && _pvLargura_(t, fs, fonte, op.bold) > w - _PV_RECUO_) fs -= 0.25;
  if (op.cortar) t = _pvCortar_(t, w, fs, fonte, op.bold);
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!op.bold).setItalic(!!op.italic)
    .setForegroundColor(op.cor || CR_DESIGN_SYSTEM.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    op.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER :
    (op.align === 'R' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START));
  return box;
}


// Parágrafo de várias linhas: quebra as palavras pela largura REAL (as
// mesmas medidas do _pvTexto_), encolhe a fonte até o bloco caber na altura
// (até fsMin) e, se ainda não couber, corta a última linha com "…". As
// quebras são feitas aqui, com "\n", para o Slides não decidir outra.
// Quebra de linha no texto original (\n) é respeitada.
// op: { fs, fsMin, bold, italic, cor, fonte, align: 'L'|'C' }
// Devolve { caixa, altura, linhas, fs } — ou null se o texto for vazio.
function _pvParagrafo_(slide, x, y, w, h, texto, op) {
  const m = _pvMedirParagrafo_(w, h, texto, op);
  if (!m) return null;
  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.TOP);
  box.getText().setText(m.texto).getTextStyle()
    .setFontSize(m.fs).setBold(!!op.bold).setItalic(!!op.italic)
    .setForegroundColor(op.cor || CR_DESIGN_SYSTEM.colors.textMain).setFontFamily(op.fonte || CR_DESIGN_SYSTEM.typography.body);
  box.getText().getParagraphStyle().setParagraphAlignment(
    op.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return { caixa: box, altura: m.altura, linhas: m.linhas, fs: m.fs };
}

// O mesmo cálculo, sem desenhar: quem quer centralizar um bloco de vários
// parágrafos mede antes. Devolve { texto, fs, linhas, altura } ou null.
function _pvMedirParagrafo_(w, h, texto, op) {
  if (h < 12 || w < _PV_RECUO_ + 10) return null;   // sem espaço: não desenha (nem estoura)
  const fonte = op.fonte || CR_DESIGN_SYSTEM.typography.body;
  const util = w - _PV_RECUO_, alturaLinha = 1.25;
  const quebrar = fs => {
    const linhas = [];
    String(texto == null ? '' : texto).split('\n').forEach(par => {
      let atual = '';
      par.split(/\s+/).filter(Boolean).forEach(p => {
        const tenta = atual ? atual + ' ' + p : p;
        if (!atual || _pvLargura_(tenta, fs, fonte, op.bold) <= util) atual = tenta;
        else { linhas.push(atual); atual = p; }
      });
      linhas.push(atual);
    });
    return linhas;
  };
  let fs = op.fs, linhas = quebrar(fs);
  while (fs > (op.fsMin || fs) && linhas.length * fs * alturaLinha + 8 > h) { fs -= 0.5; linhas = quebrar(fs); }
  const cabem = Math.max(1, Math.floor((h - 8) / (fs * alturaLinha)));
  if (linhas.length > cabem) {
    linhas = linhas.slice(0, cabem);
    linhas[cabem - 1] = _pvCortar_(linhas[cabem - 1] + ' …', w, fs, fonte, op.bold);
  }
  // Palavra sozinha mais larga que a caixa (um link, um código) é cortada.
  linhas = linhas.map(l => _pvLargura_(l, fs, fonte, op.bold) > util ? _pvCortar_(l, w, fs, fonte, op.bold) : l);
  const t = linhas.join('\n');
  if (!t.trim()) return null;
  // A altura que o texto ocupa de fato: quem chama põe o próximo bloco logo abaixo.
  return { texto: t, fs: fs, linhas: linhas.length, altura: Math.min(h, linhas.length * fs * alturaLinha + 8) };
}


// ==========================================
// COMPONENTES
// ==========================================

// Retângulo (arredondado com op.redondo), com ou sem borda. op.alpha =
// opacidade (1 = sólido), usada no véu sobre a foto da capa.
function _pvRet_(slide, x, y, w, h, cor, op) {
  const o = op || {};
  const s = slide.insertShape(o.redondo ? SlidesApp.ShapeType.ROUND_RECTANGLE : SlidesApp.ShapeType.RECTANGLE,
                              x, y, Math.max(0.5, w), Math.max(0.5, h));
  if (o.alpha === undefined) s.getFill().setSolidFill(cor);
  else s.getFill().setSolidFill(cor, o.alpha);
  if (o.borda) s.getBorder().setWeight(o.peso || 0.75).getLineFill().setSolidFill(o.borda);
  else s.getBorder().setTransparent();
  return s;
}

/**
 * Cartão de KPI: rótulo em caixa alta pequena, número grande, linha de apoio.
 * k = { rotulo, valor, sub, corSub, destaque }
 * Com `destaque`, o cartão é cheio na cor escura da marca (o protagonista
 * do slide — um só por slide).
 */
function _pvKpi_(slide, x, y, w, h, k) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const cheio = !!k.destaque;
  _pvRet_(slide, x, y, w, h, cheio ? c.brandDark : c.cardBg, { redondo: true, borda: cheio ? null : c.lines });
  _pvTexto_(slide, x + 8, y + 6, w - 12, 16, String(k.rotulo || '').toUpperCase(),
    { fs: 8, fsMin: 6.5, bold: true, cor: cheio ? c.brandAccent : c.textBody, fonte: DS.typography.titles, cortar: true });
  const temSub = !!k.sub;
  _pvTexto_(slide, x + 8, y + 20, w - 12, h - (temSub ? 38 : 24), String(k.valor),
    { fs: k.fsValor || 26, fsMin: 12, bold: true, cor: cheio ? '#FFFFFF' : c.brandDark, fonte: DS.typography.titles });
  if (temSub) {
    // Verde/vermelho cheios somem sobre o fundo escuro: no cartão cheio a
    // variação usa os tons claros (mesma leitura, contraste de TV). Qualquer
    // outra cor vira branco: o "— 0" em textBody sumia no verde de Curitiba.
    let corSub = k.corSub || (cheio ? '#FFFFFF' : c.textBody);
    if (cheio) {
      if (k.corSub === c.accentRed) corSub = '#FCA5A5';
      else if (k.corSub === c.accentGreen) corSub = '#6EE7B7';
      else if (k.corSub === c.accentOrange) corSub = '#FDBA74';
      else corSub = '#FFFFFF';
    }
    _pvTexto_(slide, x + 8, y + h - 20, w - 12, 15, k.sub,
      { fs: 8.5, fsMin: 6.5, bold: !!k.corSub, cor: corSub, fonte: DS.typography.body, cortar: true });
  }
}

/**
 * Painel: cartão branco arredondado com barra lateral na cor de destaque da
 * marca e rótulo em caixa alta. Devolve o y onde o conteúdo começa.
 */
function _pvCard_(slide, x, y, w, h, rotulo) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  _pvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _pvRet_(slide, x, y + 8, 4, h - 16, c.brandLight);
  if (!rotulo) return y + 10;
  _pvTexto_(slide, x + 10, y + 6, w - 20, 18, String(rotulo).toUpperCase(),
    { fs: 9, fsMin: 7, bold: true, cor: c.textBody, fonte: DS.typography.titles, cortar: true });
  return y + 28;
}

// ==========================================
// FOTOS (capa)
// ==========================================
// Foto cobrindo o bloco (x, y, w, h) sem deformar, com o ponto de interesse
// (foco, fração da largura) no centro quando dá. O Apps Script não recorta
// imagem: o que passa do bloco é coberto com `fundo` — por isso a foto entra
// ANTES de todo o resto do slide. Mesma técnica de _orcFotoEmBloco_
// (orcamento-2027/10_Capa.gs). false se a foto não carregou.
function _pvFotoEmBloco_(slide, fotoId, x, y, w, h, foco, fundo) {
  if (!fotoId) return false;
  try {
    const img = slide.insertImage(_pvFotoReduzida_(fotoId));
    const ar = img.getWidth() / img.getHeight();
    const iw = ar > w / h ? h * ar : w, ih = ar > w / h ? h : w / ar;
    const f = foco == null ? 0.5 : foco;
    const ix = Math.min(x, Math.max(x + w - iw, x + w / 2 - f * iw)), iy = y + (h - ih) / 2;
    img.setWidth(iw).setHeight(ih).setLeft(ix).setTop(iy);
    // 2 pt além da borda da foto: borda com borda, o Slides deixa um fio cinza.
    const W = 720, H = 405, f2 = 2, sobra = 0.01, mascaras = [];
    if (x - ix > sobra) mascaras.push([ix - f2, iy - f2, x - ix + f2, ih + 2 * f2]);
    if (ix + iw - x - w > sobra) mascaras.push([x + w, iy - f2, ix + iw - x - w + f2, ih + 2 * f2]);
    if (y - iy > sobra) mascaras.push([x, iy - f2, w, y - iy + f2]);
    if (iy + ih - y - h > sobra) mascaras.push([x, y + h, w, iy + ih - y - h + f2]);
    mascaras.forEach(m => {
      const x0 = Math.max(0, m[0]), y0 = Math.max(0, m[1]);
      const x1 = Math.min(W, m[0] + m[2]), y1 = Math.min(H, m[1] + m[3]);
      if (x1 - x0 > 0.5 && y1 - y0 > 0.5) _pvRet_(slide, x0, y0, x1 - x0, y1 - y0, fundo);
    });
    return true;
  } catch (e) {
    Logger.log('Foto da capa indisponível (' + fotoId + '): ' + e.message);
    return false;
  }
}

// Miniatura de 1600 px pela API do Drive no lugar do original: foto de
// câmera tem vários MB (no Orçamento isso levou a geração ao "Service timed
// out"). Se algo falhar, vai o arquivo original.
function _pvFotoReduzida_(id) {
  try {
    const cab = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
    const meta = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id +
                                   '?fields=thumbnailLink&supportsAllDrives=true', cab);
    if (meta.getResponseCode() !== 200) throw new Error('metadados HTTP ' + meta.getResponseCode());
    const link = JSON.parse(meta.getContentText()).thumbnailLink;
    if (!link) throw new Error('o Drive não tem miniatura');
    const resp = UrlFetchApp.fetch(link.replace(/=s\d+$/, '=s1600'), cab);
    const b = resp.getBlob();
    if (resp.getResponseCode() !== 200 || !/^image\/(png|jpeg|gif)$/.test(String(b.getContentType() || ''))) {
      throw new Error('miniatura HTTP ' + resp.getResponseCode());
    }
    return b;
  } catch (e) {
    Logger.log('Foto ' + id + ': sem versão reduzida (' + e.message + '), vai o original.');
    return DriveApp.getFileById(id).getBlob();
  }
}

// Véu da cor `cor` que vai de opacidade aDe (à esquerda) a aAte (à direita).
// Camadas EMPILHADAS a partir do lado opaco, cada uma mais curta: faixas lado
// a lado semitransparentes deixam listras onde se encostam (visto no
// Orçamento, 07/10/2026). A camada j cobre do lado opaco até o fim da faixa
// j, e a transparência dela faz o acumulado bater com a reta de aDe a aAte.
function _pvVeu_(slide, x, y, w, h, cor, aDe, aAte, passos) {
  const n = passos || 20;
  const alvo = j => aDe + (aAte - aDe) * (n === 1 ? 0 : j / (n - 1));
  let transDepois = 1;
  for (let j = n - 1; j >= 0; j--) {
    const trans = 1 - Math.max(0, Math.min(1, alvo(j)));
    const a = transDepois > 0 ? 1 - trans / transDepois : 0;
    transDepois = trans;
    if (a < 0.004) continue;
    _pvRet_(slide, x, y, w * (j + 1) / n, h, cor, { alpha: a });
  }
}

// Logo num chip branco (contraste sobre a foto). Devolve a largura usada.
function _pvLogoChip_(slide, id, x, y, maxW, maxH) {
  if (!id) return 0;
  try {
    const img = slide.insertImage(DriveApp.getFileById(id).getBlob());
    const ar = img.getWidth() / img.getHeight();
    let w = maxW, h = maxW / ar;
    if (h > maxH) { h = maxH; w = maxH * ar; }
    const pad = 9;
    _pvRet_(slide, x, y, w + 2 * pad, maxH + 2 * pad, '#FFFFFF', { redondo: true, alpha: 0.95 });
    img.setWidth(w).setHeight(h).setLeft(x + pad).setTop(y + pad + (maxH - h) / 2);
    img.bringToFront();
    return w + 2 * pad;
  } catch (e) {
    Logger.log('Capa: logo indisponível (' + id + '): ' + e.message);
    return 0;
  }
}


// Rodapé discreto com a fonte do dado.
function _pvRodape_(slide, texto) {
  const DS = CR_DESIGN_SYSTEM;
  _pvTexto_(slide, 30, 384, 660, 16, texto,
    { fs: 7.5, fsMin: 6, cor: DS.colors.textMuted, fonte: DS.typography.body, cortar: true });
}

// "▲ +6" / "▼ −3" / "— 0" com a cor certa. maiorRuim = subir é ruim (fila).
// op (opcional, a mais que nas TVs): { casas, unidade } — "▲ +1,2 p.p.".
// Diferença que arredonda a zero nas casas pedidas conta como zero.
function _pvVariacao_(diff, maiorRuim, op) {
  const c = CR_DESIGN_SYSTEM.colors;
  const casas = (op && op.casas) || 0, unidade = (op && op.unidade) ? ' ' + op.unidade : '';
  const fator = Math.pow(10, casas);
  const d = Math.round((diff || 0) * fator) / fator;
  if (!d) return { txt: '— 0' + unidade, cor: c.textBody };
  const sobe = d > 0;
  const ruim = maiorRuim ? sobe : !sobe;
  const abs = Math.abs(d).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return { txt: (sobe ? '▲ +' : '▼ −') + abs + unidade, cor: ruim ? c.accentRed : c.accentGreen };
}
