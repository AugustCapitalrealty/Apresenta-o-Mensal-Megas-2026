/**
 * ARQUIVO: 03_Desenho.gs
 * DESENHO — primitivas e componentes (cabeçalho, card, pílula, tabela).
 * Mesmo visual de megas-mensal / propriedades-mensal (criarHeaderPadrao,
 * criarCardPainel). Tabelas em formas (retângulo + caixa de texto), não
 * insertTable: a API do Slides falha com "object has no text" em tabela
 * grande (visto no financeiro-mensal).
 */

const PG_W = 720, PG_H = 405;   // página 16:9 do Slides, em pt

// Retângulo. o = { alpha, borda, peso, forma }
function _pgRet_(s, x, y, w, h, cor, o) {
  o = o || {};
  const sh = s.insertShape(o.forma || SlidesApp.ShapeType.RECTANGLE, x, y, Math.max(w, 0.5), Math.max(h, 0.5));
  if (cor) sh.getFill().setSolidFill(cor, o.alpha == null ? 1 : o.alpha); else sh.getFill().setTransparent();
  if (o.borda) { sh.getBorder().getLineFill().setSolidFill(o.borda); sh.getBorder().setWeight(o.peso || 0.75); }
  else sh.getBorder().setTransparent();
  return sh;
}

/**
 * Caixa de texto. o = { fs, negrito, italico, cor, fonte, align: 'L'|'C'|'R', topo }
 * O Slides põe ~7pt de recuo interno de cada lado (não dá para desligar): em
 * caixa estreita a linha quebra mesmo sobrando espaço visual. Por isso as
 * colunas das tabelas têm folga e os números usam fonte menor.
 */
function _pgTxt_(s, texto, x, y, w, h, o) {
  o = o || {};
  const t = String(texto == null ? '' : texto);
  if (t === '') return null;
  const tb = s.insertTextBox(t, x, y, w, h);
  const tr = tb.getText();
  const st = tr.getTextStyle();
  st.setFontFamily(o.fonte || CR_DESIGN_SYSTEM.corpo).setFontSize(o.fs || 10)
    .setBold(!!o.negrito).setItalic(!!o.italico).setForegroundColor(o.cor || CR_DESIGN_SYSTEM.textMain);
  const al = o.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
           : o.align === 'R' ? SlidesApp.ParagraphAlignment.END : SlidesApp.ParagraphAlignment.START;
  tr.getParagraphStyle().setParagraphAlignment(al).setSpaceAbove(0).setSpaceBelow(0);
  tb.setContentAlignment(o.topo ? SlidesApp.ContentAlignment.TOP : SlidesApp.ContentAlignment.MIDDLE);
  return tb;
}

function _pgLinha_(s, x1, y1, x2, y2, cor, peso) {
  const l = s.insertLine(SlidesApp.LineCategory.STRAIGHT, x1, y1, x2, y2);
  l.getLineFill().setSolidFill(cor);
  l.setWeight(peso || 1);
  return l;
}

// Pílula de status (rótulo curto em fundo claro).
function _pgPill_(s, x, y, w, h, st, fs) {
  _pgRet_(s, x, y, w, h, st.fundo, { forma: SlidesApp.ShapeType.ROUND_RECTANGLE });
  _pgTxt_(s, st.rotulo, x - 6, y, w + 12, h, { fs: fs || 6.5, negrito: true, cor: st.texto, align: 'C' });
}

// Logo com a proporção real do arquivo, pela ALTURA. Falha no Drive não derruba o slide.
const _pgLogoCache_ = {};
function _pgLogo_(s, id, x, y, h, alinharDireita) {
  try {
    if (!_pgLogoCache_[id]) _pgLogoCache_[id] = DriveApp.getFileById(id).getBlob();
    const img = s.insertImage(_pgLogoCache_[id]);
    const r = img.getWidth() / img.getHeight();
    const w = h * (r > 0 && isFinite(r) ? r : 3.5);
    img.setWidth(w).setHeight(h).setLeft(alinharDireita ? x - w : x).setTop(y);
    return img;
  } catch (e) {
    Logger.log('⚠ Logo não carregado (' + id + '): ' + e.message);
    return null;
  }
}

/**
 * Cabeçalho padrão dos slides claros (= criarHeaderPadrao de propriedades-mensal):
 * elipse suave, barra azul, título, subtítulo, logo à direita, linha separadora.
 */
function _pgHeader_(s, titulo, subtitulo) {
  const DS = CR_DESIGN_SYSTEM, mX = DS.marginX;
  s.getBackground().setSolidFill(DS.bgSlide);
  _pgRet_(s, PG_W - 350, -80, 450, 450, DS.brandLight, { alpha: 0.03, forma: SlidesApp.ShapeType.ELLIPSE });
  _pgRet_(s, mX, 13, 5, 36, DS.brandLight);
  // Título numa linha só: encolhe a fonte quando o texto é longo (Montserrat
  // bold maiúscula ≈ 0,72 × corpo por caractere; caixa útil ≈ 480pt).
  const fsT = Math.max(12, Math.min(19, Math.floor(480 / (String(titulo).length * 0.72))));
  _pgTxt_(s, titulo, mX + 10, 7, PG_W - mX - 190, 28, { fs: fsT, negrito: true, fonte: DS.titulos });
  if (subtitulo) _pgTxt_(s, subtitulo, mX + 10, 34, PG_W - mX - 190, 18, { fs: 9.5, cor: DS.textBody });
  _pgLogo_(s, PG_LOGO_COR_ID, PG_W - mX, 16, DS.logoH, true);
  _pgLinha_(s, 0, 62, PG_W, 62, DS.lines, 1);
  _pgLinha_(s, mX, 62, mX + 110, 62, DS.brandLight, 3);
}

// Rodapé de fonte/observação (esquerda, cinza).
function _pgRodape_(s, texto) {
  _pgTxt_(s, texto, CR_DESIGN_SYSTEM.marginX - 4, PG_H - 18, PG_W - 2 * CR_DESIGN_SYSTEM.marginX + 8, 14,
    { fs: 7, cor: CR_DESIGN_SYSTEM.textMuted });
}

// Card branco com barra lateral e título. Devolve o Y onde o conteúdo começa.
function _pgCard_(s, x, y, w, h, titulo, cor) {
  const DS = CR_DESIGN_SYSTEM;
  _pgRet_(s, x, y, w, h, DS.card, { borda: DS.lines, peso: 0.75 });
  _pgRet_(s, x, y, 4, h, cor || DS.brandMed);
  if (!titulo) return y + 10;
  _pgTxt_(s, titulo, x + 8, y + 4, w - 16, 18, { fs: 9, negrito: true, fonte: DS.titulos, cor: DS.brandMed });
  _pgLinha_(s, x + 12, y + 24, x + w - 12, y + 24, DS.lines, 0.75);
  return y + 30;
}

/**
 * Tabela em formas.
 *   cols  = [{ w, align: 'L'|'C'|'R' }]
 *   linhas = [{ tipo: 'cab'|'grupo'|'item'|'tot'|'sub', cel: [texto...], cores: [cor|null...],
 *               italico: [bool...], fs }]
 * Uma faixa de fundo por linha (não por célula) — menos formas, deck mais leve.
 */
function _pgTabela_(s, x, y, cols, linhas, alt, fsBase) {
  const DS = CR_DESIGN_SYSTEM;
  const W = cols.reduce((a, c) => a + c.w, 0);
  const estilo = {
    cab:   { fundo: DS.brandDark, cor: '#FFFFFF', negrito: true, fonte: DS.titulos },
    sub:   { fundo: DS.brandMed, cor: '#FFFFFF', negrito: true, fonte: DS.titulos },
    grupo: { fundo: DS.azulClaro, cor: DS.brandMed, negrito: true },
    item:  { fundo: null, cor: DS.textMain, negrito: false },
    tot:   { fundo: DS.brandDark, cor: '#FFFFFF', negrito: true, fonte: DS.titulos }
  };
  let yy = y;
  linhas.forEach(l => {
    const e = estilo[l.tipo] || estilo.item;
    const h = l.alt || alt;
    if (e.fundo) _pgRet_(s, x, yy, W, h, e.fundo);
    else _pgLinha_(s, x, yy + h, x + W, yy + h, DS.lines, 0.5);
    let xx = x;
    cols.forEach((c, j) => {
      const txt = l.cel[j];
      if (txt != null && txt !== '') {
        // folga de 5pt para cada lado: o recuo interno não come a coluna estreita
        _pgTxt_(s, txt, xx - 5, yy, c.w + 10, h, {
          fs: l.fs || fsBase || 8, negrito: e.negrito, fonte: e.fonte,
          cor: (l.cores && l.cores[j]) || e.cor, align: (l.align && l.align[j]) || c.align || 'L',
          italico: !!(l.italico && l.italico[j])
        });
      }
      xx += c.w;
    });
    yy += h;
  });
  return yy;
}

// Slide que avisa a falha NO deck (não fica vazio em silêncio). Só usa insertShape + cores.
function _pgSlideFalha_(s, nome, erro) {
  s.getBackground().setSolidFill('#FFF7ED');
  _pgRet_(s, 40, 120, PG_W - 80, 160, '#FFFFFF', { borda: '#EF4444', peso: 1.5 });
  _pgTxt_(s, '⚠ SLIDE NÃO FOI GERADO: ' + nome, 56, 132, PG_W - 112, 30, { fs: 16, negrito: true, cor: '#9B1C1C' });
  _pgTxt_(s, String(erro && erro.message || erro), 56, 168, PG_W - 112, 100, { fs: 10, cor: '#46516B', topo: true });
}

// Formatação ---------------------------------------------------------------

// R$ → "R$ mil" com 1 casa ("15,9"). null → "—".
function _pgMil_(v) {
  if (v == null || isNaN(v)) return '—';
  const r = Math.round(v / 100) / 10;
  if (r === 0) return '0,0';
  const neg = r < 0;
  const s = Math.abs(r).toFixed(1).split('.');
  return (neg ? '−' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}

// R$ inteiro com milhar ("R$ 8.755").
function _pgReais_(v) {
  if (v == null || isNaN(v)) return '—';
  const neg = v < 0;
  return (neg ? '−' : '') + 'R$ ' + String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Variação real × ritmo de DESPESA. Devolve { txt, cor }.
// Ritmo zero com gasto → "s/ ritmo" (não existe % de zero).
function _pgVar_(real, ritmo) {
  const DS = CR_DESIGN_SYSTEM;
  if (Math.abs(ritmo) < 0.5) {
    if (Math.abs(real) < 0.5) return { txt: '—', cor: DS.textMuted };
    return { txt: 's/ ritmo', cor: real > 0 ? DS.pior : DS.melhor };
  }
  const p = (real - ritmo) / Math.abs(ritmo) * 100;
  const r = Math.round(p);
  const txt = (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%';
  return { txt: txt, cor: r > 0 ? DS.pior : r < 0 ? DS.melhor : DS.textBody };
}
