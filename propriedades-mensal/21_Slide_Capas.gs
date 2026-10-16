/**
 * ARQUIVO: 21_Slide_Capas.gs
 * SLIDES  — CAPA (imagem), CAPAS DE SEÇÃO E ENCERRAMENTO
 *
 * Pedido do Guilherme em 16/10/2026: "coloque capas e sub capas e contra
 * capas com as imagens que aprendemos" (as do Orçamento 2027 de
 * Propriedades) — sem trilha no topo dos slides.
 *
 * O fundo de cada um é uma imagem de slide inteiro desenhada em Pillow
 * (ferramentas/capas_mensal.py, salva na pasta IMAGENS - SLIDES): fotos,
 * títulos, frases e rodapé, que não mudam de um mês para o outro. Por cima,
 * como texto do Slides, vão só o MÊS e os logos. Sem a imagem, cada slide
 * sai em formas (o desenho que o deck já tinha) — a geração nunca para por
 * causa de uma imagem.
 *
 * AS SEÇÕES SÃO AS DO TIME, não inventadas aqui: até setembro/2026 o deck
 * tinha uma capa feita à mão por seção ("CAPITAL REALTY · APRESENTAÇÃO
 * MENSAL · FINANCEIRO …"). A geração troca cada uma, NO MESMO LUGAR, pela
 * versão daqui; seção que não tem capa no deck não ganha uma (a ordem do
 * deck é montada à mão e não cabe ao código adivinhar onde ela começa).
 * Da segunda vez em diante a capa é achada pela tag na nota.
 */

// = SECOES de ferramentas/capas_mensal.py (título, frase e foto desenhados na imagem).
// casa = o texto que identifica a capa feita à mão (junto com "APRESENTAÇÃO MENSAL").
const SECOES_MENSAL = [
  { n: 1, casa: 'FINANCEIRO',             titulo: 'Financeiro',
    frase: 'DRE, bridge, torre de manutenção e CAPEX' },
  { n: 2, casa: 'MANUTENÇÕES',            titulo: 'Manutenções',
    frase: 'Preventivas, corretivas e backlog de chamados' },
  { n: 3, casa: 'GESTÃO DE CONTRATAÇÕES', titulo: 'Gestão de Contratações',
    frase: 'Processos em andamento, contratações fechadas e backlog de clientes' },
  { n: 4, casa: 'OBRAS E CONTRATAÇÕES',   titulo: 'Obras e Contratações em Andamento',
    frase: 'Serviços contratados em andamento e concluídos no mês' },
  { n: 5, casa: 'VISTORIAS',              titulo: 'Vistorias',
    frase: 'Recebimento de obras, vistorias de rotina e SGQ' },
  { n: 6, casa: 'ADEQUAÇÕES DE CLIENTES', titulo: 'Adequações de Clientes',
    frase: 'Análise de projetos e status dos projetos aprovados' }
];
const TAG_ENCERRAMENTO = '【PROP_ENCERRAMENTO_AUTO】';
function _capaTagSecao_(n) { return '【PROP_SECAO_' + ('0' + n).slice(-2) + '_AUTO】'; }

// Pasta das imagens: a mesma do Orçamento 2027 (PROP_PASTA_ORCAMENTO_ID / PROP_PASTA_IMAGENS de lá).
const CAPAS_PASTA_ORCAMENTO_ID = '13PO9xDvPG3wmoVLfv41fZZo0I3rvl_gw';   // APRESENTAÇÃO ORÇAMENTO
const CAPAS_PASTA_IMAGENS      = 'IMAGENS - SLIDES';
const CAPAS_LOGO_CR_NEGATIVO   = '1Tx9cwk1-1_P1TSGoXLZ828JNQ-rY-w6p';    // = PROP_LOGOS.negativo
const CAPAS_LOGO_DM_NEGATIVO   = 'pasta:LOGO - DEMERCADO - NEGATIVO.png';

let _capasBlobs_ = {};
function _capasBlob_(id) {
  if (!(id in _capasBlobs_)) {
    try {
      let arq;
      if (/^pasta:/.test(id)) {
        const pastas = DriveApp.getFolderById(CAPAS_PASTA_ORCAMENTO_ID).getFoldersByName(CAPAS_PASTA_IMAGENS);
        if (!pastas.hasNext()) throw new Error('pasta ' + CAPAS_PASTA_IMAGENS + ' não encontrada');
        const it = pastas.next().getFilesByName(id.slice(6));
        if (!it.hasNext()) throw new Error('"' + id.slice(6) + '" não está na pasta ' + CAPAS_PASTA_IMAGENS);
        arq = it.next();
      } else {
        arq = DriveApp.getFileById(id);
      }
      _capasBlobs_[id] = { blob: arq.getBlob() };
    } catch (e) {
      _capasBlobs_[id] = { erro: e };
    }
  }
  return _capasBlobs_[id];
}

// Imagem de slide inteiro, atrás de tudo. false = não achou (o chamador desenha em formas).
function _capasFundo_(slide, W, H, nome, titulo) {
  const b = _capasBlob_('pasta:' + nome);
  if (b.erro) { Logger.log('Fundo "' + nome + '" indisponível (' + b.erro.message + ') — vai o desenho em formas.'); return false; }
  const img = slide.insertImage(b.blob).setLeft(0).setTop(0).setWidth(W).setHeight(H);
  img.sendToBack();
  if (titulo) img.setTitle(titulo).setDescription(titulo);
  return true;
}

// Logos CR + DM (negativos) lado a lado a partir de x; devolve false se nenhum veio.
function _capasLogos_(slide, x, y, h) {
  let algum = false;
  [CAPAS_LOGO_CR_NEGATIVO, CAPAS_LOGO_DM_NEGATIVO].forEach(id => {
    const b = _capasBlob_(id);
    if (b.erro) { Logger.log('Logo ' + id + ' indisponível: ' + b.erro.message); return; }
    const img = slide.insertImage(b.blob);
    const w = h * img.getWidth() / img.getHeight();
    img.setWidth(w).setHeight(h).setLeft(x).setTop(y);
    x += w + 22; algum = true;
  });
  return algum;
}

// Texto numa linha, fonte do design system (títulos = Montserrat).
function _capasTxt_(slide, x, y, w, h, txt, fs, bold, cor, align, fonte) {
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tb.getText().setText(String(txt)).getTextStyle()
    .setFontSize(fs).setBold(!!bold).setForegroundColor(cor)
    .setFontFamily(fonte || CR_DESIGN_SYSTEM.typography.titles);
  tb.getText().getParagraphStyle().setLineSpacing(100).setParagraphAlignment(
    align === 'R' ? SlidesApp.ParagraphAlignment.END :
    align === 'C' ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return tb;
}

// Pill do mês (fundo brandLight, texto branco centrado — folga da skill "caixa de texto sem quebra").
function _capasPillMes_(slide, x, y, w, h, ref) {
  const r = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  r.getFill().setSolidFill(CR_DESIGN_SYSTEM.colors.brandLight);
  r.getBorder().setTransparent();
  _capasTxt_(slide, x - 10, y, w + 20, h, ref.nome + ' ' + ref.ano, 11, true, '#FFFFFF', 'C');
}

// Índice do slide no deck (ou -1).
function _capasIndice_(deck, slide) {
  const id = slide.getObjectId();
  const s = deck.getSlides();
  for (let i = 0; i < s.length; i++) if (s[i].getObjectId() === id) return i;
  return -1;
}

function _capasNotas_(slide) {
  try { return slide.getNotesPage().getSpeakerNotesShape().getText().asString(); } catch (e) { return ''; }
}

// Slide.move(i) conta na ordem ANTES de mover: o novo (no fim) vai para o índice do antigo,
// o antigo desce uma posição e é apagado.
function _capasNoLugarDe_(novo, antigo, deck) {
  const i = _capasIndice_(deck, antigo);
  if (i >= 0) novo.move(i);
  antigo.remove();
}


// ==========================================
// CAPA (chamada por gerarSlideCapa, 10_Slide_Capa.gs)
// ==========================================
// Mesmas caixas de capa() em ferramentas/capas_mensal.py.
function _capaImagem_(slide, W, H, ref) {
  if (!_capasFundo_(slide, W, H, 'CAPA - PROPRIEDADES MENSAL.jpg', 'Gestão de Propriedades — Apresentação mensal')) return false;
  slide.getBackground().setSolidFill('#FFFFFF');
  if (!_capasLogos_(slide, 48, 30, 28)) {
    _capasTxt_(slide, 44, 30, 300, 32, 'CAPITAL REALTY', 13, true, '#FFFFFF');
  }
  _capasPillMes_(slide, 48, 322, 200, 26, ref);
  return true;
}


// ==========================================
// CAPAS DE SEÇÃO
// ==========================================
function gerarCapasSecoes() {
  const deck = getDeckMensal_();
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const ref = obterMesReferencia_();
  let feitas = 0;
  SECOES_MENSAL.forEach(sec => {
    const antiga = _capasAcharSecao_(deck, sec);
    if (!antiga) {
      Logger.log('Seção ' + sec.n + ' (' + sec.titulo + '): o deck não tem capa dessa seção — não criada ' +
                 '(a ordem do deck é do time). Para ganhar uma, ponha no lugar um slide com o texto ' +
                 '"APRESENTAÇÃO MENSAL" e "' + sec.casa + '".');
      return;
    }
    const s = _slideNovo_(deck, _capaTagSecao_(sec.n));
    _capaSecaoDesenho_(s, W, H, sec, ref);
    _capasNoLugarDe_(s, antiga, deck);
    feitas++;
  });
  Logger.log('✓ Capas de seção: ' + feitas + ' de ' + SECOES_MENSAL.length + ' → ' + ref.nome + ' ' + ref.ano);
}

// A capa da seção no deck: a gerada antes (tag) ou a feita à mão (texto). Nunca a capa do deck.
function _capasAcharSecao_(deck, sec) {
  const tag = _capaTagSecao_(sec.n);
  const slides = deck.getSlides();
  for (let i = 0; i < slides.length; i++) if (_capasNotas_(slides[i]).indexOf(tag) >= 0) return slides[i];
  const casa = sec.casa.toUpperCase();
  for (let i = 0; i < slides.length; i++) {
    const notas = _capasNotas_(slides[i]);
    if (notas.indexOf(TAG_CAPA) >= 0 || notas.indexOf('【PROP_SECAO_') >= 0) continue;
    const t = _dreTextoDoSlide_(slides[i]).replace(/\s+/g, ' ');
    if (t.indexOf('APRESENTAÇÃO MENSAL') >= 0 && t.indexOf(casa) >= 0 && t.indexOf('GESTÃO DE PROPRIEDADES') < 0) return slides[i];
  }
  return null;
}

// Mesmas caixas de secao() em ferramentas/capas_mensal.py.
function _capaSecaoDesenho_(slide, W, H, sec, ref) {
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  const num = ('0' + sec.n).slice(-2);
  if (_capasFundo_(slide, W, H, 'SECAO - PROPRIEDADES MENSAL - ' + num + '.jpg', num + ' ' + sec.titulo)) {
    slide.getBackground().setSolidFill('#FFFFFF');
    _capasTxt_(slide, 464, 376, 220, 16, ref.nome + ' ' + ref.ano, 7.5, true, C.brandLight, 'R');
    return;
  }
  // Em formas: o desenho das capas feitas à mão (fundo escuro, espinha, wordmark), com o número da seção.
  slide.getBackground().setSolidFill(C.brandDark);
  _sRet_(slide, 0, 0, 6, H, C.brandLight);
  _capasTxt_(slide, 44, 30, 300, 32, 'CAPITAL REALTY', 13, true, '#FFFFFF');
  _capasTxt_(slide, 40, H * 0.22, 200, 70, num, 54, true, '#60A5FA');
  _capasTxt_(slide, 44, H * 0.22 + 72, W - 200, 20, 'APRESENTAÇÃO MENSAL', 9, true, '#60A5FA');
  _sRet_(slide, 46, H * 0.22 + 96, 66, 4, C.brandLight);
  _capasTxt_(slide, 40, H * 0.22 + 106, W - 120, 52, sec.titulo.toUpperCase(), 34, true, '#FFFFFF');
  _capasTxt_(slide, 42, H * 0.22 + 160, W - 120, 26, sec.frase, 14, false, '#C7D2FE', null, DS.typography.body);
  _capasPillMes_(slide, 42, H * 0.22 + 196, 250, 30, ref);
}


// ==========================================
// ENCERRAMENTO (sempre o último slide)
// ==========================================
function gerarSlideEncerramento() {
  const deck = getDeckMensal_();
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM, C = DS.colors;
  _slideLimpar_(deck, TAG_ENCERRAMENTO);
  const s = _slideNovo_(deck, TAG_ENCERRAMENTO);
  if (_capasFundo_(s, W, H, 'ENCERRAMENTO - PROPRIEDADES MENSAL.jpg', 'Obrigado')) {
    if (!_capasLogos_(s, 48, 332, 24)) _capasTxt_(s, 44, 330, 300, 28, 'CAPITAL REALTY', 13, true, '#FFFFFF');
  } else {
    s.getBackground().setSolidFill(C.brandDark);
    _sRet_(s, 0, 0, 6, H, C.brandLight);
    _capasTxt_(s, 44, H * 0.30, W - 200, 20, 'APRESENTAÇÃO MENSAL · PROPRIEDADES', 9, true, '#60A5FA');
    _capasTxt_(s, 40, H * 0.30 + 20, W - 120, 64, 'Obrigado', 48, true, '#FFFFFF');
    _sRet_(s, 46, H * 0.30 + 90, 66, 4, C.brandLight);
    _capasTxt_(s, 44, H * 0.30 + 100, W - 200, 20, 'INFRAESTRUTURA INSPIRA.', 12, true, '#FFFFFF');
    _capasTxt_(s, 44, H * 0.30 + 118, W - 200, 20, 'LOGÍSTICA CONECTA.', 12, true, '#60A5FA');
    if (!_capasLogos_(s, 48, H - 70, 24)) _capasTxt_(s, 44, H - 72, 300, 28, 'CAPITAL REALTY', 13, true, '#FFFFFF');
  }
  Logger.log('✓ Encerramento gerado.');
}
