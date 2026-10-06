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

  // ── Fundo: foto (quando a cidade tem fotoFundoId) ou fundo escuro padrão ──
  let comFoto = false;
  if (projeto.fotoFundoId) {
    comFoto = _capaFotoFundo_(slide, W, H, projeto.fotoFundoId, { cor: DS.colors.brandDark, alpha: 0.5 });
  }
  if (comFoto) {
    // Scrim lateral esquerdo (escurece p/ o texto ler, some rumo à direita)
    _capaGradiente_(slide, 0, 0, W * 0.62, H, DS.colors.brandDark, DS.colors.brandDark,
      { alphaFrom: 0.55, alphaTo: 0.0, steps: 22 });
    // Anéis + triângulo brancos translúcidos por cima da foto
    _capaAnel_(slide, W - 260, 60, 420, '#FFFFFF', 1.25, 0.12);
    _capaAnel_(slide, W - 220, 100, 320, '#FFFFFF', 1,    0.07);
    _capaTriangulo_(slide, W - 165, 165, 90, '#FFFFFF', 0.08);
    // Espinha lateral (assinatura), por cima da foto
    _capaGradiente_(slide, 0, 0, 6, H, DS.colors.brandLight, DS.colors.brandSoft, { vertical: true, steps: 30 });
  } else {
    _capaFundo_(slide, W, H);
  }

  // Wordmark Capital Realty (topo esquerdo). Sem logo do Mega na capa
  // (removida por pedido — o nome do Mega já aparece como herói abaixo).
  _capaWordmark_(slide, 42, 30);

  // Overline espaçado
  const over = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 44, H * 0.30, W - 200, 20);
  over.getText().setText(_capaEspacado_('Relatório Operacional de Facilities')).getTextStyle()
    .setFontSize(9).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Barra de destaque em gradiente acima do título
  _capaGradiente_(slide, 46, H * 0.30 + 26, 66, 4, DS.colors.brandLight, '#60A5FA', { steps: 12 });

  // Título principal
  const titulo = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 40, H * 0.30 + 36, W - 120, 130);
  titulo.getText().setText('RESULTADOS\nFACILITIES').getTextStyle()
    .setFontSize(44).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  // O Slides não aceita lineSpacing abaixo de 100 (mínimo "espaçamento
  // simples" da própria interface) — usar <100 lança "Invalid argument:
  // spacing" na API.
  titulo.getText().getParagraphStyle().setLineSpacing(100);

  // Cidade (herói do co-branding)
  const cidade = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, H * 0.30 + 158, W - 120, 40);
  cidade.getText().setText(projeto.nome).getTextStyle()
    .setFontSize(24).setBold(true).setForegroundColor('#60A5FA').setFontFamily(DS.typography.titles);

  // Pill de período em gradiente
  const pillY = H * 0.30 + 202, pillW = 250, pillH = 30;
  _capaGradiente_(slide, 42, pillY, pillW, pillH, DS.colors.brandMed, DS.colors.brandLight, { steps: 24 });
  const pillBorda = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 42, pillY, pillW, pillH);
  pillBorda.getFill().setTransparent();
  pillBorda.getBorder().getLineFill().setSolidFill('#60A5FA', 0.35); pillBorda.getBorder().setWeight(1);
  const pillT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 42, pillY, pillW, pillH);
  pillT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  pillT.getText().setText(ref.nome + ' ' + ref.ano).getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS.typography.titles);
  pillT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Rodapé
  _capaRodape_(slide, W, H, 'CAPITAL REALTY · INFRAESTRUTURA LOGÍSTICA', 'Expandir Eficiência');

  Logger.log('Slide 00 (Capa única, premium) gerado → ' + ref.label);
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

// COMPLEMENTOS — sinal de mais: serviços extras que não têm categoria
// própria (nem Contratados, nem Internos) — "+" é o símbolo mais direto pra
// "itens adicionais", sem forçar um objeto literal que nem sempre existe.
// A barra vertical (destaque) cruza a horizontal (branca) formando o "+".
function _secMotComplementos_(s, cx, cy, cor) {
  const comprimento = 92, espessura = 18;
  _secRet_(s, cx - comprimento / 2, cy - espessura / 2, comprimento, espessura, '#FFFFFF', 0.5, true);
  _secRet_(s, cx - espessura / 2, cy - comprimento / 2, espessura, comprimento, cor, 0.9, true);
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

// ==========================================
// ÍCONES DE SEÇÃO (GOOGLE DRIVE / NATIVO)
// ==========================================
/**
 * ARQUIVO: Slide_IconesCapas.gs
 * ÍCONES DAS CAPAS DE SEÇÃO — pasta do Google Drive
 *
 * Mesma ideia dos logos de cliente (Slide_LogosClientes.gs): a imagem mora no
 * Drive e o código só a encaixa no slide. A diferença é que aqui NÃO tem mapa
 * de IDs de arquivo — o ícone é procurado pelo NOME dentro de UMA pasta. Para
 * trocar o ícone de uma seção basta substituir o arquivo na pasta; nada de
 * editar código e reimplantar.
 *
 * ┌─ COMO CONFIGURAR ────────────────────────────────────────────────────────┐
 * │ 1. Crie uma pasta no Drive (ex.: "Ícones — Capas de Seção") e compartilhe │
 * │    com a conta que roda o script.                                        │
 * │ 2. Cole o ID da pasta em ICONES_CAPAS_PASTA_ID abaixo (o ID é o trecho    │
 * │    depois de /folders/ na URL).                                          │
 * │ 3. Ponha um arquivo PNG por seção, com os nomes de _ICONES_CAPAS_ARQUIVO_ │
 * │    (preventiva.png, corretiva.png, ...).                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * PNG, NÃO SVG. A API do Slides aceita apenas PNG, JPEG e GIF — um SVG na
 * pasta seria recusado com erro obscuro na hora de gerar. Por isso o tipo do
 * arquivo é conferido ANTES de inserir e um SVG vira um aviso claro no Logger
 * (ver _iconeCapaFormatoOk_).
 *
 * O ícone precisa ser CLARO (branco/quase branco) e com fundo transparente: a
 * capa é uma foto escurecida, e um ícone preto simplesmente some. Diferente do
 * motivo desenhado, uma imagem não pode ser recolorida pelo código.
 *
 * NADA É OBRIGATÓRIO. Sem pasta configurada, sem arquivo, arquivo inacessível
 * ou em formato errado, a capa desenha o motivo geométrico nativo de sempre
 * (_secDesenharMotivo_ em Slide_CapaSecao.gs) — que é vetorial e continua
 * sendo o padrão até alguém povoar a pasta.
 */

// ID da pasta do Drive com os ícones — a mesma pasta de assets do projeto
// (onde já moram os logos Mega e as subpastas CR/, CLIENTES/, FOTOS MEGAS/).
// Só os arquivos SOLTOS na pasta são procurados; subpasta não é vasculhada.
// Vazio = recurso desligado: nenhuma chamada ao Drive e capas 100% nativas.
const ICONES_CAPAS_PASTA_ID = '1LDDbVpH0zAwUeQR7cu7bTOqg74Fa5Yks';

// Chave da seção (a mesma de _secDesenharMotivo_) → nome do arquivo na pasta,
// sem extensão. A extensão é resolvida por _ICONES_CAPAS_EXTENSOES_.
const _ICONES_CAPAS_ARQUIVO_ = {
  'PREVENTIVA'  : 'preventiva',
  'CORRETIVA'   : 'corretiva',
  'CONTRATADOS' : 'contratados',
  'INTERNOS'    : 'internos',
  'PATRIMONIAL' : 'patrimonial',
  'OPERACIONAL' : 'operacional',
  'UTILITIES'   : 'utilities',
  'SUSTENTAVEL' : 'sustentavel',
  'DOCUMENTACAO': 'documentacao'
};

// Extensões tentadas, em ordem. PNG primeiro: é o que preserva transparência
// e traço fino de ícone sem artefato de compressão.
const _ICONES_CAPAS_EXTENSOES_ = ['png', 'jpg', 'jpeg', 'gif'];

// Formatos que a API do Slides aceita em insertImage.
const _ICONES_CAPAS_MIMES_OK_ = ['image/png', 'image/jpeg', 'image/gif'];

// Lado da caixa (pt) onde o ícone é encaixado, centrada no mesmo ponto do
// motivo nativo. _insertLogoFit_ preenche o MÁXIMO da caixa sem distorcer,
// então ícone quadrado e ícone largo ocupam a mesma área visual.
const ICONE_CAPA_BOX_PT = 108;

// Cache por chave de seção, inclusive dos MISSES (valor null): sem isso, um
// deck das três cidades repetiria a mesma busca no Drive a cada capa.
const _iconeCapaCache_ = {};

// Índice nome→arquivo da pasta, montado UMA vez por execução.
//
// Vale a pena listar a pasta inteira em vez de perguntar arquivo por arquivo:
// com getFilesByName seriam 4 consultas (uma por extensão) × 9 seções = 36
// idas ao Drive quando a pasta ainda não tem ícone nenhum — que é justamente
// o estado inicial. Assim é 1 só. De quebra, o índice é minúsculo, então
// "Preventiva.PNG" também é encontrado (o Drive diferencia maiúsculas).
let _iconeCapaIndice_ = null;

function _iconesCapaIndice_() {
  if (_iconeCapaIndice_) return _iconeCapaIndice_;
  const idx = {};
  try {
    const it = DriveApp.getFolderById(ICONES_CAPAS_PASTA_ID).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      idx[String(f.getName() || '').toLowerCase()] = f;
    }
  } catch (e) {
    Logger.log('Ícones das capas: pasta do Drive inacessível (' + e.message +
               ') — usando os motivos desenhados.');
  }
  _iconeCapaIndice_ = idx;
  return idx;
}

// Devolve o Blob do ícone da seção, ou null (sem pasta, sem arquivo, arquivo
// inacessível ou formato não suportado). Nunca lança.
function _getIconeCapaBlob_(chave) {
  if (!ICONES_CAPAS_PASTA_ID) return null;

  const nomeBase = _ICONES_CAPAS_ARQUIVO_[String(chave || '').toUpperCase()];
  if (!nomeBase) return null;

  if (nomeBase in _iconeCapaCache_) return _iconeCapaCache_[nomeBase];

  const idx = _iconesCapaIndice_();
  let achado = null;
  for (let i = 0; i < _ICONES_CAPAS_EXTENSOES_.length && !achado; i++) {
    achado = idx[nomeBase + '.' + _ICONES_CAPAS_EXTENSOES_[i]] || null;
  }
  if (!achado) {
    Logger.log('Ícone da capa "' + chave + '": nenhum arquivo "' + nomeBase +
               '.(png|jpg|gif)" na pasta — usando o motivo desenhado.');
  }

  let blob = null;
  if (achado) {
    try {
      const b = achado.getBlob();
      blob = _iconeCapaFormatoOk_(b, chave, achado.getName()) ? b : null;
    } catch (e) {
      Logger.log('Ícone da capa "' + chave + '": arquivo não abriu (' + e.message + ').');
    }
  }

  _iconeCapaCache_[nomeBase] = blob;
  return blob;
}

// O erro do Slides para formato não suportado não diz qual arquivo causou o
// problema — conferir aqui transforma isso num aviso acionável.
function _iconeCapaFormatoOk_(blob, chave, nomeArquivo) {
  const mime = String(blob.getContentType() || '').toLowerCase();
  if (_ICONES_CAPAS_MIMES_OK_.indexOf(mime) >= 0) return true;
  Logger.log('Ícone da capa "' + chave + '": "' + nomeArquivo + '" é ' + (mime || 'de tipo desconhecido') +
             '. O Slides só aceita PNG, JPEG e GIF' +
             (mime.indexOf('svg') >= 0 ? ' — converta o SVG para PNG (512px, traço branco, fundo transparente).' : '.') +
             ' Usando o motivo desenhado.');
  return false;
}

// Desenha o ícone da seção centrado em (cx, cy). Devolve true se desenhou —
// false manda o chamador cair no motivo geométrico nativo.
function _secIconeCapa_(slide, cx, cy, chave) {
  const blob = _getIconeCapaBlob_(chave);
  if (!blob) return false;
  try {
    const b = ICONE_CAPA_BOX_PT;
    _insertLogoFit_(slide, blob, cx - b / 2, cy - b / 2, b, b);
    return true;
  } catch (e) {
    Logger.log('Ícone da capa "' + chave + '": não inseriu no slide (' + e.message + ').');
    return false;
  }
}

// Diagnóstico manual: roda pela pasta e diz, seção a seção, o que está pronto
// e o que falta. Use depois de povoar a pasta, antes de gerar o deck.
function conferirIconesCapas() {
  if (!ICONES_CAPAS_PASTA_ID) {
    Logger.log('ICONES_CAPAS_PASTA_ID vazio — as capas usam o motivo desenhado (padrão atual).');
    return;
  }
  _iconeCapaIndice_ = null;   // relê a pasta: o arquivo pode ter acabado de entrar
  Object.keys(_ICONES_CAPAS_ARQUIVO_).forEach(chave => {
    delete _iconeCapaCache_[_ICONES_CAPAS_ARQUIVO_[chave]];
    const blob = _getIconeCapaBlob_(chave);
    Logger.log((blob ? '✓ ' : '· ') + chave + (blob ? ' → ' + blob.getContentType() : ' → motivo desenhado'));
  });
}
