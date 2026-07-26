/**
 * ARQUIVO: Slide_ServicosContratados.gs
 * COMPONENTE — REGISTRO FOTOGRÁFICO AUTOMÁTICO (SEÇÕES DE FOTOS)
 * Serve TODAS as seções de fotos (Contratados, Internos, Complementos): busca,
 * na pasta do Drive configurada em fotosServicos[chave] (01_Config.gs), a
 * subpasta do mês de referência (ex.: "06-JUNHO") e, dentro dela, uma subpasta
 * por serviço com as fotos. Gera um slide por serviço, usando o nome da própria
 * subpasta como manchete.
 *
 * (O nome do arquivo é herdado de quando só existia a seção Contratados —
 * mantido para não duplicar declarações no editor do Apps Script.)
 *
 * DESIGN — prancha fotográfica sobre parede clara. As fotos são diagramadas
 * por um MOSAICO JUSTIFICADO: cada foto recebe um retângulo com a proporção
 * dela mesma, então não há letterbox, corte nem distorção. O nome do serviço é
 * a manchete. Sem rótulos de painel — eles existiam no template manual
 * (Slide_RegistroFotos.gs) só para guiar quem preenchia à mão, e aqui a
 * geração é automática.
 *
 * Dois arranjos, escolhidos pela largura final do mosaico:
 *   ▸ A — fotos largas: manchete no topo, mosaico ocupando a largura toda.
 *   ▸ B — fotos estreitas (1-2 retratos): coluna de texto fixa à esquerda e as
 *         fotos, bem maiores, centralizadas no espaço restante.
 *
 * Sem pasta configurada, sem pasta do mês ou sem nenhum serviço com foto:
 * cai de volta no slide manual de colar foto por foto (gerarSlideRegistroFotos),
 * sem quebrar a geração.
 */

// Paleta e medidas (ver comentário de design acima).
// A página é CLARA de propósito: a placa navy da primeira versão competia com
// as fotos pela atenção. Ela só existia para fazer o letterbox das fotos em
// retrato parecer proposital — e o mosaico justificado eliminou o letterbox,
// então a justificativa caiu junto. Parede clara de galeria: as fotos passam a
// ser a única coisa saturada da página.
const SC_ACENTO     = '#065CA9';  // brandLight — legível sobre fundo claro
const SC_TITULO_COR = '#151E49';  // brandDark
const SC_LINHA_COR  = '#E2E8F0';  // divisor
const SC_KEYLINE    = '#CBD5E1';  // filete em volta de cada foto
const SC_RODAPE_COR = '#94A3B8';
const SC_TAG_BORDA  = '#93C5FD';
const SC_TAG_COR    = '#003D7B';
const SC_GAP        = 10;      // respiro entre fotos do mosaico
// Banda A (padrão): mosaico ocupa a largura toda, texto no topo.
const SC_A = { x: 44, y: 138, w: 632, h: 240 };
// Zona B (fotos estreitas): texto em coluna FIXA à esquerda e as fotos com todo
// o resto, centralizadas na zona. A primeira versão fazia o contrário — a
// coluna de texto era a sobra do que as fotos não usavam —, então quanto menor
// a foto, maior o vazio à esquerda: com 1 foto sobravam 387pt de coluna para
// duas palavras. Agora o texto tem largura fixa e a foto é a protagonista.
const SC_B = { x: 272, y: 72, w: 418, h: 328 };
const SC_B_TEXTO_W = 190;
// Abaixo desta largura final o mosaico fica "perdido" na banda A → usa a B.
const SC_LIMIAR_B   = 400;
const SC_ESCADA_A   = [18, 16.5, 15, 13.5, 12, 11, 10];
const SC_ESCADA_B   = [24, 21, 18, 16, 14, 12];

// Pontos de entrada por seção. A chave casa com PROJETOS[cidade].fotosServicos
// (01_Config.gs); o rótulo é o que aparece no cabeçalho do slide.
function gerarSlidesServicosContratados_() { return gerarSlidesFotosDrive_('SERVIÇOS CONTRATADOS', 'CONTRATADOS'); }
function gerarSlidesServicosInternos_()    { return gerarSlidesFotosDrive_('SERVIÇOS INTERNOS',    'INTERNOS');    }
function gerarSlidesComplementos_()        { return gerarSlidesFotosDrive_('COMPLEMENTOS',         'COMPLEMENTOS'); }

function gerarSlidesFotosDrive_(secao, chavePasta) {
  const projeto = getProjetoAtivo();
  let pastaId = (projeto.fotosServicos || {})[chavePasta];

  // Compatibilidade com a config antiga (campo único, só de Contratados). Os
  // arquivos são colados à mão no editor do Apps Script e é fácil esquecer um
  // — sem isto, um 01_Config.gs desatualizado derrubava Contratados para o
  // slide manual sem dizer o porquê.
  if (!pastaId && chavePasta === 'CONTRATADOS' && projeto.servicosContratadosPastaId) {
    pastaId = projeto.servicosContratadosPastaId;
    Logger.log('Aviso (' + secao + '): 01_Config.gs está na versão anterior. ' +
               'Cole o 01_Config.gs atualizado para habilitar Internos e Complementos.');
  }

  if (!pastaId) {
    Logger.log(secao + ': pasta não configurada para ' + projeto.nome + ' — usando slide manual. ' +
               '(Se você já configurou, confira se o 01_Config.gs colado no Apps Script é o atual: ' +
               'a seção precisa existir em fotosServicos.)');
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
    Logger.log('Aviso (' + secao + '): erro ao acessar a pasta do Drive. ' + e.message);
  }

  if (!pastaMes) {
    Logger.log(secao + ': pasta do mês de referência não encontrada em ' + projeto.nome + ' — usando slide manual.');
    return gerarSlideRegistroFotos(secao);
  }
  if (servicos.length === 0) {
    Logger.log(secao + ': nenhum serviço com fotos encontrado para o mês — usando slide manual.');
    return gerarSlideRegistroFotos(secao);
  }

  servicos.forEach((pastaServico, i) => _scGerarSlideServico_(secao, pastaServico, i + 1, servicos.length));
  Logger.log(secao + ': ' + servicos.length + ' slide(s) gerado(s) automaticamente a partir do Drive (' + pastaMes.getName() + ').');
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
  return max ? arquivos.slice(0, max) : arquivos;
}

// ── Normalização do nome da pasta → manchete + tag ────────────────────────
// A entrada é nome de pasta cru, sem controle editorial. Extrai o parêntese
// final (ex.: "(PAGO POR SHOPEE)") como tag de governança e limpa o resto.
function _scNormalizarNome_(raw) {
  let nome = String(raw || '')
    // Extensão colada por engano no nome da pasta. Lista fechada de propósito:
    // um /\.[a-z0-9]{2,4}$/ genérico comia final legítimo ("BLOCO A.10" → "BLOCO A").
    .replace(/\.(jpe?g|png|gif|webp|heic|bmp|tiff?|pdf|zip)$/i, '')
    .replace(/^\s*\d{1,3}\s*[-–—.)_]\s*/, '')     // prefixo de ordenação "01 - "
    .replace(/_+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const m   = nome.match(/\(([^)]{2,40})\)\s*$/);
  const tag = m ? m[1].toUpperCase().trim() : '';
  if (m) nome = nome.replace(/\s*\([^)]*\)\s*$/, '').trim();

  nome = nome
    .replace(/\s+-\s+/g, ' — ')                        // hífen solto → travessão
    .replace(/\b(DE|DA|DO|DAS|DOS)\s+\1\b/gi, '$1')    // "DE DE" duplicado
    .toUpperCase();

  // Teto de 2 linhas no menor corpo da escada A — acima disso nem encolhendo cabe.
  if (nome.length > 180) nome = nome.substring(0, 179).trim() + '…';
  return { nome: nome, tag: tag };
}

// Maior corpo da escada que faz o texto caber em maxLinhas.
// Largura útil real = boxW - 14 (os 7pt de recuo interno de cada lado).
function _scCorpoTexto_(len, boxW, escada, maxLinhas) {
  const util = (boxW - 14) * 0.96 * (maxLinhas || 1);
  for (let i = 0; i < escada.length; i++) {
    if (0.64 * escada[i] * len <= util) return escada[i];
  }
  return escada[escada.length - 1];
}

// Manchete do layout A: prefere UMA linha; se nem o menor corpo couber, aceita
// duas linhas (a caixa tem h=40, que comporta 2 linhas até ~15pt) em vez de
// truncar o nome do serviço — nome de serviço truncado perde informação real.
function _scCorpoManchete_(len) {
  const umaLinha = _scCorpoTexto_(len, 626, SC_ESCADA_A, 1);
  if (0.64 * umaLinha * len <= (626 - 14) * 0.96) return umaLinha;
  return _scCorpoTexto_(len, 626, SC_ESCADA_A.filter(c => c <= 15), 2);
}

// ── MOSAICO JUSTIFICADO ───────────────────────────────────────────────────
// Enumera todas as composições CONTÍGUAS das n fotos (preserva a ordem
// cronológica: antes/durante/depois importa) em duas orientações — linhas
// justificadas em largura (ROW) e colunas justificadas em altura (COL) — e
// escolhe a que melhor preenche a banda. Como cada retângulo sai da proporção
// da própria foto, não sobra faixa dentro de nenhum slot.
function _scComposicoes_(n) {
  const res = [], cortes = n - 1;
  for (let mask = 0; mask < (1 << cortes); mask++) {
    const grupos = [];
    let atual = 1;
    for (let i = 0; i < cortes; i++) {
      if (mask & (1 << i)) { grupos.push(atual); atual = 1; } else { atual++; }
    }
    grupos.push(atual);
    res.push(grupos);
  }
  return res;
}

function _scArranjoRow_(ars, grupos, BW, BH, G) {
  const linhas = [];
  let idx = 0, usada = 0;
  for (let j = 0; j < grupos.length; j++) {
    const sub = ars.slice(idx, idx + grupos[j]); idx += grupos[j];
    const somaAr = sub.reduce((a, b) => a + b, 0);
    const h = (BW - (sub.length - 1) * G) / somaAr;
    if (h <= 0) return null;
    linhas.push({ h: h, ars: sub });
    usada += h;
  }
  usada += (grupos.length - 1) * G;
  const s = Math.min(1, BH / usada);
  return { tipo: 'ROW', grupos: linhas, usada: usada, s: s,
           score: Math.min(usada, BH) / Math.max(usada, BH) };
}

function _scArranjoCol_(ars, grupos, BW, BH, G) {
  const colunas = [];
  let idx = 0, usada = 0;
  for (let j = 0; j < grupos.length; j++) {
    const sub = ars.slice(idx, idx + grupos[j]); idx += grupos[j];
    const somaInv = sub.reduce((a, b) => a + 1 / b, 0);
    const w = (BH - (sub.length - 1) * G) / somaInv;
    if (w <= 0) return null;
    colunas.push({ w: w, ars: sub });
    usada += w;
  }
  usada += (grupos.length - 1) * G;
  const s = Math.min(1, BW / usada);
  return { tipo: 'COL', grupos: colunas, usada: usada, s: s,
           score: Math.min(usada, BW) / Math.max(usada, BW) };
}

// Devolve { rects: [{x,y,w,h}] relativos a (0,0), usedW, usedH }.
function _scMosaico_(ars, BW, BH, G) {
  let melhor = null;
  _scComposicoes_(ars.length).forEach(grupos => {
    [_scArranjoRow_(ars, grupos, BW, BH, G), _scArranjoCol_(ars, grupos, BW, BH, G)]
      .forEach(cand => {
        if (!cand) return;
        if (!melhor) { melhor = cand; return; }
        if (cand.score > melhor.score + 1e-9) { melhor = cand; return; }
        // Empate: ROW antes de COL, depois menos grupos.
        if (Math.abs(cand.score - melhor.score) <= 1e-9) {
          if (melhor.tipo === 'COL' && cand.tipo === 'ROW') melhor = cand;
          else if (cand.tipo === melhor.tipo && cand.grupos.length < melhor.grupos.length) melhor = cand;
        }
      });
  });
  if (!melhor) return { rects: [], usedW: 0, usedH: 0 };

  const s = melhor.s, g = G * s, rects = [];
  let usedW, usedH;

  if (melhor.tipo === 'ROW') {
    usedW = BW * s;
    usedH = melhor.usada * s;
    let y = 0;
    melhor.grupos.forEach(linha => {
      const h = linha.h * s;
      let x = 0;
      linha.ars.forEach(ar => {
        const w = ar * h;
        rects.push({ x: x, y: y, w: w, h: h });
        x += w + g;
      });
      y += h + g;
    });
  } else {
    usedW = melhor.usada * s;
    usedH = BH * s;
    let x = 0;
    melhor.grupos.forEach(coluna => {
      const w = coluna.w * s;
      let y = 0;
      coluna.ars.forEach(ar => {
        const h = w / ar;
        rects.push({ x: x, y: y, w: w, h: h });
        y += h + g;
      });
      x += w + g;
    });
  }
  return { rects: rects, usedW: usedW, usedH: usedH };
}

// ── Medição das fotos (insere e lê a proporção natural) ───────────────────
// insertImage(blob) — sobrecarga de 1 argumento — preserva a proporção natural,
// então dá para medir ANTES de diagramar. Fotos que falham são descartadas da
// lista, e o mosaico é calculado só sobre as sobreviventes (3 fotos com 1 falha
// viram um layout correto de 2, não um layout de 3 com buraco).
function _scMedirFotos_(slide, arquivos) {
  const fotos = [];
  arquivos.forEach(file => {
    let img = null;
    try {
      img = slide.insertImage(file.getBlob());
      const w = img.getWidth(), h = img.getHeight();
      if (!w || !h) { img.remove(); return; }
      const ar = w / h;
      fotos.push({ img: img, ar: Math.min(2.2, Math.max(0.5, ar)) });  // clamp de outliers
    } catch (e) {
      Logger.log('Aviso (fotos): falha ao inserir foto "' + file.getName() + '". ' + e.message);
      if (img) { try { img.remove(); } catch (e2) {} }
    }
  });
  return fotos;
}

function _scPosicionar_(img, r) {
  img.setWidth(r.w).setHeight(r.h).setLeft(r.x).setTop(r.y);
  // Keyline: filete de impressão que assenta a foto sobre a página clara.
  try {
    img.getBorder().setWeight(0.75).getLineFill().setSolidFill(SC_KEYLINE);
  } catch (e) {
    Logger.log('Aviso (fotos): keyline não aplicado. ' + e.message);
  }
}

// ── Blocos de texto da placa ──────────────────────────────────────────────
function _scTexto_(slide, x, y, w, h, txt, corpo, cor, fonte, negrito, alinh, meio) {
  const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  t.getText().setText(txt).getTextStyle()
    .setFontSize(corpo).setBold(!!negrito).setForegroundColor(cor).setFontFamily(fonte);
  t.getText().getParagraphStyle().setParagraphAlignment(alinh || SlidesApp.ParagraphAlignment.START);
  if (meio) t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  return t;
}

function _scTag_(slide, texto, x, y) {
  // Largura da pílula pelo comprimento do texto; a caixa de texto ganha 10pt
  // de folga de cada lado (recuo interno do TEXT_BOX quebraria a linha).
  const pw = Math.max(58, Math.min(200, 16 + 4.3 * texto.length));
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, pw, 16);
  pill.getFill().setSolidFill('#FFFFFF');
  pill.getBorder().setWeight(0.75).getLineFill().setSolidFill(SC_TAG_BORDA);
  _scTexto_(slide, x - 10, y, pw + 20, 16, texto, 7, SC_TAG_COR,
            CR_DESIGN_SYSTEM.typography.body, true, SlidesApp.ParagraphAlignment.CENTER, true);
  return pw;
}

// ── Slide de um serviço ────────────────────────────────────────────────────
function _scGerarSlideServico_(secao, pastaServico, indice, total) {
  const deck  = getDeckAtivo();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(CORES.bgSlide);
  const DS  = CR_DESIGN_SYSTEM;
  const ref = obterMesReferencia_();
  const projeto = getProjetoAtivo();

  criarHeaderPadrao(slide, secao, projeto.nome + ' · ' + ref.curto + ' / ' + ref.ano);

  const info = _scNormalizarNome_(pastaServico.getName());
  const nn   = String(indice).padStart(2, '0');
  const NN   = String(total).padStart(2, '0');

  // ── Fotos: mede primeiro, diagrama depois ───────────────────────────────
  const arquivos = _scListarFotos_(pastaServico, 4);
  const fotos    = _scMedirFotos_(slide, arquivos);
  const ars      = fotos.map(f => f.ar);

  let usarB = false, mos = null;
  if (ars.length) {
    mos = _scMosaico_(ars, SC_A.w, SC_A.h, SC_GAP);
    usarB = mos.usedW < SC_LIMIAR_B;
    if (usarB) mos = _scMosaico_(ars, SC_B.w, SC_B.h, SC_GAP);
  }

  const totalArquivos = _scListarFotos_(pastaServico).length;
  const rodape = projeto.nome.toUpperCase() + ' · FACILITIES · ' + ref.label +
    (totalArquivos > 4 ? ' · ' + totalArquivos + ' REGISTROS EM ARQUIVO' : '');

  if (!ars.length) {
    // Nenhuma foto carregou: placa ainda apresentável, só com o texto.
    _scTexto_(slide, 50, 178, 300, 13, 'SERVIÇO ' + nn + ' / ' + NN, 8.5, SC_ACENTO, DS.typography.body, true);
    _scTexto_(slide, 50, 192, 626, 40, info.nome, _scCorpoManchete_(info.nome.length),
              SC_TITULO_COR, DS.typography.titles, true, SlidesApp.ParagraphAlignment.START, true);
    _scTexto_(slide, 50, 384, 460, 14, rodape, 7.5, SC_RODAPE_COR, DS.typography.body);
    Logger.log('Slide de ' + secao + ' gerado SEM fotos (todas falharam): ' + info.nome);
    return;
  }

  if (usarB) {
    // ── LAYOUT B — fotos estreitas: coluna de texto fixa, fotos centralizadas ─
    const colW = SC_B_TEXTO_W;
    const px = SC_B.x + (SC_B.w - mos.usedW) / 2;
    const py = SC_B.y + (SC_B.h - mos.usedH) / 2;

    const filete = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 50, 104, 40, 2.5);
    filete.getFill().setSolidFill(SC_ACENTO);
    filete.getBorder().setTransparent();

    _scTexto_(slide, 50, 116, colW, 13, 'SERVIÇO ' + nn + ' / ' + NN, 8.5, SC_ACENTO, DS.typography.body, true);
    _scTexto_(slide, 50, 132, colW, 116, info.nome,
              _scCorpoTexto_(info.nome.length, colW, SC_ESCADA_B, 3.7),
              SC_TITULO_COR, DS.typography.titles, true);
    if (info.tag) _scTag_(slide, info.tag, 50, 258);

    fotos.forEach((f, i) => _scPosicionar_(f.img, {
      x: px + mos.rects[i].x, y: py + mos.rects[i].y, w: mos.rects[i].w, h: mos.rects[i].h
    }));

    // Rodapé sobe para dentro da coluna de texto: as fotos vão até y=400 e só
    // não colidem porque estão à direita de x=272.
    _scTexto_(slide, 50, 376, 200, 16, rodape, 7.5, SC_RODAPE_COR, DS.typography.body);
  } else {
    // ── LAYOUT A — padrão: texto no topo da placa, mosaico na largura toda ─
    const filete = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 44, 76, 3, 30);
    filete.getFill().setSolidFill(SC_ACENTO);
    filete.getBorder().setTransparent();

    _scTexto_(slide, 50, 74, 300, 13, 'SERVIÇO ' + nn + ' / ' + NN, 8.5, SC_ACENTO, DS.typography.body, true);
    if (info.tag) {
      const pw = Math.max(58, Math.min(200, 16 + 4.3 * info.tag.length));
      _scTag_(slide, info.tag, 676 - pw, 74);
    }
    _scTexto_(slide, 50, 88, 626, 38, info.nome, _scCorpoManchete_(info.nome.length),
              SC_TITULO_COR, DS.typography.titles, true, SlidesApp.ParagraphAlignment.START, true);

    const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 44, 128, 632, 0.75);
    div.getFill().setSolidFill(SC_LINHA_COR);
    div.getBorder().setTransparent();

    const px = SC_A.x + (SC_A.w - mos.usedW) / 2;
    const py = SC_A.y + (SC_A.h - mos.usedH) / 2;
    fotos.forEach((f, i) => _scPosicionar_(f.img, {
      x: px + mos.rects[i].x, y: py + mos.rects[i].y, w: mos.rects[i].w, h: mos.rects[i].h
    }));
    _scTexto_(slide, 50, 384, 460, 14, rodape, 7.5, SC_RODAPE_COR, DS.typography.body);
  }

  Logger.log('Slide de ' + secao + ' gerado (' + (usarB ? 'B' : 'A') + ', ' + ars.length + ' foto(s)): ' + info.nome);
}
