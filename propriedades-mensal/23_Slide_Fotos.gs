/**
 * ARQUIVO: 23_Slide_Fotos.gs
 * SLIDES — REGISTRO FOTOGRÁFICO das seções 04, 05 e 06, a partir do Drive.
 *
 * Pedido do Guilherme (10/11/2026): "falta o espaço para fotos" — automático,
 * igual aos Megas (megas-mensal/18_Slide_FotosServicos.gs, mesmo mosaico e
 * mesma regra de nome de pasta), nas seções Obras e Contratações, Vistorias e
 * Adequações de Clientes.
 *
 * Onde ficam as fotos (pasta FOTOS ao lado da PLANILHA PROPRIEDADES):
 *
 *   04 - PROPRIEDADES/FOTOS/
 *     04 - OBRAS E CONTRATAÇÕES/10 - OUTUBRO/01 - MEGA ESTEIO - Reparo do muro B2 (EM ANDAMENTO)/  fotos
 *     05 - VISTORIAS/10 - OUTUBRO/01 - FRIOZEM COLOMBO - Vistoria de rotina/                       fotos
 *     06 - ADEQUAÇÕES DE CLIENTES/10 - OUTUBRO/01 - MEGA ITAJAÍ - JBT térreo (APROVADO)/             fotos
 *
 * Um slide por pasta de serviço, até 4 fotos (as mais antigas primeiro). O
 * nome da pasta vira a legenda ("NN - " sai; o parêntese final vira etiqueta).
 * A pasta da seção é achada por palavra-chave (obras/contrat, vistori, adequa)
 * e a do mês pelo nome do mês. Pasta do mês que não existe é CRIADA vazia —
 * fica o lugar certo para pôr as fotos —, e a seção sai com um slide de
 * molduras vazias para colar à mão.
 *
 * Os slides vão para o FIM da própria seção: antes da capa da seção seguinte
 * (a 06 vai antes do encerramento).
 */

const FOTOS_SECOES = [
  // n = número da seção (SECOES_MENSAL); a ordem no deck vem de 24_OrdemDeck.gs.
  { n: 3, titulo: 'SERVIÇOS CONTRATADOS',    pasta: '03 - CONTRATAÇÕES E OBRAS',     chaves: ['obras', 'contrat'] },
  { n: 4, titulo: 'VISTORIAS',               pasta: '04 - VISTORIAS',                chaves: ['vistori'] },
  { n: 5, titulo: 'ADEQUAÇÕES DE CLIENTES',  pasta: '05 - ADEQUAÇÕES DE CLIENTES',   chaves: ['adequa'] }
];
const PF_MAX_FOTOS = 4;
const PF_KEYLINE   = '#CBD5E1';
const PF_TITULO    = '#151E49';
const PF_TAG_BORDA = '#93C5FD', PF_TAG_COR = '#003D7B';
const PF_GAP = 10, PF_LEGENDA_H = 40;
const PF_A = { x: 44, y: 74, w: 632, h: 280 };    // fotos largas: largura toda
const PF_B = { x: 110, y: 74, w: 500, h: 280 };   // 1-2 retratos: mais estreito
const PF_LIMIAR_B = 400;
const PF_ESCADA = [18, 16.5, 15, 13.5, 12, 11, 10];
const PF_MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO',
                  'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function _fotosTag_(n) { return '【PROP_FOTOS_' + ('0' + n).slice(-2) + '_AUTO】'; }

function gerarSlidesFotos() {
  FOTOS_SECOES.forEach(sec => {
    try { _fotosSecao_(sec); }
    catch (e) { Logger.log('Fotos ' + sec.titulo + ': falhou — ' + e.message); }
  });
}

function _fotosSecao_(sec) {
  const deck = getDeckMensal_();
  const ref  = obterMesReferencia_();
  _slideLimpar_(deck, _fotosTag_(sec.n));

  const pastaMes = _fotosPastaMes_(sec, ref);
  const servicos = pastaMes ? _fotosServicos_(pastaMes).filter(p => _fotosListar_(p, 1).length) : [];
  const novos = [];
  if (servicos.length) {
    servicos.forEach(p => novos.push(_fotosSlideServico_(deck, sec, ref, p)));
  } else {
    novos.push(_fotosSlideVazio_(deck, sec, ref));
    Logger.log('Fotos ' + sec.titulo + ': nenhuma foto em "' + (pastaMes ? pastaMes.getName() : '—') +
               '" — slide de molduras vazias para colar à mão.');
  }
  _fotosPosicionar_(deck, sec, novos);
  Logger.log('✓ Fotos ' + sec.titulo + ': ' + novos.length + ' slide(s).');
}

// ── Pastas ────────────────────────────────────────────────────────────────
function _fotosRaiz_() {
  const pais = DriveApp.getFileById(DRE_MANUTENCAO_ID).getParents();
  while (pais.hasNext()) {
    const it = pais.next().getFoldersByName('FOTOS');
    if (it.hasNext()) return it.next();
  }
  throw new Error('pasta FOTOS não encontrada ao lado da PLANILHA PROPRIEDADES');
}

// A pasta do mês da seção; cria a da seção e a do mês se faltarem.
function _fotosPastaMes_(sec, ref) {
  const raiz = _fotosRaiz_();
  let pastaSec = null;
  const it = raiz.getFolders();
  while (it.hasNext() && !pastaSec) {
    const f = it.next(), nome = _histNorm_(f.getName());
    if (sec.chaves.some(k => nome.indexOf(k) >= 0)) pastaSec = f;
  }
  if (!pastaSec) pastaSec = raiz.createFolder(sec.pasta);

  const alvo = _histNorm_(PF_MESES[ref.index]);
  const meses = pastaSec.getFolders();
  while (meses.hasNext()) {
    const f = meses.next();
    if (_histNorm_(f.getName()).indexOf(alvo) >= 0) return f;
  }
  const nova = pastaSec.createFolder(('0' + (ref.index + 1)).slice(-2) + ' - ' + PF_MESES[ref.index]);
  Logger.log('Fotos ' + sec.titulo + ': criei "' + pastaSec.getName() + '/' + nova.getName() + '" — ponha as fotos lá.');
  return nova;
}

function _fotosServicos_(pastaMes) {
  const it = pastaMes.getFolders(), lista = [];
  while (it.hasNext()) lista.push(it.next());
  return lista.sort((a, b) => a.getName().localeCompare(b.getName(), 'pt-BR'));
}

function _fotosListar_(pasta, max) {
  const it = pasta.getFiles(), arqs = [];
  while (it.hasNext()) {
    const f = it.next();
    if (String(f.getMimeType()).indexOf('image/') === 0) arqs.push(f);
  }
  arqs.sort((a, b) => a.getDateCreated() - b.getDateCreated());
  return max ? arqs.slice(0, max) : arqs;
}

// "01 - MEGA ESTEIO - Reparo do muro B2 (EM ANDAMENTO)" → legenda + etiqueta.
// Mesma regra de megas-mensal/_scNormalizarNome_.
function _fotosNome_(raw) {
  let nome = String(raw || '')
    .replace(/\.(jpe?g|png|gif|webp|heic|bmp|tiff?|pdf|zip)$/i, '')
    .replace(/^\s*\d{1,3}\s*[-–—.)_]\s*/, '')
    .replace(/_+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const m = nome.match(/\(([^)]{2,40})\)\s*$/);
  const tag = m ? m[1].toUpperCase().trim() : '';
  if (m) nome = nome.replace(/\s*\([^)]*\)\s*$/, '').trim();
  nome = nome.replace(/\s+-\s+/g, ' — ').replace(/\b(DE|DA|DO|DAS|DOS)\s+\1\b/gi, '$1').toUpperCase();
  if (nome.length > 180) nome = nome.substring(0, 179).trim() + '…';
  return { nome: nome, tag: tag };
}

// ── Slides ────────────────────────────────────────────────────────────────
function _fotosSlideServico_(deck, sec, ref, pasta) {
  const DS = CR_DESIGN_SYSTEM;
  const W = deck.getPageWidth();
  const slide = _slideNovo_(deck, _fotosTag_(sec.n), sec.titulo, 'Propriedades · ' + ref.curto + ' / ' + ref.ano);
  const info = _fotosNome_(pasta.getName());
  if (info.tag) _fotosEtiqueta_(slide, info.tag, W - DS.layout.marginX - DS.logoW - 12);

  const fotos = [];
  _fotosListar_(pasta, PF_MAX_FOTOS).forEach(f => {
    let img = null;
    try {
      img = slide.insertImage(f.getBlob());
      const w = img.getWidth(), h = img.getHeight();
      if (!w || !h) { img.remove(); return; }
      fotos.push({ img: img, ar: Math.min(2.2, Math.max(0.5, w / h)) });
    } catch (e) {
      Logger.log('Fotos: falha ao inserir "' + f.getName() + '" — ' + e.message);
      if (img) { try { img.remove(); } catch (e2) {} }
    }
  });

  _fotosTexto_(slide, PF_A.x, PF_A.y + PF_A.h + 8, PF_A.w, PF_LEGENDA_H - 8, info.nome,
               _fotosCorpo_(info.nome.length), PF_TITULO, DS.typography.titles, true);

  if (fotos.length) {
    let zona = PF_A, mos = _fotosFileira_(fotos.map(f => f.ar), PF_A.w, PF_A.h);
    if (mos.usedW < PF_LIMIAR_B) { zona = PF_B; mos = _fotosFileira_(fotos.map(f => f.ar), PF_B.w, PF_B.h); }
    const px = zona.x + (zona.w - mos.usedW) / 2, py = zona.y + (zona.h - mos.usedH) / 2;
    fotos.forEach((f, i) => {
      const r = mos.rects[i];
      f.img.setWidth(r.w).setHeight(r.h).setLeft(px + r.x).setTop(py + r.y);
      try { f.img.getBorder().setWeight(0.75).getLineFill().setSolidFill(PF_KEYLINE); } catch (e) {}
    });
  }
  return slide;
}

// Uma fileira, todas as fotos na MESMA altura (a regra que o time aprovou nos
// Megas). Encolhe tudo se a fileira passar da altura da banda.
function _fotosFileira_(ars, BW, BH) {
  const soma = ars.reduce((a, b) => a + b, 0);
  let h = (BW - (ars.length - 1) * PF_GAP) / soma;
  const s = Math.min(1, BH / h);
  h *= s;
  const g = PF_GAP * s, rects = [];
  let x = 0;
  ars.forEach(ar => { rects.push({ x: x, y: 0, w: ar * h, h: h }); x += ar * h + g; });
  return { rects: rects, usedW: x - g, usedH: h };
}

// Sem fotos no mês: 3 molduras tracejadas e a legenda para preencher à mão.
function _fotosSlideVazio_(deck, sec, ref) {
  const DS = CR_DESIGN_SYSTEM;
  const slide = _slideNovo_(deck, _fotosTag_(sec.n), sec.titulo, 'Propriedades · ' + ref.curto + ' / ' + ref.ano);
  const gap = 12, w = (PF_A.w - 2 * gap) / 3;
  for (let i = 0; i < 3; i++) {
    const x = PF_A.x + i * (w + gap);
    const ph = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, PF_A.y + 20, w, PF_A.h - 40);
    ph.getFill().setSolidFill(DS.colors.bgSlide);
    ph.getBorder().setDashStyle(SlidesApp.DashStyle.DASH).setWeight(1).getLineFill().setSolidFill(PF_KEYLINE);
    _fotosTexto_(slide, x, PF_A.y + 20, w, PF_A.h - 40, '[ FOTO ' + (i + 1) + ' ]', 9, PF_KEYLINE, DS.typography.titles, true);
  }
  _fotosTexto_(slide, PF_A.x, PF_A.y + PF_A.h + 8, PF_A.w, PF_LEGENDA_H - 8,
               '[ IMÓVEL — SERVIÇO ]', 14, '#94A3B8', DS.typography.titles, true);
  return slide;
}

function _fotosTexto_(slide, x, y, w, h, txt, corpo, cor, fonte, negrito) {
  const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  t.getText().setText(txt).getTextStyle().setFontSize(corpo).setBold(!!negrito).setForegroundColor(cor).setFontFamily(fonte);
  t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  return t;
}

function _fotosEtiqueta_(slide, texto, xDireita) {
  const pw = Math.max(58, Math.min(200, 16 + 4.3 * texto.length)), x = xDireita - pw, y = 16;
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, pw, 16);
  pill.getFill().setSolidFill('#FFFFFF');
  pill.getBorder().setWeight(0.75).getLineFill().setSolidFill(PF_TAG_BORDA);
  _fotosTexto_(slide, x - 10, y, pw + 20, 16, texto, 7, PF_TAG_COR, CR_DESIGN_SYSTEM.typography.body, true);
}

// Maior corpo que cabe em 1 linha; senão aceita 2 linhas (nunca trunca o nome).
function _fotosCorpo_(len) {
  const util = (PF_A.w - 14) * 0.96;
  for (let i = 0; i < PF_ESCADA.length; i++) if (0.64 * PF_ESCADA[i] * len <= util) return PF_ESCADA[i];
  const dois = PF_ESCADA.filter(c => c <= 15);
  for (let i = 0; i < dois.length; i++) if (0.64 * dois[i] * len <= util * 2) return dois[i];
  return dois[dois.length - 1];
}

// Fim da seção: antes da capa da seção seguinte (a última, antes do encerramento).
function _fotosPosicionar_(deck, sec, novos) {
  try {
    const prox = SECOES_MENSAL.filter(s => s.n === sec.n + 1)[0];
    let alvo = prox ? _capasAcharSecao_(deck, prox) : null;
    if (!alvo) {
      alvo = deck.getSlides().filter(s => {
        try { return s.getNotesPage().getSpeakerNotesShape().getText().asString().indexOf(TAG_ENCERRAMENTO) >= 0; }
        catch (e) { return false; }
      })[0] || null;
    }
    if (!alvo) return;   // fica no fim
    novos.forEach(s => s.move(_capasIndice_(deck, alvo)));
  } catch (e) {
    Logger.log('Fotos ' + sec.titulo + ': não consegui posicionar (' + e.message + '); fica no fim.');
  }
}

function gerarSoFotos() {
  return _rodarPassos_([{ nome: 'Fotos (04, 05, 06)', fn: gerarSlidesFotos }]);
}
