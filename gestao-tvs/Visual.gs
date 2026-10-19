/**
 * ARQUIVO: Visual.gs
 * DESCRIÇÃO: Identidade visual das TVs — o padrão do Orçamento 2027
 *            (orcamento-2027/IDEIAS-DESIGN.md), sem as imagens em Python.
 *            Rebrand de 19/10/2026.
 *
 * O que o padrão pede, e onde está aqui:
 *   - cabeçalho com barra de destaque, título da marca, subtítulo com o
 *     número que importa e linha fina embaixo  → applyBrandHeaderAndBackground
 *     (00_Main.gs), que usa as cores e fontes daqui;
 *   - faixa de KPIs em cartões arredondados, rótulo em caixa alta pequena e
 *     número grande; o cartão principal cheio na cor da marca → _tvKpi_;
 *   - painel branco arredondado com barra lateral e rótulo → _tvCard_;
 *   - rodapé "Fontes: …" discreto                          → _tvRodape_;
 *   - verde e vermelho SÓ para variação; laranja só para pendência.
 *
 * MARCAS: Curitiba é Demercado (verde petróleo e ouro, título em EB Garamond —
 * mesma paleta aprovada no Orçamento 2027); Itajaí e Esteio são Capital
 * Realty. A marca vem de UNITS[].marca (Config.gs) e é aplicada no começo de
 * cada slide (_tvAplicarMarca_), porque o mesmo script desenha as três TVs
 * na mesma execução.
 *
 * Os valores das paletas são escritos aqui, e não lidos de CR_DESIGN_SYSTEM:
 * este arquivo pode carregar antes de Config.gs (CLAUDE.md, lição 7).
 */

const TV_MARCAS = {
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

// Põe as cores e fontes da marca da unidade em CR_DESIGN_SYSTEM. Sempre parte
// da Capital: sem isso, a Demercado de Curitiba vazaria para Itajaí na mesma
// execução.
function _tvAplicarMarca_(unit) {
  const base = TV_MARCAS.CAPITAL, m = TV_MARCAS[(unit && unit.marca) || 'CAPITAL'] || base;
  Object.assign(CR_DESIGN_SYSTEM.colors, base.colors, m.colors || {});
  Object.assign(CR_DESIGN_SYSTEM.typography, base.typography, m.typography || {});
}

// "MEGA ITAJAÍ" → "Mega Itajaí" (o nome em caixa alta grita no subtítulo).
function _tvNomeUnidade_(unit) {
  return String(unit.name || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, e, l) => e + l.toUpperCase());
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
// de cada caractere de _TV_CHARS_ em milésimos de "em", 2 dígitos base 36 por
// caractere. Caractere fora da lista conta 0,65 em (largo, de propósito).
// Recuo interno da TEXT_BOX do Slides: 7,2 pt de cada lado (14,4), mais 1,6 de folga.
const _TV_RECUO_ = 16;
const _TV_CHARS_ = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç·…▲▼—−–²ºª";
const _TV_LARGURAS_ = {
  'Montserrat|400': '7a78adjch3n1il5m9595aqfz5wam5w9biea1fsfoidfqgxgdhqgx5w5wfzfzfzfrspjxkyjpmyilhllhml8edxjrgdqjmlnbjynbk3h3fym0jeuvi8hni38u9b8ug0dwgogeiufniugs9fj1is7h7mgm7hthishfiuiub5dkbaiof2ofeuf2e79a869afzjxjxjxjxilil8enbnbnbm0jpgegegegegsgs7hhfhfhfiofn70hzgogorsfzdwbybib5',
  'Montserrat|700': '7v81c5k0hqodk86e9x9yc2gn7aaq7aawivawgeggj5gjhph8ichp7a7agngngngdsrlal9k4myinhrlfmg94f1kkgsqjmgngkcngkfhqh6lwkqwbjuisina8awa8godwgoh5j6gfj8hjarjgj78d8ji78dt5j7i7j6j6bzerc3j3gmq1gjgmf3av8lavgnlalalalainin94ngngnglwk4h5h5h5h5hjhj8di7i7i7j3gf8em6gogorsgndwbybvbg',
  'Open Sans|400': '787cb2hyfwmzk9638787fbfw778y7ba7fwfwfwfwfwfwfwfwfwfw7b7bfwfwfwc0owhkhyhik6fgeck7kh7r7hh0eiozkxlmgqlmh5f8fbk9gkpng2fjfw93a793fwc67pfgh0dbh0fm9cf3h17070el70pqh1gqh0h0bdd99wh1dwljejdxd1aff9affwhkhkhkhkfgfg7rlmlmlmk9hifgfgfgfgfmfm70gqgqgqh1db7blmririrsfwdw9oae9t',
  'Open Sans|700': '787yd4hyfwp1ku7e9f9ff5fw7x8y7xbhfwfwfwfwfwfwfwfwfwfw7x7xfwfwfwd9oxj6iohpkkfkf9k4l99797igfpq7mlm4hgm4icfbg3l0i2qvijhcg397bh97fwbfa2gshleahlgfarfpi98h8hh88hrai9h7hlhlcmdtc2i9ftnsg2ftdkayfbayfwj6j6j6j6fkfk97m4m4m4l0hpgsgsgsgsgfgf8hh7h7h7i9ea7xnrririrsfwdwajasan',
  'EB Garamond|400': '5k6y96d0c9i2l05k8r8r9gge6e7m6eb3dcdcdcdcdcdcdcdcdcdc6w6cfkfqfkagktj8gbjqkyfoe8k9mi9g9gixg8p1m0l7fcl7jtcximkiiopgjng2gr97b397dwdw5kb3ebbbe2au8uc3eb6t6ad16olmeodrefei9a8z8qenc6j1byc6ahag78agdwj8j8j8j8fofo9gl7l7l7kijqb3b3b3b3auau6tdrdrdrenbb5kj2izizqegofa8c8l8m',
  'EB Garamond|700': '6l82b2dgctjim76l8g8g9xgp6v8s6vbaepepepepepepepepepep7u6vf1hhf1azlpk0hejplafzf6jzm9a4aal7gaphmhl4gvl4l4dqjbkpjmsckui6gk9wba9weage6lc6f2bffdbla0dwfj877ef67xmffqdzfbewbia0affbdfkwe1ddc5ad7oadf5k0k0k0k0fzfza4l4l4l4kpjpc6c6c6c6blbl87dzdzdzfbbf73kqizizqoh0hk9h939q'
};
const _TV_LARGURAS_CACHE_ = {};

function _tvLargura_(texto, fs, fonte, bold) {
  const chave = (fonte || 'Open Sans') + '|' + (bold ? 700 : 400);
  let t = _TV_LARGURAS_CACHE_[chave];
  if (!t) {
    const enc = _TV_LARGURAS_[chave] || _TV_LARGURAS_['Open Sans|' + (bold ? 700 : 400)];
    t = {};
    for (let i = 0; i < _TV_CHARS_.length; i++) t[_TV_CHARS_[i]] = parseInt(enc.substr(i * 2, 2), 36);
    _TV_LARGURAS_CACHE_[chave] = t;
  }
  let mil = 0;
  for (const ch of String(texto)) mil += (t[ch] !== undefined ? t[ch] : 650);
  return mil / 1000 * fs;
}

// Corta com "…" até caber numa linha de largura `w`.
function _tvCortar_(texto, w, fs, fonte, bold) {
  const t = String(texto || '');
  const util = w - _TV_RECUO_;
  if (_tvLargura_(t, fs, fonte, bold) <= util) return t;
  let n = t.length;
  while (n > 1 && _tvLargura_(t.slice(0, n) + '…', fs, fonte, bold) > util) n--;
  return t.slice(0, n).replace(/\s+$/, '') + '…';
}

// Texto de uma linha só: encolhe a fonte (até fsMin) se não couber; com
// `cortar`, corta com "…" no tamanho mínimo.
// op: { fs, fsMin, bold, italic, cor, fonte, align: 'L'|'C'|'R', cortar }
function _tvTexto_(slide, x, y, w, h, texto, op) {
  let t = String(texto == null ? '' : texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"
  const fonte = op.fonte || CR_DESIGN_SYSTEM.typography.body;
  let fs = op.fs;
  while (fs > (op.fsMin || fs) && _tvLargura_(t, fs, fonte, op.bold) > w - _TV_RECUO_) fs -= 0.25;
  if (op.cortar) t = _tvCortar_(t, w, fs, fonte, op.bold);
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
// mesmas medidas do _tvTexto_), encolhe a fonte até o bloco caber na altura
// (até fsMin) e, se ainda não couber, corta a última linha com "…". As
// quebras são feitas aqui, com "\n", para o Slides não decidir outra.
// Quebra de linha no texto original (\n) é respeitada.
// op: { fs, fsMin, bold, italic, cor, fonte, align: 'L'|'C' }
// Devolve { caixa, altura, linhas, fs } — ou null se o texto for vazio.
function _tvParagrafo_(slide, x, y, w, h, texto, op) {
  const m = _tvMedirParagrafo_(w, h, texto, op);
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
function _tvMedirParagrafo_(w, h, texto, op) {
  if (h < 12 || w < _TV_RECUO_ + 10) return null;   // sem espaço: não desenha (nem estoura)
  const fonte = op.fonte || CR_DESIGN_SYSTEM.typography.body;
  const util = w - _TV_RECUO_, alturaLinha = 1.25;
  const quebrar = fs => {
    const linhas = [];
    String(texto == null ? '' : texto).split('\n').forEach(par => {
      let atual = '';
      par.split(/\s+/).filter(Boolean).forEach(p => {
        const tenta = atual ? atual + ' ' + p : p;
        if (!atual || _tvLargura_(tenta, fs, fonte, op.bold) <= util) atual = tenta;
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
    linhas[cabem - 1] = _tvCortar_(linhas[cabem - 1] + ' …', w, fs, fonte, op.bold);
  }
  // Palavra sozinha mais larga que a caixa (um link, um código) é cortada.
  linhas = linhas.map(l => _tvLargura_(l, fs, fonte, op.bold) > util ? _tvCortar_(l, w, fs, fonte, op.bold) : l);
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
function _tvRet_(slide, x, y, w, h, cor, op) {
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
function _tvKpi_(slide, x, y, w, h, k) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const cheio = !!k.destaque;
  _tvRet_(slide, x, y, w, h, cheio ? c.brandDark : c.cardBg, { redondo: true, borda: cheio ? null : c.lines });
  _tvTexto_(slide, x + 8, y + 6, w - 12, 16, String(k.rotulo || '').toUpperCase(),
    { fs: 8, fsMin: 6.5, bold: true, cor: cheio ? c.brandAccent : c.textBody, fonte: DS.typography.titles, cortar: true });
  const temSub = !!k.sub;
  _tvTexto_(slide, x + 8, y + 20, w - 12, h - (temSub ? 38 : 24), String(k.valor),
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
    _tvTexto_(slide, x + 8, y + h - 20, w - 12, 15, k.sub,
      { fs: 8.5, fsMin: 6.5, bold: !!k.corSub, cor: corSub, fonte: DS.typography.body, cortar: true });
  }
}

/**
 * Painel: cartão branco arredondado com barra lateral na cor de destaque da
 * marca e rótulo em caixa alta. Devolve o y onde o conteúdo começa.
 */
function _tvCard_(slide, x, y, w, h, rotulo) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  _tvRet_(slide, x, y, w, h, c.cardBg, { redondo: true, borda: c.lines });
  _tvRet_(slide, x, y + 8, 4, h - 16, c.brandLight);
  if (!rotulo) return y + 10;
  _tvTexto_(slide, x + 10, y + 6, w - 20, 18, String(rotulo).toUpperCase(),
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
function _tvFotoEmBloco_(slide, fotoId, x, y, w, h, foco, fundo) {
  if (!fotoId) return false;
  try {
    const img = slide.insertImage(_tvFotoReduzida_(fotoId));
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
      if (x1 - x0 > 0.5 && y1 - y0 > 0.5) _tvRet_(slide, x0, y0, x1 - x0, y1 - y0, fundo);
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
function _tvFotoReduzida_(id) {
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
function _tvVeu_(slide, x, y, w, h, cor, aDe, aAte, passos) {
  const n = passos || 20;
  const alvo = j => aDe + (aAte - aDe) * (n === 1 ? 0 : j / (n - 1));
  let transDepois = 1;
  for (let j = n - 1; j >= 0; j--) {
    const trans = 1 - Math.max(0, Math.min(1, alvo(j)));
    const a = transDepois > 0 ? 1 - trans / transDepois : 0;
    transDepois = trans;
    if (a < 0.004) continue;
    _tvRet_(slide, x, y, w * (j + 1) / n, h, cor, { alpha: a });
  }
}

// Logo num chip branco (contraste sobre a foto). Devolve a largura usada.
function _tvLogoChip_(slide, id, x, y, maxW, maxH) {
  if (!id) return 0;
  try {
    const img = slide.insertImage(DriveApp.getFileById(id).getBlob());
    const ar = img.getWidth() / img.getHeight();
    let w = maxW, h = maxW / ar;
    if (h > maxH) { h = maxH; w = maxH * ar; }
    const pad = 9;
    _tvRet_(slide, x, y, w + 2 * pad, maxH + 2 * pad, '#FFFFFF', { redondo: true, alpha: 0.95 });
    img.setWidth(w).setHeight(h).setLeft(x + pad).setTop(y + pad + (maxH - h) / 2);
    img.bringToFront();
    return w + 2 * pad;
  } catch (e) {
    Logger.log('Capa: logo indisponível (' + id + '): ' + e.message);
    return 0;
  }
}


// Rodapé discreto com a fonte do dado.
function _tvRodape_(slide, texto) {
  const DS = CR_DESIGN_SYSTEM;
  _tvTexto_(slide, 30, 384, 660, 16, texto,
    { fs: 7.5, fsMin: 6, cor: DS.colors.textMuted, fonte: DS.typography.body, cortar: true });
}

// "▲ +6" / "▼ −3" / "— 0" com a cor certa. maiorRuim = subir é ruim (fila).
function _tvVariacao_(diff, maiorRuim) {
  const c = CR_DESIGN_SYSTEM.colors;
  if (!diff) return { txt: '— 0', cor: c.textBody };
  const sobe = diff > 0;
  const ruim = maiorRuim ? sobe : !sobe;
  return { txt: (sobe ? '▲ +' : '▼ −') + Math.abs(diff), cor: ruim ? c.accentRed : c.accentGreen };
}
