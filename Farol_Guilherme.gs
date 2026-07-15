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

  const marginX = 30, topY = 92;
  const lead = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, topY, W - 2 * marginX, 40);
  lead.getText().setText('Os equipamentos para monitorar as bombas já estão a caminho do Mega Curitiba — a nota fiscal já foi emitida. A instalação depende de três passos, nessa ordem:')
    .getTextStyle().setFontSize(11).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
  lead.getText().getParagraphStyle().setLineSpacing(130);

  const steps = [
    'Fechar o orçamento com o João Lenon para a instalação dos equipamentos',
    'Assinar o contrato de instalação',
    'Receber a proposta de monitoramento dos pontos de energia — geração e consumo'
  ];
  const gap = 20, stepY = topY + 56, stepH = H - stepY - 36;
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

  const marginX = 30, topY = 96;
  const itens = [
    { tag: 'CONCLUÍDO', txt: 'Vencedor de 2025 divulgado', feito: true },
    { tag: 'EM ANDAMENTO', txt: 'Finalizando o book 2026', feito: true },
    { tag: 'INÍCIO DO MÊS QUE VEM', txt: 'Book enviado aos Megas', feito: false },
    { tag: 'EM SEGUIDA', txt: 'Início da inspeção in loco', feito: false }
  ];
  const n = itens.length;
  const slotW = (W - 2 * marginX) / n;
  const dotY = topY, dotR = 8;

  itens.forEach((it, i) => {
    const cx = marginX + i * slotW;
    if (i < n - 1) {
      const rail = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx + dotR * 2, dotY + dotR - 1, slotW - dotR * 2, 2);
      rail.getFill().setSolidFill(it.feito ? DS_G.colors.brandLight : DS_G.colors.lineStrong);
      rail.getBorder().setTransparent();
    }
    const dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, cx, dotY, dotR * 2, dotR * 2);
    dot.getFill().setSolidFill(it.feito ? DS_G.colors.brandLight : DS_G.colors.white);
    dot.getBorder().setWeight(2.5).getLineFill().setSolidFill(DS_G.colors.brandLight);

    const tag = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx, dotY + 26, slotW - 10, 22);
    tag.getText().setText(it.tag).getTextStyle().setFontSize(8).setBold(true)
      .setForegroundColor(it.feito ? DS_G.colors.brandLight : DS_G.colors.textMuted).setFontFamily(DS_G.typography.titles);

    const txt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx, dotY + 48, slotW - 14, 50);
    txt.getText().setText(it.txt).getTextStyle()
      .setFontSize(10.5).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);
    txt.getText().getParagraphStyle().setLineSpacing(120);
  });

  const alertY = topY + 130;
  const alert = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, alertY, W - 2 * marginX, 46);
  alert.getFill().setSolidFill(DS_G.colors.amberBg); alert.getBorder().setTransparent();
  const at = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 16, alertY, W - 2 * marginX - 32, 46);
  at.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  at.getText().setText('⏱  Atenção ao prazo: os pontos da inspeção in loco precisam estar contabilizados até o MÊS 09.')
    .getTextStyle().setFontSize(10.5).setBold(true).setForegroundColor(DS_G.colors.amberInk).setFontFamily(DS_G.typography.body);

  Logger.log('Farol — Meta 2 (Programa de Excelência) gerado.');
}


// ==========================================
// SLIDE 4 — INTEGRAÇÃO DAS ÁREAS (status lado a lado)
// ==========================================
function _gFarolSlideMeta3(deck) {
  const slide = _gNovoSlide(deck);
  const W = deck.getPageWidth(), H = deck.getPageHeight();
  _gHeader(slide, W, 'Integração das Áreas — Facilities, Financeiro e Jurídico', 'Meta 3 · 20 pontos · Direcionador Projetos · Prazo Novembro/26');

  const marginX = 30, topY = 90, gap = 20;
  const colW = (W - 2 * marginX - gap) / 2, colH = H - topY - 30;

  const _col = (x, cor, corInk, status, titulo, corpo) => {
    const card = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, topY, colW, colH);
    card.getFill().setSolidFill(cor); card.getBorder().setTransparent();

    const st = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, topY + 18, colW - 40, 16);
    st.getText().setText(status).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(corInk).setFontFamily(DS_G.typography.titles);

    const tt = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, topY + 38, colW - 40, 30);
    tt.getText().setText(titulo).getTextStyle().setFontSize(16).setBold(true).setForegroundColor(corInk).setFontFamily(DS_G.typography.titles);

    const bd = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 20, topY + 74, colW - 40, colH - 94);
    bd.getText().setText(corpo).getTextStyle().setFontSize(10.5).setForegroundColor(corInk).setFontFamily(DS_G.typography.body);
    bd.getText().getParagraphStyle().setLineSpacing(130);
  };

  _col(marginX, DS_G.colors.greenBg, DS_G.colors.greenInk, '✓ CONCLUÍDO', 'Facilities + Financeiro',
    'A integração já foi realizada através da plataforma financeira dos Megas — os dados de facilities e financeiro já conversam entre si.');
  _col(marginX + colW + gap, DS_G.colors.amberBg, DS_G.colors.amberInk, '⏳ PENDENTE', 'Jurídico',
    'Ainda não está definido de que forma o jurídico vai liberar os dados para a gente montar essa visualização — é o único bloqueio que falta para fechar a meta.');

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

  const leadY = topY + cardH + 28;
  const lead = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX, leadY, W - 2 * marginX, 30);
  lead.getText().setText('Faltam duas entrevistas para fechar o mapeamento interno. O próximo passo é puxar o RH para dentro do processo:')
    .getTextStyle().setFontSize(11).setForegroundColor(DS_G.colors.textBody).setFontFamily(DS_G.typography.body);

  const alertY = leadY + 38;
  const alert = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, marginX, alertY, W - 2 * marginX, 46);
  alert.getFill().setSolidFill(DS_G.colors.amberBg); alert.getBorder().setTransparent();
  const at = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, marginX + 16, alertY, W - 2 * marginX - 32, 46);
  at.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  at.getText().setText('🤝  Próximo passo: acionar o RH para ajudar a realizar as entrevistas com o pessoal do financeiro.')
    .getTextStyle().setFontSize(10.5).setBold(true).setForegroundColor(DS_G.colors.amberInk).setFontFamily(DS_G.typography.body);

  Logger.log('Farol — Meta 4 (Reembolsos) gerado.');
}
