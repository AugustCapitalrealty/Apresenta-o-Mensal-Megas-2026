/**
 * ARQUIVO: 10_Slide_Capas.gs
 * SEÇÃO:   SLIDES — Capa de Abertura, Contra-Capa, Agenda e Capas de Seção
 * DESCRIÇÃO: Consolidação de todas as capas e divisores institucionais:
 *            Capa Hero de Abertura, Contra-Capa, Agenda e Capas de Seção
 *            temáticas com fotos de fundo, ícones e gradientes nativos.
 */

// ==========================================
// MOTOR VISUAL E COMPONENTES DE CAPA
// ==========================================
/**
 * ARQUIVO: Slide_CapasComuns.gs
 * COMPONENTES COMPARTILHADOS DAS CAPAS (Abertura, Contra Capa e Encerramento)
 *
 * Linguagem visual premium sobre fundo escuro institucional, 100% dentro do
 * design system Capital Realty (CR_DESIGN_SYSTEM em 01_Config.gs): mesmas
 * cores de marca, mesma tipografia (Montserrat/Open Sans). Sem gradientes
 * nativos (a API do Slides não suporta) — a sensação de profundidade e o
 * "brilho" vêm de camadas translúcidas + faixas de gradiente simuladas por
 * segmentos interpolados.
 *
 * IMPORTANTE: este arquivo é PRÉ-REQUISITO das três capas. Cole-o junto com
 * Slide00_Capa.gs, Slide_ContraCapa.gs e Slide12_Encerramento.gs.
 *
 * Sobre logos: nas capas o fundo é escuro. O logo da Capital Realty em imagem
 * é usado nos cabeçalhos sobre fundo CLARO — sobre o escuro ele pode não ler.
 * Por isso as capas usam o WORDMARK em texto branco (sempre visível) e um
 * pequeno mark geométrico da marca. O nome do Mega é o herói do co-branding.
 */

// Interpola dois hex (#RRGGBB) por t∈[0,1] → hex. Base do gradiente simulado.
function _capaHexLerp_(a, b, t) {
  const pa = [parseInt(a.substr(1, 2), 16), parseInt(a.substr(3, 2), 16), parseInt(a.substr(5, 2), 16)];
  const pb = [parseInt(b.substr(1, 2), 16), parseInt(b.substr(3, 2), 16), parseInt(b.substr(5, 2), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// Faixa de gradiente simulada por N segmentos justapostos (com leve
// sobreposição p/ não deixar fresta). horizontal=true por padrão. Suporta
// gradiente de COR (c1→c2) e/ou de OPACIDADE (alphaFrom→alphaTo) — este
// último permite véus que "desaparecem" (scrim de legibilidade sobre foto).
function _capaGradiente_(slide, x, y, w, h, c1, c2, opts) {
  opts = opts || {};
  const steps = opts.steps || 26;
  const vertical = !!opts.vertical;
  const aF = opts.alphaFrom != null ? opts.alphaFrom : (opts.alpha != null ? opts.alpha : 1);
  const aT = opts.alphaTo   != null ? opts.alphaTo   : (opts.alpha != null ? opts.alpha : 1);
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const cor = _capaHexLerp_(c1, c2, t);
    const a = aF + (aT - aF) * t;
    let sx, sy, sw, sh;
    if (vertical) { sh = h / steps; sy = y + i * sh; sx = x; sw = w; sh += 0.8; }
    else          { sw = w / steps; sx = x + i * sw; sy = y; sh = h; sw += 0.8; }
    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, sy, sw, sh);
    r.getFill().setSolidFill(cor, Math.max(0, Math.min(1, a)));
    r.getBorder().setTransparent();
  }
}

// Insere uma imagem preservando a PROPORÇÃO (nunca distorce): escala para a
// altura alvo e devolve o objeto Image para o chamador posicionar/centralizar.
function _capaLogoImg_(slide, id, targetH) {
  const blob = DriveApp.getFileById(id).getBlob();
  const img = slide.insertImage(blob);
  const ar = img.getWidth() / img.getHeight();
  img.setHeight(targetH).setWidth(targetH * ar);
  return img;
}

// Logo do PRÓPRIO MEGA (unitLogoId, 01_Config.gs — mesmo ID usado no
// Controle de Acessos Megas, LOGOS_MEGA) fixa no canto superior direito das
// capas, dentro de um chip branco (garante contraste sobre fundo escuro ou
// foto — mesmo recurso do addMegaLogo(dark=true) daquele repo). Contain-fit:
// nunca distorce, encaixa dentro da caixa boxW×boxH. Graceful: sem
// unitLogoId ou imagem indisponível, simplesmente não desenha nada.
function _capaMegaLogo_(slide, W, opts) {
  opts = opts || {};
  const proj = getProjetoAtivo();
  const id = proj.unitLogoId;
  if (!id) return false;
  const boxW = opts.w || 108, boxH = opts.h || 36;
  // Por padrão fica no canto superior direito; com opts.cx, fica centralizada
  // nesse x (ex.: cx = W/2 para centralizar no slide, usado na capa final).
  const x = opts.cx != null ? opts.cx - boxW / 2 : W - 42 - boxW;
  const y = opts.y != null ? opts.y : 26;
  try {
    const chip = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x - 12, y - 7, boxW + 24, boxH + 14);
    chip.getFill().setSolidFill('#FFFFFF', 0.95); chip.getBorder().setTransparent();

    const blob = DriveApp.getFileById(id).getBlob();
    const img = slide.insertImage(blob);
    const ar = img.getWidth() / img.getHeight();
    let w = boxW, h = boxW / ar;
    if (h > boxH) { h = boxH; w = boxH * ar; }
    img.setWidth(w).setHeight(h).setLeft(x + (boxW - w) / 2).setTop(y + (boxH - h) / 2);
    return true;
  } catch (e) {
    Logger.log('Capa: logo do Mega indisponível (' + id + '). ' + e.message);
    return false;
  }
}

// Foto de fundo full-bleed (cover-fill, sem distorção — sobra é clipada pela
// borda do slide) + véu de cor por cima. Retorna true se colocou a foto.
function _capaFotoFundo_(slide, W, H, fotoId, opts) {
  opts = opts || {};
  try {
    const blob = DriveApp.getFileById(fotoId).getBlob();
    const img = slide.insertImage(blob);
    const ar = img.getWidth() / img.getHeight();
    const pageAR = W / H;
    let w, h;
    if (ar > pageAR) { h = H; w = H * ar; } else { w = W; h = W / ar; }
    img.setWidth(w).setHeight(h).setLeft((W - w) / 2).setTop((H - h) / 2);

    const veu = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
    veu.getFill().setSolidFill(opts.cor || CR_DESIGN_SYSTEM.colors.brandDark,
                               opts.alpha != null ? opts.alpha : 0.5);
    veu.getBorder().setTransparent();
    return true;
  } catch (e) {
    Logger.log('Capa: foto de fundo indisponível (' + fotoId + '). ' + e.message);
    return false;
  }
}

// Véu de legibilidade sobre a foto: PNG transparente com degradê suave
// (brandDark denso à esquerda, some rumo à direita, + base escurecida).
// Substitui o degradê simulado por faixas (_capaGradiente_), cujas
// sobreposições de 0,8pt viravam listras verticais visíveis sobre a foto.
// Arquivo: 29 - Template Apresentações/01 - Fotos para slides/cr-scrim-capa.png
// (gerado em 10/11/2026). Sem o PNG, cai num véu sólido único — nunca listra.
const CAPA_SCRIM_ID = '1xus46vuE0D4oKyX_VLZ4YG5_icoDmT4s';

function _capaScrim_(slide, W, H) {
  if (CAPA_SCRIM_ID) {
    try {
      const img = slide.insertImage(DriveApp.getFileById(CAPA_SCRIM_ID).getBlob());
      img.setLeft(0).setTop(0).setWidth(W).setHeight(H);
      return;
    } catch (e) {
      Logger.log('Capa: véu PNG indisponível (' + CAPA_SCRIM_ID + '), usando véu sólido. ' + e.message);
    }
  }
  const veu = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
  veu.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark, 0.55);
  veu.getBorder().setTransparent();
}

// Fundo sem foto: só a cor institucional, sem manchas nem anéis.
function _capaFundoLimpo_(slide) {
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.brandDark);
}

// Caixa de texto de uma linha/parágrafo com o estilo das capas.
function _capaTexto_(slide, txt, x, y, w, h, tam, cor, opts) {
  opts = opts || {};
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  tb.getText().setText(txt).getTextStyle()
    .setFontSize(tam).setBold(opts.bold !== false).setForegroundColor(cor)
    .setFontFamily(opts.body ? CR_DESIGN_SYSTEM.typography.body : CR_DESIGN_SYSTEM.typography.titles);
  if (opts.centro) tb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  return tb;
}

// Anel decorativo (elipse só com contorno, sem preenchimento) — elemento do
// brandbook reaproveitado do repo Controle de Acessos Megas. Complementa as
// manchas preenchidas (_capaFundo_) com uma camada mais fina e gráfica.
function _capaAnel_(slide, x, y, tamanho, cor, peso, alpha) {
  const c = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, tamanho, tamanho);
  c.getFill().setTransparent();
  c.getBorder().getLineFill().setSolidFill(cor, alpha == null ? 1 : alpha);
  c.getBorder().setWeight(peso || 1);
  return c;
}

// Triângulo decorativo (elemento do brandbook, idem _capaAnel_).
function _capaTriangulo_(slide, x, y, tamanho, cor, alpha) {
  const t = slide.insertShape(SlidesApp.ShapeType.TRIANGLE, x, y, tamanho, tamanho * 0.9);
  t.getFill().setSolidFill(cor, alpha == null ? 1 : alpha);
  t.getBorder().setTransparent();
  return t;
}

// Fundo escuro premium: base + elipses de profundidade + espinha lateral
// de gradiente (assinatura das capas). opts.espinha=false remove a espinha.
function _capaFundo_(slide, W, H, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  slide.getBackground().setSolidFill(DS.colors.brandDark);

  // Halo superior direito (luz suave)
  const halo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 300, -220, 560, 560);
  halo.getFill().setSolidFill(DS.colors.brandLight, 0.12); halo.getBorder().setTransparent();

  // Massa inferior esquerda (profundidade)
  const massa = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, -220, H - 240, 500, 500);
  massa.getFill().setSolidFill(DS.colors.brandMed, 0.22); massa.getBorder().setTransparent();

  // Brilho pontual (pequeno) para dar "vida" ao canto
  const spark = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 150, -60, 150, 150);
  spark.getFill().setSolidFill(DS.colors.brandSoft, 0.10); spark.getBorder().setTransparent();

  // Anéis finos + triângulo (elementos do brandbook, mesma linguagem do
  // repo Controle de Acessos) — camada gráfica adicional sobre as manchas.
  _capaAnel_(slide, W - 250, -130, 420, DS.colors.brandLight, 1.25, 0.16);
  _capaAnel_(slide, W - 210, -95,  330, DS.colors.brandSoft,  1,    0.10);
  _capaTriangulo_(slide, W - 130, H - 190, 90, DS.colors.brandLight, 0.08);

  // Espinha lateral esquerda — gradiente vertical brandLight → brandSoft
  if (opts.espinha !== false) {
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  }
}

// Logo oficial da Capital Realty (versão NEGATIVA/branca) sobre o fundo
// escuro das capas. Preserva a proporção. Se a imagem não carregar, cai para
// um wordmark em texto branco (nunca quebra a geração). Retorna o X do fim
// do logo (para posicionar co-brand à direita, se preciso).
function _capaWordmark_(slide, x, y, opts) {
  opts = opts || {};
  const DS = CR_DESIGN_SYSTEM;
  const targetH = opts.h || 34;

  try {
    const img = _capaLogoImg_(slide, LOGOS_CR.fullNegativo, targetH);
    img.setLeft(x).setTop(y);
    return x + img.getWidth();
  } catch (e) {
    Logger.log('Capa: logo negativo indisponível, usando wordmark em texto. ' + e.message);
    const d = 26;
    const anel = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, y, d, d);
    anel.getFill().setTransparent();
    anel.getBorder().getLineFill().setSolidFill(DS.colors.brandLight); anel.getBorder().setWeight(2.5);
    const nucleo = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + d * 0.28, y + d * 0.28, d * 0.44, d * 0.44);
    nucleo.getFill().setSolidFill('#60A5FA'); nucleo.getBorder().setTransparent();
    const tx = x + d + 12;
    const nome = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y - 3, 340, 24);
    nome.getText().setText('CAPITAL REALTY').getTextStyle()
      .setFontSize(15).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
    const sub = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, tx, y + 15, 340, 16);
    sub.getText().setText('infraestrutura logística').getTextStyle()
      .setFontSize(8).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);
    return tx + 200;
  }
}

// Rodapé padrão das capas: hairline + texto à esquerda e slogan à direita.
function _capaRodape_(slide, W, H, esquerda, direita) {
  const DS = CR_DESIGN_SYSTEM;
  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 42, H - 40, W - 42, H - 40);
  sep.getLineFill().setSolidFill('#334155'); sep.setWeight(1);

  const fL = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H - 34, W - 260, 18);
  fL.getText().setText(esquerda).getTextStyle()
    .setFontSize(7).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.body);

  if (direita) {
    // Pequeno ponto de destaque antes do slogan
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, W - 205, H - 30, 6, 6);
    dot.getFill().setSolidFill('#60A5FA'); dot.getBorder().setTransparent();
    const fR = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, W - 192, H - 34, 150, 18);
    fR.getText().setText(direita).getTextStyle()
      .setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  }
}

// Texto "espaçado" (fake letter-spacing) para overlines premium.
function _capaEspacado_(txt) {
  return String(txt).toUpperCase().split('').join(' ');
}

// ==========================================
// CAPA PRINCIPAL (HERO DE ABERTURA)
// ==========================================
/**
 * ARQUIVO: Slide00_Capa.gs
 * SLIDE 00 — CAPA (única, versão premium)
 * Capa de abertura e contra capa MESCLADAS numa única capa, por pedido do
 * usuário: manteve a estrutura com FOTO de fundo (que ele preferiu) e o
 * conteúdo funcional (título, Mega, período) — sem o card de "Identificação
 * do Relatório" e sem logo (o nome do Mega já aparece como herói no texto).
 *
 * Fundo: foto full-bleed + véu azul institucional 50% quando a cidade tem
 * fotoFundoId (as três cidades já têm); senão, cai no fundo escuro premium
 * padrão (mesma linguagem, sem foto). Mês de referência vem dos DADOS
 * (obterMesReferencia_ em 02_Dados.gs) — a capa nunca diverge do conteúdo.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarSlideCapa() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  // Fundo: foto com véu leve (a foto precisa aparecer) + degradê em PNG à
  // esquerda para o texto ler. Sem anéis, triângulos ou espinha: a capa vive
  // da foto e da tipografia.
  const comFoto = projeto.fotoFundoId &&
    _capaFotoFundo_(slide, W, H, projeto.fotoFundoId, { cor: DS.colors.brandDark, alpha: 0.22 });
  if (comFoto) _capaScrim_(slide, W, H); else _capaFundoLimpo_(slide);

  _capaWordmark_(slide, 50, 34);

  const x0 = 50, yT = H * 0.36;
  _capaTexto_(slide, 'RELATÓRIO OPERACIONAL DE FACILITIES', x0, yT - 30, W - 140, 20, 10, DS.colors.brandSoft);

  const titulo = _capaTexto_(slide, 'RESULTADOS\nFACILITIES', x0 - 2, yT - 6, W - 140, 110, 44, '#FFFFFF');
  // O Slides não aceita lineSpacing abaixo de 100 ("Invalid argument: spacing").
  titulo.getText().getParagraphStyle().setLineSpacing(100);

  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0 + 2, yT + 110, 48, 3);
  barra.getFill().setSolidFill('#60A5FA'); barra.getBorder().setTransparent();

  _capaTexto_(slide, projeto.nome, x0, yT + 122, W - 140, 34, 22, '#60A5FA');
  _capaTexto_(slide, String(ref.nome).toUpperCase() + ' ' + ref.ano, x0, yT + 154, W - 140, 24, 13, '#FFFFFF');

  const slogan = _capaTexto_(slide, 'Expandir Eficiência', W - 250, H - 40, 210, 20, 9, '#CBD5E1');
  slogan.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

  Logger.log('Slide 00 (Capa) gerado → ' + ref.label);
}

// ==========================================
// CONTRA-CAPA INSTITUCIONAL
// ==========================================
/**
 * ARQUIVO: Slide_ContraCapa.gs
 * SLIDE — CONTRA CAPA (identificação institucional do relatório)
 * Entra logo após a Capa de Abertura. Página elegante de "ficha técnica":
 * posicionamento da marca + bloco de identificação (empreendimento, período,
 * área responsável, elaboração). Mantém a linguagem premium das capas.
 *
 * PRÉ-REQUISITO: Slide_CapasComuns.gs (helpers _capa*).
 */

function gerarSlideContraCapa() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  // Fundo: foto full-bleed + véu azul 50% quando a cidade tem fotoFundoId
  // (ex.: Mega Curitiba); senão, o fundo escuro premium padrão.
  let comFoto = false;
  if (projeto.fotoFundoId) {
    comFoto = _capaFotoFundo_(slide, W, H, projeto.fotoFundoId, { cor: DS.colors.brandDark, alpha: 0.5 });
  }
  if (comFoto) {
    // Scrim lateral esquerdo (escurece p/ o texto ler, some rumo à direita)
    _capaGradiente_(slide, 0, 0, W * 0.62, H, DS.colors.brandDark, DS.colors.brandDark,
      { alphaFrom: 0.55, alphaTo: 0.0, steps: 22 });
    // Anéis brancos translúcidos por cima da foto (mesma linguagem do repo
    // Controle de Acessos nos divisores com foto de fundo).
    _capaAnel_(slide, W - 260, 60, 420, '#FFFFFF', 1.25, 0.12);
    _capaAnel_(slide, W - 220, 100, 320, '#FFFFFF', 1,    0.07);
    _capaTriangulo_(slide, W - 165, 165, 90, '#FFFFFF', 0.08);
    // Espinha lateral (assinatura), por cima da foto
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  } else {
    _capaFundo_(slide, W, H);
  }
  _capaWordmark_(slide, 42, 30);

  // Logo do próprio Mega no topo direito (mesmo padrão da Capa de Abertura).
  _capaMegaLogo_(slide, W, { y: 26, w: 96, h: 32 });

  // ── Coluna esquerda: posicionamento da marca ────────────────────────────
  const colX = 44, colW = W * 0.50 - colX;
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, H * 0.30, colW, 20);
  over.getText().setText(_capaEspacado_('Relatório Mensal')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  _capaGradiente_(slide, colX + 2, H * 0.30 + 26, 60, 4, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  const frase = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, colX, H * 0.30 + 38, colW, 150);
  frase.getText().setText('INFRAESTRUTURA\nINSPIRA.\nLOGÍSTICA\nCONECTA.').getTextStyle()
    .setFontSize(30).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  frase.getText().getParagraphStyle().setLineSpacing(104);
  // Destaques em azul
  const fr = frase.getText();
  const s = 'INFRAESTRUTURA\nINSPIRA.\nLOGÍSTICA\nCONECTA.';
  const iInspira = s.indexOf('INSPIRA.');
  fr.getRange(iInspira, iInspira + 8).getTextStyle().setForegroundColor('#60A5FA');
  const iConecta = s.indexOf('CONECTA.');
  fr.getRange(iConecta, iConecta + 8).getTextStyle().setForegroundColor('#60A5FA');

  // ── Coluna direita: card de identificação (glass) ───────────────────────
  const cardW = W * 0.40, cardX = W - 44 - cardW;
  const cardH = 250, cardY = (H - cardH) / 2 + 6;
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cardX, cardY, cardW, cardH);
  card.getFill().setSolidFill('#FFFFFF', 0.06);
  card.getBorder().getLineFill().setSolidFill('#FFFFFF', 0.16); card.getBorder().setWeight(1);

  // Faixa de topo do card em gradiente
  _capaGradiente_(slide, cardX, cardY, cardW, 5, DS.colors.brandLight, '#60A5FA', { steps: 20 });

  const tituloCard = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cardX + 22, cardY + 20, cardW - 44, 22);
  tituloCard.getText().setText('IDENTIFICAÇÃO DO RELATÓRIO').getTextStyle()
    .setFontSize(10).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  const linhas = [
    { rot: 'EMPREENDIMENTO',        val: projeto.nome },
    { rot: 'PERÍODO DE REFERÊNCIA', val: ref.label },
    { rot: 'ÁREA RESPONSÁVEL',      val: 'Facilities' },
    { rot: 'ELABORAÇÃO',            val: 'Capital Realty · Infraestrutura Logística' }
  ];
  const linY0 = cardY + 54, linH = (cardH - 70) / linhas.length;
  linhas.forEach((l, i) => {
    const ly = linY0 + i * linH;
    const rot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cardX + 22, ly, cardW - 44, 14);
    rot.getText().setText(l.rot).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#94A3B8').setFontFamily(DS.typography.titles);
    const val = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cardX + 22, ly + 13, cardW - 44, 20);
    val.getText().setText(l.val).getTextStyle()
      .setFontSize(12).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.body);
    if (i < linhas.length - 1) {
      const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, cardX + 22, ly + linH - 6, cardX + cardW - 22, ly + linH - 6);
      sep.getLineFill().setSolidFill('#FFFFFF', 0.10); sep.setWeight(1);
    }
  });

  _capaRodape_(slide, W, H, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');

  Logger.log('Slide Contra Capa gerado → ' + projeto.nome + ' · ' + ref.label);
}

// ==========================================
// AGENDA / SUMÁRIO EXECUTIVO
// ==========================================
/**
 * ARQUIVO: Slide00_Agenda.gs
 * SLIDE — AGENDA
 * Sumário executivo da apresentação: lista numerada das seções em duas
 * colunas, na linguagem do design system. Entra logo após a capa.
 */

function gerarSlideAgenda() {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  criarHeaderPadrao(slide, 'AGENDA', getProjetoAtivo().nome + ' — Resultados de ' + ref.curto + ' de ' + ref.ano);

  const secoes = [
    'Destaques do Período',
    'Dashboard Operacional',
    'Manutenção Preventiva',
    'Manutenção Corretiva',
    'Serviços Contratados e Internos',
    'Segurança Patrimonial',
    'Resultado Operacional',
    'Custo do m² e Energia Solar',
    'Documentação Legal',
    'Encerramento'
  ];

  const marginX = 60, topY = 88;
  const colGap  = 40;
  const colW    = (W - 2 * marginX - colGap) / 2;
  const porCol  = Math.ceil(secoes.length / 2);
  const rowH    = (H - topY - 26) / porCol;

  secoes.forEach((titulo, i) => {
    const col = Math.floor(i / porCol);
    const row = i % porCol;
    const x = marginX + col * (colW + colGap);
    const y = topY + row * rowH;

    // Número grande na cor de destaque
    const num = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y + 4, 44, rowH - 12);
    num.getText().setText(String(i + 1).padStart(2, '0')).getTextStyle()
      .setFontSize(20).setBold(true).setForegroundColor(DS.colors.brandLight).setFontFamily(DS.typography.titles);
    num.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Título da seção
    const tt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 50, y + 4, colW - 50, rowH - 12);
    tt.getText().setText(titulo).getTextStyle()
      .setFontSize(12).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.titles);
    tt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    // Linha separadora sutil
    if (row < porCol - 1) {
      const ln = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + rowH - 1, colW, 0.75);
      ln.getFill().setSolidFill(DS.colors.lines); ln.getBorder().setTransparent();
    }
  });

  Logger.log('Slide Agenda gerado.');
}


// Pontos de entrada avulsos para Contra-Capa e Agenda
function gerarSoContraCapaCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideContraCapa(); }
function gerarSoContraCapaItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideContraCapa(); }
function gerarSoContraCapaEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideContraCapa(); }

function gerarSoAgendaCuritiba() { setProjetoAtivo('CURITIBA'); gerarSlideAgenda(); }
function gerarSoAgendaItajai()   { setProjetoAtivo('ITAJAI');   gerarSlideAgenda(); }
function gerarSoAgendaEsteio()   { setProjetoAtivo('ESTEIO');   gerarSlideAgenda(); }

// ==========================================
// CAPAS DE SEÇÃO TEMÁTICAS
// ==========================================
/**
 * ARQUIVO: Slide_CapaSecao.gs
 * COMPONENTE — CAPA DE SEÇÃO (divisória de assunto)
 *
 * Redesenho de 10/11/2026 (pedido do Guilherme: "os símbolos estão feios"):
 * sem o motivo desenhado em shapes por categoria (grade, alerta, cadeado...,
 * que pareciam clip-art) e sem a pasta de ícones. A seção se diferencia pela
 * FOTO de fundo e pelo título; o resto é fixo: linha de contexto (Mega · mês),
 * título em duas linhas (2ª no azul de destaque), barra curta e o logo.
 *
 * Foto por CATEGORIA (FOTOS_SECAO em 01_Config.gs, chave = 3º argumento).
 * Sem foto da categoria → capaFotoId da cidade → foto da capa (fotoFundoId)
 * → fundo liso.
 */

function gerarCapaSecao(linha1, linha2, chave) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const projeto = getProjetoAtivo();
  const DS = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();

  const k = String(chave || linha2 || '').toUpperCase();
  const fotoId = (typeof FOTOS_SECAO !== 'undefined' && FOTOS_SECAO[k]) || projeto.capaFotoId || projeto.fotoFundoId;

  const comFoto = fotoId && _capaFotoFundo_(slide, W, H, fotoId, { cor: DS.colors.brandDark, alpha: 0.22 });
  if (comFoto) _capaScrim_(slide, W, H); else _capaFundoLimpo_(slide);

  const x0 = 56, tY = H / 2 - 80;
  _capaTexto_(slide, projeto.nome.toUpperCase() + '  ·  ' + String(ref.nome).toUpperCase() + ' ' + ref.ano,
              x0, tY - 28, W - 140, 20, 10, DS.colors.brandSoft);
  _capaTexto_(slide, linha1, x0 - 2, tY, W - 140, 56, 40, '#FFFFFF');
  _capaTexto_(slide, linha2, x0 - 2, tY + 48, W - 140, 56, 40, '#60A5FA');

  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, tY + 114, 48, 3);
  barra.getFill().setSolidFill('#60A5FA'); barra.getBorder().setTransparent();

  _capaWordmark_(slide, x0, H - 58, { h: 28 });

  Logger.log('Capa de seção: ' + linha1 + ' ' + linha2 + ' [' + k + ']' + (comFoto ? ' (foto)' : ''));
}


// ==========================================
// TESTE DAS CAPAS (apresentação separada)
// ==========================================
// Gera Capa, três divisórias (uma sem foto própria: Complementos) e o
// Encerramento numa apresentação NOVA, na mesma pasta do deck da cidade —
// o deck do mês não é tocado. O link sai no log. Apague o arquivo depois.
function testarCapasEsteio()   { _testarCapas_('ESTEIO'); }
function testarCapasCuritiba() { _testarCapas_('CURITIBA'); }
function testarCapasItajai()   { _testarCapas_('ITAJAI'); }

function _testarCapas_(chave) {
  setProjetoAtivo(chave);
  const projeto = getProjetoAtivo();
  const nova = SlidesApp.create('TESTE CAPAS — ' + projeto.nome + ' — ' +
    Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM HH:mm'));
  const id = nova.getId();
  nova.saveAndClose();
  try {
    const pastas = DriveApp.getFileById(projeto.presentationId).getParents();
    if (pastas.hasNext()) DriveApp.getFileById(id).moveTo(pastas.next());
  } catch (e) {
    Logger.log('Teste das capas: não moveu para a pasta do deck (' + e.message + ') — ficou no Meu Drive.');
  }

  _presentationIdTeste_ = id;
  try {
    [
      () => gerarSlideCapa(),
      () => gerarCapaSecao('RESULTADO', 'OPERACIONAL', 'OPERACIONAL'),
      () => gerarCapaSecao('MANUTENÇÃO', 'PREVENTIVA', 'PREVENTIVA'),
      () => gerarCapaSecao('SERVIÇOS', 'COMPLEMENTARES', 'COMPLEMENTOS'),
      () => gerarSlideEncerramento()
    ].forEach(fn => { fn(); _salvarDeck_(); });
    getDeckAtivo().getSlides()[0].remove();   // slide de título em branco que o create() traz
    _salvarDeck_();
  } finally {
    _presentationIdTeste_ = null;
  }
  Logger.log('Teste das capas (' + projeto.nome + '): https://docs.google.com/presentation/d/' + id + '/edit');
}
