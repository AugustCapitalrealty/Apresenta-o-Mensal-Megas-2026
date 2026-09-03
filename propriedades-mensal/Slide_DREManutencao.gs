/**
 * ARQUIVO: Slide_DREManutencao.gs
 * SLIDE — DRE DE MANUTENÇÃO (por centro de custo)
 *
 * Tabela no plano de contas da controladoria, restrita à subárvore
 * 06.04.15.01 (manutenção imóveis). Três recortes, cada um com 3 colunas —
 * os VALORES juntos e a VARIAÇÃO no fim de cada bloco, para não misturar as
 * duas leituras (mesma escolha do DRE dos Megas):
 *
 *   MÊS (ref)   Plano | Real  | Δ%
 *   ACUMULADO   Plano | Real  | Δ%      (Jan..mês de referência)
 *   ANO         Plano | Proj. | Δ%      (projeção = real + ritmo; é o FUTURO)
 *
 * O bloco ANO usa PROJEÇÃO, não realizado: realizado do ano ainda não
 * existe em setembro. E projeção aqui é o splice real+ritmo, não a soma da
 * coluna de ritmo da planilha — ver Dados_DREManutencao.gs.
 *
 * Δ% é VARIAÇÃO contra o plano (real ÷ plano − 1), em módulo, com seta
 * indicando o sentido: ▲ vermelha gastou MAIS que o planejado, ▼ verde
 * gastou MENOS. Sem plano (centro que só existe na aba de ritmo) a coluna
 * mostra "—", nunca 100%.
 *
 * Valores em R$ MIL, sem decimais — no total do ano são centenas de milhares,
 * e centavos numa tabela de 16 linhas só atrapalham a leitura.
 */

function gerarSlideDREManutencao() {
  const dados = obterDREManutencao_();
  const deck  = getDeckMensal_();
  const DS    = CR_DESIGN_SYSTEM;

  if (typeof _tabRemoverPorTag_ === 'function') _tabRemoverPorTag_(deck, TAG_DRE_MANUTENCAO);

  const W = deck.getPageWidth(), H = deck.getPageHeight();
  const marginX = 24, topY = 76;
  const cardH = (H - 14) - topY;

  const slide = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(DS.colors.bgSlide);
  if (typeof _tabMarcarSlide_ === 'function') _tabMarcarSlide_(slide, TAG_DRE_MANUTENCAO);

  if (!dados) {
    criarHeaderPadrao(slide, 'DRE — MANUTENÇÃO', 'Planejado × Realizado por centro de custo');
    criarCardPainel(slide, marginX, topY, W - 2 * marginX, cardH, 'SEM DADOS', DS.colors.themeCorr);
    _dreFalha_(slide, marginX, topY, W - 2 * marginX, cardH,
      new Error('Não foi possível ler as abas "' + DRE_ABA_PLANEJAMENTO + '" e "' +
                DRE_ABA_RITMO + '".'));
    return;
  }

  const ref = dados.ref;
  criarHeaderPadrao(slide, 'DRE — MANUTENÇÃO',
    'Planejado × Realizado por centro de custo — ' + ref.nome + ' ' + ref.ano +
    ' · valores em R$ mil');

  try {
    _dreTabela_(slide, marginX, topY, W - 2 * marginX, cardH, dados);
  } catch (e) {
    _dreFalha_(slide, marginX, topY, W - 2 * marginX, cardH, e);
    Logger.log('DRE Manutenção: falhou ao desenhar — ' + e.message);
  }
}


// ==========================================
// DESENHO
// ==========================================

function _dreTabela_(slide, x, y, w, h, dados) {
  const DS = CR_DESIGN_SYSTEM;
  const cor = DS.colors.brandMed;
  const contentY = criarCardPainel(slide, x, y, w, h,
    'MANUTENÇÃO IMÓVEIS · ' + DRE_CONTA_RAIZ, cor);

  const listY = contentY + 2;
  const CC_W  = 176;                       // coluna do centro de custo
  const COLS  = 9;                         // 3 blocos × 3 colunas
  const gridX = x + 12 + CC_W;
  const colW  = (w - 24 - CC_W) / COLS;

  const HDR1 = 13, HDR2 = 12;
  const nomes = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const blocos = [
    { rot: nomes[dados.refIndex] + '/' + String(dados.ref.ano).slice(-2), campo: 'mes',  b: 'real' },
    { rot: 'ACUMULADO',                                                   campo: 'acum', b: 'real' },
    { rot: 'ANO (PROJEÇÃO)',                                              campo: 'ano',  b: 'proj' }
  ];

  // Faixa de bloco: agrupa visualmente as 3 colunas de cada recorte, senão
  // nove números seguidos viram uma parede indistinguível.
  blocos.forEach((bl, i) => {
    const bx = gridX + i * 3 * colW;
    const faixa = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, bx, listY, colW * 3 - 2, HDR1);
    faixa.getFill().setSolidFill(cor, i === 2 ? 0.20 : 0.10);
    faixa.getBorder().setTransparent();
    _sTxt(slide, bx, listY, colW * 3 - 2, HDR1, bl.rot, 6.5, true, cor, 'center');
  });

  const sub = ['Plano', 'Real', 'Δ%'];
  const y2 = listY + HDR1;
  _sTxt(slide, x + 12, listY, CC_W, HDR1 + HDR2, 'CENTRO DE CUSTO', 7, true, cor, 'left');
  blocos.forEach((bl, i) => {
    sub.forEach((sr, j) => {
      const rot = (j === 1 && bl.campo === 'ano') ? 'Proj.' : sr;
      _sTxt(slide, gridX + (i * 3 + j) * colW, y2, colW, HDR2, rot, 6, true, DS.colors.textMuted, 'center');
    });
  });
  _dreLinha_(slide, x + 12, y2 + HDR2, w - 24, cor, 1);

  // Altura por linha: 16 centros + 2 subtotais + 1 total = 19 linhas.
  const nLinhas = dados.empresas.reduce((s, e) => s + e.centros.length + 1, 0) + 1;
  const dispo   = (y + h) - (y2 + HDR2) - 8;
  const rowH    = Math.max(9, Math.min(15, dispo / nLinhas));
  const fs      = rowH >= 13 ? 6.8 : 6.2;

  let cy = y2 + HDR2 + 2;

  // TOTAL primeiro, como no DRE dos Megas: a linha que resume vem no topo,
  // não no rodapé, porque é a que se olha primeiro.
  _dreLinhaValores_(slide, x + 12, cy, CC_W, gridX, colW, rowH,
    'TOTAL MANUTENÇÃO', dados.total, blocos, DS.colors.brandDark, true, cor, fs + 0.4, null);
  cy += rowH + 1;

  dados.empresas.forEach(emp => {
    _dreLinhaValores_(slide, x + 12, cy, CC_W, gridX, colW, rowH,
      emp.codigo + ' · ' + emp.nome, emp.total, blocos, DS.colors.brandMed, true, cor, fs + 0.2, null);
    cy += rowH;

    emp.centros.forEach(c => {
      _dreLinhaValores_(slide, x + 12, cy, CC_W, gridX, colW, rowH,
        '   ' + _dreNomeCurto_(c.nome), c, blocos, DS.colors.textBody, false, cor, fs, c.so);
      cy += rowH;
    });
    cy += 2;
  });

  // Divisores entre blocos.
  for (let i = 1; i < 3; i++) {
    const lx = gridX + i * 3 * colW - 1;
    const d = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, lx, listY, 0.75, cy - listY - 2);
    d.getFill().setSolidFill(DS.colors.lines);
    d.getBorder().setTransparent();
  }

  if (dados.avisos && dados.avisos.length) {
    _sTxt(slide, x + 12, y + h - 11, w - 24, 10, '⚠ ' + dados.avisos[0], 5.5, false,
          DS.colors.accentOrange, 'left');
  }
}

function _dreLinhaValores_(slide, xRot, y, wRot, gridX, colW, h, rotulo, item, blocos, corTxt, bold, corTema, fs, so) {
  const DS = CR_DESIGN_SYSTEM;
  if (bold) {
    const bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, xRot, y, wRot + colW * 9, h);
    bg.getFill().setSolidFill(corTema, 0.06);
    bg.getBorder().setTransparent();
  }
  _sTxt(slide, xRot, y, wRot, h, rotulo, fs, bold, corTxt, 'left');

  blocos.forEach((bl, i) => {
    const bloco = item[bl.campo] || {};
    const plano = bloco.plan;
    const real  = bloco[bl.b];

    _sTxt(slide, gridX + (i * 3) * colW,     y, colW, h, _dreMil_(plano), fs, false, DS.colors.textMuted, 'center');
    _sTxt(slide, gridX + (i * 3 + 1) * colW, y, colW, h, _dreMil_(real),  fs, bold,  corTxt,              'center');

    const v = _dreVariacao_(plano, real);
    _sTxt(slide, gridX + (i * 3 + 2) * colW, y, colW, h, v.txt, fs, false, v.cor, 'center');
  });

  // Marca de centro que só existe numa das abas — explica o "—" da linha sem
  // que alguém precise abrir a planilha para descobrir.
  if (so) {
    _sTxt(slide, xRot + wRot - 34, y, 32, h, so === 'plano' ? 'só plano' : 'só ritmo',
          4.8, false, DS.colors.textMuted, 'right');
  }
}

// R$ mil sem decimais. null → "—" (não medido), 0 → "0" (medido e é zero).
function _dreMil_(v) {
  if (v == null) return '—';
  const mil = v / 1000;
  return (Math.abs(mil) < 0.5 && mil !== 0) ? '~0' : String(Math.round(mil));
}

/**
 * Variação contra o plano, em módulo, com seta pelo sentido.
 *
 * Gasto é despesa: passar do plano é RUIM (▲ vermelha) e ficar abaixo é BOM
 * (▼ verde) — o inverso do que a intuição de "subiu = bom" sugere, e o
 * motivo de a seta existir em vez de só o sinal.
 *
 * Plano ZERO é caso à parte: qualquer gasto é variação infinita, e "∞%" não
 * informa. Mostra "novo" — houve gasto onde não havia plano.
 */
function _dreVariacao_(plano, real) {
  const DS = CR_DESIGN_SYSTEM;
  if (plano == null || real == null) return { txt: '—', cor: DS.colors.textMuted };
  if (plano === 0) return real === 0
    ? { txt: '—', cor: DS.colors.textMuted }
    : { txt: 'novo', cor: DS.colors.accentRed };
  const pct = (real / plano - 1) * 100;
  if (Math.abs(pct) < 0.5) return { txt: '0%', cor: DS.colors.textMuted };
  const acima = pct > 0;
  return {
    txt: (acima ? '▲' : '▼') + Math.abs(Math.round(pct)) + '%',
    cor: acima ? DS.colors.accentRed : DS.colors.accentGreen
  };
}

// Encurta o nome do centro de custo para caber na coluna sem quebrar linha.
function _dreNomeCurto_(nome) {
  return String(nome)
    .replace(/^ARMAZÉM MONOUSUÁRIO /, 'ARM. ')
    .replace(/ DESPESAS?$/, '')
    .replace(/^LJ 0/, 'LJ ');
}

function _dreLinha_(slide, x, y, w, cor, alt) {
  const l = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, alt);
  l.getFill().setSolidFill(cor);
  l.getBorder().setTransparent();
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
