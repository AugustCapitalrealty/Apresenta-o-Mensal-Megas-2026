/**
 * ARQUIVO: 19_Slide_DREBridge.gs
 * SLIDES — SEÇÃO FINANCEIRO: DRE e BRIDGE de Manutenção
 *
 *   gerarSlideDREManutencao()            tabela 2025 | Meta | Real | Δ% Meta | Δ% 2025
 *   gerarSlideBridgeManutencao()         orçado × real/ritmo, mês a mês
 *   gerarSlideBridgeManutencaoGrafico()  o mesmo em cascata
 *
 * POR QUE OS TRÊS NO MESMO ARQUIVO: saem TODOS de obterDREManutencao_()
 * (05_DadosSlides.gs) — uma leitura só, um contrato só. O Bridge é o DRE
 * aberto por mês; mudar o recorte de um sem o outro é justamente o jeito de
 * a apresentação sair com dois números diferentes para a mesma coisa.
 *
 * Os três também dividem _drePosicionarNaSecao_ e _dreFalha_, que estavam
 * num arquivo e eram usados pelo outro — dependência cruzada que sumia
 * inteira quando um dos dois não era colado no editor (lição 6).
 *
 * Formato igual ao dos Megas (megas-mensal/Slide_DRE.gs), por pedido.
 */


function gerarSlideDREManutencao() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  _slideLimpar_(deck, TAG_DRE_MANUTENCAO);

  const slide = _slideNovo_(deck, TAG_DRE_MANUTENCAO);

  // Vaga 1 da seção FINANCEIRO (a capa é a 0).
  _drePosicionarNaSecao_(deck, slide, 'DRE', 1);

  if (!dados) {
    criarHeaderPadrao(slide, 'DRE — MANUTENÇÃO', 'Planejado × Realizado por centro de custo');
    _dreFalha_(slide, 20, 76, deck.getPageWidth() - 40, 120,
      new Error('Não foi possível ler as abas "' + DRE_ABA_PLANEJAMENTO + '" e "' + DRE_ABA_RITMO + '".'));
    return;
  }

  const ref = dados.ref;
  const mesAbrev = ref.curto.toUpperCase() + '/' + String(ref.ano).slice(-2);
  criarHeaderPadrao(slide, 'DRE — MANUTENÇÃO',
    'Meta vs Realizado (projeção pelo ritmo) · valores em R$ mil · Mês: ' + mesAbrev);

  try {
    _dreGrade_(slide, deck, dados, mesAbrev);
  } catch (e) {
    _dreFalha_(slide, 20, 76, deck.getPageWidth() - 40, 120, e);
    Logger.log('DRE Manutenção: falhou ao desenhar — ' + e.message);
  }
}


// ==========================================
// DESENHO — grade de 3 blocos × 5 colunas
// ==========================================

function _dreGrade_(slide, deck, dados, mesAbrev) {
  const DS = CR_DESIGN_SYSTEM;
  const W = deck.getPageWidth(), H = deck.getPageHeight();

  // Mesmos tons do DRE dos Megas. Vermelho/verde DESSATURADOS: a tabela tem
  // dezenas de variações coloridas e o tom saturado pesa demais na leitura.
  const CINZA_EMPRESA = '#475569';
  const COR_FUTURO    = DS.colors.brandLight;
  const VERM = '#A85450', VERDE = '#4E7B5F';

  const NCOL = 5;
  const x0 = 10, tableW = W - 20;
  const rubricaW = 168;
  // As colunas de variação carregam seta + número ("▲ 2.088%") e precisam de
  // mais espaço que as de valor. Os pesos somam 5,00 por bloco, então a
  // largura total não muda.
  const PESO_COL = [0.82, 0.82, 0.82, 1.30, 1.24];
  const unidade = (tableW - rubricaW) / (3 * NCOL);
  const colPos = [], colLarg = [];
  let accX = x0 + rubricaW;
  for (let b = 0; b < 3; b++) {
    for (let i = 0; i < NCOL; i++) {
      const cw = unidade * PESO_COL[i];
      colPos.push(accX); colLarg.push(cw); accX += cw;
    }
  }
  const colX = i => colPos[i], colW = i => colLarg[i];
  const blocoW = c0 => colLarg.slice(c0, c0 + NCOL).reduce((a, b) => a + b, 0);

  const blocoY = 66, blocoH = 14, subH = 14;
  const anoAnt = dados.ref.ano - 1;
  const acumTxt = dados.refIndex > 0 ? ('ACUMULADO — JAN A ' + mesAbrev) : ('ACUMULADO — ' + mesAbrev);
  const blocos = [
    { txt: 'MÊS — ' + mesAbrev,             c0: 0,  cor: DS.colors.brandMed },
    { txt: acumTxt,                          c0: 5,  cor: DS.colors.brandMed },
    { txt: 'REALIZADO + RITMO — ANO',        c0: 10, cor: COR_FUTURO, futuro: true }
  ];

  _sRet_(slide, x0, blocoY, rubricaW - 1, blocoH + subH, DS.colors.brandDark);
  _sTxt(slide, x0 + 4, blocoY, rubricaW - 8, blocoH + subH, 'R$ MIL', 7, true, '#FFFFFF', 'left');

  blocos.forEach(b => {
    const bx = colX(b.c0), bw = blocoW(b.c0) - 1;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, blocoY, bw, blocoH);
    bg.getFill().setSolidFill(b.cor); bg.getBorder().setTransparent();
    _sTxt(slide, bx, blocoY, bw, blocoH, b.txt, 6.5, true, '#FFFFFF', 'center');

    [String(anoAnt), 'Meta', 'Real', 'Δ% Meta', 'Δ% ' + anoAnt].forEach((t, i) => {
      const sx = colX(b.c0 + i), sw = colW(b.c0 + i) - 1;
      _sRet_(slide, sx, blocoY + blocoH, sw, subH, b.futuro ? '#0A4C86' : DS.colors.brandDark);
      // A caixa de texto passa da célula (folga simétrica, sem fundo próprio)
      // só para vencer o recuo interno do Slides, que quebrava "Realizado"
      // em "Realizad/o" (lição 1).
      const folga = 10;
      _sTxt(slide, sx - folga, blocoY + blocoH, sw + folga * 2, subH, t, 6.5, true, '#FFFFFF', 'center');
    });
  });

  // ── Linhas: TOTAL, depois cada EMPRESA (subtotal) com seus centros ──────
  const linhas = [{ tipo: 'total', nome: 'MANUTENÇÃO IMÓVEIS', b: dados.total }];
  dados.empresas.forEach(emp => {
    linhas.push({ tipo: 'empresa', nome: emp.codigo + ' · ' + emp.nome.toUpperCase(), b: emp.total });
    emp.centros.forEach(c => linhas.push({ tipo: 'item', nome: _dreNomeCurto_(c.nome), b: c, so: c.so }));
  });

  const tY = blocoY + blocoH + subH + 2;
  // SEM piso mínimo: a tabela precisa caber inteira, senão as últimas linhas
  // são empurradas para fora da área visível.
  const rowH = Math.min(16, (H - tY - 8) / linhas.length);
  const fs = rowH >= 12 ? 7 : (rowH >= 9 ? 6.3 : (rowH >= 7 ? 5.5 : 4.8));

  const mil = v => (v == null || isNaN(v)) ? '-' : Math.round(v / 1000).toLocaleString('pt-BR');

  // Real ÷ base − 1, sempre positiva, com o sentido na seta.
  // Base ZERADA com gasto = 100%. Base AUSENTE devolve null → "-", senão a
  // coluna cravaria "▲ 100%" em cima de um dado que não existe.
  const variacao = (base, real) => {
    if (real == null || isNaN(real)) return null;
    if (base == null || isNaN(base)) return null;
    if (base === 0) return real > 0.005 ? { pct: 100, maior: true, nulo: false } : null;
    const v = (real / base - 1) * 100;
    return { pct: Math.abs(v), maior: v > 0, nulo: v === 0 };
  };
  const numeroVar = va => {
    if (!va) return '-';
    const pp = Math.round(va.pct);
    if (pp === 0) return '0%';
    return (pp > 9999 ? '>9999' : pp.toLocaleString('pt-BR')) + '%';
  };
  const corVar = va => {
    if (!va || va.nulo) return DS.colors.textMuted;
    return va.maior ? VERM : VERDE;
  };

  linhas.forEach((l, i) => {
    const ry = tY + i * rowH;
    const destaque = l.tipo !== 'item';
    if (destaque) {
      _sRet_(slide, x0, ry, tableW, rowH - 0.5, l.tipo === 'total' ? DS.colors.brandDark : CINZA_EMPRESA);
    }
    const corTxt = destaque ? '#FFFFFF' : DS.colors.textMain;
    const indent = l.tipo === 'item' ? 12 : 4;
    _sTxt(slide, x0 + indent, ry, rubricaW - indent - 4, rowH, l.nome,
          l.tipo === 'total' ? fs + 0.4 : fs, destaque, corTxt, 'left');

    // Marca de centro que só existe numa das abas — explica o "-" da linha.
    if (l.so) {
      _sTxt(slide, x0 + rubricaW - 36, ry, 33, rowH,
            l.so === 'plano' ? 'só plano' : 'só ritmo', 4.6, false, DS.colors.textMuted, 'right');
    }

    [['mes', 'real'], ['acum', 'real'], ['ano', 'proj']].forEach(([campo, chaveReal], bi) => {
      const bloco = l.b[campo] || {};
      const aa   = bloco.aa;
      const meta = bloco.plan;
      const real = bloco[chaveReal];
      const c0 = bi * NCOL;

      [[0, mil(aa)], [1, mil(meta)], [2, mil(real)]].forEach(([k, txt]) => {
        _sTxt(slide, colX(c0 + k) - 6, ry, colW(c0 + k) + 11, rowH, txt,
              fs, destaque || k === 2, corTxt, 'center');
      });

      // Seta em caixa própria, colada à esquerda do número — junto no mesmo
      // texto o Slides quebrava "▲ 2.088%" em duas linhas na célula estreita.
      [[3, variacao(meta, real)], [4, variacao(aa, real)]].forEach(([k, va]) => {
        const cxx = colX(c0 + k), cww = colW(c0 + k);
        const cor = destaque ? '#E2E8F0' : corVar(va);
        if (va && !va.nulo) {
          _sTxt(slide, cxx + 1, ry, 8, rowH, va.maior ? '▲' : '▼', fs - 0.8, false, cor, 'center');
        }
        _sTxt(slide, cxx + 7, ry, cww - 9, rowH, numeroVar(va), fs, false, cor, 'right');
      });
    });
  });

  if (dados.avisos && dados.avisos.length) {
    _sTxt(slide, x0, H - 10, tableW, 9, '⚠ ' + dados.avisos[0], 5.2, false, DS.colors.accentOrange, 'left');
  }
}

// Encurta o nome do centro de custo para caber na coluna sem quebrar linha.
function _dreNomeCurto_(nome) {
  return String(nome)
    .replace(/^ARMAZÉM MONOUSUÁRIO /, 'ARM. ')
    .replace(/ DESPESAS?$/, '')
    .replace(/^LJ 0/, 'LJ ');
}


// Aviso de falha usando SÓ insertShape e CR_DESIGN_SYSTEM — nada de _sTxt,
// que pode ser exatamente a helper que faltou (ver lição 6 do CLAUDE.md).
// O aviso em si mora em 00_Helpers.gs (_slideFalha_), que usa só insertShape.
// Aqui fica apenas o título, que é o que muda de slide para slide.
function _dreFalha_(slide, x, y, w, h, erro) {
  _slideFalha_(slide, x, y, w, h, 'DRE DE MANUTENÇÃO NÃO FOI GERADO', erro,
    'Rode diagnosticarArquivos() no editor: ele diz qual arquivo recopiar.');
}


// ==========================================
// POSIÇÃO NO DECK
// ==========================================

/**
 * Põe o slide gerado no lugar certo da seção FINANCEIRO.
 *
 * POR QUE ISSO EXISTE: appendSlide joga no FIM do deck, e o rascunho tem uma
 * ordem montada à mão — capa da seção, DRE, BRIDGE, Torre CR, Torre
 * Demercado, CAPEX. Sem reposicionar, os dois slides sairiam depois do CAPEX,
 * fora da seção.
 *
 * DUAS CORRIDAS, DOIS CENÁRIOS:
 *   1ª vez — existe o slide reservado que o usuário criou (só o título "DRE"
 *      ou "BRIDGE"). Ele é apagado e o gerado assume a vaga.
 *   2ª em diante — o reservado já não existe, e o slide gerado da rodada
 *      anterior foi removido pela tag. Aí a posição vem da ÂNCORA: logo
 *      depois da capa da seção FINANCEIRO, no deslocamento pedido.
 *
 * A âncora é a capa de seção, não o slide vizinho, porque capa de seção é
 * feita à mão e não se move; slide gerado some e volta a cada rodada.
 *
 * Nunca lança: posição errada é chato, mas perder o slide inteiro por causa
 * dela seria pior. Falhou, fica no fim e o Logger conta.
 */
function _drePosicionarNaSecao_(deck, slide, tituloReservado, offsetNaSecao) {
  try {
    // Apaga o slide reservado — mas nunca o que acabamos de desenhar.
    deck.getSlides().forEach(s => {
      if (s.getObjectId() === slide.getObjectId()) return;
      if (_dreTituloDoSlide_(s) === tituloReservado) {
        s.remove();
        Logger.log('DRE/Bridge: slide reservado "' + tituloReservado + '" substituído pelo gerado.');
      }
    });

    const slides = deck.getSlides();
    let capa = -1;
    for (let i = 0; i < slides.length; i++) {
      const t = _dreTextoDoSlide_(slides[i]);
      // Capa de SEÇÃO, não o quadrante "GESTÃO FINANCEIRA · ORÇAMENTO" do
      // Dashboard: só a capa traz "APRESENTAÇÃO MENSAL" junto.
      if (t.indexOf('FINANCEIRO') !== -1 && t.indexOf('APRESENTAÇÃO MENSAL') !== -1) { capa = i; break; }
    }
    if (capa < 0) {
      Logger.log('DRE/Bridge: capa da seção FINANCEIRO não encontrada; slide fica no fim do deck.');
      return;
    }

    const destino = Math.min(capa + offsetNaSecao, slides.length - 1);
    slide.move(destino);
  } catch (e) {
    Logger.log('DRE/Bridge: não consegui posicionar na seção (' + e.message + '); fica no fim.');
  }
}

// Todo o texto de um slide, para casar âncora e título.
function _dreTextoDoSlide_(slide) {
  let txt = '';
  try {
    slide.getPageElements().forEach(el => {
      try {
        const t = el.asShape().getText().asString();
        if (t) txt += t + '\n';
      } catch (e) {}
    });
  } catch (e) {}
  return txt.toUpperCase();
}

// A primeira linha com texto — é o título do slide reservado ("DRE"/"BRIDGE").
// Compara a linha INTEIRA, não "contém": o slide gerado começa com
// "DRE — MANUTENÇÃO" e não pode casar com o reservado "DRE".
function _dreTituloDoSlide_(slide) {
  const linhas = _dreTextoDoSlide_(slide).split('\n').map(l => l.trim()).filter(String);
  return linhas.length ? linhas[0] : '';
}



function gerarSlideBridgeManutencao() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  _slideLimpar_(deck, TAG_BRIDGE_MANUTENCAO);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _slideNovo_(deck, TAG_BRIDGE_MANUTENCAO);

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
    _sRet_(slide, x + 8, cy, w - 16, cardH - 5, l.cor, 0.08);
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
  _sRet_(slide, x + 4, y, w - 8, headH, DS.colors.brandDark);
  cols.forEach(c => _sTxt(slide, c.x - 5, y + 2, c.w + 10, headH - 4, c.t, 7, true, '#FFFFFF', 'center'));

  const startY = y + headH + 3;
  const rowH = Math.max(13, Math.min(21, (h - headH - 8) / d.meses.length));
  const fs = rowH >= 18 ? 7.2 : (rowH >= 15 ? 6.6 : 6);
  const mil = v => (v == null) ? '-' : _brgMilhar_(Math.round(v / 1000));

  d.meses.forEach((m, i) => {
    const ry = startY + i * rowH;
    _sRet_(slide, x + 4, ry, w - 8, rowH, i % 2 ? '#F8FAFC' : '#FFFFFF');
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

  _slideLimpar_(deck, TAG_BRIDGE_GRAFICO);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const slide = _slideNovo_(deck, TAG_BRIDGE_GRAFICO);

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

  _sRet_(slide, plotX + slotW * 0.1, zeroY, plotW - slotW * 0.2, 1.2, '#94A3B8');
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

    _sRet_(slide, bx, by, barW, alt, cor, ritmo ? 0.55 : 1);
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

