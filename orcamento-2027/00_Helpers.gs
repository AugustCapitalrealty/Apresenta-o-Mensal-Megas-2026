/**
 * ARQUIVO: 00_Helpers.gs
 * SEÇÃO:   NÚCLEO — Helpers de texto, formatação e desenho
 * DESCRIÇÃO: Tudo que os slides usam para medir texto, formatar dinheiro e
 *            desenhar cabeçalho, rodapé e o aviso de falha.
 */

// ==========================================
// TEXTO E NÚMEROS
// ==========================================

// Compara nomes vindos da planilha: tira acento, troca o espaço não-quebrável
// (a planilha grava "manutenção imóveis") e ignora caixa.
function _orcNorm_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/ /g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

// getValues() devolve número; o fallback cobre célula digitada como texto
// no formato brasileiro ("-1.234,56") e no contábil, com o negativo entre
// parênteses ("(1.234,56)") — os relatórios da controladoria usam esse.
function _orcNum_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v);
  const n = parseFloat(s.replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.'));
  if (!isFinite(n)) return 0;
  return /^\s*\(.*\)\s*$/.test(s) ? -Math.abs(n) : n;
}

function _orcMilhar_(n) {
  const r = Math.round(n);
  return (r < 0 ? '-' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// R$ 1.417.219
function _orcMoeda_(v) {
  return 'R$ ' + _orcMilhar_(v);
}

// R$ 1,42 mi | R$ 302 mil | R$ 7,5 mil | R$ 900
function _orcCompacto_(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return 'R$ ' + (v / 1e6).toFixed(2).replace('.', ',') + ' mi';
  if (a >= 1e4) return 'R$ ' + Math.round(v / 1e3) + ' mil';
  if (a >= 1e3) return 'R$ ' + (v / 1e3).toFixed(1).replace('.', ',') + ' mil';
  return 'R$ ' + Math.round(v);
}

function _orcPct_(p) {
  return (p * 100).toFixed(1).replace('.', ',') + '%';
}

// Em que meses o item tem valor: "JAN–DEZ", "ABR–JUN", "MAI · NOV", "5 meses".
function _orcQuando_(meses) {
  const idx = [];
  meses.forEach((v, i) => { if (Math.abs(v) > 0.005) idx.push(i); });
  if (!idx.length) return '—';
  if (idx.length === 1) return ORC_MESES[idx[0]];
  const ult = idx[idx.length - 1];
  if (ult - idx[0] + 1 === idx.length) return ORC_MESES[idx[0]] + '–' + ORC_MESES[ult];
  if (idx.length === 2) return idx.map(i => ORC_MESES[i]).join(' · ');   // três salteados não cabem na coluna
  return idx.length + ' meses';
}

// ==========================================
// MEDIÇÃO DE TEXTO
// ==========================================
// A API do Slides não expõe métrica de fonte, então estimamos pela largura
// média do caractere (mesmo método de megas-mensal/Farol_Guilherme.gs).
const _ORC_FATOR_FONTE = { 'Montserrat': 0.58, 'Open Sans': 0.52 };

// Recuo interno que toda TEXT_BOX tem e a API não deixa desligar (~7pt de
// cada lado). É ele que faz texto curto quebrar dentro de caixa estreita.
const _ORC_RECUO_TEXTBOX = 14;

// Peso de cada caractere sobre a largura média da fonte. Maiúscula é ~30%
// mais larga: com uma média só, a descrição em caixa alta ("IMPLANTAÇÃO ÁREA
// DE PAISAGISMO…") parecia caber, e o Slides quebrava a linha dentro da
// célula. Espaço e pontuação são estreitos.
const _ORC_PESO_MAIUSCULA = 1.3;
function _orcPesoCaractere_(ch) {
  if (ch === ' ') return 0.5;
  if (/[.,;:'|!iIl]/.test(ch)) return 0.55;
  if (/[A-ZÀ-ÖØ-Þ]/.test(ch)) return _ORC_PESO_MAIUSCULA;
  if (/[0-9]/.test(ch)) return 1.1;
  return 1;
}

function _orcLarguraTexto_(texto, fs, fonte, bold) {
  const f = (_ORC_FATOR_FONTE[fonte] || 0.55) * (bold ? 1.04 : 1);
  let u = 0;
  for (const ch of String(texto)) u += _orcPesoCaractere_(ch);
  return u * fs * f;
}

function _orcLinhasTexto_(texto, larguraCaixa, fs, fonte, bold) {
  const util = Math.max(12, larguraCaixa - _ORC_RECUO_TEXTBOX);
  return Math.max(1, Math.ceil(_orcLarguraTexto_(texto, fs, fonte, bold) / util));
}

/**
 * Texto que TEM que caber numa linha (valor, rótulo de célula, pill).
 *   1) a caixa é desenhada mais larga que o espaço visível (folga simétrica
 *      quando centralizado, só à direita quando alinhado à esquerda, e só à
 *      esquerda quando alinhado à direita) — a TEXT_BOX não tem fundo, então
 *      esticá-la não aparece e devolve o recuo interno;
 *   2) se ainda não couber, a fonte encolhe até fsMin;
 *   3) com op.cortar, o que sobrar em fsMin é cortado com reticências.
 * Com op.aba (descrição longa de tabela), o texto passa antes pela planilha
 * de textos (06_TextosTabelas.gs) e o resultado fica registrado para ela;
 * op.original é a chave quando o texto vem montado ("item · R$ 200 mil").
 * Ver .claude/skills/slides-caixa-texto-sem-quebra.
 */
function _orcUmaLinha_(slide, x, y, w, h, texto, op) {
  let t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"

  const o = op || {};
  const original = o.aba ? String(o.original || t) : null;
  if (o.aba && !o.original) t = _orcTextoEscolhido_(o.aba, t);
  const fonte = o.fonte || CR_DESIGN_SYSTEM.typography.titles;
  const align = o.align || 'C';
  const folga = o.folga === undefined ? 12 : o.folga;
  const fsMin = o.fsMin || 6;
  let   fs    = o.fs === undefined ? 10 : o.fs;

  let bx = x, bw = w;
  if (align === 'C') { bx = x - folga; bw = w + folga * 2; }
  else if (align === 'L') { bw = w + folga; }
  else { bx = x - folga; bw = w + folga; }

  // A folga vence o recuo; o que decide se cabe é a largura VISÍVEL. Centrado,
  // o texto pode ocupar w inteiro; alinhado a um lado, o recuo (~7pt) desse
  // lado continua valendo. Nunca mais que o miolo útil da caixa.
  const util = Math.min(bw - _ORC_RECUO_TEXTBOX, align === 'C' ? w : w - _ORC_RECUO_TEXTBOX / 2);
  while (fs > fsMin && _orcLarguraTexto_(t, fs, fonte, o.bold) > util) fs -= 0.25;
  if (o.cortar && _orcLarguraTexto_(t, fs, fonte, o.bold) > util) {
    while (t.length > 4 && _orcLarguraTexto_(t + '…', fs, fonte, o.bold) > util) t = t.slice(0, -1);
    t = t.replace(/[\s\-–·,]+$/, '') + '…';
  }
  if (o.aba) {
    // "Cabe até" é da descrição: o que vem montado depois dela (op.sufixo,
    // " · R$ 200 mil") ocupa parte da célula.
    const fator = (_ORC_FATOR_FONTE[fonte] || 0.55) * (o.bold ? 1.04 : 1);
    const livre = util - (o.sufixo ? _orcLarguraTexto_(o.sufixo, fs, fonte, o.bold) : 0);
    _orcRegistrarTexto_(o.aba, original, t, Math.max(0, Math.floor(livre / (fs * fator * _ORC_PESO_MAIUSCULA))));
  }

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, y, bw, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || CR_DESIGN_SYSTEM.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
      : align === 'R' ? SlidesApp.ParagraphAlignment.END
      : SlidesApp.ParagraphAlignment.START);
  return box;
}

/**
 * Bloco de texto que pode ocupar várias linhas, mas encolhe a fonte até caber
 * na altura h — impede o texto de transbordar o card quando o conteúdo cresce.
 */
function _orcParagrafo_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;

  const o = op || {};
  const fonte = o.fonte || CR_DESIGN_SYSTEM.typography.body;
  const espac = o.espac || 115;
  const fsMin = o.fsMin || 6.5;
  let   fs    = o.fs === undefined ? 10 : o.fs;

  const alturaLinha = f => f * 1.2 * (espac / 100);
  while (fs > fsMin && _orcLinhasTexto_(t, w, fs, fonte, o.bold) * alturaLinha(fs) > h) fs -= 0.25;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  if (o.meio) box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || CR_DESIGN_SYSTEM.colors.textBody).setFontFamily(fonte);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(o.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
                                           : SlidesApp.ParagraphAlignment.START)
    .setLineSpacing(espac);   // o Slides recusa espaçamento < 100
  return box;
}

// ==========================================
// FORMAS
// ==========================================
function _orcRet_(slide, x, y, w, h, cor, op) {
  const o = op || {};
  // Card (arredondado, branco ou escuro da marca, de 60×30 pt para cima): vai
  // para a moldura do slide em vez de virar forma agora (_orcFecharMoldura_).
  if (_ORC_MOLD && !o.semMoldura && o.redondo && o.alpha === undefined && w >= 60 && h >= 30 &&
      (cor === CR_DESIGN_SYSTEM.colors.cardBg || cor === CR_DESIGN_SYSTEM.colors.brandDark)) {
    _ORC_MOLD.cards.push({ x: x, y: y, w: w, h: h, cor: cor, borda: o.borda || null, peso: o.borda ? (o.peso || 0.75) : 0 });
    return null;
  }
  const s = slide.insertShape(o.redondo ? SlidesApp.ShapeType.ROUND_RECTANGLE : SlidesApp.ShapeType.RECTANGLE,
                              x, y, Math.max(0.5, w), Math.max(0.5, h));
  if (cor) s.getFill().setSolidFill(cor, o.alpha === undefined ? 1 : o.alpha);
  else s.getFill().setTransparent();
  if (o.borda) { s.getBorder().getLineFill().setSolidFill(o.borda); s.getBorder().setWeight(o.peso || 0.75); }
  else s.getBorder().setTransparent();
  return s;
}

function _orcLinha_(slide, x1, y1, x2, y2, cor, peso) {
  const l = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x1, y1, x2, y2);
  l.getLineFill().setSolidFill(cor);
  l.setWeight(peso || 0.75);
  return l;
}

// Card branco com borda fina e rótulo em caixa alta no topo.
function _orcCard_(slide, x, y, w, h, rotulo) {
  const DS = CR_DESIGN_SYSTEM;
  _orcRet_(slide, x, y, w, h, DS.colors.cardBg, { redondo: true, borda: DS.colors.lines });
  if (rotulo) {
    _orcUmaLinha_(slide, x + 12, y + 6, w - 24, 16, rotulo.toUpperCase(),
      { align: 'L', fs: 7.5, bold: true, cor: DS.colors.textBody, fonte: DS.typography.titles, cortar: true });
  }
}

// ==========================================
// SLIDE PADRÃO: fundo, cabeçalho e rodapé
// ==========================================
// Cores, nome e logos da marca do Mega (ORC_MARCAS, 01_Config.gs); sem cid,
// volta à Capital Realty.
function _orcAplicarMarca_(cid) {
  const base = ORC_MARCAS.CAPITAL, m = ORC_MARCAS[(cid && cid.marca) || 'CAPITAL'] || base;
  Object.assign(CR_DESIGN_SYSTEM.colors, base.colors, m.colors || {});
  Object.assign(CR_DESIGN_SYSTEM.typography, base.typography, m.typography || {});
  CR_DESIGN_SYSTEM.marca = Object.assign({}, base.marca, m.marca || {}, { trilha: m.trilha || base.trilha });
  Object.assign(LOGOS_CR, base.logos, m.logos || {});
}

// Blob de um logo de LOGOS_CR: ID do Drive ou "pasta:<nome>" na pasta das
// imagens de slide.
function _orcLogoBlob_(qual) {
  const v = LOGOS_CR[qual];
  if (/^pasta:/.test(v)) {
    const b = _orcImagemDaPasta_(v.slice(6));
    if (!b) throw new Error('logo "' + v.slice(6) + '" não está na pasta ' + ORC_PASTA_IMAGENS);
    return b;
  }
  return _orcBlobDrive_(v);
}

// Trilha de progresso no topo do slide (07/10/2026): imagem "TRILHA -
// <MARCA> - nn.png" da pasta ORC_PASTA_IMAGENS (ferramentas/trilha_imagem.py),
// com as seções até a atual coloridas e as futuras em cinza. Só no deck com as
// 8 seções e dentro de uma seção (_ORC_TRILHA = número da seção, 0 fora).
let _ORC_TRILHA = 0;
function _orcTrilhaTopo_(slide, W, secao) {
  if (!secao) return;
  const b = _orcImagemDaPasta_(CR_DESIGN_SYSTEM.marca.trilha + ' - ' + ('0' + secao).slice(-2) + '.png');
  if (b) slide.insertImage(b).setLeft(0).setTop(0).setWidth(W).setHeight(W * 32 / 1920);
}

function _orcNovoSlide_(deck) {
  // No deck único de Facilities (25_Facilities.gs) o slide entra na posição da
  // parte que está sendo gerada e o ID vai para a lista dela.
  const slide = _ORC_UNICO ? deck.insertSlide(_ORC_UNICO.indice++, SlidesApp.PredefinedLayout.BLANK)
                           : deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  if (_ORC_UNICO) {
    const id = slide.getObjectId();
    _ORC_UNICO.ids.push(id);
    if (_ORC_UNICO.alvo) { _ORC_LINKS.alvos[_ORC_UNICO.alvo] = id; _ORC_UNICO.alvo = null; }
  }
  slide.getBackground().setSolidFill(CR_DESIGN_SYSTEM.colors.bgSlide);
  return slide;
}

function _orcHeader_(slide, W, titulo, subtitulo) {
  const DS = CR_DESIGN_SYSTEM;
  const MX = DS.layout.marginX;
  // Com a moldura: barra, trilha e linha vão para a imagem do fundo.
  if (_ORC_MOLD) { _ORC_MOLD.header = true; _ORC_MOLD.secao = _ORC_TRILHA; }
  else _orcCabecalhoFundo_(slide, W, _ORC_TRILHA);
  const serifa = DS.typography.heading !== DS.typography.titles;   // a serifa é menor no mesmo corpo
  _orcUmaLinha_(slide, MX + 14, 12, W - MX * 2 - 150, 26, titulo,
    { align: 'L', fs: serifa ? 22 : 19, bold: true, cor: DS.colors.brandDark, fonte: DS.typography.heading, fsMin: 12, cortar: true });
  if (subtitulo) {
    _orcUmaLinha_(slide, MX + 14, 36, W - MX * 2 - 150, 18, subtitulo,
      { align: 'L', fs: 9.5, cor: DS.colors.textBody, fonte: DS.typography.body, fsMin: 7, cortar: true });
  }
  // Logo no canto direito. Se a imagem não carregar, o cabeçalho segue sem ela.
  try {
    const img = slide.insertImage(_orcLogoBlob_('fullPositivo'));
    const h = 24, w = h * img.getWidth() / img.getHeight();
    img.setWidth(w).setHeight(h).setLeft(W - MX - w).setTop(20);
  } catch (e) {
    Logger.log('Cabeçalho: logo indisponível. ' + e.message);
  }
}

// O fundo do cabeçalho em formas: barra de destaque, trilha de progresso e
// linha de baixo (o que a moldura traz pronto).
function _orcCabecalhoFundo_(slide, W, secao) {
  const DS = CR_DESIGN_SYSTEM, MX = DS.layout.marginX;
  _orcRet_(slide, MX, 16, 5, 36, DS.colors.brandLight);
  _orcTrilhaTopo_(slide, W, secao);
  _orcLinha_(slide, MX, DS.layout.headerH, W - MX, DS.layout.headerH, DS.colors.lines, 1);
}

// ==========================================
// MOLDURA DO SLIDE (v2)
// ==========================================
// _orcPasso_ abre a coleta antes de desenhar o slide e fecha depois: os cards
// e o cabeçalho anotados viram UMA imagem de fundo (se ela existir na pasta)
// ou as formas de sempre, mandadas para trás do conteúdo.
let _ORC_MOLD = null;
let _ORC_MOLDURAS_USADAS = {};   // assinatura → especificação (o teste grava o manifesto)
let _ORC_MOLDURAS_PASSOS = [];   // [marca, passo, assinatura], na ordem (conferência no teste)

function _orcAbrirMoldura_() {
  _ORC_MOLD = ORC_USAR_MOLDURAS ? { cards: [], header: false, secao: 0 } : null;
}

// Especificação da moldura em texto ASCII (a assinatura é o MD5 dele): marca,
// seção da trilha, cabeçalho e os cards em pt com uma casa.
function _orcSpecMoldura_(m, W, H) {
  const r = v => Math.round(v * 10) / 10;
  return JSON.stringify({ v: 1, W: r(W), H: r(H), marca: CR_DESIGN_SYSTEM.marca.trilha.replace('TRILHA - ', ''),
    bg: CR_DESIGN_SYSTEM.colors.bgSlide, cor: CR_DESIGN_SYSTEM.colors.brandLight, linhas: CR_DESIGN_SYSTEM.colors.lines,
    header: m.header ? 1 : 0, secao: m.header ? m.secao : 0, nsec: Object.keys(ORC_SUBCAPAS).length,
    cards: m.cards.map(c => [r(c.x), r(c.y), r(c.w), r(c.h), c.cor, c.borda || '', c.peso]) });
}

function _orcAssinatura_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, texto, Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').slice(0, 12);
}

function _orcFecharMoldura_(slide, W, H) {
  const m = _ORC_MOLD;
  _ORC_MOLD = null;
  if (!m || (!m.header && !m.cards.length)) return;
  try {
    const spec = _orcSpecMoldura_(m, W, H), assin = _orcAssinatura_(spec);
    _ORC_MOLDURAS_USADAS[assin] = spec;
    _ORC_MOLDURAS_PASSOS.push([CR_DESIGN_SYSTEM.marca.nome, _ORC_SLIDE_ATUAL, assin]);
    const img = _orcImagemDaPasta_('MOLDURA - ' + assin + '.png');
    if (img) {
      slide.insertImage(img).setLeft(0).setTop(0).setWidth(W).setHeight(H).sendToBack();
      return;
    }
  } catch (e) {
    Logger.log('Moldura não aplicada (vão as formas): ' + e.message);
  }
  // Sem a imagem: as formas de antes, atrás do conteúdo (de trás para a
  // frente, para o primeiro card ficar no fundo).
  const DS = CR_DESIGN_SYSTEM;
  m.cards.slice().reverse().forEach(c => {
    const s = _orcRet_(slide, c.x, c.y, c.w, c.h, c.cor, { redondo: true, borda: c.borda, peso: c.peso || undefined, semMoldura: true });
    s.sendToBack();
  });
  if (m.header) _orcCabecalhoFundo_(slide, W, m.secao);
}

// ==========================================
// IMAGENS DO DRIVE (uma vez por geração)
// ==========================================
// Blob de um arquivo do Drive, baixado UMA vez por geração (_orcGerar_ zera
// _ORC_BLOBS): o logo do cabeçalho entra em quase todo slide. A falha também
// fica guardada e é relançada, para o chamador cair no caminho sem imagem sem
// pedir de novo. reduzir = foto de fundo: a miniatura de 1600 px do Drive no
// lugar do original — fotos de câmera têm vários MB e, nas 8 sub capas,
// levaram a geração de Curitiba a 5,5 min e ao "Service timed out" (07/10/2026).
let _ORC_BLOBS = {};
function _orcBlobDrive_(id, reduzir) {
  const k = id + (reduzir ? '@1600' : '');
  if (!(k in _ORC_BLOBS)) {
    try { _ORC_BLOBS[k] = { blob: reduzir ? _orcFotoReduzida_(id) : DriveApp.getFileById(id).getBlob() }; }
    catch (e) { _ORC_BLOBS[k] = { erro: e }; }
  }
  if (_ORC_BLOBS[k].erro) throw _ORC_BLOBS[k].erro;
  return _ORC_BLOBS[k].blob;
}

// Miniatura de 1600 px pela API do Drive (thumbnailLink termina em "=s220";
// troca pelo tamanho que queremos). Se algo falhar, o arquivo original.
function _orcFotoReduzida_(id) {
  try {
    const cab = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
    const meta = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id +
                                   '?fields=thumbnailLink,size,name&supportsAllDrives=true', cab);
    if (meta.getResponseCode() !== 200) throw new Error('metadados HTTP ' + meta.getResponseCode());
    const m = JSON.parse(meta.getContentText());
    if (!m.thumbnailLink) throw new Error('o Drive não tem miniatura');
    const resp = UrlFetchApp.fetch(m.thumbnailLink.replace(/=s\d+$/, '=s1600'), cab);
    const b = resp.getBlob(), tipo = String(b.getContentType() || '');
    if (resp.getResponseCode() !== 200 || !/^image\/(png|jpeg|gif)$/.test(tipo)) {
      throw new Error('miniatura HTTP ' + resp.getResponseCode() + ' ' + tipo);
    }
    Logger.log('Foto ' + (m.name || id) + ': ' + (m.size ? (m.size / 1048576).toFixed(1).replace('.', ',') + ' MB' : '?') +
               ' → ' + Math.round(b.getBytes().length / 1024) + ' KB');
    return b;
  } catch (e) {
    Logger.log('Foto ' + id + ': sem versão reduzida (' + e.message + '), vai o original.');
    return DriveApp.getFileById(id).getBlob();
  }
}

function _orcRodape_(slide, W, H, texto) {
  const DS = CR_DESIGN_SYSTEM;
  _orcUmaLinha_(slide, DS.layout.marginX, H - 20, W - DS.layout.marginX * 2, 14, texto,
    { align: 'L', fs: 7, cor: DS.colors.textMuted, fonte: DS.typography.body, cortar: true });
}

// Aviso de falha desenhado NO slide. Usa só insertShape e CR_DESIGN_SYSTEM:
// se dependesse das helpers acima, quebraria junto com elas e o slide
// voltaria a ficar vazio sem ninguém perceber.
function _orcSlideFalha_(slide, W, H, titulo, erro) {
  const DS = CR_DESIGN_SYSTEM;
  const caixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 40, 60, W - 80, H - 120);
  caixa.getFill().setSolidFill('#FEF2F2');
  caixa.getBorder().getLineFill().setSolidFill(DS.colors.accentRed);
  caixa.getBorder().setWeight(1.5);
  const msg = (erro && erro.message) ? erro.message : String(erro);
  const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, 56, 72, W - 112, H - 144);
  t.getText().setText('Falha ao gerar: ' + titulo + '\n\n' + msg);
  t.getText().getTextStyle().setFontSize(11).setForegroundColor('#991B1B').setFontFamily(DS.typography.body);
  Logger.log('FALHA [' + titulo + ']: ' + msg + (erro && erro.stack ? '\n' + erro.stack : ''));
}
