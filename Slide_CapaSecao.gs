/**
 * ARQUIVO: Slide_CapaSecao.gs
 * COMPONENTE — CAPA DE SEÇÃO (divisória de assunto), versão premium
 *
 * Cada seção tem sua ESTÉTICA ÚNICA: além da foto de fundo + véu azul, um
 * "motivo" geométrico próprio que remete ao tema (formas desenhadas só com
 * shapes nativos do Slides — nada de ícone externo) e uma cor de acento.
 * As cores de acento vêm TODAS do design system (CR_DESIGN_SYSTEM em
 * 01_Config.gs) — nada de tom fora da paleta oficial:
 *   PREVENTIVA   → grade de plano (calendário)        · accentGreen
 *   CORRETIVA    → alerta/exclamação (ação corretiva) · accentOrange
 *   CONTRATADOS  → anéis entrelaçados (parceria)       · brandLight
 *   INTERNOS     → skyline de barras (predial/time)    · brandSoft
 *   PATRIMONIAL  → cadeado (segurança)                 · accentRed
 *   OPERACIONAL  → barras crescentes + seta (fin.)     · azul-destaque (#60A5FA, já usado em toda a capa)
 *   UTILITIES    → medidor/bateria (energia)           · brandMed
 *   SUSTENTAVEL  → anéis de crescimento + broto (ESG)  · accentGreen
 *   DOCUMENTACAO → pilha de papéis (jurídico)           · brandSoft
 *
 * Foto de fundo por CATEGORIA (FOTOS_SECAO em 01_Config.gs, chave passada
 * como 3º argumento). Sem foto → capaFotoId da cidade → fundo escuro premium.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

// Cor de acento por categoria — só cores do CR_DESIGN_SYSTEM (mais o azul
// #60A5FA, que já é o destaque padrão usado em toda a Capa/Encerramento).
// Categoria sem entrada cai nesse mesmo azul.
function _secAcento_(chave) {
  const DS = CR_DESIGN_SYSTEM.colors;
  const MAPA = {
    PREVENTIVA:   DS.accentGreen,
    CORRETIVA:    DS.accentOrange,
    CONTRATADOS:  DS.brandLight,
    INTERNOS:     DS.brandSoft,
    PATRIMONIAL:  DS.accentRed,
    OPERACIONAL:  '#60A5FA',
    UTILITIES:    DS.brandMed,
    SUSTENTAVEL:  DS.accentGreen,
    DOCUMENTACAO: DS.brandSoft
  };
  return MAPA[chave] || '#60A5FA';
}

function gerarCapaSecao(linha1, linha2, chave) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;

  const k = String(chave || linha2 || '').toUpperCase();
  const acento = _secAcento_(k);
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
    case 'SUSTENTAVEL':  return _secMotSustentavel_(s, cx, cy, cor);
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

// CORRETIVA — sinal de alerta (triângulo + exclamação): ação corretiva
// nasce de um problema identificado — símbolo universal, direto ao ponto.
function _secMotCorretiva_(s, cx, cy, cor) {
  const w = 104, h = 92;
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE, cx - w / 2, cy - h / 2, w, h);
  tri.getFill().setTransparent();
  tri.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.55); tri.getBorder().setWeight(2.5);

  const bar = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx - 4, cy - 8, 8, 26);
  bar.getFill().setSolidFill(cor, 0.92); bar.getBorder().setTransparent();
  const dot = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 5, cy + 24, 10, 10);
  dot.getFill().setSolidFill(cor, 0.92); dot.getBorder().setTransparent();
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
  body.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark, 0.55);   // cobre a base do arco
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

// UTILITIES — medidor de energia (corpo + agulha + escala), miolo em
// destaque. Substitui o sol/raios anterior (não aprovado).
function _secMotUtilities_(s, cx, cy, cor) {
  const R = 46;
  // Corpo do medidor (semicírculo aproximado por anel + máscara)
  _capaAnel_(s, cx - R, cy - R, R * 2, '#FFFFFF', 2.5, 0.5);
  // Escala: tracinhos ao redor do arco superior
  for (let i = 0; i <= 6; i++) {
    const a = (200 - i * 40) * Math.PI / 180;   // varre ~200° a -40°
    const x1 = cx + Math.cos(a) * (R - 10), y1 = cy - Math.sin(a) * (R - 10);
    const x2 = cx + Math.cos(a) * (R - 2),  y2 = cy - Math.sin(a) * (R - 2);
    const tick = s.insertShape(SlidesApp.ShapeType.RECTANGLE, Math.min(x1, x2), Math.min(y1, y2), 2.5, 2.5);
    tick.getFill().setSolidFill('#FFFFFF', 0.6); tick.getBorder().setTransparent();
  }
  // Agulha apontando para cima-direita (consumo alto) na cor de acento
  const agulha = s.insertShape(SlidesApp.ShapeType.RECTANGLE, cx - 1.5, cy - R * 0.68, 3, R * 0.68);
  agulha.getFill().setSolidFill(cor, 0.95); agulha.getBorder().setTransparent();
  agulha.setRotation(35);
  const eixo = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 8, cy - 8, 16, 16);
  eixo.getFill().setSolidFill(cor, 0.95); eixo.getBorder().setTransparent();
  // Base do medidor
  _secRet_(s, cx - 34, cy + 4, 68, 8, '#FFFFFF', 0.5, true);
}

// SUSTENTAVEL — anéis de crescimento (troncos) + broto no topo: gestão
// sustentável / ESG, sem depender de sol/energia literal.
function _secMotSustentavel_(s, cx, cy, cor) {
  _capaAnel_(s, cx - 58, cy - 46, 116, '#FFFFFF', 1.25, 0.14);
  _capaAnel_(s, cx - 40, cy - 28, 80,  '#FFFFFF', 1.25, 0.28);
  _capaAnel_(s, cx - 20, cy - 8,  40,  cor, 1.75, 0.9);

  const caule = s.insertShape(SlidesApp.ShapeType.RECTANGLE, cx - 2, cy - 66, 4, 22);
  caule.getFill().setSolidFill(cor, 0.85); caule.getBorder().setTransparent();
  const f1 = s.insertShape(SlidesApp.ShapeType.TRIANGLE, cx - 20, cy - 80, 20, 18);
  f1.getFill().setSolidFill(cor, 0.85); f1.getBorder().setTransparent(); f1.setRotation(-25);
  const f2 = s.insertShape(SlidesApp.ShapeType.TRIANGLE, cx,      cy - 80, 20, 18);
  f2.getFill().setSolidFill(cor, 0.85); f2.getBorder().setTransparent(); f2.setRotation(25);
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
