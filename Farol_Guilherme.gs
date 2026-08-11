/**
 * ARQUIVO: Farol_Guilherme.gs
 * DESCRIÇÃO: Gera o Farol de Metas de Planejamento & Gestão (Guilherme
 * August Padilha Marques) + 4 slides de detalhe, um por meta — para
 * apresentar ao gestor. Segue o mesmo design system (cores, tipografia,
 * componentes) usado nas apresentações mensais dos Megas.
 *
 * Este é um script AUTÔNOMO: não depende de nenhum outro arquivo do
 * projeto Apresentação Mensal Megas (essa apresentação de Farol de Metas
 * é um arquivo do Slides separado, não uma das 3 cidades).
 *
 * A apresentação de destino é FIXA por ID (constante FAROL_DECK_ID logo
 * abaixo) — não usa getActivePresentation(), então funciona rodando de
 * qualquer projeto Apps Script (vinculado ou avulso).
 *
 * COMO USAR:
 *   1. Em QUALQUER projeto Apps Script (pode ser avulso, script.google.com
 *      → Novo Projeto), cole este arquivo inteiro.
 *   2. Rode a função gerarFarolGuilherme() (▶ no topo do editor).
 *   3. Os 5 slides são adicionados no FIM da apresentação "Farol de Metas".
 *
 * SOBRE O LAYOUT: todo texto passa por _gUmaLinha_ (texto curto, nunca
 * quebra) ou _gParagrafo_ (bloco, encolhe até caber na altura). Os dois
 * medem o texto antes de desenhar, então nenhuma caixa estoura mesmo que
 * o conteúdo mude. Ver a seção "MEDIÇÃO DE TEXTO" e a skill
 * .claude/skills/slides-caixa-texto-sem-quebra.
 */

const DS_G = {
  colors: {
    brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9',
    brandSoft: '#E9F0FA',
    bgSlide: '#F6F8FC', white: '#FFFFFF',
    textMain: '#16213E', textBody: '#46516B', textMuted: '#8592AC',
    line: '#E4EAF3', lineStrong: '#CBD5E4',
    // *Bg = tom suave (fundo de card); *Solid = tom cheio (pill, bolinha,
    // farol). O par existe pra que fundo e sinal nunca briguem por atenção.
    amberBg: '#FDF1D2', amberInk: '#7A5B00', amberSolid: '#E5A417',
    greenBg: '#DEF4E9', greenInk: '#0B5C34', greenSolid: '#1E9E62',
    redBg: '#FCE8E8', redInk: '#8C1D1D', redSolid: '#D64545'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  // Logo Capital Realty (mesmo ID usado nas apresentações mensais dos Megas)
  logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', logoW: 112, logoH: 32
};

// Apresentação "Farol de Metas" — fixa por ID (não depende de o script
// estar vinculado ao arquivo nem de haver uma apresentação "ativa").
const FAROL_DECK_ID = '125XfdWiYis2J7nACFLxUVI5f0Tv6Zb85On74Nl2-LZI';

// Mês de referência do Farol. Fica num lugar só: o título do slide 1 e o
// calendário da Meta 2 (meses já decorridos) saem daqui.
const FAROL_MES_NOME = 'MAIO';
const FAROL_MES_NUM  = 5;

// Grade de layout — todos os slides respeitam as mesmas margens, então os
// blocos se alinham de um slide pro outro.
const G_MX  = 32;   // margem lateral
const G_TOP = 72;   // topo do conteúdo (logo abaixo do header)

// Fim da área de conteúdo e topo da faixa de rodapé, a partir da altura da
// página (funciona em 16:9 e 4:3).
function _gFimConteudo_(H) { return H - 55; }
function _gTopoRodape_(H)  { return H - 47; }

function gerarFarolGuilherme() {
  const deck = SlidesApp.openById(FAROL_DECK_ID);
  _gFarolSlideTabela(deck);
  _gFarolSlideMeta1(deck);
  _gFarolSlideMeta2(deck);
  _gFarolSlideMeta3(deck);
  _gFarolSlideMeta4(deck);
  Logger.log('Farol de Metas — Guilherme: 5 slides gerados no fim da apresentação.');
}


// ==========================================
// MEDIÇÃO DE TEXTO
// ==========================================
// A API do Slides não expõe métrica de fonte, então estimamos pela largura
// média do caractere. Montserrat é mais larga que Open Sans; negrito soma ~4%.
const _G_FATOR_FONTE = { 'Montserrat': 0.58, 'Open Sans': 0.52 };

// Recuo interno que toda TEXT_BOX tem e a API não deixa desligar (~7pt de
// cada lado). É ele que faz texto curto quebrar dentro de caixa estreita.
const _G_RECUO_TEXTBOX = 14;

function _gLarguraTexto_(texto, fs, fonte, bold) {
  const f = (_G_FATOR_FONTE[fonte] || 0.55) * (bold ? 1.04 : 1);
  return String(texto).length * fs * f;
}

function _gLinhasTexto_(texto, larguraCaixa, fs, fonte, bold) {
  const util = Math.max(12, larguraCaixa - _G_RECUO_TEXTBOX);
  return Math.max(1, Math.ceil(_gLarguraTexto_(texto, fs, fonte, bold) / util));
}

/**
 * Texto curto que TEM que caber numa linha só (valor de KPI, rótulo de
 * célula, pill de status, inicial de avatar). Duas defesas combinadas:
 *
 *   1) a caixa é desenhada mais larga que o espaço visível (folga simétrica
 *      quando centralizado, só à direita quando alinhado à esquerda). Como a
 *      TEXT_BOX não tem fundo nem borda — o retângulo/círculo visível é outra
 *      shape —, esticá-la não muda nada na aparência e devolve o recuo
 *      interno que o Slides tinha roubado;
 *   2) se ainda assim não couber, a fonte encolhe de 0,25 em 0,25 até caber
 *      (nunca abaixo de fsMin).
 *
 * Ver .claude/skills/slides-caixa-texto-sem-quebra.
 */
function _gUmaLinha_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;   // caixa vazia: estilizar lançaria "object has no text"

  const o = op || {};
  const fonte  = o.fonte || DS_G.typography.titles;
  const centro = o.align !== 'L';
  const folga  = o.folga === undefined ? 12 : o.folga;
  const fsMin  = o.fsMin || 6;
  let   fs     = o.fs === undefined ? 10 : o.fs;

  const bx = centro ? x - folga : x;
  const bw = centro ? w + folga * 2 : w + folga;

  const util = bw - _G_RECUO_TEXTBOX;
  while (fs > fsMin && _gLarguraTexto_(t, fs, fonte, o.bold) > util) fs -= 0.25;

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, bx, y, bw, h);
  box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || DS_G.colors.textMain).setFontFamily(fonte);
  box.getText().getParagraphStyle().setParagraphAlignment(
    centro ? SlidesApp.ParagraphAlignment.CENTER : SlidesApp.ParagraphAlignment.START);
  return box;
}

/**
 * Bloco de texto (frase, parágrafo). Pode ocupar várias linhas, mas encolhe
 * a fonte até o bloco caber na altura h — é isso que impede o texto de
 * transbordar o card quando o conteúdo cresce.
 */
function _gParagrafo_(slide, x, y, w, h, texto, op) {
  const t = (texto === null || texto === undefined) ? '' : String(texto);
  if (t === '') return null;

  const o = op || {};
  const fonte = o.fonte || DS_G.typography.body;
  const espac = o.espac || 122;
  const fsMin = o.fsMin || 6.5;
  let   fs    = o.fs === undefined ? 10 : o.fs;

  const alturaLinha = f => f * 1.2 * (espac / 100);
  while (fs > fsMin && _gLinhasTexto_(t, w, fs, fonte, o.bold) * alturaLinha(fs) > h) {
    fs -= 0.25;
  }

  const box = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x, y, w, h);
  if (o.meio) box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  box.getText().setText(t).getTextStyle()
    .setFontSize(fs).setBold(!!o.bold).setItalic(!!o.italic)
    .setForegroundColor(o.cor || DS_G.colors.textBody).setFontFamily(fonte);
  box.getText().getParagraphStyle()
    .setParagraphAlignment(o.align === 'C' ? SlidesApp.ParagraphAlignment.CENTER
                                           : SlidesApp.ParagraphAlignment.START)
    .setLineSpacing(espac);   // o Slides recusa espaçamento < 100
  return box;
}


// ==========================================
// HEADER E RODAPÉ PADRÃO
// ==========================================
function _gNovoSlide(deck) {
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS_G.colors.bgSlide);
  return slide;
}

// Título + "chips" de contexto (meta, pontos, direcionador, prazo). Os chips
// substituem a antiga linha de subtítulo corrida: cada informação vira uma
// pastilha do tamanho exato do seu texto.
function _gHeader(slide, W, titulo, chips) {
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX, 11, 5, 34);
  bar.getFill().setSolidFill(DS_G.colors.brandLight); bar.getBorder().setTransparent();

  // Largura do título limitada pela área do logo, pra nunca invadi-la.
  const tituloX = G_MX + 15;
  const tituloW = (W - G_MX - DS_G.logoW - 24) - tituloX;
  _gUmaLinha_(slide, tituloX, 8, tituloW, 26, titulo,
    { fs: 17, fsMin: 11, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 8 });

  let cx = tituloX;
  (chips || []).forEach(txt => {
    const w = _gLarguraTexto_(txt, 7.5, DS_G.typography.body, true) + 18;
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, 37, w, 15);
    pill.getFill().setSolidFill(DS_G.colors.brandSoft); pill.getBorder().setTransparent();
    _gUmaLinha_(slide, cx, 37, w, 15, txt,
      { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.brandMed,
        fonte: DS_G.typography.body, folga: 10 });
    cx += w + 6;
  });

  try {
    const logoBlob = DriveApp.getFileById(DS_G.logoId).getBlob();
    slide.insertImage(logoBlob, W - G_MX - DS_G.logoW, 14, DS_G.logoW, DS_G.logoH);
  } catch (e) {
    Logger.log('Aviso (Header): logo não carregado. ' + e.message);
  }

  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 60, W, 60);
  sep.getLineFill().setSolidFill(DS_G.colors.line); sep.setWeight(1);
  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, G_MX, 60, G_MX + 110, 60);
  acc.getLineFill().setSolidFill(DS_G.colors.brandLight); acc.setWeight(3);
}

// Faixa de "próximo passo" no pé do slide — presente nos 4 slides de meta,
// é o que fecha a leitura e dá o mesmo ritmo visual a todos eles.
function _gRodapeNota(slide, W, H, texto) {
  const y = _gTopoRodape_(H), h = 24;
  const faixa = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, G_MX, y, W - 2 * G_MX, h);
  faixa.getFill().setSolidFill(DS_G.colors.brandSoft); faixa.getBorder().setTransparent();
  const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX + 6, y + 5, 3, h - 10);
  acc.getFill().setSolidFill(DS_G.colors.brandLight); acc.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX + 18, y, W - 2 * G_MX - 32, h, texto,
    { fs: 8.6, fsMin: 6.5, italic: true, cor: DS_G.colors.brandMed,
      fonte: DS_G.typography.body, align: 'L', folga: 8 });
}


// ==========================================
// COMPONENTES REUTILIZÁVEIS
// ==========================================

// Card branco com borda fina e barra de acento à esquerda (base de quase
// tudo). Devolve o Y onde o conteúdo interno pode começar.
function _gCartao_(slide, x, y, w, h, corAcento, corFundo) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(corFundo || DS_G.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);
  if (corAcento) {
    const acc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 8, 4, h - 16);
    acc.getFill().setSolidFill(corAcento); acc.getBorder().setTransparent();
  }
  return y;
}

// Pastilha de status (texto curto, cor cheia, nunca quebra).
function _gPill_(slide, x, y, w, h, texto, corFundo, corTexto, fs) {
  const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  pill.getFill().setSolidFill(corFundo); pill.getBorder().setTransparent();
  _gUmaLinha_(slide, x, y, w, h, texto,
    { fs: fs || 6.8, fsMin: 5.5, bold: true, cor: corTexto || DS_G.colors.white,
      fonte: DS_G.typography.body, folga: 12 });
}

// Cartão de KPI: rótulo + valor em destaque + nota. O valor usa _gUmaLinha_,
// então "Em assinatura" (que antes quebrava em duas linhas) cabe inteiro.
function _gKPI(slide, x, y, w, h, label, valor, corInk, sub, corFundo, corAcento) {
  _gCartao_(slide, x, y, w, h, corAcento || corInk, corFundo);
  const px = x + 16, pw = w - 30;
  _gUmaLinha_(slide, px, y + 10, pw, 13, label,
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.textMuted, align: 'L', folga: 8 });
  _gUmaLinha_(slide, px, y + 25, pw, 26, valor,
    { fs: 17, fsMin: 10, bold: true, cor: corInk, align: 'L', folga: 8 });
  if (sub) {
    _gUmaLinha_(slide, px, y + h - 24, pw, 16, sub,
      { fs: 7.6, fsMin: 6, cor: DS_G.colors.textBody, fonte: DS_G.typography.body,
        align: 'L', folga: 8 });
  }
}

// Painel com barra de título colorida; devolve o Y onde o conteúdo começa.
function _gPainel(slide, x, y, w, h, titulo, cor) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(DS_G.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);

  const barH = 22;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, barH);
  bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();
  _gUmaLinha_(slide, x + 12, y, w - 24, barH, titulo,
    { fs: 8, fsMin: 6, bold: true, cor: DS_G.colors.white, align: 'L', folga: 8 });

  return y + barH + 10;
}

// Lista de itens com bolinha colorida. Cada item é uma linha só (encolhe se
// precisar), então nenhum texto vaza para fora do painel.
function _gChecklist(slide, itens, x, y, w, gap, cor) {
  itens.forEach((item, i) => {
    const cy = y + i * gap;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, cy + (gap - 7) / 2, 7, 7);
    dot.getFill().setSolidFill(cor || DS_G.colors.brandLight); dot.getBorder().setTransparent();
    _gUmaLinha_(slide, x + 13, cy, w - 13, gap, item,
      { fs: 8.4, fsMin: 6.2, cor: DS_G.colors.textMain, fonte: DS_G.typography.body,
        align: 'L', folga: 10 });
  });
}

// Linha do tempo: etapas concluídas em verde com ✓, a próxima em âmbar
// vazado, as demais em cinza claro.
// `limites` = {min, max} em X: os rótulos da primeira e da última etapa são
// centralizados na bolinha e, nas pontas, escapariam da margem do slide —
// aqui eles são encostados no limite em vez de vazar.
function _gTimelineCheck(slide, etapas, x, y, w, doneUntil, limites) {
  const n = etapas.length;
  const step = n > 1 ? w / (n - 1) : 0;
  const lim = limites || { min: G_MX, max: x + w + (x - G_MX) };
  const rail = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 11, w, 3);
  rail.getFill().setSolidFill(DS_G.colors.line); rail.getBorder().setTransparent();

  if (doneUntil >= 0 && n > 1) {
    const feito = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y + 11,
      Math.min(w, step * doneUntil), 3);
    feito.getFill().setSolidFill(DS_G.colors.greenSolid); feito.getBorder().setTransparent();
  }

  etapas.forEach((txt, i) => {
    const cx = x + step * i;
    const done = i <= doneUntil;
    const proximo = i === doneUntil + 1;
    const fundo = done ? DS_G.colors.greenSolid
                       : (proximo ? DS_G.colors.amberBg : DS_G.colors.white);

    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 12, y, 24, 24);
    dot.getFill().setSolidFill(fundo);
    if (done) {
      dot.getBorder().setTransparent();
    } else {
      dot.getBorder().setWeight(2).getLineFill()
        .setSolidFill(proximo ? DS_G.colors.amberSolid : DS_G.colors.lineStrong);
    }
    _gUmaLinha_(slide, cx - 12, y, 24, 24, done ? '✓' : String(i + 1),
      { fs: 9.5, fsMin: 7, bold: true,
        cor: done ? DS_G.colors.white : (proximo ? DS_G.colors.amberInk : DS_G.colors.textMuted),
        folga: 10 });

    const lw = Math.max(step - 8, 74);
    const lx = Math.min(Math.max(cx - lw / 2, lim.min), lim.max - lw);
    _gParagrafo_(slide, lx, y + 30, lw, 30, txt,
      { fs: 7.6, fsMin: 6.2, bold: done || proximo, align: 'C', espac: 108,
        cor: done || proximo ? DS_G.colors.textMain : DS_G.colors.textMuted });
  });
}


// ==========================================
// SLIDE 1 — FAROL DE METAS (TABELA)
// ==========================================
function _gFarolSlideTabela(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'FAROL DE METAS · ' + FAROL_MES_NOME,
    ['Planejamento & Gestão', 'Guilherme August Padilha Marques', 'Ciclo 2026']);

  const metas = [
    { desc: 'Plataforma de Utilities Mega Curitiba', pontos: 30, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Programa de Excelência 2026', pontos: 20, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Integração das Áreas — Facilities, Financeiro e Jurídico', pontos: 20, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Melhoria na Solicitação e Controle dos Reembolsos', pontos: 15, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' }
  ];

  // Larguras em fração da tabela (somam 1), pra tabela acompanhar a página.
  const totalW = W - 2 * G_MX;
  const fr = [0.262, 0.061, 0.104, 0.073, 0.061, 0.070, 0.070, 0.079, 0.070, 0.070, 0.080];
  const larg = fr.map(f => f * totalW);
  const xs = []; let acc = G_MX;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = G_TOP;

  // --- Barra de título ---
  const tituloH = 26;
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX, y, totalW, tituloH);
  barra.getFill().setSolidFill(DS_G.colors.brandMed); barra.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX, y, totalW, tituloH,
    'METAS GUILHERME AUGUST PADILHA MARQUES · PLANEJAMENTO & GESTÃO 2026',
    { fs: 11, fsMin: 8, bold: true, cor: DS_G.colors.white, folga: 12 });
  y += tituloH;

  // --- Cabeçalho das colunas ---
  const cabH = 28;
  const titulosCab = ['ANALISTA DE NEGÓCIOS', 'PONTOS', 'DIRECIONADOR', 'UNIDADE', 'SENTIDO',
    'META MÊS', 'REAL MÊS', 'STATUS', 'META ANO', 'REAL ANO', 'STATUS'];
  titulosCab.forEach((t, c) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], cabH);
    bg.getFill().setSolidFill(DS_G.colors.brandDark);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.white);
    // Antes "META MÊS"/"REAL ANO" quebravam em duas linhas nesta largura.
    _gUmaLinha_(slide, xs[c] + (c === 0 ? 12 : 2), y, larg[c] - (c === 0 ? 16 : 4), cabH, t,
      { fs: 7.5, fsMin: 5.8, bold: true, cor: DS_G.colors.white,
        align: c === 0 ? 'L' : 'C', folga: c === 0 ? 8 : 11 });
  });
  y += cabH;

  // --- Rodapé (legenda + pontuação) reserva o espaço antes das linhas ---
  const rodH = 30, rodY = H - 19 - rodH;
  const rowH = Math.max(22, Math.min(60, (rodY - 10 - y) / metas.length));

  metas.forEach((m, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS_G.colors.white : '#FAFCFF';
    const linha = [null, String(m.pontos), m.direc, m.unid, m.sent,
                   m.metaMes, m.realMes, null, m.metaAno, m.realAno, null];

    linha.forEach((val, c) => {
      const ehStatus = (c === 7 || c === 10);
      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      cell.getFill().setSolidFill(ehStatus ? DS_G.colors.amberBg : fundo);
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.line);

      if (ehStatus) {
        // Farol: pastilha de cor cheia, sem texto — a legenda do rodapé
        // explica o código de cores.
        const pw = larg[c] * 0.56, ph = 15;
        const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
          xs[c] + (larg[c] - pw) / 2, ry + (rowH - ph) / 2, pw, ph);
        pill.getFill().setSolidFill(DS_G.colors.amberSolid); pill.getBorder().setTransparent();
      } else if (c > 0) {
        _gUmaLinha_(slide, xs[c] + 2, ry, larg[c] - 4, rowH, val,
          { fs: 8, fsMin: 6.2, cor: DS_G.colors.textMain,
            fonte: DS_G.typography.body, folga: 11 });
      }
    });

    // Coluna da descrição: número da meta em badge + texto em até 2 linhas.
    const badge = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,
      xs[0] + 10, ry + (rowH - 18) / 2, 18, 18);
    badge.getFill().setSolidFill(DS_G.colors.brandLight); badge.getBorder().setTransparent();
    _gUmaLinha_(slide, xs[0] + 10, ry + (rowH - 18) / 2, 18, 18, String(i + 1),
      { fs: 9, fsMin: 7, bold: true, cor: DS_G.colors.white, folga: 10 });
    _gParagrafo_(slide, xs[0] + 34, ry, larg[0] - 40, rowH, m.desc,
      { fs: 8.4, fsMin: 6.4, bold: true, cor: DS_G.colors.textMain, espac: 112, meio: true });
  });

  // --- Rodapé: legenda do farol à esquerda, pontuação à direita ---
  _gCartao_(slide, G_MX, rodY, totalW, rodH, null);
  const legenda = [
    { cor: DS_G.colors.greenSolid, txt: 'Atingido' },
    { cor: DS_G.colors.amberSolid, txt: 'Em andamento' },
    { cor: DS_G.colors.redSolid,   txt: 'Não atingido' }
  ];
  let lx = G_MX + 16;
  _gUmaLinha_(slide, lx, rodY, 42, rodH, 'FAROL',
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.textMuted, align: 'L', folga: 8 });
  lx += 46;
  legenda.forEach(l => {
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, lx, rodY + (rodH - 9) / 2, 9, 9);
    dot.getFill().setSolidFill(l.cor); dot.getBorder().setTransparent();
    const tw = _gLarguraTexto_(l.txt, 8, DS_G.typography.body, false) + 6;
    _gUmaLinha_(slide, lx + 14, rodY, tw, rodH, l.txt,
      { fs: 8, fsMin: 6.5, cor: DS_G.colors.textBody, fonte: DS_G.typography.body,
        align: 'L', folga: 8 });
    lx += 14 + tw + 16;
  });

  const totalPontos = metas.reduce((s, m) => s + m.pontos, 0);
  const resumo = totalPontos + ' PONTOS POTENCIAIS · ' + metas.length + ' METAS EM ANDAMENTO';
  const rw = _gLarguraTexto_(resumo, 8.5, DS_G.typography.titles, true) + 28;
  _gPill_(slide, G_MX + totalW - rw - 10, rodY + (rodH - 20) / 2, rw, 20, resumo,
    DS_G.colors.brandMed, DS_G.colors.white, 8.5);

  Logger.log('Farol (tabela) gerado — ' + metas.length + ' metas, ' + totalPontos + ' pontos.');
}


// ==========================================
// SLIDE 2 — PLATAFORMA DE UTILITIES
// ==========================================
function _gFarolSlideMeta1(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Plataforma de Utilities — Mega Curitiba',
    ['Meta 1', '30 pontos', 'Direcionador Projetos', 'Prazo Novembro/26']);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  // --- Linha 1: três cartões de status ---
  const gapK = 14, kpiW = (contW - 2 * gapK) / 3, kpiH = 80;
  _gKPI(slide, G_MX, G_TOP, kpiW, kpiH, 'EQUIPAMENTOS', 'Entregues',
    DS_G.colors.greenInk, 'Já chegaram no Mega Curitiba', DS_G.colors.greenBg, DS_G.colors.greenSolid);
  _gKPI(slide, G_MX + kpiW + gapK, G_TOP, kpiW, kpiH, 'CONTRATO', 'Em assinatura',
    DS_G.colors.amberInk, 'Enviado — aguardando retorno', DS_G.colors.amberBg, DS_G.colors.amberSolid);
  _gKPI(slide, G_MX + 2 * (kpiW + gapK), G_TOP, kpiW, kpiH, 'ORÇAMENTOS', '2 de 3',
    DS_G.colors.amberInk, 'Golden Phone e Eletrobarras', DS_G.colors.amberBg, DS_G.colors.amberSolid);

  // --- Linha 2: resumo da situação ---
  const resY = G_TOP + kpiH + 12, resH = 46;
  _gCartao_(slide, G_MX, resY, contW, resH, DS_G.colors.brandLight);
  _gParagrafo_(slide, G_MX + 20, resY + 6, contW - 40, resH - 12,
    'Equipamentos entregues e contrato já enviado para assinatura. O que corre agora é a ' +
    'equalização dos orçamentos de instalação, para subir a compra com três propostas:',
    { fs: 10.5, fsMin: 8, cor: DS_G.colors.textBody, espac: 124, meio: true });

  // --- Linha 3: os três passos ---
  const steps = [
    { t: 'Orçamentos recebidos', d: 'Golden Phone e Eletrobarras já responderam com proposta.', cor: DS_G.colors.greenSolid },
    { t: 'Equalização em andamento', d: 'Levantando o 3º orçamento para subir a compra com as três propostas.', cor: DS_G.colors.amberSolid },
    { t: 'Assinatura do contrato', d: 'Contrato de instalação enviado — aguardando o retorno assinado.', cor: DS_G.colors.amberSolid }
  ];
  const gap = 16, stepY = resY + resH + 14, stepH = fim - stepY;
  const stepW = (contW - 2 * gap) / 3;

  steps.forEach((s, i) => {
    const x = G_MX + i * (stepW + gap);
    _gCartao_(slide, x, stepY, stepW, stepH, s.cor);
    _gUmaLinha_(slide, x + 18, stepY + 12, 60, 30, '0' + (i + 1),
      { fs: 24, fsMin: 16, bold: true, cor: DS_G.colors.lineStrong, align: 'L', folga: 8 });
    _gUmaLinha_(slide, x + 18, stepY + 46, stepW - 32, 18, s.t,
      { fs: 10.5, fsMin: 8, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 8 });
    _gParagrafo_(slide, x + 18, stepY + 68, stepW - 34, stepH - 80, s.d,
      { fs: 9.6, fsMin: 7.5, cor: DS_G.colors.textBody, espac: 124 });

    if (i < steps.length - 1) {
      _gUmaLinha_(slide, x + stepW, stepY + stepH / 2 - 12, gap, 24, '›',
        { fs: 18, fsMin: 12, bold: true, cor: DS_G.colors.lineStrong, folga: 8 });
    }
  });

  _gRodapeNota(slide, W, H,
    'Próximo passo: fechar o 3º orçamento, equalizar as propostas e destravar a instalação com o contrato assinado.');
  Logger.log('Farol — Meta 1 (Plataforma de Utilities) gerado.');
}


// ==========================================
// SLIDE 3 — PROGRAMA DE EXCELÊNCIA 2026
// ==========================================
function _gFarolSlideMeta2(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Programa de Excelência 2026',
    ['Meta 2', '20 pontos', 'Direcionador Projetos', 'Prazo Setembro/26']);

  const contW = W - 2 * G_MX;
  const gap = 16, colW = (contW - 2 * gap) / 3, rowH = 112;

  // Painel 1 — status geral
  let py = _gPainel(slide, G_MX, G_TOP, colW, rowH, 'STATUS GERAL', DS_G.colors.brandMed);
  _gParagrafo_(slide, G_MX + 14, py, colW - 28, G_TOP + rowH - py - 10,
    'Vencedor de 2025 divulgado. Book 2026 finalizado e submetido à aprovação da Gerência.',
    { fs: 9.2, fsMin: 7.4, cor: DS_G.colors.textBody, espac: 126 });

  // Painel 2 — próxima fase
  const x2 = G_MX + colW + gap;
  py = _gPainel(slide, x2, G_TOP, colW, rowH, 'PRÓXIMA FASE', DS_G.colors.brandMed);
  _gParagrafo_(slide, x2 + 14, py, colW - 28, G_TOP + rowH - py - 10,
    'Com o ok da Gerência: kick off do programa — envio digital e impressão física do book.',
    { fs: 9.2, fsMin: 7.4, cor: DS_G.colors.textBody, espac: 126 });

  // Painel 3 — calendário até o prazo (mês 09). Antes eram pastilhas "01..09";
  // com a sigla do mês a leitura é imediata e o bloco cabe no painel.
  const x3 = x2 + colW + gap;
  py = _gPainel(slide, x3, G_TOP, colW, rowH, 'PRAZO — SETEMBRO/26', DS_G.colors.brandLight);
  const siglas = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET'];
  const cellGap = 6, cellW = (colW - 28 - 2 * cellGap) / 3, cellH = 15;
  siglas.forEach((sig, i) => {
    const mes = i + 1;
    const col = i % 3, lin = Math.floor(i / 3);
    const cx = x3 + 14 + col * (cellW + cellGap), cy = py + lin * (cellH + 5);
    const prazo = mes === 9;
    const passado = mes <= FAROL_MES_NUM;
    const fundo = prazo ? DS_G.colors.amberSolid : (passado ? DS_G.colors.brandSoft : '#EEF2F9');
    const tinta = prazo ? DS_G.colors.white : (passado ? DS_G.colors.brandMed : DS_G.colors.textMuted);
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, cy, cellW, cellH);
    pill.getFill().setSolidFill(fundo); pill.getBorder().setTransparent();
    _gUmaLinha_(slide, cx, cy, cellW, cellH, sig,
      { fs: 6.8, fsMin: 5.5, bold: prazo || passado, cor: tinta, folga: 11 });
  });

  // Linha do tempo. A aprovação da Gerência ainda NÃO saiu (o alerta abaixo
  // diz isso), então as concluídas param no book finalizado — índice 1.
  const tlY = G_TOP + rowH + 26;
  _gTimelineCheck(slide,
    ['Vencedor 2025 divulgado', 'Book 2026 finalizado', 'Aprovação da Gerência',
     'Kick off — envio + impressão', 'Inspeção in loco'],
    G_MX + 66, tlY, contW - 132, 1, { min: G_MX, max: W - G_MX });

  const alertY = tlY + 76, alertH = 52;
  const alert = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, G_MX, alertY, contW, alertH);
  alert.getFill().setSolidFill(DS_G.colors.amberBg); alert.getBorder().setTransparent();
  const accA = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, G_MX, alertY + 8, 4, alertH - 16);
  accA.getFill().setSolidFill(DS_G.colors.amberSolid); accA.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX + 20, alertY + 8, contW - 40, 18, '⏱  DEPENDÊNCIA CRÍTICA',
    { fs: 8, fsMin: 6.5, bold: true, cor: DS_G.colors.amberInk, align: 'L', folga: 8 });
  _gUmaLinha_(slide, G_MX + 20, alertY + 26, contW - 40, 20,
    'O kick off depende do ok da Gerência — e a inspeção in loco precisa estar contabilizada até o MÊS 09.',
    { fs: 10, fsMin: 7.5, bold: true, cor: DS_G.colors.amberInk,
      fonte: DS_G.typography.body, align: 'L', folga: 8 });

  _gRodapeNota(slide, W, H,
    'Próximo passo: obter a aprovação da Gerência para liberar o kick off — envio digital e impressão do book.');
  Logger.log('Farol — Meta 2 (Programa de Excelência) gerado.');
}


// ==========================================
// SLIDE 4 — INTEGRAÇÃO DAS ÁREAS
// ==========================================
function _gFarolSlideMeta3(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Integração das Áreas',
    ['Meta 3', '20 pontos', 'Facilities · Financeiro · Jurídico', 'Prazo Novembro/26']);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  // Facilities é a área integradora: fica no topo, ligando-se às outras duas.
  const hubW = 320, hubH = 58, hubX = (W - hubW) / 2;
  const hpy = _gPainel(slide, hubX, G_TOP, hubW, hubH, 'FACILITIES · ÁREA INTEGRADORA', DS_G.colors.brandLight);
  _gParagrafo_(slide, hubX + 14, hpy, hubW - 28, G_TOP + hubH - hpy - 6,
    'Reúne os dados de Financeiro e Jurídico para consolidar a visão única de gestão.',
    { fs: 8.6, fsMin: 7, cor: DS_G.colors.textBody, espac: 120 });

  const gap = 20, colW = (contW - gap) / 2;
  const colY = G_TOP + hubH + 24, colH = fim - colY;

  // Linhas ligando o hub às duas colunas
  const lEsq = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    hubX + hubW * 0.28, G_TOP + hubH, G_MX + colW * 0.5, colY);
  lEsq.getLineFill().setSolidFill(DS_G.colors.lineStrong); lEsq.setWeight(1.5);
  const lDir = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
    hubX + hubW * 0.72, G_TOP + hubH, G_MX + colW + gap + colW * 0.5, colY);
  lDir.getLineFill().setSolidFill(DS_G.colors.lineStrong); lDir.setWeight(1.5);

  const _col = (x, corBg, corInk, corSolid, status, titulo, corpo, itens) => {
    _gCartao_(slide, x, colY, colW, colH, corSolid, corBg);

    const chipW = _gLarguraTexto_(status, 7, DS_G.typography.body, true) + 22;
    _gPill_(slide, x + 20, colY + 16, chipW, 16, status, corSolid, DS_G.colors.white, 7);
    _gUmaLinha_(slide, x + 20, colY + 38, colW - 40, 26, titulo,
      { fs: 17, fsMin: 12, bold: true, cor: corInk, align: 'L', folga: 8 });
    _gParagrafo_(slide, x + 20, colY + 68, colW - 40, 62, corpo,
      { fs: 10, fsMin: 8, cor: corInk, espac: 128 });

    const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT,
      x + 20, colY + 136, x + colW - 20, colY + 136);
    sep.getLineFill().setSolidFill(corSolid); sep.setWeight(1);
    _gChecklist(slide, itens, x + 20, colY + 144, colW - 40, 16, corSolid);
  };

  _col(G_MX, DS_G.colors.greenBg, DS_G.colors.greenInk, DS_G.colors.greenSolid,
    '✓ CONCLUÍDO', 'Financeiro',
    'A integração já foi realizada através da plataforma financeira dos Megas.',
    ['Dados de facilities e financeiro já conversam', 'Visão consolidada disponível na plataforma',
     'Sem pendências no fluxo']);

  _col(G_MX + colW + gap, DS_G.colors.amberBg, DS_G.colors.amberInk, DS_G.colors.amberSolid,
    '⏳ EM ANDAMENTO', 'Jurídico',
    'Formato de integração definido e rascunho montado — deixou de ser bloqueio.',
    ['Formato da integração definido', 'Rascunho da estrutura montado',
     'Primeira versão no ar até o fim do mês']);

  _gRodapeNota(slide, W, H,
    'Próximo passo: subir a primeira versão da integração com o Jurídico até o fim do mês e validar os dados com as três áreas.');
  Logger.log('Farol — Meta 3 (Integração das Áreas) gerado.');
}


// ==========================================
// SLIDE 5 — REEMBOLSOS
// ==========================================
function _gFarolSlideMeta4(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Solicitação e Controle de Reembolsos',
    ['Meta 4', '15 pontos', 'Direcionador Projetos', 'Prazo Novembro/26']);

  const contW = W - 2 * G_MX, fim = _gFimConteudo_(H);

  const pessoas = [
    { nome: 'Wilson', feito: true }, { nome: 'Cadu', feito: true }, { nome: 'Jonatas', feito: true },
    { nome: 'Ricardo', feito: true }, { nome: 'Ernani', feito: false }
  ];
  const feitos = pessoas.filter(p => p.feito).length;
  const pct = feitos / pessoas.length;

  // --- Faixa de progresso ---
  const bandH = 56;
  _gCartao_(slide, G_MX, G_TOP, contW, bandH, DS_G.colors.brandLight);
  _gUmaLinha_(slide, G_MX + 20, G_TOP + 10, 200, 14, 'ENTREVISTAS REALIZADAS',
    { fs: 7.5, fsMin: 6, bold: true, cor: DS_G.colors.textMuted, align: 'L', folga: 8 });
  // Altura ≥ corpo × 1,2, senão a linha única não cabe na vertical.
  _gUmaLinha_(slide, G_MX + 20, G_TOP + 25, 120, 24, feitos + ' de ' + pessoas.length,
    { fs: 19, fsMin: 13, bold: true, cor: DS_G.colors.brandMed, align: 'L', folga: 8 });

  const barX = G_MX + 168, barW = contW - 168 - 130, barY = G_TOP + (bandH - 12) / 2;
  const trilho = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, barX, barY, barW, 12);
  trilho.getFill().setSolidFill(DS_G.colors.line); trilho.getBorder().setTransparent();
  const prog = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, barX, barY,
    Math.max(16, barW * pct), 12);
  prog.getFill().setSolidFill(DS_G.colors.greenSolid); prog.getBorder().setTransparent();
  _gUmaLinha_(slide, G_MX + contW - 122, G_TOP, 105, bandH,
    Math.round(pct * 100) + '% concluído',
    { fs: 9.5, fsMin: 7.5, bold: true, cor: DS_G.colors.greenInk,
      fonte: DS_G.typography.body, folga: 10 });

  // --- Cartões das pessoas ---
  const cardY = G_TOP + bandH + 16, cardH = 62, gapP = 10;
  const cardW = (contW - (pessoas.length - 1) * gapP) / pessoas.length;

  pessoas.forEach((p, i) => {
    const x = G_MX + i * (cardW + gapP);
    const corSolid = p.feito ? DS_G.colors.greenSolid : DS_G.colors.textMuted;
    _gCartao_(slide, x, cardY, cardW, cardH, corSolid);

    const av = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 13, cardY + 15, 32, 32);
    av.getFill().setSolidFill(p.feito ? DS_G.colors.brandLight : DS_G.colors.textMuted);
    av.getBorder().setTransparent();
    _gUmaLinha_(slide, x + 13, cardY + 15, 32, 32, p.nome.charAt(0),
      { fs: 13, fsMin: 9, bold: true, cor: DS_G.colors.white, folga: 12 });

    _gUmaLinha_(slide, x + 52, cardY + 13, cardW - 60, 17, p.nome,
      { fs: 10.5, fsMin: 7.5, bold: true, cor: DS_G.colors.textMain, align: 'L', folga: 9 });
    // "✓ ENTREVISTADO" não cabia nesta largura e quebrava em duas linhas
    // (a 2ª ficava cortada) — a pastilha resolve com folga + auto-encolhe.
    _gPill_(slide, x + 52, cardY + 33, cardW - 64, 15,
      p.feito ? '✓ ENTREVISTADO' : 'PENDENTE',
      p.feito ? DS_G.colors.greenSolid : DS_G.colors.lineStrong,
      p.feito ? DS_G.colors.white : DS_G.colors.textBody, 6.5);
  });

  // --- Funil: concluído / pendente / apoio do RH ---
  const y2 = cardY + cardH + 22, gap2 = 16;
  const colW2 = (contW - 2 * gap2) / 3, panelH = fim - y2;

  let py = _gPainel(slide, G_MX, y2, colW2, panelH,
    '✓ CONCLUÍDO (' + feitos + ')', DS_G.colors.greenInk);
  _gChecklist(slide, pessoas.filter(p => p.feito).map(p => p.nome + ' entrevistado'),
    G_MX + 14, py + 2, colW2 - 28, 19, DS_G.colors.greenSolid);

  const x2b = G_MX + colW2 + gap2;
  py = _gPainel(slide, x2b, y2, colW2, panelH,
    '⏳ PENDENTE (' + (pessoas.length - feitos) + ')', DS_G.colors.amberInk);
  _gChecklist(slide, ['Ernani — única entrevista que falta', 'Agendamento com apoio do RH'],
    x2b + 14, py + 2, colW2 - 28, 19, DS_G.colors.amberSolid);

  const x3b = x2b + colW2 + gap2;
  py = _gPainel(slide, x3b, y2, colW2, panelH, 'PRÓXIMOS PASSOS', DS_G.colors.brandLight);
  _gChecklist(slide, ['Acionar o RH na próxima semana', 'RH faz a ponte com o Financeiro',
    'Consolidar aprendizados no novo fluxo'], x3b + 14, py + 2, colW2 - 28, 19, DS_G.colors.brandLight);

  _gRodapeNota(slide, W, H,
    'Próximo passo: acionar o RH na próxima semana para fechar a entrevista do Ernani e desenhar o novo fluxo de reembolsos.');
  Logger.log('Farol — Meta 4 (Reembolsos) gerado.');
}
