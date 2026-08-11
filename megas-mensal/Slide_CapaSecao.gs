/**
 * ARQUIVO: Slide_CapaSecao.gs
 * COMPONENTE — CAPA DE SEÇÃO (divisória de assunto), versão premium
 *
 * Cada seção tem sua ESTÉTICA ÚNICA na FORMA (um "motivo" próprio que remete
 * ao tema — um ícone PNG da pasta do Drive quando existe, senão o desenho
 * nativo em shapes do Slides; ver Slide_IconesCapas.gs) e na FOTO de fundo —
 * mas a COR é uma só, padrão,
 * em todas: o azul #60A5FA, o mesmo destaque já usado na Capa e no
 * Encerramento. Antes cada categoria tinha uma cor diferente (verde,
 * laranja, vermelho...) e ficou com cara de "carnaval" — a marca não
 * autoriza essa variedade toda, então padronizamos:
 *   PREVENTIVA   → grade de plano (calendário)
 *   CORRETIVA    → alerta/exclamação (ação corretiva)
 *   CONTRATADOS  → anéis entrelaçados (parceria)
 *   INTERNOS     → skyline de barras (predial/time)
 *   COMPLEMENTOS → sinal de mais (itens extras, sem categoria própria)
 *   PATRIMONIAL  → cadeado (segurança)
 *   OPERACIONAL  → barras crescentes + seta (financeiro)
 *   UTILITIES    → medidor de energia
 *   SUSTENTAVEL  → anéis de crescimento + broto (ESG)
 *   DOCUMENTACAO → pilha de papéis (jurídico)
 *
 * Foto de fundo por CATEGORIA (FOTOS_SECAO em 01_Config.gs, chave passada
 * como 3º argumento). Sem foto → capaFotoId da cidade → fundo escuro premium.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

// Cor de acento ÚNICA para todas as categorias — o azul #60A5FA, mesmo
// destaque padrão da Capa e do Encerramento. Não varia por categoria (a
// diferenciação fica só na forma do motivo e na foto de fundo).
function _secAcento_(chave) {
  return '#60A5FA';
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
//
// GRADE ÓPTICA: todo motivo cabe num quadro de SEC_MOT_CAIXA pt centrado
// exatamente em (cx, cy). Sem isso o símbolo muda de tamanho e de posição de
// uma capa para a outra — era o caso: a largura ia de 56 a 116pt e a altura
// de 72 a 150pt, com Patrimonial ocupando 34% do espaço e Sustentável 139%.
// Passando os slides em sequência, o símbolo "pulava". O teste
// test-motivos-capa.js cobra caixa, centragem, ocupação e paleta.
const SEC_MOT_CAIXA = 104;        // lado do quadro
const SEC_MOT_MEIA  = 52;         // meia-caixa, atalho para centrar

// Escala única de opacidade e espessura — mantém o "peso" visual igual entre
// os motivos, que é o que faz eles parecerem da mesma família.
const SEC_MOT_A = { traco: 0.55, massa: 0.28, acento: 0.92, fantasma: 0.15 };
const SEC_MOT_W = { forte: 2.5, leve: 1.5 };

function _secDesenharMotivo_(chave, s, cx, cy, cor) {
  // Ícone da pasta do Drive tem precedência, quando existe (ver
  // Slide_IconesCapas.gs). Sem pasta configurada isso sai na primeira linha
  // sem nenhuma chamada de rede, e o desenho nativo abaixo continua sendo o
  // padrão — ele é vetorial e nunca depende de arquivo externo.
  if (_secIconeCapa_(s, cx, cy, chave)) return;

  switch (chave) {
    case 'PREVENTIVA':   return _secMotPreventiva_(s, cx, cy, cor);
    case 'CORRETIVA':    return _secMotCorretiva_(s, cx, cy, cor);
    case 'CONTRATADOS':  return _secMotContratados_(s, cx, cy, cor);
    case 'INTERNOS':     return _secMotInternos_(s, cx, cy, cor);
    case 'COMPLEMENTOS': return _secMotComplementos_(s, cx, cy, cor);
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
// 3 células de 28 + 2 vãos de 10 = 104: preenche a caixa exatamente.
function _secMotPreventiva_(s, cx, cy, cor) {
  const cell = 28, gap = 10, n = 3;
  const x0 = cx - SEC_MOT_MEIA, y0 = cy - SEC_MOT_MEIA;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const sq = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
      x0 + c * (cell + gap), y0 + r * (cell + gap), cell, cell);
    if (r === 1 && c === 1) {
      sq.getFill().setSolidFill(cor, SEC_MOT_A.acento); sq.getBorder().setTransparent();
    } else {
      sq.getFill().setTransparent();
      sq.getBorder().getLineFill().setSolidFill('#FFFFFF', SEC_MOT_A.traco);
      sq.getBorder().setWeight(SEC_MOT_W.leve);
    }
  }
}

// CORRETIVA — sinal de alerta (triângulo + exclamação): ação corretiva
// nasce de um problema identificado — símbolo universal, direto ao ponto.
function _secMotCorretiva_(s, cx, cy, cor) {
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE,
    cx - SEC_MOT_MEIA, cy - 48, SEC_MOT_CAIXA, 96);
  tri.getFill().setTransparent();
  tri.getBorder().getLineFill().setSolidFill('#FFFFFF', SEC_MOT_A.traco);
  tri.getBorder().setWeight(SEC_MOT_W.forte);

  // Exclamação na metade de baixo, onde o triângulo tem largura para ela.
  _secRet_(s, cx - 4.5, cy - 8, 9, 30, cor, SEC_MOT_A.acento, true);
  const dot = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 5.5, cy + 30, 11, 11);
  dot.getFill().setSolidFill(cor, SEC_MOT_A.acento); dot.getBorder().setTransparent();
}

// CONTRATADOS — dois anéis entrelaçados (parceria/contrato), um em destaque.
function _secMotContratados_(s, cx, cy, cor) {
  const d = 76, sobra = SEC_MOT_CAIXA - d;          // 28 de deslocamento entre eles
  _capaAnel_(s, cx - SEC_MOT_MEIA, cy - d / 2, d, '#FFFFFF', SEC_MOT_W.forte, SEC_MOT_A.traco);
  _capaAnel_(s, cx - SEC_MOT_MEIA + sobra, cy - d / 2, d, cor, SEC_MOT_W.forte, SEC_MOT_A.acento);
}

// INTERNOS — skyline de barras (predial/time), uma barra em destaque.
// 5 barras de 16 + 4 vãos de 6 = 104; a régua da base tem a mesma largura,
// para o conjunto não ultrapassar a caixa.
function _secMotInternos_(s, cx, cy, cor) {
  const alt = [44, 72, 58, 88, 52], bw = 16, gap = 6;
  const x0 = cx - SEC_MOT_MEIA, base = cy + 43;
  alt.forEach((hh, i) => {
    const dest = (i === 3);
    _secRet_(s, x0 + i * (bw + gap), base - hh, bw, hh,
      dest ? cor : '#FFFFFF', dest ? SEC_MOT_A.acento : SEC_MOT_A.massa, true);
  });
  _secRet_(s, x0, base, SEC_MOT_CAIXA, 2, '#FFFFFF', SEC_MOT_A.traco, false);
}

// COMPLEMENTOS — sinal de mais: serviços extras que não têm categoria
// própria (nem Contratados, nem Internos) — "+" é o símbolo mais direto pra
// "itens adicionais", sem forçar um objeto literal que nem sempre existe.
// A barra vertical (destaque) cruza a horizontal (branca) formando o "+".
function _secMotComplementos_(s, cx, cy, cor) {
  const esp = 20;
  _secRet_(s, cx - SEC_MOT_MEIA, cy - esp / 2, SEC_MOT_CAIXA, esp, '#FFFFFF', SEC_MOT_A.traco, true);
  _secRet_(s, cx - esp / 2, cy - SEC_MOT_MEIA, esp, SEC_MOT_CAIXA, cor, SEC_MOT_A.acento, true);
}

// PATRIMONIAL — cadeado (segurança), miolo (fechadura) em destaque.
// Estava ocupando 34% da caixa — o menor de todos, sumia ao lado dos outros.
function _secMotPatrimonial_(s, cx, cy, cor) {
  _capaAnel_(s, cx - 28, cy - 52, 56, '#FFFFFF', 3, SEC_MOT_A.traco);   // arco/shackle
  const body = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx - 40, cy - 12, 80, 56);
  body.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark, 0.55);  // cobre a base do arco
  body.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.6);
  body.getBorder().setWeight(SEC_MOT_W.forte);
  const kh = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 8, cy + 4, 16, 16);
  kh.getFill().setSolidFill(cor, SEC_MOT_A.acento); kh.getBorder().setTransparent();
  _secRet_(s, cx - 3, cy + 16, 6, 16, cor, SEC_MOT_A.acento, false);
}

// OPERACIONAL — barras crescentes coroadas por uma seta (resultado que sobe).
// A seta agora remata a barra mais alta em vez de flutuar acima dela, que era
// o que puxava o desenho 11pt para cima da âncora.
function _secMotOperacional_(s, cx, cy, cor) {
  const alt = [34, 48, 60, 70], bw = 18, gap = 10;
  const span = alt.length * bw + (alt.length - 1) * gap;   // 102
  const x0 = cx - span / 2, base = cy + 45;
  alt.forEach((hh, i) => {
    const last = (i === alt.length - 1);
    _secRet_(s, x0 + i * (bw + gap), base - hh, bw, hh,
      last ? cor : '#FFFFFF', last ? SEC_MOT_A.acento : SEC_MOT_A.massa, true);
  });
  const topo = base - alt[alt.length - 1];                 // topo da 4ª barra
  const cxUlt = x0 + 3 * (bw + gap) + bw / 2;
  // Seta com a MESMA largura da barra: remata em cima dela sem transbordar
  // a caixa (com 26 de largura ela sobrava 4pt à direita).
  const tri = s.insertShape(SlidesApp.ShapeType.TRIANGLE, cxUlt - bw / 2, topo - 18, bw, 18);
  tri.getFill().setSolidFill(cor, SEC_MOT_A.acento); tri.getBorder().setTransparent();
  _secRet_(s, x0, base, span, 2, '#FFFFFF', SEC_MOT_A.traco, false);
}

// UTILITIES — medidor (mostrador + escala + ponteiro), miolo em destaque.
//
// Três defeitos corrigidos aqui:
//  1. a escala calculava dois pontos (raio interno e externo) como se fosse
//     desenhar um traço radial, mas inseria um quadrado de 2,5pt no canto —
//     os pontos externos eram código morto e a escala saía como sujeirinha;
//  2. o ponteiro era um retângulo com setRotation, que gira em torno do
//     PRÓPRIO centro: como o retângulo nascia com a base no eixo, ele girava
//     deslocado e não saía do miolo;
//  3. o comentário falava em "semicírculo por anel + máscara", mas máscara
//     nenhuma era desenhada — sempre foi um círculo inteiro.
//
// A escala virou pontos sobre a circunferência (sem rotação, sem risco de
// convenção de sinal) e o ponteiro é centrado no MEIO do próprio traço, que
// é a posição em que girar pelo centro dá o resultado certo.
function _secMotUtilities_(s, cx, cy, cor) {
  const R = 48;
  _capaAnel_(s, cx - R, cy - R, R * 2, '#FFFFFF', SEC_MOT_W.forte, SEC_MOT_A.traco);

  // Escala: 7 pontos varrendo o arco de cima, de 210° a -30°.
  const rEsc = R - 9;
  for (let i = 0; i <= 6; i++) {
    const a = (210 - i * 40) * Math.PI / 180;
    const px = cx + Math.cos(a) * rEsc, py = cy - Math.sin(a) * rEsc;
    const p = s.insertShape(SlidesApp.ShapeType.ELLIPSE, px - 2.5, py - 2.5, 5, 5);
    p.getFill().setSolidFill('#FFFFFF', 0.65); p.getBorder().setTransparent();
  }

  // Ponteiro: comprimento L, apontando GRAU graus no sentido horário a partir
  // da vertical. O retângulo é centrado no meio do traço, então setRotation
  // (que gira pelo centro do shape) leva a ponta ao lugar certo.
  const L = 38, GRAU = 40, rad = GRAU * Math.PI / 180;
  const mx = cx + Math.sin(rad) * L / 2, my = cy - Math.cos(rad) * L / 2;
  const ag = s.insertShape(SlidesApp.ShapeType.RECTANGLE, mx - 2, my - L / 2, 4, L);
  ag.getFill().setSolidFill(cor, SEC_MOT_A.acento); ag.getBorder().setTransparent();
  ag.setRotation(GRAU);

  const eixo = s.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 9, cy - 9, 18, 18);
  eixo.getFill().setSolidFill(cor, SEC_MOT_A.acento); eixo.getBorder().setTransparent();
}

// SUSTENTAVEL — anéis concêntricos (ciclo) + broto no topo.
// Estava com 150pt de altura, o dobro do menor motivo, porque o broto subia
// muito acima dos anéis. Agora o conjunto inteiro cabe na caixa.
function _secMotSustentavel_(s, cx, cy, cor) {
  const cyA = cy + 6;   // anéis um pouco abaixo, abrindo espaço pro broto
  _capaAnel_(s, cx - 44, cyA - 44, 88, '#FFFFFF', SEC_MOT_W.leve, SEC_MOT_A.fantasma);
  _capaAnel_(s, cx - 31, cyA - 31, 62, '#FFFFFF', SEC_MOT_W.leve, SEC_MOT_A.massa);
  _capaAnel_(s, cx - 17, cyA - 17, 34, cor, 2, SEC_MOT_A.acento);

  const caule = s.insertShape(SlidesApp.ShapeType.RECTANGLE, cx - 2, cy - 42, 4, 20);
  caule.getFill().setSolidFill(cor, 0.85); caule.getBorder().setTransparent();
  const f1 = s.insertShape(SlidesApp.ShapeType.TRIANGLE, cx - 19, cy - 52, 19, 17);
  f1.getFill().setSolidFill(cor, 0.85); f1.getBorder().setTransparent(); f1.setRotation(-25);
  const f2 = s.insertShape(SlidesApp.ShapeType.TRIANGLE, cx, cy - 52, 19, 17);
  f2.getFill().setSolidFill(cor, 0.85); f2.getBorder().setTransparent(); f2.setRotation(25);
}

// DOCUMENTACAO — pilha de papéis (jurídico), faixa superior em destaque.
// A pilha é montada simétrica em torno da âncora (antes escorregava 5pt para
// a direita e 4 para baixo, porque as folhas de trás só cresciam num sentido).
function _secMotDocumentacao_(s, cx, cy, cor) {
  const fw = 68, fh = 90, desl = 7;
  const x0 = cx - (fw + 2 * desl) / 2, y0 = cy - (fh + 2 * desl) / 2;
  _secRet_(s, x0 + 2 * desl, y0 + 2 * desl, fw, fh, '#FFFFFF', SEC_MOT_A.massa, true);
  _secRet_(s, x0 + desl,     y0 + desl,     fw, fh, '#FFFFFF', 0.42, true);
  _secRet_(s, x0,            y0,            fw, fh, '#FFFFFF', 0.92, true);
  _secRet_(s, x0, y0, fw, 11, cor, SEC_MOT_A.acento, false);
  // Linhas de texto: tom do design system em vez do #94A3B8 solto que estava
  // aqui — era a única cor do deck fora da paleta.
  for (let i = 0; i < 4; i++) {
    _secRet_(s, x0 + 10, y0 + 30 + i * 14, i === 3 ? 28 : 48, 3,
      CR_DESIGN_SYSTEM.colors.brandMed, 0.35, false);
  }
}
