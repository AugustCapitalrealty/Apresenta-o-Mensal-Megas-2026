/**
 * ARQUIVO: Slide_BridgeManutencao.gs
 * SLIDE — BRIDGE DE MANUTENÇÃO (análise de variação)
 *
 * Waterfall: sai do PLANEJADO acumulado, aplica o desvio de cada centro de
 * custo, chega no REALIZADO acumulado. Responde "o plano era X, gastamos Y —
 * onde nasceu a diferença?", que é a pergunta que a tabela do DRE responde
 * devagar e o bridge responde de relance.
 *
 * DIFERENÇA PARA O BRIDGE DOS MEGAS (Slide06_FinanceiroBridge.gs): lá as
 * barras são NATUREZAS de despesa e a fonte é uma aba já com a variação
 * calculada. Aqui as barras são CENTROS DE CUSTO, a variação é calculada
 * aqui, e o eixo é acumulado Jan..mês em vez de mês isolado — manutenção é
 * gasto que se concentra em obras pontuais, e um mês isolado dá um retrato
 * enganoso (em Jun o plano é zero e houve gasto; em Ago o real é 11× o mês
 * anterior).
 *
 * CONVENÇÃO DE COR, e ela é o contrário da intuição de gráfico: gasto ACIMA
 * do plano é RUIM → vermelho e barra para cima. Gasto ABAIXO é BOM → verde.
 *
 * Centro sem plano (só existe na aba de ritmo) não vira barra de variação —
 * não há de quê variar. Entra numa barra "SEM PLANO" separada, para o total
 * continuar fechando sem fingir que havia orçamento.
 */

function gerarSlideBridgeManutencao() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  if (typeof _tabRemoverPorTag_ === 'function') _tabRemoverPorTag_(deck, TAG_BRIDGE_MANUTENCAO);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const marginX = 24, topY = 76;
  const cardH = (H - 14) - topY;

  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  if (typeof _tabMarcarSlide_ === 'function') _tabMarcarSlide_(slide, TAG_BRIDGE_MANUTENCAO);

  if (!dados) {
    criarHeaderPadrao(slide, 'BRIDGE — MANUTENÇÃO', 'Planejado × Realizado');
    criarCardPainel(slide, marginX, topY, W - 2 * marginX, cardH, 'SEM DADOS', DS.colors.themeCorr);
    _dreFalha_(slide, marginX, topY, W - 2 * marginX, cardH,
      new Error('Não foi possível ler as abas do DRE de manutenção.'));
    return;
  }

  const nomes = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  criarHeaderPadrao(slide, 'BRIDGE — MANUTENÇÃO',
    'Do planejado ao realizado por centro de custo — acumulado JAN..' +
    nomes[dados.refIndex] + '/' + String(dados.ref.ano).slice(-2) + ' · R$ mil');

  try {
    _bridgeDesenhar_(slide, marginX, topY, W - 2 * marginX, cardH, dados);
  } catch (e) {
    _dreFalha_(slide, marginX, topY, W - 2 * marginX, cardH, e);
    Logger.log('Bridge Manutenção: falhou ao desenhar — ' + e.message);
  }
}


// Monta as barras: início, uma por centro com desvio, sem-plano, fim.
// Exportada (sem `_` no fim seria ponto de entrada; aqui é interna) para o
// teste poder conferir a aritmética sem desenhar nada.
function _bridgeBarras_(dados) {
  const inicio = dados.total.acum.plan;
  const fim    = dados.total.acum.real;
  if (inicio == null || fim == null) return null;

  const desvios = [], semPlano = [];
  dados.empresas.forEach(emp => {
    emp.centros.forEach(c => {
      const p = c.acum.plan, r = c.acum.real;
      if (p == null && r == null) return;
      if (p == null) { if (r) semPlano.push({ nome: c.nome, valor: r, empresa: emp.nome }); return; }
      const d = (r == null ? 0 : r) - p;
      if (Math.abs(d) < 500) return;                 // ruído: não vira barra
      desvios.push({ nome: c.nome, valor: d, empresa: emp.nome });
    });
  });

  // Maior desvio primeiro (em módulo): o bridge é para achar o culpado, e o
  // culpado tem que ser a primeira barra depois do início.
  desvios.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

  const semPlanoTotal = semPlano.reduce((s, i) => s + i.valor, 0);
  const barras = [{ tipo: 'inicio', nome: 'PLANEJADO', valor: inicio }]
    .concat(desvios.map(d => ({ tipo: 'delta', nome: d.nome, valor: d.valor, empresa: d.empresa })));
  if (Math.abs(semPlanoTotal) >= 500) {
    barras.push({ tipo: 'delta', nome: 'SEM PLANO (' + semPlano.length + ')', valor: semPlanoTotal });
  }
  barras.push({ tipo: 'fim', nome: 'REALIZADO', valor: fim });

  // Conferência: início + todos os deltas tem que dar o fim. Se não der,
  // faltou centro de custo — o mesmo princípio da identidade estoque × fluxo.
  const somado = inicio + barras.filter(b => b.tipo === 'delta').reduce((s, b) => s + b.valor, 0);
  const residuo = fim - somado;

  return { barras: barras, inicio: inicio, fim: fim, residuo: residuo, desvios: desvios };
}

function _bridgeDesenhar_(slide, x, y, w, h, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const cor = DS.colors.brandMed;
  const b = _bridgeBarras_(dados);

  const contentY = criarCardPainel(slide, x, y, w, h,
    'PLANEJADO → REALIZADO · ACUMULADO', cor);

  if (!b) {
    _sTxt(slide, x + 15, contentY + 40, w - 30, 20,
      'Sem plano ou sem realizado acumulado para montar o bridge.', 9.5, true,
      DS.colors.textMuted, 'center');
    return;
  }

  // Resumo à esquerda: os três números que o gráfico ilustra.
  const boxW = 132;
  _bridgeResumo_(slide, x + 12, contentY + 4, boxW, dados, b);

  const gx = x + 12 + boxW + 14;
  const gw = (x + w - 12) - gx;
  const gy = contentY + 18;
  const gh = (y + h) - gy - 34;

  const n = b.barras.length;
  const gap = Math.min(10, gw / (n * 6));
  const barW = (gw - gap * (n - 1)) / n;

  // Escala: o topo é o maior nível que a linha do waterfall alcança.
  let nivel = 0, maxNivel = 0;
  b.barras.forEach(bar => {
    if (bar.tipo === 'inicio') { nivel = bar.valor; }
    else if (bar.tipo === 'delta') { nivel += bar.valor; }
    else { nivel = bar.valor; }
    if (nivel > maxNivel) maxNivel = nivel;
    if (bar.tipo === 'inicio' && bar.valor > maxNivel) maxNivel = bar.valor;
  });
  maxNivel = Math.max(maxNivel, b.inicio, b.fim) * 1.12;
  const esc = v => (maxNivel > 0 ? (v / maxNivel) * gh : 0);

  const baseY = gy + gh;
  let acum = 0;

  b.barras.forEach((bar, i) => {
    const bx = gx + i * (barW + gap);
    let topo, alt, corBar;

    if (bar.tipo === 'inicio' || bar.tipo === 'fim') {
      const v = bar.valor;
      alt = Math.max(2, esc(v));
      topo = baseY - alt;
      corBar = bar.tipo === 'inicio' ? DS.colors.brandLight : DS.colors.brandDark;
      acum = v;
    } else {
      const de = acum, para = acum + bar.valor;
      const alto = Math.max(de, para), baixo = Math.min(de, para);
      topo = baseY - esc(alto);
      alt  = Math.max(2, esc(alto) - esc(baixo));
      // Gasto acima do plano = ruim = vermelho (ver cabeçalho).
      corBar = bar.valor > 0 ? DS.colors.accentRed : DS.colors.accentGreen;
      acum = para;

      // Conector pontilhado do nível anterior, para a escada ficar legível.
      const con = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
        bx - gap, baseY - esc(de) - 0.4, gap, 0.8);
      con.getFill().setSolidFill(DS.colors.lines);
      con.getBorder().setTransparent();
    }

    const r = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, topo, barW, alt);
    r.getFill().setSolidFill(corBar);
    r.getBorder().setTransparent();

    // Valor acima da barra.
    const rot = (bar.tipo === 'delta' ? (bar.valor > 0 ? '+' : '−') : '') +
                Math.abs(Math.round(bar.valor / 1000));
    _sTxt(slide, bx - 4, topo - 11, barW + 8, 10, rot, 5.8, true,
          bar.tipo === 'delta' ? corBar : DS.colors.textMain, 'center');

    // Nome embaixo, encurtado — caixa estreita quebra sozinha (lição 1).
    _sTxt(slide, bx - 3, baseY + 2, barW + 6, 22,
          _bridgeNomeCurto_(bar.nome, barW), 5.2, bar.tipo !== 'delta', DS.colors.textBody, 'center');
  });

  const eixo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, gx, baseY, gw, 0.75);
  eixo.getFill().setSolidFill(DS.colors.lines);
  eixo.getBorder().setTransparent();

  // Resíduo: se as barras não somam o fim, falta centro de custo. Aparece no
  // slide em vez de só no log — é erro de dado, não de desenho.
  if (Math.abs(b.residuo) >= 500) {
    _sTxt(slide, gx, y + h - 12, gw, 10,
      '⚠ barras não fecham com o realizado: resíduo de R$ ' +
      Math.round(b.residuo / 1000) + ' mil — falta centro de custo em DRE_EMPRESAS',
      5.5, true, DS.colors.accentOrange, 'left');
  }
}

function _bridgeResumo_(slide, x, y, w, dados, b) {
  const DS = CR_DESIGN_SYSTEM;
  const desvio = b.fim - b.inicio;
  const pct = b.inicio ? (b.fim / b.inicio - 1) * 100 : null;
  const acima = desvio > 0;

  const linhas = [
    { rot: 'PLANEJADO (acum.)', val: b.inicio, cor: DS.colors.brandLight },
    { rot: 'REALIZADO (acum.)', val: b.fim,    cor: DS.colors.brandDark },
    { rot: acima ? 'GASTOU A MAIS' : 'GASTOU A MENOS', val: Math.abs(desvio),
      cor: acima ? DS.colors.accentRed : DS.colors.accentGreen,
      sub: pct == null ? '' : (acima ? '▲' : '▼') + Math.abs(Math.round(pct)) + '% vs plano' },
    { rot: 'PROJEÇÃO DO ANO', val: dados.total.ano.proj, cor: DS.colors.textBody,
      sub: 'plano ' + Math.round((dados.total.ano.plan || 0) / 1000) + ' mil' }
  ];

  let cy = y;
  linhas.forEach(l => {
    const cardH = l.sub ? 40 : 32;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, cy, w, cardH - 4);
    bg.getFill().setSolidFill(l.cor, 0.08);
    bg.getBorder().setTransparent();
    _sTxt(slide, x + 6, cy + 3, w - 12, 9, l.rot, 5.6, true, DS.colors.textMuted, 'left');
    _sTxt(slide, x + 6, cy + 11, w - 12, 15,
          l.val == null ? '—' : 'R$ ' + _dreMilhar_(Math.round(l.val / 1000)) + ' mil',
          11, true, l.cor, 'left');
    if (l.sub) _sTxt(slide, x + 6, cy + 26, w - 12, 9, l.sub, 5.4, false, l.cor, 'left');
    cy += cardH;
  });
}

function _dreMilhar_(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Nome que cabe na barra. A largura vira orçamento de caracteres, senão a
// TEXT_BOX quebra sozinha e o rótulo cobre a barra vizinha (lição 1).
function _bridgeNomeCurto_(nome, larg) {
  const max = Math.max(6, Math.floor(larg / 2.6));
  const t = String(nome)
    .replace(/^ARMAZÉM MONOUSUÁRIO /, 'ARM.')
    .replace(/ DESPESAS?$/, '')
    .replace(/^LJ 0/, 'LJ ');
  return t.length <= max ? t : t.slice(0, max - 1) + '…';
}
