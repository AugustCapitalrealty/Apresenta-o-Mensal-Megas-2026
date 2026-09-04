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
      // Fallback: busca qualquer slide que tenha FINANCEIRO sem ser o quadrante do dashboard
      for (let i = 0; i < slides.length; i++) {
        const t = _dreTextoDoSlide_(slides[i]);
        if (t.indexOf('FINANCEIRO') !== -1 && t.indexOf('ORÇAMENTO') === -1) { capa = i; break; }
      }
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
        if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
          const sh = el.asShape();
          try {
            const t = sh.getText();
            if (t) {
              const s = t.asString();
              if (s) txt += s + '\n';
            }
          } catch (e) {}
        }
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
// PAINEL DE RESUMO (esquerda) — padrão Facilities
// ==========================================

function _brgResumo_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM;
  criarCardPainel(slide, x, y, w, h, null, DS.colors.brandDark);

  const _txt = (texto, fx, fy, fw, fh, size, bold, cor, align) => {
    if (texto == null || texto === '') return null;
    const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx, fy, fw, fh);
    const t = b.getText();
    t.setText(String(texto)).getTextStyle()
      .setFontSize(size).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
    if (align === 'C') t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    if (align === 'R') t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    return b;
  };

  const _val = (valorStr, fx, fy, fw, size, cor) => {
    if (valorStr == null || valorStr === '') return null;
    const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, fx, fy, fw, size + 11);
    const t = b.getText();
    t.setText(String(valorStr)).getTextStyle()
      .setFontSize(size).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
    t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.END);
    b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    return b;
  };

  const totalOrc     = d.total.acum.plan || 0;
  const totalReal    = d.total.acum.real || 0;
  const totalVar     = totalOrc - totalReal; // >= 0: abaixo do orçado (economia)
  const abaixo       = totalVar >= 0;
  const corVar       = abaixo ? '#166534' : '#DC2626';
  const bgVar        = abaixo ? '#F0FDF4' : '#FEF2F2';
  const varLabel     = abaixo ? '▼ ABAIXO DO ORÇADO' : '▲ ACIMA DO ORÇADO';
  const varPctStr    = totalOrc > 0 ? (Math.abs(totalVar / totalOrc) * 100).toFixed(1).replace('.', ',') + '%' : '0%';

  const totalOrcAnual  = d.total.ano.plan || 0;
  const totalProjetado = d.total.ano.proj || 0;
  const varAnual       = totalOrcAnual - totalProjetado;
  const abaixoAnual    = varAnual >= 0;
  const corAnual       = abaixoAnual ? '#166534' : '#DC2626';
  const sinalAnual     = abaixoAnual ? '▼ ' : '▲ ';

  let cy = y + 10;
  _txt('RESUMO DO PERÍODO', x + 12, cy, w - 20, 16, 7.5, true, '#64748B');
  cy += 20;

  // ORÇADO
  _txt('ORÇADO', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 13;
  _val(_brgMoeda_(totalOrc), x + 12, cy, w - 24, 11, DS.colors.textMain);
  cy += 24;

  // REALIZADO
  _txt('REALIZADO', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 13;
  _val(_brgMoeda_(totalReal), x + 12, cy, w - 24, 11, DS.colors.textMain);
  cy += 24;

  // Pill variação do período
  cy += 4;
  const pillBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 10, cy, w - 20, 52);
  pillBox.getFill().setSolidFill(bgVar); pillBox.getBorder().setTransparent();

  _txt(varLabel, x + 10, cy + 4, w - 20, 16, 7, true, corVar, 'C');
  _txt(_brgMoeda_(Math.abs(totalVar)), x + 10, cy + 20, w - 20, 18, 11, true, corVar, 'C');
  _txt(varPctStr + ' do orçado do período', x + 10, cy + 38, w - 20, 13, 7, false, corVar, 'C');
  cy += 62;

  // Divisor
  const div = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 10, cy, w - 20, 1);
  div.getFill().setSolidFill(DS.colors.lines || '#E2E8F0'); div.getBorder().setTransparent();
  cy += 10;

  // Projeção Anual
  _txt('PROJEÇÃO ANUAL (REAL + RITMO)', x + 12, cy, w - 20, 13, 6, true, '#94A3B8');
  cy += 14;

  _txt('ORÇADO', x + 12, cy, 60, 13, 6, true, '#94A3B8');
  _val(_brgMoeda_(totalOrcAnual), x + 12, cy, w - 24, 9, DS.colors.textMain);
  cy += 20;

  _txt('PROJETADO', x + 12, cy, 60, 13, 6, true, '#94A3B8');
  _val(_brgMoeda_(totalProjetado), x + 12, cy, w - 24, 9, DS.colors.textMain);
  cy += 20;

  _val(sinalAnual + _brgMoeda_(Math.abs(varAnual)), x + 12, cy, w - 24, 9, corAnual);
}


// ==========================================
// TABELA DE VARIAÇÃO (direita) — padrão Facilities
// ==========================================

function _brgTabela_(slide, x, y, w, h, d) {
  const DS = CR_DESIGN_SYSTEM;
  const pad = 12, x0 = x + pad, useW = w - 2 * pad;

  let acc = 0;
  const col = (t, f, a) => { const o = { t: t, x: x0 + acc * useW, w: useW * f, a: a || 'C' }; acc += f; return o; };
  const cols = [
    col('MÊS', 0.13),
    col('TIPO', 0.11),
    col('ORÇADO', 0.21),
    col('REAL/RITMO', 0.21),
    col('VARIAÇÃO', 0.21),
    col('VAR %', 0.13)
  ];

  const headH = 22;
  _sRet_(slide, x + 4, y, w - 8, headH, DS.colors.brandDark);
  cols.forEach(c => {
    const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, c.x, y + 3, c.w, headH - 6);
    const t = b.getText();
    t.setText(c.t).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#FFFFFF').setFontFamily('Montserrat');
    t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });

  const startY = y + headH + 4;
  const availH = h - headH - 34;
  const rowH   = Math.max(14, Math.min(21, availH / d.meses.length));

  d.meses.forEach((m, i) => {
    const ry = startY + i * rowH;
    const abaixo = m.variacao != null && m.variacao >= 0;
    const corVar = m.tipo === 'RITMO' ? '#D97706' : (abaixo ? '#166534' : '#DC2626');
    const bgVarPill = m.tipo === 'RITMO' ? '#FFF7ED' : (abaixo ? '#F0FDF4' : '#FEF2F2');
    const bgRow  = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    const varPct = (m.plan && m.variacao != null)
      ? (Math.abs(m.variacao / m.plan) * 100).toFixed(1).replace('.', ',') + '%' : '-';
    const seta   = abaixo ? '▼ ' : '▲ ';

    // Fundo zebrado
    const zebra = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, ry, w - 8, rowH);
    zebra.getFill().setSolidFill(bgRow); zebra.getBorder().setTransparent();

    const _cel = (texto, col, cor, bold) => {
      if (texto == null || texto === '') return null;
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col.x, ry, col.w, rowH);
      const t = b.getText();
      t.setText(String(texto)).getTextStyle()
        .setFontSize(7.5).setBold(!!bold).setForegroundColor(cor).setFontFamily('Montserrat');
      t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      return b;
    };

    _cel(m.label, cols[0], DS.colors.brandDark, true);

    // Pill TIPO (REAL / RITMO)
    const pillH = Math.min(rowH - 4, 14);
    const pillW = cols[1].w - 4;
    const pillX = cols[1].x + 2;
    const pillY = ry + (rowH - pillH) / 2;
    const corPill = m.tipo === 'RITMO' ? '#D97706' : (abaixo ? '#10B981' : '#EF4444');
    const pillBg  = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, pillX, pillY, pillW, pillH);
    pillBg.getFill().setSolidFill(corPill); pillBg.getBorder().setTransparent();
    _sTxt(slide, cols[1].x, ry, cols[1].w, rowH, m.tipo === 'RITMO' ? 'RITMO' : 'REAL', 5.5, true, '#FFFFFF', 'center');

    _cel(_brgMoeda_(m.plan), cols[2], DS.colors.textBody, false);
    _cel(_brgMoeda_(m.real), cols[3], DS.colors.textMain, true);
    _cel(m.variacao == null ? '-' : seta + _brgMoeda_(Math.abs(m.variacao)), cols[4], corVar, true);

    // Pill VAR%
    const vPillH = Math.min(rowH - 4, 14);
    const vPillW = cols[5].w - 4;
    const vPillX = cols[5].x + 2;
    const vPillY = ry + (rowH - vPillH) / 2;
    const vBg    = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, vPillX, vPillY, vPillW, vPillH);
    vBg.getFill().setSolidFill(bgVarPill); vBg.getBorder().setTransparent();
    _sTxt(slide, cols[5].x, ry, cols[5].w, rowH, varPct, 6, true, corVar, 'center');
  });

  // Linha de Totais (PERÍODO)
  const totY = startY + d.meses.length * rowH + 4;
  if (totY + 24 <= y + h) {
    const sep = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x + 4, totY, w - 8, 1);
    sep.getFill().setSolidFill(DS.colors.lines || '#E2E8F0'); sep.getBorder().setTransparent();

    const totBar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x + 4, totY + 3, w - 8, 22);
    totBar.getFill().setSolidFill('#EEF2F7'); totBar.getBorder().setTransparent();

    const _totCel = (txt, col, cor) => {
      if (txt == null || txt === '') return null;
      const b = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, col.x, totY + 3, col.w, 22);
      const t = b.getText();
      t.setText(String(txt)).getTextStyle()
        .setFontSize(7.5).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
      t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      b.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      return b;
    };

    const totalOrc = d.total.acum.plan || 0;
    const totalReal = d.total.acum.real || 0;
    const totalVar = totalOrc - totalReal;
    const abTot = totalVar >= 0;
    const corTot = abTot ? '#166534' : '#DC2626';
    const pct = totalOrc > 0 ? (Math.abs(totalVar / totalOrc) * 100).toFixed(1).replace('.', ',') + '%' : '-';

    _totCel('PERÍODO', cols[0], DS.colors.brandDark);
    _totCel(_brgMoeda_(totalOrc), cols[2], DS.colors.brandDark);
    _totCel(_brgMoeda_(totalReal), cols[3], DS.colors.brandDark);
    _totCel((abTot ? '▼ ' : '▲ ') + _brgMoeda_(Math.abs(totalVar)), cols[4], corTot);
    _totCel(pct, cols[5], corTot);
  }
}


// ==========================================
// SLIDE 2 — GRÁFICO WATERFALL (BRIDGE)
// ==========================================

/**
 * Gráfico Bridge no padrão oficial Facilities (Slide06_FinanceiroBridge.gs).
 *
 * Parte do Orçado anual e aplica a variação de cada mês, terminando no
 * Realizado/Projetado.
 *
 * Convenção Facilities:
 * - Acima do orçado (real > orç) = barra para CIMA em vermelho (#EF4444);
 * - Abaixo do orçado (economia, real < orç) = barra para BAIXO em verde (#10B981);
 * - Meses de RITMO = âmbar (#F59E0B);
 * - Ponta direita: barra do PROJETADO com desvio vs orçamento anual.
 * - Dois chips de resumo no topo: REALIZADO ATÉ AGORA e PROJEÇÃO ANUAL.
 */
function gerarSlideBridgeManutencaoGrafico() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();

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
  card.getFill().setSolidFill(DS.colors.cardBg || '#FFFFFF');
  card.getBorder().getLineFill().setSolidFill(DS.colors.lines || '#E2E8F0');
  card.getBorder().setWeight(1);

  const totalOrcReal   = d.total.acum.plan || 0;
  const totalReal      = d.total.acum.real || 0;
  const totalVar       = totalOrcReal - totalReal; // >0 = gastou menos = abaixo do orçado (bom)
  const pctReal        = totalOrcReal > 0 ? (Math.abs(totalVar / totalOrcReal) * 100).toFixed(1).replace('.', ',') : '0';

  const totalOrcAnual  = d.total.ano.plan || 0;
  const totalProjetado = d.total.ano.proj || 0;
  const varAnual       = totalOrcAnual - totalProjetado; // >0 = gastou menos no ano = abaixo do orçado (bom)
  const pctAnual       = totalOrcAnual > 0 ? (Math.abs(varAnual / totalOrcAnual) * 100).toFixed(1).replace('.', ',') : '0';

  // ── Chips de resumo no topo (padrão Facilities) ─────────────────────────
  const chip = (cx, cw, titulo, valor, positivo) => {
    const bgC  = positivo ? '#F0FDF4' : '#FEF2F2';
    const txtC = positivo ? '#166534' : '#DC2626';
    const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y + 9, cw, 30);
    box.getFill().setSolidFill(bgC); box.getBorder().setTransparent();
    const t = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 10, y + 9, cw - 20, 30);
    const tr = t.getText();
    tr.setText(titulo + '  ' + valor);
    tr.getTextStyle().setFontSize(8.5).setBold(true).setForegroundColor(txtC).setFontFamily('Montserrat');
    if (typeof tr.getRange === 'function' && titulo) {
      try {
        tr.getRange(0, titulo.length).getTextStyle().setFontSize(7).setForegroundColor(positivo ? '#15803D' : '#B91C1C');
      } catch (e) {}
    }
    t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  };

  chip(x + 16, 300, 'REALIZADO ATÉ AGORA',
       (totalVar >= 0 ? '▼ ' : '▲ ') + _brgMoeda_(Math.abs(totalVar)) + ' ' +
       (totalVar >= 0 ? 'abaixo' : 'acima') + ' do orçado (' + pctReal + '%)', totalVar >= 0);
  chip(x + 16 + 312, 280, 'PROJEÇÃO ANUAL',
       (varAnual >= 0 ? '▼ ' : '▲ ') + _brgMoeda_(Math.abs(varAnual)) + ' ' +
       (varAnual >= 0 ? 'abaixo' : 'acima') + ' (' + pctAnual + '%)', varAnual >= 0);

  // ── Barras divergentes: variação mensal vs orçado ────────────────────────
  // delta = real - plan (>0 = acima do orçado = barra p/ CIMA em vermelho/âmbar;
  // <0 = abaixo do orçado = economia = barra p/ BAIXO em verde/âmbar).
  const deltaProj = totalProjetado - totalOrcAnual;

  const meses = d.meses.map(m => {
    const delta = (m.real != null && m.plan != null) ? m.real - m.plan : 0;
    return {
      label: m.label,
      delta: delta,
      cor: m.tipo === 'RITMO' ? '#F59E0B' : (delta > 0 ? '#EF4444' : '#10B981'),
      ritmo: m.tipo === 'RITMO'
    };
  });

  const maxUp   = Math.max(1, deltaProj > 0 ? deltaProj : 0, ...meses.filter(m => m.delta > 0).map(m => m.delta));
  const maxDown = Math.max(1, deltaProj < 0 ? -deltaProj : 0, ...meses.filter(m => m.delta < 0).map(m => -m.delta));

  const plotX = x + 24;
  const plotY = y + 56;
  const plotW = w - 48;
  const plotH = h - 56 - 44; // reserva topo (chips) e rodapé (legenda)

  let fracUp = maxUp / (maxUp + maxDown);
  fracUp = Math.max(0.25, Math.min(0.75, fracUp));
  const upH   = (plotH - 30) * fracUp;
  const downH = (plotH - 30) * (1 - fracUp);
  const zeroY = plotY + 15 + upH;

  const n     = meses.length;
  const slotW = plotW / (n + 2);
  const barW  = Math.min(slotW * 0.5, 34);

  // Linha do zero (eixo)
  const eixo = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, plotX + slotW * 0.1, zeroY, plotW - slotW * 0.2, 1.4);
  eixo.getFill().setSolidFill('#94A3B8'); eixo.getBorder().setTransparent();

  // ── Ponta esquerda: ORÇADO ANUAL = ponto zero (sem barra, só o valor) ────
  {
    const valBox = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      plotX - slotW * 0.25, zeroY - 30, slotW * 1.5, 24);
    const vr = valBox.getText();
    vr.setText(_brgMoedaCompacta_(totalOrcAnual)).getTextStyle()
      .setFontSize(7.5).setBold(true).setForegroundColor('#475569').setFontFamily('Montserrat');
    vr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const cap = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,
      plotX - slotW * 0.25, zeroY + 4, slotW * 1.5, 22);
    cap.getText().setText('ORÇADO\nANUAL').getTextStyle()
      .setFontSize(6).setBold(true).setForegroundColor(DS.colors.brandDark).setFontFamily('Montserrat');
    cap.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // ── Ponta direita: PROJETADO como DESVIO do zero ─────────────────────────
  {
    const slotIdx = n + 1;
    const mag  = Math.abs(deltaProj);
    const hBar = Math.max(deltaProj > 0 ? (mag / maxUp) * upH : (mag / maxDown) * downH, 3);
    const yBar = deltaProj > 0 ? zeroY - hBar : zeroY + 1.4;
    const cor  = deltaProj > 0 ? '#EF4444' : '#10B981';
    const cx   = plotX + slotIdx * slotW + (slotW - barW) / 2;

    const bar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, yBar, barW, hBar);
    bar.getFill().setSolidFill(cor); bar.getBorder().setTransparent();

    const bloco  = (deltaProj > 0 ? '+' : '−') + _brgMoedaCompacta_(mag);
    const blocoH = 14;
    const lblY   = deltaProj > 0 ? yBar - blocoH - 6 : yBar + hBar + 6;
    const lbl    = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, lblY, slotW * 1.5, blocoH);
    const lr     = lbl.getText();
    lr.setText(bloco).getTextStyle().setFontSize(6.5).setBold(true).setForegroundColor(cor).setFontFamily('Montserrat');
    lr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    const capH = 22;
    const capY = deltaProj > 0 ? zeroY + 4 : zeroY - capH - 3;
    const capProj = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, capY, slotW * 1.5, capH);
    const capTxt = 'PROJETADO\n' + _brgMoedaCompacta_(totalProjetado);
    const cr = capProj.getText();
    cr.setText(capTxt).getTextStyle()
      .setFontSize(6).setBold(true).setForegroundColor(DS.colors.brandDark).setFontFamily('Montserrat');
    if (typeof cr.getRange === 'function') {
      try {
        cr.getRange(capTxt.indexOf('\n') + 1, capTxt.length)
          .getTextStyle().setBold(false).setForegroundColor('#64748B');
      } catch (e) {}
    }
    cr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // ── Barras de variação mensal (slots 1..n) ──────────────────────────────
  meses.forEach((m, i) => {
    const slotIdx = i + 1;
    const cx   = plotX + slotIdx * slotW + (slotW - barW) / 2;
    const mag  = Math.abs(m.delta);
    const hBar = Math.max(m.delta > 0 ? (mag / maxUp) * upH : (mag / maxDown) * downH, 3);
    const yBar = m.delta > 0 ? zeroY - hBar : zeroY + 1.4;

    const bar = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, yBar, barW, hBar);
    bar.getFill().setSolidFill(m.cor); bar.getBorder().setTransparent();

    const bloco  = (m.delta > 0 ? '+' : '−') + _brgMoedaCompacta_(mag);
    const blocoH = 14;
    const lblY   = m.delta > 0 ? yBar - blocoH - 6 : yBar + hBar + 6;
    const lbl    = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, lblY, slotW * 1.5, blocoH);
    const lr     = lbl.getText();
    lr.setText(bloco).getTextStyle().setFontSize(6.5).setBold(true).setForegroundColor(m.cor).setFontFamily('Montserrat');
    lr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Mês junto ao eixo, do lado oposto ao da barra
    const mesY = m.delta > 0 ? zeroY + 4 : zeroY - 15;
    const mes  = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, plotX + slotIdx * slotW - slotW * 0.25, mesY, slotW * 1.5, 12);
    mes.getText().setText(m.label).getTextStyle()
      .setFontSize(6).setBold(m.ritmo).setForegroundColor(m.ritmo ? '#B45309' : '#64748B').setFontFamily('Montserrat');
    mes.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  });

  // ── Legenda centralizada no rodapé do card (padrão Facilities) ───────────
  _bridgeLegenda(slide, x + (w - 240) / 2, y + h - 26);
}

function _bridgeLegenda(slide, x, y) {
  const itens = [
    { cor: '#10B981', txt: 'Abaixo' },
    { cor: '#EF4444', txt: 'Acima' },
    { cor: '#F59E0B', txt: 'Projetado' }
  ];
  let cx = x;
  itens.forEach(it => {
    const box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, cx, y + 2, 9, 9);
    box.getFill().setSolidFill(it.cor); box.getBorder().setTransparent();
    const tb = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, cx + 12, y - 2, 60, 14);
    tb.getText().setText(it.txt).getTextStyle()
      .setFontSize(7).setForegroundColor('#64748B').setFontFamily('Montserrat');
    cx += 80;
  });
}

function _brgLegenda_(slide, x, y) {
  return _bridgeLegenda(slide, x, y);
}

function _brgMoeda_(valor) {
  if (valor == null || isNaN(valor)) return '—';
  return 'R$ ' + _milhar_(Math.round(valor));
}

function _brgMoedaCompacta_(valor) {
  if (valor == null || isNaN(valor)) return '—';
  valor = Number(valor);
  if (Math.abs(valor) >= 1000) return 'R$ ' + _milhar_(Math.round(valor / 1000)) + ' mil';
  return 'R$ ' + _milhar_(Math.round(valor));
}

