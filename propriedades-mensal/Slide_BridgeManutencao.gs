/**
 * ARQUIVO: Slide_BridgeManutencao.gs
 * SLIDES — BRIDGE DE MANUTENÇÃO (variação) e o GRÁFICO
 *
 * MESMO FORMATO DO BRIDGE DOS MEGAS (megas-mensal/Slide06_FinanceiroBridge.gs):
 * são DOIS slides, e o eixo é o MÊS, não a rubrica.
 *
 *   gerarSlideBridgeManutencao()        → tabela de variação, um mês por linha
 *   gerarSlideBridgeManutencaoGrafico() → waterfall do orçado anual ao projetado
 *
 * Colunas da tabela, iguais às de lá:
 *   MÊS | TIPO | ORÇADO | REAL/RITMO | VARIAÇÃO | VAR %
 *
 * TIPO separa o que ACONTECEU do que é PROJEÇÃO: mês até a referência é REAL,
 * depois é RITMO. Sem essa marca, "gastou menos que o plano" em novembro
 * pareceria conquista, quando é só um mês que ainda não chegou.
 *
 * SINAL E COR, iguais aos Megas e contra a intuição de gráfico: variação
 * POSITIVA é gastar MENOS que o orçado, e isso é BOM (▼ verde). Negativa é
 * estouro (▲ vermelho). Mês de RITMO sai em âmbar, nem bom nem ruim — ainda
 * não aconteceu.
 */

function gerarSlideBridgeManutencao() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  if (typeof _tabRemoverPorTag_ === 'function') _tabRemoverPorTag_(deck, TAG_BRIDGE_MANUTENCAO);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  if (typeof _tabMarcarSlide_ === 'function') _tabMarcarSlide_(slide, TAG_BRIDGE_MANUTENCAO);

  // Vaga 2 da seção FINANCEIRO, logo depois do DRE.
  _drePosicionarNaSecao_(deck, slide, 'BRIDGE', 2);

  if (!dados) {
    criarHeaderPadrao(slide, 'ANÁLISE DE VARIAÇÃO (BRIDGE)', 'Orçado vs Realizado — Manutenção');
    _dreFalha_(slide, 20, 76, W - 40, 120, new Error('Não foi possível ler as abas do DRE de manutenção.'));
    return;
  }

  criarHeaderPadrao(slide, 'ANÁLISE DE VARIAÇÃO (BRIDGE)',
    'Orçado vs Realizado — Manutenção · ' + dados.ref.nome + ' ' + dados.ref.ano);

  const marginX = 20, topY = 85, gap = 14;
  const contH = H - topY - 15;
  const leftW = 210, rightX = marginX + leftW + gap, rightW = W - rightX - marginX;

  try {
    _brgResumo_(slide, marginX, topY, leftW, contH, dados);
    _brgTabela_(slide, rightX, topY, rightW, contH, dados);
  } catch (e) {
    _dreFalha_(slide, marginX, topY, W - 2 * marginX, contH, e);
    Logger.log('Bridge Manutenção: falhou ao desenhar — ' + e.message);
  }
}


// ==========================================
// PAINEL DE RESUMO (esquerda)
// ==========================================

function _brgResumo_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM;
  criarCardPainel(slide, x, y, w, h, null, DS.colors.brandDark);

  const orc = d.total.ano.plan, proj = d.total.ano.proj;
  const desvio = (orc == null || proj == null) ? null : orc - proj;
  const pct = (orc && desvio != null) ? (Math.abs(desvio / orc) * 100) : null;
  const abaixo = desvio != null && desvio >= 0;

  const linhas = [
    { rot: 'ORÇADO — ANO',        val: orc,  cor: DS.colors.brandLight },
    { rot: 'PROJETADO — ANO',     val: proj, cor: DS.colors.brandDark },
    { rot: abaixo ? 'ECONOMIA PROJETADA' : 'ESTOURO PROJETADO',
      val: desvio == null ? null : Math.abs(desvio),
      cor: abaixo ? '#166534' : '#DC2626',
      sub: pct == null ? '' : (abaixo ? '▼ ' : '▲ ') + pct.toFixed(1) + '% vs orçado' },
    { rot: 'REALIZADO ATÉ ' + d.ref.curto.toUpperCase(), val: d.total.acum.real,
      cor: DS.colors.textBody,
      sub: 'orçado ' + _dreMil_(d.total.acum.plan) + ' mil' }
  ];

  let cy = y + 12;
  linhas.forEach(l => {
    const cardH = l.sub ? 46 : 38;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 8, cy, w - 16, cardH - 5);
    bg.getFill().setSolidFill(l.cor, 0.08);
    bg.getBorder().setTransparent();
    _sTxt(slide, x + 14, cy + 3, w - 28, 10, l.rot, 6, true, DS.colors.textMuted, 'left');
    _sTxt(slide, x + 14, cy + 12, w - 28, 17,
          l.val == null ? '—' : 'R$ ' + _brgMilhar_(Math.round(l.val / 1000)) + ' mil',
          12, true, l.cor, 'left');
    if (l.sub) _sTxt(slide, x + 14, cy + 29, w - 28, 10, l.sub, 5.6, false, l.cor, 'left');
    cy += cardH;
  });

  if (d.avisos && d.avisos.length) {
    _sTxt(slide, x + 8, y + h - 22, w - 16, 18, '⚠ ' + d.avisos[0], 5, false,
          DS.colors.accentOrange, 'left');
  }
}


// ==========================================
// TABELA DE VARIAÇÃO (direita) — um mês por linha
// ==========================================

function _brgTabela_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM;
  const pad = 12, x0 = x + pad, useW = w - 2 * pad;

  let acc = 0;
  const col = (t, f, a) => { const o = { t: t, x: x0 + acc * useW, w: useW * f, a: a || 'C' }; acc += f; return o; };
  const cols = [col('MÊS', 0.13), col('TIPO', 0.13), col('ORÇADO', 0.20),
                col('REAL/RITMO', 0.21), col('VARIAÇÃO', 0.20), col('VAR %', 0.13)];

  const headH = 22;
  const bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, y, w - 8, headH);
  bar.getFill().setSolidFill(DS.colors.brandDark);
  bar.getBorder().setTransparent();
  cols.forEach(c => _sTxt(slide, c.x - 5, y + 2, c.w + 10, headH - 4, c.t, 7, true, '#FFFFFF', 'center'));

  const startY = y + headH + 3;
  const rowH = Math.max(13, Math.min(21, (h - headH - 8) / d.meses.length));
  const fs = rowH >= 18 ? 7.2 : (rowH >= 15 ? 6.6 : 6);
  const mil = v => (v == null) ? '-' : _brgMilhar_(Math.round(v / 1000));

  d.meses.forEach((m, i) => {
    const ry = startY + i * rowH;
    const zebra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, ry, w - 8, rowH);
    zebra.getFill().setSolidFill(i % 2 ? '#F8FAFC' : '#FFFFFF');
    zebra.getBorder().setTransparent();

    const ritmo = m.tipo === 'RITMO';
    const abaixo = m.variacao != null && m.variacao >= 0;
    // Âmbar para RITMO: não é bom nem ruim, ainda não aconteceu.
    const corVar = ritmo ? '#D97706' : (abaixo ? '#166534' : '#DC2626');
    const seta = m.variacao == null ? '' : (abaixo ? '▼ ' : '▲ ');
    const varPct = (m.plan && m.variacao != null)
      ? (Math.abs(m.variacao / m.plan) * 100).toFixed(0) + '%' : '-';

    _sTxt(slide, cols[0].x, ry, cols[0].w, rowH, m.label, fs, true, DS.colors.textMain, 'center');

    // TIPO em pill, para o olho separar realizado de projeção de relance.
    const pw = Math.min(cols[1].w - 8, 34), px = cols[1].x + (cols[1].w - pw) / 2;
    const pill = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, px, ry + rowH * 0.22, pw, rowH * 0.56);
    pill.getFill().setSolidFill(ritmo ? '#D97706' : DS.colors.brandMed, 0.15);
    pill.getBorder().setTransparent();
    _sTxt(slide, px - 6, ry, pw + 12, rowH, m.tipo, fs - 1.4, true,
          ritmo ? '#D97706' : DS.colors.brandMed, 'center');

    _sTxt(slide, cols[2].x, ry, cols[2].w, rowH, mil(m.plan), fs, false, DS.colors.textBody, 'center');
    _sTxt(slide, cols[3].x, ry, cols[3].w, rowH, mil(m.real), fs, true, DS.colors.textMain, 'center');
    _sTxt(slide, cols[4].x, ry, cols[4].w, rowH,
          m.variacao == null ? '-' : seta + _brgMilhar_(Math.abs(Math.round(m.variacao / 1000))),
          fs, true, corVar, 'center');
    _sTxt(slide, cols[5].x, ry, cols[5].w, rowH, varPct, fs, false, corVar, 'center');
  });
}


// ==========================================
// SLIDE 2 — GRÁFICO WATERFALL
// ==========================================

/**
 * Do ORÇADO ANUAL ao PROJETADO, com a variação de cada mês no meio.
 *
 * O orçado é o ponto ZERO: as barras sobem quando o mês gastou MENOS (bom) e
 * descem quando estourou. A ponta direita é onde o ano fecha se o ritmo se
 * confirmar.
 */
function gerarSlideBridgeManutencaoGrafico() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  if (typeof _tabRemoverPorTag_ === 'function') _tabRemoverPorTag_(deck, TAG_BRIDGE_GRAFICO);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  if (typeof _tabMarcarSlide_ === 'function') _tabMarcarSlide_(slide, TAG_BRIDGE_GRAFICO);

  _drePosicionarNaSecao_(deck, slide, 'BRIDGE GRÁFICO', 3);

  if (!dados) {
    criarHeaderPadrao(slide, 'BRIDGE DE VARIAÇÃO', 'Do Orçado ao Realizado/Projetado — Manutenção');
    _dreFalha_(slide, 20, 76, W - 40, 120, new Error('Não foi possível ler as abas do DRE de manutenção.'));
    return;
  }

  criarHeaderPadrao(slide, 'BRIDGE DE VARIAÇÃO',
    'Do Orçado ao Realizado/Projetado — Manutenção · ' + dados.ref.nome + ' ' + dados.ref.ano);

  try {
    _brgGrafico_(slide, 20, 78, W - 40, H - 78 - 15, dados);
  } catch (e) {
    _dreFalha_(slide, 20, 78, W - 40, H - 93, e);
    Logger.log('Bridge gráfico: falhou ao desenhar — ' + e.message);
  }
}

function _brgGrafico_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM;
  const card = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  card.getFill().setSolidFill(DS.colors.cardBg);
  card.getBorder().getLineFill().setSolidFill(DS.colors.lines);
  card.getBorder().setWeight(1);

  const orc = d.total.ano.plan, proj = d.total.ano.proj;
  const meses = d.meses.filter(m => m.variacao != null);

  const plotX = x + 46, plotW = w - 92;
  const plotY = y + 34, plotH = h - 34 - 44;

  // Divide o plot entre o lado positivo e o negativo na proporção dos dados,
  // com trava: sem ela um único mês extremo (setembro, −743k) achata todo o
  // resto até virar uma linha reta.
  const maxUp   = Math.max(0, ...meses.map(m => m.variacao > 0 ? m.variacao : 0));
  const maxDown = Math.max(0, ...meses.map(m => m.variacao < 0 ? -m.variacao : 0));
  let fracUp = (maxUp + maxDown) > 0 ? maxUp / (maxUp + maxDown) : 0.5;
  fracUp = Math.max(0.25, Math.min(0.75, fracUp));
  const upH = (plotH - 30) * fracUp, downH = (plotH - 30) * (1 - fracUp);
  const zeroY = plotY + 15 + upH;
  const escala = Math.max(maxUp / (upH || 1), maxDown / (downH || 1)) || 1;

  const n = meses.length, slotW = plotW / (n + 2), barW = Math.min(slotW * 0.5, 30);

  const eixo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + slotW * 0.1, zeroY, plotW - slotW * 0.2, 1.2);
  eixo.getFill().setSolidFill('#94A3B8');
  eixo.getBorder().setTransparent();

  const fmt = v => 'R$ ' + _brgMilhar_(Math.round(v / 1000)) + ' mil';

  // Ponta esquerda: ORÇADO ANUAL — é o ponto zero, sem barra.
  _sTxt(slide, plotX - slotW * 0.35, zeroY - 32, slotW * 1.6, 14, fmt(orc), 7.5, true, '#475569', 'center');
  _sTxt(slide, plotX - slotW * 0.35, zeroY - 20, slotW * 1.6, 10, 'ORÇADO', 6, true, DS.colors.textMuted, 'center');

  meses.forEach((m, i) => {
    const bx = plotX + slotW * (i + 1) + (slotW - barW) / 2;
    const alt = Math.max(2, Math.abs(m.variacao) / escala);
    const acima = m.variacao >= 0;                    // gastou menos = barra para cima
    const by = acima ? zeroY - alt : zeroY;
    const ritmo = m.tipo === 'RITMO';
    const cor = ritmo ? '#D97706' : (acima ? '#166534' : '#DC2626');

    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, by, barW, alt);
    r.getFill().setSolidFill(cor, ritmo ? 0.55 : 1);
    r.getBorder().setTransparent();

    const rot = (acima ? '+' : '−') + _brgMilhar_(Math.abs(Math.round(m.variacao / 1000)));
    _sTxt(slide, bx - 8, acima ? by - 11 : by + alt + 1, barW + 16, 10, rot, 5.6, true, cor, 'center');
    _sTxt(slide, bx - 8, zeroY + (acima ? 3 : -12), barW + 16, 10, m.label, 5.8, true,
          ritmo ? '#D97706' : DS.colors.textBody, 'center');
  });

  // Ponta direita: PROJETADO.
  const px = plotX + slotW * (n + 1);
  _sTxt(slide, px - slotW * 0.3, zeroY - 32, slotW * 1.6, 14, fmt(proj), 7.5, true, DS.colors.brandDark, 'center');
  _sTxt(slide, px - slotW * 0.3, zeroY - 20, slotW * 1.6, 10, 'PROJETADO', 6, true, DS.colors.textMuted, 'center');

  _brgLegenda_(slide, x + 14, y + h - 22);
}

function _brgLegenda_(slide, x, y) {
  const DS = CR_DESIGN_SYSTEM;
  [['#166534', 'ABAIXO DO ORÇADO'], ['#DC2626', 'ACIMA DO ORÇADO'], ['#D97706', 'PROJEÇÃO (RITMO)']]
    .forEach((par, i) => {
      const cx = x + i * 128;
      const q = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, cx, y + 4, 8, 8);
      q.getFill().setSolidFill(par[0]); q.getBorder().setTransparent();
      _sTxt(slide, cx + 11, y, 112, 16, par[1], 5.8, true, DS.colors.textBody, 'left');
    });
}

function _brgMilhar_(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
