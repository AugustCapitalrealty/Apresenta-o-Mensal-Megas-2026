/**
 * ARQUIVO: Slide_ServicosContratados.gs
 * COMPONENTE — REGISTRO FOTOGRÁFICO AUTOMÁTICO (SERVIÇOS CONTRATADOS)
 * Busca, na pasta do Drive configurada em servicosContratadosPastaId
 * (01_Config.gs), a subpasta do mês de referência (ex.: "06-JUNHO") e, dentro
 * dela, uma subpasta por serviço prestado com as fotos do serviço. Gera um
 * slide por serviço, reaproveitando o layout do registro manual
 * (Slide_RegistroFotos.gs): painel de fotos + painel de descrição, usando o
 * nome da própria subpasta como descrição.
 *
 * Sem pasta configurada, sem pasta do mês ou sem nenhum serviço com foto:
 * cai de volta no slide manual de colar foto por foto (gerarSlideRegistroFotos),
 * sem quebrar a geração.
 */

function gerarSlidesServicosContratados_() {
  const secao   = 'SERVIÇOS CONTRATADOS';
  const projeto = getProjetoAtivo();
  const pastaId = projeto.servicosContratadosPastaId;

  if (!pastaId) {
    Logger.log('Serviços Contratados: pasta não configurada para ' + projeto.nome + ' — usando slide manual.');
    return gerarSlideRegistroFotos(secao);
  }

  let pastaMes = null, servicos = [];
  try {
    const pastaRaiz = DriveApp.getFolderById(pastaId);
    const ref = obterMesReferencia_();
    pastaMes = _scEncontrarPastaMes_(pastaRaiz, ref);
    if (pastaMes) {
      servicos = _scListarServicos_(pastaMes).filter(f => _scListarFotos_(f, 1).length > 0);
    }
  } catch (e) {
    Logger.log('Aviso (Serviços Contratados): erro ao acessar a pasta do Drive. ' + e.message);
  }

  if (!pastaMes) {
    Logger.log('Serviços Contratados: pasta do mês de referência não encontrada em ' + projeto.nome + ' — usando slide manual.');
    return gerarSlideRegistroFotos(secao);
  }
  if (servicos.length === 0) {
    Logger.log('Serviços Contratados: nenhum serviço com fotos encontrado para o mês — usando slide manual.');
    return gerarSlideRegistroFotos(secao);
  }

  servicos.forEach(pastaServico => _scGerarSlideServico_(secao, pastaServico));
  Logger.log('Serviços Contratados: ' + servicos.length + ' slide(s) gerado(s) automaticamente a partir do Drive (' + pastaMes.getName() + ').');
}

// ── Descoberta da pasta do mês ────────────────────────────────────────────
function _scEncontrarPastaMes_(pastaRaiz, ref) {
  const alvoCompleto = _histNorm_(ref.nome);                 // "junho"
  const alvoCurto     = _histNorm_(MESES_3_REF[ref.index]);  // "jun"
  const regexCurto    = new RegExp('(^|[^a-z])' + alvoCurto + '([^a-z]|$)');

  const it = pastaRaiz.getFolders();
  const candidatos = [];
  while (it.hasNext()) {
    const f = it.next();
    const nome = _histNorm_(f.getName());
    if (nome.indexOf(alvoCompleto) >= 0 || regexCurto.test(nome)) candidatos.push(f);
  }
  return candidatos[0] || null;
}

// ── Listagem de serviços (subpastas) e fotos ──────────────────────────────
function _scListarServicos_(pastaMes) {
  const it = pastaMes.getFolders();
  const pastas = [];
  while (it.hasNext()) pastas.push(it.next());
  pastas.sort((a, b) => a.getName().localeCompare(b.getName(), 'pt-BR'));
  return pastas;
}

function _scListarFotos_(pastaServico, max) {
  const it = pastaServico.getFiles();
  const arquivos = [];
  while (it.hasNext()) {
    const f = it.next();
    if (String(f.getMimeType()).indexOf('image/') === 0) arquivos.push(f);
  }
  arquivos.sort((a, b) => a.getDateCreated() - b.getDateCreated());
  return arquivos.slice(0, max);
}

// ── Layout responsivo de 1 a 4 fotos ──────────────────────────────────────
function _scLayoutSlots_(n, px, py, pw, ph) {
  const gap = 12;
  if (n <= 1) return [{ x: px, y: py, w: pw, h: ph }];
  if (n === 2) {
    const w = (pw - gap) / 2;
    return [
      { x: px,             y: py, w: w, h: ph },
      { x: px + w + gap,   y: py, w: w, h: ph }
    ];
  }
  if (n === 3) {
    const w = (pw - 2 * gap) / 3;
    return [0, 1, 2].map(i => ({ x: px + i * (w + gap), y: py, w: w, h: ph }));
  }
  // n >= 4 → grade 2×2 (usa só as 4 primeiras fotos)
  const w = (pw - gap) / 2, h = (ph - gap) / 2;
  return [
    { x: px,           y: py,           w: w, h: h },
    { x: px + w + gap, y: py,           w: w, h: h },
    { x: px,           y: py + h + gap, w: w, h: h },
    { x: px + w + gap, y: py + h + gap, w: w, h: h }
  ];
}

// ── Inserção de imagem com contain-fit (preserva proporção, centraliza) ───
function _scInserirFotoContain_(slide, blob, x, y, boxW, boxH) {
  const img = slide.insertImage(blob, x, y);
  const natW = img.getWidth(), natH = img.getHeight();
  const escala = Math.min(boxW / natW, boxH / natH);
  const w = natW * escala, h = natH * escala;
  img.setWidth(w).setHeight(h);
  img.setLeft(x + (boxW - w) / 2).setTop(y + (boxH - h) / 2);
  return img;
}

// ── Slide de um serviço ────────────────────────────────────────────────────
function _scGerarSlideServico_(secao, pastaServico) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const DS = CR_DESIGN_SYSTEM;

  criarHeaderPadrao(slide, secao, 'Registro fotográfico e descrição do serviço');

  const marginX = 30, topY = 76;

  // Painel FOTOS DO SERVIÇO
  const fotosH   = 195;
  const contentY = criarCardPainel(slide, marginX, topY, W - 2 * marginX, fotosH, 'FOTOS DO SERVIÇO', DS.colors.brandLight);
  const innerX   = marginX + 14, innerW = W - 2 * marginX - 28;
  const fotoAreaH = topY + fotosH - contentY - 10;

  const fotos = _scListarFotos_(pastaServico, 4);
  const slots = _scLayoutSlots_(fotos.length, innerX, contentY, innerW, fotoAreaH);
  fotos.forEach((file, i) => {
    try {
      _scInserirFotoContain_(slide, file.getBlob(), slots[i].x, slots[i].y, slots[i].w, slots[i].h);
    } catch (e) {
      Logger.log('Aviso (Serviços Contratados): falha ao inserir foto "' + file.getName() + '". ' + e.message);
    }
  });

  // Painel DESCRIÇÃO — usa o nome da subpasta como descrição do serviço
  const descY = topY + fotosH + 12;
  const descH = H - descY - 14;
  const descContentY = criarCardPainel(slide, marginX, descY, W - 2 * marginX, descH, 'DESCRIÇÃO', DS.colors.brandMed);
  const descBoxH = descY + descH - descContentY - 10;

  const descTxt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, innerX, descContentY, innerW, descBoxH);
  descTxt.getText().setText(pastaServico.getName()).getTextStyle()
    .setFontSize(13).setBold(true).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
  descTxt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
  descTxt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  Logger.log('Slide Serviço Contratado gerado: ' + pastaServico.getName());
}
