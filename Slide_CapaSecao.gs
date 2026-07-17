/**
 * ARQUIVO: Slide_CapaSecao.gs
 * COMPONENTE — CAPA DE SEÇÃO (divisória de assunto), versão premium
 *
 * Cada seção tem sua ESTÉTICA ÚNICA: além da foto de fundo + véu azul, um
 * "motivo" geométrico próprio que remete ao tema (formas desenhadas só com
 * shapes nativos do Slides — nada de ícone externo) e uma cor de acento
 * específica:
 *   PREVENTIVA   → grade de plano (calendário)     · verde
 *   CORRETIVA    → diamante + barra (reparo/chave)  · laranja
 *   CONTRATADOS  → anéis entrelaçados (parceria)    · azul
 *   INTERNOS     → skyline de barras (predial/time) · azul-céu
 *   PATRIMONIAL  → cadeado (segurança)              · índigo
 *   OPERACIONAL  → barras crescentes + seta (fin.)  · dourado
 *   UTILITIES    → sol com raios (energia)          · âmbar
 *   DOCUMENTACAO → pilha de papéis (jurídico)       · violeta
 *
 * Foto de fundo por CATEGORIA (FOTOS_SECAO em 01_Config.gs, chave passada
 * como 3º argumento). Sem foto → capaFotoId da cidade → fundo escuro premium.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

// Cor de acento por categoria (usada no motivo, na 2ª linha do título e na
// sublinha). Categoria sem entrada cai no azul-claro padrão da marca.
const SEC_ACENTO = {
  PREVENTIVA:   '#4ADE80',
  CORRETIVA:    '#FB923C',
  CONTRATADOS:  '#60A5FA',
  INTERNOS:     '#38BDF8',
  PATRIMONIAL:  '#818CF8',
  OPERACIONAL:  '#FCD34D',
  UTILITIES:    '#FBBF24',
  DOCUMENTACAO: '#A78BFA'
};

function gerarCapaSecao(linha1, linha2, chave) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;

  const k = String(chave || linha2 || '').toUpperCase();
  const acento = SEC_ACENTO[k] || '#60A5FA';
  const fotoId = (typeof FOTOS_SECAO !== 'undefined' && FOTOS_SECAO[k]) || projeto.capaFotoId;

  // ── Fundo: foto da categoria (+ véu/scrim) ou fundo escuro premium ────────
  let comFoto = false;
  if (fotoId) comFoto = _capaFotoFundo_(slide, W, H, fotoId, { cor: DS.colors.brandDark, alpha: 0.5 });
  if (comFoto) {
    _capaGradiente_(slide, 0, 0, W * 0.62, H, DS.colors.brandDark, DS.colors.brandDark,
      { alphaFrom: 0.55, alphaTo: 0.0, steps: 22 });
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  } else {
    slide.getBackground().setSolidFill(DS.colors.brandDark);
    const massa = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -220, H - 240, 500, 500);
    massa.getFill().setSolidFill(DS.colors.brandMed, 0.22); massa.getBorder().setTransparent();
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  }

  // ── Motivo geométrico único da categoria (lado direito) ───────────────────
  _secDesenharMotivo_(k, slide, W * 0.80, H * 0.36, acento);

  // ── Título em duas linhas: 1ª branca, 2ª na cor de acento da categoria ────
  const tY = H / 2 - 110;
  const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY, W - 120, 56);
  t1.getText().setText(linha1).getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);

  const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY + 50, W - 120, 56);
  t2.getText().setText(linha2).getTextStyle()
    .setFontSize(38).setBold(true).setForegroundColor(acento).setFontFamily(DS.typography.titles);

  // Sublinha curta na cor de acento
  const sub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 62, tY + 112, 55, 3);
  sub.getFill().setSolidFill(acento); sub.getBorder().setTransparent();

  // Subtítulo
  const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 58, tY + 126, W - 120, 30);
  st.getText().setText(projeto.nome + ' | Relatório Operacional').getTextStyle()
    .setFontSize(16).setForegroundColor('#CBD5E1').setFontFamily(DS.typography.body);

  // Wordmark Capital Realty no rodapé esquerdo
  _capaWordmark_(slide, 58, H - 58, { h: 30 });

  Logger.log('Capa de seção: ' + linha1 + ' ' + linha2 + ' [' + k + ']' + (comFoto ? ' (foto)' : ''));
}


// ==========================================
// MOTIVOS GEOMÉTRICOS POR CATEGORIA
// ==========================================
// Todos desenhados em torno de (cx, cy), predominância branca translúcida
// (lê sobre a foto) com UM realce na cor de acento. Só shapes nativos.

function _secDesenharMotivo_(chave, s, cx, cy, cor) {
  switch (chave) {
    case 'PREVENTIVA':   return _secMotPreventiva_(s, cx, cy, cor);
    case 'CORRETIVA':    return _secMotCorretiva_(s, cx, cy, cor);
    case 'CONTRATADOS':  return _secMotContratados_(s, cx, cy, cor);
    case 'INTERNOS':     return _secMotInternos_(s, cx, cy, cor);
    case 'PATRIMONIAL':  return _secMotPatrimonial_(s, cx, cy, cor);
    case 'OPERACIONAL':  return _secMotOperacional_(s, cx, cy, cor);
    case 'UTILITIES':    return _secMotUtilities_(s, cx, cy, cor);
    case 'DOCUMENTACAO': return _secMotDocumentacao_(s, cx, cy, cor);
    default:
      _capaAnel_(s, cx - 80, cy - 70, 150, '#FFFFFF', 1.25, 0.12);
      _capaAnel_(s, cx - 60, cy - 50, 110, '#FFFFFF', 1, 0.08);
  }
}

function _secRet_(s, x, y, w, h, cor, alpha, rounded) {
  const t = rounded ? SlidesApp.ShapeType.ROUND_RECTANGLE : SlidesApp.ShapeType.RECTANGLE;
  const r = s.insertShape(t, x, y, w, h);
  r.getFill().setSolidFill(cor, alpha); r.getBorder().setTransparent();
  return r;
}

// PREVENTIVA — grade 3×3 (plano/calendário), célula central em destaque.
function _secMotPreventiva_(s, cx, cy, cor) {
  const cell = 22, gap = 9, n = 3, span = n * cell + (n - 1) * gap;
  const x0 = cx - span / 2, y0 = cy - span / 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = x0 + c * (cell + gap), y = y0 + r * (cell + gap);
    const sq = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, cell, cell);
    if (r === 1 && c === 1) {
      sq.getFill().setSolidFill(cor, 0.9); sq.getBorder().setTransparent();
    } else {
      sq.getFill().setTransparent();
      sq.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.5); sq.getBorder().setWeight(1.5);
    }
  }
}

// CORRETIVA — diamante + barra diagonal (reparo/chave), núcleo em destaque.
function _secMotCorretiva_(s, cx, cy, cor) {
  const d = 90;
  const dia = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx - d / 2, cy - d / 2, d, d);
  dia.getFill().setTransparent();
  dia.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.5); dia.getBorder().setWeight(2);
  dia.setRotation(45);
  const bar = s.insertShape(SlidesApp.ShapeType.RECTANGLE, cx - 2.5, cy - d * 0.72 / 2, 5, d * 0.72);
  bar.getFill().setSolidFill('#FFFFFF', 0.4); bar.getBorder().setTransparent();
  bar.setRotation(45);
  const dot = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 9, cy - 9, 18, 18);
  dot.getFill().setSolidFill(cor, 0.9); dot.getBorder().setTransparent();
}

// CONTRATADOS — dois anéis entrelaçados (parceria/contrato), um em destaque.
function _secMotContratados_(s, cx, cy, cor) {
  _capaAnel_(s, cx - 56, cy - 36, 72, '#FFFFFF', 2.5, 0.5);
  _capaAnel_(s, cx - 16, cy - 36, 72, cor, 2.5, 0.85);
}

// INTERNOS — skyline de barras (predial/time), uma barra em destaque.
function _secMotInternos_(s, cx, cy, cor) {
  const alt = [38, 64, 50, 78, 44], bw = 14, gap = 8;
  const span = alt.length * bw + (alt.length - 1) * gap, x0 = cx - span / 2, base = cy + 42;
  alt.forEach((hh, i) => {
    const dest = (i === 3);
    _secRet_(s, x0 + i * (bw + gap), base - hh, bw, hh, dest ? cor : '#FFFFFF', dest ? 0.85 : 0.28, true);
  });
  _secRet_(s, x0 - 6, base, span + 12, 2, '#FFFFFF', 0.5, false);
}

// PATRIMONIAL — cadeado (segurança), miolo (fechadura) em destaque.
function _secMotPatrimonial_(s, cx, cy, cor) {
  _capaAnel_(s, cx - 20, cy - 42, 40, '#FFFFFF', 3, 0.5);   // arco/shackle
  const body = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx - 28, cy - 14, 56, 48);
  body.getFill().setSolidFill(DS_C().brandDark, 0.55);      // corpo semiopaco cobre a base do arco
  body.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.6); body.getBorder().setWeight(2.5);
  const kh = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 6, cy + 2, 12, 12);
  kh.getFill().setSolidFill(cor, 0.95); kh.getBorder().setTransparent();
  _secRet_(s, cx - 2, cy + 11, 4, 12, cor, 0.95, false);
}

// OPERACIONAL — barras crescentes + seta (resultado financeiro), topo em destaque.
function _secMotOperacional_(s, cx, cy, cor) {
  const alt = [30, 48, 66, 86], bw = 16, gap = 10;
  const span = alt.length * bw + (alt.length - 1) * gap, x0 = cx - span / 2, base = cy + 44;
  alt.forEach((hh, i) => {
    const last = (i === alt.length - 1);
    _secRet_(s, x0 + i * (bw + gap), base - hh, bw, hh, last ? cor : '#FFFFFF', last ? 0.85 : 0.3, true);
  });
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE, x0 + span - bw - 4, base - alt[3] - 26, 24, 22);
  tri.getFill().setSolidFill(cor, 0.9); tri.getBorder().setTransparent();
  _secRet_(s, x0 - 6, base, span + 12, 2, '#FFFFFF', 0.5, false);
}

// UTILITIES — sol com raios (energia), núcleo em destaque.
function _secMotUtilities_(s, cx, cy, cor) {
  const R = 52;
  for (let i = 0; i < 8; i++) {
    const a = i * 45 * Math.PI / 180;
    const ray = s.insertShape(SlidesApp.ShapeType.RECTANGLE,
      cx + Math.cos(a) * R - 9, cy + Math.sin(a) * R - 2, 18, 4);
    ray.getFill().setSolidFill('#FFFFFF', 0.5); ray.getBorder().setTransparent();
    ray.setRotation(i * 45);
  }
  _capaAnel_(s, cx - 26, cy - 26, 52, '#FFFFFF', 2.5, 0.55);
  const core = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 16, cy - 16, 32, 32);
  core.getFill().setSolidFill(cor, 0.85); core.getBorder().setTransparent();
}

// DOCUMENTACAO — pilha de papéis (jurídico), faixa superior em destaque.
function _secMotDocumentacao_(s, cx, cy, cor) {
  _secRet_(s, cx - 30 + 14, cy - 40 + 14, 56, 74, '#FFFFFF', 0.25, true);
  _secRet_(s, cx - 30 + 7,  cy - 40 + 7,  56, 74, '#FFFFFF', 0.4,  true);
  _secRet_(s, cx - 30, cy - 40, 56, 74, '#FFFFFF', 0.92, true);
  _secRet_(s, cx - 30, cy - 40, 56, 9, cor, 0.9, false);
  for (let i = 0; i < 4; i++) {
    _secRet_(s, cx - 22, cy - 18 + i * 12, i === 3 ? 24 : 40, 3, '#94A3B8', 0.9, false);
  }
}

// Atalho para o brandDark (usado no corpo do cadeado).
function DS_C() { return CR_DESIGN_SYSTEM.colors; }
