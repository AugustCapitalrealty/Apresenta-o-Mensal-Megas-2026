/**
 * ARQUIVO: Slide_DREManutencao.gs
 * SLIDE — DRE DE MANUTENÇÃO
 *
 * MESMO FORMATO DO DRE DOS MEGAS (megas-mensal/Slide_DRE.gs): três blocos de
 * cinco colunas, na ordem que a diretoria pediu lá — os VALORES em linha do
 * tempo (de onde viemos, o que foi planejado, onde chegamos) e as VARIAÇÕES
 * depois deles:
 *
 *     2025 | Meta | Real | Δ% Meta | Δ% 2025
 *
 *   Bloco 1 — MÊS (mês de referência)
 *   Bloco 2 — ACUMULADO (Jan..mês de referência)
 *   Bloco 3 — REALIZADO + RITMO — ANO, em cor própria: é o FUTURO
 *
 * De onde vem cada coluna nesta apresentação:
 *   2025 → "Realizado AA" da aba PLANEJAMENTO (é o ritmo do ano anterior)
 *   Meta → "Planejado" da mesma aba, fixo o ano inteiro
 *   Real → "Realizado" da aba RITMO; no bloco do ANO é o splice real+ritmo
 *
 * Restrito à subárvore 06.04.15.01 (manutenção imóveis). A hierarquia dos
 * Megas é TOTAL → CATEGORIA → rubricas; aqui é TOTAL → EMPRESA → centros de
 * custo, que é a mesma forma com outro nome.
 *
 * "% Var" é VARIAÇÃO, não atingimento: Real ÷ base − 1, sempre em módulo, com
 * a seta dando o sentido — ▲ vermelha gastou MAIS, ▼ verde gastou MENOS. É o
 * contrário da intuição de gráfico, e é o motivo de a seta existir em vez de
 * só o sinal. Base ZERADA com gasto = 100%; base AUSENTE devolve "-", porque
 * sem o dado não dá para afirmar variação nenhuma.
 *
 * Valores em R$ MIL, sempre inteiros.
 */

function gerarSlideDREManutencao() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  if (typeof _tabRemoverPorTag_ === 'function') _tabRemoverPorTag_(deck, TAG_DRE_MANUTENCAO);

  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  if (typeof _tabMarcarSlide_ === 'function') _tabMarcarSlide_(slide, TAG_DRE_MANUTENCAO);

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

  const cabRub = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, blocoY, rubricaW - 1, blocoH + subH);
  cabRub.getFill().setSolidFill(DS.colors.brandDark);
  cabRub.getBorder().setTransparent();
  _sTxt(slide, x0 + 4, blocoY, rubricaW - 8, blocoH + subH, 'R$ MIL', 7, true, '#FFFFFF', 'left');

  blocos.forEach(b => {
    const bx = colX(b.c0), bw = blocoW(b.c0) - 1;
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, blocoY, bw, blocoH);
    bg.getFill().setSolidFill(b.cor); bg.getBorder().setTransparent();
    _sTxt(slide, bx, blocoY, bw, blocoH, b.txt, 6.5, true, '#FFFFFF', 'center');

    [String(anoAnt), 'Meta', 'Real', 'Δ% Meta', 'Δ% ' + anoAnt].forEach((t, i) => {
      const sx = colX(b.c0 + i), sw = colW(b.c0 + i) - 1;
      const sb = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, sx, blocoY + blocoH, sw, subH);
      sb.getFill().setSolidFill(b.futuro ? '#0A4C86' : DS.colors.brandDark);
      sb.getBorder().setTransparent();
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
      const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x0, ry, tableW, rowH - 0.5);
      bg.getFill().setSolidFill(l.tipo === 'total' ? DS.colors.brandDark : CINZA_EMPRESA);
      bg.getBorder().setTransparent();
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
function _dreFalha_(slide, x, y, w, h, erro) {
  const DS = CR_DESIGN_SYSTEM;
  const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 15, y + 40, w - 30, 80);
  bg.getFill().setSolidFill(DS.colors.accentRed, 0.08);
  bg.getBorder().setTransparent();
  const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, x + 25, y + 48, w - 50, 64);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  const tr = tb.getText();
  tr.setText('');
  tr.appendText('DRE DE MANUTENÇÃO NÃO FOI GERADO\n').getTextStyle()
    .setFontSize(11).setBold(true).setForegroundColor(DS.colors.accentRed)
    .setFontFamily(DS.typography.body);
  tr.appendText(String((erro && erro.message) || erro)).getTextStyle()
    .setFontSize(8.5).setForegroundColor(DS.colors.textMain).setFontFamily(DS.typography.body);
  tr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
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
