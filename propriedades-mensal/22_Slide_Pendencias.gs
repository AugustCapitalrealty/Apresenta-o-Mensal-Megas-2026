/**
 * ARQUIVO: 22_Slide_Pendencias.gs
 * SLIDE — MONITORAMENTO DE PENDÊNCIAS (VistoriaPro)
 *
 * As não conformidades das vistorias de rotina, do app VistoriaPro, no mês da
 * apresentação e na posição do último dia do mês (obterIndicadoresVistorias_,
 * 05_DadosSlides.gs):
 *
 *   - cinco cartões: NCs em aberto, vencidas, resolvidas no mês, tempo médio
 *     de resolução e visitas mensais feitas × programadas — com ▲/▼ contra o
 *     mês anterior;
 *   - imóveis com mais pendências (ordem do índice de saúde do app, 0 a 100);
 *   - pendências por disciplina e a idade das que estão em aberto.
 *
 * Vai logo depois da capa da seção 5 (VISTORIAS); sem a capa no deck, fica no
 * fim. Sem o app (token, rede), o slide sai com o aviso do motivo — nunca com
 * zeros.
 *
 * "Vencida" = passou do prazo da NC ou, sem prazo próprio, do SLA do app
 * (dias a partir da constatação, nunca antes da data de corte do histórico).
 */

function gerarSlidePendenciasVistorias() {
  const deck = getDeckMensal_();
  _slideLimpar_(deck, TAG_PENDENCIAS);

  const ref = obterMesReferencia_();
  const v = obterIndicadoresVistorias_();
  const W = deck.getPageWidth(), H = deck.getPageHeight();

  const posicao = v ? ' · posição em ' + _pendData_(v.posicao_em) : '';
  const slide = _slideNovo_(deck, TAG_PENDENCIAS, 'MONITORAMENTO DE PENDÊNCIAS',
    'Vistorias de rotina (VistoriaPro) · ' + ref.label + posicao + ' · ▲/▼ vs mês anterior');

  if (!v) {
    _slideFalha_(slide, 40, 70, W - 80, 200, 'MONITORAMENTO DE PENDÊNCIAS — NÃO FOI GERADO',
      'Sem os indicadores do VistoriaPro: ' + (_vistoriasMotivo_ || 'motivo desconhecido') + '.',
      'Rode diagnosticarVistorias() no editor. O token vai em Configurações do projeto › Propriedades do script › VISTORIAS_API_TOKEN.');
  } else {
    try {
      _pendDesenhar_(slide, W, H, v);
    } catch (e) {
      _slideFalha_(slide, 40, 160, W - 80, 200, 'MONITORAMENTO DE PENDÊNCIAS — NÃO FOI GERADO', e,
        'Confira se 22_Slide_Pendencias.gs e 00_Helpers.gs estão iguais no editor (lição 6).');
    }
  }

  _pendPosicionar_(deck, slide);
  Logger.log('✓ Monitoramento de Pendências gerado' + (v ? ' — ' + v.atual.ncs_em_aberto + ' em aberto, ' +
             v.atual.ncs_vencidas + ' vencida(s)' : ' com aviso (sem dados do app)'));
}

function _pendDesenhar_(slide, W, H, v) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const a = v.atual, b = v.anterior || {};
  const mX = 40;

  // ── Cartões ──
  const pct = (n, d) => (d ? Math.round(n / d * 100) + '%' : '—');
  const cards = [
    { l: 'NCs EM ABERTO', v: a.ncs_em_aberto, var: _pendVariacao_(a.ncs_em_aberto, b.ncs_em_aberto, true),
      sub: a.ncs_abertas_no_mes + ' nova(s) no mês' },
    { l: 'VENCIDAS', v: a.ncs_vencidas, var: _pendVariacao_(a.ncs_vencidas, b.ncs_vencidas, true),
      sub: pct(a.ncs_vencidas, a.ncs_em_aberto) + ' do aberto · ' + a.ncs_alta_vencidas + ' alta', alerta: a.ncs_vencidas > 0 },
    { l: 'RESOLVIDAS NO MÊS', v: a.ncs_resolvidas_no_mes, var: _pendVariacao_(a.ncs_resolvidas_no_mes, b.ncs_resolvidas_no_mes, false),
      sub: a.pct_resolvidas_no_prazo == null ? 'nenhuma no mês' : _pendNum_(a.pct_resolvidas_no_prazo) + '% no prazo' },
    { l: 'TEMPO DE RESOLUÇÃO', v: a.mttr_dias == null ? '—' : _pendNum_(a.mttr_dias) + 'd',
      var: _pendVariacao_(a.mttr_dias, b.mttr_dias, true), sub: 'média das resolvidas no mês' },
    // As vistorias periódicas do mês estão no Dashboard (grupo VISTORIAS).
    { l: 'VISITAS MENSAIS', v: a.visitas_mensais + ' de ' + a.visitas_programadas,
      var: null, sub: a.imoveis_visitados + ' de ' + a.imoveis_ativos + ' imóveis' }
  ];
  const cTop = 76, cH = 66, cGap = 10;
  const cW = (W - 2 * mX - cGap * (cards.length - 1)) / cards.length;
  cards.forEach((k, i) => _pendCartao_(slide, mX + i * (cW + cGap), cTop, cW, cH, k));

  // ── Imóveis com mais pendências ──
  const pTop = cTop + cH + 12, pH = H - pTop - 26;
  const wImov = 380;
  const yImov = criarCardPainel(slide, mX, pTop, wImov, pH, 'IMÓVEIS COM MAIS PENDÊNCIAS', c.brandLight);
  // Larguras medidas para o cabeçalho em 6,5 pt caber sem quebrar (lição 1).
  const cols = [
    { t: 'Imóvel', w: 0.34, a: 'left' }, { t: 'Em aberto', w: 0.14, a: 'center' }, { t: 'Vencidas', w: 0.13, a: 'center' },
    { t: 'Alta venc.', w: 0.13, a: 'center' }, { t: 'Mais antiga', w: 0.15, a: 'center' }, { t: 'Saúde', w: 0.11, a: 'center' }
  ];
  const imoveis = (v.imoveis || []).filter(i => i.em_aberto > 0);
  const linhaH = 17, maxLinhas = Math.max(1, Math.floor((pTop + pH - yImov - 24) / linhaH));
  const tabX = mX + 12, tabW = wImov - 24;
  let x0 = tabX;
  cols.forEach(col => {
    _sTxt(slide, x0, yImov, tabW * col.w, 14, col.t, 6.5, true, c.textMuted, col.a);
    x0 += tabW * col.w;
  });
  imoveis.slice(0, maxLinhas).forEach((im, r) => {
    const y = yImov + 16 + r * linhaH;
    if (r % 2 === 0) _sRet_(slide, tabX, y, tabW, linhaH, '#F8FAFC');
    const saude = Number(im.indice_saude);
    const corSaude = saude >= 80 ? c.accentGreen : (saude >= 60 ? '#F59E0B' : c.accentRed);
    const celulas = [
      [_truncar_(im.imovel, _charsQueCabem_(tabW * cols[0].w, 7.5)), c.textMain, false],
      [String(im.em_aberto), c.textMain, true],
      [String(im.vencidas), im.vencidas > 0 ? c.accentRed : c.textMuted, im.vencidas > 0],
      [String(im.alta_vencidas), im.alta_vencidas > 0 ? c.accentRed : c.textMuted, im.alta_vencidas > 0],
      [im.idade_max_dias + 'd', c.textBody, false],
      [String(saude), corSaude, true]
    ];
    let x = tabX;
    celulas.forEach((cel, i) => {
      _sTxt(slide, x, y, tabW * cols[i].w, linhaH, cel[0], 7.5, cel[2], cel[1], cols[i].a);
      x += tabW * cols[i].w;
    });
  });
  if (!imoveis.length) {
    _sTxt(slide, tabX, yImov + 30, tabW, 20, 'Nenhuma NC em aberto no fim do mês.', 9, true, c.accentGreen, 'center');
  } else if (imoveis.length > maxLinhas) {
    _sTxt(slide, tabX, pTop + pH - 20, tabW, 14, '+ ' + (imoveis.length - maxLinhas) + ' imóvel(is) com pendência fora da lista',
      7, false, c.textMuted, 'left');
  }

  // ── Por disciplina + idade das pendências ──
  const xDir = mX + wImov + 12, wDir = W - mX - xDir;
  const yDisc = criarCardPainel(slide, xDir, pTop, wDir, pH, 'POR DISCIPLINA', c.themeCorr);
  const disc = (v.disciplinas || []).filter(d => d.em_aberto > 0 || d.resolvidas_no_mes > 0);
  const cD = [{ t: 'Disciplina', w: 0.40, a: 'left' }, { t: 'Abertas', w: 0.20, a: 'center' },
              { t: 'Venc.', w: 0.20, a: 'center' }, { t: 'Resolv.', w: 0.20, a: 'center' }];
  const dX = xDir + 12, dW = wDir - 24, dLinha = 15;
  const idadeH = 92;   // bloco de idade embaixo
  const cabem = Math.max(1, Math.floor((pTop + pH - idadeH - yDisc - 18) / dLinha));
  // Não cabendo todas, a última vaga diz quantas ficaram de fora (nunca somem caladas).
  const maxDisc = disc.length > cabem ? cabem - 1 : cabem;
  let dx = dX;
  cD.forEach(col => { _sTxt(slide, dx, yDisc, dW * col.w, 14, col.t, 6.5, true, c.textMuted, col.a); dx += dW * col.w; });
  if (disc.length > maxDisc) {
    _sTxt(slide, dX, yDisc + 16 + maxDisc * dLinha, dW, dLinha, '+ ' + (disc.length - maxDisc) + ' disciplina(s) fora da lista',
      7, false, c.textMuted, 'left');
  }
  disc.slice(0, maxDisc).forEach((d, r) => {
    const y = yDisc + 16 + r * dLinha;
    if (r % 2 === 0) _sRet_(slide, dX, y, dW, dLinha, '#F8FAFC');
    const cel = [[_truncar_(d.disciplina, _charsQueCabem_(dW * cD[0].w, 7.5)), c.textMain, false],
                 [String(d.em_aberto), c.textMain, true],
                 [String(d.vencidas), d.vencidas > 0 ? c.accentRed : c.textMuted, d.vencidas > 0],
                 [String(d.resolvidas_no_mes), d.resolvidas_no_mes > 0 ? c.accentGreen : c.textMuted, false]];
    let x = dX;
    cel.forEach((cc, i) => { _sTxt(slide, x, y, dW * cD[i].w, dLinha, cc[0], 7.5, cc[2], cc[1], cD[i].a); x += dW * cD[i].w; });
  });
  if (!disc.length) _sTxt(slide, dX, yDisc + 20, dW, 16, 'Sem NCs no mês.', 8, false, c.textMuted, 'center');

  // Idade das NCs em aberto: barras horizontais por faixa.
  const faixas = ['0-30', '31-60', '61-90', '91-180', '>180'];
  const idade = v.idade || {};
  const maxI = Math.max(1, ...faixas.map(f => Number(idade[f] || 0)));
  const iTop = pTop + pH - idadeH;
  _sRet_(slide, xDir + 12, iTop - 4, wDir - 24, 1, c.lines);
  _sTxt(slide, xDir + 12, iTop, wDir - 24, 14, 'IDADE DAS PENDÊNCIAS EM ABERTO (DIAS)', 7, true, c.textMuted, 'left');
  const barX = xDir + 62, barWmax = wDir - 62 - 44, barH = 9, passo = 14;
  faixas.forEach((f, i) => {
    const y = iTop + 17 + i * passo;
    const n = Number(idade[f] || 0);
    _sTxt(slide, xDir + 12, y - 3, 48, barH + 6, f, 7, false, c.textBody, 'right');
    // Mais de 90 dias em laranja: é a pendência que está envelhecendo.
    if (n > 0) _sRet_(slide, barX, y, Math.max(2, barWmax * n / maxI), barH, i >= 3 ? c.accentOrange : c.brandLight);
    _sTxt(slide, barX + (n > 0 ? barWmax * n / maxI : 0) + 2, y - 3, 40, barH + 6, String(n), 7, true, c.textMain, 'left');
  });

  _sTxt(slide, mX, H - 22, W - 2 * mX, 14,
    'Fonte: VistoriaPro (app de vistorias) · posição no último dia do mês · vencida = passou do prazo da NC ou do SLA do app',
    6.5, false, c.textMuted, 'left');
}

// Cartão de KPI no visual atual do deck: rótulo, número, variação e apoio.
function _pendCartao_(slide, x, y, w, h, k) {
  const DS = CR_DESIGN_SYSTEM, c = DS.colors;
  const bg = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  bg.getFill().setSolidFill(c.cardBg);
  bg.getBorder().getLineFill().setSolidFill(k.alerta ? c.accentRed : c.lines);
  bg.getBorder().setWeight(1);
  _sTxt(slide, x + 6, y + 4, w - 12, 14, _truncar_(k.l, _charsQueCabem_(w - 12, 7)), 7, true, c.textMuted, 'left');
  _sTxt(slide, x + 6, y + 18, w - 12, 24, String(k.v == null ? '—' : k.v), 17, true, k.alerta ? c.accentRed : c.brandDark, 'left');
  if (k.var) _sTxt(slide, x + 6, y + 18, w - 12, 24, k.var.txt, 8, true, k.var.cor, 'right');
  if (k.sub) _sTxt(slide, x + 6, y + h - 20, w - 12, 14, _truncar_(k.sub, _charsQueCabem_(w - 12, 7)), 7, false, c.textBody, 'left');
}

// "▲ 3" / "▼ 2" contra o mês anterior. maiorRuim: subir é ruim (estoque, vencidas, tempo).
function _pendVariacao_(atual, anterior, maiorRuim) {
  const c = CR_DESIGN_SYSTEM.colors;
  if (atual == null || anterior == null) return null;
  const d = Math.round((Number(atual) - Number(anterior)) * 10) / 10;
  if (!d) return { txt: '= 0', cor: c.textMuted };
  const sobe = d > 0, ruim = maiorRuim ? sobe : !sobe;
  return { txt: (sobe ? '▲ ' : '▼ ') + _pendNum_(Math.abs(d)), cor: ruim ? c.accentRed : c.accentGreen };
}

// Uma casa decimal no máximo ("23,5", "83,3", "15"). formatarNumeroBR põe
// sempre duas quando há decimal ("23,50d"), o que aqui só polui o cartão.
function _pendNum_(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

// "2026-08-31" → "31/08/2026".
function _pendData_(iso) {
  const p = String(iso || '').slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso || '');
}

// Logo depois da capa da seção 5 (VISTORIAS). Nunca lança: posição errada é
// chato, mas perder o slide por causa dela seria pior.
function _pendPosicionar_(deck, slide) {
  try {
    const secao = SECOES_MENSAL.filter(s => s.n === 5)[0];
    const capa = secao ? _capasAcharSecao_(deck, secao) : null;
    if (!capa) {
      Logger.log('Pendências: capa da seção 5 (VISTORIAS) não encontrada; slide fica no fim do deck.');
      return;
    }
    slide.move(_capasIndice_(deck, capa) + 1);
  } catch (e) {
    Logger.log('Pendências: não consegui posicionar na seção (' + e.message + '); fica no fim.');
  }
}

/**
 * Diagnóstico (aparece no menu do editor — sem "_" no nome, lição 5): confere
 * o token, chama o app para o mês da apresentação e mostra o que veio.
 */
function diagnosticarVistorias() {
  _vistoriasCache_ = undefined;
  const ref = obterMesReferencia_();
  Logger.log('▶ VistoriaPro — mês da apresentação: ' + ref.label + ' (' + ref.fonte + ')');
  Logger.log('  URL: ' + VISTORIAS_API_URL);
  const temToken = !!PropertiesService.getScriptProperties().getProperty('VISTORIAS_API_TOKEN');
  Logger.log('  Token nas Propriedades do script: ' + (temToken ? 'sim' : 'NÃO — crie VISTORIAS_API_TOKEN'));
  const v = obterIndicadoresVistorias_();
  if (!v) { Logger.log('  ✗ Sem dados: ' + _vistoriasMotivo_); return; }
  const a = v.atual;
  Logger.log('  ✓ ' + v.mes + ', posição em ' + _pendData_(v.posicao_em) + (v.data_corte ? ' · data de corte ' + _pendData_(v.data_corte) : ''));
  Logger.log('    vistorias periódicas ' + a.vistorias_periodicas + ' · visitas mensais ' + a.visitas_mensais + ' de ' +
             a.visitas_programadas + ' · imóveis visitados ' + a.imoveis_visitados + ' de ' + a.imoveis_ativos);
  Logger.log('    NCs: ' + a.ncs_em_aberto + ' em aberto, ' + a.ncs_vencidas + ' vencida(s), ' + a.ncs_abertas_no_mes +
             ' nova(s), ' + a.ncs_resolvidas_no_mes + ' resolvida(s), tempo médio ' + (a.mttr_dias == null ? '—' : a.mttr_dias + 'd'));
  Logger.log('    ' + (v.imoveis || []).length + ' imóvel(is) com pendência; ' + (v.disciplinas || []).length + ' disciplina(s).');
}
