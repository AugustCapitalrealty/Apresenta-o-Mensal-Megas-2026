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
 * COMO USAR:
 *   1. Abra a apresentação "Farol de Metas" no Google Slides (a mesma que
 *      já tem as abas dos outros analistas, no mesmo layout do print).
 *   2. Extensões → Apps Script → cole este arquivo inteiro num arquivo novo.
 *   3. Rode a função gerarFarolGuilherme() (▶ no topo do editor).
 *   4. Os 5 slides são adicionados no FIM da apresentação ativa.
 */

const DS_G = {
  colors: {
    brandDark: '#151E49', brandMed: '#003D7B', brandLight: '#065CA9',
    bgSlide: '#F8FAFC', white: '#FFFFFF',
    textMain: '#16213E', textBody: '#46516B', textMuted: '#8592AC',
    line: '#E2E8F1', lineStrong: '#C7D0E0',
    amberBg: '#FCE49A', amberInk: '#7A5B00',
    greenBg: '#A7E8C0', greenInk: '#0B5C34'
  },
  typography: { titles: 'Montserrat', body: 'Open Sans' },
  // Logo Capital Realty (mesmo ID usado nas apresentações mensais dos Megas)
  logoId: '1XzLbDtTYUTj0AIMuKUUyALJxC4MxU7z4', logoW: 112, logoH: 32
};

function gerarFarolGuilherme() {
  const deck = SlidesApp.getActivePresentation();
  _gFarolSlideTabela(deck);
  _gFarolSlideMeta1(deck);
  _gFarolSlideMeta2(deck);
  _gFarolSlideMeta3(deck);
  _gFarolSlideMeta4(deck);
  Logger.log('Farol de Metas — Guilherme: 5 slides gerados no fim da apresentação.');
}


// ==========================================
// HEADER PADRÃO (mesmo estilo das apresentações mensais dos Megas)
// ==========================================
function _gNovoSlide(deck) {
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS_G.colors.bgSlide);
  return slide;
}

function _gHeader(slide, W, titulo, subtitulo) {
  const mX = 30;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, mX, 13, 5, 36);
  bar.getFill().setSolidFill(DS_G.colors.brandLight); bar.getBorder().setTransparent();

  const t1 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 4, W - mX - 200, 34);
  t1.getText().setText(titulo).getTextStyle()
    .setFontSize(18).setBold(true).setForegroundColor(DS_G.colors.textMain).setFontFamily(DS_G.typography.titles);

  if (subtitulo) {
    const t2 = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, mX + 14, 36, W - mX - 200, 20);
    t2.getText().setText(subtitulo).getTextStyle()
      .setFontSize(9).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  }

  try {
    const logoBlob = DriveApp.getFileById(DS_G.logoId).getBlob();
    slide.insertImage(logoBlob, W - mX - DS_G.logoW, 14, DS_G.logoW, DS_G.logoH);
  } catch (e) {
    Logger.log('Aviso (Header): logo não carregado. ' + e.message);
  }

  const sep = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, 0, 62, W, 62);
  sep.getLineFill().setSolidFill(DS_G.colors.line); sep.setWeight(1);
  const acc = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, mX, 62, mX + 110, 62);
  acc.getLineFill().setSolidFill(DS_G.colors.brandLight); acc.setWeight(3);
}


// ==========================================
// COMPONENTES REUTILIZÁVEIS (slides de detalhe)
// ==========================================

// Cartão de KPI curto: rótulo + valor em destaque + nota opcional.
function _gKPI(slide, x, y, w, h, label, valor, cor, sub, bgCor) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(bgCor || DS_G.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);

  const lb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14, y + 11, w - 28, 14);
  lb.getText().setText(label).getTextStyle()
    .setFontSize(7.5).setBold(true).setForegroundColor(DS_G.colors.textMuted).setFontFamily(DS_G.typography.titles);

  const vl = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14, y + 27, w - 28, 28);
  vl.getText().setText(valor).getTextStyle()
    .setFontSize(18).setBold(true).setForegroundColor(cor).setFontFamily(DS_G.typography.titles);

  if (sub) {
    const sb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14, y + h - 22, w - 28, 18);
    sb.getText().setText(sub).getTextStyle()
      .setFontSize(7.4).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  }
}

// Painel com barra de título colorida; devolve o Y onde o conteúdo pode começar.
function _gPainel(slide, x, y, w, h, titulo, cor) {
  const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(DS_G.colors.white);
  card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);

  const barH = 22;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, barH);
  bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();
  const bt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 12, y, w - 24, barH);
  bt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  bt.getText().setText(titulo).getTextStyle()
    .setFontSize(8).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS_G.typography.titles);

  return y + barH + 10;
}

// Lista de itens com bolinha colorida à esquerda.
function _gChecklist(slide, itens, x, y, w, gap, cor) {
  itens.forEach((item, i) => {
    const cy = y + i * gap;
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x, cy + 2, 8, 8);
    dot.getFill().setSolidFill(cor || DS_G.colors.brandLight); dot.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 14, cy - 3, w - 14, gap);
    t.getText().setText(item).getTextStyle()
      .setFontSize(8.4).setForegroundColor(DS_G.colors.textMain).setFontFamily(DS_G.typography.body);
    t.getText().getParagraphStyle().setLineSpacing(110);
  });
}

// Linha do tempo com checkmark nas etapas concluídas e destaque na próxima etapa.
function _gTimelineCheck(slide, etapas, x, y, w, doneUntil) {
  const n = etapas.length;
  const step = n > 1 ? w / (n - 1) : 0;
  const railY = y + 12;
  const rail = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, railY, w, 2);
  rail.getFill().setSolidFill(DS_G.colors.line); rail.getBorder().setTransparent();

  etapas.forEach((txt, i) => {
    const cx = x + step * i;
    const done = i <= doneUntil;
    const proximo = i === doneUntil + 1;
    const fundo = done ? DS_G.colors.brandLight : (proximo ? DS_G.colors.amberBg : DS_G.colors.white);

    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx - 12, y, 24, 24);
    dot.getFill().setSolidFill(fundo);
    dot.getBorder().setWeight(done ? 0 : 2).getLineFill().setSolidFill(proximo ? DS_G.colors.amberInk : DS_G.colors.lineStrong);

    const dt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx - 12, y, 24, 24);
    dt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    dt.getText().setText(done ? '✓' : String(i + 1)).getTextStyle()
      .setFontSize(9).setBold(true).setFontFamily(DS_G.typography.titles)
      .setForegroundColor(done ? '#FFFFFF' : (proximo ? DS_G.colors.amberInk : DS_G.colors.textMuted));
    dt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const lw = Math.max(step - 6, 70);
    const lb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx - lw / 2, y + 29, lw, 30);
    lb.getText().setText(txt).getTextStyle()
      .setFontSize(7.6).setBold(done || proximo).setFontFamily(DS_G.typography.body)
      .setForegroundColor(done || proximo ? DS_G.colors.textMain : DS_G.colors.textMuted);
    lb.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER).setLineSpacing(108);
  });
}


// ==========================================
// SLIDE 1 — FAROL DE METAS (TABELA)
// ==========================================
function _gFarolSlideTabela(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'FAROL DE METAS · MAIO', 'Planejamento & Gestão · Guilherme August Padilha Marques');

  const metas = [
    { desc: 'Plataforma de Utilities Mega Curitiba', pontos: 30, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Programa de Excelência 2026', pontos: 20, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Integração das Áreas — Facilities, Financeiro e Jurídico', pontos: 20, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' },
    { desc: 'Melhoria na Solicitação e Controle dos Reembolsos', pontos: 15, direc: 'Projetos', unid: 'SIM/NÃO', sent: '=', metaMes: 'SIM', realMes: 'NÃO', metaAno: 'SIM', realAno: 'NÃO' }
  ];

  const larg = [166, 46, 78, 56, 54, 44, 44, 50, 44, 44, 50];
  const totalW = larg.reduce((a, b) => a + b, 0);
  const x0 = Math.round((W - totalW) / 2);
  const xs = []; let acc = x0;
  larg.forEach(w => { xs.push(acc); acc += w; });

  let y = 72;

  // --- Barra de título ---
  const tituloH = 22;
  const barra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, y, totalW, tituloH);
  barra.getFill().setSolidFill(DS_G.colors.brandMed); barra.getBorder().setTransparent();
  const tBar = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0, y, totalW, tituloH);
  tBar.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tBar.getText().setText('METAS GUILHERME AUGUST PADILHA MARQUES · PLANEJAMENTO & GESTÃO 2026').getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS_G.typography.titles);
  tBar.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  y += tituloH;

  // --- Cabeçalho das colunas ---
  const cabH = 28;
  const titulosCab = ['ANALISTA DE NEGÓCIOS', 'Pontos', 'Direcionador', 'Unidade', 'Sentido',
    'Meta Mês', 'Real Mês', 'Status', 'Meta Ano', 'Real Ano', 'Status'];
  titulosCab.forEach((t, c) => {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], y, larg[c], cabH);
    bg.getFill().setSolidFill(DS_G.colors.brandDark);
    bg.getBorder().setWeight(1).getLineFill().setSolidFill('#FFFFFF');
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 2, y, larg[c] - 4, cabH);
    tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    tb.getText().setText(t).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS_G.typography.titles);
    tb.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
  });
  y += cabH;

  // --- Rodapé de pontuação (reserva espaço antes de calcular a altura das linhas) ---
  const resumoH = 26, resumoY = H - resumoH - 8;

  // --- Linhas de dados ---
  const n = metas.length;
  const dispH = resumoY - 6 - y;
  const rowH = Math.max(20, Math.min(48, Math.floor(dispH / n)));

  metas.forEach((m, i) => {
    const ry = y + i * rowH;
    const fundo = (i % 2 === 0) ? DS_G.colors.white : '#F8FAFC';
    const linha = [m.desc, String(m.pontos), m.direc, m.unid, m.sent, m.metaMes, m.realMes, 'Amarelo', m.metaAno, m.realAno, 'Amarelo'];

    linha.forEach((val, c) => {
      const ehStatus = (c === 7 || c === 10);
      const cell = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xs[c], ry, larg[c], rowH);
      if (ehStatus) {
        cell.getFill().setSolidFill(DS_G.colors.amberBg);
      } else {
        cell.getFill().setSolidFill(fundo);
      }
      cell.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.line);

      if (!ehStatus) {
        const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, xs[c] + 3, ry, larg[c] - 6, rowH);
        t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
        t.getText().setText(val).getTextStyle()
          .setFontSize(7.5).setBold(c === 0).setFontFamily(DS_G.typography.body).setForegroundColor(DS_G.colors.textMain);
        t.getText().getParagraphStyle().setParagraphAlignment(c === 0 ? SlidesApp.ParagraphAlignment.START : SlidesApp.ParagraphAlignment.CENTER);
      }
    });
  });

  // --- Barra de pontuação ---
  const totalPontos = metas.reduce((s, m) => s + m.pontos, 0);
  const barRes = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, resumoY, totalW, resumoH);
  barRes.getFill().setSolidFill(DS_G.colors.brandMed); barRes.getBorder().setTransparent();
  const tRes = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x0 + 12, resumoY, totalW - 24, resumoH);
  tRes.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  tRes.getText().setText('PONTUAÇÃO POTENCIAL TOTAL  •  ' + totalPontos + ' PONTOS  •  4 METAS EM ANDAMENTO')
    .getTextStyle().setFontSize(9).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS_G.typography.titles);

  Logger.log('Farol (tabela) gerado — ' + metas.length + ' metas, ' + totalPontos + ' pontos.');
}


// ==========================================
// SLIDE 2 — PLATAFORMA DE UTILITIES (fluxo de passos)
// ==========================================
function _gFarolSlideMeta1(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Plataforma de Utilities — Mega Curitiba', 'Meta 1 · 30 pontos · Direcionador Projetos · Prazo Novembro/26');

  const marginX = 30, topY = 76, rowH = 84, gapK = 14;
  const kpiW = 150;

  _gKPI(slide, marginX, topY, kpiW, rowH, 'STATUS', 'Em trânsito', DS_G.colors.brandLight, 'Equipamentos a caminho do Mega Curitiba');
  _gKPI(slide, marginX + kpiW + gapK, topY, kpiW, rowH, 'DOCUMENTAÇÃO', 'NF emitida', DS_G.colors.greenInk, 'Nota fiscal já liberada', DS_G.colors.greenBg);

  const leadX = marginX + 2 * (kpiW + gapK);
  const leadW = W - marginX - leadX;
  const lead = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, leadX, topY, leadW, rowH);
  lead.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  lead.getText().setText('Os equipamentos para monitorar as bombas já estão a caminho do Mega Curitiba. A instalação depende de três passos, nessa ordem:')
    .getTextStyle().setFontSize(10.5).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  lead.getText().getParagraphStyle().setLineSpacing(128);

  const steps = [
    'Fechar o orçamento com o João Lenon para a instalação dos equipamentos',
    'Assinar o contrato de instalação',
    'Receber a proposta de monitoramento dos pontos de energia — geração e consumo'
  ];
  const gap = 20, stepY = topY + rowH + 20, stepH = H - stepY - 30;
  const stepW = (W - 2 * marginX - 2 * gap) / 3;

  steps.forEach((txt, i) => {
    const x = marginX + i * (stepW + gap);
    const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, stepY, stepW, stepH);
    card.getFill().setSolidFill(DS_G.colors.white);
    card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);

    const num = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 16, stepY + 12, 60, 34);
    num.getText().setText('0' + (i + 1)).getTextStyle()
      .setFontSize(26).setBold(true).setForegroundColor(DS_G.colors.lineStrong).setFontFamily(DS_G.typography.titles);

    const body = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 16, stepY + 52, stepW - 32, stepH - 68);
    body.getText().setText(txt).getTextStyle()
      .setFontSize(10.5).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
    body.getText().getParagraphStyle().setLineSpacing(125);

    if (i < steps.length - 1) {
      const arrow = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + stepW + 1, stepY + stepH / 2 - 12, gap - 2, 24);
      arrow.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      arrow.getText().setText('→').getTextStyle().setFontSize(16).setBold(true).setForegroundColor(DS_G.colors.textMuted);
      arrow.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }
  });

  Logger.log('Farol — Meta 1 (Plataforma de Utilities) gerado.');
}


// ==========================================
// SLIDE 3 — PROGRAMA DE EXCELÊNCIA 2026 (linha do tempo)
// ==========================================
function _gFarolSlideMeta2(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Programa de Excelência 2026', 'Meta 2 · 20 pontos · Direcionador Projetos · Prazo Setembro/26');

  const marginX = 30, topY = 76, gap = 16, rowH = 92;
  const colW = (W - 2 * marginX - 2 * gap) / 3;

  // Painel 1 — status geral
  let py = _gPainel(slide, marginX, topY, colW, rowH, 'STATUS GERAL', DS_G.colors.brandMed);
  let t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 14, py, colW - 28, rowH - (py - topY) - 10);
  t.getText().setText('Vencedor de 2025 já divulgado. Book 2026 em finalização para envio aos Megas.')
    .getTextStyle().setFontSize(8.8).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  t.getText().getParagraphStyle().setLineSpacing(126);

  // Painel 2 — próxima fase
  const x2 = marginX + colW + gap;
  py = _gPainel(slide, x2, topY, colW, rowH, 'PRÓXIMA FASE', DS_G.colors.brandMed);
  t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x2 + 14, py, colW - 28, rowH - (py - topY) - 10);
  t.getText().setText('Envio do book aos Megas, seguido do início da inspeção in loco.')
    .getTextStyle().setFontSize(8.8).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  t.getText().getParagraphStyle().setLineSpacing(126);

  // Painel 3 — calendário até o prazo (mês 09 em destaque)
  const x3 = x2 + colW + gap;
  py = _gPainel(slide, x3, topY, colW, rowH, 'PRAZO — CALENDÁRIO', DS_G.colors.brandLight);
  const cellGap = 6;
  const cellW = (colW - 28 - 2 * cellGap) / 3, cellH = 16;
  for (let i = 1; i <= 9; i++) {
    const col = (i - 1) % 3, row = Math.floor((i - 1) / 3);
    const cx = x3 + 14 + col * (cellW + cellGap), cy = py + row * (cellH + 5);
    const ativo = i === 9;
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, cy, cellW, cellH);
    pill.getFill().setSolidFill(ativo ? DS_G.colors.amberBg : '#EEF2F9'); pill.getBorder().setTransparent();
    const pt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx, cy, cellW, cellH);
    pt.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    pt.getText().setText(String(i).padStart(2, '0')).getTextStyle()
      .setFontSize(7.4).setBold(ativo).setFontFamily(DS_G.typography.titles)
      .setForegroundColor(ativo ? DS_G.colors.amberInk : DS_G.colors.textMuted);
    pt.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // Linha do tempo com checkmark nas etapas concluídas
  const tlY = topY + rowH + 24;
  _gTimelineCheck(slide, ['Vencedor 2025 divulgado', 'Book 2026 finalizado', 'Book enviado aos Megas', 'Inspeção in loco'], marginX + 40, tlY, W - 2 * marginX - 80, 0);

  const alertY = tlY + 66;
  const alert = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, alertY, W - 2 * marginX, 40);
  alert.getFill().setSolidFill(DS_G.colors.amberBg); alert.getBorder().setTransparent();
  const at = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 16, alertY, W - 2 * marginX - 32, 40);
  at.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  at.getText().setText('⏱  Atenção ao prazo: os pontos da inspeção in loco precisam estar contabilizados até o MÊS 09.')
    .getTextStyle().setFontSize(10).setBold(true).setForegroundColor(DS_G.colors.amberInk).setFontFamily(DS_G.typography.body);

  Logger.log('Farol — Meta 2 (Programa de Excelência) gerado.');
}


// ==========================================
// SLIDE 4 — INTEGRAÇÃO DAS ÁREAS (status lado a lado)
// ==========================================
function _gFarolSlideMeta3(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Integração das Áreas — Facilities, Financeiro e Jurídico', 'Meta 3 · 20 pontos · Direcionador Projetos · Prazo Novembro/26');

  // Facilities é a área integradora: fica no topo, ligando-se às outras duas.
  const marginX = 30, topY = 78;
  const hubW = 230, hubH = 64, hubX = (W - hubW) / 2;
  const hpy = _gPainel(slide, hubX, topY, hubW, hubH, 'FACILITIES · ÁREA INTEGRADORA', DS_G.colors.brandLight);
  const hubT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, hubX + 14, hpy, hubW - 28, hubH - (hpy - topY) - 8);
  hubT.getText().setText('Reúne os dados de Financeiro e Jurídico para consolidar a visão única de gestão.')
    .getTextStyle().setFontSize(8.2).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  hubT.getText().getParagraphStyle().setLineSpacing(120);

  const gap = 20;
  const colW = (W - 2 * marginX - gap) / 2, colY = topY + hubH + 34, colH = H - colY - 40;

  const _col = (x, cor, corInk, status, titulo, corpo) => {
    const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, colY, colW, colH);
    card.getFill().setSolidFill(cor); card.getBorder().setTransparent();

    const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, colY + 18, colW - 40, 16);
    st.getText().setText(status).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(corInk).setFontFamily(DS_G.typography.titles);

    const tt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, colY + 38, colW - 40, 30);
    tt.getText().setText(titulo).getTextStyle().setFontSize(16).setBold(true).setForegroundColor(corInk).setFontFamily(DS_G.typography.titles);

    const bd = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, colY + 74, colW - 40, colH - 94);
    bd.getText().setText(corpo).getTextStyle().setFontSize(10.5).setForegroundColor(corInk).setFontFamily(DS_G.typography.body);
    bd.getText().getParagraphStyle().setLineSpacing(130);
  };

  // Linhas conectando o hub Facilities às duas colunas
  const lEsq = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, hubX + hubW * 0.25, topY + hubH, marginX + colW * 0.5, colY);
  lEsq.getLineFill().setSolidFill(DS_G.colors.lineStrong); lEsq.setWeight(1.5);
  const lDir = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, hubX + hubW * 0.75, topY + hubH, marginX + colW + gap + colW * 0.5, colY);
  lDir.getLineFill().setSolidFill(DS_G.colors.lineStrong); lDir.setWeight(1.5);

  _col(marginX, DS_G.colors.greenBg, DS_G.colors.greenInk, '✓ CONCLUÍDO', 'Financeiro',
    'A integração já foi realizada através da plataforma financeira dos Megas — os dados de facilities e financeiro já conversam entre si.');
  _col(marginX + colW + gap, DS_G.colors.amberBg, DS_G.colors.amberInk, '⏳ PENDENTE', 'Jurídico',
    'Ainda não está definido de que forma o jurídico vai liberar os dados para a gente montar essa visualização — é o único bloqueio que falta para fechar a meta.');

  const footY = colY + colH + 8;
  const foot = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, footY, W - 2 * marginX, 22);
  foot.getText().setText('Próximo passo: alinhar com o Jurídico o formato de liberação dos dados para fechar a integração das três áreas.')
    .getTextStyle().setFontSize(8.6).setItalic(true).setForegroundColor(DS_G.colors.textMuted).setFontFamily(DS_G.typography.body);

  Logger.log('Farol — Meta 3 (Integração das Áreas) gerado.');
}


// ==========================================
// SLIDE 5 — REEMBOLSOS (checklist de entrevistas)
// ==========================================
function _gFarolSlideMeta4(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Melhoria na Solicitação e Controle de Reembolsos', 'Meta 4 · 15 pontos · Direcionador Projetos · Prazo Novembro/26');

  const marginX = 30, topY = 88;
  const pessoas = [
    { nome: 'Wilson', feito: true }, { nome: 'Cadu', feito: true }, { nome: 'Jonatas', feito: true },
    { nome: 'Ernani', feito: false }, { nome: 'Ricardo', feito: false }
  ];
  const gap = 12, n = pessoas.length;
  const cardW = Math.min(130, (W - 2 * marginX - (n - 1) * gap) / n), cardH = 44;

  pessoas.forEach((p, i) => {
    const x = marginX + i * (cardW + gap);
    const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, topY, cardW, cardH);
    card.getFill().setSolidFill(DS_G.colors.white);
    card.getBorder().setWeight(1).getLineFill().setSolidFill(DS_G.colors.lineStrong);

    const av = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, x + 10, topY + 7, 30, 30);
    av.getFill().setSolidFill(p.feito ? DS_G.colors.brandLight : DS_G.colors.textMuted); av.getBorder().setTransparent();
    const avT = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 10, topY + 7, 30, 30);
    avT.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    avT.getText().setText(p.nome.charAt(0)).getTextStyle()
      .setFontSize(12).setBold(true).setForegroundColor('#FFFFFF').setFontFamily(DS_G.typography.titles);
    avT.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const nome = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 48, topY + 8, cardW - 56, 16);
    nome.getText().setText(p.nome).getTextStyle()
      .setFontSize(10).setBold(true).setForegroundColor(DS_G.colors.textMain).setFontFamily(DS_G.typography.titles);
    const est = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 48, topY + 24, cardW - 56, 14);
    est.getText().setText(p.feito ? '✓ Entrevistado' : 'Pendente').getTextStyle()
      .setFontSize(8).setBold(true)
      .setForegroundColor(p.feito ? DS_G.colors.greenInk : DS_G.colors.textMuted).setFontFamily(DS_G.typography.body);
  });

  // Funil estruturado: concluído / pendente / apoio RH — separa o que já
  // fechou do que falta e de quem precisa entrar no processo a seguir.
  const y2 = topY + cardH + 24, gap2 = 16, itemGap = 18;
  const colW2 = (W - 2 * marginX - 2 * gap2) / 3, panelH = 120;

  let py = _gPainel(slide, marginX, y2, colW2, panelH, '✓ CONCLUÍDO', DS_G.colors.greenInk);
  _gChecklist(slide, ['Wilson entrevistado', 'Cadu entrevistado', 'Jonatas entrevistado'], marginX + 14, py + 4, colW2 - 28, itemGap, DS_G.colors.greenInk);

  const x2b = marginX + colW2 + gap2;
  py = _gPainel(slide, x2b, y2, colW2, panelH, '⏳ PENDENTE', DS_G.colors.amberInk);
  _gChecklist(slide, ['Ernani', 'Ricardo'], x2b + 14, py + 4, colW2 - 28, itemGap, DS_G.colors.amberInk);

  const x3b = x2b + colW2 + gap2;
  py = _gPainel(slide, x3b, y2, colW2, panelH, 'APOIO RH · PRÓXIMOS PASSOS', DS_G.colors.brandLight);
  _gChecklist(slide, ['Envolver RH no processo', 'Apoiar entrevistas com o financeiro', 'Consolidar aprendizados no novo fluxo'], x3b + 14, py + 4, colW2 - 28, itemGap, DS_G.colors.brandLight);

  Logger.log('Farol — Meta 4 (Reembolsos) gerado.');
}
